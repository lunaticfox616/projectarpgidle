// GENERATED from modules/shop-view-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/shop-gem-preview.mjs
  function gearRatingHtml(runtime, item) {
    const wearable = (0, runtime.deps.getEquipCandidateSlots)(item).some((slot) => runtime.deps.combatEquipmentStats.inspect(item, slot).ok);
    const rating = wearable ? runtime.deps.equipmentTriage.rate(item) : null;
    if (!rating) return "";
    const chips = [
      rating.dpsGainPct >= 1 ? `<span class="is-damage">${(0, runtime.deps._t)("공격 +{dpsGainPct}%", { dpsGainPct: rating.dpsGainPct })}</span>` : "",
      rating.ehpGainPct >= 1 ? `<span class="is-defense">${(0, runtime.deps._t)("생존 +{ehpGainPct}%", { ehpGainPct: rating.ehpGainPct })}</span>` : ""
    ].join("");
    return `<p class="shop-rating">${chips || (0, runtime.deps._t)("<span>현 세팅 유지</span>")}</p>`;
  }
  function gemArtHtml(runtime, gem) {
    return gem.kind === "support" ? runtime.deps.supportGemSigil.html(gem.name, "shop-gem", 0) : (0, runtime.deps.renderSkillGemArt)(gem.name, "shop-gem", { eager: true, plain: true });
  }
  function gemCardHtml(runtime, gem) {
    const support = gem.kind === "support", def = (support ? runtime.deps.SUPPORT_GEM_DB : runtime.deps.SKILL_DB)[gem.name] || {};
    const need = (0, runtime.deps.getRuneLevelReq)(gem.name, support);
    const copies = support ? 0 : runtime.deps.gemDropRewards.copyCount(runtime.deps.game, gem.name);
    const kind = `${support ? (0, runtime.deps._t)("보조스킬룬, {name}", { name: (0, runtime.deps.getSupportTierLabel)(gem.name, gem.tier) }) : (0, runtime.deps._t)("공격 룬")}${need ? `, Lv.${need}` : ""}${copies ? (0, runtime.deps._t)(", 보유 {copies}개", { copies }) : ""}`;
    return `<div class="shop-gem-card"><div class="shop-gem-head">${gemArtHtml(runtime, gem)}<div><small>${(0, runtime.deps.escapeHTML)(kind)}</small>
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(gem.name))}</strong></div></div><p>${runtime.deps.statToneText.html((0, runtime.deps._t)(def.desc) || "")}</p>${support ? supportFitHtml(runtime, gem) : runeFitHtml(runtime, gem.name)}</div>`;
  }
  function runeFitHtml(runtime, name) {
    const note = (0, runtime.deps.getSkillRuneBlockedLine)(name);
    if (note) return `<p class="shop-note">${(0, runtime.deps.escapeHTML)(note)}</p>`;
    return (runtime.deps.SKILL_DB[name]?.tags || []).includes("summon") || (0, runtime.deps.isMobilityRuneName)(name) ? "" : wearPreviewHtml(runtime, (copy) => {
      copy.activeSkill = name;
    });
  }
  function supportFitHtml(runtime, gem) {
    const levelNote = (0, runtime.deps.getRuneLevelNote)(gem.name, true);
    if (levelNote) return `<p class="shop-note">${(0, runtime.deps._t)("지금 쓸 수 없음: {levelNote}", { levelNote })}</p>`;
    return supportFits(runtime, gem) ? wearPreviewHtml(runtime, (copy) => wearSupportOnCopy(runtime, copy, gem)) : "";
  }
  function supportFits(runtime, gem) {
    const worn = Array.isArray(runtime.deps.game.equippedSupports) ? runtime.deps.game.equippedSupports : [], wearing = worn.includes(gem.name);
    const stats = (0, runtime.deps.getUiPlayerStats)(), used = worn.reduce((sum, name) => sum + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    if (!wearing && worn.length >= Math.floor(stats.suppCap || 0)) return false;
    if (runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return true;
    const freed = wearing ? (0, runtime.deps.getSupportTierResonanceCost)(gem.name) : 0;
    return (0, runtime.deps.getEffectiveResonanceCap)(stats) - used + freed >= (0, runtime.deps.getSupportResonanceCostAtTier)(gem.name, gem.tier);
  }
  function wearSupportOnCopy(runtime, copy, gem) {
    const record = (copy.supportGemData || {})[gem.name] || { level: 1, exp: 0 };
    copy.supports = [.../* @__PURE__ */ new Set([...copy.supports || [], gem.name])];
    copy.supportGemData = { ...copy.supportGemData, [gem.name]: { ...record, unlockedTier: gem.tier, activeTier: gem.tier } };
    copy.equippedSupports = [.../* @__PURE__ */ new Set([...copy.equippedSupports || [], gem.name])];
  }
  function wearPreviewHtml(runtime, edit) {
    const parts = (0, runtime.deps.buildStatPreviewParts)((0, runtime.deps.previewBuildStats)(edit));
    return parts ? `<p class="shop-gem-dps">${(0, runtime.deps._t)("장착하면 {parts}", { parts })}</p>` : "";
  }

  // modules/domain/equipment-hall.mjs
  function hallReplayBusyReason(replay) {
    return replay.snapshot || replay.processing || replay.failed ? "방치 전투 정산을 마친 뒤 이용해 주세요." : "";
  }

  // modules/ui/shop-markup.mjs
  function coinHtml(runtime, key) {
    if (isHarvest(runtime, key)) return `<img class="shop-coin${/:\w+:/.test(key) ? "" : " is-any-colour"}" src="${runtime.deps.stumpBox.harvestPriceIcon(key)}" alt="">`;
    const icon = runtime.deps.ORB_DB[key] && runtime.deps.ORB_DB[key].icon;
    return icon ? `<img class="shop-coin" src="${icon}" alt="">` : "";
  }
  function walletHtml(runtime, keys) {
    const shown = [...runtime.state.WALLET_ORDER.filter((key) => keys.includes(key)), ...[...new Set(keys)].filter((key) => !runtime.state.WALLET_ORDER.includes(key))];
    return `<span class="shop-wallet">${shown.map((key) => `<span data-tip="${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))}">${coinHtml(runtime, key) || `<small>${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))}</small> `}${held(runtime, key).toLocaleString()}</span>`).join("")}</span>`;
  }
  function cellsHtml(runtime, columns, rows, mark = () => "") {
    let cells = "";
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) cells += `<span class="shop-cell" style="grid-area:${row + 1}/${column + 1}" ${mark(column, row)}></span>`;
    }
    return cells;
  }
  function bagHtml(runtime, pick = null) {
    const layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    runtime.state.bagPage = Math.max(0, Math.min(layout.unlockedPageCount - 1, runtime.state.bagPage));
    const page = runtime.deps.equipmentInventoryGridRuntime.getPageLayout(layout, runtime.state.bagPage), rows = runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    const items = page.entries.map((entry) => bagItemHtml(runtime, entry, pick ? pick(entry.item) : null)).join("");
    const pages = layout.unlockedPageCount > 1 ? `<nav class="shop-pages" aria-label="${(0, runtime.deps._t)("가방 쪽")}">${Array.from({ length: layout.unlockedPageCount }, (_, index) => `<button type="button" data-shop-bag-page="${index}" aria-pressed="${index === runtime.state.bagPage}">${index + 1}</button>`).join("")}</nav>` : "";
    return `<header class="shop-bar"><h3>${(0, runtime.deps._t)("가방")}</h3><span class="shop-room">${(0, runtime.deps._t)("{game}/{game2}칸", { game: (0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game), game2: (0, runtime.deps.getInventoryLimit)(runtime.deps.game) })}</span>${pages}</header>
            <div class="shop-grid is-bag" style="--grid-columns:${layout.columns};--grid-rows:${rows}">${cellsHtml(runtime, layout.columns, rows, (column, row) => `data-bag-cell="${column}:${row}"`)}${items}</div>`;
  }
  function bagItemHtml(runtime, entry, choice) {
    const item = entry.item, art = `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false">`, style = areaStyle(runtime, entry);
    if (!choice) return `<span class="shop-bag-item rarity-${item.rarity || "normal"}" style="${style}" data-shop-item="${item.id}">${art}</span>`;
    const { key, chosen, reason } = choice;
    if (!key) return dimBagItemHtml(runtime, item, style, art, reason);
    return `<button type="button" class="shop-bag-item is-pick rarity-${item.rarity || "normal"}${chosen ? " is-chosen" : ""}" style="${style}"
            data-shop-pick="${(0, runtime.deps.escapeHTML)(key)}" data-shop-item="${item.id}" aria-label="${(0, runtime.deps.escapeHTML)(item.name || item.baseName || "장비")}">${art}</button>`;
  }
  function dimBagItemHtml(runtime, item, style, art, reason) {
    return `<button type="button" class="shop-bag-item rarity-${item.rarity || "normal"} is-dim" style="${style}" data-shop-dim="${item.id}"
            data-shop-item="${item.id}" data-shop-why="${(0, runtime.deps.escapeHTML)(reason || "")}" aria-label="${(0, runtime.deps.escapeHTML)(`${item.name || item.baseName || (0, runtime.deps._t)("장비")}, ${reason || (0, runtime.deps._t)("고를 수 없음")}`)}">${art}</button>`;
  }
  function itemCardHtml(runtime, item, { rating = true } = {}) {
    const key = `${rating}:${JSON.stringify(item)}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.cardMemo.get(item);
    if (kept && kept.key === key) return kept.html;
    const box = runtime.deps.document.createElement("div");
    (0, runtime.deps.showItemTooltip)(null, null, false, item, { target: box });
    const html = `<div class="shop-tooltip">${box.innerHTML}</div>${rating ? gearRatingHtml(runtime, item) : ""}`;
    runtime.state.cardMemo.set(item, { key, html });
    return html;
  }
  function dealHtml(runtime, { key, amount, verb = "구매", check = { ok: true }, action = "", extra = "", peek = false }) {
    const have = held(runtime, key), price = Number(amount) || 0, short = Math.max(0, price - have);
    const purse = short ? `<span class="is-short">${(0, runtime.deps._t)("보유 {have}, {short} 부족", { have: have.toLocaleString(), short: short.toLocaleString() })}</span>` : `<span>${(0, runtime.deps._t)("보유 {have} → {verb} 후 {value}", { have: have.toLocaleString(), verb, value: (have - price).toLocaleString() })}</span>`;
    const act = dealActionsHtml(runtime, { verb, check, action, extra, peek });
    return `<div class="shop-deal${peek ? " is-peek" : ""}"><p class="shop-deal-price"><span>${(0, runtime.deps._t)("가격")}</span>${coinHtml(runtime, key)}
            <strong${short ? ' class="is-short"' : ""}>${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))} ${price.toLocaleString()}</strong></p>
            <p class="shop-deal-purse">${purse}</p>${act}</div>`;
  }
  function dealActionsHtml(runtime, { verb, check, action, extra, peek }) {
    return peek ? "" : `<div class="shop-deal-actions"><button type="button" class="shop-buy" ${action} ${check.ok ? "" : "disabled"}>${verb}</button>${extra}${runtime.state.CLOSE_HTML}</div>
                ${check.ok ? "" : `<p class="shop-deal-why">${(0, runtime.deps.escapeHTML)(check.reason || "")}</p>`}`;
  }
  function paintInfo(runtime, root, html) {
    const info = root?.querySelector(".shop-info");
    if (!info || info.shopHtml === html) return;
    info.innerHTML = html;
    info.shopHtml = html;
  }
  function markChosen(runtime, root, pick) {
    root.querySelectorAll("[data-shop-pick].is-chosen").forEach((el2) => {
      el2.classList.remove("is-chosen");
      el2.setAttribute("aria-pressed", "false");
    });
    const el = pick === null ? null : root.querySelector(`[data-shop-pick="${runtime.deps.CSS.escape(String(pick))}"]`);
    el?.classList.add("is-chosen");
    el?.setAttribute("aria-pressed", "true");
  }
  function focusDeal(runtime, root) {
    const button = root?.querySelector(".shop-info .shop-buy:not([disabled])") || root?.querySelector(".shop-info button:not([disabled])");
    button?.focus();
  }
  function busyReason(runtime) {
    return hallReplayBusyReason(runtime.deps.backgroundCombatRuntime);
  }
  function isHarvest(runtime, key) {
    return runtime.deps.stumpBox.isHarvestPrice(key);
  }
  function held(runtime, key) {
    return isHarvest(runtime, key) ? runtime.deps.stumpBox.harvestPriceHeld(runtime.deps.game, key) : Math.floor(Number(runtime.deps.game.currencies[key]) || 0);
  }
  function currencyName(runtime, key) {
    return isHarvest(runtime, key) ? runtime.deps.stumpBox.harvestPriceName(key) : runtime.deps.ORB_DB[key] ? (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name) : key;
  }
  function registerShop(runtime, kind, adapter) {
    runtime.state.adapters.set(kind, adapter);
  }
  function areaStyle(runtime, at) {
    return `grid-area:${at.row + 1}/${at.column + 1}/span ${at.rows}/span ${at.columns}`;
  }
  function priceHtml(runtime, key, amount) {
    return `<span class="shop-price">${coinHtml(runtime, key)}${Number(amount).toLocaleString()}</span>`;
  }
  function gridHtml(runtime, columns, rows, wares, extra = "") {
    return `<div class="shop-grid${extra}" style="--grid-columns:${columns};--grid-rows:${rows}">${cellsHtml(runtime, columns, rows)}${wares}</div>`;
  }

  // modules/ui/shop-hover.mjs
  function pickAt(runtime, node) {
    const el = node?.closest?.("[data-shop-pick]"), root = el?.closest("[data-shop-kind]");
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    return adapter ? { root, adapter, el, pick: el.dataset.shopPick } : null;
  }
  function hoverPick(runtime, event) {
    if (event.pointerType !== "mouse" || runtime.state.press) return;
    const peek = peekAt(runtime, event.target);
    if (peek && peek.html) showFloat(runtime, peek.el, peek.html);
    else hideFloat(runtime);
  }
  function peekAt(runtime, node) {
    const item = node?.closest?.(".shop-view [data-shop-item]");
    if (item) return { el: item, html: bagPeekHtml(runtime, item) };
    const at = pickAt(runtime, node);
    return at && at.adapter.shopPeekHtml ? { el: at.el, html: at.adapter.shopPeekHtml(at.root, at.pick) } : null;
  }
  function bagPeekHtml(runtime, el) {
    const item = runtime.deps.game.inventory.find((entry) => String(entry.id) === el.dataset.shopItem);
    if (!item) return "";
    const why = el.dataset.shopWhy ? `<p class="shop-note">${(0, runtime.deps.escapeHTML)(el.dataset.shopWhy)}</p>` : "";
    return `${why}${itemCardHtml(runtime, item)}`;
  }
  function showFloat(runtime, el, html) {
    const host = el.closest("dialog") || runtime.deps.document.body;
    if (!runtime.state.floatCard || runtime.state.floatCard.parentNode !== host) {
      runtime.state.floatCard?.remove();
      runtime.state.floatCard = Object.assign(runtime.deps.document.createElement("div"), { className: "shop-float" });
      runtime.state.floatCard.setAttribute("aria-hidden", "true");
      host.appendChild(runtime.state.floatCard);
    }
    if (runtime.state.floatCard.shopHtml !== html) {
      runtime.state.floatCard.innerHTML = html;
      runtime.state.floatCard.shopHtml = html;
    }
    runtime.state.floatCard.hidden = false;
    placeFloat(runtime, runtime.state.floatCard, el.getBoundingClientRect());
  }
  function placeFloat(runtime, card, at) {
    const factor = runtime.deps.uiDisplay.factor || 1, gap = 8, box = card.getBoundingClientRect();
    const x = at.right + gap + box.width <= runtime.deps.window.innerWidth - gap ? at.right + gap : Math.max(gap, at.left - gap - box.width);
    const y = Math.max(gap, Math.min(at.top, runtime.deps.window.innerHeight - gap - box.height));
    card.style.transform = `translate(${Math.round(x / factor)}px,${Math.round(y / factor)}px)`;
  }
  function hideFloat(runtime) {
    if (runtime.state.floatCard) runtime.state.floatCard.hidden = true;
  }

  // modules/ui/shop-pointer.mjs
  function pressPick(runtime, event) {
    if (!runtime.active) return;
    hideFloat(runtime);
    const at = event.button === 0 ? pickAt(runtime, event.target) : null;
    if (!at) return;
    if (runtime.state.press) endPress(runtime);
    const rect = at.el.getBoundingClientRect();
    runtime.state.press = {
      ...at,
      owner: runtime.deps.game,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      touch: event.pointerType !== "mouse",
      offset: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      ghost: null,
      target: null
    };
    at.el.setPointerCapture?.(event.pointerId);
  }
  function dragPick(runtime, event) {
    if (!currentShopPress(runtime, event)) return;
    if (!runtime.state.press.ghost && Math.hypot(event.clientX - runtime.state.press.x, event.clientY - runtime.state.press.y) < runtime.state.DRAG_PX) return;
    if (!runtime.state.press.ghost) runtime.state.press.ghost = ghostOf(runtime, runtime.state.press.el);
    runtime.state.press.ghost.style.transform = `translate(${(event.clientX - runtime.state.press.offset.x) / runtime.deps.uiDisplay.factor}px,${(event.clientY - runtime.state.press.offset.y) / runtime.deps.uiDisplay.factor}px)`;
    runtime.state.press.target = targetAt(runtime, event);
    paintTarget(runtime, runtime.state.press.root, runtime.state.press.target);
  }
  function ghostOf(runtime, el) {
    const ghost = el.cloneNode(true), rect = el.getBoundingClientRect();
    ghost.className = `${el.className} shop-ghost`;
    ghost.removeAttribute("data-shop-pick");
    Object.assign(ghost.style, { width: `${rect.width / runtime.deps.uiDisplay.factor}px`, height: `${rect.height / runtime.deps.uiDisplay.factor}px`, gridArea: "" });
    (el.closest("dialog") || runtime.deps.document.body).appendChild(ghost);
    el.classList.add("is-carried");
    return ghost;
  }
  function targetAt(runtime, event) {
    const under = runtime.deps.document.elementsFromPoint(event.clientX, event.clientY).find((node) => !runtime.state.press.ghost?.contains(node));
    const drop = under?.closest?.("[data-shop-drop]");
    const size = runtime.state.press.adapter.shopSize ? runtime.state.press.adapter.shopSize(runtime.state.press.root, runtime.state.press.pick) : null;
    const target = drop && runtime.state.press.root.contains(drop) ? { area: "drop", key: drop.dataset.shopDrop, el: drop } : size ? bagTarget(runtime, event, size) : null;
    const ok = target ? runtime.state.press.adapter.shopAccepts(runtime.state.press.root, runtime.state.press.pick, target) : null;
    return ok === null ? null : { ...target, ok };
  }
  function bagTarget(runtime, event, size) {
    const grid = runtime.state.press.root.querySelector(".shop-grid.is-bag"), first = grid?.querySelector('[data-bag-cell="0:0"]');
    if (!first) return null;
    const box = first.getBoundingClientRect(), step = grid.querySelector('[data-bag-cell="1:0"]').getBoundingClientRect().left - box.left;
    const column = Math.round((event.clientX - runtime.state.press.offset.x - box.left) / step), row = Math.round((event.clientY - runtime.state.press.offset.y - box.top) / step);
    const rows = runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    if (column < 0 || row < 0 || column >= runtime.deps.equipmentInventoryGridRuntime.columns || row >= rows) return null;
    return { area: "bag", column, row: row + runtime.state.bagPage * rows, local: { column, row }, size };
  }
  function paintTarget(runtime, root, target) {
    root.querySelectorAll(".is-drop-ok, .is-drop-bad").forEach((node) => node.classList.remove("is-drop-ok", "is-drop-bad"));
    if (!target) return;
    const mark = target.ok ? "is-drop-ok" : "is-drop-bad";
    if (target.area === "drop") {
      target.el.classList.add(mark);
      return;
    }
    for (let row = target.local.row; row < target.local.row + target.size.rows; row++) {
      for (let column = target.local.column; column < target.local.column + target.size.columns; column++) {
        root.querySelector(`[data-bag-cell="${column}:${row}"]`)?.classList.add(mark);
      }
    }
  }
  function endPress(runtime) {
    const holding = runtime.state.press;
    runtime.state.press = null;
    if (!holding) return null;
    if (holding.el.hasPointerCapture?.(holding.pointerId)) holding.el.releasePointerCapture(holding.pointerId);
    holding.ghost?.remove();
    holding.el.classList.remove("is-carried");
    paintTarget(runtime, holding.root, null);
    return holding;
  }
  function releasePick(runtime, event) {
    if (!currentShopPress(runtime, event)) return;
    if (runtime.state.press.ghost) runtime.state.press.target = targetAt(runtime, event);
    const holding = endPress(runtime);
    if (holding.ghost) {
      if (holding.target) holding.adapter.shopDrop(holding.root, holding.pick, holding.target);
      return;
    }
    holding.adapter.shopTap(holding.root, holding.pick, { touch: holding.touch, keyboard: false });
  }
  function currentShopPress(runtime, event) {
    const press = runtime.state.press;
    if (!press || press.pointerId !== event.pointerId) return false;
    if (runtime.active && press.owner === runtime.deps.game && press.el.isConnected && press.root.isConnected) return true;
    endPress(runtime);
    return false;
  }
  function shopClick(runtime, event) {
    const page = event.target.closest?.("[data-shop-bag-page]"), root = page?.closest("[data-shop-kind]");
    if (root && runtime.state.adapters.has(root.dataset.shopKind)) {
      runtime.state.bagPage = Number(page.dataset.shopBagPage);
      runtime.state.adapters.get(root.dataset.shopKind).shopRedraw(root);
      return;
    }
    if (clickUnchoose(runtime, event.target) || clickDimItem(runtime, event.target)) return;
    const at = event.detail === 0 ? pickAt(runtime, event.target) : null;
    if (at) at.adapter.shopTap(at.root, at.pick, { touch: true, keyboard: true });
  }
  function clickUnchoose(runtime, target) {
    const close = target.closest?.("[data-shop-unchoose]"), root = close?.closest("[data-shop-kind]");
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    if (!adapter?.shopUnchoose) return false;
    adapter.shopUnchoose(root);
    return true;
  }
  function clickDimItem(runtime, target) {
    const dim = target.closest?.("[data-shop-dim]"), root = dim?.closest("[data-shop-kind]");
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    if (!adapter?.shopDim) return false;
    adapter.shopDim(root, dim.dataset.shopDim);
    return true;
  }

  // modules/ui/shop-view.mjs
  function createShopView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { registerShop, held, currencyName, coinHtml, priceHtml, walletHtml, cellsHtml, gridHtml, areaStyle, bagHtml, itemCardHtml, gearRatingHtml, gemArtHtml, gemCardHtml, dealHtml, paintInfo, markChosen, focusDeal, busyReason, hoverPick, hideFloat, pressPick, dragPick, releasePick, shopClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = ShopViewApi(runtime);
    installShopViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.DRAG_PX = 6;
    runtime.state.WALLET_ORDER = Object.freeze(["magicBud", "formlessDew", "goldenRule"]);
    runtime.state.adapters = /* @__PURE__ */ new Map();
    runtime.state.press = null;
    runtime.state.floatCard = null;
    runtime.state.bagPage = 0;
    runtime.state.cardMemo = /* @__PURE__ */ new WeakMap();
    runtime.state.CLOSE_HTML = '<button type="button" class="shop-info-close" data-shop-unchoose>닫기</button>';
  }
  function installShopViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "pointerover", runtime.handlers.hoverPick);
    listenView(runtime, runtime.deps.document, "pointerout", (event) => {
      if (!event.relatedTarget) hideFloat(runtime);
    });
    listenView(runtime, runtime.deps.document, "scroll", runtime.handlers.hideFloat, true);
    listenView(runtime, runtime.deps.document, "pointerdown", runtime.handlers.pressPick);
    listenView(runtime, runtime.deps.document, "pointermove", runtime.handlers.dragPick);
    listenView(runtime, runtime.deps.document, "pointerup", runtime.handlers.releasePick);
    listenView(runtime, runtime.deps.document, "pointercancel", () => {
      if (runtime.state.press) endPress(runtime);
    });
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.shopClick);
  }
  function ShopViewApi(runtime) {
    return Object.freeze({
      registerShop: runtime.handlers.registerShop,
      WALLET_ORDER: runtime.state.WALLET_ORDER,
      held: runtime.handlers.held,
      currencyName: runtime.handlers.currencyName,
      coinHtml: runtime.handlers.coinHtml,
      priceHtml: runtime.handlers.priceHtml,
      walletHtml: runtime.handlers.walletHtml,
      cellsHtml: runtime.handlers.cellsHtml,
      gridHtml: runtime.handlers.gridHtml,
      areaStyle: runtime.handlers.areaStyle,
      bagHtml: runtime.handlers.bagHtml,
      itemCardHtml: runtime.handlers.itemCardHtml,
      ratingHtml: runtime.handlers.gearRatingHtml,
      gemArtHtml: runtime.handlers.gemArtHtml,
      gemCardHtml: runtime.handlers.gemCardHtml,
      dealHtml: runtime.handlers.dealHtml,
      paintInfo: runtime.handlers.paintInfo,
      markChosen: runtime.handlers.markChosen,
      focusDeal: runtime.handlers.focusDeal,
      busyReason: runtime.handlers.busyReason,
      dragging: () => !!runtime.state.press,
      dispose: () => disposeShopView(runtime)
    });
  }
  function disposeShopView(runtime) {
    releaseViewEvents(runtime);
    endPress(runtime);
    runtime.state.floatCard?.remove();
    runtime.state.floatCard = null;
    runtime.state.adapters.clear();
  }

  // modules/shop-view-ui-classic.mjs
  var shopView = createShopView({
    get stumpBox() {
      return stumpBox;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get getInventoryUsedCellCount() {
      return getInventoryUsedCellCount;
    },
    get getInventoryLimit() {
      return getInventoryLimit;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get getPersistentBuildSignature() {
      return getPersistentBuildSignature;
    },
    get document() {
      return document;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get CSS() {
      return CSS;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get equipmentTriage() {
      return equipmentTriage;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getRuneLevelReq() {
      return getRuneLevelReq;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get getSupportTierLabel() {
      return getSupportTierLabel;
    },
    get statToneText() {
      return statToneText;
    },
    get getSkillRuneBlockedLine() {
      return getSkillRuneBlockedLine;
    },
    get isMobilityRuneName() {
      return isMobilityRuneName;
    },
    get getRuneLevelNote() {
      return getRuneLevelNote;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get getSupportTierResonanceCost() {
      return getSupportTierResonanceCost;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get getSupportResonanceCostAtTier() {
      return getSupportResonanceCostAtTier;
    },
    get buildStatPreviewParts() {
      return buildStatPreviewParts;
    },
    get previewBuildStats() {
      return previewBuildStats;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ shopView });
})();
