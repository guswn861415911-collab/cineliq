const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const childProcess = require('node:child_process');

function createSettingsHarness(filename, source) {
  const storage = new Map();
  const documentRoot = { dataset: {} };
  const calls = [];
  const statuses = {};
  const mediaListeners = [];
  const systemPreference = {
    matches: false,
    addEventListener(_, listener) {
      mediaListeners.push(listener);
    },
  };
  const themeControls = [
    { value: '', disabled: false },
    { value: '', disabled: false },
  ];
  const preferenceControls = ['textSize', 'contrast', 'motion', 'links', 'captions'].map(
    (name) => ({
      dataset: { a11y: name },
      type: name === 'textSize' ? 'select' : 'checkbox',
      disabled: false,
    }),
  );
  let pendingRequest;
  function savePreference(value, userId) {
    calls.push({ value: structuredClone(value), userId });
    const metadata =
      filename === 'theme.js'
        ? { cineliq_preferences: { theme: value } }
        : { cineliq_accessibility: structuredClone(value) };
    return new Promise((resolve, reject) => {
      pendingRequest = {
        resolve: () => resolve({ id: userId, user_metadata: metadata }),
        reject,
      };
    });
  }
  const document = {
    documentElement: documentRoot,
    querySelector(selector) {
      if (selector.startsWith('meta')) return null;
      statuses[selector] ??= {
        textContent: '',
        replaceChildren(text) {
          this.textContent = text;
        },
      };
      return statuses[selector];
    },
    querySelectorAll(selector) {
      if (selector === '[data-theme-control]') return themeControls;
      if (selector === '[data-a11y]') return preferenceControls;
      return [];
    },
    createTextNode: (text) => text,
    getAnimations: () => [],
    addEventListener() {},
  };
  const window = {
    CINELIQ_CLOUD: {
      members: { updateTheme: savePreference, updateAccessibility: savePreference },
    },
    dispatchEvent() {},
  };
  vm.runInNewContext(source, {
    window,
    document,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia: () => systemPreference,
    Event: class Event {},
    MutationObserver: class MutationObserver {
      observe() {}
    },
  });
  return {
    api: filename === 'theme.js' ? window.CINELIQ_THEME : window.CINELIQ_A11Y,
    calls,
    storage,
    root: documentRoot,
    statuses,
    themeControls,
    preferenceControls,
    resolve: () => pendingRequest.resolve(),
    reject: () => pendingRequest.reject(Error('test save failure')),
    system(value) {
      systemPreference.matches = value;
      mediaListeners.forEach((listener) => listener());
    },
  };
}
function user(id, theme = 'dark') {
  return {
    id,
    user_metadata: {
      cineliq_preferences: { theme },
      cineliq_accessibility: {
        textSize: 'normal',
        contrast: false,
        motion: false,
        links: false,
        captions: false,
      },
    },
  };
}
async function runScenario(filename, source, scenario) {
  const harness = createSettingsHarness(filename, source);
  const { api } = harness;
  const change = (value) =>
    filename === 'theme.js' ? api.change(value) : api.change('textSize', value);
  const requestedValue = filename === 'theme.js' ? 'light' : 'large';
  if (scenario === 'guest') await change(requestedValue);
  if (scenario === 'invalid') await change('unsupported-value');
  if (scenario === 'account-success') {
    api.sync(user('owner-a'));
    const pending = change(requestedValue);
    await change(filename === 'theme.js' ? 'dark' : 'xlarge');
    assert.equal(harness.calls.length, 1, 'busy save must prevent duplicate requests');
    harness.resolve();
    await pending;
  }
  if (scenario === 'save-failure') {
    api.sync(user('owner-a'));
    const pending = change(requestedValue);
    harness.reject();
    await pending;
  }
  if (scenario === 'session-change') {
    api.sync(user('owner-a'));
    const pending = change(requestedValue);
    api.sync(user('owner-b', 'system'));
    harness.resolve();
    await pending;
    assert.ok(
      !harness.storage.has(
        filename === 'theme.js' ? 'cineliq.theme.owner-a' : 'cineliq.a11y.owner-a',
      ),
      'old request must not persist after a session change',
    );
  }
  if (scenario === 'system-setting') {
    if (filename === 'theme.js') await api.change('system');
    harness.system(true);
  }
  return JSON.parse(
    JSON.stringify({
      dataset: harness.root.dataset,
      calls: harness.calls,
      storage: [...harness.storage],
      statuses: harness.statuses,
      themeControls: harness.themeControls,
      preferenceControls: harness.preferenceControls,
    }),
  );
}
for (const filename of ['theme.js', 'accessibility.js']) {
  test(
    filename + ' preserves guest/account saves, failure rollback and session changes',
    async () => {
      const original = childProcess.execFileSync('git', ['show', '037716d:' + filename], {
        encoding: 'utf8',
      });
      const current = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
      for (const scenario of [
        'guest',
        'invalid',
        'account-success',
        'save-failure',
        'session-change',
        'system-setting',
      ]) {
        assert.deepEqual(
          await runScenario(filename, current, scenario),
          await runScenario(filename, original, scenario),
          scenario,
        );
      }
    },
  );
}
