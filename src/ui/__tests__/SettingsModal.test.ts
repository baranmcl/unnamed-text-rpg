import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SettingsModal from '../SettingsModal.svelte';
import { gameStore } from '../store.svelte';
import { ClassId } from '../../engine/types';

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.dispatch({ kind: 'SetTheme', theme: 'parchment' });
    gameStore.dispatch({ kind: 'SetTextSize', size: 'medium' });
    if (!gameStore.state.settings.autoSave) {
      gameStore.dispatch({ kind: 'ToggleAutoSave' });
    }
  });

  it('renders nothing when closed', () => {
    const { queryByRole } = render(SettingsModal, { props: { open: false, onClose: () => {} } });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open', () => {
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles the theme on radio change', async () => {
    const { getByLabelText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    const moonlit = getByLabelText('Moonlit') as HTMLInputElement;
    await fireEvent.click(moonlit);
    expect(gameStore.state.settings.theme).toBe('moonlit');
    expect(document.documentElement.dataset.theme).toBe('moonlit');
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose } });
    const closeBtn = getByRole('button', { name: /close/i });
    await fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders a "Forget thy deeds" button', () => {
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('button', { name: /forget thy deeds/i })).toBeInTheDocument();
  });

  it('opens the crimson confirm overlay when "Forget thy deeds" is clicked', async () => {
    const { getByRole, getByText, queryByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(queryByText(/Forget thy deeds\?/)).toBeNull();
    await fireEvent.click(getByRole('button', { name: /forget thy deeds/i }));
    expect(getByText(/Forget thy deeds\?/)).toBeInTheDocument();
  });

  it('forgetAchievements is called on confirm', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);

    const { getByRole } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    await fireEvent.click(getByRole('button', { name: /forget thy deeds/i }));
    // Only the Forget overlay is open, so there is exactly one "To the flames" button.
    await fireEvent.click(getByRole('button', { name: /^to the flames$/i }));
    expect(gameStore.achievements.unlocked.length).toBe(0);
  });
});

describe('SettingsModal · Switch tales', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Test', classId: ClassId('reluctant_farmhand') });
  });

  it('shows a Switch tales button', () => {
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('button', { name: /Switch tales/i })).toBeTruthy();
  });

  it('Switch tales clears the active slot after confirmation', async () => {
    const onClose = vi.fn();
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose } });
    await fireEvent.click(getByRole('button', { name: /Switch tales/i }));
    await fireEvent.click(getByRole('button', { name: /Aye, set it aside/i }));
    expect(gameStore.activeSlot).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
