// The app is plain static files (no bundler), so "building" = copying what must be served into dist/.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');
execFileSync('python3', [join(root, 'scripts/localize.py')], { stdio: 'inherit' });
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const f of ['index.html', 'workshop.html', 'nl', 'en', 'worksheet-a4-en.pdf', 'oefening-2.html', 'werkblad.html', 'werkblad-a4.pdf', 'style.css', 'fonts.css', 'app.mjs',  'unexpected-editor.mjs', 'engine.mjs', 'analysis.mjs', 'document.mjs', 'exercise2.mjs', 'transfer.mjs', 'randomness.mjs', 'experiments.mjs', 'system-map.mjs', 'weights.mjs', 'relations.mjs', 'relation-editor.mjs', 'fbs-data.mjs', 'fbs-analysis.mjs', 'fbs-prompt.mjs', 'example.mjs', 'begrippen.html', 'assets']) await cp(join(root, f), join(dist, f), { recursive: true });
await writeFile(join(dist, '.nojekyll'), '');
console.log('Built static site into dist/ — upload that folder to any static host (e.g. GitHub Pages).');
