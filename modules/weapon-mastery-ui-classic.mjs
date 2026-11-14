import { createWeaponMasteryView } from './ui/weapon-mastery-view.mjs';
const weaponMasteryUi = createWeaponMasteryView({
    get _t() { return _t; },
    get weaponMastery() { return weaponMastery; },
    get game() { return window.GameModules.state.game; },
    get getWeaponCategoryId() { return getWeaponCategoryId; },
    get addLog() { return addLog; },
    get escapeHTML() { return escapeHTML; },
    get WEAPON_CATEGORIES() { return WEAPON_CATEGORIES; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get WEAPON_MASTERY() { return WEAPON_MASTERY; },
    get window() { return window; }
});
safeExposeGlobals({ weaponMasteryUi });
