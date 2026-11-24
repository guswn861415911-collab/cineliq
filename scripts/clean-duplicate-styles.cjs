const fs = require('node:fs');
const postcss = require('../work/refactor-tools/node_modules/postcss');

function cleanDuplicateStyles(source) {
  const stylesheet = postcss.parse(source);
  const removals = [];
  function cleanContainer(container) {
    const seenDeclarations = new Map();
    for (const rule of container.nodes || []) {
      if (rule.type === 'atrule' && rule.name === 'media') {
        cleanContainer(rule);
        continue;
      }
      if (rule.type !== 'rule') continue;
      for (const declaration of [...rule.nodes]) {
        if (declaration.type !== 'decl') continue;
        const signature = JSON.stringify([
          rule.selector,
          declaration.prop,
          declaration.value,
          Boolean(declaration.important),
        ]);
        const earlierDeclaration = seenDeclarations.get(signature);
        if (earlierDeclaration) {
          removals.push({
            selector: rule.selector,
            property: declaration.prop,
            value: declaration.value,
            important: Boolean(declaration.important),
            removedLine: earlierDeclaration.source.start.line,
            keptLine: declaration.source.start.line,
          });
          const earlierRule = earlierDeclaration.parent;
          earlierDeclaration.remove();
          if (earlierRule.nodes.length === 0) earlierRule.remove();
        }
        seenDeclarations.set(signature, declaration);
      }
    }
  }
  cleanContainer(stylesheet);
  return { css: stylesheet.toString(), removals };
}
if (require.main === module) {
  const filename = 'styles.css';
  const result = cleanDuplicateStyles(fs.readFileSync(filename, 'utf8'));
  fs.writeFileSync(filename, result.css);
  fs.writeFileSync(
    'reports/refactor-css-cleanup.json',
    JSON.stringify(
      {
        filename,
        baseline: '037716d',
        rule: 'Earlier identical selector/property/value/priority in the same stylesheet or media container only',
        removals: result.removals,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Removed ' + result.removals.length + ' duplicate declarations');
}
module.exports = { cleanDuplicateStyles };
