import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import WorldPanel from '../WorldPanel.svelte';
import { gameStore } from '../store.svelte';
import { ClassId } from '../../engine/types';

describe('WorldPanel quest log chrome', () => {
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

  it('renders the quest log scroll button', () => {
    const { getByLabelText } = render(WorldPanel);
    expect(getByLabelText(/view quest log/i)).toBeInTheDocument();
  });

  it('shows the badge when there is unseen quest activity', () => {
    // StartNewGame already activated answer_the_call, so count > snapshot.
    expect(gameStore.state.story.questLogActivityCount > gameStore.state.story.questLogActivityAtLastOpen).toBe(true);
    const { container } = render(WorldPanel);
    expect(container.querySelector('.quest-log-badge')).not.toBeNull();
  });

  it('hides the badge after markQuestLogOpened is called', () => {
    gameStore.markQuestLogOpened();
    const { container } = render(WorldPanel);
    expect(container.querySelector('.quest-log-badge')).toBeNull();
  });

  it('opens the quest log modal when the scroll button is clicked', async () => {
    const { getByLabelText, queryByRole } = render(WorldPanel);
    expect(queryByRole('dialog')).toBeNull();
    await fireEvent.click(getByLabelText(/view quest log/i));
    expect(queryByRole('dialog')).not.toBeNull();
  });

  it('clears the badge after opening the modal', async () => {
    const { getByLabelText, container } = render(WorldPanel);
    expect(container.querySelector('.quest-log-badge')).not.toBeNull();
    await fireEvent.click(getByLabelText(/view quest log/i));
    await tick();
    expect(container.querySelector('.quest-log-badge')).toBeNull();
  });
});
