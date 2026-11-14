import { castNoteNativeGemSwing } from './player-cast-effects.mjs';
import { castApplySkillGemCommand } from './player-cast-commands.mjs';

/** Combat owns damage and movement; gem controllers only return scheduled commands. */
export function* castStartSkillGemCombat(env, stats, options) {
    env.nativeCasts ??= env.deps.skillGemCasts.createState();
    const name=options.skillName || env.owner.activeSkill;
    castInitializeSkillGemFacing(env);
    if (castSkillGemRuntimeChanged(env, name)) env.nativeCasts=env.deps.skillGemCasts.createState();
    const started=env.deps.skillGemCasts.start(env.nativeCasts,{id:stats.sSkill.nativeCastId,name,stats,
        source:env.owner.gridPlayer,enemies:env.owner.enemies,now:env.deps.getCombatTime(),visuals:!env.owner.isBackgroundCalculation,
        attackOptions:{forcedCrit:options.forcedCrit,forcedElement:options.forcedElement,
            attackDamageMultiplier:options.attackDamageMultiplier,talentAttackMultiplier:options.talentAttackMultiplier,
            passiveKarmaContext:options.passiveKarmaContext}});
    if (!started) return;
    yield* castNoteNativeGemSwing(env, name, stats);
    env.deps.noteCombatTacticAttack(300);
}

export function castShouldDeferNativeGemCast(env, stats,options) {
    if (options.stageReplay || !stats.sSkill.nativeCastId) return false;
    if (env.deps.hasPlayerChannelBreakingAilment() || env.owner.combatHalted) return true;
    if (!env.nativeCasts) return false;
    return env.deps.skillGemCasts.singleCast.has(stats.sSkill.nativeCastId) && env.nativeCasts.casts.some(c=>c.id===stats.sSkill.nativeCastId);
}

export function castGetAttackProjectileShots(env, stats) {
    return stats.sSkill.nativeCastId ? stats.projectileExtraShots : env.deps.rollProjectileExtraShots(stats.projectileExtraShots);
}

export function* castUpdateSkillGemCombat(env, stats) {
    const runtime=env.nativeCasts;
    if (!runtime) return;
    if (env.owner.combatHalted || env.owner.playerHp<=0 || castSkillGemRuntimeChanged(env, env.owner.activeSkill)) {
        env.nativeCasts=null;env.deps.cancelCombatChannel();return;
    }
    const commands=env.deps.skillGemCasts.update(runtime,{source:env.owner.gridPlayer,enemies:env.owner.enemies.concat(env.deps.getSplashDormantEnemies()),now:env.deps.getCombatTime()});
    for (const command of commands) yield* castApplySkillGemCommand(env, command,stats);
}

/** The main gem's native casts, then the mobility slot's own (js/mobility-skill.js). */
export function* castAdvanceSkillGemCasts(env, stats) {
    env.deps.supports.tickDots();
    yield* castUpdateSkillGemCombat(env, stats);
    env.deps.mobilitySkill.advance();
}

export function castSkillGemRuntimeChanged(env, name) {
    return !!env.nativeCasts.lastSkill && env.nativeCasts.lastSkill!==name;
}

export function castInitializeSkillGemFacing(env) {
    for (const enemy of env.owner.enemies) if (!enemy.facingDirection) enemy.facingDirection=env.deps.skillGemCasts.facing(enemy,env.owner.gridPlayer);
}
