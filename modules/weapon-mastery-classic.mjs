import { createWeaponMastery } from './domain/weapon-mastery.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';

const rules = createWeaponMastery({
    get getWeaponCategoryId() { return getWeaponCategoryId; },
    get addStatToBucket() { return addStatToBucket; },
    get WEAPON_MASTERY() { return WEAPON_MASTERY; },
    get WEAPON_CATEGORIES() { return WEAPON_CATEGORIES; }
});
const weaponMastery = Object.freeze({ ...rules,
    onKilled: (state, enemy) => runRuntimeEventCommands(rules.onKilled(state, enemy), dispatchRuntimeEvent)
});
safeExposeGlobals({ weaponMastery });
