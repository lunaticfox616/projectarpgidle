// 프레임 드랍 방지(2026-10-07 사용자 요청: "프레임드랍 문제좀 해결해줘"). 4배 느린 휴대폰 엔드게임에서 잰 원인:
// - 매 프레임 그리기 맨 앞과 중간에 캔버스 크기(offsetParent, clientWidth)를 읽어, 틱이 바꾼 DOM의 스타일 계산을 그 자리에서 강제했다.
// - 그리는 도중에 탐험 오브젝트 단추를 옮겨, 다음 ctx.font나 ctx.filter가 스타일을 또 계산했다.
// - 길찾기가 칸을 볼 때마다 지도 명세를 다시 만들었다(generated가 캐시를 보기 전에 build).
// - 몇 초마다 알림 점 하나에 탭 머리와 휴대폰 메뉴를 통째로 다시 그리고, 같은 글자와 body 변수를 다시 썼다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/** A top-level function's source (through its closing brace at column 0). */
function sliceFunction(source, name, indent = '') {
    const start = source.indexOf(`${indent}function ${name}(`);
    assert.ok(start >= 0, `${name} must exist`);
    const end = source.slice(start).search(new RegExp(`\\r?\\n${indent}\\}\\r?\\n`));
    assert.ok(end > 0, `${name} must have a closing brace`);
    return source.slice(start, start + end + indent.length + 3);
}
const read = file => fs.readFileSync(file, 'utf8');
const battlefield = read('js/canvas-battlefield.js'), fxRemake = read('js/canvas-fx-remake.js'), loot = read('js/battle-ground-loot-ui.js');
const ui = read('js/ui.js'), passives = read('js/passives.js');

// ── 그리기 경로는 배치를 읽지 않는다 ─────────────────────────────────────────────────────
const layoutRead = /offsetParent|clientWidth|clientHeight|offsetLeft|offsetTop|getBoundingClientRect/;
assert.doesNotMatch(sliceFunction(battlefield, 'renderBattlefield'), layoutRead, 'renderBattlefield reads the measured box, not the layout');
assert.doesNotMatch(sliceFunction(fxRemake, 'boardView', '    '), layoutRead, 'the redrawn-dots layer reads the measured box');
for (const name of ['visible', 'resize', 'projectEntries']) {
    assert.doesNotMatch(sliceFunction(loot, name, '    '), layoutRead, `ground loot ${name} reads the measured box`);
}
assert.match(sliceFunction(battlefield, 'renderBattlefield'), /objects\.flushButtons\(\)/, 'object buttons move after the frame has drawn');
// 효과 아이콘 줄은 시계 고리가 도는 동안 제자리에서 고친다(브라우저 검사: tests/browser/combat-hud-state.spec.js).
assert.match(sliceFunction(ui, 'updatePlayerCombatEffectHud'), /patchCombatEffectStrip\(/, 'the player effect strip patches in place');
assert.doesNotMatch(ui, /ailmentEl\.innerHTML\s*=/, 'and so does the enemy one');
assert.doesNotMatch(sliceFunction(ui, 'renderEnergyShieldInline'), /innerHTML/, 'the shield text changes only its numbers');

// ── 잰 크기: 한 번 재고, 크기가 바뀌거나 1초가 지나거나 잊으라 할 때만 다시 잰다 ─────────────────────
{
    const start = battlefield.indexOf('const battleCanvasBox');
    const box = battlefield.slice(start, battlefield.indexOf('function renderBattlefield', start));
    let clock = 0, reads = 0, shown = true;
    const observers = [];
    const context = { performance: { now: () => clock }, ResizeObserver: class { constructor(callback) { observers.push(callback); } observe() {} } };
    vm.createContext(context);
    vm.runInContext(box, context);
    const cache = vm.runInContext('battleCanvasBox', context);
    const canvas = {
        get offsetParent() { reads++; return shown ? {} : null; }, get clientWidth() { reads++; return 800; }, get clientHeight() { reads++; return 450; },
        get offsetLeft() { return 4; }, get offsetTop() { return 2; }
    };
    const first = cache.read(canvas);
    assert.deepEqual([first.width, first.height, first.left, first.top], [800, 450, 4, 2]);
    const measured = reads;
    for (let i = 0; i < 30; i++) cache.read(canvas);
    assert.equal(reads, measured, 'frames reuse the measured box');
    observers[0]();
    cache.read(canvas);
    assert.ok(reads > measured, 'a resize measures again');
    let before = reads;
    clock += 1000;
    cache.read(canvas);
    assert.ok(reads > before, 'a move without a resize shows within a second');
    before = reads;
    cache.forget();
    shown = false;
    assert.equal(cache.read(canvas).width, 0, 'a hidden canvas (display:none here or above) measures 0');
    assert.ok(reads > before);
}

// ── 런의 지도는 런마다 한 번 만든다(명세를 다시 읽지 않는다), 방향이나 명세가 바뀌면 다시 ─────────────
{
    const { run } = require('./audit-combat-20260905').prepare();
    run(`globalThis.__specReads = 0;
        globalThis.__probeRun = { source: { get style() { __specReads++; return 'act'; }, act: 3, seed: 'probe' }, rotation: 1 };`);
    const first = run('actExplorationMap.forRun(__probeRun)');
    const afterFirst = run('__specReads');
    assert.ok(afterFirst > 0);
    for (let i = 0; i < 50; i++) assert.equal(run('actExplorationMap.forRun(__probeRun)'), first, 'the same run gets the same map');
    assert.equal(run('__specReads'), afterFirst, 'grid checks no longer rebuild the map spec');
    assert.equal(run('(__probeRun.rotation = 2, actExplorationMap.forRun(__probeRun)).rotation'), 2, 'a new facing is not served stale');
    const other = run(`(__probeRun.source = { style: 'act', act: 4, seed: 'probe' }, actExplorationMap.forRun(__probeRun))`);
    assert.notEqual(other.id, first.id, 'a new map spec is not served stale');
}

// ── 같은 값은 다시 쓰지 않는다 ─────────────────────────────────────────────────────────
{
    const context = {};
    vm.createContext(context);
    vm.runInContext(sliceFunction(ui, 'setUiImageGaugePercent'), context);
    let writes = 0;
    const gauge = { style: { setProperty() { writes++; } } };
    context.setUiImageGaugePercent(gauge, 40);
    const once = writes;
    context.setUiImageGaugePercent(gauge, 40);
    assert.equal(writes, once, 'an unchanged gauge is not written again');
    context.setUiImageGaugePercent(gauge, 41);
    assert.ok(writes > once, 'a changed gauge is');
}
{
    let formats = 0;
    const context = { game: { settings: { damageNumberFormat: 'comma' } }, formatDamageNumberForDisplay: value => { formats++; return String(value); } };
    vm.createContext(context);
    vm.runInContext(sliceFunction(passives, 'getDamageTextLabel'), context);
    const text = { value: 1033, enemyHit: false };
    for (let frame = 0; frame < 20; frame++) assert.equal(context.getDamageTextLabel(text), '1033');
    assert.equal(formats, 1, 'a damage number is formatted once, not every frame');
    text.value = 2000;
    assert.equal(context.getDamageTextLabel(text), '2000', 'a merged number formats again');
    context.game.settings.damageNumberFormat = 'korean';
    context.getDamageTextLabel(text);
    assert.equal(formats, 3, 'and so does a new number format');
}
{
    let writes = 0;
    const element = () => {
        let text = '';
        const attributes = {};
        return {
            get textContent() { return text; }, set textContent(value) { writes++; text = value; },
            getAttribute: name => (name in attributes ? attributes[name] : null), setAttribute(name, value) { writes++; attributes[name] = value; },
            classList: { toggle() {} }
        };
    };
    const elements = { 'left-pane': element(), 'left-pane-collapse-toggle': element(), 'left-pane-floating-toggle': element(),
        'left-pane-expand-fab': element(), 'btn-combat-log-toggle': element() };
    const context = {
        game: { settings: { leftPaneCollapsed: false, combatLogCollapsed: true } },
        uiDisplay: { matches: () => false },
        document: { getElementById: id => elements[id] || null, querySelector: () => element(), body: { classList: { toggle() {} } } }
    };
    vm.createContext(context);
    vm.runInContext(sliceFunction(passives, 'applyPanelLayoutSettings') + '\n' + sliceFunction(passives, 'syncPanelToggle'), context);
    context.applyPanelLayoutSettings();
    assert.ok(writes > 0);
    assert.equal(elements['btn-combat-log-toggle'].getAttribute('aria-label'), '전투 기록 펼치기');
    const first = writes;
    context.applyPanelLayoutSettings();
    assert.equal(writes, first, 'refreshing the static UI with nothing changed writes nothing');
}

// ── 알림 점 하나에는 점만 다시 칠한다(탭 머리와 휴대폰 메뉴를 통째로 다시 그리지 않는다) ─────────────────
{
    const calls = { order: 0, dots: 0, bar: 0 };
    const context = {
        game: { noti: {}, settings: {} }, TAB_HEADER_NOTI_KEYS: ['items', 'char'],
        getTabHeaderUiSignature: () => 'same', updateTabUnlockButtons() {}, applyTabGroupFilter() {},
        applyTabHeaderOrder: () => calls.order++, updateTabNotificationDots: () => calls.dots++, renderTabCategoryBar: () => calls.bar++,
        isTabGroupingActive: () => false
    };
    vm.createContext(context);
    const start = ui.indexOf('let lastTabNotiSignature');
    vm.runInContext('let lastTabHeaderUiSignature = "";\n' + ui.slice(start, ui.indexOf('function isNotiEnabled', start)), context);
    assert.equal(context.refreshTabHeaderUiIfNeeded(), true);
    assert.deepEqual({ ...calls }, { order: 1, dots: 1, bar: 1 });
    context.refreshTabHeaderUiIfNeeded();
    assert.deepEqual({ ...calls }, { order: 1, dots: 1, bar: 1 }, 'nothing changed, nothing redrawn');
    context.game.noti.items = true;
    assert.equal(context.refreshTabHeaderUiIfNeeded(), false);
    assert.deepEqual({ ...calls }, { order: 1, dots: 2, bar: 1 }, 'a new dot repaints the dots only');
    context.refreshTabHeaderUiIfNeeded();
    assert.equal(calls.dots, 2, 'once');
}

console.log('smoke-frame-drop-guards: ok');
