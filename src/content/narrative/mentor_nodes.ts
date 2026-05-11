import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

// =====================================================================
// KNIGHT — The Veteran (Chapel)
// =====================================================================

export const mentor_knight_arrival: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_arrival'),
  prose:
    'The Veteran rises from his prayer when you cross the threshold. He turns. He sees you, and his face does ' +
    'the small adjustment of a man who has been expecting a visitor and is pleased the visitor has arrived on time. ' +
    "'You'll be the new one,' he says. He gestures to the bench. 'Sit, if you like. Or stand. I had the bench placed for those who sit.'",
  choices: [
    { label: 'Step forward.', resolve: 'mentor_advance_to_teaching' }
  ]
};

export const mentor_knight_teaching: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_teaching'),
  speaker: 'The Veteran',
  prose:
    "'You're chasing the Sacred MacGuffin. They all are, eventually. Mine looked like a folded notice — " +
    'the dishonor struck through, a correction in another hand. Yours will too, I expect.\' He places a hand on the altar, ' +
    "thoughtfully. 'I came to this chapel after my journey. I sat on that bench. I waited. I am pleased it was you. " +
    "I will teach you the strike I learned when I held it, if you'll have it.'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_knight_accept' },
    {
      label: 'Why are you doing this?',
      resolve: 'mentor_knight_motivation',
      disabledIfFlag: 'asked_motivation_knight',
      disabledTooltip: "You've asked."
    },
    {
      label: 'Your dishonor and rehabilitation rhyme with mine exactly. Beat for beat.',
      resolve: 'mentor_knight_deflect',
      disabledIfFlag: 'probed_seam_knight',
      disabledTooltip: "He's already replied."
    },
    { label: "I'll walk on. I'll learn it my own way.", resolve: 'mentor_knight_refuse' }
  ]
};

export const mentor_knight_motivation: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_motivation'),
  speaker: 'The Veteran',
  prose:
    "'When I was where you are, an older knight sat in this chapel. He told me what I am telling you. " +
    'I came back, and I sat in this chapel, and I waited. Eventually, you came. It is how the order endures.\' ' +
    "He pauses. 'I don't ask whether it is a good order. I sit. I wait. I tell.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_knight_return_to_teaching' }
  ]
};

export const mentor_knight_deflect: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_deflect'),
  speaker: 'The Veteran',
  prose:
    "He inclines his head, considers, smiles. 'Heroes' lives often share a shape. It is comforting, in the telling. " +
    "It was comforting to me, when an older knight told me the same.' He does not look away from your eyes. " +
    "'It is not coincidence. It is not, you may find, exactly correspondence. It is, simply, the shape of the work.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_knight_return_to_teaching' }
  ]
};

// =====================================================================
// WIZARD — The Archmage (Tower)
// =====================================================================

export const mentor_wizard_arrival: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_arrival'),
  prose:
    'The Archmage turns from the window when you reach the top of the tower stair. The staff is in their right hand. ' +
    'The monogram on the staff catches the light: a small mark, two letters intertwined, looking, somehow, like the ' +
    "spine of a book you have seen. 'You are here on time,' the Archmage says. 'The tome agreed with itself when you " +
    'stepped onto the road. I felt it from up here.\'',
  choices: [
    { label: 'Step forward.', resolve: 'mentor_advance_to_teaching' }
  ]
};

export const mentor_wizard_teaching: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_teaching'),
  speaker: 'The Archmage',
  prose:
    "'You're chasing the Sacred MacGuffin. All of us did, when we were where you are. Mine was a slim book. " +
    'Plain spine. The margins agreed with themselves. Yours will look the same, I should think.\' They tap the lectern. ' +
    "'I will teach you the way of revealing the contradiction at the heart of a thing — the move I learned when " +
    "the margins agreed for me. If you'll have it.'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_wizard_accept' },
    {
      label: 'Why are you doing this?',
      resolve: 'mentor_wizard_motivation',
      disabledIfFlag: 'asked_motivation_wizard',
      disabledTooltip: "You've asked."
    },
    {
      label: '"As it is written" — but where is it written?',
      resolve: 'mentor_wizard_deflect',
      disabledIfFlag: 'probed_seam_wizard',
      disabledTooltip: "They've already replied."
    },
    { label: "I'll walk on. I'll learn it my own way.", resolve: 'mentor_wizard_refuse' }
  ]
};

export const mentor_wizard_motivation: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_motivation'),
  speaker: 'The Archmage',
  prose:
    "The Archmage smiles, gently. 'Knowledge wants passing. When the margins agreed, I felt the obligation at once " +
    '— the next student would arrive, and would need the same guidance. No one taught me, exactly. But everyone ' +
    "told me what to expect. I do the same.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_wizard_return_to_teaching' }
  ]
};

export const mentor_wizard_deflect: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_deflect'),
  speaker: 'The Archmage',
  prose:
    "'A fair question.' Their staff taps the floor once. 'It is written in the way that all old phrasings are " +
    'written — somewhere, by someone, long enough ago to have become true. I would not look too hard for the source. ' +
    "Most who do come back with the wrong book.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_wizard_return_to_teaching' }
  ]
};

// =====================================================================
// BARD — The Laureate (Salon)
// =====================================================================

export const mentor_bard_arrival: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_arrival'),
  prose:
    "The Laureate stops humming when you enter. They tilt their head, the gesture of someone hearing a familiar " +
    "phrase in a new voice. 'You're early,' they say. 'Which is to say, on time.' They pat the chaise. 'Sit. " +
    "Or don't. The song goes either way.'",
  choices: [
    { label: 'Step forward.', resolve: 'mentor_advance_to_teaching' }
  ]
};

export const mentor_bard_teaching: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_teaching'),
  speaker: 'The Laureate',
  prose:
    "'You're after the Sacred MacGuffin, of course. We all were, in our times. Mine was a single sheet of music. " +
    'Already composed. It hummed when I held it. Yours, I expect, will hum back.\' They pour, without checking the level. ' +
    "'I will teach you the trick of letting a room reconsider you — the move I learned the first night my work hung in " +
    "the air. If you'll have it.'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_bard_accept' },
    {
      label: 'Why are you doing this?',
      resolve: 'mentor_bard_motivation',
      disabledIfFlag: 'asked_motivation_bard',
      disabledTooltip: "You've asked."
    },
    {
      label: "Your masterpiece's scansion matches something I can't place.",
      resolve: 'mentor_bard_deflect',
      disabledIfFlag: 'probed_seam_bard',
      disabledTooltip: "They've already replied."
    },
    { label: "I'll walk on. I'll learn it my own way.", resolve: 'mentor_bard_refuse' }
  ]
};

export const mentor_bard_motivation: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_motivation'),
  speaker: 'The Laureate',
  prose:
    "The Laureate laughs, charmed by their own answer. 'A first work is borrowed. A second, owed. A third, repaid. " +
    "I am repaying. You will repay, too, when your song is in the air.' Then, more quietly: " +
    "'The salon is always full of glasses I don't remember pouring.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_bard_return_to_teaching' }
  ]
};

export const mentor_bard_deflect: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_deflect'),
  speaker: 'The Laureate',
  prose:
    "'All good songs do.' They tap a fingernail against the glass. The note is exact. 'A scansion is a small machine. " +
    "There are only a few that work. The same machine, in the right hands, produces a thousand songs.' A pause. " +
    "'A few of them are mine.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_bard_return_to_teaching' }
  ]
};

// =====================================================================
// FARMHAND — The Neighbor (Lane)
// =====================================================================

export const mentor_farmhand_arrival: NarrativeNode = {
  id: NarrativeNodeId('mentor_farmhand_arrival'),
  prose:
    'The Neighbor looks up from the stile when you come around the bend. They smile, not surprised. ' +
    "'There you are,' they say. They pat the stone. 'Kettle's warm. Cup's the right size, for once.'",
  choices: [
    { label: 'Step forward.', resolve: 'mentor_advance_to_teaching' }
  ]
};

export const mentor_farmhand_teaching: NarrativeNode = {
  id: NarrativeNodeId('mentor_farmhand_teaching'),
  speaker: 'The Neighbor',
  prose:
    "'You're after the Sacred MacGuffin, whether you'd put it that way or not. Mine looked like a jar of soil. " +
    "Dusty lid. Just-right size for a pocket. Yours will too, I expect.' They pour the tea. " +
    "'I'll teach you the small trick of winking at the universe — the move I learned when I held mine. " +
    "If you'll have it.'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_farmhand_accept' },
    {
      label: 'Why are you doing this?',
      resolve: 'mentor_farmhand_motivation',
      disabledIfFlag: 'asked_motivation_farmhand',
      disabledTooltip: "You've asked."
    },
    {
      label: "You've been waiting since when, exactly?",
      resolve: 'mentor_farmhand_deflect',
      disabledIfFlag: 'probed_seam_farmhand',
      disabledTooltip: "They've already replied."
    },
    { label: "I'll walk on. I'll learn it my own way.", resolve: 'mentor_farmhand_refuse' }
  ]
};

export const mentor_farmhand_motivation: NarrativeNode = {
  id: NarrativeNodeId('mentor_farmhand_motivation'),
  speaker: 'The Neighbor',
  prose:
    "The Neighbor sips. 'I was where you are. I went, I did the thing, I came home. The chickens didn't recognise me, " +
    "but the back field welcomed me. I sit on this stile some mornings. I knew you'd come today.' " +
    "They glance at the bag. 'I don't remember packing this. But it is the right bag.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_farmhand_return_to_teaching' }
  ]
};

export const mentor_farmhand_deflect: NarrativeNode = {
  id: NarrativeNodeId('mentor_farmhand_deflect'),
  speaker: 'The Neighbor',
  prose:
    "'Hard to say.' They scratch their chin. 'This morning, I think. Or yesterday. " +
    "I packed the bag, or someone did. The kettle was on. Some mornings the wait is brief; some, longer. " +
    "This one was the kind where the wait felt right.'",
  choices: [
    { label: '(return to the teaching)', resolve: 'mentor_farmhand_return_to_teaching' }
  ]
};

// =====================================================================
// Post-acceptance flavor (one node per class)
// =====================================================================

export const mentor_knight_post_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_post_root'),
  prose:
    'The Veteran nods when you cross the threshold. He has lit a fresh candle since you last came. The bench is empty.',
  choices: [
    { label: 'Leave.', resolve: 'mentor_leave' }
  ]
};

export const mentor_wizard_post_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_post_root'),
  prose:
    'The Archmage glances from the window. They say nothing, but they smile at some private point above the lectern. The tome is closed.',
  choices: [
    { label: 'Leave.', resolve: 'mentor_leave' }
  ]
};

export const mentor_bard_post_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_post_root'),
  prose:
    'The Laureate raises their glass when you appear in the doorway. They are humming something different now.',
  choices: [
    { label: 'Leave.', resolve: 'mentor_leave' }
  ]
};

export const mentor_farmhand_post_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_farmhand_post_root'),
  prose:
    'The lane is empty. The stile is just a stile. The kettle is cold, and gone.',
  choices: [
    { label: 'Leave.', resolve: 'mentor_leave' }
  ]
};

// =====================================================================
// Return-after-refusal (second chance) — Knight/Wizard/Bard only.
// Single node: softened prose, two choices (Accept, Walk on).
// =====================================================================

export const mentor_knight_return_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_knight_return_root'),
  speaker: 'The Veteran',
  prose:
    "He is, as he said, here. 'I expected you, in time.' The bench is in the same place. " +
    "'Will you have the lesson?'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_knight_accept' },
    { label: 'No, not yet.', resolve: 'mentor_leave' }
  ]
};

export const mentor_wizard_return_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_wizard_return_root'),
  speaker: 'The Archmage',
  prose:
    "The Archmage looks up. 'Back, then.' The tome is open at the same line. " +
    "'Will you have the lesson?'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_wizard_accept' },
    { label: 'No, not yet.', resolve: 'mentor_leave' }
  ]
};

export const mentor_bard_return_root: NarrativeNode = {
  id: NarrativeNodeId('mentor_bard_return_root'),
  speaker: 'The Laureate',
  prose:
    "They are humming the same air. 'There you are.' The chaise is in the same place. " +
    "'Will you have the lesson?'",
  choices: [
    { label: 'Yes — teach me.', resolve: 'mentor_bard_accept' },
    { label: 'No, not yet.', resolve: 'mentor_leave' }
  ]
};
