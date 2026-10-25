<script lang="ts">
  import { countUp } from '../lib/actions';
  import type { Bundle } from '../lib/types';
  import { GROUP_LABEL } from '../lib/format';

  let { bundle, cityName }: { bundle: Bundle; cityName: string } = $props();

  const g = (v: string) => bundle.groupMetrics.groups.find((x) => x.dimension === 'group' && x.value === v)!.metrics;
  const stats = $derived.by(() => {
    const hoods = bundle.hoods.features.map((f) => f.properties.metrics.failure_rate.mean);
    return [
      { to: g('shift_worker').failure_rate.mean / g('undergraduate').failure_rate.mean, digits: 1, suffix: '×', text: `Shift workers fail to complete a trip ${(g('shift_worker').failure_rate.mean / g('undergraduate').failure_rate.mean).toFixed(1)}× as often as undergraduates.` },
      { to: g('resident_worker').total_minutes.mean - g('undergraduate').total_minutes.mean, digits: 0, suffix: ' min', text: 'Extra door-to-door time for a resident worker compared with an undergraduate.' },
      { to: Math.max(...hoods) / Math.min(...hoods), digits: 1, suffix: '×', text: 'Spread in failure rate between the best and worst served neighborhoods.' },
    ];
  });
</script>

<header class="hero">
  <svg class="lines" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path class="l l1" d="M-20 470 C 180 470, 260 300, 420 300 S 640 430, 800 360 S 1040 170, 1240 150" />
      <path class="l l2" d="M-20 540 C 220 540, 300 440, 520 440 S 760 520, 940 470 S 1120 380, 1240 390" />
      <path class="l l3" d="M300 640 C 340 520, 460 470, 560 380 S 720 180, 760 -20" />
    </g>
    {#each [[420, 300], [800, 360], [560, 380], [940, 470], [1040, 215]] as [x, y], i}
      <circle class="stop" cx={x} cy={y} r="7" style="--i:{i}" />
    {/each}
  </svg>

  <div class="wrap inner">
    <p class="eyebrow">HISTART 394 · {cityName} · transit simulation</p>
    <h1>Who is the<br />bus for?</h1>
    <p class="sub">
      A simulation of {cityName.split(',')[0]}'s buses, run over a thousand synthetic residents, to test whether the
      system serves students better than the people who live here year-round, and whether that line is even the right one.
    </p>
    <div class="cta">
      <a class="btn primary" href="#gap">See the results</a>
      <a class="btn" href="#method">How it works</a>
    </div>

    <dl class="stats">
      {#each stats as s, i}
        <div class="stat" style="--i:{i}">
          <dt><span use:countUp={{ to: s.to, digits: s.digits, suffix: s.suffix }}>0</span></dt>
          <dd>{s.text}</dd>
        </div>
      {/each}
    </dl>
  </div>
</header>

<style>
  .hero { position: relative; background: var(--blue); color: #fff; overflow: hidden; padding: clamp(72px, 12vw, 150px) 0 clamp(48px, 7vw, 80px); }
  .lines { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.95; }
  .l { stroke-width: 5; stroke-dasharray: 1800; stroke-dashoffset: 1800; animation: draw 2.6s var(--ease) forwards; }
  .l1 { stroke: var(--maize); }
  .l2 { stroke: #2f65a7; animation-delay: 0.35s; }
  .l3 { stroke: #d86018; animation-delay: 0.7s; opacity: 0.85; }
  .stop { fill: var(--blue); stroke: #fff; stroke-width: 3; opacity: 0; animation: pop 0.5s var(--ease) forwards; animation-delay: calc(1.2s + var(--i) * 0.18s); transform-box: fill-box; transform-origin: center; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }

  .inner { position: relative; }
  .eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: var(--maize); margin-bottom: 22px; animation: up 0.8s var(--ease) both; }
  h1 { font-size: clamp(52px, 11vw, 132px); letter-spacing: -0.03em; line-height: 0.95; font-weight: 650; animation: up 0.9s var(--ease) 0.08s both; text-shadow: 0 2px 24px rgba(0, 39, 76, 0.65); }
  .sub { max-width: 54ch; font-size: clamp(17px, 2.1vw, 21px); color: #d6e0ec; margin: 28px 0 32px; animation: up 0.9s var(--ease) 0.2s both; text-shadow: 0 1px 14px rgba(0, 39, 76, 0.9); }
  .cta { display: flex; gap: 12px; flex-wrap: wrap; animation: up 0.9s var(--ease) 0.3s both; }
  .btn { text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255, 255, 255, 0.45); background: rgba(0, 39, 76, 0.55); transition: transform 0.25s var(--ease), background 0.25s, border-color 0.25s; }
  .btn:hover { transform: translateY(-2px); border-color: #fff; }
  .btn.primary { background: var(--maize); color: var(--blue); border-color: var(--maize); }
  .btn.primary:hover { background: #ffd84a; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: clamp(48px, 8vw, 88px) 0 0; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius); overflow: hidden; animation: up 0.9s var(--ease) 0.45s both; }
  .stat { background: rgba(0, 39, 76, 0.88); backdrop-filter: blur(6px); padding: 22px 24px 24px; }
  dt { font-family: var(--serif); font-size: clamp(36px, 5vw, 54px); font-weight: 600; color: var(--maize); line-height: 1; margin-bottom: 10px; }
  dd { margin: 0; font-size: 14px; color: #cbd8e6; line-height: 1.45; }
  @keyframes up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

  @media (max-width: 760px) {
    .stats { grid-template-columns: 1fr; }
    .stat { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 14px; padding: 16px 18px; }
    dt { margin: 0; font-size: 34px; }
  }
</style>
