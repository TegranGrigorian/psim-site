<script lang="ts">
  import { reveal } from '../lib/actions';
  import { GROUP_COLOR } from '../lib/format';

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Illustrative service span per day (hours). Real spans come from the GTFS timetable.
  const SERVICE: [number, number][] = [[6, 23], [6, 23], [6, 23], [6, 23], [6, 23], [7, 22], [8, 19]];

  type Trip = { day: number; t: number; purpose: 'class' | 'work' | 'home' | 'errand' };
  const P: Record<string, { label: string; who: string; group: string; trips: Trip[] }> = {
    student: {
      label: 'Undergraduate', group: 'undergraduate',
      who: 'Lives in a dorm on Central Campus. Classes most weekdays.',
      trips: [0, 2, 4].flatMap((d) => [{ day: d, t: 9.6, purpose: 'class' as const }, { day: d, t: 15.2, purpose: 'home' as const }])
        .concat([1, 3].flatMap((d) => [{ day: d, t: 10.8, purpose: 'class' as const }, { day: d, t: 16.5, purpose: 'home' as const }])),
    },
    nurse: {
      label: 'Night-shift worker', group: 'shift_worker',
      who: 'Rents on the South Side, works nights at the hospital, Sunday to Thursday.',
      trips: [6, 0, 1, 2, 3].flatMap((d) => [{ day: d, t: 22.25, purpose: 'work' as const }, { day: (d + 1) % 7, t: 7.3, purpose: 'home' as const }]),
    },
    office: {
      label: 'Resident worker', group: 'resident_worker',
      who: 'Owns a house on the East Side, works a standard day downtown.',
      trips: [0, 1, 2, 3, 4].flatMap((d) => [{ day: d, t: 7.5, purpose: 'work' as const }, { day: d, t: 17.25, purpose: 'home' as const }]),
    },
    retired: {
      label: 'Retired resident', group: 'retired',
      who: 'Owns a house in the Northeast. Errands a few times a week (planned for a later version).',
      trips: [{ day: 1, t: 10.5, purpose: 'errand' }, { day: 1, t: 12.5, purpose: 'home' }, { day: 3, t: 13, purpose: 'errand' }, { day: 3, t: 15.5, purpose: 'home' }, { day: 5, t: 11, purpose: 'errand' }, { day: 5, t: 13.75, purpose: 'home' }],
    },
  };
  let who = $state('nurse');
  const p = $derived(P[who]);
  const outside = (tr: Trip) => tr.t < SERVICE[tr.day][0] || tr.t > SERVICE[tr.day][1];
  const nOut = $derived(p.trips.filter(outside).length);
  const hhmm = (t: number) => `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, '0')}`;
  const pct = (h: number) => `${(h / 24) * 100}%`;
</script>

<div class="card rt" use:reveal data-reveal>
  <div class="seg" role="group" aria-label="Persona">
    {#each Object.entries(P) as [k, v]}
      <button aria-pressed={who === k} onclick={() => (who = k)}>{v.label}</button>
    {/each}
  </div>
  <p class="who"><i style="background:{GROUP_COLOR[p.group]}"></i>{p.who}</p>

  <div class="grid">
    <div></div>
    <div class="hours">{#each [0, 6, 12, 18, 24] as h}<span style="left:{pct(h)}">{h === 24 ? '' : h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}</span>{/each}</div>
    {#each DAYS as d, di}
      <div class="day">{d}</div>
      <div class="track">
        <div class="svc" style="left:{pct(SERVICE[di][0])}; width:{pct(SERVICE[di][1] - SERVICE[di][0])}"></div>
        {#key who}
          {#each p.trips.filter((t) => t.day === di) as t, ti}
            <span class="trip {t.purpose}" class:out={outside(t)} style="left:{pct(t.t)}; --c:{GROUP_COLOR[p.group]}; --i:{di * 2 + ti}" title="{t.purpose === 'home' ? 'Return home' : t.purpose} at {hhmm(t.t)}">
              {t.purpose === 'home' ? '⌂' : '→'}
            </span>
          {/each}
        {/key}
      </div>
    {/each}
  </div>

  <div class="foot">
    <span><i class="k-svc"></i>Buses running (illustrative)</span>
    <span><i class="k-trip">→</i>Leave for {who === 'student' ? 'class' : who === 'retired' ? 'errand' : 'work'}</span>
    <span><i class="k-trip">⌂</i>Return home</span>
    <span><i class="k-out"></i>Outside service hours</span>
  </div>
  <p class="verdict" class:bad={nOut > 0}>
    {#if nOut}{nOut} of {p.trips.length} trips this week depart when buses barely run, so they are likely to fail.{:else}All {p.trips.length} trips fall inside service hours.{/if}
  </p>
</div>

<style>
  .rt { padding: clamp(16px, 3vw, 26px); }
  .who { display: flex; gap: 10px; align-items: center; font-size: 15px; margin: 16px 0 18px; }
  .who i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .grid { display: grid; grid-template-columns: 40px 1fr; row-gap: 6px; column-gap: 10px; }
  .hours { position: relative; height: 16px; }
  .hours span { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--muted); }
  .day { font-size: 13px; font-weight: 600; align-self: center; }
  .track { position: relative; height: 30px; border-radius: 6px; background: repeating-linear-gradient(135deg, #e9e4d6 0 5px, #f4f1e8 5px 10px); }
  .svc { position: absolute; top: 0; bottom: 0; background: #dfe9f5; border-radius: 6px; }
  .trip { position: absolute; top: 3px; width: 24px; height: 24px; margin-left: -12px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 700; color: #fff; background: var(--c); box-shadow: 0 0 0 2px #fff; animation: in 0.5s var(--ease) both; animation-delay: calc(var(--i) * 45ms); }
  .trip.home { background: #fff; color: var(--c); box-shadow: 0 0 0 2px var(--c); }
  .trip.out { outline: 2.5px solid #c0392b; outline-offset: 2px; }
  @keyframes in { from { opacity: 0; transform: scale(0.3); } }
  .foot { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); margin-top: 16px; }
  .foot i { display: inline-block; width: 14px; height: 10px; margin-right: 6px; vertical-align: -1px; font-style: normal; }
  .k-svc { background: #dfe9f5; border-radius: 3px; }
  .k-trip { width: auto !important; height: auto !important; font-weight: 700; color: var(--blue); }
  .k-out { border: 2px solid #c0392b; border-radius: 50%; width: 10px !important; }
  .verdict { margin: 14px 0 0; padding: 10px 14px; border-radius: 10px; background: #e5f3ea; color: #0a6b45; font-weight: 500; font-size: 14.5px; }
  .verdict.bad { background: #fbe7e3; color: #8e2a1c; }
</style>
