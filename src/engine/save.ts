import { SAVE_VERSION, type GameState } from './types';

export class SaveLoadError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
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
  1: (s: any) => {
    const character = s.character ? { ...s.character, statuses: s.character.statuses ?? [] } : s.character;
    let combat = s.combat;
    if (combat && combat.kind === 'turn-based' && Array.isArray(combat.combatants)) {
      combat = {
        ...combat,
        combatants: combat.combatants.map((c: any) => ({ ...c, statuses: c.statuses ?? [] }))
      };
    }
    return { ...s, version: 2, character, combat };
  },
  2: (s: any) => {
    const story = s.story ? {
      ...s.story,
      completedQuests: s.story.completedQuests ?? [],
      completedObjectives: s.story.completedObjectives ?? {},
      questLogActivityCount: s.story.questLogActivityCount ?? 0,
      questLogActivityAtLastOpen: s.story.questLogActivityAtLastOpen ?? 0,
    } : s.story;
    return { ...s, version: 3, story };
  },
  3: (s: any) => {
    // 6 acts collapsed into 9 chapters; map narrative-faithfully so saves land
    // on the closest chapter. act_iv + act_v both fold into the two-phase Abyss.
    const ACT_TO_CHAPTER: Record<string, string> = {
      act_i: 'chapter_1',
      act_ii: 'chapter_6',
      act_iii: 'chapter_7',
      act_iv: 'chapter_8',
      act_v: 'chapter_8',
      act_vi: 'chapter_9'
    };
    const story = s.story ? {
      ...s.story,
      stage: ACT_TO_CHAPTER[s.story.stage] ?? 'chapter_1'
    } : s.story;
    const log = Array.isArray(s.log)
      ? s.log.map((e: any) => (e?.kind === 'act-banner' ? { ...e, kind: 'chapter-banner' } : e))
      : s.log;
    return { ...s, version: 4, story, log };
  }
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
