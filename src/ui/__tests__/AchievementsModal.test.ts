import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import AchievementsModal from '../AchievementsModal.svelte';
import { gameStore } from '../store.svelte';
import { AchievementId } from '../../engine/types';
import { type AchievementsRecord } from '../../engine/achievements';

function setRecord(r: AchievementsRecord) {
  gameStore.achievements = r;
}

describe('AchievementsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('renders nothing when closed', () => {
    const { queryByRole } = render(AchievementsModal, { props: { open: false, onClose: () => {} } });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open with empty state header', () => {
    const { getByRole, getByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText(/Achievements\s*\(/)).toBeInTheDocument();
  });

  it('shows hidden footer counter "0 of 5 remaining"', () => {
    const { getByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/Hidden\s+—\s+0 of 5 remaining/)).toBeInTheDocument();
  });

  it('renders earned achievements with gilt glyph at the top, in earn order', () => {
    setRecord({
      unlocked: [AchievementId('first_blood'), AchievementId('moonlit')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    const { container } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    const rows = container.querySelectorAll('.row');
    expect(rows[0]?.textContent).toMatch(/First Blood/);
    expect(rows[1]?.textContent).toMatch(/Moonlit/);
  });

  it('renders descriptionHidden achievements with "?" until earned', () => {
    const { getByText, queryByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/Refused, Sincerely/)).toBeInTheDocument();
    expect(queryByText(/narrator has gone quiet/)).toBeNull();
  });

  it('does not render hidden achievements in the list', () => {
    const { queryByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(queryByText(/On Schedule/)).toBeNull();
    expect(queryByText(/Page Counted/)).toBeNull();
    expect(queryByText(/Glimpsed the Editor/)).toBeNull();
    expect(queryByText(/An Unsigned Tale/)).toBeNull();
    expect(queryByText(/Read the Signs/)).toBeNull();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { getByRole } = render(AchievementsModal, { props: { open: true, onClose } });
    await fireEvent.click(getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls markAchievementsOpened when modal opens', async () => {
    setRecord({
      unlocked: [AchievementId('first_blood')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    await tick();
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(1);
  });
});
