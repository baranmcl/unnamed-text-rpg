import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AchievementToast from '../AchievementToast.svelte';
import { gameStore } from '../store.svelte';
import { AchievementId } from '../../engine/types';
import { content } from '../../content';

describe('AchievementToast', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
    vi.useFakeTimers();
    // JSDOM does not implement the Web Animations API; stub it so Svelte
    // out-transitions (fade/fly) don't throw when items leave the DOM.
    Element.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      finish: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      finished: Promise.resolve()
    });
  });

  it('renders nothing when pendingToasts is empty', () => {
    const { container } = render(AchievementToast);
    expect(container.querySelector('.toast')).toBeNull();
  });

  it('renders one toast per pending entry with name and description', () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    const { getByText } = render(AchievementToast);
    expect(getByText(/First Blood/)).toBeInTheDocument();
    expect(getByText(/it had it coming/)).toBeInTheDocument();
  });

  it('dismisses on click', async () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    const { container } = render(AchievementToast);
    const toast = container.querySelector('.toast') as HTMLElement;
    expect(toast).toBeTruthy();
    await fireEvent.click(toast);
    expect(gameStore.pendingToasts).toEqual([]);
  });

  it('auto-dismisses after 4 seconds', () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    render(AchievementToast);
    vi.advanceTimersByTime(4000);
    expect(gameStore.pendingToasts).toEqual([]);
  });

  it('renders multiple toasts simultaneously', () => {
    gameStore.pendingToasts = [
      content.achievements[AchievementId('first_blood')]!,
      content.achievements[AchievementId('moonlit')]!
    ];
    const { getAllByText, getByText } = render(AchievementToast);
    expect(getByText(/First Blood/)).toBeInTheDocument();
    // "Moonlit" appears in both the .name span and the .description span
    // ("Switch to the Moonlit theme."), so use getAllByText here.
    expect(getAllByText(/Moonlit/).length).toBeGreaterThanOrEqual(1);
  });
});
