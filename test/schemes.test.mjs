import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rolesFor, SCHEMES, ROLES } from '../src/schemes.mjs';

const r = (position, archetype, height = 73, weight = 200) => ({ position, archetype, height, weight });

test('3-3-5 Tite roles', () => {
  assert.deepEqual(rolesFor(r('DT', 'Gap Specialist', 75, 337)), ['tite-nose', 'tite-dt']);
  assert.deepEqual(rolesFor(r('DT', 'Gap Specialist', 75, 290)), ['tite-dt']);
  assert.deepEqual(rolesFor(r('DT', 'Speed Rusher', 75, 320)), []);
  assert.ok(rolesFor(r('WILL', 'Thumper')).includes('tite-olb'));
  assert.ok(!rolesFor(r('MIKE', 'Thumper')).includes('tite-olb'));
  assert.ok(rolesFor(r('SS', 'Box Specialist')).includes('tite-olb'));
  assert.ok(rolesFor(r('MIKE', 'Signal Caller')).includes('tite-mike'));
  assert.ok(!rolesFor(r('SAM', 'Signal Caller')).includes('tite-mike'));
  assert.ok(!rolesFor(r('CB', 'Zone')).some((k) => k.startsWith('tite')));
  assert.deepEqual(rolesFor(r('FS', 'Hybrid')), ['tite-s']);
});

test('Air Raid roles', () => {
  assert.deepEqual(rolesFor(r('QB', 'Pocket Passer')), ['raid-qb']);
  assert.deepEqual(rolesFor(r('QB', 'Dual Threat')), []);
  assert.ok(rolesFor(r('WR', 'Physical Route Runner', 75)).includes('raid-zy'));
  assert.ok(!rolesFor(r('WR', 'Physical Route Runner', 74)).includes('raid-zy'));
  assert.ok(rolesFor(r('WR', 'Physical Route Runner', 74)).includes('best-prr'));
  assert.deepEqual(rolesFor(r('WR', 'Speedster')), ['raid-x']);
  assert.deepEqual(rolesFor(r('LT', 'Pass Protector')), ['raid-t']);
  assert.deepEqual(rolesFor(r('LG', 'Pass Protector')), []);
  assert.deepEqual(rolesFor(r('C', 'Raw Strength')), ['raid-c']);
});

test('a prospect can fit roles in more than one scheme', () => {
  assert.deepEqual(rolesFor(r('CB', 'Field')), ['tite-cb', 'best-fieldcb']);
  assert.deepEqual(rolesFor(r('ATH', 'Lurker')), ['tite-mike', 'best-lurker']);
});

test('role keys are unique and every scheme names its source', () => {
  assert.equal(new Set(ROLES.map((x) => x.key)).size, ROLES.length);
  for (const s of SCHEMES) assert.match(s.source.url, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});
