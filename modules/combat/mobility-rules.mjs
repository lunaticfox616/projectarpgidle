const DEFAULT_COOLDOWN_MS = 4000;
const REQUEST_MS = 1500;
const EVADE_RANGE = 3;
const SPAM_COOLDOWN_SHARE = 0.4;

export function mobilityIsGem(env, name) {
    const def = env.deps.SKILL_DB[name];
    return !!(def && def.isGem && Array.isArray(def.tags) && def.tags.includes('mobility'));
}

/** An unowned or wrong-kind rune never counts as equipped. */
export function mobilityEquipped(env, state = env.deps.owner) {
    const name = state && state.mobilitySkill;
    return mobilityIsGem(env, name) && Array.isArray(state.skills) && state.skills.includes(name) ? name : '';
}

export function mobilityBaseCooldownMs(env, name) {
    return Math.max(500, Number(env.deps.SKILL_DB[name]?.mobilityCooldownMs) || DEFAULT_COOLDOWN_MS);
}

export function mobilityCooldownMs(env, name, stats) {
    return env.deps.getSkillCooldownMs(mobilityBaseCooldownMs(env, name), stats, { mobility: true });
}

export function mobilitySpams(env, name, stats) {
    const def = env.deps.SKILL_DB[name] || {};
    return (Number(def.baseDmg) > 0 || Number(def.spellFlatBase) > 0)
        && mobilityCooldownMs(env, name, stats) <= mobilityBaseCooldownMs(env, name) * SPAM_COOLDOWN_SHARE;
}

export function mobilityReachable(env, name) {
    const live = (env.deps.owner.enemies || []).filter(e => e && e.hp > 0);
    return live.length > 0 && env.deps.selectCombatGemTargets(name, env.deps.SKILL_DB[name], env.deps.owner.gridPlayer, live).length > 0;
}

export function mobilityRequested(env, now) {
    return env.memo.requestedAt !== null && now - env.memo.requestedAt < REQUEST_MS;
}

export function mobilityWanted(env, name, gate, now) {
    return mobilityRequested(env, now) || (gate.auto && (!gate.inRange || mobilitySpams(env, name, gate.stats)));
}

export function mobilityReady(env, name, gate, now) {
    return !gate.blocked && mobilityWanted(env, name, gate, now) && now >= env.memo.cooldownUntil
        && env.deps.owner.playerHp > 0 && !env.deps.owner.combatHalted && env.deps.canUseSkillWithCurrentEquipment(name);
}

/** Manual evasion only: nearest safe cell within three cells, with no breaking ailment. */
export function mobilityEvadeRoute(env) {
    if (!env.deps.isPlayerThreatenedByBoss(env.deps.owner) || env.deps.hasPlayerChannelBreakingAilment()) return null;
    const route = env.deps.findNearestSafeGridRoute(env.deps.owner.gridPlayer,
        env.deps.getBossWarningCells(env.deps.owner, env.deps.pendingEnemyCombatAttacks));
    return route && route.distance > 0 && route.distance <= EVADE_RANGE ? route : null;
}

export function mobilityRequest(env, now = env.deps.getCombatTime()) {
    const name = mobilityEquipped(env);
    if (!name) return '이동 스킬룬을 장착하지 않았습니다';
    if (now < env.memo.cooldownUntil) return env.deps._t('재사용 대기 {value}초', {
        value: (Math.ceil((env.memo.cooldownUntil - now) / 100) / 10).toFixed(1)
    });
    if (env.deps.owner.playerHp <= 0 || env.deps.owner.combatHalted) return '지금은 쓸 수 없습니다';
    if (!env.deps.canUseSkillWithCurrentEquipment(name)) return env.deps.getRuneLevelNote(name) || '지금 무기로는 쓸 수 없는 이동 스킬룬입니다';
    if (!mobilityReachable(env, name) && !mobilityEvadeRoute(env)) return '닿는 적이 없습니다';
    env.memo.requestedAt = now;
    return '';
}

export const mobilityBusy = state => !!state && state.casts.some(c => (c.move || c.holds) && !c.done);
