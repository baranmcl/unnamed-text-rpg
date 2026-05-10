import { ItemId, type Item } from '../../engine/types';

export const items: Record<ItemId, Item> = {
  [ItemId('rusty_pitchfork')]: {
    id: ItemId('rusty_pitchfork'),
    name: 'a Rusty Pitchfork',
    flavor: 'A perfectly functional implement for hay, increasingly indistinguishable from a perfectly functional implement for adventure.',
    kind: 'weapon',
    slot: 'weapon',
    damage: 4
  },
  [ItemId('itchy_wool_tunic')]: {
    id: ItemId('itchy_wool_tunic'),
    name: 'an Itchy Wool Tunic',
    flavor: 'Knitted by a relative who underestimated both your size and the abrasive properties of unwashed wool.',
    kind: 'armor',
    slot: 'armor',
    armor: 2
  },
  [ItemId('note_from_mother')]: {
    id: ItemId('note_from_mother'),
    name: 'a Note from Mother',
    flavor: 'Folded twice. The handwriting is firm and the advice is mostly about onions.',
    kind: 'quest'
  },
  [ItemId('hardtack')]: {
    id: ItemId('hardtack'),
    name: 'a Lump of Hardtack',
    flavor: 'Aggressively biscuit. Restores 12 HP and a sense of grim determination.',
    kind: 'consumable',
    effects: [{ kind: 'heal_hp', amount: 12 }]
  },
  [ItemId('nicked_longsword')]: {
    id: ItemId('nicked_longsword'),
    name: 'a Nicked Longsword',
    flavor: 'Honored by three sieges and one drunken tavern altercation, the latter being the more recent.',
    kind: 'weapon',
    slot: 'weapon',
    damage: 5
  },
  [ItemId('battered_half_plate')]: {
    id: ItemId('battered_half_plate'),
    name: 'Battered Half-Plate',
    flavor: 'Missing a pauldron. The other one is missing a smaller pauldron.',
    kind: 'armor',
    slot: 'armor',
    armor: 3
  },
  [ItemId('defaced_family_crest')]: {
    id: ItemId('defaced_family_crest'),
    name: 'a Defaced Family Crest',
    flavor: 'Someone has scratched out the motto and replaced it with a single, very judgmental adjective.',
    kind: 'quest'
  },
  [ItemId('cracked_staff')]: {
    id: ItemId('cracked_staff'),
    name: 'a Cracked Staff',
    flavor: 'The crack hums faintly. Its rune is theoretically Wisdom; pronunciation may have intervened.',
    kind: 'weapon',
    slot: 'weapon',
    damage: 3,
    statBonuses: { brains: 1 }
  },
  [ItemId('long_robe')]: {
    id: ItemId('long_robe'),
    name: 'A Robe That Is Far Too Long',
    flavor: 'Trips you on stairs. Probably enchanted to do exactly that.',
    kind: 'armor',
    slot: 'armor',
    armor: 1
  },
  [ItemId('questionable_tome')]: {
    id: ItemId('questionable_tome'),
    name: 'a Tome of Questionable Translations',
    flavor: "Half a margin reads 'Beware the Lich-King'; the other half reads 'Beware the Itch-King.' Both are alarming.",
    kind: 'quest'
  },
  [ItemId('dented_lute')]: {
    id: ItemId('dented_lute'),
    name: 'a Dented Lute',
    flavor: 'Three of six strings. The fourth is, generously, implied.',
    kind: 'weapon',
    slot: 'weapon',
    damage: 4
  },
  [ItemId('dramatic_cloak')]: {
    id: ItemId('dramatic_cloak'),
    name: 'a Dramatic Cloak',
    flavor: "Bills itself as 'theatrical-grade.' This is a category neither armor nor textile recognize.",
    kind: 'armor',
    slot: 'armor',
    armor: 2
  },
  [ItemId('audience_expectation')]: {
    id: ItemId('audience_expectation'),
    name: 'an Audience Expectation',
    flavor: 'An invisible weight, surprisingly portable. Heaviest in the chest.',
    kind: 'quest'
  },
  [ItemId('page_of_errata')]: {
    id: ItemId('page_of_errata'),
    name: 'a Page of Errata',
    flavor: "A torn page of corrections in a steady hand. Reading it carefully patches your assumptions, which patches you up a bit.",
    kind: 'consumable',
    effects: [{ kind: 'heal_hp', amount: 15 }]
  }
};
