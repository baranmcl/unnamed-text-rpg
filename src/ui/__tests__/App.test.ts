import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import App from '../App.svelte';
import { gameStore } from '../store.svelte';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
  });

  it('renders SlotPicker on a fresh save', () => {
    const { getByText } = render(App);
    expect(getByText(/The Shelf of Heroes/i)).toBeInTheDocument();
  });

  it('renders CharacterCreation when a slot is active but no character', () => {
    gameStore.beginNewTaleInSlot(0);
    const { getByText } = render(App);
    expect(getByText(/begin the tale/i)).toBeInTheDocument();
  });

  it('renders the game shell after character creation', async () => {
    gameStore.beginNewTaleInSlot(0);
    const { getByLabelText, getByRole, getByText } = render(App);
    await fireEvent.input(getByLabelText(/name/i), { target: { value: 'Brendan' } });
    await fireEvent.click(getByLabelText(/reluctant farmhand/i));
    await fireEvent.click(getByRole('button', { name: /begin/i }));
    expect(getByText('Brendan')).toBeInTheDocument();
    expect(getByLabelText('World panel')).toBeInTheDocument();
    expect(getByLabelText('Character panel')).toBeInTheDocument();
  });
});
