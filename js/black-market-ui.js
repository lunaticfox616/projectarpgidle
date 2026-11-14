// GENERATED from modules/black-market-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/black-market-markup.mjs
  function chosenBlackOffer(runtime) {
    const list = blackOffers(runtime);
    return runtime.state.chosen && list[runtime.state.chosen.index] === runtime.state.chosen.offer ? runtime.state.chosen : null;
  }
  function blackArtHtml(runtime, offer) {
    if (offer.type === "exchange") return `${runtime.deps.shopView.coinHtml(offer.to).replace("shop-coin", "shop-ware-coin")}${offer.gain > 1 ? `<span class="shop-count">${offer.gain}</span>` : ""}`;
    if (offer.type === "skillGem") return runtime.deps.shopView.gemArtHtml({ kind: "attack", name: offer.name });
    return `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)({ slot: offer.slot, baseId: offer.baseId, baseName: offer.baseName, name: offer.name, rarity: rarityOf(runtime, offer) })}" alt="" draggable="false">`;
  }
  function blackWareHtml(runtime, offer, index, locked) {
    const price = runtime.deps.blackMarketShop.price(offer), size = runtime.deps.blackMarketShop.size(offer);
    const marks = `${runtime.deps.shopView.held(price.key) < price.amount ? " is-dear" : ""}${chosenBlackOffer(runtime)?.index === index ? " is-chosen" : ""}${locked ? " is-locked" : ""}${offer.featured || offer.chase ? " is-featured" : ""}`;
    const label = `${offerName(runtime, offer)}, ${offerKind(runtime, offer)}, ${runtime.deps.shopView.currencyName(price.key)} ${price.amount}${locked ? (0, runtime.deps._t)(", 잠금") : ""}`;
    return `<button type="button" class="shop-item rarity-${rarityOf(runtime, offer)}${marks}" data-shop-pick="offer:${index}" style="${runtime.deps.shopView.areaStyle({ ...offer, ...size })}"
            aria-pressed="${chosenBlackOffer(runtime)?.index === index}" aria-label="${(0, runtime.deps.escapeHTML)(label)}">${blackArtHtml(runtime, offer)}${locked ? '<span class="shop-lock" aria-hidden="true"></span>' : ""}${runtime.deps.shopView.priceHtml(price.key, price.amount)}</button>`;
  }
  function blackShelfHtml(runtime, list) {
    const bm = runtime.deps.blackMarketShop.state(), rows = runtime.deps.blackMarketShop.place(bm);
    const wares = list.map((offer, index) => offer ? blackWareHtml(runtime, offer, index, !!bm.lockedOffers[index]) : "").join("");
    return list.some(Boolean) ? runtime.deps.shopView.gridHtml(runtime.deps.blackMarketShop.shelf.columns, rows, wares) : '<p class="shop-empty">다 팔렸습니다. 다음 갱신에 새 물건이 들어옵니다.</p>';
  }
  function blackToolsHtml(runtime) {
    const bm = runtime.deps.blackMarketShop.state(), cost = runtime.deps.blackMarketShop.refreshCost(), left = runtime.deps.BLACK_MARKET_INSIGHT_TARGET - (bm.insight || 0);
    const slots = [["any", "전체 부위"], ...runtime.deps.BLACK_MARKET_EQUIPMENT_SLOTS.map((slot) => [slot, (0, runtime.deps.getItemSlotDisplayLabel)(null, slot)])].map(([value, label]) => `<option value="${value}" ${bm.preferredSlot === value ? "selected" : ""}>${label}</option>`).join("");
    return `<div class="shop-tools"><span>${(0, runtime.deps._t)("다음 갱신")} <strong data-black-clock></strong></span>
            <label>${(0, runtime.deps._t)("추적 부위")}<select data-black-track aria-label="${(0, runtime.deps._t)("추적 부위")}">${slots}</select></label>
            <button type="button" data-black-refresh ${runtime.deps.shopView.held("formlessDew") < cost ? "disabled" : ""}>${(0, runtime.deps._t)("즉시 갱신{price}", { price: runtime.deps.shopView.priceHtml("formlessDew", cost) })}</button></div>
            <p class="shop-tools-note">${(0, runtime.deps._t)("잠금 {lockCount}/{value},", { lockCount: runtime.deps.blackMarketShop.lockCount(), value: runtime.deps.BLACK_MARKET_MAX_LOCKED_OFFERS })}
            <strong>${left > 0 ? (0, runtime.deps._t)("표적 고유까지 {left}회 갱신", { left }) : (0, runtime.deps._t)("다음 갱신에 표적 고유 등장")}</strong></p>`;
  }
  function blackExpandHtml(runtime) {
    const count = runtime.deps.blackMarketShop.slotCount(), cost = runtime.deps.blackMarketShop.expandCost();
    if (count >= runtime.deps.BLACK_MARKET_MAX_SLOT_COUNT) return `<p class="shop-tools-note">${(0, runtime.deps._t)("진열 {count}칸(최대)", { count })}</p>`;
    return `<button type="button" class="shop-more" data-black-expand ${runtime.deps.shopView.held("goldenRule") < cost ? "disabled" : ""}>${(0, runtime.deps._t)("진열 {count}칸, 1칸 늘리기{price}", { count, price: runtime.deps.shopView.priceHtml("goldenRule", cost) })}</button>`;
  }
  function blackClockText(runtime) {
    const left = Math.max(0, Math.ceil(((runtime.deps.blackMarketShop.state().nextRefreshAt || 0) - runtime.deps.Date.now()) / 1e3));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  }
  function blackOfferCardHtml(runtime) {
    const at = chosenBlackOffer(runtime), noted = runtime.state.note ? `<p class="shop-note" role="status">${(0, runtime.deps.escapeHTML)(runtime.state.note)}</p>` : "";
    if (!at) return noted;
    const offer = at.offer, price = runtime.deps.blackMarketShop.price(offer), locked = !!runtime.deps.blackMarketShop.state().lockedOffers[at.index];
    const check = runtime.deps.blackMarketShop.check(at.index, null);
    const key = `${at.index}:${runtime.deps.shopView.held(price.key)}:${(0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game)}:${runtime.state.note}:${locked}:${check.ok}:${check.reason || ""}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.cards.get(offer);
    if (kept && kept.key === key) return kept.html;
    const html = `<div class="shop-info-deal">${blackDealHtml(runtime, at, price, locked, check)}${noted}</div><div class="shop-info-card">${blackCardBodyHtml(runtime, offer)}</div>`;
    runtime.state.cards.set(offer, { key, html });
    return html;
  }
  function blackDealHtml(runtime, at, price, locked, check) {
    const verb = at.offer.type === "exchange" ? "교환" : "구매";
    const lock = `<button type="button" class="shop-lock-toggle" data-black-lock aria-pressed="${locked}">${locked ? (0, runtime.deps._t)("잠금 해제") : (0, runtime.deps._t)("잠금")}</button>`;
    return runtime.deps.shopView.dealHtml({ key: price.key, amount: price.amount, verb, check, action: "data-black-buy", extra: lock });
  }
  function blackPeekHtml(runtime, offer) {
    const price = runtime.deps.blackMarketShop.price(offer), key = `${runtime.deps.shopView.held(price.key)}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.peeks.get(offer);
    if (kept && kept.key === key) return kept.html;
    const verb = offer.type === "exchange" ? "교환" : "구매";
    const html = `${runtime.deps.shopView.dealHtml({ key: price.key, amount: price.amount, verb, peek: true })}${blackCardBodyHtml(runtime, offer)}`;
    runtime.state.peeks.set(offer, { key, html });
    return html;
  }
  function blackCardBodyHtml(runtime, offer) {
    if (offer.type === "skillGem") return runtime.deps.shopView.gemCardHtml({ kind: "attack", name: offer.name });
    if (offer.type === "baseItem") return `${runtime.deps.shopView.itemCardHtml((0, runtime.deps.normalizeItem)(runtime.deps.blackMarketShop.baseItem(offer)))}<p class="shop-hint">${(0, runtime.deps._t)("제작용 베이스, 숨겨진 티어 {hiddenTier}", { hiddenTier: offer.hiddenTier })}</p>`;
    const head = `<div class="shop-gem-head"><span class="shop-card-art">${blackArtHtml(runtime, offer)}</span><div><small>${(0, runtime.deps.escapeHTML)(offerKind(runtime, offer))}</small>
            <strong>${(0, runtime.deps.escapeHTML)(offerName(runtime, offer))}</strong></div></div>`;
    const text = (0, runtime.deps.getBlackMarketOfferTooltipHtml)(offer).replace(/[✨🌠🎯]/gu, "");
    const rolled = offer.type === "unique" ? '<p class="shop-hint is-rolled">수치는 구매할 때 아래 범위 안에서 정해집니다.</p>' : "";
    return `${head}${rolled}<div class="shop-tooltip">${text}</div>`;
  }
  function blackMarketMarkup(runtime) {
    const list = blackOffers(runtime), keys = list.filter(Boolean).map((offer) => runtime.deps.blackMarketShop.price(offer).key);
    return `<div class="shop-view is-black" data-shop-kind="black"><div class="shop-body">
            <section class="shop-shelf" aria-label="${(0, runtime.deps._t)("암거래상")}"><header class="shop-bar"><h3>${(0, runtime.deps._t)("암거래상")}</h3>${runtime.deps.shopView.walletHtml(keys)}</header>
                ${blackToolsHtml(runtime)}${blackShelfHtml(runtime, list)}${blackExpandHtml(runtime)}</section>
            <div class="shop-info" aria-live="polite">${blackOfferCardHtml(runtime)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)("가방")}">${runtime.deps.shopView.bagHtml()}</section></div></div>`;
  }
  function blackPanel(runtime) {
    return runtime.deps.document.getElementById("market-panel-black");
  }
  function blackOffers(runtime) {
    return runtime.deps.blackMarketShop.state().offers.slice(0, runtime.deps.blackMarketShop.slotCount());
  }
  function pickIndex(runtime, pick) {
    return Number(String(pick).replace("offer:", ""));
  }
  function isGear(runtime, offer) {
    return offer.type === "baseItem" || offer.type === "unique";
  }
  function offerName(runtime, offer) {
    return offer.type === "exchange" ? (0, runtime.deps._t)("{name} {gain}개", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[offer.to].name), gain: offer.gain }) : offer.name;
  }
  function offerKind(runtime, offer) {
    return offer.featured ? "표적 고유" : offer.chase ? "체이싱 고유" : runtime.state.KIND[offer.type];
  }
  function rarityOf(runtime, offer) {
    return { exchange: "normal", skillGem: "magic", baseItem: offer.exceptionalBase ? "rare" : "normal", unique: "unique" }[offer.type];
  }

  // modules/ui/black-market-actions.mjs
  function drawBlackMarket(runtime, force = false) {
    if (!runtime.active) return;
    const panel = blackPanel(runtime);
    if (!panel || runtime.deps.shopView.dragging()) return;
    if (force || !(panel.contains(runtime.deps.document.activeElement) && runtime.deps.document.activeElement.tagName === "SELECT")) {
      clearChangedBlackOffer(runtime);
      const html = blackMarketMarkup(runtime);
      if (panel.shopMarkup !== html) {
        panel.innerHTML = html;
        panel.shopMarkup = html;
      }
    }
    const clock = panel.querySelector("[data-black-clock]");
    if (clock) clock.textContent = blackClockText(runtime);
  }
  function clearChangedBlackOffer(runtime) {
    if (runtime.state.chosen && !chosenBlackOffer(runtime)) {
      runtime.state.chosen = null;
      runtime.state.note = "진열이 바뀌었습니다. 물건을 다시 골라 주세요.";
    }
  }
  function paintBlackCard(runtime) {
    const panel = blackPanel(runtime), root = panel?.querySelector(".shop-view");
    if (!root) return;
    runtime.deps.shopView.markChosen(root, chosenBlackOffer(runtime) ? `offer:${chosenBlackOffer(runtime).index}` : null);
    runtime.deps.shopView.paintInfo(root, blackOfferCardHtml(runtime));
    panel.shopMarkup = blackMarketMarkup(runtime);
  }
  function chooseBlackOffer(runtime, index) {
    const offer = blackOffers(runtime)[index];
    if (!offer) return;
    runtime.state.chosen = { index, offer };
    runtime.state.note = "";
    paintBlackCard(runtime);
  }
  function noteBlackMarket(runtime, text) {
    runtime.state.note = text;
    drawBlackMarket(runtime, true);
  }
  async function askBlackMarket(runtime, text, options) {
    if (!runtime.active || runtime.state.pending) return false;
    const owner = runtime.deps.game, account = (0, runtime.deps.getActiveCloudUserId)();
    runtime.state.pending = true;
    let accepted = false;
    try {
      accepted = await (0, runtime.deps.requestGameConfirmation)(text, options);
    } finally {
      runtime.state.pending = false;
    }
    if (!runtime.active || !accepted) return false;
    if (runtime.deps.game !== owner || (0, runtime.deps.getActiveCloudUserId)() !== account) {
      runtime.state.chosen = null;
      noteBlackMarket(runtime, "확인하는 사이 계정이나 게임이 바뀌어 거래하지 않았습니다.");
      return false;
    }
    return stillFree(runtime);
  }
  function stillFree(runtime) {
    const busy = runtime.deps.shopView.busyReason();
    if (busy) noteBlackMarket(runtime, busy);
    return !busy;
  }
  async function buyBlackOffer(runtime, index, place = null) {
    const offer = blackOffers(runtime)[index], busy = runtime.deps.shopView.busyReason();
    if (!offer || runtime.state.pending) return;
    runtime.state.chosen = { index, offer };
    if (busy) return noteBlackMarket(runtime, busy);
    const ask = runtime.deps.blackMarketShop.confirmText(offer);
    if (ask && !await askBlackMarket(runtime, ask, { title: blackPurchaseTitle(runtime, offer), tone: "danger", confirmLabel: (0, runtime.deps._t)("구매") })) return;
    const result = runtime.deps.blackMarketShop.buy(index, { place, offer });
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    if (!ask) (0, runtime.deps.playUiFeedbackSound)("uiConfirm");
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🕶️ 암거래 구매, {summary}", { summary: result.summary }), result.notable ? "loot-unique" : "loot-magic");
    runtime.state.chosen = null;
    runtime.state.note = "";
    (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: true });
    drawBlackMarket(runtime, true);
  }
  function blackPurchaseTitle(runtime, offer) {
    return offer.chase ? "체이싱 고유 구매" : offer.featured ? "표적 고유 구매" : "고가 암거래 구매";
  }
  function lockBlackOffer(runtime) {
    const pick = chosenBlackOffer(runtime);
    if (!pick) return;
    const result = runtime.deps.blackMarketShop.lock(pick.index);
    runtime.state.note = result.ok ? "" : result.reason;
    (0, runtime.deps.queueImportantSave)(200);
    drawBlackMarket(runtime, true);
  }
  async function refreshBlackMarketPaid(runtime) {
    const cost = runtime.deps.blackMarketShop.refreshCost(), busy = runtime.deps.shopView.busyReason();
    if (runtime.state.pending) return;
    if (busy) return noteBlackMarket(runtime, busy);
    if (!await askBlackMarket(
      runtime,
      `잠그지 않은 물건을 지금 바꿉니다.
형체 없는 이슬 ${cost}개를 쓰고, 잠근 물건 ${runtime.deps.blackMarketShop.lockCount()}개는 남습니다.`,
      { title: (0, runtime.deps._t)("암거래 즉시 갱신"), confirmLabel: (0, runtime.deps._t)("갱신"), danger: false }
    )) return;
    if (runtime.deps.blackMarketShop.refreshCost() !== cost) return noteBlackMarket(runtime, "확인하는 동안 갱신 값이 바뀌었습니다. 다시 눌러 주세요.");
    const result = runtime.deps.blackMarketShop.refreshNow();
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🕶️ 암거래 즉시 갱신, 형체 없는 이슬 {cost}개", { cost: result.cost }), "loot-magic");
    runtime.state.chosen = null;
    runtime.state.note = "";
    (0, runtime.deps.updateStaticUI)();
    drawBlackMarket(runtime, true);
  }
  async function expandBlackMarketShelf(runtime) {
    const cost = runtime.deps.blackMarketShop.expandCost(), busy = runtime.deps.shopView.busyReason();
    if (runtime.state.pending) return;
    if (busy) return noteBlackMarket(runtime, busy);
    if (!await askBlackMarket(
      runtime,
      (0, runtime.deps.buildGoldenRuleSpendPrompt)(`황금률 ${cost}개를 써서 진열을 1칸 늘립니다(영구).
지금 물건과 잠금은 그대로입니다.`),
      { title: (0, runtime.deps._t)("암거래 진열 늘리기"), tone: "danger", confirmLabel: (0, runtime.deps._t)("늘리기") }
    )) return;
    if (runtime.deps.blackMarketShop.expandCost() !== cost) return noteBlackMarket(runtime, "확인하는 동안 값이 바뀌었습니다. 다시 눌러 주세요.");
    const result = runtime.deps.blackMarketShop.expand();
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🕶️ 암거래 진열 {count}/{BLACK_MARKET_MAX_SLOT_COUNT}칸, 황금률 {cost}개", { count: result.count, BLACK_MARKET_MAX_SLOT_COUNT: runtime.deps.BLACK_MARKET_MAX_SLOT_COUNT, cost: result.cost }), "loot-unique");
    (0, runtime.deps.updateStaticUI)();
    drawBlackMarket(runtime, true);
  }
  function trackBlackMarketSlot(runtime, slot) {
    if (runtime.deps.blackMarketShop.track(slot)) (0, runtime.deps.addLog)((0, runtime.deps._t)("🕶️ 암거래 추적 부위: {slot}", { slot: slot === "any" ? (0, runtime.deps._t)("전체 부위") : (0, runtime.deps.getItemSlotDisplayLabel)(null, slot) }), "loot-normal");
    (0, runtime.deps.queueImportantSave)(200);
    drawBlackMarket(runtime, true);
  }

  // modules/ui/black-market-view.mjs
  function createBlackMarketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { drawBlackMarket };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = BlackMarketViewApi(runtime);
    installBlackMarketViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.chosen = null;
    runtime.state.note = "";
    runtime.state.cards = /* @__PURE__ */ new WeakMap();
    runtime.state.peeks = /* @__PURE__ */ new WeakMap();
    runtime.state.pending = false;
    runtime.state.KIND = Object.freeze({ exchange: "재화 교환", skillGem: "공격 룬", baseItem: "제작 베이스", unique: "고유 장비" });
  }
  function BlackMarketViewShopPeekHtml(runtime, root, pick) {
    const offer = blackOffers(runtime)[pickIndex(runtime, pick)];
    return offer ? blackPeekHtml(runtime, offer) : "";
  }
  function BlackMarketViewShopTap(runtime, root, pick, { keyboard }) {
    const index = pickIndex(runtime, pick);
    const focusBuy = keyboard && chosenBlackOffer(runtime)?.index === index;
    chooseBlackOffer(runtime, index);
    if (focusBuy) runtime.deps.shopView.focusDeal(root);
  }
  function BlackMarketViewShopUnchoose(runtime) {
    runtime.state.chosen = null;
    runtime.state.note = "";
    paintBlackCard(runtime);
  }
  function BlackMarketViewShopSize(runtime, root, pick) {
    const offer = blackOffers(runtime)[pickIndex(runtime, pick)];
    return offer ? runtime.deps.blackMarketShop.size(offer) : null;
  }
  function BlackMarketViewShopAccepts(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), offer = blackOffers(runtime)[index];
    return target.area === "bag" && offer ? runtime.deps.blackMarketShop.check(index, isGear(runtime, offer) ? target : null).ok : null;
  }
  function BlackMarketViewShopDrop(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), offer = blackOffers(runtime)[index];
    if (offer) buyBlackOffer(runtime, index, isGear(runtime, offer) ? { column: target.column, row: target.row } : null);
  }
  function BlackMarketViewShopRedraw(runtime) {
    return drawBlackMarket(runtime, true);
  }
  function installBlackMarketViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("black", {
      shopPeekHtml: BlackMarketViewShopPeekHtml.bind(void 0, runtime),
      shopTap: BlackMarketViewShopTap.bind(void 0, runtime),
      shopUnchoose: BlackMarketViewShopUnchoose.bind(void 0, runtime),
      shopSize: BlackMarketViewShopSize.bind(void 0, runtime),
      shopAccepts: BlackMarketViewShopAccepts.bind(void 0, runtime),
      shopDrop: BlackMarketViewShopDrop.bind(void 0, runtime),
      shopRedraw: BlackMarketViewShopRedraw.bind(void 0, runtime)
    });
  }
  function installBlackMarketViewEvents(runtime) {
    installBlackMarketViewAdapter(runtime);
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const control = event.target.closest?.("#market-panel-black [data-black-buy], #market-panel-black [data-black-lock], #market-panel-black [data-black-refresh], #market-panel-black [data-black-expand]");
      if (!control) return;
      if (control.dataset.blackBuy !== void 0) {
        const pick = chosenBlackOffer(runtime);
        if (pick) buyBlackOffer(runtime, pick.index);
        return;
      }
      if (control.dataset.blackLock !== void 0) {
        lockBlackOffer(runtime);
        return;
      }
      if (control.dataset.blackRefresh !== void 0) {
        refreshBlackMarketPaid(runtime);
        return;
      }
      expandBlackMarketShelf(runtime);
    });
    listenView(runtime, runtime.deps.document, "change", (event) => {
      if (event.target.matches?.("#market-panel-black [data-black-track]")) trackBlackMarketSlot(runtime, event.target.value);
    });
  }
  function BlackMarketViewApi(runtime) {
    return Object.freeze({
      render: runtime.handlers.drawBlackMarket,
      dispose: () => disposeBlackMarketView(runtime)
    });
  }
  function disposeBlackMarketView(runtime) {
    releaseViewEvents(runtime);
  }

  // modules/black-market-ui-classic.mjs
  var blackMarketUi = createBlackMarketView({
    get shopView() {
      return shopView;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get blackMarketShop() {
      return blackMarketShop;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get BLACK_MARKET_INSIGHT_TARGET() {
      return BLACK_MARKET_INSIGHT_TARGET;
    },
    get BLACK_MARKET_EQUIPMENT_SLOTS() {
      return BLACK_MARKET_EQUIPMENT_SLOTS;
    },
    get BLACK_MARKET_MAX_LOCKED_OFFERS() {
      return BLACK_MARKET_MAX_LOCKED_OFFERS;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get BLACK_MARKET_MAX_SLOT_COUNT() {
      return BLACK_MARKET_MAX_SLOT_COUNT;
    },
    get Date() {
      return Date;
    },
    get getInventoryUsedCellCount() {
      return getInventoryUsedCellCount;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getPersistentBuildSignature() {
      return getPersistentBuildSignature;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get getBlackMarketOfferTooltipHtml() {
      return getBlackMarketOfferTooltipHtml;
    },
    get document() {
      return document;
    },
    get getActiveCloudUserId() {
      return getActiveCloudUserId;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
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
    get queueImportantSave() {
      return queueImportantSave;
    },
    get buildGoldenRuleSpendPrompt() {
      return buildGoldenRuleSpendPrompt;
    },
    get ORB_DB() {
      return ORB_DB;
    }
  });
  safeExposeGlobals({ blackMarketUi });
})();
