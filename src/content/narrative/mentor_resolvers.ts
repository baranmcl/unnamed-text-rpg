import type {
  GameState, LogEntry, NarrativeResolver, NarrativeResolverId
} from '../../engine/types';
import { MAX_LOG_ENTRIES, NarrativeNodeId } from '../../engine/types';
import { classes } from '../classes';

function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

function grantSignatureMove(state: GameState): GameState {
  const cls = classes[state.character.classId];
  if (!cls) return state;
  if (state.character.knownSkills.includes(cls.signatureMove)) return state;
  return {
    ...state,
    character: { ...state.character, knownSkills: [...state.character.knownSkills, cls.signatureMove] },
    world: {
      ...state.world,
      flags: {
        ...state.world.flags,
        ever_learned_signature: true,
        'achievements.signature_unlocked': true
      }
    }
  };
}

// =====================================================================
// "Step forward" — advances from arrival to teaching node.
// Used by all four classes; routes to per-class teaching node.
// =====================================================================

const mentor_advance_to_teaching: NarrativeResolver = (state) => {
  const cls = state.character.classId as string;
  const map: Record<string, string> = {
    disgraced_knight: 'mentor_knight_teaching',
    accidental_wizard: 'mentor_wizard_teaching',
    bard: 'mentor_bard_teaching',
    reluctant_farmhand: 'mentor_farmhand_teaching'
  };
  const nextId = map[cls];
  if (!nextId) return { state, next: null };
  return { state, next: NarrativeNodeId(nextId) };
};

// =====================================================================
// KNIGHT
// =====================================================================

const mentor_knight_accept: NarrativeResolver = (state) => {
  let s = grantSignatureMove(state);
  s = appendLogs(s, [
    { kind: 'narration', text: "The Veteran takes your sword-hand in his. The grip is firm; the lesson lands like a stone settling into a wall." },
    { kind: 'system', systemLabel: 'SKILL', text: 'You learn **Brute Force**.' }
  ]);
  return { state: s, next: null };
};

const mentor_knight_refuse: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'The Veteran nods, unsurprised. He gestures at the bench. "The chapel will be here. So will I."' }
  ]);
  return {
    state: {
      ...s,
      world: { ...s.world, flags: { ...s.world.flags, refused_mentor_knight: true } }
    },
    next: null
  };
};

const mentor_knight_deflect: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, probed_seam_knight: true } } },
  next: NarrativeNodeId('mentor_knight_deflect')
});

const mentor_knight_motivation: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, asked_motivation_knight: true } } },
  next: NarrativeNodeId('mentor_knight_motivation')
});

const mentor_knight_return_to_teaching: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mentor_knight_teaching')
});

// =====================================================================
// WIZARD
// =====================================================================

const mentor_wizard_accept: NarrativeResolver = (state) => {
  let s = grantSignatureMove(state);
  s = appendLogs(s, [
    { kind: 'narration', text: "The Archmage rests two fingers on the lectern. The tome's three margins, for the first time in weeks, agree on something." },
    { kind: 'system', systemLabel: 'SKILL', text: 'You learn **Out-Think It**.' }
  ]);
  return { state: s, next: null };
};

const mentor_wizard_refuse: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'The Archmage inclines their head. "The tower endures. As does its kettle."' }
  ]);
  return {
    state: { ...s, world: { ...s.world, flags: { ...s.world.flags, refused_mentor_wizard: true } } },
    next: null
  };
};

const mentor_wizard_deflect: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, probed_seam_wizard: true } } },
  next: NarrativeNodeId('mentor_wizard_deflect')
});

const mentor_wizard_motivation: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, asked_motivation_wizard: true } } },
  next: NarrativeNodeId('mentor_wizard_motivation')
});

const mentor_wizard_return_to_teaching: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mentor_wizard_teaching')
});

// =====================================================================
// BARD
// =====================================================================

const mentor_bard_accept: NarrativeResolver = (state) => {
  let s = grantSignatureMove(state);
  s = appendLogs(s, [
    { kind: 'narration', text: 'The Laureate hums one bar. You hum it back, slightly different. They smile as if they have heard this exact variation before.' },
    { kind: 'system', systemLabel: 'SKILL', text: 'You learn **Swagger**.' }
  ]);
  return { state: s, next: null };
};

const mentor_bard_refuse: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'The Laureate pours another glass without checking the level. "Come back when the air feels heavier than the song. I\'ll be here."' }
  ]);
  return {
    state: { ...s, world: { ...s.world, flags: { ...s.world.flags, refused_mentor_bard: true } } },
    next: null
  };
};

const mentor_bard_deflect: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, probed_seam_bard: true } } },
  next: NarrativeNodeId('mentor_bard_deflect')
});

const mentor_bard_motivation: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, asked_motivation_bard: true } } },
  next: NarrativeNodeId('mentor_bard_motivation')
});

const mentor_bard_return_to_teaching: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mentor_bard_teaching')
});

// =====================================================================
// FARMHAND
// =====================================================================

const mentor_farmhand_accept: NarrativeResolver = (state) => {
  let s = grantSignatureMove(state);
  s = appendLogs(s, [
    { kind: 'narration', text: 'The Neighbor pours, and you drink. The tea is the right temperature. By the second sip, the spell is somewhere in you, settled.' },
    { kind: 'system', systemLabel: 'SKILL', text: 'You learn **Tempt Fate**.' }
  ]);
  return { state: s, next: null };
};

// Farmhand refuse — comedic exception. Skill is granted anyway.
const mentor_farmhand_refuse: NarrativeResolver = (state) => {
  let s = appendLogs(state, [
    { kind: 'narration', text: "You step around the Neighbor's outstretched hand and walk on. Behind you, the Neighbor calls, mildly: \"Mind the third hedgerow. The rabbit there knows.\"" },
    { kind: 'narration', text: "You don't know why that's useful. Three steps down the lane, you find that, somehow, you do." }
  ]);
  s = grantSignatureMove(s);
  s = appendLogs(s, [
    { kind: 'system', systemLabel: 'SKILL', text: 'You learn **Tempt Fate**.' },
    { kind: 'narration', text: 'The Neighbor, when you glance back, is sipping tea. The kettle is empty.' }
  ]);
  return {
    state: { ...s, world: { ...s.world, flags: { ...s.world.flags, refused_mentor_farmhand: true } } },
    next: null
  };
};

const mentor_farmhand_deflect: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, probed_seam_farmhand: true } } },
  next: NarrativeNodeId('mentor_farmhand_deflect')
});

const mentor_farmhand_motivation: NarrativeResolver = (state) => ({
  state: { ...state, world: { ...state.world, flags: { ...state.world.flags, asked_motivation_farmhand: true } } },
  next: NarrativeNodeId('mentor_farmhand_motivation')
});

const mentor_farmhand_return_to_teaching: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mentor_farmhand_teaching')
});

// =====================================================================
// Export
// =====================================================================

export const mentorResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  mentor_advance_to_teaching,

  mentor_knight_accept,
  mentor_knight_refuse,
  mentor_knight_deflect,
  mentor_knight_motivation,
  mentor_knight_return_to_teaching,

  mentor_wizard_accept,
  mentor_wizard_refuse,
  mentor_wizard_deflect,
  mentor_wizard_motivation,
  mentor_wizard_return_to_teaching,

  mentor_bard_accept,
  mentor_bard_refuse,
  mentor_bard_deflect,
  mentor_bard_motivation,
  mentor_bard_return_to_teaching,

  mentor_farmhand_accept,
  mentor_farmhand_refuse,
  mentor_farmhand_deflect,
  mentor_farmhand_motivation,
  mentor_farmhand_return_to_teaching
};
