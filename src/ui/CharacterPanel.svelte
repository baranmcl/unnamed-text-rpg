<script lang="ts">
  import { gameStore } from './store.svelte';
  import InspectModal from './InspectModal.svelte';
  import { content } from '../content';
  import type { ItemId, StatusKind, StatusDuration } from '../engine/types';

  function glyphFor(kind: StatusKind): string {
    switch (kind) {
      case 'guaranteed_crit': return '✦';
      case 'next_attack_misses': return '✗';
      case 'weakness_revealed': return '◎';
      case 'intimidated': return '⌇';
      case 'skip_turn': return '⊘';
      case 'weapon_suspended': return '⌀';
      case 'armor_halved': return '½';
      case 'free_retaliation': return '↻';
    }
  }

  function labelFor(kind: StatusKind): string {
    return kind.replace(/_/g, ' ');
  }

  function formatDuration(d: StatusDuration): string {
    switch (d.kind) {
      case 'turns': return `${d.remaining} turn${d.remaining === 1 ? '' : 's'} remaining`;
      case 'until_end_of_fight': return 'until end of fight';
      case 'one_shot': return 'fires once';
      case 'fights_remaining': return `${d.n} fight${d.n === 1 ? '' : 's'} remaining`;
      case 'permanent': return 'permanent';
    }
  }

  const SECTION_KEY = 'heroicchronicle.ui.sectionsCollapsed';

  type SectionKey = 'vitals' | 'qualities' | 'accoutrements' | 'effects';

  function loadCollapsed(): Record<SectionKey, boolean> {
    try {
      const raw = localStorage.getItem(SECTION_KEY);
      if (!raw) return { vitals: false, qualities: false, accoutrements: false, effects: false };
      const parsed = JSON.parse(raw);
      return {
        vitals: !!parsed.vitals,
        qualities: !!parsed.qualities,
        accoutrements: !!parsed.accoutrements,
        effects: !!parsed.effects
      };
    } catch {
      return { vitals: false, qualities: false, accoutrements: false, effects: false };
    }
  }

  let collapsed = $state(loadCollapsed());

  function toggle(key: SectionKey) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
    try {
      localStorage.setItem(SECTION_KEY, JSON.stringify(collapsed));
    } catch { /* ignore */ }
  }

  let c = $derived(gameStore.state.character);

  // During combat, prefer the player combatant's statuses array — that's where
  // combat-scoped statuses (intimidated, weapon_suspended, guaranteed_crit, etc.)
  // live. Out of combat, fall back to character.statuses (world-scoped only).
  let displayedStatuses = $derived(
    gameStore.state.combat?.kind === 'turn-based'
      ? (gameStore.state.combat.combatants.find((cb) => cb.kind === 'player')?.statuses ?? c.statuses)
      : c.statuses
  );

  let inspectingItem = $state<ItemId | null>(null);

  function openInspect(itemId: ItemId) {
    inspectingItem = itemId;
  }
  function closeInspect() {
    inspectingItem = null;
  }

  let dynamicEpithet = $derived(content.classes[c.classId]?.epithet ?? 'the Untitled');

  function pct(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return Math.max(0, Math.min(100, (part / whole) * 100));
  }

  function levelTitle(level: number): string {
    const ordinals = [
      'Untested', 'First-Degree', 'Second-Degree', 'Third-Degree',
      'Fourth-Degree', 'Fifth-Degree', 'Sixth-Degree', 'Seventh-Degree',
      'Eighth-Degree', 'Ninth-Degree', 'Tenth-Degree'
    ];
    const word = ordinals[Math.min(level, ordinals.length - 1)] ?? 'Legendary';
    return `Level ${level} · ${word} Hero`;
  }

  function equippedName(itemId: ItemId | undefined): string {
    if (!itemId) return '— unchosen —';
    return content.items[itemId]?.name ?? String(itemId);
  }

  function equipmentTooltip(itemId: ItemId | undefined): string {
    if (!itemId) return '';
    const item = content.items[itemId];
    if (!item) return '';
    const parts: string[] = [];
    if (item.damage !== undefined) parts.push(`Damage ${item.damage}`);
    if (item.armor !== undefined) parts.push(`Armor ${item.armor}`);
    if (item.statBonuses) {
      for (const [stat, bonus] of Object.entries(item.statBonuses)) {
        parts.push(`+${bonus} ${stat}`);
      }
    }
    return parts.length > 0 ? parts.join(' · ') : item.flavor;
  }

  function itemGlyph(itemId: ItemId): string {
    const item = content.items[itemId];
    if (!item) return '✦';
    switch (item.kind) {
      case 'weapon': return '⚔';
      case 'armor': return '◇';
      case 'trinket': return '✦';
      case 'quest': return '❦';
      case 'consumable': return '❀';
      default: return '✦';
    }
  }

  function xpToNextLevel(level: number): number {
    return level * 100;
  }

  function formatCurrency(leaves: number): string {
    if (leaves === 0) return '— empty —';
    const logs = Math.floor(leaves / 100);
    const branches = Math.floor((leaves % 100) / 10);
    const remainder = leaves % 10;
    const parts: string[] = [];
    if (logs > 0) parts.push(`${logs} log${logs === 1 ? '' : 's'}`);
    if (branches > 0) parts.push(`${branches} branch${branches === 1 ? '' : 'es'}`);
    if (remainder > 0) parts.push(`${remainder} ${remainder === 1 ? 'leaf' : 'leaves'}`);
    return parts.join(' · ');
  }

</script>

<aside class="persona" aria-label="Character panel">
  <p class="persona-heading">Dramatis Persona</p>
  <div class="persona-rule"></div>

  <h2 class="persona-name">{c.name || '— (unnamed) —'}</h2>
  <p class="persona-epithet">{dynamicEpithet}</p>
  <p class="persona-level">{levelTitle(c.level)}</p>

  <!-- Vitals -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('vitals')} aria-expanded={!collapsed.vitals}>
      <span>Vitals</span>
      <span class="chevron">{collapsed.vitals ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.vitals}
      <div class="vitals">
        <span class="label">HP</span>
        <div class="bar"><div class="fill hp" style:width="{pct(c.hp.current, c.hp.max)}%"></div></div>
        <span class="value">{c.hp.current} / {c.hp.max}</span>

        <span class="label">MP</span>
        <div class="bar"><div class="fill mp" style:width="{pct(c.mp.current, c.mp.max)}%"></div></div>
        <span class="value">{c.mp.current} / {c.mp.max}</span>

        <span class="label">XP</span>
        <div class="bar"><div class="fill xp" style:width="{Math.min(100, (c.xp / xpToNextLevel(c.level)) * 100)}%"></div></div>
        <span class="value">{c.xp} / {xpToNextLevel(c.level)}</span>

        <span class="label">Purse</span>
        <span class="purse-value" style="grid-column: span 2; text-align: right; font-family: var(--mono); font-size: 13px;">{formatCurrency(c.currency)}</span>
      </div>
    {/if}
  </section>

  <!-- Afflictions & Boons -->
  {#if displayedStatuses.length > 0}
    <section class="afflictions">
      <h4 class="afflictions-heading">Afflictions &amp; Boons</h4>
      <ul class="status-list">
        {#each displayedStatuses as st (st.id)}
          <li class="status-pill" title={`${st.source} — ${formatDuration(st.duration)}`}>
            <span class="status-glyph">{glyphFor(st.kind)}</span>
            <span class="status-name">{labelFor(st.kind)}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <!-- Qualities (the four B's) -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('qualities')} aria-expanded={!collapsed.qualities}>
      <span>Qualities</span>
      <span class="chevron">{collapsed.qualities ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.qualities}
      <div class="stats">
        <div class="stat"><span class="name">Brawn</span><span class="num">{c.stats.brawn}</span></div>
        <div class="stat"><span class="name">Brains</span><span class="num">{c.stats.brains}</span></div>
        <div class="stat"><span class="name">Bravado</span><span class="num">{c.stats.bravado}</span></div>
        <div class="stat"><span class="name">(B)Luck</span><span class="num">{c.stats.bluck}</span></div>
      </div>
    {/if}
  </section>

  <!-- Accoutrements -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('accoutrements')} aria-expanded={!collapsed.accoutrements}>
      <span>Accoutrements</span>
      <span class="chevron">{collapsed.accoutrements ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.accoutrements}
      <div class="equip">
        <span class="slot-label" title="Weapon">Wpn</span>
        <span class="slot-item" class:empty={!c.equipment.weapon} title={equipmentTooltip(c.equipment.weapon)}>
          {equippedName(c.equipment.weapon)}
        </span>
        <span class="slot-label" title="Armor">Arm</span>
        <span class="slot-item" class:empty={!c.equipment.armor} title={equipmentTooltip(c.equipment.armor)}>
          {equippedName(c.equipment.armor)}
        </span>
        <span class="slot-label" title="Accessory">Acc</span>
        <span class="slot-item" class:empty={!c.equipment.trinket} title={equipmentTooltip(c.equipment.trinket)}>
          {equippedName(c.equipment.trinket)}
        </span>
      </div>
    {/if}
  </section>

  <!-- Effects on his Person -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('effects')} aria-expanded={!collapsed.effects}>
      <span>Effects on his Person</span>
      <span class="chevron">{collapsed.effects ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.effects}
      <div class="effects">
        {#each Array(12) as _, i (i)}
          {#if i < c.inventory.length}
            {@const entry = c.inventory[i]!}
            <button class="effect-slot filled" type="button" onclick={() => openInspect(entry.itemId)} aria-label="Inspect item" title={content.items[entry.itemId]?.name ?? ''}>
              <span class="glyph">{itemGlyph(entry.itemId)}</span>
            </button>
          {:else}
            <div class="effect-slot" aria-hidden="true"></div>
          {/if}
        {/each}
      </div>
      <div class="effects-count">{c.inventory.length} / 12</div>
    {/if}
  </section>

  <p class="persona-footer">(<em>dram. pers.: our hero</em>)</p>
</aside>

{#if inspectingItem}
  <InspectModal itemId={inspectingItem} onClose={closeInspect} />
{/if}

<style>
  .persona {
    height: 100%;
    overflow-y: auto;
    padding: 24px 28px;
    box-sizing: border-box;
    font-family: var(--serif-body);
    font-size: 15px;
    line-height: 1.5;
  }
  .persona-heading {
    font-family: var(--serif-display);
    font-size: 12px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-align: center;
    margin: 0 0 4px;
  }
  .persona-rule {
    height: 1px;
    background: var(--ink);
    opacity: 0.6;
    margin: 0 0 20px;
  }
  .persona-name {
    font-family: var(--serif-display);
    font-size: 30px;
    margin: 0;
    line-height: 1.1;
    text-align: center;
  }
  .persona-epithet {
    font-style: italic;
    font-size: 16px;
    color: var(--ink-muted);
    text-align: center;
    margin: 4px 0 2px;
  }
  .persona-level {
    font-family: var(--serif-body);
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-align: center;
    margin: 0 0 22px;
  }
  .section { margin-bottom: 22px; }
  .section-head {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 8px;
    font-family: var(--serif-body);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 10px;
  }
  .section-head .chevron {
    font-family: var(--serif-display);
    font-size: 13px;
    color: var(--ink-faint);
    margin-left: auto;
  }
  .vitals {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 10px;
    row-gap: 8px;
    align-items: center;
  }
  .vitals .label {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }
  .vitals .value {
    font-family: var(--mono);
    font-size: 13px;
    text-align: right;
  }
  .bar {
    position: relative;
    height: 10px;
    border: 1px solid var(--ink);
    background: transparent;
  }
  .fill {
    position: absolute;
    top: -1px; bottom: -1px; left: -1px;
    border: 1px solid;
  }
  .fill.hp { background: var(--crimson); border-color: var(--crimson-deep); }
  .fill.mp { background: var(--moss); border-color: #2e4525; }
  .fill.xp { background: var(--gilt); border-color: #6e5522; }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
  }
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px dotted var(--hairline);
    padding: 3px 0;
  }
  .stat .name {
    font-style: italic;
    font-size: 15px;
  }
  .stat .num {
    font-family: var(--mono);
    font-size: 15px;
    font-weight: bold;
  }
  .equip {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 14px;
    row-gap: 6px;
    align-items: baseline;
  }
  .slot-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }
  .slot-item {
    font-style: italic;
    font-size: 15px;
  }
  .slot-item.empty { color: var(--ink-faint); }
  .effects {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .effect-slot {
    aspect-ratio: 1;
    border: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--serif-display);
    font-size: 20px;
    color: var(--ink-muted);
  }
  .effect-slot.filled {
    border-color: var(--ink);
    color: var(--ink);
  }
  button.effect-slot { cursor: pointer; background: transparent; }
  button.effect-slot:hover { background: rgba(166, 131, 56, 0.12); }
  .effects-count {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-muted);
    text-align: right;
    margin-top: 8px;
    letter-spacing: 0.05em;
  }
  .persona-footer {
    margin-top: 28px;
    font-size: 12px;
    font-style: italic;
    color: var(--ink-faint);
    text-align: center;
  }
  .afflictions { margin-bottom: 22px; }
  .afflictions-heading {
    font-family: var(--serif-body);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 10px;
    font-weight: normal;
  }
  .status-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--hairline);
    padding: 2px 8px;
    font-size: 12px;
    cursor: default;
  }
  .status-glyph {
    font-family: var(--serif-display);
    font-size: 13px;
    color: var(--ink-muted);
  }
  .status-name {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--ink);
    text-transform: lowercase;
  }
</style>
