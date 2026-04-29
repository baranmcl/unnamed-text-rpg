<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import { ClassId, type ClassId as ClassIdType } from '../engine/types';

  let name = $state('');
  let selectedClass = $state<ClassIdType | null>(null);

  // Display all four classes; only the Farmboy is actually selectable in Plan 2.
  const farmboy = content.classes[ClassId('reluctant_farmboy')]!;

  type CardEntry = {
    id: ClassIdType;
    name: string;
    epithet: string;
    enabled: boolean;
  };

  const classCards: CardEntry[] = [
    { id: farmboy.id, name: farmboy.name, epithet: farmboy.epithet, enabled: true },
    { id: ClassId('disgraced_knight'), name: 'Disgraced Knight', epithet: 'the Disgraced Knight', enabled: false },
    { id: ClassId('accidental_wizard'), name: 'Accidental Wizard', epithet: 'the Accidental Wizard', enabled: false },
    { id: ClassId('bard_who_didnt_ask_for_this'), name: "Bard Who Didn't Ask For This", epithet: "the Bard Who Didn't Ask For This", enabled: false }
  ];

  let canBegin = $derived(name.trim().length > 0 && selectedClass !== null);

  function begin() {
    if (!canBegin || !selectedClass) return;
    gameStore.dispatch({ kind: 'StartNewGame', name: name.trim(), classId: selectedClass });
  }
</script>

<div class="creation">
  <h1>The Heroic Chronicle</h1>
  <p class="subtitle">A new tale begins. Choose thy hero.</p>

  <form onsubmit={(e: Event) => { e.preventDefault(); begin(); }}>
    <label class="name-field">
      Name
      <input type="text" bind:value={name} placeholder="What art thou called?" maxlength="32" autocomplete="off" />
    </label>

    <fieldset class="classes" role="radiogroup">
      <legend>Class</legend>
      {#each classCards as cls}
        <label class="class-card" class:disabled={!cls.enabled} title={cls.enabled ? '' : 'Coming in Plan 4'}>
          <input
            type="radio"
            name="class"
            value={cls.id}
            checked={selectedClass === cls.id}
            disabled={!cls.enabled}
            onchange={() => { selectedClass = cls.id; }}
            aria-label="class {cls.name}"
          />
          <span class="card-body">
            <span class="card-name">{cls.name}</span>
            <span class="card-epithet">{cls.epithet}</span>
            {#if !cls.enabled}<span class="card-locked">— Coming in Plan 4 —</span>{/if}
          </span>
        </label>
      {/each}
    </fieldset>

    <button type="submit" class="begin" disabled={!canBegin}>Begin the tale</button>
  </form>
</div>

<style>
  .creation {
    max-width: 700px;
    margin: 8vh auto;
    padding: 32px;
    font-family: var(--serif-body);
  }
  h1 {
    font-family: var(--serif-display);
    font-size: 42px;
    margin: 0;
    text-align: center;
    font-weight: normal;
  }
  .subtitle {
    text-align: center;
    font-style: italic;
    color: var(--ink-muted);
    margin: 4px 0 28px;
  }
  .name-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 24px;
  }
  .name-field input {
    font-family: var(--serif-body);
    font-size: 18px;
    padding: 8px 10px;
    border: 1px solid var(--ink);
    background: transparent;
    color: var(--ink);
    text-transform: none;
    letter-spacing: normal;
  }
  fieldset.classes {
    border: none;
    padding: 0;
    margin: 0 0 28px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  legend {
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 10px;
  }
  .class-card {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--hairline);
    padding: 12px 14px;
    cursor: pointer;
  }
  .class-card.disabled { opacity: 0.45; cursor: not-allowed; }
  .class-card:has(input:checked) { border-color: var(--ink); background: rgba(166, 131, 56, 0.08); }
  .card-body { display: flex; flex-direction: column; }
  .card-name { font-family: var(--serif-display); font-size: 18px; }
  .card-epithet { font-style: italic; color: var(--ink-muted); font-size: 14px; }
  .card-locked { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
  .begin {
    border: 1px solid var(--ink);
    padding: 12px 24px;
    font-family: var(--serif-body);
    font-size: 16px;
    cursor: pointer;
  }
  .begin:disabled { opacity: 0.4; cursor: not-allowed; }
  .begin:not(:disabled):hover { background: var(--ink); color: var(--paper); }
</style>
