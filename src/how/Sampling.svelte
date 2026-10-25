<script lang="ts">
  import { inView, reveal } from '../lib/actions';
  import { GROUP_COLOR, GROUP_LABEL } from '../lib/format';
  import { reducedMotion } from '../lib/curves';
  import { rng, weighted } from '../lib/rng';

  // Shares from data/ann_arbor/config.json (placeholders until real figures are in).
  const GROUPS = ['undergraduate', 'graduate', 'university_staff', 'resident_worker', 'shift_worker', 'retired'];
  const SHARES = [0.2, 0.1, 0.1, 0.3, 0.15, 0.15];
  const N = 1000, COLS = 40, GAP = 10;

  let seed = $state(42);
  let groups = $state<number[]>([]);
  let rank = $state<number[]>([]);
  let shown = $state(0);
  let sorted = $state(false);
  let started = false;
  const seen = new Map<number, string>();
  let note = $state('');

  function draw(s: number) {
    const r = rng(s);
    const g = Array.from({ length: N }, () => weighted(r, SHARES));
    // order in which dots light up: a shuffle, so it looks like names coming out of a hat
    const idx = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const rk = new Array(N);
    idx.forEach((v, k) => (rk[v] = k));
    groups = g;
    rank = rk;
    const fp = fingerprint(g);
    note = seen.has(s) ? (seen.get(s) === fp ? `Seed ${s} again: identical town, dot for dot.` : 'Different!') : `Town #${s - 41} drawn.`;
    seen.set(s, fp);
    animate();
  }
  function fingerprint(g: number[]) {
    let h = 2166136261;
    for (const x of g) h = Math.imul(h ^ x, 16777619);
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  let raf = 0;
  function animate() {
    cancelAnimationFrame(raf);
    if (reducedMotion()) { shown = N; return; }
    shown = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      shown = Math.min(N, Math.round(((t - t0) / 1800) * N));
      if (shown < N) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  const counts = $derived(GROUPS.map((_, gi) => groups.filter((g, i) => g === gi && rank[i] < shown).length));
  const pos = $derived.by(() => {
    const order = Array.from({ length: N }, (_, i) => i);
    if (sorted) order.sort((a, b) => groups[a] - groups[b] || a - b);
    const p = new Array(N);
    order.forEach((dot, k) => (p[dot] = [(k % COLS) * GAP + 5, Math.floor(k / COLS) * GAP + 5]));
    return p as [number, number][];
  });
  const fp = $derived(groups.length ? fingerprint(groups) : '');
</script>

<div class="card s" use:reveal data-reveal use:inView={(v) => { if (v && !started) { started = true; draw(seed); } }}>
  <div class="top">
    <div class="seed"><span>Seed</span><b>{seed}</b></div>
    <div class="btns">
      <button onclick={() => draw(++seed)}>New seed →</button>
      <button onclick={() => draw((seed = 42))} disabled={seed === 42 && shown === N && note.startsWith('Seed')}>Back to 42</button>
      <label><input type="checkbox" bind:checked={sorted} /> Sort by group</label>
    </div>
  </div>

  <svg viewBox="0 0 {COLS * GAP} {(N / COLS) * GAP}" role="img" aria-label="1,000 personas colored by group">
    {#each groups as g, i}
      <circle r="3.6" style="transform:translate({pos[i][0]}px,{pos[i][1]}px); fill:{rank[i] < shown ? GROUP_COLOR[GROUPS[g]] : '#d9d4c5'}" />
    {/each}
  </svg>

  <ul class="legend">
    {#each GROUPS as g, gi}
      <li>
        <i style="background:{GROUP_COLOR[g]}"></i>
        <span>{GROUP_LABEL[g]}</span>
        <b>{counts[gi]}</b>
        <small>target {SHARES[gi] * N}</small>
      </li>
    {/each}
  </ul>
  <p class="foot"><span>{note}</span><code>fingerprint {fp}</code></p>
</div>

<style>
  .s { padding: clamp(16px, 3vw, 26px); }
  .top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .seed { background: var(--blue); color: #fff; border-radius: 12px; padding: 6px 14px; display: flex; align-items: baseline; gap: 8px; }
  .seed span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9fb3c9; }
  .seed b { font-family: var(--serif); font-size: 26px; color: var(--maize); min-width: 2.2ch; }
  .btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  button { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 8px 14px; font-size: 14px; font-weight: 500; transition: background 0.2s, border-color 0.2s; }
  button:hover:not(:disabled) { border-color: var(--blue); }
  button:disabled { opacity: 0.45; cursor: default; }
  label { font-size: 14px; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; accent-color: var(--blue); }
  svg { width: 100%; display: block; }
  circle { transition: transform 0.9s var(--ease), fill 0.3s; }
  .legend { list-style: none; padding: 0; margin: 18px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 18px; }
  .legend li { display: grid; grid-template-columns: 10px 1fr auto; column-gap: 8px; align-items: center; font-size: 13.5px; }
  .legend i { width: 10px; height: 10px; border-radius: 50%; }
  .legend b { font-variant-numeric: tabular-nums; }
  .legend small { grid-column: 2 / -1; color: var(--muted); font-size: 11.5px; }
  .foot { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 14px 0 0; font-size: 14px; }
  code { font-size: 12px; color: var(--muted); background: #f3f0e6; padding: 2px 8px; border-radius: 6px; }
  @media (max-width: 560px) { .legend { grid-template-columns: repeat(2, 1fr); } }
</style>
