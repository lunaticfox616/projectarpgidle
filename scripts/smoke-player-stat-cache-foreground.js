// 평소 플레이의 능력치 캐시(2026-10-08, js/player-stat-cache.js).
// 1. 입력 없이 코드로 빌드를 바꿔도(패시브, 장비 교체와 제자리 수정, 보조 젬 레벨, 사용 스킬, 재능 카드, 그루터기, 레벨, 구역,
//    무기 숙련, 시련) 다음 계산이 바로 맞다: 빌드 서명, 장비 평가, 맥락 값이 바뀜을 알아챈다. 캐시 답은 매번 새 계산과 같고,
//    객체 안쪽 읽기도 키가 덮는다. 편집마다 능력치가 실제로 바뀌었는지도 본다(바뀌지 않는 편집은 검사가 아니다).
// 2. 무효화 함수와 처치, 지도 완료 괄호가 세대를 바꾼다.
// 3. 안전망: 캐시가 볼 수 없는 값(스킬 정의 표)이 바뀌어도 자체 점검이 PLAYER_STAT_SELF_CHECK_ANSWERS번 안에 고치고 한 번 알린다.
// 4. 백그라운드 표시를 손으로 켠 살아 있는 상태는 캐시를 쓰지 않는다(검사와 도구가 빌드를 제자리에서 고친다).
'use strict';
const assert = require('node:assert/strict');
const replayFixture = require('./lib/replay-fixture');
const configureOfflineEndgameFixture = require('./lib/offline-endgame-fixture');
const { SHADOW, NESTED, readShadow, assertShadow } = require('./lib/player-stat-shadow');

const { run } = replayFixture(5);
run(`(${configureOfflineEndgameFixture.toString()})(); game.settings.showDeathNotice = false;`);
run(SHADOW + NESTED);
// Like the real game tick (js/main.js runGameTick): steps run in pairs inside one tick, which evaluates the equipment once.
run(`window.__now = getCombatTime();
    window.__ticks = count => {
        for (let i = 0; i < count; i += 2) combatEquipmentStats.withinTick(() => { coreLoop(window.__now += 100); coreLoop(window.__now += 100); });
    };
    window.__stats = () => JSON.stringify(game.lastCombatStats);`);
run('__ticks(200)');
assert.ok(run('playerStatCache.report().answers') > 150, 'normal play keeps calculations between build edits');

// [label, edit, the stats must change]
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
    ['weapon mastery', `game.weaponMastery.xp[WEAPON_BASE_CATEGORIES[game.equipment['무기'].baseId]] = weaponMastery.reach(30);`, true],
    ['zone', `game.currentZoneId = 3;`, false],
    ['trial', `game.completedTrials.push('trial_4');`, false]
];
for (const [label, edit, changes] of EDITS) {
    const before = run('__stats()');
    run(`(() => { ${edit} })(); __ticks(60);`);
    if (changes) assert.notEqual(run('__stats()'), before, `${label}: the edit should change the stats`);
}
const edited = readShadow(run);
assertShadow(assert, 'normal play edits', edited);
assert.ok(edited.health.answers / (edited.health.answers + edited.health.misses) > 0.8,
    `normal play kept too few answers between edits (${JSON.stringify(edited.health)})`);

// 2. Generation: an explicit invalidation and a bracketed event each force one fresh calculation, then it is kept again.
// Asked at one moment without ticks, so nothing else in combat starts a calculation.
for (const [label, code] of [['invalidate', 'playerStatCache.invalidate()'], ['event', 'playerStatCache.during(() => 0)']]) {
    run('getPlayerStats(false)');
    const misses = run('playerStatCache.report().misses');
    run(`${code}; getPlayerStats(false); getPlayerStats(false);`);
    assert.equal(run('playerStatCache.report().misses'), misses + 1, `${label}: the next call calculates again, the one after is kept`);
}

// 3. The safety net: a skill table edit is invisible to the key; the self-check repairs it within one check period and says so once.
// Asked at one moment without ticks, so no kill or new tick value starts a fresh calculation first.
run('playerStatCache.verify(null)');
run('console.warn = (...args) => { window.__warned = (window.__warned || []).concat([args.join(" ")]); };');
run('window.__skill = SKILL_DB[game.activeSkill]; window.__scale = __skill.dmgScale;');
const kept = run('JSON.stringify(getPlayerStats(false))');
run('__skill.dmgScale = __scale * 4');
assert.equal(run('JSON.stringify(getPlayerStats(false))'), kept, 'the table edit is invisible to the key (the case the self-check exists for)');
run('for (let i = 0; i < PLAYER_STAT_SELF_CHECK_ANSWERS; i++) getPlayerStats(false);');
const repaired = JSON.parse(run('JSON.stringify(playerStatCache.report())'));
assert.equal(repaired.repairs, 1, 'the self-check repaired the stale calculation once');
assert.ok(repaired.lastRepair.length > 0, 'the repair names what changed');
const afterRepair = run('JSON.stringify(getPlayerStats(false))');
assert.notEqual(afterRepair, kept, 'the repair applied the table edit');
run('playerStatCache.setDisabled(true)');
assert.equal(run('JSON.stringify(getPlayerStats(false))'), afterRepair, 'after the repair the kept stats equal a fresh calculation');
run('playerStatCache.setDisabled(false)');
assert.equal(JSON.parse(run('JSON.stringify(window.__warned || [])')).length, 1, 'the repair is reported once');
run('__skill.dmgScale = __scale');

// 4. A live state with the background flag set by hand is calculated on every call.
run('game.isBackgroundCalculation = true');
const bypassed = run('playerStatCache.report().bypassed');
run('getPlayerStats(false); getPlayerStats(false); delete game.isBackgroundCalculation;');
assert.equal(run('playerStatCache.report().bypassed'), bypassed + 2, 'a hand-flagged background state is not kept');

// 5. An event left open by an error is closed once the stack unwinds: stats are fresh inside it, kept again after, and it is reported.
(async () => {
    run('try { playerStatCache.beginEvent(); throw new Error("an error inside kill handling"); } catch (error) { window.__thrown = error.message; }');
    const bypassed = run('playerStatCache.report().bypassed');
    run('getPlayerStats(false)');
    assert.equal(run('playerStatCache.report().bypassed'), bypassed + 1, 'inside an open event stats are calculated fresh');
    await new Promise(resolve => setImmediate(resolve));
    const misses = run('playerStatCache.report().misses');
    run('getPlayerStats(false); getPlayerStats(false);');
    assert.equal(run('playerStatCache.report().misses'), misses + 1, 'after the stack unwound, one fresh calculation and then kept again');
    const warned = JSON.parse(run('JSON.stringify(window.__warned || [])'));
    assert.ok(/ended by an error/.test(warned.at(-1) || ''), 'the abandoned event is reported');
    console.log(`player stat cache (normal play): ${EDITS.length} build edits seen at once, `
        + `${edited.health.answers} kept answers match fresh stats, the self-check repaired a hidden change after ${repaired.checks} checks, `
        + 'an event ended by an error is closed');
})().catch(error => { console.error(error); process.exit(1); });
