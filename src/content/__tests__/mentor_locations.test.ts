import { describe, it, expect } from 'vitest';
import { content } from '../index';
import { LocationId } from '../../engine/types';

const MENTOR_LOCATIONS = [
  { id: 'veterans_chapel', name: "The Veteran's Chapel" },
  { id: 'quiet_tower', name: 'The Quiet Tower' },
  { id: 'laureates_salon', name: "The Laureate's Salon" },
  { id: 'hedgerow_lane', name: 'The Hedgerow Lane' }
];

describe('Mentor locations', () => {
  it.each(MENTOR_LOCATIONS)('$id is registered with chapter_4 and name $name', ({ id, name }) => {
    const loc = content.locations[LocationId(id)];
    expect(loc).toBeDefined();
    expect(loc!.chapter).toBe('chapter_4');
    expect(loc!.name).toBe(name);
  });

  it.each(MENTOR_LOCATIONS)('$id has an exit back to the Old Road', ({ id }) => {
    const loc = content.locations[LocationId(id)];
    expect(loc!.exits.some((e) => e.targetId === 'the_old_road')).toBe(true);
  });
});

describe('Old Road class-specific mentor exits', () => {
  it("has a class-flagged exit to each mentor location", () => {
    const loc = content.locations[LocationId('the_old_road')];
    const mentorExits = loc!.exits.filter((e) =>
      ['veterans_chapel', 'quiet_tower', 'laureates_salon', 'hedgerow_lane'].includes(e.targetId)
    );
    expect(mentorExits).toHaveLength(4);
    // Each must be visibility-gated by the class-specific flag.
    const expected = new Map<string, string>([
      ['veterans_chapel', 'class.disgraced_knight'],
      ['quiet_tower', 'class.accidental_wizard'],
      ['laureates_salon', 'class.bard'],
      ['hedgerow_lane', 'class.reluctant_farmhand']
    ]);
    for (const exit of mentorExits) {
      expect(exit.visibleIfFlag).toBe(expected.get(exit.targetId));
      expect(exit.enabledIfFlag).toBe('old_road_cleared');
    }
  });
});
