import { getHeldHallLoopBlockReason } from './equipment-hall.mjs';

export function loopFlowAwardLoopProgressPoints(owner) {
    owner.loopProgressBase = owner.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    owner.loopProgressCurrent = owner.loopProgressCurrent || { specialBosses: [] };
    const { nowDepth, depthGain } = settledAbyssProgress(owner);
    const { baseLab, nowLab, labGain } = settledLabyrinthProgress(owner);
    let baseBosses = new Set(Array.isArray(owner.loopProgressBase.specialBosses) ? owner.loopProgressBase.specialBosses : []);
    let newBosses = (Array.isArray(owner.loopProgressCurrent.specialBosses) ? owner.loopProgressCurrent.specialBosses : []).filter(id => !baseBosses.has(id));
    let bonus = (depthGain * 2) + Math.floor(labGain / 5) + (newBosses.length * 3);
    let woodsmanScore = Math.max(0, Math.floor(owner.woodsmanPendingScore || 0));
    let woodsmanSettled = Math.max(0, Math.floor(owner.woodsmanSettledScore || 0));
    let woodsmanDelta = Math.max(0, woodsmanScore - woodsmanSettled);
    let woodsmanGain = Math.floor(Math.sqrt(woodsmanDelta) / 25);
    bonus += woodsmanGain;
    if (bonus > 0) owner.loopDeepPoints = Math.max(0, Math.floor(owner.loopDeepPoints || 0)) + bonus;
    // 미궁은 5층마다 1점: 남은 층은 다음 루프로 넘긴다(2026-10-19 전에는 루프마다 버려 4층씩 오르면 점수가 없었다)
    owner.loopProgressBase = { abyssEndlessDepth: nowDepth, labyrinthUnlockedMaxFloor: Math.min(nowLab, baseLab + Math.floor(labGain / 5) * 5), specialBosses: Array.from(new Set([...(Array.isArray(owner.loopProgressBase.specialBosses) ? owner.loopProgressBase.specialBosses : []), ...newBosses])) };
    owner.loopProgressCurrent = { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] };
    owner.woodsmanSettledScore = Math.max(woodsmanSettled, woodsmanScore);
    owner.woodsmanPendingScore = owner.woodsmanSettledScore;
    return { bonus, depthGain, labGain, bossGain: newBosses.length, woodsmanGain: woodsmanGain, woodsmanScore: woodsmanScore, woodsmanDelta: woodsmanDelta };
}

function settledAbyssProgress(owner) {
    const baseDepth = Math.max(20, Math.floor(owner.loopProgressBase.abyssEndlessDepth || 20));
    const unlockedDepths = Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    const highestUnlocked = unlockedDepths.length > 0 ? Math.max(...unlockedDepths) : Math.max(20, Math.floor(owner.abyssEndlessDepth || 20));
    const nowDepth = Math.max(20, highestUnlocked >= 21 ? (highestUnlocked - 1) : highestUnlocked);
    return { nowDepth, depthGain: Math.max(0, nowDepth - baseDepth) };
}

function settledLabyrinthProgress(owner) {
    const baseLab = Math.max(1, Math.floor(owner.loopProgressBase.labyrinthUnlockedMaxFloor || 1));
    const nowLab = Math.max(1, Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    return { baseLab, nowLab, labGain: Math.max(0, nowLab - baseLab) };
}

export function loopFlowResolveLoopAdvancePath(env, owner, requestedPath) {
    let requested = ['cosmos', 'chaos'].includes(requestedPath) ? requestedPath : null;
    let available = typeof env.deps.getAvailableLoopAdvancePaths === 'function'
        ? env.deps.getAvailableLoopAdvancePaths(owner.season || 1)
        : (typeof env.deps.hasCurrentLoopAbyssRequirementClear === 'function' && env.deps.hasCurrentLoopAbyssRequirementClear(owner.season || 1) ? ['chaos'] : []);
    if (requested) return available.includes(requested) ? requested : null;
    if (available.length === 1) return available[0];
    return null;
}

export function loopFlowGetLoopAdvancePathLabel(path) {
    return path === 'cosmos' ? '우주계 루프' : '혼돈 루프';
}

export function loopFlowGetHeldGearLoopBlockReason(env, owner) {
    const stallReason = typeof env.deps.playerStall === 'object' ? env.deps.playerStall.loopBlockReason(owner) : '';
    if (stallReason) return stallReason;
    return getHeldHallLoopBlockReason(env.deps.hallState, env.deps.hallUserId, env.deps._t);
}

export function loopFlowGetSeasonResetBlockReason(env, owner, loopPath) {
    const heldReason = loopFlowGetHeldGearLoopBlockReason(env, owner);
    if (heldReason) return heldReason;
    const season = owner.season || 1;
    if (season < 31 || loopPath) return '';
    let available = typeof env.deps.getAvailableLoopAdvancePaths === 'function' ? env.deps.getAvailableLoopAdvancePaths(season) : [];
    return available.length > 1
        ? '혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요.'
        : env.deps.getLoopAbyssRequirementPrompt(season);
}

export function loopFlowClearLoopGate(owner) {
    owner.pendingLoopDecision = false;
    owner.pendingLoopReady = false;
    owner.loopGateOffline = false;
}

export function loopFlowDeepPointsNow(owner) { return Math.max(0, Math.floor(owner.loopDeepPoints || 0)); }
