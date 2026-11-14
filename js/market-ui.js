// GENERATED from modules/market-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/market-actions.mjs
  function moveTab(runtime, event) {
    const buttons = [...event.currentTarget.querySelectorAll("button:not([hidden])")];
    const index = buttons.indexOf(runtime.deps.document.activeElement), count = buttons.length;
    const next = { ArrowLeft: (index + count - 1) % count, ArrowRight: (index + 1) % count, Home: 0, End: count - 1 }[event.key];
    if (next === void 0) return;
    event.preventDefault();
    buttons[next].click();
    buttons[next].focus();
  }
  function openSections(runtime) {
    const market = (0, runtime.deps.isMarketUnlocked)();
    const open2 = { npc: runtime.deps.contentProgression.npcsMet(runtime.deps.game) || market, stall: market, hall: runtime.deps.contentProgression.isUnlocked("hall") };
    return runtime.state.MARKET_SECTIONS.filter((id) => open2[id]);
  }
  function show(runtime, section) {
    if (!runtime.state.MARKET_SECTIONS.includes(section)) return;
    runtime.state.view_section = section;
    if (section === "hall") (0, runtime.deps.loadPlayerExchange)();
    renderMarketUI(runtime);
  }
  function open(runtime, section) {
    runtime.state.view_section = runtime.state.MARKET_SECTIONS.includes(section) ? section : runtime.state.view_section;
    (0, runtime.deps.switchTab)("tab-trade");
    show(runtime, runtime.state.view_section);
  }
  function openHallPicker(runtime) {
    runtime.deps.window.openCraftItemPickerOverlay("inventory", {
      title: (0, runtime.deps._t)("장비 전당에 전시할 장비 선택"),
      desc: (0, runtime.deps._t)("장비를 누르면 전시할 장비로 고릅니다."),
      picks: { inventory: runtime.handlers.marketPickHallItem, blocked: runtime.deps.hallItemIssue }
    });
  }
  function blackCardHtml(runtime) {
    if (!(0, runtime.deps.isMarketUnlocked)()) return "";
    return `<li class="npc-roster-item" data-tone="crimson"><button type="button" class="npc-roster-card is-black" data-black-open>
            <span class="npc-roster-face is-black-trader"><img class="npc-roster-portrait" src="${runtime.state.MARKET_BLACK_FACE}" alt=""></span>
            <span class="npc-roster-text"><strong>${(0, runtime.deps._t)("암거래상")}</strong><span class="npc-roster-tags"><em class="is-shop">${(0, runtime.deps._t)("공격 룬, 제작 베이스, 고유 장비")}</em></span></span></button>
            <span class="npc-roster-actions"><button type="button" data-black-open>${(0, runtime.deps._t)("상점")}</button></span></li>`;
  }
  function openBlack(runtime) {
    if (!runtime.active) return;
    const board = runtime.deps.document.getElementById("market-panel-black"), home = runtime.deps.document.getElementById("market-panel-npc");
    if (!(0, runtime.deps.isMarketUnlocked)() || !board || !home || runtime.deps.document.getElementById("black-market-dialog")) return;
    const dialog = runtime.deps.document.createElement("dialog");
    dialog.id = "black-market-dialog";
    dialog.className = "npc-dialog is-shop is-black";
    dialog.dataset.tone = "crimson";
    dialog.setAttribute("aria-labelledby", "black-market-name");
    dialog.innerHTML = `<figure class="npc-dialog-figure is-black-trader"><img class="npc-dialog-portrait" src="${runtime.state.MARKET_BLACK_FACE}" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who"><h2 id="black-market-name">${(0, runtime.deps._t)("암거래상")}</h2></div>
            <button type="button" class="npc-dialog-close" data-black-close>${(0, runtime.deps._t)("닫기")}</button></header></div>`;
    dialog.querySelector(".npc-dialog-main").append(board);
    board.hidden = false;
    runtime.blackDialog = { dialog, board, home };
    listenView(runtime, dialog, "click", (event) => {
      if (event.target.closest("[data-black-close]")) dialog.close();
    });
    listenView(runtime, dialog, "close", () => {
      closeMarketBlackDialog(runtime);
      if (runtime.active) renderMarketUI(runtime);
    }, { once: true });
    runtime.deps.document.body.append(dialog);
    (0, runtime.deps.refreshBlackMarket)(false);
    runtime.deps.blackMarketUi.render();
    dialog.showModal();
  }
  function closeMarketBlackDialog(runtime) {
    const owned = runtime.blackDialog;
    if (!owned) return;
    runtime.blackDialog = null;
    releaseViewTarget(runtime, owned.dialog);
    owned.board.hidden = true;
    owned.home.append(owned.board);
    if (owned.dialog.open) owned.dialog.close();
    owned.dialog.remove();
  }
  function marketPickHallItem(runtime, itemId) {
    (0, runtime.deps.hideItemTooltip)();
    runtime.deps.window.closeCraftItemPickerOverlay();
    (0, runtime.deps.selectPlayerHallItem)(itemId);
  }
  function renderMarketUI(runtime) {
    if (!runtime.active) return;
    const panel = runtime.deps.document.getElementById("ui-market-panel");
    if (!panel) return;
    const open2 = runtime.api.openSections();
    if (!open2.includes(runtime.api.section)) runtime.api.section = open2[0] || "npc";
    if ((0, runtime.deps.isMarketUnlocked)()) (0, runtime.deps.refreshBlackMarket)(false);
    panel.style.setProperty("--market-tabs", String(Math.max(1, open2.length)));
    for (const button of panel.querySelectorAll("[data-market-section]")) {
      const id = button.dataset.marketSection, active = id === runtime.api.section;
      button.hidden = !open2.includes(id);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      runtime.deps.document.getElementById("market-panel-" + id).hidden = !active;
    }
    renderMarketSection(runtime, runtime.api.section);
  }
  function renderMarketSection(runtime, section) {
    if (section === "npc") {
      if (runtime.deps.game.noti) runtime.deps.game.noti.npcs = false;
      runtime.deps.npcRosterUi.render();
    }
    if (section === "stall") runtime.deps.playerStallUi.render();
    if (runtime.deps.document.getElementById("black-market-dialog")?.open) runtime.deps.blackMarketUi.render();
  }

  // modules/ui/market-view.mjs
  function createMarketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { marketPickHallItem, moveTab, openSections, show, open, openHallPicker, blackCardHtml, openBlack, renderMarketUI };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = MarketViewApi(runtime);
    installMarketViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.MARKET_SECTIONS = Object.freeze(["npc", "stall", "hall"]);
    runtime.state.MARKET_BLACK_FACE = "assets/stage-npcs/black-market-portrait.webp";
    runtime.state.view_section = "npc";
  }
  function installMarketViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", (event) => {
      if (event.target.closest?.("[data-black-open]")) runtime.api.openBlack();
    });
  }
  function MarketViewApi(runtime) {
    return {
      get section() {
        return runtime.state.view_section;
      },
      set section(value) {
        runtime.state.view_section = value;
      },
      moveTab: runtime.handlers.moveTab,
      openSections: runtime.handlers.openSections,
      show: runtime.handlers.show,
      open: runtime.handlers.open,
      openHallPicker: runtime.handlers.openHallPicker,
      blackCardHtml: runtime.handlers.blackCardHtml,
      openBlack: runtime.handlers.openBlack,
      marketPickHallItem: runtime.handlers.marketPickHallItem,
      renderMarketUI: runtime.handlers.renderMarketUI,
      dispose: () => disposeMarketView(runtime)
    };
  }
  function disposeMarketView(runtime) {
    releaseViewEvents(runtime);
    closeMarketBlackDialog(runtime);
  }

  // modules/market-ui-classic.mjs
  var marketUi = createMarketView({
    get document() {
      return document;
    },
    get isMarketUnlocked() {
      return isMarketUnlocked;
    },
    get contentProgression() {
      return contentProgression;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get loadPlayerExchange() {
      return loadPlayerExchange;
    },
    get switchTab() {
      return switchTab;
    },
    get window() {
      return window;
    },
    get _t() {
      return _t;
    },
    get hallItemIssue() {
      return hallItemIssue;
    },
    get refreshBlackMarket() {
      return refreshBlackMarket;
    },
    get blackMarketUi() {
      return blackMarketUi;
    },
    get hideItemTooltip() {
      return hideItemTooltip;
    },
    get selectPlayerHallItem() {
      return selectPlayerHallItem;
    },
    get playerStallUi() {
      return playerStallUi;
    },
    get npcRosterUi() {
      return npcRosterUi;
    }
  });
  safeExposeGlobals({
    marketUi,
    marketPickHallItem: marketUi.marketPickHallItem,
    renderMarketUI: marketUi.renderMarketUI
  });
})();
