'use strict';

const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const files = fs.readdirSync('css', { recursive: true }).filter(file => file.endsWith('.css'));
const counts = { files: files.length, roots: 0, tokens: 0, important: 0, byFile: {} };

/** The compounds after a selector's last ':has(...)': Chrome merges them from every such rule into one invalidation set that runs
 * whenever any :has() state may change (a body :has() rule makes that nearly every DOM write). A bare tag there (button, span)
 * restyled every element of that tag: the inventory's hundreds of cell buttons every frame with a window open (2026-10-07). */
function bareTagAfterHas(selector) {
    const at = selector.lastIndexOf(':has(');
    if (at < 0) return null;
    let depth = 0, end = at + 4;
    for (; end < selector.length; end++) {
        if (selector[end] === '(') depth++;
        else if (selector[end] === ')' && --depth === 0) break;
    }
    const rest = selector.slice(end + 1).replace(/:{1,2}[\w-]+(\([^)]*\))?/g, '');
    return rest.split(/[\s>+~]+/).find(compound => /^[a-z][a-z0-9-]*$/i.test(compound)) || null;
}

for (const file of files) {
    const ast = postcss.parse(fs.readFileSync(path.join('css', file), 'utf8'), { from: file });
    ast.walkRules(rule => {
        if (rule.selector === ':root') {
            if (file !== 'tokens.css') throw rule.error('Global defaults belong in tokens.css');
            counts.roots++;
            rule.walkDecls(() => counts.tokens++);
        }
        // 라이트 모드는 2026-09 개편에서 제거했다(다크 전용). 다시 생기지 않게 막는다.
        if (rule.selector.includes('light-mode')) throw rule.error('Light mode was removed; the game is dark-only');
        for (const selector of rule.selectors || []) {
            const tag = bareTagAfterHas(selector);
            if (tag) throw rule.error(`'${tag}' after :has() restyles every <${tag}> on each :has() change: name it by class or id`);
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
if (counts.important > 65) throw new Error('Important exceptions increased: review the cascade instead');
console.log(JSON.stringify(counts, null, 2));
