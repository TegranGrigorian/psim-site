<script lang="ts">
  import { flip } from 'svelte/animate';
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { DIMENSIONS, GROUP_COLOR, fmt, label, metricMeta } from '../lib/format';
  import type { Bundle } from '../lib/types';

  let { bundle }: { bundle: Bundle } = $props();

  const rows = $derived(
    bundle.groupMetrics.groups
      .filter((g) => g.dimension === app.dim)
      .map((g) => ({ key: g.value, n: g.n_personas_mean, ...g.metrics[app.metric] }))
      .sort((a, b) => b.mean - a.mean),
  );
  const max = $derived(Math.max(...rows.map((r) => r.ci_high)) * 1.06);
  const pos = (v: number) => `${(v / max) * 100}%`;
  const meta = $derived(metricMeta(app.metric));
  const color = (k: string) => (app.dim === 'group' ? GROUP_COLOR[k] : 'var(--blue)');
</script>

<div class="chart card" use:reveal data-reveal>
  <div class="head">
    <div class="seg" role="group" aria-label="Compare by">
      {#each DIMENSIONS as d}
        <button aria-pressed={app.dim === d.key} onclick={() => (app.dim = d.key)}>{d.label}</button>
      {/each}
    </div>
    <p class="note">{meta.label}. Bars show the mean across {bundle.groupMetrics.n_replicates} replicates; whiskers are the 95% interval.</p>
  </div>

  <ul>
    {#each rows as r (r.key)}
      <li animate:flip={{ duration: 450 }}>
        <span class="name">{label(r.key)}</span>
        <div class="track" role="img" aria-label="{label(r.key)}: {fmt(app.metric, r.mean)}, interval {fmt(app.metric, r.ci_low)} to {fmt(app.metric, r.ci_high)}">
          <div class="bar" style="width:{pos(r.mean)}; background:{color(r.key)}"></div>
          <div class="ci" style="left:{pos(r.ci_low)}; width:calc({pos(r.ci_high)} - {pos(r.ci_low)})"></div>
        </div>
        <span class="val">{fmt(app.metric, r.mean)}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .chart { padding: clamp(18px, 3vw, 32px); }
  .head { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; align-items: flex-start; }
  .head .note { margin: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  li { display: grid; grid-template-columns: 170px 1fr 78px; align-items: center; gap: 16px; }
  .name { font-weight: 500; font-size: 15px; }
  .val { font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; font-size: 15px; }
  .track { position: relative; height: 22px; background: repeating-linear-gradient(90deg, #f0ede4 0 1px, transparent 1px 25%); border-radius: 4px; }
  .bar { position: absolute; left: 0; top: 3px; bottom: 3px; border-radius: 3px; transition: width 0.8s var(--ease), background 0.3s; transform-origin: left; }
  :global([data-reveal]:not(.in)) .bar { width: 0 !important; }
  .ci { position: absolute; top: 50%; height: 2px; background: var(--ink); opacity: 0.75; transition: left 0.8s var(--ease), width 0.8s var(--ease); }
  .ci::before, .ci::after { content: ''; position: absolute; top: -5px; width: 2px; height: 12px; background: var(--ink); }
  .ci::before { left: 0; } .ci::after { right: 0; }
  @media (max-width: 640px) {
    li { grid-template-columns: 1fr auto; gap: 4px 12px; }
    .track { grid-column: 1 / -1; grid-row: 2; }
  }
</style>
