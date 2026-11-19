<script lang="ts">
  import { reveal } from '../lib/actions';
  import { cityShort, PLAIN_RULE, summarize, tone, verdictLabel } from '../lib/report';
  import type { Report } from '../lib/types';

  // Verdicts come from data/report/hypotheses.json (psim-engine report). `extra` adds rows the report
  // doesn't cover (H7 on the How page). Without a report every card says "Not yet tested".
  type Row = { city: string; verdict: string; summary: string; note?: string };
  let { claims, report, extra = {} }: { claims: [string, string][]; report?: Report | null; extra?: Record<string, Row[]> } = $props();

  const rows = (id: string): Row[] => [
    ...(report?.hypotheses ?? []).filter((h) => h.id === id).map((h) => ({ city: cityShort(h.city), verdict: h.verdict, summary: summarize(h) })),
    ...(extra[id] ?? []),
  ];
  const runs = $derived(report ? [...new Set(Object.values(report.n_replicates))] : []);
</script>

{#if report}
  <div class="rule" use:reveal data-reveal>
    <b>How a verdict is reached</b>
    <p>
      {PLAIN_RULE}
      {#if runs.length === 1}Each city was simulated {runs[0]} times.{/if}
      {#if report.preliminary}These runs are preliminary: fewer than planned, on input data still being checked.{/if}
    </p>
  </div>
{/if}

<ul>
  {#each claims as [id, text], i}
    {@const rs = rows(id)}
    <li class="card" use:reveal={{ delay: (i % 3) * 80 }} data-reveal>
      <span class="id">{id}</span>
      <p class="claim">{text}</p>
      {#if rs.length}
        {#each rs as r}
          <div class="row">
            <div class="top"><span class="city">{r.city}</span><span class="badge {tone(r.verdict)}">{verdictLabel(r.verdict)}</span></div>
            <p class="sum">{r.summary}</p>
            {#if r.note}<p class="nt">{r.note}</p>{/if}
          </div>
        {/each}
      {:else}
        <span class="badge none">Not yet tested</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .rule { background: #fff; border: 1px solid var(--rule); border-left: 4px solid var(--blue); border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 18px; max-width: 80ch; }
  .rule b { font-family: var(--serif); font-size: 18px; }
  .rule p { margin: 4px 0 0; font-size: 14.5px; color: #36424f; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  li { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .id { font-family: var(--serif); font-size: 30px; font-weight: 600; color: var(--blue); line-height: 1; }
  .claim { margin: 0; color: var(--ink); font-size: 15px; font-weight: 600; }
  .row { border-top: 1px solid var(--rule); padding-top: 10px; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .city { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--muted); }
  .sum { margin: 6px 0 0; font-size: 14px; color: #36424f; }
  .nt { margin: 6px 0 0; font-size: 12.5px; color: var(--muted); }
  .badge { align-self: flex-start; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
  .good { background: #dcf1e5; color: #0a6b45; }
  .partgood { background: #e9f5d9; color: #3d6b0a; }
  .mixed { background: var(--maize-soft); color: #6b5400; }
  .partbad { background: #fbe9d8; color: #8a3d0c; }
  .bad { background: #fbe7e3; color: #8e2a1c; }
  .unclear { background: #e6edf6; color: #2f4f75; }
  .none { background: #ebe8de; color: #5d6877; }
  @media (max-width: 900px) { ul { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { ul { grid-template-columns: 1fr; } }
</style>
