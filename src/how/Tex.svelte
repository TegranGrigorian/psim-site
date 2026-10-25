<script lang="ts">
  import katex from 'katex';
  import 'katex/dist/katex.min.css';

  let { tex, block = false }: { tex: string; block?: boolean } = $props();
  const html = $derived(katex.renderToString(tex, { displayMode: block, throwOnError: false, output: 'html' }));
</script>

{#if block}<div class="tex">{@html html}</div>{:else}<span>{@html html}</span>{/if}

<style>
  .tex { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
  .tex :global(.katex-display) { margin: 0.4em 0; }
</style>
