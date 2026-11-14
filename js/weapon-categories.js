// GENERATED from modules/weapon-categories*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/weapon-categories.mjs
  function createWeaponCategories(deps) {
    function getWeaponBaseId2(item) {
      if (!item) return null;
      if (item.baseId) return item.baseId;
      const rule = typeof deps.uniqueRules === "object" && item.name ? deps.uniqueRules[item.name] : null;
      if (rule && rule.baseId) return rule.baseId;
      const base = item.baseName ? deps.bases.find((row) => row.slot === "무기" && row.name === item.baseName) : null;
      return base ? base.id : null;
    }
    function getWeaponCategoryOfBase2(baseId) {
      return baseId && Object.hasOwn(deps.baseCategories, baseId) ? deps.baseCategories[baseId] : null;
    }
    function getWeaponCategoryId2(item) {
      return getWeaponCategoryOfBase2(getWeaponBaseId2(item));
    }
    function getWeaponCategoryName2(item) {
      const id = getWeaponCategoryId2(item);
      return id ? deps.categories[id].name : "";
    }
    function weaponCategorySlotLabel2(item, slot) {
      return slot === "무기" && getWeaponCategoryName2(item) || (slot === "방패" ? "완갑" : slot);
    }
    return Object.freeze({ getWeaponBaseId: getWeaponBaseId2, getWeaponCategoryOfBase: getWeaponCategoryOfBase2, getWeaponCategoryId: getWeaponCategoryId2, getWeaponCategoryName: getWeaponCategoryName2, weaponCategorySlotLabel: weaponCategorySlotLabel2 });
  }

  // modules/weapon-categories-classic.mjs
  var { getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel } = createWeaponCategories({
    get uniqueRules() {
      return typeof UNIQUE_EQUIPMENT_RULES === "undefined" ? void 0 : UNIQUE_EQUIPMENT_RULES;
    },
    get bases() {
      return BASE_ITEM_DB;
    },
    get baseCategories() {
      return WEAPON_BASE_CATEGORIES;
    },
    get categories() {
      return WEAPON_CATEGORIES;
    }
  });
  safeExposeGlobals({ getWeaponBaseId, getWeaponCategoryOfBase, getWeaponCategoryId, getWeaponCategoryName, weaponCategorySlotLabel });
})();
