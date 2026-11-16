// Pulls the league's datasets into the archive under data/.
// Everything is fetched into memory first and written only if every request
// succeeded, so a failed run leaves the archive exactly as it was.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from './api.mjs';

export const LEAGUE_ID = 'cfb27-738435';
const DATASETS = ['schedule', 'rankings', 'postseason', 'recruiting', 'coaches', 'awards'];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

const changeKey = (doc) => (doc ? `${doc.currentSeason}|${doc.stage?.key}|${doc.stageObservedAt}|${doc.lastCaptureAt}` : null);

// True when a dataset response carries nothing worth archiving.
export function isEmpty(name, d) {
  if (!d) return true;
  switch (name) {
    case 'schedule': return !(d.weeks?.length) && !(d.teams?.length);
    case 'rankings': return !(d.weeks?.length);
    case 'postseason': return !(d.slots?.length) && !(d.championships?.length);
    case 'recruiting': return !(d.captures?.length);
    case 'coaches': return !(d.active?.length) && !(d.retired?.length);
    case 'awards': return !(d.winners?.length);
    default: return false;
  }
}

export async function sync({ client, league, dataDir, rosterTeamIds }) {
  const leagueDoc = (await client.get(`/leagues/${league}`)).data;
  const previous = await readJson(join(dataDir, 'league.json'));
  const season = leagueDoc.currentSeason;
  if (previous && changeKey(previous) === changeKey(leagueDoc)) return { changed: false, season };

  const seasonPath = `/leagues/${league}/seasons/${season}`;
  const fetched = {};
  for (const name of DATASETS) {
    fetched[name] = (await client.get(`${seasonPath}/${name}`)).data;
  }
  const games = await client.getAllBoxScores(league, season);

  const teamIds = rosterTeamIds
    ?? (fetched.schedule?.teams ?? []).filter((t) => t.userControlled).map((t) => t.teamId);
  const rosters = {};
  for (const id of teamIds) {
    rosters[id] = (await client.get(`${seasonPath}/rosters/${id}`)).data;
  }

  // Past seasons only ever gain awards; fetch them until a non-empty copy is archived.
  const pastAwards = {};
  for (const year of leagueDoc.seasons ?? []) {
    if (year === season) continue;
    const archived = await readJson(join(dataDir, String(year), 'awards.json'));
    if (archived && !isEmpty('awards', archived)) continue;
    const d = (await client.get(`/leagues/${league}/seasons/${year}/awards`)).data;
    if (!isEmpty('awards', d)) pastAwards[year] = d;
  }

  // All requests succeeded: write.
  for (const [year, d] of Object.entries(pastAwards)) {
    await writeJson(join(dataDir, year, 'awards.json'), d);
  }
  const dir = join(dataDir, String(season));
  for (const name of DATASETS) {
    const file = join(dir, `${name}.json`);
    if (isEmpty(name, fetched[name]) && existsSync(file)) continue;
    await writeJson(file, fetched[name]);
  }

  const boxFile = join(dir, 'box-scores.json');
  const merged = new Map(((await readJson(boxFile))?.games ?? []).map((g) => [g.gameId, g]));
  for (const g of games) merged.set(g.gameId, g);
  await writeJson(boxFile, { games: [...merged.values()] });

  for (const [id, roster] of Object.entries(rosters)) {
    const file = join(dir, 'rosters', `${id}.json`);
    if (!(roster?.players?.length) && existsSync(file)) continue;
    await writeJson(file, roster);
  }

  await writeJson(join(dataDir, 'league.json'), leagueDoc);
  return { changed: true, season };
}

export function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  loadDotEnv(join(root, '.env'));
  try {
    const client = createClient({ token: process.env.DR_API_TOKEN });
    const res = await sync({ client, league: LEAGUE_ID, dataDir: join(root, 'data') });
    console.log(res.changed ? `changed (season ${res.season})` : 'no change');
  } catch (e) {
    console.error(`sync failed: ${e.message}`);
    process.exit(1);
  }
}
