import { rememberSupportHit, supportDotContacts, planCorpseExplosion } from '../domain/support-damage.mjs';

export function liveSupportResolve(env, skill) { return env.deps.shapes.resolve(skill, env.owner); }

export function liveSupportStages(env, rows, skill) { return env.deps.contacts.stages(rows, skill, env.owner); }

export function liveSupportRepeatNative(env, command, targets) {
    const request = env.deps.contacts.repeat(command, targets);
    if (request) env.deps.queuePendingSkillStageHits(request.rows, request.stats, request.options);
}

export function liveSupportAugmentNative(env, command, targets) {
    const request = env.deps.contacts.augment(command, targets, env.owner);
    if (request) env.deps.queuePendingSkillStageHits(request.rows, request.stats, request.options);
}

/** The combat slot swap is a cast context, not an equipment edit; domain fitting still checks its weapon. */
export function liveSupportActiveSkillStats(env, bonus) {
    const mobility=typeof env.deps.mobilitySkill==='object' && env.deps.mobilitySkill.mainGem()!==env.owner.activeSkill;
    return liveSupportResolve(env, env.deps.getActiveSkillStats(bonus,mobility));
}

/** The hero's hit (js/combat-player-attack.js); ascendancy node rules read and change it on the way (js/ascendancy-node-rules.js). */
export function liveSupportDealHit(env, enemy,stats,damage) {
    const now=env.deps.getCombatTime();
    const dealt=env.deps.applyDamageToEnemyResource(enemy,env.deps.ascendancyNodeRules.beforeHit(damage*env.deps.targetMultiplier(enemy,stats.sSkill),enemy,stats,now));
    liveSupportAfterHit(env, enemy,stats,dealt);
    env.deps.ascendancyNodeRules.afterHit(stats,enemy,dealt,now);
    return dealt;
}

export function liveSupportDeferAttack(env, stats,options) {
    return liveSupportConversionContacts(env, stats,options) || env.deps.shouldDeferNativeGemCast(stats,options);
}

export function* liveSupportRetire(env, enemy) { env.deps.retireDeadEnemyAttacks(enemy); yield* liveSupportOnDeath(env, enemy); }

/** 반복 단계 하나가 제 때를 맞았다(js/combat-tick.js processPendingSkillStageHits, 맞을 적이 없어도): 무대가 두 번째 발동의 연출을 그리게 알린다
     * (js/canvas-stage-skill-rules.js ruleNoteRepeat, 한 공격에 한 번). 날아가는 반복은 떠나는 순간을 그 날아가는 기록이 먼저 알린다. 그리기만 한다. */
export function* liveSupportRepeatReleased(env, row) {
    const options=row.options,skill=row.pStats.sSkill;
    if(options.stageKind!=='supportRepeat' || env.owner.isBackgroundCalculation)return;
    yield { effect: ['supportEcho',{skillName:skill.visualName || options.skillName,element:options.forcedElement || skill.ele,stageKind:options.stageKind,
        damageTextGroupId:options.damageTextGroupId,sourceCell:options.sourceCell,attackFootprint:options.attackFootprint,duration:420}] };
}

/** 속성을 모두(100%) 바꾸는 변환: 바뀐 속성으로 한 번 친다. 일부(50%, 75%)는 그대로 한 번 치고 적중 안에서 나눈다(splitConversion). */
export function liveSupportConversionContacts(env, stats, options) {
    const fx=stats.sSkill.supportEffects?.conversion;
    if (!options.stageReplay || options.supportConverted || !fx || fx.pct < 100) return false;
    env.deps.performPlayerAttack({...stats,sSkill:{...stats.sSkill,ele:fx.element}},{...options,supportConverted:true,forcedElement:fx.element});
    return true;
}

export function liveSupportAfterHit(env, enemy, stats, damage) {
    rememberSupportHit(enemy, stats, damage, env.deps.getCombatTime);
}

export function* liveSupportTickDots(env) {
    for (const { enemy, row, damage } of supportDotContacts(env.owner.enemies, env.deps.getCombatTime())) {
        const dealt = env.deps.applyDamageToEnemyResource(enemy, damage);
        enemy.supportDeathSource = row.stats;
        if (dealt > 0) yield { effect: ['hit', { enemyId: enemy.id, damage: dealt, element: row.element, dot: true, noLine: true, duration: 200 }] };
        if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, row.stats);
    }
}

export function* liveSupportOnDeath(env, enemy) {
    const plan = planCorpseExplosion(enemy, env.owner.enemies, { random: env.deps.random, distance: env.deps.getGridUnitDistance });
    if (!plan) return;
    const source = plan.source;
    for (const other of plan.targets) {
        const mitigation = env.deps.getEffectiveEnemyMitigation(source.sSkill.ele, env.deps.getZone(env.owner.currentZoneId).tier, other, source);
        const damage = enemy.maxHp * plan.lifePct / 100 * (1 - mitigation / 100) * env.deps.loopMutation.takenMul(other, source.sSkill.ele);
        const dealt = env.deps.applyDamageToEnemyResource(other, damage);
        other.supportDeathSource = source;
        yield { effect: ['hit', { enemyId: other.id, damage: dealt, element: source.sSkill.ele, noLine: true, duration: 300 }] };
        if (other.hp <= 0) env.deps.handleEnemyDeath(other, source);
    }
    yield { effect: ['corpseExplosion', { enemyId: enemy.id, sourceCell: { gx: enemy.gx, gy: enemy.gy }, element: source.sSkill.ele, duration: 400 }] };
}
