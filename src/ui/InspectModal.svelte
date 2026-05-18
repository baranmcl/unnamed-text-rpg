<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import type { ItemId, EquipSlot } from '../engine/types';

  type Props = { itemId: ItemId; onClose: () => void };
  let { itemId, onClose }: Props = $props();

  let item = $derived(content.items[itemId]);
  let inInventory = $derived(gameStore.state.character.inventory.some((e) => e.itemId === itemId));
  let equippedSlot = $derived<EquipSlot | undefined>(
    item?.slot && gameStore.state.character.equipment[item.slot] === itemId ? item.slot : undefined
  );

  function equip() {
    gameStore.dispatch({ kind: 'EquipItem', itemId });
    onClose();
  }
  function unequip() {
    if (!equippedSlot) return;
    gameStore.dispatch({ kind: 'UnequipSlot', slot: equippedSlot });
    onClose();
  }
  function use() {
    gameStore.dispatch({ kind: 'UseItem', itemId });
    onClose();
  }
  function drop() {
    gameStore.dispatch({ kind: 'DropItem', itemId });
    onClose();
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  let displayFlavor = $derived.by(() => {
    if (!item) return '';
    if (item.flavorIfFlag && gameStore.state.world.flags[item.flavorIfFlag.flag]) {
      return item.flavorIfFlag.flavor;
    }
    return item.flavor;
  });

  let upgradeBadge = $derived.by(() => {
    if (!item || !item.slot) return null;
    // Don't show flag if this IS the currently equipped item.
    if (gameStore.state.character.equipment[item.slot] === itemId) return null;
    const equippedId = gameStore.state.character.equipment[item.slot];
    if (!equippedId) return { kind: 'new', label: 'Nothing equipped here' };
    const equipped = content.items[equippedId];
    if (!equipped) return null;

    if (item.slot === 'weapon') {
      const newDmg = item.damage ?? 0;
      const oldDmg = equipped.damage ?? 0;
      if (newDmg > oldDmg) return { kind: 'upgrade', label: `Upgrade (+${newDmg - oldDmg} damage)` };
      if (newDmg < oldDmg) return { kind: 'downgrade', label: `Downgrade (−${oldDmg - newDmg} damage)` };
      return { kind: 'sidegrade', label: 'Sidegrade' };
    }
    if (item.slot === 'armor') {
      const newArm = item.armor ?? 0;
      const oldArm = equipped.armor ?? 0;
      if (newArm > oldArm) return { kind: 'upgrade', label: `Upgrade (+${newArm - oldArm} armor)` };
      if (newArm < oldArm) return { kind: 'downgrade', label: `Downgrade (−${oldArm - newArm} armor)` };
      return { kind: 'sidegrade', label: 'Sidegrade' };
    }
    return null; // trinket comparison deferred to a later plan
  });
</script>

{#if item}
  <div class="backdrop" role="presentation" onclick={onBackdrop}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="inspect-title">
      <header><h2 id="inspect-title">{item.name}</h2><button class="close" onclick={onClose} aria-label="Close">×</button></header>
      <p class="flavor">{displayFlavor}</p>
      <div class="meta">
        <span class="kind">{item.kind}</span>
        {#if item.damage}<span class="stat">Damage {item.damage}</span>{/if}
        {#if item.armor}<span class="stat">Armor {item.armor}</span>{/if}
      </div>
      {#if upgradeBadge}
        <p class="upgrade-badge" class:upgrade={upgradeBadge.kind === 'upgrade'} class:downgrade={upgradeBadge.kind === 'downgrade'} class:sidegrade={upgradeBadge.kind === 'sidegrade'} class:new={upgradeBadge.kind === 'new'}>
          {upgradeBadge.label}
        </p>
      {/if}
      <div class="actions">
        {#if item.kind === 'consumable' && inInventory}
          <button onclick={use}>Use</button>
        {/if}
        {#if item.slot && inInventory && !equippedSlot}
          <button onclick={equip}>Equip</button>
        {/if}
        {#if equippedSlot}
          <button onclick={unequip}>Unequip</button>
        {/if}
        {#if inInventory && item.kind !== 'quest'}
          <button class="danger" onclick={drop}>Drop</button>
        {/if}
        {#if item.kind === 'quest' && inInventory}
          <button class="danger" onclick={drop}>Discard</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 80; }
  .dialog { background: var(--paper); padding: 24px 28px; min-width: 360px; max-width: 480px; border: 1px solid var(--hairline); }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  h2 { font-family: var(--serif-display); font-size: 22px; margin: 0; font-weight: normal; }
  .close { font-size: 26px; line-height: 1; color: var(--ink-muted); }
  .close:hover { color: var(--ink); }
  .flavor { font-style: italic; line-height: 1.6; }
  .meta { font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; color: var(--ink-muted); margin: 12px 0; display: flex; gap: 12px; }
  .meta .kind::before { content: '['; } .meta .kind::after { content: ']'; }
  .actions { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
  .actions button { border: 1px solid var(--ink); padding: 6px 14px; font-family: var(--serif-body); font-size: 14px; }
  .actions button:hover { background: var(--ink); color: var(--paper); }
  .actions button.danger { border-color: var(--crimson); color: var(--crimson); }
  .actions button.danger:hover { background: var(--crimson); color: var(--paper); }
  .upgrade-badge {
    font-style: italic;
    font-size: 14px;
    margin: 8px 0 0;
    padding: 4px 8px;
    display: inline-block;
  }
  .upgrade-badge.upgrade { color: var(--moss); border-left: 2px solid var(--moss); }
  .upgrade-badge.downgrade { color: var(--crimson); border-left: 2px solid var(--crimson); }
  .upgrade-badge.sidegrade { color: var(--ink-muted); border-left: 2px solid var(--ink-muted); }
  .upgrade-badge.new { color: var(--gilt); border-left: 2px solid var(--gilt); }
</style>
