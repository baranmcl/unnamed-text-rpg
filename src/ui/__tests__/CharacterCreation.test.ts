import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CharacterCreation from '../CharacterCreation.svelte';
import { gameStore } from '../store.svelte';

describe('CharacterCreation', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
  });

  it('renders four class cards', () => {
    const { getAllByRole } = render(CharacterCreation);
    const cards = getAllByRole('radio', { name: /class/i });
    expect(cards).toHaveLength(4);
  });

  it('disables class cards other than Reluctant Farmboy', () => {
    const { getAllByRole } = render(CharacterCreation);
    const cards = getAllByRole('radio', { name: /class/i }) as HTMLInputElement[];
    const enabled = cards.filter((c) => !c.disabled);
    expect(enabled.length).toBe(1);
  });

  it('start button is disabled until name + Farmboy selected', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const startBtn = getByRole('button', { name: /begin/i }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    expect(startBtn.disabled).toBe(true);  // class still not selected

    const farmboy = getByLabelText(/reluctant farmboy/i) as HTMLInputElement;
    await fireEvent.click(farmboy);
    expect(startBtn.disabled).toBe(false);
  });

  it('clicking begin dispatches StartNewGame', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    const farmboy = getByLabelText(/reluctant farmboy/i) as HTMLInputElement;
    await fireEvent.click(farmboy);
    const startBtn = getByRole('button', { name: /begin/i });
    await fireEvent.click(startBtn);
    expect(gameStore.state.character.name).toBe('Brendan');
    expect(gameStore.state.character.level).toBe(1);
  });
});
