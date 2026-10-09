/**
 * 영향 장비와 뒤바뀐 고유(data/item-influences.js). 화면은 js/item-influences-ui.js.
 * item.influence: 'guardian' | 'blight', 그 장비의 추가 옵션 풀에 전용 줄이 더해진다(js/passives.js isModForOrigin).
 * baseStats[i].altar: 'red' | 'blue', 제단이 바꾼 베이스 옵션 줄. replaced는 그 자리에 있던 줄.
 * item.swappedUnique: 기억 던전에서 줄 하나가 바뀐 고유. 바뀐 줄은 stats[i].swapped와 replaced.
 */
const itemInfluences = (() => {
    const ALTARS = Object.freeze(Object.keys(ALTAR_INFLUENCE_LINES));
    const EXPLICIT = Object.freeze(Object.keys(ITEM_INFLUENCES).filter(key => ITEM_INFLUENCES[key].line === 'explicit'));
    const CURRENCY_ALTAR = Object.freeze(Object.fromEntries(ALTARS.map(key => [ITEM_INFLUENCES[key].currency, key])));
    const ROOM_ALTAR = Object.freeze(Object.fromEntries(ALTARS.map(key => [ITEM_INFLUENCES[key].room, key])));
    const MOD_INFLUENCE = new Map(INFLUENCE_AFFIX_MODS.map(mod => [mod.id, mod.influences[0]]));
    // A base's own defence lines are its body: an altar line never takes their place.
    const DEFENSE = new Set(['armor', 'evasion', 'energyShield']);
    const SPECIFIC_TAGS = new Set(['fire', 'cold', 'light', 'chaos', 'physical', 'crit', 'speed', 'dot', 'projectile', 'melee', 'aoe',
        'summon', 'life', 'defense', 'resistance', 'recovery', 'penetration', 'attribute']);
    const slotOf = item => String((item && item.slot) || '').replace(/[123]$/, '');
    const pick = (list, random) => list[Math.floor(random() * list.length)];

    /** Influence keys an item shows, in a fixed order: its altar lines, its explicit influence, a swapped unique. */
    function influenceKeys(item) {
        if (!item) return [];
        const keys = ALTARS.filter(key => (item.baseStats || []).some(stat => stat && stat.altar === key));
        if (EXPLICIT.includes(item.influence)) keys.push(item.influence);
        if (item.swappedUnique === true) keys.push('swapped');
        return keys;
    }
    /** MOD_DB filter: an influence's exclusive row only on an item of that influence. */
    const isModForInfluence = (mod, influence) => !mod.influences || mod.influences.includes(influence);
    /** The influence of a stored explicit line ('guardian', 'blight'), or null for an ordinary line. */
    const lineInfluence = stat => (stat && MOD_INFLUENCE.get(stat.sourceModId)) || null;
    const isAltarCurrency = key => Object.hasOwn(CURRENCY_ALTAR, key);
    const altarOfCurrency = key => CURRENCY_ALTAR[key] || null;
    const altarLines = (altar, item) => (ALTAR_INFLUENCE_LINES[altar] || {})[slotOf(item)] || null;

    /** The base line an altar line takes: its own altar line again, else the last ordinary base line. The base's defence lines, an
     * exceptional line and the other altar's line stay. -1 when none is left. */
    function replaceIndex(item, altar) {
        const lines = Array.isArray(item.baseStats) ? item.baseStats : [];
        const own = lines.findIndex(stat => stat && stat.altar === altar);
        if (own >= 0) return own;
        const open = lines.map((stat, index) => ({ stat, index }))
            .filter(({ stat }) => stat && !stat.altar && !stat.exceptional && !DEFENSE.has(stat.id));
        return open.length ? open[open.length - 1].index : -1;
    }
    /** '' when the altar's line can be carved into the item, otherwise why not. */
    function altarUseReason(item, altar) {
        if (!item) return '아이템을 선택하세요.';
        if (!altarLines(altar, item)) return '투구, 갑옷, 장갑, 신발, 방패, 허리띠에만 새깁니다.';
        if (item.rarity === 'unique') return '고유 장비에는 새길 수 없습니다.';
        if (item.corrupted || item.fusedRelic || item.hallReplica) return '이 장비는 옵션을 바꿀 수 없습니다.';
        return replaceIndex(item, altar) < 0 ? '바꿀 베이스 옵션이 없습니다.' : '';
    }
    function rollTier(item, random) {
        const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
        const floor = Math.max(1, cap - ITEM_INFLUENCE_RULES.tierSpread);
        return floor + Math.floor(random() * (cap - floor + 1));
    }
    /** A fresh altar line for the item: one of its slot's lines (none the item's other base lines already carry) near its tier cap. */
    function rollAltarLine(item, altar, index, random) {
        const kept = new Set(item.baseStats.filter((stat, at) => stat && at !== index).map(stat => stat.id));
        const lines = altarLines(altar, item), open = lines.filter(line => !kept.has(line.statId));
        const line = pick(open.length ? open : lines, random), tier = rollTier(item, random);
        const [min, max] = line.tierValues[tier - 1];
        const step = Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01;
        const val = Number((min + Math.floor(random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
        return { id: line.statId, val, valMin: min, valMax: max, tier, statName: getStatName(line.statId), altar };
    }
    /** Carves the altar's line into the item in place of a base line and returns it; null when the item cannot take it. */
    function applyAltar(item, altar, random = Math.random) {
        if (altarUseReason(item, altar)) return null;
        const index = replaceIndex(item, altar), old = item.baseStats[index];
        const line = rollAltarLine(item, altar, index, random);
        line.replaced = old.altar ? old.replaced : { id: old.id, statName: old.statName || getStatName(old.id) };
        item.baseStats[index] = line;
        return line;
    }
    /** Spends one ember or ichor on the item. { ok, line } or { ok: false, reason } (nothing is spent). */
    function useAltarCurrency(state, item, currencyKey, random = Math.random) {
        const altar = altarOfCurrency(currencyKey);
        const reason = altar ? altarUseReason(item, altar) : '제단 재화가 아닙니다.';
        if (reason) return { ok: false, reason };
        if ((Number(state.currencies[currencyKey]) || 0) < 1) return { ok: false, reason: '재화 부족' };
        state.currencies[currencyKey] -= 1;
        return { ok: true, line: applyAltar(item, altar, random) };
    }

    /** The influence a late boss leaves: a region guardian's arena, or a map an apostle of blight holds instead of its boss. */
    function bossInfluence(zone) {
        if (!zone) return null;
        if (zone.atlasKind === 'guardian') return 'guardian';
        return zone.atlasApostle ? 'blight' : null;
    }
    /** An item takes one exclusive line of its influence in place of an ordinary line of the same kind (prefix or suffix), or in an
     * empty place of that kind. Locked lines stay. Nothing when it already has one or none fits the base. */
    function ensureExclusiveLine(item, random) {
        if ((item.stats || []).some(stat => lineInfluence(stat))) return;
        const pool = getAvailableMods(item).filter(mod => MOD_INFLUENCE.get(mod.id) === item.influence);
        if (!pool.length) return;
        const mod = pick(pool, random), kind = equipmentCrafting.affixKind(mod), room = equipmentCrafting.affixRoom(item);
        const same = (item.stats || []).filter(stat => equipmentCrafting.storedAffixKind(item, stat) === kind && !equipmentCrafting.keptOnReroll(item, stat));
        if (!same.length && !(room && room[kind] > 0)) return;
        if (same.length) item.stats.splice(item.stats.indexOf(pick(same, random)), 1);
        const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
        item.stats.push(rollAffixValueInTierRange(mod, Math.max(1, cap - ITEM_INFLUENCE_RULES.tierSpread), cap));
    }
    /** Gives a piece an explicit influence; a magic or rare piece also takes one of its lines now. A normal piece keeps the influence
     * for the crafting that rolls its lines later. Uniques never take one. */
    function stampInfluence(item, influence, random = Math.random) {
        if (!item || !EXPLICIT.includes(influence) || item.rarity === 'unique') return item;
        item.influence = influence;
        if (item.rarity === 'magic' || item.rarity === 'rare') ensureExclusiveLine(item, random);
        return item;
    }
    const fieldInfluence = (zone, random) => {
        const influence = bossInfluence(zone);
        return influence && random() < ITEM_INFLUENCE_RULES.fieldChance ? influence : null;
    };
    /** Every equipment drop (js/passives.js generateEquipmentDrop): a late boss's reward pieces (enemy.atlasInfluence, js/atlas-finds.js)
     * and now and then its field's drops take its influence; an altar room's pieces sometimes carry the altar's line. */
    function onDrop(item, enemy, zone, random = Math.random) {
        if (!item || item.rarity === 'unique') return item;
        const influence = (enemy && enemy.atlasInfluence) || fieldInfluence(zone, random);
        if (influence) stampInfluence(item, influence, random);
        const altar = enemy ? ROOM_ALTAR[enemy.atlasEncounter] : null;
        if (altar && random() < ITEM_INFLUENCE_RULES.altarDropChance) applyAltar(item, altar, random);
        return item;
    }
    /** Save boundary: a known explicit influence or none, altar marks only of known altars, the swapped mark as a plain flag. */
    function normalizeInfluences(item) {
        if (!item || typeof item !== 'object') return;
        if (!EXPLICIT.includes(item.influence)) delete item.influence;
        (Array.isArray(item.baseStats) ? item.baseStats : []).forEach(stat => {
            if (stat && stat.altar && !ALTARS.includes(stat.altar)) delete stat.altar;
        });
        if (item.swappedUnique !== true) delete item.swappedUnique;
    }

    // ---------------------------------------------------------------- 뒤바뀐 고유(기억 던전)
    const tagsOf = statId => ((typeof STAT_AFFIX_TAGS === 'object' && STAT_AFFIX_TAGS[statId]) || []).filter(tag => SPECIFIC_TAGS.has(tag));
    /** A swap line for the unique: one sharing a tag with its lines (any line when none does), none it already has. */
    function pickSwapLine(item, random) {
        const own = new Set(item.stats.map(stat => stat.id)), tags = new Set(item.stats.flatMap(stat => tagsOf(stat.id)));
        const open = SWAPPED_UNIQUE_LINES.filter(line => !own.has(line.statId));
        const near = open.filter(line => tagsOf(line.statId).some(tag => tags.has(tag)));
        return (near.length ? pick(near, random) : pick(open, random)) || null;
    }
    /** Where a line's value sits in its range (0 low, 1 high); the middle when the range is unknown. */
    function rollRank(stat) {
        const min = Number(stat.valMin), max = Number(stat.valMax), val = Number(stat.val);
        return [min, max, val].every(Number.isFinite) && max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0.5;
    }
    function swapLine(line, old) {
        const raw = line.min + (line.max - line.min) * rollRank(old);
        const val = Number.isInteger(line.min) && Number.isInteger(line.max) ? Math.round(raw) : Math.round(raw * 100) / 100;
        return { id: line.statId, val, valMin: line.min, valMax: line.max, tier: 0, statName: getStatName(line.statId), swapped: true,
            replaced: { id: old.id, statName: old.statName || getStatName(old.id) } };
    }
    /** The chance a memory fight's unique comes swapped (data/memory-dungeon.js swap by the memory's tier 1~5). */
    function swapChance(memoryTier) {
        const chances = MEMORY_DUNGEON.swap || [];
        const at = Math.max(0, Math.min(chances.length - 1, Math.floor(Number(memoryTier) || 1) - 1));
        return Number(chances[at]) || 0;
    }
    /** A memory fight's unique (js/atlas-run.js grantMemorySpoils): by the tier's chance one of its lines turns into another line that
     * shares a tag with it, rolled as well as the line it replaces. Marks the line (swapped, replaced) and the item (swappedUnique). */
    function swapUnique(item, memoryTier, random = Math.random) {
        if (!item || item.rarity !== 'unique' || !(item.stats || []).length || random() >= swapChance(memoryTier)) return item;
        const line = pickSwapLine(item, random);
        if (!line) return item;
        const index = Math.floor(random() * item.stats.length);
        item.stats[index] = swapLine(line, item.stats[index]);
        item.swappedUnique = true;
        return item;
    }

    return Object.freeze({ influenceKeys, isModForInfluence, lineInfluence, isAltarCurrency, altarOfCurrency, altarUseReason, applyAltar,
        useAltarCurrency, bossInfluence, stampInfluence, onDrop, normalizeInfluences, swapChance, swapUnique });
})();
safeExposeGlobals({ itemInfluences });
