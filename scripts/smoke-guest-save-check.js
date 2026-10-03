// 게스트 저장 조작 검사(2026-10-03, js/guest-save-check.js): 게스트 저장을 계정으로 옮기기 전에 정상 플레이로는 나올 수 없는
// 값만 잡는다. 실제 드롭으로 만든 세이브와 새 세이브는 통과하고, 손으로 고친 값은 고친 항목 하나만 걸려야 한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const NOW = Date.UTC(2026, 9, 3, 12);

// 루프 20, 레벨 85의 세이브: 깊이 40 심연 드롭(희귀 이상) 40개, 고유 장비와 그 도감 사본, 젬 20레벨 20품질, 화폐.
run(`game = mergeDefaults({ level: 85, season: 20, loopCount: 19, settings: { showLootLog: false } });
    globalThis.__zone = getZone(getAbyssZoneIdForDepth(40));
    for (let i = 0; i < 40; i++) {
        game.inventory.push(normalizeItem(generateEquipmentDrop(createEnemy(__zone, { elite: i % 3 === 0 }, 0), { zone: __zone, minimumRarity: 'rare' })));
    }
    UNIQUE_DB.filter(def => !def.ultraRare).slice(0, 24).forEach(def => {
        const item = normalizeItem(generateUniqueItem(80, null, def.name));
        const key = getUniqueCodexKeyByItem(item);
        if (key) game.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
        game.inventory.push(item);
    });
    game.equipment['무기'] = game.inventory.shift();
    Object.keys(SKILL_DB).slice(0, 8).forEach(name => { game.gemData[name] = normalizeGemRecord({ level: 20, exp: 0, quality: 20 }); });
    game.passives = [];
    game.passivePoints = 84;
    Object.keys(game.currencies).forEach((key, index) => { game.currencies[key] = index * 37; });
    game.saveMeta.lastModifiedAt = ${NOW} - 60000;
    game.saveMeta.maxSeenAt = ${NOW} - 60000;`);
const codexShared = json(`Object.values(game.uniqueCodex).filter(copy => game.inventory.some(item => item.id === copy.id)).length`);
assert.ok(codexShared > 0, 'the codex keeps copies with the same id as owned uniques');

const inspect = code => json(`(() => { const save = JSON.parse(JSON.stringify(game)); ${code}; return guestSaveCheck.inspect(save, ${NOW}); })()`);
assert.deepStrictEqual(inspect('').keys, [], 'a played save with drops, uniques, codex copies and maxed gems passes');
assert.deepStrictEqual(json(`guestSaveCheck.inspect(cloneDefaultGame(), ${NOW}).keys`), [], 'a fresh save passes');

// 정상 끝값: 일지와 액트 보상 포인트를 모두 받은 경우, 공허 하나의 창백한 푸른 점, 특별한 기본 속성, 10분 안의 시계 차이.
const bonusPoints = json(`Object.values(JOURNAL_DB).reduce((sum, entry) => sum + (entry && entry.bonus && entry.bonus.stat === 'passivePoint' ? entry.bonus.value : 0), 0)
    + Object.values(ACT_REWARD_DB).reduce((sum, row) => sum + Math.max(0, ...(row.choices || []).map(choice => choice.kind === 'points' ? choice.value
        : (choice.kind === 'skill' || choice.fallbackKind === 'points' ? (choice.fallbackValue || 1) : 0))), 0)`);
assert.ok(bonusPoints > 0, 'journal and act rewards grant points');
assert.deepStrictEqual(inspect(`save.passivePoints = 84 + ${bonusPoints}`).keys, [], 'every journal and act reward point is allowed');
const paleNode = json(`Object.keys(PASSIVE_TREE.nodes).find(id => PASSIVE_TREE.nodes[id].kind !== 'start')`);
const pale = `save.passives = ['${paleNode}']; save.voidPassives = { '${paleNode}': { transcendent: { id: 'paleBlueDot', value: 10 } } };`;
assert.deepStrictEqual(inspect(`${pale} save.passivePoints = 83 + ${bonusPoints} + 10`).keys, [], 'a 창백한 푸른 점 void adds its 10 points');
assert.deepStrictEqual(inspect(`save.inventory[0].baseStats = [{ id: 'flatHp', val: 19, valMin: 11, valMax: 16, exceptional: true }]`).keys, [],
    'an exceptional base line rolls above its stored range by design');
assert.deepStrictEqual(inspect(`save.saveMeta.maxSeenAt = ${NOW} + 5 * 60000`).keys, [], 'a clock a few minutes off is fine');

// 손으로 고친 값: 고친 항목 하나만 걸린다.
const tampered = [
    ['level 999', 'save.level = 999', 'level'],
    ['100 passive points out of nowhere', 'save.passivePoints += 100', 'passive'],
    ['a 창백한 푸른 점 void edited to 9999', `${pale} save.passivePoints = 83 + ${bonusPoints} + 9999; save.voidPassives['${paleNode}'].transcendent.value = 9999`, 'passive'],
    ['a currency set to 99,999,999', 'save.currencies.magicBud = 99999999', 'currency'],
    ['a negative currency', 'save.currencies.sapBud = -5', 'currency'],
    ['a gem at level 99', 'save.gemData[Object.keys(save.gemData)[0]].level = 99', 'gem'],
    ['a gem at quality 50', 'save.gemData[Object.keys(save.gemData)[0]].quality = 50', 'gem'],
    ['an item line set to 9999', 'save.inventory[0].stats[0].val = 9999', 'item'],
    ['a worn item line at tier 99', "save.equipment['무기'].stats[0].tier = 99", 'item'],
    ['an item with 30 lines', 'save.inventory[1].stats = Array.from({ length: 30 }, () => ({ ...save.inventory[1].stats[0] }))', 'item'],
    ['an item copied in the bag', 'save.inventory.push(JSON.parse(JSON.stringify(save.inventory[0])))', 'duplicate'],
    ['a worn item copied into temporary storage', "save.equipmentTemporaryStorage = [JSON.parse(JSON.stringify(save.equipment['무기']))]", 'duplicate'],
    ['the clock moved a day ahead and back', `save.saveMeta.maxSeenAt = ${NOW} + 86400000`, 'clock'],
    ['a passive list that is not a list', 'save.passives = 5', 'passive']
];
for (const [label, code, key] of tampered) {
    assert.deepStrictEqual(inspect(code).keys, [key], `${label} is caught as ${key} only`);
}
const several = inspect("save.level = 999; save.currencies.magicBud = 99999999; save.saveMeta.maxSeenAt = " + (NOW + 86400000));
assert.deepStrictEqual(several.problems, ['레벨', '화폐', '기기 시간'], 'the notice lists every problem in plain words');

// 저장할 때마다 저장이 본 가장 늦은 시각을 남긴다. 시계를 되돌려도 줄지 않는다.
const writes = [];
context.localStorage.setItem = (key, value) => writes.push(key);
const seen = json(`(() => {
    game.saveMeta.maxSeenAt = 0;
    persistLocalSave({ touchModifiedAt: true });
    const first = game.saveMeta.maxSeenAt;
    game.saveMeta.maxSeenAt = Date.now() + 86400000;
    persistLocalSave({ touchModifiedAt: true });
    return { first, kept: game.saveMeta.maxSeenAt - Date.now() };
})()`);
assert.ok(writes.length >= 2 && seen.first > 0, 'persistLocalSave records the time it saved');
assert.ok(seen.kept > 86000000, 'a later time already seen is kept');
console.log('smoke-guest-save-check passed');
