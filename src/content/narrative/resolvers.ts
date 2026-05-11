import type {
  GameState,
  NarrativeResolver, NarrativeResolverId
} from '../../engine/types';
import { NarrativeNodeId } from '../../engine/types';
import { classes } from '../classes';
import { mentorResolvers } from './mentor_resolvers';
import { appendLogs } from '../../engine/log';

const ROOT = NarrativeNodeId('call_root');

const call_accept: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'You accept. The hermit nods, satisfied. Somewhere far off, a destiny adjusts its tie.' },
    { kind: 'scene-divider', text: '' },
    { kind: 'chapter-banner', text: 'Chapter 4' },
    { kind: 'narration', text: 'Meeting with the Mentor.' },
    { kind: 'narration', text: 'The page turns. The script thickens.' },
    { kind: 'scene-divider', text: '' }
  ]);
  return {
    state: {
      ...s,
      story: { ...s.story, stage: 'chapter_4' },
      world: { ...s.world, flags: { ...s.world.flags, accepted_call: true, crossed_threshold: true } }
    },
    next: null
  };
};

// Helper: on first refusal-track action, emit the Ch 3 banner and advance.
function enterChapter3IfNew(s: GameState): GameState {
  if (s.story.stage === 'chapter_3') return s;
  const withBanner = appendLogs(s, [
    { kind: 'scene-divider', text: '' },
    { kind: 'chapter-banner', text: 'Chapter 3' },
    { kind: 'narration', text: 'Refusal of the Call.' },
    { kind: 'scene-divider', text: '' }
  ]);
  return { ...withBanner, story: { ...withBanner.story, stage: 'chapter_3' } };
}

// Refuse escalates each time the player clicks it. Tracked via a counter
// flag (`refusal_count`). After the last line, additional refusals reuse it.
const REFUSE_LINES = [
  "(Fate's greatest skill is the illusion of choice.)",
  "(I understand you're reluctant — but Fate has other plans.)",
  '(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)',
  '(...the narrator says nothing this time. The crossroads grows quiet.)',
  '(The Hermit, with great patience, takes attendance in a small notebook he produces from somewhere.)',
  '(There is, it turns out, all the time in the world. The Hermit smooths a wrinkle in his sleeve. The road waits.)',
  '(Both the narrator and the Hermit are now reading their respective books. Eventually, you will get bored.)'
];

const call_refuse: NarrativeResolver = (state) => {
  const prev = (state.world.flags['refusal_count'] as number | undefined) ?? 0;
  const count = prev + 1;
  const lineIndex = Math.min(count - 1, REFUSE_LINES.length - 1);
  const line = REFUSE_LINES[lineIndex]!;
  let s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: line }
  ]);
  s = enterChapter3IfNew(s);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, refusal_count: count }
      }
    },
    next: ROOT
  };
};

const call_insult: NarrativeResolver = (state) => {
  let s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'That is not, strictly speaking, in the script.' },
    { kind: 'dialogue', speaker: 'Old Hermit', text: '"...My hat is, in point of fact, a perfectly serviceable hat."' }
  ]);
  s = enterChapter3IfNew(s);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, insulted_hermit_hat: true }
      }
    },
    next: ROOT
  };
};

const call_cry: NarrativeResolver = (state) => {
  let s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'There, there.' },
    { kind: 'dialogue', speaker: 'Old Hermit', text: '"(Politely offers a slightly grimy handkerchief.)"' }
  ]);
  s = enterChapter3IfNew(s);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, cried_at_hermit: true }
      }
    },
    next: ROOT
  };
};

const walk_back_home: NarrativeResolver = (state) => {
  const cls = classes[state.character.classId];
  if (!cls) return { state, next: null };
  const walked = (state.world.flags['walked_back_count'] as number | undefined) ?? 0;
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'You turn around. The crossroads recedes. Fate, presumably, sighs.' }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          walked_back_count: walked + 1,
          __pending_enter_location: cls.openingLocationId
        }
      }
    },
    next: null
  };
};

const open_with_pell: NarrativeResolver = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_insolent_pell' }
    }
  };
  return { state: next, next: null };
};

const open_with_footnote: NarrativeResolver = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_feral_footnote' }
    }
  };
  return { state: next, next: null };
};

const open_with_heckler: NarrativeResolver = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_pointed_heckler' }
    }
  };
  return { state: next, next: null };
};

const hermit_dismiss: NarrativeResolver = (state) => ({ state, next: null });

const knight_opener_engage_notice: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, read_dismissal_notice: true } }
  },
  next: NarrativeNodeId('knight_opener_b')
});

const wizard_opener_engage_a: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'a' } }
  },
  next: NarrativeNodeId('wizard_opener_b_a')
});

const wizard_opener_engage_b: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'b' } }
  },
  next: NarrativeNodeId('wizard_opener_b_b')
});

const wizard_opener_engage_c: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'c' } }
  },
  next: NarrativeNodeId('wizard_opener_b_c')
});

const bard_opener_engage_lute: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, tuned_lute: true } }
  },
  next: NarrativeNodeId('bard_opener_b')
});

const farmhand_opener_engage_jar: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, corked_jar: true } }
  },
  next: NarrativeNodeId('farmhand_opener_b')
});

const farmhand_to_back_field: NarrativeResolver = (state) => ({
  state,
  next: null
});

export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  walk_back_home,
  open_with_pell,
  open_with_footnote,
  open_with_heckler,
  hermit_dismiss,
  knight_opener_engage_notice,
  wizard_opener_engage_a,
  wizard_opener_engage_b,
  wizard_opener_engage_c,
  bard_opener_engage_lute,
  farmhand_opener_engage_jar,
  farmhand_to_back_field,
  ...mentorResolvers
};
