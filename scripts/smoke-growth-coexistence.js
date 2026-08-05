// 생장판이 기존 고정 슬롯 장비를 대체하지 않는다는 계약을 고정한다.
// - 스탯 소스는 "장비 + 배치된 생장 아이템"이며 두 출처가 함께 합산된다.
// - 생장 아이템은 전용 보관함을 쓰고 장비 인벤토리 칸을 잠식하지 않는다.
// - 루프 25 전에는 생장 드랍이 발생하지 않는다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// combat.js에서 계약에 해당하는 함수만 떼어 실행한다(전체 로드는 다른 스모크가 담당).
function loadStatSourceContract(gameState) {
    const source = fs.readFileSync('js/combat.js', 'utf8');
    const start = source.indexOf('function getStatSourceItemEntries()');
    const end = source.indexOf('function rollGrowthItemDrop(');
    assert(start >= 0 && end > start, 'stat source contract functions not found');
    const context = {
        console,
        game: gameState,
        getPlacedGrowthEntries: () => (gameState.__placed || []).map(item => ({ item }))
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    return context;
}

// ── 스탯 소스: 장비와 생장판이 함께 합산된다 ──────────────────────────────
{
    const weapon = { id: 1, slot: '무기', name: '검' };
    const boots = { id: 2, slot: '신발', name: '장화' };
    const flower = { id: 10, slot: '무기', name: '꽃', growthCategory: 'flower', growthShapeId: 'dot1' };
    const state = {
        equipment: { '무기': weapon, '신발': boots, '갑옷': null },
        __placed: [flower]
    };
    const ctx = loadStatSourceContract(state);
    // VM 컨텍스트의 배열은 프로토타입이 달라 deepStrictEqual이 실패한다. 직렬화해서 비교한다.
    const entries = vm.runInContext('getStatSourceItemEntries()', ctx);
    const names = Array.from(entries).map(row => row[1].name).sort();
    assert.strictEqual(JSON.stringify(names), JSON.stringify(['검', '꽃', '장화']), '장비와 생장 배치가 모두 스탯 소스여야 한다');

    const keys = Array.from(entries).map(row => row[0]);
    assert.ok(keys.includes('무기'), '고정 슬롯 키가 유지되어야 한다');
    assert.ok(keys.some(key => String(key).startsWith('growth:')), '생장 배치는 growth: 접두 키를 써야 한다');

    // 생장판이 비어도 장비 스탯은 그대로 나온다(대체가 아니라 추가라는 계약).
    state.__placed = [];
    const equipOnly = Array.from(vm.runInContext('getStatSourceItemEntries()', ctx)).map(row => row[1].name).sort();
    assert.strictEqual(JSON.stringify(equipOnly), JSON.stringify(['검', '장화']), '생장판이 비어도 장비 스탯 소스는 유지되어야 한다');

    // 반대로 장비를 모두 벗어도 생장 배치는 계속 기여한다.
    state.equipment = { '무기': null, '신발': null };
    state.__placed = [flower];
    const growthOnly = Array.from(vm.runInContext('getStatSourceItemEntries()', ctx)).map(row => row[1].name);
    assert.strictEqual(JSON.stringify(growthOnly), JSON.stringify(['꽃']), '장비가 없어도 생장 배치는 스탯을 제공해야 한다');
}

// ── 보관함 분리 + 해금 게이트 ────────────────────────────────────────────
{
    const context = {
        console,
        window: {},
        game: {
            season: 1,
            inventory: [{ id: 1, slot: '무기', name: '기존 장비' }],
            growthInventory: [],
            recentGrowthDrops: [],
            growthBoard: null,
            settings: { showLootLog: false, autoSalvageEnabled: false, autoSalvageRarities: {} }
        },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        startMoving: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        addItemToInventory: () => { throw new Error('생장 아이템이 장비 인벤토리로 들어가면 안 된다'); },
        getInventoryLimit: () => 30,
        registerUniqueToCodexOnAcquire: () => {},
        passesItemPickupFilter: () => true
    };
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => {
        if (typeof context[key] === 'undefined') context[key] = map[key];
    });
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    vm.runInContext('function invalidateGrowthEffects() {}', context);
    const run = code => vm.runInContext(code, context);

    const makeDrop = id => ({ id, growthShapeId: 'dot1', growthCategory: 'flower', growthBaseId: 'gf_spark_seed', name: `드랍${id}`, rarity: 'normal', baseStats: [], stats: [] });

    // 해금 전에는 드랍 자체를 받지 않는다.
    context.game.season = 10;
    assert.strictEqual(run(`addDroppedGrowthItem(${JSON.stringify(makeDrop(100))})`), false, '루프 25 전에는 생장 드랍을 받으면 안 된다');
    assert.strictEqual(context.game.recentGrowthDrops.length, 0, '해금 전에는 최근 획득함이 비어 있어야 한다');

    // 해금 후에는 최근 획득함으로 들어간다.
    context.game.season = 25;
    run('syncGrowthBoardUnlocks({ silent: true })');
    assert.strictEqual(run(`addDroppedGrowthItem(${JSON.stringify(makeDrop(101))})`), true, '해금 후에는 생장 드랍을 받아야 한다');
    assert.strictEqual(context.game.recentGrowthDrops.length, 1, '드랍은 최근 획득함으로 들어가야 한다');
    assert.strictEqual(context.game.inventory.length, 1, '장비 인벤토리는 생장 드랍의 영향을 받지 않아야 한다');

    // 보관은 전용 보관함으로 (addItemToInventory를 호출하면 위 throw로 실패한다).
    assert.strictEqual(run('claimRecentGrowthDrop(101)'), true, '최근 획득함에서 생장 보관함으로 옮길 수 있어야 한다');
    assert.strictEqual(context.game.growthInventory.length, 1, '생장 보관함으로 들어가야 한다');
    assert.strictEqual(context.game.recentGrowthDrops.length, 0, '옮긴 뒤 최근 획득함에서 빠져야 한다');
    assert.strictEqual(context.game.inventory.length, 1, '장비 인벤토리 칸을 잠식하면 안 된다');

    // 전용 보관함 한도는 장비 한도와 별개다.
    assert.strictEqual(run('getGrowthInventoryLimit()'), 40, '생장 보관함 한도는 장비 한도와 별개여야 한다');

    // 배치된 아이템은 해체되지 않는다.
    run('placeGrowthItem(101, 5, 2, 0)');
    assert.strictEqual(run('salvageGrowthInventoryItem(101)'), false, '배치 중인 아이템은 해체를 거부해야 한다');
    assert.strictEqual(context.game.growthInventory.length, 1, '거부된 해체로 아이템이 사라지면 안 된다');

    // 내린 뒤에는 해체된다.
    run('removeGrowthPlacement(101)');
    assert.strictEqual(run('salvageGrowthInventoryItem(101)'), true, '배치를 내리면 해체할 수 있어야 한다');
    assert.strictEqual(context.game.growthInventory.length, 0, '해체된 아이템은 보관함에서 빠져야 한다');
}

// ── 생장 드랍은 장비용 필터/자동해체에 끌려가면 안 된다 ──────────────────
// 회귀: 루프 25에 판이 열리는 시점이면 장비 자동해체(기본 일반+매직)를 켜 둔
// 플레이어가 많다. 설정을 공유하면 생장 드랍이 전부 녹아 8칸도 못 채운다.
{
    const source = fs.readFileSync('js/growth-board.js', 'utf8');
    const state = fs.readFileSync('js/state.js', 'utf8');
    const intake = source.slice(source.indexOf('function addDroppedGrowthItem'), source.indexOf('function claimRecentGrowthDrop'));

    assert.ok(!/settings\.autoSalvageEnabled/.test(intake),
        '생장 드랍 진입점이 장비 자동해체 설정을 읽으면 안 된다');
    assert.ok(!/settings\.autoSalvageRarities/.test(intake),
        '생장 드랍 진입점이 장비 자동해체 등급을 읽으면 안 된다');
    assert.ok(/growthAutoSalvageEnabled/.test(intake) && /growthAutoSalvageRarities/.test(intake),
        '생장 전용 자동해체 설정을 써야 한다');
    assert.ok(/growthUseItemFilter/.test(intake),
        '장비 아이템 필터 적용은 생장 전용 옵션 뒤에 있어야 한다');

    // 기본값은 "전부 보관"이어야 한다.
    assert.ok(/growthAutoSalvageEnabled:\s*false/.test(state), '생장 자동해체 기본값은 꺼짐이어야 한다');
    assert.ok(/growthUseItemFilter:\s*false/.test(state), '장비 필터 적용 기본값은 꺼짐이어야 한다');
    const defaults = state.slice(state.indexOf('growthAutoSalvageRarities:'), state.indexOf('growthAutoSalvageRarities:') + 140);
    assert.ok(!/:\s*true/.test(defaults), '생장 자동해체 등급 기본값은 모두 꺼짐이어야 한다');
}

// ── 방치 중 최근 획득함이 넘칠 때 ────────────────────────────────────────
// 회귀 1: 보호 대상만 남으면 보관함 상한을 무시하고 밀어 넣어, 2000회 드랍이면
//         보관함이 40칸 제한을 넘어 376개까지 불어났다(상한·확장이 무의미해진다).
// 회귀 2: 희귀는 "이미 가진 베이스"라는 이유로 방치 중 조용히 녹았다.
//         자고 일어나면 쓸 만한 것이 하나도 남아 있지 않았다.
{
    const context = {
        console,
        window: {},
        game: {
            season: 30,
            inventory: [],
            growthInventory: [],
            recentGrowthDrops: [],
            growthBoard: null,
            noti: {},
            settings: { showLootLog: false, growthAutoSalvageEnabled: false, growthUseItemFilter: false }
        },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        registerUniqueToCodexOnAcquire: () => {},
        passesItemPickupFilter: () => true
    };
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => {
        if (typeof context[key] === 'undefined') context[key] = map[key];
    });
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    vm.runInContext('function invalidateGrowthEffects() {}', context);
    const run = code => vm.runInContext(code, context);
    run('syncGrowthBoardUnlocks({ silent: true })');

    const drop = (id, rarity, baseId, locked) => JSON.stringify({
        id, rarity, growthShapeId: 'dot1', growthCategory: 'flower',
        growthBaseId: baseId, name: `드랍${id}`, locked: !!locked, baseStats: [], stats: []
    });
    const limit = run('getGrowthInventoryLimit()');

    // 잠금 아이템만 2000번 쏟아부어도 보관함은 상한을 넘지 않는다.
    for (let i = 0; i < 2000; i++) run(`addDroppedGrowthItem(${drop(i, 'normal', 'gf_spark_seed', true)})`);
    assert.ok(context.game.growthInventory.length <= limit,
        `보관함이 상한(${limit})을 넘으면 안 된다 (현재 ${context.game.growthInventory.length})`);
    assert.ok(context.game.recentGrowthDrops.length <= 24, '최근 획득함도 상한을 지켜야 한다');
    // 더 들어올 곳이 없으면 새 드랍을 거절하되, 이미 잠근 것을 녹이지는 않는다.
    const lockedBefore = context.game.growthInventory.filter(row => row.locked).length
        + context.game.recentGrowthDrops.filter(row => row.locked).length;
    assert.strictEqual(run(`addDroppedGrowthItem(${drop(9999, 'normal', 'gf_spark_seed', true)})`), false,
        '둘 다 가득 차면 새 드랍을 거절해야 한다');
    assert.strictEqual(context.game.growthInventory.filter(row => row.locked).length
        + context.game.recentGrowthDrops.filter(row => row.locked).length, lockedBefore,
        '거절 과정에서 잠금 아이템이 사라지면 안 된다');

    // 희귀는 이미 가진 베이스여도 방치 중에 녹지 않는다.
    context.game.growthInventory = [];
    context.game.recentGrowthDrops = [];
    for (let i = 0; i < 600; i++) {
        run(`addDroppedGrowthItem(${drop(10000 + i, i % 5 === 0 ? 'rare' : 'normal', 'gf_spark_seed', false)})`);
    }
    const keptRare = context.game.recentGrowthDrops.filter(row => row.rarity === 'rare').length
        + context.game.growthInventory.filter(row => row.rarity === 'rare').length;
    const keptNormal = context.game.recentGrowthDrops.filter(row => row.rarity === 'normal').length
        + context.game.growthInventory.filter(row => row.rarity === 'normal').length;
    assert.ok(keptRare > 0, '방치 중에도 희귀 생장 아이템은 남아 있어야 한다');
    assert.ok(keptRare > keptNormal, `일반보다 희귀가 먼저 녹으면 안 된다 (희귀 ${keptRare} / 일반 ${keptNormal})`);
    assert.ok(context.game.growthInventory.length <= limit, '섞인 드랍에서도 보관함 상한을 지켜야 한다');
}

// ── 생장 보관함 확장 경로 ────────────────────────────────────────────────
// growthInventoryExpandLevel은 한도 계산에만 쓰이고 올릴 방법이 없어, 40칸이
// 사실상 고정 상한이었다(장비·주얼에는 황금률 확장이 있다).
{
    const utils = fs.readFileSync('js/utils.js', 'utf8');
    const items = fs.readFileSync('js/items.js', 'utf8');
    const html = fs.readFileSync('index.html', 'utf8');
    const ui = fs.readFileSync('js/ui.js', 'utf8');

    assert.ok(/function getGrowthMarketExpandCost\(/.test(utils), '생장 보관함 확장 비용 함수가 있어야 한다');
    const action = items.slice(items.indexOf('async function marketExpandGrowthInventoryByDivine'),
        items.indexOf('function getBaseDefenseProfile'));
    assert.ok(action.length > 0, '생장 보관함 확장 동작이 있어야 한다');
    assert.ok(/growthInventoryExpandLevel[^\n]*\+ 1/.test(action), '확장은 growthInventoryExpandLevel을 올려야 한다');
    assert.ok(/goldenRule -= cost/.test(action), '확장은 황금률을 소모해야 한다');
    assert.ok(/requestGameConfirmation/.test(action), '확장은 확인을 받아야 한다');
    assert.ok(/getGrowthMarketExpandCost\(\) !== cost/.test(action), '확인 도중 비용이 바뀌면 취소해야 한다');
    assert.ok(/isGrowthBoardUnlocked/.test(action), '생장판 해금 전에는 확장을 막아야 한다');

    assert.ok(/marketExpandGrowthInventoryByDivine\(\)/.test(html), '확장 버튼이 화면에 있어야 한다');
    assert.ok(/id="ui-market-service-growth-inv"/.test(html), '거래소에 생장 보관함 확장 항목이 있어야 한다');
    assert.ok(/btn-growth-inventory-expand/.test(ui), '보관함이 가득 찰 때 쓰는 단축 버튼을 갱신해야 한다');
    // 확장 레벨은 저장 왕복에서 살아남아야 한다(영구 확장이라고 안내한다).
    assert.ok(/merged\.growthInventoryExpandLevel\s*=/.test(ui), '확장 레벨은 저장 정규화 대상이어야 한다');
}

console.log('smoke-growth-coexistence passed');
