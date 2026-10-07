/** 지도 속 콘텐츠 방 (docs/atlas-endgame-20260930.md 3절 · data/atlas.js encounters): 공허 균열 · 벌집 · 보물 방 · 운석 분화구,
 * 아틀라스가 깨어난 뒤의 붉은 제단 · 푸른 제단(docs/atlas-pinnacles-20261002.md).
 * 지도를 열 때 어떤 방이 생길지 정하고(각인은 확정, 나머지는 확률), 맵이 만들어질 때 보통 방 하나에 그 콘텐츠의 무리를 둔다.
 * 무리는 정예가 이끌어 보스 관문을 함께 봉인하고, 방을 비우는 처치가 그 콘텐츠의 재화를 맵 전리품으로 준다(쓰러지면 잃는다).
 */
const atlasEncounters = (() => {
    const TYPES = Object.freeze(Object.keys(ATLAS.encounters));
    /** Forced rooms (fragments) first, then the other types — in a random order, so none is starved by the list order — roll
     * their chance (base + passives, × the map region's share) up to the map's limit; never more rooms than the map has ordinary
     * rooms for. context = { awake, loop, region } (a bare boolean is awake): a type with minLoop waits for that loop. */
    function roll(bonus, forced, random, capacity = Infinity, context = false) {
        const { awake = false, loop = Infinity, region = null } = context && typeof context === 'object' ? context : { awake: !!context };
        const fixed = [...new Set(forced)].filter(type => Object.hasOwn(ATLAS.encounters, type));
        const limit = ATLAS.encounterLimit + bonus.encounterExtra;
        // 패시브가 없는 종류의 보너스는 0.
        const passing = late => shuffledTypes(TYPES.filter(type => !fixed.includes(type) && !!ATLAS.encounters[type].late === late && isOpen(type, loop)), random)
            .filter(type => random() * 100 < chance(type, bonus, region));
        // 제단(late)은 아틀라스가 깨어난 뒤에만, 콘텐츠 방 자리와 따로 굴린다(js/atlas-endgame.js): 깨어나도 기존 방이 줄지 않는다.
        const altars = awake ? passing(true).slice(0, ATLAS.altarLimit) : [];
        return [...fixed, ...passing(false).slice(0, limit), ...altars].slice(0, capacity);
    }
    /** A type's room chance in %: base + passives, × the map region's share (잿불 터 in the garden). */
    function chance(type, bonus, region) {
        const rule = ATLAS.encounters[type];
        return (rule.chance + (bonus[type] || 0)) * ((rule.regionChance && rule.regionChance[region]) || 1);
    }
    /** Whether the type can appear in this loop (minLoop: 잿불 터 from loop 30). */
    function isOpen(type, loop) {
        return (ATLAS.encounters[type].minLoop || 0) <= loop;
    }
    function shuffledTypes(list, random) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }
    /** Rooms that can hold content: ordinary ones (not the entry, paths, elite gates or the boss). */
    const hostRooms = map => map.rooms.filter(room => room.role === 'optional' || room.role === 'battle');
    const score = (zone, type, room) => Math.abs(hashSeed(`${zone.atlasSeed}:${type}:${room.id}`));
    /** @returns {Object<string,string>} room id → content, fixed per map: ordinary rooms only (not the entry, paths, elite gates, boss). */
    function rooms(zone, map) {
        const out = {};
        if (!zone || zone.type !== 'atlasMap') return out;
        const pool = hostRooms(map);
        for (const type of zone.atlasEncounters) {
            const free = pool.filter(room => !out[room.id]);
            if (free.length) out[free.reduce((best, room) => (score(zone, type, room) > score(zone, type, best) ? room : best)).id] = type;
        }
        return out;
    }
    function tuneEnemy(enemy, type) {
        const rule = ATLAS.encounters[type], mul = rule.enemy;
        enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * mul.hp));
        enemy.hp = enemy.maxHp;
        enemy.damageMul = (Number(enemy.damageMul) || 1) * mul.damage;
        enemy.atkMul = (Number(enemy.atkMul) || 1) * mul.attack;
        enemy.expMul = (Number(enemy.expMul) || 1) * mul.exp;
        enemy.name = rule.names ? rule.names[Number(!!enemy.isElite)] : `${rule.prefix} ${enemy.name}`;
        // A room with its own look (the hive's bees) draws that sheet; its attack follows the picture (assigned on the first tick).
        if (rule.visuals) Object.assign(enemy, { monsterVisualSetId: null, monsterVisualId: rule.visuals[Number(!!enemy.isElite)],
            spriteVariantId: null, monsterArchetype: null });
        // 잿불 터: 속성 몫을 화염으로 치고, 잿불 테와 불씨로 보인다(js/ui.js getEnemyOutlineStyle, js/canvas-battlefield.js).
        if (rule.ele) enemy.ele = rule.ele;
        if (rule.outline) Object.assign(enemy, { encounterOutline: rule.outline, encounterSparks: rule.sparks || null });
        enemy.atlasEncounter = type;
        return enemy;
    }
    /** A room with its own look (the hive's bees) rolls no act monster, root or wisp under it: a wisp's rolled defenses stayed on
     * the bees drawn over it (2026-10-07 review). Read by createEnemy through its spawn marker. */
    function hasOwnLook(type) {
        return !!(type && ATLAS.encounters[type] && ATLAS.encounters[type].visuals);
    }
    /** The pack a kill empties (checked before the engine removes the enemy from its pack), or null. */
    function emptiedPack(state, enemy) {
        const run = actExplorationState.current(state);
        const pack = run && run.packs.find(row => row.key === enemy.explorationPack);
        if (!pack || pack.waiting.length) return null;
        return pack.aliveIds.length === 1 && pack.aliveIds[0] === enemy.id ? pack : null;
    }
    /** Room rewards: expected (base + perTier × tier) × (1 + reward passive %); the fraction rolls one more. Locked currencies are skipped. */
    function rewards(zone, type, bonus, random) {
        const mul = 1 + (bonus[`${type}Reward`] || 0) / 100;
        return ATLAS.encounters[type].rewards.map(([key, base, perTier]) => {
            const expected = (base + perTier * zone.atlasTier) * mul;
            return [key, Math.floor(expected) + Number(random() < expected % 1)];
        }).filter(([key, amount]) => amount > 0 && contentProgression.canDropCurrency(key));
    }
    return Object.freeze({ types: TYPES, roll, chance, isOpen, rooms, hostRooms, tuneEnemy, hasOwnLook, emptiedPack, rewards });
})();
safeExposeGlobals({ atlasEncounters });
