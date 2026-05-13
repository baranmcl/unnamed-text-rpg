import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId, LocationId, QuestId, type GameState } from '../engine/types';

describe('quests e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('farmhand full Chapter 1 run completes answer_the_call with rewards', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    // Walk past the bespoke opener (engagement → commitment terminates).
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    // Quest activated immediately on game start.
    expect(gameStore.state.story.activeQuests).toContain('answer_the_call');

    const startLevel = gameStore.state.character.level;

    // Defeat the first_tax_rat to satisfy survive_your_morning.
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    if (gameStore.state.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = gameStore.state.combat.combatants.find((c) => c.kind === 'monster')!.id;
    const wounded: GameState = {
      ...gameStore.state,
      combat: {
        ...gameStore.state.combat,
        combatants: gameStore.state.combat.combatants.map((c) => {
          if (c.id === monsterId) return { ...c, hp: 1 };
          // Guarantee a hit so the test is deterministic regardless of RNG seed.
          if (c.kind === 'player') return { ...c, statuses: [{ id: 1, kind: 'guaranteed_crit' as const, duration: { kind: 'one_shot' as const }, source: 'test' }] };
          return c;
        })
      }
    };
    gameStore.state = wounded;
    gameStore.dispatch({ kind: 'AttackTarget' });
    // After defeat, the hermit_beckons beat fires, setting unlocked_crossroads.
    // checkQuests then completes survive_your_morning.
    expect(gameStore.state.story.completedObjectives[QuestId('answer_the_call')]).toContain('survive_your_morning');

    // Travel to the Dusty Crossroads.
    gameStore.dispatch({ kind: 'EnterLocation', locationId: LocationId('dusty_crossroads') });
    expect(gameStore.state.story.completedObjectives[QuestId('answer_the_call')]).toContain('travel_to_crossroads');

    // Engage the signpost and step back — sets crossroads_explored, which
    // unlocks the call_received beat. The cheapest pre-Call path; equivalent
    // to defeating the Unsigned Direction or solving the riddle.
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as import('../engine/types').EncounterId });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 4 }); // 4 = "Step back"

    // call_received beat now fires, which queues the_call encounter. The
    // drainPendingEncounter loop runs it. After that, started_call_encounter
    // is set and the hear_the_hermit objective completes.
    expect(gameStore.state.story.completedObjectives[QuestId('answer_the_call')]).toContain('hear_the_hermit');

    // Find the "Accept" choice in the_call narrative encounter and pick it.
    if (gameStore.state.combat?.kind !== 'narrative') throw new Error('expected narrative encounter');
    // The choice_root has 4 choices; index 0 is "Accept" (per content/narrative/nodes.ts).
    // Snapshot currency just before the quest finalizes (after combat loot has already landed).
    const preRewardCurrency = gameStore.state.character.currency;
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    // Quest is now finalized.
    expect(gameStore.state.story.completedQuests).toContain('answer_the_call');
    expect(gameStore.state.story.activeQuests).not.toContain('answer_the_call');

    // Rewards applied.
    expect(gameStore.state.character.currency).toBe(preRewardCurrency + 50);
    // XP reward (100) at level 1 levels the player up to level 2.
    expect(gameStore.state.character.level).toBeGreaterThan(startLevel);

    // QUEST and REWARD log entries present.
    const questEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'QUEST' && e.text.includes('Answer the Call to Adventure')
    );
    const rewardEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'REWARD'
    );
    expect(questEntry).toBeDefined();
    expect(rewardEntry).toBeDefined();
    expect(rewardEntry?.text).toContain('50 leaves');
    expect(rewardEntry?.text).toContain('100 experience');

    // Stage advanced to chapter_4 (Meeting with the Mentor) on Accept.
    expect(gameStore.state.story.stage).toBe('chapter_4');
  });

  it('Consign this tale to the flames wipes quest state along with the save', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.story.activeQuests).toContain('answer_the_call');
    gameStore.resetSave();
    expect(gameStore.state.story.activeQuests).toEqual([]);
    expect(gameStore.state.story.completedQuests).toEqual([]);
    expect(gameStore.state.story.completedObjectives).toEqual({});
  });

  it('Forget thy deeds leaves quest state intact', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const before = gameStore.state.story.activeQuests;
    gameStore.forgetAchievements();
    expect(gameStore.state.story.activeQuests).toEqual(before);
  });
});
