// GENERATED from modules/player-stall-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/player-stall-state.mjs
  function initializeStallViewState(runtime) {
    runtime.state.STALL_RECORDS_DIALOG = "stall-records-dialog";
    runtime.state.STALL_RECORD_TITLES = Object.freeze({ sales: "판매 기록", visits: "최근 방문", terms: "판매 규칙" });
    runtime.state.view_selectedId = null;
    runtime.state.view_selectedListingId = null;
    runtime.state.view_pendingSlot = null;
    runtime.state.view_message = "";
    runtime.state.view_draftAsk = "";
    runtime.state.view_draftCurrency = "";
    runtime.state.view_draftNegotiate = true;
    runtime.state.view_visitorCursor = 0;
    runtime.state.view_visitors = [];
    runtime.state.view_visitorsVisible = false;
    runtime.state.view_visitorTickAt = 0;
    runtime.state.view_ledgerPage = 0;
    runtime.state.view_recordsKind = void 0;
  }
  function syncStallOwner(runtime) {
    const owner = runtime.deps.game;
    if (runtime.owner === owner) return false;
    const changed = runtime.owner !== void 0;
    if (changed) {
      if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.STALL_RECORDS_DIALOG);
      runtime.recordsPanel = null;
      initializeStallViewState(runtime);
    }
    runtime.owner = owner;
    return changed;
  }

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

  // modules/ui/player-stall-markup.mjs
  function busy(runtime, manage = true) {
    const replay = runtime.deps.shopView.busyReason();
    if (replay) return replay;
    return manage && runtime.deps.game.woodsmanBuildLock ? "나무꾼 전투 중에는 가판대를 정리할 수 없습니다. 판매 대금 수령은 됩니다." : "";
  }
  function items(runtime) {
    return runtime.deps.game.inventory.filter((item) => runtime.deps.playerStall.eligible(item, runtime.deps.game));
  }
  function selected(runtime) {
    return runtime.state.view_selectedListingId ? null : items(runtime).find((item) => item.id === runtime.state.view_selectedId);
  }
  function inspectedListing(runtime) {
    return runtime.deps.game.playerStall.listings.find((row) => row.id === runtime.state.view_selectedListingId);
  }
  function suggestedPrice(runtime, item, currency) {
    return runtime.deps.itemAppraisal.quote(item, currency)?.fair || 1;
  }
  function listingTerms(runtime) {
    const ask = runtime.deps.document.getElementById("stall-ask"), currency = runtime.deps.document.getElementById("stall-currency");
    if (!ask || !currency || !selected(runtime)) return { reason: (0, runtime.deps._t)("가방에서 진열할 장비를 먼저 고르세요.") };
    const price = askValue(runtime, ask.value);
    if (price === null) return { reason: ask.value === "" ? "판매 희망가를 적어 주세요." : "가격은 1~1,000,000 사이의 정수로 적어 주세요." };
    const placement = { negotiate: runtime.deps.document.getElementById("stall-negotiate")?.checked === true, currency: currency.value };
    if (runtime.state.view_pendingSlot !== null) placement.slot = runtime.state.view_pendingSlot;
    return { price, placement };
  }
  function askValue(runtime, text) {
    const amount = Number(text);
    return text !== "" && Number.isSafeInteger(amount) && amount >= 1 && amount <= runtime.deps.PLAYER_STALL_RULES.maxAsk ? amount : null;
  }
  function priceHint(runtime, price) {
    return price === "" || askValue(runtime, price) !== null ? "" : "1~1,000,000 사이의 정수를 입력하세요.";
  }
  function priceBand(runtime, item, currency, text) {
    const price = askValue(runtime, text), value = item && runtime.deps.itemAppraisal.quote(item, currency);
    if (price === null || !value) return "";
    if (!value.eligible || price > value.ceiling) return "손님이 사지 않는 가격";
    if (price > value.fair) return "오래 걸리는 가격";
    return price < value.fair * 0.75 ? "금방 팔리는 가격" : "적당한 가격";
  }
  function priceNote(runtime, item, currency, text) {
    const warning = priceHint(runtime, text);
    return { text: warning || priceBand(runtime, item, currency, text), warning: !!warning };
  }
  function noteHtml(runtime, id, item, currency, text) {
    const note = priceNote(runtime, item, currency, text);
    return `<p id="${id}" class="stall-price-hint${note.warning ? " stall-warning" : ""}">${(0, runtime.deps._t)(note.text)}</p>`;
  }
  function paintNote(runtime, input, host, item, currency) {
    const note = priceNote(runtime, item, currency, input.value);
    if (host) {
      host.textContent = (0, runtime.deps._t)(note.text);
      host.classList.toggle("stall-warning", note.warning);
    }
    input.setAttribute("aria-invalid", String(note.warning));
  }
  function preview(runtime) {
    const host = runtime.deps.document.getElementById("stall-price-hint"), input = runtime.deps.document.getElementById("stall-ask"), item = selected(runtime);
    if (!host || !input || !item) return;
    runtime.state.view_draftAsk = input.value;
    paintNote(runtime, input, host, item, runtime.deps.document.getElementById("stall-currency")?.value);
  }
  function editListingPrice(runtime, input) {
    runtime.state.view_draftAsk = input.value;
    const row = runtime.deps.game.playerStall.listings.find((entry) => `stall-price-${entry.id}` === input.id);
    const host = runtime.deps.document.getElementById(input.id.replace("stall-price-", "stall-price-hint-"));
    paintNote(runtime, input, host, row?.item, runtime.deps.document.getElementById("stall-currency")?.value || row?.currency);
  }
  function currencySelector(runtime, item, currency) {
    const options = runtime.deps.PLAYER_STALL_RULES.currencies.map((key) => {
      const sells = runtime.deps.itemAppraisal.quote(item, key)?.eligible;
      return `<option value="${key}" ${key === currency ? "selected" : ""} ${sells || key === currency ? "" : "disabled"}>${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)}${sells ? "" : (0, runtime.deps._t)(" (손님이 사지 않음)")}</option>`;
    }).join("");
    return `<label class="stall-price-label" for="stall-currency">${(0, runtime.deps._t)("거래 재화")}</label><select id="stall-currency" onchange="playerStallUi.changeCurrency(this.value)">${options}</select>`;
  }
  function standHtml(runtime, slot) {
    const row = runtime.deps.game.playerStall.listings.find((entry) => entry.slot === slot);
    return row ? listedStandHtml(runtime, slot, row) : emptyStandHtml(runtime, slot, runtime.state.view_pendingSlot === slot ? selected(runtime) : null);
  }
  function listedStandHtml(runtime, slot, row) {
    const label = (0, runtime.deps._t)("{value}번 진열칸, {name}, {currencyName} {price}{value2}", { value: slot + 1, name: row.item.name, currencyName: runtime.deps.shopView.currencyName(row.currency), price: row.price, value2: row.offer ? (0, runtime.deps._t)(", 가격 제안 도착") : "" });
    return `<button type="button" class="shop-stand is-filled rarity-${row.item.rarity || "normal"}${row.id === runtime.state.view_selectedListingId ? " is-chosen" : ""}" data-shop-drop="${slot}"
            data-shop-pick="listing:${row.id}" aria-label="${(0, runtime.deps.escapeHTML)(label)}"><small>${slot + 1}</small>${standArtHtml(runtime, row.item)}
            <span class="shop-stand-tag">${runtime.deps.shopView.priceHtml(row.currency, row.price)}</span>${row.offer ? (0, runtime.deps._t)("<em>제안</em>") : ""}</button>`;
  }
  function emptyStandHtml(runtime, slot, draft) {
    const label = `${slot + 1}번 진열칸, ${draft ? (0, runtime.deps._t)("{name}, 가격 정하는 중", { name: draft.name }) : (0, runtime.deps._t)("비어 있음")}`;
    return `<button type="button" class="shop-stand is-empty${draft ? ` is-preview rarity-${draft.rarity || "normal"}` : ""}" data-shop-drop="${slot}" onclick="playerStallUi.tapStand(${slot})"
            aria-label="${(0, runtime.deps.escapeHTML)(label)}"><small>${slot + 1}</small>${draft ? standArtHtml(runtime, draft) : '<span class="shop-stand-art is-empty"></span>'}
            <span class="shop-stand-tag">${draft ? (0, runtime.deps._t)("가격 정하는 중") : (0, runtime.deps._t)("장비 놓기")}</span></button>`;
  }
  function standArtHtml(runtime, item) {
    const size = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
    return `<span class="shop-stand-art" style="--cols:${size.columns};--rows:${size.rows}"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"></span>`;
  }
  function shelfHtml(runtime, stall) {
    const offers = stall.listings.filter((row) => row.offer).length;
    return `<header class="shop-bar"><h3>${(0, runtime.deps._t)("가판대")}</h3><span class="shop-room">${(0, runtime.deps._t)("{length}/{slots}칸", { length: stall.listings.length, slots: runtime.deps.PLAYER_STALL_RULES.slots })}</span>
            ${offers ? `<button type="button" class="stall-offer-jump" onclick="playerStallUi.openOffers()">${(0, runtime.deps._t)("가격 제안 {offers}건", { offers })}</button>` : ""}</header>
            <div class="stall-payout"><span>${(0, runtime.deps._t)("판매 대금")}<strong class="stall-payout-coins">${payoutCoinsHtml(runtime, stall)}</strong></span>
                <button type="button" onclick="playerStallUi.collect()" ${runtime.deps.playerStall.payouts(stall).length ? "" : "disabled"}>${(0, runtime.deps._t)("대금 수령")}</button></div>
            <div class="shop-stands">${Array.from({ length: runtime.deps.PLAYER_STALL_RULES.slots }, (_, slot) => standHtml(runtime, slot)).join("")}</div>
            <p id="stall-visitors" class="stall-visitor-count" aria-label="${(0, runtime.deps._t)("가판대 손님")}"></p>${recordButtonsHtml(runtime, stall)}`;
  }
  function infoHtml(runtime) {
    const listing2 = inspectedListing(runtime), item = listing2?.item || selected(runtime);
    const message = runtime.state.view_message ? `<p role="status" class="stall-message">${(0, runtime.deps.escapeHTML)(runtime.state.view_message)}</p>` : "";
    if (!item) return message;
    const currency = runtime.state.view_draftCurrency || listing2?.currency || runtime.deps.itemAppraisal.quote(item).recommendedCurrency;
    const terms = currencySelector(runtime, item, currency) + (listing2 ? runtime.api.listing(listing2, currency) : newListingForm(runtime, item, currency));
    return `<div class="shop-info-deal">${message}<div class="stall-terms-box">${terms}</div>
            <button type="button" class="shop-info-close" data-shop-unchoose>${(0, runtime.deps._t)("닫기")}</button></div><div class="shop-info-card">${runtime.deps.shopView.itemCardHtml(item)}</div>`;
  }
  function newListingForm(runtime, item, currency) {
    const price = runtime.state.view_draftAsk || String(suggestedPrice(runtime, item, currency)), full = runtime.deps.game.playerStall.listings.length >= runtime.deps.PLAYER_STALL_RULES.slots;
    return `<label class="stall-price-label" for="stall-ask">${(0, runtime.deps._t)("판매 희망가 ({name})", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</label><input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${(0, runtime.deps.escapeHTML)(price)}" placeholder="${(0, runtime.deps._t)("가격을 정해 주세요")}" aria-describedby="stall-price-hint" oninput="playerStallUi.preview()" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.list()}">
            ${noteHtml(runtime, "stall-price-hint", item, currency, price)}
            <label class="stall-check"><input id="stall-negotiate" type="checkbox" ${runtime.state.view_draftNegotiate ? "checked" : ""} onchange="playerStallUi.draftNegotiate=this.checked"><span>${(0, runtime.deps._t)("다른 가격 제안 받기")}</span></label>
            <button type="button" class="stall-primary" data-stall-list onclick="playerStallUi.list()" ${full ? "disabled" : ""}>${full ? (0, runtime.deps._t)("진열대가 가득 찼습니다") : runtime.state.view_pendingSlot === null ? (0, runtime.deps._t)("첫 빈칸에 진열") : (0, runtime.deps._t)("{value}번 칸에 진열 확정", { value: runtime.state.view_pendingSlot + 1 })}</button>
            ${runtime.state.view_pendingSlot === null ? "" : (0, runtime.deps._t)('<button type="button" class="stall-cancel" onclick="playerStallUi.cancelPlacement()">놓기 취소</button>')}`;
  }
  function offer(runtime, row) {
    const offer2 = row.offer;
    if (!offer2) return "";
    const customer = runtime.deps.PLAYER_STALL_CUSTOMERS[offer2.customerId].name;
    const expires = new runtime.deps.Date(offer2.expiresAt).toLocaleString(runtime.deps.i18n.locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return `<section class="stall-offer" aria-label="${(0, runtime.deps._t)("{customer}의 가격 제안", { customer: (0, runtime.deps.escapeHTML)(customer) })}"><div class="stall-offer-heading"><span>${(0, runtime.deps._t)("구매 제안")}</span><strong>${(0, runtime.deps.formatCurrencyCosts)([{ key: row.currency, amount: offer2.amount }])}개</strong></div>
            <p>${(0, runtime.deps.escapeHTML)(customer)}<br><small>${(0, runtime.deps._t)("{expires}까지", { expires })}</small></p>
            <div class="stall-actions"><button type="button" class="stall-primary" data-stall-accept="${offer2.id}" onclick="playerStallUi.respond(${row.id},${offer2.id},true)">${(0, runtime.deps._t)("{amount}개에 판매", { amount: offer2.amount })}</button>
            <button type="button" data-stall-reject="${offer2.id}" onclick="playerStallUi.respond(${row.id},${offer2.id},false)">${(0, runtime.deps._t)("제안 거절")}</button></div>
            ${offer2.negotiated ? (0, runtime.deps._t)('<small class="stall-final-offer">마지막 제안</small>') : `<div class="stall-counter"><label for="stall-counter-${offer2.id}">${(0, runtime.deps._t)("내 역제안 ({name})", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[row.currency].name) })}</label>
            <div class="stall-price-edit"><input id="stall-counter-${offer2.id}" type="number" min="${offer2.amount + 1}" max="${row.price}" step="1" placeholder="${(0, runtime.deps._t)("금액 입력")}">
            <button type="button" onclick="playerStallUi.counter(${row.id},${offer2.id})">${(0, runtime.deps._t)("역제안")}</button></div></div>`}</section>`;
  }
  function listing(runtime, row, currency) {
    const price = currency === row.currency ? runtime.state.view_draftAsk || String(row.price) : runtime.state.view_draftAsk;
    return `<article class="stall-listing ${row.offer ? "has-offer" : ""}" data-stall-listing="${row.id}"><p class="stall-note">${(0, runtime.deps._t)("{value}번 칸에서 판매 중", { value: row.slot + 1 })}</p>
            ${offer(runtime, row)}<label class="stall-price-label" for="stall-price-${row.id}">${(0, runtime.deps._t)("판매 희망가 ({name})", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</label><div class="stall-price-edit"><input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${(0, runtime.deps.escapeHTML)(price)}" placeholder="${(0, runtime.deps._t)("새 가격")}" aria-describedby="stall-price-hint-${row.id}" oninput="playerStallUi.editListingPrice(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.reprice(${row.id})}">
            <button type="button" onclick="playerStallUi.reprice(${row.id})">${(0, runtime.deps._t)("가격 변경")}</button></div>
            ${noteHtml(runtime, `stall-price-hint-${row.id}`, row.item, currency, price)}
            ${currency !== row.currency ? `<p class="stall-note">${(0, runtime.deps._t)("{name} 가격을 새로 적어 주세요.", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</p>` : ""}
            <div class="stall-listing-footer"><label class="stall-check"><input type="checkbox" aria-label="${(0, runtime.deps._t)("{name} 가격 제안 허용", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.item.name)) })}" ${row.negotiate ? "checked" : ""} onchange="playerStallUi.negotiate(${row.id},this.checked)"><span>${(0, runtime.deps._t)("제안 허용")}</span></label>
            <button type="button" onclick="playerStallUi.withdraw(${row.id})">${(0, runtime.deps._t)("물건 회수")}</button></div></article>`;
  }
  function bagPick(runtime, item) {
    const reason = runtime.deps.playerStall.listBlockReason(item, runtime.deps.game);
    return { key: reason ? "" : `bag:${item.id}`, chosen: !runtime.state.view_selectedListingId && item.id === runtime.state.view_selectedId, reason };
  }
  function coinHtml(runtime, key, amount) {
    return `<span class="stall-coin" data-tip="${(0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(key))}">${runtime.deps.shopView.coinHtml(key)}<b>${Number(amount).toLocaleString(runtime.deps.i18n.locale)}</b></span>`;
  }
  function payoutCoinsHtml(runtime, stall) {
    return runtime.deps.playerStall.payouts(stall).map((row) => coinHtml(runtime, row.key, row.amount)).join("") || (0, runtime.deps.escapeHTML)((0, runtime.deps._t)("없음"));
  }
  function recordButtonsHtml(runtime, stall) {
    const callers = stall.history.filter(runtime.handlers.isStallCustomerEvent), bought = callers.filter((event) => event.sold).length;
    const button = (kind, label, sub) => `<button type="button" class="stall-record-btn" onclick="playerStallUi.openRecords('${kind}')"><b>${label}</b><small>${sub}</small></button>`;
    return `<div class="stall-records" data-latest="${stall.history[0]?.id || 0}">${button("sales", (0, runtime.deps._t)("판매 기록"), (0, runtime.deps._t)("{count}건", { count: stall.sales.length }))}
            ${button("visits", (0, runtime.deps._t)("최근 방문"), (0, runtime.deps._t)("{callers}명 중 {bought}명 구매", { callers: callers.length, bought }))}${button("terms", (0, runtime.deps._t)("판매 규칙"), (0, runtime.deps._t)("진열, 제안, 방문"))}</div>`;
  }
  function history(runtime, event) {
    const time = new runtime.deps.Date(event.at).toLocaleTimeString(runtime.deps.i18n.locale, { hour: "2-digit", minute: "2-digit" });
    const [word, tone] = stallOutcomeOf(runtime, event);
    const detail = event.sold ? `${(0, runtime.deps.escapeHTML)(event.name || "")} ${coinHtml(runtime, event.currency, event.price)}` : (0, runtime.deps.escapeHTML)(event.reason || "");
    return `<li class="${tone}"><time>${time}</time><em class="stall-outcome">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(word))}</em><span><strong>${(0, runtime.deps.escapeHTML)(event.customer || "방문객")}</strong> ${detail}</span></li>`;
  }
  function stallTerms(runtime) {
    return `<div class="stall-terms">
            <p>${(0, runtime.deps._t)("진열 1분 뒤부터 팔립니다. 가격을 바꿔도 진열 시간은 이어집니다.")}</p>
            <p>${(0, runtime.deps._t)("가격 제안은 24시간 유효합니다. 진열가로 팔리거나 가격을 바꾸면 사라집니다.")}</p>
            <p>${(0, runtime.deps._t)("오프라인 방문은 최대 12시간입니다. 루프를 넘기기 전에 진열품과 대금을 회수하세요.")}</p></div>`;
  }
  function stallOutcomeOf(runtime, event) {
    if (event.sold) return ["구매", "is-bought"];
    if (event.kind === "offer") return ["가격 제안", "is-offer"];
    return event.kind === "crowd" ? ["손님 몰림", "is-crowd"] : ["구매 안 함", "is-passed"];
  }
  function isStallCustomerEvent(runtime, event) {
    return event.kind !== "crowd";
  }

  // modules/ui/player-stall-visitors.mjs
  function watchingStall(runtime) {
    if (runtime.deps.document.hidden || runtime.deps.backgroundCombatRuntime.appInactive || runtime.deps.backgroundCombatRuntime.snapshot || runtime.deps.backgroundCombatRuntime.processing) return false;
    const host = runtime.deps.document.getElementById("market-panel-stall");
    if (runtime.deps.marketUi.section !== "stall" || !host?.getClientRects?.().length) return false;
    return host.checkVisibility ? host.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : true;
  }
  function tickVisitors(runtime, now) {
    if (!runtime.active) return;
    syncStallOwner(runtime);
    if (now - runtime.state.view_visitorTickAt < 500) return;
    runtime.state.view_visitorTickAt = now;
    const stall = runtime.deps.game.playerStall, visible = watchingStall(runtime);
    if (!visible || !runtime.state.view_visitorsVisible) {
      runtime.state.view_visitors = [];
      runtime.state.view_visitorCursor = stall.eventSequence;
    } else {
      const fresh = stall.history.filter((event) => event.id > runtime.state.view_visitorCursor && now - event.at <= 2e4 && ["visit", "sale", "offer"].includes(event.kind) && event.slot !== void 0).reverse();
      runtime.state.view_visitors = runtime.state.view_visitors.filter((visitor) => visitor.until > now);
      for (const event of fresh.slice(-4)) runtime.state.view_visitors.push({ event, startedAt: now, until: now + 11e3 });
      runtime.state.view_visitors = runtime.state.view_visitors.slice(-4);
      runtime.state.view_visitorCursor = stall.eventSequence;
    }
    runtime.state.view_visitorsVisible = visible;
    paintVisitors(runtime, visible);
  }
  function paintVisitors(runtime, visible) {
    const lane = runtime.deps.document.getElementById("stall-visitors");
    if (!lane) return;
    const key = visible ? runtime.state.view_visitors.map((visitor) => visitor.event.id).join(",") : "";
    if (lane.dataset.visitors === key) return;
    lane.dataset.visitors = key;
    lane.innerHTML = visible && runtime.state.view_visitors.length ? `<span class="stall-visitor-total">${(0, runtime.deps._t)("{length}명 구경 중", { length: runtime.state.view_visitors.length })}</span>` : "";
  }
  function saleRecord(runtime, sale) {
    const date = new runtime.deps.Date(sale.at).toLocaleString(runtime.deps.i18n.locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const duration = sale.listedAt === null ? "" : (0, runtime.deps._t)(" ({value} 만에 판매)", { value: (0, runtime.deps.formatRecordDuration)(sale.at - sale.listedAt) });
    const name = sale.item?.name || sale.name || "이전 거래";
    return `<details class="stall-sale" data-sale-id="${sale.id}" data-ui-disclosure="stall-sale-${sale.id}"><summary>${sale.item ? `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(sale.item)}" alt="">` : ""}<span>${(0, runtime.deps.escapeHTML)(name)}</span><strong>${coinHtml(runtime, sale.currency, sale.price)}</strong></summary>
            <p class="stall-note">${date}, ${(0, runtime.deps.escapeHTML)(sale.customer || "방문객")}${duration}</p>${sale.item ? `<div class="stall-sale-card" data-sale-card="${sale.id}"></div>` : ""}</details>`;
  }
  function visitsHtml(runtime, stall) {
    return `<ol class="stall-history">${stall.history.map((event) => history(runtime, event)).join("") || (0, runtime.deps._t)("<li>아직 방문객이 없습니다.</li>")}</ol>`;
  }
  function fillSaleCards(runtime, host) {
    host.querySelectorAll(".stall-sale[open] [data-sale-card]:empty").forEach((node) => {
      const sale = runtime.deps.game.playerStall.sales.find((entry) => entry.id === Number(node.dataset.saleCard));
      if (sale?.item) node.innerHTML = runtime.deps.shopView.itemCardHtml(sale.item, { rating: false });
    });
  }
  function salesLedger(runtime) {
    const sales = runtime.deps.game.playerStall.sales, pages = Math.max(1, Math.ceil(sales.length / 10));
    runtime.state.view_ledgerPage = Math.max(0, Math.min(runtime.state.view_ledgerPage, pages - 1));
    return `<div class="stall-ledger">
            ${sales.slice(runtime.state.view_ledgerPage * 10, runtime.state.view_ledgerPage * 10 + 10).map((sale) => saleRecord(runtime, sale)).join("") || (0, runtime.deps._t)('<p class="stall-note">아직 판매 기록이 없습니다.</p>')}
            ${pages > 1 ? `<div class="stall-ledger-pages"><button type="button" onclick="playerStallUi.showSales(${runtime.state.view_ledgerPage - 1})" ${runtime.state.view_ledgerPage === 0 ? "disabled" : ""}>${(0, runtime.deps._t)("이전")}</button><span>${runtime.state.view_ledgerPage + 1} / ${pages}</span>
            <button type="button" onclick="playerStallUi.showSales(${runtime.state.view_ledgerPage + 1})" ${runtime.state.view_ledgerPage + 1 === pages ? "disabled" : ""}>${(0, runtime.deps._t)("다음")}</button></div>` : ""}</div>`;
  }

  // modules/ui/player-stall-render.mjs
  function resetDraft(runtime) {
    runtime.state.view_draftAsk = "";
    runtime.state.view_draftCurrency = "";
    runtime.state.view_pendingSlot = null;
  }
  function openRecords(runtime, kind) {
    if (!runtime.active) return;
    const page = { sales: () => salesLedger(runtime), visits: () => visitsHtml(runtime, runtime.deps.game.playerStall), terms: () => stallTerms(runtime) }[kind];
    if (!page) return;
    runtime.state.view_recordsKind = kind;
    const before = runtime.deps.document.getElementById(runtime.state.STALL_RECORDS_DIALOG);
    const open = new Set(before ? [...before.querySelectorAll("details.stall-sale[open]")].map((node) => node.dataset.saleId) : []);
    const panel = runtime.deps.selectionDialog.show({
      id: runtime.state.STALL_RECORDS_DIALOG,
      title: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.state.STALL_RECORD_TITLES[kind])),
      panelClass: "stall-records-panel",
      body: `<div class="stall-records-body">${page()}</div>`
    });
    if (!panel) return;
    runtime.recordsPanel = panel;
    panel.querySelectorAll("details.stall-sale").forEach((node) => {
      node.open = open.has(node.dataset.saleId);
    });
    fillSaleCards(runtime, panel);
  }
  function showSales(runtime, page) {
    runtime.state.view_ledgerPage = Math.max(0, Math.min(Math.ceil(runtime.deps.game.playerStall.sales.length / 10) - 1, page));
    openRecords(runtime, "sales");
  }
  function editing(runtime, host) {
    const active = runtime.deps.document.activeElement;
    return active && host.contains(active) && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
  }
  function syncSelection(runtime) {
    if (runtime.state.view_selectedListingId && !inspectedListing(runtime)) {
      runtime.state.view_selectedListingId = null;
      resetDraft(runtime);
    }
    if (runtime.state.view_selectedId !== null && !items(runtime).some((item) => item.id === runtime.state.view_selectedId)) {
      runtime.state.view_selectedId = null;
      resetDraft(runtime);
    }
  }
  function stallRender(runtime, force = false) {
    if (!runtime.active) return;
    if (syncStallOwner(runtime)) force = true;
    const host = runtime.deps.document.getElementById("market-panel-stall");
    if (!host || runtime.deps.shopView.dragging() || editing(runtime, host) && !force) return;
    syncSelection(runtime);
    const stall = runtime.deps.game.playerStall;
    const html = `<div class="shop-view is-stall" data-shop-kind="stall"><div class="shop-body"><section class="shop-shelf" aria-label="${(0, runtime.deps._t)("가판대")}">${shelfHtml(runtime, stall)}</section>
                <div class="shop-info" aria-live="polite">${infoHtml(runtime)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)("가방")}">${runtime.deps.shopView.bagHtml((item) => bagPick(runtime, item))}</section></div></div>`;
    if (host.stallMarkup === html) return;
    host.innerHTML = html;
    host.stallMarkup = html;
    paintVisitors(runtime, runtime.state.view_visitorsVisible);
    preview(runtime);
    if (runtime.deps.selectionDialog.isOpen(runtime.state.STALL_RECORDS_DIALOG)) openRecords(runtime, runtime.state.view_recordsKind);
  }

  // modules/ui/player-stall-actions.mjs
  function stallBlocked(runtime, manage = true) {
    const reason = busy(runtime, manage);
    if (!reason) return false;
    runtime.state.view_message = reason;
    stallRender(runtime, true);
    return true;
  }
  function select(runtime, value) {
    const id = Number(value);
    if (id !== runtime.state.view_selectedId || runtime.state.view_selectedListingId) resetDraft(runtime);
    runtime.state.view_selectedId = id;
    runtime.state.view_selectedListingId = null;
    runtime.state.view_message = "";
    stallRender(runtime, true);
  }
  function inspect(runtime, id) {
    runtime.state.view_selectedId = null;
    runtime.state.view_selectedListingId = id;
    resetDraft(runtime);
    runtime.state.view_message = "";
    stallRender(runtime, true);
    revealTerms(runtime);
  }
  function openOffers(runtime) {
    const row = runtime.deps.game.playerStall.listings.filter((entry) => entry.offer).sort((a, b) => b.offer.id - a.offer.id)[0];
    if (row) inspect(runtime, row.id);
    runtime.deps.document.querySelector("#market-panel-stall .shop-info")?.scrollIntoView({ block: "nearest" });
  }
  function cancelPlacement(runtime) {
    runtime.state.view_pendingSlot = null;
    runtime.state.view_message = "놓기를 취소했습니다.";
    stallRender(runtime, true);
  }
  function revealTerms(runtime) {
    if (!runtime.deps.uiDisplay.matches("(max-width: 720px)")) return;
    const behavior = runtime.deps.uiDisplay.matches("(prefers-reduced-motion: reduce)") ? "auto" : "smooth";
    runtime.deps.document.querySelector("#market-panel-stall .shop-info")?.scrollIntoView({ block: "nearest", behavior });
  }
  function tapStand(runtime, slot) {
    const source = runtime.state.view_selectedListingId ? { kind: "listing", id: runtime.state.view_selectedListingId } : { kind: "inventory", id: runtime.state.view_selectedId };
    stallPlace(runtime, source, slot);
  }
  function stallPlace(runtime, source, slot, quick = false) {
    if (stallBlocked(runtime)) return;
    if (!standFree(runtime, slot)) {
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("비어 있는 진열칸을 골라 주세요.") });
      return;
    }
    if (source.kind === "listing") {
      stallMoveListing(runtime, source.id, slot);
      return;
    }
    const item = items(runtime).find((entry) => entry.id === source.id);
    if (!item) {
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("가방에서 진열할 장비를 먼저 고르세요.") });
      return;
    }
    if (quick) stallQuickList(runtime, item, slot);
    else stallStage(runtime, item, slot);
  }
  function standFree(runtime, slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < runtime.deps.PLAYER_STALL_RULES.slots && !runtime.deps.game.playerStall.listings.some((row) => row.slot === slot);
  }
  function stallStage(runtime, item, slot) {
    if (item.id !== runtime.state.view_selectedId || runtime.state.view_selectedListingId) resetDraft(runtime);
    runtime.state.view_selectedId = item.id;
    runtime.state.view_selectedListingId = null;
    runtime.state.view_pendingSlot = slot;
    runtime.state.view_message = (0, runtime.deps._t)("{value}번 칸: 가격을 적고 진열하세요.", { value: slot + 1 });
    stallRender(runtime, true);
    revealTerms(runtime);
  }
  function stallQuickList(runtime, item, slot) {
    const currency = item.id === runtime.state.view_selectedId && runtime.state.view_draftCurrency || runtime.deps.itemAppraisal.quote(item).recommendedCurrency;
    const price = item.id === runtime.state.view_selectedId && askValue(runtime, runtime.state.view_draftAsk) || suggestedPrice(runtime, item, currency);
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const result = runtime.deps.playerStall.list(runtime.deps.game, item.id, price, now, { slot, currency, negotiate: runtime.state.view_draftNegotiate });
    if (result.ok) {
      runtime.state.view_selectedListingId = runtime.deps.game.playerStall.listings.find((row) => row.item.id === item.id).id;
      runtime.state.view_selectedId = null;
      resetDraft(runtime);
      result.reason = (0, runtime.deps._t)("{value}번 칸에 진열했습니다. 가격은 바로 바꿀 수 있습니다.", { value: slot + 1 });
    }
    stallFinish(runtime, result, settled);
    revealTerms(runtime);
  }
  function stallMoveListing(runtime, id, slot) {
    const result = runtime.deps.playerStall.moveListing(runtime.deps.game, id, slot);
    if (result.ok) {
      resetDraft(runtime);
      runtime.state.view_selectedId = null;
      runtime.state.view_selectedListingId = id;
    }
    stallFinish(runtime, result);
  }
  function stallFinish(runtime, result, settled = false) {
    runtime.state.view_message = result.reason || "가판대를 정리했습니다.";
    if (result.ok || settled) {
      (0, runtime.deps.ensureCraftSelectionValid)();
      (0, runtime.deps.saveGame)();
      (0, runtime.deps.updateStaticUI)();
    }
    stallRender(runtime, true);
  }
  function list(runtime) {
    if (stallBlocked(runtime)) return;
    const terms = listingTerms(runtime);
    if (terms.reason) {
      stallFinish(runtime, { ok: false, reason: terms.reason });
      return;
    }
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const result = runtime.deps.playerStall.list(runtime.deps.game, runtime.state.view_selectedId, terms.price, now, terms.placement);
    if (result.ok) {
      runtime.state.view_selectedListingId = runtime.deps.game.playerStall.listings.find((row) => row.item.id === runtime.state.view_selectedId).id;
      runtime.state.view_selectedId = null;
      resetDraft(runtime);
      result.reason = "진열했습니다.";
    }
    stallFinish(runtime, result, settled);
  }
  function withdraw(runtime, id, place = null) {
    if (stallBlocked(runtime)) return;
    const settled = stallSettleSales(runtime, runtime.deps.Date.now()) > 0, result = runtime.deps.playerStall.withdraw(runtime.deps.game, id, place);
    if (result.ok) {
      if (runtime.state.view_selectedListingId === id) {
        runtime.state.view_selectedListingId = null;
        resetDraft(runtime);
      }
      result.reason = "물건을 가방으로 회수했습니다.";
    }
    stallFinish(runtime, result, settled);
  }
  function reprice(runtime, id) {
    if (stallBlocked(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-price-${id}`), price = askValue(runtime, input ? input.value : "");
    if (price === null) {
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("새 가격은 1~1,000,000 사이의 정수로 적어 주세요.") });
      return;
    }
    const currency = runtime.deps.document.getElementById("stall-currency")?.value, now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find((entry) => entry.id === id);
    if (!row) {
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("이미 판매되었거나 회수된 물건입니다.") }, settled);
      return;
    }
    if (row.price === price && row.currency === (currency || row.currency)) {
      runtime.state.view_draftAsk = "";
      runtime.state.view_draftCurrency = "";
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("지금 가격 그대로입니다.") }, settled);
      return;
    }
    const hadOffer = !!row.offer, ok = runtime.deps.playerStall.reprice(runtime.deps.game, id, price, now, currency);
    if (ok) {
      runtime.state.view_draftAsk = "";
      runtime.state.view_draftCurrency = "";
    }
    stallFinish(runtime, { ok, reason: repriceMessage(runtime, ok, hadOffer) }, settled);
  }
  function repriceMessage(runtime, ok, hadOffer) {
    if (!ok) return "가격을 바꾸지 못했습니다. 물건을 다시 확인해 주세요.";
    return hadOffer ? "가격을 바꿨습니다. 받아 둔 가격 제안은 취소됐습니다." : "가격을 바꿨습니다. 잠시 뒤부터 새 가격으로 거래됩니다.";
  }
  function negotiate(runtime, id, enabled) {
    if (stallBlocked(runtime)) return;
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const ok = runtime.deps.playerStall.setNegotiation(runtime.deps.game, id, enabled, now);
    stallFinish(runtime, { ok, reason: ok ? enabled ? "손님의 다른 가격 제안을 받습니다." : "표시한 가격으로만 판매합니다. 이전 제안은 취소됩니다." : "진열품을 확인해 주세요." }, settled);
  }
  function respond(runtime, id, offerId, accept) {
    if (stallBlocked(runtime)) return;
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find((entry) => entry.id === id), offer2 = row?.offer;
    const action = accept ? runtime.deps.playerStall.acceptOffer : runtime.deps.playerStall.rejectOffer;
    const result = action(runtime.deps.game, id, offerId, now);
    if (result.ok && accept && offer2?.id === offerId) {
      announceSales(runtime, [{ name: row.item.name, price: offer2.amount, currency: row.currency }], [{ key: row.currency, amount: offer2.amount }]);
    }
    stallFinish(runtime, result, settled);
  }
  function counter(runtime, id, offerId) {
    if (stallBlocked(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-counter-${offerId}`);
    if (!input) {
      stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)("이미 처리되었거나 기한이 지난 제안입니다.") });
      return;
    }
    const amount = Number(input.value), now = runtime.deps.Date.now();
    const settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find((entry) => entry.id === id), item = row?.item, currency = row?.currency;
    const result = runtime.deps.playerStall.counterOffer(runtime.deps.game, { listingId: id, offerId, amount }, now);
    if (result.ok && item && !runtime.deps.game.playerStall.listings.includes(row)) {
      announceSales(runtime, [{ name: item.name, price: amount, currency }], [{ key: currency, amount }]);
    }
    stallFinish(runtime, result, settled);
  }
  function collect(runtime) {
    if (stallBlocked(runtime, false)) return;
    const settled = stallSettleSales(runtime, runtime.deps.Date.now()) > 0;
    const funds = runtime.deps.playerStall.payouts(runtime.deps.game.playerStall);
    const gain = runtime.deps.playerStall.collect(runtime.deps.game);
    const reason = gain ? (0, runtime.deps._t)("{funds}개를 받았습니다.", { funds: (0, runtime.deps.formatCurrencyCosts)(funds) }) : funds.length ? "재화 보유 한도를 넘어 받지 못했습니다. 판매 대금은 가판대에 남아 있습니다." : "수령할 판매 대금이 없습니다.";
    stallFinish(runtime, { ok: gain > 0, reason }, settled);
  }
  function stallSettleSales(runtime, now) {
    const result = runtime.deps.playerStall.settle(runtime.deps.game, now);
    if (result.paid > 0) announceSales(runtime, result.sold, result.gains);
    if (result.offers.length) announceOffers(runtime, result.offers);
    if (result.changed) stallRender(runtime);
    return result.paid;
  }
  function announceSales(runtime, sold, gains) {
    runtime.deps.game.noti.items = true;
    const complete = gains.every((gain) => sold.filter((event) => event.currency === gain.key).reduce((sum, event) => sum + event.price, 0) === gain.amount);
    const goods = !complete ? "물건" : sold.length === 1 ? `[${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(sold[0].name))}]` : (0, runtime.deps._t)("물건 {length}개", { length: sold.length });
    (0, runtime.deps.addLog)((0, runtime.deps._t)("가판대 판매: {goods}, {gains}개. 거래 → 가판대에서 수령하세요.", { goods, gains: (0, runtime.deps.formatCurrencyCosts)(gains) }), "loot-rare", { toast: true });
  }
  function announceOffers(runtime, rows) {
    runtime.deps.game.noti.items = true;
    const detail = rows.length === 1 ? `[${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(rows[0].item.name))}]에 ${(0, runtime.deps.formatCurrencyCosts)([{ key: rows[0].currency, amount: rows[0].offer.amount }])}개` : (0, runtime.deps._t)("물건 {length}개", { length: rows.length });
    (0, runtime.deps.addLog)((0, runtime.deps._t)("가판대 가격 제안: {detail}. 가판대에서 수락하거나 거절할 수 있습니다.", { detail }), "loot-rare", { toast: true });
  }
  function changeCurrency(runtime, currency) {
    if (!runtime.deps.PLAYER_STALL_RULES.currencies.includes(currency) || !(inspectedListing(runtime) || selected(runtime))) return;
    runtime.state.view_draftAsk = "";
    runtime.state.view_draftCurrency = currency;
    stallRender(runtime, true);
  }

  // modules/ui/player-stall-view.mjs
  function createPlayerStallView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { isStallCustomerEvent, busy, blocked: stallBlocked, items, selected, inspectedListing, resetDraft, select, inspect, openOffers, cancelPlacement, revealTerms, tapStand, place: stallPlace, standFree, stage: stallStage, quickList: stallQuickList, suggestedPrice, moveListing: stallMoveListing, finish: stallFinish, listingTerms, list, withdraw, reprice, repriceMessage, negotiate, respond, counter, collect, settleSales: stallSettleSales, announceSales, announceOffers, askValue, priceHint, priceBand, priceNote, noteHtml, paintNote, preview, editListingPrice, changeCurrency, currencySelector, standHtml, listedStandHtml, emptyStandHtml, standArtHtml, shelfHtml, infoHtml, newListingForm, offer, listing, bagPick, watchingStall, tickVisitors, paintVisitors, saleRecord, coinHtml, payoutCoinsHtml, recordButtonsHtml, openRecords, visitsHtml, fillSaleCards, showSales, salesLedger, history, terms: stallTerms, editing, syncSelection, render: stallRender, stallOutcomeOf };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => {
      if (!runtime.active) return;
      syncStallOwner(runtime);
      return handler(runtime, ...args);
    };
    initializeStallViewState(runtime);
    runtime.api = PlayerStallViewApi(runtime);
    installPlayerStallViewEvents(runtime);
    return runtime.api;
  }
  function stallSelectionFields(runtime) {
    return {
      get selectedId() {
        return runtime.state.view_selectedId;
      },
      set selectedId(value) {
        runtime.state.view_selectedId = value;
      },
      get selectedListingId() {
        return runtime.state.view_selectedListingId;
      },
      set selectedListingId(value) {
        runtime.state.view_selectedListingId = value;
      },
      get pendingSlot() {
        return runtime.state.view_pendingSlot;
      },
      set pendingSlot(value) {
        runtime.state.view_pendingSlot = value;
      },
      get message() {
        return runtime.state.view_message;
      },
      set message(value) {
        runtime.state.view_message = value;
      },
      get draftAsk() {
        return runtime.state.view_draftAsk;
      },
      set draftAsk(value) {
        runtime.state.view_draftAsk = value;
      },
      get draftCurrency() {
        return runtime.state.view_draftCurrency;
      },
      set draftCurrency(value) {
        runtime.state.view_draftCurrency = value;
      },
      get draftNegotiate() {
        return runtime.state.view_draftNegotiate;
      },
      set draftNegotiate(value) {
        runtime.state.view_draftNegotiate = value;
      }
    };
  }
  function stallVisitorFields(runtime) {
    return {
      get visitorCursor() {
        return runtime.state.view_visitorCursor;
      },
      set visitorCursor(value) {
        runtime.state.view_visitorCursor = value;
      },
      get visitors() {
        return runtime.state.view_visitors;
      },
      set visitors(value) {
        runtime.state.view_visitors = value;
      },
      get visitorsVisible() {
        return runtime.state.view_visitorsVisible;
      },
      set visitorsVisible(value) {
        runtime.state.view_visitorsVisible = value;
      },
      get visitorTickAt() {
        return runtime.state.view_visitorTickAt;
      },
      set visitorTickAt(value) {
        runtime.state.view_visitorTickAt = value;
      },
      get ledgerPage() {
        return runtime.state.view_ledgerPage;
      },
      set ledgerPage(value) {
        runtime.state.view_ledgerPage = value;
      },
      get recordsKind() {
        return runtime.state.view_recordsKind;
      },
      set recordsKind(value) {
        runtime.state.view_recordsKind = value;
      }
    };
  }
  function PlayerStallViewShopPeekHtml(runtime, root, pick) {
    const [kind, id] = pick.split(":"), row = kind === "listing" && runtime.deps.game.playerStall.listings.find((entry) => entry.id === Number(id));
    return row ? `${PlayerStallViewPeekDealHtml(runtime, row)}${runtime.deps.shopView.itemCardHtml(row.item)}` : "";
  }
  function PlayerStallViewPeekDealHtml(runtime, row) {
    const offer2 = row.offer ? `<p class="shop-deal-purse">${(0, runtime.deps._t)("제안 {name} {amount}개", { name: (0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(row.currency)), amount: Number(row.offer.amount || 0).toLocaleString(runtime.deps.i18n.locale) })}</p>` : "";
    return `<div class="shop-deal is-peek"><p class="shop-deal-price"><span>${(0, runtime.deps._t)("판매가")}</span>${runtime.deps.shopView.coinHtml(row.currency)}
            <strong>${(0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(row.currency))} ${Number(row.price).toLocaleString()}</strong></p>${offer2}</div>`;
  }
  function PlayerStallViewShopUnchoose(runtime) {
    const ui = runtime.api;
    ui.selectedId = null;
    ui.selectedListingId = null;
    ui.message = "";
    ui.resetDraft();
    ui.render(true);
  }
  function PlayerStallViewShopTap(runtime, root, pick) {
    const [kind, id] = pick.split(":");
    if (kind === "bag") runtime.api.select(Number(id));
    else runtime.api.inspect(Number(id));
  }
  function PlayerStallViewShopDim(runtime, root, id) {
    const item = runtime.deps.game.inventory.find((entry) => entry.id === Number(id));
    runtime.api.message = item ? runtime.deps.playerStall.listBlockReason(item, runtime.deps.game) : "";
    runtime.api.render(true);
    runtime.api.revealTerms();
  }
  function PlayerStallViewShopSize(runtime, root, pick) {
    const [kind, id] = pick.split(":"), row = kind === "listing" && runtime.deps.game.playerStall.listings.find((entry) => entry.id === Number(id));
    return row ? (0, runtime.deps.getEquipmentInventoryFootprint)(row.item) : null;
  }
  function PlayerStallViewShopAccepts(runtime, root, pick, target) {
    const [kind, id] = pick.split(":");
    if (target.area === "bag") {
      const row = kind === "listing" && runtime.deps.game.playerStall.listings.find((entry) => entry.id === Number(id));
      return row ? runtime.deps.equipmentInventoryGridRuntime.canAdd(row.item, target.column, target.row, runtime.deps.game).ok : null;
    }
    const there = runtime.deps.game.playerStall.listings.find((entry) => entry.slot === Number(target.key));
    if (there && kind === "listing" && there.id === Number(id)) return null;
    return !there;
  }
  function PlayerStallViewShopDrop(runtime, root, pick, target) {
    const [kind, id] = pick.split(":");
    if (target.area === "bag") {
      runtime.api.withdraw(Number(id), { column: target.column, row: target.row });
      return;
    }
    runtime.api.place({ kind: kind === "bag" ? "inventory" : "listing", id: Number(id) }, Number(target.key), kind === "bag");
  }
  function PlayerStallViewShopRedraw(runtime) {
    return runtime.api.render(true);
  }
  function installPlayerStallViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("stall", {
      shopPeekHtml: PlayerStallViewShopPeekHtml.bind(void 0, runtime),
      peekDealHtml: PlayerStallViewPeekDealHtml.bind(void 0, runtime),
      shopUnchoose: PlayerStallViewShopUnchoose.bind(void 0, runtime),
      shopTap: PlayerStallViewShopTap.bind(void 0, runtime),
      shopDim: PlayerStallViewShopDim.bind(void 0, runtime),
      shopSize: PlayerStallViewShopSize.bind(void 0, runtime),
      shopAccepts: PlayerStallViewShopAccepts.bind(void 0, runtime),
      shopDrop: PlayerStallViewShopDrop.bind(void 0, runtime),
      shopRedraw: PlayerStallViewShopRedraw.bind(void 0, runtime)
    });
  }
  function installPlayerStallViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "toggle", (event) => {
      const host = event.target.closest?.("#stall-records-dialog");
      if (host && event.target.matches(".stall-sale")) runtime.api.fillSaleCards(host);
    }, true);
    installPlayerStallViewAdapter(runtime);
  }
  function PlayerStallViewApi(runtime) {
    const methods = { ...runtime.handlers };
    delete methods.isStallCustomerEvent;
    const api = Object.defineProperties(stallSelectionFields(runtime), Object.getOwnPropertyDescriptors(stallVisitorFields(runtime)));
    return Object.assign(api, methods, { dispose: () => disposePlayerStallView(runtime) });
  }
  function disposePlayerStallView(runtime) {
    releaseViewEvents(runtime);
    if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.STALL_RECORDS_DIALOG);
    runtime.recordsPanel = null;
    runtime.state.view_visitors = [];
  }

  // modules/player-stall-ui-classic.mjs
  var playerStallUi = createPlayerStallView({
    get shopView() {
      return shopView;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get playerStall() {
      return playerStall;
    },
    get document() {
      return document;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get _t() {
      return _t;
    },
    get PLAYER_STALL_RULES() {
      return PLAYER_STALL_RULES;
    },
    get itemAppraisal() {
      return itemAppraisal;
    },
    get Date() {
      return Date;
    },
    get ensureCraftSelectionValid() {
      return ensureCraftSelectionValid;
    },
    get saveGame() {
      return saveGame;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get formatCurrencyCosts() {
      return formatCurrencyCosts;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get addLog() {
      return addLog;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get PLAYER_STALL_CUSTOMERS() {
      return PLAYER_STALL_CUSTOMERS;
    },
    get i18n() {
      return i18n;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get marketUi() {
      return marketUi;
    },
    get formatRecordDuration() {
      return formatRecordDuration;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    }
  });
  safeExposeGlobals({
    playerStallUi,
    stallOutcomeOf: playerStallUi.stallOutcomeOf
  });
})();
