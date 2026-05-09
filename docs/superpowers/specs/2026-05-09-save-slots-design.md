# Save Slots — Design Spec

## Goal

Replace the single-save model with a **6-slot save system** where each slot holds an independent character. Within each slot, support **automatic chapter-checkpoint bookmarks** (silent snapshots taken at each `story.stage` transition) and **manual bookmarks** (user-created at any moment). Players can switch between characters mid-session and restore any chapter they've reached, addressing both "what if I tried this as a Wizard" replay value and "I lost the end-of-chapter fight, don't make me redo the grind" failure recovery.

## Scope

**In scope:**
- 6 fixed character slots with per-slot localStorage keys
- Slot picker UI shown on app launch (when no active slot) and via a new "Switch tales" button in Settings
- Per-slot bookmark list (auto-chapter checkpoints + user-created manual bookmarks), capped at 15 per slot with oldest-manual eviction
- BookmarksModal UI accessible from a new icon in the WorldPanel header
- Migration of the existing single `heroicchronicle.save.v1` key into slot 0 on first launch with the new system
- Refactor of autosave routing: writes go to the active slot's `live` field
- Refactor of "Consign this tale to the flames" so it wipes only the active slot (achievements remain account-level)

**Out of scope:**
- Slot-naming customization (slots auto-label from character name + class + chapter)
- Slot reordering (always indexed 0-5; the picker shows them in fixed order)
- Cross-device sync (localStorage only; matches existing model)
- SAVE_VERSION bump (slot keys are net-new; per-slot `GameState` shape unchanged at v4)
- Bookmark version migration on future SAVE_VERSION bumps (v1 stores v4 snapshots; deferred until a future SAVE_VERSION change)
- Per-bookmark export / import / share (could be added later)

## Architecture

### Storage layout

The system replaces `heroicchronicle.save.v1` (single key) with a small family of localStorage keys:

| Key | Type | Purpose |
|---|---|---|
| `heroicchronicle.slots.active.v1` | `number \| null` | The currently-active slot index (0-5), or null if at the slot picker |
| `heroicchronicle.slot.0.v1` | `SlotData \| absent` | Slot 0 data; key absent means the slot is empty |
| `heroicchronicle.slot.1.v1` | `SlotData \| absent` | Slot 1 data |
| ... | ... | ... |
| `heroicchronicle.slot.5.v1` | `SlotData \| absent` | Slot 5 data |
| `heroicchronicle.achievements.v1` | unchanged | Account-level achievements; survives Consign |
| `heroicchronicle.theme.v1` | unchanged | Account-level theme preference |

Per-slot keys are independent — corruption of one slot does not affect others. An empty slot is represented by the absence of its key (no need to write a placeholder).

### Per-slot data shape

```ts
type SlotData = {
  live: GameState;              // current playable state, written by autosave
  bookmarks: Bookmark[];        // ≤ 15, mixed auto-checkpoint + manual
};

type Bookmark = {
  id: string;                   // unique within the slot; generated as `${kind}_${createdAt}_${rand6}`
  kind: 'auto-chapter' | 'manual';
  label: string;                // "Chapter 3 — Refusal of the Call" for auto, user-typed for manual
  createdAt: number;            // unix ms
  snapshot: GameState;          // full GameState at the moment the bookmark was created
};
```

`SlotData.live` is the working save (continuously updated by autosave). `SlotData.bookmarks` is a list of point-in-time copies. Every `Bookmark.snapshot` is a complete `GameState` — restoring is a single state replacement, not a diff replay.

### Bookmark policy

- **Auto-chapter checkpoints:** every transition where `state.story.stage` changes (e.g., chapter_1 → chapter_2 in `startNarrativeEncounter`, chapter_2 → chapter_3 in `enterChapter3IfNew`, chapter_3/2 → chapter_4 in `call_accept`) snapshots the post-transition state into the active slot's bookmark list with `kind: 'auto-chapter'`. Re-entering the same chapter (e.g., walk back from Ch 3 → Ch 2 — note: this doesn't currently happen in content, but the engine handles it) overwrites the existing `auto-chapter` bookmark for that chapter rather than creating a duplicate. **Result: at most one auto-chapter bookmark per chapter ever exists in a slot.** The label format is `Chapter ${N} — ${title}` derived from `CHAPTER_TITLES`.
- **Manual bookmarks:** user clicks "Bookmark this moment" in the BookmarksModal. The current `live` state is snapshotted with `kind: 'manual'` and the user-typed label (default `"Bookmark · ${date}"`).
- **Eviction:** when a slot has 15 bookmarks and a new bookmark would be added, the oldest **manual** bookmark is evicted (auto-chapter bookmarks are protected). If all 15 are auto-chapter (impossible at the current 9-chapter ceiling, but defensive): the new bookmark is silently dropped with a console warning.

### Autosave routing

Existing autosave logic (in `gameStore.dispatch`) writes the whole state to `heroicchronicle.save.v1` on every dispatch when `state.settings.autoSave` is true. Plan 5b changes this to: read `slots.active`, then write to `heroicchronicle.slot.${active}.v1`'s `live` field. If `slots.active` is null (at slot picker), no autosave writes occur (there is nothing to save).

### Migration on first launch

On app boot, the app checks for the legacy single-key save:

1. If `heroicchronicle.save.v1` exists AND no `heroicchronicle.slot.{0..5}.v1` keys exist:
   - Read the legacy save (runs through existing v1→v4 migration chain in `deserialize`)
   - Wrap it as `SlotData = { live: <migrated>, bookmarks: [] }`
   - Write to `heroicchronicle.slot.0.v1`
   - Set `heroicchronicle.slots.active.v1 = 0`
   - Leave the legacy key in place for now (harmless; can be cleaned up in a future migration)
2. If slot keys already exist: skip migration, trust the slot system.
3. If neither exist: app boots into slot picker (six empty slots).

**The user never sees the migration — they boot into their game exactly where they left off, in slot 0.**

### Module structure

```
src/engine/slots.ts            (new) — SlotData type, slot CRUD, bookmark CRUD, eviction, migration
src/engine/__tests__/slots.test.ts (new)

src/ui/SlotPicker.svelte       (new) — pre-character-creation slot picker screen
src/ui/BookmarksModal.svelte   (new) — bookmark list + create + restore modal
src/ui/__tests__/SlotPicker.test.ts (new)
src/ui/__tests__/BookmarksModal.test.ts (new)

src/ui/store.svelte.ts         (modified) — autosave routes to active slot, slot management methods
src/ui/SettingsModal.svelte    (modified) — adds "Switch tales" button + confirmation
src/ui/WorldPanel.svelte       (modified) — adds Bookmarks icon to the header
src/ui/App.svelte              (modified) — boot-time decision: slot picker vs. character creation vs. world panel
```

## UI flow

### Slot picker screen

Appears on app launch when `slots.active` is null, or when the user clicks "Switch tales" from Settings.

**Layout:** parchment-themed list, page-titled "The Shelf of Heroes" (or similar). Six rows in fixed order (slot 0 at top).

**Each row, filled:**
- Display: `Brendan · the Disgraced Knight · Chapter 3 · 2 days ago`
- Two buttons: **Resume** | **Forget** (red, requires confirmation modal: *"Consign this tale to the flames? The pages will not return."*)

**Each row, empty:**
- Display: italic *"An untold tale."*
- Single button: **Begin a new tale** — routes to existing CharacterCreation; on Begin, `slots.active` is set to that slot index and the new character's initial state is saved to the slot's `live` (regardless of `autoSave` setting — same explicit-action principle as Switch tales).

### In-game slot switching

New button added to SettingsModal alongside Preserve / Consign / Forget: **Switch tales**.

On click → confirmation modal: *"Set this tale aside and return to the shelf?"* — *"Aye, set it aside"* / *"Never mind"*.

On confirm: the active slot's `live` is saved (regardless of the `autoSave` setting — explicit user action gets an explicit save), `slots.active` is cleared, slot picker shown.

### Bookmarks modal

New icon in the WorldPanel header alongside trophy/scroll/compass. Glyph: a quill or ribbon (final selection during implementation).

Clicking opens **BookmarksModal**:

**Top section:**
- **Bookmark this moment** button + optional label input (placeholder: *"e.g., Before the Tax Rat"*; defaults to `Bookmark · ${date}` if blank)

**Below:**
- List of existing bookmarks for the active slot, sorted by `createdAt` descending
- Each row: label, kind badge ("auto" / "manual"), relative timestamp, **Restore** button, **Forget** button (only for manual bookmarks; auto-chapter bookmarks are not user-deletable)
- **Restore confirmation:** *"Restore this moment? Anything since will be unwritten."* — *"Restore"* / *"Never mind"*. On confirm: `slot.{active}.live` is replaced with the bookmark's snapshot; the world panel re-renders from the restored state.

### Existing flows

- **Consign this tale to the flames** (existing button in Settings): now wipes only the active slot (deletes `heroicchronicle.slot.${active}.v1`, clears `slots.active`). Returns to slot picker after confirm.
- **Forget thy deeds** (existing): unchanged. Account-level achievements wipe.
- **Preserve thy tale** (existing): unchanged conceptually. Triggers a manual write to the active slot's `live`. Different from bookmarks (which create a snapshot for later restore). Kept because it's still useful when autosave is off.

## Files affected

**Created:**
- `src/engine/slots.ts` — slot/bookmark types, CRUD, eviction policy, migration
- `src/engine/__tests__/slots.test.ts` — unit tests for the slot module
- `src/ui/SlotPicker.svelte` — slot picker screen
- `src/ui/BookmarksModal.svelte` — bookmark management modal
- `src/ui/__tests__/SlotPicker.test.ts` — UI tests
- `src/ui/__tests__/BookmarksModal.test.ts` — UI tests
- `src/__tests__/saveSlots.e2e.test.ts` — full-flow integration tests

**Modified:**
- `src/ui/store.svelte.ts` — autosave routes to active slot; slot management API (`switchToSlot`, `consignActiveSlot`, `createBookmark`, `restoreBookmark`, `deleteBookmark`); migration runs once on app boot
- `src/ui/SettingsModal.svelte` — adds "Switch tales" button + confirmation modal
- `src/ui/WorldPanel.svelte` — adds Bookmarks icon to the header
- `src/ui/App.svelte` — boot-time decision tree: if `slots.active === null` → slot picker; else if no `live` state for active slot → empty-slot character creation flow; else → world panel
- `src/engine/save.ts` — possibly minor extension for `serializeSlot`/`deserializeSlot` helpers

## Tests

### Engine unit tests (`src/engine/__tests__/slots.test.ts`)

- **Slot CRUD:** `loadSlot(i)` returns null for empty, `SlotData` for filled; `saveSlot(i, data)` persists; `deleteSlot(i)` removes
- **Active slot pointer:** `setActiveSlot(i)` / `getActiveSlot()` round-trip; `clearActiveSlot()` writes null
- **Auto-chapter checkpoint:** `addAutoCheckpoint(slotData, state)` adds a bookmark with `kind: 'auto-chapter'`; calling again with the same chapter overwrites the previous auto-chapter for that chapter (one per chapter invariant)
- **Manual bookmark:** `addManualBookmark(slotData, state, label)` adds a `kind: 'manual'` bookmark with the label
- **Eviction:** when slot has 15 bookmarks, adding a new one evicts the oldest **manual** (auto-chapters protected); if all 15 are auto-chapter (defensive case), new bookmark dropped with no eviction
- **Restore:** `restoreBookmark(slotData, bookmarkId)` returns a new `SlotData` with `live` replaced by the bookmark's snapshot; bookmarks list unchanged
- **Migration:** `migrateLegacySave()` reads `heroicchronicle.save.v1`, wraps it as slot 0, sets active=0; idempotent (running twice doesn't double-migrate)

### Engine integration tests (extend existing files)

- `state.test.ts` / `events.test.ts`: autosave routes to active slot's `live` (rather than legacy SAVE_KEY)
- `narrative.test.ts`: triggering a chapter transition fires an auto-checkpoint as a side-effect (engine emits a hook the store consumes)

### UI component tests

- `SlotPicker.test.ts` (new): renders 6 rows; correctly distinguishes filled vs empty; Resume / Forget / Begin actions wire to the right store methods
- `BookmarksModal.test.ts` (new): renders bookmark list; "Bookmark this moment" creates an entry; Restore triggers confirmation flow then replaces state; auto-chapter bookmarks have no Forget button
- `SettingsModal.test.ts` (extend): "Switch tales" button present; clicking opens confirmation; on confirm fires autosave + clears active slot

### E2E integration tests (`src/__tests__/saveSlots.e2e.test.ts`)

- **Multi-character:** create char in slot 0 → play to Ch 2 → switch tales → create char in slot 1 (different class) → play briefly → switch back to slot 0 → state matches the Ch 2 snapshot exactly
- **Bookmark restore:** play to Ch 2 → create manual bookmark → walk back home (advances to Ch 3 via existing arc) → restore bookmark → state matches the Ch 2 snapshot, including character location and chapter
- **Migration smoke test:** seed localStorage with a legacy `heroicchronicle.save.v1` → boot the app → assert slot 0 is filled with the migrated character, `slots.active === 0`, no slot picker shown

## Acceptance criteria

1. Fresh app launch with no saves shows the slot picker with six empty rows.
2. Existing single-save users on first launch with the new system are migrated transparently — they land in their game in slot 0, never see the slot picker.
3. Each of the six slots holds a fully independent character; switching between slots preserves the previously-active state.
4. Auto-chapter checkpoints fire at every `story.stage` transition (Ch 1→2, Ch 2→3, Ch 3→4 in the_call arc; future chapter transitions handled equivalently).
5. Manual bookmarks can be created from the BookmarksModal at any moment with optional user-typed label.
6. Restoring a bookmark replaces the active slot's `live` with the snapshot; the world panel reflects the restored state immediately.
7. Consigning the active slot wipes only that slot's data; achievements and other slots unaffected. Player returns to the slot picker.
8. Bookmark count per slot ≤ 15 enforced; oldest manual bookmark evicted when full.
9. All 249 existing tests still pass after the migration logic lands; new tests pass.

## Open questions and future work

- **Bookmark snapshot version migration:** if a future plan bumps SAVE_VERSION (e.g., v4 → v5), bookmarks created at v4 will need to migrate on restore. Plan 5b ships with v4-only bookmarks; the migration entry point exists in `deserialize` and bookmarks just need to be passed through it on restore. Defer the change to whatever plan bumps SAVE_VERSION.
- **Slot picker visual polish:** the spec specifies the data and actions; final visual treatment (decorations, last-played icons, hover states) is implementation discretion within the existing parchment aesthetic.
- **Bookmark icon glyph:** quill vs. ribbon vs. another themed glyph — picked during implementation. Should sit comfortably alongside trophy / scroll / compass.
- **"Switch tales" copy:** considered alternatives include "Set aside this tale", "Return to the shelf", "Choose another tale". The "Switch tales" button label is provisional; final copy decided during implementation.
- **Achievement parity:** achievements continue to be account-level. A future plan may add slot-scoped statistics (e.g., "this character defeated N tax rats"), but those are stats, not achievements, and out of scope here.
