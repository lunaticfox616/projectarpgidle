import { tickPickWhirlSpinTargets, tickPickWaveFrontTargets, tickGetPendingSkillImpactTargets } from './skill-contact-targets.mjs';

/** 집중 룬의 advanceCells(2026-10-17 인계의 전도성 난격이 썼다. 2026-10-19 v36부터 쓰는 룬 없음): 난격하는 동안 겨눈 쪽으로 한 칸 걸어
 * 나간다(진짜 걸음). 막혔거나 이미 붙어 있으면 그 자리에 선다. */
export function tickAdvanceHeroForStage(env, row) {
    if (!row.advanceHero) return;
    const aim = row.aimCell || (row.targetCells && row.targetCells[0]);
    if (!aim || !env.deps.hasGridCell(env.owner.gridPlayer) || env.deps.getGridUnitDistance(env.owner.gridPlayer, aim) <= 1) return;
    if (env.deps.actExplorationState.current(env.owner)) env.deps.beginExplorationGridStep(aim, env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec);
    else env.deps.gridStepToward(env.owner.gridPlayer, aim.gx, aim.gy, env.deps.getGridBlockedCells(env.owner.gridPlayer));
}

export function tickProcessPendingSkillStageHits(env) {
    if (env.runtime.pendingSkillStageHits.length <= 0) return;
    let now = env.deps.getCombatTime();
    let ready = [];
    let next = [];
    env.runtime.pendingSkillStageHits.forEach(row => {
        if (!row || row.at > now) next.push(row);
        else ready.push(row);
    });
    env.runtime.pendingSkillStageHits = next;
    ready.sort((a, b) => a.at - b.at).forEach(row => {
        if (row && row.contactState) row.contactState.resolved = true;
        if (!row || row.zoneId !== env.owner.currentZoneId || !row.pStats) return;
        let targets = row.whirl ? tickPickWhirlSpinTargets(env, row) : (row.wave ? tickPickWaveFrontTargets(env, row) : tickGetPendingSkillImpactTargets(env, row));
        env.deps.actExplorationProgress.objects.stage(row);
        tickAdvanceHeroForStage(env, row);
        env.deps.supports.repeatReleased(row); // 이중 발동, 이중 시전의 두 번째 발동 연출(맞을 적이 없어도)
        if (targets.length <= 0) return;
        env.deps.performPlayerAttack(row.pStats, {
            ...(row.options || {}),
            targetEntries: targets.map(entry => ({ enemyId: entry.enemy.id, mult: entry.mult }))
        });
    });
}
