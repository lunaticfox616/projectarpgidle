// 무기 대분류(data/weapon-categories.js): 낀 무기 → 대검 · 곡도 · 단궁 · 오브 · 플라스크 · 향로.
// 주인공 그림(js/canvas-hana-actors.js weaponFor), 아이템 설명, 뿌리 촉수의 드랍 쏠림이 같이 쓴다.

/** The weapon base an item was made from (uniques name theirs in UNIQUE_EQUIPMENT_RULES, old items only a base name). */
function getWeaponBaseId(item) {
    if (!item) return null;
    if (item.baseId) return item.baseId;
    const rule = typeof UNIQUE_EQUIPMENT_RULES === 'object' && item.name ? UNIQUE_EQUIPMENT_RULES[item.name] : null;
    if (rule && rule.baseId) return rule.baseId;
    const base = item.baseName ? BASE_ITEM_DB.find(row => row.slot === '무기' && row.name === item.baseName) : null;
    return base ? base.id : null;
}

/** @returns {?string} greatsword · scimitar · shortbow · orb · flask · censer for a weapon base id, else null */
function getWeaponCategoryOfBase(baseId) {
    return baseId && Object.hasOwn(WEAPON_BASE_CATEGORIES, baseId) ? WEAPON_BASE_CATEGORIES[baseId] : null;
}

/** @returns {?string} the category of an item's weapon base, null when it is not a weapon */
function getWeaponCategoryId(item) {
    return getWeaponCategoryOfBase(getWeaponBaseId(item));
}

/** @returns {string} the category name shown in item text ('' when not a weapon) */
function getWeaponCategoryName(item) {
    const id = getWeaponCategoryId(item);
    return id ? WEAPON_CATEGORIES[id].name : '';
}

/** Item titles show a weapon's category (대검, 곡도 ...) where other items show their slot ([투구] ...). */
function weaponCategorySlotLabel(item, slot) {
    return (slot === '무기' && getWeaponCategoryName(item)) || slot;
}

safeExposeGlobals({ getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel });
