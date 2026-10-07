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
    /** Pays the oils and engraves the chosen node (one of this bowl's offers) on the amulet, replacing an earlier one.
     * @returns {{ok: boolean, reason?: string, node?: object}} */
    function anoint(state, item, bowl, nodeId) {
        const reason = anointReason(state, item, bowl);
        if (reason) return { ok: false, reason };
        const node = offers(state, bowl).find(row => row.id === nodeId);
        if (!node) return { ok: false, reason: '그 노드는 이 조합에 없습니다.' };
        Object.entries(needs(bowl)).forEach(([key, need]) => { state.currencies[key] -= need; });
        item.anoint = { nodeId: node.id };
        return { ok: true, node };
    }
    const nodeOf = item => (item && item.anoint && PASSIVE_TREE.nodes[item.anoint.nodeId]) || null;
    /** The engraved node's effects as item lines (equipment stats add them as unchangeable lines). */
    function lines(item) {
        const node = nodeOf(item);
        if (!node || !Array.isArray(node.effects)) return [];
        return node.effects.map(effect => ({ id: effect.stat, val: effect.val, statName: `[기름] ${getStatName(effect.stat)}`, anointLine: true }));
    }
    /** Save boundary: only an amulet keeps an anointment, and only of a known major node. */
    function normalize(item) {
        const node = item && item.anoint && PASSIVE_TREE.nodes[item.anoint.nodeId];
        if (node && node.kind === 'major' && item.slot === '목걸이') item.anoint = { nodeId: node.id };
        else if (item) delete item.anoint;
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
    return Object.freeze({ keys: KEYS, open, offers, anointReason, anoint, nodeOf, lines, normalize, killDrops, fruitRecipe, oil: key => BY_KEY.get(key) || null });
})();
safeExposeGlobals({ gardenOils });
