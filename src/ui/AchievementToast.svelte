<script lang="ts">
  import { gameStore } from './store.svelte';
  import { fly, fade } from 'svelte/transition';
  import type { Achievement, AchievementId } from '../engine/types';

  const DISMISS_MS = 4000;

  function dismiss(ach: Achievement) {
    gameStore.dismissToast(ach);
  }

  // Map of toast id → its dismiss timer, preserved across $effect re-runs
  // so a new toast arriving doesn't reset the countdown for existing toasts.
  const timers = new Map<AchievementId, ReturnType<typeof setTimeout>>();

  $effect(() => {
    const currentIds = new Set(gameStore.pendingToasts.map((a) => a.id));

    // Cancel timers for toasts that have been removed from the queue.
    for (const [id, t] of timers) {
      if (!currentIds.has(id)) {
        clearTimeout(t);
        timers.delete(id);
      }
    }

    // Schedule a timer only for ids we haven't already scheduled.
    for (const ach of gameStore.pendingToasts) {
      if (!timers.has(ach.id)) {
        const t = setTimeout(() => {
          timers.delete(ach.id);
          gameStore.dismissToast(ach);
        }, DISMISS_MS);
        timers.set(ach.id, t);
      }
    }

    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  });
</script>

<div class="toast-stack" role="status" aria-live="polite">
  {#each gameStore.pendingToasts as ach (ach.id)}
    <button
      class="toast"
      type="button"
      in:fly={{ y: -16, duration: 400 }}
      out:fade={{ duration: 200 }}
      onclick={() => dismiss(ach)}
    >
      <span class="glyph">✦</span>
      <span class="copy">
        <span class="name">{ach.name}</span>
        <span class="description">{ach.description}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--gilt);
    box-shadow: 2px 4px 14px rgba(0, 0, 0, 0.2);
    padding: 12px 18px;
    min-width: 280px;
    max-width: 420px;
    text-align: left;
    cursor: pointer;
    font-family: var(--serif-body);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .toast:hover {
    background: rgba(166, 131, 56, 0.06);
  }
  .glyph {
    color: var(--gilt);
    font-size: 22px;
    line-height: 1;
    margin-top: 1px;
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-family: var(--serif-display);
    font-size: 16px;
    color: var(--gilt);
    letter-spacing: 0.04em;
  }
  .description {
    font-style: italic;
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
