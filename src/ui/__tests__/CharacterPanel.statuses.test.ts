import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CharacterPanel from '../CharacterPanel.svelte';
import { gameStore } from '../store.svelte';
import { reduce } from '../../engine/events';
import { createInitialState } from '../../engine/state';
import type { ClassId } from '../../engine/types';

describe('CharacterPanel Afflictions & Boons row', () => {
  it('hides the row when statuses array is empty', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    gameStore.state = s;
    const { queryByText } = render(CharacterPanel);
    expect(queryByText(/Afflictions/i)).toBeNull();
  });

  it('renders the row with one badge per world-scoped status', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    s = {
      ...s,
      character: {
        ...s.character,
        statuses: [
          { id: 1, kind: 'guaranteed_crit', duration: { kind: 'permanent' }, source: "Hermit's blessing" }
        ]
      }
    };
    gameStore.state = s;
    const { getByText, getByTitle } = render(CharacterPanel);
    expect(getByText(/Afflictions & Boons/i)).toBeTruthy();
    expect(getByTitle(/Hermit/i)).toBeTruthy();
  });
});
