import { BATTLE_FEEDBACK_PROFILES, PLAYER_HURT_FEEDBACK } from '../data/battle-feedback.mjs';

export function getBattleHitFeedback(enemies, data) {
    if (!data || data.dot || !Number.isFinite(Number(data.damage))) return {};
    let enemy = (enemies || []).find(row => row && row.id === data.enemyId);
    let maxHp = Math.max(0, Number(data.targetMaxHp) || Number(enemy && enemy.maxHp) || 0);
    if (maxHp <= 0) return {};
    return impactFeedback(data, enemy, maxHp);
}

function impactFeedback(data, enemy, maxHp) {
    let overkill = enemy && enemy.hp <= 0 ? Math.max(0, Number(enemy.lastOverkillDamage) || 0) : 0;
    let feedbackDamage = Math.max(0, Number(data.rawDamage) || (Number(data.damage) + overkill));
    let damageRatio = feedbackDamage / maxHp;
    let impactTier = damageRatio >= 1 ? 'annihilate' : (damageRatio >= 0.3 ? 'heavy' : 'normal');
    return { damageRatio, impactTier, targetMaxHp: maxHp };
}

function getPlayerHurtProfile(fx) {
    const ratio = Math.max(0, Number(fx.damageRatio) || 0), feel = PLAYER_HURT_FEEDBACK;
    return { hitStopMs: ratio >= feel.heavyRatio ? feel.hitStopMs : 0, shake: Math.min(feel.shakeMax, feel.shakeMin + ratio * feel.shakePerLife),
        duration: feel.duration };
}

/** A later wave of a ring slam (diamond ring, radius 2 or more). */
const heavyRing = fx => fx.wave > 1 && fx.footprint?.shape === 'diamond' && fx.footprint.radius >= 2;

export function getBattleFeedbackProfile(fx) {
    if (!fx || fx.dot) return BATTLE_FEEDBACK_PROFILES.normal;
    if (fx.type === 'playerHit') return getPlayerHurtProfile(fx);
    if (fx.type === 'bossAreaImpact') return heavyRing(fx) ? BATTLE_FEEDBACK_PROFILES.bossSlamHeavy : BATTLE_FEEDBACK_PROFILES.bossSlam;
    if (fx.impactTier === 'annihilate') return BATTLE_FEEDBACK_PROFILES.annihilate;
    if (fx.impactTier === 'heavy') return BATTLE_FEEDBACK_PROFILES.heavy;
    if (fx.crit) return BATTLE_FEEDBACK_PROFILES.crit;
    return BATTLE_FEEDBACK_PROFILES.normal;
}
