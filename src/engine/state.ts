import {
  ClassId,
  ItemId,
  LocationId,
  SAVE_VERSION,
  type GameState,
  type LogEntry
} from './types';

export function createInitialState(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    rng: { seed, step: 0 },
    character: {
      name: '',
      classId: ClassId(''),
      level: 0,
      xp: 0,
      hp: { current: 0, max: 0 },
      mp: { current: 0, max: 0 },
      stats: { brawn: 0, brains: 0, bravado: 0, bluck: 0 },
      equipment: {},
      inventory: [],
      knownSkills: []
    },
    world: {
      currentLocation: LocationId(''),
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
    settings: {
      theme: 'parchment',
      textSize: 'medium',
      autoSave: true
    }
  };
}

// Demo state used by the UI shell in Plan 1 so we can render real-looking
// content without character creation. Replaced when character creation lands
// in Plan 2.
export function createDemoState(): GameState {
  const log: LogEntry[] = [
    {
      id: 1,
      kind: 'narration',
      text: 'You stand at a crossroads, which, as crossroads go, is unusually literal. A signpost leans drunkenly, pointing in four directions, three of which no longer exist. Wind carries the faint smell of onions and minor prophecy.'
    },
    {
      id: 2,
      kind: 'dialogue',
      speaker: 'Old Hermit',
      text: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."'
    },
    {
      id: 3,
      kind: 'narration',
      text: 'The hermit produces a map, then immediately eats a corner of it. You are not certain whether this is part of the ritual.'
    },
    {
      id: 4,
      kind: 'system',
      systemLabel: 'EXP.',
      text: '+3 experience for listening politely.'
    }
  ];

  return {
    version: SAVE_VERSION,
    rng: { seed: 1, step: 0 },
    character: {
      name: 'Sir Brendan',
      classId: ClassId('reluctant_farmboy'),
      level: 3,
      xp: 35,
      hp: { current: 45, max: 60 },
      mp: { current: 12, max: 20 },
      stats: { brawn: 9, brains: 12, bravado: 7, bluck: 4 },
      equipment: {
        weapon: ItemId('rusty_pitchfork'),
        armor: ItemId('itchy_wool_tunic')
      },
      inventory: [
        { itemId: ItemId('hardtack'), qty: 1 },
        { itemId: ItemId('suspicious_coin'), qty: 1 },
        { itemId: ItemId('note_from_mother'), qty: 1 }
      ],
      knownSkills: []
    },
    world: {
      currentLocation: LocationId('dusty_crossroads'),
      visited: [LocationId('dusty_crossroads'), LocationId('family_farm')],
      flags: { met_hermit: true }
    },
    story: {
      stage: 'act_i',
      currentBeat: null,
      completedBeats: [],
      activeQuests: []
    },
    combat: null,
    log,
    settings: {
      theme: 'parchment',
      textSize: 'medium',
      autoSave: true
    }
  };
}
