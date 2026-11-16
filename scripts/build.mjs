// Builds the static site in site/ from the archive in data/.

import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadArchive } from '../src/archive.mjs';
import { userTeams } from '../src/model.mjs';
import { teamFile } from '../src/html.mjs';
import * as home from '../src/pages/home.mjs';
import * as team from '../src/pages/team.mjs';
import * as h2h from '../src/pages/h2h.mjs';
import * as recruiting from '../src/pages/recruiting.mjs';
import * as history from '../src/pages/history.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function build({ dataDir, outDir }) {
  const archive = await loadArchive(dataDir);
  const season = archive.seasons?.[archive.current];

  const files = {
    'index.html': home.render(archive),
    'head-to-head.html': h2h.render(archive),
    'recruiting.html': recruiting.render(archive),
    'history.html': history.render(archive),
    'prospects.json': JSON.stringify(recruiting.prospectRows(season)),
  };
  for (const t of userTeams(season)) files[teamFile(t)] = team.render(archive, t.teamId);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(join(outDir, name), content);
  for (const asset of ['style.css', 'recruits.js']) {
    await copyFile(join(ROOT, 'assets', asset), join(outDir, asset));
    files[asset] = true;
  }
  return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const written = await build({ dataDir: join(ROOT, 'data'), outDir: join(ROOT, 'site') });
  console.log(`built ${written.length} files in site/`);
}
