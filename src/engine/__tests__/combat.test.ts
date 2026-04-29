import { describe, it, expect } from 'vitest';
import { rollHit, rollDamage, rollCrit, rollFlee } from '../combat';
import { startCombat, playerAttack, monsterTurn, endCombat } from '../combat';
import { createInitialState } from '../state';
import { content } from '../../content';
import { ClassId, ItemId, LocationId } from '../types';

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
      classId: ClassId('reluctant_farmboy'),
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
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    const s1 = startCombat(s0, enc);
    expect(s1.combat).not.toBeNull();
    expect(s1.combat!.combatants).toHaveLength(2);
    expect(s1.combat!.combatants.find((c) => c.kind === 'player')!.hp).toBe(50);
    expect(s1.combat!.round).toBe(1);
  });

  it('playerAttack reduces monster hp on hit', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const monBefore = s.combat!.combatants.find((c) => c.kind === 'monster')!.hp;

    // Iterate up to 20 rounds — at least one should land for these stats.
    let landed = false;
    for (let i = 0; i < 20; i++) {
      const after = playerAttack(s);
      const monAfter = after.combat?.combatants.find((c) => c.kind === 'monster')?.hp;
      if (monAfter !== undefined && monAfter < monBefore) {
        landed = true;
        break;
      }
      s = after;
      if (!s.combat) break;
    }
    expect(landed).toBe(true);
  });

  it('endCombat clears combat state and grants xp on victory', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const xpBefore = s.character.xp;
    s = endCombat(s, 'victory', enc);
    expect(s.combat).toBeNull();
    expect(s.character.xp).toBeGreaterThan(xpBefore);
  });

  it('monsterTurn applies damage to the player', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const playerHpBefore = s.combat!.combatants.find((c) => c.kind === 'player')!.hp;
    // Force several monster turns to overcome variance.
    let lostHp = false;
    for (let i = 0; i < 30; i++) {
      const after = monsterTurn(s);
      const after2 = after.combat?.combatants.find((c) => c.kind === 'player')?.hp;
      if (after2 !== undefined && after2 < playerHpBefore) { lostHp = true; break; }
      s = after;
      if (!s.combat) break;
    }
    expect(lostHp).toBe(true);
  });
});
