const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const childProcess = require('node:child_process');
const projectRoot = path.join(__dirname, '..');
const baseline = 'c850913';
function originalSource(filename) {
  return childProcess.execFileSync('git', ['show', baseline + ':' + filename], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}
function readDataValues(source) {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return JSON.parse(JSON.stringify(context.window));
}
test('all learning data and public Supabase configuration retain exact values', () => {
  for (const filename of [
    'data.js',
    'learning-data.js',
    'full-learning-data.js',
    'production-data.js',
    'terminology-data.js',
    'media-config.js',
  ]) {
    const before = readDataValues(originalSource(filename));
    const after = readDataValues(
      fs.readFileSync(path.join(projectRoot, filename), 'utf8'),
    );
    assert.deepEqual(after, before, filename);
  }
});
test('Google ownership verification and all media assets remain byte-identical', () => {
  const verification = 'google896cae5064a99afa.html';
  assert.equal(
    fs.readFileSync(path.join(projectRoot, verification), 'utf8').replace(/\r\n/g, '\n'),
    originalSource(verification).replace(/\r\n/g, '\n'),
  );
  const changes = childProcess
    .execFileSync('git', ['diff', baseline, '--name-only', '--', 'assets'], {
      cwd: projectRoot,
      encoding: 'utf8',
    })
    .trim();
  assert.equal(changes, '');
});
