// 보스 변이체(12번 루프 33, 2026-10-08, data/boss-variants.js): 루프 33부터 모든 보스가 드물게 변이체로 나오고(원소가 바뀌고 한 가지가
// 세다), 잡으면 전리품이 늘고 처음 잡은 변이마다 황금률, 아틀라스의 보스였다면 그 보스의 기억 3단계. 기억 던전 3단계부터는 기억의
// 보스가 변이체로 다시 불려 나온다. 실제 아틀라스 지도에서 변이한 보스를 잡아 기록과 기억까지 본다.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(85);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'stop'}});
    game.season=33;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.equipment['무기']={id:90001,slot:'무기',name:'변이 사냥꾼',rarity:'rare',baseStats:[{id:'flatDmg',val:1e12},{id:'flatHp',val:1e12}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;atlas.sync(game);
    var bossOf = () => ({ name: '👿 시험 보스', isBoss: true, maxHp: 1000, hp: 1000, ele: 'phys', dropMul: 1, expMul: 1 });
    // The fixture window has no CustomEvent: collect the module's notices by wrapping the dispatcher it calls.
    var events = []; var realDispatch = dispatchRuntimeEvent;
    dispatchRuntimeEvent = (name, detail) => { if (name === 'boss-variant') events.push(detail); return realDispatch(name, detail); };
`);

// 1. 자료: 다섯 변이, 피해 배수는 1.2까지.
const kinds = copy('BOSS_VARIANTS.kinds');
assert.deepEqual(kinds.map(kind => kind.id), ['ember', 'frost', 'storm', 'void', 'twin']);
assert.ok(kinds.every(kind => !(kind.mul.damageMul > 1.2)), 'variant damage stays at 1.2 or less');
assert.equal(new Set(kinds.map(kind => kind.ele)).size, 5, 'each variant brings its own element');

// 2. 언제 변이하나: 루프 33부터, 보스만, 한 번만, 정해진 싸움(나무꾼, 경계 너머, 정점 관문, 아스트라)은 빼고.
run('game.season = 32;');
assert.equal(copy(`bossVariants.maybeApply(bossOf(), { type: 'abyss' }, () => 0)`).bossVariant, undefined, 'not before loop 33');
run('game.season = 33;');
const spawned = copy(`bossVariants.maybeApply(bossOf(), { type: 'abyss' }, () => 0)`);
assert.equal(spawned.bossVariant, 'ember', 'a boss can spawn as a variant');
assert.equal(copy(`bossVariants.maybeApply(bossOf(), { type: 'abyss' }, () => 0.99)`).bossVariant, undefined, 'only by chance');
assert.equal(copy(`bossVariants.maybeApply({ ...bossOf(), isBoss: false }, { type: 'abyss' }, () => 0)`).bossVariant, undefined, 'bosses only');
for (const zone of ["{ type: 'outsideChaos' }", "{ type: 'beyondBoundary' }", "{ type: 'act', milestonePinnacle: true }", "{ type: 'seasonBoss', id: 'cosmos_astra' }"]) {
    assert.equal(copy(`bossVariants.maybeApply(bossOf(), ${zone}, () => 0)`).bossVariant, undefined, 'fixed fights do not mutate: ' + zone);
}
assert.ok(copy('events').some(event => event.kind === 'spawn' && /불씨 변이체/.test(event.name)), 'a spawn is announced');

// 3. 변이의 모습과 힘: 원소, 배수, 보호막, 전리품과 경험치, 이름, 색조와 테. 다시 입혀도 이름이 겹치지 않는다.
const frost = copy(`bossVariants.apply(bossOf(), bossVariants.kind('frost'))`);
assert.deepEqual([frost.ele, frost.maxHp, frost.hp, frost.dropMul, frost.expMul], ['cold', 1500, 1500, 2.5, 1.5]);
assert.equal(frost.attackSpeedVar, 0.9);
assert.equal(frost.name, '👿 시험 보스 (서리 변이체)');
assert.deepEqual([frost.bossVisualTint, frost.variantOutline], [190, '#8fd6ff']);
const voided = copy(`bossVariants.apply(bossOf(), bossVariants.kind('void'))`);
assert.deepEqual([voided.maxEnergyShield, voided.energyShield, voided.leechPct], [312, 312, 8], 'the void variant wears a shield and leeches');
assert.equal(copy(`(() => { const boss = bossVariants.apply(bossOf(), bossVariants.kind('storm')); boss.name = '👿 다음 단계'; bossVariants.dress(boss); bossVariants.dress(boss); return boss.name; })()`),
    '👿 다음 단계 (폭풍 변이체)', 'a renamed stage gets the variant name once');

// 4. 기억 던전의 다시 부르기: 3단계부터, 이미 변이체면 그대로.
assert.equal(copy(`bossVariants.recall(bossOf(), 2, () => 0)`).bossVariant, undefined, 'tiers 1 and 2 never recall');
assert.ok(copy(`bossVariants.recall(bossOf(), 5, () => 0)`).bossVariant, 'tier 5 can recall a variant');
assert.equal(copy(`bossVariants.recall(bossVariants.apply(bossOf(), bossVariants.kind('twin')), 5, () => 0)`).bossVariant, 'twin');
assert.equal(copy(`(() => { const boss = bossOf(); memoryDungeon.tuneBoss(boss, 1); return boss.bossVariant || null; })()`), null, 'a tier 1 memory stays itself');

// 5. 쓰러지면: 기록, 처음 잡은 변이의 황금률(한 번만), 저장 경계.
const kill = copy(`(() => {
    const before = game.currencies.goldenRule || 0;
    const first = bossVariants.onKilled(game, bossVariants.apply(bossOf(), bossVariants.kind('ember')));
    const second = bossVariants.onKilled(game, bossVariants.apply(bossOf(), bossVariants.kind('ember')));
    return { first: first.first, second: second.second || second.first, gold: (game.currencies.goldenRule || 0) - before, record: game.atlas.memory.variants };
})()`);
assert.deepEqual(kill, { first: true, second: false, gold: 1, record: { ember: 2 } });
assert.equal(run(`bossVariants.onKilled(game, bossOf())`), null, 'an ordinary boss leaves no record');
assert.deepEqual(copy(`memoryDungeon.normalize({ tickets: {}, variants: { ember: 3, frost: 'x', nowhere: 5 } }).variants`), { ember: 3 });

// 6. 실제 지도: 보스가 나오면 변이를 입히고 잡는다. 기록이 늘고, 그 보스의 기억 3단계가 남는다.
run(`game.atlas.memory = memoryDungeon.defaults(); const map = Object.assign(atlasMaps.create('roots_1', 3, 'normal'), { uid: game.atlas.nextUid++ });
    game.atlas.stash.push(map); window.opened = atlasRun.open(map.uid);`);
assert.equal(run('opened'), '');
let dressed = false;
for (let n = 0; n < 9000 && run('!!game.atlas.run'); n++) {
    advance();
    if (!dressed && run(`(game.enemies || []).some(enemy => enemy && enemy.isBoss && enemy.hp > 0)`)) {
        run(`(game.enemies || []).filter(enemy => enemy && enemy.isBoss && !enemy.bossVariant).forEach(enemy => bossVariants.apply(enemy, bossVariants.kind('storm')));`);
        dressed = true;
    }
}
assert.ok(dressed, 'the map boss appeared');
const after = copy(`({ open: !!game.atlas.run, record: game.atlas.memory.variants.storm || 0, memory: memoryDungeon.count(game, 'roots_1', 3) })`);
assert.equal(after.open, false, 'the map is complete');
assert.equal(after.record, 1, 'the variant kill is recorded');
assert.equal(after.memory, 1, 'an atlas boss variant leaves its tier 3 memory');

// 7. 화면: 기억 보기의 변이체 기록.
const view = run('memoryDungeonUi.html()');
assert.match(view, /변이체 기록/);
assert.match(view, /폭풍 변이체 1/);
console.log('boss variants smoke passed');
