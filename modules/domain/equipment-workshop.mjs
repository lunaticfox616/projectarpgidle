import { workshopGetAdmission } from './equipment-workshop-admission.mjs';
import { workshopLiberateEncroachment, workshopOpenEncroachment, workshopCloseEncroachment, workshopConfirmEncroachment } from './equipment-workshop-liberation.mjs';
import { workshopApplyChaosInfusion, workshopRemoveChaosInfusion } from './equipment-workshop-infusion.mjs';
import { workshopApplyEnchantedHoney, workshopApplyVenomStinger, workshopApplyVoidChisel, workshopApplyWoodsmanTouch } from './equipment-workshop-modifiers.mjs';
import { workshopApplyCorruptSpore, workshopApplyRiftSpore } from './equipment-workshop-harvest.mjs';
import { destroyWorkshopItem, refineWorkshopJewel } from './equipment-workshop-jewels.mjs';

/** Selected-equipment mutations receive the owner and item explicitly.
 * The application checks getAdmission before reading its selection, then consumes commands synchronously.
 * This preserves pre-selection gates and the order of mutations, notifications and persistence requests. */
export function createEquipmentWorkshop(deps) {
    const env = { deps };

    return Object.freeze({
        getAdmission: (...args) => workshopGetAdmission(env, ...args),
        liberateEncroachment: (...args) => workshopLiberateEncroachment(env, ...args),
        applyChaosInfusion: (...args) => workshopApplyChaosInfusion(env, ...args),
        removeChaosInfusion: (...args) => workshopRemoveChaosInfusion(env, ...args),
        applyEnchantedHoney: (...args) => workshopApplyEnchantedHoney(env, ...args),
        applyVenomStinger: (...args) => workshopApplyVenomStinger(env, ...args),
        applyVoidChisel: (...args) => workshopApplyVoidChisel(env, ...args),
        applyWoodsmanTouch: (...args) => workshopApplyWoodsmanTouch(env, ...args),
        applyCorruptSpore: (...args) => workshopApplyCorruptSpore(env, ...args),
        applyRiftSpore: (...args) => workshopApplyRiftSpore(env, ...args),
        destroySelectedCraftItem: (...args) => destroyWorkshopItem(env, ...args),
        drawJewelRefine: (...args) => refineWorkshopJewel(env, ...args),
        openEncroachment: workshopOpenEncroachment,
        closeEncroachment: workshopCloseEncroachment,
        confirmEncroachment: (...args) => workshopConfirmEncroachment(env, ...args)
    });
}
