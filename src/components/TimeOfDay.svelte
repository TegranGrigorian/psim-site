<script lang="ts">
  import { reveal } from '../lib/actions';
  import { app } from '../lib/state.svelte';
  import { HEAT, GROUP_LABEL, ramp } from '../lib/format';
  import type { TimeOfDay, TodHour } from '../lib/types';

  let { tod }: { tod: TimeOfDay } = $props();
  let mode = $state<'failure_rate' | 'mean_wait'>('failure_rate');
  let tip = $state<{ g: string; h: number; v: number | null; n: number } | null>(null);

  const order = Object.keys(GROUP_LABEL);
  // Hours with no trips carry zeros that mean "no data", not "no failures" (SCHEMA.md §5.2).
  // Wait times come from a smaller detailed sample, so an hour can have trips but no wait samples.
  const has = (h: TodHour, m: typeof mode) => (m === 'failure_rate' ? (h.n_trips ?? 1) > 0 : (h.n_wait_samples ?? h.n_trips ?? 1) > 0);
  const val = (h: TodHour | undefined, m: typeof mode) => (h && has(h, m) ? h[m] : null);
  const series = $derived(
    order
      .map((g) => tod.series.find((s) => s.group === g && s.day_type === app.dayType))
      .filter((s) => !!s)
      .map((s) => ({ group: s.group, hours: Array.from({ length: 24 }, (_, h) => s.hours.find((x) => x.hour === h)) })),
  );
  const max = $derived(Math.max(1e-9, ...series.flatMap((s) => s.hours.map((h) => val(h, mode) ?? 0))));
  const fmtV = (v: number | null) => (v === null ? 'no trips leave at this hour, so no data' : mode === 'failure_rate' ? `${(v * 100).toFixed(0)}% of trips fail` : `${v.toFixed(1)} min wait`);
  const hourLabel = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);
</script>

<div class="card tod" use:reveal data-reveal>
  <div class="controls">
    <div class="seg" role="group" aria-label="Measure">
      <button aria-pressed={mode === 'failure_rate'} onclick={() => (mode = 'failure_rate')}>Failure rate</button>
      <button aria-pressed={mode === 'mean_wait'} onclick={() => (mode = 'mean_wait')}>Wait time</button>
    </div>
    <div class="seg" role="group" aria-label="Day type">
      <button aria-pressed={app.dayType === 'weekday'} onclick={() => (app.dayType = 'weekday')}>Weekday</button>
      <button aria-pressed={app.dayType === 'weekend'} onclick={() => (app.dayType = 'weekend')}>Weekend</button>
    </div>
  </div>

  <div class="scroll">
    <div class="heat" role="table" aria-label="{mode === 'failure_rate' ? 'Failure rate' : 'Wait time'} by group and departure hour">
      <div class="corner"></div>
      {#each Array(24) as _, h}
        <div class="hl" class:show={h % 3 === 0}>{hourLabel(h)}</div>
      {/each}
      {#each series as s, gi}
        <div class="gl">{GROUP_LABEL[s.group]}</div>
        {#each s.hours as hr, h}
          {@const v = val(hr, mode)}
          {@const pick = () => (tip = { g: s.group, h, v, n: hr?.n_trips ?? 0 })}
          <button
            class="cell"
            class:nd={v === null}
            style="background:{v === null ? '' : ramp(HEAT, v / max)}; --i:{h + gi * 2}"
            aria-label="{GROUP_LABEL[s.group]}, {hourLabel(h)}: {fmtV(v)}"
            onmouseenter={pick}
            onfocus={pick}
            onclick={pick}
          ></button>
        {/each}
      {/each}
    </div>
  </div>

  <p class="readout" aria-live="polite">
    {#if tip}<b>{GROUP_LABEL[tip.g]}</b> leaving at <b>{hourLabel(tip.h)}</b>: {fmtV(tip.v)}{#if tip.v !== null && tip.n} <span class="n">({tip.n.toLocaleString()} simulated trips)</span>{/if}{:else}Hover or tap a cell. Columns are the hour a trip departs.{/if}
  </p>
  <div class="key"><span>Lower</span><i style="background:linear-gradient(90deg,{HEAT.join(',')})"></i><span>Higher</span><b class="nd"></b><span>No trips at this hour (no data)</span></div>
</div>

<style>
  .tod { padding: clamp(16px, 3vw, 30px); }
  .controls { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  .scroll { overflow-x: auto; padding-bottom: 6px; }
  .heat { display: grid; grid-template-columns: 130px repeat(24, minmax(20px, 1fr)); gap: 3px; min-width: 640px; }
  .hl { font-size: 11px; color: var(--muted); text-align: center; visibility: hidden; }
  .hl.show { visibility: visible; }
  .gl { font-size: 13px; font-weight: 500; align-self: center; padding-right: 8px; }
  .cell { border: 0; height: 34px; border-radius: 4px; padding: 0; transition: transform 0.2s var(--ease), box-shadow 0.2s, background 0.5s; }
  .cell:hover, .cell:focus-visible { transform: scale(1.18); box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px var(--blue); z-index: 1; position: relative; }
  :global([data-reveal]:not(.in)) .cell { opacity: 0; transform: scale(0.6); }
  :global([data-reveal].in) .cell { animation: cell 0.5s var(--ease) both; animation-delay: calc(var(--i) * 18ms); }
  @keyframes cell { from { opacity: 0; transform: scale(0.6); } }
  .readout { margin: 18px 0 8px; min-height: 1.6em; font-size: 15px; }
  .key { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--muted); }
  .key i { width: 140px; height: 8px; border-radius: 4px; }
  .key { flex-wrap: wrap; }
  .key b { width: 16px; height: 12px; border-radius: 3px; margin-left: 12px; }
  .nd { background: repeating-linear-gradient(135deg, #d9d8d4 0 2px, #f4f3f0 2px 6px); }
  .readout .n { color: var(--muted); }
  @media (max-width: 640px) { .heat { grid-template-columns: 96px repeat(24, 22px); } .gl { font-size: 12px; } }
</style>
