/** 지도 속 콘텐츠 방 (docs/atlas-endgame-20260930.md 3절 · data/atlas.js encounters): 공허 균열 · 벌집 · 보물 방 · 운석 분화구,
 * 아틀라스가 깨어난 뒤의 붉은 제단 · 푸른 제단(docs/atlas-pinnacles-20261002.md).
 * 지도를 열 때 어떤 방이 생길지 정하고(각인은 확정, 나머지는 확률), 맵이 만들어질 때 보통 방 하나에 그 콘텐츠의 무리를 둔다.
 * 무리는 정예가 이끌어 보스 관문을 함께 봉인하고, 방을 비우는 처치가 그 콘텐츠의 재화를 맵 전리품으로 준다(쓰러지면 잃는다).
 * 황금 방(2026-10-09, data/atlas.js goldenRoom): 방이 지도마다 정해진 확률로 황금이 되어 더 세고 보상이 크다.
 */
const atlasEncounters = (() => {
    const TYPES = Object.freeze(Object.keys(ATLAS.encounters));
    /** Forced rooms (fragments) first, then the other types — in a random order, so none is starved by the list order — roll
     * their chance (base + passives, × the map region's share) up to the map's limit; never more rooms than the map has ordinary
     * rooms for. context = { awake, loop, region } (a bare boolean is awake): a type with minLoop waits for that loop. */
    function roll(bonus, forced, random, capacity = Infinity, context = false) {
        const { awake = false, loop = Infinity, region = null } = context && typeof context === 'object' ? context : { awake: !!context };
        const fixed = [...new Set(forced)].filter(type => Object.hasOwn(ATLAS.encounters, type));
        const limit = roomLimit(bonus, loop);
        // 패시브가 없는 종류의 보너스는 0.
        const passing = late => shuffledTypes(TYPES.filter(type => !fixed.includes(type) && !!ATLAS.encounters[type].late === late && isOpen(type, loop)), random)
            .filter(type => random() * 100 < chance(type, bonus, region));
        // 제단(late)은 아틀라스가 깨어난 뒤에만, 콘텐츠 방 자리와 따로 굴린다(js/atlas-endgame.js): 깨어나도 기존 방이 줄지 않는다.
        const altars = awake ? passing(true).slice(0, ATLAS.altarLimit) : [];
        return [...fixed, ...passing(false).slice(0, limit), ...altars].slice(0, capacity);
    }
    /** Content rooms a map may hold: the base, the passives' extra and one more from loops 50 and 75 (data/atlas.js encounterLoopBonus). */
    function roomLimit(bonus, loop) {
        const deepening = ATLAS.encounterLoopBonus.filter(row => loop >= row.loop).reduce((sum, row) => sum + row.extra, 0);
        return ATLAS.encounterLimit + (Number(bonus.encounterExtra) || 0) + deepening;
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
    function tuneEnemy(enemy, type, zone = null) {
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
        dressGolden(enemy, zone, type);
        return enemy;
    }
    /** Golden rooms of a new map: each ordinary content room by goldenRoom.chance + the goldenRoom passive (%), fixed by the map uid
     * and the type (a hash, no random draw). A late altar never is. */
    function golden(types, bonus, seed) {
        const chance = ATLAS.goldenRoom.chance + (Number(bonus.goldenRoom) || 0);
        return types.filter(type => !ATLAS.encounters[type].late && Math.abs(hashSeed(`golden:${seed}:${type}`)) % 1000 < chance * 10);
    }
    const isGolden = (zone, type) => !!zone && Array.isArray(zone.atlasGolden) && zone.atlasGolden.includes(type);
    /** A golden room's monsters (data/atlas.js goldenRoom): tougher, '황금' before the name, the gold rim and sparks. */
    function dressGolden(enemy, zone, type) {
        if (!isGolden(zone, type)) return;
        const gold = ATLAS.goldenRoom;
        enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * gold.hpMul));
        enemy.hp = enemy.maxHp;
        enemy.damageMul = (Number(enemy.damageMul) || 1) * gold.damageMul;
        Object.assign(enemy, { name: `${gold.prefix} ${enemy.name}`, encounterOutline: gold.outline, encounterSparks: gold.sparks, atlasGolden: true });
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
    /** One key of a list reward (수액 상처's catalysts, 시든 정원's oils): the map region's own (regionKeys) for encounterRegionShare
     * of the picks, else any key at random. */
    function pickKey(key, rule, zone, random) {
        if (!Array.isArray(key)) return key;
        const own = rule.regionKeys && zone ? rule.regionKeys[zone.atlasRegion] : null;
        if (own && random() < ATLAS.encounterRegionShare) return own;
        return key[Math.min(key.length - 1, Math.floor(random() * key.length))];
    }
    /** Room rewards: expected (base + perTier × tier) × (1 + reward passive %), in a golden room × rewardMul plus its golden rows; the
     * fraction rolls one more. A list row gives one key of it (pickKey). Locked currencies are skipped. */
    function rewards(zone, type, bonus, random) {
        const rule = ATLAS.encounters[type], gold = isGolden(zone, type);
        const mul = (1 + (bonus[`${type}Reward`] || 0) / 100) * (gold ? ATLAS.goldenRoom.rewardMul : 1);
        const rows = rule.rewards.map(([key, base, perTier]) => [key, (base + perTier * zone.atlasTier) * mul]).concat(gold ? rule.golden || [] : []);
        return rows.map(([key, expected]) => {
            const amount = Math.floor(expected) + Number(random() < expected % 1);
            return [pickKey(key, rule, zone, random), amount];
        }).filter(([key, amount]) => amount > 0 && contentProgression.canDropCurrency(key));
    }
    /** One find of the map's content rooms for an atlas map's golden supply chest (data/atlas.js encounters[].chest), or null. */
    function chestReward(zone, random) {
        const rooms = (zone && Array.isArray(zone.atlasEncounters) ? zone.atlasEncounters : []).filter(type => ATLAS.encounters[type].chest);
        if (!rooms.length) return null;
        const type = rooms[Math.min(rooms.length - 1, Math.floor(random() * rooms.length))], rule = ATLAS.encounters[type];
        const key = pickKey(rule.chest[0], rule, zone, random);
        return contentProgression.canDropCurrency(key) ? [key, rule.chest[1]] : null;
    }
    /** Seeds an emptied nursery gives (js/stump-nursery.js clearGift): one, more by the nurseryReward passive (%, the fraction by
     * chance), and one more in a golden room. */
    function nurseryGifts(zone, bonus, random) {
        const expected = 1 + (Number(bonus.nurseryReward) || 0) / 100, part = expected % 1;
        return Math.floor(expected) + (part ? Number(random() < part) : 0) + Number(isGolden(zone, 'nursery'));
    }
    return Object.freeze({ types: TYPES, roll, roomLimit, chance, isOpen, rooms, hostRooms, tuneEnemy, hasOwnLook, emptiedPack, rewards,
        golden, isGolden, chestReward, nurseryGifts });
})();
safeExposeGlobals({ atlasEncounters });
