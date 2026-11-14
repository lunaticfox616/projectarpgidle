const FAIRY_RING_KEPT_FIELDS = Object.freeze(['id', 'instanceId', 'loopSealed', 'locked', 'tradeLocked', 'hallRelistBlocked']);

function raiseQuality(deps, owner, item, run) {
    item.quality = Math.max(0, Math.min(20, Math.floor(item.quality || 0) + 1));
    run.logs.push([deps._t('🛠️ 장비 퀄리티 +1% (현재 {quality}%)', { quality: item.quality }), 'loot-magic']);
}

function rerollAbyssAmp(deps, item) {
    const p = item.uniqueEffectParams;
    const ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
    const ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
    p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
    item.uniqueEffectParams = p;
    const socketCount = Array.isArray(item.abyssSockets) ? item.abyssSockets.length : Math.max(1, Math.floor(Number(p.socketsMin || 1)));
    item.uniqueEffect = deps._t('심연 주얼 슬롯 ({socketCount})개, 장착 심연 주얼 효과 +{ampPct}%', { socketCount, ampPct: p.ampPct });
}

function rerollValues(deps, owner, item, run) {
    const onSide = stat => deps.equipmentCrafting.onOmenSide(item, stat, run.omen);
    item.stats.forEach(stat => { if (!stat.lockedByHoney && !stat.lockedByRift && onSide(stat)) deps.rerollStoredAffixValue(stat); });
    const infusion = item.chaosInfusion;
    if (infusion && onSide(infusion) && Number.isFinite(Number(infusion.valMin))
        && Number.isFinite(Number(infusion.valMax))) deps.rerollStoredAffixValue(infusion);
    if (!run.omen && item.uniqueEffectKey === 'abyssSocketAndJewelAmp' && item.uniqueEffectParams) rerollAbyssAmp(deps, item);
}

function jewelsBack(deps, jewels) {
    return jewels ? deps._t(' 끼운 주얼 {jewels}개는 가방으로 돌아왔습니다.', { jewels }) : '';
}

function fairyRing(deps, owner, item, run) {
    if (Math.random() < 0.25) {
        run.logs.push([deps._t('💥 요정의 고리: 아이템이 파괴되었습니다.{item}',
            { item: jewelsBack(deps, deps.destroyItem(owner, item)) }), 'attack-monster']);
        return true;
    }
    const pools = deps.uniquePools(owner, item);
    const pool = pools.chase.length && Math.random() < deps.getChaseUniqueChance(deps.getZone(owner.currentZoneId) || {})
        ? pools.chase : pools.normal;
    const unique = pool.length ? deps.createUnique(owner, pools.tier, item.slot, deps.rndChoice(pool).name) : null;
    if (!unique) { run.logs.push([deps._t('승급할 수 있는 고유가 없습니다.'), 'attack-monster']); return false; }
    // Return socket contents before replacing the object. Preserve the item's identity and locks.
    const kept = Object.fromEntries(FAIRY_RING_KEPT_FIELDS.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]));
    const jewels = deps.equipmentSockets.returnJewels(item, owner);
    Object.keys(item).forEach(key => delete item[key]);
    Object.assign(item, unique, kept);
    run.logs.push([deps._t('🌟 요정의 고리: [{name}] 고유로 진화했습니다.{jewels}',
        { name: deps._t(item.name), jewels: jewelsBack(deps, jewels) }), 'loot-unique']);
    return true;
}

function annul(deps, owner, item, run) {
    const candidates = deps.getAnnulmentRemovableStats(item).filter(row => deps.equipmentCrafting.onOmenSide(item, row.stat, run.omen));
    const picked = deps.equipmentCrafting.pickPruneLine(candidates, run.omen);
    const removed = item.stats.splice(picked.index, 1)[0];
    deps.updateItemName(item);
    run.logs.push([deps._t('🕳️ 전정 가위: {value} 옵션 제거', { value: deps._t(removed.statName || deps.getStatName(removed.id)) }), 'loot-unique']);
}

function scour(deps, owner, item, run) {
    const sideOnly = run.omen && run.omen.effect === 'side';
    const onSide = stat => deps.equipmentCrafting.onOmenSide(item, stat, run.omen);
    item.stats = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift || !onSide(stat)));
    if (item.chaosInfusion && onSide(item.chaosInfusion)) item.chaosInfusion = null;
    const remaining = deps.getItemExplicitOptionCount(item) > 0;
    item.rarity = remaining ? (sideOnly ? item.rarity : 'magic') : 'normal';
    deps.updateItemName(item);
}

function taint(deps, owner, item, run) {
    const outcome = deps.corruptCraftedItem(item);
    run.token.meta.outcome = outcome.text;
    run.logs.push([deps._t('🩸 타락: {text}', { text: outcome.text }), outcome.kind === 'nothing' ? 'attack-monster' : 'loot-unique', { toast: true }]);
}

function catalyse(deps, owner, item, run) {
    const label = deps.applyAbyssCatalystToItemQuality(item);
    run.logs.push([deps._t('🧪 심연 촉매: [{name}] 퀄리티 속성 → {label}', { name: deps._t(item.name), label }), 'loot-unique']);
}

function blessRange(stat) {
    let low = Number.isFinite(Number(stat.baseRollMin)) ? Number(stat.baseRollMin) : Number(stat.valMin);
    let high = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax) : Number(stat.valMax);
    if (!Number.isFinite(low) || !Number.isFinite(high)) {
        const fallback = Number.isFinite(Number(stat.val)) ? Number(stat.val) : Number(stat.base || 0);
        low = fallback;
        high = fallback;
    }
    return high < low ? [high, low] : [low, high];
}

function blessBaseStat(deps, stat) {
    let [low, high] = blessRange(stat);
    if (deps.isTenthStat(stat.id)) {
        const minStep = Math.round(low * 10), maxStep = Math.round(high * 10);
        stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        low = minStep / 10;
        high = maxStep / 10;
    } else {
        low = Math.floor(low);
        high = Math.floor(high);
        if (high > 0) low = Math.max(1, low);
        stat.val = low + Math.floor(Math.random() * (high - low + 1));
    }
    Object.assign(stat, { baseRollMin: low, baseRollMax: high, valMin: low, valMax: high });
}

function bless(deps, owner, item) {
    (item.baseStats || []).forEach(stat => blessBaseStat(deps, stat));
    if (typeof deps.colonyWards === 'object') deps.colonyWards.rerollBelt(item);
}

const EFFECTS = Object.freeze({
    deepWhetstone: raiseQuality, rootIron: raiseQuality, jewelPolish: raiseQuality, divine: rerollValues,
    chance: fairyRing, annulment: annul, scour, tainted: taint, abyssCatalyst: catalyse, blessing: bless
});

export function applyCurrencyCraft(deps, owner, item, action, run) {
    if (!deps.equipmentCrafting.basicActions.includes(action)) return EFFECTS[action](deps, owner, item, run);
    const guaranteedFor = copy => (run.guaranteedMod ? deps.equipmentCrafting.rollSporeLine(copy,
        deps.equipmentCrafting.pickSporeMod(copy, action, run.spore, run.omen) || run.guaranteedMod, run.omen) : null);
    deps.equipmentCrafting.craftBasic(owner, item, action, {
        addedMod: run.addedMod,
        guaranteedStat: deps.equipmentCrafting.rollSporeLine(item, run.guaranteedMod, run.omen),
        guaranteedFor, omen: run.omen
    });
    return true;
}
