// 능력치 계산의 틱 분리와 캐시(2026-10-08, js/player-stat-cache.js): 정산과 평소 플레이가 같은 계산을 다시 쓰는 규칙.
// 계산은 빌드가 그대로인 동안 다시 쓰고, 싸우는 동안 바뀌는 값(시계, 생명력, 중첩, 시한 버프, 적)은 틱으로만 읽는다.
// 1. 정적 검사: 계산 본체(getPlayerStats의 장비 보기 경로)가 닿는 함수는 시계를 직접 읽지 않는다. game에서 읽는 필드는 빌드 입력
//    (BUILD_STAT_FIELDS, BUILD_STAT_PARTS)이나 맥락(PLAYER_STAT_CONTEXT_FIELDS)이고, 쓰는 필드는 PLAYER_STAT_DERIVED_WRITES이며,
//    모듈 상태는 MODULE_STATE에 이유가 적힌 것만 읽는다. 새 콘텐츠가 이 규칙을 어기면 실패하고, 메시지가 고칠 곳을 알려 준다.
// 2. 정산: 캐시로 답할 때마다 새 계산과 같고(시작 빌드, 전사 키스톤), 객체 안쪽 읽기도 키가 덮고, 캐시를 끈 정산과 끝이 같다.
// 3. 평소 플레이: 입력 없이 코드로 바꾼 빌드 편집 11가지를 다음 계산이 바로 알고, 세대, 자체 점검, 손으로 켠 백그라운드 표시,
//    예외로 열린 사건이 제대로 돈다.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const espree = require('espree');
const replayFixture = require('./lib/replay-fixture');
const configureOfflineEndgameFixture = require('./lib/offline-endgame-fixture');
const { SHADOW, NESTED, readShadow, assertShadow } = require('./lib/player-stat-shadow');

// 정규화만 하는 함수가 틱 필드의 모양을 다듬는 것은 괜찮다(값은 틱으로만 계산에 들어간다).
const NORMALIZERS = { normalizePassiveSpecializationState: ['cycleBuffs', 'fanaticism'] };
// 계산이 읽는 모듈 상태와 바뀌는 전역 변수, 그리고 캐시 키가 따로 필요 없는 까닭. 새 항목은 키에 넣거나 바꾸는 쪽이
// playerStatCache.invalidate()를 부르게 한 뒤 여기에 이유를 적는다.
const MODULE_STATE = {
    ascendKeystoneOwnerIndex: 'index of the fixed class trees, built once',
    passiveTreeAdjacencyCache: 'adjacency of the fixed passive tree',
    'combatEquipmentStats.tickResults': 'equipment evaluations shared within one tick',
    'stumpBox.memo': 'memo keyed by the stump board and its signature',
    'talismanEffects.memo': 'memo keyed by the stump board and its signature',
    'skillEffectExpansion.testLevel': 'test panel level; setTestLevel drops kept stat calculations'
};
// 매 호출 끝(finishPlayerStats), 틱 자체, 틱 없이 부르는 다른 호출자를 위한 실시간 읽기, 공개 경로.
const STOP = new Set(['finishPlayerStats', 'estimateSummonDps', 'appendPlayerDpsBreakdowns', 'playerStatTick.create',
    'getMossRecoveryOccupied', 'getTalentMistralStackCount', 'getActivePassiveCycleBuffEffects', 'combatEquipmentStats.read']);
const CLOCKS = new Set(['getCombatTime', 'Date.now', 'performance.now']);
const GUIDE = '싸우는 동안 바뀌는 값이면 js/player-stat-cache.js의 playerStatTick 읽기 함수로 읽고, 빌드 값이면 data/build-stat-inputs.js의 '
    + 'BUILD_STAT_FIELDS나 BUILD_STAT_PARTS에, 그 밖의 값이면 PLAYER_STAT_CONTEXT_FIELDS에 이유와 함께 더한다. '
    + '계산 안에서 game에 쓰는 값은 PLAYER_STAT_DERIVED_WRITES(정규화, 빌드에서 나온 값)만 되고, 매 호출 처리는 finishPlayerStats로 옮긴다. '
    + 'game 밖 모듈 상태를 읽으면 그 값을 바꾸는 쪽이 playerStatCache.invalidate()를 부르게 하고 MODULE_STATE에 이유를 적는다.';

function walk(node, visit, parent = null) {
    if (!node || typeof node !== 'object') return;
    if (node.type) visit(node, parent);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'loc' || key === 'range') continue;
        if (Array.isArray(value)) value.forEach(child => walk(child, visit, node.type ? node : parent));
        else if (value && typeof value === 'object') walk(value, visit, node.type ? node : parent);
    }
}
const isFunction = node => !!node && ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type);
const isPropertyName = (node, parent) => parent && ((parent.type === 'MemberExpression' && parent.property === node && !parent.computed)
    || (parent.type === 'Property' && parent.key === node && !parent.computed));

/** A module object's functions, and its `let`/`var` state (mutable values the module keeps between calls). */
function moduleInner(init) {
    const inner = new Map(), state = new Set();
    for (const statement of init.callee.body.body) {
        if (statement.type === 'FunctionDeclaration') inner.set(statement.id.name, statement);
        if (statement.type !== 'VariableDeclaration') continue;
        for (const entry of statement.declarations) {
            if (entry.id.type !== 'Identifier') continue;
            if (isFunction(entry.init)) inner.set(entry.id.name, entry.init);
            else if (statement.kind !== 'const') state.add(entry.id.name);
        }
    }
    return { inner, state };
}

function readRuntimeFunctions() {
    const html = fs.readFileSync('index.html', 'utf8');
    const files = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]).filter(file => !/^https?:/.test(file));
    const functions = new Map(), modules = new Map(), globals = new Set();
    for (const file of files) {
        const ast = espree.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', loc: true });
        for (const node of ast.body) {
            if (node.type === 'FunctionDeclaration') functions.set(node.id.name, { file, node });
            if (node.type !== 'VariableDeclaration') continue;
            for (const entry of node.declarations) {
                if (entry.id.type !== 'Identifier') continue;
                if (node.kind !== 'const' && !isFunction(entry.init)) globals.add(entry.id.name);
                if (!entry.init) continue;
                if (isFunction(entry.init)) functions.set(entry.id.name, { file, node: entry.init });
                if (entry.init.type === 'CallExpression' && isFunction(entry.init.callee) && entry.init.callee.body.type === 'BlockStatement') {
                    modules.set(entry.id.name, { file, ...moduleInner(entry.init) });
                }
            }
        }
    }
    globals.delete('game');
    return { functions, modules, globals };
}

/** game.X names the tick's readers use: reading them elsewhere in the calculation would bypass the tick. */
function tickFieldNames() {
    const ast = espree.parse(fs.readFileSync('js/player-stat-cache.js', 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
    const tick = ast.body.flatMap(node => node.type === 'VariableDeclaration' ? node.declarations : [])
        .find(entry => entry.id.name === 'playerStatTick');
    const names = new Set();
    walk(tick.init, node => {
        if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'game') names.add(node.property.name);
    });
    return names;
}

function lookup(name, runtime) {
    const [owner, member] = name.split('.');
    if (!member) return runtime.functions.get(name);
    const module = runtime.modules.get(owner);
    return module && module.inner.has(member) ? { file: module.file, node: module.inner.get(member), module: owner } : null;
}

function calleeKey(callee) {
    if (callee.type === 'Identifier') return callee.name;
    return callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && !callee.computed ? `${callee.object.name}.${callee.property.name}` : '';
}

/** game.X written by an assignment, an update (++) or a delete, or '' for anything else. */
function writtenGameField(node, parent) {
    const target = node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'game' ? node.property.name : '';
    if (!target || !parent) return '';
    const assigned = parent.type === 'AssignmentExpression' && parent.left === node;
    const updated = parent.type === 'UpdateExpression' || (parent.type === 'UnaryExpression' && parent.operator === 'delete');
    return assigned || updated ? target : '';
}

function followReferences(node, parent, entry, rules, follow) {
    if (node.type === 'Identifier' && !isPropertyName(node, parent)) {
        if (rules.runtime.functions.has(node.name)) follow(node.name);
        else if (entry.module && rules.runtime.modules.get(entry.module).inner.has(node.name)) follow(`${entry.module}.${node.name}`);
    }
    // window.someFunction(...) reaches the same global function.
    if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'window'
        && rules.runtime.functions.has(node.property.name)) follow(node.property.name);
    if (node.type === 'CallExpression') {
        const key = calleeKey(node.callee);
        if (key.includes('.') && rules.runtime.modules.has(key.split('.')[0])) follow(key);
    }
}

/** `module.name` for a module's own state, `name` for a mutable global, or '' for anything else. */
function stateName(node, parent, entry, rules) {
    if (node.type !== 'Identifier' || isPropertyName(node, parent)) return '';
    if (entry.module && rules.runtime.modules.get(entry.module).state.has(node.name)) return `${entry.module}.${node.name}`;
    return rules.runtime.globals.has(node.name) ? node.name : '';
}

function inspectFunction(name, entry, rules, follow) {
    const findings = [];
    const at = node => `${entry.file}:${node.loc.start.line}`;
    walk(entry.node.body, (node, parent) => {
        followReferences(node, parent, entry, rules, follow);
        const state = stateName(node, parent, entry, rules);
        if (state && !Object.prototype.hasOwnProperty.call(MODULE_STATE, state)) findings.push(`${name}이(가) 모듈 상태 ${state}를 읽는다 ${at(node)}`);
        if (node.type === 'CallExpression' && CLOCKS.has(calleeKey(node.callee))) findings.push(`${name}이(가) 시계(${calleeKey(node.callee)})를 직접 읽는다 ${at(node)}`);
        const written = writtenGameField(node, parent);
        if (written && !rules.writes.has(written)) findings.push(`${name}이(가) game.${written}에 쓴다 ${at(node)}`);
        const assignedTo = parent && parent.type === 'AssignmentExpression' && parent.left === node;
        if (written || assignedTo || node.type !== 'MemberExpression' || node.computed || node.property.type !== 'Identifier') return;
        const field = node.property.name, onGame = node.object.type === 'Identifier' && node.object.name === 'game';
        if (onGame && !rules.allowed.has(field)) findings.push(`${name}이(가) game.${field}를 읽는다 ${at(node)}`);
        if (!onGame && rules.tickFields.has(field) && !(NORMALIZERS[name] || []).includes(field)) findings.push(`${name}이(가) 틱 값 .${field}를 틱 밖에서 읽는다 ${at(node)}`);
    });
    return findings;
}

function checkCalculationInputs(lists) {
    const rules = { runtime: readRuntimeFunctions(), tickFields: tickFieldNames(), writes: new Set(lists.writes),
        allowed: new Set([...lists.build, ...lists.context]) };
    assert.ok(rules.tickFields.has('playerHp') && rules.tickFields.has('enemies'), 'tick readers parsed');
    const seen = new Set(['getPlayerStats']), queue = ['getPlayerStats'], findings = [];
    const follow = name => { if (!STOP.has(name) && !seen.has(name)) { seen.add(name); queue.push(name); } };
    while (queue.length) {
        const name = queue.shift(), entry = lookup(name, rules.runtime);
        if (entry && entry.node) findings.push(...inspectFunction(name, entry, rules, follow));
    }
    assert.ok(seen.size > 200, `the calculation closure looks too small (${seen.size})`);
    assert.deepEqual(findings, [], `능력치 계산의 입력 규칙 위반. ${GUIDE}`);
    return seen.size;
}

async function settle(seed, setup, minutes, options = {}) {
    const { runtime, run } = replayFixture(seed);
    run(setup);
    if (options.shadow) run(SHADOW + NESTED);
    if (options.disabled) run('playerStatCache.setDisabled(true)');
    const result = await runtime.simulateBackgroundCombatChunked({ elapsedMs: minutes * 60000, snapshot: run('game'), startNowMs: 0, project: false });
    return { kills: result.metrics.kills, save: JSON.stringify(result.game), shadow: options.shadow ? readShadow(run) : null };
}

function keptShare(health) {
    return health.answers / Math.max(1, health.answers + health.misses);
}

/** The cache key turns the zone and the context fields into JSON on every call: every zone kind must convert, and stay small. */
function checkKeyValues(run) {
    const result = JSON.parse(run(`(() => {
        const ids = new Set(Array.from({ length: 200 }, (_, index) => index));
        for (const match of getZone.toString().matchAll(/id === ([A-Z_]+|'[a-z_]+')/g)) {
            ids.add(match[1].startsWith("'") ? match[1].slice(1, -1) : (0, eval)(match[1]));
        }
        const rows = [...ids].map(id => [id, getZone(id)]).filter(([, zone]) => zone).map(([id, zone]) => [id, JSON.stringify(zone).length]);
        const fields = JSON.stringify(Object.keys(PLAYER_STAT_CONTEXT_FIELDS).map(name => game[name])).length;
        return JSON.stringify({ kinds: rows.length, largest: rows.reduce((top, row) => row[1] > top[1] ? row : top, ['', 0]), fields });
    })()`));
    assert.ok(result.kinds > 30, `zone kinds found: ${result.kinds}`);
    assert.ok(result.largest[1] < 4096, `zone ${result.largest[0]} is ${result.largest[1]} characters as JSON; the stat cache key reads it every call`);
    assert.ok(result.fields < 4096, `PLAYER_STAT_CONTEXT_FIELDS values are ${result.fields} characters as JSON; the stat cache key reads them every call`);
}

const STARTER = `game.settings.mapCompleteAction = 'repeatZone'; game.settings.showDeathNotice = false; startEncounterRun();`;
// Warrior keystones read rhythm and rage stacks and compare life with a threshold (tick.when), starting at 40% life.
const WARRIOR = `${STARTER} game.ascendClass = getAscendKeystoneOwnerClass('w7'); game.ascendKeystones = ['w2', 'w5', 'w7'];
    game.playerHp = Math.floor(getPlayerHpCap(getPlayerStats()) * 0.4);`;
const ENDGAME = `(${configureOfflineEndgameFixture.toString()})(); game.settings.showDeathNotice = false;`;

// Normal play: build edits made by code (no input event) are seen on the next calculation. [label, edit, the stats must change]
const EDITS = [
    ['passive', `game.passives.push(Object.values(PASSIVE_TREE.nodes).find(node => node.kind !== 'void' && !node.keystone
        && !node.intentionalNoEffect && (node.effects || []).some(effect => effect.stat === 'pctDmg') && !game.passives.includes(node.id)).id);`, true],
    ['weapon swap', `const weapon = JSON.parse(JSON.stringify(game.equipment['무기'])); weapon.id = ++itemIdCounter;
        weapon.stats.push({ id: 'pctDmg', val: 40 }); game.equipment['무기'] = weapon;`, true],
    ['ring edited in place', `game.equipment['반지1'].stats.push({ id: 'pctHp', val: 30 });`, true],
    ['support gem level', `game.supportGemData[game.equippedSupports[2]].level = 1;`, true],
    ['active skill', `game.skills.push('연속 베기'); game.gemData['연속 베기'] = { level: 10, exp: 0 }; game.activeSkill = '연속 베기';`, true],
    ['talent card', `game.talentCards.hero5__crusader = { level: 5, score: 0, count: 1 }; game.talentCardLoadout[0] = 'hero5__crusader';`, true],
    ['stump board', `game.stumpBox.board = game.stumpBox.board.map(() => null);`, true],
    ['level', `game.level = 80;`, true],
    ['weapon mastery', `game.weaponMastery.v = WEAPON_MASTERY.curveVersion; game.weaponMastery.xp[WEAPON_BASE_CATEGORIES[game.equipment['무기'].baseId]] = weaponMastery.reach(30);`, true],
    ['zone', `game.currentZoneId = 3;`, false],
    ['trial', `game.completedTrials.push('trial_4');`, false]
];

function normalPlayEdits(run) {
    run(`window.__now = getCombatTime();
        window.__ticks = count => {
            for (let i = 0; i < count; i += 2) combatEquipmentStats.withinTick(() => { coreLoop(window.__now += 100); coreLoop(window.__now += 100); });
        };
        window.__stats = () => JSON.stringify(game.lastCombatStats);`);
    run('__ticks(200)');
    for (const [label, edit, changes] of EDITS) {
        const before = run('__stats()');
        run(`(() => { ${edit} })(); __ticks(60);`);
        if (changes) assert.notEqual(run('__stats()'), before, `${label}: the edit should change the stats`);
    }
    const shadow = readShadow(run);
    assertShadow(assert, 'normal play edits', shadow);
    assert.ok(keptShare(shadow.health) > 0.8, `normal play kept too few answers between edits (${JSON.stringify(shadow.health)})`);
    return shadow;
}

/** Invalidation, events, the self-check and the hand-flagged background state, asked at one moment without ticks. */
async function normalPlayGuards(run) {
    for (const code of ['playerStatCache.invalidate()', 'playerStatCache.during(() => 0)']) {
        run('getPlayerStats(false)');
        const misses = run('playerStatCache.report().misses');
        run(`${code}; getPlayerStats(false); getPlayerStats(false);`);
        assert.equal(run('playerStatCache.report().misses'), misses + 1, `${code}: one fresh calculation, then kept again`);
    }
    // A skill table edit is invisible to the key: the self-check repairs it within one period and says so once.
    run(`playerStatCache.verify(null);
        console.warn = (...args) => { window.__warned = (window.__warned || []).concat([args.join(' ')]); };
        window.__skill = SKILL_DB[game.activeSkill]; window.__scale = __skill.dmgScale;`);
    const kept = run('JSON.stringify(getPlayerStats(false))');
    run('__skill.dmgScale = __scale * 4');
    assert.equal(run('JSON.stringify(getPlayerStats(false))'), kept, 'the table edit is invisible to the key');
    run('for (let i = 0; i < PLAYER_STAT_SELF_CHECK_ANSWERS; i++) getPlayerStats(false);');
    assert.equal(run('playerStatCache.report().repairs'), 1, 'the self-check repaired the stale calculation once');
    const repaired = run('JSON.stringify(getPlayerStats(false))');
    run('playerStatCache.setDisabled(true)');
    assert.equal(run('JSON.stringify(getPlayerStats(false))'), repaired, 'after the repair the kept stats equal a fresh calculation');
    run('playerStatCache.setDisabled(false); __skill.dmgScale = __scale;');
    // A live state with the background flag set by hand is calculated on every call.
    const bypassed = run('playerStatCache.report().bypassed');
    run('game.isBackgroundCalculation = true; getPlayerStats(false); getPlayerStats(false); delete game.isBackgroundCalculation;');
    assert.equal(run('playerStatCache.report().bypassed'), bypassed + 2, 'a hand-flagged background state is not kept');
    // An event left open by an error closes once the stack unwinds.
    run('try { playerStatCache.beginEvent(); throw new Error("kill handling failed"); } catch (error) { window.__thrown = error.message; }');
    await new Promise(resolve => setImmediate(resolve));
    const misses = run('playerStatCache.report().misses');
    run('getPlayerStats(false); getPlayerStats(false);');
    assert.equal(run('playerStatCache.report().misses'), misses + 1, 'after an abandoned event, one fresh calculation and then kept again');
    const warned = JSON.parse(run('JSON.stringify(window.__warned || [])'));
    assert.equal(warned.length, 2, 'the repair and the abandoned event are each reported once');
}

(async () => {
    const { run } = replayFixture(1);
    const lists = JSON.parse(run(`JSON.stringify({ build: [...BUILD_STAT_FIELDS, ...Object.keys(BUILD_STAT_PARTS)],
        context: Object.keys(PLAYER_STAT_CONTEXT_FIELDS), writes: PLAYER_STAT_DERIVED_WRITES })`));
    const closure = checkCalculationInputs(lists);
    run(ENDGAME);
    checkKeyValues(run);

    const starter = await settle(5, STARTER, 1, { shadow: true });
    assertShadow(assert, 'starter settlement', starter.shadow);
    assert.ok(keptShare(starter.shadow.health) > 0.9, `starter settlement kept too few answers (${JSON.stringify(starter.shadow.health)})`);
    const plain = await settle(5, STARTER, 1, { disabled: true });
    assert.equal(starter.save, plain.save, 'a settlement with kept calculations ends exactly like one without');
    const warrior = await settle(7, WARRIOR, 1, { shadow: true });
    assertShadow(assert, 'warrior keystones', warrior.shadow);

    const normal = replayFixture(5);
    normal.run(ENDGAME + SHADOW + NESTED);
    const edited = normalPlayEdits(normal.run);
    await normalPlayGuards(normal.run);
    console.log(`player stat cache: closure ${closure} functions, settlement kept ${(keptShare(starter.shadow.health) * 100).toFixed(0)}% `
        + `and ends like an uncached one, ${EDITS.length} normal-play edits seen at once over ${edited.health.answers} kept answers, `
        + 'self-check and abandoned events recover');
})().catch(error => { console.error(error); process.exit(1); });
