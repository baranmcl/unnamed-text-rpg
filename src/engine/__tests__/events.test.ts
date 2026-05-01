import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';

describe('SetTheme moonlit achievement seed', () => {
  it('sets achievements.theme_moonlit when theme switches to moonlit', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'moonlit' });
    expect(s.world.flags['achievements.theme_moonlit']).toBe(true);
  });

  it('does not set the flag when theme stays parchment', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'parchment' });
    expect(s.world.flags['achievements.theme_moonlit']).toBeUndefined();
  });
});
