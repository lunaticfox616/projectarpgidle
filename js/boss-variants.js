// 보스 변이체(12번 루프 33, 2026-10-08, data/boss-variants.js): 보스가 태어날 때(js/combat.js finishBossSpawn) 드물게 변이를 입히고,
// 기억 던전 3단계부터는 기억의 보스를 변이체로 다시 부른다(memoryDungeon.tuneBoss). 쓰러질 때 기록(game.atlas.memory.variants)과
// 보상(처음 잡은 변이의 선물, 아틀라스 보스의 기억 3단계)을 정한다. 알림은 'boss-variant' 이벤트(기록은 js/boss-variants-ui.js).
const bossVariants = (() => {
    const V = BOSS_VARIANTS;
    const BY_ID = new Map(V.kinds.map(kind => [kind.id, kind]));
    const IDS = Object.freeze(V.kinds.map(kind => kind.id));
    // 나무꾼, 경계 너머, 정점 관문과 아스트라는 이미 정해진 싸움이라 변이하지 않는다.
    const FIXED_ZONE_TYPES = new Set(['outsideChaos', 'beyondBoundary']);
    const open = state => (Number(state.season) || 1) >= V.minLoop;
    const eligible = (enemy, zone) => !!enemy && enemy.isBoss && !enemy.bossVariant && !!zone && !FIXED_ZONE_TYPES.has(zone.type)
        && !zone.milestonePinnacle && zone.id !== 'cosmos_astra';
    const pick = random => V.kinds[Math.min(V.kinds.length - 1, Math.floor(random() * V.kinds.length))];

    /** The variant's look, safe to repeat (a late fight's stage renames its boss after spawning): name suffix, tint, rim. */
    function dress(enemy) {
        const kind = BY_ID.get(enemy && enemy.bossVariant);
        if (!kind) return enemy;
        if (!String(enemy.name || '').includes(kind.name)) enemy.name = `${enemy.name} (${kind.name})`;
        return Object.assign(enemy, { bossVisualTint: kind.hue, variantOutline: kind.outline });
    }
    /** Puts the variant on a boss: element, strength (mul and add), shield, more loot and experience, then its look. */
    function apply(enemy, kind) {
        for (const [key, mul] of Object.entries(kind.mul)) {
            const base = Number(enemy[key]);
            enemy[key] = (Number.isFinite(base) ? base : 1) * mul;
        }
        for (const [key, add] of Object.entries(kind.add)) enemy[key] = (Number(enemy[key]) || 0) + add;
        enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp));
        enemy.hp = enemy.maxHp;
        if (kind.shieldPct > 0) {
            enemy.maxEnergyShield = Math.max(Number(enemy.maxEnergyShield) || 0, Math.floor(enemy.maxHp * kind.shieldPct / 100));
            enemy.energyShield = enemy.maxEnergyShield;
        }
        Object.assign(enemy, { bossVariant: kind.id, ele: kind.ele, dropMul: (Number(enemy.dropMul) || 1) * V.reward.dropMul,
            expMul: (Number(enemy.expMul) || 1) * V.reward.expMul });
        return dress(enemy);
    }
    function announce(enemy, recalled) {
        dispatchRuntimeEvent('boss-variant', { kind: 'spawn', name: enemy.name, variant: enemy.bossVariant, recalled });
    }
    /** An atlas map's 되감긴 기억 passive (data/atlas-passives.js variantChance %p) makes its bosses vary more often. */
    function atlasChance(zone) {
        const run = zone && zone.type === 'atlasMap' && game.atlas ? game.atlas.run : null;
        return (Number(run && run.bonus && run.bonus.variantChance) || 0) / 100;
    }
    /** A boss just spawned (js/combat.js finishBossSpawn): from loop 33, by chance, it is a variant. */
    function maybeApply(enemy, zone, random = Math.random) {
        if (!open(game) || !eligible(enemy, zone) || random() >= V.chance + atlasChance(zone)) return enemy;
        apply(enemy, pick(random));
        announce(enemy, false);
        return enemy;
    }
    /** A memory fight's boss (js/memory-dungeon.js tuneBoss): from tier 3 the memory may come back as a variant. */
    function recall(enemy, tier, random = Math.random) {
        const chance = V.recall[tier - 1] || 0;
        if (!enemy || enemy.bossVariant || random() >= chance) return enemy;
        apply(enemy, pick(random));
        announce(enemy, true);
        return enemy;
    }

    const ledger = state => {
        const memory = state.atlas.memory;
        if (!memory.variants || typeof memory.variants !== 'object') memory.variants = {};
        return memory.variants;
    };
    /** The memory a fallen atlas boss variant leaves (its node, tier 3), or null. */
    function variantMemory(state) {
        const zone = typeof getZone === 'function' ? getZone(state.currentZoneId) : null;
        if (!zone || zone.type !== 'atlasMap' || !zone.atlasNode || typeof memoryDungeon !== 'object' || !memoryDungeon.open(state)) return null;
        return memoryDungeon.give(state, zone.atlasNode, V.reward.memoryTier) ? { node: zone.atlasNode, tier: V.reward.memoryTier } : null;
    }
    /** A boss variant fell (js/combat.js recordKillProgress): its record, the first-kill gift, an atlas boss's tier-3 memory. */
    function onKilled(state, enemy) {
        const kind = BY_ID.get(enemy && enemy.bossVariant);
        if (!kind || !state.atlas || !state.atlas.memory) return null;
        const book = ledger(state), first = !(book[kind.id] > 0);
        book[kind.id] = (book[kind.id] || 0) + 1;
        if (first) V.reward.firstKill.forEach(([key, amount]) => awardCurrency(key, amount));
        const out = { kind: 'kill', name: enemy.name, variant: kind.id, first, gift: first ? V.reward.firstKill : [], memory: variantMemory(state) };
        dispatchRuntimeEvent('boss-variant', out);
        return out;
    }
    /** Save boundary for the record: known variants, whole counts. */
    function normalizeKills(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return Object.fromEntries(IDS.map(id => [id, Math.max(0, Math.min(1e6, Math.floor(Number(source[id]) || 0)))]).filter(([, count]) => count > 0));
    }
    const records = state => IDS.map(id => ({ kind: BY_ID.get(id), kills: (state.atlas.memory.variants || {})[id] || 0 }));
    return Object.freeze({ open, maybeApply, recall, dress, apply, onKilled, normalizeKills, records, kind: id => BY_ID.get(id) || null });
})();
safeExposeGlobals({ bossVariants });
