const fs = require('node:fs'),
  vm = require('node:vm'),
  crypto = require('node:crypto'),
  cp = require('node:child_process'),
  path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const context = { window: {} };
vm.createContext(context);
const files = [
  'data.js',
  'learning-data.js',
  'terminology-data.js',
  'production-data.js',
  'full-learning-data.js',
];
for (const file of files) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const w = context.window,
  original = new Map(w.CAMERA_TECHNIQUES.map((item) => [item.id, item.ko]));
for (const file of ['technique-names.js', 'content-types.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const oldVideo = new Set([
  ...Object.entries(w.CINELIQ_LEARNING)
    .filter(([, v]) => v.videoPromptExample)
    .map(([id]) => id),
  ...Object.entries(w.CINELIQ_PRODUCTION.profiles)
    .filter(([, v]) => v.videoPrompt)
    .map(([id]) => id),
]);
const report = {
  uniqueTechniques: new Set(w.CAMERA_TECHNIQUES.map((i) => i.id)).size,
  imagePrompts: Object.values(w.CINELIQ_LEARNING).filter((v) => v.imagePromptExample)
    .length,
  baseVideoPrompts: Object.values(w.CINELIQ_LEARNING).filter((v) => v.videoPromptExample)
    .length,
  previousVideoUnion: oldVideo.size,
  extendedVeoVideoPrompts: Object.values(w.CINELIQ_FULL_LEARNING.records).filter(
    (v) => v.videoGuide?.veoKoreanPrompt,
  ).length,
  glossaryTerms: w.CINELIQ_TERMINOLOGY.terms.length,
  issueEntries: Object.keys(w.CINELIQ_PRODUCTION.issues).length,
  displayChanges: w.CAMERA_TECHNIQUES.filter((i) => i.ko !== original.get(i.id)).length,
  contentTypes: { image: 0, video: 0, common: 0 },
  preservedFiles: {},
  hashNormalization: 'Current source hash: CRLF normalized to LF',
  preservationCheck:
    'Data values compared with baseline; verification HTML compared exactly',
};
for (const item of w.CAMERA_TECHNIQUES) {
  const kinds = w.CINELIQ_CONTENT_TYPES.forItem(item);
  for (const kind of ['image', 'video']) if (kinds[kind]) report.contentTypes[kind]++;
  if (kinds.image && kinds.video) report.contentTypes.common++;
}
for (const file of [...files, 'google896cae5064a99afa.html', 'media-config.js']) {
  const hash = (value) =>
    crypto
      .createHash('sha256')
      .update(String(value).replace(/\r\n/g, '\n'))
      .digest('hex');
  const currentSource = fs.readFileSync(file, 'utf8');
  const baselineSource = cp.execFileSync('git', ['show', 'b3092f1:' + file], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const current = hash(currentSource);
  if (file.endsWith('.html')) {
    if (current !== hash(baselineSource))
      throw Error('Verification HTML changed: ' + file);
  } else {
    function readValues(source) {
      const dataContext = { window: {} };
      vm.runInNewContext(source, dataContext);
      return JSON.stringify(dataContext.window);
    }
    if (readValues(currentSource) !== readValues(baselineSource)) {
      throw Error('Protected data values changed: ' + file);
    }
  }
  report.preservedFiles[file] = current;
}
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/content-audit.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(
  'reports/technique-display-names.json',
  JSON.stringify(
    w.CAMERA_TECHNIQUES.map((item) => ({
      id: item.id,
      before: original.get(item.id),
      display: item.ko,
      english: item.en,
      subtitle: item.displaySubtitle,
      rule:
        item.ko !== original.get(item.id)
          ? '사용자 지정 예시에 따른 표시 변경'
          : '기존 한국어 명칭 유지. 검증하지 않은 기계적 음역을 적용하지 않음.',
    })),
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(report));
