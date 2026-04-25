import { describe, it, expect } from 'vitest';
import { serialize, deserialize, SaveLoadError } from '../save';
import { createDemoState } from '../state';

describe('serialize/deserialize', () => {
  it('round-trips a demo state losslessly', () => {
    const original = createDemoState();
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored).toEqual(original);
  });

  it('produces valid JSON', () => {
    const original = createDemoState();
    const json = serialize(original);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('throws SaveLoadError on malformed JSON', () => {
    expect(() => deserialize('{ not json')).toThrow(SaveLoadError);
  });

  it('throws SaveLoadError on unknown future version', () => {
    const future = JSON.stringify({ ...JSON.parse(serialize(createDemoState())), version: 9999 });
    expect(() => deserialize(future)).toThrow(SaveLoadError);
    expect(() => deserialize(future)).toThrow(/future edition/i);
  });

  it('throws SaveLoadError when shape is missing required fields', () => {
    expect(() => deserialize('{"version":1}')).toThrow(SaveLoadError);
  });
});
