import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WorldPanel from '../WorldPanel.svelte';
import { gameStore } from '../store.svelte';
import { reduce } from '../../engine/events';
import { createInitialState } from '../../engine/state';
import type { ClassId, EncounterId, SkillId } from '../../engine/types';

function setupWithCombat(): void {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
  gameStore.state = s;
}

describe('WorldPanel Skill button', () => {
  it('renders the Skill button during turn-based combat', () => {
    setupWithCombat();
    const { getByRole } = render(WorldPanel);
    expect(getByRole('button', { name: /skill/i })).toBeTruthy();
  });

  it('disables the Skill button with locked tooltip when no skills known', () => {
    setupWithCombat();
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/level 3/i);
  });

  it('disables with insufficient-MP tooltip when MP is too low', () => {
    setupWithCombat();
    let s = gameStore.state;
    s = {
      ...s,
      character: { ...s.character, knownSkills: ['tempt_fate' as SkillId], mp: { current: 0, max: 10 } }
    };
    gameStore.state = s;
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/mana/i);
  });

  it('enables when MP is sufficient and skill is known', () => {
    setupWithCombat();
    let s = gameStore.state;
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId], mp: { current: 50, max: 50 } } };
    gameStore.state = s;
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
