const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 소환수 밸런스 개편 검증: (1) 최소 피해가 소환수별 실제 편차 하한(dmgRollMinPct)으로
// 실전투에도 반영되는지 — 표시(툴팁)만 고치는 게 아니라 실제 피해 계산 자체가 굴림을
// 갖도록 함. (2) 생명력이 배율이 아니라 기초값 자체가 절반 수준으로 줄었는지.
// (3) 공격 젬 레벨 21~30, 31+ 구간의 성장 스텝 가중치가 커졌는지(30레벨 이후가 더 가파름).
function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const context = {
    console,
    game: { currencies: {}, ascendClass: null, ascendKeystones: [], currentZoneId: 0, enemies: [] },
    getZone() { return { id: 0, tier: 1 }; },
    hasKeystone() { return false; },
    getEffectiveEnemyMitigation() { return 0; },
    getEnemyConditionDebuffFactor() { return { mul: 1 }; },
    getKeystoneEnemyTakenMultiplier() { return 1; },
    getAbyssMonsterScales() { return { playerDamageMul: 1 }; },
    getLimitedSummonPenetrationStats(pStats) { return pStats; },
    getLimitedSummonBossDamageMultiplier() { return 1; },
    getLimitedSummonFinalDamageMultiplier() { return 1; },
    getSummonSharedDamageIncreasePct() { return 0; },
    addBattleFx() {},
    addEvasionCombatLog() {}
};
context.window = context;
vm.createContext(context);
['getSummonProfile', 'getAttackSummonGrowthSteps', 'getSummonHitDamageInfo'].forEach(name => {
    vm.runInContext(`${readFunctionSource(combatSource, name)}; this.${name} = ${name};`, context, { filename: name });
});

// ── 1. 생명력 너프는 baseHp 자체에 반영되어야 한다(후처리 배율 아님) ──
const expectedBaseHp = {
    '서리늑대 소환': 58,
    '불곰 소환': 83,
    '벼락멧돼지 소환': 65,
    '칼날까마귀 소환': 55,
    '공허 유충 소환': 71,
    '벌떼 소환': 50,
    '수액 골렘 소환': 111
};
Object.entries(expectedBaseHp).forEach(([name, hp]) => {
    assert.strictEqual(context.getSummonProfile(name).baseHp, hp, `${name}의 baseHp가 기존 대비 50% 수준으로 낮아져야 한다`);
});

// ── 2. 최소 피해 편차(dmgRollMinPct)가 프로필에 30~50 사이로 존재해야 한다 ──
Object.keys(expectedBaseHp).forEach(name => {
    let pct = context.getSummonProfile(name).dmgRollMinPct;
    assert.ok(pct >= 30 && pct <= 50, `${name}의 dmgRollMinPct(${pct})는 30~50 사이여야 한다`);
});

// ── 3. 굴림이 실제 피해 계산에 선형으로 반영되어야 한다(표시만이 아니라 실전투 계산 자체) ──
const pStats = { summonPctDmg: 0, summonEfficiency: 0, summonCrit: 0, summonCritDmg: 0, uniqueSummonNonCritNoDamage: false };
const hitProfile = { ele: 'phys', baseDamage: 100, attackSpeedMul: 1, resPenBonus: 0, physIgnoreBonus: 0, crit: 0, critDmg: 140, dmgRollMinPct: 40 };
const rollHalf = context.getSummonHitDamageInfo(hitProfile, pStats, null, { rollOverridePct: 50, forceCrit: false });
const rollFull = context.getSummonHitDamageInfo(hitProfile, pStats, null, { rollOverridePct: 100, forceCrit: false });
assert.strictEqual(rollHalf.damage, Math.floor(rollFull.damage * 0.5), '편차 굴림은 최종 피해에 선형으로 반영되어야 한다(50% 굴림 = 100% 굴림의 절반)');
assert.ok(rollHalf.damage < rollFull.damage, '편차 하한 굴림은 편차 상한 굴림보다 피해가 낮아야 한다');

// dmgRollMinPct가 낮을수록(버스트형) 강제 최소굴림 피해가 더 낮아야 한다.
const burstProfile = { ...hitProfile, dmgRollMinPct: 30 };
const consistentProfile = { ...hitProfile, dmgRollMinPct: 50 };
const burstMin = context.getSummonHitDamageInfo(burstProfile, pStats, null, { rollOverridePct: 30, forceCrit: false });
const consistentMin = context.getSummonHitDamageInfo(consistentProfile, pStats, null, { rollOverridePct: 50, forceCrit: false });
assert.ok(burstMin.damage < consistentMin.damage, '버스트형(dmgRollMinPct 30)의 최소 굴림 피해는 연사형(50)보다 낮아야 한다');

// ── 4. 레벨 21~30, 31+ 성장 스텝이 예전보다 가팔라야 하고, 31+ 쪽이 21~30보다 스텝당 증가폭이 커야 한다 ──
const step20to21 = context.getAttackSummonGrowthSteps(21) - context.getAttackSummonGrowthSteps(20);
const step29to30 = context.getAttackSummonGrowthSteps(30) - context.getAttackSummonGrowthSteps(29);
const step30to31 = context.getAttackSummonGrowthSteps(31) - context.getAttackSummonGrowthSteps(30);
const step9to10 = context.getAttackSummonGrowthSteps(10) - context.getAttackSummonGrowthSteps(9);
assert.strictEqual(step20to21, step29to30, '21~30 구간은 스텝당 증가폭이 일정해야 한다');
assert.ok(step20to21 > 80, '21레벨 이상 스텝당 성장폭은 기존(80)보다 커야 한다');
assert.ok(step30to31 > step20to21, '31레벨 이상 스텝당 성장폭은 21~30 구간보다 더 커야 한다');
assert.ok(step20to21 > step9to10, '21~30 구간 성장폭은 10~20 구간보다 커야 한다');

console.log('smoke-summon-balance-rework passed');
