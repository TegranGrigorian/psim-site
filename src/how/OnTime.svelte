<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';
  import { normalish, rng } from '../lib/rng';
  import { normalPdf, normInv, oneSampleT, texP } from '../lib/stats';
  import { GROUP_COLOR } from '../lib/format';
  import Tex from './Tex.svelte';
  import { onTime, runs } from './evidence';
  import type { Bundle } from '../lib/types';

  let { bundle }: { bundle: Bundle } = $props();

  const WHO = [
    { key: 'undergraduate', label: 'Undergraduates' },
    { key: 'graduate', label: 'Graduate students' },
  ];
  let who = $state(0);
  let target = $state(95);
  const BUFFER = 5; // minutes needed to walk in and sit down
  const SD_MIN = 7; // spread of arrival times, minutes (illustrative)

  const iv = $derived(onTime(bundle, WHO[who].key));
  const rate = $derived(iv.mean);

  // One semester of class trips: minutes of slack before class (negative = late).
  // Mean chosen so the share with ≥ BUFFER minutes to spare equals the simulated on-time rate.
  const N_TRIPS = 150;
  const trips = $derived.by(() => {
    const mu = BUFFER + SD_MIN * normInv(rate);
    const r = rng(77 + who);
    return Array.from({ length: N_TRIPS }, () => normalish(r, mu, SD_MIN));
  });
  const zone = (slack: number) => (slack >= BUFFER ? 'ok' : slack >= 0 ? 'close' : 'late');
  const share = (z: string) => trips.filter((s) => zone(s) === z).length / N_TRIPS;

  let shown = $state(0);
  let timer = 0, started = false;
  function play() {
    clearInterval(timer);
    if (reducedMotion()) { shown = N_TRIPS; return; }
    shown = 0;
    timer = window.setInterval(() => { shown = Math.min(N_TRIPS, shown + 3); if (shown >= N_TRIPS) clearInterval(timer); }, 30);
  }
  $effect(() => () => clearInterval(timer));
  const pick = (i: number) => { who = i; play(); };

  // beeswarm-ish stacking: x = arrival relative to class start (left = early)
  // charts size to the card so text stays at its natural size
  let cw = $state(620);
  const W = $derived(Math.max(300, cw));
  const H = 170, X0 = -40, X1 = 15;
  const ax = (min: number) => ((Math.max(X0, Math.min(X1, min)) - X0) / (X1 - X0)) * W;
  const dots = $derived.by(() => {
    const bins = new Map<number, number>();
    return trips.map((slack) => {
      const a = -slack;
      const b = Math.round(ax(a) / 9); // 9 px columns
      const k = bins.get(b) ?? 0;
      bins.set(b, k + 1);
      return { x: b * 9, y: H - 8 - k * 8.5, z: zone(slack) };
    });
  });

  // across 100 towns
  const reps = $derived(runs(iv, 300 + who).map((v) => v * 100));
  const test = $derived(oneSampleT(reps, target));
  const verdict = $derived(test.m > target && test.pAbove < 0.05 ? 'reliable' : test.m < target && test.pBelow < 0.05 ? 'unreliable' : 'unclear');
  const D0 = 85, D1 = 100, H2 = 150;
  const W2 = $derived(W);
  const bx = (v: number) => ((v - D0) / (D1 - D0)) * W2;
  const bell = $derived.by(() => {
    const pts: string[] = [];
    const peak = normalPdf(0, 0, test.s);
    for (let i = 0; i <= 160; i++) { const v = D0 + ((D1 - D0) * i) / 160; pts.push(`${bx(v).toFixed(1)},${(H2 - 22 - (normalPdf(v, test.m, test.s) / peak) * (H2 - 50)).toFixed(1)}`); }
    return 'M' + pts.join('L');
  });
</script>

<div class="card ot" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; play(); } }}>
  <div class="meas" bind:clientWidth={cw}></div>
  <div class="seg" role="group" aria-label="Student group">
    {#each WHO as w, i}<button aria-pressed={who === i} onclick={() => pick(i)}>{w.label}</button>{/each}
  </div>

  <h4>1 · A semester of class trips <small>one dot per trip, by when it gets to class</small></h4>
  <svg viewBox="0 -14 {W} {H + 44}" role="img" aria-label="Arrival times relative to class start">
    <rect class="z ok" x={ax(X0)} y="0" width={ax(-BUFFER) - ax(X0)} height={H} />
    <rect class="z close" x={ax(-BUFFER)} y="0" width={ax(0) - ax(-BUFFER)} height={H} />
    <rect class="z late" x={ax(0)} y="0" width={ax(X1) - ax(0)} height={H} />
    <text class="zl ok" x={ax(-22)} y="2">on time</text>
    <text class="zl close" x={ax(-2.5)} y="2">close</text>
    <text class="zl late" x={ax(7.5)} y="2">late</text>
    <line class="start" x1={ax(0)} x2={ax(0)} y1="-6" y2={H} />
    {#each dots.slice(0, shown) as d, i (i)}
      <circle class="d {d.z}" r="3.6" style="--x:{d.x}px; --y:{d.y}px" />
    {/each}
    <line class="axis" x1="0" x2={W} y1={H} y2={H} />
    {#each W < 520 ? [-30, -15, 0] : [-40, -30, -20, -10, 0, 10] as m}
      <text class="tk" x={ax(m)} y={H + 18} text-anchor={m === -40 ? 'start' : 'middle'}>{m === 0 ? 'class starts' : m < 0 ? `${-m} min early` : `${m} min late`}</text>
    {/each}
  </svg>
  <div class="shares">
    <span class="ok"><b>{Math.round(share('ok') * 100)}%</b> on time</span>
    <span class="close"><b>{Math.round(share('close') * 100)}%</b> cutting it close</span>
    <span class="late"><b>{Math.round(share('late') * 100)}%</b> late</span>
  </div>

  <h4>2 · Across 100 simulated towns <small>share of class trips on time in each town</small></h4>
  <label class="thr">Our bar for “reliable”: <b>{target}%</b> on time <input type="range" min="85" max="99" step="1" bind:value={target} /></label>
  <svg viewBox="0 0 {W2} {H2}" role="img" aria-label="Distribution of on-time rates against the reliability bar">
    <rect class="pass" x={bx(target)} y="10" width={W2 - bx(target)} height={H2 - 32} />
    <path class="bell" d={bell} style="stroke:{GROUP_COLOR[WHO[who].key]}" />
    <line class="mu" x1={bx(test.m)} x2={bx(test.m)} y1="18" y2={H2 - 22} />
    <line class="tg" x1={bx(target)} x2={bx(target)} y1="6" y2={H2 - 22} />
    <text class="tgl" x={bx(target) + 6} y="20">bar: {target}%</text>
    <line class="axis" x1="0" x2={W2} y1={H2 - 22} y2={H2 - 22} />
    {#each W < 520 ? [86, 90, 94, 98] : [86, 88, 90, 92, 94, 96, 98] as v}<text class="tk" x={bx(v)} y={H2 - 6}>{v}%</text>{/each}
  </svg>

  <h4>3 · The test</h4>
  <div class="eq">
    <Tex block tex={`H_0:\\ \\mu \\le ${target}\\% \\quad\\text{vs}\\quad H_1:\\ \\mu > ${target}\\% \\qquad t = \\frac{\\bar x - ${target}}{s/\\sqrt{n}} = \\frac{${test.m.toFixed(2)} - ${target}}{${test.s.toFixed(2)}/\\sqrt{${test.n}}} = ${test.t.toFixed(1)}`} />
    <Tex block tex={verdict === 'unreliable' ? `p_{\\text{below}} = ${texP(test.pBelow)}` : `p = ${texP(test.pAbove)}`} />
  </div>
  <div class="verdict {verdict}">
    <b>{verdict === 'reliable' ? 'Yes, they can rely on it' : verdict === 'unreliable' ? 'No, not reliably' : 'Can’t tell yet'}</b>
    <p>
      {#if verdict === 'reliable'}{WHO[who].label} make it on time {test.m.toFixed(1)}% of the time, clearly above the {target}% bar.
      {:else if verdict === 'unreliable'}{WHO[who].label} make it on time {test.m.toFixed(1)}% of the time, clearly below the {target}% bar: about {Math.round(100 / Math.max(1, 100 - test.m))} trips in a row before a late one is expected.
      {:else}{WHO[who].label} average {test.m.toFixed(1)}%, too close to the {target}% bar to call either way.{/if}
    </p>
  </div>
  <p class="note">Uses scheduled times only. Real buses run late; the ride-along fieldwork measures how much that would pull these numbers down.</p>
</div>

<style>
  .ot { padding: clamp(16px, 3vw, 28px); }
  .meas { height: 0; }
  h4 { font-family: var(--serif); font-size: 19px; font-weight: 600; margin: 22px 0 10px; }
  h4 small { font-family: var(--sans); font-size: 13px; color: var(--muted); font-weight: 400; margin-left: 6px; }
  svg { width: 100%; display: block; overflow: visible; }
  .z.ok { fill: rgba(10, 107, 69, 0.07); } .z.close { fill: rgba(224, 168, 0, 0.14); } .z.late { fill: rgba(192, 57, 43, 0.1); }
  .zl { font-size: 11.5px; font-weight: 700; text-anchor: middle; }
  .zl.ok { fill: #0a6b45; } .zl.close { fill: #8a6d00; } .zl.late { fill: #a8321f; }
  .start { stroke: var(--ink); stroke-width: 1.5; stroke-dasharray: 3 3; }
  .d { transform: translate(var(--x), var(--y)); animation: drop 0.45s cubic-bezier(0.5, 0, 0.75, 0) both; }
  .d.ok { fill: #0a6b45; } .d.close { fill: #e0a800; } .d.late { fill: #c0392b; }
  @keyframes drop { from { transform: translate(var(--x), -10px); opacity: 0; } }
  .axis { stroke: var(--ink); stroke-width: 1.2; }
  .tk { font-size: 11px; fill: var(--muted); text-anchor: middle; }
  .shares { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 14px; margin-top: 6px; }
  .shares .ok b { color: #0a6b45; } .shares .close b { color: #8a6d00; } .shares .late b { color: #a8321f; }
  .thr { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 14px; margin-bottom: 6px; }
  .thr input { accent-color: var(--blue); width: 180px; }
  .pass { fill: rgba(10, 107, 69, 0.08); }
  .bell { fill: none; stroke-width: 2.5; }
  .mu { stroke: var(--ink); stroke-width: 1.5; stroke-dasharray: 4 4; }
  .tg { stroke: #0a6b45; stroke-width: 2.5; }
  .tgl { font-size: 12px; font-weight: 700; fill: #0a6b45; }
  .eq { background: #fbfaf6; border: 1px solid var(--rule); border-radius: 10px; padding: 4px 12px; }
  .verdict { margin-top: 14px; border-radius: 12px; padding: 14px 16px; border-left: 4px solid; }
  .verdict b { font-family: var(--serif); font-size: 22px; }
  .verdict p { margin: 4px 0 0; }
  .verdict.reliable { background: #e5f3ea; border-color: #0a6b45; }
  .verdict.unreliable { background: #fbe7e3; border-color: #c0392b; }
  .verdict.unclear { background: var(--maize-soft); border-color: var(--maize); }
  .note { margin-top: 12px; }
</style>
