<script lang="ts">
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { GROUP_COLOR, GROUP_LABEL, fmt, metricMeta } from '../lib/format';
  import { changes, nobodyWorse, target } from '../lib/redesign';
  import type { Comparison, ScenarioSpec } from '../lib/types';

  let { comparison, spec }: { comparison: Comparison; spec?: ScenarioSpec | null } = $props();

  const rows = $derived(
    comparison.groups
      .filter((g) => g.dimension === 'group' && g.deltas[app.metric])
      .map((g) => ({ key: g.value, ...g.deltas[app.metric]! })),
  );
  const max = $derived(Math.max(1e-9, ...rows.flatMap((r) => [r.before, r.after])) * 1.05);
  const w = (v: number) => `${(v / max) * 100}%`;
  const meta = $derived(metricMeta(app.metric));
  // The headline is the area the redesign was aimed at and whether anyone lost out.
  const what = $derived(changes(spec));
  const aim = $derived(target(spec, comparison));
  const fair = $derived(nobodyWorse(comparison));
</script>

<div class="card re" use:reveal data-reveal>
  {#if what.length}
    <div class="what">
      <b>What changed</b>
      {#each what as line}<p>{line}</p>{/each}
    </div>
  {/if}
  <div class="head">
    {#if aim}
      <div class="big">
        <span class="n">{(aim.before * 100).toFixed(1)}%</span><span class="arrow" aria-hidden="true">→</span><span class="n good">{(aim.after * 100).toFixed(1)}%</span>
        <small>failed trips in {aim.name}, the area it was aimed at</small>
      </div>
      <p class="sum">{aim.sentence} {aim.spread}</p>
    {/if}
    <p class="sum" class:ok={fair.ok} class:bad={!fair.ok}><b>{fair.ok ? '✓' : '!'}</b> {fair.sentence}</p>
  </div>
  <p class="sub">{meta.short} by group, before and after:</p>
  <ul>
    {#each rows as r (r.key)}
      <li>
        <span class="name">{GROUP_LABEL[r.key]}</span>
        <div class="bars">
          <div class="b before" style="width:{w(r.before)}"></div>
          <div class="b after" style="width:{w(r.after)}; background:{GROUP_COLOR[r.key]}"></div>
        </div>
        <span class="d" class:good={r.delta < 0 && Number(fmt(app.metric, Math.abs(r.delta), false)) !== 0}>
          {#if Number(fmt(app.metric, Math.abs(r.delta), false)) === 0}no change{:else}{r.delta > 0 ? '+' : '−'}{fmt(app.metric, Math.abs(r.delta))}{/if}
          <small>CI {fmt(app.metric, r.ci_low, false)} to {fmt(app.metric, r.ci_high, false)}</small>
        </span>
      </li>
    {/each}
  </ul>
  <div class="legend"><span><i class="before"></i> Current network</span><span><i class="after"></i> Redesign v1</span></div>
</div>

<style>
  .re { padding: clamp(18px, 3vw, 32px); }
  .what { background: #f6f4ec; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; }
  .what b { font-family: var(--serif); font-size: 18px; }
  .what p { margin: 4px 0 0; font-size: 15px; color: #36424f; }
  .head { margin-bottom: 22px; }
  .big { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; margin-bottom: 8px; }
  .big .n { font-family: var(--serif); font-size: clamp(34px, 5vw, 48px); font-weight: 600; color: var(--blue); line-height: 1; }
  .big .n.good { color: #0a6b45; }
  .big .arrow { font-size: 26px; color: var(--muted); }
  .big small { flex-basis: 100%; color: var(--muted); font-size: 13px; }
  .sum { font-size: clamp(16px, 1.9vw, 18px); max-width: 64ch; margin: 0 0 10px; }
  .sum.ok b { color: #0a6b45; } .sum.bad b { color: #c0392b; }
  .sub { font-size: 14px; color: var(--muted); margin: 0 0 14px; }
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
