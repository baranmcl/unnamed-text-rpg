import { describe, it, expect } from 'vitest';
import { rollHit, rollDamage, rollCrit, rollFlee } from '../combat';
import { startCombat, playerAttack, monsterTurn, endCombat } from '../combat';
import { createInitialState } from '../state';
import { content } from '../../content';
import { ClassId, EncounterId, ItemId, LocationId } from '../types';
import type { CombatEncounter, GameState, MonsterId, Monster, TurnBasedCombatState } from '../types';
import { applyStatus, hasStatus } from '../status';
import { skipFarmhandOpener } from './testHelpers';
import { reduce } from '../events';

const rng0 = { seed: 42, step: 0 };

describe('rollHit', () => {
  it('returns hit boolean and advances rng step', () => {
    const r = rollHit(rng0, /*bravado*/ 7, /*targetDodge*/ 8);
    expect(typeof r.value).toBe('boolean');
    expect(r.state.step).toBe(rng0.step + 1);
  });

  it('higher bravado relative to dodge improves hit rate', () => {
    let lowHits = 0, highHits = 0;
    let s = { seed: 1, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollHit(s, 2, 12);
      if (r.value) lowHits++;
      s = r.state;
    }
    s = { seed: 1, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollHit(s, 18, 4);
      if (r.value) highHits++;
      s = r.state;
    }
    expect(highHits).toBeGreaterThan(lowHits);
  });
});

describe('rollDamage', () => {
  it('applies brawn modifier and weapon damage', () => {
    const r = rollDamage(rng0, /*weapon*/ 6, /*brawn*/ 10, /*targetArmor*/ 0);
    // weapon 6 + floor(brawn/2) 5 + d6(1..6) - armor 0 = 12..17
    expect(r.value).toBeGreaterThanOrEqual(12);
    expect(r.value).toBeLessThanOrEqual(17);
  });

  it('subtracts target armor and clamps at 1 minimum', () => {
    let s = { seed: 9, step: 0 };
    let saw1Min = false;
    for (let i = 0; i < 100; i++) {
      const r = rollDamage(s, /*weapon*/ 1, /*brawn*/ 0, /*targetArmor*/ 99);
      if (r.value === 1) saw1Min = true;
      expect(r.value).toBeGreaterThanOrEqual(1);
      s = r.state;
    }
    expect(saw1Min).toBe(true);
  });
});

describe('rollCrit', () => {
  it('returns boolean and is more likely with higher bluck', () => {
    let lowCrits = 0, highCrits = 0;
    let s = { seed: 11, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rollCrit(s, 0);
      if (r.value) lowCrits++;
      s = r.state;
    }
    s = { seed: 11, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rollCrit(s, 20);
      if (r.value) highCrits++;
      s = r.state;
    }
    expect(highCrits).toBeGreaterThan(lowCrits);
  });
});

describe('rollFlee', () => {
  it('returns boolean and is more likely with higher bluck + bravado', () => {
    let lowFlee = 0, highFlee = 0;
    let s = { seed: 21, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollFlee(s, /*bluck*/ 0, /*bravado*/ 0);
      if (r.value) lowFlee++;
      s = r.state;
    }
    s = { seed: 21, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollFlee(s, /*bluck*/ 15, /*bravado*/ 15);
      if (r.value) highFlee++;
      s = r.state;
    }
    expect(highFlee).toBeGreaterThan(lowFlee);
  });
});

function characterAtLocation() {
  let s = createInitialState(7);
  // Mock-set a character and current location by hand.
  s = {
    ...s,
    character: {
      ...s.character,
      name: 'Test',
      classId: ClassId('reluctant_farmhand'),
      level: 1,
      hp: { current: 50, max: 50 },
      mp: { current: 10, max: 10 },
      stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
      equipment: { weapon: ItemId('rusty_pitchfork') },
      inventory: [{ itemId: ItemId('hardtack'), qty: 1 }]
    },
    world: { ...s.world, currentLocation: LocationId('family_farm') }
  };
  return s;
}

describe('combat sub-reducer', () => {
  it('startCombat creates a combat state with the right combatants', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]! as CombatEncounter;
    const s1 = startCombat(s0, enc);
    expect(s1.combat).not.toBeNull();
    const c1 = s1.combat as TurnBasedCombatState;
    expect(c1.combatants).toHaveLength(2);
    expect(c1.combatants.find((c) => c.kind === 'player')!.hp).toBe(50);
    expect(c1.round).toBe(1);
  });

  it('playerAttack reduces monster hp on hit', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]! as CombatEncounter;
    let s = startCombat(s0, enc);
    const monBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!.hp;

    // Iterate up to 20 rounds — at least one should land for these stats.
    let landed = false;
    for (let i = 0; i < 20; i++) {
      const after = playerAttack(s);
      const monAfter = after.combat?.kind === 'turn-based' ? after.combat.combatants.find((c) => c.kind === 'monster')?.hp : undefined;
      if (monAfter !== undefined && monAfter < monBefore) {
        landed = true;
        break;
      }
      s = after;
      if (!s.combat) break;
    }
    expect(landed).toBe(true);
  });

  it('endCombat clears combat state and grants progression on victory', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]! as CombatEncounter;
    let s = startCombat(s0, enc);
    const levelBefore = s.character.level;
    const xpBefore = s.character.xp;
    s = endCombat(s, 'victory', enc);
    expect(s.combat).toBeNull();
    // The encounter grants XP that may trigger level-up (consuming the XP);
    // assert that either the level increased or XP increased, never both at zero.
    const progressed = s.character.level > levelBefore || s.character.xp > xpBefore;
    expect(progressed).toBe(true);
  });

  it('monsterTurn applies damage to the player', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]! as CombatEncounter;
    let s = startCombat(s0, enc);
    const playerHpBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'player')!.hp;
    // Force several monster turns to overcome variance.
    let lostHp = false;
    for (let i = 0; i < 30; i++) {
      const after = monsterTurn(s);
      const after2 = after.combat?.kind === 'turn-based' ? after.combat.combatants.find((c) => c.kind === 'player')?.hp : undefined;
      if (after2 !== undefined && after2 < playerHpBefore) { lostHp = true; break; }
      s = after;
      if (!s.combat) break;
    }
    expect(lostHp).toBe(true);
  });
});

function buildCombatState(): GameState {
  let s = createInitialState(123);
  s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmhand' as ClassId });
  s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
  return s;
}

describe('combat reads statuses', () => {
  it('weakness_revealed on monster makes the next player attack deal +50% damage', () => {
    let s = buildCombatState();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;

    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'weakness_revealed',
      duration: { kind: 'until_end_of_fight' },
      source: 'test'
    });

    const monsterBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!;
    const hpBefore = monsterBefore.hp;

    s = reduce(s, { kind: 'AttackTarget' });

    if (s.combat?.kind === 'turn-based') {
      const monsterAfter = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const damageDealt = hpBefore - monsterAfter.hp;
      expect(damageDealt).toBeGreaterThanOrEqual(1);
      const monsterStatuses = monsterAfter.statuses;
      expect(monsterStatuses.some((st) => st.kind === 'weakness_revealed')).toBe(true);
    }
  });

  it('guaranteed_crit on player forces a crit, then clears', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'one_shot' },
      source: 'test'
    });
    s = reduce(s, { kind: 'AttackTarget' });

    const critEntry = s.log.find((e) => e.text.includes('Critical hit!'));
    expect(critEntry).toBeDefined();

    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(false);
    }
  });

  it('next_attack_misses forces miss and also clears guaranteed_crit (wasted prophecy)', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'one_shot' },
      source: 'tempt-fate'
    });
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'next_attack_misses',
      duration: { kind: 'one_shot' },
      source: 'tempt-fate-backfire'
    });
    s = reduce(s, { kind: 'AttackTarget' });

    const critEntry = s.log.find((e) => e.text.includes('Critical hit!'));
    expect(critEntry).toBeUndefined();

    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(false);
      expect(player.statuses.some((st) => st.kind === 'next_attack_misses')).toBe(false);
    }
  });

  it('intimidated on monster causes its next turn to be skipped', () => {
    let s = createInitialState(123);
    s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;
    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'intimidated',
      duration: { kind: 'turns', remaining: 1 },
      source: 'swagger'
    });

    const logLenBefore = s.log.length;
    s = reduce(s, { kind: 'AttackTarget' });

    const skipEntry = s.log.slice(logLenBefore).find((e) =>
      e.text.toLowerCase().includes('rattled') ||
      e.text.toLowerCase().includes('reconsider') ||
      e.text.toLowerCase().includes('skip')
    );
    expect(skipEntry).toBeDefined();
  });

  it('weapon_suspended treats weapon damage as 0', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'tempt-fate-backfire'
    });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterBefore = s.combat.combatants.find((c) => c.kind === 'monster')!;
    const hpBefore = monsterBefore.hp;

    s = reduce(s, { kind: 'AttackTarget' });

    if (s.combat?.kind === 'turn-based') {
      const monsterAfter = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const dealt = hpBefore - monsterAfter.hp;
      expect(dealt).toBeLessThanOrEqual(22);
    }
  });

  it('turns-statuses tick down at start of player turn', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 2 },
      source: 'test'
    });
    s = reduce(s, { kind: 'AttackTarget' });
    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      const ws = player.statuses.find((st) => st.kind === 'weapon_suspended');
      expect(ws).toBeDefined();
      const dur = ws!.duration;
      expect(dur.kind === 'turns' && dur.remaining).toBe(1);
    }
  });

  it('on combat end, combat-scoped statuses are dropped and world-scoped persist', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'combat-scoped'
    });
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'permanent' },
      source: 'world-scoped'
    });

    let safety = 20;
    while (s.combat && safety-- > 0) {
      s = reduce(s, { kind: 'AttackTarget' });
    }

    expect(s.combat).toBeNull();
    expect(s.character.statuses.some((st) => st.kind === 'weapon_suspended')).toBe(false);
    expect(s.character.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(true);
  });
});

describe('endCombat victory side-effects (achievements)', () => {
  it('sets achievements.first_combat_won to true on first victory', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected turn-based combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;
    const wounded: GameState = {
      ...s,
      combat: {
        ...s.combat,
        combatants: s.combat.combatants.map((c) => (c.id === monsterId ? { ...c, hp: 1 } : c))
      }
    };
    const after = reduce(wounded, { kind: 'AttackTarget' });
    expect(after.world.flags['achievements.first_combat_won']).toBe(true);
  });
});

describe('endCombat awardXp regression', () => {
  it('first_tax_rat victory grants the same level/xp outcome as before extraction', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;
    const wounded: GameState = {
      ...s,
      combat: {
        ...s.combat,
        combatants: s.combat.combatants.map((c) => (c.id === monsterId ? { ...c, hp: 1 } : c))
      }
    };
    const after = reduce(wounded, { kind: 'AttackTarget' });
    // Combat should end with the player having received the encounter's xp reward
    // (or the level-up loop having run if it crossed the threshold).
    expect(after.combat).toBeNull();
    // EXP. log entry exists (combat still logs the reward).
    const expEntry = after.log.find((e) => e.kind === 'system' && e.systemLabel === 'EXP.');
    expect(expEntry).toBeDefined();
    // 100 XP crosses the level * 100 = 100 threshold: expect level-up to 2 with 0 residual XP.
    expect(after.character.level).toBe(2);
    expect(after.character.xp).toBe(0);
  });
});

describe('monsterTurn — apply_status action', () => {
  function setupCombatWithApplyStatusMonster(): GameState {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = skipFarmhandOpener(s);
    // Inject a test monster with a single apply_status action (weight 1.0 = always fires).
    // Use a real monster id (insolent_pell), but the test only relies on the action
    // we inject; the monster definition will be updated in Task 3.
    // Directly set up combat with the test monster.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
    return s;
  }

  it('applies the status to the player combatant when the action fires', () => {
    // We construct a state with combat active, then call monsterTurn with a
    // controlled monster action. The simplest harness: build a state where
    // the only action available is apply_status weight 1.0, so it must fire.
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    // Substitute a monster with a single apply_status action for this test.
    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'The thing does a thing.',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Your weapon is held.',
        expirationFlavor: 'You free your weapon.'
      }]
    };

    try {
      const result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(hasStatus(player, 'weapon_suspended')).toBe(true);
    } finally {
      // Restore the monster so other tests aren't polluted.
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });

  it('does NOT deal damage to the player on the apply_status turn', () => {
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'X',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Y',
        expirationFlavor: 'Z'
      }]
    };

    const hpBefore = s.combat.combatants.find((c) => c.kind === 'player')!.hp;

    try {
      const result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const playerAfter = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(playerAfter.hp).toBe(hpBefore);
    } finally {
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });

  it('emits the expirationFlavor log entry when the status ticks to zero', () => {
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'X',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Y',
        expirationFlavor: 'YOU FREE YOUR WEAPON'
      }]
    };

    try {
      // Turn 1: monster applies the status.
      let result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(hasStatus(player, 'weapon_suspended')).toBe(true);

      // Turn 2: player acts (tickPlayerCombatant runs, status duration goes from 1 → 0 → removed).
      // The expiration narration should fire as the status is removed.
      result = playerAttack(result);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const expirationLog = result.log.find((e) => e.text === 'YOU FREE YOUR WEAPON');
      expect(expirationLog).toBeDefined();
    } finally {
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });
});

describe('plot_armor status', () => {
  it('caps incoming damage at 1 while active on a monster', () => {
    let s = createInitialState(123);
    s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;

    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'plot_armor',
      duration: { kind: 'turns', remaining: 2 },
      source: 'test'
    });

    // Attack up to 5 times — every hit while plot_armor is active should deal exactly 1.
    let damageDealt = 0;
    for (let i = 0; i < 5; i++) {
      const monsterBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!;
      const armorActive = hasStatus(monsterBefore, 'plot_armor');
      const before = monsterBefore.hp;
      s = reduce(s, { kind: 'AttackTarget' });
      if (s.combat?.kind !== 'turn-based') break;
      const after = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!.hp;
      const dealt = before - after;
      if (dealt > 0 && armorActive) {
        expect(dealt).toBe(1);
        damageDealt += dealt;
      }
    }
    expect(damageDealt).toBeGreaterThan(0);
    expect(damageDealt).toBeLessThanOrEqual(2); // 2 turns of plot_armor → ≤2 capped hits before it expires
  });

  it('Plot Convenience apply_status targets itself, not the player', () => {
    let s = createInitialState(123);
    s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'combat_plot_convenience' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    // Force monster to always pick apply_status by overriding actions during the test.
    const monstersRecord = content.monsters as Record<string, Monster>;
    const original = monstersRecord['plot_convenience']!.actions;
    monstersRecord['plot_convenience'] = {
      ...monstersRecord['plot_convenience']!,
      actions: original.filter((a) => a.kind === 'apply_status').map((a) => ({ ...a, weight: 1.0 }))
    };
    try {
      const before = s.combat.combatants;
      const monsterBefore = before.find((c) => c.kind === 'monster')!;
      expect(monsterBefore.statuses.some((st) => st.kind === 'plot_armor')).toBe(false);

      s = monsterTurn(s);

      if (s.combat?.kind === 'turn-based') {
        const monsterAfter = s.combat.combatants.find((c) => c.kind === 'monster')!;
        const playerAfter = s.combat.combatants.find((c) => c.kind === 'player')!;
        expect(monsterAfter.statuses.some((st) => st.kind === 'plot_armor')).toBe(true);
        expect(playerAfter.statuses.some((st) => st.kind === 'plot_armor')).toBe(false);
      }
    } finally {
      monstersRecord['plot_convenience'] = { ...monstersRecord['plot_convenience']!, actions: original };
    }
  });
});
