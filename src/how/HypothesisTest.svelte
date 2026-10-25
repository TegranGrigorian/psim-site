<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';
  import { mean, normalPdf, pairedT, sd, texP } from '../lib/stats';
  import Tex from './Tex.svelte';
  import type { Test } from './evidence';

  let { tests }: { tests: Test[] } = $props();

  const STEPS = ['What fair looks like', 'What we found', 'How far from fair?', 'Could it be luck?', 'Verdict'];
  let sel = $state(0);
  let step = $state(0);
  let auto = 0, started = false;

  const T = $derived(tests[sel]);
  const r = $derived(pairedT(T.a.runs, T.b.runs));
  const muA = $derived(mean(T.a.runs)), sA = $derived(sd(T.a.runs));
  const muB = $derived(mean(T.b.runs)), sB = $derived(sd(T.b.runs));
  const fmt = (v: number) => `${v.toFixed(T.unit === '%' ? 1 : 0)}${T.unit === '%' ? '%' : ' min'}`;
  const significant = $derived(r.p < 0.05);
  const meaningful = $derived(Math.abs(r.dbar) >= T.meaningful);

  // group A's curve starts on top of B ("fair") and slides to where the simulation put it
  const posA = new Tween(0, { duration: 1100, easing: cubicInOut });
  $effect(() => { posA.target = step >= 1 ? muA : muB; });

  function play() {
    clearInterval(auto);
    step = 0;
    if (reducedMotion()) { step = 4; return; }
    auto = window.setInterval(() => { if (step < 4) step++; else clearInterval(auto); }, 3600);
  }
  const go = (s: number) => { clearInterval(auto); step = Math.max(0, Math.min(4, s)); };
  const pick = (i: number) => { sel = i; posA.set(mean(tests[i].b.runs), { duration: 0 }); play(); };
  $effect(() => () => clearInterval(auto));

  // ----- chart geometry -----
  // width follows the container so labels stay legible on phones
  let figW = $state(640);
  const W = $derived(Math.max(340, Math.min(640, figW - 16)));
  const H = 250, PAD = 24;
  // value view (steps 0–1)
  const vdom = $derived([Math.min(muA - 4 * sA, muB - 4 * sB), Math.max(muA + 4 * sA, muB + 4 * sB)]);
  const vx = (v: number) => PAD + ((v - vdom[0]) / (vdom[1] - vdom[0])) * (W - 2 * PAD);
  // each curve drawn to the same peak height so a narrow one doesn't dwarf a wide one
  function curve(m: number, s: number, close = false) {
    const peak = normalPdf(0, 0, s);
    const pts: string[] = [];
    for (let i = 0; i <= 140; i++) {
      const v = vdom[0] + ((vdom[1] - vdom[0]) * i) / 140;
      pts.push(`${vx(v).toFixed(1)},${(H - 30 - (normalPdf(v, m, s) / peak) * (H - 80)).toFixed(1)}`);
    }
    return 'M' + pts.join('L') + (close ? `L${vx(vdom[1])},${H - 30}L${vx(vdom[0])},${H - 30}Z` : '');
  }
  // standard-error view (steps 2–4): the "fair network" null curve is N(0, 1) in SE units
  const LIM = 5;
  const sx = (z: number) => PAD + ((z + LIM) / (2 * LIM)) * (W - 2 * PAD);
  const sy = (z: number) => H - 30 - (normalPdf(z, 0, 1) / normalPdf(0, 0, 1)) * (H - 80);
  const nullPath = $derived.by(() => { const p: string[] = []; for (let i = 0; i <= 160; i++) { const z = -LIM + (2 * LIM * i) / 160; p.push(`${sx(z).toFixed(1)},${sy(z).toFixed(1)}`); } return 'M' + p.join('L'); });
  function tail(from: number, to: number) {
    const p: string[] = [`${sx(from)},${H - 30}`];
    for (let i = 0; i <= 40; i++) { const z = from + ((to - from) * i) / 40; p.push(`${sx(z).toFixed(1)},${sy(z).toFixed(1)}`); }
    return 'M' + p.join('L') + `L${sx(to)},${H - 30}Z`;
  }
  const tAbs = $derived(Math.abs(r.t));
  const onChart = $derived(tAbs < LIM - 0.2);
  const tPos = $derived(Math.sign(r.t) * Math.min(tAbs, LIM - 0.15));
</script>

<div class="card ht" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; posA.set(muB, { duration: 0 }); play(); } }}>
  <div class="seg tabs" role="group" aria-label="Comparison">
    {#each tests as t, i}
      <button aria-pressed={sel === i} onclick={() => pick(i)}><b>{t.hyp}</b> {t.title}</button>
    {/each}
  </div>
  <p class="q">{T.question}</p>

  <ol class="steps">
    {#each STEPS as s, i}
      <li><button class:on={step === i} class:done={step > i} onclick={() => go(i)}><i>{i + 1}</i><span>{s}</span></button></li>
    {/each}
  </ol>

  <div class="fig" bind:clientWidth={figW}>
    <div class="stack">
    {#if step < 2}
      <svg viewBox="0 0 {W} {H}" transition:fade={{ duration: 300 }} role="img" aria-label="Two distributions">
        <line class="ax" x1={PAD} x2={W - PAD} y1={H - 30} y2={H - 30} />
        <path class="area b" d={curve(muB, sB, true)} />
        <path class="area a" d={curve(posA.current, sA, true)} />
        <path class="ln b" d={curve(muB, sB)} />
        <path class="ln a" d={curve(posA.current, sA)} />
        <line class="mline b" x1={vx(muB)} x2={vx(muB)} y1="40" y2={H - 30} />
        <line class="mline a" x1={vx(posA.current)} x2={vx(posA.current)} y1="40" y2={H - 30} />
        {#if step === 1}
          <g transition:fade>
            <line class="gap" x1={vx(muB)} x2={vx(muA)} y1="30" y2="30" marker-end="url(#arr)" />
            <text class="gapt" x={(vx(muB) + vx(muA)) / 2} y="20">gap = {fmt(Math.abs(r.dbar))}</text>
          </g>
        {:else}
          <text class="badge good" x={vx(muB)} y="24" transition:fade>Good result: no gap</text>
        {/if}
        <text class="tick" x={vx(muB)} y={H - 10}>{fmt(muB)}</text>
        {#if step === 1}<text class="tick" x={vx(muA)} y={H - 10}>{fmt(muA)}</text>{/if}
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#00274C" /></marker></defs>
      </svg>
    {:else}
      <svg viewBox="0 0 {W} {H}" transition:fade={{ duration: 300 }} role="img" aria-label="Null distribution in standard errors, with our result marked">
        <line class="ax" x1={PAD} x2={W - PAD} y1={H - 30} y2={H - 30} />
        {#each W < 480 ? [-4, -2, 0, 2, 4] : [-4, -3, -2, -1, 0, 1, 2, 3, 4] as z}
          <text class="tick" x={sx(z)} y={H - 10}>{z === 0 ? 'fair' : `${z > 0 ? '+' : '−'}${Math.abs(z)}`}</text>
        {/each}
        <rect class="zone" x={sx(-1.98)} y="40" width={sx(1.98) - sx(-1.98)} height={H - 70} />
        <text class="zl" x={sx(0)} y="34">95% of “just luck” gaps land here</text>
        <path class="null" d={nullPath} />
        {#if step >= 3 && onChart}
          <path class="tailfill" d={tail(tAbs, LIM)} transition:fade />
          <path class="tailfill" d={tail(-LIM, -tAbs)} transition:fade />
        {/if}
        {#if onChart}
          <line class="obs" x1={sx(tPos)} x2={sx(tPos)} y1="50" y2={H - 30} />
          <circle class="obsd" cx={sx(tPos)} cy={H - 30} r="7" />
          <text class="obst" x={sx(tPos)} y="62">our gap: {r.t.toFixed(1)} SE</text>
        {:else}
          <g class="off" transform="translate({r.t > 0 ? W - PAD : PAD} 0)">
            <path d="M{r.t > 0 ? -34 : 34} 104 L0 104" class="offarrow" marker-end="url(#arr2)" />
            <text x={r.t > 0 ? -6 : 6} y="90" text-anchor={r.t > 0 ? 'end' : 'start'}>our gap: {Math.round(tAbs)} SE away</text>
            <text class="small" x={r.t > 0 ? -6 : 6} y="126" text-anchor={r.t > 0 ? 'end' : 'start'}>off the chart, {Math.round(tAbs / (2 * LIM))}× its width</text>
          </g>
        {/if}
        <text class="axl" x={PAD} y="18">units: standard errors (SE) from fair</text>
        <defs><marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#c0392b" /></marker></defs>
      </svg>
    {/if}
    </div>
    <div class="legend">
      {#if step < 2}
        <span><i class="a"></i>{T.a.label}</span><span><i class="b"></i>{T.b.label}</span><span class="m">each curve: 100 simulated towns</span>
      {:else}
        <span><i class="n"></i>Gaps we’d expect from luck alone if the network were fair</span><span><i class="o"></i>Our measured gap</span>
      {/if}
    </div>
  </div>

  {#key `${sel}-${step}`}
    <div class="explain" in:fade={{ duration: 350 }}>
      {#if step === 0}
        <p><b>A good result for riders</b> is no gap: if the network served everyone equally, {T.a.label.toLowerCase()} and {T.b.label.toLowerCase()} would sit on top of each other. Statisticians call this the <b>null hypothesis</b>: the “nothing is going on” starting assumption we try to knock down.</p>
        <Tex block tex={'H_0:\\ \\mu_{A} - \\mu_{B} = 0 \\qquad\\text{vs}\\qquad H_1:\\ \\mu_{A} - \\mu_{B} \\neq 0'} />
      {:else if step === 1}
        <p>The simulation puts {T.a.label.toLowerCase()} at <b>{fmt(muA)}</b> and {T.b.label.toLowerCase()} at <b>{fmt(muB)}</b>, averaged over 100 towns. In each town we subtract one from the other, then average those gaps:</p>
        <Tex block tex={`\\bar d = \\frac{1}{n}\\sum_{i=1}^{n}\\left(x_{A,i} - x_{B,i}\\right) = ${r.dbar.toFixed(2)}\\ \\text{${T.unit === '%' ? 'points' : 'min'}}`} />
      {:else if step === 2}
        <p>Is that gap big compared with how much it wobbles from town to town? Divide it by its <b>standard error</b>, the typical size of a gap that is just luck. The result, <b>t</b>, says how many standard errors our gap is from “fair.”</p>
        <Tex block tex={`SE = \\frac{s_d}{\\sqrt{n}} = \\frac{${r.sdd.toFixed(2)}}{\\sqrt{${r.n}}} = ${r.se.toFixed(3)} \\qquad t = \\frac{\\bar d}{SE} = \\frac{${r.dbar.toFixed(2)}}{${r.se.toFixed(3)}} = ${r.t.toFixed(1)}`} />
      {:else if step === 3}
        <p>The <b>p-value</b> is the chance of seeing a gap at least this far from fair if the network really were fair. Below 0.05 (1 in 20) is the usual line for “not luck.” {#if !onChart}Here the shaded tail is far too thin to draw.{/if}</p>
        <Tex block tex={`p = P\\left(|T_{${r.df}}| \\ge ${tAbs.toFixed(1)}\\right) ${r.p < 0.001 ? '\\approx' : '='} ${texP(r.p)}`} />
        <p class="plain">{r.p < 1e-6 ? 'In plain terms: effectively impossible by chance.' : r.p < 0.05 ? `In plain terms: about ${Math.max(1, Math.round(r.p * 1000))} in 1,000. Unlikely to be luck.` : `In plain terms: about ${Math.round(r.p * 100)} in 100. Easily luck.`}</p>
      {:else}
        <div class="verdict" class:yes={significant && meaningful} class:meh={significant && !meaningful}>
          <b>{significant && meaningful ? 'Real and large' : significant ? 'Real but small' : 'No detectable difference'}</b>
          <p>
            {#if significant && meaningful}The gap is {Math.round(tAbs)} standard errors from fair (p {r.p < 0.001 ? '< 0.001' : `= ${r.p.toFixed(3)}`}) and bigger than the {T.meaningful} {T.unit === '%' ? 'points' : 'minutes'} we decided in advance would matter to a rider. We reject “fair.” This supports {T.hyp}.
            {:else if significant}The gap is unlikely to be luck, but at {Math.abs(r.dbar).toFixed(1)} {T.unit === '%' ? 'points' : 'minutes'} it is below the {T.meaningful} we said would matter. Statistically real, practically minor.
            {:else}A gap of {Math.abs(r.dbar).toFixed(1)} {T.unit === '%' ? 'points' : 'minutes'} sits well inside what luck produces (p = {r.p.toFixed(2)}). We can’t say these two differ. That isn’t proof they are equal, just no evidence they aren’t.{/if}
          </p>
          <Tex tex={`\\text{effect size: } d = \\bar d / s_d = ${r.cohen.toFixed(1)}`} />
        </div>
      {/if}
    </div>
  {/key}

  <div class="nav">
    <button onclick={() => go(step - 1)} disabled={step === 0}>← Back</button>
    <button class="rp" onclick={play}>↻ Replay</button>
    <button class="next" onclick={() => go(step + 1)} disabled={step === 4}>Next →</button>
  </div>
</div>

<style>
  .ht { padding: clamp(16px, 3vw, 28px); }
  .tabs { margin-bottom: 14px; }
  .tabs button b { color: var(--orange); margin-right: 4px; }
  .tabs button[aria-pressed='true'] b { color: var(--maize); }
  .q { font-family: var(--serif); font-size: clamp(20px, 2.6vw, 26px); margin: 0 0 16px; }
  .steps { list-style: none; padding: 0; margin: 0 0 14px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .steps button { width: 100%; border: 0; background: #f3f0e6; border-radius: 10px; padding: 8px 10px; display: flex; gap: 8px; align-items: center; text-align: left; font-size: 12.5px; color: var(--muted); transition: background 0.3s, color 0.3s; }
  .steps i { font-style: normal; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: #ddd8c8; color: #fff; font-size: 11px; font-weight: 700; flex: none; transition: background 0.3s; }
  .steps button.done i { background: #8aa6c4; }
  .steps button.on { background: var(--blue); color: #fff; }
  .steps button.on i { background: var(--maize); color: var(--blue); }
  .fig { position: relative; background: #fbfaf6; border: 1px solid var(--rule); border-radius: 12px; padding: 8px 8px 10px; }
  svg { width: 100%; display: block; }
  .stack { display: grid; }
  .stack > svg { grid-area: 1 / 1; }
  .ax { stroke: var(--ink); stroke-width: 1.5; }
  .area.a { fill: rgba(216, 96, 24, 0.18); } .area.b { fill: rgba(0, 39, 76, 0.14); }
  .ln { fill: none; stroke-width: 2.5; } .ln.a { stroke: var(--orange); } .ln.b { stroke: var(--blue); }
  .mline { stroke-width: 1.5; stroke-dasharray: 4 4; } .mline.a { stroke: var(--orange); } .mline.b { stroke: var(--blue); }
  .gap { stroke: var(--blue); stroke-width: 2; }
  .gapt { font-size: 13px; font-weight: 700; fill: var(--blue); text-anchor: middle; }
  .badge { font-size: 12.5px; font-weight: 700; text-anchor: middle; }
  .badge.good { fill: #0a6b45; }
  .tick { font-size: 11.5px; fill: var(--muted); text-anchor: middle; }
  .zone { fill: rgba(10, 107, 69, 0.08); }
  .zl { font-size: 11.5px; fill: #0a6b45; text-anchor: middle; font-weight: 600; }
  .null { fill: none; stroke: #0a6b45; stroke-width: 2.5; }
  .tailfill { fill: rgba(192, 57, 43, 0.45); }
  .obs { stroke: #c0392b; stroke-width: 2.5; animation: drop 0.8s var(--ease); }
  .obsd { fill: #c0392b; stroke: #fff; stroke-width: 2; }
  .obst { font-size: 12.5px; font-weight: 700; fill: #c0392b; text-anchor: middle; }
  .off text { font-size: 13px; font-weight: 700; fill: #c0392b; }
  .off text.small { font-size: 11.5px; font-weight: 500; }
  .offarrow { stroke: #c0392b; stroke-width: 3; fill: none; animation: nudge 1.2s ease-in-out infinite; }
  .axl { font-size: 11px; fill: var(--muted); }
  @keyframes drop { from { transform: translateY(-30px); opacity: 0; } }
  @keyframes nudge { 50% { transform: translateX(6px); } }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12.5px; color: var(--muted); padding: 4px 8px 0; }
  .legend i { display: inline-block; width: 14px; height: 4px; border-radius: 2px; margin-right: 6px; vertical-align: 3px; }
  .legend .a { background: var(--orange); } .legend .b { background: var(--blue); } .legend .n { background: #0a6b45; } .legend .o { background: #c0392b; }
  .legend .m { font-style: italic; }
  .explain { margin-top: 16px; min-height: 150px; }
  .explain p { margin: 0 0 8px; font-size: 15.5px; color: #36424f; }
  .plain { font-weight: 600; color: var(--ink) !important; }
  .verdict { border-radius: 12px; padding: 14px 16px; background: #eef1f5; border-left: 4px solid #8aa6c4; }
  .verdict.yes { background: #e5f3ea; border-color: #0a6b45; }
  .verdict.meh { background: var(--maize-soft); border-color: var(--maize); }
  .verdict b { font-family: var(--serif); font-size: 22px; }
  .nav { display: flex; justify-content: space-between; gap: 8px; margin-top: 14px; }
  .nav button { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 8px 16px; font-size: 14px; font-weight: 500; }
  .nav button:disabled { opacity: 0.4; cursor: default; }
  .nav .next { background: var(--blue); color: #fff; border-color: var(--blue); }
  @media (max-width: 700px) {
    .steps { grid-template-columns: repeat(5, 1fr); }
    .steps span { display: none; }
    .steps button { justify-content: center; }
  }
</style>
