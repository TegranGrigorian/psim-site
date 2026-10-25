<script lang="ts">
  import { reveal } from '../lib/actions';

  const TERMS: [string, string][] = [
    ['Persona', 'A made-up person with a believable mix of traits (student or not, renter or owner, age, income, where they live and go). Nobody real is tracked.'],
    ['Sampling', 'Picking personas at random, but in the same proportions as the real city, like drawing names from a hat filled to match Census numbers.'],
    ['Seed', 'The starting number for the computer’s random draws. Same seed, same result, so anyone can rerun the project and check it.'],
    ['Replicate', 'One complete run of the whole simulation with one seed. This project does 100 of them (seeds 42 to 141).'],
    ['GTFS', 'The standard file format transit agencies use to publish their timetables: every stop, route and scheduled departure. Google Maps reads the same files.'],
    ['OpenStreetMap', 'A free, volunteer-made map of the world. Used here for streets and footpaths, so walking times are realistic.'],
    ['Routing', 'Working out the fastest way from A to B at a given time on the scheduled buses. Done by an open-source tool called R5 (used through r5py).'],
    ['Median', 'The middle value when answers are sorted. Unlike an average, one extreme answer can’t drag it around.'],
    ['Failure', 'A trip with no transit option within the limits (20 minutes of walking, 2 hours in total). It means “no bus option,” not “no way to travel.”'],
    ['95% interval', 'The range where the middle 95 of the 100 runs landed. A narrow range means a steady answer; the whiskers on the results charts show it.'],
    ['Core', 'One of the independent processors inside a computer. A laptop usually has 8 to 16.'],
    ['Thread', 'One line of work running on a core. Several threads can run at the same time.'],
    ['Multi-threading', 'Splitting a big job into pieces that run on several threads at once to finish sooner.'],
    ['Deterministic', 'Gives exactly the same output for the same input every time, regardless of how many threads did the work or in what order.'],
    ['Rust, Python, TypeScript', 'The three programming languages used. Rust is fast and careful (people generation and summaries), Python has the best routing tools, and TypeScript runs websites.'],
    ['Synthetic ≠ real', 'Results show what the system’s design does to a plausible population. Real lateness and crowding come from the field rides, not from this model.'],
  ];
</script>

<div class="g">
  {#each TERMS as [t, d], i}
    <details use:reveal={{ delay: (i % 4) * 50 }} data-reveal>
      <summary>{t}<i aria-hidden="true"></i></summary>
      <p>{d}</p>
    </details>
  {/each}
</div>

<style>
  .g { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: start; }
  details { background: #fff; border: 1px solid var(--rule); border-radius: 12px; transition: border-color 0.25s, box-shadow 0.25s; }
  details[open] { border-color: var(--blue); box-shadow: 0 8px 22px rgba(0, 39, 76, 0.08); }
  summary { list-style: none; cursor: pointer; padding: 14px 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  summary::-webkit-details-marker { display: none; }
  summary i { width: 12px; height: 12px; position: relative; flex: none; }
  summary i::before, summary i::after { content: ''; position: absolute; left: 0; right: 0; top: 5px; height: 2px; background: var(--blue); border-radius: 1px; transition: transform 0.3s var(--ease); }
  summary i::after { transform: rotate(90deg); }
  details[open] summary i::after { transform: rotate(0); }
  p { margin: 0; padding: 0 16px 16px; color: #36424f; font-size: 15px; animation: open 0.35s var(--ease); }
  @keyframes open { from { opacity: 0; transform: translateY(-4px); } }
  @media (max-width: 700px) { .g { grid-template-columns: 1fr; } }
</style>
