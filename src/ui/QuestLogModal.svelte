<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import { untrack } from 'svelte';
  import type { Quest, QuestId } from '../engine/types';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  $effect(() => {
    if (open) untrack(() => gameStore.markQuestLogOpened());
  });

  // Per-quest collapse state for the "Completed (N)" toggle. Resets on
  // modal close because the component remounts when `open` toggles.
  let collapsed = $state<Record<string, boolean>>({});

  function toggleCollapse(questId: QuestId) {
    collapsed = { ...collapsed, [questId]: !(collapsed[questId] ?? false) };
  }

  let allQuests = $derived(Object.values(content.quests) as Quest[]);
  let activeIds = $derived(gameStore.state.story.activeQuests);
  let completedIds = $derived(gameStore.state.story.completedQuests);
  let doneObjectives = $derived(gameStore.state.story.completedObjectives);

  let activeMain = $derived(
    activeIds
      .map((id) => allQuests.find((q) => q.id === id))
      .filter((q): q is Quest => !!q && q.kind === 'main')
  );
  let activeSide = $derived(
    activeIds
      .map((id) => allQuests.find((q) => q.id === id))
      .filter((q): q is Quest => !!q && q.kind === 'side')
  );
  let completed = $derived(
    completedIds
      .map((id) => allQuests.find((q) => q.id === id))
      .filter((q): q is Quest => !!q)
  );

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function currentObjectiveOf(quest: Quest) {
    const done = doneObjectives[quest.id] ?? [];
    return quest.objectives.find((o) => !done.includes(o.id));
  }

  function completedObjectivesOf(quest: Quest) {
    const done = doneObjectives[quest.id] ?? [];
    return quest.objectives.filter((o) => done.includes(o.id));
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={onBackdropClick} onkeydown={onKey}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="quest-log-title">
      <header class="dialog-header">
        <h2 id="quest-log-title">Quest Log</h2>
        <button class="close" type="button" onclick={onClose} aria-label="Close">×</button>
      </header>

      <section class="quest-section">
        <h3 class="section-title">Active — Main</h3>
        {#if activeMain.length === 0}
          <p class="empty">(none yet)</p>
        {:else}
          {#each activeMain as quest (quest.id)}
            {@const current = currentObjectiveOf(quest)}
            {@const doneList = completedObjectivesOf(quest)}
            {@const isCollapsed = collapsed[quest.id] ?? false}
            <article class="quest">
              <div class="quest-head">
                <span class="quest-glyph">✦</span>
                <div class="quest-text">
                  <span class="quest-title">{quest.title}</span>
                  <span class="quest-description">{quest.description}</span>
                </div>
              </div>
              <ul class="objectives">
                {#if doneList.length > 0}
                  <li class="collapse-row">
                    <button type="button" class="collapse-toggle" onclick={() => toggleCollapse(quest.id)}>
                      {isCollapsed ? '▸' : '▾'} Completed ({doneList.length})
                    </button>
                  </li>
                  {#if !isCollapsed}
                    {#each doneList as obj (obj.id)}
                      <li class="objective done">
                        <span class="check">☑</span>
                        <span class="label">{obj.label}</span>
                      </li>
                    {/each}
                  {/if}
                {/if}
                {#if current}
                  <li class="objective current">
                    <span class="check">☐</span>
                    <span class="label">{current.label}</span>
                  </li>
                {/if}
              </ul>
            </article>
          {/each}
        {/if}
      </section>

      <section class="quest-section">
        <h3 class="section-title">Active — Side</h3>
        {#if activeSide.length === 0}
          <p class="empty">(none yet)</p>
        {:else}
          {#each activeSide as quest (quest.id)}
            <article class="quest">
              <span class="quest-glyph">✦</span>
              <span class="quest-title">{quest.title}</span>
            </article>
          {/each}
        {/if}
      </section>

      <section class="quest-section">
        <h3 class="section-title">Completed</h3>
        {#if completed.length === 0}
          <p class="empty">(none yet)</p>
        {:else}
          {#each completed as quest (quest.id)}
            <article class="quest done-quest">
              <div class="quest-head">
                <span class="quest-glyph">✦</span>
                <div class="quest-text">
                  <span class="quest-title">{quest.title}</span>
                  <span class="quest-description">{quest.description}</span>
                </div>
              </div>
            </article>
          {/each}
        {/if}
      </section>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    background: var(--paper);
    color: var(--ink);
    padding: 28px 36px;
    min-width: 460px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--hairline);
    box-shadow: 4px 6px 20px rgba(0, 0, 0, 0.25);
    font-family: var(--serif-body);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
  }
  .dialog-header h2 {
    font-family: var(--serif-display);
    font-size: 22px;
    margin: 0;
    font-weight: normal;
  }
  .close {
    font-size: 28px;
    line-height: 1;
    color: var(--ink-muted);
    background: none;
    border: none;
    cursor: pointer;
  }
  .close:hover { color: var(--ink); }
  .quest-section {
    margin-bottom: 24px;
  }
  .quest-section:last-of-type {
    margin-bottom: 0;
  }
  .section-title {
    font-family: var(--serif-display);
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 10px;
    font-weight: normal;
  }
  .empty {
    font-style: italic;
    color: var(--ink-faint);
    margin: 0;
  }
  .quest {
    margin-bottom: 14px;
  }
  .quest:last-child {
    margin-bottom: 0;
  }
  .quest-head {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .quest-glyph {
    color: var(--gilt);
    font-size: 16px;
    line-height: 1.4;
    flex-shrink: 0;
  }
  .quest-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .quest-title {
    font-family: var(--serif-display);
    font-size: 16px;
    color: var(--gilt);
    letter-spacing: 0.04em;
  }
  .done-quest .quest-title {
    text-decoration: line-through;
    text-decoration-color: var(--ink-faint);
  }
  .quest-description {
    font-style: italic;
    font-size: 13px;
    color: var(--ink-muted);
  }
  .objectives {
    list-style: none;
    padding: 0;
    margin: 8px 0 0 26px;
  }
  .objective {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 4px 0;
    font-size: 14px;
  }
  .objective.done {
    color: var(--ink-muted);
  }
  .check {
    flex-shrink: 0;
    line-height: 1.4;
  }
  .label {
    line-height: 1.4;
  }
  .collapse-row {
    padding: 4px 0;
  }
  .collapse-toggle {
    background: none;
    border: none;
    color: var(--ink-muted);
    font-family: var(--serif-display);
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }
  .collapse-toggle:hover {
    color: var(--ink);
  }
</style>
