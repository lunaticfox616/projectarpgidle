import { craftingPayment } from './crafting-payment.mjs';
import { createCurrencyFits, currencyBlockReason, currencyAddonReason, planCurrencyCraft } from './craft-currency-admission.mjs';
import { applyCurrencyCraft } from './craft-currency-effects.mjs';
import { craftHarvestPriceKey } from './craft-harvest.mjs';

/** Synchronous use; returns ordered log arguments, never renders or persists the game.
 * The no-unique fallback remains a paid failure, as in the original crafting contract. */
function useCurrency(env, owner, currencyKey, item) {
    const deps = env.deps;
    if (!item) return { reason: deps._t('먼저 아이템을 선택하세요.') };
    const payment = craftingPayment(owner, currencyKey);
    if (!Object.hasOwn(deps.ORB_DB, currencyKey) || !payment || !payment.affordable) {
        return { reason: deps._t('제작 재화가 부족하거나 사용할 수 없는 제작 방식입니다.') };
    }
    const action = deps.equipmentCrafting.resolveAction(currencyKey, item.rarity);
    const block = currencyBlockReason(env, owner, item, action);
    if (block) return { reason: block };
    const run = planCurrencyCraft(deps, owner, item, currencyKey, action);
    if (run.reason) return { reason: run.reason };
    run.token = deps.craftingResultLedger.begin(item, { currencyKey, actionKey: action });
    run.logs = [];
    if (run.spore !== 'none') deps.stumpBox.payHarvestPrice(owner, craftHarvestPriceKey(deps, run.spore));
    owner.currencies[payment.key] -= payment.cost;
    if (applyCurrencyCraft(deps, owner, item, action, run) === false) return { ok: false, logs: run.logs };
    return finishCurrencyCraft(deps, owner, item, payment, run);
}

function finishCurrencyCraft(deps, owner, item, payment, run) {
    const note = (run.spore !== 'none' && run.guaranteedMod
        ? deps._t(', 수확 보장: {statName}', { statName: run.guaranteedMod.statName }) : '')
        + deps.equipmentCrafting.spendOmen(owner, run.omen);
    deps.craftingResultLedger.commit(run.token, item);
    run.logs.push([deps._t('⚒️ {name} 사용{note}', { name: deps._t(deps.ORB_DB[payment.key].name), note }), 'loot-magic']);
    return { ok: true, logs: run.logs };
}

/** Item selection is a UI concern; every call supplies its owner and selected item. */
export function createCraftCurrencyUse(deps) {
    const env = { deps, fits: createCurrencyFits(deps) };
    return Object.freeze({
        use: (owner, currencyKey, item) => useCurrency(env, owner, currencyKey, item),
        blockReason: (owner, item, action) => currencyBlockReason(env, owner, item, action),
        addonReason: (owner, item, action, mode) => currencyAddonReason(deps, owner, item, action, mode)
    });
}
