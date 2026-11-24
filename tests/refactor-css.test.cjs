const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const childProcess = require('node:child_process');
const { cleanDuplicateStyles } = require('../scripts/clean-duplicate-styles.cjs');
test('CSS cleanup keeps different selectors, values, priority and media boundaries', () => {
  const unchanged =
    '.a {color:red;display:block}.b {color:red}.a {display:flex;color:red!important}@media (max-width:600px){.a{color:red}}';
  assert.equal(cleanDuplicateStyles(unchanged).css, unchanged);
  const repeated = '.a {color:red;display:block}.a {display:flex}.a {color:red}';
  const result = cleanDuplicateStyles(repeated);
  assert.equal(result.removals.length, 1);
  assert.ok(result.css.includes('display:block'));
  assert.ok(result.css.includes('display:flex'));
});
test('production CSS changes only remove proven earlier duplicate declarations', () => {
  const before = childProcess.execFileSync('git', ['show', '037716d:styles.css'], {
    encoding: 'utf8',
  });
  const expected = cleanDuplicateStyles(before);
  assert.equal(expected.removals.length, 12);
  assert.equal(
    fs.readFileSync('styles.css', 'utf8').replace(/\r\n/g, '\n'),
    expected.css.replace(/\r\n/g, '\n'),
  );
  assert.equal(cleanDuplicateStyles(expected.css).removals.length, 0);
});
