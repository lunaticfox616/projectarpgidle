// 기억 던전(12번 루프 21, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/memory-dungeon.js): 루프 21부터 아틀라스의 보스가
// 드물게 그 보스의 기억(1~5단계)을 남기고, 기억을 쓰면 그 보스만 있는 투기장(지도 장치 런)이 열린다. 단계가 오를수록 세지고 보상이
// 커지며, 이기면 다음 단계의 기억이 나올 수 있다. 실제 전투 반복으로 한 번 이겨 보고, 저장 경계와 되돌림도 본다.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(84);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
const clearOpenMap = (limit = 9000) => { for (let n = 0; n < limit && run('!!game.atlas.run'); n++) advance(); };
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'stop'}});
    game.season=21;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.equipment['무기']={id:90001,slot:'무기',name:'기억 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1e12},{id:'flatHp',val:1e12}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;atlas.sync(game);
    var seq = values => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
    var mapRun = (node, memory) => ({ node, tier: 5, memory });
`);

// 1. 자료: 다섯 단계, 단계마다 세지는 보스, 다음 단계 사다리, 노드 종류마다 기억 확률.
const data = copy('MEMORY_DUNGEON');
assert.equal(data.minLoop, 21);
assert.equal(data.tiers, 5);
for (const list of [data.fight.hpMul, data.fight.damageMul]) {
    assert.equal(list.length, 5);
    assert.ok(list.every((value, index) => index === 0 || value > list[index - 1]), 'each tier is harder: ' + list);
}
assert.ok(Math.max(...data.fight.damageMul) <= 1.55, 'boss damage stays inside the pattern ceiling');
assert.deepEqual(Object.keys(data.ticketDrop).sort(), ['apex', 'guardian', 'league', 'map', 'pinnacle']);
assert.equal(data.ladder.length, 4);

// 2. 기억이 떨어진다: 루프 21부터, 원래 싸움은 1단계, 기억 싸움은 다음 단계(5단계 다음은 없다), 보관 한도.
run('game.season = 20;');
assert.deepEqual(copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0'), () => 0)`), { ticket: null, spoils: null }, 'not before loop 21');
run('game.season = 21;');
const first = copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0'), () => 0)`);
assert.deepEqual(first.ticket, { node: 'roots_0', name: run(`atlas.node('roots_0').boss`), tier: 1 });
assert.equal(first.spoils, null, 'an ordinary fight gives no memory spoils');
assert.equal(run(`memoryDungeon.count(game, 'roots_0', 1)`), 1);
assert.equal(copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0'), () => 0.99)`).ticket, null, 'only by chance');
const ladder = copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0', 2), () => 0)`);
assert.equal(ladder.ticket.tier, 3, 'winning tier 2 can leave a tier 3 memory');
assert.equal(ladder.spoils.tier, 2);
assert.equal(copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0', 5), () => 0)`).ticket, null, 'nothing above tier 5');
assert.equal(run(`(() => { for (let i = 0; i < 20; i++) memoryDungeon.give(game, 'trunk_1', 1); return memoryDungeon.count(game, 'trunk_1', 1); })()`), 9, 'nine at most');

// 3. 보상: 단계가 오를수록 커지고, 타오른 잿불가지는 3단계부터, 자기 고유가 있는 보스는 그 고유, 2단계부터 희귀 장비.
const low = copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0', 1), () => 0.999).spoils`);
const high = copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0', 5), () => 0.999).spoils`);
const sum = spoils => spoils.rewards.reduce((total, [, amount]) => total + amount, 0);
assert.ok(sum(high) > sum(low), 'tier 5 pays more than tier 1');
const guardian = copy(`memoryDungeon.settle(game, atlas.node('roots_g'), mapRun('roots_g', 5), () => 0.999).spoils`);
assert.ok(sum(guardian) > sum(high), 'a guardian memory (a harder fight) pays more than a map boss memory of the same tier');
assert.ok(!low.rewards.some(([key]) => key === 'burningEmberBranch') && high.rewards.some(([key]) => key === 'burningEmberBranch'), 'burning branches from tier 3');
assert.equal(low.gear, false);
assert.equal(high.gear, true);
assert.equal(low.unique, null);
const apex = copy(`memoryDungeon.settle(game, atlas.node('apex_gardener'), mapRun('apex_gardener', 1), () => 0).spoils`);
assert.equal(apex.unique, run(`ATLAS_ENDGAME.apexes[0].unique`), 'a final boss gives its own unique');
assert.equal(copy(`memoryDungeon.settle(game, atlas.node('roots_0'), mapRun('roots_0', 1), () => 0).spoils.unique`), 'any', 'a map boss gives any unique');
assert.equal(copy(`game.atlas.memory.best`).roots_0, 5, 'the best tier won is kept');

// 4. 싸움을 연다: 기억 하나를 쓰고, 그 노드의 투기장, 등급은 단계만큼 높게, 보스 배수, 마름의 사도는 없다. 떠나지 못하면 돌아온다.
run(`game.atlas.memory = memoryDungeon.defaults(); memoryDungeon.give(game, 'roots_0', 2);`);
assert.match(run(`memoryDungeon.entryReason(game, 'roots_0', 1)`), /기억이 없습니다/);
assert.equal(run(`memoryDungeon.entryReason(game, 'roots_0', 2)`), '');
const opened = copy(`(() => {
    const reason = atlas.beginMemory(game, 'roots_0', 2, game.currentZoneId);
    const zone = atlas.zone(game);
    return { reason, left: memoryDungeon.count(game, 'roots_0', 2), memory: game.atlas.run.map.memory, tier: game.atlas.run.map.tier,
        expected: Math.min(ATLAS.tierCap, atlas.effectiveTier(game, atlas.node('roots_0')) + 2 * MEMORY_DUNGEON.fight.tierStep),
        apostle: game.atlas.run.endgame.apostle, name: zone.name, memoryTier: zone.memoryTier, arena: zone.exploration.arena === true,
        encounters: game.atlas.run.encounters.length };
})()`);
assert.equal(opened.reason, '');
assert.equal(opened.left, 0, 'the memory is spent');
assert.equal(opened.memory, 2);
assert.equal(opened.tier, opened.expected);
assert.equal(opened.apostle, null);
assert.match(opened.name, /기억 2단계/);
assert.equal(opened.memoryTier, 2);
assert.equal(opened.arena, true, 'the memory fight is an arena');
assert.equal(opened.encounters, 0, 'no content rooms in the arena');
const boss = copy(`(() => { const zone = atlas.zone(game), plain = atlas.preview(game, { ...game.atlas.run.map, memory: undefined });
    return { memory: zone.bossMods.hpMul / plain.bossMods.hpMul, damage: zone.bossMods.damageMul / plain.bossMods.damageMul }; })()`);
assert.ok(Math.abs(boss.memory - data.fight.hpMul[1]) < 1e-9 && Math.abs(boss.damage - data.fight.damageMul[1]) < 1e-9, 'tier 2 boss multipliers: ' + JSON.stringify(boss));
run('atlas.cancel(game);');
assert.equal(run(`memoryDungeon.count(game, 'roots_0', 2)`), 1, 'a cancelled fight gives the memory back');
const saved = copy(`(() => { atlas.beginMemory(game, 'roots_0', 2, game.currentZoneId);
    const raw = JSON.parse(JSON.stringify(game.atlas)); const state = { atlas: raw, worldTreeJourney: null }; atlas.normalize(state);
    return { memory: state.atlas.run && state.atlas.run.map.memory, tickets: state.atlas.memory.tickets }; })()`);
assert.equal(saved.memory, 2, 'an open memory fight survives a load');
run('atlas.onLoopReset(game);');
assert.equal(run(`memoryDungeon.count(game, 'roots_0', 2)`), 1, 'a new loop gives the memory of an unfinished fight back');

// 5. 보스: 이름이 누구의 기억인지 말하고, 물들고, 자기 특수기가 없으면 되감긴 기억을 쓴다.
const tuned = copy(`memoryDungeon.tuneBoss({ name: '👿 붉은 뿌리', isBoss: true })`);
assert.equal(tuned.name, '👿 붉은 뿌리의 기억');
assert.equal(tuned.bossVisualTint, data.fight.tint);
assert.deepEqual([tuned.patternMode, tuned.apexMechanic], ['apex', 'memory']);
assert.equal(copy(`memoryDungeon.tuneBoss({ name: 'x', apexMechanic: 'prune', patternMode: 'apex' })`).apexMechanic, 'prune', 'a late boss keeps its own special');
assert.equal(copy(`atlasEndgame.patternState('memory', 2)`).isSpecial, true);

// 6. 저장 경계: 아는 노드만, 한도 안의 정수, 빈 줄은 지운다, 이긴 단계는 1~5.
const normalized = copy(`memoryDungeon.normalize({ tickets: { roots_0: [1, 20, -3, 0.5, 'x'], nowhere: [1, 1, 1, 1, 1], trunk_2: [0, 0, 0, 0, 0] },
    best: { roots_0: 3, trunk_2: 9, nowhere: 2 } })`);
assert.deepEqual(normalized, { tickets: { roots_0: [1, 9, 0, 0, 0] }, best: { roots_0: 3 } });
assert.deepEqual(copy(`atlasMaps.normalize({ uid: 3, node: 'roots_0', tier: 4, rarity: 'normal', memory: 7 }, () => true)`).memory, undefined,
    'a map keeps only a real memory tier');

// 7. 실제 싸움: 기억 1단계로 투기장에 들어가 이기면 지도가 닫히고, 보상이 지갑과 가방에 들어오고, 이긴 단계가 남는다.
run(`game.atlas.memory = memoryDungeon.defaults(); memoryDungeon.give(game, 'trunk_0', 1); game.inventory = [];
    window.before = { dew: game.currencies.formlessDew || 0, bud: game.currencies.sapBud || 0 };
    window.notices = []; window.addEventListener && window.addEventListener('project-idle:atlas-map', event => notices.push(event.detail));`);
assert.equal(run(`atlasRun.openMemory('trunk_0', 1)`), '');
assert.equal(run('game.currentZoneId === ATLAS.zoneId'), true, 'the hero travels to the arena');
clearOpenMap();
const won = copy(`({ open: !!game.atlas.run, result: game.atlas.lastResult && game.atlas.lastResult.outcome, best: game.atlas.memory.best.trunk_0 || 0,
    left: memoryDungeon.count(game, 'trunk_0', 1), dew: (game.currencies.formlessDew || 0) - before.dew })`);
assert.equal(won.open, false, 'the arena closes when the boss falls');
assert.equal(won.result, 'complete');
assert.equal(won.best, 1, 'the won tier is recorded');
assert.equal(won.left, 0);
const dewScale = run(`Math.max(0.5, Math.min(2, memoryDungeon.mapTier(game, atlas.node('trunk_0'), 1) / MEMORY_DUNGEON.rewardTier))`);
assert.ok(won.dew >= Math.floor(4 * dewScale), 'the memory spoils reach the wallet (tier 1: 4 formless dew × the fight tier scale)');

// 8. 화면: 기억 보기에 보스 카드와 단계 단추(가진 수, 싸움 등급).
run(`memoryDungeon.give(game, 'canopy_3', 2); memoryDungeon.give(game, 'canopy_3', 2);`);
const view = run('memoryDungeonUi.html()');
assert.match(view, /기억 던전/);
assert.match(view, new RegExp(run(`atlas.node('canopy_3').boss`)));
assert.match(view, /2단계<\/strong><small>2개, \d+등급/);
console.log('memory dungeon smoke passed');
