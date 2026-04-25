import { SAVE_VERSION, type GameState } from './types';

export class SaveLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SaveLoadError';
  }
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

// Migration registry. v1 ships with no migrations because v1 IS the first
// version. Each entry transforms from key to key+1.
const MIGRATIONS: Record<number, (s: any) => any> = {
  // Example for the future:
  // 1: (s) => ({ ...s, version: 2, character: { ...s.character, newField: 0 } }),
};

export function deserialize(json: string): GameState {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new SaveLoadError('Save data is not valid JSON.', e);
  }

  if (typeof parsed !== 'object' || parsed === null || typeof parsed.version !== 'number') {
    throw new SaveLoadError('Save data is missing a version number.');
  }

  let v = parsed.version as number;
  while (v < SAVE_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) {
      throw new SaveLoadError(`No migration registered from version ${v} to ${v + 1}.`);
    }
    parsed = migrate(parsed);
    v = parsed.version as number;
  }

  if (v > SAVE_VERSION) {
    throw new SaveLoadError(
      `This tale is from a future edition (save version ${v}, app expects ${SAVE_VERSION}).`
    );
  }

  validateShape(parsed);
  return parsed as GameState;
}

function validateShape(s: any): void {
  const required = ['version', 'rng', 'character', 'world', 'story', 'log', 'settings'];
  for (const key of required) {
    if (!(key in s)) {
      throw new SaveLoadError(`Save is missing required field "${key}".`);
    }
  }
}
