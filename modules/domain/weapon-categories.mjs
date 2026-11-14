/** Shared item classification. Tables are late inputs so legacy unique/base definitions keep their load order. */
export function createWeaponCategories(deps) {
    function getWeaponBaseId(item) {
        if (!item) return null;
        if (item.baseId) return item.baseId;
        const rule = typeof deps.uniqueRules === 'object' && item.name ? deps.uniqueRules[item.name] : null;
        if (rule && rule.baseId) return rule.baseId;
        const base = item.baseName ? deps.bases.find(row => row.slot === '무기' && row.name === item.baseName) : null;
        return base ? base.id : null;
    }
    function getWeaponCategoryOfBase(baseId) {
        return baseId && Object.hasOwn(deps.baseCategories, baseId) ? deps.baseCategories[baseId] : null;
    }
    function getWeaponCategoryId(item) { return getWeaponCategoryOfBase(getWeaponBaseId(item)); }
    function getWeaponCategoryName(item) {
        const id = getWeaponCategoryId(item);
        return id ? deps.categories[id].name : '';
    }
    function weaponCategorySlotLabel(item, slot) {
        return (slot === '무기' && getWeaponCategoryName(item)) || (slot === '방패' ? '완갑' : slot);
    }
    return Object.freeze({ getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel });
}
