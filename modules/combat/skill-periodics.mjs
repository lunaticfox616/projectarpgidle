import { SKILL_PERIODIC_CHAIN_CAP } from '../data/skill-combat-values.mjs';

export function hitQueueSkillPeriodicHit(enemy, config, damage, ele, visual) {
    if (!config || enemy.hp <= 0 || !periodicProcSucceeds(config)) return;
    enemy.skillPeriodics = Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : [];
    let queuedHits = enemy.skillPeriodics.reduce((sum, fx) => sum + Math.max(0, fx.hitsLeft || 0), 0);
    let allowedHits = Math.max(0, SKILL_PERIODIC_CHAIN_CAP - queuedHits);
    if (allowedHits <= 0) return;
    enemy.skillPeriodics.push(periodicHitEntry(config, damage, ele, visual, allowedHits));
}

function periodicHitEntry(config, damage, ele, visual, allowedHits) {
    let hits = Math.min(Math.max(1, Math.floor(config.hits || 1)), allowedHits);
    let interval = Math.max(0.05, Number(config.interval) || 1);
    return {
        hitsLeft: hits, visual,
        interval: interval,
        timer: interval,
        damage: Math.max(1, Math.floor(damage * Math.max(0, Number(config.damagePct) || 0) / 100)),
        ele: config.ele || ele || 'phys'
    };
}

function periodicProcSucceeds(config) {
    return !(Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0)));
}

export function hitApplySkillPeriodicOnHit(env, enemy, skill, damage, skillName) {
    hitQueueSkillPeriodicHit(enemy, skill.periodicOnHit, damage, skill.ele, {skillName,sourceCell:env.deps.copyCombatGridCell(env.owner.gridPlayer)});
}

/** Native confirmedPeriodic/confirmedTransfer contract; only called after a real resolution. */
export function* hitAddConfirmedSkillEffect(env, kind, visual, target, element) {
    if (!visual?.skillName || !env.deps.hasGridCell(target) || !env.deps.hasGridCell(visual.sourceCell)) return;
    (yield { kind: 'addBattleFx', args: ['combatTravel', {owner:'player',delivery:kind,skillName:visual.skillName,
        sourceCell:visual.sourceCell,targetCells:[env.deps.getGridUnitCenter(target)],element,
        duration:kind==='confirmedPeriodic' ? 180 : 220}] });
}

export function hitApplySupportEchoOnHit(enemy, pStats, damage) {
    let echoPower = pStats.echoPower || 0;
    if (echoPower <= 0) return;
    let config = {
        chance: Math.min(0.6, 0.2 + echoPower / 100),
        hits: 2 + Math.floor(echoPower / 20),
        interval: 0.45,
        damagePct: 15 + echoPower * 0.6
    };
    hitQueueSkillPeriodicHit(enemy, config, damage, pStats.sSkill && pStats.sSkill.ele);
}

export function* hitTickEnemySkillPeriodicEffects(env, pStats, dt) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    const enemies = env.owner.enemies || [], count = enemies.length;
    for (let i = 0; i < count; i++) {
        if (!(i in enemies)) continue;
        yield* tickEnemyPeriodics(env, enemies[i], pStats, { dt, zoneTier });
    }
}

function* tickEnemyPeriodics(env, enemy, pStats, tick) {
    const effects = enemy && enemy.hp > 0 && Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : null;
    if (!effects || effects.length <= 0) return;
    const count = effects.length;
    for (let i = 0; i < count; i++) {
        if (!(i in effects)) continue;
        yield* tickPeriodicEffect(env, enemy, effects[i], pStats, tick);
    }
    enemy.skillPeriodics = effects.filter(fx => fx.hitsLeft > 0 && enemy.hp > 0);
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
}

function* tickPeriodicEffect(env, enemy, effect, pStats, tick) {
    if (effect.hitsLeft <= 0 || enemy.hp <= 0) return;
    effect.timer -= tick.dt;
    while (effect.timer <= 0 && effect.hitsLeft > 0 && enemy.hp > 0) {
        effect.timer += effect.interval;
        effect.hitsLeft--;
        const mitigation = env.deps.getEffectiveEnemyMitigation(effect.ele, tick.zoneTier, enemy, pStats);
        const periodicMul = env.deps.ascendancyNodeRules.dotMultiplier(env.deps.getCombatTime());
        env.deps.applyDamageToEnemyResource(enemy, Math.floor(Math.max(1, Math.floor(effect.damage * (1 - mitigation / 100) * periodicMul)) * env.deps.loopMutation.takenMul(enemy, effect.ele)));
        yield* hitAddConfirmedSkillEffect(env, 'confirmedPeriodic', effect.visual, enemy, effect.ele);
    }
}
