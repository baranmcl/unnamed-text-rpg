import { BeatId, EncounterId, LocationId, type StoryBeat } from '../../engine/types';

const ordinary_world_established: StoryBeat = {
  id: BeatId('ordinary_world_established'),
  stage: 'act_i',
  preconditions: [
    { kind: 'stage', stage: 'act_i' },
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
    { kind: 'stage', stage: 'act_i' },
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

const knight_setting_out: StoryBeat = {
  id: BeatId('knight_setting_out'),
  stage: 'act_i',
  preconditions: [
    { kind: 'stage', stage: 'act_i' },
    { kind: 'flag', flag: 'defeated:grievance_bursar' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text: 'An aide-de-camp leans through the doorway with the haste of a man whose superior has just stepped out for tea, and points, urgently, toward the King’s Road.'
      }
    },
    { kind: 'set_flag', flag: 'unlocked_kings_road', value: true },
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'PATH',
        text: "A new exit opens at the Quartermaster's Yard: the King's Road."
      }
    }
  ]
};

const wizard_setting_out: StoryBeat = {
  id: BeatId('wizard_setting_out'),
  stage: 'act_i',
  preconditions: [
    { kind: 'stage', stage: 'act_i' },
    { kind: 'flag', flag: 'defeated:errant_examiner' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text: 'A junior librarian pokes her head around a slightly-charred shelf and gestures, urgently and apologetically, toward the Cobbled Walk.'
      }
    },
    { kind: 'set_flag', flag: 'unlocked_cobbled_walk', value: true },
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'PATH',
        text: 'A new exit opens at the library: the Cobbled Walk.'
      }
    }
  ]
};

const bard_setting_out: StoryBeat = {
  id: BeatId('bard_setting_out'),
  stage: 'act_i',
  preconditions: [
    { kind: 'stage', stage: 'act_i' },
    { kind: 'flag', flag: 'defeated:critic_with_notes' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text: 'The stage manager appears at the door, a clipboard quivering, and waves you discreetly but firmly toward the back-alley.'
      }
    },
    { kind: 'set_flag', flag: 'unlocked_back_alley', value: true },
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'PATH',
        text: 'A new exit opens at the dressing room: the back-alley.'
      }
    }
  ]
};

export const beats: Record<BeatId, StoryBeat> = {
  [ordinary_world_established.id]: ordinary_world_established,
  [hermit_beckons.id]: hermit_beckons,
  [call_received.id]: call_received,
  [knight_setting_out.id]: knight_setting_out,
  [wizard_setting_out.id]: wizard_setting_out,
  [bard_setting_out.id]: bard_setting_out
};
