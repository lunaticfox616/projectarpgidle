/** 기억의 잎은 최초 발견형 저널이다. 보유 수량/교환은 없고 발견만 루프를 넘어 남는다.
 * 실제 획득과 저장 복원 모두 기존 저널 보너스 경로를 사용한다. 읽기는 보상을 주지 않는다. */
import { leafDefaults, leafNormalize, leafRollKill, leafReceive, leafMomentOf, leafBonusText, leafSourceText, leafGainedBetween, leafRestoreJournal } from './memory-leaves-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createMemoryLeaves(deps) {
    const env = { deps };
    env.BY_ID = new Map(env.deps.MEMORY_LEAVES.list.map(leaf => [leaf.id, leaf]));
    return Object.freeze({
        defaults: leafDefaults,
        normalize: (...args) => leafNormalize(env, ...args),
        rollKill: (...args) => leafRollKill(env, ...args),
        receive: (...args) => leafReceive(env, ...args),
        momentOf: leafMomentOf,
        bonusText: leafBonusText,
        sourceText: (...args) => leafSourceText(env, ...args),
        gainedBetween: (...args) => leafGainedBetween(env, ...args),
        restoreJournal: (...args) => leafRestoreJournal(env, ...args),
        leaf: id => env.BY_ID.get(id) || null,
        validId: id => env.BY_ID.has(id),
        list: env.deps.MEMORY_LEAVES.list
    });
}
