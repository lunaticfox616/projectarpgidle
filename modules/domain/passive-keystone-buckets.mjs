import { passiveRuleFindAllocatedPassiveKeystone, passiveRuleHasAuthoredPassiveKeystone } from './passive-keystone-lookup.mjs';
import { passiveRuleCountCovenantAttributeConnections } from './passive-node-effects.mjs';
import { passiveRuleGetVirtualVoidPassiveCount } from './passive-void-count.mjs';

export function passiveRuleSumPassiveRuleStat(buckets, stat) {
    return Object.values(buckets).reduce((sum, bucket) => sum + Number(bucket && bucket[stat] || 0), 0);
}

export function passiveRuleZeroPassiveRuleStats(buckets, statIds) {
    Object.values(buckets).forEach(bucket => statIds.forEach(statId => { bucket[statId] = 0; }));
}

export function passiveRuleConvertPassiveRuleStat(buckets, sourceStat, targetStat) {
    Object.values(buckets).forEach(bucket => {
        bucket[targetStat] += Number(bucket[sourceStat]) || 0;
        bucket[sourceStat] = 0;
    });
}

export function passiveRuleApplyPassiveDefenseKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '대리 성약')) {
        passive.summonGuardRedirectPct += 50;
        passiveRuleZeroPassiveRuleStats(buckets, ['blockChance', 'blockChancePct', 'baseBlockChance', 'deflectChance']);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '완전 회피')) {
        passiveRuleZeroPassiveRuleStats(buckets, ['armor', 'armorPct', 'blockChance', 'blockChancePct', 'baseBlockChance']);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '움직이는 성벽')) {
        passiveRuleConvertPassiveRuleStat(buckets, 'evasion', 'armor');
        passiveRuleConvertPassiveRuleStat(buckets, 'evasionPct', 'armorPct');
        passiveRuleZeroPassiveRuleStats(buckets, ['deflectChance']);
        passive.blockChanceMax += 5;
        passive.move -= 10;
    }
}

export function passiveRuleApplyPassiveRecoveryKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '혼의 성소')) {
        const regen = passiveRuleSumPassiveRuleStat(buckets, 'regen');
        passiveRuleZeroPassiveRuleStats(buckets, ['regen', 'regenFlat']);
        passive.energyShieldRegen += regen;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '피의 가속')) {
        passiveRuleZeroPassiveRuleStats(buckets, ['regen', 'regenFlat']);
        passive.leechKeepFullLife += 1;
    }
}

export function passiveRuleApplyPassiveKeystoneBucketRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '육신과 정신의 성약')) {
        passive.devotion += Math.floor(Math.max(0, passive.strength) / 10) + Math.floor(Math.max(0, passive.intelligence) / 10);
        passive.strength = 0;
        passive.intelligence = 0;
    }
    const covenant = passiveRuleFindAllocatedPassiveKeystone(env, owner, '헌신의 서약');
    if (covenant) passive.devotion += passiveRuleCountCovenantAttributeConnections(env, owner, covenant);
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '관통 행렬')) passive.targetProjectile += 2;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '남겨진 잠식')) passive.chaosErosionCap += 20;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '야만')) {
        passiveRuleZeroPassiveRuleStats(buckets, ['dexterity', 'intelligence']);
        passive.flatDmg += Math.max(1, Math.floor(owner.level || 1)) * 3 + Math.floor(passiveRuleSumPassiveRuleStat(buckets, 'strength') / 10);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '순환의 원석')) {
        const strength = passiveRuleSumPassiveRuleStat(buckets, 'strength');
        passive.cycle += Math.floor(strength / 30);
        passive.armorPct += Math.floor(Math.max(0, passiveRuleSumPassiveRuleStat(buckets, 'cycle')) / 5) * 5;
    }
    passiveRuleApplyPassiveDefenseKeystoneRules(env, owner, buckets);
    passiveRuleApplyPassiveRecoveryKeystoneRules(env, owner, buckets);
    passiveRuleApplyPassiveWrittenKeystoneRules(env, owner, buckets);
    if (passiveRuleHasAuthoredPassiveKeystone(env, owner, '균형의 공명')) passiveRuleApplyBalanceResonance(buckets);
}

/** 균형의 공명: 패시브 노드의 힘과 민첩은 노드를 읽을 때 반씩 나뉘고(getEffectivePassiveNodeEffects), 아이템(장비 기본, 옵션)의 힘과
 * 민첩도 여기서 둘의 합을 반씩 나눈다(2026-11-12 사용자). 지능은 0. */
export function passiveRuleApplyBalanceResonance(buckets) {
    [buckets.gearBase, buckets.gearExplicit].filter(Boolean).forEach(bucket => {
        const half = ((Number(bucket.strength) || 0) + (Number(bucket.dexterity) || 0)) / 2;
        bucket.strength = half;
        bucket.dexterity = half;
    });
    passiveRuleZeroPassiveRuleStats(buckets, ['intelligence']);
}

/** 2026-11-01 사용자가 글로 쓴 키스톤: 시간왜곡, 면죄의 복음, 공허의 별자리, 지식의 반목. */
export function passiveRuleApplyPassiveWrittenKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    // 시간왜곡(2026-11-12 사용자): 재사용 대기시간 회복 속도를 0으로 만들고 그 1%당 카오스 피해 2% 증가(전: 재사용 대기시간 감소만큼 피해를 카오스로 변환).
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '시간왜곡')) {
        const recovery = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, 'cooldownRecovery'));
        passiveRuleZeroPassiveRuleStats(buckets, ['cooldownRecovery']);
        passive.chaosPctDmg += recovery * 2;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '면죄의 복음')) {
        Object.values(buckets).forEach(bucket => {
            bucket.elementalPctDmg += (Number(bucket.chaosPctDmg) || 0) * 0.5;
            bucket.chaosPctDmg = 0;
        });
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '공허의 별자리')) {
        const voids = passiveRuleGetVirtualVoidPassiveCount(env, owner);
        passive.spellPctDmg += voids * 2;
        passive.spellRepeatChance += voids;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '지식의 반목')) passive.attackPctDmg += passiveRuleSumPassiveRuleStat(buckets, 'spellPctDmg') * 0.75;
}
