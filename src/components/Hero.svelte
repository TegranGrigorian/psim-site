<script lang="ts">
  import { countUp } from '../lib/actions';
  import type { Bundle } from '../lib/types';
  import { onMount } from 'svelte';
  import { reducedMotion, smoothPath, type Pt } from '../lib/curves';

  let { bundle, cityName }: { bundle: Bundle; cityName: string } = $props();

  const g = (v: string) => bundle.groupMetrics.groups.find((x) => x.dimension === 'group' && x.value === v)!.metrics;
  const stats = $derived.by(() => {
    const hoods = bundle.hoods.features.map((f) => f.properties.metrics.failure_rate.mean);
    return [
      { to: g('shift_worker').failure_rate.mean / g('undergraduate').failure_rate.mean, digits: 1, suffix: '×', text: `Shift workers fail to complete a trip ${(g('shift_worker').failure_rate.mean / g('undergraduate').failure_rate.mean).toFixed(1)}× as often as undergraduates.` },
      { to: g('resident_worker').total_minutes.mean - g('undergraduate').total_minutes.mean, digits: 0, suffix: ' min', text: 'Extra door-to-door time for a resident worker compared with an undergraduate.' },
      { to: Math.max(...hoods) / Math.min(...hoods), digits: 1, suffix: '×', text: 'Spread in failure rate between the best and worst served neighborhoods.' },
    ];
  });

  // Three "routes" through control points that drift on slow sine waves. Stops sit at fixed
  // fractions of each line; buses loop along them. Everything is recomputed per frame.
  const LINES = [
    { cls: 'l1', pts: [[-40, 470], [180, 440], [420, 300], [620, 400], [800, 360], [1040, 215], [1260, 150]], stops: [0.36, 0.6, 0.8], buses: [0, 0.5], speed: 0.035 },
    { cls: 'l2', pts: [[-40, 545], [260, 470], [520, 440], [740, 515], [940, 470], [1260, 390]], stops: [0.45, 0.72], buses: [0.2], speed: 0.03 },
    { cls: 'l3', pts: [[300, 660], [440, 500], [560, 380], [700, 200], [760, -40]], stops: [0.42], buses: [0.6], speed: 0.045 },
  ] as { cls: string; pts: Pt[]; stops: number[]; buses: number[]; speed: number }[];

  let paths = $state(LINES.map((l) => smoothPath(l.pts)));
  let stops = $state<Pt[][]>(LINES.map((l) => l.stops.map(() => [0, 0] as Pt)));
  let buses = $state<{ x: number; y: number; a: number }[][]>(LINES.map((l) => l.buses.map(() => ({ x: -99, y: -99, a: 0 }))));
  let pathEls: SVGPathElement[] = [];
  let svg: SVGSVGElement;

  function frame(t: number) {
    const s = t / 1000;
    paths = LINES.map((l, li) =>
      smoothPath(l.pts.map(([x, y], i) => [x + Math.sin(s * 0.31 + i * 1.7 + li) * 14, y + Math.sin(s * 0.42 + i * 1.3 + li * 2.1) * 26] as Pt)),
    );
    // path elements update after Svelte flushes; read geometry from the previous frame's d (1 frame lag is invisible)
    stops = LINES.map((l, li) => l.stops.map((f) => at(li, f)));
    buses = LINES.map((l, li) =>
      l.buses.map((b) => {
        const f = (b + s * l.speed) % 1;
        const p = at(li, f), q = at(li, Math.min(0.999, f + 0.004));
        return { x: p[0], y: p[1], a: (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI };
      }),
    );
  }
  function at(li: number, f: number): Pt {
    const el = pathEls[li];
    if (!el) return [-99, -99];
    const p = el.getPointAtLength(el.getTotalLength() * f);
    return [p.x, p.y];
  }

  onMount(() => {
    frame(0);
    if (reducedMotion()) return;
    let raf = 0, on = true, t0 = performance.now();
    const loop = (t: number) => { frame(t - t0); if (on) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); }
    });
    io.observe(svg);
    raf = requestAnimationFrame(loop);
    return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); };
  });
</script>

<header class="hero">
  <svg class="lines" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" bind:this={svg}>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      {#each LINES as l, i}
        <path class="l {l.cls}" d={paths[i]} pathLength="1" bind:this={pathEls[i]} />
      {/each}
    </g>
    {#each stops as line, li}
      {#each line as [x, y], si}
        <circle class="stop" cx={x} cy={y} r="7" style="--i:{li * 2 + si}" />
      {/each}
    {/each}
    {#each buses as line, li}
      {#each line as b}
        <g class="bus {LINES[li].cls}" transform="translate({b.x} {b.y}) rotate({b.a})">
          <rect x="-13" y="-6" width="26" height="12" rx="5" />
          <rect class="win" x="2" y="-3" width="7" height="6" rx="1.5" />
        </g>
      {/each}
    {/each}
  </svg>

  <div class="wrap inner">
    <p class="eyebrow">HISTART 394 · {cityName} · transit simulation</p>
    <h1>Who is the<br />bus for?</h1>
    <p class="sub">
      A simulation of {cityName.split(',')[0]}'s buses, run over a thousand synthetic residents, to test whether the
      system serves students better than the people who live here year-round, and whether that line is even the right one.
    </p>
    <div class="cta">
      <a class="btn primary" href="#gap">See the results</a>
      <a class="btn" href="./how.html">How it works</a>
    </div>

    <dl class="stats">
      {#each stats as s, i}
        <div class="stat" style="--i:{i}">
          <dt><span use:countUp={{ to: s.to, digits: s.digits, suffix: s.suffix }}>0</span></dt>
          <dd>{s.text}</dd>
        </div>
      {/each}
    </dl>
  </div>
</header>

<style>
  .hero { position: relative; background: var(--blue); color: #fff; overflow: hidden; padding: clamp(72px, 12vw, 150px) 0 clamp(48px, 7vw, 80px); }
  .lines { position: absolute; top: 0; bottom: 0; right: 0; width: 100%; height: 100%; opacity: 0.9; }
  @media (min-width: 900px) { .lines { left: 38%; width: 62%; } }
  @media (max-width: 899px) { .lines { opacity: 0.35; } }
  .l { stroke-width: 5; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 2.6s var(--ease) forwards; }
  .l1 { stroke: var(--maize); }
  .l2 { stroke: #2f65a7; animation-delay: 0.35s; }
  .l3 { stroke: #d86018; animation-delay: 0.7s; opacity: 0.85; }
  .stop { fill: var(--blue); stroke: #fff; stroke-width: 3; opacity: 0; animation: pop 0.5s var(--ease) forwards; animation-delay: calc(1.2s + var(--i) * 0.18s); transform-box: fill-box; transform-origin: center; }
  .bus { opacity: 0; animation: fade 0.8s ease 2.2s forwards; }
  .bus rect { fill: #fff; stroke: var(--blue); stroke-width: 2.5; }
  .bus.l1 rect:first-child { fill: var(--maize); }
  .bus.l2 rect:first-child { fill: #6f9fd8; }
  .bus.l3 rect:first-child { fill: #f08a4b; }
  .bus .win { fill: var(--blue); stroke: none; }
  @keyframes fade { to { opacity: 1; } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }

  .inner { position: relative; }
  .eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: var(--maize); margin-bottom: 22px; animation: up 0.8s var(--ease) both; }
  h1 { font-size: clamp(52px, 11vw, 132px); letter-spacing: -0.03em; line-height: 0.95; font-weight: 650; animation: up 0.9s var(--ease) 0.08s both; text-shadow: 0 2px 24px rgba(0, 39, 76, 0.65); }
  .sub { max-width: 54ch; font-size: clamp(17px, 2.1vw, 21px); color: #d6e0ec; margin: 28px 0 32px; animation: up 0.9s var(--ease) 0.2s both; text-shadow: 0 1px 14px rgba(0, 39, 76, 0.9); }
  .cta { display: flex; gap: 12px; flex-wrap: wrap; animation: up 0.9s var(--ease) 0.3s both; }
  .btn { text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255, 255, 255, 0.45); background: rgba(0, 39, 76, 0.55); transition: transform 0.25s var(--ease), background 0.25s, border-color 0.25s; }
  .btn:hover { transform: translateY(-2px); border-color: #fff; }
  .btn.primary { background: var(--maize); color: var(--blue); border-color: var(--maize); }
  .btn.primary:hover { background: #ffd84a; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: clamp(48px, 8vw, 88px) 0 0; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius); overflow: hidden; animation: up 0.9s var(--ease) 0.45s both; }
  .stat { background: rgba(0, 39, 76, 0.88); backdrop-filter: blur(6px); padding: 22px 24px 24px; }
  dt { font-family: var(--serif); font-size: clamp(36px, 5vw, 54px); font-weight: 600; color: var(--maize); line-height: 1; margin-bottom: 10px; }
  dd { margin: 0; font-size: 14px; color: #cbd8e6; line-height: 1.45; }
  @keyframes up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

  @media (max-width: 760px) {
    .stats { grid-template-columns: 1fr; }
    .stat { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 14px; padding: 16px 18px; }
    dt { margin: 0; font-size: 34px; }
  }
</style>
