import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rosterNeeds } from '../src/model.mjs';

const mk = (position, year, overall) => ({ name: `${position} ${year} ${overall}`, position, year, overall });
const needs = (players) => Object.fromEntries(rosterNeeds({ rosters: { t: { players } } }, 't').map((r) => [r.group, r]));

test('recommends portal spots when starters leave and nobody behind them is ready', () => {
  const by = needs([
    // Three top receivers leave; one ready returner for three starting spots.
    mk('WR', 'SR', 94), mk('WR', 'SR', 93), mk('WR', 'SR (RS)', 90),
    mk('WR', 'JR', 88), mk('WR', 'SO', 78), mk('WR', 'FR', 74), mk('WR', 'FR', 70),
  ]);
  assert.equal(by.WR.topLeaving, 3);
  assert.equal(by.WR.readyReturning, 1);
  assert.equal(by.WR.portalSpots, 2);
});

test('no portal recommendation when the returners are ready', () => {
  const by = needs([
    mk('WR', 'SR', 94), mk('WR', 'SR', 93),
    mk('WR', 'JR', 90), mk('WR', 'SO', 88), mk('WR', 'SO', 86),
  ]);
  assert.equal(by.WR.portalSpots, 0);
});

test('no portal recommendation when the players leaving are not high-end', () => {
  const by = needs([
    mk('CB', 'SR', 80), mk('CB', 'SR', 79),
    mk('CB', 'FR', 70),
  ]);
  assert.equal(by.CB.topLeaving, 0);
  assert.equal(by.CB.portalSpots, 0);
});

test('portal spots never exceed the high-end players leaving', () => {
  const by = needs([
    mk('OL', 'SR', 92),
    mk('OL', 'FR', 70), mk('OL', 'FR', 68),
  ]);
  // Five starting spots and no ready returner, but only one starter is being lost.
  assert.equal(by.OL.portalSpots, 1);
});

test('single-starter positions: a leaving starter with no ready backup', () => {
  const by = needs([mk('QB', 'SR', 95), mk('QB', 'FR', 72), mk('P', 'SR', 88)]);
  assert.equal(by.QB.portalSpots, 1);
  assert.equal(by.P.portalSpots, 1);
  assert.equal(by.HB.portalSpots, 0);
});
