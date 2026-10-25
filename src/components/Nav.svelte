<script lang="ts">
  import { app } from '../lib/state.svelte';
  import type { CityIndex } from '../lib/types';

  let { cities = [], page = 'home' }: { cities?: CityIndex[]; page?: 'home' | 'how' } = $props();
  let open = $state(false);
  let scrolled = $state(false);
  const home = $derived(page === 'home' ? '' : './index.html');
  const links = $derived([
    [`${home}#gap`, 'The gap'], [`${home}#where`, 'Where'], [`${home}#when`, 'When'], [`${home}#redesign`, 'Redesign'], [`${home}#elsewhere`, 'Elsewhere'],
  ]);

  function pick(slug: string) {
    app.city = slug;
    if (!cities.find((c) => c.slug === slug)?.scenarios.includes(app.scenario)) app.scenario = 'baseline';
  }
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 24)} />

<nav class:scrolled>
  <div class="wrap bar">
    <a class="brand" href={page === 'home' ? '#top' : './index.html'} aria-label="Who is the bus for? home"><i></i>psim</a>
    <ul class:open>
      {#each links as [href, text]}
        <li><a {href} onclick={() => (open = false)}>{text}</a></li>
      {/each}
      <li><a class="how" class:here={page === 'how'} href="./how.html" onclick={() => (open = false)}>How it works</a></li>
    </ul>
    {#if cities.length}
    <select aria-label="City" value={app.city} onchange={(e) => pick(e.currentTarget.value)}>
      {#each cities as c}<option value={c.slug}>{c.display_name}</option>{/each}
    </select>
    {/if}
    <button class="burger" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}><span></span><span></span></button>
  </div>
</nav>

<style>
  nav { position: sticky; top: 0; z-index: 50; transition: background 0.3s, box-shadow 0.3s; background: var(--blue); color: #fff; }
  nav.scrolled { box-shadow: 0 6px 24px rgba(0, 39, 76, 0.25); }
  .bar { display: flex; align-items: center; gap: 22px; height: 58px; }
  .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font-family: var(--serif); font-weight: 650; font-size: 21px; margin-right: auto; }
  .brand i { width: 22px; height: 22px; border-radius: 6px; background: var(--maize) linear-gradient(135deg, transparent 45%, var(--blue) 46% 56%, transparent 57%); display: block; }
  ul { display: flex; gap: 4px; list-style: none; margin: 0; padding: 0; }
  ul a { display: block; text-decoration: none; padding: 8px 12px; border-radius: 999px; font-size: 14px; font-weight: 500; color: #cfdbe9; transition: color 0.2s, background 0.2s; }
  ul a:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
  ul a.how { color: var(--maize); }
  ul a.here { background: rgba(255, 203, 5, 0.14); }
  select { background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; padding: 7px 12px; font: inherit; font-size: 14px; }
  select option { color: #000; }
  .burger { display: none; background: none; border: 0; width: 40px; height: 40px; position: relative; }
  .burger span { position: absolute; left: 9px; right: 9px; height: 2px; background: #fff; transition: transform 0.3s var(--ease), top 0.3s var(--ease); }
  .burger span:first-child { top: 15px; } .burger span:last-child { top: 23px; }
  .burger[aria-expanded='true'] span:first-child { top: 19px; transform: rotate(45deg); }
  .burger[aria-expanded='true'] span:last-child { top: 19px; transform: rotate(-45deg); }
  @media (max-width: 860px) {
    .bar { gap: 10px; }
    .burger { display: block; order: 3; }
    ul { position: absolute; top: 58px; left: 0; right: 0; flex-direction: column; background: var(--blue); padding: 8px var(--gutter) 18px; border-top: 1px solid rgba(255, 255, 255, 0.12); clip-path: inset(0 0 100% 0); visibility: hidden; transition: clip-path 0.4s var(--ease), visibility 0.4s; }
    ul.open { clip-path: inset(0 0 0 0); visibility: visible; }
    ul a { font-size: 17px; padding: 12px 8px; border-radius: 8px; }
  }
</style>
