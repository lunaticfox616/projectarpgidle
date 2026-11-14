import { tickGetSkillCombatDelivery, tickCopyCombatGridCell, tickGetPendingSkillTravelCellMs } from './skill-delivery-rules.mjs';
import { CHAIN_HOP_MS } from './tick-values.mjs';

/** Visual anchors are independent of integer collision cells and contact times. */
export function tickGetSkillTravelVisualEndpoints(env, row) {
    if (row.delivery !== 'projectileTarget' || row.travelPath || row.patternKind === 'boomerang') {
        return { sourceCell: row.sourceCell, targetCells: row.targetCells };
    }
    const enemies = env.owner.enemies || [];
    const source = enemies.find(enemy => enemy.id === row.options.chainFromEnemyId);
    const targetCells = row.targetCells.map((cell, index) => {
        const target = enemies.find(enemy => enemy.id === row.targetEntries[index]?.enemyId);
        return env.deps.hasGridCell(target) ? env.deps.getGridUnitCenter(target) : cell;
    });
    return { sourceCell: env.deps.hasGridCell(source) ? env.deps.getGridUnitCenter(source) : row.sourceCell, targetCells };
}

export function* tickAddChainHopTravelFx(env, row, attackContext, now) {
    const kind = row.options.stageKind, from = row.options.chainFromEnemyId;
    // 투사체 태그나 관통으로 나는 룬(빙결 파열창은 주문 태그뿐이다)
    if (!['supportChain', 'chainJump'].includes(kind) || from == null || !tickGetSkillCombatDelivery(row.pStats.sSkill).startsWith('projectile')) return;
    const source = (env.owner.enemies || []).find(enemy => enemy && enemy.id === from);
    if (!source || !env.deps.hasGridCell(source)) return;
    tickDelayChainHopAfterSource(env, row, from);
    const flightMs = Math.max(1, Math.min(CHAIN_HOP_MS, row.at - now));
    (yield { kind: 'addBattleFx', args: ['combatTravel', { owner: 'player', delivery: 'projectileTarget', chainHop: true, stageKind: kind, stageIndex: row.options.stageIndex,
        sourceCell: tickCopyCombatGridCell(env, source), targetCells: row.targetCells, targetIds: row.targetEntries.map(entry => entry.enemyId),
        skillName: attackContext.skillName, damageTextGroupId: row.options.damageTextGroupId, element: row.options.forcedElement,
        releaseDelayMs: Math.max(0, row.at - flightMs - now), flightMs, duration: Math.max(260, row.at - now + 260) }] });
}

/** 앞 적을 친 단계(이번 단계보다 늦지 않은 것 가운데 가장 늦은 것) 뒤 CHAIN_HOP_MS에 닿게 이번 연쇄 단계를 미룬다. 둘째 연쇄는 미뤄진 첫 연쇄를 따른다. */
export function tickDelayChainHopAfterSource(env, row, sourceId) {
    const sourceAt = env.runtime.pendingSkillStageHits.reduce((latest, other) => (other !== row && other.at < row.at + CHAIN_HOP_MS
        && (other.targetEntries || []).some(entry => entry.enemyId === sourceId) ? Math.max(latest, other.at) : latest), -Infinity);
    const late = sourceAt + CHAIN_HOP_MS - row.at;
    if (!(late > 0)) return;
    row.at += late;
    row.launchAt += late;
}

export function* tickAddPendingSkillTravelFx(env, row, attackContext, now) {
    if (!row) return;
    if (row.delivery === 'instantTarget') { yield* tickAddChainHopTravelFx(env, row, attackContext, now); return; }
    if (['field', 'channel', 'meteor'].includes(row.patternKind) && row.options.stageIndex > 0) return;
    const visual = tickSkillTravelVisuals(env, row);
    let fx = {
        owner: 'player', channelId: row.channelId,
        delivery: row.delivery,
        patternKind: row.patternKind, stageKind: row.options.stageKind, stageIndex: row.options.stageIndex, stageDelayMs: row.options.stageDelayMs,
        sourceCell: visual.sourceCell,
        aimCell: tickTravelAimCell(env, row, visual.targetCells),
        targetCells: visual.targetCells, travelPath: row.travelPath,
        contactSchedule: row.contactSchedule,
        attackFootprint: row.options.attackFootprint,
        targetIds: visual.targetIds,
        skillName: attackContext.skillName, damageTextGroupId: row.options.damageTextGroupId,
        element: row.options.forcedElement,
        releaseDelayMs: Math.max(0, row.launchAt - now),
        flightMs: Math.max(1, row.at - row.launchAt),
        travelCellMs: tickGetPendingSkillTravelCellMs(env, row),
        waveDurationMs: Math.max(0, Number(row.waveDurationMs) || 0),
        duration: row.fieldDurationMs || Math.max(260, row.at - now + 260)
    };
    (yield { kind: 'addBattleFx', args: ['combatTravel', fx] });
}

function tickSkillTravelVisuals(env, row) {
    const boomerangReturn = row.patternKind === 'boomerang' && row.options.stageKind === 'boomerangReturn';
    const visual = tickGetSkillTravelVisualEndpoints(env, row);
    visual.targetIds = row.targetEntries.map(entry => entry.enemyId);
    if (row.patternKind === 'boomerang') {
        visual.targetCells = boomerangReturn ? [tickCopyCombatGridCell(env, env.owner.gridPlayer)] : row.targetCells.slice(-1);
        visual.targetIds = boomerangReturn ? [] : visual.targetIds.slice(-1);
    }
    return visual;
}

function tickTravelAimCell(env, row, visualTargetCells) {
    return tickCopyCombatGridCell(env, row.aimCell) || tickCopyCombatGridCell(env, (env.owner.enemies || []).find(enemy => enemy
        && row.targetEntries[0] && String(enemy.id) === String(row.targetEntries[0].enemyId))) || visualTargetCells[0];
}
