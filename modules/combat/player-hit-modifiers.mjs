import { addStatToBucket } from '../common/stat-bucket.mjs';

/** 포션 스킬 키스톤의 명중 피해 배율: 폭발성 증류 ×0.75, 과잉 투여 ×1.5. */
export function castGetPotionKeystoneHitScale(flags) {
    return (flags.explosiveDistill ? 0.75 : 1) * (flags.potionOverdose ? 1.5 : 1);
}

/** 키스톤의 공격 · 시전 속도 감폭: 한 번의 중량 ×0.7, 과잉 투여(포션 스킬) ×0.75. 감폭이 없으면 그대로. */
export function castScaleKeystoneAttackSpeed(aspd, flags) {
    const scale = (flags.maximumRoll ? 0.7 : 1) * (flags.potionOverdose ? 0.75 : 1);
    return scale < 1 ? Math.max(0.1, aspd * scale) : aspd;
}

/** 천 개의 유리병(고유 허리띠): 예전 물약 넷의 약한 상시 효과. */
export function castAddThousandBottlesStats(bucket) {
    addStatToBucket(bucket, 'armorPct', 25);
    addStatToBucket(bucket, 'resAll', 12);
    addStatToBucket(bucket, 'aspd', 8);
    addStatToBucket(bucket, 'pctDmg', 10);
}

export function castGetPassiveKeystoneHitMultiplier(env, pStats, target, contact) {
    const flags = pStats.passiveKeystoneFlags || {};
    let multiplier = castFarshotMultiplier(env, target, flags);
    if (flags.projectileFormation && contact.targetIndex > 0) multiplier *= 0.6;
    multiplier *= castGetPotionKeystoneHitScale(flags);
    if (flags.erosionLegacy && pStats.sSkill.ele === 'chaos') multiplier *= 0.85;
    if (flags.openingHunt) {
        multiplier *= target.passiveOpeningHuntConsumed ? 0.8 : 2;
        target.passiveOpeningHuntConsumed = true;
    }
    if (!flags.channelPath) return multiplier;
    return multiplier * castChannelPathMultiplier(env, pStats, target, contact);
}

function castFarshotMultiplier(env, target, flags) {
    if (!flags.farshot || !env.owner.gridPlayer || !Number.isFinite(target.gx)) return 1;
    const distance = env.deps.getGridUnitDistance(env.owner.gridPlayer, target);
    return distance >= 3 ? 1.25 : (distance <= 1 ? 0.75 : 1);
}

function castChannelPathMultiplier(env, pStats, target, { hitIndex, targetIndex, skillName }) {
    if (!(pStats.sSkill.tags || []).includes('channeling')) {
        env.owner.passiveChannelPath = null;
        return 0.8;
    }
    let state = env.owner.passiveChannelPath || {};
    if (hitIndex === 0 && targetIndex === 0) {
        let sameTarget = state.skillName === skillName && String(state.targetId) === String(target.id);
        state = { skillName, targetId: target.id, stacks: sameTarget ? Math.min(6, (state.stacks || 0) + 1) : 1 };
        env.owner.passiveChannelPath = state;
    }
    return 1 + Math.max(0, state.stacks || 0) * 0.07;
}
