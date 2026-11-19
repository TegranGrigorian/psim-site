<script lang="ts">
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { GROUP_LABEL, metricMeta } from '../lib/format';
  import { groupMetric } from '../lib/metrics';
  import type { CityIndex, GroupMetrics } from '../lib/types';

  let { a, b, ca, cb }: { a: GroupMetrics; b: GroupMetrics; ca: CityIndex; cb: CityIndex } = $props();

  // Compare gaps, not raw minutes (PLAN.md §8): each group relative to undergraduates in its own city.
  // A group is left out when either city lacks the number or the undergraduate value is zero (no ratio).
  const ratio = (gm: GroupMetrics, g: string) => {
    const v = groupMetric(gm, 'group', g, app.metric)?.mean, u = groupMetric(gm, 'group', 'undergraduate', app.metric)?.mean;
    return v !== undefined && u ? v / u : NaN;
  };
  const rows = $derived(Object.keys(GROUP_LABEL).map((g) => ({ g, r: ratio(a, g), o: ratio(b, g) })).filter((x) => Number.isFinite(x.r) && Number.isFinite(x.o)));
  const ra = $derived(rows.map((x) => ({ g: x.g, r: x.r })));
  const rb = $derived(rows.map((x) => ({ g: x.g, r: x.o })));
  const max = $derived(Math.max(1.5, ...ra.map((x) => x.r), ...rb.map((x) => x.r)) * 1.06);
  const min = $derived(Math.min(1, ...ra.map((x) => x.r), ...rb.map((x) => x.r)));
  const x = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const meta = $derived(metricMeta(app.metric));
</script>

<div class="card el" use:reveal data-reveal>
  <p class="note">{meta.short}, shown as a multiple of what undergraduates experience in the same city (1.0× = parity).</p>
  {#if !rows.length}<p class="note">Not enough data to compare on this measure.</p>{/if}
  <ul>
    {#each ra as row, i}
      {@const other = rb[i].r}
      <li>
        <span class="name">{GROUP_LABEL[row.g]}</span>
        <div class="axis">
          <div class="link" style="left:{x(Math.min(row.r, other))}; width:calc({x(Math.max(row.r, other))} - {x(Math.min(row.r, other))})"></div>
          <div class="dot aa" style="left:{x(row.r)}" title="{ca.display_name}: {row.r.toFixed(2)}×"></div>
          <div class="dot mad" style="left:{x(other)}" title="{cb.display_name}: {other.toFixed(2)}×"></div>
        </div>
        <span class="vals"><b>{row.r.toFixed(1)}×</b> <em>{other.toFixed(1)}×</em></span>
      </li>
    {/each}
  </ul>
  <div class="legend"><span><i class="aa"></i> {ca.display_name}</span><span><i class="mad"></i> {cb.display_name}</span></div>
</div>

<style>
  .el { padding: clamp(18px, 3vw, 32px); }
  ul { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 16px; }
  li { display: grid; grid-template-columns: 170px 1fr 100px; gap: 16px; align-items: center; }
  .name { font-weight: 500; font-size: 15px; }
  .axis { position: relative; height: 22px; margin: 0 9px; border-bottom: 1px solid var(--rule); }
  .link { position: absolute; top: 10px; height: 3px; background: #d8d3c4; border-radius: 2px; transition: left 0.8s var(--ease), width 0.8s var(--ease); }
  .dot { position: absolute; top: 3px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1); transition: left 0.8s var(--ease); }
  .aa, i.aa { background: var(--blue); }
  .mad, i.mad { background: var(--maize); }
  :global([data-reveal]:not(.in)) .dot { left: 0 !important; }
  .vals { text-align: right; font-variant-numeric: tabular-nums; font-size: 14px; }
  .vals em { font-style: normal; color: #9a7a00; margin-left: 6px; font-weight: 600; }
  .legend { display: flex; gap: 22px; flex-wrap: wrap; margin-top: 22px; font-size: 13px; color: var(--muted); }
  .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
  @media (max-width: 640px) { li { grid-template-columns: 1fr auto; gap: 6px 12px; } .axis { grid-column: 1 / -1; grid-row: 2; } }
</style>
