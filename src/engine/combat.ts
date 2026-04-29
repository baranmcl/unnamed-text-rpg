import { rng, type RngState, type RngResult } from './rng';

// Spec §7 combat math.
// Hit: 1d20 + floor(bravado/2) ≥ targetDodge
export function rollHit(state: RngState, bravado: number, targetDodge: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor(bravado / 2);
  return { state: r.state, value: total >= targetDodge };
}

// Damage: weapon + floor(brawn/2) + d6 - targetArmor, minimum 1.
export function rollDamage(
  state: RngState,
  weaponDamage: number,
  brawn: number,
  targetArmor: number
): RngResult<number> {
  const r = rng.d6(state);
  const raw = weaponDamage + Math.floor(brawn / 2) + r.value - targetArmor;
  return { state: r.state, value: Math.max(1, raw) };
}

// Crit: 1d100 ≤ 5 + (bluck * 2)
export function rollCrit(state: RngState, bluck: number): RngResult<boolean> {
  const r = rng.d100(state);
  return { state: r.state, value: r.value <= 5 + bluck * 2 };
}

// Flee: 1d20 + floor((bluck + bravado)/2) ≥ 15
export function rollFlee(state: RngState, bluck: number, bravado: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor((bluck + bravado) / 2);
  return { state: r.state, value: total >= 15 };
}
