import { MonsterId, ItemId, type Monster } from '../../engine/types';

export const monsters: Record<MonsterId, Monster> = {
  [MonsterId('practice_hay_bale')]: {
    id: MonsterId('practice_hay_bale'),
    name: 'the Practice Hay Bale',
    flavor: 'Stoic. Lumpy. The unspoken proof of every hero who hit something easy first.',
    defeatedFlavor: 'The hay bale topples sideways and lies still. It looks, somehow, more dignified in repose than upright.',
    hp: 30,
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
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The Tax Rat slips a fee-notice between two scales of your armor. The paperwork lodges.',
        status: 'armor_halved',
        duration: { kind: 'turns', remaining: 2 },
        appliedFlavor: 'Your armor is halved while the levy is in effect.',
        expirationFlavor: 'The levy lapses. Your guard returns.'
      },
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
    hp: 40,
    brawn: 4,
    bravado: 0,
    dodge: 0,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The pell sways meaningfully in your direction.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The pell tilts to catch your blade between its bracing-rails.',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Your weapon is suspended.',
        expirationFlavor: 'You wrench your blade free.'
      }
    ],
    loot: []
  },
  [MonsterId('feral_footnote')]: {
    id: MonsterId('feral_footnote'),
    name: 'a Feral Footnote',
    flavor: 'A small superscript that has detached from its citation and is now circling.',
    defeatedFlavor: 'The footnote sniffs, returns to its citation, and begins behaving like a footnote.',
    hp: 35,
    brawn: 3,
    bravado: 0,
    dodge: 2,
    armor: 0,
    weaponDamage: 2,
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The footnote nips at the punctuation around your sentences.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The footnote zigzags into three positions simultaneously, then settles into none of them.',
        status: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        appliedFlavor: 'You see triple. Your next attack is going to miss.',
        expirationFlavor: 'Your vision settles.'
      }
    ],
    loot: []
  },
  [MonsterId('pointed_heckler')]: {
    id: MonsterId('pointed_heckler'),
    name: 'a Pointed Heckler',
    flavor: 'An early arrival exercising her vowels.',
    defeatedFlavor: 'The heckler loses interest and starts heckling someone else.',
    hp: 40,
    brawn: 4,
    bravado: 4,
    dodge: 1,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The heckler delivers a precisely-timed sigh.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The heckler delivers a precisely-timed shout. You lose your line.',
        status: 'skip_turn',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: "You can't recover this turn.",
        expirationFlavor: 'You find your line again.'
      }
    ],
    loot: []
  },
  [MonsterId('grievance_bursar')]: {
    id: MonsterId('grievance_bursar'),
    name: 'a Bursar with Outstanding Grievances',
    flavor: 'A neat little man in a neat little waistcoat. He has, against all odds, found you.',
    defeatedFlavor: 'The Bursar slams shut his ledger, mutters about unbillable hours, and storms off in a small dignified cloud.',
    hp: 14,
    brawn: 5,
    bravado: 4,
    dodge: 6,
    armor: 2,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The Bursar swipes at you with a ledger, citing a clause in your enlistment papers.' },
      { kind: 'special', weight: 0.3, flavor: 'The Bursar invokes a sub-clause about mess-hall arrears. You feel mildly garnished.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The Bursar threatens a formal complaint and makes a pointed exit.' }
    ],
    loot: [
      { itemId: ItemId('hardtack'), chance: 0.4 }
    ],
    currencyDrop: { min: 3, max: 8 }
  },
  [MonsterId('errant_examiner')]: {
    id: MonsterId('errant_examiner'),
    name: 'an Errant Examiner',
    flavor: "A stern figure in spectacles. She has 'a few small questions' about your credentials.",
    defeatedFlavor: "The Examiner closes her rubric. 'I shall require these answers in triplicate by Tuesday.' She vanishes into a margin.",
    hp: 12,
    brawn: 3,
    bravado: 7,
    dodge: 9,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The Examiner asks a sharp follow-up question and circles your error in red.' },
      { kind: 'special', weight: 0.3, flavor: 'The Examiner cross-references an earlier paper. You feel retroactively wrong.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The Examiner adjourns the panel and threatens reconvening at a later date.' }
    ],
    loot: [
      { itemId: ItemId('hardtack'), chance: 0.4 }
    ],
    currencyDrop: { min: 3, max: 8 }
  },
  [MonsterId('critic_with_notes')]: {
    id: MonsterId('critic_with_notes'),
    name: 'a Critic with Notes',
    flavor: 'A small notebook. A smaller pen. A face arranged into the universal expression of a person about to mention three things.',
    defeatedFlavor: 'The Critic sighs, marks something with a star, and sweeps out muttering about lighting cues.',
    hp: 13,
    brawn: 3,
    bravado: 9,
    dodge: 7,
    armor: 0,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.6, flavor: "The Critic delivers a cutting remark about your phrasing in the second verse." },
      { kind: 'special', weight: 0.3, flavor: 'The Critic invokes three-act structure. You feel structurally unsound.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The Critic threatens an unfavorable column and makes a meaningful exit.' }
    ],
    loot: [
      { itemId: ItemId('hardtack'), chance: 0.4 }
    ],
    currencyDrop: { min: 3, max: 8 }
  },
  [MonsterId('wayfaring_footnote')]: {
    id: MonsterId('wayfaring_footnote'),
    name: 'a Wayfaring Footnote',
    flavor: 'A paragraph with legs. It pauses to cite itself.',
    defeatedFlavor: 'The Footnote relents, returns to its citation, and clears its throat one final time.',
    hp: 18,
    brawn: 3,
    bravado: 4,
    dodge: 6,
    armor: 1,
    weaponDamage: 4,
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The Footnote takes a fresh swing, citing itself.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: '(see: previous note) — the line shimmers.',
        status: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        appliedFlavor: 'You misread the next line. Your strike is going to go wide.',
        expirationFlavor: 'The page settles. You see the line clearly.'
      }
    ],
    loot: [
      { itemId: ItemId('page_of_errata'), chance: 0.4 }
    ],
    currencyDrop: { min: 1, max: 4 }
  },
  [MonsterId('plot_convenience')]: {
    id: MonsterId('plot_convenience'),
    name: 'a Plot Convenience',
    flavor: 'An obstacle so on-the-nose it is almost helpful. Squat, durable, ready-made for the moment.',
    defeatedFlavor: 'The Convenience deflates into an apologetic puddle. It was, perhaps, never necessary.',
    hp: 24,
    brawn: 2,
    bravado: 2,
    dodge: 4,
    armor: 2,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.65, flavor: 'The Convenience swings with exactly the force the scene requires.' },
      {
        kind: 'apply_status',
        weight: 0.35,
        flavor: 'The Convenience plants its feet and assumes a meaningful pose.',
        status: 'plot_armor',
        duration: { kind: 'turns', remaining: 2 },
        appliedFlavor: 'Plot armor engages. The next two blows will land, but barely.',
        expirationFlavor: 'The plot armor loosens. The Convenience grows inconvenient.'
      }
    ],
    loot: [
      { itemId: ItemId('page_of_errata'), chance: 0.6 }
    ],
    currencyDrop: { min: 2, max: 5 }
  }
};
