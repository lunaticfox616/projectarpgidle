'use strict';

const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const files = fs.readdirSync('css', { recursive: true }).filter(file => file.endsWith('.css'));
const counts = { files: files.length, roots: 0, tokens: 0, important: 0, byFile: {} };

for (const file of files) {
    const ast = postcss.parse(fs.readFileSync(path.join('css', file), 'utf8'), { from: file });
    ast.walkRules(rule => {
        if (rule.selector === ':root') {
            if (file !== 'tokens.css') throw rule.error('Global defaults belong in tokens.css');
            counts.roots++;
            rule.walkDecls(() => counts.tokens++);
        }
        let parent = rule.parent;
        while (parent && !(parent.type === 'atrule' && parent.name === 'layer')) parent = parent.parent;
        if (!parent) throw rule.error('Styles must declare their cascade layer');
    });
    ast.walkDecls(declaration => {
        if (/--(?:ui|game|luxe|reliquary|social)-[\w-]+/.test(declaration.toString())) {
            throw declaration.error('Use semantic tokens');
        }
        if (!declaration.important) return;
        if (declaration.prev()?.type !== 'comment') throw declaration.error('Explain the inline/state override exception');
        counts.important++;
        counts.byFile[file] = (counts.byFile[file] || 0) + 1;
    });
}
if (counts.roots !== 1) throw new Error('Exactly one global token root is required');
if (counts.important > 68) throw new Error('Important exceptions increased: review the cascade instead');
console.log(JSON.stringify(counts, null, 2));
