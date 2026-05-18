import type { NarrativeResolver, NarrativeResolverId } from '../../engine/types';
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

export const farmhandCh1Resolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  henwald_dismiss,
  henwald_levy,
  henwald_return_to_intro,
  henwald_engage_rat
};
