<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';

  type Phase = { k: 'walk' | 'wait' | 'ride' | 'fail'; m: number; path?: number; at?: [number, number]; bus?: number; label: string };
  const A: [number, number] = [150, 210], B: [number, number] = [500, 130];
  const MODES: Record<'day' | 'night', { start: number; phases: Phase[]; scale: number }> = {
    day: {
      start: 8 * 60, scale: 46,
      phases: [
        { k: 'walk', m: 6, path: 0, label: 'Walk to the stop' },
        { k: 'wait', m: 7, at: A, bus: 0, label: 'Wait for Bus 4' },
        { k: 'ride', m: 15, path: 1, bus: 0, label: 'Ride Bus 4' },
        { k: 'walk', m: 2, path: 2, label: 'Walk to the transfer stop' },
        { k: 'wait', m: 4, at: B, bus: 1, label: 'Wait for Bus 23' },
        { k: 'ride', m: 8, path: 3, bus: 1, label: 'Ride Bus 23' },
        { k: 'walk', m: 4, path: 4, label: 'Walk to class' },
      ],
    },
    night: {
      start: 23 * 60 + 50, scale: 46,
      phases: [
        { k: 'walk', m: 6, path: 0, label: 'Walk to the stop' },
        { k: 'fail', m: 40, at: A, label: 'Waiting… the last Bus 4 left at 11:40 pm' },
      ],
    },
  };
  const STOPS: [[number, number], string][] = [[A, 'Stop A'], [[470, 110], 'Stop B'], [B, 'Stop C'], [[760, 200], 'Stop D']];
  const COLOR = { walk: '#8393a7', wait: '#E39B2D', ride: '#00274C', fail: '#c0392b' };
  const SPEED = 110; // ms per simulated minute

  let mode = $state<'day' | 'night'>('day');
  let t = $state(0);
  let playing = $state(false);
  let me = $state<[number, number]>([60, 210]);
  let buses = $state<{ p: [number, number]; on: boolean }[]>([{ p: A, on: false }, { p: B, on: false }]);
  let paths: SVGPathElement[] = [];
  let raf = 0, last = 0, started = false;

  const M = $derived(MODES[mode]);
  const total = $derived(M.phases.reduce((a, p) => a + p.m, 0));
  const done = $derived(t >= total);
  const cur = $derived.by(() => {
    let acc = 0;
    for (let i = 0; i < M.phases.length; i++) {
      const p = M.phases[i];
      if (t < acc + p.m || i === M.phases.length - 1) return { i, p, f: Math.min(1, (t - acc) / p.m), into: t - acc };
      acc += p.m;
    }
    return { i: 0, p: M.phases[0], f: 0, into: 0 };
  });

  function pointOn(i: number, f: number): [number, number] {
    const el = paths[i];
    if (!el) return [0, 0];
    const q = el.getPointAtLength(el.getTotalLength() * f);
    return [q.x, q.y];
  }
  function place() {
    const { p, f } = cur;
    if (p.path !== undefined) me = pointOn(p.path, f);
    else if (p.at) me = p.at;
    buses = [0, 1].map((b) => {
      const ph = M.phases.findIndex((x) => x.k === 'ride' && x.bus === b);
      if (ph < 0) return { p: b ? B : A, on: false };
      const waitIdx = ph - 1;
      if (cur.i === ph) return { p: pointOn(M.phases[ph].path!, cur.f), on: true };
      if (cur.i === waitIdx && cur.f > 0.75) return { p: pointOn(M.phases[ph].path!, 0), on: true };
      if (cur.i > ph) return { p: pointOn(M.phases[ph].path!, 1), on: false };
      return { p: pointOn(M.phases[ph].path!, 0), on: false };
    });
  }
  function play() {
    cancelAnimationFrame(raf);
    t = 0; playing = true; last = performance.now();
    if (reducedMotion()) { t = total; playing = false; queueMicrotask(place); return; }
    const tick = (now: number) => {
      t = Math.min(total, t + (now - last) / SPEED);
      last = now;
      place();
      if (t < total) raf = requestAnimationFrame(tick); else playing = false;
    };
    raf = requestAnimationFrame(tick);
  }
  function setMode(m: 'day' | 'night') { mode = m; queueMicrotask(play); }
  $effect(() => () => cancelAnimationFrame(raf));

  const clock = (min: number) => {
    const m = Math.floor(min) % 1440;
    const h = Math.floor(m / 60), mm = m % 60;
    return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  };
  // minutes of each kind so far, for the stacked bar and the summary
  const segs = $derived.by(() => {
    let acc = 0;
    return M.phases.map((p) => { const s = { k: p.k, w: Math.max(0, Math.min(p.m, t - acc)), full: p.m }; acc += p.m; return s; });
  });
  const sum = (k: string) => M.phases.filter((p) => p.k === k).reduce((a, p) => a + p.m, 0);
</script>

<div class="card ts" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; play(); } }}>
  <div class="bar-top">
    <div class="seg" role="group" aria-label="Departure time">
      <button aria-pressed={mode === 'day'} onclick={() => setMode('day')}>Leave 8:00 am</button>
      <button aria-pressed={mode === 'night'} onclick={() => setMode('night')}>Leave 11:50 pm</button>
    </div>
    <button class="replay" onclick={play} disabled={playing}>{playing ? 'Playing…' : '↻ Replay'}</button>
  </div>

  <div class="stage">
    <div class="clock">
      <b>{clock(M.start + t)}</b>
      <span style="color:{COLOR[cur.p.k]}">{cur.p.label}{cur.p.k !== 'walk' && cur.p.k !== 'ride' && !done ? ` · ${Math.floor(cur.into)} min` : ''}</span>
    </div>
    <svg viewBox="0 0 900 270" role="img" aria-label="Animated trip from home to class">
      <g class="city" aria-hidden="true">
        <path d="M0 210 H900 M0 110 H900 M300 0 V270 M640 0 V270" />
        {#each [[200, 30], [360, 150], [560, 20], [700, 230], [40, 60], [800, 40]] as [x, y]}<rect {x} {y} width="70" height="42" rx="6" />{/each}
      </g>
      <path class="route r4" bind:this={paths[1]} d="M150 210 C 250 210, 300 110, 420 110 L 470 110" />
      <path class="route r23" bind:this={paths[3]} d="M500 130 C 600 130, 640 200, 760 200" />
      <path class="walk" bind:this={paths[0]} d="M70 210 L150 210" />
      <path class="walk" bind:this={paths[2]} d="M470 110 L500 130" />
      <path class="walk" bind:this={paths[4]} d="M760 200 L830 200" />
      <text class="rl" x="300" y="150">Bus 4</text>
      <text class="rl" x="640" y="150">Bus 23</text>

      <g transform="translate(40 185)"><path class="house" d="M0 20 L20 2 L40 20 V44 H0 Z" /><text x="20" y="62" class="lbl">Home</text></g>
      <g transform="translate(830 170)"><path class="school" d="M0 44 V14 L22 0 L44 14 V44 Z M14 44 V28 H30 V44" /><text x="22" y="62" class="lbl">Class</text></g>
      {#each STOPS as [p, l]}
        <circle class="stop" cx={p[0]} cy={p[1]} r="7" /><text class="lbl s" x={p[0]} y={p[1] - 14}>{l}</text>
      {/each}

      {#each buses as b, i}
        <g class="bus" class:on={b.on} transform="translate({b.p[0]} {b.p[1]})">
          <rect x="-16" y="-10" width="32" height="20" rx="6" fill={i ? '#2F65A7' : '#00274C'} />
          <rect x="-11" y="-6" width="9" height="7" rx="1.5" fill="#FFCB05" /><rect x="2" y="-6" width="9" height="7" rx="1.5" fill="#FFCB05" />
        </g>
      {/each}
      {#if cur.p.k !== 'ride'}
        <g transform="translate({me[0]} {me[1]})">
          {#if cur.p.k === 'wait' || cur.p.k === 'fail'}<circle class="ring" r="9" style="stroke:{COLOR[cur.p.k]}" />{/if}
          <circle class="me" r="7" />
        </g>
      {/if}
    </svg>
  </div>

  <div class="stack" aria-hidden="true">
    {#each segs as s}
      <div class="slot" style="flex:{s.full}">
        <div class="fill {s.k}" style="width:{(s.w / s.full) * 100}%; background:{COLOR[s.k]}"></div>
      </div>
    {/each}
  </div>
  <div class="legend">
    <span><i style="background:{COLOR.walk}"></i>Walking</span>
    <span><i style="background:{COLOR.wait}"></i>Waiting</span>
    <span><i style="background:{COLOR.ride}"></i>On the bus</span>
    {#if mode === 'night'}<span><i style="background:{COLOR.fail}"></i>No bus coming</span>{/if}
  </div>

  {#if done}
    <div class="result" class:fail={mode === 'night'}>
      {#if mode === 'day'}
        <p><b>Trip complete: {total} minutes door to door.</b> Here is the row the simulation writes down for it:</p>
        <code>completed = true · total_minutes = {total} · walk_minutes = {sum('walk')} · wait_minutes = {sum('wait')} · in_vehicle_minutes = {sum('ride')} · transfers = 1</code>
      {:else}
        <p><b>No way to make this trip.</b> The next Bus 4 isn’t until 6:12 am, well past the 2-hour limit. The trip is recorded as a failure, and it still counts.</p>
        <code>completed = false · failure_reason = no_service_at_time · all minutes = empty</code>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ts { padding: clamp(16px, 3vw, 26px); }
  .bar-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  .replay { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 8px 16px; font-weight: 500; font-size: 14px; }
  .replay:disabled { opacity: 0.6; cursor: default; }
  .stage { position: relative; background: #f6f3ea; border-radius: 12px; overflow: hidden; }
  .clock { position: absolute; left: 14px; top: 12px; display: grid; z-index: 1; }
  .clock b { font-family: var(--serif); font-size: clamp(24px, 3.4vw, 34px); color: var(--blue); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .clock span { font-size: 13.5px; font-weight: 600; transition: color 0.3s; }
  svg { width: 100%; display: block; margin-top: 30px; }
  .city path { stroke: #e7e1d0; stroke-width: 16; fill: none; }
  .city rect { fill: #ece6d6; }
  .route { fill: none; stroke-width: 6; stroke-linecap: round; }
  .r4 { stroke: #00274C; opacity: 0.85; }
  .r23 { stroke: #2F65A7; opacity: 0.85; }
  .walk { fill: none; stroke: #8393a7; stroke-width: 3; stroke-dasharray: 2 7; stroke-linecap: round; }
  .rl { font-size: 13px; font-weight: 600; fill: var(--blue); }
  .house, .school { fill: #fff; stroke: var(--blue); stroke-width: 2.5; stroke-linejoin: round; }
  .school { fill: var(--maize); }
  .lbl { font-size: 13px; text-anchor: middle; fill: var(--ink); font-weight: 600; }
  .lbl.s { font-size: 11.5px; fill: var(--muted); }
  .stop { fill: var(--maize); stroke: var(--blue); stroke-width: 2.5; }
  .bus { opacity: 0; transition: opacity 0.35s; }
  .bus.on { opacity: 1; }
  .me { fill: var(--orange); stroke: #fff; stroke-width: 2.5; }
  .ring { fill: none; stroke-width: 2.5; animation: ring 1.2s ease-out infinite; }
  @keyframes ring { from { r: 8; opacity: 1; } to { r: 22; opacity: 0; } }
  .stack { display: flex; gap: 3px; height: 16px; margin-top: 16px; }
  .slot { background: #eeeae0; border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; }
  .fill.fail { background-image: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0 6px, transparent 6px 12px) !important; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); margin-top: 10px; }
  .legend i { display: inline-block; width: 12px; height: 8px; border-radius: 2px; margin-right: 6px; }
  .result { margin-top: 16px; padding: 14px 16px; border-radius: 12px; background: #e9f1fa; animation: pop 0.5s var(--ease); }
  .result.fail { background: #fbe7e3; }
  .result p { margin: 0 0 8px; }
  .result code { display: block; font-size: 12.5px; background: rgba(255, 255, 255, 0.7); padding: 8px 10px; border-radius: 8px; overflow-wrap: anywhere; }
  @keyframes pop { from { opacity: 0; transform: translateY(6px); } }
</style>
