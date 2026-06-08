#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');

const jsFiles = fs.readdirSync('js').filter(name => name.endsWith('.js')).map(name => `js/${name}`);
const sources = new Map(jsFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));
const exposedBySymbol = new Map();

for (const [file, source] of sources) {
    const exposeCall = /safeExposeGlobals\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
    let match;
    while ((match = exposeCall.exec(source))) {
        for (const entry of match[1].split(',')) {
            const symbolMatch = entry.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*:|$)/);
            if (!symbolMatch) continue;
            const symbol = symbolMatch[1];
            const owners = exposedBySymbol.get(symbol) || [];
            owners.push(file);
            exposedBySymbol.set(symbol, owners);
        }
    }
}

const duplicateExposures = [...exposedBySymbol.entries()].filter(([, owners]) => owners.length > 1);
assert.deepStrictEqual(duplicateExposures, [], `global symbols must have one owner: ${JSON.stringify(duplicateExposures)}`);

const utils = sources.get('js/utils.js');
assert(utils.includes('throw new Error("Duplicate global exposure: " + key)'), 'runtime global collisions must fail loudly');
assert(utils.includes('function dispatchRuntimeEvent(name, detail = {})'), 'runtime event dispatcher must remain available at the shared boundary');

const combat = sources.get('js/combat.js');
for (const uiDependency of ['openLoopHeroSelection', 'switchTab(', 'isLoopHeroSelectOpen', 'isStartupOverlayOpen', 'isLoadingOverlayOpen', 'isDeathOverlayOpen', 'document.']) {
    assert(!combat.includes(uiDependency), `combat must not depend directly on UI API: ${uiDependency}`);
}
assert(combat.includes("dispatchRuntimeEvent('loop-hero-selection-requested'"), 'combat must request loop selection through the runtime event boundary');

const emptyCatch = /catch\s*\([^)]*\)\s*\{\s*\}/;
for (const [file, source] of sources) {
    assert(!emptyCatch.test(source), `${file} must not contain an empty catch block`);
}

console.log('architecture boundary smoke checks passed');
