import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import InspectModal from '../InspectModal.svelte';
import { gameStore } from '../store.svelte';
import { ClassId, ItemId } from '../../engine/types';

describe('InspectModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Test', classId: ClassId('reluctant_farmhand') });
  });

  it('renders the item flavor text', () => {
    const { getByText } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    expect(getByText(/Rusty Pitchfork/i)).toBeInTheDocument();
    expect(getByText(/perfectly functional implement/i)).toBeInTheDocument();
  });

  it('shows Unequip action when item is equipped', () => {
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    expect(getByRole('button', { name: /unequip/i })).toBeInTheDocument();
  });

  it('clicking Equip dispatches the event', async () => {
    // Unequip first so the equip button shows.
    gameStore.dispatch({ kind: 'UnequipSlot', slot: 'weapon' });
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    await fireEvent.click(getByRole('button', { name: /equip/i }));
    expect(gameStore.state.character.equipment.weapon).toBe(ItemId('rusty_pitchfork'));
  });

  it('clicking Discard removes a quest item from inventory', async () => {
    // Quest items show a "Discard" button (not "Drop"). The starter Farmhand
    // inventory includes Note from Mother (a quest item).
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('note_from_mother'), onClose: () => {} } });
    await fireEvent.click(getByRole('button', { name: /discard/i }));
    const stillHas = gameStore.state.character.inventory.some((e) => e.itemId === ItemId('note_from_mother'));
    expect(stillHas).toBe(false);
  });
});
