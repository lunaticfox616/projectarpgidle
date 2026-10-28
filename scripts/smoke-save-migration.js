// 저장 마이그레이션(mergeDefaults) 행동 검사.
//
// mergeDefaults는 모든 불러오기가 지나가는 단일 관문이다(로컬·클라우드·백그라운드
// 정산·새 게임). 그런데 지금까지는 소스 문자열 검사만 있었고 실제로 옛 저장을
// 넣어 보는 검사가 없었다. 예전 저장을 가진 사람이 돌아왔을 때 조용히 깨지는 것을
// 막으려면 실제 저장 모양을 넣어 봐야 한다.
//
// 게임 전체를 vm에 올리는 로더는 scripts/lib/game-runtime.js가 소유한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
assert.strictEqual(typeof ctx.mergeDefaults, 'function', 'mergeDefaults를 불러오지 못했다');

const merge = save => ctx.mergeDefaults(JSON.parse(JSON.stringify(save)));

// Sound level is a percentage of the previous mix, independent of the mute switch.
{
    assert.strictEqual(merge({settings: {uiSounds: false}}).settings.soundVolume, 100);
    for (const [input, expected] of [[0, 0], [35, 35], [-10, 0], [150, 100], ['bad', 100]]) {
        const loaded = merge({level: 12, settings: {uiSounds: false, soundVolume: input}});
        assert.strictEqual(loaded.settings.soundVolume, expected);
        assert.strictEqual(loaded.settings.uiSounds, false);
        assert.strictEqual(loaded.level, 12);
    }
}

// ── 새 게임 ──────────────────────────────────────────────────────────────
{
    const g = merge({});
    assert.strictEqual(g.season, 1, '빈 저장은 루프 1로 시작해야 한다');
    assert.ok(Array.isArray(g.inventory), '인벤토리는 배열이어야 한다');
    assert.ok(!('growthInventory' in g) && !('growthBoard' in g), '새 게임에는 생장판 필드가 없다');
    assert.ok(g.playerHp > 0, '체력은 양수여야 한다');
    assert.strictEqual(g.settings.pauseGameOnOverlay, true, '새 게임은 안내 창 전투 정지가 기본으로 켜져야 한다');
}

// ── 새 시스템 필드가 전혀 없는 옛 저장 ───────────────────────────────────
{
    const g = merge({
        level: 12, season: 3, playerHp: 100,
        inventory: [], equipment: {}, currencies: { goldenRule: 1 },
        unlocks: { items: true }, settings: {}
    });
    assert.strictEqual(g.season, 3, '진행도를 잃으면 안 된다');
    assert.strictEqual(g.settings.pauseGameOnOverlay, true, '설정값이 없던 옛 저장도 새 기본값을 받아야 한다');
}

// ── 사용자가 명시적으로 꺼 둔 창 일시 정지는 보존한다 ──────────────────
{
    const g = merge({ inventory: [], equipment: {}, currencies: {}, unlocks: {}, settings: { pauseGameOnOverlay: false } });
    assert.strictEqual(g.settings.pauseGameOnOverlay, false, '기존 사용자의 일시 정지 선택을 덮어쓰면 안 된다');
}

// ── 생장판 제거(2026-09-30): 판 · 보관함 · 확장 · 생장 정수 · 설정 · 해금 표시는 보상 없이 지운다 ─────
{
    const g = merge({
        level: 80, season: 40, loopCount: 40, playerHp: 500, maxZoneId: 40,
        inventory: [], equipment: {}, unlocks: { items: true, growthboard: true }, noti: { growthboard: true },
        currencies: { growthEssence: 120, goldenRule: 2 },
        settings: { growthSortMode: 'recent', growthAutoSalvageEnabled: true, growthAutoSalvageRarities: { normal: true },
            growthUseItemFilter: true, searchFilters: { equip: 'x', growth: '꽃' } },
        growthInventory: [
            { id: 11, growthCategory: 'flower', growthShapeId: 'L4', growthBaseId: 'gf_spark_seed', name: 'L4 꽃', rarity: 'rare', baseStats: [], stats: [] }
        ],
        recentGrowthDrops: [{ id: 12 }], growthInventoryExpandLevel: 3, growthEssenceExpandLevel: 2,
        growthBoard: { width: 10, height: 6, unlockedCellCount: 60, activeLoadout: 0, loadouts: [{ name: '옛 세팅', placements: { 11: { x: 0, y: 0 } } }] }
    });
    assert.strictEqual(g.season, 40, '루프를 잃으면 안 된다');
    assert.deepStrictEqual(['growthBoard', 'growthInventory', 'recentGrowthDrops', 'growthInventoryExpandLevel', 'growthEssenceExpandLevel']
        .filter(key => key in g), [], '예전 생장판 진행은 보상 없이 지워야 한다');
    assert.ok(!('growthEssence' in g.currencies) && g.currencies.goldenRule === 2, '생장 정수만 지우고 다른 재화는 남긴다');
    assert.ok(!('growthboard' in g.unlocks) && !('growthboard' in g.noti), '해금 · 알림 표시도 지운다');
    assert.deepStrictEqual(['growthSortMode', 'growthAutoSalvageEnabled', 'growthAutoSalvageRarities', 'growthUseItemFilter']
        .filter(key => key in g.settings), [], '생장판 설정을 지운다');
    assert.ok(!('growth' in g.settings.searchFilters) && g.settings.searchFilters.equip === 'x', '생장 검색어만 지운다');
    const plain = value => JSON.parse(JSON.stringify(value));
    const again = merge(plain(g));
    assert.deepStrictEqual([again.currencies.goldenRule, 'growthBoard' in again], [2, false], '두 번 불러와도 같다');
}

// ── 예전 코어 큐브 · 망가진 코어 저장(2026-10-10부터 끼운 코어는 장비 칸 '코어', 보관한 코어는 가방) ──────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: { cube: true }, noti: { cube: true }, settings: {},
        coreCube: { unlocked: true, everUnlocked: true, faces: [1, 2, 3, 4, 5, 6], blurred45: 9 },
        cores: { equipped: { id: 5, lines: [{ id: 'pct_dmg', value: 999 }, { id: 'nope', value: 1 }] }, owned: 'bad' }
    });
    assert.ok(!('coreCube' in g) && !('cube' in g.unlocks) && !('cube' in g.noti), '예전 큐브 진행은 보상 없이 지워야 한다');
    const plain = value => JSON.parse(JSON.stringify(value));
    assert.deepStrictEqual(plain(g.cores), { equipped: null, owned: [] }, '예전 코어 보관함은 비운다');
    assert.deepStrictEqual(plain(g.equipment['코어'].lines), [{ id: 'pct_dmg', value: 24 }], '끼운 코어는 코어 칸으로, 모르는 줄은 버리고 값은 범위 안으로');
    assert.deepStrictEqual(plain(merge(plain(g)).equipment['코어']), plain(g.equipment['코어']), '다시 불러와도 같은 결과여야 한다');
}

// ── 비정상적으로 큰/음수인 확장 레벨 ─────────────────────────────────────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        inventoryExpandLevel: Infinity, jewelInventoryExpandLevel: -5
    });
    [['jewelInventoryExpandLevel', g.jewelInventoryExpandLevel]].forEach(([name, value]) => {
        assert.ok(Number.isFinite(value) && value >= 0, `${name}은 0 이상의 유한한 수여야 한다 (${value})`);
    });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(g, 'inventoryExpandLevel'), false,
        'legacy purchased equipment expansion state must be removed during migration');
}

// ── 예전 주얼 보관함은 가방으로, 한도를 넘긴 것까지 잘리지 않는다 ─────────────
// 전투 드랍이 유실 방지로 한도를 넘겨 보관한 희귀·고유 주얼이 조용히 사라지던 회귀. 2026-10-10부터는 가방(넘치면 임시 보관)으로 옮기고
// 보관함 확장에 쓴 황금률(1, 2, 3, ...)은 돌려준다.
{
    const jewel = () => ({ id: 0, name: '주얼', rarity: 'rare', stats: [{ id: 'allRes', val: 5, tier: 3 }] });
    const many = Array.from({ length: 43 }, (_, i) => Object.assign(jewel(), { id: 800000 + i }));
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: { goldenRule: 1 }, unlocks: {}, settings: {}, jewelInventory: many, jewelInventoryExpandLevel: 3
    });
    const plain = value => JSON.parse(JSON.stringify(value));
    const moved = [...g.inventory, ...g.equipmentTemporaryStorage].filter(item => item.slot === '주얼');
    assert.strictEqual(moved.length, many.length, `예전 주얼은 모두 가방으로 옮겨야 한다 (${many.length}개 → ${moved.length}개)`);
    assert.deepStrictEqual([g.jewelInventory.length, g.jewelInventoryExpandLevel, g.currencies.goldenRule], [0, 0, 7], '보관함을 비우고 확장 황금률을 돌려준다');
    const again = merge(plain(g));
    assert.deepStrictEqual([[...again.inventory, ...again.equipmentTemporaryStorage].filter(item => item.slot === '주얼').length, again.currencies.goldenRule],
        [many.length, 7], '두 번 불러와도 같다');
    assert.deepStrictEqual(plain(again.inventory.find(item => item.id === 800000).stats).map(stat => [stat.id, stat.val]), [['allRes', 5]], '주얼 줄은 그대로');
}

// A legacy/incomplete in-combat save can omit both enemy health fields.
// Never revive it as a NaN enemy because that stalls combat progression.
{
    const g = merge({
        level: 20, season: 2, playerHp: 200, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        enemies: [{ id: 77, name: 'save-boundary-enemy', isElite: true }]
    });
    assert.strictEqual(g.enemies.length, 1, 'a missing health field must not discard the enemy record');
    assert.strictEqual(g.enemies[0].hp, 1, 'missing hp must recover to a positive value');
    assert.strictEqual(g.enemies[0].maxHp, 1, 'missing maxHp must recover to a positive value');
    assert.strictEqual(g.enemies[0].name, 'save-boundary-enemy', 'unrelated enemy data must survive recovery');
    assert.strictEqual(g.enemies[0].isElite, true, 'unrelated enemy state must survive recovery');
}

// ── 구 패시브 트리에서 이미 성좌 각성을 마친 저장 ────────────────────────
{
    const g = merge({
        passiveStarEvolution: true, journalEntries: [],
        inventory: [], equipment: {}, currencies: {}, unlocks: {}, settings: {}
    });
    assert.strictEqual(g.passiveStarEvolution, true, '기존 성좌 각성은 새 트리에서도 영구 유지되어야 한다');
    assert.strictEqual(g.passiveStarEvolutionSource, 'legacy_migrated', '출처가 없는 옛 각성은 명시적인 이관 상태로 기록해야 한다');
    assert.ok(g.journalEntries.includes('passive_star_evolution'), '옛 각성 저장은 영구 보너스 저널을 복구해야 한다');
}

// ── 외부 레퍼런스 식별자가 남아 있던 v22 패시브 저장 ────────────────────
{
    const g = merge({
        saveVersion: vm.runInContext('defaultGame.saveVersion', ctx), passiveLayoutVersion: 22,
        selectedClassId: 'warrior', inventory: [], equipment: {}, currencies: {}, unlocks: {},
        passives: ['n7xf9g8ilhr', 'nzv2zn1wqtc', 'old2_22290'],
        discoveredPassives: ['old2_22290', 'old2_26725'],
        voidPassives: { old2_26725: { stats: [{ id: 'flatHp', val: 12 }] } },
        retiredVoidPassives: { old2_26196: { stats: [{ id: 'resAll', val: 3 }] } },
        settings: { passiveTreePlanner: { layoutVersion: 22, activeSlot: 0, presets: [
            { name: '옛 ID', nodeIds: ['old2_22290', 'old2_1207'], attributeChoices: {} }
        ] } }
    });
    assert.ok(g.passives.includes('pt_spine_warrior_left_01'), '기존 투자 노드를 새 식별자로 복구해야 한다');
    assert.ok(!g.passives.includes('old2_22290'), '구 식별자가 현재 투자 목록에 남으면 안 된다');
    assert.ok(g.discoveredPassives.includes('pt_void_south'), '발견한 공허 노드도 새 식별자로 복구해야 한다');
    assert.strictEqual(g.voidPassives.pt_void_south.stats[0].val, 12, '공허 패시브 옵션을 보존해야 한다');
    assert.ok(g.retiredVoidPassives.pt_void_southeast, '보관된 공허 패시브도 새 식별자로 복구해야 한다');
    assert.deepStrictEqual(Array.from(g.settings.passiveTreePlanner.presets[0].nodeIds),
        ['pt_spine_warrior_left_01', 'pt_base_path_001'], '패시브 프리셋 순서와 노드를 보존해야 한다');
}

// ── 계시 UI는 실제 할당된 헌신을 잠금 조건으로 사용한다 ──────────────────
{
    const g = merge({ inventory: [], equipment: {}, currencies: {}, unlocks: {}, settings: {} });
    ctx.__loadedRevelationGame = g;
    const lockedHtml = vm.runInContext('game = __loadedRevelationGame; renderPassiveSpecializationControls();', ctx);
    assert.strictEqual(lockedHtml, '', '헌신과 관련 키스톤이 없는 저장에는 미사용 계시 조작을 표시하지 않는다');
    const devotionId = vm.runInContext(`Object.values(PASSIVE_TREE.nodes)
        .find(node => (node.effects || []).some(effect => effect.stat === 'devotion')).id`, ctx);
    g.passives = [devotionId];
    const unlockedHtml = vm.runInContext('renderPassiveSpecializationControls();', ctx);
    assert.ok(unlockedHtml.includes('<select'), '헌신을 투자한 저장에는 계시 선택이 제공되어야 한다');
    assert.ok(!/<select[^>]*disabled/.test(unlockedHtml), '헌신이 1 이상이면 계시 선택 상자를 활성화해야 한다');
}

// ── 10재능 캐릭터 선택을 사용하던 저장 ─────────────────────────────────
{
    const g = merge({
        selectedHeroId: 'hero8', appearanceHeroId: 'hero4',
        discoveredHeroIds: ['hero1', 'hero4', 'hero8'], heroSelectionInitialized: true,
        inventory: [], equipment: {}, currencies: {}, unlocks: {},
        settings: { heroAppearanceMode: 'fixed' }
    });
    assert.strictEqual(g.selectedClassId, 'cleric', '옛 가디언 선택은 성직자로 이관되어야 한다');
    assert.strictEqual(g.appearanceClassId, 'wanderer', '고정 외형은 실제 직업과 별도로 이관되어야 한다');
    assert.deepStrictEqual(Array.from(g.discoveredClassIds), ['archer', 'wanderer', 'cleric'],
        '경험한 옛 캐릭터는 중복 없이 새 직업 경험으로 변환되어야 한다');
    assert.strictEqual(g.selectedHeroId, 'hero5', '옛 저장의 재능은 이관된 성직자 시작 보상과 한 번 맞춰야 한다');
    assert.strictEqual(g.classTalentAlignmentVersion, 1, '직업·재능 정합성 이관은 한 번만 실행되어야 한다');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(g, 'appearanceHeroId'), false,
        '옛 외형 필드는 저장 상태의 두 번째 출처로 남으면 안 된다');
}

// 별쐐기 제거(2026-10-01): 예전 외곽 성률 옵션 노드는 트리에서 사라졌다. 투자해 둔 포인트는 정확히 한 점씩 돌려주고,
// 별쐐기 · 장착 기록은 보상 없이 지운다.
{
    const g = merge({
        saveVersion: vm.runInContext('defaultGame.saveVersion', ctx), passiveLayoutVersion: 22,
        selectedClassId: 'warrior', inventory: [], equipment: {}, currencies: {}, unlocks: {},
        passives: ['star_constellation_nh9myirl4b7_0'], passivePoints: 0,
        starWedge: {
            wedges: [{ id: 7001, lines: [{ stat: 'move', val: 7 }] }],
            sockets: [{ nodeId: 'nh9myirl4b7', wedgeId: 7001 }]
        }
    });
    assert.deepStrictEqual(Array.from(g.passives), [], '사라진 성률 옵션 투자는 남지 않는다');
    assert.strictEqual(g.autoRefundedPassivePoints, 1, '사라진 성률 옵션은 정확히 한 포인트 환불해야 한다');
    assert.strictEqual(g.passivePoints, 1);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(g, 'starWedge'), false, '별쐐기 저장은 남지 않는다');
}

// ── 손상된 저장은 조용히 넘어가지 않고 던진다 ────────────────────────────
// js/save.js가 이 예외를 받아 손상본을 백업하고 자동 저장을 멈춘다.
// 여기서 조용히 빈 배열로 고쳐 버리면 플레이어 아이템이 말없이 사라진다.
{
    assert.throws(() => merge({
        level: 'abc', season: null, playerHp: NaN,
        inventory: 'not-an-array', equipment: null, currencies: [], unlocks: 42, settings: 'x'
    }), '타입이 망가진 저장은 예외로 알려야 한다(손상 저장 처리 경로가 받는다)');
}

// A temporary storage write failure can be retried by the player, without bypassing
// corruption, unread saves, or an unfinished background settlement.
{
    const runtime = buildGameRuntime(), storage = new Map();
    const key = vm.runInContext('LOCAL_SAVE_KEY', runtime);
    let full = false, unreadable = false;
    runtime.localStorage = {
        getItem: key => { if (unreadable) throw new Error('storage denied'); return storage.get(key) || null; },
        setItem: (key, value) => { if (full) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); storage.set(key, value); },
        removeItem: key => storage.delete(key)
    };
    runtime.loadGame();
    vm.runInContext('game.level = 12;', runtime);
    assert.strictEqual(runtime.saveGame({ skipCloudSync: true }), true);
    const before = storage.get(key);
    vm.runInContext('game.level = 13;', runtime);
    full = true;
    assert.strictEqual(runtime.saveGame({ skipCloudSync: true }), false);
    assert.strictEqual(storage.get(key), before, 'failed write must keep the last save');
    full = false;
    assert.strictEqual(runtime.saveGame({ skipCloudSync: true }), false, 'auto save must not loop through recovery writes');
    for (const field of ['processing', 'failed']) {
        vm.runInContext(`backgroundCombatRuntime.${field} = true;`, runtime);
        assert.strictEqual(runtime.saveGame({ manual: true, skipCloudSync: true }), false, 'manual retry must respect settlement protection');
        assert.strictEqual(storage.get(key), before);
        vm.runInContext(`backgroundCombatRuntime.${field} = false;`, runtime);
    }
    assert.strictEqual(runtime.saveGame({ manual: true, skipCloudSync: true }), true, 'manual save must retry a resolved write failure');
    assert.strictEqual(runtime.getLocalSaveStatus().writable, true);
    assert.strictEqual(JSON.parse(storage.get(key)).level, 13, 'recovery must save the live game, not reload old progress');
    vm.runInContext('game.level = 14;', runtime);
    assert.strictEqual(runtime.saveGame({ skipCloudSync: true }), true, 'auto save must resume after successful recovery');
    assert.strictEqual(JSON.parse(storage.get(key)).level, 14);

    storage.set(key, '{invalid save');
    runtime.loadGame();
    assert.strictEqual(runtime.getLocalSaveStatus().status, 'corrupt');
    assert.strictEqual(storage.get(runtime.getLocalSaveStatus().backupKey), '{invalid save', 'corrupt data must have a recoverable copy');
    assert.strictEqual(runtime.saveGame({ manual: true, skipCloudSync: true }), false, 'manual retry must never overwrite a corrupt save with defaults');
    assert.strictEqual(storage.get(key), '{invalid save');
    unreadable = true;
    runtime.loadGame();
    assert.strictEqual(runtime.getLocalSaveStatus().status, 'unavailable');
    assert.strictEqual(runtime.saveGame({ manual: true, skipCloudSync: true }), false, 'an unread save must remain protected');
    assert.strictEqual(storage.get(key), '{invalid save');
}

// Release stamp (2026-10-28): a release names itself in every save it writes and never loads or writes over a later release's
// save, from this device or the server; its own and earlier releases' saves load and take its stamp.
{
    const build = '2026-10-28T00:00:00.000Z', later = '2026-10-29T00:00:00.000Z';
    const runtime = buildGameRuntime({}, null, { querySelector: selector => (selector === 'meta[name="game-build"]' ? { content: build } : null) });
    const storage = new Map(), key = vm.runInContext('LOCAL_SAVE_KEY', runtime);
    runtime.localStorage = { getItem: name => storage.get(name) || null, setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) };
    const stored = () => JSON.parse(storage.get(key));
    for (const gameBuild of [undefined, '2026-10-27T00:00:00.000Z', build]) {
        storage.set(key, JSON.stringify({ level: 21, saveMeta: { lastModifiedAt: 5, gameBuild } }));
        assert.strictEqual(runtime.loadGame().status, 'ok');
        assert.strictEqual(runtime.saveGame({ skipCloudSync: true }), true);
        assert.deepStrictEqual([stored().level, stored().saveMeta.gameBuild], [21, build], 'an earlier save loads and takes this release');
    }
    const laterSave = JSON.stringify({ level: 40, saveMeta: { lastModifiedAt: 5, gameBuild: later } });
    storage.set(key, laterSave);
    const status = runtime.loadGame();
    assert.deepStrictEqual([status.status, status.writable, vm.runInContext('game.level', runtime)], ['newer-build', false, 1]);
    assert.match(status.message, /더 새 버전의 게임/);
    assert.strictEqual(runtime.saveGame({ manual: true, skipCloudSync: true }), false, 'a later release save is never written over');
    assert.strictEqual(runtime.canPersistLocalSave({ allowRecoveryWrite: true }), false, 'not even by a server copy repairing it');
    assert.throws(() => runtime.applyExternalSave({ level: 9, saveMeta: { gameBuild: build } }), error => error.code === 'GAME_BUILD_OUTDATED');
    assert.strictEqual(storage.get(key), laterSave);

    storage.set(key, JSON.stringify({ level: 21, saveMeta: {} }));
    runtime.loadGame();
    assert.throws(() => runtime.applyExternalSave({ level: 40, saveMeta: { gameBuild: later } }), error => error.code === 'GAME_BUILD_OUTDATED');
    assert.strictEqual(vm.runInContext('game.level', runtime), 21, 'a refused server save leaves the game as it was');
    // An unbuilt page (development server, this runtime) stamps nothing and refuses nothing.
    assert.strictEqual(ctx.outdatedBuildError({ saveMeta: { gameBuild: later } }), null);
}

// An explicit account reset marker survives reloads; old/invalid metadata cannot become a reset.
for (const value of [undefined, null, -1, 1.5, 'bad', Infinity, 0, 8]) {
    ctx.__loaded = merge({ saveMeta: { cloudResetRevision: value } });
    vm.runInContext('game = __loaded; ensureSaveMeta();', ctx);
    assert.strictEqual(ctx.__loaded.saveMeta.cloudResetRevision, value === 8 ? 8 : 0);
}

// 없어진 지역(예전 세계수 지역)에서 저장했으면 액트 1이 아니라 도달한 진행 지역에서 이어 한다(PR #1030 리뷰).
{
    const merged = ctx.mergeDefaults({ heroSelectionInitialized: true, season: 12, maxZoneId: 29, currentZoneId: 'worldtree_root' });
    assert.strictEqual(merged.currentZoneId, ctx.getAutoProgressZoneId(29), 'a save in a removed zone resumes at the furthest progress zone');
    assert.notStrictEqual(merged.currentZoneId, 0);
}

// Arm guards keep the old slot/ownership; new greatsword block is a one-time addition, not a repeatable crafted-line reset.
{
    const stat = (id, val) => ({ id, val, valMin: val, valMax: val });
    const g = merge({ inventory: [{ id: 8001, slot: '무기', baseId: 'dull_greatsword', baseName: '무딘 대검',
        rarity: 'normal', baseStats: [stat('resF', 17)], stats: [] }], equipment: {
        방패: { id: 8002, slot: '방패', baseName: '고철 버클러', name: '불굴의 고철 버클러', rarity: 'rare',
            baseStats: [stat('armor', 52), stat('baseBlockChance', 6), stat('resC', 11)], stats: [],
            corruptionSocket: { jewel: { id: 8003, stats: [] } } }
    } });
    assert.strictEqual(g.equipment['방패'].id, 8002, 'the old shield remains equipped in the same slot');
    assert.strictEqual(g.equipment['방패'].baseId, 'buckler_scrap', 'legacy base-name-only items regain their authored identity');
    assert.strictEqual(g.equipment['방패'].corruptionSocket.jewel.id, 8003, 'conversion never drops a socketed jewel');
    assert.deepStrictEqual(Array.from(g.equipment['방패'].baseStats, row => [row.id, row.val]), [['armor', 52], ['resC', 11]],
        'only retired innate block disappears; rolled armor and converted implicits stay');
    assert.strictEqual(g.inventory[0].baseStats.filter(row => row.id === 'baseBlockChance').length, 1);
    assert.strictEqual(g.inventory[0].baseStats.find(row => row.id === 'baseBlockChance').val, 5);
    const again = merge(g);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(again.inventory[0].baseStats)), JSON.parse(JSON.stringify(g.inventory[0].baseStats)));
    again.inventory[0].baseStats = again.inventory[0].baseStats.filter(row => row.id !== 'baseBlockChance');
    assert.strictEqual(merge(again).inventory[0].baseStats.some(row => row.id === 'baseBlockChance'), false,
        'a later craft removing the new innate block survives reload');
}

// A build preset stores choices, not a second copy of progression. Failed swaps cannot move any owned items.
{
    const run = code => vm.runInContext(code, ctx);
    const plain = code => JSON.parse(run(`JSON.stringify(${code})`));
    run(`game=cloneDefaultGame();window.game=game;game.level=100;game.resonancePower=50;
        game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='dull_greatsword'),'normal',1);
        game.supports=['가속'];game.equippedSupports=['가속'];
        game.supportGemData={'가속':{level:11,exp:321,unlockedTier:3,activeTier:2}};
        equipmentLoadoutRuntime.save(0,'통합 세팅');
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
    assert.strictEqual(run('game.equipmentLoadouts.presets[0].runeLoadout.supportTiers["가속"]'), 2);
    run('game.supportGemData["가속"].activeTier=1');
    assert.strictEqual(run('equipmentLoadoutRuntime.apply(0).ok'), true);
    assert.strictEqual(run('game.supportGemData["가속"].activeTier'), 2);
    assert.strictEqual(run('game.supportGemData["가속"].exp'), 321, 'restoring choices retains current gem experience');
    run(`game.inventory.push(game.equipment['무기']);
        game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='rusted_blade'),'normal',1);
        game.supports=[];game.equippedSupports=[];`);
    const before = plain('({equipment:game.equipment,inventory:game.inventory,supportGemData:game.supportGemData})');
    assert.strictEqual(run('equipmentLoadoutRuntime.apply(0).ok'), false, 'an unavailable saved rune rejects the entire build');
    assert.deepStrictEqual(plain('({equipment:game.equipment,inventory:game.inventory,supportGemData:game.supportGemData})'), before);
    run(`delete game.equipmentLoadouts.presets[0].runeLoadout;
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
    assert.strictEqual(run('game.equipmentLoadouts.presets[0].runeLoadout'), null, 'old equipment presets remain equipment-only');
    assert.strictEqual(run('equipmentLoadoutRuntime.apply(0).ok'), true);
    assert.deepStrictEqual(plain('game.equippedSupports'), [], 'old presets do not restore discarded rune selections');
    run(`game.equipmentLoadouts.presets[0].runeLoadout={version:99};
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
    assert.strictEqual(run('equipmentLoadoutRuntime.apply(0).ok'), false, 'damaged new presets cannot downgrade to equipment-only');
}

console.log('smoke-save-migration passed');
