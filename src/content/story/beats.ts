import { BeatId, EncounterId, LocationId, type StoryBeat } from '../../engine/types';

const ordinary_world_established: StoryBeat = {
  id: BeatId('ordinary_world_established'),
  stage: 'act_i',
  preconditions: [
    { kind: 'visited', locationId: LocationId('family_farm') }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'ACT',
        text: 'Act I — The Ordinary World establishes itself, with mild fanfare.'
      }
    }
  ]
};

const hermit_beckons: StoryBeat = {
  id: BeatId('hermit_beckons'),
  stage: 'act_i',
  preconditions: [
    { kind: 'flag', flag: 'defeated:first_tax_rat' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text: 'A figure waves at you from the road. He looks important. Or, at least, he looks at you in a way that strongly implies he ought to be important.'
      }
    },
    { kind: 'set_flag', flag: 'unlocked_crossroads', value: true },
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'PATH',
        text: 'A new exit opens at the family farm: the Dusty Crossroads.'
      }
    }
  ]
};

const call_received: StoryBeat = {
  id: BeatId('call_received'),
  stage: 'act_i',
  preconditions: [
    { kind: 'visited', locationId: LocationId('dusty_crossroads') }
  ],
  onTrigger: [
    { kind: 'trigger_encounter', encounterId: EncounterId('the_call') }
  ],
  transitionAnim: 'actMarker'
};

export const beats: Record<BeatId, StoryBeat> = {
  [ordinary_world_established.id]: ordinary_world_established,
  [hermit_beckons.id]: hermit_beckons,
  [call_received.id]: call_received
};
