import { describe, it, expect } from 'vitest';
import { content } from '../index';
import { NarrativeNodeId, EncounterId } from '../../engine/types';

const CLASSES = ['knight', 'wizard', 'bard', 'farmhand'];

describe('Mentor first-visit narrative nodes', () => {
  it.each(CLASSES)('%s has arrival, teaching, deflect, motivation nodes', (cls) => {
    const ids = [
      `mentor_${cls}_arrival`,
      `mentor_${cls}_teaching`,
      `mentor_${cls}_deflect`,
      `mentor_${cls}_motivation`
    ];
    for (const id of ids) {
      expect(content.narrativeNodes[NarrativeNodeId(id)], `missing node ${id}`).toBeDefined();
    }
  });

  it.each(CLASSES)("%s teaching node has four choices (accept, motivation, probe, walk-on)", (cls) => {
    const node = content.narrativeNodes[NarrativeNodeId(`mentor_${cls}_teaching`)]!;
    expect(node.choices).toHaveLength(4);
    expect(node.choices.map((c) => c.label).join('|')).toMatch(/teach me/i);
  });

  it.each(CLASSES)("%s teaching node mentions 'the Sacred MacGuffin'", (cls) => {
    const node = content.narrativeNodes[NarrativeNodeId(`mentor_${cls}_teaching`)]!;
    expect(node.prose).toContain('Sacred MacGuffin');
  });
});

describe('Mentor first-visit encounters', () => {
  it.each(CLASSES)('%s first-visit encounter is registered', (cls) => {
    const enc = content.encounters[EncounterId(`mentor_${cls}_first_visit`)];
    expect(enc).toBeDefined();
    expect(enc!.kind).toBe('narrative');
  });
});

describe('Mentor return-state encounters', () => {
  it.each(['knight', 'wizard', 'bard', 'farmhand'])('%s post-acceptance encounter is registered', (cls) => {
    const enc = content.encounters[EncounterId(`mentor_${cls}_post_acceptance`)];
    expect(enc).toBeDefined();
    expect(enc!.kind).toBe('narrative');
  });

  it.each(['knight', 'wizard', 'bard'])('%s second-chance encounter is registered (Farmhand omitted)', (cls) => {
    const enc = content.encounters[EncounterId(`mentor_${cls}_return_unlearned`)];
    expect(enc).toBeDefined();
    expect(enc!.kind).toBe('narrative');
  });

  it('mentor_farmhand_return_unlearned does NOT exist (Farmhand cannot be in unlearned-return state)', () => {
    const enc = content.encounters[EncounterId('mentor_farmhand_return_unlearned')];
    expect(enc).toBeUndefined();
  });
});
