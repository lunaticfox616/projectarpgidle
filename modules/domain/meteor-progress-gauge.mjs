import { meteorEnsureMeteorSiteState, meteorRollMeteorKind, meteorGetMeteorKind } from './meteor-progress-state.mjs';

const riftZoneTypes = new Set(['abyss', 'labyrinth', 'chaosRealm', 'skyTower', 'underworld', 'cosmos']);

function anomalyChance(enemy) {
    if (enemy && enemy.isBoss) return 0.08;
    return enemy && enemy.isElite ? 0.028 : 0.0045;
}

function isRiftZone(zone, unlockAct) {
    return (zone.type === 'act' && zone.id >= unlockAct) || riftZoneTypes.has(zone.type);
}

function trackSkyRiftOrigin(st, zone) {
    if (!st.skyRiftReady && (st.skyRiftGauge || 0) <= 0.0001) {
        st.skyRiftAllCosmos = true;
        st.skyRiftMinTier = null;
    }
    if (zone.type !== 'cosmos') st.skyRiftAllCosmos = false;
}

export function* meteorTryUnlockMeteorContentByProgress(env, owner) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    if (st.unlocked || !env.deps.getMeteorSiteUnlockReady(owner)) return false;
    st.unlocked = true;
    (yield { kind: 'progressLog', args: [env.deps._t('☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다.'), 'loot-unique'] });
    return true;
}

/** 이상 현상: 운석 낙하 지점이 열리면 사냥 중 가끔 하늘 균열 게이지가 더 찬다(희귀하면 더 많이). */
export function* meteorTriggerAstronomerAnomaly(env, owner, zone, enemy) {
    if (!env.deps.contentProgression.isUnlocked('meteorSite', owner)) return false;
    let st = meteorEnsureMeteorSiteState(env, owner);
    let now = env.deps.getCombatTime();
    if (now - (st.lastAnomalyAt || 0) < 12000) return false;
    let baseChance = anomalyChance(enemy);
    if (Math.random() >= baseChance) return false;
    st.lastAnomalyAt = now;
    let rare = Math.random() < 0.22;
    if (rare) {
        st.skyRiftGauge = env.deps.clampNumber((st.skyRiftGauge || 0) + 8, 0, 100);
        (yield { kind: 'progressLog', args: [env.deps._t('☄️ 희귀 이상 현상 관측! 균열 게이지 +8%'), 'loot-unique'] });
    } else {
        st.skyRiftGauge = env.deps.clampNumber((st.skyRiftGauge || 0) + 3, 0, 100);
        (yield { kind: 'progressLog', args: [env.deps._t('✨ 이상 현상 관측: 균열 게이지 +3%'), 'loot-magic'] });
    }
    return true;
}

export function meteorGetSkyRiftGaugeTierCap(st) {
    return st && st.skyRiftAllCosmos ? 40 : 20;
}

export function meteorGetSkyRiftGaugeEffectiveTier(zone, st) {
    let tier = Math.max(1, Math.floor((zone && zone.tier) || 1));
    return Math.min(meteorGetSkyRiftGaugeTierCap(st), tier);
}

export function meteorGetSkyRiftGaugeGain(zone, enemy, st) {
    let baseGain = enemy && enemy.isBoss ? 3.8 : (enemy && enemy.isElite ? 1.6 : 0.35);
    let effectiveTier = meteorGetSkyRiftGaugeEffectiveTier(zone, st);
    return baseGain * Math.max(1, effectiveTier);
}

export function* meteorGainSkyRiftGaugeFromCombat(env, owner, zone, enemy) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    if (!st.unlocked || st.skyRiftReady) return;
    if (!zone) return;
    if (!isRiftZone(zone, env.deps.METEOR_SITE_UNLOCK_ACT)) return;
    trackSkyRiftOrigin(st, zone);
    let gain = meteorGetSkyRiftGaugeGain(zone, enemy, st);
    yield* meteorTriggerAstronomerAnomaly(env, owner, zone, enemy);
    let nextGauge = (st.skyRiftGauge || 0) + gain;
    st.skyRiftGauge = env.deps.clampNumber(nextGauge, 0, 100);
    let tier = meteorGetSkyRiftGaugeEffectiveTier(zone, st);
    st.skyRiftMinTier = Number.isFinite(st.skyRiftMinTier) ? Math.min(st.skyRiftMinTier, tier) : tier;
    if (st.skyRiftGauge >= 100 && !st.skyRiftReady) yield* completeSkyRift(env, owner, st, nextGauge);
}

function* completeSkyRift(env, owner, st, nextGauge) {
    let overflow = Math.max(0, nextGauge - 100);
    st.skyRiftGauge = 100;
    st.skyRiftCarryGauge = Math.min(99, Math.floor(overflow * 0.25));
    st.skyRiftReady = true;
    st.kind = meteorRollMeteorKind(env);
    const kind = meteorGetMeteorKind(env, owner, st);
    (yield { kind: 'progressLog', args: [env.deps._t('☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다. ({name}, {element})', { name: env.deps._t(kind.name), element: kind.element }), 'loot-rare'] });
    owner.noti.map = true;
}
