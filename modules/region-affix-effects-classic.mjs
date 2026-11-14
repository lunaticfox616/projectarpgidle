import { regionAfterHit, regionOnEnemyDeath } from './combat/region-affix-procs.mjs';

// The shared stats owner already serves mitigation and player stats. Retire this bridge with its classic consumers.
const stats = window.GameModules.combat.resources.regionAffixes;
const env = { get owner() { return game; }, stats, rules: REGION_AFFIX_EFFECTS, deps: {
    get getGridUnitDistance() { return getGridUnitDistance; },
    get getZone() { return getZone; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get loopMutation() { return loopMutation; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getElementColor() { return getElementColor; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get getCombatTime() { return getCombatTime; },
    get addPlayerLeechInstance() { return addPlayerLeechInstance; },
    get getPlayerHitLeechTarget() { return getPlayerHitLeechTarget; },
    get cloneEnemyAilmentForSpread() { return cloneEnemyAilmentForSpread; },
    get mergeEnemyAilment() { return mergeEnemyAilment; }
} };

function runCommands(commands) {
    let step = commands.next();
    while (!step.done) step = commands.next(addBattleFx(...step.value.args));
    return step.value;
}

const regionAffixEffects = Object.freeze({
    collect(sum) { return stats.collect(sum); },
    resistanceShred(pStats, enemy, element) { return stats.resistanceShred(pStats, enemy, element); },
    damageMultiplier(pStats, enemy, element, isCrit) { return stats.damageMultiplier(pStats, enemy, element, isCrit, game); },
    afterHit(pStats, enemy, hit) { return runCommands(regionAfterHit(env, pStats, enemy, hit)); },
    extraAilmentChances(pStats) { return stats.extraAilmentChances(pStats); },
    ailmentDurationMultiplier(pStats, type) { return stats.ailmentDurationMultiplier(pStats, type); },
    onEnemyDeath(enemy, pStats) { return runCommands(regionOnEnemyDeath(env, enemy, pStats)); },
    onBlock(pStats, now) { return stats.onBlock(pStats, now, game); },
    consumeBlockEmpower(now) { return stats.consumeBlockEmpower(now, game); },
    takenDamageMultiplier(pStats, attacker) { return stats.takenDamageMultiplier(pStats, attacker, game); },
    moveBonus(now) { return stats.moveBonus(now, game); },
    hasAilment: stats.hasAilment
});
safeExposeGlobals({ regionAffixEffects });
