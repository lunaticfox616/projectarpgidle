

export function influenceSlotOf(item) { return String((item && item.slot) || '').replace(/[123]$/, ''); }

export function influencePick(list, random) { return list[Math.floor(random() * list.length)]; }

/** Influence keys an item shows, in a fixed order: its altar lines, its explicit influence, a swapped unique. */
export function influenceInfluenceKeys(env, item) {
    if (!item) return [];
    const keys = env.ALTARS.filter(key => (item.baseStats || []).some(stat => stat && stat.altar === key));
    if (env.EXPLICIT.includes(item.influence)) keys.push(item.influence);
    if (item.swappedUnique === true) keys.push('swapped');
    return keys;
}

/** MOD_DB filter: an influence's exclusive row only on an item of that influence. */
export function influenceIsModForInfluence(mod, influence) { return !mod.influences || mod.influences.includes(influence); }

/** The influence of a stored explicit line ('guardian', 'blight'), or null for an ordinary line. */
export function influenceLineInfluence(env, stat) { return (stat && env.MOD_INFLUENCE.get(stat.sourceModId)) || null; }

export function influenceStackOf(env, key) { return (env.deps.ITEM_INFLUENCES[key] && env.deps.ITEM_INFLUENCES[key].stack) || null; }

/** Whether the item may take this influence too: none yet, the same one again, or only influences of its stack (태양 + 허기).
 * Any other pair is refused (2026-10-10 사용자 규칙). */
export function influenceCanTake(env, item, key) {
    const held = influenceInfluenceKeys(env, item).filter(other => other !== 'swapped' && other !== key);
    return !held.length || (!!influenceStackOf(env, key) && held.every(other => influenceStackOf(env, other) === influenceStackOf(env, key)));
}

/** '' when the item may take the influence, otherwise why not. */
export function influenceHeldReason(env, item, key) {
    if (influenceCanTake(env, item, key)) return '';
    const held = influenceInfluenceKeys(env, item).find(other => other !== 'swapped' && other !== key);
    return env.deps._t('{label}에는 {name} 줄을 새길 수 없습니다.', { label: env.deps.ITEM_INFLUENCES[held].label, name: env.deps.ITEM_INFLUENCES[key].name });
}

export function influenceIsAltarCurrency(env, key) { return Object.hasOwn(env.CURRENCY_ALTAR, key); }

export function influenceAltarOfCurrency(env, key) { return env.CURRENCY_ALTAR[key] || null; }

export function influenceAltarLines(env, altar, item) { return (env.deps.ALTAR_INFLUENCE_LINES[altar] || {})[influenceSlotOf(item)] || null; }

/** The base line an altar line takes: its own altar line again, else the last ordinary base line. The base's defence lines, an
 * exceptional line and the other altar's line stay. -1 when none is left. */
export function influenceReplaceIndex(env, item, altar) {
    const lines = Array.isArray(item.baseStats) ? item.baseStats : [];
    const own = lines.findIndex(stat => stat && stat.altar === altar);
    if (own >= 0) return own;
    const open = lines.map((stat, index) => ({ stat, index }))
        .filter(({ stat }) => stat && !stat.altar && !stat.exceptional && !env.DEFENSE.has(stat.id));
    return open.length ? open[open.length - 1].index : -1;
}

/** '' when the altar's line can be carved into the item, otherwise why not. */
export function influenceAltarUseReason(env, item, altar) {
    if (!item) return '아이템을 선택하세요.';
    if (!influenceAltarLines(env, altar, item)) return '투구, 갑옷, 장갑, 신발, 완갑, 허리띠에만 새깁니다.';
    if (item.rarity === 'unique') return '고유 장비에는 새길 수 없습니다.';
    if (item.corrupted || item.fusedRelic || item.hallReplica) return '이 장비는 옵션을 바꿀 수 없습니다.';
    return influenceReplaceIndex(env, item, altar) < 0 ? '바꿀 베이스 옵션이 없습니다.' : influenceHeldReason(env, item, altar);
}

export function influenceRollTier(env, item, random) {
    const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
    const floor = Math.max(1, cap - env.deps.ITEM_INFLUENCE_RULES.tierSpread);
    return floor + Math.floor(random() * (cap - floor + 1));
}

/** A fresh altar line for the item: one of its slot's lines (none the item's other base lines already carry) near its tier cap. */
export function influenceRollAltarLine(env, item, altar, index, random) {
    const kept = new Set(item.baseStats.filter((stat, at) => stat && at !== index).map(stat => stat.id));
    const lines = influenceAltarLines(env, altar, item), open = lines.filter(line => !kept.has(line.statId));
    const line = influencePick(open.length ? open : lines, random), tier = influenceRollTier(env, item, random);
    const [min, max] = line.tierValues[tier - 1];
    const step = Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01;
    const val = Number((min + Math.floor(random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
    return { id: line.statId, val, valMin: min, valMax: max, tier, statName: env.deps.getStatName(line.statId), altar };
}

/** Carves the altar's line into the item in place of a base line and returns it; null when the item cannot take it. */
export function influenceApplyAltar(env, item, altar, random = Math.random) {
    if (influenceAltarUseReason(env, item, altar)) return null;
    const index = influenceReplaceIndex(env, item, altar), old = item.baseStats[index];
    const line = influenceRollAltarLine(env, item, altar, index, random);
    line.replaced = old.altar ? old.replaced : { id: old.id, statName: old.statName || env.deps.getStatName(old.id) };
    item.baseStats[index] = line;
    return line;
}

/** Spends one ember or ichor on the item. { ok, line } or { ok: false, reason } (nothing is spent). */
export function influenceUseAltarCurrency(env, state, item, currencyKey, random = Math.random) {
    const altar = influenceAltarOfCurrency(env, currencyKey);
    const reason = env.deps.equipmentCrafting.buildLockReason(state) || (altar ? influenceAltarUseReason(env, item, altar) : '제단 재화가 아닙니다.');
    if (reason) return { ok: false, reason };
    if ((Number(state.currencies[currencyKey]) || 0) < 1) return { ok: false, reason: env.deps._t('재화 부족') };
    state.currencies[currencyKey] -= 1;
    return { ok: true, line: influenceApplyAltar(env, item, altar, random) };
}

/** The influence a late boss leaves: a region guardian's arena, or a map an apostle of blight holds instead of its boss. */
export function influenceBossInfluence(zone) {
    if (!zone) return null;
    if (zone.atlasKind === 'guardian') return 'guardian';
    return zone.atlasApostle ? 'blight' : null;
}

/** An item takes one exclusive line of its influence in place of an ordinary line of the same kind (prefix or suffix), or in an
 * empty place of that kind. Locked lines stay. Nothing when it already has one or none fits the base. */
export function influenceEnsureExclusiveLine(env, item, random) {
    if ((item.stats || []).some(stat => influenceLineInfluence(env, stat))) return;
    const pool = env.deps.getAvailableMods(item).filter(mod => env.MOD_INFLUENCE.get(mod.id) === item.influence);
    if (!pool.length) return;
    const mod = influencePick(pool, random), kind = env.deps.equipmentCrafting.affixKind(mod), room = env.deps.equipmentCrafting.affixRoom(item);
    const same = (item.stats || []).filter(stat => env.deps.equipmentCrafting.storedAffixKind(item, stat) === kind && !env.deps.equipmentCrafting.keptOnReroll(item, stat));
    if (!same.length && !(room && room[kind] > 0)) return;
    if (same.length) item.stats.splice(item.stats.indexOf(influencePick(same, random)), 1);
    const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
    item.stats.push(env.deps.rollAffixValueInTierRange(mod, Math.max(1, cap - env.deps.ITEM_INFLUENCE_RULES.tierSpread), cap));
}

/** Gives a piece an explicit influence; a magic or rare piece also takes one of its lines now. A normal piece keeps the influence
 * for the crafting that rolls its lines later. Uniques never take one. */
export function influenceStampInfluence(env, item, influence, random = Math.random) {
    if (!item || !env.EXPLICIT.includes(influence) || item.rarity === 'unique' || !influenceCanTake(env, item, influence)) return item;
    item.influence = influence;
    if (item.rarity === 'magic' || item.rarity === 'rare') influenceEnsureExclusiveLine(env, item, random);
    return item;
}

export function influenceFieldInfluence(env, zone, random) {
    const influence = influenceBossInfluence(zone);
    return influence && random() < env.deps.ITEM_INFLUENCE_RULES.fieldChance ? influence : null;
}

/** Every equipment drop (js/item-rolls.js generateEquipmentDrop): a late boss's reward pieces (enemy.atlasInfluence, js/atlas-finds.js)
 * and now and then its field's drops take its influence; an altar room's pieces sometimes carry the altar's line. */
export function influenceOnDrop(env, item, enemy, zone, random = Math.random) {
    if (!item || item.rarity === 'unique') return item;
    const influence = (enemy && enemy.atlasInfluence) || influenceFieldInfluence(env, zone, random);
    if (influence) influenceStampInfluence(env, item, influence, random);
    const altar = enemy ? env.ROOM_ALTAR[enemy.atlasEncounter] : null;
    if (altar && random() < env.deps.ITEM_INFLUENCE_RULES.altarDropChance) influenceApplyAltar(env, item, altar, random);
    return item;
}

/** Save boundary: a known explicit influence or none, altar marks only of known altars, the swapped mark as a plain flag. */
export function influenceNormalizeInfluences(env, item) {
    if (!item || typeof item !== 'object') return;
    if (!env.EXPLICIT.includes(item.influence)) delete item.influence;
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach(stat => {
        if (stat && stat.altar && !env.ALTARS.includes(stat.altar)) delete stat.altar;
    });
    if (item.swappedUnique !== true) delete item.swappedUnique;
}

// ---------------------------------------------------------------- 뒤바뀐 고유(기억 던전)
export function influenceTagsOf(env, statId) { return ((typeof env.deps.STAT_AFFIX_TAGS === 'object' && env.deps.STAT_AFFIX_TAGS[statId]) || []).filter(tag => env.SPECIFIC_TAGS.has(tag)); }

/** A swap line for the unique: one sharing a tag with its lines (any line when none does), none it already has. */
export function influencePickSwapLine(env, item, random) {
    const own = new Set(item.stats.map(stat => stat.id)), tags = new Set(item.stats.flatMap(stat => influenceTagsOf(env, stat.id)));
    const open = env.deps.SWAPPED_UNIQUE_LINES.filter(line => !own.has(line.statId));
    const near = open.filter(line => influenceTagsOf(env, line.statId).some(tag => tags.has(tag)));
    return (near.length ? influencePick(near, random) : influencePick(open, random)) || null;
}

/** Where a line's value sits in its range (0 low, 1 high); the middle when the range is unknown. */
export function influenceRollRank(stat) {
    const min = Number(stat.valMin), max = Number(stat.valMax), val = Number(stat.val);
    return [min, max, val].every(Number.isFinite) && max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0.5;
}

export function influenceSwapLine(env, line, old) {
    const raw = line.min + (line.max - line.min) * influenceRollRank(old);
    const val = Number.isInteger(line.min) && Number.isInteger(line.max) ? Math.round(raw) : Math.round(raw * 100) / 100;
    return { id: line.statId, val, valMin: line.min, valMax: line.max, tier: 0, statName: env.deps.getStatName(line.statId), swapped: true,
        replaced: { id: old.id, statName: old.statName || env.deps.getStatName(old.id) } };
}

/** The chance a memory fight's unique comes swapped (data/memory-dungeon.js swap by the memory's tier 1~5). */
export function influenceSwapChance(env, memoryTier) {
    const chances = env.deps.MEMORY_DUNGEON.swap || [];
    const at = Math.max(0, Math.min(chances.length - 1, Math.floor(Number(memoryTier) || 1) - 1));
    return Number(chances[at]) || 0;
}

/** A memory fight's unique (js/atlas-run.js grantMemorySpoils): by the tier's chance one of its lines turns into another line that
 * shares a tag with it, rolled as well as the line it replaces. Marks the line (swapped, replaced) and the item (swappedUnique). */
export function influenceSwapUnique(env, item, memoryTier, random = Math.random) {
    if (!item || item.rarity !== 'unique' || !(item.stats || []).length || random() >= influenceSwapChance(env, memoryTier)) return item;
    const line = influencePickSwapLine(env, item, random);
    if (!line) return item;
    const index = Math.floor(random() * item.stats.length);
    item.stats[index] = influenceSwapLine(env, line, item.stats[index]);
    item.swappedUnique = true;
    return item;
}
