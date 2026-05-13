import { BeatId, EncounterId, LocationId, type StoryBeat } from '../../engine/types';

const ordinary_world_established: StoryBeat = {
  id: BeatId('ordinary_world_established'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'visited', locationId: LocationId('family_farm') }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'CHAPTER',
        text: 'Chapter 1 — The Ordinary World establishes itself, with mild fanfare.'
      }
    }
  ]
};

const hermit_beckons: StoryBeat = {
  id: BeatId('hermit_beckons'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'defeated:first_tax_rat' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'You step out the kitchen door. The back field is there, where it has always been. But the gate, this morning, ' +
          'faces the wrong way. The cow has positioned herself against the latch with what you must concede is intent. ' +
          'Beyond her, the hedgerow ends at a stile that was, you would have sworn, on the OTHER side of the field. ' +
          'A small board nailed to its post reads, in a careful hand: **"DUSTY CROSSROADS — that way."** ' +
          'The man in tweed who passed earlier is leaning on the stile. He sees you, raises a polite hand, and walks on.'
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
  stage: 'chapter_1',
  preconditions: [
    { kind: 'visited', locationId: LocationId('dusty_crossroads') }
  ],
  onTrigger: [
    { kind: 'trigger_encounter', encounterId: EncounterId('the_call') }
  ],
  transitionAnim: 'chapterMarker'
};

const knight_setting_out: StoryBeat = {
  id: BeatId('knight_setting_out'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'defeated:grievance_bursar' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'The wind takes the dismissal-notice. It tumbles, settles, and is at your feet, somehow, when you turn. ' +
          "There is fresh ink on it now, in a hand that is not yours and not the Quartermaster's, in the margin: " +
          '**"Crossroads. Sunrise. Bring what is left."** You do not remember anyone passing close enough to write it.'
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
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'defeated:errant_examiner' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'The Tome falls open at a page you have never seen. All three margins, for the first time in your memory ' +
          'of the book, say the same thing: a single line of careful script. ' +
          '**"Dusty Crossroads. Bring the Tome. You will be expected."** ' +
          'The junior librarian, you note, is not in the stacks. The cantrip-bell on her satchel is, however, ' +
          'ringing softly, somewhere out of sight.'
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
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'defeated:critic_with_notes' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'The audience has, you note, left between numbers. On the empty stage is your set-list — but it has been ' +
          'rewritten in a hand you do not know. The last line of every verse now ends: ' +
          '**"Now, on the road. Crossroads first."** A single folded program lies on the front bench. ' +
          'Inside, a venue you do not recognise: the Dusty Crossroads, tonight.'
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
