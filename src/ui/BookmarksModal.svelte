<script lang="ts">
  import { gameStore } from './store.svelte';
  import type { Bookmark } from '../engine/slots';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  let label = $state('');
  let confirmingRestoreId = $state<string | null>(null);

  let bookmarks = $derived.by(() => {
    void gameStore.slotsRevision;
    if (gameStore.activeSlot === null) return [] as Bookmark[];
    const summaries = gameStore.getSlotSummaries();
    const slot = summaries[gameStore.activeSlot];
    if (!slot) return [] as Bookmark[];
    // Sort newest first for display.
    return [...slot.bookmarks].sort((a, b) => b.createdAt - a.createdAt);
  });

  function defaultLabel(): string {
    const d = new Date();
    return `Bookmark · ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function saveBookmark() {
    const labelToUse = label.trim() || defaultLabel();
    gameStore.createBookmark(labelToUse);
    label = '';
  }

  function askRestore(id: string) {
    confirmingRestoreId = id;
  }

  function confirmRestore() {
    if (confirmingRestoreId === null) return;
    gameStore.restoreBookmark(confirmingRestoreId);
    confirmingRestoreId = null;
    onClose();
  }

  function cancelRestore() {
    confirmingRestoreId = null;
  }

  function deleteBookmark(id: string) {
    gameStore.deleteBookmark(id);
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (confirmingRestoreId !== null) confirmingRestoreId = null;
      else onClose();
    }
  }

  function formatTime(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleString();
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={onBackdropClick}
    onkeydown={onKey}
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="bookmarks-title" aria-hidden={confirmingRestoreId !== null ? true : undefined}>
      <header class="dialog-header">
        <h2 id="bookmarks-title">Bookmarks</h2>
        <button type="button" class="close" onclick={onClose} aria-label="Close">×</button>
      </header>

      <div class="create">
        <label class="create-field">
          Label
          <input
            type="text"
            bind:value={label}
            placeholder="e.g., Before the Tax Rat"
            maxlength="60"
          />
        </label>
        <button type="button" class="create-btn" onclick={saveBookmark}>
          Bookmark this moment
        </button>
      </div>

      {#if bookmarks.length === 0}
        <p class="empty">No bookmarks yet. Take one before a risky moment.</p>
      {:else}
        <ul class="bookmarks">
          {#each bookmarks as bm (bm.id)}
            <li class="bookmark">
              <div class="bm-info">
                <span class="bm-label">{bm.label}</span>
                <span class="bm-meta">
                  <span class="bm-kind">{bm.kind === 'auto-chapter' ? 'auto' : 'manual'}</span>
                  · {formatTime(bm.createdAt)}
                </span>
              </div>
              <div class="bm-actions">
                <button type="button" onclick={() => askRestore(bm.id)}>Restore</button>
                {#if bm.kind === 'manual'}
                  <button type="button" class="danger" onclick={() => deleteBookmark(bm.id)}>
                    Forget
                  </button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if confirmingRestoreId !== null}
      <div class="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-restore-title">
        <div class="confirm-dialog">
          <h3 id="confirm-restore-title">Restore this moment?</h3>
          <p>Anything since will be unwritten.</p>
          <div class="confirm-actions">
            <button type="button" onclick={cancelRestore}>Never mind</button>
            <button type="button" class="primary" onclick={confirmRestore}>Restore</button>
          </div>
        </div>
      </div>
    {/if}
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
    padding: 28px 32px;
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
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .close:hover { color: var(--ink); }

  .create {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 24px;
  }
  .create-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .create-field input {
    font-family: var(--serif-body);
    font-size: 15px;
    padding: 6px 10px;
    border: 1px solid var(--ink);
    background: transparent;
    color: var(--ink);
    text-transform: none;
    letter-spacing: normal;
  }
  .create-btn {
    border: 1px solid var(--ink);
    padding: 8px 14px;
    font-family: var(--serif-body);
    font-size: 14px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .create-btn:hover {
    background: var(--ink);
    color: var(--paper);
  }

  .empty {
    font-style: italic;
    color: var(--ink-muted);
  }

  .bookmarks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bookmark {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--hairline);
  }
  .bm-info {
    display: flex;
    flex-direction: column;
  }
  .bm-label {
    font-size: 15px;
  }
  .bm-meta {
    font-size: 12px;
    color: var(--ink-muted);
    margin-top: 2px;
  }
  .bm-kind {
    font-family: var(--serif-display);
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.18em;
    padding: 1px 5px;
    border: 1px solid var(--ink-faint);
    margin-right: 4px;
  }
  .bm-actions {
    display: flex;
    gap: 6px;
  }
  .bm-actions button {
    border: 1px solid var(--ink);
    padding: 4px 10px;
    font-family: var(--serif-body);
    font-size: 13px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .bm-actions button:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .bm-actions button.danger {
    border-color: var(--crimson);
    color: var(--crimson);
  }
  .bm-actions button.danger:hover {
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
    border: 1px solid var(--ink);
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
  .confirm-actions button.primary {
    border-color: var(--gilt);
    color: var(--gilt);
  }
  .confirm-actions button.primary:hover {
    background: var(--gilt);
    color: var(--paper);
  }
</style>
