// 범위 공격과 아직 알아채지 않은 몬스터(2026-10-04 사용자: "범위기를 아직 시야 안밝혀진 곳에 쓰면 그 시야에 있던 몹이
// 맞았으면 좋겠는데 위치가 완전히 드러날때까지 절대 안맞는 상태"). 공격이 실제로 나갈 때만 범위가 그 몬스터까지 닿고, 맞은
// 몬스터는 싸움에 들어온다. 대상이 있는지 보기만 하는 확인과 미리보기는 몬스터를 깨우지 않고, 보스는 등장 전까지 그대로다.
// 주인공 다리 동작은 실제 한 칸 이동 시간을 따라가되 3배에서 멈춘다.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(93);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior',
        level: 100, season: 1, currentZoneId: 0, maxZoneId: 0, combatTimeMs: 1800000000000,
        settings: {pauseGameOnOverlay: false, showDeathNotice: false, autoEquipEmptySlots: false}});
    game.equipment['무기'] = {id: 90001, slot: '무기', name: '범위 검사', rarity: 'rare', baseStats: [{id: 'flatDmg', val: 30}], stats: []};
    contentProgression.sync();
    ensureEncounterRun();
    globalThis.splashRun = actExplorationState.current(game);
    globalThis.splashPack = splashRun.packs.find(pack => pack.stage === null && pack.waiting.length >= 2);
    globalThis.bossPack = splashRun.packs.find(pack => pack.stage !== null && pack.waiting.length);`);
assert.ok(run('!!splashPack && !!bossPack'), 'the map has an ordinary pack of two or more and a waiting boss');

// 몬스터 하나는 싸움에 넣어 겨냥할 대상으로 주인공 두 칸 앞에, 다른 하나는 아직 알아채지 않은 채 그 바로 뒤에 둔다.
run(`globalThis.sleeper = splashPack.waiting[0];
    globalThis.fighter = splashPack.waiting[1];
    actExplorationState.wake(game, [fighter]);
    game.gridPlayer.gx = sleeper.gx - 3; game.gridPlayer.gy = sleeper.gy;
    fighter.gx = sleeper.gx - 1; fighter.gy = sleeper.gy;
    game.activeSkill = '유성 낙화';
    globalThis.splashStats = getPlayerStats();`);
assert.equal(run('getSkillGridProfile(game.activeSkill, splashStats.sSkill).kind'), 'blast', 'the test gem lands an area on its target');
assert.ok(run('game.enemies.includes(fighter) && splashPack.waiting.includes(sleeper)'), 'one monster fights, the other has not noticed yet');

// 확인만 하는 호출(채널 판정, 접근, 미리보기)은 알아채지 않은 몬스터를 대상에 넣지도 깨우지도 않는다.
assert.deepEqual(copy('getSkillTargets(splashStats).map(hit => hit.enemy.id)'), [run('fighter.id')]);
assert.ok(run('splashPack.waiting.includes(sleeper)'), 'a target check leaves the sleeping monster alone');

// 실제 공격: 대상(fighter)에 떨어진 범위가 옆의 sleeper도 맞히고, sleeper는 싸움에 들어온다. 겨냥은 늘 싸우는 몬스터다.
const hits = copy('getAttackTargets(splashStats).map(hit => hit.enemy.id)');
assert.equal(hits[0], run('fighter.id'), 'the gem still aims at the fighting monster');
assert.ok(hits.includes(run('sleeper.id')), 'the area catches the monster that had not noticed the hero');
assert.ok(run('game.enemies.includes(sleeper) && !splashPack.waiting.includes(sleeper)'), 'the struck monster joins the fight');

// 알아채지 않은 몬스터만으로는 공격이 나가지 않는다(싸우는 몬스터가 없으면 겨냥할 대상이 없다).
run(`game.enemies = []; splashPack.waiting.push(sleeper);`);
assert.deepEqual(copy('getAttackTargets(splashStats)'), [], 'nothing to aim at: no attack, nobody woken');
assert.ok(run('splashPack.waiting.includes(sleeper)'));

// 새 젬 스킬의 맞힘 명령도 같다: 명령에 든 잠든 몬스터는 맞는 순간 싸움에 들어온다.
run(`applySkillGemCommand({type: 'mist', targets: [sleeper.id], at: getCombatTime()}, splashStats);`);
assert.ok(run('game.enemies.includes(sleeper) && sleeper.holyMistUntil > 0'), 'a native gem contact pulls the sleeping monster in');

// 보스는 등장 전까지 범위에 닿아도 깨우지 않는다.
assert.deepEqual(copy('actExplorationState.dormantNear(game, bossPack.waiting[0], 0)'), [], 'a waiting boss is never splash-woken');
assert.deepEqual(copy('actExplorationState.wake(game, bossPack.waiting).length'), 0);

// 다리 동작: 탐험 중 걷는 동안은 한 칸 시간에서(기본 0.6초가 1배), 3배에서 멈춘다. 탐험 밖은 이동 속도에서.
const rates = copy(`[300, 120, 600].map(duration => { splashRun.motion = {duration}; return getHeroRunRate(100); })
    .concat((() => { splashRun.motion = null; return [getHeroRunRate(150)]; })())`);
assert.deepEqual(rates, [2, 3, 1, 1.5], 'the legs follow the actual step and stop at 3x');

console.log('smoke-act-exploration-splash passed');
