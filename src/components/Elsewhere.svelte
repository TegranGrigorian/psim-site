<script lang="ts">
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { GROUP_LABEL, metricMeta } from '../lib/format';
  import type { Bundle, CityIndex } from '../lib/types';

  let { a, b, ca, cb }: { a: Bundle; b: Bundle; ca: CityIndex; cb: CityIndex } = $props();

  // Compare gaps, not raw minutes (PLAN.md §8): each group relative to undergraduates in its own city.
  const ratios = (bd: Bundle) => {
    const m = (g: string) => bd.groupMetrics.groups.find((x) => x.dimension === 'group' && x.value === g)!.metrics[app.metric].mean;
    const base = m('undergraduate');
    return Object.keys(GROUP_LABEL).map((g) => ({ g, r: m(g) / base }));
  };
  const ra = $derived(ratios(a));
  const rb = $derived(ratios(b));
  const max = $derived(Math.max(...ra.map((x) => x.r), ...rb.map((x) => x.r)) * 1.06);
  const x = (v: number) => `${((v - 1) / (max - 1)) * 100}%`;
  const meta = $derived(metricMeta(app.metric));
</script>

<div class="card el" use:reveal data-reveal>
  <p class="note">{meta.short}, shown as a multiple of what undergraduates experience in the same city (1.0× = parity).</p>
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
