import { tickGetAttackMotionMs, tickGetSkillCombatDelivery, tickCopyCombatGridCell, tickGetCombatTravelMs, tickGetStageIndexInShot } from './skill-delivery-rules.mjs';
import { PROJECTILE_RELEASE_SHARE } from './tick-values.mjs';
import { tickAddPendingSkillTravelFxRows } from './skill-travel-shots.mjs';

/** Schedules one attack-speed cycle. Double strikes share its time window.
 * Channel continuity follows absolute stage times, independently of visual/tick cadence.
 * @param {ReturnType<typeof getPlayerStats>} pStats
 * @param {ReturnType<typeof buildSkillHitSequence>} stages
 * @param {{skillName:string,forcedCrit:boolean,forcedElement:string,stageCount:number,talentAttackMultiplier:number,attackDamageMultiplier:number,channelContinuation:boolean,repeatChannelCast:boolean,landingMs:number}} context
 *   landingMs: actual airborne movement duration in combat milliseconds; zero when this attack did not move the hero.
 */
export function* tickQueuePlayerAttackSequence(env, pStats, stages, context) {
    const shots = env.deps.projectileShots.plan(context.skillName, pStats, stages);   // 더 나가는 발은 저마다 제 길로 난다. 다 나눴으니 타격 때 다시 늘지 않는다
    stages = shots || env.deps.supports.stages(stages, pStats.sSkill);
    if (shots) pStats = { ...pStats, projectileExtraShots: 0, uniqueProjExtraShotChance: null };
    env.deps.ascendancyNodeRules.onAttack(pStats, env.deps.getCombatTime()); // 흐르는 칼끝 중첩, 이중 폭발 굴림(공격마다 한 번)
    if (pStats.sSkill.nativeCastId) return env.deps.startSkillGemCombat(pStats, context);
    let tags = pStats.sSkill.tags || [], now = env.deps.getCombatTime();
    let motionMs = tickGetAttackMotionMs(tags);
    motionMs = Math.min(motionMs, Math.max(80, 800 / Math.max(0.01, pStats.aspd)));
    // Airborne mobility hits no earlier than landing (data/skills.js airMs, shared with the stage's jump/flip pose).
    motionMs = Math.max(motionMs, context.landingMs);
    let isChannel = tags.includes('channeling');
    let cycleMs = isChannel ? env.deps.getCombatChannelCycleMs(pStats.aspd) : 0;
    let timing = isChannel ? env.deps.beginCombatChannel(context.skillName, motionMs, cycleMs, context) : { id: 0, startAt: now + motionMs };
    let delayMs = timing.startAt - now, channelId = timing.id;
    let duration = Math.max(80, delayMs + cycleMs);
    let damageTextGroupId = env.runtime.nextPlayerDamageTextGroupId++;
    if (env.runtime.nextPlayerDamageTextGroupId > 1000000000) env.runtime.nextPlayerDamageTextGroupId = 1;
    env.deps.noteCombatTacticAttack(duration);
    const delivery = tickGetSkillCombatDelivery(pStats.sSkill);
    (yield { kind: 'addBattleFx', args: ['playerSwing', {
        color: env.deps.getElementColor(context.forcedElement), element: context.forcedElement,
        crit: context.forcedCrit, projectile: tags.includes('projectile'), kickoff: !!context.kickoff,
        combatTravel: delivery !== 'instantTarget',
        releaseDelayMs: delivery.startsWith('projectile') ? Math.floor(Math.max(0, delayMs) * PROJECTILE_RELEASE_SHARE) : undefined,
        skillName: context.skillName, sourceCell:tickCopyCombatGridCell(env, env.owner.gridPlayer), duration, impactDelayMs: Math.max(0, delayMs),
        // 옆으로만 치는 룬이 대상을 고를 때 정한 쪽(js/combat-grid.js band): 대상이 바로 위나 아래여도 무대의 주인공이 그 쪽을 본다
        bandSide: env.deps.getSkillBandSide(context.skillName, pStats.sSkill)
    }] });
    yield* tickQueuePendingSkillStageHits(env, isChannel ? env.deps.createContinuousChannelStages(stages, cycleMs) : stages, pStats, {
        ...context, channelId, channelCycleMs: cycleMs, baseDelayMs: delayMs, damageTextGroupId
    });
}

/** When a stage leaves and lands. A pierce is one shot: a victim past the first is hit when that shot reaches it, timed from the
 * caster's release. It used to be a new shot from the previous victim 30ms later, which paid the fixed launch time again, so the
 * later hits landed early and the image darted through them (2026-10-04, "맞고 더 빨라진다"). Collision still runs from the
 * previous victim (row.sourceCell).
 * @returns {{stageDelay:number, launchAt:number, at:number}} */
export function tickGetPendingStageTimes(env, stage, delivery, cells, timing) {
    const { now, baseDelay, skill } = timing;
    const through = delivery.startsWith('projectile') && stage.kind === 'pierceThrough';
    const stageDelay = (through ? 0 : Math.max(0, Math.floor(stage.delayMs))) + (Number(stage.shotDelayMs) || 0);
    if (delivery.startsWith('projectile')) {
        const launchAt = now + Math.floor(baseDelay * PROJECTILE_RELEASE_SHARE) + stageDelay;
        return { stageDelay, launchAt, at: launchAt + tickGetCombatTravelMs(env, through ? env.owner.gridPlayer : cells.source, cells.target, skill) + (Number(stage.holdMs) || 0) };
    }
    if (delivery === 'magicMoving') {
        const launchAt = now + baseDelay + stageDelay;
        return { stageDelay, launchAt, at: launchAt + Math.max(80, Number(skill.combatPattern.intervalMs) || 160) };
    }
    return { stageDelay, launchAt: now, at: now + baseDelay + stageDelay };
}

export function* tickQueuePendingSkillStageHits(env, stages, pStats, attackContext) {
    let now = env.deps.getCombatTime();
    let baseDelay = Number(attackContext.baseDelayMs) || 0;
    let delivery = tickGetSkillCombatDelivery(pStats && pStats.sSkill);
    let patternKind = pStats && pStats.sSkill && pStats.sSkill.combatPattern
        ? pStats.sSkill.combatPattern.kind : null;
    let queuedRows = [];
    let finalStageDelayMs = (stages || []).reduce((max, stage) => Math.max(max, Number(stage && stage.delayMs) || 0), 0);
    let channelDurationMs = Math.max(finalStageDelayMs, Math.floor(Number(attackContext.channelCycleMs) || 0));
    const batch = { now, baseDelay, delivery, patternKind, finalStageDelayMs, channelDurationMs, pStats, attackContext };
    (stages || []).forEach((stage, stageOffset) => {
        if (!stage || !Array.isArray(stage.targets) || stage.targets.length <= 0) return;
        const row = tickBuildQueuedStage(env, stage, stageOffset, batch);
        env.runtime.pendingSkillStageHits.push(row);
        queuedRows.push(row);
    });
    yield* tickAddPendingSkillTravelFxRows(env, queuedRows, attackContext, now);
}

function tickBuildQueuedStage(env, stage, stageOffset, batch) {
    const { pStats, attackContext, now, baseDelay, delivery, patternKind } = batch;
    let targetEntries = stage.targets.map(entry => ({ enemyId: entry.enemy.id, mult: Math.max(0, Number(entry.mult) || 1) }));
    let targetCells = tickQueuedStageCells(env, stage);
    let chainSource = stage.chainFromEnemyId != null ? (env.owner.enemies || []).find(enemy => enemy && enemy.id === stage.chainFromEnemyId) : null;
    let sourceCell = tickCopyCombatGridCell(env, chainSource || env.owner.gridPlayer);
    let stageDelivery = stage.delivery || (stage.kind.startsWith('moving') ? 'magicMoving' : delivery);
    let { stageDelay, launchAt, at } = tickGetPendingStageTimes(env, stage, stageDelivery, { source: sourceCell, target: targetCells[0] },
        { now, baseDelay, skill: pStats.sSkill });
    let row = {
        at, launchAt, holdMs: stage.holdMs,
        zoneId: env.owner.currentZoneId, pStats, delivery: stageDelivery, patternKind, sourceCell, targetCells, targetEntries, shot: stage.shot,
        contactState: {resolved: false}, whirl: stage.whirl, wave: stage.wave, advanceHero: !!stage.advanceHero,
        aimCell: tickCopyCombatGridCell(env, stage.aimCell),
        waveDurationMs: Math.max(0, Number(stage.waveDurationMs) || 0),
        channelId: Math.max(0, Math.floor(Number(attackContext.channelId) || 0)),
        fieldDurationMs: tickQueuedStageFieldDuration(batch),
        options: tickQueuedStageOptions(sourceCell, stage, stageOffset, attackContext, stageDelay)
    };
    row.options.attackFootprint = env.deps.getSkillStageFootprint(attackContext.skillName, pStats.sSkill, stage, sourceCell);
    row.contactSchedule = [{offsetMs: row.at - row.launchAt, state: row.contactState}];
    return row;
}

function tickQueuedStageCells(env, stage) {
    return Array.isArray(stage.impactCells) && stage.impactCells.length > 0
            ? stage.impactCells.map(cell => ({ gx: cell.gx, gy: cell.gy, mult: 1 }))
            : stage.targets.map(entry => ({ ...tickCopyCombatGridCell(env, entry.enemy), mult: Math.max(0, Number(entry.mult) || 1) })).filter(cell => Number.isInteger(cell.gx));
}

function tickQueuedStageFieldDuration(batch) {
    const { patternKind, baseDelay, channelDurationMs, finalStageDelayMs } = batch;
    return patternKind === 'channel' ? baseDelay + channelDurationMs + 120
                : (['field', 'meteor'].includes(patternKind) ? baseDelay + finalStageDelayMs + 320 : 0);
}

function tickQueuedStageOptions(sourceCell, stage, stageOffset, attackContext, stageDelay) {
    return {
        sourceCell, stageReplay: true, skipSlamEcho: stageOffset > 0, skillName: attackContext.skillName, channelId: attackContext.channelId, // 강타 여진은 첫 타격에서만
        forcedCrit: !!attackContext.forcedCrit, forcedElement: stage.element || attackContext.forcedElement,
        talentAttackMultiplier: tickStageAttackMultiplier(attackContext.talentAttackMultiplier),
        stageKind: stage.kind, stageLabel: stage.label, stageIndex: tickGetStageIndexInShot(stage, stageOffset), stageDelayMs: stageDelay, targetLimit: stage.targetLimit,
        stageCount: attackContext.stageCount, chainFromEnemyId: stage.chainFromEnemyId || null,
        stageRepeatOnce: !!stage.singleRepeat, skipGridControl: stage.skipGridControl,
        restrictRandomTargets: !!stage.singleRepeat,
        primaryAilmentChance: tickStageAilmentChance(stage.primaryAilmentChance),
        talentMoonReturn: attackContext.talentMoonReturn || null,
        attackHitGuardCounts: attackContext.attackHitGuardCounts,
        damageTextGroupId: attackContext.damageTextGroupId ? `${attackContext.damageTextGroupId}:${stageOffset}` : '',
        hitDamageMultiplier: Math.max(0, Number(stage.damageMultiplier) || 0),
        attackDamageMultiplier: tickStageAttackMultiplier(attackContext.attackDamageMultiplier),
        passiveKarmaContext: attackContext.passiveKarmaContext || null
    };
}

function tickStageAttackMultiplier(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 1;
}

function tickStageAilmentChance(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : undefined;
}
