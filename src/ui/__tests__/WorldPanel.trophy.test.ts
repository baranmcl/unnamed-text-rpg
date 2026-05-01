import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WorldPanel from '../WorldPanel.svelte';
import { gameStore } from '../store.svelte';
import { ClassId, AchievementId } from '../../engine/types';

describe('WorldPanel trophy chrome', () => {
  let originalAnimate: typeof Element.prototype.animate;

  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
    originalAnimate = Element.prototype.animate;
    Element.prototype.animate = vi.fn().mockReturnValue({
      cancel: () => {},
      finish: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      finished: Promise.resolve()
    }) as unknown as typeof Element.prototype.animate;
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
  });

  afterEach(() => {
    Element.prototype.animate = originalAnimate;
  });

  it('renders the trophy button', () => {
    const { getByLabelText } = render(WorldPanel);
    expect(getByLabelText(/view achievements/i)).toBeInTheDocument();
  });

  it('does not show the new-badge when unlockedCountAtLastOpen equals unlocked length', () => {
    gameStore.markAchievementsOpened();
    const { container } = render(WorldPanel);
    expect(container.querySelector('.trophy-badge')).toBeNull();
  });

  it('shows the new-badge when there are unlocked achievements not yet opened', () => {
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(0);
    const { container } = render(WorldPanel);
    expect(container.querySelector('.trophy-badge')).not.toBeNull();
  });

  it('opens the achievements modal when trophy is clicked', async () => {
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    const { getByLabelText, queryByRole } = render(WorldPanel);
    expect(queryByRole('dialog')).toBeNull();
    await fireEvent.click(getByLabelText(/view achievements/i));
    expect(queryByRole('dialog')).not.toBeNull();
  });
});
