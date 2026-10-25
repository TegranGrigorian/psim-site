<script lang="ts">
  const GH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z';
  const IN = 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';

  const repos = [
    { href: 'https://github.com/TegranGrigorian/psim', name: 'psim', what: 'Project home: plan, schema, data' },
    { href: 'https://github.com/TegranGrigorian/psim-tools', name: 'psim-tools', what: 'Rust: generates personas, aggregates results' },
    { href: 'https://github.com/TegranGrigorian/psim-site', name: 'psim-site', what: 'This website' },
  ];
</script>

<footer id="about">
  <div class="wrap grid">
    <div class="me">
      <p class="k">About</p>
      <h2>Tegran Grigorian</h2>
      <p>
        Student at the University of Michigan, College of Engineering. This project was made for HISTART 394 and asks who
        Ann Arbor’s transit is built around, using fieldwork, archives and a simulation.
      </p>
      <div class="social">
        <a href="https://www.linkedin.com/in/tegran-grigorian/" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24"><path d={IN} /></svg><span>LinkedIn</span>
        </a>
        <a href="https://portfolio.tegrangrigorian.work/" target="_blank" rel="noopener" aria-label="Portfolio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c2.8 3 4 6.4 4 10s-1.2 7-4 10c-2.8-3-4-6.4-4-10s1.2-7 4-10z" /></svg><span>Portfolio</span>
        </a>
        <a href="https://github.com/TegranGrigorian" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 16 16"><path d={GH} /></svg><span>GitHub</span>
        </a>
      </div>
    </div>

    <div>
      <p class="k">Source code</p>
      <ul class="repos">
        {#each repos as r}
          <li>
            <a href={r.href} target="_blank" rel="noopener">
              <svg viewBox="0 0 16 16"><path d={GH} /></svg>
              <span><b>{r.name}</b><small>{r.what}</small></span>
              <i aria-hidden="true">↗</i>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
  <div class="wrap fine">
    <p>Who Is the Bus For? · HISTART 394 · University of Michigan · <a href="./how.html">How it works</a> · <a href="./docs.html">Docs</a></p>
    <p>The simulation code and analysis are the author’s own work. This website was built with an agentic AI assistant, as disclosed in the project’s AI policy.</p>
  </div>
</footer>

<style>
  footer { background: var(--blue); color: #cfdbe9; padding: clamp(56px, 8vw, 88px) 0 32px; }
  .grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(32px, 6vw, 80px); }
  .k { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: var(--maize); margin-bottom: 14px; }
  h2 { color: #fff; font-size: clamp(30px, 4vw, 42px); margin-bottom: 14px; }
  .me p:not(.k) { max-width: 46ch; }
  .social { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
  .social a { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.22); color: #fff; font-size: 14px; font-weight: 600; transition: background 0.25s, border-color 0.25s, transform 0.25s var(--ease); }
  .social a:hover { background: var(--maize); border-color: var(--maize); color: var(--blue); transform: translateY(-2px); }
  svg { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .social svg[fill='none'] { fill: none; }
  .repos { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .repos a { display: flex; align-items: center; gap: 14px; text-decoration: none; padding: 14px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); transition: background 0.25s, border-color 0.25s; }
  .repos a:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 203, 5, 0.6); }
  .repos svg { width: 22px; height: 22px; color: #fff; }
  .repos span { display: grid; flex: 1; }
  .repos b { color: #fff; font-weight: 600; }
  .repos small { color: #94a8c0; font-size: 13px; }
  .repos i { font-style: normal; color: var(--maize); transition: transform 0.25s var(--ease); }
  .repos a:hover i { transform: translate(3px, -3px); }
  .fine { margin-top: 56px; padding-top: 22px; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: 13px; color: #94a8c0; }
  .fine p { margin: 0 0 6px; }
  .fine a { color: #cfdbe9; }
  @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
</style>
