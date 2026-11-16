import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadArchive } from '../src/archive.mjs';
import * as m from '../src/model.mjs';
import { LEADER_CATEGORIES } from '../src/statcodes.mjs';

const FIX = new URL('./fixtures/data/', import.meta.url);
const CLEMSON = '829161493';
const TEXAS = '829161584';
const archive = await loadArchive(FIX);
const season = archive.seasons[2037];

test('loadArchive reads current season and past awards', () => {
  assert.equal(archive.current, 2037);
  assert.equal(archive.league.name, 'Shadynasty 2.1');
  assert.ok(season.schedule.weeks.length > 0);
  assert.ok(season.rosters[CLEMSON].players.length > 0);
  assert.equal(archive.seasons[2036].schedule, null);
  assert.ok(archive.seasons[2036].awards.winners.length > 0);
});

test('userTeams returns the user-controlled schools', () => {
  assert.deepEqual(m.userTeams(season).map((t) => t.name).sort(), ['Clemson', 'Texas']);
  assert.deepEqual(m.userTeams(null), []);
});

test('teamSummary gives last result, next game and rank', () => {
  const s = m.teamSummary(season, TEXAS);
  assert.equal(s.team.name, 'Texas');
  assert.equal(s.games[0].opponent, 'SMU');
  assert.equal(s.games[0].result, 'W');
  assert.equal(s.games[0].teamScore, 52);
  assert.equal(s.games[0].oppScore, 21);
  assert.equal(s.games[0].isHome, false);
  assert.equal(s.last.opponent, 'Arizona State');
  assert.equal(s.last.result, 'L');
  assert.equal(s.next.opponent, 'Boise State');
  assert.equal(s.rank, 17);
  assert.equal(m.teamSummary(season, CLEMSON).rank, 2);
});

test('teamSummary copes with no remaining games and no polls', () => {
  const done = structuredClone(season);
  for (const w of done.schedule.weeks) w.games = w.games.filter((g) => g.status === 'final');
  done.rankings = null;
  const s = m.teamSummary(done, TEXAS);
  assert.equal(s.next, null);
  assert.equal(s.rank, null);
});

test('top25 returns the latest media poll', () => {
  const t = m.top25(season);
  assert.equal(t.rows.length, 25);
  assert.equal(t.rows[0].school, 'Indiana');
  assert.equal(t.label, 'Week 3');
  assert.equal(m.top25({ ...season, rankings: null }), null);
});

test('seasonLeaders sums a player across games by basePlayerId', () => {
  const tx = m.seasonLeaders(season, TEXAS);
  assert.deepEqual(tx.passYds[0], { name: 'Cameron Yeast', position: 'QB', value: 692, games: 2 });
  assert.equal(tx.recYds[0].name, 'Lawrence Cole');
  assert.equal(tx.recYds[0].value, 300);
  const cl = m.seasonLeaders(season, CLEMSON);
  assert.equal(cl.rushYds[0].name, 'Stefan Browning');
  assert.equal(cl.rushYds[0].value, 114);
  assert.equal(cl.sacks[0].value, 2.5);
  assert.ok(cl.passYds.length <= 5);
  assert.ok(cl.passYds.every((r) => r.value > 0));
});

test('seasonLeaders with no box scores returns empty categories', () => {
  const l = m.seasonLeaders({ ...season, boxScores: null }, TEXAS);
  assert.deepEqual(Object.keys(l), LEADER_CATEGORIES.map((c) => c.key));
  assert.ok(Object.values(l).every((rows) => rows.length === 0));
});

test('headToHead counts titles per coach', () => {
  const h = m.headToHead(archive);
  const by = Object.fromEntries(h.coaches.map((c) => [c.name, c]));
  assert.equal(by['Danny Bateman'].titles, 4);
  assert.equal(by['Hogg McDoggnald Jr.'].titles, 3);
  assert.equal(by['Danny Bateman'].school, 'Clemson');
  assert.equal(by['Danny Bateman'].wins, 142);
  assert.deepEqual(h.meetings, []);
});

test('headToHead lists games between user teams', () => {
  const a = structuredClone(archive);
  a.seasons[2037].schedule.weeks[0].games.push({
    gameId: 'x', status: 'final', awayName: 'Texas', homeName: 'Clemson', awayScore: 20, homeScore: 24,
    awayTeamId: TEXAS, homeTeamId: CLEMSON, awayUserControlled: true, homeUserControlled: true,
  });
  a.seasons[2037].schedule.weeks[1].games.push({
    gameId: 'y', status: 'scheduled', awayName: 'Clemson', homeName: 'Texas', awayScore: null, homeScore: null,
    awayTeamId: CLEMSON, homeTeamId: TEXAS, awayUserControlled: true, homeUserControlled: true,
  });
  const h = m.headToHead(a);
  assert.equal(h.meetings.length, 1);
  assert.deepEqual(
    { season: h.meetings[0].season, winner: h.meetings[0].winner, homeScore: h.meetings[0].homeScore },
    { season: 2037, winner: 'Clemson', homeScore: 24 },
  );
});

test('classRankings marks exactly the user teams', () => {
  const rows = m.classRankings(season);
  assert.deepEqual(rows.filter((r) => r.isUser).map((r) => r.school).sort(), ['Clemson', 'Texas']);
  assert.equal(rows[0].rank, 1);
  // The API flag is ignored: matching is by teamId.
  const s2 = structuredClone(season);
  for (const c of s2.recruiting.captures) for (const k of c.classes) k.userControlled = false;
  assert.equal(m.classRankings(s2).filter((r) => r.isUser).length, 2);
  assert.deepEqual(m.classRankings({ ...season, recruiting: null }), []);
});

test('prospects come from the latest all_recruits capture', () => {
  const p = m.prospects(season);
  assert.equal(p.length, 50);
  assert.equal(p[0].name, 'Eric Brock');
  assert.deepEqual(m.prospects({ ...season, recruiting: null }), []);
});

test('champions and awards by season', () => {
  const c = m.champions(archive);
  assert.equal(c[0].year, 2036);
  assert.equal(c[0].champion, 'Arizona State');
  assert.equal(c.at(-1).year, 2026);
  const a = m.awardsBySeason(archive);
  assert.ok(a[2036].some((w) => w.award === 'Heisman Trophy' && w.winner === 'Jamerson Shoemaker'));
  assert.equal(a[2037], undefined);
});

test('recordBook keeps the best across seasons', () => {
  const a = structuredClone(archive);
  const s38 = { ...structuredClone(season), year: 2038 };
  for (const g of s38.boxScores.games) {
    for (const p of g.players) if (p.name === 'Cameron Yeast') p.stats.PSPY = 500;
  }
  a.seasons[2038] = s38;
  a.current = 2038;
  const rb = m.recordBook(a);
  assert.equal(rb.singleGame.passYds.value, 500);
  assert.equal(rb.singleGame.passYds.season, 2038);
  assert.equal(rb.singleGame.passYds.name, 'Cameron Yeast');
  assert.ok(rb.singleGame.passYds.opponent);
  assert.equal(rb.season.passYds.value, 1000);
  assert.equal(rb.season.passYds.season, 2038);
  const rb37 = m.recordBook(archive);
  assert.equal(rb37.season.passYds.value, 692);
  assert.equal(rb37.season.passYds.team, 'Texas');
});

test('loadArchive keeps two seasons and follows league.json for current', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'arch-'));
  await cp(FIX, dir, { recursive: true });
  await cp(join(dir, '2037'), join(dir, '2038'), { recursive: true });
  const league = { ...archive.league, currentSeason: 2038 };
  await writeFile(join(dir, 'league.json'), JSON.stringify(league));
  const a = await loadArchive(dir);
  assert.equal(a.current, 2038);
  assert.ok(a.seasons[2037].schedule && a.seasons[2038].schedule);
});
