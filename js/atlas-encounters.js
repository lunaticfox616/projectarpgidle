/** 지도 속 콘텐츠 방 (docs/atlas-endgame-20260930.md 3절 · data/atlas.js encounters): 공허 균열 · 벌집 · 보물 방 · 운석 분화구,
 * 아틀라스가 깨어난 뒤의 붉은 제단 · 푸른 제단(docs/atlas-pinnacles-20261002.md).
 * 지도를 열 때 어떤 방이 생길지 정하고(각인은 확정, 나머지는 확률), 맵이 만들어질 때 보통 방 하나에 그 콘텐츠의 무리를 둔다.
 * 무리는 정예가 이끌어 보스 관문을 함께 봉인하고, 방을 비우는 처치가 그 콘텐츠의 재화를 맵 전리품으로 준다(쓰러지면 잃는다).
 */
const atlasEncounters = (() => {
    const TYPES = Object.freeze(Object.keys(ATLAS.encounters));
    /** Forced rooms (fragments) first, then the other types — in a random order, so none is starved by the list order — roll
     * their chance (base + passives) up to the map's limit; never more rooms than the map has ordinary rooms for. */
    function roll(bonus, forced, random, capacity = Infinity, awake = false) {
        const fixed = [...new Set(forced)].filter(type => Object.hasOwn(ATLAS.encounters, type));
        const limit = ATLAS.encounterLimit + bonus.encounterExtra;
        // 제단(late)은 아틀라스가 깨어난 뒤에만 굴린다(js/atlas-endgame.js). 패시브가 없는 종류의 보너스는 0.
        const rolled = shuffledTypes(TYPES.filter(type => !fixed.includes(type) && (awake || !ATLAS.encounters[type].late)), random)
            .filter(type => random() * 100 < ATLAS.encounters[type].chance + (bonus[type] || 0));
        return [...fixed, ...rolled.slice(0, limit)].slice(0, capacity);
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
        enemy.atlasEncounter = type;
        return enemy;
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
    return Object.freeze({ types: TYPES, roll, rooms, hostRooms, tuneEnemy, emptiedPack, rewards });
})();
safeExposeGlobals({ atlasEncounters });
