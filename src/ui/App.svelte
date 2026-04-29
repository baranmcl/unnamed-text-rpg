<script lang="ts">
  import WorldPanel from './WorldPanel.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import Divider from './Divider.svelte';
  import PageTools from './PageTools.svelte';
  import CharacterCreation from './CharacterCreation.svelte';
  import { gameStore } from './store.svelte';
  import { isCharacterCreated } from '../engine/state';

  let created = $derived(isCharacterCreated(gameStore.state));
</script>

{#if created}
  <div class="chronicle">
    <WorldPanel />
    <Divider />
    <CharacterPanel />
  </div>
{:else}
  <CharacterCreation />
{/if}

<PageTools />

<style>
  .chronicle {
    display: grid;
    grid-template-columns:
      calc(var(--world-fraction, 0.62) * 100%)
      1px
      calc((1 - var(--world-fraction, 0.62)) * 100%);
    height: 100vh;
    max-width: var(--max-content-width);
    margin: 0 auto;
  }

  @media (max-width: 900px) {
    .chronicle {
      grid-template-columns: 1fr;
      grid-template-rows: 60vh 1px 40vh;
      height: auto;
      min-height: 100vh;
    }
  }
</style>
