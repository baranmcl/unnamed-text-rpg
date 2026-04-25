import { describe, it, expect } from 'vitest';
import { rng } from '../rng';

describe('rng', () => {
  it('produces deterministic d6 from a given seed', () => {
    const s0 = { seed: 12345, step: 0 };
    const r1 = rng.d6(s0);
    const r2 = rng.d6(s0);
    expect(r1.value).toBe(r2.value);
    expect(r1.state.step).toBe(1);
    expect(r1.value).toBeGreaterThanOrEqual(1);
    expect(r1.value).toBeLessThanOrEqual(6);
  });

  it('advances step on each call so successive calls vary', () => {
    let s = { seed: 12345, step: 0 };
    const values: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = rng.d6(s);
      values.push(r.value);
      s = r.state;
    }
    // Not all the same value (probabilistically near-impossible at p ~6^-11)
    const uniques = new Set(values).size;
    expect(uniques).toBeGreaterThan(1);
    expect(s.step).toBe(12);
  });

  it('d20 returns a value in [1, 20]', () => {
    let s = { seed: 99, step: 0 };
    for (let i = 0; i < 100; i++) {
      const r = rng.d20(s);
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(20);
      s = r.state;
    }
  });

  it('pick returns a member of the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    let s = { seed: 7, step: 0 };
    for (let i = 0; i < 50; i++) {
      const r = rng.pick(s, arr);
      expect(arr).toContain(r.value);
      s = r.state;
    }
  });

  it('weighted respects weights over a large sample', () => {
    const table = [
      { value: 'attack', weight: 0.6 },
      { value: 'special', weight: 0.3 },
      { value: 'flee', weight: 0.1 }
    ];
    const counts: Record<string, number> = { attack: 0, special: 0, flee: 0 };
    let s = { seed: 42, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rng.weighted(s, table);
      counts[r.value as string]++;
      s = r.state;
    }
    expect(counts.attack).toBeGreaterThan(2700); // ~60%
    expect(counts.attack).toBeLessThan(3300);
    expect(counts.flee).toBeGreaterThan(350);    // ~10%
    expect(counts.flee).toBeLessThan(650);
  });
});
