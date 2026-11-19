<script lang="ts">
  import type { Snippet } from 'svelte';

  // A friendly stand-in for a chart whose data does not exist yet (a scenario or city not simulated so far).
  let { title = 'Not available yet', children, compact = false }: { title?: string; children?: Snippet; compact?: boolean } = $props();
</script>

<div class="pending card" class:compact role="note">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 6.5V12l3.5 2.2" /></svg>
  <div>
    <b>{title}</b>
    {#if children}<p>{@render children()}</p>{/if}
  </div>
</div>

<style>
  .pending { display: flex; gap: 14px; align-items: flex-start; padding: clamp(18px, 3vw, 28px); border: 2px dashed var(--rule); background: rgba(255, 255, 255, 0.6); box-shadow: none; }
  .pending.compact { padding: 14px 16px; }
  svg { width: 26px; height: 26px; flex: none; fill: none; stroke: var(--orange); stroke-width: 1.8; stroke-linecap: round; margin-top: 2px; }
  b { font-family: var(--serif); font-size: 20px; font-weight: 600; color: var(--blue); }
  p { margin: 4px 0 0; color: #36424f; font-size: 15px; max-width: 62ch; }
</style>
