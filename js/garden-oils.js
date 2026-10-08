// 정원 기름(12번 루프 36, 2026-10-08, data/garden-oils.js): 목걸이에 기름 셋을 바르면 그 조합이 이번 루프에 부르는 패시브 주요 노드 셋
// 가운데 하나가 새겨진다(item.anoint = { nodeId }). 새겨진 노드의 효과는 제작으로 바뀌지 않는 줄(getImmutableItemSpecialStats)로
// 장비 스탯에 더해진다. 시든 무리의 처치 드롭과 그루터기 함 열매 조합(stumpCubeRecipes fruit_oil)도 여기서 정한다.
const gardenOils = (() => {
    const G = GARDEN_OILS;
    const BY_KEY = new Map(G.oils.map(oil => [oil.key, oil]));
    const BY_COLOR = new Map(G.oils.map(oil => [oil.color, oil]));
    const KEYS = Object.freeze(G.oils.map(oil => oil.key));
    const open = state => (Number(state.season) || 1) >= G.minLoop;
    let poolCache = null;

    /** Anointable major nodes per colour: plain stat effects the equipment stats carry, in a stable order. */
    function pools() {
        if (poolCache) return poolCache;
        const bucket = createEmptyStatBucket();
        const majors = Object.values(PASSIVE_TREE.nodes).filter(node => node && node.kind === 'major' && Array.isArray(node.effects) && node.effects.length > 0
            && node.effects.every(effect => Object.hasOwn(bucket, effect.stat)));
        poolCache = Object.fromEntries(Object.entries(G.pools).map(([color, archetypes]) => [color,
            majors.filter(node => archetypes.includes(node.archetype)).sort((a, b) => a.id.localeCompare(b.id))]));
        return poolCache;
    }
    const colorsOf = bowl => (Array.isArray(bowl) ? bowl : []).map(key => (BY_KEY.get(key) || {}).color).filter(Boolean);
    /** The nodes this bowl of oils calls this loop: one per oil from its colour's pool (all three of one colour: strong nodes only).
     * Fixed for the loop and the colours (not their order), so the player sees them before paying. */
    function offers(state, bowl) {
        const colors = colorsOf(bowl).sort();
        if (colors.length !== G.perAnoint) return [];
        const pure = new Set(colors).size === 1, picked = [];
        let seed = (Math.abs(hashSeed(`oil:${Number(state.season) || 1}:${colors.join(',')}`)) >>> 0) || 1;
        const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000;
        for (const color of colors) {
            const pool = pools()[color].filter(node => (!pure || (node.powerBand || 0) >= G.pureBand) && !picked.includes(node));
            if (pool.length) picked.push(pool[Math.floor(random() * pool.length)]);
        }
        return picked.slice(0, G.offers);
    }
    /** How many of each oil the bowl holds. */
    const needs = bowl => (Array.isArray(bowl) ? bowl : []).reduce((out, key) => ({ ...out, [key]: (out[key] || 0) + 1 }), {});
    /** '' when this bowl can go on this amulet now, otherwise why not. */
    function anointReason(state, item, bowl) {
        if (!open(state)) return `루프 ${G.minLoop}부터 바를 수 있습니다.`;
        if (!item || item.slot !== '목걸이') return '목걸이에만 바를 수 있습니다.';
        if (colorsOf(bowl).length !== G.perAnoint) return `기름 ${G.perAnoint}개를 고르세요.`;
        const short = Object.entries(needs(bowl)).find(([key, need]) => (state.currencies[key] || 0) < need);
        return short ? `${BY_KEY.get(short[0]).name}이(가) 부족합니다.` : '';
    }
    const majorOf = id => { const node = id ? PASSIVE_TREE.nodes[id] : null; return node && node.kind === 'major' ? node : null; };
    /** The engraved nodes by slot, [first, second] (null for an empty slot). */
    const nodesOf = item => (item && item.anoint ? [majorOf(item.anoint.nodeId), majorOf(item.anoint.second)] : [null, null]);
    const nodeOf = item => nodesOf(item)[0];
    /** Slots open now: one, two from loop 48. */
    const slotCount = state => ((Number(state.season) || 1) >= G.secondSlotLoop ? 2 : 1);
    /** '' when the node may go in this slot: the second slot opens at loop 48 after the first, and one node fills one slot only. */
    function slotReason(state, item, nodeId, slot) {
        if (slot !== 0 && (slot !== 1 || slotCount(state) < 2)) return `둘째 자리는 루프 ${G.secondSlotLoop}부터 열립니다.`;
        const [first, second] = nodesOf(item), other = slot === 0 ? second : first;
        if (slot === 1 && !first) return '첫째 자리부터 바르세요.';
        return other && other.id === nodeId ? '같은 노드를 두 자리에 새길 수 없습니다.' : '';
    }
    /** Pays the oils and engraves the chosen node (one of this bowl's offers) in the slot, replacing what was there.
     * @returns {{ok: boolean, reason?: string, node?: object}} */
    function anoint(state, item, bowl, nodeId, slot = 0) {
        const reason = anointReason(state, item, bowl) || slotReason(state, item, nodeId, slot);
        if (reason) return { ok: false, reason };
        const node = offers(state, bowl).find(row => row.id === nodeId);
        if (!node) return { ok: false, reason: '그 노드는 이 조합에 없습니다.' };
        Object.entries(needs(bowl)).forEach(([key, need]) => { state.currencies[key] -= need; });
        const [first, second] = nodesOf(item);
        item.anoint = slot === 1 ? { nodeId: first.id, second: node.id } : { nodeId: node.id, ...(second ? { second: second.id } : {}) };
        return { ok: true, node };
    }
    /** The engraved nodes' effects as item lines (equipment stats add them as unchangeable lines). */
    function lines(item) {
        return nodesOf(item).filter(Boolean).flatMap(node => node.effects.map(effect => ({ id: effect.stat, val: effect.val,
            statName: `[기름] ${getStatName(effect.stat)}`, anointLine: true })));
    }
    /** Save boundary: only an amulet keeps an anointment, of known major nodes, a second only beside a different first. */
    function normalize(item) {
        if (!item || !item.anoint) return;
        const [first, second] = item.slot === '목걸이' ? nodesOf(item) : [null, null];
        if (!first) delete item.anoint;
        else item.anoint = second && second.id !== first.id ? { nodeId: first.id, second: second.id } : { nodeId: first.id };
    }
    /** The oil a withered pack kill drops (data/atlas.js encounters.witheredGarden), through the ordinary currency drops (js/loot.js). */
    function killDrops(enemy, random = Math.random) {
        if (!enemy || enemy.atlasEncounter !== 'witheredGarden' || enemy.isBoss) return [];
        if (random() >= G.killDrops[enemy.isElite ? 'elite' : 'normal']) return [];
        return [[KEYS[Math.min(KEYS.length - 1, Math.floor(random() * KEYS.length))], 1]];
    }
    /** 열매 기름(data/stump-cube.js fruit_oil): two ripe fruits of one colour → that colour's oil. */
    function fruitRecipe([group], state) {
        if (!open(state)) return { ok: false, reason: `루프 ${G.minLoop}부터 만들 수 있습니다.` };
        const oil = BY_COLOR.get(group[0] && group[0].item && group[0].item.color);
        return oil ? { ok: true, consumed: group, outputs: [{ kind: 'currency', key: oil.key, amount: 1 }] } : { ok: false, reason: '이 색의 기름은 없습니다.' };
    }
    return Object.freeze({ keys: KEYS, open, offers, anointReason, slotReason, slotCount, anoint, nodeOf, nodesOf, lines, normalize, killDrops, fruitRecipe, oil: key => BY_KEY.get(key) || null });
})();
safeExposeGlobals({ gardenOils });
