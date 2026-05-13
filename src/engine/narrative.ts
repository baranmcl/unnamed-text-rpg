import { content } from '../content';
import type {
  GameState, LogEntry, NarrativeEncounter, NarrativeNodeId
} from './types';
import { appendLogs } from './log';

const WALKED_BACK_LINES = [
  'You came back, of course.',
  'You came back, again, of course.',
  'The narrator has stopped commenting on your returns. The Hermit has not.',
  'The road, you note, has not gone anywhere. Neither has the Hermit. Neither, in fact, has the dust.'
];

function pushNode(state: GameState, nodeId: NarrativeNodeId): GameState {
  const node = content.narrativeNodes[nodeId];
  if (!node) return state;
  const entries: Omit<LogEntry, 'id'>[] = [];
  if (node.speaker) {
    entries.push({ kind: 'dialogue', speaker: node.speaker, text: node.prose });
  } else {
    entries.push({ kind: 'narration', text: node.prose });
  }
  return appendLogs(state, entries);
}

export function startNarrativeEncounter(state: GameState, encounter: NarrativeEncounter): GameState {
  const node = content.narrativeNodes[encounter.rootNodeId];
  if (!node) return state;
  let s: GameState = {
    ...state,
    combat: {
      kind: 'narrative',
      encounterId: encounter.id,
      currentNodeId: encounter.rootNodeId
    }
  };
  // Set the flag the answer_the_call quest's "Hear the Hermit out" objective listens for.
  if (encounter.id === 'the_call') {
    s = {
      ...s,
      world: { ...s.world, flags: { ...s.world.flags, started_call_encounter: true } }
    };
    // Granular chapter progression: arriving at the Hermit IS Chapter 2.
    if (s.story.stage === 'chapter_1') {
      s = appendLogs(s, [
        { kind: 'scene-divider', text: '' },
        { kind: 'chapter-banner', text: 'Chapter 2' },
        { kind: 'narration', text: 'The Call to Adventure.' },
        { kind: 'scene-divider', text: '' }
      ]);
      s = { ...s, story: { ...s.story, stage: 'chapter_2' } };
    }
    // Walk-back acknowledgement: if the player walked away and is back, the
    // narrator notices.
    const walkedBack = (s.world.flags['walked_back_count'] as number | undefined) ?? 0;
    if (walkedBack > 0) {
      const lineIndex = Math.min(walkedBack - 1, WALKED_BACK_LINES.length - 1);
      s = appendLogs(s, [
        { kind: 'system', systemLabel: 'NARRATOR', text: WALKED_BACK_LINES[lineIndex]! }
      ]);
    }
  }
  return pushNode(s, encounter.rootNodeId);
}

export function chooseNarrativeOption(state: GameState, choiceIndex: number): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  const node = content.narrativeNodes[state.combat.currentNodeId];
  if (!node) return state;
  const choice = node.choices[choiceIndex];
  if (!choice) return state;
  // Defense-in-depth: if the choice is flag-disabled, ignore the dispatch.
  if (choice.disabledIfFlag && state.world.flags[choice.disabledIfFlag]) return state;
  const resolver = content.narrativeResolvers[choice.resolve];
  if (!resolver) return state;
  const currentNodeId = state.combat.currentNodeId;
  const result = resolver(state);
  let s = result.state;
  if (result.next === null) {
    s = { ...s, combat: null };
  } else if (result.next !== currentNodeId) {
    // Move to a new node. Push its prose unless the resolver asked for a silent
    // navigation (e.g. loop-back to a node whose prose was already spoken).
    s = {
      ...s,
      combat: {
        kind: 'narrative',
        encounterId: state.combat.encounterId,
        currentNodeId: result.next
      }
    };
    if (!result.silent) {
      s = pushNode(s, result.next);
    }
  }
  // If result.next === currentNodeId, we self-loop:
  // - Combat state already points to currentNodeId; no update needed.
  // - Don't re-push the node's prose (avoid speaker dialogue repeating).
  // - Resolver-pushed log entries (narrator interjections, hermit reactions) remain.
  return s;
}

export function endNarrativeEncounter(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  return { ...state, combat: null };
}
