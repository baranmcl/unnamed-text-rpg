import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, ItemId, LocationId, EncounterId } from '../engine/types';
import type { GameState, TurnBasedCombatState } from '../engine/types';
import { content } from '../content';

function newFarmhandAtCoop(seed = 11): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  if (s.combat) s = { ...s, combat: null };
  s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
  return s;
}

describe('Henwald and the Tax Rat (chicken coop)', () => {
  it('Tax Rat is not in family_farm encounterIds (Henwald is the trigger now)', () => {
    const farm = content.locations[LocationId('family_farm')]!;
    expect((farm.encounterIds ?? []).includes('first_tax_rat' as EncounterId)).toBe(false);
  });

  it('Henwald: engage rat → combat starts → defeat → 3 eggs awarded → henwald_thanks visible', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    expect(s.combat?.kind).toBe('narrative');

    // Choice 0 = "I'll see to him."
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat?.kind).toBe('turn-based');
    expect((s.combat as TurnBasedCombatState).encounterId).toBe('first_tax_rat');

    // Force monster HP to 0, then attack to trigger victory pathway.
    const sCombat = s.combat as TurnBasedCombatState;
    s = {
      ...s,
      combat: {
        ...sCombat,
        combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c)
      }
    };
    s = reduce(s, { kind: 'AttackTarget' });

    expect(s.world.flags['defeated:first_tax_rat']).toBe(true);
    expect(s.world.flags['talked_to_henwald']).toBe(true);
    expect(s.combat).toBeNull();

    // The henwald_awards_eggs beat fires automatically during the same reduce() call
    // (checkBeats runs after every reduceInner). Both preconditions are now true, so
    // 3 farm_fresh_egg should already be in inventory.
    const eggs = s.character.inventory.find((e) => e.itemId === ItemId('farm_fresh_egg'));
    expect(eggs).toBeDefined();
    expect(eggs!.qty).toBe(3);
  });

  it('Henwald: "Maybe later" exits cleanly with no flag set', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    // Choice 2 = "Maybe later, Henwald."
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 2 });
    expect(s.combat).toBeNull();
    expect(s.world.flags['talked_to_henwald']).toBeFalsy();
  });

  it('Henwald: levy question greys out after asking, loops back silently', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    // Choice 1 = "What does he claim the levy's for?"
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 });
    expect(s.world.flags['asked_henwald_levy']).toBe(true);
    // Now we're on the levy_response node. Choice 0 = "(back to the previous matter)".
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    // Back on intro node. The levy choice should be flagged disabled.
    // (We just verify the flag is set; UI tests the disabled state.)
    expect(s.world.flags['asked_henwald_levy']).toBe(true);
  });
});

describe('Mother kitchen (pre-tornado)', () => {
  it('default: Mother mentions the cow watching the sky', () => {
    let s = createInitialState(17);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_kitchen') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'mother_kitchen' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // Sit with Mother
    const log = s.log.map((e) => e.text).join('\n');
    expect(log).toMatch(/cow\'s been watching the sky/);
    expect(s.world.flags['visited_family_kitchen']).toBe(true);
  });

  it('with talked_to_henwald flag: Mother does the animal-talk seam', () => {
    let s = createInitialState(17);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = { ...s, world: { ...s.world, flags: { ...s.world.flags, talked_to_henwald: true } } };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_kitchen') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'mother_kitchen' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const log = s.log.map((e) => e.text).join('\n');
    expect(log).toMatch(/talking to them since you could walk/);
    expect(log).toMatch(/I just wish I heard it too/);
  });

  it('with defeated:first_tax_rat flag: Mother uses the rat_thanks branch', () => {
    let s = createInitialState(17);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, talked_to_henwald: true, 'defeated:first_tax_rat': true }
      }
    };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_kitchen') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'mother_kitchen' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const log = s.log.map((e) => e.text).join('\n');
    expect(log).toMatch(/Henwald clucked at me/);
  });
});

describe('Back Field and Old Well spokes', () => {
  it('weeding the back field returns to the location cleanly', () => {
    let s = createInitialState(13);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'back_field_weed' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat).toBeNull();
  });

  it('Old Well: drop a stone, then step back', () => {
    let s = createInitialState(13);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'old_well_inspect' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // drop stone
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 }); // step back
    expect(s.combat).toBeNull();
  });
});

describe('Tornado culmination', () => {
  it('tornado fires after 3 spoke visits; player auto-arrives at kitchen; Mother culmination plays', () => {
    let s = createInitialState(19);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };

    // Visit 3 spokes in any order. Clear any incidental combat after each visit
    // except the last, where the tornado fires and we expect a narrative encounter.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
    if (s.combat) s = { ...s, combat: null };
    // After the 3rd spoke visit the tornado fires and routes to family_kitchen with
    // the Mother culmination encounter queued — do NOT clear combat here.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });

    // At this point, the tornado beat should have fired.
    expect(s.world.flags['farmhand_tornado_fired']).toBe(true);
    expect(s.world.flags['farmhand_post_tornado']).toBe(true);
    // Player has been auto-routed to family_kitchen with the post-tornado encounter queued.
    expect(s.world.currentLocation).toBe('family_kitchen');
    expect(s.combat?.kind).toBe('narrative');

    // Step through the culmination dialogue.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // approach Mother
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // take the Note + exit

    expect(s.world.flags['unlocked_crossroads']).toBe(true);
    expect(s.world.currentLocation).toBe('family_farm');
    expect(s.combat).toBeNull();
  });
});

describe('Farmhand Ch 1 — full happy-path flow', () => {
  it('opener → all 4 spokes (with Tax Rat defeat) → tornado → Mother → crossroads unlocked', () => {
    let s = createInitialState(23);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null }; // skip opener narrative

    // Visit the Back Field, optionally fight the Allium (skip — narrative encounter not required).
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    if (s.combat) s = { ...s, combat: null };
    expect(s.world.flags['visited_back_field']).toBe(true);

    // Visit the Chicken Coop, engage Henwald, defeat the Tax Rat.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // I'll see to him
    // Force Tax Rat to 0 HP and attack.
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = { ...s, combat: { ...sCombat, combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c) } };
    }
    s = reduce(s, { kind: 'AttackTarget' });
    expect(s.world.flags['defeated:first_tax_rat']).toBe(true);
    // The henwald_awards_eggs beat fires; player gets 3 eggs.
    expect(s.character.inventory.find((e) => e.itemId === 'farm_fresh_egg')?.qty).toBe(3);

    // Visit the Old Well.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });
    // do NOT clear combat — the tornado fires here and queues the Mother culmination
    expect(s.world.flags['visited_old_well']).toBe(true);

    // Now 3-of-4 spokes visited. The tornado beat fires on the NEXT reduce — let's verify
    // by checking if it's already fired (since checkBeats runs after the EnterLocation).
    expect(s.world.flags['farmhand_tornado_fired']).toBe(true);
    expect(s.world.currentLocation).toBe('family_kitchen');

    // Step through Mother's culmination.
    expect(s.combat?.kind).toBe('narrative');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // approach
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // take Note & exit
    expect(s.world.flags['unlocked_crossroads']).toBe(true);
    expect(s.world.currentLocation).toBe('family_farm');

    // The crossroads exit should now be visible at family_farm. (Encoded as visibleIfFlag.)
    // Move there.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('dusty_crossroads') });
    expect(s.world.currentLocation).toBe('dusty_crossroads');
  });
});
