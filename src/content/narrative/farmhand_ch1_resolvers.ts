import type { NarrativeResolver, NarrativeResolverId, GameState } from '../../engine/types';
import { NarrativeNodeId } from '../../engine/types';
import { appendLogs } from '../../engine/log';

// "Maybe later" / "Step away" — exit cleanly.
const henwald_dismiss: NarrativeResolver = (state) => ({ state, next: null });

// "What does he claim the levy's for?" — set the asked-flag, route to response node.
const henwald_levy: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, asked_henwald_levy: true } }
  },
  next: NarrativeNodeId('henwald_levy_response')
});

// "(back to the previous matter)" — silent loop-back to the intro node.
const henwald_return_to_intro: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('henwald_intro'),
  silent: true
});

// "I'll see to him." — sets talked_to_henwald, queues the Tax Rat combat.
const henwald_engage_rat: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: {
      ...state.world,
      flags: {
        ...state.world.flags,
        talked_to_henwald: true,
        __pending_encounter: 'first_tax_rat'
      }
    }
  },
  next: null
});

// Shared exit resolver for back field, old well, and farm-side optional encounters.
const farmhand_ch1_exit: NarrativeResolver = (state) => ({ state, next: null });

const old_well_drop_stone: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_drop_stone')
});

const old_well_look_down: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_look_down')
});

const old_well_return_to_intro: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_intro'),
  silent: true
});

// Mother "sit with" branches based on which spoke-flags are set.
const mother_sit: NarrativeResolver = (state) => {
  // Mark the kitchen as visited (this resolver fires the first time the player engages Mother in dialogue).
  const s: GameState = {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, visited_family_kitchen: true } }
  };
  // Choose a sub-node based on flags:
  // rat_thanks supersedes animal_talk: defeating the rat implies talked_to_henwald.
  if (s.world.flags['defeated:first_tax_rat']) {
    return { state: s, next: NarrativeNodeId('mother_sit_rat_thanks') };
  }
  if (s.world.flags['talked_to_henwald']) {
    return { state: s, next: NarrativeNodeId('mother_sit_animal_talk') };
  }
  return { state: s, next: NarrativeNodeId('mother_sit_cow') };
};

const mother_look_at_note: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, visited_family_kitchen: true } }
  },
  next: NarrativeNodeId('mother_look_at_note')
});

const mother_return_to_root: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mother_kitchen_root'),
  silent: true
});

const mother_post_tornado_speak: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mother_post_tornado_speech')
});

// On exit: push the Fate-push prose (gate has turned, tweed man at the stile),
// unlock the crossroads, and queue an EnterLocation back to family_farm so the
// player ends up at the hub with the new exit available.
const mother_post_tornado_exit: NarrativeResolver = (state) => {
  let s = appendLogs(state, [
    {
      kind: 'system',
      systemLabel: 'ITEM',
      text: "Mother's Note now reads as a list. Check inventory."
    },
    { kind: 'scene-divider', text: '' },
    {
      kind: 'narration',
      text:
        'You step out the kitchen door. The back field is there, where it has always been. But the gate, this morning, ' +
        'faces the wrong way. The cow has positioned herself against the latch with what you must concede is intent. ' +
        'Beyond her, the hedgerow ends at a stile that was, you would have sworn, on the OTHER side of the field. ' +
        'A small board nailed to its post reads, in a careful hand: **"DUSTY CROSSROADS — that way."** ' +
        'The man in tweed who passed earlier is leaning on the stile. He sees you, raises a polite hand, and walks on.'
    }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          unlocked_crossroads: true,
          __pending_enter_location: 'family_farm'
        }
      }
    },
    next: null
  };
};

export const farmhandCh1Resolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  henwald_dismiss,
  henwald_levy,
  henwald_return_to_intro,
  henwald_engage_rat,
  farmhand_ch1_exit,
  old_well_drop_stone,
  old_well_look_down,
  old_well_return_to_intro,
  mother_sit,
  mother_look_at_note,
  mother_return_to_root,
  mother_post_tornado_speak,
  mother_post_tornado_exit
};
