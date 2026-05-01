import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../index';

describe('content registry', () => {
  it('exports non-empty registries for items, monsters, encounters, locations, classes, skills, achievements', () => {
    expect(Object.keys(content.items).length).toBeGreaterThan(0);
    expect(Object.keys(content.monsters).length).toBeGreaterThan(0);
    expect(Object.keys(content.encounters).length).toBeGreaterThan(0);
    expect(Object.keys(content.locations).length).toBeGreaterThan(0);
    expect(Object.keys(content.classes).length).toBeGreaterThan(0);
    expect(Object.keys(content.skills).length).toBeGreaterThan(0);
    expect(Object.keys(content.achievements).length).toBeGreaterThan(0);
  });

  it('passes validation', () => {
    expect(() => validateContent()).not.toThrow();
  });
});
