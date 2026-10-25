<script lang="ts">
  import { reveal } from '../lib/actions';
  import { reducedMotion } from '../lib/curves';
  import { rng } from '../lib/rng';

  const N = 100;
  const SETUP = 6; // loading timetables and maps: one worker only, can't be split
  const cost = Array.from({ length: N }, (_, i) => 0.7 + rng(42 + i)() * 0.7); // work per town
  const UNIT = 90; // ms per unit of work on screen
  const REAL_MIN = 3; // pretend one unit ≈ 3 minutes of real computer time

  let workers = $state(1);
  let clock = $state(0);
  let lanes = $state<{ task: number; start: number; end: number }[]>([]);
  let done = $state<boolean[]>(Array(N).fill(false));
  let next = 0;
  let running = $state(false);
  let phase = $state<'idle' | 'setup' | 'work' | 'done'>('idle');
  let history = $state<{ w: number; t: number }[]>([]);
  let raf = 0;

  function run() {
    cancelAnimationFrame(raf);
    clock = 0; next = 0; done = Array(N).fill(false); lanes = []; running = true; phase = 'setup';
    let last = performance.now();
    const w = workers;
    const step = (dt: number) => {
      clock += dt;
      if (phase === 'setup' && clock >= SETUP) {
        phase = 'work';
        lanes = Array.from({ length: w }, () => ({ task: -1, start: 0, end: 0 }));
      }
      if (phase === 'work') {
        lanes = lanes.map((l) => {
          if (l.task >= 0 && clock >= l.end) { done[l.task] = true; l = { task: -1, start: 0, end: 0 }; }
          if (l.task < 0 && next < N) { const tk = next++; return { task: tk, start: clock, end: clock + cost[tk] }; }
          return l;
        });
        if (next >= N && lanes.every((l) => l.task < 0)) finish(w);
      }
    };
    if (reducedMotion()) { while (running) step(0.05); return; }
    const tick = (now: number) => {
      const dt = (now - last) / UNIT; last = now;
      // integrate in small steps so fast frames don't skip task hand-offs
      for (let s = 0; s < dt && running; s += 0.05) step(Math.min(0.05, dt - s));
      if (running) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function finish(w: number) {
    running = false; phase = 'done';
    history = [...history.filter((h) => h.w !== w), { w, t: clock }].sort((a, b) => a.w - b.w);
  }
  $effect(() => () => cancelAnimationFrame(raf));

  const fmtT = (u: number) => { const m = Math.round(u * REAL_MIN); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const nDone = $derived(done.filter(Boolean).length);
  const maxT = $derived(Math.max(1, ...history.map((h) => h.t)));
  const base = $derived(history.find((h) => h.w === 1)?.t);

  const USES = [
    { tool: 'psim-tools generate', lang: 'Rust · rayon', status: 'In progress', text: 'Each of the 100 towns is built on whichever core is free. Every town has its own seed, so it comes out the same no matter which core builds it or when.' },
    { tool: 'psim-engine', lang: 'Python → R5 (Java)', status: 'Planned', text: 'The router works out many trips at once across all cores. Identical questions (same start, end and time) are answered once and reused, which cuts the work a lot.' },
    { tool: 'psim-tools analyze', lang: 'Rust · rayon', status: 'Planned', text: 'Each core adds up its share of trip results by group; the partial sums are then combined. Adding in a different order gives the same totals.' },
  ];
</script>

<div class="analogy" use:reveal data-reveal>
  <div><b>One cook</b><p>makes 100 sandwiches one after another.</p></div>
  <div><b>Eight cooks</b><p>each take the next order as soon as their hands are free. Same sandwiches, much sooner.</p></div>
  <div><b>But</b><p>someone still has to unlock the kitchen first. That part doesn’t speed up, so after a point more cooks barely help.</p></div>
</div>

<div class="sim" use:reveal data-reveal>
  <div class="ctl">
    <label for="w">Workers (threads): <b>{workers}</b></label>
    <input id="w" type="range" min="1" max="12" bind:value={workers} disabled={running} />
    <button onclick={run} disabled={running}>{running ? 'Running…' : `Build 100 towns with ${workers}`}</button>
  </div>

  <div class="board">
    <div class="lanes">
      <p class="cap">{phase === 'setup' ? 'Loading timetables and street map (one worker only)…' : phase === 'idle' ? 'Press the button to start' : `${nDone} of 100 towns done`}</p>
      {#if phase === 'setup'}
        <div class="lane setup"><i style="width:{(clock / SETUP) * 100}%"></i><span>setup</span></div>
      {/if}
      {#each lanes as l, i}
        <div class="lane">
          <span class="who">#{i + 1}</span>
          {#if l.task >= 0}
            <div class="job"><i style="width:{Math.min(100, ((clock - l.start) / (l.end - l.start)) * 100)}%"></i><span>town {l.task + 1} · seed {42 + l.task}</span></div>
          {:else}<div class="job idle"></div>{/if}
        </div>
      {/each}
    </div>
    <div class="done">
      <p class="cap">Results, each in its own slot</p>
      <div class="grid10">
        {#each done as d, i}<i class:on={d} title="seed {42 + i}"></i>{/each}
      </div>
      <p class="timer"><span>Pretend running time</span><b>{fmtT(clock)}</b></p>
    </div>
  </div>

  {#if history.length}
    <div class="hist">
      {#each history as h}
        <div class="row">
          <span>{h.w} {h.w === 1 ? 'worker' : 'workers'}</span>
          <div class="track"><i style="width:{(h.t / maxT) * 100}%"></i></div>
          <b>{fmtT(h.t)}{base && h.w > 1 ? ` · ${(base / h.t).toFixed(1)}× faster` : ''}</b>
        </div>
      {/each}
      <p class="same">✓ Same 100 results every time, whatever the number of workers. Only the waiting changes.</p>
    </div>
  {:else}
    <p class="hint">Try 1 worker first, then 8, then 12.</p>
  {/if}
</div>

<h3 class="uh" use:reveal data-reveal>Where psim uses threads</h3>
<div class="uses">
  {#each USES as u, i}
    <div class="use" use:reveal={{ delay: i * 90 }} data-reveal>
      <div class="uhd"><b>{u.tool}</b><em class:planned={u.status === 'Planned'}>{u.status}</em></div>
      <small>{u.lang}</small>
      <p>{u.text}</p>
    </div>
  {/each}
</div>
<p class="fine" use:reveal data-reveal>Times above are illustrative. This is the planned design; the engine isn’t built yet, and real speed-ups will be measured once it runs.</p>

<style>
  .analogy { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 26px; }
  .analogy div { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; }
  .analogy b { color: var(--maize); font-family: var(--serif); font-size: 20px; }
  .analogy p { margin: 4px 0 0; color: #b8c7d8; font-size: 14.5px; }
  .sim { background: #0f2a4a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius); padding: clamp(16px, 3vw, 26px); }
  .ctl { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
  .ctl label b { color: var(--maize); font-size: 18px; display: inline-block; min-width: 2ch; }
  input[type='range'] { accent-color: var(--maize); width: 180px; }
  .ctl button { background: var(--maize); color: var(--blue); border: 0; border-radius: 999px; padding: 9px 18px; font-weight: 600; }
  .ctl button:disabled { opacity: 0.6; cursor: default; }
  .board { display: grid; grid-template-columns: 1.4fr 1fr; gap: 22px; }
  .cap { font-size: 13px; color: #9fb3c9; margin: 0 0 10px; min-height: 1.4em; }
  .lanes { display: grid; gap: 6px; align-content: start; }
  .lane { display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; }
  .who { font-size: 11px; color: #7f95ae; }
  .job, .lane.setup { position: relative; height: 22px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .lane.setup { grid-template-columns: none; }
  .job i, .lane.setup i { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #2f65a7, #4f86c9); }
  .lane.setup i { background: repeating-linear-gradient(135deg, #d86018 0 8px, #e9762f 8px 16px); }
  .job span, .lane.setup span { position: relative; font-size: 11.5px; padding-left: 8px; line-height: 22px; color: #fff; white-space: nowrap; }
  .job.idle { background: rgba(255, 255, 255, 0.03); }
  .grid10 { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .grid10 i { aspect-ratio: 1; border-radius: 4px; background: rgba(255, 255, 255, 0.07); transition: background 0.3s, transform 0.3s var(--ease); }
  .grid10 i.on { background: var(--maize); transform: scale(1.04); }
  .timer { margin: 14px 0 0; display: grid; }
  .timer span { font-size: 12px; color: #9fb3c9; }
  .timer b { font-family: var(--serif); font-size: 30px; color: #fff; font-variant-numeric: tabular-nums; }
  .hist { margin-top: 22px; display: grid; gap: 8px; }
  .row { display: grid; grid-template-columns: 90px 1fr auto; gap: 12px; align-items: center; font-size: 14px; }
  .track { height: 10px; background: rgba(255, 255, 255, 0.06); border-radius: 5px; overflow: hidden; }
  .track i { display: block; height: 100%; background: var(--maize); border-radius: 5px; transition: width 0.7s var(--ease); }
  .row b { font-weight: 600; font-size: 13px; color: #dfe7f0; }
  .same { margin: 8px 0 0; color: #8fd3ad; font-size: 14px; }
  .hint { margin: 16px 0 0; color: #9fb3c9; font-size: 14px; }
  .uh { font-size: 26px; margin: 48px 0 16px; color: #fff; }
  .uses { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .use { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 18px; }
  .uhd { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
  .uhd b { color: #fff; }
  .uhd em { font-style: normal; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: rgba(255, 203, 5, 0.18); color: var(--maize); white-space: nowrap; }
  .uhd em.planned { background: rgba(159, 179, 201, 0.18); color: #c4d3e3; }
  .use small { color: #7f95ae; }
  .use p { margin: 10px 0 0; font-size: 14.5px; color: #c4d3e3; }
  .fine { font-size: 13px; color: #7f95ae; margin-top: 18px; }
  @media (max-width: 860px) {
    .analogy, .uses { grid-template-columns: 1fr; }
    .board { grid-template-columns: 1fr; }
  }
</style>
