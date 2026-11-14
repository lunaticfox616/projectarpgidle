// 기억 던전(12번 루프 21, 2026-10-08, data/memory-dungeon.js): 아틀라스 보스의 기억(1~5단계)을 모으고, 그 보스만 있는 투기장 싸움을
// 연다. 상태는 game.atlas.memory { tickets: {노드 id: [1단계 수, ..., 5단계 수]}, best: {노드 id: 이긴 가장 높은 단계} }: 루프와
// 시대 재생을 넘어 남는다. 싸움은 지도 장치 런 그대로(js/atlas.js beginMemory, 지도석의 memory 단계)이고, 여기서는 여는 조건,
// 등급, 보스 배수와 특수기, 기억 떨어뜨리기, 보상만 정한다. 보상 지급과 기록은 js/atlas-run.js와 js/memory-dungeon-ui.js.
import { memoryArenaDefaults, memoryArenaCount, memoryArenaTotal, memoryArenaGive, memoryArenaSpend, memoryArenaRefund } from './memory-dungeon-ledger.mjs';
import { memoryArenaNormalize } from './memory-dungeon-restore.mjs';
import { memoryArenaOpen, memoryArenaValidTier, memoryArenaMaxTier, memoryArenaEntryReason, memoryArenaMapTier } from './memory-dungeon-access.mjs';
import { memoryArenaBoost, memoryArenaZoneName, memoryArenaTuneBoss } from './memory-dungeon-fight.mjs';
import { memoryArenaSettle } from './memory-dungeon-rewards.mjs';
import { memoryArenaOverview, memoryArenaPreview } from './memory-dungeon-preview.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createMemoryDungeon(deps) {
    const env = { deps };
    env.M = env.deps.MEMORY_DUNGEON;
    env.refundCap = env.M.ticketCap + 1;
    return Object.freeze({ defaults: memoryArenaDefaults, normalize: (...args) => memoryArenaNormalize(env, ...args), open: (...args) => memoryArenaOpen(env, ...args), validTier: (...args) => memoryArenaValidTier(env, ...args), maxTier: (...args) => memoryArenaMaxTier(env, ...args), count: memoryArenaCount, total: memoryArenaTotal, give: (...args) => memoryArenaGive(env, ...args), entryReason: (...args) => memoryArenaEntryReason(env, ...args), spend: memoryArenaSpend, refund: (...args) => memoryArenaRefund(env, ...args), mapTier: (...args) => memoryArenaMapTier(env, ...args), boost: (...args) => memoryArenaBoost(env, ...args), zoneName: (...args) => memoryArenaZoneName(env, ...args), tuneBoss: (...args) => memoryArenaTuneBoss(env, ...args),
    settle: (...args) => memoryArenaSettle(env, ...args), overview: (...args) => memoryArenaOverview(env, ...args), preview: (...args) => memoryArenaPreview(env, ...args) });
}
