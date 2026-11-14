import { staleShelf, shopBodyHtml, paintWareInfo, wareName } from './npc-shop-markup.mjs';

/** Draws the shop again (after a sale, a bag page or a new shelf), or only its card with a note (why a sale did not go). */
export function redrawShop(runtime, root, note = '') {
    if (!root || !root.isConnected) return;
    const id = root.dataset.npcShop;
    if (note && !staleShelf(runtime, root)) { paintWareInfo(runtime, root, note); return; }
    root.outerHTML = shopBodyHtml(runtime, { id }, note);
}

/** A new shelf replaced the one on screen: draw it with a note and do nothing else. */
export function refreshStaleShelf(runtime, root) {
    if (!staleShelf(runtime, root)) return false;
    runtime.state.chosen = null;
    redrawShop(runtime, root, runtime.deps.npcShop.shelfChanged);
    return true;
}

/** Buys ware index of the shop root shows, into place (a bag cell over all pages) or the first free place. */
export function buyShopWare(runtime, root, index, place = null) {
    if (refreshStaleShelf(runtime, root)) return;
    const id = root.dataset.npcShop, busy = runtime.deps.shopView.busyReason(), seen = runtime.state.shown.stock.offers[index];
    const result = busy ? { ok: false, reason: busy } : runtime.deps.npcShop.buy(id, index, { place, resonanceCap: (0, runtime.deps.getEffectiveResonanceCap)(), seen });
    if (!result.ok) { runtime.state.chosen = { id, index }; redrawShop(runtime, root, result.reason); return; }
    (0, runtime.deps.playUiFeedbackSound)('uiConfirm');
    const who = runtime.deps.contentUnlockUi.personal(runtime.deps.STORY_NPCS[id].name);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('{who}에게서 [{offer}] 구매, {currencyName} {price}', { who, offer: (0, runtime.deps.escapeHTML)(wareName(runtime, result.offer)), currencyName: runtime.deps.npcShop.currencyName(result.offer.priceKey), price: result.offer.price }), 'loot-magic');
    runtime.state.chosen = result.offer.gem?.kind === 'attack' ? { id, index } : null;
    if (!runtime.deps.game.isGuideReplay) (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: true });
    redrawShop(runtime, root);
}

/** Chooses ware index: its card stays (with its buy button) until another is chosen. */
export function choose(runtime, root, index) {
    if (refreshStaleShelf(runtime, root)) return;
    runtime.state.chosen = { id: root.dataset.npcShop, index };
    runtime.deps.shopView.markChosen(root, `ware:${index}`);
    paintWareInfo(runtime, root);
}
