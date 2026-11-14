import { loopFlowResolveLoopAdvancePath, loopFlowGetSeasonResetBlockReason, loopFlowClearLoopGate, loopFlowDeepPointsNow, loopFlowAwardLoopProgressPoints } from './loop-progress.mjs';
import { loopFlowEndWoodsmanFightForLoop } from './loop-woodsman-entry.mjs';
import { loopFlowCloseLoopMap, loopFlowResetLoopProgress, loopFlowResetLoopBuild, loopFlowResetLoopItems, loopFlowResetLoopContents, loopFlowApplyLoopSettings } from './loop-reset-state.mjs';
import { loopFlowGetLoopCodexReveal, loopFlowCaptureLoopKeptState } from './loop-preservation.mjs';
import { loopFlowAdvanceLoopCounters, loopFlowQueueLoopArrivalNotices, loopFlowGetLoopSettleLogLine } from './loop-arrival.mjs';
import { loopFlowRequestLoopHeroSelection } from './loop-hero-selection.mjs';

export function* loopFlowTriggerSeasonReset(env, owner, options) {
    let loopPath = loopFlowResolveLoopAdvancePath(env, owner, typeof options === 'string' ? options : (options && options.path));
    let blockedReason = loopFlowGetSeasonResetBlockReason(env, owner, loopPath);
    if (blockedReason) {
        (yield { kind: 'loopLog', args: [blockedReason, 'attack-monster'] });
        return false;
    }
    if (!loopPath) loopPath = 'chaos';
    yield { kind: 'loopCloseReward', args: [] };
    yield* loopFlowEndWoodsmanFightForLoop(env, owner);
    loopFlowClearLoopGate(owner);
    loopFlowCloseLoopMap(env, owner);
    owner.pendingLoopHeroSelection = true;
    let codexReveal = loopFlowGetLoopCodexReveal(owner);
    // 전적: 상태를 초기화하기 전에 이번 루프 기록(소요 시간·도달 액트·액트별 돌파 시간)을 닫는다.
    if (typeof env.deps.closeLoopRecord === 'function') env.deps.closeLoopRecord(loopPath);
    (yield { kind: 'loopEvent', args: ['loop-rewrite-started'] });
    const kept = loopFlowCaptureLoopKeptState(env, owner);
    let loopDeepBeforeReset = loopFlowDeepPointsNow(owner);
    let loopReward = loopFlowAwardLoopProgressPoints(owner);
    let loopDeepExpectedAfterSettle = loopFlowDeepPointsNow(owner);
    yield* loopFlowAdvanceLoopCounters(env, owner, loopPath);
    loopFlowQueueLoopArrivalNotices(env, owner);
    (yield { kind: 'loopLog', args: [...loopFlowGetLoopSettleLogLine(env, loopReward)] });
    loopFlowResetLoopProgress(owner);
    loopFlowResetLoopBuild(env, owner);
    loopFlowResetLoopItems(env, owner, kept, codexReveal);
    loopFlowResetLoopContents(env, owner, kept);
    loopFlowApplyLoopSettings(owner);
    owner.loopDeepPoints = Math.max(loopDeepBeforeReset, loopDeepExpectedAfterSettle);
    yield* grantLoopCodexStarter(env, owner);
    owner.enemies = [];
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.runProgress = 0;
    yield { kind: 'loopResetStall', args: [] };
    env.deps.clearCraftSelection();
    env.deps.applySeasonContentProgression({ silent: false });
    yield { kind: 'loopPassiveReachable', args: [] };
    (yield { kind: 'loopPassiveVisibility', args: [] });
    let presetInvest = typeof env.deps.runPassiveTreeAutoInvest === 'function' ? env.deps.runPassiveTreeAutoInvest() : { nodes: 0 };
    if (presetInvest.nodes > 0) (yield { kind: 'loopLog', args: [env.deps._t('🧭 새 루프 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: presetInvest.nodes }), 'season-up'] });
    owner.playerHp = env.deps.getPlayerHpCap(env.deps.getPlayerStats());
    env.deps.ensureActJournalCompletionForLoop({ silent: false });
    (yield { kind: 'loopLog', args: [env.deps._t('🌟 [루프 포인트 1점] 획득. 밝혀낸 성좌 지형은 유지됩니다.'), "season-up"] });
    yield { kind: 'loopBarkNotice', args: [] };
    (yield { kind: 'loopCheckUnlocks', args: [] });
    (yield { kind: 'loopSave', args: [{ skipCloudSync: true }] });
    (yield { kind: 'loopCloudSave', args: ['루프 진행'] });
    yield* loopFlowRequestLoopHeroSelection(owner);
}

function* grantLoopCodexStarter(env, owner) {
    const reward = env.deps.grantCodexStarter(owner);
    if (reward) yield { kind: 'loopCodexRewardNotice', args: [reward] };
}
