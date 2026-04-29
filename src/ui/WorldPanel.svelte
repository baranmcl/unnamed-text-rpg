<script lang="ts">
  import { gameStore } from './store.svelte';
  import { ACT_TITLES } from '../engine/types';
  import { content } from '../content';
  import type { LocationId, EncounterId, ItemId } from '../engine/types';

  // Plan 1: location name comes from state.world.currentLocation id capitalized.
  // Plan 2 wires this to actual Location data.
  function locationDisplayName(id: string): string {
    if (!id) return '— (no location) —';
    return id
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  let actLabel = $derived(ACT_TITLES[gameStore.state.story.stage]);
  let locName = $derived(locationDisplayName(gameStore.state.world.currentLocation));
  let log = $derived(gameStore.state.log);

  let currentLocation = $derived(content.locations[gameStore.state.world.currentLocation]);
  let inCombat = $derived(gameStore.state.combat !== null);

  let showItemPicker = $state(false);

  let consumables = $derived(
    gameStore.state.character.inventory
      .map((entry) => ({ entry, item: content.items[entry.itemId] }))
      .filter(({ item }) => item?.kind === 'consumable')
  );

  let signatureSkill = $derived.by(() => {
    const cls = content.classes[gameStore.state.character.classId];
    if (!cls) return null;
    return content.skills[cls.signatureMove] ?? null;
  });

  let signatureSkillTooltip = $derived.by(() => {
    const skill = signatureSkill;
    if (!skill) return 'No skills available.';
    return `${skill.name} — ${skill.description} (Unlocks at level ${skill.unlockLevel}.)`;
  });

  function attack() {
    gameStore.dispatch({ kind: 'AttackTarget' });
  }
  function flee() {
    gameStore.dispatch({ kind: 'Flee' });
  }
  function consume(itemId: ItemId) {
    gameStore.dispatch({ kind: 'UseItem', itemId });
    showItemPicker = false;
  }

  function isExitVisible(visibleIfFlag?: string): boolean {
    if (!visibleIfFlag) return true;
    return Boolean(gameStore.state.world.flags[visibleIfFlag]);
  }

  function go(targetId: LocationId) {
    gameStore.dispatch({ kind: 'EnterLocation', locationId: targetId });
  }

  function confront(encounterId: EncounterId) {
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId });
  }

  function encounterLabel(encounterId: EncounterId): string {
    const enc = content.encounters[encounterId];
    if (!enc || enc.kind !== 'combat') return 'Investigate';
    const monster = content.monsters[enc.monsterId];
    return monster ? `Confront ${monster.name}` : 'Investigate';
  }

  function isEncounterDefeated(encId: EncounterId): boolean {
    return Boolean(gameStore.state.world.flags[`defeated:${encId}`]);
  }

  // Fix 5: Auto-scroll log to bottom on new entries.
  let logEl = $state<HTMLElement | null>(null);

  $effect(() => {
    // Touch the log length to make this effect reactive to log changes.
    void log.length;
    if (logEl) {
      logEl.scrollTop = logEl.scrollHeight;
    }
  });
</script>

<section class="world" aria-label="World panel">
  <header class="world-header">
    <div class="header-text">
      <p class="act-marker">{actLabel}</p>
      <h1 class="location-title">{locName}</h1>
    </div>
    <button
      class="compass"
      aria-label="Look at the map"
      title="Look at the map (coming in Plan 5)"
      type="button"
    >
      <svg viewBox="0 0 64 64" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="32" cy="32" r="28" />
        <circle cx="32" cy="32" r="22" />
        <path d="M32 6 L36 32 L32 58 L28 32 Z" fill="currentColor" stroke="none" />
        <path d="M6 32 L32 28 L58 32 L32 36 Z" fill="currentColor" fill-opacity="0.35" stroke="none" />
        <circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  </header>

  <div class="rule"></div>

  <div class="log" aria-live="polite" bind:this={logEl}>
    {#each log as entry (entry.id)}
      {#if entry.kind === 'narration'}
        <p class="entry narration">{entry.text}</p>
      {:else if entry.kind === 'dialogue'}
        <div class="entry dialogue">
          <span class="speaker">{entry.speaker ?? ''}</span>
          <span class="line">{entry.text}</span>
        </div>
      {:else if entry.kind === 'system'}
        <div class="entry system">
          <span class="system-label">{entry.systemLabel ?? 'NOTE'} —</span>
          <span class="system-text">{entry.text}</span>
        </div>
      {:else if entry.kind === 'combat'}
        <p class="entry combat">{entry.text}</p>
      {:else if entry.kind === 'loot'}
        <p class="entry loot">{entry.text}</p>
      {:else if entry.kind === 'scene-divider'}
        <p class="entry scene-divider">· · ·</p>
      {/if}
    {/each}
  </div>

  <div class="button-bar">
    {#if !inCombat && currentLocation}
      {#each currentLocation.exits as exit (exit.targetId)}
        {#if isExitVisible(exit.visibleIfFlag)}
          <button class="btn" type="button" onclick={() => go(exit.targetId)}>{exit.label}</button>
        {/if}
      {/each}
      {#each (currentLocation.encounterIds ?? []).filter((id) => !isEncounterDefeated(id)) as encId (encId)}
        <button class="btn" type="button" onclick={() => confront(encId)}>{encounterLabel(encId)}</button>
      {/each}
      {#if currentLocation.exits.length === 0 && (currentLocation.encounterIds ?? []).length === 0}
        <p class="placeholder">There seems nothing immediate to do here.</p>
      {/if}
    {:else if inCombat}
      <button class="btn" type="button" onclick={attack}>Attack</button>

      <span class="skill-wrap">
        <button class="btn" type="button" disabled title={signatureSkillTooltip}>Skill</button>
      </span>

      <span class="item-wrap">
        <button class="btn" type="button" onclick={() => { showItemPicker = !showItemPicker; }}>Item</button>
        {#if showItemPicker}
          <div class="item-picker" role="menu">
            {#if consumables.length === 0}
              <p>No consumables.</p>
            {:else}
              {#each consumables as { entry, item } (entry.itemId)}
                <button class="picker-row" type="button" onclick={() => consume(entry.itemId)}>
                  {item!.name} <span class="qty">×{entry.qty}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </span>

      <button class="btn" type="button" onclick={flee}>Flee</button>
    {/if}
  </div>
</section>

<style>
  .world {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding: 24px 36px;
    box-sizing: border-box;
  }

  .world-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .act-marker {
    font-family: var(--serif-display);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0;
  }

  .location-title {
    font-family: var(--serif-display);
    font-size: 36px;
    font-weight: normal;
    margin: 4px 0 0;
    line-height: 1.1;
  }

  .compass {
    color: var(--ink);
    opacity: 0.7;
    transition: opacity 160ms ease, transform 400ms ease;
    flex-shrink: 0;
    margin-bottom: 6px;
  }
  .compass:hover {
    opacity: 1;
    transform: rotate(8deg);
  }

  .rule {
    height: 1px;
    background: var(--ink);
    opacity: 0.6;
    margin: 18px 0 24px;
  }

  .log {
    flex: 1;
    overflow-y: auto;
    font-size: 18px;
    line-height: 1.75;
  }

  .entry {
    margin: 0 0 16px;
  }
  .narration {
    text-align: justify;
  }
  .dialogue {
    margin-left: 28px;
  }
  .dialogue .speaker {
    display: block;
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 4px;
  }
  .dialogue .line {
    display: block;
    font-style: italic;
  }
  .system {
    margin: 0 0 14px 28px;
    padding-left: 14px;
    border-left: 2px solid var(--hairline);
    font-style: italic;
    font-size: 14px;
    color: var(--ink-muted);
  }
  .system-label {
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 11px;
    font-style: normal;
    color: var(--ink-faint);
    margin-right: 4px;
  }
  .combat { font-size: 16px; line-height: 1.5; }
  .loot { color: var(--gilt); }
  .scene-divider {
    text-align: center;
    font-family: var(--serif-display);
    color: var(--ink-faint);
    letter-spacing: 0.8em;
    margin: 24px 0;
  }

  .button-bar {
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--hairline);
  }
  .placeholder {
    font-style: italic;
    color: var(--ink-faint);
    margin: 0;
  }

  .btn {
    font-family: var(--serif-body);
    font-size: 16px;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--ink);
    padding: 8px 16px;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: background 180ms ease, color 180ms ease;
    margin-right: 12px;
  }
  .btn:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .btn::before { content: '['; margin-right: 4px; color: var(--ink-muted); }
  .btn::after { content: ']'; margin-left: 4px; color: var(--ink-muted); }
  .btn:hover::before, .btn:hover::after { color: var(--paper-warm); }

  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn:disabled:hover { background: transparent; color: var(--ink); }
  .skill-wrap, .item-wrap { position: relative; display: inline-block; }
  .item-picker {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    background: var(--paper);
    border: 1px solid var(--ink);
    padding: 8px 4px;
    min-width: 220px;
    box-shadow: 2px 3px 8px rgba(0,0,0,0.2);
    z-index: 30;
  }
  .item-picker p { margin: 6px 12px; font-style: italic; color: var(--ink-muted); }
  .picker-row {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 12px;
    border: none;
    background: transparent;
    font-family: var(--serif-body);
    font-size: 15px;
    cursor: pointer;
  }
  .picker-row:hover { background: rgba(166, 131, 56, 0.12); }
  .picker-row .qty { color: var(--ink-muted); font-size: 12px; }
</style>
