<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  // Renders a project markdown file copied into public/ref/ by scripts/sync-data.mjs.
  // The files are the repo's own docs (PLAN.md, SCHEMA.md), so their HTML is trusted.
  let { file, fallback }: { file: string; fallback: string } = $props();
  let html = $state('');
  let failed = $state(false);

  onMount(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}ref/${file}`);
      if (!res.ok) throw new Error(String(res.status));
      html = await marked.parse(await res.text());
    } catch {
      failed = true;
    }
  });
</script>

{#if failed}
  <p class="miss">This copy of the site was built without <code>{file}</code>. Read it on <a href={fallback} target="_blank" rel="noopener">GitHub</a>.</p>
{:else if html}
  <div class="md">{@html html}</div>
{:else}
  <p class="miss">Loading {file}…</p>
{/if}

<style>
  .miss { color: var(--muted); }
  .md :global(h1) { font-size: 30px; margin: 0 0 14px; }
  .md :global(h2) { font-size: 23px; margin: 30px 0 10px; }
  .md :global(h3) { font-size: 18px; margin: 22px 0 8px; }
  .md :global(table) { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 10px 0 18px; display: block; overflow-x: auto; }
  .md :global(th), .md :global(td) { border: 1px solid var(--rule); padding: 6px 9px; text-align: left; vertical-align: top; }
  .md :global(th) { background: #f3f0e6; }
  .md :global(pre) { background: #0d1b2a; color: #e6edf5; padding: 12px 14px; border-radius: 10px; overflow-x: auto; font-size: 13px; }
  .md :global(:not(pre) > code) { background: #efece2; padding: 1px 5px; border-radius: 5px; font-size: 0.9em; }
  .md :global(blockquote) { border-left: 3px solid var(--maize); margin: 0; padding: 4px 14px; color: #36424f; }
</style>
