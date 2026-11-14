import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-settings.mjs';
import { bloomIsTalentCardActive } from './talent-card-mechanics.mjs';
import { bloomGetTalentCardRuntimeDefinition } from './talent-card-definitions.mjs';

export function bloomGetTalentCardRuntimeState(owner) {
    if (!owner.talentCardRuntime || typeof owner.talentCardRuntime !== 'object') owner.talentCardRuntime = {};
    return owner.talentCardRuntime;
}

export function bloomGetTalentMistralStackCount(env, owner, now) {
    if (!bloomIsTalentCardActive(env, owner, 'hero1__ranger')) return 0;
    let runtime = bloomGetTalentCardRuntimeState(owner);
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    if ((runtime.mistralExpiresAt || 0) > timestamp) {
        let config = bloomGetTalentCardRuntimeDefinition(env, 'hero1__ranger');
        return Math.max(0, Math.min(config.maxStacks, Math.floor(Number(runtime.mistralStacks) || 0)));
    }
    delete runtime.mistralStacks;
    delete runtime.mistralExpiresAt;
    return 0;
}

export function bloomRecordTalentMistralAttack(env, owner, now) {
    if (!bloomIsTalentCardActive(env, owner, 'hero1__ranger')) return 0;
    let config = bloomGetTalentCardRuntimeDefinition(env, 'hero1__ranger');
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    let runtime = bloomGetTalentCardRuntimeState(owner);
    runtime.mistralStacks = Math.min(config.maxStacks, bloomGetTalentMistralStackCount(env, owner, timestamp) + 1);
    runtime.mistralExpiresAt = timestamp + config.durationMs;
    return runtime.mistralStacks;
}

export function bloomGrantTalentStoneShield(env, owner, maxHp, now) {
    let level = bloomIsTalentCardActive(env, owner, 'hero2__guardian');
    if (level <= 0) return null;
    let config = bloomGetTalentCardRuntimeDefinition(env, 'hero2__guardian');
    let capacity = Math.max(1, Math.floor(Math.max(0, Number(maxHp) || 0) * config.maxHpPctAtLevel10 * level / TALENT_CARD_MAX_LEVEL / 100));
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    let runtime = bloomGetTalentCardRuntimeState(owner);
    runtime.stoneShieldAmount = capacity;
    runtime.stoneShieldMax = capacity;
    runtime.stoneShieldExpiresAt = timestamp + config.durationMs;
    return { amount: capacity, expiresAt: runtime.stoneShieldExpiresAt };
}

export function bloomGetTalentMoonReturnConfig(env, owner, targets) {
    if (!bloomIsTalentCardActive(env, owner, 'hero4__hunter') || !Array.isArray(targets)) return null;
    let alive = (owner.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (alive.length !== 1 || !targets.some(row => row && row.enemy === alive[0])) return null;
    let config = bloomGetTalentCardRuntimeDefinition(env, 'hero4__hunter');
    return { targetId: alive[0].id, damageMultiplier: Math.max(0, Number(config.damagePct) || 0) / 100 };
}

export function bloomCanTalentCardApplyEnemyAilment(env, owner, type) {
    if (!bloomIsTalentCardActive(env, owner, 'hero10__catalyst')) return true;
    let ailmentType = String(type || '').toLowerCase();
    let standardTypes = ['ignite', 'poison', 'bleed', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap', 'flamedecay'];
    if (!standardTypes.includes(ailmentType)) return true;
    let config = bloomGetTalentCardRuntimeDefinition(env, 'hero10__catalyst');
    return config.allowed.includes(ailmentType);
}

export function bloomGetActiveTalentRuntimeConfig(env, owner, comboKey) {
    let level = bloomIsTalentCardActive(env, owner, comboKey);
    let config = level > 0 ? bloomGetTalentCardRuntimeDefinition(env, comboKey) : null;
    return config ? { config, level, levelRatio: level / TALENT_CARD_MAX_LEVEL } : null;
}

export function bloomIsTalentInstantWarcryActive(env, owner) {
    return !!bloomGetActiveTalentRuntimeConfig(env, owner, 'hero2__warrior');
}

export function bloomClearTalentCardRuntimeState(owner) {
    delete owner.talentCardRuntime;
}

export function bloomTalentOnPlayerAttack(env, owner) {
    if (!owner.talentRuntime || typeof owner.talentRuntime !== 'object') owner.talentRuntime = {};
    let rt = owner.talentRuntime;
    bloomRecordTalentMistralAttack(env, owner);
    // 2 플레쳐: 3회째 공격마다 피해 +33% (이번 공격에만 적용되는 부스트)
    if (bloomIsTalentCardActive(env, owner, 'hero1__gladiator')) {
        rt.fletcherCount = (Math.floor(rt.fletcherCount || 0) % 3) + 1;
        rt.fletcherBoost = (rt.fletcherCount >= 3) ? 1.33 : 1;
    } else {
        rt.fletcherBoost = 1;
    }
}

export function bloomGetTalentAlwaysHit(env, owner) {
    return bloomIsTalentCardActive(env, owner, 'hero3__gladiator') > 0;
}

export function bloomGetTalentAttackDamageMul(env, owner) {
    let rt = (owner.talentRuntime && typeof owner.talentRuntime === 'object') ? owner.talentRuntime : {};
    let mul = 1;
    if (bloomIsTalentCardActive(env, owner, 'hero1__gladiator') && rt.fletcherBoost) mul *= rt.fletcherBoost;
    return mul;
}
