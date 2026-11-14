import { COMBAT_TACTIC_TARGET_LOCK_MS } from '../combat/core-values.mjs';

/** Targets that go past the cap of 6 (projectiles 12): a target engraving (js/skills.js engraveTargets, 파동 분산 +2) and effect
 * expansion (js/skill-effect-expansion.js applyToSkill). The cap took the engraving away (2026-10-20 hunt: 6 → 6, only its -5% damage). */
export function buildAddUncappedSkillTargets(env, skill, name) {
    skill.targets = Math.max(1, (skill.targets || 1) + Math.max(0, Math.floor(Number(skill.engraveTargets) || 0)));
    env.deps.skillEffectExpansion.applyToSkill(skill, name);
}

/** Who the gem aims at first: the monster the player locked on (js/act-exploration-state.js lockOn), else the target the tactics
 * hold for a moment. Null when neither applies (the nearest in range). */
export function buildGetSkillTargetPreference(env, tactics, now) {
    const locked = env.deps.actExplorationState.lockedEnemy(env.deps.actExplorationState.current(env.owner));
    if (!tactics && !locked) return null;
    const held = tactics && now < env.runtime.combatTacticsRuntime.targetLockedUntil ? env.runtime.combatTacticsRuntime.targetId : null;
    return { targetPriority: tactics ? tactics.targetPriority : undefined, preferredEnemyId: locked ? locked.id : held };
}

/** options.dormant: monsters that have not noticed the hero, which the area may catch but the gem never aims at. */
export function buildSelectCombatGemTargets(env, name, skill, source, { enemies, options }) {
    if (skill.nativeCastId) return env.deps.skillGemCasts.targets(skill.nativeCastId,source,enemies,env.deps.skillEffectExpansion.extra(skill)).map(enemy=>({enemy,mult:1}));
    const dormant=options && options.dormant;
    if (!dormant || !dormant.length) return env.deps.selectGridSkillTargets(name,skill,source,enemies,options);
    return env.deps.selectGridSkillTargets(name,skill,source,enemies.concat(dormant),{...options,splashOnly:new Set(dormant)});
}

/** Monsters near the hero that have not noticed him (data ACT_EXPLORATION_VISION splashReach, 2026-10-04 user): an area attack that
 * lands on unseen ground hits whatever stands there. Empty outside a map exploration. */
export function buildGetSplashDormantEnemies(env) {
    return env.deps.actExplorationState.dormantNear(env.owner,env.owner.gridPlayer,env.deps.ACT_EXPLORATION_VISION.splashReach);
}

/** The attack's own targets: its area may catch monsters that have not noticed the hero, and the strike pulls them into the fight. */
export function buildGetAttackTargets(env, pStats) {
    let targets = buildGetSkillTargets(env, pStats, buildGetSplashDormantEnemies(env));
    env.deps.actExplorationState.wake(env.owner, targets.map(hit => hit.enemy));
    return targets;
}

/** Targets of the active gem in range now. dormant: monsters that have not noticed the hero yet, which only the attack itself
 * passes (getAttackTargets): they can be caught by the area, never aimed at. Checks and previews leave them out. */
export function buildGetSkillTargets(env, pStats, dormant = []) {
    let living = (env.owner.enemies || []).filter(enemy => enemy.hp > 0);
    // 시야 밖 몬스터(2026-10-09 사용자): 영웅이 직접 노리지 못하고, 시야 안 몬스터를 친 범위, 연쇄, 부채꼴에만 휘말린다(알아채지 않은
    // 몬스터와 같은 길, options.dormant). 노릴 몬스터가 없으면 영웅은 가장 가까운 몬스터 쪽으로 걸어간다(updatePlayerGridEngagement).
    let alive = living.filter(enemy => env.deps.actExplorationState.inSight(enemy));
    if (alive.length === 0) return [];
    env.deps.ensureCombatGridRuntime();
    let skill = skillWithFanShots(pStats);
    let now = env.deps.getCombatTime();
    let tactics = env.owner.combatTacticsUnlocked ? env.deps.resolveConditionalCombatTactics(env.deps.normalizeCombatTacticsSettings(env.owner.settings), pStats, env.owner, now) : null;
    let options = buildGetSkillTargetPreference(env, tactics, now);
    let unseen = living.filter(enemy => !alive.includes(enemy));
    let targets = buildSelectCombatGemTargets(env, env.owner.activeSkill, skill, env.owner.gridPlayer, { enemies: alive, options: { ...options, dormant: dormant.concat(unseen) } });
    if (tactics && targets.length > 0 && String(targets[0].enemy.id) !== String(env.runtime.combatTacticsRuntime.targetId)) {
        env.runtime.combatTacticsRuntime.targetId = targets[0].enemy.id;
        env.runtime.combatTacticsRuntime.targetLockedUntil = now + COMBAT_TACTIC_TARGET_LOCK_MS;
    }
    return targets;
}

function skillWithFanShots(pStats) {
    const skill = pStats.sSkill, pattern = skill && skill.projectilePattern;
    if (!pattern || pattern.kind !== 'fan' || !(pStats.projectileExtraShots > 0)) return skill;
    const rays = Math.min(8, Math.max(1, Math.floor(pattern.rays || 1)) + Math.floor(pStats.projectileExtraShots));
    return { ...skill, targets: rays, projectilePattern: { ...pattern, rays } };
}
