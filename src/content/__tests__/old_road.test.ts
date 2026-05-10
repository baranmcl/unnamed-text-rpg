import { describe, it, expect } from 'vitest';
import { content } from '../index';
import { LocationId } from '../../engine/types';

describe('Old Road location', () => {
  it('is registered with chapter_4', () => {
    const loc = content.locations[LocationId('the_old_road')];
    expect(loc).toBeDefined();
    expect(loc!.chapter).toBe('chapter_4');
    expect(loc!.name).toBe('The Old Road');
  });

  it('has an exit back to dusty_crossroads', () => {
    const loc = content.locations[LocationId('the_old_road')];
    expect(loc!.exits.some((e) => e.targetId === 'dusty_crossroads')).toBe(true);
  });

  it('has an Onward exit gated by old_road_cleared (enabledIfFlag)', () => {
    const loc = content.locations[LocationId('the_old_road')];
    const onward = loc!.exits.find((e) => e.label.toLowerCase().includes('onward'));
    expect(onward).toBeDefined();
    expect(onward!.enabledIfFlag).toBe('old_road_cleared');
  });
});

describe('the_threshold stub', () => {
  it('is registered with chapter_5', () => {
    const loc = content.locations[LocationId('the_threshold')];
    expect(loc).toBeDefined();
    expect(loc!.chapter).toBe('chapter_5');
  });
});

describe('dusty_crossroads exit label', () => {
  it("relabels 'Cross the threshold' to 'Onto the Old Road'", () => {
    const loc = content.locations[LocationId('dusty_crossroads')];
    expect(loc).toBeDefined();
    const oldRoadExit = loc!.exits.find((e) => e.targetId === 'the_old_road');
    expect(oldRoadExit).toBeDefined();
    expect(oldRoadExit!.label).toBe('Onto the Old Road');
  });
});
