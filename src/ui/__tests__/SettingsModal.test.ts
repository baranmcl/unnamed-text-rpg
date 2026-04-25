import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SettingsModal from '../SettingsModal.svelte';
import { gameStore } from '../store.svelte';

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
});
