import { describe, it, expect } from 'vitest';
import { checkQuests } from '../quests';
import { createInitialState } from '../state';
import { reduce } from '../events';
import { ClassId } from '../types';

describe('checkQuests baseline', () => {
  function withCharacter() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    return s;
  }

  it('returns input state unchanged when registry is empty', () => {
    const s = withCharacter();
    const out = checkQuests(s);
    expect(out).toEqual(s);
  });

  it('does not mutate the input state', () => {
    const s = withCharacter();
    const before = JSON.stringify(s);
    checkQuests(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
