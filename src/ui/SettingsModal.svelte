<script lang="ts">
  import { gameStore } from './store.svelte';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  function setTheme(theme: 'parchment' | 'moonlit') {
    gameStore.dispatch({ kind: 'SetTheme', theme });
  }

  function setTextSize(size: 'small' | 'medium' | 'large') {
    gameStore.dispatch({ kind: 'SetTextSize', size });
  }

  function toggleAutoSave() {
    gameStore.dispatch({ kind: 'ToggleAutoSave' });
  }

  function preserveTale() {
    gameStore.saveNow();
  }

  function consignToFlames() {
    if (confirm('Consign this tale to the flames? This cannot be undone.')) {
      gameStore.resetSave();
      onClose();
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={onBackdropClick}
    onkeydown={onKey}
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="dialog-header">
        <h2 id="settings-title">Settings</h2>
        <button class="close" type="button" onclick={onClose} aria-label="Close">×</button>
      </header>

      <fieldset>
        <legend>Theme</legend>
        <label>
          <input
            type="radio"
            name="theme"
            value="parchment"
            checked={gameStore.state.settings.theme === 'parchment'}
            onchange={() => setTheme('parchment')}
          />
          Parchment
        </label>
        <label>
          <input
            type="radio"
            name="theme"
            value="moonlit"
            checked={gameStore.state.settings.theme === 'moonlit'}
            onchange={() => setTheme('moonlit')}
          />
          Moonlit
        </label>
      </fieldset>

      <fieldset>
        <legend>Text size</legend>
        {#each ['small', 'medium', 'large'] as const as size}
          <label>
            <input
              type="radio"
              name="text-size"
              value={size}
              checked={gameStore.state.settings.textSize === size}
              onchange={() => setTextSize(size)}
            />
            {size.charAt(0).toUpperCase() + size.slice(1)}
          </label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>Autosave</legend>
        <label>
          <input
            type="checkbox"
            checked={gameStore.state.settings.autoSave}
            onchange={toggleAutoSave}
          />
          Preserve every action
        </label>
      </fieldset>

      <div class="actions">
        <button type="button" onclick={preserveTale}>Preserve thy tale</button>
        <button type="button" class="danger" onclick={consignToFlames}>
          Consign this tale to the flames
        </button>
      </div>
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
    min-width: 360px;
    max-width: 480px;
    border: 1px solid var(--hairline);
    box-shadow: 4px 6px 20px rgba(0, 0, 0, 0.25);
    font-family: var(--serif-body);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 18px;
  }
  .dialog-header h2 {
    font-family: var(--serif-display);
    font-size: 24px;
    margin: 0;
    font-weight: normal;
  }
  .close {
    font-size: 28px;
    line-height: 1;
    color: var(--ink-muted);
  }
  .close:hover { color: var(--ink); }
  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 18px;
  }
  legend {
    font-family: var(--serif-display);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 8px;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-right: 18px;
    font-size: 15px;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .actions button {
    border: 1px solid var(--ink);
    padding: 8px 14px;
    font-family: var(--serif-body);
    font-size: 14px;
  }
  .actions button:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .actions button.danger {
    border-color: var(--crimson);
    color: var(--crimson);
  }
  .actions button.danger:hover {
    background: var(--crimson);
    color: var(--paper);
  }
</style>
