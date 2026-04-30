import { ClassId, ItemId, LocationId, NarrativeNodeId, SkillId, type CharacterClass } from '../../engine/types';

export const classes: Record<ClassId, CharacterClass> = {
  [ClassId('reluctant_farmboy')]: {
    id: ClassId('reluctant_farmboy'),
    name: 'Reluctant Farmboy',
    epithet: 'the Reluctant Farmboy',
    startingStats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
    baseHp: 30,
    baseMp: 10,
    startingItems: [
      { itemId: ItemId('rusty_pitchfork'), equipped: true },
      { itemId: ItemId('itchy_wool_tunic'), equipped: true },
      { itemId: ItemId('note_from_mother') }
    ],
    signatureMove: SkillId('tempt_fate'),
    openingLocationId: LocationId('family_farm'),
    // Plan 5 wires this to a real narrative node for the full opening scene.
    // For Plan 2 the StartNewGame reducer emits a short opener directly.
    openingNarrativeNodeId: NarrativeNodeId('farmboy_opening_short')
  },
  [ClassId('disgraced_knight')]: {
    id: ClassId('disgraced_knight'),
    name: 'Disgraced Knight',
    epithet: 'the Disgraced Knight',
    startingStats: { brawn: 9, brains: 4, bravado: 7, bluck: 5 },
    baseHp: 40,
    baseMp: 8,
    startingItems: [
      { itemId: ItemId('nicked_longsword'), equipped: true },
      { itemId: ItemId('battered_half_plate'), equipped: true },
      { itemId: ItemId('defaced_family_crest') }
    ],
    signatureMove: SkillId('brute_force'),
    openingLocationId: LocationId('quartermasters_yard'),
    openingNarrativeNodeId: NarrativeNodeId('knight_opening_short')
  }
};
