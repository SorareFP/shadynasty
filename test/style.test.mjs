import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../assets/style.css', import.meta.url), 'utf8');

// Several elements are switched off with the `hidden` attribute (the other
// team's needs table, the "Show more" button). Any rule that sets `display`
// on them would otherwise win over the browser's default and show them anyway.
test('the hidden attribute always hides', () => {
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
});
