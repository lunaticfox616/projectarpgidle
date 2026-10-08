// 능력치 계산의 틱 분리와 정산 캐시(2026-10-08, js/player-stat-cache.js).
// 정산은 빌드가 그대로인 동안 계산 하나를 다시 쓰고, 싸우는 동안 바뀌는 값(시계, 생명력, 중첩, 시한 버프, 적)은 틱으로만 읽는다.
// 1. 정적 검사: 계산 본체(getPlayerStats의 장비 보기 경로)가 닿는 함수는 시계를 직접 읽지 않고, game에서는 빌드 입력
//    (BUILD_STAT_FIELDS, BUILD_STAT_PARTS)과 아래 맥락 필드만 읽는다. 틱이 읽는 필드를 다른 이름의 객체로 읽어도 걸린다.
// 2. 그림자 비교: 정산에서 캐시로 답할 때마다 새로 계산한 값과 같고, 넘겨준 계산은 아무도 고치지 않는다.
//    시작 빌드, 틱 값을 읽는 전직 키스톤 전부(전직 여덟), 엔드게임 소환사.
// 3. 캐시를 끈 정산과 저장 결과 전체가 같다.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const espree = require('espree');
const replayFixture = require('./lib/replay-fixture');
const configureOfflineEndgameFixture = require('./lib/offline-endgame-fixture');

// game에서 빌드 입력 말고 읽어도 되는 필드와 그 까닭.
const CONTEXT_FIELDS = {
    currentZoneId: 'zone: the cache context keys on getZone', labyrinthFloor: 'zone', timeRift: 'zone', underworldProgress: 'zone',
    completedTrials: 'ascendancy tree shape: trials end inside map completion, which the cache brackets'
};
// 정규화만 하는 함수가 틱 필드의 모양을 다듬는 것은 괜찮다(값은 틱으로만 계산에 들어간다).
const NORMALIZERS = { normalizePassiveSpecializationState: ['cycleBuffs', 'fanaticism'] };
// 매 호출 끝(finishPlayerStats), 틱 자체, 틱 없이 부르는 다른 호출자를 위한 실시간 읽기, 공개 경로.
const STOP = new Set(['finishPlayerStats', 'estimateSummonDps', 'appendPlayerDpsBreakdowns', 'playerStatTick.create',
    'getMossRecoveryOccupied', 'getTalentMistralStackCount', 'getActivePassiveCycleBuffEffects', 'combatEquipmentStats.read']);
const CLOCKS = new Set(['getCombatTime', 'Date.now', 'performance.now']);
const TICK_KEYSTONES = ['w2', 'w5', 'w7', 'g2', 'g3', 'g4', 'g5', 'a2', 'a6', 'r7', 'cr8', 'e8', 'wlk7', 'gd6', 'gd7'];

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

function moduleInner(init) {
    const inner = new Map();
    for (const statement of init.callee.body.body) {
        if (statement.type === 'FunctionDeclaration') inner.set(statement.id.name, statement);
        if (statement.type !== 'VariableDeclaration') continue;
        for (const entry of statement.declarations) if (entry.id.type === 'Identifier' && isFunction(entry.init)) inner.set(entry.id.name, entry.init);
    }
    return inner;
}

function readRuntimeFunctions() {
    const html = fs.readFileSync('index.html', 'utf8');
    const files = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]).filter(file => !/^https?:/.test(file));
    const functions = new Map(), modules = new Map();
    for (const file of files) {
        const ast = espree.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', loc: true });
        for (const node of ast.body) {
            if (node.type === 'FunctionDeclaration') functions.set(node.id.name, { file, node });
            if (node.type !== 'VariableDeclaration') continue;
            for (const entry of node.declarations) {
                if (entry.id.type !== 'Identifier' || !entry.init) continue;
                if (isFunction(entry.init)) functions.set(entry.id.name, { file, node: entry.init });
                if (entry.init.type === 'CallExpression' && isFunction(entry.init.callee) && entry.init.callee.body.type === 'BlockStatement') {
                    modules.set(entry.id.name, { file, inner: moduleInner(entry.init) });
                }
            }
        }
    }
    return { functions, modules };
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

function inspectFunction(name, entry, rules, follow) {
    const findings = [];
    walk(entry.node.body, (node, parent) => {
        if (node.type === 'Identifier' && !isPropertyName(node, parent)) {
            if (rules.runtime.functions.has(node.name)) follow(node.name);
            else if (entry.module && rules.runtime.modules.get(entry.module).inner.has(node.name)) follow(`${entry.module}.${node.name}`);
        }
        if (node.type === 'CallExpression') {
            const callee = node.callee;
            const key = callee.type === 'Identifier' ? callee.name
                : (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && !callee.computed ? `${callee.object.name}.${callee.property.name}` : '');
            if (CLOCKS.has(key)) findings.push(`${name} reads the clock (${key}) at ${entry.file}:${node.loc.start.line}`);
            if (key.includes('.') && rules.runtime.modules.has(key.split('.')[0])) follow(key);
        }
        if (node.type !== 'MemberExpression' || node.computed || node.property.type !== 'Identifier') return;
        if (parent && parent.type === 'AssignmentExpression' && parent.left === node) return;
        const field = node.property.name, onGame = node.object.type === 'Identifier' && node.object.name === 'game';
        if (onGame && !rules.allowed.has(field)) findings.push(`${name} reads game.${field} at ${entry.file}:${node.loc.start.line}`);
        if (!onGame && rules.tickFields.has(field) && !(NORMALIZERS[name] || []).includes(field)) findings.push(`${name} reads .${field} at ${entry.file}:${node.loc.start.line}`);
    });
    return findings;
}

function checkCalculationInputs(buildFields) {
    const rules = { runtime: readRuntimeFunctions(), tickFields: tickFieldNames(),
        allowed: new Set([...buildFields, ...Object.keys(CONTEXT_FIELDS)]) };
    assert.ok(rules.tickFields.has('playerHp') && rules.tickFields.has('enemies'), 'tick readers parsed');
    const seen = new Set(['getPlayerStats']), queue = ['getPlayerStats'], findings = [];
    const follow = name => { if (!STOP.has(name) && !seen.has(name)) { seen.add(name); queue.push(name); } };
    while (queue.length) {
        const name = queue.shift(), entry = lookup(name, rules.runtime);
        if (entry && entry.node) findings.push(...inspectFunction(name, entry, rules, follow));
    }
    assert.ok(seen.size > 200, `the calculation closure looks too small (${seen.size})`);
    assert.deepEqual(findings, [], 'the stat calculation reads per-tick state outside its tick');
    return seen.size;
}

const SHADOW = `window.__shadow = { hits: 0, diffs: [], mutated: [] };
    const seen = new WeakMap();
    const firstDifference = (a, b) => Object.keys({ ...a, ...b }).find(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
    playerStatCache.verify((stats, kept, fresh) => {
        __shadow.hits++;
        const core = JSON.stringify(kept.core.stats);
        if (!seen.has(kept.core)) seen.set(kept.core, core);
        else if (seen.get(kept.core) !== core && __shadow.mutated.length < 5) __shadow.mutated.push(firstDifference(JSON.parse(seen.get(kept.core)), kept.core.stats));
        const again = fresh();
        if (JSON.stringify(stats) !== JSON.stringify(again) && __shadow.diffs.length < 5) __shadow.diffs.push(firstDifference(stats, again));
    });`;

async function settle(seed, setup, minutes, options = {}) {
    const { runtime, run } = replayFixture(seed);
    run(setup);
    if (options.shadow) run(SHADOW);
    if (options.disabled) run('playerStatCache.setDisabled(true)');
    const result = await runtime.simulateBackgroundCombatChunked({ elapsedMs: minutes * 60000, snapshot: run('game'), startNowMs: 0, project: false });
    const shadow = options.shadow ? JSON.parse(run('JSON.stringify(__shadow)')) : null;
    return { kills: result.metrics.kills, save: JSON.stringify(result.game), shadow };
}

function assertShadow(label, shadow) {
    assert.ok(shadow.hits > 0, `${label}: the settlement never kept a calculation`);
    assert.deepEqual(shadow.diffs, [], `${label}: kept stats differ from fresh ones`);
    assert.deepEqual(shadow.mutated, [], `${label}: a kept calculation was changed after it was handed out`);
}

const STARTER = `game.settings.mapCompleteAction = 'repeatZone'; game.settings.showDeathNotice = false; startEncounterRun();`;
const keystoneBuild = ids => `${STARTER}
    game.ascendClass = getAscendKeystoneOwnerClass(${JSON.stringify(ids[0])}); game.ascendKeystones = ${JSON.stringify(ids)};
    game.playerHp = Math.floor(getPlayerHpCap(getPlayerStats()) * 0.4);`;
const ENDGAME = `(${configureOfflineEndgameFixture.toString()})(); game.settings.showDeathNotice = false;`;

(async () => {
    const { run } = replayFixture(1);
    const closure = checkCalculationInputs(JSON.parse(run('JSON.stringify([...BUILD_STAT_FIELDS, ...Object.keys(BUILD_STAT_PARTS)])')));

    const starter = await settle(5, STARTER, 2, { shadow: true });
    assertShadow('starter', starter.shadow);
    const plain = await settle(5, STARTER, 2, { disabled: true });
    assert.equal(starter.save, plain.save, 'a settlement with kept calculations ends exactly like one without');

    const owners = {};
    for (const id of TICK_KEYSTONES) (owners[run(`getAscendKeystoneOwnerClass(${JSON.stringify(id)})`)] ||= []).push(id);
    for (const [owner, ids] of Object.entries(owners)) {
        const result = await settle(7, keystoneBuild(ids), 1, { shadow: true });
        assertShadow(owner, result.shadow);
    }
    const endgame = await settle(5, ENDGAME, 1, { shadow: true });
    assertShadow('endgame summoner', endgame.shadow);
    console.log(`player stat cache: closure ${closure} functions, starter kept ${starter.shadow.hits} answers over ${starter.kills} kills, `
        + `${Object.keys(owners).length} ascendancies and the endgame summoner match fresh stats`);
})().catch(error => { console.error(error); process.exit(1); });
