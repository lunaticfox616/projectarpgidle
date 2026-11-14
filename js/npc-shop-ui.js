// GENERATED from modules/npc-shop-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/npc-shop-markup.mjs
  function shopDoorHtml(runtime, npc) {
    const shop = runtime.deps.NPC_SHOPS[npc.id], stock = runtime.deps.npcShop.stock(npc.id);
    if (!shop || !stock) return "";
    const left = stock.offers.length, ready = runtime.deps.npcShop.ready(npc.id);
    return `<button type="button" class="npc-dialog-shop" data-npc-topic="shop"><span>${(0, runtime.deps._t)("상점")}</span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label))}</b>
            <em>${left ? `${left}개${ready ? (0, runtime.deps._t)(", {ready}개 살 수 있음", { ready }) : ""}` : (0, runtime.deps._t)("다 팔림")}</em></button>`;
  }
  function shopBodyHtml(runtime, npc, note = "") {
    const shop = runtime.deps.NPC_SHOPS[npc.id], stock = runtime.deps.npcShop.stock(npc.id);
    runtime.state.shown = { id: npc.id, stock, owner: runtime.deps.game };
    const keys = stock && stock.allRunes ? runtime.deps.stumpBox.harvestWalletKeys() : (stock ? stock.offers : []).map((ware) => ware.priceKey);
    return `<div class="shop-view is-npc" data-shop-kind="npc" data-npc-shop="${npc.id}"><div class="shop-body">
            <section class="shop-shelf" aria-label="${(0, runtime.deps._t)("{label} 상점", { label: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label)) })}"><header class="shop-bar">
                <button type="button" class="shop-back" data-npc-topic="greet">${(0, runtime.deps._t)("대화")}</button><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label))}</h3>${runtime.deps.shopView.walletHtml(keys)}</header>
                ${runeNoteHtml(runtime, shop, stock)}${shelfBlockHtml(runtime, npc.id, stock)}</section>
            <div class="shop-info" aria-live="polite">${wareInfoHtml(runtime, npc.id, note)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)("가방")}">${runtime.deps.shopView.bagHtml()}</section></div></div>`;
  }
  function runeNoteHtml(runtime, shop, stock) {
    if (shop.kind !== "gem") return "";
    if (!stock || !stock.allRunes) return `<p class="shop-rune-note">${(0, runtime.deps._t)("이번 루프에 액트 {allRunesAct}를 깨면 룬을 상시 판매합니다.", { allRunesAct: runtime.deps.npcShop.allRunesAct })}</p>`;
    return `<p class="shop-rune-note is-open">${(0, runtime.deps._t)("이번 루프에는 룬을 상시 판매합니다.")}</p>`;
  }
  function runeToolsHtml(runtime, stock) {
    return `<div class="shop-rune-tools"><input type="search" class="shop-rune-search" data-npc-rune-search placeholder="${(0, runtime.deps._t)("룬 이름, 효과 검색")}" aria-label="${(0, runtime.deps._t)("룬 검색")}" value="${(0, runtime.deps.escapeHTML)(runtime.state.runeQuery)}">
            <nav class="shop-pages" aria-label="${(0, runtime.deps._t)("진열대 쪽")}" data-npc-rune-pages>${runePagesHtml(runtime, stock)}</nav></div>`;
  }
  function runeShelfRows(runtime, stock) {
    const dear = (ware) => runtime.deps.shopView.held(ware.priceKey) < ware.price ? 1 : 0;
    return stock.offers.map((ware, index) => ({ ware, index })).filter((row) => !runeMissesQuery(runtime, row.ware)).sort((a, b) => dear(a.ware) - dear(b.ware) || a.index - b.index);
  }
  function runePageCount(runtime, stock) {
    return Math.max(1, Math.ceil(runeShelfRows(runtime, stock).length / runePageCells(runtime)));
  }
  function runePagesHtml(runtime, stock) {
    const pages = runePageCount(runtime, stock);
    runtime.state.runePage = Math.min(runtime.state.runePage, pages - 1);
    if (pages <= 1) return "";
    return Array.from({ length: pages }, (_, page) => `<button type="button" data-npc-rune-page="${page}" aria-pressed="${page === runtime.state.runePage}">${page + 1}</button>`).join("");
  }
  function paintRuneShelf(runtime, root) {
    const stock = runtime.deps.npcShop.stock(root.dataset.npcShop), grid = root.querySelector(".shop-shelf > .shop-grid");
    if (!stock || !grid) return;
    root.querySelector("[data-npc-rune-pages]").innerHTML = runePagesHtml(runtime, stock);
    grid.outerHTML = runeShelfHtml(runtime, root.dataset.npcShop, stock);
  }
  function wareArtHtml(runtime, ware) {
    return ware.gem ? runtime.deps.shopView.gemArtHtml(ware.gem) : `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(ware.item)}" alt="" draggable="false">`;
  }
  function wareCellHtml(runtime, id, ware, index, place) {
    const rarity = ware.gem ? ware.gem.kind === "support" ? "rare" : "magic" : ware.item.rarity || "normal";
    const marks = `${runtime.deps.shopView.held(ware.priceKey) < ware.price ? " is-dear" : ""}${isChosen(runtime, id, index) ? " is-chosen" : ""}`;
    return `<button type="button" class="shop-item rarity-${rarity}${marks}" data-shop-pick="ware:${index}" style="${runtime.deps.shopView.areaStyle(place)}"
            aria-pressed="${isChosen(runtime, id, index)}" aria-label="${(0, runtime.deps.escapeHTML)(wareName(runtime, ware))}, ${(0, runtime.deps.escapeHTML)(runtime.deps.npcShop.currencyName(ware.priceKey))} ${ware.price}">
            ${wareArtHtml(runtime, ware)}${runtime.deps.shopView.priceHtml(ware.priceKey, ware.price)}</button>`;
  }
  function runeShelfHtml(runtime, id, stock) {
    const cells = runePageCells(runtime), columns = runtime.deps.npcShop.grid.columns, from = runtime.state.runePage * cells;
    const wares = runeShelfRows(runtime, stock).slice(from, from + cells).map((row, spot) => wareCellHtml(runtime, id, row.ware, row.index, { column: spot % columns, row: Math.floor(spot / columns), columns: 1, rows: 1 })).join("");
    return runtime.deps.shopView.gridHtml(columns, runtime.deps.npcShop.grid.rows, wares);
  }
  function shelfBlockHtml(runtime, id, stock) {
    if (!stock || !stock.offers.length) return `<p class="shop-empty">${stock && stock.allRunes ? (0, runtime.deps._t)("판매할 룬이 없습니다.") : (0, runtime.deps._t)("다 팔렸습니다. 다음에 만나면 새 물건을 들여옵니다.")}</p>`;
    return stock.allRunes ? runeToolsHtml(runtime, stock) + runeShelfHtml(runtime, id, stock) : shelfHtml(runtime, id, stock);
  }
  function shelfHtml(runtime, id, stock) {
    return runtime.deps.shopView.gridHtml(runtime.deps.npcShop.grid.columns, runtime.deps.npcShop.grid.rows, stock.offers.map((ware, index) => wareCellHtml(runtime, id, ware, index, ware)).join(""));
  }
  function wareInfoHtml(runtime, id, note = "") {
    const index = runtime.state.chosen && runtime.state.chosen.id === id ? runtime.state.chosen.index : null, ware = index === null ? null : wareAt(runtime, id, index);
    const noted = note ? `<p class="shop-note" role="status">${(0, runtime.deps.escapeHTML)(note)}</p>` : "";
    if (!ware) return noted;
    const deal = runtime.deps.shopView.dealHtml({ key: ware.priceKey, amount: ware.price, check: runtime.deps.npcShop.check(id, index, null), action: `data-npc-buy="${index}"` });
    return `<div class="shop-info-deal">${deal}${noted}${earnHintHtml(runtime, ware)}</div><div class="shop-info-card">${wareCardHtml(runtime, ware)}</div>`;
  }
  function paintWareInfo(runtime, root, note = "") {
    runtime.deps.shopView.paintInfo(root, wareInfoHtml(runtime, root.dataset.npcShop, note));
  }
  function harvestHint(runtime, key) {
    const name = runtime.deps.stumpBox.harvestPriceName(key);
    return `그루터기 함 보관함의 다 자란 ${name}${(0, runtime.deps.pickParticle)(name, "으로", "로")} 삽니다. 판에 놓인 것은 보관함으로 옮기세요.`;
  }
  function earnHintHtml(runtime, ware) {
    if (runtime.deps.shopView.held(ware.priceKey) >= ware.price) return "";
    const hint = runtime.deps.stumpBox.isHarvestPrice(ware.priceKey) ? harvestHint(runtime, ware.priceKey) : runtime.state.EARN_HINTS[ware.priceKey];
    if (!hint) return "";
    const guide = !runtime.deps.game.isGuideReplay && runtime.deps.systemTutorialUi.canGuideSalvage(ware.priceKey) ? `<button type="button" data-npc-guide-salvage="${ware.priceKey}">${(0, runtime.deps._t)("장비 해체 방법 보기")}</button>` : "";
    return `<p class="shop-hint">${(0, runtime.deps._t)(hint)}</p>${guide}`;
  }
  function wareAt(runtime, id, index) {
    return runtime.deps.npcShop.stock(id)?.offers[index] || null;
  }
  function wareName(runtime, ware) {
    return ware.gem ? ware.gem.name : ware.item.name || ware.item.baseName || "장비";
  }
  function isChosen(runtime, id, index) {
    return !!runtime.state.chosen && runtime.state.chosen.id === id && runtime.state.chosen.index === index;
  }
  function pickIndex(runtime, pick) {
    return Number(String(pick).replace("ware:", ""));
  }
  function staleShelf(runtime, root) {
    const shown = runtime.state.shown;
    return !shown || shown.owner !== runtime.deps.game || shown.id !== root.dataset.npcShop || shown.stock !== runtime.deps.npcShop.stock(root.dataset.npcShop);
  }
  function runePageCells(runtime) {
    return runtime.deps.npcShop.grid.columns * runtime.deps.npcShop.grid.rows;
  }
  function gemDefOf(runtime, gem) {
    return gem.kind === "support" ? runtime.deps.SUPPORT_GEM_DB[gem.name] : runtime.deps.SKILL_DB[gem.name];
  }
  function runeMissesQuery(runtime, ware) {
    return !!runtime.state.runeQuery && !(0, runtime.deps.matchSearchQuery)(runtime.deps.window.getGemSearchText(ware.gem.name, gemDefOf(runtime, ware.gem)), runtime.state.runeQuery);
  }
  function wareCardHtml(runtime, ware) {
    return ware.gem ? runtime.deps.shopView.gemCardHtml(ware.gem) : runtime.deps.shopView.itemCardHtml(ware.item);
  }

  // modules/ui/npc-shop-actions.mjs
  function redrawShop(runtime, root, note = "") {
    if (!root || !root.isConnected) return;
    const id = root.dataset.npcShop;
    if (note && !staleShelf(runtime, root)) {
      paintWareInfo(runtime, root, note);
      return;
    }
    root.outerHTML = shopBodyHtml(runtime, { id }, note);
  }
  function refreshStaleShelf(runtime, root) {
    if (!staleShelf(runtime, root)) return false;
    runtime.state.chosen = null;
    redrawShop(runtime, root, runtime.deps.npcShop.shelfChanged);
    return true;
  }
  function buyShopWare(runtime, root, index, place = null) {
    if (refreshStaleShelf(runtime, root)) return;
    const id = root.dataset.npcShop, busy = runtime.deps.shopView.busyReason(), seen = runtime.state.shown.stock.offers[index];
    const result = busy ? { ok: false, reason: busy } : runtime.deps.npcShop.buy(id, index, { place, resonanceCap: (0, runtime.deps.getEffectiveResonanceCap)(), seen });
    if (!result.ok) {
      runtime.state.chosen = { id, index };
      redrawShop(runtime, root, result.reason);
      return;
    }
    (0, runtime.deps.playUiFeedbackSound)("uiConfirm");
    const who = runtime.deps.contentUnlockUi.personal(runtime.deps.STORY_NPCS[id].name);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("{who}에게서 [{offer}] 구매, {currencyName} {price}", { who, offer: (0, runtime.deps.escapeHTML)(wareName(runtime, result.offer)), currencyName: runtime.deps.npcShop.currencyName(result.offer.priceKey), price: result.offer.price }), "loot-magic");
    runtime.state.chosen = result.offer.gem?.kind === "attack" ? { id, index } : null;
    if (!runtime.deps.game.isGuideReplay) (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: true });
    redrawShop(runtime, root);
  }
  function choose(runtime, root, index) {
    if (refreshStaleShelf(runtime, root)) return;
    runtime.state.chosen = { id: root.dataset.npcShop, index };
    runtime.deps.shopView.markChosen(root, `ware:${index}`);
    paintWareInfo(runtime, root);
  }

  // modules/ui/npc-shop-view.mjs
  function createNpcShopView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { shopDoorHtml, shopBodyHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = NpcShopViewApi(runtime);
    installNpcShopViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.chosen = null;
    runtime.state.shown = null;
    runtime.state.runeQuery = "";
    runtime.state.runePage = 0;
    runtime.state.EARN_HINTS = Object.freeze({
      magicBud: "일반 장비나 마법 장비를 해체하면 마법의 새싹을 얻습니다.",
      formlessDew: "희귀 장비나 고유 장비를 해체하면 형체 없는 이슬을 얻습니다.",
      goldenRule: "고유 장비를 해체하면 가끔 황금률을 얻습니다."
    });
  }
  function NpcShopViewShopPeekHtml(runtime, root, pick) {
    const ware = staleShelf(runtime, root) ? null : wareAt(runtime, root.dataset.npcShop, pickIndex(runtime, pick));
    return ware ? `${runtime.deps.shopView.dealHtml({ key: ware.priceKey, amount: ware.price, peek: true })}${wareCardHtml(runtime, ware)}` : "";
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
    return ware ? ware.gem ? { columns: 1, rows: 1 } : { columns: ware.columns, rows: ware.rows } : null;
  }
  function NpcShopViewShopAccepts(runtime, root, pick, target) {
    const id = root.dataset.npcShop, index = pickIndex(runtime, pick), ware = wareAt(runtime, id, index);
    return target.area === "bag" && ware ? runtime.deps.npcShop.check(id, index, ware.gem ? null : target).ok : null;
  }
  function NpcShopViewShopDrop(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), ware = wareAt(runtime, root.dataset.npcShop, index);
    if (ware) buyShopWare(runtime, root, index, ware.gem ? null : { column: target.column, row: target.row });
  }
  function NpcShopViewShopRedraw(runtime, root) {
    return redrawShop(runtime, root);
  }
  function installNpcShopViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("npc", {
      shopPeekHtml: NpcShopViewShopPeekHtml.bind(void 0, runtime),
      shopTap: NpcShopViewShopTap.bind(void 0, runtime),
      shopUnchoose: NpcShopViewShopUnchoose.bind(void 0, runtime),
      shopSize: NpcShopViewShopSize.bind(void 0, runtime),
      shopAccepts: NpcShopViewShopAccepts.bind(void 0, runtime),
      shopDrop: NpcShopViewShopDrop.bind(void 0, runtime),
      shopRedraw: NpcShopViewShopRedraw.bind(void 0, runtime)
    });
  }
  function installNpcShopViewEvents(runtime) {
    installNpcShopViewAdapter(runtime);
    listenView(runtime, runtime.deps.window, "project-idle:npc-shop-all-runes", () => {
      if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, "tab-trade")) return;
      runtime.deps.game.noti.npcs = true;
      (0, runtime.deps.addLog)((0, runtime.deps._t)("하켄의 룬 상시 판매가 열렸습니다."), "season-up", { toast: true });
    });
    listenView(runtime, runtime.deps.document, "input", (event) => {
      if (!event.target.matches?.("[data-npc-rune-search]")) return;
      runtime.state.runeQuery = event.target.value.trim();
      runtime.state.runePage = 0;
      paintRuneShelf(runtime, event.target.closest(".shop-view"));
    });
    listenView(runtime, runtime.deps.window, "project-idle:npc-shop-stocked", (event) => {
      const root = runtime.deps.document.querySelector(`.shop-view.is-npc[data-npc-shop="${runtime.deps.CSS.escape(String(event.detail.id))}"]`);
      if (root) refreshStaleShelf(runtime, root);
    });
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const guide = event.target.closest?.(".shop-view.is-npc [data-npc-guide-salvage]");
      if (guide) return runtime.deps.systemTutorialUi.startShopSalvage(guide.closest("dialog"), guide.dataset.npcGuideSalvage);
      const page = event.target.closest?.(".shop-view.is-npc [data-npc-rune-page]");
      if (page) {
        runtime.state.runePage = Number(page.dataset.npcRunePage);
        paintRuneShelf(runtime, page.closest(".shop-view"));
        return;
      }
      const control = event.target.closest?.(".shop-view.is-npc [data-npc-buy]");
      if (control) buyShopWare(runtime, control.closest(".shop-view"), Number(control.dataset.npcBuy));
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

  // modules/npc-shop-ui-classic.mjs
  var npcShopUi = createNpcShopView({
    get NPC_SHOPS() {
      return NPC_SHOPS;
    },
    get npcShop() {
      return npcShop;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get stumpBox() {
      return stumpBox;
    },
    get shopView() {
      return shopView;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get pickParticle() {
      return pickParticle;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get systemTutorialUi() {
      return systemTutorialUi;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get STORY_NPCS() {
      return STORY_NPCS;
    },
    get addLog() {
      return addLog;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get saveGame() {
      return saveGame;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get matchSearchQuery() {
      return matchSearchQuery;
    },
    get window() {
      return window;
    },
    get contentProgression() {
      return contentProgression;
    },
    get document() {
      return document;
    },
    get CSS() {
      return CSS;
    }
  });
  safeExposeGlobals({ npcShopUi });
})();
