import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import App from '../App.svelte';
import { gameStore } from '../store.svelte';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
  });

  it('renders CharacterCreation on a fresh save', () => {
    const { getByText } = render(App);
    expect(getByText(/begin the tale/i)).toBeInTheDocument();
  });

  it('renders the game shell after character creation', async () => {
    const { getByLabelText, getByRole, getByText } = render(App);
    await fireEvent.input(getByLabelText(/name/i), { target: { value: 'Brendan' } });
    await fireEvent.click(getByLabelText(/reluctant farmboy/i));
    await fireEvent.click(getByRole('button', { name: /begin/i }));
    expect(getByText('Brendan')).toBeInTheDocument();
    expect(getByLabelText('World panel')).toBeInTheDocument();
    expect(getByLabelText('Character panel')).toBeInTheDocument();
  });
});
