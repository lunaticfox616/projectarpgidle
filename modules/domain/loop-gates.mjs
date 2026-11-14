import { loopFlowTriggerSeasonReset } from './loop-transition.mjs';
import { loopFlowResolveLoopAdvancePath, loopFlowClearLoopGate } from './loop-progress.mjs';

export function* loopFlowHandleSeasonLoopConditionMet(env, owner) {
    owner.pendingLoopReady = (owner.season || 1) < 10;
    owner.pendingLoopDecision = !owner.pendingLoopReady;
    // Reached while nobody watched (offline / hidden-tab replay): the auto-loop leaves this gate to the player.
    owner.loopGateOffline = !!owner.isBackgroundCalculation;
    owner.combatHalted = true;
    env.deps.clearDefeatedEncounter();
    (yield { kind: 'loopLog', args: [env.deps._t('루프 {value} 달성. 이번 여정의 기록과 다음 해금 요소를 확인하세요.', { value: owner.season || 1 }), 'season-up'] });
    (yield { kind: 'loopRefresh', args: [] });
}

export function* loopFlowConfirmLoopReady(env, owner) {
    if (!owner.pendingLoopReady) return;
    let available = typeof env.deps.getAvailableLoopAdvancePaths === 'function' ? env.deps.getAvailableLoopAdvancePaths(owner.season || 1) : [];
    if (available.length > 1) {
        owner.pendingLoopReady = false;
        owner.pendingLoopDecision = true;
        (yield { kind: 'loopLog', args: [env.deps._t('혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요.'), 'season-up'] });
        (yield { kind: 'loopRefresh', args: [] });
        return;
    }
    yield* loopFlowTriggerSeasonReset(env, owner);
}

export function* loopFlowChooseLoopAdvancePath(env, owner, path) {
    let loopPath = loopFlowResolveLoopAdvancePath(env, owner, path);
    if (!loopPath) return (yield { kind: 'loopLog', args: [env.deps.getLoopAbyssRequirementPrompt(owner.season || 1), 'attack-monster'] });
    yield* loopFlowTriggerSeasonReset(env, owner, { path: loopPath });
}

export function* loopFlowChooseLoopAdvance(env, owner, shouldLoop) {
    if (!owner.pendingLoopDecision) return;
    if (shouldLoop) {
        yield* loopFlowTriggerSeasonReset(env, owner, { path: 'chaos' });
        return;
    }
    loopFlowClearLoopGate(owner);
    (yield { kind: 'loopLog', args: [env.deps._t('♾️ 루프를 보류하고 혼돈 심화 등반을 이어갑니다. (혼돈 {max}부터 시작)', { max: Math.max(21, Math.floor((owner.abyssEndlessDepth || 20) + 1)) }), 'season-up'] });
    env.deps.enterNextEndlessChaosDepth();
}
