/** 지도 기운과 보물 무리의 규칙(data/loot-omens.js, docs/endgame-loot-20261009.md 3절). 상태를 바꾸지 않고 계산만 한다: 지도석에 붙을
 * 기운을 고르고(js/atlas.js stamp), 지도 런의 효과(startRun), 구역 필드(buildZone), 적 배율(js/atlas-maps.js applyEnemyMods), 장비 부위와
 * 드랍 변형(js/passives.js getEquipmentDropSlot, js/loot.js), 처치마다 떨어질 것(js/atlas-finds.js)을 돌려준다. 난수는 인자로 받는다.
 */
const lootOmens = (() => {
    const BY_ID = new Map(LOOT_OMENS.list.map(omen => [omen.id, omen]));
    const ITEM_KINDS = Object.freeze({ '@jewel': state => contentProgression.isUnlocked('jewel', state) });
    const isItemKind = key => Object.hasOwn(ITEM_KINDS, key);

    /** Whether one drop key can reach this hero now: a currency its unlocks allow, or an open item kind. */
    function openKey(key, state) {
        return isItemKind(key) ? ITEM_KINDS[key](state) : contentProgression.canDropCurrency(key, state);
    }
    /** An omen can land on a map when its loop has come and, for a drops omen, one of its drops can reach the hero. */
    function available(omen, state) {
        if ((omen.minLoop || 0) > (Number(state.season) || 1)) return false;
        return omen.kind !== 'drops' || omen.drops.some(([key]) => openKey(key, state));
    }
    function pickWeighted(rows, weightOf, random) {
        const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
        let roll = random() * total;
        return rows.find(row => (roll -= weightOf(row)) < 0) || rows[rows.length - 1] || null;
    }
    /** @returns {string|null} the omen id a new map stone carries */
    function roll(state, random) {
        const pick = pickWeighted(LOOT_OMENS.list.filter(omen => available(omen, state)), omen => omen.weight, random);
        return pick ? pick.id : null;
    }
    const strengthOf = map => (LOOT_OMENS.strength[map.rarity] || 1) + (map.corrupted ? LOOT_OMENS.strength.corrupted : 0);
    /** A map stone's omen and strength, or null (an old stone, or a guardian or arena map). */
    function of(map) {
        const omen = map && BY_ID.get(map.omen);
        return omen ? { omen, strength: strengthOf(map) } : null;
    }
    /** A zone's omen (js/atlas.js buildZone put atlasOmen on it), or null. */
    function inZone(zone) {
        const omen = zone && zone.atlasOmen && BY_ID.get(zone.atlasOmen.id);
        return omen ? { omen, strength: Number(zone.atlasOmen.strength) || 1 } : null;
    }
    /** A bonus omen adds its effect × strength to the run's atlas effects (js/atlas.js startRun). */
    function runBonus(bonus, map) {
        const found = of(map);
        if (!found || found.omen.kind !== 'bonus') return bonus;
        const out = { ...bonus };
        for (const [key, value] of Object.entries(found.omen.bonus)) out[key] = (Number(out[key]) || 0) + Math.round(value * found.strength);
        return out;
    }
    const zoneFields = map => {
        const found = of(map);
        return found ? { atlasOmen: Object.freeze({ id: found.omen.id, strength: found.strength }) } : {};
    };
    const grow = (value, strength) => 1 + (Number(value || 1) - 1) * strength;
    /** Per-enemy multipliers in an atlas map (js/atlas-maps.js applyEnemyMods, and the chest stand-in in js/exploration-object-combat.js):
     * equipment count from a gear omen, unique chance from the map-wide uniqueMul times a gear omen's. Null outside atlas maps. */
    function enemyMods(zone) {
        if (!zone || zone.type !== 'atlasMap') return null;
        const found = inZone(zone), gear = found && found.omen.gear;
        return { equipmentMul: gear ? grow(gear.quantity, found.strength) : 1,
            uniqueMul: LOOT_OMENS.uniqueMul * (gear ? grow(gear.unique, found.strength) : 1) };
    }
    /** Slot weights for an equipment drop in this zone (unlisted slots weigh 1), or null without a slot omen. */
    function slotWeights(zone) {
        const found = inZone(zone), slots = found && found.omen.gear && found.omen.gear.slots;
        return slots ? Object.fromEntries(Object.entries(slots).map(([slot, value]) => [slot, grow(value, found.strength)])) : null;
    }
    /** Multiplier of one drop variant ('duplicate', 'bundle', 'corrupted') in this zone. */
    function variantMul(zone, kind) {
        const found = inZone(zone), variant = found && found.omen.gear && found.omen.gear.variant;
        return variant && variant[kind] ? grow(variant[kind], found.strength) : 1;
    }
    /** One draw from a drops omen's list: [key, count], only keys that can reach the hero. */
    function drawDrop(omen, state, random) {
        const rows = omen.drops.filter(([key]) => openKey(key, state));
        const row = pickWeighted(rows, entry => entry[1], random);
        return row ? [row[0], Math.max(1, Math.floor(row[2] || 1))] : null;
    }
    const rankOf = enemy => (enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular');
    /** What a kill in this zone gives from a drops omen: [[key, count], ...]. The boss rolls bossRolls more times. */
    function killDrops(zone, enemy, state, random) {
        const found = inZone(zone);
        if (!found || found.omen.kind !== 'drops') return [];
        const chance = LOOT_OMENS.chance[rankOf(enemy)] * found.strength;
        const rolls = Math.floor(chance) + Number(random() < chance % 1) + (enemy.isBoss ? LOOT_OMENS.bossRolls : 0);
        return Array.from({ length: rolls }, () => drawDrop(found.omen, state, random)).filter(Boolean);
    }
    /** Stray draws: an elite (stray.elite chance, once) or the boss (stray.boss times) also draws from one other drops omen. */
    function strayDrops(zone, enemy, state, random) {
        if (!zone || zone.type !== 'atlasMap' || !(enemy.isElite || enemy.isBoss)) return [];
        const rolls = enemy.isBoss ? LOOT_OMENS.stray.boss : Number(random() < LOOT_OMENS.stray.elite);
        const own = inZone(zone), pool = LOOT_OMENS.list.filter(omen => omen.kind === 'drops' && available(omen, state) && (!own || omen !== own.omen));
        return Array.from({ length: rolls }, () => pickWeighted(pool, row => row.weight, random)).filter(Boolean)
            .map(omen => drawDrop(omen, state, random)).filter(Boolean);
    }
    /** A treasure burst: rolls draws from one drops omen that can reach the hero (the map's own when it is one); golden treasure rolls more. */
    function treasureDrops(zone, state, random, golden = false) {
        const own = inZone(zone), pool = LOOT_OMENS.list.filter(omen => omen.kind === 'drops' && available(omen, state));
        const omen = own && own.omen.kind === 'drops' ? own.omen : pickWeighted(pool, row => row.weight, random);
        if (!omen) return { omen: null, drops: [] };
        const rolls = golden ? LOOT_OMENS.treasure.golden.rolls : LOOT_OMENS.treasure.rolls;
        return { omen, drops: Array.from({ length: rolls }, () => drawDrop(omen, state, random)).filter(Boolean) };
    }
    /** The jackpot of a golden treasure: a currency key that can reach the hero, or '@chase' (a chase unique). */
    function goldenJackpot(state, random) {
        const rows = LOOT_OMENS.treasure.golden.jackpot.filter(([key]) => key === '@chase' || contentProgression.canDropCurrency(key, state));
        const row = pickWeighted(rows, entry => entry[1], random);
        return row ? row[0] : '@chase';
    }
    const packRoll = (salt, pack) => (Math.abs(hashSeed(`${salt}:${pack.key}:${pack.aliveIds[0]}`)) % 10000) / 10000;
    /** Whether an ordinary pack of an atlas map carries treasure: fixed per pack from its key and first enemy, no Math.random draw. */
    function isTreasurePack(zone, pack) {
        if (!zone || zone.type !== 'atlasMap' || pack.stage !== null || pack.encounter || pack.anchor || !pack.waiting.length) return false;
        return packRoll('treasure', pack) < LOOT_OMENS.treasure.packChance;
    }
    /** Whether a treasure pack holds golden treasure (a second fixed roll of the same pack). */
    const isGoldenTreasure = pack => packRoll('golden', pack) < LOOT_OMENS.treasure.golden.chance;
    /** @returns {{id:string,name:string,note:string,tone:string,kind:string}|null} */
    const describe = id => {
        const omen = BY_ID.get(id);
        return omen ? { id: omen.id, name: omen.name, note: omen.note, tone: omen.tone, kind: omen.kind } : null;
    };
    const validId = id => typeof id === 'string' && BY_ID.has(id);
    return Object.freeze({ roll, of, inZone, runBonus, zoneFields, enemyMods, slotWeights, variantMul, killDrops, strayDrops, treasureDrops,
        goldenJackpot, isTreasurePack, isGoldenTreasure, describe, validId, strengthOf, isItemKind });
})();
safeExposeGlobals({ lootOmens });
