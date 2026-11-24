const fs = require('node:fs/promises'),
  path = require('node:path'),
  http = require('node:http'),
  { spawn } = require('node:child_process'),
  assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '../..');
  const server = http.createServer(async (req, res) => {
    try {
      let file = decodeURIComponent(req.url.split('?')[0]);
      if (file === '/') file = '/index.html';
      if (file === '/media-cloud.js') file = '/tests/fixtures/member-cloud.js';
      const resolved = path.resolve(root, '.' + file);
      if (!resolved.startsWith(root + path.sep)) throw Error();
      const data = await fs.readFile(resolved);
      res.setHeader(
        'Content-Type',
        {
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
        }[path.extname(file)] || 'application/octet-stream',
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/',
    profile = path.join(root, 'work', 'verify-profile-' + Date.now());
  await fs.mkdir(profile, { recursive: true });
  const proc = spawn(
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--remote-debugging-port=0',
      '--user-data-dir=' + profile,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let ws;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try {
        port = (
          await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')
        ).split('\n')[0];
        if (port) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
    ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.onopen = r;
      ws.onerror = j;
    });
    let seq = 0;
    const pending = new Map(),
      errors = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);
      }
      if (m.method === 'Runtime.exceptionThrown')
        errors.push(
          m.params.exceptionDetails.exception?.description ||
            m.params.exceptionDetails.text,
        );
    };
    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      if (expression.includes(';')) expression = '(()=>{' + expression + '})()';
      const result = await cdp('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails)
        throw Error(result.exceptionDetails.exception?.description);
      return result.result.value;
    };
    const check = async (expression, label) => {
      for (let i = 0; i < 80; i++) {
        try {
          if (await evaluate(expression)) {
            console.log('PASS ' + label);
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 75));
      }
      throw Error(
        label +
          ' failed. ' +
          JSON.stringify(errors) +
          ' ' +
          (await evaluate(
            "JSON.stringify({active:document.activeElement.outerHTML.slice(0,240),modal:document.querySelector('#detailModal').hidden,view:document.querySelector('.main-content').dataset.mobileView})",
          )),
      );
    };
    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp('Page.navigate', { url });

    const childProcess = require('node:child_process');
    const sourceFiles = childProcess
      .execFileSync('git', ['ls-files', '*.css', '*.html'], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/);
    for (const filename of sourceFiles) {
      let before = childProcess.execFileSync('git', ['show', 'c850913:' + filename], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (filename === 'styles.css') {
        before = require('../../scripts/clean-duplicate-styles.cjs').cleanDuplicateStyles(
          before,
        ).css;
      }
      const after = await fs.readFile(path.join(root, filename), 'utf8');
      if (filename.endsWith('.css')) {
        const signatures = await evaluate(
          'return (' +
            ((sources) =>
              sources.map((text) => {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(text);
                return [...sheet.cssRules].map((rule) =>
                  rule.cssText
                    .replace(
                      /(^|[ (,/:\-])\.(\d+)/g,
                      (_, prefix, digits) => prefix + '0.' + digits,
                    )
                    .replace(/#[a-fA-F0-9]{3,8}\b/g, (color) => color.toLowerCase())
                    .replace(/\s+/g, ' ')
                    .replace(/,\s*/g, ',')
                    .replace(
                      /var\(([^)]*)\)/g,
                      (_, argumentsText) =>
                        'var(' + argumentsText.replace(/,\s*/g, ',') + ')',
                    ),
                );
              })).toString() +
            ')(' +
            JSON.stringify([before, after]) +
            ')',
        );
        assert.deepEqual(signatures[1], signatures[0], filename + ' CSS rules changed');
      } else {
        const signatures = await evaluate(
          'return (' +
            ((sources) => {
              function normalize(node) {
                if (node.nodeType === 8) return null;
                if (node.nodeType === 3) {
                  const text = node.textContent.trim().replace(/\s+/g, ' ');
                  return text || null;
                }
                const attributes = node.attributes
                  ? [...node.attributes].map((attribute) => [
                      attribute.name,
                      attribute.value,
                    ])
                  : [];
                return {
                  tag: node.nodeName,
                  attributes,
                  children: [...node.childNodes].map(normalize).filter(Boolean),
                };
              }
              return sources.map((text) =>
                normalize(new DOMParser().parseFromString(text, 'text/html')),
              );
            }).toString() +
            ')(' +
            JSON.stringify([before, after]) +
            ')',
        );
        assert.deepEqual(
          signatures[1],
          signatures[0],
          filename + ' HTML structure changed',
        );
      }
      console.log('PASS preserved ' + filename);
    }
    console.log('BROWSER STRUCTURE CHECKS COMPLETE');
  } finally {
    ws?.close();
    proc.kill();
    server.close();
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
