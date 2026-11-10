#!/usr/bin/env node
'use strict';
/**
 * Keeps a file's functions out of the page's one global scope (2026-11-10: 4,308 top-level functions in 63 files before this).
 *
 *   node scripts/privatize-functions.cjs --report            what each file would expose, nothing written
 *   node scripts/privatize-functions.cjs --apply [file ...]   rewrite the files (all eligible ones when none is named)
 *
 * A rewritten file starts with one closure that holds its functions, in their old order and with their comments, and ends that
 * closure with exposeFileGlobals({ ... }) (js/utils.js): the functions something outside the closure reaches by name. The other
 * statements of the file stay where they were, after the closure. Function declarations were hoisted, so their place in the file
 * never mattered. Run again, it moves top-level functions written since into the closure and writes the list anew (after
 * scripts/split-file.cjs, or when a function gained or lost its outside callers).
 *
 * A function is exposed when its name appears
 *   - in any other script, page, check or tool of the repository (js, cjs, mjs, html: calls, handler strings, test code),
 *   - in a string or template of its own file (inline handlers, names looked up on window),
 *   - in the file's statements outside the closure, or as window.name / globalThis.name,
 *   - or nowhere at all in the file's functions (nothing in the file calls it: left as it was rather than judged dead).
 * A function is not moved (it stays a top-level declaration) when its name is assigned to or declared again anywhere (a stub in a
 * check, a wrapper), when it does not start a line, or when it stands between dev-only marker lines, which a release strips
 * (scripts/lib/release-bundle.js).
 * js/utils.js and the scripts before it are left alone: exposeFileGlobals is defined there.
 *
 * What this cannot see: a name put together at run time (window['render' + kind]). The report lists the places that index window
 * with something other than a plain string.
 */
const fs = require('fs');
const cp = require('child_process');
const espree = require('espree');

const TOKEN = /[A-Za-z_$][\w$]*/g;
const NOTE = '// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).';
const parse = text => espree.parse(text, { ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true, comment: true });
const read = file => fs.readFileSync(file, 'utf8');
const tokensOf = text => new Set(text.match(TOKEN) || []);

function pageScripts() {
    const html = read('index.html');
    return [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]).filter(file => !/^https?:/.test(file) && !file.startsWith('vendor/'));
}

/** Every text of the repository that can name a game function: scripts, pages, checks and tools (new files not yet committed too). */
function corpus() {
    const files = cp.execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n')
        .filter(file => /\.(js|cjs|mjs|html)$/.test(file) && !/^(vendor|node_modules|dist|www|test-results|playwright-report)\//.test(file)
            && !['scripts/privatize-functions.cjs', 'scripts/split-file.cjs'].includes(file));
    const rows = new Map();
    for (const file of files) if (fs.existsSync(file)) rows.set(file, read(file));
    return rows;
}

function walk(node, visit) {
    if (!node || typeof node !== 'object') return;
    if (node.type) visit(node);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'loc' || key === 'range') continue;
        if (Array.isArray(value)) value.forEach(child => walk(child, visit));
        else if (value && typeof value === 'object') walk(value, visit);
    }
}

/** Names assigned to (x = ..., obj.x = ...) or declared as functions, per file. */
function pinnedNames(texts) {
    const assigned = new Map(), declared = new Map();
    const note = (map, name, file) => { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(file); };
    for (const [file, text] of texts) {
        for (const match of text.matchAll(/(?:^|[^\w$])([A-Za-z_$][\w$]*)\s*=(?![=>])/gm)) note(assigned, match[1], file);
        // a whole header: a search needle like 'function name' in a check is not a second declaration
        for (const match of text.matchAll(/function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) note(declared, match[1], file);
    }
    return { assigned, declared };
}

/** The file's closure, if it has one: the top-level (() => { ...functions...; exposeFileGlobals({ ... }); })(). */
function findClosure(ast) {
    for (const node of ast.body) {
        const callee = node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' ? node.expression.callee : null;
        if (!callee || callee.type !== 'ArrowFunctionExpression' || callee.body.type !== 'BlockStatement') continue;
        const last = callee.body.body[callee.body.body.length - 1];
        if (last && last.type === 'ExpressionStatement' && last.expression.type === 'CallExpression' && last.expression.callee.name === 'exposeFileGlobals') {
            if (callee.body.body.slice(0, -1).some(inner => inner.type !== 'FunctionDeclaration')) throw new Error('a closure holds something other than functions');
            return { node, functions: callee.body.body.slice(0, -1), expose: last };
        }
    }
    return null;
}

/** Lines between a dev-only marker line and its end marker line (both included): a release removes them as one piece. */
function devOnlyLines(lines) {
    const kept = new Set();
    let open = -1;
    lines.forEach((line, index) => {
        if (/^\/\* @dev-only \*\/\s*$/.test(line)) open = index;
        if (open >= 0) kept.add(index);
        if (/^\/\* @end-dev-only \*\/\s*$/.test(line)) open = -1;
    });
    return kept;
}

function analyze(file, texts, tokens, pins) {
    const text = read(file).replace(/\r\n/g, '\n'), ast = parse(text), lines = text.split('\n');
    const closure = findClosure(ast), devOnly = devOnlyLines(lines);
    const functions = ast.body.filter(node => node.type === 'FunctionDeclaration');
    const lineEnd = node => { const end = text.indexOf('\n', node.range[1]); return text.slice(node.range[1], end < 0 ? text.length : end); };
    const counts = new Map(); functions.forEach(node => counts.set(node.id.name, (counts.get(node.id.name) || 0) + 1));
    const stays = node => node.loc.start.column !== 0 || lineEnd(node).trim() !== '' || counts.get(node.id.name) > 1 || devOnly.has(node.loc.start.line - 1)
        || pins.assigned.has(node.id.name) || [...(pins.declared.get(node.id.name) || [])].some(other => other !== file);
    const moved = functions.filter(node => !stays(node));
    const inside = [...(closure ? closure.functions : []), ...moved];
    const kept = ast.body.filter(node => !moved.includes(node) && !(closure && node === closure.node));
    const reach = new Set();
    for (const node of kept) walk(node, child => { if (child.type === 'Identifier') reach.add(child.name); });
    walk(ast, node => {
        if (node.type === 'Literal' && typeof node.value === 'string') (node.value.match(TOKEN) || []).forEach(name => reach.add(name));
        if (node.type === 'TemplateElement') (node.value.raw.match(TOKEN) || []).forEach(name => reach.add(name));
        if (node.type === 'MemberExpression' && !node.computed && ['window', 'globalThis', 'self'].includes(node.object.name)) reach.add(node.property.name);
    });
    const used = new Set();   // names used inside some function of the closure other than as its own declaration
    for (const node of inside) walk(node, child => { if (child.type === 'Identifier' && child !== node.id) used.add(child.name); });
    const elsewhere = name => { for (const [other, set] of tokens) if (other !== file && set.has(name)) return true; return false; };
    const exposed = [], hidden = [];
    for (const node of inside) (reach.has(node.id.name) || elsewhere(node.id.name) || !used.has(node.id.name) ? exposed : hidden).push(node.id.name);
    const before = closure ? closure.expose.expression.arguments[0].properties.map(prop => prop.key.name) : null;
    const changed = moved.length > 0 || (!!before && before.join() !== exposed.join());
    return { file, text, ast, lines, closure, devOnly, functions, moved, inside, exposed, hidden, stayed: functions.length - moved.length, changed };
}

/** The moved function's first line, pulled back over the comment lines right above it (never into a dev-only stretch). */
function blockStart(row, node) {
    let line = node.loc.start.line - 1;
    const byEnd = new Map(row.ast.comments.filter(comment => comment.loc.start.column === 0).map(comment => [comment.loc.end.line - 1, comment]));
    while (byEnd.has(line - 1) && !row.devOnly.has(line - 1)) line = byEnd.get(line - 1).loc.start.line - 1;
    return line;
}

function rewrite(row) {
    const taken = new Array(row.lines.length).fill(false), blocks = [];
    for (const node of row.moved) {
        const start = blockStart(row, node), end = node.loc.end.line - 1;
        if (taken.slice(start, end + 1).some(Boolean)) throw new Error(`${row.file}: overlapping blocks at line ${start + 1}`);
        for (let i = start; i <= end; i++) taken[i] = true;
        blocks.push(row.lines.slice(start, end + 1).join('\n'));
    }
    const expose = `exposeFileGlobals({ ${row.exposed.join(', ')} });`;
    let next;
    if (row.closure) {
        const first = row.closure.node.loc.start.line - 1, last = row.closure.node.loc.end.line - 1, exposeLine = row.closure.expose.loc.start.line - 1;
        if (row.closure.expose.loc.end.line - 1 !== exposeLine) throw new Error(`${row.file}: the exposeFileGlobals list must be one line`);
        const body = row.lines.slice(first + 1, exposeLine).join('\n').replace(/\n+$/, '');
        const closure = ['(() => {', body, ...(blocks.length ? ['', blocks.join('\n\n')] : []), '', expose, '})();'];
        next = [...row.lines.slice(0, first).filter((line, index) => !taken[index]), ...closure, ...row.lines.slice(last + 1).filter((line, index) => !taken[last + 1 + index])];
    } else {
        const rest = row.lines.filter((line, index) => !taken[index]);
        let head = 0;   // the file's opening comment stays first
        while (head < rest.length && /^(\/\/|\/\*|\s\*|\*\/)/.test(rest[head]) && !/dev-only/.test(rest[head])) head++;
        next = [...rest.slice(0, head), NOTE, '(() => {', blocks.join('\n\n'), '', expose, '})();', ...rest.slice(head)];
    }
    const result = next.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/\n*$/, '\n');
    parse(result);   // the result must still be a script
    const raw = read(row.file);
    fs.writeFileSync(row.file, raw.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result);
}

function main() {
    const apply = process.argv.includes('--apply'), named = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    const scripts = pageScripts(), after = scripts.indexOf('js/utils.js');
    if (after < 0) throw new Error('js/utils.js is not a page script');
    const eligible = scripts.slice(after + 1);
    const texts = corpus(), tokens = new Map([...texts].map(([file, text]) => [file, tokensOf(text)])), pins = pinnedNames(texts);
    let exposed = 0, hidden = 0, stayed = 0;
    const rows = [];
    for (const file of (named.length ? named : eligible)) {
        if (!eligible.includes(file)) { console.log(`${file}: not after js/utils.js, left alone`); continue; }
        const row = analyze(file, texts, tokens, pins);
        stayed += row.stayed; exposed += row.exposed.length; hidden += row.hidden.length;
        if (!row.changed) continue;
        rows.push(row);
        console.log(`${file}: ${row.moved.length} functions moved in; ${row.exposed.length} exposed, ${row.hidden.length} file-only, ${row.stayed} left as declarations`);
    }
    console.log(`total: ${exposed + stayed} global function names (${exposed} exposed + ${stayed} declarations), ${hidden} file-only`);
    for (const [file, text] of texts) for (const match of text.matchAll(/\b(?:window|globalThis)\[(?!['"`])[^\]]{1,60}\]/g)) console.log(`dynamic name: ${file}: ${match[0]}`);
    if (apply) { rows.forEach(rewrite); console.log(`rewrote ${rows.length} files`); }
}

main();
