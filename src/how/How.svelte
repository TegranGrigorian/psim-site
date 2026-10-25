<script lang="ts">
  import { onMount } from 'svelte';
  import Nav from '../components/Nav.svelte';
  import Footer from '../components/Footer.svelte';
  import Pipeline from './Pipeline.svelte';
  import Sampling from './Sampling.svelte';
  import Places from './Places.svelte';
  import Routine from './Routine.svelte';
  import TripStory from './TripStory.svelte';
  import DepartureWindow from './DepartureWindow.svelte';
  import Replicates from './Replicates.svelte';
  import Threads from './Threads.svelte';
  import Aggregate from './Aggregate.svelte';
  import Glossary from './Glossary.svelte';
  import { reveal } from '../lib/actions';
  import { loadBundle } from '../lib/data';
  import type { Bundle } from '../lib/types';
  import type { Inputs } from './inputs';

  let bundle = $state<Bundle>();
  let inputs = $state<Inputs>();
  let progress = $state(0);
  let active = $state('overview');

  const STEPS = [
    ['overview', 'The big picture'],
    ['people', '1 · Make the people'],
    ['places', '2 · Homes and destinations'],
    ['week', '3 · A week of trips'],
    ['ride', '4 · Ride the bus'],
    ['window', '5 · Fair start times'],
    ['repeat', '6 · Do it 100 times'],
    ['threads', '7 · Many workers at once'],
    ['sumup', '8 · Sum it up'],
    ['words', 'Words to know'],
  ];

  onMount(() => {
    const base = `${import.meta.env.BASE_URL}data/ann_arbor`;
    loadBundle('ann_arbor', 'baseline').then((b) => (bundle = b));
    fetch(`${base}/inputs.json`).then((r) => r.json()).then((j) => (inputs = j)).catch(() => {});

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
    <a class="start" href="#overview">Start <span aria-hidden="true">↓</span></a>
  </div>
</header>

<nav class="rail" aria-label="Steps">
  {#each STEPS as [id, text]}
    <a href="#{id}" class:on={active === id}><i></i><span>{text}</span></a>
  {/each}
</nav>

<main>
  <section id="overview" class="step">
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

  <section id="people" class="step alt">
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

  <section id="places" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 2</p>
        <h2>Give everyone a home and a destination</h2>
        <p>
          Each persona gets a <b>home</b> and an <b>anchor</b>: the place they go most, like a job or a classroom building.
          Homes come from housing data; a dorm with 1,500 beds is picked far more often than a street of 200 houses.
          Workers are matched to workplaces the same way, by number of jobs.
        </p>
        <p>Undergraduates mostly land in dorms near campus. Shift workers end up at hospitals, malls and warehouses. The lines show each person’s main trip.</p>
      </div>
      {#if inputs && bundle}<Places {inputs} {bundle} />{/if}
    </div>
  </section>

  <section id="week" class="step alt">
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

  <section id="ride" class="step">
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

  <section id="window" class="step alt">
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

  <section id="repeat" class="step">
    <div class="wrap two">
      <div class="text" use:reveal data-reveal>
        <p class="num">Step 6</p>
        <h2>Build 100 towns, not one</h2>
        <p>
          One town of 1,000 people could be lucky or unlucky. So the whole thing is repeated <b>100 times</b>, each with a new seed
          (42, 43, 44 … 141), giving 100 slightly different towns.
        </p>
        <p>
          Each run gives an answer, for example “shift workers failed 26% of trips.” Stacked up, the answers form a pile. The
          shaded band holds the middle 95 of the 100 runs. That is the <b>95% interval</b> shown as whiskers on the results page:
          a narrow band means the answer is steady, and a wide band means it’s less certain.
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
      {#if bundle}<Aggregate {bundle} />{/if}
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
  @media (max-width: 900px) { .two { grid-template-columns: 1fr; } .text { position: static; } }
</style>
