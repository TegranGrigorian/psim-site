<script module lang="ts">
  // KaTeX (about 270 KB of code plus its fonts) is fetched only when the first formula nears the screen.
  type Katex = typeof import('katex').default;
  let katexP: Promise<Katex> | undefined;
  const loadKatex = () =>
    (katexP ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([k]) => k.default));
</script>

<script lang="ts">
  import { nearView } from '../lib/actions';

  let { tex, block = false }: { tex: string; block?: boolean } = $props();
  let katex = $state<Katex>();
  const html = $derived(katex ? katex.renderToString(tex, { displayMode: block, throwOnError: false, output: 'html' }) : '');
  const want = () => { loadKatex().then((k) => (katex = k)).catch(() => {}); };
</script>

{#if block}
  <div class="tex" class:wait={!katex} use:nearView={want}>{@html html}</div>
{:else}
  <span class:wait={!katex} use:nearView={want}>{@html html}</span>
{/if}

<style>
  .tex { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
  .tex.wait { min-height: 2.6em; }
  span.wait { display: inline-block; min-width: 4em; min-height: 1em; }
  .tex :global(.katex-display) { margin: 0.4em 0; }
</style>
