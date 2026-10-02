// 드랍 연출(2026-10-03 사용자 요청): 한 처치의 드랍은 한 자리에 한 더미로 떨어진다. 대표 그림 하나 위에 PoE처럼
// 이름표가 쌓이고(가장 중요한 이름이 그림 바로 위), 넘치면 "외 N개" 한 줄이다. 빛기둥은 더미 단위, 겹치는 묶음은 위로 비킨다.
// 전에는 처치 하나의 드랍이 원형으로 흩어져 드랍마다 그림과 이름표가 따로 떴다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const espree = require('espree');
const { buildGameRuntime } = require('./lib/game-runtime');

// Only the browser boundary is simulated; loot receipts and the presentation module are real.
const nodes = [], ids = new Map();
let now = 1000, width = 800;
const ctx = { resetTransform() {}, clearRect() {}, setTransform() {}, getTransform() { return {}; } };
function element(tag = 'div') {
    const properties = new Map(), classes = new Set();
    const node = { tag, style: { setProperty: (k, v) => properties.set(k, v), getPropertyValue: k => properties.get(k) || '' },
        dataset: {}, children: [], hidden: false, offsetWidth: 80, offsetLeft: 0, offsetTop: 0,
        get clientWidth() { return width; }, clientHeight: 600, width: 800, height: 600, offsetParent: {},
        className: '', textContent: '', innerHTML: '', removed: false,
        classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k) },
        setAttribute() {}, addEventListener() {}, getAnimations: () => [], getContext: () => ctx,
        animate: () => ({ cancel() {} }), remove() { this.removed = true; },
        append(...children) { this.children.push(...children); this.firstElementChild = this.children[0]; },
        prepend(child) { this.children.unshift(child); },
        querySelector(selector) { return this.children.find(child => '.' + child.className === selector) || null; } };
    nodes.push(node);
    return node;
}
const source = element('canvas'); source.parentElement = element();
ids.set('divine-drop-banner', element());
const runtime = buildGameRuntime({}, new EventTarget(), { createElement: element, getElementById: id => ids.get(id) || null });
runtime.performance.now = () => now;
runtime.getComputedStyle = () => ({ getPropertyValue: () => '', transform: 'none', borderTopColor: '#ddb655', color: '#fff3c4' });
runtime.source = source; runtime.ctx = ctx;
const run = code => vm.runInContext(code, runtime);
// getStyledOrbName is nested in the legacy DOM refresh (see smoke-exploration-loot-presentation): load its unchanged body.
const ui = fs.readFileSync('js/ui.js', 'utf8');
const pending = [espree.parse(ui, { ecmaVersion: 'latest', range: true })];
while (pending.length) {
    const node = pending.pop();
    if (node.type === 'FunctionDeclaration' && node.id.name === 'getStyledOrbName') { vm.runInContext(ui.slice(...node.range), runtime); break; }
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) pending.push(...value.filter(child => child?.type));
        else if (value?.type) pending.push(value);
    }
}

const frame = () => run(`battleGroundLoot.actorContext(source, ctx, ${now}, { actorGroundOffsetY: 8, cellToScreen: (gx, gy) => ({ x: gx * 48, y: gy * 48 }) })`);
const live = () => nodes.filter(node => node.className === 'battle-loot-drop' && !node.removed);
const part = (pile, className) => pile.children.find(child => child.className === className);
const rows = pile => part(pile, 'battle-loot-labels').children.map(row => row.dataset.currency || `${row.dataset.rarity || 'more'}:${row.textContent}`);
const iconCurrencies = count => run(`JSON.stringify(Object.keys(ORB_DB).filter(key => ORB_DB[key].icon && key !== 'goldenRule').slice(0, ${count}))`);

run(`game = mergeDefaults({ level: 30, currentZoneId: 1, settings: { showLootLog: false } });
    battleVisualState.enemySmoothPos = {}; battleVisualState.enemyGhostPos = {};
    window.killA = { id: 9001, gx: 6, gy: 6 }; window.killB = { id: 9002, gx: 7, gy: 6 };
    battleVisualState.enemySmoothPos[9001] = { x: 300, y: 300 }; battleVisualState.enemySmoothPos[9002] = { x: 330, y: 300 };
    window.ring = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '반지'), 'rare', 20, {});
    queueEnemyGroundLoot(killA, { currency: 'magicBud', count: 3 });
    queueEnemyGroundLoot(killA, { item: ring, itemKind: 'equipment' });
    queueEnemyGroundLoot(killA, { currency: 'goldenRule', count: 1 });
    for (const key of ${iconCurrencies(8)}) queueEnemyGroundLoot(killB, { currency: key, count: 2 });`);
frame();

const piles = live();
assert.equal(piles.length, 2, 'one pile per kill, not one marker per drop');
const golden = piles.find(pile => pile.dataset.currency === 'goldenRule');
const plenty = piles.find(pile => pile !== golden);
assert.ok(golden && plenty);
assert.equal(golden.children.filter(child => child.className === 'battle-loot-flight').length, 1, 'one item picture per pile');
assert.deepEqual(rows(golden), ['goldenRule', `rare:${run('ring.name')}`, 'magicBud'],
    'names stack by importance: golden rule, then rarity (the first row sits nearest the picture)');
assert.equal(golden.dataset.beam, 'true', 'a pile holding a major drop gets the beam');
assert.equal(plenty.dataset.beam, undefined);
const wide = rows(plenty);
assert.equal(wide.length, 6, 'a wide battlefield shows six rows');
assert.equal(wide.at(-1), 'more:외 3개', 'the rest fold into one row');
assert.ok(parseFloat(plenty.style.getPropertyValue('--label-lift')) > 0, 'an overlapping name column moves up instead of covering the other');
assert.equal(golden.style.getPropertyValue('--label-lift'), '0px');

// Phones get three rows: two names and the fold.
width = 500;
now += 100;
run(`window.killC = { id: 9003, gx: 2, gy: 2 }; battleVisualState.enemySmoothPos[9003] = { x: 120, y: 420 };
    for (const key of ${iconCurrencies(8)}) queueEnemyGroundLoot(killC, { currency: key, count: 1 });`);
frame();
const phone = live().find(pile => !piles.includes(pile));
assert.ok(phone, 'the next kill drops its own pile');
assert.deepEqual(rows(phone).length, 3);
assert.equal(rows(phone).at(-1), 'more:외 6개');
console.log('Ground loot piles: one picture per kill, stacked names by importance, fold row, beam per pile, column lift: OK');
