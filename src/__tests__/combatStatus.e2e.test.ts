import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId, MonsterId, type Monster } from '../engine/types';
import { content } from '../content';

function clearAllAndStart(classId: ReturnType<typeof ClassId>) {
  localStorage.clear();
  for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
  gameStore.beginNewTaleInSlot(0);
  gameStore.forgetAchievements();
  gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId });
}

/**
 * Force the active monster's action rotation to fire apply_status deterministically
 * by mutating its actions list to weight=1.0 apply_status only. Returns a restore
 * function the caller must call after.
 */
function forceApplyStatusOnly(monsterId: ReturnType<typeof MonsterId>): () => void {
  const original = content.monsters[monsterId];
  const applyStatusAction = original.actions.find((a) => a.kind === 'apply_status');
  if (!applyStatusAction) throw new Error(`monster ${monsterId} has no apply_status action`);
  (content.monsters as Record<string, Monster>)[monsterId] = {
    ...original,
    actions: [{ ...applyStatusAction, weight: 1.0 }]
  };
  return () => {
    (content.monsters as Record<string, Monster>)[monsterId] = original;
  };
}

/**
 * Force the active monster to only attack (no apply_status re-application).
 * The apply_status action is preserved with weight 0 so the expiration-flavor lookup
 * in tickPlayerCombatant can still find it. Weight 0 guarantees it is never selected
 * by rng.weighted as long as there is at least one other action with positive weight.
 * Returns a restore function the caller must call after.
 */
function forceAttackOnly(monsterId: ReturnType<typeof MonsterId>): () => void {
  const original = content.monsters[monsterId];
  const attackAction = original.actions.find((a) => a.kind === 'attack') ?? {
    kind: 'attack' as const,
    weight: 1.0,
    flavor: 'The monster swings.'
  };
  // Keep apply_status actions with weight 0 so tickPlayerCombatant can find the expirationFlavor.
  const silencedActions = original.actions
    .filter((a) => a.kind === 'apply_status')
    .map((a) => ({ ...a, weight: 0 }));
  (content.monsters as Record<string, Monster>)[monsterId] = {
    ...original,
    actions: [{ ...attackAction, weight: 1.0 }, ...silencedActions]
  };
  return () => {
    (content.monsters as Record<string, Monster>)[monsterId] = original;
  };
}

describe('combat status e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
    gameStore.switchToSlotPicker();
  });

  it('Tax Rat applies armor_halved; expires after 2 turns; expiration narrated', () => {
    clearAllAndStart(ClassId('reluctant_farmhand'));
    // Walk past Farmhand opener.
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    const restoreApply = forceApplyStatusOnly(MonsterId('officious_tax_rat'));
    try {
      gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
      // Player attacks first; monster's next turn fires apply_status.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat1 = gameStore.state.combat;
      if (combat1?.kind !== 'turn-based') throw new Error('expected combat after first attack');
      const player1 = combat1.combatants.find((c) => c.kind === 'player')!;
      expect(player1.statuses.some((s) => s.kind === 'armor_halved')).toBe(true);
    } finally {
      restoreApply();
    }

    // Switch monster to attack-only so it does NOT re-apply armor_halved, allowing natural expiration.
    const restoreAttack = forceAttackOnly(MonsterId('officious_tax_rat'));
    try {
      // Boost player HP to survive two more rounds, and monster HP to survive two more player attacks,
      // ensuring both the 2→1 tick and 1→0 expiration can fire before combat ends.
      if (gameStore.state.combat?.kind === 'turn-based') {
        gameStore.state = {
          ...gameStore.state,
          character: { ...gameStore.state.character, hp: { ...gameStore.state.character.hp, current: 100 } },
          combat: {
            ...gameStore.state.combat,
            combatants: gameStore.state.combat.combatants.map((c) => {
              if (c.kind === 'player') return { ...c, hp: 100 };
              if (c.kind === 'monster') return { ...c, hp: 50 };
              return c;
            })
          }
        };
      }

      // Player attacks again — status duration ticks from 2 → 1.
      gameStore.dispatch({ kind: 'AttackTarget' });
      // Player attacks again — status duration ticks from 1 → 0 → removed; expiration narrates.
      gameStore.dispatch({ kind: 'AttackTarget' });

      const expirationLog = gameStore.state.log.find((e) => e.text.includes('levy lapses'));
      expect(expirationLog).toBeDefined();
    } finally {
      restoreAttack();
    }
  });

  it('Insolent Pell applies weapon_suspended; expires after 1 turn', () => {
    clearAllAndStart(ClassId('disgraced_knight'));
    // Walk past Knight opener (engagement + commitment triggers Pell encounter).
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restore = forceApplyStatusOnly(MonsterId('insolent_pell'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      // Combat should be active; player attacks.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'weapon_suspended')).toBe(true);

      // Second attack: tickPlayerCombatant fires, weapon_suspended ticks 1→0 → expires and logs
      // expirationFlavor. Monster then re-applies (forceApplyStatusOnly still active) but the tick
      // already fired, so the log entry is present.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('wrench your blade free'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });

  it('Feral Footnote applies next_attack_misses; consumed on next attack', () => {
    clearAllAndStart(ClassId('accidental_wizard'));
    // Walk past Wizard opener: engagement (choose margin 0) + commitment.
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restoreApply = forceApplyStatusOnly(MonsterId('feral_footnote'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'next_attack_misses')).toBe(true);
    } finally {
      restoreApply();
    }

    // Switch monster to attack-only so it does NOT re-apply next_attack_misses after the forced miss.
    const restoreAttack = forceAttackOnly(MonsterId('feral_footnote'));
    try {
      // The one_shot status is consumed on the next attack via expireStatusByKind;
      // the forced-miss log confirms it fired.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const missLog = gameStore.state.log.find((e) => e.text.includes('Your strike goes wide'));
      expect(missLog).toBeDefined();
      // After the forced-miss attack, the next_attack_misses status is consumed
      // and the expirationFlavor fires.
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('vision settles'));
      expect(expirationLog).toBeDefined();
      // Status is gone after firing (monster attacked this turn, not re-applied).
      if (gameStore.state.combat?.kind === 'turn-based') {
        const playerAfter = gameStore.state.combat.combatants.find((c) => c.kind === 'player')!;
        expect(playerAfter.statuses.some((s) => s.kind === 'next_attack_misses')).toBe(false);
      }
    } finally {
      restoreAttack();
    }
  });

  it('Pointed Heckler applies skip_turn; expires after 1 turn', () => {
    clearAllAndStart(ClassId('bard'));
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restore = forceApplyStatusOnly(MonsterId('pointed_heckler'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'skip_turn')).toBe(true);

      // Second attack: tickPlayerCombatant fires, skip_turn ticks 1→0 → expires and logs
      // expirationFlavor. Monster then re-applies (forceApplyStatusOnly still active) but the tick
      // already fired.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('find your line again'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });
});
