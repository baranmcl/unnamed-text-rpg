import { describe, it, expect } from 'vitest';
import { serialize, deserialize, SaveLoadError } from '../save';
import { createDemoState, createInitialState } from '../state';

describe('serialize/deserialize', () => {
  it('round-trips a demo state losslessly', () => {
    const original = createDemoState();
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored).toEqual(original);
  });

  it('produces valid JSON', () => {
    const original = createDemoState();
    const json = serialize(original);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('throws SaveLoadError on malformed JSON', () => {
    expect(() => deserialize('{ not json')).toThrow(SaveLoadError);
  });

  it('throws SaveLoadError on unknown future version', () => {
    const future = JSON.stringify({ ...JSON.parse(serialize(createDemoState())), version: 9999 });
    expect(() => deserialize(future)).toThrow(SaveLoadError);
    expect(() => deserialize(future)).toThrow(/future edition/i);
  });

  it('throws SaveLoadError when shape is missing required fields', () => {
    expect(() => deserialize('{"version":1}')).toThrow(SaveLoadError);
  });
});

describe('save migration v1 → v2', () => {
  it('backfills empty statuses arrays on character and combatants', () => {
    const v1Save = {
      version: 1,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmhand',
        level: 1,
        xp: 0,
        hp: { current: 30, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0
        // no statuses field — must be backfilled
      },
      world: {
        currentLocation: 'family_farm',
        visited: [],
        flags: {}
      },
      story: {
        stage: 'act_i',
        currentBeat: null,
        completedBeats: [],
        activeQuests: []
      },
      combat: null,
      log: [],
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };

    const loaded = deserialize(JSON.stringify(v1Save));
    expect(loaded.version).toBe(4);
    expect(loaded.character.statuses).toEqual([]);
  });

  it('backfills statuses on combatants if combat is in progress', () => {
    const v1SaveWithCombat = {
      version: 1,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmhand',
        level: 1,
        xp: 0,
        hp: { current: 25, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0
      },
      world: { currentLocation: 'family_farm', visited: [], flags: {} },
      story: { stage: 'act_i', currentBeat: null, completedBeats: [], activeQuests: [] },
      combat: {
        kind: 'turn-based',
        encounterId: 'first_tax_rat',
        combatants: [
          { id: 'player', kind: 'player', hp: 25, initiative: 10 },
          { id: 'tax_rat', kind: 'monster', hp: 8, initiative: 8 }
        ],
        turnIndex: 0,
        round: 1
      },
      log: [],
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };

    const loaded = deserialize(JSON.stringify(v1SaveWithCombat));
    expect(loaded.version).toBe(4);
    expect(loaded.combat?.kind).toBe('turn-based');
    if (loaded.combat?.kind === 'turn-based') {
      for (const c of loaded.combat.combatants) {
        expect(c.statuses).toEqual([]);
      }
    }
  });

  it('serializes the current SAVE_VERSION state and round-trips it cleanly', () => {
    const s = createInitialState(42);
    const json = serialize(s);
    const loaded = deserialize(json);
    expect(loaded.version).toBe(4);
    expect(loaded.character.statuses).toEqual([]);
  });
});

describe('save migration v2 → v3', () => {
  it('backfills the four quest-state fields on story', () => {
    const v2Save = {
      version: 2,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmhand',
        level: 1,
        xp: 0,
        hp: { current: 30, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0,
        statuses: []
      },
      world: { currentLocation: 'family_farm', visited: [], flags: {} },
      story: {
        stage: 'act_i',
        currentBeat: null,
        completedBeats: [],
        activeQuests: []
        // No completedQuests, completedObjectives, or counter fields — must be backfilled
      },
      combat: null,
      log: [],
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };

    const loaded = deserialize(JSON.stringify(v2Save));
    expect(loaded.version).toBe(4);
    expect(loaded.story.completedQuests).toEqual([]);
    expect(loaded.story.completedObjectives).toEqual({});
    expect(loaded.story.questLogActivityCount).toBe(0);
    expect(loaded.story.questLogActivityAtLastOpen).toBe(0);
    // Pre-existing fields preserved (after v3→v4 act→chapter migration)
    expect(loaded.story.activeQuests).toEqual([]);
    expect(loaded.story.stage).toBe('chapter_1');
  });

  it('serializes a current-version state and round-trips it cleanly', () => {
    const s = createInitialState(42);
    const json = serialize(s);
    const loaded = deserialize(json);
    expect(loaded.version).toBe(4);
    expect(loaded.story.completedQuests).toEqual([]);
    expect(loaded.story.completedObjectives).toEqual({});
    expect(loaded.story.questLogActivityCount).toBe(0);
    expect(loaded.story.questLogActivityAtLastOpen).toBe(0);
  });
});

describe('save migration v3 → v4', () => {
  function v3Save(stage: string, log: any[] = []) {
    return {
      version: 3,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmhand',
        level: 1,
        xp: 0,
        hp: { current: 30, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0,
        statuses: []
      },
      world: { currentLocation: 'family_farm', visited: [], flags: {} },
      story: {
        stage,
        currentBeat: null,
        completedBeats: [],
        activeQuests: [],
        completedQuests: [],
        completedObjectives: {},
        questLogActivityCount: 0,
        questLogActivityAtLastOpen: 0
      },
      combat: null,
      log,
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };
  }

  it.each([
    ['act_i', 'chapter_1'],
    ['act_ii', 'chapter_6'],
    ['act_iii', 'chapter_7'],
    ['act_iv', 'chapter_8'],
    ['act_v', 'chapter_8'],
    ['act_vi', 'chapter_9']
  ])('maps %s → %s', (oldStage, newStage) => {
    const loaded = deserialize(JSON.stringify(v3Save(oldStage)));
    expect(loaded.version).toBe(4);
    expect(loaded.story.stage).toBe(newStage);
  });

  it('rewrites act-banner log entries to chapter-banner', () => {
    const log = [
      { id: 1, kind: 'narration', text: 'hi' },
      { id: 2, kind: 'act-banner', text: 'Act II' }
    ];
    const loaded = deserialize(JSON.stringify(v3Save('act_ii', log)));
    expect(loaded.log[0]?.kind).toBe('narration');
    expect(loaded.log[1]?.kind).toBe('chapter-banner');
  });
});
