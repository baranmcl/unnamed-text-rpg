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
  }
};
