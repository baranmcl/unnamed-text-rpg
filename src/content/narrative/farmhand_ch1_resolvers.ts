import type { NarrativeResolver, NarrativeResolverId, GameState } from '../../engine/types';
import { NarrativeNodeId } from '../../engine/types';

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
  mother_return_to_root
};
