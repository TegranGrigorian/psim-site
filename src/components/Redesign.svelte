<script lang="ts">
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { GROUP_COLOR, GROUP_LABEL, fmt, metricMeta } from '../lib/format';
  import type { Comparison } from '../lib/types';

  let { comparison }: { comparison: Comparison } = $props();

  const rows = $derived(
    comparison.groups
      .filter((g) => g.dimension === 'group')
      .map((g) => ({ key: g.value, ...g.deltas[app.metric] })),
  );
  const max = $derived(Math.max(...rows.flatMap((r) => [r.before, r.after])) * 1.05);
  const w = (v: number) => `${(v / max) * 100}%`;
  const meta = $derived(metricMeta(app.metric));
  const best = $derived([...rows].sort((a, b) => a.delta / a.before - b.delta / b.before)[0]);
  const worst = $derived([...rows].sort((a, b) => b.delta / b.before - a.delta / a.before)[0]);
</script>

<div class="card re" use:reveal data-reveal>
  <p class="sum">
    {meta.short} for <b>{GROUP_LABEL[best.key].toLowerCase()}</b> goes from {fmt(app.metric, best.before)} to
    <b>{fmt(app.metric, best.after)}</b> ({Math.round((best.delta / best.before) * 100)}%).
    The group that moves least is {GROUP_LABEL[worst.key].toLowerCase()}, at {Math.round((worst.delta / worst.before) * 100)}%.
  </p>
  <ul>
    {#each rows as r (r.key)}
      <li>
        <span class="name">{GROUP_LABEL[r.key]}</span>
        <div class="bars">
          <div class="b before" style="width:{w(r.before)}"></div>
          <div class="b after" style="width:{w(r.after)}; background:{GROUP_COLOR[r.key]}"></div>
        </div>
        <span class="d" class:good={r.delta < 0}>
          {r.delta > 0 ? '+' : '−'}{fmt(app.metric, Math.abs(r.delta))}
          <small>CI {fmt(app.metric, r.ci_low, false)} to {fmt(app.metric, r.ci_high, false)}</small>
        </span>
      </li>
    {/each}
  </ul>
  <div class="legend"><span><i class="before"></i> Current network</span><span><i class="after"></i> Redesign v1</span></div>
</div>

<style>
  .re { padding: clamp(18px, 3vw, 32px); }
  .sum { font-size: clamp(17px, 2vw, 20px); max-width: 60ch; margin-bottom: 28px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
  li { display: grid; grid-template-columns: 170px 1fr 120px; gap: 16px; align-items: center; }
  .name { font-weight: 500; font-size: 15px; }
  .bars { display: grid; gap: 4px; }
  .b { height: 9px; border-radius: 3px; transition: width 0.9s var(--ease); }
  .b.before { background: #d3cfc2; }
  :global([data-reveal]:not(.in)) .b { width: 0 !important; }
  .d { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .d.good { color: #0a6b45; }
  small { display: block; font-weight: 400; color: var(--muted); font-size: 11px; }
  .legend { display: flex; gap: 22px; margin-top: 22px; font-size: 13px; color: var(--muted); }
  .legend i { display: inline-block; width: 18px; height: 8px; border-radius: 3px; margin-right: 8px; }
  .legend .before { background: #d3cfc2; } .legend .after { background: var(--blue); }
  @media (max-width: 640px) { li { grid-template-columns: 1fr auto; gap: 6px 12px; } .bars { grid-column: 1 / -1; grid-row: 2; } }
</style>
