// Tests for the findings of the independent code review.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sync } from '../scripts/sync.mjs';
import { ApiError } from '../scripts/api.mjs';
import { build } from '../scripts/build.mjs';
import { loadArchive } from '../src/archive.mjs';
import * as m from '../src/model.mjs';
import { num } from '../src/html.mjs';

const FIX = fileURLToPath(new URL('./fixtures/data/', import.meta.url));
const LEAGUE = 'cfb27-1';
const CLEMSON = '829161493';
const TEXAS = '829161584';

const tmp = (p = 'rev-') => mkdtemp(join(tmpdir(), p));
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const writeJson = async (p, v) => { await mkdir(join(p, '..'), { recursive: true }); await writeFile(p, JSON.stringify(v)); };

function leagueDoc(over = {}) {
  return {
    id: LEAGUE, name: 'Test', currentSeason: 2037, seasons: [2037],
    stage: { key: 'k1', label: 'Week 3', year: 2037 }, stageObservedAt: 100, ...over,
  };
}

function datasets(over = {}) {
  return {
    schedule: {
      state: 'available',
      weeks: [{ id: '1', label: 'Week 0', games: [] }],
      teams: [{ teamId: 't1', name: 'Clemson', userControlled: true }, { teamId: 't3', name: 'Duke', userControlled: false }],
    },
    rankings: { weeks: [{ stage: { key: 'w2' }, polls: [{ poll: 'media', rows: [1] }] }] },
    postseason: { state: 'available', slots: [{ bowl: 'Rose' }], championships: [{ year: 2036 }] },
    recruiting: { captures: [
      { dataset: 'all_recruits', stage: { key: 'w2' }, recruits: [{ name: 'A' }], classes: [] },
      { dataset: 'top_classes', stage: { key: 'w2' }, recruits: [], classes: [{ rank: 1 }] },
    ] },
    coaches: { state: 'available', active: [{ name: 'A' }], retired: [] },
    awards: { state: 'available', winners: [{ award: 'Heisman' }] },
    ...over,
  };
}

function fakeClient({ league = leagueDoc(), data = datasets(), gamesByYear = {} } = {}) {
  const calls = [];
  return {
    calls,
    async get(path) {
      calls.push(path);
      if (path === `/leagues/${LEAGUE}`) return { data: league };
      const name = path.match(/\/seasons\/[^/]+\/(.+)$/)[1];
      if (name.startsWith('rosters/')) return { data: { players: [{ playerId: 'p' }] } };
      return { data: data[name] };
    },
    async getAllBoxScores(_league, year) {
      calls.push(`box-scores:${year}`);
      return gamesByYear[year] ?? [];
    },
  };
}

async function snapshot(dir) {
  const out = {};
  for (const e of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) out[join(e.parentPath, e.name)] = await readFile(join(e.parentPath, e.name), 'utf8');
  }
  return out;
}

// 1. Season rollover

test('rollover refetches the previous season before moving on', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient({ gamesByYear: { 2037: [{ gameId: 'g1' }] } }), league: LEAGUE, dataDir: dir });
  const c = fakeClient({
    league: leagueDoc({ currentSeason: 2038, stageObservedAt: 300, stage: { key: 'k9', year: 2038 }, seasons: [2038, 2037] }),
    gamesByYear: { 2037: [{ gameId: 'final-2037' }] },
  });
  await sync({ client: c, league: LEAGUE, dataDir: dir });
  assert.ok(c.calls.includes(`/leagues/${LEAGUE}/seasons/2037/schedule`));
  assert.ok(c.calls.includes('box-scores:2037'));
  const games = (await readJson(join(dir, '2037', 'box-scores.json'))).games.map((g) => g.gameId).sort();
  assert.deepEqual(games, ['final-2037', 'g1']);
  await readJson(join(dir, '2038', 'schedule.json'));
});

// 2. Change detection

test('force refreshes even when the stage is unchanged', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const res = await sync({ client: fakeClient({ gamesByYear: { 2037: [{ gameId: 'late' }] } }), league: LEAGUE, dataDir: dir, force: true });
  assert.equal(res.changed, true);
  assert.deepEqual((await readJson(join(dir, '2037', 'box-scores.json'))).games, [{ gameId: 'late' }]);
});

// 3. Partial responses

test('a partial response keeps the archived parts it leaves out', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const partial = datasets({
    schedule: { state: 'available', weeks: [], teams: [{ teamId: 't1', name: 'Clemson', userControlled: true, wins: 9 }] },
    postseason: { state: 'available', slots: [], championships: [{ year: 2036 }, { year: 2037 }] },
    recruiting: { captures: [{ dataset: 'top_classes', stage: { key: 'w3' }, recruits: [], classes: [{ rank: 2 }] }] },
    rankings: { weeks: [{ stage: { key: 'w3' }, polls: [{ poll: 'media', rows: [2] }] }] },
  });
  await sync({ client: fakeClient({ league: leagueDoc({ stageObservedAt: 200 }), data: partial }), league: LEAGUE, dataDir: dir });
  const s = await readJson(join(dir, '2037', 'schedule.json'));
  assert.equal(s.weeks.length, 1, 'archived weeks kept');
  assert.equal(s.teams[0].wins, 9, 'fresh teams taken');
  const p = await readJson(join(dir, '2037', 'postseason.json'));
  assert.equal(p.slots.length, 1);
  assert.equal(p.championships.length, 2);
  const r = await readJson(join(dir, '2037', 'recruiting.json'));
  assert.deepEqual(r.captures.map((c) => `${c.dataset}:${c.stage.key}`).sort(), ['all_recruits:w2', 'top_classes:w2', 'top_classes:w3']);
  const k = await readJson(join(dir, '2037', 'rankings.json'));
  assert.deepEqual(k.weeks.map((w) => w.stage.key), ['w2', 'w3']);
});

test('rosters fall back to the archived user teams when the schedule comes back empty', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const c = fakeClient({ league: leagueDoc({ stageObservedAt: 200 }), data: datasets({ schedule: { state: 'unavailable', weeks: [], teams: [] } }) });
  await sync({ client: c, league: LEAGUE, dataDir: dir });
  assert.ok(c.calls.includes(`/leagues/${LEAGUE}/seasons/2037/rosters/t1`));
});

test('a response without data fails before anything is written', async () => {
  const dir = await tmp();
  const c = fakeClient();
  const get = c.get.bind(c);
  c.get = async (path) => (path.endsWith('/coaches') ? {} : get(path));
  await assert.rejects(sync({ client: c, league: LEAGUE, dataDir: dir }), ApiError);
  assert.deepEqual(await snapshot(dir), {});
});

// 4. Head-to-head by coach

test('series wins follow the coach, not the school', async () => {
  const a = await loadArchive(FIX);
  a.seasons[2037].schedule.weeks[0].games.push({
    gameId: 'x', status: 'final', awayName: 'Texas', homeName: 'Clemson', awayScore: 30, homeScore: 10,
    awayTeamId: TEXAS, homeTeamId: CLEMSON, awayUserControlled: true, homeUserControlled: true,
  });
  const s38 = { ...structuredClone(a.seasons[2037]), year: 2038 };
  for (const w of s38.schedule.weeks) w.games = w.games.filter((g) => g.gameId !== 'x');
  const hogg = s38.coaches.active.find((c) => c.name === 'Hogg McDoggnald Jr.');
  hogg.school = 'Arizona State';
  hogg.teamId = 'asu';
  a.seasons[2038] = s38;
  a.current = 2038;
  const h = m.headToHead(a);
  const by = Object.fromEntries(h.coaches.map((c) => [c.name, c]));
  assert.equal(by['Hogg McDoggnald Jr.'].seriesWins, 1);
  assert.equal(by['Danny Bateman'].seriesWins, 0);
  assert.equal(h.meetings[0].winnerCoach, 'Hogg McDoggnald Jr.');
});

// 5. Empty new season

test('activeSeason falls back to the latest season that has teams', async () => {
  const a = await loadArchive(FIX);
  assert.equal(m.activeSeason(a).year, 2037);
  a.seasons[2038] = { year: 2038, schedule: { weeks: [], teams: [] }, coaches: null, rosters: {} };
  a.current = 2038;
  assert.equal(m.activeSeason(a).year, 2037);
  assert.equal(m.headToHead(a).coaches.length, 2);
  assert.equal(m.activeSeason({ seasons: {}, current: null }), null);
});

test('an empty new season keeps team pages from the last full season', async () => {
  const dir = await tmp('data-');
  await cp(FIX, dir, { recursive: true });
  const league = await readJson(join(dir, 'league.json'));
  league.currentSeason = 2038;
  await writeJson(join(dir, 'league.json'), league);
  await writeJson(join(dir, '2038', 'schedule.json'), { weeks: [], teams: [] });
  const outDir = await tmp('site-');
  await build({ dataDir: dir, outDir });
  const files = await readdir(outDir);
  assert.ok(files.includes('team-texas.html'));
  assert.ok((await readFile(join(outDir, 'index.html'), 'utf8')).includes('href="team-texas.html"'));
  assert.ok((await readFile(join(outDir, 'head-to-head.html'), 'utf8')).includes('Danny Bateman'));
});

// Smaller findings

test('a later season cannot erase a champion coach', async () => {
  const a = await loadArchive(FIX);
  const s38 = { ...structuredClone(a.seasons[2037]), year: 2038 };
  s38.postseason.championships = s38.postseason.championships.map((c) => ({ ...c, coach: null }));
  a.seasons[2038] = s38;
  a.current = 2038;
  assert.equal(m.champions(a).find((c) => c.year === 2036).coach, 'Hogg McDoggnald Jr.');
});

test('numeric strings do not break number formatting', () => {
  assert.equal(num('58.8'), '58.8');
  assert.equal(num('3'), '3');
  assert.equal(num('abc'), '—');
  assert.equal(num(2.5), '2.5');
});
