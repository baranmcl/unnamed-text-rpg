<script lang="ts">
  import { untrack } from 'svelte';
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import type { Achievement, AchievementId } from '../engine/types';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  $effect(() => {
    if (open) untrack(() => gameStore.markAchievementsOpened());
  });

  let allAchievements = $derived(Object.values(content.achievements) as Achievement[]);
  let visible = $derived(allAchievements.filter((a) => !a.hidden));
  let hiddenAll = $derived(allAchievements.filter((a) => a.hidden));

  let unlockedSet = $derived(new Set(gameStore.achievements.unlocked));
  let earned = $derived(visible.filter((a) => unlockedSet.has(a.id)));
  let locked = $derived(visible.filter((a) => !unlockedSet.has(a.id)));

  let earnedSorted = $derived.by(() => {
    const idx = new Map<AchievementId, number>();
    gameStore.achievements.unlocked.forEach((id, i) => idx.set(id, i));
    return [...earned].sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
  });

  let earnedCount = $derived(earned.length);
  let visibleTotal = $derived(visible.length);
  let hiddenEarnedCount = $derived(hiddenAll.filter((a) => unlockedSet.has(a.id)).length);
  let hiddenTotal = $derived(hiddenAll.length);

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={onBackdropClick} onkeydown={onKey}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ach-title">
      <header class="dialog-header">
        <h2 id="ach-title">Achievements ({earnedCount} / {visibleTotal} earned)</h2>
        <button class="close" type="button" onclick={onClose} aria-label="Close">×</button>
      </header>

      <ul class="list">
        {#each earnedSorted as ach (ach.id)}
          <li class="row earned">
            <span class="glyph">✦</span>
            <span class="body">
              <span class="name">{ach.name}</span>
              <span class="description">{ach.description}</span>
            </span>
          </li>
        {/each}
        {#each locked as ach (ach.id)}
          <li class="row locked">
            <span class="glyph">◇</span>
            <span class="body">
              <span class="name">{ach.name}</span>
              <span class="description">{ach.descriptionHidden ? '?' : ach.description}</span>
            </span>
          </li>
        {/each}
      </ul>

      <footer class="footer">
        <p>Hidden — {hiddenEarnedCount} of {hiddenTotal} remaining</p>
        <p class="aside">— keep playing —</p>
      </footer>
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
    min-width: 420px;
    max-width: 560px;
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
    margin-bottom: 16px;
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
  .list {
    list-style: none;
    padding: 0;
    margin: 0 0 18px;
  }
  .row {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px dashed var(--hairline);
    align-items: flex-start;
  }
  .row:last-child { border-bottom: none; }
  .glyph {
    font-size: 18px;
    line-height: 1.4;
    flex-shrink: 0;
  }
  .row.earned .glyph { color: var(--gilt); }
  .row.locked .glyph { color: var(--ink-faint); }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-family: var(--serif-display);
    font-size: 15px;
  }
  .row.earned .name { color: var(--gilt); }
  .description {
    font-size: 13px;
    font-style: italic;
    color: var(--ink-muted);
  }
  .footer {
    border-top: 1px solid var(--hairline);
    padding-top: 12px;
    color: var(--ink-faint);
    font-size: 13px;
    font-style: italic;
  }
  .footer p { margin: 0; }
  .footer .aside { margin-top: 4px; letter-spacing: 0.18em; }
</style>
