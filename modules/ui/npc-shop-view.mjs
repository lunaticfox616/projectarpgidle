import { listenView, releaseViewEvents } from './view-events.mjs';
import { shopDoorHtml, shopBodyHtml, staleShelf, wareAt, pickIndex, wareCardHtml, isChosen, paintWareInfo, paintRuneShelf } from './npc-shop-markup.mjs';
import { choose, buyShopWare, redrawShop, refreshStaleShelf } from './npc-shop-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createNpcShopView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { shopDoorHtml, shopBodyHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = NpcShopViewApi(runtime);
    installNpcShopViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.chosen = null;
    runtime.state.shown = null;
    runtime.state.runeQuery = '';
    runtime.state.runePage = 0;
    runtime.state.EARN_HINTS = Object.freeze({ magicBud: '일반 장비나 마법 장비를 해체하면 마법의 새싹을 얻습니다.',
        formlessDew: '희귀 장비나 고유 장비를 해체하면 형체 없는 이슬을 얻습니다.', goldenRule: '고유 장비를 해체하면 가끔 황금률을 얻습니다.' });
}

function NpcShopViewShopPeekHtml(runtime, root, pick) {
    const ware = staleShelf(runtime, root) ? null : wareAt(runtime, root.dataset.npcShop, pickIndex(runtime, pick));
    return ware ? `${runtime.deps.shopView.dealHtml({ key: ware.priceKey, amount: ware.price, peek: true })}${wareCardHtml(runtime, ware)}` : '';
}

function NpcShopViewShopTap(runtime, root, pick, { keyboard }) {
    const index = pickIndex(runtime, pick);
    const focusBuy = keyboard && isChosen(runtime, root.dataset.npcShop, index);
    choose(runtime, root, index);
    if (focusBuy) runtime.deps.shopView.focusDeal(root);
}

function NpcShopViewShopUnchoose(runtime, root) {
    runtime.state.chosen = null;
    runtime.deps.shopView.markChosen(root, null);
    paintWareInfo(runtime, root);
}

function NpcShopViewShopSize(runtime, root, pick) {
    const ware = wareAt(runtime, root.dataset.npcShop, pickIndex(runtime, pick));
    return ware ? (ware.gem ? { columns: 1, rows: 1 } : { columns: ware.columns, rows: ware.rows }) : null;
}

function NpcShopViewShopAccepts(runtime, root, pick, target) {
    const id = root.dataset.npcShop, index = pickIndex(runtime, pick), ware = wareAt(runtime, id, index);
    return target.area === 'bag' && ware ? runtime.deps.npcShop.check(id, index, ware.gem ? null : target).ok : null;
}

function NpcShopViewShopDrop(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), ware = wareAt(runtime, root.dataset.npcShop, index);
    if (ware) buyShopWare(runtime, root, index, ware.gem ? null : { column: target.column, row: target.row });
}

function NpcShopViewShopRedraw(runtime, root) { return redrawShop(runtime, root); }

function installNpcShopViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("npc", {
        shopPeekHtml: NpcShopViewShopPeekHtml.bind(undefined, runtime),
        shopTap: NpcShopViewShopTap.bind(undefined, runtime),
        shopUnchoose: NpcShopViewShopUnchoose.bind(undefined, runtime),
        shopSize: NpcShopViewShopSize.bind(undefined, runtime),
        shopAccepts: NpcShopViewShopAccepts.bind(undefined, runtime),
        shopDrop: NpcShopViewShopDrop.bind(undefined, runtime),
        shopRedraw: NpcShopViewShopRedraw.bind(undefined, runtime)
    });
}

function installNpcShopViewEvents(runtime) {
    installNpcShopViewAdapter(runtime);
    listenView(runtime, runtime.deps.window, 'project-idle:npc-shop-all-runes', () => {
        if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, 'tab-trade')) return;
        runtime.deps.game.noti.npcs = true;
        (0, runtime.deps.addLog)((0, runtime.deps._t)('하켄의 룬 상시 판매가 열렸습니다.'), 'season-up', { toast: true });
    });
    listenView(runtime, runtime.deps.document, 'input', event => {
        if (!event.target.matches?.('[data-npc-rune-search]')) return;
        runtime.state.runeQuery = event.target.value.trim();
        runtime.state.runePage = 0;
        paintRuneShelf(runtime, event.target.closest('.shop-view'));
    });
    listenView(runtime, runtime.deps.window, 'project-idle:npc-shop-stocked', event => {
        const root = runtime.deps.document.querySelector(`.shop-view.is-npc[data-npc-shop="${runtime.deps.CSS.escape(String(event.detail.id))}"]`);
        if (root) refreshStaleShelf(runtime, root);
    });
    listenView(runtime, runtime.deps.document, 'click', event => {
        const guide = event.target.closest?.('.shop-view.is-npc [data-npc-guide-salvage]');
        if (guide) return runtime.deps.systemTutorialUi.startShopSalvage(guide.closest('dialog'), guide.dataset.npcGuideSalvage);
        const page = event.target.closest?.('.shop-view.is-npc [data-npc-rune-page]');
        if (page) {
            runtime.state.runePage = Number(page.dataset.npcRunePage);
            paintRuneShelf(runtime, page.closest('.shop-view'));
            return;
        }
        const control = event.target.closest?.('.shop-view.is-npc [data-npc-buy]');
        if (control) buyShopWare(runtime, control.closest('.shop-view'), Number(control.dataset.npcBuy));
    });
}
function NpcShopViewApi(runtime) {
    return Object.freeze({
        door: runtime.handlers.shopDoorHtml,
        body: runtime.handlers.shopBodyHtml,
        dispose: () => disposeNpcShopView(runtime)
    });
}

function disposeNpcShopView(runtime) {
    releaseViewEvents(runtime);
}
