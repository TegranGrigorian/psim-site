<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';
  import { normalish, rng } from '../lib/rng';
  import { mean, normalPdf, sd } from '../lib/stats';
  import Tex from './Tex.svelte';

  // Each replicate's answer to "what share of shift workers' trips failed?" (illustrative numbers).
  const N = 100;
  const shift = Array.from({ length: N }, (_, i) => normalish(rng(42 + i), 26.3, 1.4));
  const under = Array.from({ length: N }, (_, i) => normalish(rng(1042 + i), 3.0, 0.55));

  let shown = $state(0);
  let compare = $state(false);
  let curve = $state(true);
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
  const mu = mean(shift), s = sd(shift);
  const muU = mean(under), sU = sd(under);
  // how many of the 100 runs actually fall within 1σ and 2σ (the 68–95 rule, checked)
  const within = (k: number) => shift.filter((v) => Math.abs(v - mu) <= k * s).length;

  /** Normal curve scaled to the histogram: expected balls per bin, times ball height. */
  function bell(m: number, sdv: number) {
    const binW = (dom[1] - dom[0]) / bins;
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const v = dom[0] + ((dom[1] - dom[0]) * i) / 160;
      const y = H - 4 - N * binW * normalPdf(v, m, sdv) * (bw - 0.5);
      pts.push(`${x(v).toFixed(1)},${Math.max(-4, y).toFixed(1)}`);
    }
    return 'M' + pts.join('L');
  }
  const SIGMAS = [-2, -1, 0, 1, 2];
  const ci = $derived([pct(shift, 0.025), pct(shift, 0.975)]);
  const uci = $derived([pct(under, 0.025), pct(under, 0.975)]);
  const ticks = $derived(compare ? [0, 5, 10, 15, 20, 25, 30] : [22, 24, 26, 28, 30]);
</script>

<div class="card rp" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; run(); } }}>
  <div class="top">
    <div class="count"><b>{shown}</b><span>of 100 towns run{shown && shown < N ? ` · seed ${41 + shown} → ${shift[shown - 1].toFixed(1)}%` : ''}</span></div>
    <div class="ctl">
      <label><input type="checkbox" bind:checked={curve} /> Bell curve</label>
      <label><input type="checkbox" bind:checked={compare} /> Add undergraduates</label>
      <button onclick={run}>↻ Run again</button>
    </div>
  </div>

  <svg viewBox="0 -24 {W} {H + 54}" role="img" aria-label="Histogram of 100 replicate results">
    {#if shown === N}
      <rect class="band" x={x(ci[0])} y="0" width={x(ci[1]) - x(ci[0])} height={H} />
      {#each SIGMAS as k}
        <line class="sig" class:mu={k === 0} x1={x(mu + k * s)} x2={x(mu + k * s)} y1="-6" y2={H} />
        <text class="ml" class:dim={k !== 0} x={x(mu + k * s)} y="-12">{k === 0 ? 'μ' : `${k > 0 ? '+' : '−'}${Math.abs(k)}σ`}</text>
      {/each}
      {#if compare}
        <rect class="band u" x={x(uci[0])} y="0" width={Math.max(2, x(uci[1]) - x(uci[0]))} height={H} />
        <text class="ml u" x={x(muU)} y="-12">μ</text>
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
    {#if shown === N && curve}
      <path class="bell" d={bell(mu, s)} />
      {#if compare}<path class="bell u" d={bell(muU, sU)} />{/if}
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

  {#if shown === N}
    <div class="stats">
      <div class="nums">
        <div><span>Average (mean)</span><b><Tex tex={`\\mu = ${mu.toFixed(2)}\\%`} /></b></div>
        <div><span>Spread (standard deviation)</span><b><Tex tex={`\\sigma = ${s.toFixed(2)}\\%`} /></b></div>
        <div><span>Within ±1σ</span><b>{within(1)} of 100 <small>(bell curve predicts 68)</small></b></div>
        <div><span>Within ±2σ</span><b>{within(2)} of 100 <small>(predicts 95)</small></b></div>
      </div>
      <details>
        <summary>The formulas behind these numbers</summary>
        <div class="eqs">
          <p>Average of the 100 runs, and how far a typical run sits from it:</p>
          <Tex block tex={'\\mu = \\frac{1}{n}\\sum_{i=1}^{n} x_i \\qquad \\sigma = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n} \\left(x_i - \\mu\\right)^2}'} />
          <p>The bell curve drawn over the pile (the normal distribution):</p>
          <Tex block tex={'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}'} />
          <p>So the range that holds about 95 of 100 runs is</p>
          <Tex block tex={`\\mu \\pm 1.96\\,\\sigma = ${mu.toFixed(1)}\\% \\pm ${(1.96 * s).toFixed(1)}\\% = [${(mu - 1.96 * s).toFixed(1)}\\%,\\ ${(mu + 1.96 * s).toFixed(1)}\\%]`} />
        </div>
      </details>
    </div>
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
  .sig { stroke: var(--blue); stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.45; animation: fade 0.6s ease; }
  .sig.mu { stroke-width: 2; opacity: 0.9; stroke-dasharray: 4 4; }
  .ml { font-size: 12px; font-weight: 600; text-anchor: middle; fill: var(--blue); animation: fade 0.6s ease; }
  .ml.dim { fill: var(--muted); font-weight: 500; }
  .bell { fill: none; stroke: var(--blue); stroke-width: 2.5; stroke-linejoin: round; stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: trace 1.4s var(--ease) forwards; }
  .bell.u { stroke: #2f65a7; }
  @keyframes trace { to { stroke-dashoffset: 0; } }
  .stats { margin-top: 16px; border-top: 1px solid var(--rule); padding-top: 16px; animation: fade 0.6s; }
  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .nums div { background: #f6f4ec; border-radius: 10px; padding: 10px 12px; }
  .nums span { display: block; font-size: 12px; color: var(--muted); }
  .nums b { font-size: 15px; }
  .nums small { display: block; font-weight: 400; color: var(--muted); font-size: 11.5px; }
  details { margin-top: 12px; }
  summary { cursor: pointer; font-weight: 600; font-size: 14px; color: var(--blue); }
  .eqs { padding-top: 6px; }
  .eqs p { margin: 10px 0 0; font-size: 14px; color: #36424f; }
  @media (max-width: 640px) { .nums { grid-template-columns: repeat(2, 1fr); } }
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
