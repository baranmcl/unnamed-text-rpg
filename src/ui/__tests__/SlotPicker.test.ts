import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SlotPicker from '../SlotPicker.svelte';
import { gameStore } from '../store.svelte';
import { ClassId } from '../../engine/types';

describe('SlotPicker', () => {
  beforeEach(() => {
    localStorage.clear();
    for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
    gameStore.switchToSlotPicker();
  });

  it('renders six rows', () => {
    const { getAllByRole } = render(SlotPicker);
    const rows = getAllByRole('listitem');
    expect(rows).toHaveLength(6);
  });

  it('shows "An untold tale." for every empty slot', () => {
    const { getAllByText } = render(SlotPicker);
    const empties = getAllByText(/An untold tale/i);
    expect(empties).toHaveLength(6);
  });

  it('shows character info for a filled slot', () => {
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    gameStore.switchToSlotPicker();
    const { getByText } = render(SlotPicker);
    expect(getByText(/Brendan/)).toBeTruthy();
    expect(getByText(/Reluctant Farmhand/i)).toBeTruthy();
  });

  it('shows Resume and Forget buttons for filled slots', () => {
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    gameStore.switchToSlotPicker();
    const { getByRole } = render(SlotPicker);
    expect(getByRole('button', { name: /Resume/i })).toBeTruthy();
    expect(getByRole('button', { name: /Forget/i })).toBeTruthy();
  });

  it('Resume sets active slot and loads its state', async () => {
    gameStore.beginNewTaleInSlot(2);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Esme', classId: ClassId('bard') });
    gameStore.switchToSlotPicker();
    const { getByRole } = render(SlotPicker);
    const resume = getByRole('button', { name: /Resume/i });
    await fireEvent.click(resume);
    expect(gameStore.activeSlot).toBe(2);
    expect(gameStore.state.character.name).toBe('Esme');
  });

  it('Begin a new tale is shown for empty slots', () => {
    const { getAllByRole } = render(SlotPicker);
    const beginButtons = getAllByRole('button', { name: /Begin a new tale/i });
    expect(beginButtons).toHaveLength(6);
  });

  it('Begin a new tale calls beginNewTaleInSlot and unsets activeSlot=null path', async () => {
    const { getAllByRole } = render(SlotPicker);
    const beginButtons = getAllByRole('button', { name: /Begin a new tale/i });
    await fireEvent.click(beginButtons[3]!);
    expect(gameStore.activeSlot).toBe(3);
  });
});
