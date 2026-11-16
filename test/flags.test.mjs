import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flagsFor, FLAGS, RULES } from '../src/flags.mjs';
import { build } from '../scripts/build.mjs';

const r = (stars, rank, position, pipeline = 'Ohio') => ({ stars, rank, position, pipeline });

test('five-star risk follows national rank', () => {
  assert.deepEqual(flagsFor(r(5, 5, 'WILL')), []);
  assert.deepEqual(flagsFor(r(5, 16, 'WILL')), []);
  assert.deepEqual(flagsFor(r(5, 17, 'WILL')), ['fake5-some']);
  assert.deepEqual(flagsFor(r(5, 25, 'WILL')), ['fake5-some']);
  assert.deepEqual(flagsFor(r(5, 26, 'WILL')), ['fake5-high']);
  assert.deepEqual(flagsFor(r(5, 32, 'WILL')), ['fake5-high']);
});

test('five-star centers and guards are flagged', () => {
  assert.deepEqual(flagsFor(r(5, 3, 'C')), ['fake5-high', 'interior5', 'scarce']);
  assert.deepEqual(flagsFor(r(5, 3, 'LG')), ['interior5', 'scarce']);
  assert.deepEqual(flagsFor(r(5, 3, 'LT')), []);
});

test('hidden five-stars, low ceilings, scarce and plentiful positions', () => {
  assert.deepEqual(flagsFor(r(4, 33, 'TE')), ['hidden5']);
  assert.deepEqual(flagsFor(r(4, 41, 'TE')), []);
  assert.deepEqual(flagsFor(r(2, 2000, 'SS')), ['low-ceiling']);
  assert.deepEqual(flagsFor(r(3, 500, 'SS')), ['scarce']);
  assert.deepEqual(flagsFor(r(4, 100, 'QB')), ['wait']);
});

test('speed and strength regions', () => {
  assert.deepEqual(flagsFor(r(4, 100, 'TE', 'Louisiana')), ['speed']);
  assert.deepEqual(flagsFor(r(4, 100, 'LT', 'Wisconsin')), ['strength']);
  assert.deepEqual(flagsFor(r(4, 100, 'TE', 'Wisconsin')), []);
});

test('flag keys are unique and every rule names its source', () => {
  assert.equal(new Set(FLAGS.map((f) => f.key)).size, FLAGS.length);
  for (const rule of RULES) {
    assert.ok(rule.points.length > 0);
    assert.match(rule.source.url, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test('recruiting page carries notes, the notes filter and the rules', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'site-'));
  await build({ dataDir: fileURLToPath(new URL('./fixtures/data/', import.meta.url)), outDir });
  const html = await readFile(join(outDir, 'recruiting.html'), 'utf8');
  for (const s of ['id="f-flag"', 'Recruiting rules of thumb', 'Fake and hidden five-stars', 'data-sort="notes"', 'Scarce spot']) {
    assert.ok(html.includes(s), `recruiting lacks ${s}`);
  }
  const rows = JSON.parse(await readFile(join(outDir, 'prospects.json'), 'utf8'));
  assert.ok(rows.every((x) => Array.isArray(x.flags)));
  assert.ok(rows.some((x) => x.flags.includes('fake5-some') || x.flags.includes('fake5-high')));
});
