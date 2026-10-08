// 능력치 계산의 틱 분리와 캐시(2026-10-08, js/player-stat-cache.js), 정산 쪽과 계산 입력 규칙.
// 계산은 빌드가 그대로인 동안 다시 쓰고, 싸우는 동안 바뀌는 값(시계, 생명력, 중첩, 시한 버프, 적)은 틱으로만 읽는다.
// 1. 정적 검사: 계산 본체(getPlayerStats의 장비 보기 경로)가 닿는 함수는 시계를 직접 읽지 않는다. game에서 읽는 필드는 빌드 입력
//    (BUILD_STAT_FIELDS, BUILD_STAT_PARTS)이나 맥락(PLAYER_STAT_CONTEXT_FIELDS)이고, 쓰는 필드는 PLAYER_STAT_DERIVED_WRITES다.
//    틱이 읽는 필드를 다른 이름의 객체로 읽어도 걸린다. 새 콘텐츠가 이 규칙을 어기면 여기서 실패하고, 메시지가 고칠 곳을 알려 준다.
// 2. 그림자 비교: 정산에서 캐시로 답할 때마다 새로 계산한 값과 같고, 넘겨준 계산은 바뀌지 않고, 객체 안쪽 읽기도 키가 덮는다.
//    시작 빌드, 틱 값을 읽는 전직 키스톤 전부(전직 여덟), 엔드게임 소환사. 적중률이 무너지지 않았는지도 본다.
// 3. 캐시를 끈 정산과 저장 결과 전체가 같다.
// 평소 플레이(입력 없는 빌드 편집, 자체 점검)는 scripts/smoke-player-stat-cache-foreground.js.
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
const TICK_KEYSTONES = ['w2', 'w5', 'w7', 'g2', 'g3', 'g4', 'g5', 'a2', 'a6', 'r7', 'cr8', 'e8', 'wlk7', 'gd6', 'gd7'];
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
const keystoneBuild = ids => `${STARTER}
    game.ascendClass = getAscendKeystoneOwnerClass(${JSON.stringify(ids[0])}); game.ascendKeystones = ${JSON.stringify(ids)};
    game.playerHp = Math.floor(getPlayerHpCap(getPlayerStats()) * 0.4);`;
const ENDGAME = `(${configureOfflineEndgameFixture.toString()})(); game.settings.showDeathNotice = false;`;

(async () => {
    const { run } = replayFixture(1);
    const lists = JSON.parse(run(`JSON.stringify({ build: [...BUILD_STAT_FIELDS, ...Object.keys(BUILD_STAT_PARTS)],
        context: Object.keys(PLAYER_STAT_CONTEXT_FIELDS), writes: PLAYER_STAT_DERIVED_WRITES })`));
    const closure = checkCalculationInputs(lists);
    run(ENDGAME);
    checkKeyValues(run);

    const starter = await settle(5, STARTER, 2, { shadow: true });
    assertShadow(assert, 'starter', starter.shadow);
    assert.ok(keptShare(starter.shadow.health) > 0.9, `starter settlement kept too few answers (${JSON.stringify(starter.shadow.health)})`);
    const plain = await settle(5, STARTER, 2, { disabled: true });
    assert.equal(starter.save, plain.save, 'a settlement with kept calculations ends exactly like one without');

    const owners = {};
    for (const id of TICK_KEYSTONES) (owners[run(`getAscendKeystoneOwnerClass(${JSON.stringify(id)})`)] ||= []).push(id);
    for (const [owner, ids] of Object.entries(owners)) {
        const result = await settle(7, keystoneBuild(ids), 1, { shadow: true });
        assertShadow(assert, owner, result.shadow);
    }
    const endgame = await settle(5, ENDGAME, 1, { shadow: true });
    assertShadow(assert, 'endgame summoner', endgame.shadow);
    assert.ok(keptShare(endgame.shadow.health) > 0.8, `endgame settlement kept too few answers (${JSON.stringify(endgame.shadow.health)})`);
    console.log(`player stat cache (settlement): closure ${closure} functions, starter kept ${starter.shadow.health.answers} answers `
        + `(${(keptShare(starter.shadow.health) * 100).toFixed(0)}%) over ${starter.kills} kills, `
        + `${Object.keys(owners).length} ascendancies and the endgame summoner match fresh stats`);
})().catch(error => { console.error(error); process.exit(1); });
