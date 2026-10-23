// 기억 던전(12번 루프 21, 2026-10-08, data/memory-dungeon.js): 아틀라스 보스의 기억(1~5단계)을 모으고, 그 보스만 있는 투기장 싸움을
// 연다. 상태는 game.atlas.memory { tickets: {노드 id: [1단계 수, ..., 5단계 수]}, best: {노드 id: 이긴 가장 높은 단계} }: 루프와
// 시대 재생을 넘어 남는다. 싸움은 지도 장치 런 그대로(js/atlas.js beginMemory, 지도석의 memory 단계)이고, 여기서는 여는 조건,
// 등급, 보스 배수와 특수기, 기억 떨어뜨리기, 보상만 정한다. 보상 지급과 기록은 js/atlas-run.js와 js/memory-dungeon-ui.js.
const memoryDungeon = (() => {
    const M = MEMORY_DUNGEON;
    const defaults = () => ({ tickets: {}, best: {}, variants: {} });
    const ledger = state => state.atlas.memory;
    const open = state => (Number(state.season) || 1) >= M.minLoop;
    const validTier = value => Number.isInteger(value) && value >= 1 && value <= M.tiers;
    const emptyRow = () => Array(M.tiers).fill(0);
    /** The highest tier that drops and opens now: 3, then 5 from loop 44. */
    const maxTier = state => ((Number(state.season) || 1) >= M.highTiers.loop ? M.tiers : M.highTiers.from - 1);

    function count(state, nodeId, tier) {
        return ((ledger(state).tickets[nodeId] || [])[tier - 1]) || 0;
    }
    // A single open fight can refund one spent memory after a new drop filled its slot. Keep that reserved memory across saves.
    const refundCap = M.ticketCap + 1;
    /** Normal drops stop at ticketCap; only a cancelled fight's refund may use its one reserved slot. */
    function give(state, nodeId, tier, force = false) {
        const book = ledger(state), row = book.tickets[nodeId] || emptyRow();
        if (row[tier - 1] >= (force ? refundCap : M.ticketCap)) return false;
        row[tier - 1] += 1;
        book.tickets[nodeId] = row;
        return true;
    }
    function take(state, nodeId, tier) {
        const row = ledger(state).tickets[nodeId];
        row[tier - 1] -= 1;
        if (row.every(value => value <= 0)) delete ledger(state).tickets[nodeId];
    }

    /** '' when the memory fight can open now, otherwise why not. */
    function entryReason(state, nodeId, tier) {
        if (!open(state)) return `루프 ${M.minLoop}부터 열립니다.`;
        if (!atlas.node(nodeId) || !validTier(tier)) return '없는 기억입니다.';
        if (tier > maxTier(state)) return `${tier}단계는 루프 ${M.highTiers.loop}부터 도전할 수 있습니다.`;
        const lock = atlas.lockReason(state);
        if (lock) return lock;
        if (state.atlas.run) return atlas.runOpenReason(state);
        return count(state, nodeId, tier) > 0 ? '' : '그 단계의 기억이 없습니다.';
    }
    const spend = (state, nodeId, tier) => take(state, nodeId, tier);
    /** Travel failed or a new loop closed the fight before it ended: the memory comes back (past the cap, it was held a moment ago). */
    const refund = (state, map) => give(state, map.node, map.memory, true);

    // ---------------------------------------------------------------- the fight
    /** The memory map's tier: the node's tier + tierStep × tier, under the atlas cap. */
    const mapTier = (state, node, tier) => Math.min(ATLAS.tierCap, atlas.effectiveTier(state, node) + M.fight.tierStep * tier);
    /** Boss multipliers of a memory map (1 for any other map). */
    function boost(map) {
        const tier = map && map.memory;
        return validTier(tier) ? { hp: M.fight.hpMul[tier - 1], damage: M.fight.damageMul[tier - 1] } : { hp: 1, damage: 1 };
    }
    const zoneName = (map, node) => (validTier(map.memory) ? `${node.name}: 기억 ${map.memory}단계` : node.name);
    /** A memory fight's boss (js/combat.js createActExplorationPack): its name says whose memory, tinted; a boss without its own special
     * (map bosses, guardians, the shadow) takes the memory special. */
    function tuneBoss(enemy, tier) {
        enemy.name = `${enemy.name}의 기억`;
        enemy.bossVisualTint = M.fight.tint;
        if (!enemy.apexMechanic) Object.assign(enemy, { patternMode: 'apex', apexMechanic: M.fight.mechanic });
        // 보스 변이체(루프 33): 3단계부터 기억의 보스가 변이체로 다시 불려 나올 수 있다(js/boss-variants.js recall).
        if (typeof bossVariants === 'object') bossVariants.recall(enemy, tier);
        return enemy;
    }

    // ---------------------------------------------------------------- a boss falls
    /** The entry snapshot's 되감긴 기억 bonus survives closing the run before completion rewards are settled. */
    const memoryDropMul = bonus => 1 + (Number(bonus.memoryDrop) || 0) / 100;
    /** The memory a fallen atlas boss leaves: tier 1 by chance after an ordinary fight, the next tier by the ladder after a memory fight. */
    function rollTicket(state, node, map, random, bonus) {
        const tier = validTier(map.memory) ? map.memory + 1 : 1;
        if (!open(state) || tier > maxTier(state)) return null;
        const chance = tier > 1 ? M.ladder[tier - 2] : (M.ticketDrop[node.kind] || 0) * memoryDropMul(bonus);
        return random() < chance && give(state, node.id, tier) ? { node: node.id, name: node.boss, tier } : null;
    }
    const ownUnique = node => (atlasEndgame.def(node.id) || {}).unique || null;
    /** Shared reward expectations for settlement and the pre-entry preview; deriving them never rolls entropy. */
    function rewardExpectations(tier, mapTierValue) {
        const scale = Math.max(M.rewardScale.min, Math.min(M.rewardScale.max, mapTierValue / M.rewardTier));
        return [...M.rewards.map(([key, base, perTier]) => [key, base + perTier * tier]), ['burningEmberBranch', M.burning[tier - 1]]]
            .map(([key, expected]) => [key, expected * scale]);
    }
    /** Currency for a won tier. Keep one random draw per configured reward, including currently locked ones. */
    function rolledRewards(state, tier, mapTierValue, random) {
        return rewardExpectations(tier, mapTierValue)
            .map(([key, expected]) => [key, Math.floor(expected) + Number(random() < expected % 1)])
            .filter(([key, amount]) => amount > 0 && contentProgression.canDropCurrency(key, state));
    }
    /** A won memory fight: its spoils (currency by tier, a unique by chance, a rare piece from gearFrom) and the best tier record. */
    function spoils(state, node, tier, random) {
        const own = ownUnique(node), book = ledger(state), best = (book.best[node.id] || 0) < tier;
        if (best) book.best[node.id] = tier;
        const unique = random() < M.uniqueChance[own ? 'own' : 'other'][tier - 1] ? (own || 'any') : null;
        return { tier, rewards: rolledRewards(state, tier, mapTier(state, node, tier), random), unique, gear: tier >= M.gearFrom, best };
    }
    /** Boss down in an atlas run (js/atlas.js complete): the memory it leaves and, after a memory fight, its spoils.
     * @returns {{ticket: ?object, spoils: ?object}} */
    function settle(state, node, map, random = Math.random, bonus = {}) {
        const fight = validTier(map.memory) ? spoils(state, node, map.memory, random) : null;
        return { ticket: rollTicket(state, node, map, random, bonus), spoils: fight };
    }

    function nextMemoryPreview(state, node, tier) {
        if (tier >= M.tiers) return null;
        const nextTier = tier + 1, have = count(state, node.id, nextTier);
        const reason = nextTier > maxTier(state) ? `${nextTier}단계 기억은 루프 ${M.highTiers.loop}부터 얻을 수 있습니다.`
            : have >= M.ticketCap ? `다음 단계 기억의 보관 한도 ${M.ticketCap}개에 도달했습니다.` : '';
        return { tier: nextTier, chance: reason ? 0 : M.ladder[tier - 1], reason, have, cap: M.ticketCap };
    }
    /** Read-only preparation for a held memory or a past record. Choosing it never consumes a memory or advances random rolls. */
    function preview(state, nodeId, tier) {
        const node = atlas.node(nodeId);
        if (!node || !validTier(tier)) return null;
        const map = atlasMaps.create(nodeId, mapTier(state, node, tier), 'normal', () => 0), own = ownUnique(node);
        map.memory = tier;
        const rewards = rewardExpectations(tier, map.tier).filter(([key, expected]) => expected > 0 && contentProgression.canDropCurrency(key, state))
            .map(([key, expected]) => ({ key, min: Math.floor(expected), max: Math.ceil(expected), extraChance: expected % 1 }));
        return { node, tier, have: count(state, nodeId, tier), map, best: ledger(state).best[nodeId] || 0,
            reason: entryReason(state, nodeId, tier), rewards,
            unique: { name: own, chance: M.uniqueChance[own ? 'own' : 'other'][tier - 1], swapChance: M.swap[tier - 1] },
            gear: tier >= M.gearFrom, next: nextMemoryPreview(state, node, tier) };
    }

    // ---------------------------------------------------------------- save boundary and view
    function normalizeRow(raw) {
        const row = emptyRow().map((zero, index) => Math.max(0, Math.min(refundCap, Math.floor(Number(Array.isArray(raw) ? raw[index] : 0) || 0))));
        return row.some(value => value > 0) ? row : null;
    }
    function normalizeTickets(raw) {
        const out = {};
        for (const [id, row] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
            const kept = atlas.node(id) ? normalizeRow(row) : null;
            if (kept) out[id] = kept;
        }
        return out;
    }
    function normalizeBest(raw) {
        return Object.fromEntries(Object.entries(raw && typeof raw === 'object' ? raw : {}).filter(([id, tier]) => atlas.node(id) && validTier(tier)));
    }
    /** The boss variant record (12번 루프 33, js/boss-variants.js) lives with the memories. */
    const normalizeVariants = raw => (typeof bossVariants === 'object' ? bossVariants.normalizeKills(raw) : {});
    /** Known nodes only, whole counts including one reserved refund, best tiers 1..5. Older rows need no migration. */
    function normalize(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return { tickets: normalizeTickets(source.tickets), best: normalizeBest(source.best), variants: normalizeVariants(source.variants) };
    }
    /** Held memories and past victories: spending the last ticket must not hide a boss's best-tier record. */
    function overview(state) {
        const book = ledger(state), ids = new Set([...Object.keys(book.tickets), ...Object.keys(book.best)]);
        return [...ids].map(id => {
            const node = atlas.node(id), row = book.tickets[id] || emptyRow();
            return { node, counts: row.slice(), best: ledger(state).best[id] || 0, unique: ownUnique(node),
                tiers: row.map((have, index) => ({ tier: index + 1, have, mapTier: mapTier(state, node, index + 1), reason: entryReason(state, id, index + 1) })) };
        }).sort((a, b) => b.counts.findLastIndex(value => value > 0) - a.counts.findLastIndex(value => value > 0) || a.node.boss.localeCompare(b.node.boss));
    }
    /** How many memories are held (the atlas's 기억 tab shows it). */
    const total = state => Object.values(ledger(state).tickets).reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    return Object.freeze({ defaults, normalize, open, validTier, maxTier, count, total, give, entryReason, spend, refund, mapTier, boost, zoneName, tuneBoss,
        settle, overview, preview });
})();
safeExposeGlobals({ memoryDungeon });
