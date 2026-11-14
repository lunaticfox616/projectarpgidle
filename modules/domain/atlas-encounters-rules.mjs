

/** Forced rooms (fragments) first, then the other types — in a random order, so none is starved by the list order — roll
 * their chance (base + passives, × the map region's share) up to the map's limit; never more rooms than the map has ordinary
 * rooms for. context = { awake, loop, region } (a bare boolean is awake): a type with minLoop waits for that loop. */
export function atlasEncounterRoll(env, bonus, forced, random, ...selection) {
    const [capacity = Infinity, context = false, owner] = selection;
    const { awake = false, loop = Infinity, region = null } = context && typeof context === 'object' ? context : { awake: !!context };
    const fixed = [...new Set(forced)].filter(type => Object.hasOwn(env.deps.ATLAS.encounters, type));
    const limit = atlasEncounterRoomLimit(env, bonus, loop, owner);
    // 패시브가 없는 종류의 보너스는 0.
    const passing = late => atlasEncounterShuffledTypes(env.TYPES.filter(type => !fixed.includes(type) && !!env.deps.ATLAS.encounters[type].late === late && atlasEncounterIsOpen(env, type, loop, owner)), random)
        .filter(type => random() * 100 < atlasEncounterChance(env, type, bonus, region));
    // 제단(late)은 아틀라스가 깨어난 뒤에만, 콘텐츠 방 자리와 따로 굴린다(js/atlas-endgame.js): 깨어나도 기존 방이 줄지 않는다.
    const altars = awake ? passing(true).slice(0, env.deps.ATLAS.altarLimit) : [];
    return [...fixed, ...passing(false).slice(0, limit), ...altars].slice(0, capacity);
}

/** Content rooms a map may hold: the base, the passives' extra and one more for each 콘텐츠 방 unlock (data/atlas.js encounterLoopBonus). */
export function atlasEncounterRoomLimit(env, bonus, loop, owner) {
    const deepening = env.deps.ATLAS.encounterLoopBonus.filter(row => env.deps.contentProgression.holds(row.unlock, owner, loop)).reduce((sum, row) => sum + row.extra, 0);
    return env.deps.ATLAS.encounterLimit + (Number(bonus.encounterExtra) || 0) + deepening;
}

/** A type's room chance in %: base + passives, × the map region's share (잿불 터 in the garden). */
export function atlasEncounterChance(env, type, bonus, region) {
    const rule = env.deps.ATLAS.encounters[type];
    return (rule.chance + (bonus[type] || 0)) * ((rule.regionChance && rule.regionChance[region]) || 1);
}

/** Whether the type can appear now: a late room waits for its unlock (data/atlas.js encounters unlock: 잿불 터 and the rest). */
export function atlasEncounterIsOpen(env, type, loop, owner) {
    const rule = env.deps.ATLAS.encounters[type];
    return (rule.minLoop || 0) <= loop && (!rule.unlock || env.deps.contentProgression.holds(rule.unlock, owner, loop));
}

export function atlasEncounterShuffledTypes(list, random) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Rooms that can hold content: ordinary ones (not the entry, paths, elite gates or the boss). */
export function atlasEncounterHostRooms(map) { return map.rooms.filter(room => room.role === 'optional' || room.role === 'battle'); }

export function atlasEncounterScore(env, zone, type, room) { return Math.abs(env.deps.hashSeed(`${zone.atlasSeed}:${type}:${room.id}`)); }

/** @returns {Object<string,string>} room id → content, fixed per map: ordinary rooms only (not the entry, paths, elite gates, boss). */
export function atlasEncounterRooms(env, zone, map) {
    const out = {};
    if (!zone || zone.type !== 'atlasMap') return out;
    const pool = atlasEncounterHostRooms(map);
    for (const type of zone.atlasEncounters) {
        const free = pool.filter(room => !out[room.id]);
        if (free.length) out[free.reduce((best, room) => (atlasEncounterScore(env, zone, type, room) > atlasEncounterScore(env, zone, type, best) ? room : best)).id] = type;
    }
    return out;
}

export function atlasEncounterTuneEnemy(env, enemy, type, zone = null) {
    const rule = env.deps.ATLAS.encounters[type], mul = rule.enemy;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * mul.hp));
    enemy.hp = enemy.maxHp;
    enemy.damageMul = (Number(enemy.damageMul) || 1) * mul.damage;
    enemy.atkMul = (Number(enemy.atkMul) || 1) * mul.attack;
    enemy.expMul = (Number(enemy.expMul) || 1) * mul.exp;
    if (rule.roster) atlasEncounterDressRosterMember(env, enemy, type, zone);
    else enemy.name = `${rule.prefix} ${enemy.name}`;
    // 잿불 터: 속성 몫을 화염으로 치고, 잿불 테와 불씨로 보인다(modules/rendering/enemy-outline.mjs, js/canvas-battlefield.js).
    if (rule.ele) enemy.ele = rule.ele;
    if (rule.outline) Object.assign(enemy, { encounterOutline: rule.outline, encounterSparks: rule.sparks || null });
    enemy.atlasEncounter = type;
    atlasEncounterDressGolden(env, enemy, zone, type);
    return enemy;
}

/** A content pack cycles its own species from a fixed map/room offset, without consuming combat randomness. The combat
 * caller reapplies assignEnemyGridCombatProfile after this final look; an old profile must not survive a changed body. */
export function atlasEncounterDressRosterMember(env, enemy, type, zone) {
    const roster = env.deps.ATLAS.encounters[type].roster, pool = roster[enemy.isElite ? 'elite' : 'normal'];
    const offset = Math.abs(env.deps.hashSeed(`${zone?.atlasSeed || zone?.id || 'atlas'}:${type}:${enemy.spawnAt}`));
    const id = pool[(offset + enemy.groupIndex) % pool.length], visual = env.deps.getRealmMonsterVisualDefinitionById(id);
    if (!visual) throw new Error(`Unknown atlas encounter monster: ${type}/${id}`);
    Object.assign(enemy, { name: atlasEncounterRosterName(enemy, visual.name), baseMonsterName: visual.name, monsterVisualSetId: null, monsterVisualId: id,
        spriteVariantId: null, monsterArchetype: null });
}

/** Spawn already marked reward carriers before choosing this body. Preserve their labels and the elite trait; golden
 * dressing adds its prefix last. Reward flags remain owned by atlasBoard and atlasEndgame. */
export function atlasEncounterRosterName(enemy, name) {
    return [enemy.craftOmen ? '뿌리를 품은' : '',
        enemy.isElite ? enemy.traitName : '', name].filter(Boolean).join(' ');
}

/** Golden rooms of a new map: each ordinary content room by goldenRoom.chance + the goldenRoom passive (%), fixed by the map uid
 * and the type (a hash, no random draw). A late altar never is. */
export function atlasEncounterGolden(env, types, bonus, seed) {
    const chance = env.deps.ATLAS.goldenRoom.chance + (Number(bonus.goldenRoom) || 0);
    return types.filter(type => !env.deps.ATLAS.encounters[type].late && Math.abs(env.deps.hashSeed(`golden:${seed}:${type}`)) % 1000 < chance * 10);
}

export function atlasEncounterIsGolden(zone, type) { return !!zone && Array.isArray(zone.atlasGolden) && zone.atlasGolden.includes(type); }

/** A golden room's monsters (data/atlas.js goldenRoom): tougher, '황금' before the name, the gold rim and sparks. */
export function atlasEncounterDressGolden(env, enemy, zone, type) {
    if (!atlasEncounterIsGolden(zone, type)) return;
    const gold = env.deps.ATLAS.goldenRoom;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * gold.hpMul));
    enemy.hp = enemy.maxHp;
    enemy.damageMul = (Number(enemy.damageMul) || 1) * gold.damageMul;
    Object.assign(enemy, { name: `${gold.prefix} ${enemy.name}`, encounterOutline: gold.outline, encounterSparks: gold.sparks, atlasGolden: true });
}

/** A content roster rolls no unrelated act monster, root or wisp beneath its final body. In particular, wisp defenses must
 * not stay on a bee drawn over it. Read by createEnemy through its spawn marker. */
export function atlasEncounterHasOwnLook(env, type) {
    return !!(type && env.deps.ATLAS.encounters[type] && env.deps.ATLAS.encounters[type].roster);
}

/** The pack a kill empties (checked before the engine removes the enemy from its pack), or null. A golden sap slime
 * (js/combat-incidents.js) is in its pack but not counted: its death empties nothing, and the last other monster's does. */
export function atlasEncounterEmptiedPack(env, state, enemy) {
    const run = env.deps.actExplorationState.current(state);
    const pack = !enemy.critter && run && run.packs.find(row => row.key === enemy.explorationPack);
    if (!pack || pack.waiting.some(row => !row.critter)) return null;
    const slimes = new Set((state.enemies || []).filter(row => row && row.critter).map(row => row.id).concat(pack.waiting.map(row => row.id)));
    const others = pack.aliveIds.filter(id => !slimes.has(id));
    return others.length === 1 && others[0] === enemy.id ? pack : null;
}

/** One key of a list reward (수액 상처's catalysts, 시든 정원's oils): the map region's own (regionKeys) for encounterRegionShare
 * of the picks, else any key at random. */
export function atlasEncounterPickKey(env, key, rule, zone, random) {
    if (!Array.isArray(key)) return key;
    const own = rule.regionKeys && zone ? rule.regionKeys[zone.atlasRegion] : null;
    if (own && random() < env.deps.ATLAS.encounterRegionShare) return own;
    return key[Math.min(key.length - 1, Math.floor(random() * key.length))];
}

/** Room rewards: expected (base + perTier × tier) × (1 + reward passive %), in a golden room × rewardMul plus its golden rows; the
 * fraction rolls one more. A list row gives one key of it (pickKey). Locked currencies are skipped. */
export function atlasEncounterRewards(env, zone, type, bonus, ...selection) {
const [random, owner] = selection;
    const rule = env.deps.ATLAS.encounters[type], gold = atlasEncounterIsGolden(zone, type);
    const mul = (1 + (bonus[`${type}Reward`] || 0) / 100) * (gold ? env.deps.ATLAS.goldenRoom.rewardMul : 1);
    const rows = rule.rewards.map(([key, base, perTier]) => [key, (base + perTier * zone.atlasTier) * mul]).concat(gold ? rule.golden || [] : []);
    return rows.map(([key, expected]) => {
        const amount = Math.floor(expected) + Number(random() < expected % 1);
        return [atlasEncounterPickKey(env, key, rule, zone, random), amount];
    }).filter(([key, amount]) => amount > 0 && env.deps.contentProgression.canDropCurrency(key, owner));
}

/** One find of the map's content rooms for an atlas map's golden supply chest (data/atlas.js encounters[].chest), or null. */
export function atlasEncounterChestReward(env, zone, random, owner) {
    const rooms = (zone && Array.isArray(zone.atlasEncounters) ? zone.atlasEncounters : []).filter(type => env.deps.ATLAS.encounters[type].chest);
    if (!rooms.length) return null;
    const type = rooms[Math.min(rooms.length - 1, Math.floor(random() * rooms.length))], rule = env.deps.ATLAS.encounters[type];
    const key = atlasEncounterPickKey(env, rule.chest[0], rule, zone, random);
    return env.deps.contentProgression.canDropCurrency(key, owner) ? [key, rule.chest[1]] : null;
}

/** Seeds an emptied nursery gives (js/stump-nursery.js clearGift): one, more by the nurseryReward passive (%, the fraction by
 * chance), and one more in a golden room. */
export function atlasEncounterNurseryGifts(zone, bonus, random) {
    const expected = 1 + (Number(bonus.nurseryReward) || 0) / 100, part = expected % 1;
    return Math.floor(expected) + (part ? Number(random() < part) : 0) + Number(atlasEncounterIsGolden(zone, 'nursery'));
}
