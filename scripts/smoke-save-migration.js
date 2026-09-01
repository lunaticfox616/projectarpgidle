// 저장 마이그레이션(mergeDefaults) 행동 검사.
//
// mergeDefaults는 모든 불러오기가 지나가는 단일 관문이다(로컬·클라우드·백그라운드
// 정산·새 게임). 그런데 지금까지는 소스 문자열 검사만 있었고 실제로 옛 저장을
// 넣어 보는 검사가 없었다. 예전 저장을 가진 사람이 돌아왔을 때 조용히 깨지는 것을
// 막으려면 실제 저장 모양을 넣어 봐야 한다.
//
// 게임 전체를 vm에 올리는 로더는 scripts/lib/game-runtime.js가 소유한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
assert.strictEqual(typeof ctx.mergeDefaults, 'function', 'mergeDefaults를 불러오지 못했다');

const merge = save => ctx.mergeDefaults(JSON.parse(JSON.stringify(save)));

// ── 새 게임 ──────────────────────────────────────────────────────────────
{
    const g = merge({});
    assert.strictEqual(g.season, 1, '빈 저장은 루프 1로 시작해야 한다');
    assert.ok(Array.isArray(g.inventory), '인벤토리는 배열이어야 한다');
    assert.ok(Array.isArray(g.growthInventory), '생장 보관함도 준비되어야 한다');
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
    assert.ok(Array.isArray(g.growthInventory), '없던 생장 필드를 만들어 줘야 한다');
    assert.ok(Array.isArray(g.recentGrowthDrops), '최근 획득함도 만들어 줘야 한다');
    assert.strictEqual(typeof g.growthInventoryExpandLevel, 'number', '확장 레벨이 숫자여야 한다');
    assert.strictEqual(g.settings.pauseGameOnOverlay, true, '설정값이 없던 옛 저장도 새 기본값을 받아야 한다');
}

// ── 사용자가 명시적으로 꺼 둔 창 일시 정지는 보존한다 ──────────────────
{
    const g = merge({ inventory: [], equipment: {}, currencies: {}, unlocks: {}, settings: { pauseGameOnOverlay: false } });
    assert.strictEqual(g.settings.pauseGameOnOverlay, false, '기존 사용자의 일시 정지 선택을 덮어쓰면 안 된다');
}

// ── 생장판 추가 전에 저장한 루프 40 세이브 ───────────────────────────────
{
    const g = merge({
        level: 80, season: 40, loopCount: 40, playerHp: 500, maxZoneId: 40,
        inventory: [], equipment: {}, currencies: {}, unlocks: { items: true }, settings: {}
    });
    assert.strictEqual(g.season, 40, '루프를 잃으면 안 된다');
    assert.strictEqual(g.growthInventory.length, 0, '없던 생장 아이템이 생기면 안 된다');
}

// ── 폴리오미노 시절(10x6) 판 저장 ────────────────────────────────────────
// 이 브랜치가 판을 8x4로 줄이고 아이템을 전부 1칸으로 바꿨다.
{
    const g = merge({
        level: 80, season: 40, loopCount: 40, playerHp: 500, maxZoneId: 40,
        inventory: [], equipment: {}, currencies: {}, unlocks: { items: true }, settings: {},
        growthInventory: [
            { id: 11, growthCategory: 'flower', growthShapeId: 'L4', growthBaseId: 'gf_spark_seed', name: 'L4 꽃', rarity: 'rare', baseStats: [], stats: [] },
            { id: 12, growthCategory: 'branch', growthShapeId: 'T4', growthBaseId: 'gb_iron_stump', name: 'T4 가지', rarity: 'rare', baseStats: [], stats: [] }
        ],
        growthBoard: {
            width: 10, height: 6, unlockedCellCount: 60, activeLoadout: 0,
            loadouts: [{ name: '옛 세팅', placements: { 11: { x: 0, y: 0, rotation: 0 }, 12: { x: 9, y: 5, rotation: 1 } } }]
        }
    });
    assert.strictEqual(g.growthInventory.length, 2, '옛 생장 아이템을 잃으면 안 된다');
    // 판 크기 정규화는 mergeDefaults가 아니라 첫 접근 시점의 ensureGrowthBoardState가 한다.
    // 게임도 그 순서로 지나가므로 여기서도 같은 순서로 확인한다.
    // game은 js/utils.js의 최상위 let이라 컨텍스트 속성 대입으로는 바뀌지 않는다.
    // vm 안에서 대입해야 실제 바인딩이 바뀐다.
    ctx.__loaded = g;
    vm.runInContext('game = __loaded; ensureGrowthBoardState(); validateGrowthPlacements();', ctx);
    assert.strictEqual(g.growthBoard.width, ctx.GROWTH_BOARD_W, '판 폭을 현재 값으로 맞춰야 한다');
    assert.strictEqual(g.growthBoard.height, ctx.GROWTH_BOARD_H, '판 높이를 현재 값으로 맞춰야 한다');
    assert.ok(g.growthBoard.unlockedCellCount <= ctx.GROWTH_BOARD_W * ctx.GROWTH_BOARD_H,
        '옛 60칸 해금이 현재 최대 칸수를 넘으면 안 된다');
    // 판 밖(9,5)을 가리키던 배치는 검증 경로가 정리하고, 아이템은 보관함에 남는다.
    const placedIds = Array.from(vm.runInContext('getPlacedGrowthEntries().map(e => e.item.id)', ctx));
    assert.ok(!placedIds.includes(12), '새 판 밖을 가리키는 배치는 정리되어야 한다');
    assert.strictEqual(g.growthInventory.length, 2, '배치가 정리되어도 아이템은 남아야 한다');
}

// ── 큐브 프리셋이 망가진 저장 ────────────────────────────────────────────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        coreCube: { unlocked: true, everUnlocked: true, faces: 'xxx', powers: null,
                    presets: 'bad', powersUsedEver: 5, presetSlot2Unlocked: 'yes', revealedOptions: 3 }
    });
    assert.ok(g.coreCube && typeof g.coreCube === 'object', '큐브 상태가 객체여야 한다');
    assert.ok(Array.isArray(g.coreCube.faces), '망가진 faces를 배열로 되돌려야 한다');
    assert.ok(Array.isArray(g.coreCube.presets), '망가진 presets를 배열로 되돌려야 한다');
}

// ── 비정상적으로 큰/음수인 확장 레벨 ─────────────────────────────────────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        growthInventoryExpandLevel: 1e9, inventoryExpandLevel: Infinity, jewelInventoryExpandLevel: -5
    });
    [['growthInventoryExpandLevel', g.growthInventoryExpandLevel],
     ['jewelInventoryExpandLevel', g.jewelInventoryExpandLevel]].forEach(([name, value]) => {
        assert.ok(Number.isFinite(value) && value >= 0, `${name}은 0 이상의 유한한 수여야 한다 (${value})`);
    });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(g, 'inventoryExpandLevel'), false,
        'legacy purchased equipment expansion state must be removed during migration');
}

// ── 보관 초과분은 불러오기에서 잘리지 않는다 ─────────────────────────────
// 전투 드랍이 유실 방지로 한도를 넘겨 보관한 희귀·고유 주얼이 조용히 사라지던 회귀.
{
    const jewel = () => ({ id: 0, name: '주얼', rarity: 'rare', stats: [{ id: 'allRes', val: 5, tier: 3 }] });
    const limit = 40;
    const many = Array.from({ length: limit + 3 }, (_, i) => Object.assign(jewel(), { id: 800000 + i }));
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {}, jewelInventory: many
    });
    assert.ok(g.jewelInventory.length > limit,
        `한도를 넘긴 주얼을 불러오기에서 자르면 안 된다 (${many.length}개 → ${g.jewelInventory.length}개)`);
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
        passives: ['n7xf9g8ilhr', 'nzv2zn1wqtc', 'poe2_22290'],
        discoveredPassives: ['poe2_22290', 'poe2_26725'],
        voidPassives: { poe2_26725: { stats: [{ id: 'flatHp', val: 12 }] } },
        retiredVoidPassives: { poe2_26196: { stats: [{ id: 'resAll', val: 3 }] } },
        starWedge: { nodeMutations: { poe2_1207: { currentStat: 'flatHp', currentVal: 5 } } },
        settings: { passiveTreePlanner: { layoutVersion: 22, activeSlot: 0, presets: [
            { name: '옛 ID', nodeIds: ['poe2_22290', 'poe2_1207'], attributeChoices: {} }
        ] } }
    });
    assert.ok(g.passives.includes('pt_spine_warrior_left_01'), '기존 투자 노드를 새 식별자로 복구해야 한다');
    assert.ok(!g.passives.includes('poe2_22290'), '구 식별자가 현재 투자 목록에 남으면 안 된다');
    assert.ok(g.discoveredPassives.includes('pt_void_south'), '발견한 공허 노드도 새 식별자로 복구해야 한다');
    assert.strictEqual(g.voidPassives.pt_void_south.stats[0].val, 12, '공허 패시브 옵션을 보존해야 한다');
    assert.ok(g.retiredVoidPassives.pt_void_southeast, '보관된 공허 패시브도 새 식별자로 복구해야 한다');
    assert.ok(g.starWedge.nodeMutations.pt_base_path_001, '성률의 노드 참조도 새 식별자로 복구해야 한다');
    assert.deepStrictEqual(Array.from(g.settings.passiveTreePlanner.presets[0].nodeIds),
        ['pt_spine_warrior_left_01', 'pt_base_path_001'], '패시브 프리셋 순서와 노드를 보존해야 한다');
}

// ── 계시 UI는 실제 할당된 헌신을 잠금 조건으로 사용한다 ──────────────────
{
    const g = merge({ inventory: [], equipment: {}, currencies: {}, unlocks: {}, settings: {} });
    ctx.__loadedRevelationGame = g;
    const lockedHtml = vm.runInContext('game = __loadedRevelationGame; renderPassiveSpecializationControls();', ctx);
    assert.ok(/<select[^>]*disabled/.test(lockedHtml), '헌신이 0이면 계시 선택 상자를 비활성화해야 한다');
    assert.ok(lockedHtml.includes('헌신 1 이상부터 계시 선택 가능'), '계시 잠금 이유를 화면에 표시해야 한다');
    const devotionId = vm.runInContext(`Object.values(PASSIVE_TREE.nodes)
        .find(node => (node.effects || []).some(effect => effect.stat === 'devotion')).id`, ctx);
    g.passives = [devotionId];
    const unlockedHtml = vm.runInContext('renderPassiveSpecializationControls();', ctx);
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

// 별쐐기 보관함도 장착 슬롯 한도와 무관하게 전부 복원한다.
{
    const manyWedges = Array.from({ length: 70 }, (_, index) => ({
        id: 900000 + index,
        name: `wedge-${index}`,
        lines: []
    }));
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        starWedge: { wedges: manyWedges }
    });
    assert.strictEqual(g.starWedge.wedges.length, manyWedges.length,
        '장착 한도를 넘긴 보유 별쐐기도 불러오기에서 모두 보존해야 한다');
}

// 외곽 성률 옵션은 트리 본체의 경로와 무관하게 1포인트로 사는 독립 노드다.
// 장착한 별쐐기의 활성 옵션을 재접속 때 연결 끊김으로 오판해 환불하면 안 된다.
{
    const outerHub = Object.values(ctx.PASSIVE_TREE.nodes).find(node => node.starWedgeMode === 'constellation');
    const option = Object.values(ctx.PASSIVE_TREE.nodes).find(node => node.kind === 'star_option'
        && node.requiresStarWedgeSocketNodeId === outerHub.id && node.starWedgeLineIndex === 0);
    const baseSave = {
        saveVersion: vm.runInContext('defaultGame.saveVersion', ctx), passiveLayoutVersion: 22,
        selectedClassId: 'warrior', inventory: [], equipment: {}, currencies: {}, unlocks: {},
        passives: [option.id], passivePoints: 0,
        starWedge: {
            wedges: [{ id: 7001, lines: [{ stat: 'move', val: 7 }] }],
            sockets: [{ nodeId: outerHub.id, wedgeId: 7001 }]
        }
    };
    const active = merge(baseSave);
    assert.ok(active.passives.includes(option.id), '장착 중인 외곽 성률 옵션 투자를 보존해야 한다');
    assert.strictEqual(active.autoRefundedPassivePoints, 0, '활성 성률 옵션을 자동 환불하면 안 된다');
    const inactive = merge({ ...baseSave, starWedge: { wedges: baseSave.starWedge.wedges, sockets: [] } });
    assert.ok(!inactive.passives.includes(option.id), '소켓이 비어 사라진 성률 옵션은 제거해야 한다');
    assert.strictEqual(inactive.autoRefundedPassivePoints, 1, '사라진 성률 옵션은 정확히 한 포인트 환불해야 한다');
}

// ── 손상된 저장은 조용히 넘어가지 않고 던진다 ────────────────────────────
// js/save.js가 이 예외를 받아 손상본을 백업하고 자동 저장을 멈춘다.
// 여기서 조용히 빈 배열로 고쳐 버리면 플레이어 아이템이 말없이 사라진다.
{
    assert.throws(() => merge({
        level: 'abc', season: null, playerHp: NaN,
        inventory: 'not-an-array', equipment: null, currencies: [], unlocks: 42, settings: 'x'
    }), '타입이 망가진 저장은 예외로 알려야 한다(손상 저장 처리 경로가 받는다)');
    const save = fs.readFileSync('js/save.js', 'utf8');
    assert.ok(/catch\s*\([^)]*\)\s*\{[\s\S]{0,400}preserveCorruptLocalSave/.test(save),
        '손상 저장은 백업을 남겨야 한다');
    assert.ok(/setLocalSaveRuntimeState\('corrupt'/.test(save), '손상 상태를 기록해 자동 저장을 멈춰야 한다');
}

console.log('smoke-save-migration passed');
