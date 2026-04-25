<script lang="ts">
  import SettingsModal from './SettingsModal.svelte';

  let settingsOpen = $state(false);

  function openSettings() {
    settingsOpen = true;
  }

  function closeSettings() {
    settingsOpen = false;
  }

  // Plan 1 ships a static folio. Plan 6 will derive it from story stage.
  const folio = '— i.i.0 —';
</script>

<button
  class="gear"
  type="button"
  aria-label="Settings"
  onclick={openSettings}
>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    />
  </svg>
</button>

<div class="folio">{folio}</div>

<SettingsModal open={settingsOpen} onClose={closeSettings} />

<style>
  .gear {
    position: fixed;
    top: 18px;
    right: 18px;
    color: var(--ink);
    opacity: 0.55;
    transition: opacity 160ms ease, transform 160ms ease;
    z-index: 50;
  }
  .gear:hover {
    opacity: 1;
    transform: translateY(-1px);
  }

  .folio {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--serif-display);
    font-size: 13px;
    color: var(--ink-faint);
    letter-spacing: 0.2em;
    z-index: 5;
    pointer-events: none;
  }
</style>
