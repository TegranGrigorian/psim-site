// Copies summary files from ../data into public/data so the static build can fetch them.
// The site only reads summaries (SCHEMA.md §5), never raw results.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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
for (const city of readdirSync(src, { withFileTypes: true })) {
  const s = join(src, city.name, 'summaries');
  if (city.isDirectory() && existsSync(s)) cpSync(s, join(dst, city.name), { recursive: true });
}
console.log('synced summaries ->', dst);
