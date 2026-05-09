import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BookmarksModal from '../BookmarksModal.svelte';
import { gameStore } from '../store.svelte';
import { ClassId } from '../../engine/types';

beforeEach(() => {
  if (typeof Element !== 'undefined' && !(Element.prototype as any).animate) {
    (Element.prototype as any).animate = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel: () => {},
      onfinish: null
    }));
  }
});

describe('BookmarksModal', () => {
  beforeEach(() => {
    localStorage.clear();
    for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
  });

  it('renders empty state when no bookmarks exist', () => {
    const { getByText } = render(BookmarksModal, { open: true, onClose: () => {} });
    expect(getByText(/Bookmark this moment/i)).toBeTruthy();
    expect(getByText(/No bookmarks yet/i)).toBeTruthy();
  });

  it('Bookmark this moment creates a manual bookmark', async () => {
    const { getByLabelText, getByRole } = render(BookmarksModal, { open: true, onClose: () => {} });
    const labelInput = getByLabelText(/Label/i) as HTMLInputElement;
    await fireEvent.input(labelInput, { target: { value: 'Test bookmark' } });
    const saveBtn = getByRole('button', { name: /Bookmark this moment/i });
    await fireEvent.click(saveBtn);
    // Re-render: bookmark should appear in the list
    const summaries = gameStore.getSlotSummaries();
    expect(summaries[0]?.bookmarks).toHaveLength(1);
    expect(summaries[0]?.bookmarks[0]!.label).toBe('Test bookmark');
  });

  it('lists existing manual bookmarks with Restore and Forget', async () => {
    gameStore.createBookmark('Alpha');
    const { getByText, getByRole } = render(BookmarksModal, { open: true, onClose: () => {} });
    expect(getByText('Alpha')).toBeTruthy();
    expect(getByRole('button', { name: /Restore/i })).toBeTruthy();
    expect(getByRole('button', { name: /Forget/i })).toBeTruthy();
  });

  it('does not show Forget for auto-chapter bookmarks', async () => {
    // Inject an auto-chapter bookmark directly into slot storage so we don't
    // depend on dispatching a state-changing event in test.
    const slotKey = 'heroicchronicle.slot.0.v1';
    const slot = JSON.parse(localStorage.getItem(slotKey)!);
    slot.bookmarks = [
      ...slot.bookmarks,
      {
        id: 'auto_test_1',
        kind: 'auto-chapter',
        label: 'Chapter 2 · The Call to Adventure',
        createdAt: Date.now(),
        snapshot: slot.live
      }
    ];
    localStorage.setItem(slotKey, JSON.stringify(slot));
    gameStore.slotsRevision++;
    const { queryByRole, getByText } = render(BookmarksModal, { open: true, onClose: () => {} });
    expect(getByText(/Chapter 2/)).toBeTruthy();
    // No Forget button for the auto-chapter bookmark.
    const forgetButtons = queryByRole('button', { name: /Forget/i });
    expect(forgetButtons).toBeNull();
  });

  it('Restore replaces live state with the snapshot', async () => {
    gameStore.createBookmark('Snapshot');
    // Mutate state after the snapshot.
    gameStore.dispatch({ kind: 'SetTextSize', size: 'large' });
    expect(gameStore.state.settings.textSize).toBe('large');
    const { getByRole } = render(BookmarksModal, { open: true, onClose: () => {} });
    const restoreBtn = getByRole('button', { name: /Restore/i });
    await fireEvent.click(restoreBtn);
    // Confirmation modal appears
    const confirm = getByRole('button', { name: /Restore this moment/i });
    await fireEvent.click(confirm);
    // Text size should now match the snapshot.
    expect(gameStore.state.settings.textSize).toBe('medium');
  });
});
