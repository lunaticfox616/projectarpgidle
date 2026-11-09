#!/usr/bin/env node
'use strict';
/**
 * Moves a run of functions out of a file's closure (scripts/privatize-functions.cjs) into a new file with a closure of its own.
 *
 *   node scripts/split-file.cjs <from.js> <new.js> <head comment file> <first function> <last function> [<first> <last> ...]
 *
 * Each pair names the first and last function of a run, in the order they stand in <from.js>; the comments right above a function
 * go with it. The new file is read right after <from.js> (index.html and the smoke runtime's list), and both files get their
 * exposeFileGlobals lists written anew, so a function the two files now call across is exposed and nothing else is.
 * Statements outside the closure stay in <from.js>. Afterwards: node scripts/check-runtime-architecture.js --moved, npm test.
 * A statement of <from.js> that uses a moved function while the file loads would now run before that function exists: the smoke
 * runtime stops on it, and check:architecture reports a call (load-order).
 */
const fs = require('fs');
const cp = require('child_process');
const espree = require('espree');

const [from, target, headFile, ...names] = process.argv.slice(2);
if (!from || !target || !headFile || !names.length || names.length % 2) throw new Error('usage: split-file.cjs <from.js> <new.js> <head comment file> <first> <last> ...');
if (fs.existsSync(target)) throw new Error(`${target} exists`);
const raw = fs.readFileSync(from, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n', text = raw.split(eol).join('\n');
const ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true, comment: true });
const closure = ast.body.map(node => (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' && node.expression.callee.type === 'ArrowFunctionExpression'
    ? node.expression.callee.body.body : null)).find(body => body && body.length && body[body.length - 1].expression?.callee?.name === 'exposeFileGlobals');
if (!closure) throw new Error(`${from} has no closure: run scripts/privatize-functions.cjs --apply ${from} first`);
const functions = closure.filter(node => node.type === 'FunctionDeclaration'), lines = text.split('\n');
const commentEnds = new Map(ast.comments.filter(comment => comment.loc.start.column === 0).map(comment => [comment.loc.end.line - 1, comment]));
const startOf = node => { let line = node.loc.start.line - 1; while (commentEnds.has(line - 1)) line = commentEnds.get(line - 1).loc.start.line - 1; return line; };
const taken = new Array(lines.length).fill(false), blocks = [];
let count = 0;
for (let i = 0; i < names.length; i += 2) {
    const a = functions.findIndex(node => node.id.name === names[i]), b = functions.findIndex(node => node.id.name === names[i + 1]);
    if (a < 0 || b < a) throw new Error(`run not found in order: ${names[i]} .. ${names[i + 1]}`);
    const start = startOf(functions[a]), end = functions[b].loc.end.line - 1;
    if (taken.slice(start, end + 1).some(Boolean)) throw new Error(`runs overlap at ${names[i]}`);
    for (let line = start; line <= end; line++) taken[line] = true;
    blocks.push(lines.slice(start, end + 1).join('\n'));
    count += b - a + 1;
}
const head = fs.readFileSync(headFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
const note = '// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).';
fs.writeFileSync(target, [head, note, '(() => {', blocks.join('\n\n'), '', 'exposeFileGlobals({  });', '})();', ''].join('\n'));
fs.writeFileSync(from, lines.filter((line, index) => !taken[index]).join('\n').replace(/\n{4,}/g, '\n\n\n').split('\n').join(eol));
let html = fs.readFileSync('index.html', 'utf8');
const tag = html.match(new RegExp(`<script defer src="${from.replace(/[./]/g, '\\$&')}(\\?[^"]*)?"></script>\\r?\\n`));
if (!tag) throw new Error(`no script tag for ${from}`);
fs.writeFileSync('index.html', html.replace(tag[0], tag[0] + `<script defer src="${target}"></script>` + (tag[0].endsWith('\r\n') ? '\r\n' : '\n')));
const runtimeList = 'scripts/lib/game-runtime.js', runtime = fs.readFileSync(runtimeList, 'utf8');
if (!runtime.includes(`'${from}', `)) throw new Error(`${runtimeList} does not list ${from}`);
fs.writeFileSync(runtimeList, runtime.replace(`'${from}', `, `'${from}', '${target}', `));
console.log(`${count} functions: ${from} -> ${target}`);
cp.execFileSync(process.execPath, ['scripts/privatize-functions.cjs', '--apply', from, target], { stdio: 'inherit' });
