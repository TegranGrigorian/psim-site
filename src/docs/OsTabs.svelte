<script lang="ts">
  import type { Snippet } from 'svelte';
  import { os, setOS, type OS } from './os.svelte';

  let { linux, mac, windows }: { linux: Snippet; mac: Snippet; windows: Snippet } = $props();
  const TABS: [OS, string][] = [['linux', 'Linux'], ['mac', 'macOS'], ['windows', 'Windows']];
</script>

<div class="tabs">
  <div class="seg" role="tablist" aria-label="Operating system">
    {#each TABS as [k, label]}
      <button role="tab" aria-selected={os.value === k} onclick={() => setOS(k)}>{label}</button>
    {/each}
  </div>
  <div class="panel" role="tabpanel">
    {#if os.value === 'linux'}{@render linux()}{:else if os.value === 'mac'}{@render mac()}{:else}{@render windows()}{/if}
  </div>
</div>

<style>
  .tabs { margin: 12px 0 20px; }
  .panel { margin-top: 4px; }
</style>
