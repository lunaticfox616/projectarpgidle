// 묘목장(12번 루프 39)과 고대 씨앗(루프 42), 2026-10-08, data/stump-nursery.js: 묘목 무리가 그 지도 지역 색의 씨앗과 수액을 떨어뜨리고,
// 방을 비우면 하나는 반드시(드물게 불씨의 흉터). 루프 42부터 묘목장과 최종 보스가 고대 씨앗을 준다: 다 자라면 모든 색의 공명에 하나로
// 세고, 상하좌우 이웃 칸의 접붙이기를 한 단계 올린다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; contentProgression.sync(game);
    game.season = 42; game.contentProgression.highestLoop = 42;
    window.seq = values => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
    window.reset = () => { const box = game.stumpBox; box.board = box.board.map(() => null); box.items = []; box.sealed = []; box.graft = box.graft.map(() => 0); };
    window.zoneOf = region => ({ type: 'atlasMap', atlasRegion: region });`);
assert.equal(run('game.stumpBox.acquired'), true);

// 1. 처치 드롭: 묘목 무리만, 지역 색(뿌리는 카오스, 정원은 화염 ...), 품질은 보통 드롭보다 높다.
run(`reset(); getZone = (() => { const real = getZone; return id => (id === 'nursery-test' ? zoneOf('garden') : real(id)); })(); game.currentZoneId = 'nursery-test';`);
const kill = json(`stumpNursery.onKilled(game, { atlasEncounter: 'nursery', isElite: true }, seq([0.1, 0.9, 0.5, 0.99]))`);
assert.deepEqual([kill.family, kill.color], ['seed', 'fire'], 'a garden nursery grows fire');
assert.ok(kill.roll >= 0.95 && kill.roll <= 1.2, 'nursery quality: ' + kill.roll);
assert.equal(run(`stumpNursery.onKilled(game, { atlasEncounter: 'nursery' }, () => 0.5)`), null, 'a normal kill only by chance (4%)');
assert.equal(run(`stumpNursery.onKilled(game, { atlasEncounter: 'hive', isElite: true }, () => 0)`), null, 'other rooms grow nothing');
assert.equal(json(`stumpNursery.colorOf(zoneOf('roots'), () => 0)`), 'chaos');
assert.equal(json(`stumpNursery.colorOf(zoneOf('canopy'), () => 0)`), 'lightning');

// 2. 방 정리: 하나는 반드시, 흉터는 확률로(포식이 열린 뒤), 루프 42부터 드물게 고대 씨앗.
run('reset();');
const gift = json(`stumpNursery.clearGift(game, zoneOf('sanctum'), seq([0.9, 0.2, 0.5, 0.5, 0.9, 0.99]))`);
assert.equal(gift.length, 1);
assert.equal(gift[0].color, 'cold', 'a sanctum nursery grows cold');
assert.ok(gift[0].roll >= 1 && gift[0].roll <= 1.25);
const ancient = json(`stumpNursery.clearGift(game, zoneOf('roots'), seq([0.01, 0.5, 0.99]))`);
assert.equal(ancient[0].ancient, true, 'from loop 42 the room sometimes gives an ancient seed');
assert.deepEqual([ancient[0].family, ancient[0].color], ['seed', 'chaos']);
run('game.season = 41;');
assert.equal(json(`stumpNursery.clearGift(game, zoneOf('roots'), seq([0.01, 0.2, 0.5, 0.5, 0.5, 0.99]))`)[0].ancient, undefined, 'not before loop 42');
run('game.season = 42;');

// 3. 고대 씨앗의 이름과 표식, 저장 경계(씨앗만).
run('reset();');
assert.match(run(`stumpBox.shortName(stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1, ancient: true }))`), /^고대 화염/);
assert.equal(run(`stumpBox.createItem(game, { family: 'sap', color: 'fire', roll: 1, ancient: true }).ancient || false`), false, 'only seeds are ancient');
assert.match(run(`stumpRipeningUi.badgesHtml(stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1, ancient: true }))`), /고대: 모든 색 공명/);
const restored = json(`(() => { const raw = JSON.parse(JSON.stringify(game.stumpBox)); const state = { ...game, stumpBox: raw };
    return stumpBox.restore(state, raw).items.map(item => [item.family, !!item.ancient]); })()`);
assert.deepEqual(restored, [['seed', true], ['sap', false], ['seed', true]], 'the ancient mark survives a load, seeds only');

// 4. 효과: 다 자란 고대 씨앗은 모든 색의 공명에 하나로 센다.
const resonance = json(`(() => {
    reset();
    const grow = (color, cell, ancientSeed) => { const item = stumpBox.createItem(game, { family: 'seed', color, roll: 1, ancient: ancientSeed });
        stumpBox.place(game, item.id, cell, 'flower'); item.xp = stumpBox.need(item); item.ripe = true; return item; };
    const need = STUMP_BOX_RESONANCE.count;
    for (let i = 0; i < need - 1; i++) grow('fire', [12, 7, 11, 13, 17, 6, 8][i]);
    const before = [...stumpBox.evaluate(game).resonant];
    grow('cold', 16, true);
    const after = stumpBox.evaluate(game);
    return { need, before, after: [...after.resonant], counts: after.counts };
})()`);
assert.ok(!resonance.before.includes('fire'), 'one short of fire resonance');
assert.ok(resonance.after.includes('fire'), 'the ancient seed completes fire resonance: ' + JSON.stringify(resonance));
assert.equal(resonance.counts.lightning, 1, 'and counts once for every other colour too');

// 5. 효과: 상하좌우 이웃의 접붙이기가 한 단계 오른다(잠든 고대 씨앗은 아니다).
const graft = json(`(() => {
    reset();
    const seed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 });
    stumpBox.place(game, seed.id, 12, 'flower');
    const ancientSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1, ancient: true });
    stumpBox.place(game, ancientSeed.id, 7, 'flower');
    const asleep = stumpBox.ancientRanks(game.stumpBox, 12);
    ancientSeed.xp = stumpBox.need(ancientSeed); ancientSeed.ripe = true;
    return { asleep, awake: stumpBox.ancientRanks(game.stumpBox, 12), corner: stumpBox.ancientRanks(game.stumpBox, 6), self: stumpBox.ancientRanks(game.stumpBox, 7) };
})()`);
assert.deepEqual(graft, { asleep: 0, awake: 1, corner: 1, self: 0 }, 'an awake ancient lends its side neighbours a rank: ' + JSON.stringify(graft));

// 6. 최종 보스: 루프 42부터 25%로 고대 씨앗.
run('reset();');
assert.equal(json(`stumpNursery.ancientFromBoss(game, seq([0.1, 0.5, 0.5])).ancient`), true);
assert.equal(run(`stumpNursery.ancientFromBoss(game, () => 0.9)`), null);

// 7. 방: 루프 39부터, 하늘 가지에서 두 배, 초록 테.
assert.equal(run(`atlasEncounters.isOpen('nursery', 38)`), false);
assert.equal(run(`atlasEncounters.isOpen('nursery', 39)`), true);
assert.equal(run(`atlasEncounters.chance('nursery', {}, 'canopy')`), 16);
assert.equal(json(`atlasEncounters.tuneEnemy({ name: '곰', maxHp: 10, hp: 10 }, 'nursery')`).encounterOutline, '#7fd99a');
console.log('stump nursery smoke passed');
