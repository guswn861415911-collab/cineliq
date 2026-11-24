const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const assert = require('node:assert/strict');
const parser = require('../work/refactor-tools/node_modules/@babel/parser');
const prettier = require('../work/refactor-tools/node_modules/prettier');
const postcss = require('../work/refactor-tools/node_modules/postcss');
const root = path.resolve(__dirname, '..');
const excludedProperties = new Set(['start','end','loc','extra','comments','leadingComments','innerComments','trailingComments','tokens','errors']);
function normalizeSyntax(value) {
  if (Array.isArray(value)) return value.map(normalizeSyntax);
  if (value && typeof value === 'object') {
    if (value.type === 'LogicalExpression') {
      const operands = [];
      function collect(expression) {
        if (expression.type === 'LogicalExpression' && expression.operator === value.operator) {
          collect(expression.left);
          collect(expression.right);
        } else operands.push(normalizeSyntax(expression));
      }
      collect(value);
      return {type:value.type, operator:value.operator, operands};
    }
    const result = {};
    for (const property of Object.keys(value)) {
      if (!excludedProperties.has(property)) result[property] = normalizeSyntax(value[property]);
    }
    return result;
  }
  return value;
}
function parseJavaScript(source, filename) {
  return parser.parse(source, {sourceType:'unambiguous', plugins:filename.endsWith('.ts')?['typescript']:[]});
}
function removeRanges(source, ranges) {
  for (const range of ranges.sort((first, second) => second.start - first.start)) {
    const whitespace = source.slice(range.start, range.end).replace(/[^\r\n]/g,' ');
    source = source.slice(0, range.start) + whitespace + source.slice(range.end);
  }
  return source;
}
(async function formatFiles() {
  const {parse} = await import('../work/refactor-tools/node_modules/parse5/dist/index.js');
  const files = process.argv.slice(2);
  const report = [];
  const notices = [];
  function preserveNotice(filename, text) {
    if (/copyright|@license|SPDX|permission is hereby|licensed under/i.test(text)) notices.push({filename,text});
  }
  for (const filename of files) {
    if (filename === 'google896cae5064a99afa.html') continue;
    const source = fs.readFileSync(path.join(root,filename),'utf8');
    const extension = path.extname(filename);
    let cleaned = source;
    let comments = 0;
    let format;
    let syntax;
    if (['.js','.cjs','.mjs','.ts'].includes(extension)) {
      syntax = parseJavaScript(source,filename);
      for (const comment of syntax.comments) preserveNotice(filename,comment.value);
      comments = syntax.comments.length;
      cleaned = removeRanges(source,syntax.comments);
      format = extension === '.ts' ? 'typescript' : 'babel';
    } else if (extension === '.css') {
      const stylesheet = postcss.parse(source);
      stylesheet.walkComments(comment => {comments++;preserveNotice(filename,comment.text);comment.remove();});
      cleaned = stylesheet.toString();
      format = 'css';
    } else if (extension === '.html') {
      const document = parse(source,{sourceCodeLocationInfo:true});
      const ranges = [];
      function findComments(node) {
        if (node.nodeName === '#comment') {comments++;preserveNotice(filename,node.data);ranges.push({start:node.sourceCodeLocation.startOffset,end:node.sourceCodeLocation.endOffset});}
        for (const child of node.childNodes || []) findComments(child);
        if (node.content) findComments(node.content);
      }
      findComments(document);
      cleaned = removeRanges(source,ranges);
      format = 'html';
    } else continue;
    const formatted = await prettier.format(cleaned,{parser:format,singleQuote:true,quoteProps:'preserve',printWidth:90,tabWidth:2,embeddedLanguageFormatting:'off'});
    if (syntax) assert.deepEqual(normalizeSyntax(parseJavaScript(formatted,filename)),normalizeSyntax(syntax),filename+' executable syntax changed');
    fs.writeFileSync(path.join(root,filename),formatted);
    report.push({filename,commentsRemoved:comments,executableSyntaxUnchanged:Boolean(syntax),linesBefore:source.split('\n').length,linesAfter:formatted.split('\n').length});
  }
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  const reportPath=path.join(root,'reports/refactor-format.json');
  const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):[];
  fs.writeFileSync(reportPath,JSON.stringify([...previous,...report],null,2)+'\n');
  if (notices.length) fs.appendFileSync(path.join(root,'SOURCE_NOTICES.md'),notices.map(notice=>'\n## '+notice.filename+'\n\n'+notice.text+'\n').join(''));
  console.log(JSON.stringify(report.map(({filename,commentsRemoved})=>({filename,commentsRemoved}))));
})().catch(error=>{console.error(error);process.exitCode=1;});
