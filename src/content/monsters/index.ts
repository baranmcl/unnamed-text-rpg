import { MonsterId, ItemId, type Monster } from '../../engine/types';

export const monsters: Record<MonsterId, Monster> = {
  [MonsterId('officious_tax_rat')]: {
    id: MonsterId('officious_tax_rat'),
    name: 'the Officious Tax Rat',
    flavor: 'Wears a tiny vest. Carries a clipboard. Collects an unspecified levy on behalf of an unspecified authority.',
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
    ]
  }
};
