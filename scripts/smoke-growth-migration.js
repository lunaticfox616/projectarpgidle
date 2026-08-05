// 생장판 마이그레이션 회귀 검사: 기존 장비/보관함 아이템 무손실 변환, 1회만 실행,
// 옵션·품질·타락·봉인 보존, 제단 아이템 보존, 자동 배치.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadContext() {
    const storage = {};
    const context = {
        console,
        window: {},
        localStorage: {
            getItem: key => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
            setItem: (key, value) => { storage[key] = String(value); },
            removeItem: key => { delete storage[key]; }
        },
        __storage: storage,
        game: null,
        defaultGame: { equipment: { '무기': null, '투구': null, '갑옷': null, '방패': null, '장갑1': null, '장갑2': null, '신발': null, '목걸이': null, '반지1': null, '반지2': null, '반지3': null, '허리띠': null } },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        startMoving: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        addItemToInventory: () => true,
        getInventoryLimit: () => 60,
        registerUniqueToCodexOnAcquire: () => {},
        passesItemPickupFilter: () => true,
        createSaveSnapshot: source => JSON.parse(JSON.stringify(source || {})),
        addStatToBucket: () => {}
    };
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => {
        if (typeof context[key] === 'undefined') context[key] = map[key];
    });
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-effects.js', 'utf8'), context);
    // 생성 모듈은 레거시 변환 함수(convertLegacyItemToGrowthItem)를 제공한다.
    vm.runInContext(fs.readFileSync('js/growth-generation.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-migration.js', 'utf8'), context);
    return context;
}

function makeLegacyItem(id, slot, name, extra) {
    return Object.assign({
        id, slot, name, baseName: `${name} 베이스`, rarity: 'rare', itemTier: 8, hiddenTier: 8,
        baseStats: [{ id: 'flatDmg', val: 20, valMin: 15, valMax: 25, tier: 0, statName: '기본 피해' }],
        stats: [{ id: 'critDmg', val: 40, valMin: 30, valMax: 50, tier: 5, statName: '치명타 피해 배율' }],
        quality: 17
    }, extra || {});
}

// ── 무손실 변환 ──────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    ctx.game = {
        maxZoneId: 6, season: 2, growthSystemVersion: 0,
        equipment: {
            '무기': makeLegacyItem(1, '무기', '낡은 검'),
            '갑옷': makeLegacyItem(2, '갑옷', '판금 갑옷', { corrupted: true }),
            '반지1': makeLegacyItem(3, '반지', '수호 반지', { loopSealed: true, locked: true }),
            '방패': null
        },
        inventory: [makeLegacyItem(4, '신발', '가벼운 장화'), makeLegacyItem(5, '목걸이', '별빛 목걸이', { rarity: 'unique', uniqueEffectKey: 'xpGainPct', uniqueEffect: '경험치 +5%' })],
        recentGrowthDrops: [],
        timeRift: { altarUnique: makeLegacyItem(6, '투구', '제단 고유', { rarity: 'unique' }), altarRare: makeLegacyItem(7, '투구', '제단 희귀') },
        currencies: { chaos: 0 },
        growthBoard: null, growthSmallBaseSeen: {}, settings: {}
    };

    const before = ctx.game.inventory.length + 3;
    const result = vm.runInContext('runGrowthBoardMigration()', ctx);
    assert.strictEqual(result.migrated, true, '첫 실행에서는 마이그레이션이 수행되어야 한다');
    assert.strictEqual(ctx.game.inventory.length, before, '아이템이 하나도 사라지면 안 된다');
    assert.strictEqual(result.broken, 0, '정상 아이템은 변환 실패로 집계되면 안 된다');

    // 모든 아이템이 생장 아이템이 되었다.
    const allGrowth = vm.runInContext('game.inventory.every(function (item) { return isGrowthItem(item); })', ctx);
    assert.strictEqual(allGrowth, true, '보관함의 모든 아이템이 생장 아이템으로 변환되어야 한다');

    // 슬롯 → 종류 매핑
    const byName = {};
    ctx.game.inventory.forEach(item => { byName[item.name] = item; });
    assert.strictEqual(byName['낡은 검'].growthCategory, 'flower', '무기는 꽃이 되어야 한다');
    assert.strictEqual(byName['판금 갑옷'].growthCategory, 'branch', '갑옷은 가지가 되어야 한다');
    assert.strictEqual(byName['수호 반지'].growthCategory, 'leaf', '반지는 잎이 되어야 한다');

    // 옵션·품질·타락·봉인·잠금 보존
    assert.strictEqual(byName['낡은 검'].stats[0].val, 40, '추가 옵션 수치가 보존되어야 한다');
    assert.strictEqual(byName['낡은 검'].stats[0].tier, 5, '옵션 티어가 보존되어야 한다');
    assert.strictEqual(byName['낡은 검'].quality, 17, '품질이 보존되어야 한다');
    assert.strictEqual(byName['판금 갑옷'].corrupted, true, '타락 상태가 보존되어야 한다');
    assert.strictEqual(byName['수호 반지'].loopSealed, true, '루프 봉인이 보존되어야 한다');
    assert.strictEqual(byName['수호 반지'].locked, true, '잠금이 보존되어야 한다');
    assert.strictEqual(byName['별빛 목걸이'].uniqueEffectKey, 'xpGainPct', '고유 효과 키가 보존되어야 한다');

    // 형태/크기가 부여되었다.
    ctx.game.inventory.forEach(item => {
        const size = vm.runInContext(`getGrowthItemSize(game.inventory.find(function (row) { return row.id === ${item.id}; }))`, ctx);
        assert.ok(size >= 1, `${item.name}에 유효한 형태가 부여되어야 한다`);
    });

    // 기존 고정 슬롯은 비워진다.
    const equippedLeft = Object.values(ctx.game.equipment).filter(Boolean).length;
    assert.strictEqual(equippedLeft, 0, '기존 고정 슬롯은 모두 비워져야 한다');

    // 제단 아이템도 변환되어 보존된다.
    assert.strictEqual(vm.runInContext('isGrowthItem(game.timeRift.altarUnique)', ctx), true, '제단 고유가 변환되어야 한다');
    assert.strictEqual(vm.runInContext('isGrowthItem(game.timeRift.altarRare)', ctx), true, '제단 희귀가 변환되어야 한다');
    assert.strictEqual(ctx.game.timeRift.altarUnique.name, '제단 고유', '제단 아이템이 사라지면 안 된다');

    // 장착 중이던 아이템은 자동 배치를 시도한다.
    const placedCount = vm.runInContext('Object.keys(getActiveGrowthLoadout().placements).length', ctx);
    assert.ok(placedCount > 0, '기존 장착 장비는 자동으로 배치되어야 한다');
    const placedIds = Object.keys(vm.runInContext('getActiveGrowthLoadout().placements', ctx)).map(Number);
    assert.ok(placedIds.every(id => [1, 2, 3].includes(id)), '자동 배치 대상은 기존 장착 장비여야 한다');

    // 배치가 규칙을 위반하지 않는다.
    assert.strictEqual(vm.runInContext('validateGrowthPlacements()', ctx), 0, '자동 배치 결과는 유효해야 한다');

    // 백업이 남는다.
    assert.ok(ctx.__storage.projectIdleGrowthMigrationBackup, '마이그레이션 전 저장 백업이 남아야 한다');
    const backup = JSON.parse(ctx.__storage.projectIdleGrowthMigrationBackup);
    assert.strictEqual(backup.game.equipment['무기'].name, '낡은 검', '백업에는 변환 전 원본이 담겨야 한다');

    // ── 재실행 방지 ──────────────────────────────────────────────────────
    assert.strictEqual(vm.runInContext('isGrowthMigrationNeeded()', ctx), false, '버전 기록 후에는 다시 필요하지 않아야 한다');
    const snapshotBefore = JSON.stringify(ctx.game.inventory);
    const second = vm.runInContext('runGrowthBoardMigration()', ctx);
    assert.strictEqual(second.migrated, false, '마이그레이션은 한 번만 실행되어야 한다');
    assert.strictEqual(JSON.stringify(ctx.game.inventory), snapshotBefore, '재호출이 보관함을 변경하면 안 된다');
}

// ── 같은 아이템은 항상 같은 형태를 받는다(결정론) ─────────────────────────
{
    const ctx = loadContext();
    const shapes = [0, 1].map(() => {
        const item = makeLegacyItem(42, '무기', '동일 검');
        return vm.runInContext(`pickGrowthShapeForLegacy(${JSON.stringify(item)})`, ctx);
    });
    assert.strictEqual(shapes[0], shapes[1], '같은 id/티어의 아이템은 항상 같은 형태를 받아야 한다');
}

// ── 이미 생장 아이템인 저장은 그대로 둔다 ─────────────────────────────────
{
    const ctx = loadContext();
    ctx.game = {
        maxZoneId: 2, season: 1, growthSystemVersion: 0,
        equipment: { ...ctx.defaultGame.equipment },
        inventory: [{ id: 9, growthBaseId: 'gf_sun_bloom', growthShapeId: 'block9', growthCategory: 'flower', name: '기존 생장 아이템', rarity: 'rare', baseStats: [], stats: [] }],
        recentGrowthDrops: [], timeRift: null, currencies: { chaos: 0 },
        growthBoard: null, growthSmallBaseSeen: {}, settings: {}
    };
    const result = vm.runInContext('runGrowthBoardMigration()', ctx);
    assert.strictEqual(result.migrated, true, '버전 기록을 위해 한 번은 실행된다');
    assert.strictEqual(ctx.game.inventory.length, 1, '이미 생장 아이템인 항목은 그대로 유지되어야 한다');
    assert.strictEqual(ctx.game.inventory[0].growthBaseId, 'gf_sun_bloom', '기존 생장 베이스가 바뀌면 안 된다');
    assert.ok(!ctx.__storage.projectIdleGrowthMigrationBackup, '변환할 레거시 아이템이 없으면 백업을 만들지 않는다');
}

console.log('smoke-growth-migration passed');
