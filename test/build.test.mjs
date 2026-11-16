import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../scripts/build.mjs';
import { esc } from '../src/html.mjs';

const FIX = fileURLToPath(new URL('./fixtures/data/', import.meta.url));

async function copyFixtures() {
  const dir = await mkdtemp(join(tmpdir(), 'data-'));
  await cp(FIX, dir, { recursive: true });
  return dir;
}
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const writeJson = (p, v) => writeFile(p, JSON.stringify(v));

async function buildFrom(dataDir) {
  const outDir = await mkdtemp(join(tmpdir(), 'site-'));
  const files = await build({ dataDir, outDir });
  const pages = {};
  for (const f of await readdir(outDir)) {
    if (f.endsWith('.html')) pages[f] = await readFile(join(outDir, f), 'utf8');
  }
  return { outDir, files, pages };
}

test('esc escapes markup and shows a dash for missing values', () => {
  assert.equal(esc('Texas A&M'), 'Texas A&amp;M');
  assert.equal(esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(esc(null), '—');
  assert.equal(esc(undefined), '—');
  assert.equal(esc(0), '0');
});

test('writes the expected files', async () => {
  const { outDir } = await buildFrom(FIX);
  const names = (await readdir(outDir)).sort();
  for (const f of ['index.html', 'team-clemson.html', 'team-texas.html', 'head-to-head.html', 'recruiting.html',
    'history.html', 'prospects.json', 'style.css', 'recruits.js']) {
    assert.ok(names.includes(f), `missing ${f}`);
  }
  assert.equal((await readJson(join(outDir, 'prospects.json'))).length, 50);
});

test('home page shows league, week and both teams', async () => {
  const { pages } = await buildFrom(FIX);
  const home = pages['index.html'];
  for (const s of ['Shadynasty 2.1', 'Week 3', 'Clemson', 'Texas', 'Indiana', 'Boise State']) {
    assert.ok(home.includes(s), `home lacks ${s}`);
  }
  assert.ok(home.startsWith('<!doctype html>'));
});

test('pages carry the content the design lists', async () => {
  const { pages } = await buildFrom(FIX);
  assert.ok(pages['team-texas.html'].includes('Cameron Yeast'));
  assert.ok(pages['team-texas.html'].includes('692'));
  assert.ok(pages['team-texas.html'].includes('user games only') || pages['team-texas.html'].includes('games you played'));
  assert.ok(pages['head-to-head.html'].includes('Danny Bateman'));
  assert.ok(pages['head-to-head.html'].includes('142'));
  assert.ok(pages['recruiting.html'].includes('Eric Brock'));
  assert.ok(pages['history.html'].includes('Arizona State'));
  assert.ok(pages['history.html'].includes('Heisman Trophy'));
  assert.ok(pages['history.html'].includes('Jamerson Shoemaker'));
});

test('names are escaped', async () => {
  const dir = await copyFixtures();
  const rosterFile = join(dir, '2037', 'rosters', '829161584.json');
  const roster = await readJson(rosterFile);
  roster.players[0].name = '<script>alert(1)</script>';
  await writeJson(rosterFile, roster);
  const { pages } = await buildFrom(dir);
  const team = pages['team-texas.html'];
  assert.ok(team.includes('Texas A&amp;M'));
  assert.ok(!/Texas A&M/.test(team));
  assert.ok(!team.includes('<script>alert(1)'));
  assert.ok(team.includes('&lt;script&gt;alert(1)'));
});

test('sparse season still builds and shows dashes', async () => {
  const dir = await copyFixtures();
  const s = join(dir, '2037');
  const schedule = await readJson(join(s, 'schedule.json'));
  for (const w of schedule.weeks) w.games = w.games.filter((g) => g.status === 'final');
  await writeJson(join(s, 'schedule.json'), schedule);
  await writeJson(join(s, 'box-scores.json'), { games: [] });
  await writeJson(join(s, 'rankings.json'), { weeks: [] });
  await writeJson(join(s, 'awards.json'), null);
  await writeJson(join(s, 'recruiting.json'), { captures: [] });
  await writeJson(join(s, 'coaches.json'), null);
  const { pages } = await buildFrom(dir);
  assert.ok(pages['index.html'].includes('—'));
  assert.ok(pages['team-texas.html'].includes('—') || pages['team-texas.html'].includes('No '));
  assert.equal(Object.keys(pages).length, 8);
});

test('an empty archive builds a placeholder site', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'empty-'));
  const { pages } = await buildFrom(dir);
  assert.ok(pages['index.html'].includes('No data'));
});

test('pages follow whichever teams are user controlled', async () => {
  const dir = await copyFixtures();
  const file = join(dir, '2037', 'schedule.json');
  const schedule = await readJson(file);
  for (const t of schedule.teams) {
    if (t.name === 'Texas') t.userControlled = false;
    if (t.name === 'Arizona State') t.userControlled = true;
  }
  await writeJson(file, schedule);
  const { pages } = await buildFrom(dir);
  assert.ok('team-arizona-state.html' in pages);
  assert.ok(!('team-texas.html' in pages));
  assert.ok(pages['index.html'].includes('href="team-arizona-state.html"'));
});

test('a second season appears in history and becomes current', async () => {
  const dir = await copyFixtures();
  await cp(join(dir, '2037'), join(dir, '2038'), { recursive: true });
  const league = await readJson(join(dir, 'league.json'));
  league.currentSeason = 2038;
  league.stage = { ...league.stage, year: 2038 };
  await writeJson(join(dir, 'league.json'), league);
  await writeJson(join(dir, '2037', 'awards.json'), { winners: [{ award: 'Heisman Trophy', winner: 'Test Winner', school: 'Clemson', position: 'QB' }] });
  const { pages } = await buildFrom(dir);
  assert.ok(pages['index.html'].includes('2038'));
  assert.ok(pages['history.html'].includes('2037'));
  assert.ok(pages['history.html'].includes('Test Winner'));
  assert.ok(pages['history.html'].includes('2038'));
});

test('no page leaks a token and every link is relative', async () => {
  const { pages, outDir } = await buildFrom(FIX);
  for (const f of await readdir(outDir)) {
    const text = await readFile(join(outDir, f), 'utf8');
    assert.ok(!text.includes('drk_'), `${f} contains a token prefix`);
  }
  const allowed = /^https:\/\/(dynastyrewired\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.youtube\.com)/;
  for (const [name, html] of Object.entries(pages)) {
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const url = m[1];
      if (allowed.test(url)) continue;
      assert.ok(!url.startsWith('/') && !/^[a-z]+:/i.test(url), `${name}: non-relative link ${url}`);
    }
  }
});

test('recruiting page has team needs and the upgraded board', async () => {
  const { pages, outDir } = await buildFrom(FIX);
  const html = pages['recruiting.html'];
  for (const s of ['Team needs', 'Clemson', 'Texas', 'Leaving', 'id="f-pipeline"', 'id="f-archetype"', 'id="f-group"', 'id="f-watch"', 'Pos rank']) {
    assert.ok(html.includes(s), `recruiting lacks ${s}`);
  }
  const rows = await readJson(join(outDir, 'prospects.json'));
  assert.equal(rows[0].group, 'DL');
  assert.equal(rows[0].positionRank, 1);
  assert.equal(rows[0].pipeline, 'Alabama');
  assert.ok(rows[0].key.includes('Eric Brock'));
});

test('recruiting page has scheme fit and pipeline entry', async () => {
  const { pages, outDir } = await buildFrom(FIX);
  const html = pages['recruiting.html'];
  for (const s of ['id="f-role"', 'Scheme targets', '3-3-5 Tite defense', 'Air Raid offense', 'Nose tackle', 'id="pipeline-editor"', 'My pipelines', 'id="f-mypipe"']) {
    assert.ok(html.includes(s), `recruiting lacks ${s}`);
  }
  const rows = await readJson(join(outDir, 'prospects.json'));
  assert.ok(Array.isArray(rows[0].roles));
  const pocket = rows.find((x) => x.position === 'QB' && x.archetype === 'Pocket Passer');
  if (pocket) assert.deepEqual(pocket.roles, ['raid-qb']);
});

test('team needs open on the owner team with a picker for the others', async () => {
  const { pages } = await buildFrom(FIX);
  const html = pages['recruiting.html'];
  assert.ok(html.includes('<option value="829161584" selected>Texas</option>'));
  assert.match(html, /<div class="needs" data-team="829161584">/);
  assert.match(html, /<div class="needs" data-team="829161493" hidden>/);
  assert.ok(html.includes('<option value="all">All teams</option>'));
});
