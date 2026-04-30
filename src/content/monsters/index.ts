import { MonsterId, ItemId, type Monster } from '../../engine/types';

export const monsters: Record<MonsterId, Monster> = {
  [MonsterId('practice_hay_bale')]: {
    id: MonsterId('practice_hay_bale'),
    name: 'the Practice Hay Bale',
    flavor: 'Stoic. Lumpy. The unspoken proof of every hero who hit something easy first.',
    defeatedFlavor: 'The hay bale topples sideways and lies still. It looks, somehow, more dignified in repose than upright.',
    hp: 10,
    brawn: 0,
    bravado: 0,
    dodge: 0,
    armor: 0,
    weaponDamage: 0,
    actions: [
      { kind: 'attack', weight: 1.0, flavor: 'The hay bale stares at you. Hay bales do this.' }
    ],
    loot: []
  },
  [MonsterId('officious_tax_rat')]: {
    id: MonsterId('officious_tax_rat'),
    name: 'the Officious Tax Rat',
    flavor: 'Wears a tiny vest. Carries a clipboard. Collects an unspecified levy on behalf of an unspecified authority.',
    defeatedFlavor: 'The Tax Rat collapses dramatically, citing burnout. It scurries off under a stack of important-looking papers, muttering vague threats about an audit.',
    hp: 14,
    brawn: 4,
    bravado: 6,
    dodge: 8,
    armor: 1,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The rat strikes you with a clipboard, citing subsection 4.2(b).' },
      { kind: 'special', weight: 0.3, flavor: 'The rat invokes an obscure agricultural ordinance. You feel mildly fined.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The rat threatens to file a complaint and scurries off.' }
    ],
    loot: [
      { itemId: ItemId('hardtack'), chance: 0.5 }
    ],
    currencyDrop: { min: 3, max: 8 }
  },
  [MonsterId('insolent_pell')]: {
    id: MonsterId('insolent_pell'),
    name: 'an Insolent Training Pell',
    flavor: 'A battered training post that has, through long association, developed opinions.',
    defeatedFlavor: 'The pell loses the argument and resumes leaning to starboard.',
    hp: 8,
    brawn: 4,
    bravado: 0,
    dodge: 0,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The pell sways meaningfully in your direction.' }
    ],
    loot: []
  },
  [MonsterId('feral_footnote')]: {
    id: MonsterId('feral_footnote'),
    name: 'a Feral Footnote',
    flavor: 'A small superscript that has detached from its citation and is now circling.',
    defeatedFlavor: 'The footnote sniffs, returns to its citation, and begins behaving like a footnote.',
    hp: 6,
    brawn: 3,
    bravado: 0,
    dodge: 2,
    armor: 0,
    weaponDamage: 2,
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The footnote nips at the punctuation around your sentences.' }
    ],
    loot: []
  },
  [MonsterId('pointed_heckler')]: {
    id: MonsterId('pointed_heckler'),
    name: 'a Pointed Heckler',
    flavor: 'An early arrival exercising her vowels.',
    defeatedFlavor: 'The heckler loses interest and starts heckling someone else.',
    hp: 7,
    brawn: 4,
    bravado: 4,
    dodge: 1,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The heckler delivers a precisely-timed sigh.' }
    ],
    loot: []
  }
};
