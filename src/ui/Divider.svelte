<script lang="ts">
  import { onMount } from 'svelte';

  const KEY = 'heroicchronicle.ui.dividerWidth';
  const DEFAULT_FRACTION = 0.62;
  const MIN = 0.25;
  const MAX = 0.75;

  function loadFraction(): number {
    try {
      const v = localStorage.getItem(KEY);
      if (v === null) return DEFAULT_FRACTION;
      const parsed = parseFloat(v);
      if (isNaN(parsed)) return DEFAULT_FRACTION;
      return Math.max(MIN, Math.min(MAX, parsed));
    } catch {
      return DEFAULT_FRACTION;
    }
  }

  let fraction = $state(loadFraction());
  let dragging = $state(false);
  let containerEl: HTMLElement | null = null;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !containerEl) return;
    const rect = containerEl.parentElement!.getBoundingClientRect();
    const raw = (e.clientX - rect.left) / rect.width;
    fraction = Math.max(MIN, Math.min(MAX, raw));
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    try {
      localStorage.setItem(KEY, fraction.toString());
    } catch {
      /* ignore */
    }
  }

  onMount(() => {
    if (containerEl) {
      const parent = containerEl.parentElement;
      if (parent) {
        parent.style.setProperty('--world-fraction', fraction.toString());
      }
    }
  });

  $effect(() => {
    if (containerEl) {
      const parent = containerEl.parentElement;
      if (parent) {
        parent.style.setProperty('--world-fraction', fraction.toString());
      }
    }
  });
</script>

<div
  bind:this={containerEl}
  class="divider"
  data-testid="divider"
  data-world-fraction={fraction}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panels"
  aria-valuemin={MIN}
  aria-valuemax={MAX}
  aria-valuenow={fraction}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <div class="grabber"></div>
</div>

<style>
  .divider {
    position: relative;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--hairline) 8%,
      var(--hairline) 92%,
      transparent 100%
    );
    cursor: col-resize;
    user-select: none;
    touch-action: none;
  }
  .grabber {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 42px;
    background: var(--paper);
    border-left: 1px solid var(--hairline);
    border-right: 1px solid var(--hairline);
  }
  .grabber::after {
    content: '❦';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--serif-display);
    color: var(--ink-muted);
    font-size: 16px;
    line-height: 1;
  }
</style>
