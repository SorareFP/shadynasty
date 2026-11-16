import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depthChart } from '../src/depth.mjs';

const dl = (id, name, weight, ratings) => ({
  playerId: id, name, position: 'DL', year: 'JR', overall: 85, heightInches: 75, weightPounds: weight,
  ratings: { PTAK: 80, PLPU: 80, ...ratings },
});

// With no true 300-pounder, the nose should still be the best available fit
// rather than whoever is left after the interior tackles are chosen.
test('the nose is chosen before the interior tackles', () => {
  const roster = {
    players: [
      dl('1', 'Star End', 254, { PSTR: 90, PBSG: 97, PLPM: 96 }),
      dl('2', 'Stout Tackle', 295, { PSTR: 93, PBSG: 88, PLPM: 86 }),
      dl('3', 'Solid Tackle', 291, { PSTR: 86, PBSG: 85, PLPM: 84 }),
      dl('4', 'Raw Backup', 292, { PSTR: 72, PBSG: 66, PLPM: 60 }),
    ],
  };
  const chart = depthChart(roster);
  const slot = (key) => chart.slots.find((s) => s.key === key).players[0].name;
  assert.equal(slot('NT'), 'Stout Tackle');
  assert.deepEqual([slot('DT1'), slot('DT2')].sort(), ['Solid Tackle', 'Star End']);
});
