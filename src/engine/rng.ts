// Seeded linear congruential generator.
// Pure-function API: every call takes (state, ...) → { state, value }.
// state.seed is the seed; state.step counts how many random draws have occurred.

export type RngState = { seed: number; step: number };
export type RngResult<T> = { state: RngState; value: T };

// LCG constants (Numerical Recipes). uint32 modulo 2^32.
const A = 1664525;
const C = 1013904223;
const MOD = 0x100000000; // 2^32

function next(state: RngState): RngResult<number> {
  // Hash seed + step. Multiply step in so step=0 isn't always 0.
  const x0 = (state.seed + state.step * 2654435761) >>> 0;
  const x1 = ((Math.imul(x0, A) >>> 0) + C) >>> 0;
  const value = x1 / MOD; // [0, 1)
  return { state: { seed: state.seed, step: state.step + 1 }, value };
}

function d(state: RngState, sides: number): RngResult<number> {
  const r = next(state);
  return { state: r.state, value: 1 + Math.floor(r.value * sides) };
}

export const rng = {
  d6: (state: RngState): RngResult<number> => d(state, 6),
  d20: (state: RngState): RngResult<number> => d(state, 20),
  d100: (state: RngState): RngResult<number> => d(state, 100),

  pick: <T>(state: RngState, arr: readonly T[]): RngResult<T> => {
    if (arr.length === 0) throw new Error('rng.pick called on empty array');
    const r = next(state);
    return { state: r.state, value: arr[Math.floor(r.value * arr.length)]! };
  },

  weighted: <T>(
    state: RngState,
    table: ReadonlyArray<{ value: T; weight: number }>
  ): RngResult<T> => {
    if (table.length === 0) throw new Error('rng.weighted called on empty table');
    const total = table.reduce((s, e) => s + e.weight, 0);
    const r = next(state);
    const target = r.value * total;
    let acc = 0;
    for (const e of table) {
      acc += e.weight;
      if (target < acc) return { state: r.state, value: e.value };
    }
    // Fallback (numerical edge case)
    return { state: r.state, value: table[table.length - 1]!.value };
  }
};
