// 보조 콘텐츠 통합 2단계(2026-10-01): 플라스크(회복 · 유틸 물약)와 보조장비 창 삭제.
// 저장에서 물약 흔적이 보상 없이 사라지고(결정 4 · 7), 물약에 기대던 고유 · 키스톤은 물약 없이 동작한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 정의가 없다: 물약 DB · 해금 항목 · 단축키 · 보조장비 창 · 히든 저널 한 줄.
assert.equal(run("typeof FLASK_DB"), 'undefined');
assert.equal(run("CONTENT_UNLOCK_CATALOG.some(def => /flask/i.test(def.id))"), false);
assert.equal(run("HOTKEY_ACTIONS.some(action => action.kind === 'flask')"), false);
assert.equal(run("typeof JOURNAL_DB.hidden_dry_vial"), 'undefined');

// 불러오기: 물약 상태(연금 유리 포함) · 알림 · 단축키 · 해금 · 히든 저널 · 허리띠 옵션을 지운다. 두 번 불러와도 같다.
const legacySave = {
    season: 4, level: 40,
    flasks: { healTier: 'h3', healCharges: 2, alchemyGlass: 17, foundKeys: ['h1', 'h2', 'granite1'], utils: [{ key: 'granite1', charges: 1 }] },
    noti: { flask: true, items: true },
    settings: { notiFilters: { flask: false, items: true }, hotkeyOverrides: { 'flask:0': 'KeyQ', 'flask:2': '' } },
    contentProgression: { version: 7, highestLoop: 4, unlocked: ['craft', 'flask'], inherited: ['flaskUtility'], paidCosts: { craft: 1, flask: 1 } },
    journalEntries: ['prologue', 'hidden_dry_vial'],
    inventory: [{ id: 9001, name: '낡은 허리띠', slot: '허리띠', rarity: 'normal', hiddenTier: 10, stats: [],
        baseStats: [{ id: 'flatHp', val: 20 }, { id: 'flaskUtilSlots', val: 2, valMin: 1, valMax: 2 }] }]
};
run(`window.legacyFlaskSave = ${JSON.stringify(legacySave)}; game = mergeDefaults(JSON.parse(JSON.stringify(window.legacyFlaskSave)));`);
const loaded = json(`({ flasks: 'flasks' in game, noti: game.noti.flask, filter: game.settings.notiFilters.flask,
    hotkeys: game.settings.hotkeyOverrides, owned: [...game.contentProgression.unlocked, ...game.contentProgression.inherited],
    journal: game.journalEntries, belt: game.inventory[0].baseStats.map(stat => stat.id) })`);
assert.equal(loaded.flasks, false, 'flask state (and its alchemy glass) is dropped');
assert.equal(loaded.noti, undefined);
assert.equal(loaded.filter, undefined);
assert.deepEqual(loaded.hotkeys, {}, 'flask hotkeys are unknown actions now');
assert.deepEqual(loaded.owned, ['craft'], 'removed unlock entries drop out of the ledger');
assert.ok(loaded.journal.includes('prologue') && !loaded.journal.includes('hidden_dry_vial'), 'the dry-vial hidden journal goes with the flasks');
assert.deepEqual(loaded.belt, ['flatHp'], "a belt's flask-slot base option is removed on load");
const once = run('JSON.stringify(game)');
run('game = mergeDefaults(JSON.parse(JSON.stringify(game)));');
assert.equal(run('JSON.stringify(game)'), once, 'loading twice gives the same save');

// 새 허리띠는 물약 슬롯 옵션을 굴리지 않는다.
run(`window.newBelt = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '허리띠'), 'normal', 20);`);
assert.equal(run("window.newBelt.baseStats.some(stat => stat.id === 'flaskUtilSlots')"), false);

// 천 개의 유리병: 예전 물약 슬롯 효과 → 물약 넷의 약한 상시 효과. 저장된 아이템은 불러올 때 새 효과로 맞춰진다.
const bottles = json("UNIQUE_DB.find(unique => unique.name === '천 개의 유리병')");
assert.equal(bottles.uniqueEffectKey, 'thousandBottles');
assert.equal(bottles.syncEffectOnLoad, true);
run(`game = mergeDefaults({ level: 100, inventory: [{ id: 9002, name: '천 개의 유리병', slot: '허리띠', rarity: 'unique', hiddenTier: 16,
    stats: [], baseStats: [], uniqueEffectKey: 'extraFlaskUtilitySlots', uniqueEffect: '유틸리티 플라스크 슬롯 +3', uniqueEffectParams: { slots: 3 } }] });`);
assert.deepEqual(json('[game.inventory[0].uniqueEffectKey, game.inventory[0].uniqueEffectParams]'), ['thousandBottles', null]);
run(`game = JSON.parse(JSON.stringify(defaultGame)); game.level = 100;
    window.bottlesBelt = createItemFromBase(BASE_ITEM_DB.find(base => base.id === 'blood_girdle'), 'normal', 16);
    Object.assign(window.bottlesBelt, { rarity: 'unique', name: '천 개의 유리병', uniqueEffectKey: 'thousandBottles' });`);
const withoutBelt = json('getPlayerStats(false)');
run("game.equipment['허리띠'] = window.bottlesBelt;");
const withBelt = json('getPlayerStats(false)');
assert.equal(withBelt.damageIncreasePct - withoutBelt.damageIncreasePct, 10, '피해 +10%');
assert.equal(withBelt.resF - withoutBelt.resF, 12, '모든 저항 +12%');
assert.ok(Math.abs(withBelt.aspd / withoutBelt.aspd - 1.08) < 1e-9, '공격 속도 +8%');

// 과잉 투여: 유틸 물약 증폭 → 포션 스킬 피해 ×1.5 · 속도 ×0.75(포션 태그가 없는 스킬에는 걸리지 않음).
assert.equal(run("getPotionKeystoneHitScale({ potionOverdose: true })"), 1.5);
assert.equal(run("scaleKeystoneAttackSpeed(1, { potionOverdose: true })"), 0.75);
console.log('smoke-flask-removal passed');
