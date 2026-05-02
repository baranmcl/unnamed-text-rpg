import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import QuestLogModal from '../QuestLogModal.svelte';
import { gameStore } from '../store.svelte';
import { ClassId } from '../../engine/types';

describe('QuestLogModal', () => {
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
  });

  afterEach(() => {
    Element.prototype.animate = originalAnimate;
  });

  it('renders nothing when closed', () => {
    const { queryByRole } = render(QuestLogModal, { props: { open: false, onClose: () => {} } });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const { getByRole, getByText } = render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText(/Quest Log/i)).toBeInTheDocument();
  });

  it('renders the active main quest with its current objective', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const { getByText } = render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/Answer the Call to Adventure/)).toBeInTheDocument();
    expect(getByText(/Survive your morning/)).toBeInTheDocument();
  });

  it('does not render future objectives in the DOM', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const { queryByText } = render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    // Objective 1 (current) should be visible. Objectives 2, 3, 4 must not be.
    expect(queryByText(/Travel to the Dusty Crossroads/)).toBeNull();
    expect(queryByText(/Hear the Hermit out/)).toBeNull();
    expect(queryByText(/^Decide\.$/)).toBeNull();
  });

  it('renders empty side and completed sections with "(none yet)" copy', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const { getAllByText } = render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    const noneEntries = getAllByText(/none yet/i);
    expect(noneEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onClose when the close button is clicked', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const onClose = vi.fn();
    const { getByRole } = render(QuestLogModal, { props: { open: true, onClose } });
    await fireEvent.click(getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls markQuestLogOpened when the modal opens', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const beforeCount = gameStore.state.story.questLogActivityCount;
    expect(gameStore.state.story.questLogActivityAtLastOpen).toBe(0);
    render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    await tick();
    expect(gameStore.state.story.questLogActivityAtLastOpen).toBe(beforeCount);
  });

  it('shows completed objectives with a collapse toggle when at least one is done', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    // Simulate completing the first objective by setting an unlock flag.
    gameStore.state = {
      ...gameStore.state,
      world: {
        ...gameStore.state.world,
        flags: { ...gameStore.state.world.flags, unlocked_crossroads: true }
      }
    };
    // Drive checkQuests by dispatching any noop-ish event. SetTextSize has no
    // side effects on quest state itself, but reduce always runs checkQuests.
    gameStore.dispatch({ kind: 'SetTextSize', size: gameStore.state.settings.textSize });

    const { getByText, queryByText } = render(QuestLogModal, { props: { open: true, onClose: () => {} } });
    // The "Survive your morning" objective is now completed and visible.
    expect(getByText(/Survive your morning/)).toBeInTheDocument();
    // The collapse toggle exists.
    const toggle = getByText(/Completed \(1\)/);
    expect(toggle).toBeInTheDocument();
    // Clicking it hides the completed objective.
    await fireEvent.click(toggle);
    expect(queryByText(/Survive your morning/)).toBeNull();
  });
});
