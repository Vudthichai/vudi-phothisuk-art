import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
const blocked = /forest-environment|useForestMotion|mushroom-rejected|vine-study|bark-study|bark-ridges|forest-review|flower-bloom|white-lily-rejected|Living forest environments/;
const output = await files('dist');
for (const path of output) {
  if (blocked.test(path) || path.startsWith('dist/dev/')) throw new Error(`Private asset emitted: ${path}`);
  if (/\.(html|css|js)$/.test(path) && blocked.test(await readFile(path, 'utf8'))) throw new Error(`Private code emitted: ${path}`);
}
console.log('PASS: production output excludes Phase 2/3 previews, new components and review assets.');
