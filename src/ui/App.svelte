<script lang="ts">
  import WorldPanel from './WorldPanel.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import Divider from './Divider.svelte';
  import PageTools from './PageTools.svelte';
</script>

<div class="chronicle">
  <WorldPanel />
  <Divider />
  <CharacterPanel />
</div>

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

  /* Mobile: panels stack vertically (functional accordion polish in Plan 6) */
  @media (max-width: 900px) {
    .chronicle {
      grid-template-columns: 1fr;
      grid-template-rows: 60vh 1px 40vh;
      height: auto;
      min-height: 100vh;
    }
  }
</style>
