import { BeatId, EncounterId, ItemId, LocationId, type StoryBeat } from '../../engine/types';

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

const farmhand_tornado_strikes: StoryBeat = {
  id: BeatId('farmhand_tornado_strikes'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'class.reluctant_farmhand' },
    {
      kind: 'flag_count_at_least',
      flags: ['visited_back_field', 'visited_chicken_coop', 'visited_old_well', 'visited_family_kitchen'],
      min: 3
    },
    { kind: 'flag_unset', flag: 'farmhand_tornado_fired' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'scene-divider',
        text: ''
      }
    },
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'Outside, the wind has been holding its breath all morning. It exhales, suddenly, in the wrong direction.\n\n' +
          'Then a column of air the wrong color drops between the silo and the cow\'s paddock. The cow, finally proved correct, runs. ' +
          'The chickens — Henwald loudest among them — make a sound no folk-tale prepared anyone for.\n\n' +
          'The barn, which has stood since your grandfather built it, considers its options and decides to lie down.\n\n' +
          'The farmhouse holds. The kettle does not even fall off the stove.'
      }
    },
    { kind: 'set_flag', flag: 'farmhand_tornado_fired', value: true },
    { kind: 'set_flag', flag: 'farmhand_post_tornado', value: true },
    { kind: 'set_flag', flag: '__pending_enter_location', value: 'family_kitchen' }
  ]
};

// Defeating the Unsigned Direction is the combat path to the crossroads gate.
// (The puzzle path is the signpost resolvers setting crossroads_explored directly.)
const unsigned_direction_defeated: StoryBeat = {
  id: BeatId('unsigned_direction_defeated'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'flag', flag: 'defeated:combat_unsigned_direction' }
  ],
  onTrigger: [
    { kind: 'set_flag', flag: 'crossroads_explored', value: true }
  ]
};

const call_received: StoryBeat = {
  id: BeatId('call_received'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'visited', locationId: LocationId('dusty_crossroads') },
    { kind: 'flag', flag: 'crossroads_explored' }
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

const henwald_awards_eggs: StoryBeat = {
  id: BeatId('henwald_awards_eggs'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'flag', flag: 'defeated:first_tax_rat' },
    { kind: 'flag', flag: 'talked_to_henwald' }
  ],
  onTrigger: [
    { kind: 'grant_item', itemId: ItemId('farm_fresh_egg'), qty: 3 },
    {
      kind: 'log',
      entry: {
        kind: 'loot',
        text: 'You find: 3× a Farm-Fresh Egg.'
      }
    }
  ]
};

export const beats: Record<BeatId, StoryBeat> = {
  [ordinary_world_established.id]: ordinary_world_established,
  [farmhand_tornado_strikes.id]: farmhand_tornado_strikes,
  [unsigned_direction_defeated.id]: unsigned_direction_defeated,
  [call_received.id]: call_received,
  [knight_setting_out.id]: knight_setting_out,
  [wizard_setting_out.id]: wizard_setting_out,
  [bard_setting_out.id]: bard_setting_out,
  [henwald_awards_eggs.id]: henwald_awards_eggs
};
