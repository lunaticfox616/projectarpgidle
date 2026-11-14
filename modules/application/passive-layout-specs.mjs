import { angleDistance, getWebAngle } from './passive-layout-geometry.mjs';

export function getTagGemClusterSpec(ctx, spoke, depth) {
    return ctx.tagGemClusterSpecs[(spoke * 5 + depth * 3) % ctx.tagGemClusterSpecs.length];
}

export function isTopChaosPenaltyCluster(ctx, spoke, depth) {
    let topArc = angleDistance(ctx, getWebAngle(ctx, spoke), -Math.PI / 2) <= Math.PI / 3;
    return topArc && ((spoke === 15 && depth === 5) || (spoke === 1 && depth === 9));
}

export function isOneOClockCluster(ctx, spoke) {
    return spoke === 1 || spoke === 2;
}

export function getOneOClockClusterSpec(ctx, spoke, depth) {
    const specs = [
        { stat: 'chaosPctDmg', title: ctx.deps._t('심연 독기'), length: 4 },
        { stat: 'dotPctDmg', title: ctx.deps._t('부패 지속'), length: 4 },
        { stat: 'coldPctDmg', title: ctx.deps._t('빙결 한기'), length: 4 },
        { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: ctx.deps._t('카오스 룬 독성'), length: 5 },
        { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: ctx.deps._t('지속 룬 부식'), length: 5 }
    ];
    return specs[(spoke + depth) % specs.length];
}

export function getDirectionalClusterSpec(ctx, spoke, depth) {
    const fixedClusters = {
        '10:5': { stat: 'firePctDmg', title: ctx.deps._t('서녘 화염'), length: 4 },
        '11:8': { stat: 'firePctDmg', title: ctx.deps._t('황혼 화염'), length: 4 },
        '14:6': { stat: 'firePctDmg', title: ctx.deps._t('여명 화염'), length: 4 },
        '0:6': { stat: 'coldPctDmg', title: ctx.deps._t('천정 서리'), length: 4 },
        '1:6': { stat: 'lightPctDmg', title: ctx.deps._t('새벽 번개'), length: 4 },
        '14:9': { stat: 'summonAspd', title: ctx.deps._t('성좌 지휘'), length: 4 },
        '15:5': { stat: 'summonPctDmg', title: ctx.deps._t('별무리 사역'), length: 5 },
        '15:8': { stat: 'summonHpPct', title: ctx.deps._t('사역 생명핵'), length: 4 }
    };
    return fixedClusters[`${spoke}:${depth}`] || null;
}

export function getScatteredMaxResClusterSpec(ctx, spoke, depth) {
    if (spoke === 5 && depth % 4 === 1) return { stat: 'resF', endStat: 'maxResF', title: ctx.deps._t('화염 최대 저항'), length: 4 };
    if (spoke === 9 && depth % 4 === 2) return { stat: 'resC', endStat: 'maxResC', title: ctx.deps._t('냉기 최대 저항'), length: 4 };
    if (spoke === 13 && depth % 4 === 3) return { stat: 'resL', endStat: 'maxResL', title: ctx.deps._t('번개 최대 저항'), length: 4 };
    return null;
}

export function getCompositeClusterSpec(ctx, spoke, depth) {
    let scatteredMaxRes = getScatteredMaxResClusterSpec(ctx, spoke, depth);
    if (scatteredMaxRes) return scatteredMaxRes;
    if (spoke === 4) {
        if (depth % 2 === 0) return { stat: 'moveEvasion', title: ctx.deps._t('질풍 회피'), length: 4 };
        const altSpecs = [
            { stat: 'projectilePctDmg', title: ctx.deps._t('탄도 숙련'), length: 4 },
            { stat: 'pctHp', title: ctx.deps._t('생명 순환'), length: 4 },
            { stat: 'resC', title: ctx.deps._t('한기 내성'), length: 4 },
            { stat: 'projectileExtraShots', title: ctx.deps._t('추가 발사'), length: 4 }
        ];
        return altSpecs[Math.floor(depth / 2) % altSpecs.length];
    }
    if (spoke === 8) return { stat: 'hpArmor', title: ctx.deps._t('거석 생명'), length: 4 };
    if (spoke === 12) return { stat: 'slamPctDmg', endStat: 'slamEchoChance', title: ctx.deps._t('대지 여진'), length: 5 };
    if (spoke === 0) return { stat: 'energyShieldPct', endStat: 'energyShieldRegen', title: ctx.deps._t('보호막 순환'), length: 4 };
    if (isTopChaosPenaltyCluster(ctx, spoke, depth)) return { stat: 'chaosResElemPenalty', title: ctx.deps._t('혼돈 절연'), length: 4 };
    const rotating = [
        { stat: 'critDmg', title: ctx.deps._t('치명 배율'), length: 4 },
        { stat: 'ds', title: ctx.deps._t('연속 타격'), length: 4 },
        { stat: 'maxDmgRoll', title: ctx.deps._t('상한 보정'), length: 4 },
        { stat: 'pctDmg', endStat: 'suppCap', title: ctx.deps._t('보조스킬룬 연결'), length: 4 },
        { stat: 'minDmgRoll', title: ctx.deps._t('하한 안정'), length: 4 },
        { stat: 'resAll', title: ctx.deps._t('원소 수호'), length: 4 },
        { stat: 'resChaos', title: ctx.deps._t('카오스 저항'), length: 4 },
        { stat: 'regenSuppress', title: ctx.deps._t('재생 봉쇄'), length: 4 },
        { stat: 'aspdMove', title: ctx.deps._t('쌍속 기동'), length: 4 }
    ];
    return rotating[(spoke * 3 + depth) % rotating.length];
}

export function getClusterStatForStep(ctx, spec, isEnd) {
    return isEnd && spec.endStat ? spec.endStat : spec.stat;
}

export function getFinalClusterSpec(ctx, themeSpec, spoke, depth) {
    let directional = getDirectionalClusterSpec(ctx, spoke, depth);
    if (directional) return directional;
    if (isOneOClockCluster(ctx, spoke)) return getOneOClockClusterSpec(ctx, spoke, depth);
    if (themeSpec.stat === 'gemLevel') {
        return selectGlobalGemCluster(ctx, spoke, depth);
    }
    if (depth === 6 && spoke === 1) return ctx.tagGemClusterSpecs[11];
    if (depth >= 6 && ((spoke + depth) % 9 === 0)) return getTagGemClusterSpec(ctx, spoke, depth);
    if (depth <= 4) return { stat: themeSpec.stat, title: themeSpec.title, length: null };
    let composite = getCompositeClusterSpec(ctx, spoke, depth);
    if (isClusterSpecAvailable(ctx, composite)) return composite;
    return { stat: themeSpec.stat, title: themeSpec.title, length: null };
}

function selectGlobalGemCluster(ctx, spoke, depth) {
    if (!ctx.retainedGlobalGemLevelCluster && depth >= ctx.maxDepth - 1) {
        ctx.retainedGlobalGemLevelCluster = true;
        return { stat: 'spellFlatPct', endStat: 'gemLevel', title: ctx.deps._t('외곽 룬 각성'), length: 5 };
    }
    return getTagGemClusterSpec(ctx, spoke, depth);
}

export function isClusterSpecAvailable(ctx, spec) {
    return !!(spec && ctx.deps.P_STATS[spec.stat] && (!spec.endStat || ctx.deps.P_STATS[spec.endStat]));
}
