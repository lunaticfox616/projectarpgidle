// 생장판 수치 예산 회귀 검사.
//
// 작은 아이템과 2~4칸 고급 아이템이 한 판의 제한된 공간을 나눠 쓴다.
// 아이템 하나하나는 작아도 합계는 고정 슬롯 장비 한 세트를 쉽게 넘어설 수 있어,
// "한 장이 얼마나 센가"가 아니라 "판 하나가 얼마나 센가"를 고정한다.
//
// 브라우저 실측(혼돈 심화 26 / 티어 15 레어 장비 10부위 대비).
// 장비도 판도 매번 무작위로 굴리므로 12회 평균을 한 표본으로 삼아 여러 표본의
// 중앙값을 본다. 한 점의 값으로 읽으면 안 된다 — 표본 간 편차가 크다.
//   생명력 0.77배(0.64~1.03) · 방어도 0.46 · 회피 0.44 · 보호막 0.42 · DPS 2.62(1.83~3.04)
// 방어는 장비보다 낮고 공격은 높은 "공격 편중 보조 시스템"이 의도한 지점이다.
// 생명력은 한때 중앙값 0.93까지 올라가 장비와 대등해졌던 적이 있다(베이스·공간
// 시너지의 flatHp를 절반으로 낮춰 되돌렸다). 아래 상한이 그 회귀를 막는다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadData() {
    const context = { console };
    // 데이터 계층은 safeExposeData로만 밖에 드러난다 — 런타임과 같은 경로로 읽는다.
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => { context[key] = map[key]; });
    context.safeExposeGlobals = () => {};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    return context;
}

const ctx = loadData();
const bases = ctx.GROWTH_BASE_DB;
const boardCells = ctx.GROWTH_BOARD_W * ctx.GROWTH_BOARD_H;

// ── 형태·종류 계약 ────────────────────────────────────────────────────────
assert.ok(ctx.GROWTH_SHAPE_DB.dot1, '1칸 호환 형태가 있어야 한다');
Object.entries(ctx.GROWTH_SHAPE_DB).forEach(([shapeId, shape]) => {
    assert.ok(shape.cells.length >= 1 && shape.cells.length <= 4, `${shapeId}는 1~4칸이어야 한다`);
});
bases.forEach(base => assert.ok(ctx.GROWTH_SHAPE_DB[base.shapeId], `${base.id}의 형태가 정의되어야 한다`));
assert.ok(bases.filter(base => ctx.GROWTH_SHAPE_DB[base.shapeId].cells.length > 1).length >= 7,
    '각 신규 계열에 공간 비용을 지닌 고급 베이스가 있어야 한다');
ctx.GROWTH_UNIQUE_DB.forEach(unique => {
    assert.ok(bases.some(base => base.id === unique.baseId), `고유 ${unique.name}의 베이스가 존재해야 한다`);
});

// ── 판 크기: 칸 수가 곧 동시 배치 개수다 ─────────────────────────────────
assert.ok(boardCells <= 36, `판이 커질수록 합계가 선형으로 늘어난다 (현재 ${boardCells}칸, 상한 36)`);
const stages = ctx.GROWTH_UNLOCK_STAGES.map(row => row.cells);
assert.strictEqual(stages[stages.length - 1], boardCells, '마지막 해금 단계는 판 전체여야 한다');
stages.forEach((cells, i) => {
    if (i > 0) assert.ok(cells > stages[i - 1], '해금 단계는 단조 증가해야 한다');
});

// ── 추가 옵션 수: 1칸이 장비 한 부위만큼 옵션을 들면 안 된다 ─────────────
assert.strictEqual(ctx.getGrowthCategoryAffixCap('slab'), 0, '석판은 추가 옵션을 가질 수 없다');
['flower', 'branch', 'leaf', 'fruit', 'root', 'thorn', 'stem', 'spore', 'seed', 'vine'].forEach(category => {
    const cap = ctx.getGrowthCategoryAffixCap(category);
    assert.strictEqual(cap, 2, `${category}의 희귀 추가 옵션 상한은 2줄이어야 한다`);
    assert.ok(bases.some(base => base.category === category), `${category} 베이스가 있어야 한다`);
    const uniqueCount = ctx.GROWTH_UNIQUE_DB.filter(unique => {
        const base = bases.find(row => row.id === unique.baseId);
        return base && base.category === category;
    }).length;
    assert.ok(uniqueCount >= 2, `${category} 고유 생장판은 최소 2개여야 한다 (현재 ${uniqueCount}개)`);
});

// 큰 형태의 고정 옵션이 면적을 무시하고 폭주하지 않도록 칸당 예산을 고정한다.
bases.filter(base => ctx.GROWTH_SHAPE_DB[base.shapeId].cells.length > 1).forEach(base => {
    const cells = ctx.GROWTH_SHAPE_DB[base.shapeId].cells.length;
    (base.baseStats || []).forEach(stat => {
        assert.ok(Number(stat.baseMax) / cells <= 25, `${base.id}/${stat.id}의 칸당 수치가 너무 높다`);
    });
});

// ── 스탯별 판 전체 예산 ──────────────────────────────────────────────────
// 각 종류가 판의 1/3씩 올라가고 모두 최대 롤이라고 가정한 최악값을 본다.
// (석판이 약 1/4을 차지하므로 실제로는 이보다 낮게 나온다.)
const perCategorySlots = Math.ceil(boardCells / 3);

function worstCaseTotal(category, statId) {
    const pool = bases.filter(base => base.category === category);
    const best = pool.reduce((max, base) => {
        const stat = (base.baseStats || []).find(row => row && row.id === statId);
        return stat ? Math.max(max, Number(stat.baseMax) || 0) : max;
    }, 0);
    return best * perCategorySlots;
}

// 평탄 피해는 무기 한 자루와 직접 더해지므로 가장 민감하다.
const flatDmgBudget = worstCaseTotal('flower', 'flatDmg');
assert.ok(flatDmgBudget <= 30, `꽃 평탄 피해 합계가 예산을 넘었다 (${flatDmgBudget}, 상한 30)`);

// 증가 피해 계열은 서로 가산되므로 종류별 최대치를 함께 본다.
const PCT_DAMAGE_STATS = ['physPctDmg', 'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg',
    'elementalPctDmg', 'projectilePctDmg', 'aoePctDmg', 'pctDmg'];
const pctBudget = Math.max(...PCT_DAMAGE_STATS.map(id => worstCaseTotal('flower', id)));
assert.ok(pctBudget <= 100, `꽃 증가 피해 합계가 예산을 넘었다 (${pctBudget}%, 상한 100%)`);

// 방어는 장비보다 낮게 유지한다.
assert.ok(worstCaseTotal('branch', 'armor') <= 350, '가지 방어도 합계가 예산을 넘었다');
// 생명력은 판이 커질수록 가장 빨리 장비를 따라잡는다. 상한 260이던 시절
// 실측 중앙값이 0.93배까지 올라가 "방어가 낮다"는 전제가 깨졌다.
// 베이스 flatHp를 절반으로 낮춘 현재 최악값은 110이다.
const flatHpBudget = worstCaseTotal('branch', 'flatHp');
assert.ok(flatHpBudget <= 130, `가지 생명력 합계가 예산을 넘었다 (${flatHpBudget}, 상한 130)`);

// 공간 시너지가 주는 생명력도 함께 눌러야 한다(실측상 베이스와 비슷한 비중이다).
const spatialFlatHp = bases.reduce((max, base) => {
    const grants = ((base.spatial && base.spatial.effects) || [])
        .flatMap(effect => effect.grant || [])
        .filter(grant => grant && grant.id === 'flatHp');
    return grants.reduce((inner, grant) => Math.max(inner, Number(grant.val) || 0), max);
}, 0);
assert.ok(spatialFlatHp <= 20, `공간 시너지 생명력 한 줄이 예산을 넘었다 (${spatialFlatHp}, 상한 20)`);
assert.ok(worstCaseTotal('branch', 'evasion') <= 350, '가지 회피 합계가 예산을 넘었다');

// 치명타·공격 속도는 곱셈으로 들어가 DPS를 빠르게 밀어 올린다.
['flower', 'leaf'].forEach(category => {
    assert.ok(worstCaseTotal(category, 'crit') <= 14, `${category} 치명타 확률 합계가 예산을 넘었다`);
    assert.ok(worstCaseTotal(category, 'aspd') <= 40, `${category} 공격 속도 합계가 예산을 넘었다`);
});

// ── 석판 레벨 증폭이 예산을 무력화하지 않아야 한다 ───────────────────────
const maxAmplify = 1 + ctx.GROWTH_LEVEL_CAP * (ctx.GROWTH_LEVEL_STAT_PCT / 100);
assert.ok(maxAmplify <= 2.25, `석판 최대 증폭이 2.25배를 넘으면 예산이 무의미해진다 (현재 ${maxAmplify.toFixed(2)}배)`);

// 페널티 석판이 있어야 "좋은 석판을 아무 데나 두면 그만"이 되지 않는다.
const penaltySlabs = ctx.GROWTH_SLAB_DB.filter(def => (def.grants || []).some(g => g.level < 0));
assert.ok(penaltySlabs.length >= 3, '페널티를 지닌 석판이 최소 3종은 있어야 한다');
// +3 이상을 주는 석판은 대가를 져야 한다: 음수 레벨이거나, 배치가 까다로운 좁은 패턴이거나.
const RESTRICTIVE_PATTERNS = new Set(['far', 'diagonal', 'self']);
ctx.GROWTH_SLAB_DB.forEach(def => {
    const grants = def.grants || [];
    const best = Math.max(...grants.map(g => g.level));
    if (best < 3) return;
    if (def.chase) {
        assert.ok(best <= 3, `${def.name} 체이싱 석판도 단일 범위 레벨 +3 상한은 지켜야 한다`);
        return;
    }
    const hasPenalty = grants.some(g => g.level < 0);
    const isRestrictive = grants.every(g => g.level <= 0 || RESTRICTIVE_PATTERNS.has(g.pattern));
    assert.ok(hasPenalty || isRestrictive, `${def.name}처럼 강한 석판은 페널티나 까다로운 패턴을 져야 한다`);
});

// ── 모든 공간 조건이 실제 판정기를 가리켜야 한다 ─────────────────────────
// 폴리오미노 시절 조건(분리형 사이 칸, 크기 비교 등)이 남아 있으면 조용히 죽는다.
const effects = fs.readFileSync('js/growth-effects.js', 'utf8');
const conditionTypes = new Set();
bases.forEach(base => ((base.spatial || {}).effects || []).forEach(effect => {
    if (effect && effect.when && effect.when.type) conditionTypes.add(effect.when.type);
}));
conditionTypes.forEach(type => {
    assert.ok(new RegExp(`\\b${type}:`).test(effects), `조건 판정기 ${type}이 growth-effects.js에 없다`);
});
ctx.GROWTH_GLOBAL_SYNERGY_DB.forEach(rule => {
    assert.ok(new RegExp(`\\b${rule.type}:`).test(effects), `전역 판정기 ${rule.type}이 growth-effects.js에 없다`);
});
ctx.GROWTH_UNIQUE_DB.forEach(unique => {
    if (!unique.growthEffectKey) return;
    assert.ok(new RegExp(`\\b${unique.growthEffectKey}:`).test(effects), `고유 핸들러 ${unique.growthEffectKey}가 없다`);
});

// ── 추가 옵션 원본 수치: 장비는 유지하고 생장판 결과 자체만 낮춘다 ────────
{
    const { buildGameRuntime } = require('./lib/game-runtime');
    const runtime = buildGameRuntime();
    const run = code => vm.runInContext(code, runtime);
    const pools = JSON.parse(run(`JSON.stringify((function () {
        let gear = { slot: '무기', rarity: 'rare', baseStats: [], stats: [] };
        let growth = { slot: '무기', rarity: 'rare', growthCategory: 'flower', growthShapeId: 'dot1', baseStats: [], stats: [] };
        let gearFlat = getAvailableMods(gear).find(mod => mod.id === 'flatDmg');
        let growthFlat = getAvailableMods(growth).find(mod => mod.id === 'flatDmg');
        let growthCrit = getAvailableMods(growth).find(mod => mod.id === 'crit');
        return {
            gearFlat,
            growthFlat,
            growthCritRoll: rollAffixValue(growthCrit, 1),
            growthHasExtraShots: getAvailableMods(growth).some(mod => mod.id === 'projectileExtraShots')
        };
    })())`));
    assert.deepStrictEqual([pools.gearFlat.base, pools.gearFlat.step], [3, 3],
        '일반 장비의 추가 옵션 원본 수치는 바뀌면 안 된다');
    assert.deepStrictEqual([pools.growthFlat.base, pools.growthFlat.step], [1.2, 1.2],
        '생장판은 별도의 낮은 base/step 원본 수치를 사용해야 한다');
    assert.ok(pools.growthCritRoll.val > 0 && pools.growthCritRoll.val < 1,
        '낮춘 생장판 옵션은 정수 반올림으로 0이 되지 않고 실제 소수 수치를 저장해야 한다');
    assert.strictEqual(pools.growthHasExtraShots, false,
        '판 전체에서 중첩되는 추가 발사 같은 불연속 장비 옵션은 생장판 풀에서 제외해야 한다');

    const migrated = JSON.parse(run(`JSON.stringify((function () {
        let rare = { growthCategory: 'flower', growthShapeId: 'dot1', rarity: 'rare', baseStats: [], stats: [{ id: 'flatDmg', val: 100, valMin: 90, valMax: 110 }] };
        let unique = { growthCategory: 'seed', growthShapeId: 'dot1', rarity: 'unique', baseStats: [], stats: [{ id: 'pctHp', val: 12, valMin: 12, valMax: 12 }] };
        normalizeGrowthOptionValues(rare);
        normalizeGrowthOptionValues(unique);
        normalizeGrowthOptionValues(rare);
        normalizeGrowthOptionValues(unique);
        return { rare, unique };
    })())`));
    assert.strictEqual(migrated.rare.stats[0].val, 40, '기존 희귀 생장판도 실제 저장 수치로 한 번 낮춰야 한다');
    assert.strictEqual(migrated.unique.stats[0].val, 18, '기존 고유 생장판도 실제 저장 수치로 한 번 상향해야 한다');
    assert.strictEqual(migrated.rare.growthOptionValueVersion, ctx.GROWTH_AFFIX_VALUE_VERSION,
        '저장 수치 변환은 버전을 남겨 재로드 때 중복 적용되면 안 된다');

    const uniqueStats = JSON.parse(run(`JSON.stringify(generateGrowthUniqueItem(20, '태초의 핵').stats)`));
    assert.deepStrictEqual(uniqueStats.map(stat => stat.val), [18, 18],
        '새 고유 생장판은 상향된 실제 고정 수치를 생성해야 한다');
}

// 원소 기본 피해는 장비 종류별 원본 값을 직접 사용하며, 생장판 저단계 고정 피해도 0으로 보이면 안 된다.
{
    const { buildGameRuntime } = require('./lib/game-runtime');
    const runtime = buildGameRuntime();
    const rolls = JSON.parse(vm.runInContext(`JSON.stringify((function () {
        Math.random = () => 0;
        let roll = id => rollAffixValue(MOD_DB.find(mod => mod.id === id), 1);
        let growthRoll = id => {
            let source = MOD_DB.find(mod => mod.id === id);
            return rollAffixValue({ ...source, ...GROWTH_AFFIX_VALUE_DB[id], growthAffix: true }, 1);
        };
        let lowGrowthIds = Object.keys(GROWTH_AFFIX_VALUE_DB)
            .filter(id => /^(ring|glove).+FlatDmg$/.test(id));
        return {
            weaponDefs: ['weaponFireFlatDmg', 'weaponColdFlatDmg', 'weaponLightFlatDmg']
                .map(id => MOD_DB.find(mod => mod.id === id)).map(mod => [mod.base, mod.step]),
            gloveDefs: ['gloveFireFlatDmg', 'gloveColdFlatDmg', 'gloveLightFlatDmg']
                .map(id => MOD_DB.find(mod => mod.id === id)).map(mod => [mod.base, mod.step]),
            weaponRolls: ['weaponFireFlatDmg', 'weaponColdFlatDmg', 'weaponLightFlatDmg'].map(roll),
            gloveRolls: ['gloveFireFlatDmg', 'gloveColdFlatDmg', 'gloveLightFlatDmg'].map(roll),
            growthWeaponDefs: ['weaponFireFlatDmg', 'weaponColdFlatDmg', 'weaponLightFlatDmg']
                .map(id => GROWTH_AFFIX_VALUE_DB[id]).map(mod => [mod.base, mod.step]),
            growthLowRolls: lowGrowthIds.map(id => ({ id, roll: growthRoll(id) }))
        };
    })())`, runtime));
    assert.deepStrictEqual(rolls.weaponDefs, [[6, 6], [6, 6], [6, 6]],
        '무기 원소 기본 피해는 원본 base/step을 기존의 2배로 올려야 한다');
    assert.deepStrictEqual(rolls.gloveDefs, [[1.8, 1.8], [1.8, 1.8], [1.8, 1.8]],
        '장갑 원소 기본 피해는 원본 base/step을 기존의 3배로 올려야 한다');
    assert.ok(rolls.weaponRolls.every(stat => stat.valMin === 12), 'T1 무기 원소 기본 피해 최소값은 12여야 한다');
    assert.ok(rolls.gloveRolls.every(stat => stat.valMin === 3), 'T1 장갑 원소 기본 피해 최소값은 정수 3이어야 한다');
    assert.deepStrictEqual(rolls.growthWeaponDefs, [[1.3, 1.3], [1.3, 1.3], [1.3, 1.3]],
        '생장판 무기 원소 기본 피해는 별도 원본 수치로 소폭 상향해야 한다');
    assert.ok(rolls.growthLowRolls.length > 0 && rolls.growthLowRolls.every(row => row.roll.valMin >= 1),
        '반지/장갑 계열 생장판 기본 피해는 최저 티어에서도 1 미만이 나오면 안 된다');
}

console.log('smoke-growth-balance passed');
