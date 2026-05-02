import { ClassId, EncounterId, ItemId, LocationId, NarrativeNodeId, SkillId, type CharacterClass } from '../../engine/types';

export const classes: Record<ClassId, CharacterClass> = {
  [ClassId('reluctant_farmhand')]: {
    id: ClassId('reluctant_farmhand'),
    name: 'Reluctant Farmhand',
    epithet: 'the Reluctant Farmhand',
    startingStats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
    baseHp: 30,
    baseMp: 10,
    startingItems: [
      { itemId: ItemId('rusty_pitchfork'), equipped: true },
      { itemId: ItemId('itchy_wool_tunic'), equipped: true },
      { itemId: ItemId('note_from_mother') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('tempt_fate'),
    openingLocationId: LocationId('family_farm'),
    openingNarrativeNodeId: NarrativeNodeId('farmhand_opener_a'),
    openingEncounterId: EncounterId('farmhand_opener_encounter'),
    hpLabel: 'Pluck',
    mpLabel: 'Wits'
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
      { itemId: ItemId('defaced_family_crest') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('brute_force'),
    openingLocationId: LocationId('quartermasters_yard'),
    openingNarrativeNodeId: NarrativeNodeId('knight_opener_a'),
    openingEncounterId: EncounterId('knight_opener_encounter'),
    hpLabel: 'Honor',
    mpLabel: 'Discipline'
  },
  [ClassId('accidental_wizard')]: {
    id: ClassId('accidental_wizard'),
    name: 'Accidental Wizard',
    epithet: 'the Accidental Wizard',
    startingStats: { brawn: 4, brains: 10, bravado: 5, bluck: 6 },
    baseHp: 22,
    baseMp: 20,
    startingItems: [
      { itemId: ItemId('cracked_staff'), equipped: true },
      { itemId: ItemId('long_robe'), equipped: true },
      { itemId: ItemId('questionable_tome') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('out_think_it'),
    openingLocationId: LocationId('burning_library'),
    openingNarrativeNodeId: NarrativeNodeId('wizard_opener_a'),
    openingEncounterId: EncounterId('wizard_opener_encounter'),
    hpLabel: 'Composure',
    mpLabel: 'Mana'
  },
  [ClassId('bard')]: {
    id: ClassId('bard'),
    name: "Bard Who Didn't Ask For This",
    epithet: "the Bard Who Didn't Ask For This",
    startingStats: { brawn: 5, brains: 7, bravado: 9, bluck: 4 },
    baseHp: 28,
    baseMp: 14,
    startingItems: [
      { itemId: ItemId('dented_lute'), equipped: true },
      { itemId: ItemId('dramatic_cloak'), equipped: true },
      { itemId: ItemId('audience_expectation') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('swagger'),
    openingLocationId: LocationId('tavern_dressing_room'),
    openingNarrativeNodeId: NarrativeNodeId('bard_opener_a'),
    openingEncounterId: EncounterId('bard_opener_encounter'),
    hpLabel: 'Confidence',
    mpLabel: 'Vibes'
  }
};
