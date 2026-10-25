<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { GROUP_COLOR, GROUP_LABEL } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { normalish, rng } from '../lib/rng';
  import type { Bundle } from '../lib/types';

  let { bundle }: { bundle: Bundle } = $props();

  const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
  const SHORT: Record<string, string> = { undergraduate: 'Undergrad', graduate: 'Grad', university_staff: 'Staff', resident_worker: 'Resident', shift_worker: 'Shift', retired: 'Retired' };
  const PER = 10;

  // Ten pretend trip results per group, centred on the summary means, with failures in proportion.
  const chips = $derived.by(() => {
    const r = rng(7);
    return GROUPS.flatMap((g, gi) => {
      const m = bundle.groupMetrics.groups.find((x) => x.dimension === 'group' && x.value === g)!.metrics;
      const nFail = Math.round(m.failure_rate.mean * PER);
      return Array.from({ length: PER }, (_, k) => ({
        g, gi, k, fail: k >= PER - nFail,
        min: Math.max(8, Math.round(normalish(r, m.total_minutes.mean, m.total_minutes.mean * 0.22))),
        sx: 4 + r() * 82, sy: 4 + r() * 80,
      }));
    });
  });
  const avg = $derived(GROUPS.map((g) => {
    const ok = chips.filter((c) => c.g === g && !c.fail);
    return { mean: ok.reduce((a, c) => a + c.min, 0) / Math.max(1, ok.length), fail: PER - ok.length };
  }));
  const maxAvg = $derived(Math.max(...avg.map((a) => a.mean)));

  let phase = $state<'scatter' | 'sort' | 'avg'>('scatter');
  let timers: number[] = [];
  let started = false;
  function play() {
    timers.forEach(clearTimeout);
    if (reducedMotion()) { phase = 'avg'; return; }
    phase = 'scatter';
    timers = [window.setTimeout(() => (phase = 'sort'), 900), window.setTimeout(() => (phase = 'avg'), 2600)];
  }
  $effect(() => () => timers.forEach(clearTimeout));

  const CH = 7.2; // chip height in % of the stage
  function style(c: (typeof chips)[number]) {
    const colW = 100 / GROUPS.length;
    if (phase === 'scatter') return `left:${c.sx}%; top:${c.sy}%;`;
    const left = c.gi * colW + colW * 0.08;
    const top = 88 - (c.k + 1) * CH;
    return `left:${left}%; top:${top}%; width:${colW * 0.84}%;`;
  }
</script>

<div class="card ag" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; play(); } }}>
  <div class="top">
    <p class="cap">{phase === 'scatter' ? 'Trip results, in no particular order' : phase === 'sort' ? 'Sorted by who made the trip' : 'Averaged: one number per group'}</p>
    <button onclick={play}>↻ Replay</button>
  </div>
  <div class="stage" class:avg={phase === 'avg'}>
    {#each chips as c (c.g + c.k)}
      <span class="chip" class:fail={c.fail} style="{style(c)} --c:{GROUP_COLOR[c.g]}">{c.fail ? '✕ failed' : `${c.min} min`}</span>
    {/each}
    {#each GROUPS as g, gi}
      <div class="col" style="left:{(gi * 100) / GROUPS.length}%; width:{100 / GROUPS.length}%">
        <div class="bar" style="height:{phase === 'avg' ? (avg[gi].mean / maxAvg) * 62 : 0}%; background:{GROUP_COLOR[g]}">
          <b>{Math.round(avg[gi].mean)}<small> min</small></b>
          {#if avg[gi].fail}<em>{avg[gi].fail} of {PER} failed</em>{/if}
        </div>
        <span class="gl">{SHORT[g]}</span>
      </div>
    {/each}
  </div>
  <p class="note">Ten trips per group here; the real summary does this with about a million, then repeats it for neighborhoods and hours of the day.</p>
</div>

<style>
  .ag { padding: clamp(16px, 3vw, 26px); }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
  .cap { margin: 0; font-weight: 600; }
  button { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 14px; }
  .stage { position: relative; height: 340px; background: #f6f3ea; border-radius: 12px; overflow: hidden; }
  .chip { position: absolute; width: 13%; height: 6.4%; display: grid; place-items: center; font-size: clamp(9px, 1.4vw, 11.5px); font-weight: 600; border-radius: 5px; background: #fff; color: var(--ink); border-left: 4px solid var(--c); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); transition: left 1s var(--ease), top 1s var(--ease), width 1s var(--ease), opacity 0.6s, transform 0.6s var(--ease); white-space: nowrap; overflow: hidden; }
  .chip.fail { background: #fbe7e3; color: #8e2a1c; }
  .stage.avg .chip { opacity: 0; transform: scale(0.6); }
  .col { position: absolute; bottom: 0; top: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 8px; pointer-events: none; }
  .bar { width: 64%; border-radius: 6px 6px 0 0; transition: height 0.9s var(--ease) 0.25s; position: relative; margin-bottom: 4px; }
  .bar b { position: absolute; top: -26px; left: 50%; transform: translateX(-50%); font-family: var(--serif); font-size: clamp(14px, 2vw, 19px); opacity: 0; transition: opacity 0.4s 0.8s; white-space: nowrap; }
  .bar small { font-size: 11px; font-family: var(--sans); }
  .bar em { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10px; font-weight: 600; color: #fff; text-align: center; line-height: 1.15; opacity: 0; transition: opacity 0.4s 1s; }
  .stage.avg .bar b, .stage.avg .bar em { opacity: 1; }
  .gl { font-size: clamp(10px, 1.5vw, 12.5px); font-weight: 600; }
  .note { margin: 12px 0 0; }
</style>
