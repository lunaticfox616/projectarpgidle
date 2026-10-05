// 드랍 연출(2026-10-03 사용자 요청): 한 처치의 드랍은 한 자리에 한 더미로 떨어진다. 대표 그림 하나 둘레에
// 이름표가 십자로 놓이고(위 팔이 그림 바로 위, 많으면 좌우와 아래), 넘치는 드랍은 이름을 생략한다("외 N개"는 쓰지 않는다).
// 빛기둥은 더미 단위, 겹치는 위 팔은 위로 비킨다.
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

const frame = (camera = 0) => run(`battleGroundLoot.actorContext(source, ctx, ${now}, { actorGroundOffsetY: 8, cellToScreen: (gx, gy) => ({ x: gx * 48 - ${camera}, y: gy * 48 }) })`);
const live = () => nodes.filter(node => node.className === 'battle-loot-drop' && !node.removed);
const arms = pile => pile.children.filter(child => String(child.className).startsWith('battle-loot-labels'));
const rows = pile => arms(pile).flatMap(arm => arm.children.map(row => row.dataset.currency || `${row.dataset.rarity}:${row.textContent}`));
const armNames = pile => arms(pile).map(arm => arm.className.replace('battle-loot-labels', '').trim() || 'up');
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
assert.deepEqual(armNames(golden), ['up']);
assert.equal(golden.dataset.tier, 'major');
assert.equal(golden.dataset.beam, 'true', 'a pile holding a major drop gets the beam');
assert.equal(plenty.dataset.beam, undefined);
// Eight names on a wide battlefield: six over the picture, then one to each side. Never a "외 N개" row (user, 2026-10-03).
assert.equal(rows(plenty).length, 8, 'every drop keeps its name');
assert.deepEqual(armNames(plenty), ['up', 'is-right', 'is-left'], 'the names spread out in a cross');
assert.ok(!rows(plenty).some(row => row.includes('외')), 'no fold row');
assert.ok(parseFloat(plenty.style.getPropertyValue('--label-lift')) > 0, 'an overlapping name column moves up instead of covering the other');
assert.equal(golden.style.getPropertyValue('--label-lift'), '0px');

// A huge pile fills every arm (6, 2, 2, 3) and leaves the rest unnamed rather than folding them.
now += 100;
run(`window.killD = { id: 9004, gx: 8, gy: 3 }; battleVisualState.enemySmoothPos[9004] = { x: 620, y: 260 };
    for (let i = 0; i < 20; i++) queueEnemyGroundLoot(killD, { currency: 'magicBud', count: i + 1 });`);
frame();
const huge = live().find(pile => !piles.includes(pile));
assert.deepEqual(armNames(huge), ['up', 'is-right', 'is-left', 'is-down']);
assert.equal(rows(huge).length, 13, 'six up, two each side, three down');
piles.push(huge);

// Two piles side by side: the later pile's left arm would cover the earlier pile's right arm, so it is left out.
now += 100;
run(`window.killE = { id: 9005, gx: 1, gy: 7 }; window.killF = { id: 9006, gx: 3, gy: 7 };
    battleVisualState.enemySmoothPos[9005] = { x: 100, y: 520 }; battleVisualState.enemySmoothPos[9006] = { x: 180, y: 520 };
    for (const kill of [killE, killF]) for (let i = 0; i < 8; i++) queueEnemyGroundLoot(kill, { currency: 'sapBud', count: i + 1 });`);
frame();
const [earlier, later] = live().filter(pile => !piles.includes(pile));
const shown = pile => arms(pile).filter(arm => !arm.hidden).map(arm => arm.className.replace('battle-loot-labels', '').trim() || 'up');
assert.deepEqual(shown(earlier), ['up', 'is-right', 'is-left'], 'the earlier pile keeps its whole cross');
assert.deepEqual(shown(later), ['up', 'is-right'], 'the later left arm gives way instead of covering names');
piles.push(earlier, later);

// Phones: three up, one each side, two down.
width = 500;
now += 100;
run(`window.killC = { id: 9003, gx: 2, gy: 2 }; battleVisualState.enemySmoothPos[9003] = { x: 120, y: 420 };
    for (const key of ${iconCurrencies(8)}) queueEnemyGroundLoot(killC, { currency: key, count: 1 });`);
frame();
const phone = live().find(pile => !piles.includes(pile));
assert.ok(phone, 'the next kill drops its own pile');
assert.deepEqual(armNames(phone), ['up', 'is-right', 'is-left', 'is-down']);
assert.equal(rows(phone).length, 7);
assert.ok(!rows(phone).some(row => row.includes('외')));
assert.equal(golden.style.left, '288px', 'pile stays on its actual cell, not the enemy animation position');
assert.equal(golden.style.top, '296px');
run('killA.gx = 0; battleVisualState.enemySmoothPos[9001].x = 10');
frame(48);
assert.equal(golden.style.left, '240px', 'camera movement projects the saved cell again');
assert.equal(golden.dataset.gx, '6', 'later enemy motion cannot change the receipt cell');
frame(1000);
assert.equal(golden.hidden, true, 'offscreen loot does not cling to the viewport edge');
frame();
assert.equal(golden.hidden, false);
const countBefore = live().length;
run(`queueEnemyGroundLoot({id:9010,gx:4,gy:4},{currency:'sapBud',count:1});
    queueEnemyGroundLoot({id:9011,gx:4,gy:4},{currency:'magicBud',count:1});`);
frame();
assert.equal(live().length, countBefore + 1, 'same-frame drops on the same cell share one pile');
console.log('Ground loot piles: one picture per kill, names by importance in a cross, no fold row, beam per pile, column lift: OK');
