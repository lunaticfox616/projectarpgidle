'use strict';
/**
 * After functions moved from one page script to another (scripts/split-file.cjs): a top-level safeExposeGlobals({ a, b }) line names
 * functions by identifier, so it must stand in the file that declares them (in another file the name does not exist yet when the
 * line runs). redistribute(files) keeps in each line the names its own file declares (or that no listed file declares) and appends
 * the others, as one safeExposeGlobals line, to the file that declares them. It returns the statements that still name a function
 * of a LATER file while loading (files are given in load order): those need a look by hand.
 */
const fs = require('fs');
const espree = require('espree');

const parse = text => espree.parse(text, { ecmaVersion: 'latest', sourceType: 'script', range: true });
const closureOf = node => (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' && node.expression.callee.type === 'ArrowFunctionExpression'
    && node.expression.callee.body.type === 'BlockStatement' ? node.expression.callee.body.body : null);
/** Function names a file declares: at its top level and in its closure. */
function declaredFunctions(text) {
    return new Set(parse(text).body.flatMap(node => [node, ...(closureOf(node) || [])]).filter(node => node.type === 'FunctionDeclaration').map(node => node.id.name));
}

function identifiers(node, out) {
    if (!node || typeof node !== 'object' || /Function/.test(node.type || '')) return out;
    if (node.type === 'Identifier') out.add(node.name);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'range') continue;
        if (Array.isArray(value)) value.forEach(child => identifiers(child, out));
        else if (value && typeof value === 'object') identifiers(value, out);
    }
    return out;
}

function redistribute(files) {
    const rows = files.map(file => { const raw = fs.readFileSync(file, 'utf8'); return { file, eol: raw.includes('\r\n') ? '\r\n' : '\n', text: raw.replace(/\r\n/g, '\n') }; });
    const owners = new Map();
    rows.forEach(row => declaredFunctions(row.text).forEach(name => owners.set(name, row.file)));
    const extra = new Map(files.map(file => [file, []]));
    for (const row of rows) {
        const edits = [];
        for (const node of parse(row.text).body) {
            const call = node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' ? node.expression : null;
            if (!call || call.callee.name !== 'safeExposeGlobals' || call.arguments[0]?.type !== 'ObjectExpression') continue;
            const props = call.arguments[0].properties;
            if (!props.every(prop => prop.shorthand && prop.key.type === 'Identifier')) continue;
            const names = props.map(prop => prop.key.name), mine = names.filter(name => (owners.get(name) || row.file) === row.file);
            names.filter(name => owners.has(name) && owners.get(name) !== row.file).forEach(name => extra.get(owners.get(name)).push(name));
            if (mine.length !== names.length) edits.push([node.range, mine.length ? `safeExposeGlobals({ ${mine.join(', ')} });` : '']);
        }
        edits.reverse().forEach(([[start, end], next]) => { row.text = row.text.slice(0, start) + next + row.text.slice(end); });
    }
    for (const row of rows) {
        const names = [...new Set(extra.get(row.file))];
        if (names.length) row.text = row.text.replace(/\n*$/, '\n') + `\nsafeExposeGlobals({ ${names.join(', ')} });\n`;
        fs.writeFileSync(row.file, row.text.replace(/\n{4,}/g, '\n\n\n').replace(/\n/g, row.eol));
    }
    // A statement that uses, while the file loads, functions that now live in one later file goes to the end of that file (it runs a
    // little later than before, after the function exists). One that names several later files is left and reported.
    const order = new Map(files.map((file, index) => [file, index])), late = [], byFile = new Map(rows.map(row => [row.file, row]));
    for (const row of rows) {
        const cuts = [];
        for (const node of parse(row.text).body) {
            if (node.type === 'FunctionDeclaration' || closureOf(node)) continue;
            const names = [...identifiers(node, new Set())].filter(name => owners.has(name) && order.get(owners.get(name)) > order.get(row.file));
            const homes = [...new Set(names.map(name => owners.get(name)))];
            if (homes.length === 1) cuts.push([node.range, homes[0]]);
            else if (homes.length) late.push(`${row.file}: ${row.text.slice(node.range[0], node.range[0] + 70).replace(/\n/g, ' ')} -> ${names.map(name => `${name} (${owners.get(name)})`).join(', ')}`);
        }
        for (const [[start, end], home] of cuts.reverse()) {
            const target = byFile.get(home);
            target.text = target.text.replace(/\n*$/, '\n') + '\n' + row.text.slice(start, end) + '\n';
            row.text = row.text.slice(0, start) + row.text.slice(end);
        }
        if (cuts.length) console.log(`${row.file}: ${cuts.length} load-time statements moved to the files of their functions`);
    }
    for (const row of rows) fs.writeFileSync(row.file, row.text.replace(/\n{4,}/g, '\n\n\n').replace(/\n/g, row.eol));
    return late;
}

module.exports = { redistribute };
if (require.main === module) redistribute(process.argv.slice(2)).forEach(line => console.log('LATE ' + line));
