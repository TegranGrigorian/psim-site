<script lang="ts">
  import { onMount } from 'svelte';
  import Nav from '../components/Nav.svelte';
  import Footer from '../components/Footer.svelte';
  import Code from './Code.svelte';
  import OsTabs from './OsTabs.svelte';
  import Markdown from './Markdown.svelte';

  const GH = 'https://github.com/TegranGrigorian';
  const SECTIONS = [
    ['overview', 'Overview'],
    ['start', 'Getting started'],
    ['prereq', 'Prerequisites', 1],
    ['clone', 'Get the code', 1],
    ['site', 'Run the website', 1],
    ['tools', 'Build psim-tools', 1],
    ['engine', 'psim-engine', 1],
    ['pipeline', 'Full pipeline', 1],
    ['data', 'Using your own data'],
    ['internals', 'Website internals'],
    ['contract', 'Data the site reads'],
    ['deploy', 'Deploy to GitHub Pages'],
    ['trouble', 'Troubleshooting'],
    ['ref', 'Reference: PLAN & SCHEMA'],
    ['credits', 'Credits & licenses'],
  ] as [string, string, number?][];
  let active = $state('overview');
  let refTab = $state<'SCHEMA.md' | 'PLAN.md'>('SCHEMA.md');

  onMount(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (active = e.target.id)), { rootMargin: '-20% 0px -70% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  });

  // Every command shown on the page, in one place.
  const C = {
    debian: `sudo apt update
sudo apt install -y git curl build-essential pkg-config python3 python3-venv openjdk-21-jdk
# Node.js (LTS) through nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install --lts
# Rust through rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"`,
    arch: `sudo pacman -S --needed git base-devel nodejs npm rustup python jdk21-openjdk
rustup default stable`,
    fedora: `sudo dnf install -y git gcc nodejs npm python3 java-21-openjdk-devel
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"`,
    mac: `xcode-select --install          # compilers and git
# Homebrew, if you don't have it: https://brew.sh
brew install node python@3.12 openjdk@21
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"`,
    win: `# PowerShell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
winget install --id Microsoft.OpenJDK.21 -e
winget install --id Rustlang.Rustup -e
# Rust on Windows needs the MSVC C++ build tools
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
# then close and reopen PowerShell`,
    verify: `git --version
node --version     # 20 or newer
npm --version
cargo --version    # 1.85 or newer (psim-tools uses Rust edition 2024)
python3 --version  # 3.11 or newer  (Windows: python --version)
java -version      # 21 or newer, only needed for psim-engine`,
    clone: `git clone ${GH}/psim.git
cd psim
git clone ${GH}/psim-tools.git
git clone ${GH}/psim-site.git
# psim-engine is not published yet`,
    site: `cd psim-site
npm install
npm run fake-data   # writes clearly-flagged sample summaries into ../data
npm run dev         # http://localhost:5173`,
    phone: `npm run dev -- --host   # then open the "Network:" address on your phone`,
    build: `npm run build      # static site in dist/
npm run preview    # serve dist/ locally to check it`,
    toolsBuild: `cd psim-tools
cargo build --release
cargo test`,
    toolsNow: `# what exists today
./target/release/psim-tools --help
./target/release/psim-tools generate --count 1000
./target/release/psim-tools analyze --input <file>
./target/release/psim-tools test --test_json_parse`,
    toolsNowWin: `# what exists today
.\\target\\release\\psim-tools.exe --help
.\\target\\release\\psim-tools.exe generate --count 1000
.\\target\\release\\psim-tools.exe analyze --input <file>`,
    toolsPlanned: `# planned interface (PLAN.md), not implemented yet
psim-tools generate --city ann_arbor --scenario baseline --seed 42
psim-tools analyze  --city ann_arbor --scenario baseline
psim-tools analyze  --city ann_arbor --compare baseline redesign_v1`,
    engineUnix: `# placeholder: psim-engine is not published yet
cd psim-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -e .          # pulls in r5py, geopandas, pyarrow
psim-engine run --city ann_arbor --run-id baseline_s0042`,
    engineWin: `# placeholder: psim-engine is not published yet
cd psim-engine
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -e .
psim-engine run --city ann_arbor --run-id baseline_s0042`,
    pipelineUnix: `# placeholder: the full baseline, 100 replicates (seeds 42..141)
for seed in $(seq 42 141); do
  run_id=$(printf "baseline_s%04d" "$seed")
  psim-tools generate --city ann_arbor --scenario baseline --seed "$seed"
  psim-engine run --city ann_arbor --run-id "$run_id"
done
psim-tools analyze --city ann_arbor --scenario baseline
cd psim-site && npm run build`,
    pipelineWin: `# placeholder: the full baseline, 100 replicates (seeds 42..141)
foreach ($seed in 42..141) {
  $runId = "baseline_s{0:D4}" -f $seed
  psim-tools generate --city ann_arbor --scenario baseline --seed $seed
  psim-engine run --city ann_arbor --run-id $runId
}
psim-tools analyze --city ann_arbor --scenario baseline
cd psim-site; npm run build`,
    tree: `data/<city>/
  config.json            # city settings and simulation parameters
  housing.csv            # homes (prepared inputs)
  workplaces.csv
  campus_locations.csv
  raw/                   # downloads, not committed when large
    gtfs/<agency>/       # unzipped GTFS feeds
    osm.pbf
  generated/<run_id>/    # psim-tools generate
  results/<run_id>/      # psim-engine
  summaries/<scenario>/  # psim-tools analyze -> read by the website`,
    gtfs: `mkdir -p data/ann_arbor/raw/gtfs/theride data/ann_arbor/raw/gtfs/umich
curl -L -o /tmp/theride.zip https://www.theride.org/sites/default/files/google/google_transit.zip
curl -L -o /tmp/umich.zip https://webapps.fo.umich.edu/transit_uploads/google_transit.zip
unzip -o /tmp/theride.zip -d data/ann_arbor/raw/gtfs/theride
unzip -o /tmp/umich.zip   -d data/ann_arbor/raw/gtfs/umich`,
    osm: `# Michigan extract from Geofabrik, then cut to the city with osmium-tool
curl -L -o /tmp/michigan.osm.pbf https://download.geofabrik.de/north-america/us/michigan-latest.osm.pbf
osmium extract -b -83.85,42.20,-83.62,42.34 /tmp/michigan.osm.pbf -o data/ann_arbor/raw/osm.pbf`,
    shapes: `cd psim-site
node scripts/gtfs-routes.mjs ann_arbor theride=../data/ann_arbor/raw/gtfs/theride umich=../data/ann_arbor/raw/gtfs/umich
node scripts/road-paths.mjs ann_arbor    # road paths for the How page (calls the public OSRM server, ~3 min)
npm run fake-data`,
    layout: `psim-site/
  index.html, how.html, docs.html   # the three pages
  src/
    App.svelte          # results page
    how/                # How it works page and its animations
    docs/               # this page
    components/         # shared: Nav, Footer, Hero, charts, map
    lib/                # data loading, formatting, stats, RNG, map helpers
  scripts/
    make-fake-data.mjs  # sample summaries (flagged "fake": true)
    sync-data.mjs       # ../data/**/summaries -> public/data, ../docs -> public/ref
    gtfs-routes.mjs     # GTFS feeds -> scripts/shapes/<city>_routes.geojson
    road-paths.mjs      # OSRM road paths -> public/how/<city>_paths.json
  public/               # static files; data/ and ref/ are generated, not committed`,
    workflowPath: `.github/workflows/deploy.yml`,
    pushData: `cd psim
git add data/*/summaries data/summaries_index.json
git commit -m "Update summaries"
git push`,
  };
  const WORKFLOW = `name: Deploy site

on:
  push:
    branches: [master]
  workflow_dispatch:      # run by hand after pushing new data to the psim repo

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out psim (data and docs)
        uses: actions/checkout@v4
        with:
          repository: TegranGrigorian/psim
          path: psim
      - name: Check out psim-site
        uses: actions/checkout@v4
        with:
          path: psim/psim-site
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: psim/psim-site/package-lock.json
      - run: npm ci
        working-directory: psim/psim-site
      - run: npm run build
        working-directory: psim/psim-site
      - uses: actions/upload-pages-artifact@v3
        with:
          path: psim/psim-site/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`;
</script>

<Nav page="docs" />

<header class="hero">
  <div class="wrap">
    <p class="eyebrow">Documentation</p>
    <h1>psim, for developers</h1>
    <p>How the pieces fit, how to run them on your machine, how to bring your own city’s data, and how the website is built and deployed.
      For the plain-language version, see <a href="./how.html">How it works</a>.</p>
  </div>
</header>

<div class="wrap layout">
  <nav class="side" aria-label="Documentation sections">
    {#each SECTIONS as [id, text, sub]}
      <a href="#{id}" class:sub class:on={active === id}>{text}</a>
    {/each}
  </nav>

  <article class="doc">
    <section id="overview">
      <h2>Overview</h2>
      <p>psim simulates a synthetic population riding Ann Arbor’s real bus timetables, then compares groups. It is three programs connected by plain files, with the file formats fixed in <code>SCHEMA.md</code>.</p>
      <div class="flow">
        <span>Public data</span><i>→</i><span><b>psim-tools generate</b><small>Rust</small></span><i>→</i><span><b>psim-engine</b><small>Python + R5</small></span><i>→</i><span><b>psim-tools analyze</b><small>Rust</small></span><i>→</i><span><b>psim-site</b><small>TypeScript</small></span>
      </div>
      <table>
        <thead><tr><th>Component</th><th>Language</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td><a href="{GH}/psim" target="_blank" rel="noopener">psim</a></td><td>—</td><td>Plan, schema, city data, summaries</td><td><em class="st ok">Active</em></td></tr>
          <tr><td><a href="{GH}/psim-tools" target="_blank" rel="noopener">psim-tools</a></td><td>Rust</td><td><code>generate</code> personas and trips; <code>analyze</code> results into summaries</td><td><em class="st wip">In progress</em></td></tr>
          <tr><td>psim-engine</td><td>Python (r5py)</td><td>Routes every trip over GTFS + OpenStreetMap</td><td><em class="st plan">Planned</em></td></tr>
          <tr><td><a href="{GH}/psim-site" target="_blank" rel="noopener">psim-site</a></td><td>TypeScript, Svelte</td><td>This static website</td><td><em class="st ok">Working on sample data</em></td></tr>
        </tbody>
      </table>
      <p class="note">Anything marked <b>placeholder</b> below describes the planned interface from <code>PLAN.md</code>; it will change as the tools are built.</p>
    </section>

    <section id="start">
      <h2>Getting started</h2>
      <p>You need Git and Node.js to run the website. Rust is for <code>psim-tools</code>; Python and Java 21 are only for <code>psim-engine</code>. Pick your system; the choice applies to every block on the page.</p>
    </section>

    <section id="prereq">
      <h3>1. Install the prerequisites</h3>
      <OsTabs>
        {#snippet linux()}
          <Code title="Debian / Ubuntu" code={C.debian} />
          <Code title="Arch" code={C.arch} />
          <Code title="Fedora" code={C.fedora} />
        {/snippet}
        {#snippet mac()}<Code title="macOS (Terminal)" code={C.mac} />{/snippet}
        {#snippet windows()}<Code title="Windows (PowerShell)" lang="powershell" code={C.win} />{/snippet}
      </OsTabs>
      <p>Check everything is on your <code>PATH</code>:</p>
      <Code title="verify" code={C.verify} />
    </section>

    <section id="clone">
      <h3>2. Get the code</h3>
      <p>The project is one folder holding several repositories. The website and tools expect to sit next to <code>data/</code> and <code>docs/</code>.</p>
      <Code code={C.clone} />
    </section>

    <section id="site">
      <h3>3. Run the website</h3>
      <p>Works today, on clearly labelled sample data.</p>
      <Code code={C.site} />
      <p>To view it from a phone on the same Wi-Fi:</p>
      <Code code={C.phone} />
      <p>Production build:</p>
      <Code code={C.build} />
    </section>

    <section id="tools">
      <h3>4. Build psim-tools</h3>
      <Code code={C.toolsBuild} />
      <OsTabs>
        {#snippet linux()}<Code title="current commands" code={C.toolsNow} />{/snippet}
        {#snippet mac()}<Code title="current commands" code={C.toolsNow} />{/snippet}
        {#snippet windows()}<Code title="current commands" lang="powershell" code={C.toolsNowWin} />{/snippet}
      </OsTabs>
      <Code title="placeholder" code={C.toolsPlanned} />
      <p>Every run is a function of its inputs and a seed. The project’s base seed is 42, and replicate <i>i</i> uses seed 42 + <i>i</i>, so the same command always gives byte-identical output.</p>
    </section>

    <section id="engine">
      <h3>5. psim-engine <em class="st plan">Planned</em></h3>
      <p>Routes each trip with r5py, which runs Conveyal R5 on Java 21, over the GTFS feeds and an OpenStreetMap extract.</p>
      <OsTabs>
        {#snippet linux()}<Code title="placeholder" code={C.engineUnix} />{/snippet}
        {#snippet mac()}<Code title="placeholder" code={C.engineUnix} />{/snippet}
        {#snippet windows()}<Code title="placeholder" lang="powershell" code={C.engineWin} />{/snippet}
      </OsTabs>
    </section>

    <section id="pipeline">
      <h3>6. Full pipeline <em class="st plan">Placeholder</em></h3>
      <OsTabs>
        {#snippet linux()}<Code title="bash" code={C.pipelineUnix} />{/snippet}
        {#snippet mac()}<Code title="zsh / bash" code={C.pipelineUnix} />{/snippet}
        {#snippet windows()}<Code title="PowerShell" lang="powershell" code={C.pipelineWin} />{/snippet}
      </OsTabs>
    </section>

    <section id="data">
      <h2>Using your own data</h2>
      <p>Every city uses the same folder layout and file names, so no code changes per city.</p>
      <Code title="layout" lang="text" code={C.tree} />
      <h3>Input tables</h3>
      <table>
        <thead><tr><th>File</th><th>One row per</th><th>Key columns</th></tr></thead>
        <tbody>
          <tr><td><code>housing.csv</code></td><td>home or building</td><td><code>housing_id, lat, lon, tenure, building_type, units, neighborhood, tract_geoid</code></td></tr>
          <tr><td><code>workplaces.csv</code></td><td>employer location</td><td><code>workplace_id, lat, lon, sector, jobs, shift_pattern, is_university</code></td></tr>
          <tr><td><code>campus_locations.csv</code></td><td>class location</td><td><code>campus_id, lat, lon, campus_zone, capacity_weight</code></td></tr>
          <tr><td><code>config.json</code></td><td>city</td><td>bbox, GTFS folders per scenario, service date, limits, <code>group_shares</code></td></tr>
        </tbody>
      </table>
      <p>Full column rules (types, enums, units) are in <a href="#ref">SCHEMA.md</a>. Coordinates are WGS84; IDs are strings; missing values are empty fields, never <code>NA</code> or <code>-1</code>.</p>
      <h3>Transit timetables (GTFS)</h3>
      <Code code={C.gtfs} />
      <h3>Street network (OpenStreetMap)</h3>
      <Code code={C.osm} />
      <h3>Refresh the website’s map layers</h3>
      <p>Route lines and the How page’s road paths are cached files, so the site never calls these services at runtime. Rebuild them after changing feeds or inputs:</p>
      <Code code={C.shapes} />
      <h3>Adding another city</h3>
      <ol>
        <li>Create <code>data/&lt;city_slug&gt;/</code> with the three CSVs and <code>config.json</code>.</li>
        <li>Download its GTFS feeds and OSM extract into <code>raw/</code>.</li>
        <li>Run the pipeline for it; summaries land in <code>data/&lt;city_slug&gt;/summaries/</code>.</li>
        <li>Add the city to <code>data/summaries_index.json</code> (slug, display name, bbox, scenarios). It then appears in the website’s city picker.</li>
      </ol>
    </section>

    <section id="internals">
      <h2>Website internals</h2>
      <p>A static site with no backend: <b>Svelte 5</b> and <b>TypeScript</b>, built by <b>Vite</b> into plain HTML, CSS and JS. Maps use <b>MapLibre GL</b>, equations <b>KaTeX</b>, and fonts are self-hosted (Inter, Fraunces).</p>
      <Code title="psim-site" lang="text" code={C.layout} />
      <h3>Pages</h3>
      <table>
        <tbody>
          <tr><td><code>index.html</code></td><td>Results: group gaps, neighborhood map, time-of-day heatmap, redesign, comparison city.</td></tr>
          <tr><td><code>how.html</code></td><td>Plain-language walkthrough with animations, hypothesis tests and verdicts.</td></tr>
          <tr><td><code>docs.html</code></td><td>This page.</td></tr>
        </tbody>
      </table>
      <h3>How data gets in</h3>
      <ol>
        <li><code>npm run dev</code> and <code>npm run build</code> first run <code>scripts/sync-data.mjs</code>, which copies <code>../data/**/summaries</code> into <code>public/data/</code>.</li>
        <li>Pages fetch those JSON and GeoJSON files at runtime (<code>src/lib/data.ts</code>). The site never reads raw results.</li>
        <li>If <code>summaries_index.json</code> has <code>"fake": true</code>, a banner on every page says so.</li>
      </ol>
      <h3>npm scripts</h3>
      <table>
        <tbody>
          <tr><td><code>dev</code></td><td>sync data, start the dev server</td></tr>
          <tr><td><code>build</code> / <code>preview</code></td><td>sync data, build to <code>dist/</code> / serve it</td></tr>
          <tr><td><code>fake-data</code></td><td>write sample summaries into <code>../data</code></td></tr>
          <tr><td><code>sync-data</code></td><td>copy summaries and docs into <code>public/</code></td></tr>
          <tr><td><code>check</code></td><td>type-check with svelte-check</td></tr>
        </tbody>
      </table>
      <h3>Outside services</h3>
      <table>
        <thead><tr><th>Service</th><th>Used for</th><th>When</th></tr></thead>
        <tbody>
          <tr><td>OpenFreeMap</td><td>Basemap tiles (OpenStreetMap data), no API key</td><td>Every page view</td></tr>
          <tr><td>OSRM demo server</td><td>Road paths for the How page</td><td>Once, cached in <code>public/how/</code></td></tr>
          <tr><td>TheRide, U-M, Madison Metro GTFS</td><td>Route shapes and weekday trip counts</td><td>Once, cached in <code>scripts/shapes/</code></td></tr>
        </tbody>
      </table>
      <h3>Statistics on the How page</h3>
      <p><code>src/lib/stats.ts</code> holds the mean, sample SD, normal density, a paired t-test and a one-sample t-test, with p-values from the regularized incomplete beta function (checked against standard t-tables). Because summary files store only a mean and 95% interval per group, <code>src/how/evidence.ts</code> re-creates 100 per-run values with SD ≈ (ci_high − ci_low) / 3.92. Swap in real per-replicate values once <code>analyze</code> writes them.</p>
      <h3>Design and accessibility</h3>
      <ul>
        <li>Colors are CSS variables in <code>src/app.css</code>: U-M blue <code>#00274C</code> and maize <code>#FFCB05</code>, plus orange and Tappan red for emphasis.</li>
        <li>Animations pause off-screen and are skipped for visitors with “reduce motion” turned on.</li>
        <li>Layouts are fluid down to 320 px; charts size themselves to their container.</li>
      </ul>
    </section>

    <section id="contract">
      <h2>Data the site reads</h2>
      <p>Per city and scenario, in <code>data/&lt;city&gt;/summaries/&lt;scenario&gt;/</code>:</p>
      <table>
        <thead><tr><th>File</th><th>Fields used</th></tr></thead>
        <tbody>
          <tr><td><code>group_metrics.json</code></td><td><code>n_replicates</code>; <code>groups[]</code> with <code>dimension, value, n_personas_mean, metrics.&lt;metric&gt;.{'{'}mean, ci_low, ci_high{'}'}</code></td></tr>
          <tr><td><code>time_of_day.json</code></td><td><code>series[]</code>: <code>group, day_type, hours[].{'{'}hour, failure_rate, mean_wait{'}'}</code></td></tr>
          <tr><td><code>neighborhood_map.geojson</code></td><td>Polygon features with <code>neighborhood, name, n_personas_mean, metrics</code></td></tr>
          <tr><td><code>routes.geojson</code></td><td>LineStrings with <code>route_id, route_short_name, agency, trips_per_weekday, is_new</code></td></tr>
          <tr><td><code>comparison.json</code></td><td><code>groups[].deltas.&lt;metric&gt;.{'{'}before, after, delta, ci_low, ci_high{'}'}</code> (in the redesign scenario folder)</td></tr>
        </tbody>
      </table>
      <p><b>Proposed additions to SCHEMA.md</b> (used by the site, not yet in the contract):</p>
      <ul>
        <li><code>data/summaries_index.json</code>: <code>{'{'} fake?, cities: [{'{'} slug, display_name, bbox, scenarios {'}'}] {'}'}</code>.</li>
        <li><code>metrics.on_time_rate</code> on <code>group</code> entries: share of required trips arriving ≥ 5 min before start; <code>null</code> when a group has no required trips.</li>
        <li>The <code>time_of_day.json</code> and <code>comparison.json</code> shapes above, which SCHEMA.md describes only in prose.</li>
        <li><code>is_new</code> on routes, to mark redesign additions.</li>
      </ul>
    </section>

    <section id="deploy">
      <h2>Deploy to GitHub Pages</h2>
      <p>The site is plain static files with relative paths, so it works at <code>https://&lt;user&gt;.github.io/psim-site/</code> without changes. The build needs the <code>psim</code> repo’s <code>data/</code> and <code>docs/</code>, so the workflow checks out both.</p>
      <ol>
        <li>Commit and push the summaries in the <code>psim</code> repo:<Code code={C.pushData} /></li>
        <li>In <code>psim-site</code>, the workflow lives at <code>{C.workflowPath}</code>:<Code title="deploy.yml" lang="yaml" code={WORKFLOW} /></li>
        <li>On GitHub, open <b>psim-site → Settings → Pages</b> and set <b>Source</b> to <b>GitHub Actions</b>.</li>
        <li>Push to <code>master</code>. The site appears at <code>https://tegrangrigorian.github.io/psim-site/</code>. After pushing new data to <code>psim</code>, rerun the workflow from the Actions tab (it has a manual trigger).</li>
      </ol>
      <p class="note">Custom domain: add a <code>public/CNAME</code> file containing the domain, then set the DNS record GitHub shows in the Pages settings.</p>
    </section>

    <section id="trouble">
      <h2>Troubleshooting</h2>
      <dl>
        <dt>Phone says the site can’t be found</dt><dd>The dev server only listens on your computer by default. Start it with <code>npm run dev -- --host</code> and use the <i>Network</i> address.</dd>
        <dt>“Data not found” on load</dt><dd>No summaries yet. Run <code>npm run fake-data</code>, then <code>npm run dev</code> again.</dd>
        <dt>Maps are blank</dt><dd>The basemap comes from <code>tiles.openfreemap.org</code>; check your connection or any blocker extensions. Routes and shading still draw without it.</dd>
        <dt><code>npm install</code> fails</dt><dd>Check <code>node --version</code> is 20 or newer.</dd>
        <dt><code>cargo build</code>: “edition 2024 is unstable” or link errors</dt><dd>Run <code>rustup update stable</code>. On Windows, install the MSVC C++ build tools (see prerequisites).</dd>
        <dt>Windows won’t run <code>Activate.ps1</code></dt><dd><code>Set-ExecutionPolicy -Scope CurrentUser RemoteSigned</code>, then try again.</dd>
      </dl>
    </section>

    <section id="ref">
      <h2>Reference: PLAN & SCHEMA</h2>
      <p>The project’s own design documents, rendered from the <code>docs/</code> folder of the <code>psim</code> repo.</p>
      <div class="seg" role="tablist" aria-label="Document">
        <button role="tab" aria-selected={refTab === 'SCHEMA.md'} onclick={() => (refTab = 'SCHEMA.md')}>SCHEMA.md</button>
        <button role="tab" aria-selected={refTab === 'PLAN.md'} onclick={() => (refTab = 'PLAN.md')}>PLAN.md</button>
      </div>
      <div class="refdoc">
        {#key refTab}<Markdown file={refTab} fallback="{GH}/psim/blob/master/docs/{refTab}" />{/key}
      </div>
    </section>

    <section id="credits">
      <h2>Credits & licenses</h2>
      <ul>
        <li>Map data © OpenStreetMap contributors, under the Open Database License. Basemap tiles by OpenFreeMap (OpenMapTiles schema).</li>
        <li>Road paths computed with OSRM on OpenStreetMap data.</li>
        <li>Timetables and route shapes: TheRide (AAATA), University of Michigan Transportation Services, Madison Metro Transit public GTFS feeds.</li>
        <li>Libraries: Svelte, Vite, MapLibre GL JS, KaTeX, marked. Fonts: Inter and Fraunces (SIL Open Font License).</li>
        <li>This website was built with an agentic AI assistant, as disclosed in the project’s AI policy; the simulation code and analysis are the author’s own work.</li>
      </ul>
    </section>
  </article>
</div>

<Footer />

<style>
  .hero { background: var(--blue); color: #fff; padding: clamp(48px, 8vw, 88px) 0 clamp(36px, 6vw, 56px); }
  .eyebrow { color: var(--maize); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; margin-bottom: 14px; }
  .hero h1 { font-size: clamp(38px, 6vw, 64px); }
  .hero p:not(.eyebrow) { color: #c4d3e3; max-width: 62ch; margin: 16px 0 0; font-size: 17px; }
  .hero a { color: var(--maize); }
  .layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: clamp(24px, 4vw, 56px); padding-top: 40px; padding-bottom: 72px; }
  .side { position: sticky; top: 80px; align-self: start; display: grid; gap: 2px; max-height: calc(100vh - 100px); overflow: auto; }
  .side a { text-decoration: none; color: var(--muted); font-size: 14px; padding: 6px 10px; border-radius: 8px; border-left: 2px solid transparent; transition: color 0.2s, background 0.2s, border-color 0.2s; }
  .side a.sub { padding-left: 22px; font-size: 13px; }
  .side a:hover { color: var(--blue); background: #efece2; }
  .side a.on { color: var(--blue); font-weight: 600; border-left-color: var(--maize); background: #efece2; }
  .doc { min-width: 0; max-width: 820px; }
  .doc section { padding-top: 8px; margin-bottom: 36px; scroll-margin-top: 80px; }
  .doc h2 { font-size: clamp(26px, 3.4vw, 34px); margin-bottom: 12px; padding-top: 12px; border-top: 1px solid var(--rule); }
  .doc section:first-child h2 { border-top: 0; padding-top: 0; }
  .doc h3 { font-size: 20px; margin: 26px 0 8px; }
  .doc p, .doc li, .doc dd { color: #2e3a47; font-size: 15.5px; }
  .doc :global(:not(pre) > code) { background: #efece2; padding: 1px 6px; border-radius: 5px; font-size: 0.88em; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .doc a { color: var(--blue-2); }
  .doc ol, .doc ul { padding-left: 1.3em; display: grid; gap: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 10px 0 18px; display: block; overflow-x: auto; }
  td, th { border-bottom: 1px solid var(--rule); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 16px 0; }
  .flow span { background: #fff; border: 1px solid var(--rule); border-radius: 10px; padding: 8px 12px; font-size: 13.5px; display: grid; }
  .flow small { color: var(--muted); font-size: 11.5px; }
  .flow i { color: var(--orange); font-style: normal; font-weight: 700; }
  .st { font-style: normal; font-size: 11.5px; font-weight: 600; padding: 2px 9px; border-radius: 999px; white-space: nowrap; vertical-align: 2px; }
  .st.ok { background: #dcf1e5; color: #0a6b45; }
  .st.wip { background: var(--maize-soft); color: #6b5400; }
  .st.plan { background: #e6edf6; color: #2f4f75; }
  .note { font-size: 14px !important; color: var(--muted) !important; }
  dl { display: grid; gap: 4px; }
  dt { font-weight: 600; margin-top: 12px; }
  dd { margin: 0; }
  .refdoc { margin-top: 18px; background: #fff; border: 1px solid var(--rule); border-radius: var(--radius); padding: clamp(16px, 3vw, 28px); }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; padding-top: 0; }
    .side { position: sticky; top: 58px; z-index: 10; display: flex; overflow-x: auto; max-height: none; gap: 4px; background: var(--paper); padding: 10px 0; margin: 0 calc(-1 * var(--gutter)); padding-inline: var(--gutter); border-bottom: 1px solid var(--rule); }
    .side a { white-space: nowrap; border-left: 0; }
    .side a.sub { display: none; }
  }
</style>
