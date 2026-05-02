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

  it('enables all four class cards', () => {
    const { getAllByRole } = render(CharacterCreation);
    const cards = getAllByRole('radio', { name: /class/i }) as HTMLInputElement[];
    const enabled = cards.filter((c) => !c.disabled);
    expect(enabled.length).toBe(4);
  });

  it('start button is disabled until name + class selected', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const startBtn = getByRole('button', { name: /begin/i }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    expect(startBtn.disabled).toBe(true);  // class still not selected

    const knight = getByLabelText(/class disgraced knight/i) as HTMLInputElement;
    await fireEvent.click(knight);
    expect(startBtn.disabled).toBe(false);
  });

  it('clicking begin dispatches StartNewGame', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    const knight = getByLabelText(/class disgraced knight/i) as HTMLInputElement;
    await fireEvent.click(knight);
    const startBtn = getByRole('button', { name: /begin/i });
    await fireEvent.click(startBtn);
    expect(gameStore.state.character.name).toBe('Brendan');
    expect(gameStore.state.character.level).toBe(1);
  });
});

describe('All four classes enabled', () => {
  it('shows enabled class cards for all four classes', () => {
    const { getByRole } = render(CharacterCreation);
    const knightCard = getByRole('radio', { name: /class disgraced knight/i }) as HTMLInputElement;
    const wizardCard = getByRole('radio', { name: /class accidental wizard/i }) as HTMLInputElement;
    const bardCard = getByRole('radio', { name: /class bard/i }) as HTMLInputElement;
    const farmhandCard = getByRole('radio', { name: /class reluctant farmhand/i }) as HTMLInputElement;

    expect(knightCard.disabled).toBe(false);
    expect(wizardCard.disabled).toBe(false);
    expect(bardCard.disabled).toBe(false);
    expect(farmhandCard.disabled).toBe(false);
  });

  it('renders a teaser line for each class', () => {
    const { getByText } = render(CharacterCreation);
    expect(getByText(/yard at dawn/i)).toBeTruthy();
    expect(getByText(/library is on fire/i)).toBeTruthy();
    expect(getByText(/showtime/i)).toBeTruthy();
    expect(getByText(/back field/i)).toBeTruthy();
  });
});
