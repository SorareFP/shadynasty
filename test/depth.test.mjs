import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { depthChart, slotScore, SLOTS } from '../src/depth.mjs';
import { build } from '../scripts/build.mjs';

let nextId = 1;
function player(position, name, ratings = {}, extra = {}) {
  return {
    playerId: String(nextId++), name, position, year: 'JR', overall: 80,
    heightInches: 73, weightPounds: 200, ratings: { ...ratings }, ...extra,
  };
}
const base = (v) => new Proxy({}, { get: () => v });
const rated = (v, over = {}) => ({ ...Object.fromEntries(['PSPD', 'PACC', 'PAGI', 'CODR', 'PSTR', 'PAWR', 'PJMP', 'PCTH', 'PLCI', 'PLSC', 'PRRS', 'PRRM', 'PRRD', 'PLRL', 'PBSG', 'PLPM', 'PTAK', 'PLPU', 'PLHT', 'PLZC', 'PLMC', 'PLPE', 'PLPR', 'PPBK', 'PPBF', 'PPBP', 'PRBK', 'PRBP', 'PLIB', 'PTAS', 'PTAM', 'PTAD', 'PTHP', 'PTUP', 'PBCV', 'PCAR', 'PFMS'].map((k) => [k, v])), ...over });

test('receivers go to the spot that suits them and nobody starts twice', () => {
  const roster = {
    players: [
      player('WR', 'Burner', rated(75, { PSPD: 99, PACC: 96, PRRD: 95 })),
      player('WR', 'Big Body', rated(80, { PLRL: 97, PLCI: 97, PJMP: 95, PLSC: 94, PSPD: 84 }), { heightInches: 77 }),
      player('WR', 'Technician', rated(90, { PRRS: 99, PRRM: 99, PCTH: 97, PLCI: 96, PSPD: 86 })),
      player('WR', 'Quick Slot', rated(78, { PRRS: 93, PAGI: 98, CODR: 97, PACC: 95, PSPD: 88 }), { heightInches: 70 }),
      player('WR', 'Depth Guy', rated(70)),
    ],
    abilities: [],
  };
  const chart = depthChart(roster);
  const starter = (key) => chart.slots.find((s) => s.key === key).players[0]?.name;
  assert.equal(starter('X'), 'Burner');
  assert.equal(starter('Y'), 'Technician');
  assert.equal(starter('Z'), 'Big Body');
  assert.equal(starter('H'), 'Quick Slot');
  const starters = chart.slots.map((s) => s.players[0]?.name).filter(Boolean);
  assert.equal(new Set(starters).size, starters.length);
  // The fifth receiver is somebody's backup, not a second starter.
  assert.ok(chart.slots.some((s) => s.players[1]?.name === 'Depth Guy'));
});

test('the nose tackle is the heavy, strong lineman', () => {
  const roster = {
    players: [
      player('DL', 'Space Eater', rated(75, { PSTR: 97, PBSG: 90 }), { weightPounds: 335 }),
      player('DL', 'Penetrator', rated(75, { PBSG: 96, PLPM: 95, PSTR: 86 }), { weightPounds: 285 }),
      player('DL', 'Other Tackle', rated(75, { PBSG: 90, PLPM: 90, PSTR: 85 }), { weightPounds: 290 }),
      player('DL', 'Light Edge', rated(75, { PSTR: 70, PFMS: 95 }), { weightPounds: 240 }),
    ],
    abilities: [],
  };
  const chart = depthChart(roster);
  const slot = (key) => chart.slots.find((s) => s.key === key);
  assert.equal(slot('NT').players[0].name, 'Space Eater');
  assert.deepEqual([slot('DT1').players[0].name, slot('DT2').players[0].name].sort(), ['Other Tackle', 'Penetrator']);
});

test('pools are respected and empty slots are reported, not invented', () => {
  const chart = depthChart({ players: [player('QB', 'Only Guy', rated(85))], abilities: [] });
  assert.equal(chart.slots.find((s) => s.key === 'QB').players[0].name, 'Only Guy');
  assert.deepEqual(chart.slots.find((s) => s.key === 'X').players, []);
  assert.deepEqual(chart.slots.find((s) => s.key === 'NT').players, []);
  assert.equal(depthChart(null).slots.every((s) => s.players.length === 0), true);
});

test('each listed player carries his score, key ratings, year and abilities', () => {
  const qb = player('QB', 'Passer', rated(80, { PTAS: 95, PTAM: 93, PTAD: 88, PTHP: 94 }), { year: 'SR', overall: 91 });
  const chart = depthChart({ players: [qb], abilities: [{ playerId: qb.playerId, name: 'Step Up', tier: 'gold' }] });
  const p = chart.slots.find((s) => s.key === 'QB').players[0];
  assert.equal(p.year, 'SR');
  assert.equal(p.leaving, true);
  assert.equal(p.overall, 91);
  assert.ok(p.score > 80 && p.score <= 99);
  assert.deepEqual(p.abilities, ['Step Up (gold)']);
  assert.ok(p.keys.some((k) => k.label === 'Short accuracy' && k.value === 95));
});

test('missing ratings do not crash or win a slot', () => {
  const a = player('CB', 'No Ratings', {});
  const b = player('CB', 'Rated', rated(70));
  const chart = depthChart({ players: [a, b], abilities: [] });
  assert.equal(chart.slots.find((s) => s.key === 'CB1').players[0].name, 'Rated');
  assert.equal(slotScore(SLOTS.find((s) => s.key === 'CB1'), a), 0);
});

test('slot keys are unique and every slot explains what it wants', () => {
  assert.equal(new Set(SLOTS.map((s) => s.key)).size, SLOTS.length);
  for (const s of SLOTS) {
    assert.ok(s.want.length > 10, s.key);
    const total = Object.values(s.weights).reduce((n, w) => n + w, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${s.key} weights sum to ${total}`);
  }
});

test('a depth chart page is built for each user team and linked from the nav', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'site-'));
  await build({ dataDir: fileURLToPath(new URL('./fixtures/data/', import.meta.url)), outDir });
  const files = await readdir(outDir);
  assert.ok(files.includes('depth-texas.html'));
  assert.ok(files.includes('depth-clemson.html'));
  const html = await readFile(join(outDir, 'depth-texas.html'), 'utf8');
  for (const s of ['Depth chart', 'Nose tackle', 'Air Raid', '3-3-5 Tite', 'href="depth-clemson.html"']) {
    assert.ok(html.includes(s), `depth page lacks ${s}`);
  }
  const home = await readFile(join(outDir, 'index.html'), 'utf8');
  assert.ok(home.includes('href="depth-texas.html"'));
});
