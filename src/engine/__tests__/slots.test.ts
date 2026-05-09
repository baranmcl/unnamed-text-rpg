import { describe, it, expect, vi } from 'vitest';
import {
  addAutoCheckpoint,
  addManualBookmark,
  deleteBookmarkById,
  findBookmark,
  MAX_BOOKMARKS_PER_SLOT,
  type Bookmark
} from '../slots';
import { createInitialState } from '../state';
import { ClassId, type GameState } from '../types';
import { reduce } from '../events';

function freshFarmhandState(): GameState {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
  return s;
}

function stateAtChapter(stage: GameState['story']['stage']): GameState {
  const base = freshFarmhandState();
  return { ...base, story: { ...base.story, stage } };
}

describe('addAutoCheckpoint', () => {
  it('adds an auto-chapter bookmark with the chapter title as label', () => {
    const state = stateAtChapter('chapter_2');
    const result = addAutoCheckpoint([], state);
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe('auto-chapter');
    expect(result[0]!.label).toMatch(/Chapter 2/);
    expect(result[0]!.snapshot.story.stage).toBe('chapter_2');
  });

  it('overwrites the previous auto-chapter bookmark for the same chapter', () => {
    const state = stateAtChapter('chapter_2');
    const first = addAutoCheckpoint([], state);
    const second = addAutoCheckpoint(first, state);
    expect(second).toHaveLength(1);
    expect(second[0]!.id).not.toBe(first[0]!.id);
  });

  it('keeps auto-chapter bookmarks for different chapters', () => {
    let bookmarks: Bookmark[] = [];
    bookmarks = addAutoCheckpoint(bookmarks, stateAtChapter('chapter_2'));
    bookmarks = addAutoCheckpoint(bookmarks, stateAtChapter('chapter_3'));
    bookmarks = addAutoCheckpoint(bookmarks, stateAtChapter('chapter_4'));
    expect(bookmarks).toHaveLength(3);
    expect(bookmarks.map((b) => b.snapshot.story.stage)).toEqual(['chapter_2', 'chapter_3', 'chapter_4']);
  });
});

describe('addManualBookmark', () => {
  it('adds a manual bookmark with the user-typed label', () => {
    const state = freshFarmhandState();
    const result = addManualBookmark([], state, 'Before the Tax Rat');
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe('manual');
    expect(result[0]!.label).toBe('Before the Tax Rat');
  });

  it('appends to existing bookmarks without overwriting', () => {
    const state = freshFarmhandState();
    let bookmarks: Bookmark[] = [];
    bookmarks = addManualBookmark(bookmarks, state, 'A');
    bookmarks = addManualBookmark(bookmarks, state, 'B');
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks.map((b) => b.label)).toEqual(['A', 'B']);
  });
});

describe('eviction at MAX_BOOKMARKS_PER_SLOT', () => {
  it('evicts the oldest manual bookmark when the slot is full', () => {
    const state = freshFarmhandState();
    let bookmarks: Bookmark[] = [];
    // Fill with 14 manuals (so total will hit 15 with the 15th add)
    for (let i = 0; i < MAX_BOOKMARKS_PER_SLOT; i++) {
      bookmarks = addManualBookmark(bookmarks, state, `M${i}`);
    }
    expect(bookmarks).toHaveLength(MAX_BOOKMARKS_PER_SLOT);
    // Adding one more triggers eviction of the oldest manual (M0)
    bookmarks = addManualBookmark(bookmarks, state, 'M_new');
    expect(bookmarks).toHaveLength(MAX_BOOKMARKS_PER_SLOT);
    expect(bookmarks.find((b) => b.label === 'M0')).toBeUndefined();
    expect(bookmarks.find((b) => b.label === 'M_new')).toBeDefined();
  });

  it('protects auto-chapter bookmarks from eviction', () => {
    const state = freshFarmhandState();
    let bookmarks: Bookmark[] = [];
    bookmarks = addAutoCheckpoint(bookmarks, stateAtChapter('chapter_2'));
    bookmarks = addAutoCheckpoint(bookmarks, stateAtChapter('chapter_3'));
    // Fill the rest with manuals
    for (let i = 0; i < MAX_BOOKMARKS_PER_SLOT - 2; i++) {
      bookmarks = addManualBookmark(bookmarks, state, `M${i}`);
    }
    expect(bookmarks).toHaveLength(MAX_BOOKMARKS_PER_SLOT);
    // Adding one more should evict M0, not the auto-chapter bookmarks
    bookmarks = addManualBookmark(bookmarks, state, 'M_new');
    expect(bookmarks.filter((b) => b.kind === 'auto-chapter')).toHaveLength(2);
    expect(bookmarks.find((b) => b.label === 'M0')).toBeUndefined();
  });

  it('drops the new bookmark when all slots are auto-chapter (defensive)', () => {
    let bookmarks: Bookmark[] = [];
    // Fill with 15 distinct auto-chapter bookmarks (forced via stage variations)
    for (let i = 1; i <= MAX_BOOKMARKS_PER_SLOT; i++) {
      const stage = (`chapter_${((i - 1) % 9) + 1}`) as GameState['story']['stage'];
      // Force each to a different chapter so dedup doesn't merge them
      const stateAt = stateAtChapter(stage);
      const fakeId = `auto_${i}_${i}`;
      const synthetic: Bookmark = {
        id: fakeId,
        kind: 'auto-chapter',
        label: `Chapter ${i}`,
        createdAt: i,
        snapshot: stateAt
      };
      bookmarks = [...bookmarks, synthetic];
    }
    expect(bookmarks).toHaveLength(MAX_BOOKMARKS_PER_SLOT);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before = bookmarks.length;
    bookmarks = addManualBookmark(bookmarks, freshFarmhandState(), 'M_new');
    expect(bookmarks).toHaveLength(before);
    expect(bookmarks.find((b) => b.label === 'M_new')).toBeUndefined();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});

describe('deleteBookmarkById', () => {
  it('removes the bookmark with the matching id', () => {
    const state = freshFarmhandState();
    let bookmarks: Bookmark[] = addManualBookmark([], state, 'Keep');
    bookmarks = addManualBookmark(bookmarks, state, 'Drop');
    const target = bookmarks.find((b) => b.label === 'Drop')!;
    const after = deleteBookmarkById(bookmarks, target.id);
    expect(after).toHaveLength(1);
    expect(after[0]!.label).toBe('Keep');
  });

  it('returns the same array when id does not match', () => {
    const state = freshFarmhandState();
    const bookmarks = addManualBookmark([], state, 'Only');
    const after = deleteBookmarkById(bookmarks, 'nonexistent_id');
    expect(after).toEqual(bookmarks);
  });
});

describe('findBookmark', () => {
  it('returns the bookmark with the matching id', () => {
    const state = freshFarmhandState();
    const bookmarks = addManualBookmark([], state, 'Findable');
    const found = findBookmark(bookmarks, bookmarks[0]!.id);
    expect(found?.label).toBe('Findable');
  });

  it('returns undefined for a non-matching id', () => {
    const state = freshFarmhandState();
    const bookmarks = addManualBookmark([], state, 'Findable');
    expect(findBookmark(bookmarks, 'nope')).toBeUndefined();
  });
});

describe('bookmark id uniqueness', () => {
  it('generates unique ids even when called in tight succession', () => {
    const state = freshFarmhandState();
    let bookmarks: Bookmark[] = [];
    for (let i = 0; i < 20; i++) {
      bookmarks = addManualBookmark(bookmarks, state, `M${i}`);
    }
    const ids = new Set(bookmarks.map((b) => b.id));
    expect(ids.size).toBe(bookmarks.length);
  });
});
