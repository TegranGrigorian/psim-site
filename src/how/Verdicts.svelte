<script lang="ts">
  import { reveal } from '../lib/actions';
  import type { Verdict } from './evidence';

  let { verdicts }: { verdicts: Verdict[] } = $props();

  const METHOD: Record<string, string> = {
    H1: 'Paired t-test on travel time and failure rate; later a regression controlling for distance.',
    H2: 'Rank groups by failure rate, then test the top two against each other.',
    H3: 'Compare how far staff sit from the student average and from the resident average.',
    H4: 'Compare the best-to-worst neighborhood spread with the student–resident gap.',
    H5: 'Same pipeline on Madison; compare the gap ratios, not raw minutes.',
    H6: 'Before/after on the same towns; the 95% interval of each change must exclude zero.',
    H7: 'One-sided t-test of each student group’s on-time rate against a 95% bar.',
  };
  const count = (s: string) => verdicts.filter((v) => v.status === s).length;
</script>

<div class="tally" use:reveal data-reveal>
  <span class="s">{count('Supported')} supported</span>
  <span class="m">{count('Mixed')} mixed</span>
  <span class="n">{count('Not supported')} not supported</span>
  <em>computed from placeholder data</em>
</div>

<ul>
  {#each verdicts as v, i}
    <li class="card" use:reveal={{ delay: (i % 3) * 90 }} data-reveal>
      <div class="hd">
        <span class="id">{v.id}</span>
        <span class="stamp" class:s={v.status === 'Supported'} class:m={v.status === 'Mixed'} class:n={v.status === 'Not supported'} style="--i:{i}">{v.status}</span>
      </div>
      <p class="claim">{v.claim}</p>
      <p class="ev">{v.evidence}</p>
      <p class="how"><b>Test:</b> {METHOD[v.id]}</p>
    </li>
  {/each}
</ul>

<style>
  .tally { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-bottom: 18px; font-weight: 600; font-size: 14px; }
  .tally span { padding: 4px 12px; border-radius: 999px; }
  .tally .s, .stamp.s { background: #dcf1e5; color: #0a6b45; }
  .tally .m, .stamp.m { background: var(--maize-soft); color: #6b5400; }
  .tally .n, .stamp.n { background: #fbe7e3; color: #8e2a1c; }
  .tally em { font-weight: 400; color: var(--muted); font-size: 13px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  li { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
  .hd { display: flex; justify-content: space-between; align-items: center; }
  .id { font-family: var(--serif); font-size: 28px; font-weight: 600; color: var(--blue); }
  .stamp { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; transform: rotate(-3deg) scale(1); }
  :global([data-reveal]:not(.in)) .stamp { transform: rotate(-12deg) scale(1.8); opacity: 0; }
  :global([data-reveal].in) .stamp { transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s, opacity 0.3s 0.35s; }
  .claim { margin: 0; font-weight: 600; font-size: 15px; }
  .ev { margin: 0; font-size: 14px; color: #36424f; flex: 1; }
  .how { margin: 0; font-size: 12.5px; color: var(--muted); border-top: 1px solid var(--rule); padding-top: 8px; }
  @media (max-width: 900px) { ul { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 580px) { ul { grid-template-columns: 1fr; } }
</style>
