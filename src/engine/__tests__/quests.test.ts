import { describe, it, expect } from 'vitest';
import { checkQuests } from '../quests';
import { createInitialState } from '../state';
import { reduce } from '../events';
import { ClassId, EncounterId, LocationId, QuestId } from '../types';
import { content } from '../../content';

describe('checkQuests baseline', () => {
  it('returns a different state reference after activating quests', () => {
    // Use createInitialState directly so no quests have been activated yet.
    // (reduce(StartNewGame) now calls checkQuests internally, so using
    //  withCharacter() here would give a state where quests are already active
    //  and checkQuests would correctly return the same reference.)
    const s = createInitialState(1);
    const out = checkQuests(s);
    // The registry is now populated; at least one quest activates for act_i characters.
    expect(out).not.toBe(s);
  });

  it('does not mutate the input state', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    const before = JSON.stringify(s);
    checkQuests(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('checkQuests with the live registry', () => {
  function withCharacter() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    return s;
  }

  it('exposes the answer_the_call quest', () => {
    expect(content.quests).toBeDefined();
    expect(Object.keys(content.quests).length).toBeGreaterThanOrEqual(1);
  });

  it('activates answer_the_call once the player is in act_i', () => {
    const s = withCharacter();
    const out = checkQuests(s);
    expect(out.story.activeQuests).toContain('answer_the_call');
    expect(out.story.questLogActivityCount).toBeGreaterThanOrEqual(1);
  });

  it('completes the survive_your_morning objective when an unlock flag is set', () => {
    let s = withCharacter();
    s = checkQuests(s); // activates the quest
    s = { ...s, world: { ...s.world, flags: { ...s.world.flags, unlocked_crossroads: true } } };
    s = checkQuests(s);
    expect(s.story.completedObjectives[QuestId('answer_the_call')]).toContain('survive_your_morning');
  });

  it('completes the travel_to_crossroads objective once the player visits the crossroads', () => {
    let s = withCharacter();
    s = { ...s, world: { ...s.world, flags: { ...s.world.flags, unlocked_crossroads: true } } };
    s = { ...s, world: { ...s.world, visited: [...s.world.visited, LocationId('dusty_crossroads')] } };
    s = checkQuests(s);
    const done = s.story.completedObjectives[QuestId('answer_the_call')] ?? [];
    expect(done).toContain('survive_your_morning');
    expect(done).toContain('travel_to_crossroads');
  });

  it('completes the hear_the_hermit objective when the encounter starts', () => {
    let s = withCharacter();
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, unlocked_crossroads: true, started_call_encounter: true },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    s = checkQuests(s);
    const done = s.story.completedObjectives[QuestId('answer_the_call')] ?? [];
    expect(done).toContain('hear_the_hermit');
  });

  it('finalizes the quest, applies rewards, and emits log entries on accepted_call', () => {
    let s = withCharacter();
    s = {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          unlocked_crossroads: true,
          started_call_encounter: true,
          accepted_call: true
        },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    const startCurrency = s.character.currency;
    const startLevel = s.character.level;
    s = checkQuests(s);

    expect(s.story.completedQuests).toContain('answer_the_call');
    expect(s.story.activeQuests).not.toContain('answer_the_call');
    // Currency reward applied
    expect(s.character.currency).toBe(startCurrency + 50);
    // XP reward (100) at level 1 triggers a level-up to level 2
    expect(s.character.level).toBeGreaterThan(startLevel);
    // QUEST and REWARD log entries appear
    const questEntry = s.log.find((e) => e.kind === 'system' && e.systemLabel === 'QUEST');
    const rewardEntry = s.log.find((e) => e.kind === 'system' && e.systemLabel === 'REWARD');
    expect(questEntry).toBeDefined();
    expect(rewardEntry).toBeDefined();
    expect(rewardEntry?.text).toContain('50 leaves');
    expect(rewardEntry?.text).toContain('100 experience');
  });

  it('does not re-finalize an already-completed quest', () => {
    let s = withCharacter();
    s = {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          unlocked_crossroads: true,
          started_call_encounter: true,
          accepted_call: true
        },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    s = checkQuests(s);
    const currencyAfterFirst = s.character.currency;
    s = checkQuests(s);
    // Second pass should be idempotent — no double-currency
    expect(s.character.currency).toBe(currencyAfterFirst);
  });

  it('finalizes the quest on the insult-the-hat refusal path', () => {
    let s = withCharacter();
    s = {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          unlocked_crossroads: true,
          started_call_encounter: true,
          insulted_hermit_hat: true
        },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    s = checkQuests(s);
    expect(s.story.completedQuests).toContain('answer_the_call');
  });
});

describe('checkQuests integration via reduce', () => {
  function withCharacter() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    return s;
  }

  it('reduce activates answer_the_call after StartNewGame', () => {
    const s = withCharacter();
    expect(s.story.activeQuests).toContain('answer_the_call');
  });

  it('starting the_call encounter sets started_call_encounter flag', () => {
    let s = withCharacter();
    // Manually inject the unlock flag and visit so the encounter is reachable.
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, unlocked_crossroads: true },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    // Trigger the call encounter directly.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'the_call' as EncounterId });
    expect(s.world.flags['started_call_encounter']).toBe(true);
  });

  it('hear_the_hermit objective completes via reduce after the encounter starts', () => {
    let s = withCharacter();
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, unlocked_crossroads: true },
        visited: [...s.world.visited, LocationId('dusty_crossroads')]
      }
    };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'the_call' as EncounterId });
    const done = s.story.completedObjectives[QuestId('answer_the_call')] ?? [];
    expect(done).toContain('hear_the_hermit');
  });
});
