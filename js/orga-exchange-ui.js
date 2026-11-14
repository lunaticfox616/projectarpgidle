// GENERATED from modules/orga-exchange-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/currency-exchange-markup.mjs
  function rateText(runtime, quote) {
    const pay = `${coinArt(runtime, quote.pay)}${esc(runtime, coinName(runtime, quote.pay))}`;
    const rounded = Math.round(quote.rate * 100) / 100;
    if (quote.rate >= 1) return runtime.state.side === "sell" ? (0, runtime.deps._t)("1개 → {pay} {rate}", { pay, rate: rounded }) : (0, runtime.deps._t)("{pay} {rate} → 1개", { pay, rate: rounded });
    if (runtime.state.side === "sell") return (0, runtime.deps._t)("{count}개 → {pay} 1", { count: Math.ceil(1 / quote.rate - 1e-9), pay });
    return (0, runtime.deps._t)("{pay} 1 → {count}개", { pay, count: Math.floor(1 / quote.rate + 1e-9) });
  }
  function changeHtml(runtime, quote) {
    if ((runtime.deps.game.season || 1) < 2) return "";
    const percent = Math.round(quote.change * 100);
    if (!percent) return `<em class="orga-change">${(0, runtime.deps._t)("지난 루프와 같음")}</em>`;
    return `<em class="orga-change ${percent > 0 ? "is-up" : "is-down"}">${percent > 0 ? "▲" : "▼"}${Math.abs(percent)}%</em>`;
  }
  function orgaDoorHtml(runtime, npc) {
    if (npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc) return "";
    return `<button type="button" class="npc-dialog-shop npc-dialog-exchange" data-npc-topic="exchange"><span>${(0, runtime.deps._t)("재화 교환")}</span><b>${(0, runtime.deps._t)("판매, 구매")}</b></button>`;
  }
  function orgaCellHtml(runtime, key) {
    const held = runtime.deps.game.currencies[key] || 0, on = key === runtime.state.chosen;
    return `<button type="button" class="orga-cell${on ? " is-chosen" : ""}${held ? "" : " is-empty"}" data-orga-key="${key}"
            aria-pressed="${on}" aria-label="${esc(runtime, coinName(runtime, key))}, ${esc(runtime, (0, runtime.deps._t)("보유 {currencies}", { currencies: count(runtime, held) }))}" data-tip="${esc(runtime, coinName(runtime, key))}">${coinArt(runtime, key, "orga-cell-art")}${held ? `<b>${count(runtime, held)}</b>` : ""}</button>`;
  }
  function orgaBoardHtml(runtime) {
    const groups = runtime.state.GROUPS.map((group) => ({ label: group.label, keys: group.keys.filter(runtime.handlers.listed) })).filter((group) => group.keys.length);
    if (!groups.length) return `<p class="orga-empty">${runtime.state.side === "sell" ? (0, runtime.deps._t)("팔 재화가 없습니다.") : (0, runtime.deps._t)("살 수 있는 재화가 없습니다.")}</p>`;
    return groups.map((group) => `<section class="orga-group"><h4>${esc(runtime, (0, runtime.deps._t)(group.label))}</h4><div class="orga-cells">${group.keys.map(runtime.handlers.orgaCellHtml).join("")}</div></section>`).join("");
  }
  function orgaQuoteHtml(runtime) {
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, runtime.state.quantity, runtime.deps.game);
    const [out, into] = runtime.state.side === "sell" ? [runtime.state.chosen, quote.pay] : [quote.pay, runtime.state.chosen];
    const line = (label, key, amount) => `<div><dt>${label}</dt><dd>${coinArt(runtime, key)}${esc(runtime, (0, runtime.deps._t)("{name} {count}개", { name: coinName(runtime, key), count: count(runtime, amount) }))}</dd></div>`;
    return `<dl class="orga-quote">${line((0, runtime.deps._t)("낼 재화"), out, quote.spend)}${line((0, runtime.deps._t)("받을 재화"), into, quote.gain)}</dl>
            <p class="orga-reason" aria-live="polite">${quote.valid ? "" : esc(runtime, quote.reason)}</p>
            <button type="button" class="orga-confirm" data-orga-trade ${quote.valid ? "" : "disabled"}>${runtime.state.side === "sell" ? (0, runtime.deps._t)("판매") : (0, runtime.deps._t)("구매")}</button>`;
  }
  function orgaDetailHtml(runtime) {
    if (!runtime.state.chosen) return `<p class="orga-empty">${(0, runtime.deps._t)("왼쪽에서 재화를 고르세요.")}</p>`;
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, 1, runtime.deps.game);
    return `<div class="orga-pick">${coinArt(runtime, runtime.state.chosen, "orga-pick-art")}<div><h4>${esc(runtime, coinName(runtime, runtime.state.chosen))}</h4><small>${(0, runtime.deps._t)("보유 {currencies}", { currencies: count(runtime, runtime.deps.game.currencies[runtime.state.chosen] || 0) })}</small></div></div>
            <p class="orga-rate"><span>${(0, runtime.deps._t)("이번 루프 시세")}</span><strong>${rateText(runtime, quote)}</strong>${changeHtml(runtime, quote)}</p>
            <div class="orga-qty"><button type="button" data-orga-step="-1" aria-label="${(0, runtime.deps._t)("하나 덜")}">-</button>
                <input type="number" min="1" step="1" inputmode="numeric" value="${runtime.state.quantity}" data-orga-qty aria-label="${(0, runtime.deps._t)("교환할 수량")}">
                <button type="button" data-orga-step="1" aria-label="${(0, runtime.deps._t)("하나 더")}">+</button><button type="button" data-orga-set="10">10</button><button type="button" data-orga-set="max">${(0, runtime.deps._t)("최대")}</button></div>
            <div class="orga-quote-box">${orgaQuoteHtml(runtime)}</div>`;
  }
  function orgaKeepChoice(runtime) {
    if (runtime.state.chosen && shownKeys(runtime).includes(runtime.state.chosen)) return;
    runtime.state.chosen = shownKeys(runtime)[0] || "";
    runtime.state.quantity = 1;
  }
  function orgaBodyHtml(runtime) {
    runtime.deps.currencyExchange.capture(runtime.deps.game);
    orgaKeepChoice(runtime);
    const tab = (id, label) => `<button type="button" role="tab" data-orga-side="${id}" aria-selected="${runtime.state.side === id}">${label}</button>`;
    return `<div class="orga-exchange" data-orga-exchange><header class="shop-bar"><button type="button" class="shop-back" data-npc-topic="greet">${(0, runtime.deps._t)("대화")}</button>
            <h3>${(0, runtime.deps._t)("재화 교환")}</h3>${runtime.deps.shopView.walletHtml([...runtime.state.WALLET])}</header>
            <nav class="orga-sides" role="tablist" aria-label="${(0, runtime.deps._t)("재화 교환")}">${tab("sell", (0, runtime.deps._t)("판매"))}${tab("buy", (0, runtime.deps._t)("구매"))}</nav>
            <div class="orga-body"><div class="orga-board">${orgaBoardHtml(runtime)}</div><aside class="orga-detail">${orgaDetailHtml(runtime)}</aside></div></div>`;
  }
  function orgaRedraw(runtime) {
    const root = runtime.deps.document.querySelector("[data-orga-exchange]");
    if (root) root.outerHTML = orgaBodyHtml(runtime);
  }
  function orgaRedrawQuote(runtime) {
    const box = runtime.deps.document.querySelector("[data-orga-exchange] .orga-quote-box");
    if (box) box.innerHTML = orgaQuoteHtml(runtime);
  }
  function orgaSetQuantity(runtime, value) {
    const max = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, "max", runtime.deps.game).max;
    runtime.state.quantity = value === "max" ? Math.max(1, max) : Math.max(1, Math.floor(Number(value) || 1));
  }
  function esc(runtime, value) {
    return (0, runtime.deps.escapeHTML)(String(value));
  }
  function info(runtime, key) {
    return runtime.deps.ORB_DB[key] || runtime.deps.WALLET_CURRENCY_INFO[key] || { name: key };
  }
  function coinName(runtime, key) {
    return (0, runtime.deps._t)(info(runtime, key).name);
  }
  function coinArt(runtime, key, className = "orga-coin") {
    return info(runtime, key).icon ? `<img class="${className}" src="${esc(runtime, info(runtime, key).icon)}" alt="" draggable="false">` : "";
  }
  function count(runtime, value) {
    return Number(value).toLocaleString(runtime.deps.i18n.locale);
  }
  function listed(runtime, key) {
    return runtime.state.side === "sell" ? (runtime.deps.game.currencies[key] || 0) > 0 : runtime.deps.currencyExchange.hasSeen(runtime.deps.game, key) && !runtime.deps.NPC_CURRENCY_EXCHANGE.noBuy.includes(key);
  }
  function shownKeys(runtime) {
    return runtime.state.GROUPS.flatMap((group) => group.keys).filter(runtime.handlers.listed);
  }

  // modules/ui/currency-exchange-actions.mjs
  async function orgaTrade(runtime) {
    if (!runtime.active || runtime.state.trading || !runtime.state.chosen) return;
    runtime.state.trading = true;
    try {
      await orgaTradeOnce(runtime, runtime.deps.game);
    } finally {
      runtime.state.trading = false;
      if (runtime.active) orgaRedraw(runtime);
    }
  }
  function orgaConfirm(runtime, quote, words) {
    if (quote.times <= 1) return Promise.resolve(true);
    return (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("{out} {spend}개를 내고 {into} {gain}개를 받을까요?", words),
      { title: (0, runtime.deps._t)("재화 교환"), tone: "danger", confirmLabel: runtime.state.side === "sell" ? (0, runtime.deps._t)("판매") : (0, runtime.deps._t)("구매") }
    );
  }
  async function orgaTradeOnce(runtime, owner) {
    const request = {
      key: runtime.state.chosen,
      side: runtime.state.side,
      quantity: runtime.state.quantity,
      account: (0, runtime.deps.getActiveCloudUserId)()
    };
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, runtime.state.quantity, owner), busy = runtime.deps.shopView.busyReason();
    if (busy || !quote.valid) return (0, runtime.deps.addLog)(busy || quote.reason, "attack-monster");
    const [out, into] = runtime.state.side === "sell" ? [runtime.state.chosen, quote.pay] : [quote.pay, runtime.state.chosen];
    const words = { out: coinName(runtime, out), spend: count(runtime, quote.spend), into: coinName(runtime, into), gain: count(runtime, quote.gain) };
    if (!await orgaConfirm(runtime, quote, words)) return;
    if (!runtime.active) return;
    if (!exchangeRequestCurrent(runtime, owner, request, quote)) return (0, runtime.deps.addLog)((0, runtime.deps._t)("확인하는 사이 게임 상태가 바뀌어 교환을 취소했습니다."), "attack-monster");
    const result = runtime.deps.currencyExchange.trade(request.key, request.side, request.quantity, owner);
    if (!result.ok) return (0, runtime.deps.addLog)(result.reason, "attack-monster");
    (0, runtime.deps.notifyCurrencyAcquisition)(into, result.gain);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("베일라와 교환: {out} {spend}개 → {into} {gain}개", words), "loot-magic");
    (0, runtime.deps.queueImportantSave)(180);
    (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
  }
  function exchangeRequestCurrent(runtime, owner, request, quote) {
    if (runtime.deps.shopView.busyReason() || runtime.deps.game !== owner) return false;
    if ((0, runtime.deps.getActiveCloudUserId)() !== request.account) return false;
    if (runtime.state.chosen !== request.key || runtime.state.side !== request.side || runtime.state.quantity !== request.quantity) return false;
    const current = runtime.deps.currencyExchange.quote(request.key, request.side, request.quantity, owner);
    return current.valid && ["pay", "spend", "gain", "times"].every((key) => current[key] === quote[key]);
  }
  function orgaClick(runtime, event) {
    const root = event.target.closest && event.target.closest("[data-orga-exchange]");
    const button = root && event.target.closest("button");
    if (!button) return;
    if (button.dataset.orgaSide) {
      runtime.state.side = button.dataset.orgaSide;
      runtime.state.quantity = 1;
      orgaRedraw(runtime);
      return;
    }
    if (button.dataset.orgaKey) {
      runtime.state.chosen = button.dataset.orgaKey;
      runtime.state.quantity = 1;
      orgaRedraw(runtime);
      return;
    }
    if (button.dataset.orgaStep) {
      orgaSetQuantity(runtime, runtime.state.quantity + Number(button.dataset.orgaStep));
      orgaRedraw(runtime);
      return;
    }
    if (button.dataset.orgaSet) {
      orgaSetQuantity(runtime, button.dataset.orgaSet);
      orgaRedraw(runtime);
      return;
    }
    if (button.hasAttribute("data-orga-trade")) orgaTrade(runtime);
  }
  function orgaInput(runtime, event) {
    if (!event.target.matches || !event.target.matches("[data-orga-qty]")) return;
    runtime.state.quantity = Math.max(1, Math.floor(Number(event.target.value) || 1));
    orgaRedrawQuote(runtime);
  }

  // modules/ui/currency-exchange-view.mjs
  var CURRENCY_EXCHANGE_GROUPS = Object.freeze([
    { label: "기본 재화", keys: ["magicBud", "sapBud", "formlessDew", "goldenRule", "blessing", "blightSpore", "pruningShears", "fairyRing"] },
    { label: "제작 재화", keys: [
      "emberBranch",
      "burningEmberBranch",
      "ouroboros",
      "enchantedHoney",
      "venomStinger",
      "voidChisel",
      "oceanRerollShard",
      "altarEmber",
      "altarIchor",
      "memoryImprint",
      "deepWhetstone",
      "rootIron",
      "jewelPolish",
      "abyssCatalyst",
      "catalystPhys",
      "catalystFire",
      "catalystCold",
      "catalystLight",
      "catalystChaos",
      "catalystCrit",
      "catalystSummon",
      "oilFire",
      "oilCold",
      "oilLight",
      "oilChaos"
    ] },
    { label: "화석", keys: [
      "fossil",
      "fossilPrimal",
      "fossilAncientPrimal",
      "fossilPrimordial",
      "fossilJagged",
      "fossilBound",
      "fossilGale",
      "fossilPrismatic",
      "fossilBulwark",
      "fossilWedge",
      "fossilAbyssal",
      "fossilOld",
      "fossilRift"
    ] },
    { label: "뿌리", keys: ["omenPruning", "omenCompost", "omenWeave", "omenPyre", "omenHunger"] },
    { label: "입장권", keys: [
      "bossKeyFlame",
      "bossKeyFrost",
      "bossKeyStorm",
      "beastKeyCerberus",
      "trialKey3",
      "chaosKey",
      "coreKey",
      "hiveKey",
      "colonyTrace",
      "rivalKey",
      "cosmosSovereignKey",
      "uberRootTicketFlame",
      "uberRootTicketFrost",
      "uberRootTicketStorm",
      "uberRootTicketChaos"
    ] },
    { label: "재료", keys: [
      "bossCore",
      "runeShard",
      "underCopper",
      "underSilver",
      "underGold",
      "skyEssence",
      "jewelShard",
      "pollen",
      "beeswax",
      "awakenedEcho",
      "sealShard",
      "strongSealShard",
      "radiantSealShard",
      "reefFragment",
      "colonyShard"
    ] }
  ]);
  function createCurrencyExchangeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { listed, orgaCellHtml, orgaDoorHtml, orgaBodyHtml, orgaClick, orgaInput };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = CurrencyExchangeViewApi(runtime);
    installCurrencyExchangeViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.GROUPS = CURRENCY_EXCHANGE_GROUPS;
    runtime.state.WALLET = Object.freeze(["magicBud", "formlessDew", "goldenRule"]);
    runtime.state.side = "sell";
    runtime.state.chosen = "";
    runtime.state.quantity = 1;
    runtime.state.trading = false;
  }
  function installCurrencyExchangeViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.orgaClick);
    listenView(runtime, runtime.deps.document, "input", runtime.handlers.orgaInput);
  }
  function CurrencyExchangeViewApi(runtime) {
    return Object.freeze({
      door: runtime.handlers.orgaDoorHtml,
      body: runtime.handlers.orgaBodyHtml,
      groups: runtime.state.GROUPS,
      dispose: () => disposeCurrencyExchangeView(runtime)
    });
  }
  function disposeCurrencyExchangeView(runtime) {
    releaseViewEvents(runtime);
  }

  // modules/orga-exchange-ui-classic.mjs
  var orgaExchangeUi = createCurrencyExchangeView({
    get getActiveCloudUserId() {
      return getActiveCloudUserId;
    },
    get _t() {
      return _t;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get NPC_CURRENCY_EXCHANGE() {
      return NPC_CURRENCY_EXCHANGE;
    },
    get currencyExchange() {
      return currencyExchange;
    },
    get shopView() {
      return shopView;
    },
    get document() {
      return document;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get addLog() {
      return addLog;
    },
    get notifyCurrencyAcquisition() {
      return notifyCurrencyAcquisition;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get WALLET_CURRENCY_INFO() {
      return WALLET_CURRENCY_INFO;
    },
    get i18n() {
      return i18n;
    }
  });
  safeExposeGlobals({ orgaExchangeUi });
})();
