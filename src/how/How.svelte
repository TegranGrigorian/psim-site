<script lang="ts">
  import { onMount } from 'svelte';
  import Nav from '../components/Nav.svelte';
  import Footer from '../components/Footer.svelte';
  import Pending from '../components/Pending.svelte';
  import Pipeline from './Pipeline.svelte';
  import Sampling from './Sampling.svelte';
  import Routine from './Routine.svelte';
  import TripStory from './TripStory.svelte';
  import DepartureWindow from './DepartureWindow.svelte';
  import Replicates from './Replicates.svelte';
  import Threads from './Threads.svelte';
  import Aggregate from './Aggregate.svelte';
  import Glossary from './Glossary.svelte';
  import WhySim from './WhySim.svelte';
  import HypothesisTest from './HypothesisTest.svelte';
  import HypothesisCards from '../components/HypothesisCards.svelte';
  import OnTime from './OnTime.svelte';
  import FixIt from './FixIt.svelte';
  import type PlacesComponent from './Places.svelte';
  import type RedesignMapComponent from './RedesignMap.svelte';
  import { h7, tests } from './evidence';
  import { cityShort } from '../lib/report';
  import { nearView, reveal } from '../lib/actions';
  import { hasScenario, loadComparison, loadCore, loadGeo, loadIndex, loadInputs, loadMeta, loadReport, loadScenarioSpec } from '../lib/data';
  import type { Bundle, CityMeta, Comparison, Core, Geo, Index, Report, ScenarioSpec } from '../lib/types';
  import type { Inputs } from './inputs';

  // Only the small baseline summaries load up front. The step 2 map (MapLibre plus the input
  // locations) and anything for scenarios or cities the index doesn't list load on demand or not at all.
  let index = $state<Index>();
  let core = $state<Core>();
  let madison = $state<Core>();
  let baseGeo = $state<Geo>();
  let redesign = $state<Bundle>();
  let comparison = $state<Comparison | null>();
  let spec = $state<ScenarioSpec | null>();
  let report = $state<Report | null>();
  let meta = $state<CityMeta | null>();
  let inputs = $state<Inputs>();
  let Places = $state<typeof PlacesComponent>();
  let RedesignMap = $state<typeof RedesignMapComponent>();
  let error = $state('');
  let progress = $state(0);
  let active = $state('overview');

  const hasRedesign = $derived(hasScenario(index, 'ann_arbor', 'redesign_v1'));
  const hasMadison = $derived(hasScenario(index, 'madison', 'baseline'));

  const STEPS = [
    ['why', 'Why simulate?'],
    ['overview', 'The big picture'],
    ['people', '1 · Make the people'],
    ['places', '2 · Homes and destinations'],
    ['week', '3 · A week of trips'],
    ['ride', '4 · Ride the bus'],
    ['window', '5 · Fair start times'],
    ['repeat', '6 · Do it 100 times'],
    ['threads', '7 · Many workers at once'],
    ['sumup', '8 · Sum it up'],
    ['test', '9 · Test a claim'],
    ['ontime', '10 · On time for class?'],
    ['verdict', '11 · What we’d know'],
    ['fix', '12 · Fixing it'],
    ['words', 'Words to know'],
  ];

  function wantPlaces() {
    Promise.all([import('./Places.svelte'), loadInputs<Inputs>('ann_arbor')])
      .then(([m, inp]) => { inputs = inp; Places = m.default; })
      .catch((e) => (error = `Step 2 map: ${e}`));
  }
  let fixWanted = $state(false);
  $effect(() => {
    // the redesign files (including both scenarios' route maps) only matter once step 12 is near
    if (!fixWanted || !hasRedesign || redesign) return;
    Promise.all([loadCore('ann_arbor', 'redesign_v1'), loadGeo('ann_arbor', 'redesign_v1'), loadGeo('ann_arbor', 'baseline'), loadComparison('ann_arbor', 'redesign_v1'), loadScenarioSpec('ann_arbor', 'redesign_v1'), import('./RedesignMap.svelte')])
      .then(([c, g, bg, cmp, sp, m]) => { baseGeo = bg; comparison = cmp; spec = sp; RedesignMap = m.default; redesign = { ...c, ...g }; })
      .catch((e) => (error = `Step 12: ${e}`));
  });
  $effect(() => {
    if (hasMadison && !madison) loadCore('madison', 'baseline').then((c) => (madison = c)).catch(() => {});
  });

  onMount(() => {
    loadCore('ann_arbor', 'baseline').then((c) => (core = c)).catch((e) => (error = String(e)));
    loadIndex().then((i) => (index = i)).catch((e) => (error = String(e)));
    loadReport().then((r) => (report = r));
    loadMeta('ann_arbor').then((m) => (meta = m));

    const onScroll = () => {
      const h = document.documentElement;
      progress = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    };
    addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (active = e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    queueMicrotask(() => STEPS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); }));
    return () => { removeEventListener('scroll', onScroll); io.disconnect(); };
  });

  const theTests = $derived(core ? tests(core.groupMetrics) : []);
  const nRep = $derived(core?.groupMetrics.n_replicates);

  // Step 11: the report's verdicts (H1-H6), plus H7, which only this page tests, per city.
  const CLAIMS: [string, string][] = [
    ['H1', 'Undergraduates have shorter trips and fewer failures than resident workers, for equal distances.'],
    ['H2', 'Shift workers have the highest failure rate, driven by evening and night service.'],
    ['H3', 'University staff sit closer to students than to other residents.'],
    ['H4', 'Differences between neighborhoods are as large as differences between groups.'],
    ['H5', 'The comparison city shows a different gap, so Ann Arbor’s is not inevitable.'],
    ['H6', 'A targeted redesign helps the worst-served without hurting others.'],
    ['H7', 'Students can rely on the buses to get them to class on time.'],
  ];
  const h7rows = $derived(
    [['Ann Arbor', core], ['Madison', madison]].flatMap(([city, c]) => {
      const r = c ? h7((c as Core).groupMetrics) : null;
      return r ? [{ city: city as string, ...r, note: 'Worked out on this page from the summary files; the project report doesn’t test H7.' }] : [];
    }),
  );
  const SAY: Record<string, string> = {
    supported: 'held up', 'partly supported': 'partly held up', mixed: 'gave mixed results', 'partly contradicted': 'was partly contradicted',
    contradicted: 'did not hold up', inconclusive: 'can’t be decided yet', 'no data': 'is still waiting for data',
  };
  const say = (v: string) => SAY[v] ?? (v.startsWith('contradicted') ? 'did not hold up' : v);
  const soWhat = $derived(CLAIMS.map(([id, claim]) => {
    const rs = [...(report?.hypotheses ?? []).filter((h) => h.id === id).map((h) => ({ city: cityShort(h.city), verdict: h.verdict })), ...(id === 'H7' ? h7rows : [])];
    return { id, claim, text: rs.map((r) => `${say(r.verdict)} ${r.city === 'Both cities' ? 'across the two cities' : `in ${r.city}`}`).join(', ') };
  }).filter((x) => x.text));
  // Step 9: the report's verdict on the same comparison, where it has one
  const reportTests = $derived.by(() => {
    const aa = (id: string) => report?.hypotheses.find((h) => h.id === id && /^Ann Arbor/.test(h.city) && !/\bvs\b/.test(h.city));
    return {
      h2: aa('H2')?.tests.find((t) => t.metric === 'failure_rate' && /undergrad/.test(t.test)),
      h1: aa('H1')?.tests.find((t) => t.metric === 'total_minutes'),
    };
  });
</script>

<div class="bar" style="transform:scaleX({progress})"></div>
<Nav page="how" />

<header class="hero">
  <div class="wrap">
    <p class="eyebrow">How it works</p>
    <h1>A flight simulator<br />for a bus network</h1>
    <p class="sub">
      Instead of surveying thousands of people, this project builds a pretend town full of believable people, sends every one
      of them out on the real bus schedule, and watches who gets where, how long it takes, and who gets stuck. This page walks
      through that, one step at a time, without any code.
    </p>
    <a class="start" href="#why">Start <span aria-hidden="true">↓</span></a>
  </div>
</header>

<nav class="rail" aria-label="Steps">
  {#each STEPS as [id, text]}
    <a href="#{id}" class:on={active === id}><i></i><span>{text}</span></a>
  {/each}
</nav>

<main>
  <section id="why" class="step">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Start here</p>
        <h2>Why simulate, and what are we testing?</h2>
        <p class="lede">
          A simulation is a controlled experiment we can’t run on the real city. Before running it, we write down what we expect,
          in a form the results could prove wrong.
        </p>
      </div>
      <WhySim />
    </div>
  </section>

  <section id="overview" class="step alt">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">The big picture</p>
        <h2>Five stages, three programs</h2>
        <p class="lede">
          Data moves left to right. Real public data goes in; a website comes out. Each box is a separate piece of software
          with one job, so each can be checked on its own. Tap a stage to read what it does.
        </p>
      </div>
      <Pipeline />
    </div>
  </section>

  <section id="people" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 1</p>
        <h2>Make the people</h2>
        <p>
          We can’t follow every real person in Ann Arbor, and we shouldn’t. So we build <b>1,000 “personas”</b>: made-up people
          whose mix matches the real city. If Census and university figures say about 20% of residents are undergraduates, then
          about 200 of our 1,000 will be undergraduates.
        </p>
        <p>
          This is <b>sampling</b>: like drawing names from a hat where the hat holds tickets in the city’s real proportions.
          Each draw is random, so two hats give slightly different towns. That is on purpose, and step 6 uses it.
        </p>
        <div class="aside">
          <b>The seed.</b> Computers can’t flip real coins, so they use a starting number called a <em>seed</em>. The same seed
          always produces exactly the same town, which means anyone can rerun this project and get identical results. Try it.
        </div>
      </div>
      <Sampling />
    </div>
  </section>

  <section id="places" class="step alt">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 2</p>
        <h2>Give everyone a home and a destination</h2>
        <p>
          Each persona gets a <b>home</b> and an <b>anchor</b>: the place they go most, like a job or a classroom building.
          Homes are drawn in proportion to housing: a city block with a 1,500-bed dorm is picked far more often than a block
          of a dozen houses. Workers are matched to workplaces the same way, by number of jobs, and students to campus
          buildings by how big the building is.
        </p>
        <p>
          The locations are real public records: homes from the 2020 Census count of housing on each city block, jobs from the
          Census Bureau’s count of jobs on each block, and campus buildings from OpenStreetMap, the free public map of the world.
        </p>
        <p>Students live in dorms or rentals and head to campus. Staff go to university jobs, shift workers to places with night shifts, and retired residents have no fixed destination. The lines show each person’s main trip.</p>
      </div>
      <div use:nearView={wantPlaces}>
        {#if Places && inputs}<Places {inputs} />{:else}<div class="card wait" style="height:640px">Loading the map…</div>{/if}
      </div>
    </div>
  </section>

  <section id="week" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 3</p>
        <h2>Plan a week of trips</h2>
        <p>
          Next, each persona gets a <b>weekly routine</b>: when they leave for class or work, and when they come home. A night-shift
          nurse leaves at 10 pm and comes home at 7 am. A student goes to class mid-morning. A retired resident runs errands midday.
        </p>
        <p>
          The trip home is written down as its own trip. That matters: a bus that gets you to work but has stopped running by the
          time your shift ends has still failed you.
        </p>
      </div>
      <Routine />
    </div>
  </section>

  <section id="ride" class="step alt">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 4</p>
        <h2>Ride the bus, on paper</h2>
        <p class="lede">
          For every trip, a routing program reads the actual published bus timetable (a file called GTFS) and the street map
          (OpenStreetMap), and finds the fastest way door to door: walk to a stop, wait, ride, maybe transfer, walk the rest.
          It records how many minutes each part takes. If there is no way to make the trip within limits, that is a <b>failure</b>,
          and failures are counted, never thrown away.
        </p>
      </div>
      <TripStory />
    </div>
  </section>

  <section id="window" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 5</p>
        <h2>Don’t trust a single start time</h2>
        <p>
          Leaving at 8:00 versus 8:03 can mean catching a bus or watching it pull away. To be fair, we don’t ask once. We ask
          <b>30 times</b>, once for every minute in a half-hour window, and keep the <b>middle answer</b> (the median).
        </p>
        <p>One unlucky minute can’t make a trip look terrible, and one lucky minute can’t make it look great.</p>
      </div>
      <DepartureWindow />
    </div>
  </section>

  <section id="repeat" class="step alt">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 6</p>
        <h2>Build 100 towns, not one</h2>
        <p>
          One town of 1,000 people could be lucky or unlucky. So the whole thing is repeated <b>100 times</b>, each with a new seed
          (42, 43, 44 … 141), giving 100 slightly different towns.
          {#if nRep && nRep < 100}The results on this site so far come from the first {nRep}{#if meta?.seeds}{' '}(seeds {meta.seeds[0]} to {meta.seeds[1]}){/if}; the rest are still to run.{/if}
        </p>
        <p>
          Each run gives an answer, for example “shift workers failed 26% of trips.” Stacked up, the answers form a pile. The
          shaded band holds the middle 95 of the 100 runs. That is the <b>95% interval</b> shown as whiskers on the results page:
          a narrow band means the answer is steady, and a wide band means it’s less certain.
        </p>
        <p>
          Piles like this almost always take the shape of a <b>bell curve</b> (a normal distribution). Two numbers describe it: the
          average, <b>μ</b> (mu), and the spread, <b>σ</b> (sigma, the standard deviation). About 68 of 100 runs land within one σ of
          the average, and about 95 within two.
        </p>
      </div>
      <Replicates />
    </div>
  </section>

  <section id="threads" class="step dark">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 7 · under the hood</p>
        <h2>Many workers at once</h2>
        <p class="lede">
          100 towns × 1,000 people × about 10 trips each is around a million trip calculations. Done one after another, that takes
          hours. A modern computer has several <b>cores</b>, separate “brains” that can each work on something at the same time.
          A <b>thread</b> is one line of work given to a core. Splitting the job across threads is called <b>multi-threading</b>.
        </p>
      </div>
      <Threads />
    </div>
  </section>

  <section id="sumup" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 8</p>
        <h2>Sum it up, then show it</h2>
        <p>
          A million trip results are too many to read. The last program sorts every trip into its persona’s group and averages
          them: travel time, wait time, transfers, and how often the trip failed. It does this per group, per neighborhood and
          per hour of the day.
        </p>
        <p>
          Those small summary files are all this website reads. Nothing on the results page is typed in by hand; it is drawn
          straight from them.
        </p>
        <a class="cta" href="./index.html#gap">See the results →</a>
      </div>
      {#if core}<Aggregate metrics={core.groupMetrics} />{:else}<div class="card wait" style="height:420px">{error ? 'The summary file could not be loaded.' : 'Loading…'}</div>{/if}
    </div>
  </section>

  <section id="test" class="step alt">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 9 · the payoff</p>
        <h2>Testing a claim: good result or bad?</h2>
        <p class="lede">
          For riders, a <b>good result</b> is no gap: everyone is equally likely to get where they need to go. A <b>bad result</b> is
          a large, reliable gap. The test below asks how far our simulated gap is from “fair,” measured in standard errors, and how
          likely a gap that size would be if the network really were fair. Click through the five steps, or pick another comparison.
        </p>
      </div>
      {#if theTests.length}
        <HypothesisTest tests={theTests} {reportTests} />
      {:else if core}
        <Pending>The summary files don’t yet have the numbers this test needs. It will appear after the next simulation run.</Pending>
      {:else}<div class="card wait" style="height:560px">{error ? 'The summary file could not be loaded.' : 'Loading…'}</div>{/if}
    </div>
  </section>

  <section id="ontime" class="step">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 10 · H7</p>
        <h2>Can students count on the bus to get to class on time?</h2>
        <p class="lede">
          A claim people make about Ann Arbor’s buses is that students can rely on them. “Rely on” needs a number before we look,
          or it can be bent to fit any result. Here it means at least 95 of every 100 class trips arrive with five minutes to spare
          (you can move the bar to see how much the answer depends on it).
        </p>
      </div>
      {#if core}<OnTime metrics={core.groupMetrics} onTimeShare={meta?.on_time_share ?? null} />{/if}
    </div>
  </section>

  <section id="verdict" class="step alt">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 11</p>
        <h2>What we’d know</h2>
        <p class="lede">
          Each hypothesis from the top of the page, with its verdict and the numbers behind it. Hypotheses 1 to 6 are judged by the
          project’s report, which compares every simulation run’s results; hypothesis 7 is worked out on this page. They update
          after every simulation run. These runs are preliminary (fewer than planned, and input data still being checked), so read
          them as a first look, not a conclusion.
        </p>
      </div>
      {#if core}
        <HypothesisCards claims={CLAIMS} {report} extra={{ H7: h7rows }} />
        <div class="meaning" use:reveal data-reveal>
          <p class="num">So what?</p>
          <ul>
            {#each soWhat as v}
              <li><b>{v.id}</b> {v.text}: {v.claim.charAt(0).toLowerCase() + v.claim.slice(1)}</li>
            {/each}
          </ul>
          <div class="todo">
            <b>Interpretation</b>
            <p>Placeholder. The author’s own reading of what these results mean for the student and resident imaginaries of Ann Arbor goes here once the full set of simulation runs is done.</p>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <section id="fix" class="step">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Step 12</p>
        <h2>How could we fix it?</h2>
        <p class="lede">
          The same simulation that finds the problem can test a fix before anyone spends money on it: find where trips fail,
          change the timetable there, rerun the exact same towns, and compare.
        </p>
      </div>
      <div use:nearView={() => (fixWanted = true)}>
        {#if core}<FixIt before={core} beforeGeo={baseGeo} after={redesign} {comparison} {spec} {RedesignMap} />{/if}
      </div>
    </div>
  </section>

  <section id="words" class="step alt">
    <div class="wrap">
      <div class="head" use:reveal data-reveal>
        <p class="num">Reference</p>
        <h2>Words to know</h2>
      </div>
      <Glossary />
    </div>
  </section>
</main>

<Footer />

<style>
  .bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: var(--maize); transform-origin: left; z-index: 60; }
  .hero { background: var(--blue); color: #fff; padding: clamp(64px, 11vw, 130px) 0 clamp(56px, 8vw, 96px); position: relative; overflow: hidden; }
  .hero::after { content: ''; position: absolute; right: -10%; top: -30%; width: 60%; aspect-ratio: 1; border-radius: 50%; border: 2px dashed rgba(255, 203, 5, 0.25); animation: spin 90s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .eyebrow { color: var(--maize); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; margin-bottom: 20px; }
  h1 { font-size: clamp(44px, 8vw, 96px); letter-spacing: -0.03em; line-height: 0.98; }
  .sub { max-width: 60ch; color: #d6e0ec; font-size: clamp(17px, 2vw, 20px); margin: 26px 0 30px; }
  .start { display: inline-flex; gap: 10px; align-items: center; background: var(--maize); color: var(--blue); font-weight: 600; text-decoration: none; padding: 12px 22px; border-radius: 999px; transition: transform 0.25s var(--ease); }
  .start:hover { transform: translateY(-2px); }
  .start span { display: inline-block; animation: bob 1.6s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(3px); } }

  .rail { position: fixed; left: 18px; top: 50%; transform: translateY(-50%); display: grid; gap: 4px; z-index: 40; }
  .rail a { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--muted); font-size: 12px; padding: 3px 0; }
  .rail i { width: 8px; height: 8px; border-radius: 50%; background: #cbc6b6; transition: transform 0.3s var(--ease), background 0.3s; flex: none; }
  .rail span { opacity: 0; transform: translateX(-6px); transition: opacity 0.25s, transform 0.25s var(--ease); white-space: nowrap; background: var(--paper); padding: 2px 6px; border-radius: 6px; }
  .rail:hover span, .rail a.on span { opacity: 1; transform: none; }
  .rail a.on { color: var(--blue); font-weight: 600; }
  .rail a.on i { background: var(--blue); transform: scale(1.5); }
  @media (max-width: 1340px) { .rail { display: none; } }

  .step { padding: clamp(64px, 10vw, 120px) 0; border-top: 1px solid var(--rule); }
  .step.alt { background: #efece2; }
  .step.dark { background: #0a1f38; color: #e6edf5; border-top: 0; }
  .step.dark .lede { color: #b8c7d8; }
  .step.dark .num { color: var(--maize); }
  .num { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: var(--orange); margin-bottom: 12px; }
  .step h2 { font-size: clamp(30px, 4.6vw, 48px); margin-bottom: 18px; max-width: 20ch; }
  .head { margin-bottom: 36px; }
  .lede { font-size: clamp(16px, 1.8vw, 18.5px); color: #36424f; max-width: 70ch; }
  .two { display: grid; grid-template-columns: 5fr 7fr; gap: clamp(28px, 5vw, 64px); align-items: start; }
  .text { position: sticky; top: 96px; }
  .text p:not(.num) { color: #36424f; font-size: 16.5px; }
  .aside { background: var(--maize-soft); border-left: 3px solid var(--maize); padding: 14px 16px; border-radius: 0 10px 10px 0; font-size: 15px; color: #3b3200; }
  .cta { display: inline-block; margin-top: 8px; font-weight: 600; color: var(--blue); text-decoration: none; border-bottom: 2px solid var(--maize); padding-bottom: 2px; }
  .meaning { margin-top: 28px; background: #fff; border: 1px solid var(--rule); border-radius: var(--radius); padding: clamp(18px, 3vw, 28px); }
  .meaning ul { margin: 0 0 18px; padding-left: 1.1em; display: grid; gap: 6px; color: #36424f; }
  .meaning li b { color: var(--blue); margin-right: 4px; }
  .todo { border: 2px dashed var(--rule); border-radius: 12px; padding: 14px 16px; }
  .todo p { margin: 4px 0 0; color: var(--muted); font-size: 15px; }
  .wait { display: grid; place-items: center; color: var(--muted); font-size: 14px; background: linear-gradient(100deg, #fff 30%, #f3f0e6 50%, #fff 70%) 0 0 / 300% 100%; animation: shimmer 1.6s linear infinite; }
  @keyframes shimmer { to { background-position: -150% 0; } }
  @media (max-width: 900px) { .two { grid-template-columns: 1fr; } .text { position: static; } }
</style>
