import { describe, it, expect } from 'vitest';
import { evalPredicate, applyEffect, checkBeats } from '../story';
import { createInitialState } from '../state';
import { ClassId, LocationId, BeatId, ItemId, type GameState, type Predicate, type BeatEffect } from '../types';

function freshState(): GameState {
  let s = createInitialState(1);
  s = { ...s, character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmboy') } };
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
    expect(evalPredicate(s, { kind: 'stage', stage: 'act_i' })).toBe(true);
    expect(evalPredicate(s, { kind: 'stage', stage: 'act_ii' })).toBe(false);
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
    const s2 = applyEffect(s, { kind: 'advance_stage', stage: 'act_ii' });
    expect(s2.story.stage).toBe('act_ii');
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
