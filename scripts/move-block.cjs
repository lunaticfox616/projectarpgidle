// Moves a run of top-level code from one script to a new file loaded right after a given script (move only).
// node move-block.cjs <from.js> <new.js> <after-script.js> <head comment file> <startPrefix> <endPrefix> [<startPrefix> <endPrefix> ...]
// A block runs from the line that starts with startPrefix (pulled back over its leading comment lines) up to the line that starts
// with endPrefix (also pulled back over that line's comments), which stays.
'use strict';
const fs = require('fs');
const [from, target, after, headFile, ...marks] = process.argv.slice(2);
if (fs.existsSync(target)) throw new Error(target + ' exists');
const raw = fs.readFileSync(from, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(eol);
const at = (prefix, fromLine = 0) => { const i = lines.findIndex((l, n) => n >= fromLine && l.startsWith(prefix)); if (i < 0) throw new Error('not found: ' + prefix); return i; };
const back = i => { while (i > 0 && /^(\/\/|\/\*\*| \*)/.test(lines[i - 1])) i--; return i; };
const moved = [];
for (let k = 0; k < marks.length; k += 2) {
    const s = back(at(marks[k])), e = back(at(marks[k + 1], s + 1));
    const block = lines.slice(s, e);
    while (block.length && block[block.length - 1] === '') block.pop();
    moved.push(...block, '');
    lines = [...lines.slice(0, s), ...lines.slice(e)];
    console.log(`${marks[k]} .. ${marks[k + 1]}: ${e - s} lines`);
}
const head = fs.readFileSync(headFile, 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n');
fs.writeFileSync(target, [...head, '', ...moved].join('\n').replace(/\n+$/, '\n'));
fs.writeFileSync(from, lines.join(eol));
let html = fs.readFileSync('index.html', 'utf8');
const tag = html.match(new RegExp(`<script defer src="${after.replace(/[./]/g, '\\$&')}(\\?[^"]*)?"></script>\\r?\\n`));
if (!tag) throw new Error('script tag not found: ' + after);
html = html.replace(tag[0], tag[0] + `<script defer src="${target}"></script>` + (tag[0].endsWith('\r\n') ? '\r\n' : '\n'));
fs.writeFileSync('index.html', html);
let runtime = fs.readFileSync('scripts/lib/game-runtime.js', 'utf8');
if (!runtime.includes(`'${after}', `)) throw new Error('runtime list lacks ' + after);
fs.writeFileSync('scripts/lib/game-runtime.js', runtime.replace(`'${after}', `, `'${after}', '${target}', `));
console.log('moved', moved.length, 'lines to', target);
