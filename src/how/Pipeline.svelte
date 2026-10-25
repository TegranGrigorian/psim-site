<script lang="ts">
  import { reveal } from '../lib/actions';

  const STAGES = [
    {
      key: 'data', title: 'Public data', tool: 'Collected', status: 'Sample data', icon: 'data',
      plain: 'Facts about the real city: how many people live where, where the jobs are, how many students live in dorms, and the official bus timetables and street map.',
      inn: 'Census tables, housing and job counts, university enrollment, TheRide and U-M timetables (GTFS), OpenStreetMap',
      out: 'housing.csv, workplaces.csv, campus_locations.csv',
    },
    {
      key: 'gen', title: 'Make the people', tool: 'psim-tools · Rust', status: 'In progress', icon: 'people',
      plain: 'Invents 1,000 believable residents that match the real mix, gives each a home, a destination and a weekly schedule. Steps 1 to 3 below.',
      inn: 'The tables from public data, plus a seed number', out: 'personas.csv (who), trips.csv (when and where to)',
    },
    {
      key: 'eng', title: 'Ride the buses', tool: 'psim-engine · Python + R5', status: 'Planned', icon: 'bus',
      plain: 'Takes every planned trip and works out, minute by minute, how it would go on the real bus schedule, or that it can’t be done. Steps 4 and 5.',
      inn: 'trips.csv, bus timetables, street map', out: 'trip_results (minutes walking, waiting, riding, transfers, or failed)',
    },
    {
      key: 'ana', title: 'Sum it up', tool: 'psim-tools · Rust', status: 'Planned', icon: 'chart',
      plain: 'Groups a million trip results by type of person, neighborhood and time of day, and averages them across 100 runs. Steps 6 and 8.',
      inn: 'All trip results from 100 runs', out: 'Small summary files: group averages with uncertainty ranges',
    },
    {
      key: 'site', title: 'This website', tool: 'psim-site · TypeScript', status: 'Built', icon: 'web',
      plain: 'Reads only the summary files and draws the charts and maps. It never sees individual personas.',
      inn: 'Summary files', out: 'The pages you are reading',
    },
  ];
  let open = $state('gen');
  const sel = $derived(STAGES.find((s) => s.key === open)!);
</script>

<div class="pipe" use:reveal data-reveal>
  {#each STAGES as s, i}
    <button class="stage" class:on={open === s.key} style="--i:{i}" onclick={() => (open = s.key)} aria-pressed={open === s.key}>
      <span class="ic">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {#if s.icon === 'data'}<ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          {:else if s.icon === 'people'}<circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.3c3.2-.6 6.5 1.4 6.5 5.2" />
          {:else if s.icon === 'bus'}<rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M8 21v-3M16 21v-3" /><circle cx="8" cy="14.5" r="1" /><circle cx="16" cy="14.5" r="1" />
          {:else if s.icon === 'chart'}<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          {:else}<rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18M8 21h8" />{/if}
        </svg>
      </span>
      <b>{s.title}</b>
      <small>{s.tool}</small>
      <em class="st st-{s.status.replace(/\s/g, '').toLowerCase()}">{s.status}</em>
    </button>
    {#if i < STAGES.length - 1}
      <div class="flow" aria-hidden="true"><i></i><i></i><i></i></div>
    {/if}
  {/each}
</div>

{#key open}
  <div class="detail card">
    <p class="plain">{sel.plain}</p>
    <div class="io">
      <div><span>Goes in</span>{sel.inn}</div>
      <div><span>Comes out</span>{sel.out}</div>
    </div>
  </div>
{/key}

<style>
  .pipe { display: grid; grid-template-columns: repeat(4, 1fr 44px) 1fr; align-items: stretch; }
  .stage { background: #fff; border: 1.5px solid var(--rule); border-radius: var(--radius); padding: 18px 14px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; transition: border-color 0.25s, transform 0.3s var(--ease), box-shadow 0.3s; }
  :global([data-reveal]) .stage { opacity: 0; transform: translateY(14px); }
  :global([data-reveal].in) .stage { opacity: 1; transform: none; transition: opacity 0.6s var(--ease) calc(var(--i) * 120ms), transform 0.6s var(--ease) calc(var(--i) * 120ms), border-color 0.25s, box-shadow 0.3s; }
  .stage:hover { border-color: #bcb6a3; }
  .stage.on { border-color: var(--blue); box-shadow: 0 10px 26px rgba(0, 39, 76, 0.12); }
  .ic { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: #f0ede4; color: var(--blue); margin-bottom: 8px; transition: background 0.25s, color 0.25s; }
  .stage.on .ic { background: var(--blue); color: var(--maize); }
  .ic svg { width: 22px; height: 22px; }
  b { font-size: 15px; line-height: 1.25; }
  small { color: var(--muted); font-size: 12px; }
  .st { font-style: normal; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; margin-top: 8px; background: #eee; color: #555; }
  .st-built { background: #dcf1e5; color: #0a6b45; }
  .st-inprogress { background: var(--maize-soft); color: #6b5400; }
  .st-planned { background: #e6edf6; color: #2f4f75; }
  .st-sampledata { background: #f6e3d6; color: #8a3d0c; }

  .flow { position: relative; align-self: center; height: 4px; margin: 0 4px; background: repeating-linear-gradient(90deg, #cfc9b8 0 6px, transparent 6px 11px); }
  .flow i { position: absolute; top: -3px; left: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--orange); animation: go 2.4s linear infinite; }
  .flow i:nth-child(2) { animation-delay: -0.8s; background: var(--maize); }
  .flow i:nth-child(3) { animation-delay: -1.6s; background: #2f65a7; }
  @keyframes go { from { left: -5px; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { left: calc(100% - 5px); opacity: 0; } }

  .detail { margin-top: 22px; padding: 22px 24px; animation: pop 0.45s var(--ease); }
  @keyframes pop { from { opacity: 0; transform: translateY(8px); } }
  .plain { font-size: 17px; margin-bottom: 16px; }
  .io { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .io div { background: #f6f4ec; border-radius: 10px; padding: 12px 14px; font-size: 14px; }
  .io span { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }

  @media (max-width: 900px) {
    .pipe { grid-template-columns: 1fr; }
    .stage { display: grid; grid-template-columns: 44px 1fr auto; column-gap: 12px; align-items: center; }
    .ic { grid-row: span 2; margin: 0; }
    .st { grid-row: span 2; grid-column: 3; margin: 0; }
    .flow { height: 30px; width: 4px; margin: 2px 0 2px 34px; background: repeating-linear-gradient(180deg, #cfc9b8 0 6px, transparent 6px 11px); }
    .flow i { left: -3px; animation-name: down; }
    @keyframes down { from { top: -5px; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { top: calc(100% - 5px); opacity: 0; } }
    .io { grid-template-columns: 1fr; }
  }
</style>
