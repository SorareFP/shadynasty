// Pulls the league's datasets into the archive under data/.
// Everything is fetched and validated in memory first and written only if every
// request succeeded, so a failed run leaves the archive exactly as it was.
// Fresh data is merged into the archive part by part, so a response that
// leaves something out never erases what was saved before.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ApiError, createClient } from './api.mjs';

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

const has = (list) => Array.isArray(list) && list.length > 0;

// True when a dataset response carries nothing worth archiving.
export function isEmpty(name, d) {
  if (!d) return true;
  switch (name) {
    case 'schedule': return !has(d.weeks) && !has(d.teams);
    case 'rankings': return !has(d.weeks);
    case 'postseason': return !has(d.slots) && !has(d.championships);
    case 'recruiting': return !has(d.captures);
    case 'coaches': return !has(d.active) && !has(d.retired);
    case 'awards': return !has(d.winners);
    default: return false;
  }
}

// Combines two lists of keyed items; fresh items replace archived ones with the same key.
function mergeByKey(old, fresh, keyOf) {
  const out = new Map();
  for (const item of old ?? []) out.set(keyOf(item), item);
  for (const item of fresh ?? []) out.set(keyOf(item), item);
  return [...out.values()];
}

const captureKey = (c) => `${c.dataset}|${c.stage?.key ?? c.stage?.label ?? ''}`;
const weekKey = (w) => w.stage?.key ?? w.stage?.label ?? JSON.stringify(w.stage ?? null);

// Merges a fresh dataset into the archived copy.
export function mergeDataset(name, old, fresh) {
  if (!old) return fresh;
  if (isEmpty(name, fresh)) return old;
  switch (name) {
    case 'schedule':
      return { ...old, ...fresh, weeks: has(fresh.weeks) ? fresh.weeks : old.weeks, teams: has(fresh.teams) ? fresh.teams : old.teams };
    case 'postseason':
      return {
        ...old, ...fresh,
        slots: has(fresh.slots) ? fresh.slots : old.slots,
        championships: has(fresh.championships) ? fresh.championships : old.championships,
      };
    case 'recruiting':
      return { ...old, ...fresh, captures: mergeByKey(old.captures, fresh.captures, captureKey) };
    case 'rankings':
      return { ...old, ...fresh, weeks: mergeByKey(old.weeks, fresh.weeks, weekKey) };
    default:
      return fresh;
  }
}

function requireData(response, what) {
  if (!response || response.data === undefined || response.data === null) {
    throw new ApiError(`${what} came back without data`, 0);
  }
  return response.data;
}

const userTeamIds = (schedule) => (schedule?.teams ?? []).filter((t) => t.userControlled).map((t) => t.teamId);

// Fetches one season into memory and returns the merged files to write.
async function fetchSeason({ client, league, dataDir, year, rosterTeamIds }) {
  const dir = join(dataDir, String(year));
  const base = `/leagues/${league}/seasons/${year}`;
  const files = {};

  let schedule = null;
  for (const name of DATASETS) {
    const fresh = requireData(await client.get(`${base}/${name}`), `${year} ${name}`);
    const merged = mergeDataset(name, await readJson(join(dir, `${name}.json`)), fresh);
    files[join(dir, `${name}.json`)] = merged;
    if (name === 'schedule') schedule = merged;
  }

  const games = await client.getAllBoxScores(league, year);
  if (!Array.isArray(games)) throw new ApiError(`${year} box scores came back without data`, 0);
  const archivedGames = (await readJson(join(dir, 'box-scores.json')))?.games ?? [];
  files[join(dir, 'box-scores.json')] = { games: mergeByKey(archivedGames, games, (g) => g.gameId) };

  // The merged schedule still names the user teams when the fresh one came back empty.
  for (const id of rosterTeamIds ?? userTeamIds(schedule)) {
    const roster = requireData(await client.get(`${base}/rosters/${id}`), `${year} roster ${id}`);
    const file = join(dir, 'rosters', `${id}.json`);
    if (!has(roster.players) && existsSync(file)) continue;
    files[file] = roster;
  }
  return files;
}

export async function sync({ client, league, dataDir, rosterTeamIds, force = false }) {
  const leagueDoc = requireData(await client.get(`/leagues/${league}`), 'league');
  const previous = await readJson(join(dataDir, 'league.json'));
  const season = leagueDoc.currentSeason;
  if (!force && previous && changeKey(previous) === changeKey(leagueDoc)) return { changed: false, season };

  const files = {};

  // When the league has rolled into a new season, take one last pull of the
  // season it just left, so its final games and postseason are archived.
  if (previous?.currentSeason && previous.currentSeason !== season) {
    Object.assign(files, await fetchSeason({ client, league, dataDir, year: previous.currentSeason }));
  }
  Object.assign(files, await fetchSeason({ client, league, dataDir, year: season, rosterTeamIds }));

  // Past seasons only ever gain awards; fetch them until a non-empty copy is archived.
  for (const year of leagueDoc.seasons ?? []) {
    const file = join(dataDir, String(year), 'awards.json');
    if (year === season || file in files) continue;
    const archived = await readJson(file);
    if (archived && !isEmpty('awards', archived)) continue;
    const d = requireData(await client.get(`/leagues/${league}/seasons/${year}/awards`), `${year} awards`);
    if (!isEmpty('awards', d)) files[file] = d;
  }

  // Every request succeeded and every response had data: write.
  for (const [path, value] of Object.entries(files)) await writeJson(path, value);
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
    const force = process.env.FORCE_SYNC === 'true' || process.env.FORCE_SYNC === '1';
    const res = await sync({ client, league: LEAGUE_ID, dataDir: join(root, 'data'), force });
    console.log(res.changed ? `changed (season ${res.season})${force ? ', full refresh' : ''}` : 'no change');
  } catch (e) {
    console.error(`sync failed: ${e.message}`);
    process.exit(1);
  }
}
