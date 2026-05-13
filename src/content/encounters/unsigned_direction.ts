import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

// Optional pre-Call lurker at the Dusty Crossroads. Hidden once the player has
// accepted the call (the crossroads moves on past this little encounter).
export const unsigned_direction: CombatEncounter = {
  id: EncounterId('combat_unsigned_direction'),
  kind: 'combat',
  monsterId: MonsterId('unsigned_direction'),
  xpReward: 8,
  repeatable: false,
  hiddenIfFlag: 'accepted_call'
};
