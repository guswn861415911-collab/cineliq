const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const parser = require('../work/refactor-tools/node_modules/@babel/parser');
const traverse = require('../work/refactor-tools/node_modules/@babel/traverse').default;
const ignored = new Set([
  'start',
  'end',
  'loc',
  'extra',
  'comments',
  'leadingComments',
  'innerComments',
  'trailingComments',
  'shorthand',
  'range',
]);
function normalizeSource(source) {
  const syntax = parser.parse(source);
  const scopes = new WeakSet();
  let bindingIndex = 0;
  traverse(syntax, {
    Scope(scopePath) {
      if (scopes.has(scopePath.scope)) return;
      scopes.add(scopePath.scope);
      const bindings = Object.values(scopePath.scope.bindings).sort(
        (first, second) => first.identifier.start - second.identifier.start,
      );
      for (const binding of bindings) {
        scopePath.scope.rename(binding.identifier.name, 'localBinding' + ++bindingIndex);
      }
    },
  });
  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      const object = {};
      for (const key of Object.keys(value)) {
        if (!ignored.has(key)) object[key] = normalize(value[key]);
      }
      return object;
    }
    return value;
  }
  return normalize(syntax);
}
test('member and folder-save retain executable structure apart from local binding names', () => {
  for (const filename of ['member.js', 'folder-save.js']) {
    const before = childProcess.execFileSync('git', ['show', '037716d:' + filename], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const after = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.deepEqual(normalizeSource(after), normalizeSource(before), filename);
  }
});
