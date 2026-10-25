<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';

  // Buses leave the stop every 15 minutes (8:07, 8:22, 8:37 …). Walk 6, ride 25, walk 4.
  const N = 30;
  const times = Array.from({ length: N }, (_, i) => {
    const atStop = 6 + i;
    const next = [7, 22, 37, 52].find((b) => b >= atStop)!;
    return { leave: i, total: 6 + (next - atStop) + 25 + 4 };
  });
  const order = [...times].sort((a, b) => a.total - b.total || a.leave - b.leave).map((x) => x.leave);
  const slot = Object.fromEntries(order.map((leave, k) => [leave, k]));
  const median = (order.length % 2 ? times[order[(N - 1) / 2]].total : (times[order[N / 2 - 1]].total + times[order[N / 2]].total) / 2);
  const max = Math.max(...times.map((x) => x.total));
  const min = Math.min(...times.map((x) => x.total));

  let shown = $state(0);
  let sorted = $state(false);
  let started = false;
  let timers: number[] = [];

  function run() {
    timers.forEach(clearTimeout); timers = [];
    sorted = false;
    if (reducedMotion()) { shown = N; sorted = true; return; }
    shown = 0;
    for (let i = 1; i <= N; i++) timers.push(window.setTimeout(() => (shown = i), i * 70));
    timers.push(window.setTimeout(() => (sorted = true), N * 70 + 900));
  }
  $effect(() => () => timers.forEach(clearTimeout));
  const isMed = (leave: number) => (N % 2 ? slot[leave] === (N - 1) / 2 : slot[leave] === N / 2 - 1 || slot[leave] === N / 2);
</script>

<div class="card dw" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; run(); } }}>
  <div class="top">
    <div class="seg" role="group" aria-label="Order">
      <button aria-pressed={!sorted} onclick={() => (sorted = false)}>By departure minute</button>
      <button aria-pressed={sorted} onclick={() => (sorted = true)}>Sorted</button>
    </div>
    <button class="replay" onclick={run}>↻ Replay</button>
  </div>

  <div class="chart" role="img" aria-label="Travel time for each departure minute from 8:00 to 8:29; median {median} minutes">
    <div class="medline" class:show={sorted && shown === N} style="bottom:{(median / max) * 100}%"><span>median {median} min</span></div>
    {#each times as x}
      <div
        class="b"
        class:on={x.leave < shown}
        class:med={sorted && shown === N && isMed(x.leave)}
        style="left:{((sorted ? slot[x.leave] : x.leave) / N) * 100}%; height:{(x.total / max) * 100}%"
        title="Leave 8:{String(x.leave).padStart(2, '0')} → {x.total} min"
      ></div>
    {/each}
  </div>
  <div class="axis"><span>{sorted ? 'fastest' : '8:00'}</span><span>{sorted ? 'slowest' : '8:29'}</span></div>

  <div class="facts">
    <div><span>Best minute</span><b>{min} min</b></div>
    <div><span>Worst minute</span><b>{max} min</b></div>
    <div class="hl"><span>We record</span><b>{median} min</b></div>
  </div>
  <p class="note">The saw-tooth shape is the bus timetable showing through: leave just after a bus and you wait almost the full 15 minutes.</p>
</div>

<style>
  .dw { padding: clamp(16px, 3vw, 26px); }
  .top { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
  .replay { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 8px 16px; font-size: 14px; font-weight: 500; }
  .chart { position: relative; height: 220px; border-bottom: 1.5px solid var(--ink); }
  .b { position: absolute; bottom: 0; width: calc(100% / 30 - 3px); margin-left: 1.5px; background: #9fb3c9; border-radius: 3px 3px 0 0; transform-origin: bottom; transform: scaleY(0); transition: left 0.9s var(--ease), transform 0.45s var(--ease), background 0.3s; }
  .b.on { transform: scaleY(1); }
  .b.med { background: var(--maize); box-shadow: 0 0 0 2px var(--blue); }
  .medline { position: absolute; left: 0; right: 0; border-top: 2px dashed var(--blue); opacity: 0; transition: opacity 0.5s; z-index: 1; }
  .medline.show { opacity: 1; }
  .medline span { position: absolute; right: 0; top: -26px; background: var(--blue); color: #fff; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
  .axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 6px; }
  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
  .facts div { background: #f6f4ec; border-radius: 10px; padding: 10px 12px; }
  .facts span { display: block; font-size: 12px; color: var(--muted); }
  .facts b { font-family: var(--serif); font-size: 24px; }
  .facts .hl { background: var(--blue); color: #fff; }
  .facts .hl span { color: #a9bcd2; }
  .facts .hl b { color: var(--maize); }
  .note { margin: 14px 0 0; }
</style>
