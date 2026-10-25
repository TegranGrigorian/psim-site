<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';
  import { normalish, rng } from '../lib/rng';

  // Each replicate's answer to "what share of shift workers' trips failed?" (illustrative numbers).
  const N = 100;
  const shift = Array.from({ length: N }, (_, i) => normalish(rng(42 + i), 26.3, 1.4));
  const under = Array.from({ length: N }, (_, i) => normalish(rng(1042 + i), 3.0, 0.55));

  let shown = $state(0);
  let compare = $state(false);
  let started = false;
  let timer = 0;

  function run() {
    clearInterval(timer);
    if (reducedMotion()) { shown = N; return; }
    shown = 0;
    timer = window.setInterval(() => { shown++; if (shown >= N) clearInterval(timer); }, 45);
  }
  $effect(() => () => clearInterval(timer));

  const W = 600, H = 250;
  const dom = $derived(compare ? [0, 32] : [21, 31.5]);
  const bins = $derived(compare ? 64 : 42);
  const bw = $derived(W / bins);
  const x = (v: number) => ((v - dom[0]) / (dom[1] - dom[0])) * W;
  function stack(vals: number[]) {
    const h = new Map<number, number>();
    return vals.map((v) => {
      const b = Math.max(0, Math.min(bins - 1, Math.floor(((v - dom[0]) / (dom[1] - dom[0])) * bins)));
      const k = h.get(b) ?? 0;
      h.set(b, k + 1);
      return { cx: b * bw + bw / 2, cy: H - 4 - bw / 2 - k * (bw - 0.5) };
    });
  }
  const sDots = $derived(stack(shift));
  const uDots = $derived(stack(under));
  const pct = (vals: number[], p: number) => [...vals].sort((a, b) => a - b)[Math.round((vals.length - 1) * p)];
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const ci = $derived([pct(shift, 0.025), pct(shift, 0.975)]);
  const uci = $derived([pct(under, 0.025), pct(under, 0.975)]);
  const ticks = $derived(compare ? [0, 5, 10, 15, 20, 25, 30] : [22, 24, 26, 28, 30]);
</script>

<div class="card rp" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; run(); } }}>
  <div class="top">
    <div class="count"><b>{shown}</b><span>of 100 towns run{shown && shown < N ? ` · seed ${41 + shown} → ${shift[shown - 1].toFixed(1)}%` : ''}</span></div>
    <div class="ctl">
      <label><input type="checkbox" bind:checked={compare} /> Add undergraduates</label>
      <button onclick={run}>↻ Run again</button>
    </div>
  </div>

  <svg viewBox="0 -24 {W} {H + 54}" role="img" aria-label="Histogram of 100 replicate results">
    {#if shown === N}
      <rect class="band" x={x(ci[0])} y="0" width={x(ci[1]) - x(ci[0])} height={H} />
      <line class="mean" x1={x(mean(shift))} x2={x(mean(shift))} y1="-6" y2={H} />
      <text class="ml" x={x(mean(shift))} y="-12">average {mean(shift).toFixed(1)}%</text>
      {#if compare}
        <rect class="band u" x={x(uci[0])} y="0" width={Math.max(2, x(uci[1]) - x(uci[0]))} height={H} />
        <text class="ml u" x={x(mean(under))} y="-12">{mean(under).toFixed(1)}%</text>
      {/if}
    {/if}
    {#each sDots.slice(0, shown) as d, i (i)}
      <circle class="ball" r={bw / 2 - 0.6} style="--x:{d.cx}px; --y:{d.cy}px" />
    {/each}
    {#if compare}
      {#each uDots.slice(0, shown) as d, i (i)}
        <circle class="ball u" r={bw / 2 - 0.6} style="--x:{d.cx}px; --y:{d.cy}px" />
      {/each}
    {/if}
    <line class="ax" x1="0" x2={W} y1={H} y2={H} />
    {#each ticks as tk}
      <text class="tk" x={x(tk)} y={H + 20}>{tk}%</text>
    {/each}
  </svg>

  <div class="legend">
    <span><i class="k s"></i>Shift workers: share of trips that failed, one ball per town</span>
    {#if compare}<span><i class="k u"></i>Undergraduates</span>{/if}
    <span><i class="k band"></i>Middle 95 of 100 towns: {ci[0].toFixed(1)}% to {ci[1].toFixed(1)}%</span>
  </div>
  {#if compare && shown === N}
    <p class="takeaway">The two piles don’t come close to touching. However the dice fall, shift workers fare worse, so the gap is not luck.</p>
  {/if}
</div>

<style>
  .rp { padding: clamp(16px, 3vw, 26px); }
  .top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  .count { display: flex; align-items: baseline; gap: 8px; }
  .count b { font-family: var(--serif); font-size: 34px; color: var(--blue); font-variant-numeric: tabular-nums; min-width: 2.2ch; }
  .count span { font-size: 13.5px; color: var(--muted); }
  .ctl { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  label { font-size: 14px; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; accent-color: var(--blue); }
  button { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 8px 14px; font-size: 14px; font-weight: 500; }
  svg { width: 100%; display: block; overflow: visible; }
  .ball { fill: var(--orange); transform: translate(var(--x), var(--y)); animation: drop 0.5s cubic-bezier(0.5, 0, 0.75, 0) both; transition: transform 0.6s var(--ease); }
  .ball.u { fill: var(--blue); }
  @keyframes drop { from { transform: translate(var(--x), -20px); opacity: 0.2; } 70% { opacity: 1; } }
  .band { fill: var(--maize); opacity: 0.28; animation: fade 0.6s ease; }
  .band.u { fill: #2F65A7; opacity: 0.2; }
  .mean { stroke: var(--blue); stroke-width: 2; stroke-dasharray: 4 4; }
  .ml { font-size: 12px; font-weight: 600; text-anchor: middle; fill: var(--blue); }
  .ax { stroke: var(--ink); stroke-width: 1.5; }
  .tk { font-size: 12px; text-anchor: middle; fill: var(--muted); }
  @keyframes fade { from { opacity: 0; } }
  .legend { display: grid; gap: 4px; font-size: 13px; color: var(--muted); margin-top: 6px; }
  .k { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
  .k.s { background: var(--orange); }
  .k.u { background: var(--blue); }
  .k.band { background: var(--maize); opacity: 0.6; border-radius: 2px; }
  .takeaway { margin: 14px 0 0; padding: 10px 14px; background: #e9f1fa; border-radius: 10px; font-weight: 500; animation: fade 0.6s; }
</style>
