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
  }
};
