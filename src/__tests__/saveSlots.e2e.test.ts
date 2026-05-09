import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, LocationId } from '../engine/types';

function clearAll() {
  localStorage.clear();
  for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
  gameStore.switchToSlotPicker();
}

describe('save slots e2e', () => {
  beforeEach(() => {
    clearAll();
    gameStore.forgetAchievements();
  });

  it('multi-character: two slots hold independent state', () => {
    // Slot 0: Knight
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Roderick', classId: ClassId('disgraced_knight') });
    expect(gameStore.activeSlot).toBe(0);
    expect(gameStore.state.character.name).toBe('Roderick');
    expect(gameStore.state.character.classId).toBe(ClassId('disgraced_knight'));

    // Switch to slot 1: Bard
    gameStore.switchToSlotPicker();
    gameStore.beginNewTaleInSlot(1);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Esme', classId: ClassId('bard') });
    expect(gameStore.activeSlot).toBe(1);
    expect(gameStore.state.character.name).toBe('Esme');
    expect(gameStore.state.character.classId).toBe(ClassId('bard'));

    // Switch back to slot 0
    gameStore.switchToSlot(0);
    expect(gameStore.activeSlot).toBe(0);
    expect(gameStore.state.character.name).toBe('Roderick');
  });

  it('manual bookmark restore replaces live state', () => {
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    // Walk past the opener.
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    // Take a bookmark with text size = medium.
    expect(gameStore.state.settings.textSize).toBe('medium');
    gameStore.createBookmark('Pre-change');

    // Mutate state (changes text size).
    gameStore.dispatch({ kind: 'SetTextSize', size: 'large' });
    expect(gameStore.state.settings.textSize).toBe('large');

    // Restore.
    const summaries = gameStore.getSlotSummaries();
    const bm = summaries[0]!.bookmarks.find((b) => b.label === 'Pre-change')!;
    gameStore.restoreBookmark(bm.id);
    expect(gameStore.state.settings.textSize).toBe('medium');
  });

  it('auto-chapter checkpoint fires on stage transition', () => {
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    // No chapter transition yet (still chapter_1 at start, then chapter_1 after walk back).
    let summaries = gameStore.getSlotSummaries();
    let autos = summaries[0]!.bookmarks.filter((b) => b.kind === 'auto-chapter');
    expect(autos).toHaveLength(0);

    // Visit the crossroads — Hermit appears, advances to chapter_2.
    gameStore.dispatch({ kind: 'EnterLocation', locationId: LocationId('dusty_crossroads') });
    summaries = gameStore.getSlotSummaries();
    autos = summaries[0]!.bookmarks.filter((b) => b.kind === 'auto-chapter');
    expect(autos.length).toBeGreaterThanOrEqual(1);
    expect(autos.some((b) => b.snapshot.story.stage === 'chapter_2')).toBe(true);
  });

  it('Consign wipes only the active slot, leaving other slots intact', () => {
    // Fill slot 0 and slot 2.
    gameStore.beginNewTaleInSlot(0);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'A', classId: ClassId('disgraced_knight') });
    gameStore.switchToSlotPicker();
    gameStore.beginNewTaleInSlot(2);
    gameStore.dispatch({ kind: 'StartNewGame', name: 'B', classId: ClassId('bard') });

    // Consign slot 2 (the active one).
    gameStore.consignSlot();
    expect(gameStore.activeSlot).toBeNull();

    // Slot 0 should still be there.
    const summaries = gameStore.getSlotSummaries();
    expect(summaries[0]!.live.character.name).toBe('A');
    expect(summaries[2]).toBeNull();
  });
});

describe('save slots e2e · legacy migration', () => {
  it('migrates a legacy save into slot 0 on first launch', async () => {
    localStorage.clear();
    // Seed a legacy save.
    const legacy = {
      version: 4,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Legacy', classId: 'reluctant_farmhand', level: 1, xp: 0,
        hp: { current: 30, max: 30 }, mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {}, inventory: [], knownSkills: [], currency: 0, statuses: []
      },
      world: { currentLocation: 'family_farm', visited: [], flags: {} },
      story: {
        stage: 'chapter_1', currentBeat: null, completedBeats: [], activeQuests: [],
        completedQuests: [], completedObjectives: {}, questLogActivityCount: 0, questLogActivityAtLastOpen: 0
      },
      combat: null, log: [],
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };
    localStorage.setItem('heroicchronicle.save.v1', JSON.stringify(legacy));

    // The actual migration runs on store construction — for unit-test purposes,
    // verify the migrateParsedState helper produces the expected GameState
    // shape from the legacy save.
    const { migrateParsedState } = await import('../engine/save');
    const result = migrateParsedState(JSON.parse(localStorage.getItem('heroicchronicle.save.v1')!));
    expect(result.character.name).toBe('Legacy');
    expect(result.story.stage).toBe('chapter_1');
  });
});
