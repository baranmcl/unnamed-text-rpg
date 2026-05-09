import type { GameState } from './types';
import { CHAPTER_TITLES } from './types';

export const MAX_SLOTS = 6;
export const MAX_BOOKMARKS_PER_SLOT = 15;

export type BookmarkKind = 'auto-chapter' | 'manual';

export type Bookmark = {
  id: string;
  kind: BookmarkKind;
  label: string;
  createdAt: number;
  snapshot: GameState;
};

export type SlotData = {
  live: GameState;
  bookmarks: Bookmark[];
};

let idCounter = 0;
function generateBookmarkId(kind: BookmarkKind): string {
  // Counter + Date.now() guarantees uniqueness even within the same millisecond.
  idCounter = (idCounter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${kind === 'auto-chapter' ? 'auto' : 'manual'}_${Date.now()}_${idCounter}_${rand}`;
}

export function addAutoCheckpoint(bookmarks: Bookmark[], state: GameState): Bookmark[] {
  // Remove any existing auto-chapter bookmark for this same chapter.
  const filtered = bookmarks.filter(
    (b) => !(b.kind === 'auto-chapter' && b.snapshot.story.stage === state.story.stage)
  );
  const next: Bookmark = {
    id: generateBookmarkId('auto-chapter'),
    kind: 'auto-chapter',
    label: CHAPTER_TITLES[state.story.stage] ?? `Chapter (${state.story.stage})`,
    createdAt: Date.now(),
    snapshot: state
  };
  return enforceCapacity([...filtered, next]);
}

export function addManualBookmark(
  bookmarks: Bookmark[],
  state: GameState,
  label: string
): Bookmark[] {
  const next: Bookmark = {
    id: generateBookmarkId('manual'),
    kind: 'manual',
    label,
    createdAt: Date.now(),
    snapshot: state
  };
  // If we're already at capacity and all existing bookmarks are auto-chapter,
  // drop the new bookmark defensively instead of evicting an auto-chapter.
  if (bookmarks.length >= MAX_BOOKMARKS_PER_SLOT) {
    const hasManualBookmark = bookmarks.some((b) => b.kind === 'manual');
    if (!hasManualBookmark) {
      console.warn('[slots] Bookmark cap reached with all auto-chapter bookmarks; dropping new bookmark');
      return bookmarks;
    }
  }
  return enforceCapacity([...bookmarks, next]);
}

export function deleteBookmarkById(bookmarks: Bookmark[], id: string): Bookmark[] {
  const idx = bookmarks.findIndex((b) => b.id === id);
  if (idx === -1) return bookmarks;
  return [...bookmarks.slice(0, idx), ...bookmarks.slice(idx + 1)];
}

export function findBookmark(bookmarks: Bookmark[], id: string): Bookmark | undefined {
  return bookmarks.find((b) => b.id === id);
}

function enforceCapacity(bookmarks: Bookmark[]): Bookmark[] {
  if (bookmarks.length <= MAX_BOOKMARKS_PER_SLOT) return bookmarks;
  // Find the oldest manual bookmark to evict.
  // Bookmarks are generally appended in chronological order, so the first
  // manual found by index is the oldest.
  const oldestManualIdx = bookmarks.findIndex((b) => b.kind === 'manual');
  // At this point we know at least one manual exists (checked before calling this),
  // so we should always find one. But if somehow we don't, evict the last item.
  if (oldestManualIdx === -1) {
    return bookmarks.slice(0, -1);
  }
  return [...bookmarks.slice(0, oldestManualIdx), ...bookmarks.slice(oldestManualIdx + 1)];
}
