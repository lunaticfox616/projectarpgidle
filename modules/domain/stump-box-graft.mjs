import { stumpHighestLoop, stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpOf, stumpEditable } from './stump-box-state.mjs';
import { stumpGraftOpen, stumpGraftMaxRank } from './stump-box-unlocks.mjs';

// ── 접붙이기(7단계, 가지치기 자리) ─────────────────────────
// 점수는 저장하지 않는다: 최고 도달 루프가 startLoop 이상이면 루프마다 pointsPerLoop점, 쓴 점수는 칸 단계의 합(n단계에 n점).
export function stumpGraftCost(rank) { return rank * (rank + 1) / 2; }

/** Points from journal pages (STUMP_BOX_GRAFT.journalPoints), counted once per page. */
export function stumpGraftJournalPoints(env, state) {
    const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
    return Object.entries(env.deps.STUMP_BOX_GRAFT.journalPoints).reduce((sum, [id, points]) => sum + (journal.includes(id) ? points : 0), 0);
}

export function stumpGraftEarned(env, state) {
    return Math.max(0, stumpHighestLoop(state) - env.deps.STUMP_BOX_GRAFT.startLoop + 1) * env.deps.STUMP_BOX_GRAFT.pointsPerLoop + stumpGraftJournalPoints(env, state)
        + stumpGraftOverflowPoints(env, state);
}

/** 넘치는 해금 포인트(해금 카탈로그를 다 사고 남는 몫, contentProgression.overflow)도 접붙이기 점수가 된다(2026-10-09). */
export function stumpGraftOverflowPoints(env, state) { return env.deps.contentProgression.overflow(state); }

/** @returns {{earned: number, spent: number, free: number}} graft points. */
export function stumpGraftPoints(env, state) {
    const earned = stumpGraftEarned(env, state), spent = stumpOf(env, state).graft.reduce((sum, rank) => sum + stumpGraftCost(rank), 0);
    return { earned, spent, free: Math.max(0, earned - spent) };
}

/** '' when the cell can take one more rank, otherwise why not. */
export function stumpGraftRaiseReason(env, state, cell) {
    const next = stumpOf(env, state).graft[cell] + 1;
    if (!stumpGraftOpen(env, state)) return env.deps._t('접붙이기는 루프 {startLoop}부터 할 수 있습니다.', { startLoop: env.deps.STUMP_BOX_GRAFT.startLoop });
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    if (!stumpIsOpen(env, state, cell)) return '닫힌 칸입니다.';
    if (next > stumpGraftMaxRank(env, state)) return '이미 마지막 단계입니다.';
    return stumpGraftPoints(env, state).free >= next ? '' : env.deps._t('접붙이기 점수가 부족합니다. {next}단계에는 {next2}점이 필요합니다.', { next, next2: next });
}

export function stumpGraftRaise(env, state, cell) {
    if (stumpGraftRaiseReason(env, state, cell)) return false;
    stumpOf(env, state).graft[cell] += 1;
    return true;
}

/** '' when one rank can be taken back for blight spores (its points return). */
export function stumpGraftLowerReason(env, state, cell) {
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    if (stumpOf(env, state).graft[cell] < 1) return '접붙이지 않은 칸입니다.';
    const need = env.deps.STUMP_BOX_GRAFT.refundSpores;
    return (state.currencies.blightSpore || 0) >= need ? '' : env.deps._t('마름병 포자가 {need}개 필요합니다.', { need });
}

export function stumpGraftLower(env, state, cell) {
    if (stumpGraftLowerReason(env, state, cell)) return false;
    state.currencies.blightSpore -= env.deps.STUMP_BOX_GRAFT.refundSpores;
    stumpOf(env, state).graft[cell] -= 1;
    return true;
}
