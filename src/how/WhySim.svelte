<script lang="ts">
  import { reveal } from '../lib/actions';

  const REASONS = [
    { n: '01', t: 'You can’t experiment on a real city', d: 'Nobody can move half the town onto night shifts, or redraw a bus line for a month, just to see what happens. A simulated town can be changed and rerun as often as we like.' },
    { n: '02', t: 'Same rules for everyone', d: 'Every pretend person rides the same timetable under the same limits. So any gap between groups comes from where and when they live and travel, not from who answered a survey.' },
    { n: '03', t: 'It can answer “what if?”', d: 'Change the timetable and run again. Run the same steps on another college town. Then compare like with like.' },
  ];
  const HYP = [
    ['H1', 'Undergraduates get around faster and fail less than resident workers.', 'Residents do as well or better.'],
    ['H2', 'Shift workers fail most, because of evening and night service.', 'Another group fails more, or shift workers fail no more at night.'],
    ['H3', 'University staff look more like students than like other residents.', 'Staff sit with the residents.'],
    ['H4', 'Neighborhood matters as much as student or resident status.', 'Neighborhood gaps are small next to group gaps.'],
    ['H5', 'Another college town has a different gap.', 'Madison’s gap matches Ann Arbor’s.'],
    ['H6', 'A targeted redesign helps the worst-served without hurting others.', 'No improvement, or someone else loses out.'],
  ];
  const FLOW = ['Claim', 'Simulate', 'Measure', 'Test', 'Verdict'];
</script>

<div class="reasons">
  {#each REASONS as r, i}
    <div class="r" use:reveal={{ delay: i * 100 }} data-reveal>
      <span>{r.n}</span>
      <b>{r.t}</b>
      <p>{r.d}</p>
    </div>
  {/each}
</div>

<div class="q" use:reveal data-reveal>
  <p class="k">The question</p>
  <p class="big">Ann Arbor is often described as a college town whose buses exist for students. Is that true, and is “student versus resident” even the right way to split the city?</p>
  <p>Rather than assume the answer, the project writes down specific claims first, each of which the data could prove wrong. Each one is tested the same way:</p>
  <div class="flow" aria-hidden="true">
    {#each FLOW as f, i}
      <span class="node" style="--i:{i}">{f}</span>
      {#if i < FLOW.length - 1}<span class="arr" style="--i:{i}"></span>{/if}
    {/each}
  </div>
</div>

<div class="hyps">
  {#each HYP as [id, claim, wrong], i}
    <div class="h" use:reveal={{ delay: (i % 3) * 80 }} data-reveal>
      <span class="id">{id}</span>
      <p class="c">{claim}</p>
      <p class="w"><b>We’d be wrong if:</b> {wrong}</p>
    </div>
  {/each}
</div>

<style>
  .reasons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 40px; }
  .r { background: #fff; border: 1px solid var(--rule); border-radius: var(--radius); padding: 20px; }
  .r span { font-family: var(--serif); color: var(--orange); font-size: 15px; font-weight: 600; }
  .r b { display: block; font-family: var(--serif); font-size: 21px; line-height: 1.2; margin: 6px 0 8px; }
  .r p { margin: 0; color: #36424f; font-size: 15px; }
  .q { background: var(--blue); color: #e6edf5; border-radius: var(--radius); padding: clamp(20px, 4vw, 36px); margin-bottom: 18px; }
  .q .k { color: var(--maize); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; }
  .q .big { font-family: var(--serif); font-size: clamp(21px, 2.8vw, 30px); line-height: 1.25; color: #fff; margin-bottom: 14px; max-width: 34ch; }
  .q p { max-width: 70ch; color: #c4d3e3; }
  .flow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 0; margin-top: 18px; }
  .node { padding: 7px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); font-weight: 600; font-size: 14px; color: #fff; animation: lit 5s linear infinite; animation-delay: calc(var(--i) * 1s); }
  .arr { width: 34px; height: 2px; background: rgba(255, 255, 255, 0.25); position: relative; overflow: hidden; }
  .arr::after { content: ''; position: absolute; inset: 0; width: 40%; background: var(--maize); animation: run 5s linear infinite; animation-delay: calc(var(--i) * 1s + 0.5s); transform: translateX(-100%); }
  @keyframes lit { 0%, 18% { background: var(--maize); color: var(--blue); border-color: var(--maize); } 22%, 100% { background: rgba(255, 255, 255, 0.08); color: #fff; } }
  @keyframes run { 0% { transform: translateX(-100%); } 10% { transform: translateX(250%); } 100% { transform: translateX(250%); } }
  .hyps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .h { background: #fff; border: 1px solid var(--rule); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .id { font-family: var(--serif); font-size: 24px; font-weight: 600; color: var(--blue); }
  .c { margin: 0; font-weight: 600; font-size: 15px; flex: 1; }
  .w { margin: 0; font-size: 13.5px; color: var(--muted); }
  .w b { color: #8e2a1c; font-weight: 600; }
  @media (max-width: 900px) { .reasons, .hyps { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 580px) { .reasons, .hyps { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .node, .arr::after { animation: none; } }
</style>
