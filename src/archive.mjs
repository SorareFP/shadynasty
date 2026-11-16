// Loads the archive written by scripts/sync.mjs into one object.

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

export async function loadArchive(dataDir) {
  const dir = dataDir instanceof URL ? fileURLToPath(dataDir) : dataDir;
  const league = await readJson(join(dir, 'league.json'));
  const seasons = {};
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch { /* no archive yet */ }

  for (const e of entries) {
    if (!e.isDirectory() || !/^\d{4}$/.test(e.name)) continue;
    const s = join(dir, e.name);
    const rosters = {};
    let rosterFiles = [];
    try {
      rosterFiles = await readdir(join(s, 'rosters'));
    } catch { /* none */ }
    for (const f of rosterFiles) {
      if (f.endsWith('.json')) rosters[f.slice(0, -5)] = await readJson(join(s, 'rosters', f));
    }
    seasons[Number(e.name)] = {
      year: Number(e.name),
      schedule: await readJson(join(s, 'schedule.json')),
      boxScores: await readJson(join(s, 'box-scores.json')),
      rankings: await readJson(join(s, 'rankings.json')),
      postseason: await readJson(join(s, 'postseason.json')),
      recruiting: await readJson(join(s, 'recruiting.json')),
      coaches: await readJson(join(s, 'coaches.json')),
      awards: await readJson(join(s, 'awards.json')),
      rosters,
    };
  }

  const years = Object.keys(seasons).map(Number);
  const current = league?.currentSeason ?? (years.length ? Math.max(...years) : null);
  return { league, seasons, current };
}
