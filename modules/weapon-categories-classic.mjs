import { createWeaponCategories } from './domain/weapon-categories.mjs';

const { getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel } = createWeaponCategories({
    get uniqueRules() { return typeof UNIQUE_EQUIPMENT_RULES === 'undefined' ? undefined : UNIQUE_EQUIPMENT_RULES; },
    get bases() { return BASE_ITEM_DB; },
    get baseCategories() { return WEAPON_BASE_CATEGORIES; },
    get categories() { return WEAPON_CATEGORIES; }
});
safeExposeGlobals({ getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel });
