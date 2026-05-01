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
    const { getByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/forget thy deeds/i)).toBeInTheDocument();
  });

  it('opens the crimson confirm overlay when "Forget thy deeds" is clicked', async () => {
    const { getByText, queryByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(queryByText(/Forget thy deeds\?/)).toBeNull();
    await fireEvent.click(getByText(/forget thy deeds/i));
    expect(getByText(/Forget thy deeds\?/)).toBeInTheDocument();
  });

  it('forgetAchievements is called on confirm', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);

    const { getByText, getAllByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    await fireEvent.click(getByText(/forget thy deeds/i));
    // The crimson confirmation has a "To the flames" button; the Consign confirmation
    // also uses that text — pick the last one (which belongs to the Forget overlay
    // since that's the one currently open).
    const flamesButtons = getAllByText(/to the flames/i);
    await fireEvent.click(flamesButtons[flamesButtons.length - 1]!);
    expect(gameStore.achievements.unlocked.length).toBe(0);
  });
});
