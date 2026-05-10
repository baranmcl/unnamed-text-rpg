import { describe, it, expect } from 'vitest';
import { evalPredicate, applyEffect, checkBeats } from '../story';
import { createInitialState } from '../state';
import { ClassId, LocationId, BeatId, ItemId, type GameState, type Predicate, type BeatEffect } from '../types';

function freshState(): GameState {
  let s = createInitialState(1);
  s = { ...s, character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmhand') } };
  return s;
}

describe('evalPredicate', () => {
  it('flag predicate returns true when flag is truthy and false when missing', () => {
    const s = freshState();
    const p: Predicate = { kind: 'flag', flag: 'foo' };
    expect(evalPredicate(s, p)).toBe(false);
    const s2 = { ...s, world: { ...s.world, flags: { foo: true } } };
    expect(evalPredicate(s2, p)).toBe(true);
  });

  it('flag predicate with equals checks specific value', () => {
    const s = { ...freshState(), world: { ...freshState().world, flags: { count: 5 } } };
    expect(evalPredicate(s, { kind: 'flag', flag: 'count', equals: 5 })).toBe(true);
    expect(evalPredicate(s, { kind: 'flag', flag: 'count', equals: 3 })).toBe(false);
  });

  it('visited predicate matches state.world.visited', () => {
    const s = { ...freshState(), world: { ...freshState().world, visited: [LocationId('family_farm')] } };
    expect(evalPredicate(s, { kind: 'visited', locationId: LocationId('family_farm') })).toBe(true);
    expect(evalPredicate(s, { kind: 'visited', locationId: LocationId('elsewhere') })).toBe(false);
  });

  it('beat_completed predicate matches state.story.completedBeats', () => {
    const s = { ...freshState(), story: { ...freshState().story, completedBeats: [BeatId('beat_a')] } };
    expect(evalPredicate(s, { kind: 'beat_completed', beatId: BeatId('beat_a') })).toBe(true);
    expect(evalPredicate(s, { kind: 'beat_completed', beatId: BeatId('beat_b') })).toBe(false);
  });

  it('stage predicate matches state.story.stage', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'stage', stage: 'chapter_1' })).toBe(true);
    expect(evalPredicate(s, { kind: 'stage', stage: 'chapter_6' })).toBe(false);
  });

  it('flag_at_least returns true when numeric flag >= min', () => {
    const s = freshState();
    const base = { ...s, world: { ...s.world, flags: { count: 6 } } };
    expect(evalPredicate(base, { kind: 'flag_at_least', flag: 'count', min: 6 })).toBe(true);
    expect(evalPredicate(base, { kind: 'flag_at_least', flag: 'count', min: 7 })).toBe(false);
  });

  it('flag_at_least returns false when flag is missing or non-numeric', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'flag_at_least', flag: 'absent', min: 1 })).toBe(false);
    const sStr = { ...s, world: { ...s.world, flags: { count: 'three' } } };
    expect(evalPredicate(sStr, { kind: 'flag_at_least', flag: 'count', min: 1 })).toBe(false);
  });

  it('level_at_least returns true when character.level >= level', () => {
    const s = freshState();
    const at2 = { ...s, character: { ...s.character, level: 2 } };
    expect(evalPredicate(s, { kind: 'level_at_least', level: 2 })).toBe(false);
    expect(evalPredicate(at2, { kind: 'level_at_least', level: 2 })).toBe(true);
    expect(evalPredicate(at2, { kind: 'level_at_least', level: 3 })).toBe(false);
  });

  it('currency_at_least returns true when character.currency >= n', () => {
    const s = freshState();
    const rich = { ...s, character: { ...s.character, currency: 100 } };
    expect(evalPredicate(s, { kind: 'currency_at_least', n: 100 })).toBe(false);
    expect(evalPredicate(rich, { kind: 'currency_at_least', n: 100 })).toBe(true);
    expect(evalPredicate(rich, { kind: 'currency_at_least', n: 101 })).toBe(false);
  });

  it('any_flag returns true when at least one listed flag is truthy', () => {
    const s = freshState();
    const base = { ...s, world: { ...s.world, flags: { a: true, b: false } } };
    expect(evalPredicate(base, { kind: 'any_flag', flags: ['a', 'b'] })).toBe(true);
    expect(evalPredicate(base, { kind: 'any_flag', flags: ['b', 'c'] })).toBe(false);
  });

  it('any_flag returns false when all listed flags are missing', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'any_flag', flags: ['x', 'y', 'z'] })).toBe(false);
  });

  it('any_flag returns false when given an empty list', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'any_flag', flags: [] })).toBe(false);
  });

  it('any_flag accepts non-boolean truthy values (number > 0, non-empty string)', () => {
    const s = freshState();
    const flagsTrue = { ...s, world: { ...s.world, flags: { count: 1 } } };
    expect(evalPredicate(flagsTrue, { kind: 'any_flag', flags: ['count'] })).toBe(true);
    const flagsZero = { ...s, world: { ...s.world, flags: { count: 0 } } };
    expect(evalPredicate(flagsZero, { kind: 'any_flag', flags: ['count'] })).toBe(false);
    const flagsStr = { ...s, world: { ...s.world, flags: { label: 'hero' } } };
    expect(evalPredicate(flagsStr, { kind: 'any_flag', flags: ['label'] })).toBe(true);
    const flagsEmpty = { ...s, world: { ...s.world, flags: { label: '' } } };
    expect(evalPredicate(flagsEmpty, { kind: 'any_flag', flags: ['label'] })).toBe(false);
  });
});

describe('applyEffect', () => {
  it('set_flag writes to world.flags', () => {
    const s = freshState();
    const e: BeatEffect = { kind: 'set_flag', flag: 'foo', value: true };
    const s2 = applyEffect(s, e);
    expect(s2.world.flags['foo']).toBe(true);
  });

  it('grant_item adds to inventory and accumulates qty', () => {
    const s = freshState();
    const e: BeatEffect = { kind: 'grant_item', itemId: ItemId('hardtack'), qty: 2 };
    const s2 = applyEffect(s, e);
    expect(s2.character.inventory.find((x) => x.itemId === ItemId('hardtack'))?.qty).toBe(2);
    const s3 = applyEffect(s2, e);
    expect(s3.character.inventory.find((x) => x.itemId === ItemId('hardtack'))?.qty).toBe(4);
  });

  it('advance_stage updates story.stage', () => {
    const s = freshState();
    const s2 = applyEffect(s, { kind: 'advance_stage', stage: 'chapter_6' });
    expect(s2.story.stage).toBe('chapter_6');
  });

  it('log appends a log entry', () => {
    const s = freshState();
    const s2 = applyEffect(s, { kind: 'log', entry: { kind: 'narration', text: 'Hello.' } });
    expect(s2.log[s2.log.length - 1]?.text).toBe('Hello.');
  });
});

describe('checkBeats', () => {
  it('does not fire a beat whose preconditions are not met', () => {
    const s = freshState();
    const s2 = checkBeats(s);
    expect(s2.story.completedBeats.length).toBe(0);
  });

  it('fires a beat once preconditions are met and marks it completed', () => {
    let s = freshState();
    s = { ...s, world: { ...s.world, visited: [LocationId('family_farm')] } };
    s = checkBeats(s);
    expect(s.story.completedBeats).toContain(BeatId('ordinary_world_established'));
  });

  it('does not fire the same beat twice', () => {
    let s = freshState();
    s = { ...s, world: { ...s.world, visited: [LocationId('family_farm')] } };
    s = checkBeats(s);
    const completedAfterFirst = s.story.completedBeats.length;
    s = checkBeats(s);
    expect(s.story.completedBeats.length).toBe(completedAfterFirst);
  });
});

describe('evalPredicate flag_unset', () => {
  it('returns true when the flag is absent', () => {
    const s = createInitialState(1);
    expect(evalPredicate(s, { kind: 'flag_unset', flag: 'never_set' })).toBe(true);
  });

  it('returns true when the flag is explicitly false', () => {
    const s = createInitialState(1);
    const s2 = { ...s, world: { ...s.world, flags: { ...s.world.flags, falsy: false } } };
    expect(evalPredicate(s2, { kind: 'flag_unset', flag: 'falsy' })).toBe(true);
  });

  it('returns false when the flag is set truthy', () => {
    const s = createInitialState(1);
    const s2 = { ...s, world: { ...s.world, flags: { ...s.world.flags, set: true } } };
    expect(evalPredicate(s2, { kind: 'flag_unset', flag: 'set' })).toBe(false);
  });

  it('returns false when the flag is a non-zero number', () => {
    const s = createInitialState(1);
    const s2 = { ...s, world: { ...s.world, flags: { ...s.world.flags, count: 3 } } };
    expect(evalPredicate(s2, { kind: 'flag_unset', flag: 'count' })).toBe(false);
  });
});

describe('milestone bump on advance_stage', () => {
  it('applies a free level-up when advance_stage fires', () => {
    let s = freshState();
    const before = s.character.level;

    s = applyEffect(s, { kind: 'advance_stage', stage: 'chapter_6' });

    expect(s.story.stage).toBe('chapter_6');
    expect(s.character.level).toBe(before + 1);
    const entry = s.log.find((e) => e.text.includes('Degree of Heroism') || e.text.includes('chapter turn'));
    expect(entry).toBeDefined();
  });
});
