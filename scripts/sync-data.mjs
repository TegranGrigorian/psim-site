// Copies summary files from ../data into public/data so the static build can fetch them.
// The site only reads summaries (SCHEMA.md §5), never raw results.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'data');
const dst = join(here, '..', 'public', 'data');

if (!existsSync(join(src, 'summaries_index.json'))) {
  console.error('data/summaries_index.json missing. Run `npm run fake-data` or `psim-tools analyze`.');
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(join(src, 'summaries_index.json'), join(dst, 'index.json'));
// Minimal CSV reader: the input tables (SCHEMA.md §2) have no quoted fields.
function csv(path) {
  if (!existsSync(path)) return [];
  const [head, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const keys = head.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], isNaN(+v) || v === '' ? v : +v])));
}

for (const city of readdirSync(src, { withFileTypes: true })) {
  const s = join(src, city.name, 'summaries');
  if (!city.isDirectory() || !existsSync(s)) continue;
  cpSync(s, join(dst, city.name), { recursive: true });
  // Input locations, used only by the How it works page to illustrate sampling.
  const inputs = {
    housing: csv(join(src, city.name, 'housing.csv')),
    workplaces: csv(join(src, city.name, 'workplaces.csv')),
    campus: csv(join(src, city.name, 'campus_locations.csv')),
  };
  if (inputs.housing.length) writeFileSync(join(dst, city.name, 'inputs.json'), JSON.stringify(inputs));
}
console.log('synced summaries ->', dst);
