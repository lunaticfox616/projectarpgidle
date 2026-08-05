// 생장판 수치 예산 회귀 검사.
//
// 모든 생장 아이템이 1칸이 되면서 판을 가득 채우면 24개 안팎이 동시에 올라간다.
// 아이템 하나하나는 작아도 합계는 고정 슬롯 장비 한 세트를 쉽게 넘어설 수 있어,
// "한 장이 얼마나 센가"가 아니라 "판 하나가 얼마나 센가"를 고정한다.
//
// 브라우저 실측(혼돈 심화 26 / 티어 15 레어 장비 10부위 대비, 12회 평균) 기준:
//   생명력 0.8배 · 방어도 0.5배 · 회피 0.4배 · 보호막 0.4배 · DPS 2.2배
// 방어는 장비보다 낮고 공격은 높은 "공격 편중 보조 시스템"이 의도한 지점이다.
// 아래 상한은 그 실측이 크게 흔들리지 않도록 데이터 수준에서 못을 박는다.
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

// ── 1칸 계약 ─────────────────────────────────────────────────────────────
assert.deepStrictEqual(Object.keys(ctx.GROWTH_SHAPE_DB), ['dot1'], '형태는 1칸 하나만 있어야 한다');
bases.forEach(base => assert.strictEqual(base.shapeId, 'dot1', `${base.id}는 1칸이어야 한다`));
ctx.GROWTH_UNIQUE_DB.forEach(unique => {
    assert.ok(!unique.shapeId || unique.shapeId === 'dot1', `고유 ${unique.name}도 1칸이어야 한다`);
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
['flower', 'branch', 'leaf'].forEach(category => {
    const cap = ctx.getGrowthCategoryAffixCap(category);
    assert.ok(cap >= 1 && cap <= 2, `${category}의 추가 옵션 상한은 1~2줄이어야 한다 (현재 ${cap})`);
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
assert.ok(worstCaseTotal('branch', 'flatHp') <= 260, '가지 생명력 합계가 예산을 넘었다');
assert.ok(worstCaseTotal('branch', 'evasion') <= 350, '가지 회피 합계가 예산을 넘었다');

// 치명타·공격 속도는 곱셈으로 들어가 DPS를 빠르게 밀어 올린다.
['flower', 'leaf'].forEach(category => {
    assert.ok(worstCaseTotal(category, 'crit') <= 14, `${category} 치명타 확률 합계가 예산을 넘었다`);
    assert.ok(worstCaseTotal(category, 'aspd') <= 40, `${category} 공격 속도 합계가 예산을 넘었다`);
});

// ── 석판 레벨 증폭이 예산을 무력화하지 않아야 한다 ───────────────────────
const maxAmplify = 1 + ctx.GROWTH_LEVEL_CAP * (ctx.GROWTH_LEVEL_STAT_PCT / 100);
assert.ok(maxAmplify <= 2.1, `석판 최대 증폭이 2.1배를 넘으면 예산이 무의미해진다 (현재 ${maxAmplify.toFixed(2)}배)`);

// 페널티 석판이 있어야 "좋은 석판을 아무 데나 두면 그만"이 되지 않는다.
const penaltySlabs = ctx.GROWTH_SLAB_DB.filter(def => (def.grants || []).some(g => g.level < 0));
assert.ok(penaltySlabs.length >= 3, '페널티를 지닌 석판이 최소 3종은 있어야 한다');
// +3 이상을 주는 석판은 대가를 져야 한다: 음수 레벨이거나, 배치가 까다로운 좁은 패턴이거나.
const RESTRICTIVE_PATTERNS = new Set(['far', 'diagonal', 'self']);
ctx.GROWTH_SLAB_DB.forEach(def => {
    const grants = def.grants || [];
    const best = Math.max(...grants.map(g => g.level));
    if (best < 3) return;
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

console.log('smoke-growth-balance passed');
