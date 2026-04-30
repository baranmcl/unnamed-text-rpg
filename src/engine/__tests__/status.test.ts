import { describe, it, expect } from 'vitest';
import {
  applyStatus,
  expireStatus,
  tickStatuses,
  copyWorldStatusesToPlayer,
  persistPlayerStatusesToCharacter
} from '../status';
import type { GameState, TurnBasedCombatState } from '../types';
import { createInitialState } from '../state';

function freshState(): GameState {
  const base = createInitialState(1);
  // Task 3 will add statuses: [] to createInitialState; for now, inject it here.
  return { ...base, character: { ...base.character, statuses: [] } };
}

describe('applyStatus', () => {
  it('appends a new status with a fresh id', () => {
    const s = freshState();
    const next = applyStatus(s, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'test'
    });
    expect(next.character.statuses).toHaveLength(1);
    expect(next.character.statuses[0]!.id).toBeGreaterThan(0);
    expect(next.character.statuses[0]!.kind).toBe('weapon_suspended');
  });

  it('replaces an existing status of the same kind on the same target', () => {
    const s = freshState();
    let next = applyStatus(s, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'first'
    });
    next = applyStatus(next, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 5 },
      source: 'second'
    });
    expect(next.character.statuses).toHaveLength(1);
    expect(next.character.statuses[0]!.source).toBe('second');
    const dur = next.character.statuses[0]!.duration;
    expect(dur.kind === 'turns' && dur.remaining).toBe(5);
  });
});

describe('tickStatuses', () => {
  it('decrements turns-duration and removes when remaining hits 0', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'weapon_suspended' as const, duration: { kind: 'turns' as const, remaining: 1 }, source: 'test' },
        { id: 2, kind: 'armor_halved' as const, duration: { kind: 'turns' as const, remaining: 3 }, source: 'test' }
      ]
    };
    const ticked = tickStatuses(combatant);
    expect(ticked.statuses).toHaveLength(1);
    expect(ticked.statuses[0]!.kind).toBe('armor_halved');
    const dur = ticked.statuses[0]!.duration;
    expect(dur.kind === 'turns' && dur.remaining).toBe(2);
  });

  it('leaves one_shot, until_end_of_fight, fights_remaining, and permanent untouched', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'guaranteed_crit' as const, duration: { kind: 'one_shot' as const }, source: 't' },
        { id: 2, kind: 'weakness_revealed' as const, duration: { kind: 'until_end_of_fight' as const }, source: 't' }
      ]
    };
    const ticked = tickStatuses(combatant);
    expect(ticked.statuses).toHaveLength(2);
  });
});

describe('expireStatus', () => {
  it('removes the named status by id', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'guaranteed_crit' as const, duration: { kind: 'one_shot' as const }, source: 't' },
        { id: 2, kind: 'next_attack_misses' as const, duration: { kind: 'one_shot' as const }, source: 't' }
      ]
    };
    const after = expireStatus(combatant, 1);
    expect(after.statuses).toHaveLength(1);
    expect(after.statuses[0]!.id).toBe(2);
  });
});

describe('combat-start / combat-end status round-trip', () => {
  it('copies world-scoped statuses to player on start and persists fights_remaining decrement on end', () => {
    let s = freshState();
    s = applyStatus(s, 'character', {
      kind: 'guaranteed_crit',
      duration: { kind: 'fights_remaining', n: 2 },
      source: 'world-buff'
    });

    // Simulate combat start by manually constructing a turn-based combat with player combatant.
    const combat: TurnBasedCombatState = {
      kind: 'turn-based',
      encounterId: 'fake' as any,
      combatants: [
        { id: 'player', kind: 'player', hp: 30, initiative: 10, statuses: [] },
        { id: 'fake_monster', kind: 'monster', hp: 5, initiative: 5, statuses: [] }
      ],
      turnIndex: 0,
      round: 1
    };
    s = { ...s, combat };
    s = copyWorldStatusesToPlayer(s);

    const playerCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'player')!;
    expect(playerCombatant.statuses).toHaveLength(1);
    expect(playerCombatant.statuses[0]!.kind).toBe('guaranteed_crit');

    // Simulate combat end.
    const after = persistPlayerStatusesToCharacter(s);
    // fights_remaining decremented: n=2 → n=1
    expect(after.character.statuses).toHaveLength(1);
    const dur = after.character.statuses[0]!.duration;
    expect(dur.kind === 'fights_remaining' && dur.n).toBe(1);
  });

  it('drops combat-scoped statuses on combat end', () => {
    let s = freshState();
    const combat: TurnBasedCombatState = {
      kind: 'turn-based',
      encounterId: 'fake' as any,
      combatants: [
        {
          id: 'player', kind: 'player', hp: 30, initiative: 10,
          statuses: [
            { id: 1, kind: 'weapon_suspended', duration: { kind: 'turns', remaining: 2 }, source: 'tempt' },
            { id: 2, kind: 'guaranteed_crit', duration: { kind: 'permanent' }, source: 'world' }
          ]
        },
        { id: 'fake_monster', kind: 'monster', hp: 5, initiative: 5, statuses: [] }
      ],
      turnIndex: 0,
      round: 1
    };
    s = { ...s, combat };
    const after = persistPlayerStatusesToCharacter(s);
    expect(after.character.statuses).toHaveLength(1);
    expect(after.character.statuses[0]!.kind).toBe('guaranteed_crit');
  });
});
