<script lang="ts">
  import { gameStore } from './store.svelte';

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
    return `${word} Hero`;
  }

  function epithet(): string {
    // Plan 2 will pull this from the class definition. Plan 1 hardcodes
    // for demo state.
    return 'the Reluctant Farmboy';
  }
</script>

<aside class="persona" aria-label="Character panel">
  <p class="persona-heading">Dramatis Persona</p>
  <div class="persona-rule"></div>

  <h2 class="persona-name">{c.name || '— (unnamed) —'}</h2>
  <p class="persona-epithet">{epithet()}</p>
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
        <div class="bar"><div class="fill xp" style:width="{c.xp}%"></div></div>
        <span class="value">{c.xp}%</span>
      </div>
    {/if}
  </section>

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
        <span class="slot-label">Wpn</span>
        <span class="slot-item" class:empty={!c.equipment.weapon}>
          {c.equipment.weapon ?? '— unchosen —'}
        </span>
        <span class="slot-label">Arm</span>
        <span class="slot-item" class:empty={!c.equipment.armor}>
          {c.equipment.armor ?? '— unchosen —'}
        </span>
        <span class="slot-label">Trk</span>
        <span class="slot-item" class:empty={!c.equipment.trinket}>
          {c.equipment.trinket ?? '— unchosen —'}
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
          <div class="effect-slot" class:filled={i < c.inventory.length}>
            {#if i < c.inventory.length}<span class="glyph">✦</span>{/if}
          </div>
        {/each}
      </div>
      <div class="effects-count">{c.inventory.length} / 12</div>
    {/if}
  </section>

  <p class="persona-footer">(<em>dram. pers.: our hero</em>)</p>
</aside>

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
</style>
