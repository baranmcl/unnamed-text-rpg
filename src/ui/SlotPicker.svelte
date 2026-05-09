<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import { CHAPTER_TITLES } from '../engine/types';
  import { MAX_SLOTS, type SlotData } from '../engine/slots';

  let summaries = $derived.by(() => gameStore.getSlotSummaries());

  function classEpithet(slot: SlotData): string {
    const cls = content.classes[slot.live.character.classId];
    return cls?.epithet ?? '';
  }

  function chapterLabel(slot: SlotData): string {
    return CHAPTER_TITLES[slot.live.story.stage] ?? slot.live.story.stage;
  }

  function relativeTime(slot: SlotData): string {
    // We don't currently persist a last-played timestamp; use the most recent
    // log entry id as a proxy for recency vs. brand-newness.
    const log = slot.live.log;
    if (!log || log.length === 0) return 'just begun';
    return `${log.length} entries written`;
  }

  let confirmingForgetIdx = $state<number | null>(null);

  function resume(i: number) {
    gameStore.switchToSlot(i);
  }

  function beginNewTale(i: number) {
    gameStore.beginNewTaleInSlot(i);
  }

  function askForget(i: number) {
    confirmingForgetIdx = i;
  }

  function confirmForget() {
    if (confirmingForgetIdx === null) return;
    gameStore.consignSlot(confirmingForgetIdx);
    confirmingForgetIdx = null;
  }

  function cancelForget() {
    confirmingForgetIdx = null;
  }
</script>

<div class="picker">
  <header>
    <h1>The Shelf of Heroes</h1>
    <p class="subtitle">Choose a tale to resume — or begin a new one.</p>
  </header>

  <ol class="slots">
    {#each Array(MAX_SLOTS) as _, i}
      {@const slot = summaries[i]}
      <li class="slot" class:filled={!!slot}>
        {#if slot}
          <div class="slot-info">
            <div class="name">{slot.live.character.name}</div>
            <div class="meta">
              {classEpithet(slot)} · {chapterLabel(slot)} · {relativeTime(slot)}
            </div>
          </div>
          <div class="slot-actions">
            <button type="button" class="resume" onclick={() => resume(i)}>
              Resume
            </button>
            <button type="button" class="forget danger" onclick={() => askForget(i)}>
              Forget
            </button>
          </div>
        {:else}
          <div class="slot-info empty">
            <div class="empty-line">An untold tale.</div>
          </div>
          <div class="slot-actions">
            <button type="button" class="begin" onclick={() => beginNewTale(i)}>
              Begin a new tale
            </button>
          </div>
        {/if}
      </li>
    {/each}
  </ol>
</div>

{#if confirmingForgetIdx !== null}
  <div class="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div class="confirm-dialog">
      <h3 id="confirm-title">Consign this tale to the flames?</h3>
      <p>The pages will not return. This cannot be undone.</p>
      <div class="confirm-actions">
        <button type="button" onclick={cancelForget}>Never mind</button>
        <button type="button" class="danger" onclick={confirmForget}>To the flames</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .picker {
    max-width: 720px;
    margin: 8vh auto;
    padding: 32px;
    font-family: var(--serif-body);
  }
  header {
    text-align: center;
    margin-bottom: 32px;
  }
  header h1 {
    font-family: var(--serif-display);
    font-size: 42px;
    margin: 0;
    font-weight: normal;
  }
  .subtitle {
    font-style: italic;
    color: var(--ink-muted);
    margin: 4px 0 0;
  }
  .slots {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .slot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--hairline);
    padding: 16px 20px;
  }
  .slot.filled {
    border-color: var(--ink);
  }
  .slot-info {
    flex: 1;
  }
  .slot-info .name {
    font-family: var(--serif-display);
    font-size: 20px;
  }
  .slot-info .meta {
    font-size: 13px;
    color: var(--ink-muted);
    margin-top: 2px;
  }
  .empty-line {
    font-style: italic;
    color: var(--ink-faint);
  }
  .slot-actions {
    display: flex;
    gap: 8px;
  }
  .slot-actions button {
    border: 1px solid var(--ink);
    padding: 6px 14px;
    font-family: var(--serif-body);
    font-size: 14px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .slot-actions button:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .slot-actions button.danger {
    border-color: var(--crimson);
    color: var(--crimson);
  }
  .slot-actions button.danger:hover {
    background: var(--crimson);
    color: var(--paper);
  }

  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 110;
  }
  .confirm-dialog {
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--crimson);
    box-shadow: 4px 6px 24px rgba(0, 0, 0, 0.35);
    padding: 24px 28px;
    max-width: 380px;
    font-family: var(--serif-body);
  }
  .confirm-dialog h3 {
    font-family: var(--serif-display);
    font-weight: normal;
    font-size: 22px;
    margin: 0 0 8px;
  }
  .confirm-dialog p {
    color: var(--ink-muted);
    font-style: italic;
    margin: 0 0 18px;
    font-size: 15px;
  }
  .confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .confirm-actions button {
    border: 1px solid var(--ink);
    padding: 8px 16px;
    font-family: var(--serif-body);
    font-size: 14px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .confirm-actions button:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .confirm-actions button.danger {
    border-color: var(--crimson);
    color: var(--crimson);
  }
  .confirm-actions button.danger:hover {
    background: var(--crimson);
    color: var(--paper);
  }
</style>
