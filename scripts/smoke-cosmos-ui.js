const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const css = fs.readFileSync('css/cosmos-atlas.css', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const definitionsStart = source.indexOf('const COSMOS_MASTERY_NODES');
const definitionsEnd = source.indexOf('const GALAXY_SPECS', definitionsStart);
assert(definitionsStart >= 0 && definitionsEnd > definitionsStart);

const masteryPanel = { innerHTML: '' };
const values = { planetRelief: 6 };
const context = {
    document: { getElementById: id => id === 'cosmos-inner-mastery' ? masteryPanel : null },
    getCosmosMasteryFreePoints: () => 3,
    getCosmosMasteryTotalPoints: () => 9,
    getCosmosMasteryValue: key => values[key] || 0,
    getCosmosMasteryLockReason: key => key === 'combatFocus' ? '선행 노드 필요: 행성 패널티 완화 8레벨' : null,
    Math,
    Number,
    String
};
vm.createContext(context);
vm.runInContext(source.slice(definitionsStart, definitionsEnd) + readFunctionSource('renderMasteryPanel'), context, { filename: 'cosmos-mastery-ui.js' });
context.renderMasteryPanel();

assert(masteryPanel.innerHTML.includes('cosmos-mastery-grid'), 'mastery choices must render as a scannable card grid');
assert(masteryPanel.innerHTML.includes('사용 가능<strong>3</strong>'), 'available mastery points must be prominent');
assert(masteryPanel.innerHTML.includes('cosmos-mastery-card locked'), 'locked routes must have a visible state');
assert(masteryPanel.innerHTML.includes('선행 노드 필요: 행성 패널티 완화 8레벨'), 'locked routes must explain their prerequisite');
assert(source.includes('class="cosmos-map-toolbar"') && source.includes('class="cosmos-mode-tabs"'), 'atlas needs dedicated navigation and map controls');
assert(css.includes('.cosmos-summary-metrics') && css.includes('.cosmos-mastery-grid'), 'the redesigned dashboard and mastery cards need responsive styling');
assert(!source.includes('중앙 관문 + 5개 은하 · 행성 50개 · 소행성 75개'), 'the redundant atlas inventory sentence must be removed');
assert(!css.includes('max-height: min(72vh, 790px)'), 'the node detail must not create a second vertical scrollbar');
assert(css.includes('grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, .8fr)'), 'atlas summary columns must shrink inside the window');
assert(source.includes("tracePentagon(ctx, p.x, p.y, drawR, Math.PI / 4)"), 'asteroids must be visually distinct from planet nodes');

const canvas = { width: 2400, height: 1520 };
let hostRect = { width: 0, height: 0 };
const resizeContext = {
    ATLAS: { canvas, host: { getBoundingClientRect: () => hostRect }, dpr: 1 },
    window: { devicePixelRatio: 1 },
    Math
};
vm.createContext(resizeContext);
vm.runInContext(readFunctionSource('resizeCanvasToHost'), resizeContext, { filename: 'cosmos-canvas-resize.js' });
assert.strictEqual(resizeContext.resizeCanvasToHost(), false, 'a hidden atlas must skip canvas resizing');
assert.deepStrictEqual({ width: canvas.width, height: canvas.height }, { width: 2400, height: 1520 },
    'hidden-tab UI updates must not collapse the canvas to fallback dimensions');
hostRect = { width: 900, height: 540 };
assert.strictEqual(resizeContext.resizeCanvasToHost(), true, 'a visible atlas must resize to its host');
assert.deepStrictEqual({ width: canvas.width, height: canvas.height }, { width: 900, height: 540 });

console.log('smoke-cosmos-ui passed');
