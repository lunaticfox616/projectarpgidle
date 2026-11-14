// GENERATED from modules/tab-navigation-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/tab-notification-keys.mjs
  var TAB_HEADER_NOTI_KEYS = ["char", "season", "items", "skills", "codex", "map", "traits", "talent", "journal", "currency", "fossil", "ascend", "loop", "social", "stump", "npcs"];
  var TAB_UNLOCK_BUTTON_KEYS = ["char", "season", "items", "skills", "codex", "map", "traits", "talent", "stump"];

  // modules/ui/tab-definitions.mjs
  var MERGED_TAB_GROUPS = Object.freeze({
    growth: { launcher: "tab-char", title: "스킬트리", tabs: [{ id: "tab-char", label: "스킬트리", icon: 2, count: (game) => game.passivePoints, detail: "스킬트리 노드에 포인트를 씁니다." }, { id: "tab-traits", label: "전직", icon: 16, detail: "전직을 고르고 노드와 키스톤을 할당합니다." }, { id: "tab-talent", gate: "talent", label: "재능", icon: 17, detail: "재능 개화 카드를 고르고 키웁니다." }] },
    gear: { launcher: "tab-items", title: "장비", tabs: [{ id: "tab-items", label: "장비", icon: 6, detail: "장비와 가방을 봅니다." }, { id: "tab-skills", label: "스킬룬", icon: 9, detail: "룬을 장착하고 키웁니다." }] },
    loop: { launcher: "tab-season", title: "루프", tabs: [{ id: "tab-season", label: "루프 패시브", icon: 4, count: (game) => game.seasonPoints, detail: "루프 포인트로 영구 노드에 투자합니다." }, { id: "tab-unlocks", label: "해금", icon: 3, count: (game, contentProgression2) => contentProgression2.points(game).balance, detail: "해금 포인트로 다음 콘텐츠를 고릅니다." }] },
    records: { launcher: "tab-journal", title: "기록", tabs: [{ id: "tab-journal", gate: "journal", label: "이야기 저널", icon: 10, detail: "진행 기록과 안내를 확인합니다." }, { id: "tab-guide", gate: "journal", label: "가이드", icon: 10, detail: "주요 조작을 다시 따라 하거나 용어를 확인합니다." }, { id: "tab-codex", gate: "codex", label: "도감", icon: 13, detail: "발견한 항목과 수집 현황을 확인합니다." }, { id: "tab-records", gate: "journal", label: "기록", icon: 20, detail: "루프 소요 시간과 최고 기록을 확인합니다." }] }
  });

  // modules/ui/tab-navigation-queries.mjs
  function isMobilePrimaryNavigationEnabled(runtime) {
    if (typeof runtime.deps.window === "undefined" || !runtime.deps.window.matchMedia) return false;
    if (runtime.deps.document.body.classList.contains("desktop-windowed-ui")) return false;
    return runtime.deps.uiDisplay.matches("(max-width: 1080px)");
  }
  function getOrderedTabGroups(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let order = Array.isArray(runtime.deps.tabLayoutUi.current().tabGroupOrder) ? runtime.deps.tabLayoutUi.current().tabGroupOrder : [];
    let byKey = {};
    runtime.state.TAB_GROUPS.forEach((group) => {
      byKey[group.key] = group;
    });
    return order.concat(runtime.state.TAB_GROUPS.map((group) => group.key)).filter((key, idx, arr) => byKey[key] && arr.indexOf(key) === idx).map((key) => byKey[key]);
  }
  function getTabGroupForId(runtime, tabId) {
    let id = String(tabId || "").replace(/^btn-/, "");
    let g = runtime.state.TAB_GROUPS.find((group) => group.tabs.includes(id));
    return g ? g.key : "etc";
  }
  function isTabGroupingActive(runtime) {
    if (typeof runtime.deps.window === "undefined" || !runtime.deps.window.matchMedia) return false;
    if (typeof runtime.deps.document !== "undefined" && runtime.deps.document.body && runtime.deps.document.body.classList.contains("desktop-windowed-ui")) return false;
    return runtime.deps.uiDisplay.matches("(min-width: 1081px)");
  }
  function getActiveTabGroup(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let cur = runtime.deps.game.settings.activeTabGroup;
    if (!runtime.state.TAB_GROUPS.some((g) => g.key === cur)) cur = "character";
    return cur;
  }
  function getTabHeaderUiSignature(runtime) {
    let unlocks = runtime.deps.game.unlocks || {};
    let mobileBattle = runtime.deps.uiDisplay.matches(`(max-width: ${runtime.deps.MOBILE_BATTLE_BREAKPOINT}px)`) ? "mobileBattle" : "desktopBattle";
    return [
      runtime.deps.i18n.language,
      mobileBattle,
      isMobilePrimaryNavigationEnabled(runtime) ? "mobilePrimary" : "legacyTabs",
      runtime.deps.game.settings && runtime.deps.game.settings.tabNotiEnabled === false ? "notiOff" : "notiOn",
      // 알림 점은 getTabNotiSignature가 따로 본다(점 하나에 머리 전체를 다시 그리지 않게).
      TAB_HEADER_NOTI_KEYS.map((key) => `${key}:${unlocks[key] ? 1 : 0}`).join("|"),
      runtime.deps.contentProgression.opening.signature(runtime.deps.game),
      ...tabLayoutSignature(runtime),
      isTabGroupingActive(runtime) ? "grp:" + getActiveTabGroup(runtime) : "nogrp"
    ].join("::");
  }
  function tabLayoutSignature(runtime) {
    return [
      Array.isArray(runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabOrder) ? runtime.deps.tabLayoutUi.current().tabOrder.join(",") : "",
      JSON.stringify(runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabPlacement || {}),
      Array.isArray(runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabGroupOrder) ? runtime.deps.tabLayoutUi.current().tabGroupOrder.join(",") : ""
    ];
  }
  function getTabNotiSignature(runtime) {
    let noti = runtime.deps.game.noti || {};
    let filters = runtime.deps.game.settings && runtime.deps.game.settings.notiFilters || {};
    return TAB_HEADER_NOTI_KEYS.map((key) => noti[key] && filters[key] !== false ? 1 : 0).join("");
  }
  function isNotiEnabled(runtime, key) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    if (runtime.deps.game.settings.tabNotiEnabled === false) return false;
    runtime.deps.game.settings.notiFilters = runtime.deps.game.settings.notiFilters || {};
    return runtime.deps.game.settings.notiFilters[key] !== false;
  }
  function isMergedTabAvailable(runtime, tab) {
    let tabId = typeof tab === "string" ? tab : tab.id;
    if (runtime.deps.window.playerGuideUi?.allowsTab(tabId) === false) return false;
    if (runtime.deps.game.contentProgression) return runtime.deps.contentProgression.canOpen(tabId);
    let gateKey = typeof tab === "string" ? runtime.deps.TAB_UNLOCK_GATES[tabId] : tab.gate || runtime.deps.TAB_UNLOCK_GATES[tabId];
    if (gateKey === "journal") return (0, runtime.deps.isJournalTabUnlockReady)();
    return !gateKey || !!(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gateKey]);
  }
  function getMergedTabGroup(runtime, tabId) {
    return Object.entries(MERGED_TAB_GROUPS).find(([, group]) => group.tabs.some((tab) => tab.id === tabId)) || null;
  }
  function getSelectedMergedTabId(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return null;
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.mergedTabSelection = runtime.deps.game.settings.mergedTabSelection || {};
    let selected = runtime.deps.game.settings.mergedTabSelection[groupKey];
    if (group.tabs.some((tab) => tab.id === selected && isMergedTabAvailable(runtime, tab))) return selected;
    let firstAvailable = group.tabs.find(runtime.handlers.isMergedTabAvailable);
    return firstAvailable ? firstAvailable.id : null;
  }
  function getActiveTopLevelTabElement(runtime) {
    return runtime.deps.document.querySelector(".tab-content.active:not(.merged-subtab-pane)");
  }
  function getActiveUiTabId(runtime) {
    let activeContent = getActiveTopLevelTabElement(runtime);
    if (!activeContent) return "";
    return resolveRenderedTabId(runtime, activeContent.id);
  }
  function resolveRenderedTabId(runtime, tabId) {
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (!mergedEntry || mergedEntry[1].launcher !== tabId) return tabId;
    return getSelectedMergedTabId(runtime, mergedEntry[0]) || tabId;
  }
  function getRenderingUiTabIds(runtime) {
    let ids = /* @__PURE__ */ new Set();
    let desktop = runtime.deps.document.body.classList.contains("desktop-windowed-ui");
    let active = getActiveTopLevelTabElement(runtime);
    let closed = active && desktop && active.classList.contains("ui-window") && (!active.classList.contains("ui-window-open") || active.classList.contains("ui-window-minimized"));
    if (active && !closed) ids.add(resolveRenderedTabId(runtime, active.id));
    if (!desktop) return ids;
    runtime.deps.document.querySelectorAll(".tab-content.ui-window-open:not(.ui-window-minimized)").forEach((el) => {
      if (el.id) ids.add(resolveRenderedTabId(runtime, el.id));
    });
    return ids;
  }
  function isTabSurfaceAvailable(runtime, tabId) {
    if (!tabId || runtime.deps.window.playerGuideUi?.allowsTab(tabId, true) === false) return false;
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry) {
      if (mergedEntry[1].launcher === tabId) return !!getSelectedMergedTabId(runtime, mergedEntry[0]);
      return isMergedTabAvailable(runtime, mergedEntry[1].tabs.find((tab) => tab.id === tabId) || tabId);
    }
    if (!runtime.deps.contentProgression.canOpen(tabId)) return false;
    let gateKey = runtime.deps.TAB_UNLOCK_GATES[tabId];
    return !gateKey || !!(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gateKey]);
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/tab-mobile-menu.mjs
  function setMobileTabDrawerOpen(runtime, open) {
    const wasOpen = runtime.deps.document.body.classList.contains("mobile-tab-drawer-open");
    let enabled = isMobilePrimaryNavigationEnabled(runtime);
    let nextOpen = enabled && !!open;
    closeGoalDrawerForMenu(runtime, nextOpen);
    runtime.deps.document.body.classList.toggle("mobile-tab-drawer-open", nextOpen);
    let more = runtime.deps.document.getElementById("btn-mobile-nav-more");
    if (more) more.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    let header = runtime.deps.document.getElementById("tab-header-main");
    if (header && enabled) header.setAttribute("aria-hidden", nextOpen ? "false" : "true");
    syncMobileMenuFocus(runtime, header, more, wasOpen, nextOpen);
  }
  function closeGoalDrawerForMenu(runtime, nextOpen) {
    let goalDrawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (nextOpen && goalDrawer && goalDrawer.classList.contains("expanded") && typeof runtime.deps.toggleGoalDrawer === "function") {
      (0, runtime.deps.toggleGoalDrawer)(false);
    }
  }
  function syncMobileMenuFocus(runtime, header, more, wasOpen, nextOpen) {
    if (wasOpen === nextOpen || !header) return;
    if (nextOpen) {
      header.querySelector(".mobile-tab-drawer-head button")?.focus({ preventScroll: true });
      return;
    }
    if (header.contains(runtime.deps.document.activeElement) || runtime.deps.document.activeElement.id === "mobile-tab-drawer-backdrop") {
      more?.focus({ preventScroll: true });
    }
  }
  function handleMobileMenuKey(runtime, event) {
    if (!runtime.deps.document.body.classList.contains("mobile-tab-drawer-open") || !["Tab", "Escape"].includes(event.key)) return;
    if (runtime.deps.document.querySelector("dialog:modal")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === "Escape") {
      setMobileTabDrawerOpen(runtime, false);
      return;
    }
    const header = runtime.deps.document.getElementById("tab-header-main");
    const buttons = Array.from(header.querySelectorAll("button:not([disabled]),[data-mobile-tab-button]")).filter((button) => button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(runtime.deps.document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }
  function restoreMobileMenuFocus(runtime, focused) {
    if (!runtime.deps.document.body.classList.contains("mobile-tab-drawer-open")) return;
    const header = runtime.deps.document.getElementById("tab-header-main");
    if (!header.contains(focused)) return;
    const target = focused.getClientRects().length ? focused : header.querySelector(".mobile-tab-drawer-head button");
    target?.focus({ preventScroll: true });
  }
  function prepareMobileTabButtons(runtime, headers) {
    headers.forEach((header) => header.querySelectorAll(".tab-btn:not(button)").forEach((button) => {
      button.setAttribute("data-mobile-tab-button", "");
      button.setAttribute("role", "button");
      button.tabIndex = 0;
    }));
  }
  function handleMobileTabActivation(runtime, event) {
    if (!runtime.deps.document.body.classList.contains("mobile-primary-navigation")) return;
    if (!event.target.matches("[data-mobile-tab-button]") || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.click();
  }
  function toggleMobileTabDrawer(runtime) {
    setMobileTabDrawerOpen(runtime, !runtime.deps.document.body.classList.contains("mobile-tab-drawer-open"));
  }
  function createMobileTabDrawerHead(runtime) {
    let head = runtime.deps.document.createElement("div");
    head.className = "mobile-tab-drawer-head";
    let title = runtime.deps.document.createElement("strong");
    title.textContent = "전체 메뉴";
    title.dataset.i18n = "";
    let actions = runtime.deps.document.createElement("span");
    actions.className = "mobile-tab-drawer-actions";
    let close = runtime.deps.document.createElement("button");
    close.type = "button";
    close.textContent = "닫기";
    close.dataset.i18n = "";
    close.setAttribute("aria-label", "전체 메뉴 닫기");
    close.dataset.i18nAttr = "aria-label";
    listenView(runtime, close, "click", () => runtime.handlers.setMobileTabDrawerOpen(false));
    actions.append(close);
    head.append(title, actions);
    runtime.deps.i18n.applyStatic(head);
    return head;
  }
  function createMobileMoreButton(runtime) {
    let button = runtime.deps.document.createElement("button");
    button.id = "btn-mobile-nav-more";
    button.type = "button";
    button.className = "mobile-nav-more";
    button.setAttribute("aria-controls", "tab-header-main");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "전체 메뉴 열기");
    button.dataset.i18nAttr = "aria-label";
    button.innerHTML = '<span data-i18n>전체</span><span class="noti-dot"></span>';
    runtime.deps.i18n.applyStatic(button);
    listenView(runtime, button, "click", runtime.handlers.toggleMobileTabDrawer);
    return button;
  }
  function ensureMobilePrimaryNavigation(runtime, topHeader, bottomHeader) {
    if (!topHeader || !bottomHeader) return null;
    runtime.deps.document.body.classList.add("mobile-primary-navigation", "has-bottom-tabs");
    topHeader.setAttribute("role", "dialog");
    topHeader.setAttribute("aria-modal", "true");
    topHeader.setAttribute("aria-label", (0, runtime.deps._t)("전체 메뉴"));
    topHeader.setAttribute("aria-hidden", String(!runtime.deps.document.body.classList.contains("mobile-tab-drawer-open")));
    bottomHeader.setAttribute("role", "navigation");
    bottomHeader.setAttribute("aria-label", (0, runtime.deps._t)("빠른 탭 메뉴"));
    let head = topHeader.querySelector(":scope > .mobile-tab-drawer-head");
    if (!head) topHeader.prepend(createMobileTabDrawerHead(runtime));
    let more = runtime.deps.document.getElementById("btn-mobile-nav-more");
    if (!more) more = createMobileMoreButton(runtime);
    bottomHeader.appendChild(more);
    let backdrop = runtime.deps.document.getElementById("mobile-tab-drawer-backdrop");
    if (!backdrop) {
      backdrop = runtime.deps.document.createElement("button");
      backdrop.id = "mobile-tab-drawer-backdrop";
      backdrop.type = "button";
      backdrop.setAttribute("aria-label", (0, runtime.deps._t)("전체 메뉴 닫기"));
      listenView(runtime, backdrop, "click", () => runtime.handlers.setMobileTabDrawerOpen(false));
      runtime.deps.document.body.appendChild(backdrop);
    }
    if (!runtime.state.mobileNavigationKeyBound) {
      runtime.state.mobileNavigationKeyBound = true;
      listenView(runtime, runtime.deps.document, "keydown", runtime.handlers.handleMobileMenuKey, true);
      listenView(runtime, runtime.deps.document, "keydown", runtime.handlers.handleMobileTabActivation, true);
    }
    prepareMobileTabButtons(runtime, [topHeader, bottomHeader]);
    return more;
  }
  function teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader) {
    setMobileTabDrawerOpen(runtime, false);
    runtime.deps.document.querySelectorAll("[data-mobile-tab-button]").forEach((button) => {
      button.removeAttribute("data-mobile-tab-button");
      button.removeAttribute("role");
      button.removeAttribute("tabindex");
      button.removeAttribute("aria-pressed");
    });
    runtime.deps.document.body.classList.remove("mobile-primary-navigation", "mobile-tab-drawer-open", "has-bottom-tabs");
    if (topHeader && bottomHeader) {
      Array.from(bottomHeader.querySelectorAll(":scope > .tab-btn")).forEach((button) => topHeader.appendChild(button));
    }
    if (topHeader) {
      topHeader.removeAttribute("role");
      topHeader.removeAttribute("aria-modal");
      topHeader.removeAttribute("aria-label");
      topHeader.removeAttribute("aria-hidden");
      const head = topHeader.querySelector(":scope > .mobile-tab-drawer-head");
      if (head) releaseViewTarget(runtime, head.querySelector("button"));
      head?.remove();
      topHeader.querySelectorAll(".mobile-menu-group-title").forEach((title) => title.remove());
    }
    if (bottomHeader) {
      bottomHeader.removeAttribute("role");
      bottomHeader.removeAttribute("aria-label");
      bottomHeader.style.removeProperty("display");
    }
    for (const id of ["btn-mobile-nav-more", "mobile-tab-drawer-backdrop"]) {
      const element = runtime.deps.document.getElementById(id);
      if (element) releaseViewTarget(runtime, element);
      element?.remove();
    }
    runtime.deps.document.body.style.setProperty("--bottom-tab-height", "0px");
  }
  function syncMobilePrimaryNavigationState(runtime) {
    let more = runtime.deps.document.getElementById("btn-mobile-nav-more");
    let topHeader = runtime.deps.document.getElementById("tab-header-main");
    if (!more || !topHeader) return;
    runtime.deps.document.querySelectorAll("[data-mobile-tab-button]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    });
    let activeSecondary = !!topHeader.querySelector(":scope > .tab-btn.active");
    more.classList.toggle("active", activeSecondary);
    let hasNotice = Array.from(topHeader.querySelectorAll(".tab-btn .noti-dot")).some((dot2) => dot2.style.display !== "none" && (0, runtime.deps.getComputedStyle)(dot2).display !== "none");
    let dot = more.querySelector(".noti-dot");
    if (dot) dot.style.display = hasNotice ? "block" : "none";
  }
  function renderTabOrderSettings(runtime) {
    runtime.deps.tabLayoutUi.render();
  }
  function renderMobileMenuGroups(runtime, header) {
    for (const group of getOrderedTabGroups(runtime)) {
      const buttons = group.tabs.map((id) => runtime.deps.document.getElementById("btn-" + id)).filter((button) => button && button.parentElement === header && button.style.display !== "none" && !button.hidden && button.dataset.mergedTabMember !== "1");
      let title = header.querySelector('[data-mobile-group="' + group.key + '"]');
      if (!title) {
        title = runtime.deps.document.createElement("div");
        title.className = "mobile-menu-group-title";
        title.dataset.mobileGroup = group.key;
      }
      title.textContent = (0, runtime.deps._t)(group.label);
      title.hidden = buttons.length === 0;
      header.appendChild(title);
      buttons.forEach((button) => header.appendChild(button));
    }
  }

  // modules/ui/view-frames.mjs
  function scheduleViewFrame(runtime, callback) {
    if (!runtime.active) return;
    const owner = runtime.deps.game;
    const handle = runtime.deps.requestAnimationFrame(() => {
      runtime.frames.delete(handle);
      if (runtime.active && runtime.deps.game === owner) callback();
    });
    runtime.frames.add(handle);
  }
  function cancelViewFrames(runtime) {
    for (const handle of runtime.frames) runtime.deps.cancelAnimationFrame(handle);
    runtime.frames.clear();
  }

  // modules/ui/tab-merged-panels.mjs
  function renderVisibleManagementPanels(runtime, tabIds) {
    if (tabIds.has("tab-talent")) runtime.deps.talentUi.render();
    if (tabIds.has("tab-stump")) runtime.deps.stumpBoxUi.renderStumpBoxTab();
    if (tabIds.has("tab-trade")) (0, runtime.deps.renderMarketUI)();
    else (0, runtime.deps.refreshBlackMarket)(false);
  }
  function closeRelockedTabSurfaces(runtime) {
    Array.from(runtime.deps.document.querySelectorAll(".tab-content:not(.merged-subtab-pane)")).forEach((el) => {
      if (!el.id || isTabSurfaceAvailable(runtime, el.id)) return;
      let wasActive = el.classList.contains("active");
      let windowOpen = el.classList.contains("ui-window-open") || el.classList.contains("ui-window-minimized");
      if (!wasActive && !windowOpen) return;
      el.classList.remove("active");
      let btn = runtime.deps.document.getElementById("btn-" + el.id);
      if (btn) btn.classList.remove("active");
      closeRelockedWindow(runtime, el.id, windowOpen, wasActive);
    });
  }
  function closeRelockedWindow(runtime, id, windowOpen, wasActive) {
    if (windowOpen && typeof runtime.deps.closeWindow === "function") (0, runtime.deps.closeWindow)(id);
    if (runtime.state.lastActiveTabId === id) runtime.state.lastActiveTabId = null;
    if (wasActive) runtime.state.pendingRelockedTabFallback = true;
  }
  function mountMergedTabGroup(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let root = group && runtime.deps.document.getElementById(group.launcher);
    if (!root) return null;
    let host = root.querySelector(":scope > .ui-window-body") || root;
    let shell = host.querySelector(":scope > .merged-tab-shell");
    if (shell) return shell;
    shell = runtime.deps.document.createElement("div");
    shell.className = "merged-tab-shell";
    let nav = runtime.deps.document.createElement("div");
    nav.className = "subtab-row merged-tab-subtabs";
    let panels = runtime.deps.document.createElement("div");
    panels.className = "merged-tab-panels";
    let hostPane = runtime.deps.document.createElement("div");
    hostPane.className = "merged-subtab-pane";
    hostPane.dataset.tabId = group.launcher;
    Array.from(host.childNodes).forEach((node) => hostPane.appendChild(node));
    panels.appendChild(hostPane);
    group.tabs.filter((tab) => tab.id !== group.launcher).forEach((tab) => {
      let source = runtime.deps.document.getElementById(tab.id);
      if (!source) return;
      source.classList.add("merged-subtab-pane");
      source.dataset.tabId = tab.id;
      panels.appendChild(source);
    });
    shell.append(nav, panels);
    host.replaceChildren(shell);
    return shell;
  }
  function renderMergedTabPanels(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let shell = mountMergedTabGroup(runtime, groupKey);
    if (!group || !shell) return;
    let selectedId = getSelectedMergedTabId(runtime, groupKey);
    renderMergedTabStrip(runtime, groupKey);
    shell.querySelectorAll(".merged-subtab-pane").forEach((pane) => {
      pane.classList.toggle("active", pane.dataset.tabId === selectedId);
    });
  }
  function mergedTabMarkHtml(runtime, tab) {
    let key = tab.id.replace(/^tab-/, ""), count = Math.max(0, Math.floor(Number(tab.count ? tab.count(runtime.deps.game, runtime.deps.contentProgression) : 0) || 0));
    if (count > 0) return `<b class="window-tab-count">${count}</b>`;
    return runtime.deps.game.noti && runtime.deps.game.noti[key] && isNotiEnabled(runtime, key) ? '<i class="window-tab-dot"></i>' : "";
  }
  function mergedTabHotkeyHtml(runtime, tab) {
    let source = runtime.deps.document.getElementById("btn-" + tab.id);
    return source && source.dataset.hotkey ? `<kbd class="window-tab-key"><span class="px-center">${(0, runtime.deps.escapeHTML)(source.dataset.hotkey)}</span></kbd>` : "";
  }
  function mergedTabButtonHtml(runtime, groupKey, tab, selectedId) {
    let icon = Number.isInteger(tab.icon) ? `<span class="window-tab-icon" style="--px-icon:${tab.icon}"></span>` : "";
    let active = tab.id === selectedId;
    return `<button type="button" class="subtab-btn window-tab${active ? " active" : ""}" role="tab" aria-selected="${active}" data-tab-id="${tab.id}" onclick="switchMergedTabSubtab('${groupKey}','${tab.id}')">${icon}<span class="window-tab-name">${(0, runtime.deps._t)(tab.label)}</span>${mergedTabMarkHtml(runtime, tab)}${mergedTabHotkeyHtml(runtime, tab)}</button>`;
  }
  function mergedTabTitleHost(runtime, root) {
    let titlebar = root.querySelector(":scope > .ui-window-titlebar");
    if (!titlebar) return null;
    let host = titlebar.querySelector(":scope > .ui-window-tabs");
    if (!host) {
      host = runtime.deps.document.createElement("div");
      host.className = "ui-window-tabs";
      host.setAttribute("role", "tablist");
      titlebar.insertBefore(host, titlebar.querySelector(":scope > .ui-window-actions"));
    }
    bindMergedTabTitleHost(runtime, host);
    return host;
  }
  function bindMergedTabTitleHost(runtime, host) {
    for (const previous of runtime.state.titleHosts) {
      if (previous.isConnected) continue;
      releaseViewTarget(runtime, previous);
      runtime.state.titleHosts.delete(previous);
    }
    if (runtime.state.titleHosts.has(host)) return;
    runtime.state.titleHosts.add(host);
    listenView(runtime, host, "dblclick", (event) => {
      if (event.target.closest("button")) event.stopPropagation();
    });
  }
  function renderMergedTabStrip(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey], root = group && runtime.deps.document.getElementById(group.launcher);
    let nav = root && root.querySelector(".merged-tab-subtabs");
    if (!nav) return;
    let selectedId = getSelectedMergedTabId(runtime, groupKey), visibleTabs = group.tabs.filter(runtime.handlers.isMergedTabAvailable), many = visibleTabs.length > 1;
    let html = many ? visibleTabs.map((tab) => mergedTabButtonHtml(runtime, groupKey, tab, selectedId)).join("") : "";
    let titleHost = mergedTabTitleHost(runtime, root);
    root.classList.toggle("ui-window-tabbed", !!titleHost && many);
    nav.classList.add("window-tab-strip");
    setMergedTabStripHtml(runtime, titleHost, html, many);
    setMergedTabStripHtml(runtime, nav, titleHost ? "" : html, many && !titleHost);
  }
  function setMergedTabStripHtml(runtime, host, html, shown) {
    if (!host) return;
    host.hidden = !shown;
    if (host.dataset.rendered !== html) {
      host.innerHTML = html;
      host.dataset.rendered = html;
    }
  }
  function enterShownTab(runtime, tabId) {
    if (tabId !== "tab-items") return;
    if (runtime.deps.game.noti) runtime.deps.game.noti.items = false;
    if (runtime.deps.window.equipmentTriage) runtime.deps.window.equipmentTriage.onOpen();
    runtime.handlers.switchItemSubtab("item-tab-equip");
  }
  function resolveShownTab(runtime, tabId, mergedEntry) {
    if (!mergedEntry) return { id: tabId, changed: false };
    let groupKey = mergedEntry[0], own = mergedEntry[1].tabs.find((tab) => tab.id === tabId);
    if (!runtime.state.mergedTabSwitching && isMergedTabAvailable(runtime, own)) runtime.deps.game.settings.mergedTabSelection[groupKey] = tabId;
    let id = resolveRenderedTabId(runtime, tabId), changed = runtime.state.mergedPaneShown.get(groupKey) !== id;
    runtime.state.mergedPaneShown.set(groupKey, id);
    return { id, changed };
  }
  function refreshShownMergedTab(runtime, mergedEntry, shown) {
    if (!mergedEntry) return;
    renderMergedTabSubtabs(runtime, mergedEntry[0]);
    if (shown.changed) enterShownTab(runtime, shown.id);
    runtime.deps.tutorialActionUi.followOpeningTab(shown.id);
  }
  function switchMergedTabSubtab(runtime, groupKey, tabId, options = {}) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let tab = group && group.tabs.find((entry) => entry.id === tabId);
    if (!tab || !isMergedTabAvailable(runtime, tab)) return;
    rememberMergedTabSelection(runtime, groupKey, tabId);
    runtime.state.mergedTabSwitching = true;
    try {
      runtime.deps.window.switchTab(group.launcher, { keepWindowOpen: options.keepWindowOpen !== false });
    } finally {
      runtime.state.mergedTabSwitching = false;
    }
    (0, runtime.deps.updateStaticUI)();
  }
  function rememberMergedTabSelection(runtime, groupKey, tabId) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.mergedTabSelection = runtime.deps.game.settings.mergedTabSelection || {};
    runtime.deps.game.settings.mergedTabSelection[groupKey] = tabId;
    let wasCodexNotified = !!(runtime.deps.game.noti && runtime.deps.game.noti.codex);
    if (runtime.deps.game.noti) runtime.deps.game.noti[tabId.replace(/^tab-/, "")] = false;
    if (tabId === "tab-codex" && wasCodexNotified) runtime.deps.game.codexFocusNewOnOpen = true;
  }
  function syncMergedTabLauncherVisibility(runtime) {
    runtime.deps.contentUnlockUi.sync();
    Object.values(MERGED_TAB_GROUPS).forEach((group) => {
      let launcher = runtime.deps.document.getElementById("btn-" + group.launcher);
      if (launcher) launcher.style.display = group.tabs.some(runtime.handlers.isMergedTabAvailable) ? "flex" : "none";
    });
  }
  function syncMergedTabLauncherState(runtime) {
    Object.values(MERGED_TAB_GROUPS).forEach((group) => {
      let launcher = runtime.deps.document.getElementById("btn-" + group.launcher);
      if (!launcher) return;
      let root = runtime.deps.document.getElementById(group.launcher);
      launcher.classList.toggle("active", !!(root && root.classList.contains("active")));
      let sourceKeys = group.tabs.map((tab) => tab.id.replace(/^tab-/, ""));
      let dot = launcher.querySelector(".noti-dot");
      if (dot) dot.style.display = sourceKeys.some((key) => runtime.deps.game.noti[key] && isNotiEnabled(runtime, key)) ? "block" : "none";
      if (root && (root.classList.contains("active") || root.classList.contains("ui-window-open"))) renderMergedTabStrip(runtime, getMergedTabGroup(runtime, group.launcher)[0]);
    });
    syncMobilePrimaryNavigationState(runtime);
  }
  function openMergedTabPicker(runtime, event, groupKey) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return;
    const firstGear = groupKey === "gear" && runtime.deps.contentProgression.opening.applies(runtime.deps.game) && runtime.deps.game.tutorialHistory.some((row) => row.key === "tutorial_first_gear" && row.status === "unread");
    let selectedTabId = firstGear ? "tab-items" : getSelectedMergedTabId(runtime, groupKey);
    if (!selectedTabId) return;
    switchMergedTabSubtab(runtime, groupKey, selectedTabId, { keepWindowOpen: false });
  }
  function openTabPane(runtime, tabId) {
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry) {
      switchMergedTabSubtab(runtime, mergedEntry[0], tabId);
      return;
    }
    (0, runtime.deps.switchTab)(tabId);
  }
  function renderMergedTabSubtabs(runtime, tabId) {
    renderMergedTabPanels(runtime, tabId);
  }
  function revealActiveTabButton(runtime, button) {
    runtime.state.revealButton = button;
    if (runtime.state.revealPending) return;
    runtime.state.revealPending = true;
    const owner = runtime.deps.game;
    scheduleViewFrame(runtime, () => {
      runtime.state.revealTimer = runtime.deps.setTimeout(() => {
        runtime.state.revealTimer = null;
        runtime.state.revealPending = false;
        const target = runtime.state.revealButton;
        runtime.state.revealButton = null;
        if (!runtime.active || runtime.deps.game !== owner || !target?.isConnected) return;
        const bar = target.parentElement;
        if (bar && bar.scrollWidth > bar.clientWidth + 1) target.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }, 0);
    });
  }

  // modules/ui/tab-header-layout.mjs
  function getTabButtonFromTarget(runtime, target) {
    return target && target.closest ? target.closest(".tab-header .tab-btn") : null;
  }
  function getTabHeaders(runtime) {
    return Array.from(runtime.deps.document.querySelectorAll(".tab-header"));
  }
  function getTabHeaderOrderSnapshot(runtime, headers) {
    return (headers || getTabHeaders(runtime)).flatMap((header) => Array.from(header.querySelectorAll(".tab-btn")).map((el) => el.id).filter(Boolean));
  }
  function getTabHeaderUnderPoint(runtime, clientX, clientY) {
    let hit = runtime.deps.document.elementFromPoint ? runtime.deps.document.elementFromPoint(clientX, clientY) : null;
    let hitHeader = hit && hit.closest ? hit.closest(".tab-header") : null;
    if (hitHeader) return hitHeader;
    return getTabHeaders(runtime).find((header) => {
      let rect = header.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
  }
  function updateTabDragGhost(runtime, state, clientX, clientY) {
    if (!state || !state.ghost) return;
    let offsetX = Number.isFinite(state.grabOffsetX) ? state.grabOffsetX : 0;
    let offsetY = Number.isFinite(state.grabOffsetY) ? state.grabOffsetY : 0;
    state.ghost.style.left = `${(clientX - offsetX) / runtime.deps.uiDisplay.factor}px`;
    state.ghost.style.top = `${(clientY - offsetY) / runtime.deps.uiDisplay.factor}px`;
  }
  function beginTabHeaderDrag(runtime, state) {
    if (!runtime.active || !state || state.dragging || state !== runtime.state.tabHeaderDragState || state.owner !== runtime.deps.game || !state.button.isConnected) return;
    state.dragging = true;
    let rect = state.button.getBoundingClientRect();
    state.grabOffsetX = (0, runtime.deps.clampNumber)(state.lastX - rect.left, 0, rect.width);
    state.grabOffsetY = (0, runtime.deps.clampNumber)(state.lastY - rect.top, 0, rect.height);
    state.ghost = runtime.deps.document.createElement("div");
    state.ghost.className = "tab-drag-ghost";
    state.ghost.setAttribute("aria-hidden", "true");
    state.ghost.innerHTML = state.button.innerHTML;
    state.ghost.style.width = `${Math.max(1, rect.width / runtime.deps.uiDisplay.factor)}px`;
    state.ghost.style.height = `${Math.max(1, rect.height / runtime.deps.uiDisplay.factor)}px`;
    runtime.deps.document.body.appendChild(state.ghost);
    updateTabDragGhost(runtime, state, state.lastX, state.lastY);
    state.button.classList.add("dragging");
    runtime.deps.document.body.classList.add("tab-drag-active");
  }
  function isMobileDockDrag(runtime) {
    return runtime.deps.document.body.classList.contains("mobile-primary-navigation");
  }
  function moveDraggedTabToPoint(runtime, state, clientX, clientY) {
    let header = isMobileDockDrag(runtime) ? state.header : getTabHeaderUnderPoint(runtime, clientX, clientY);
    header = header || state.button.parentElement;
    if (!header) return;
    if (state.button.parentElement !== header) header.appendChild(state.button);
    let siblings = Array.from(header.querySelectorAll(".tab-btn")).filter((el) => el !== state.button);
    let before = siblings.find((el) => {
      let rect = el.getBoundingClientRect();
      return clientX < rect.left + rect.width / 2;
    });
    header.insertBefore(state.button, before || header.querySelector(":scope > #btn-mobile-nav-more"));
  }
  function commitMobileDockOrder(runtime) {
    const layout = runtime.deps.tabLayoutUi.current();
    const dock = Array.from(runtime.deps.document.querySelectorAll("#tab-header-bottom > .tab-btn")).map((button) => button.id);
    dock.forEach((id) => {
      layout.tabPlacement[id] = "top";
    });
    layout.tabOrder = [...dock, ...layout.tabOrder.filter((id) => !dock.includes(id))];
  }
  function commitTabHeaderDragOrder(runtime) {
    if (isMobileDockDrag(runtime)) {
      commitMobileDockOrder(runtime);
      return;
    }
    let headers = getTabHeaders(runtime);
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.tabLayoutUi.current().tabPlacement = runtime.deps.tabLayoutUi.current().tabPlacement || {};
    headers.forEach((header) => {
      let placement = header.id === "tab-header-bottom" ? "bottom" : "top";
      Array.from(header.querySelectorAll(".tab-btn")).forEach((btn) => {
        runtime.deps.tabLayoutUi.current().tabPlacement[btn.id] = placement;
      });
    });
    runtime.deps.tabLayoutUi.current().tabOrder = getTabHeaderOrderSnapshot(runtime, headers);
  }
  function activateTabButtonFromDrag(runtime, button) {
    if (!button || !button.id || typeof runtime.deps.switchTab !== "function" || isMobileDockDrag(runtime)) return;
    if (!button.id.startsWith("btn-tab-")) return;
    (0, runtime.deps.switchTab)(button.id.replace(/^btn-/, ""));
  }
  function clearTabHeaderDragState(runtime, saveOrder) {
    let state = runtime.state.tabHeaderDragState;
    runtime.state.tabHeaderDragState = null;
    if (!state) return;
    (0, runtime.deps.clearTimeout)(state.longPressTimer);
    if (state.ghost) state.ghost.remove();
    state.button.classList.remove("dragging");
    runtime.deps.document.body.classList.remove("tab-drag-active");
    const commit = saveOrder && state.owner === runtime.deps.game;
    releaseTabDragPointer(state, commit);
    if (commit && state.dragging) {
      commitTabHeaderDragOrder(runtime);
      runtime.state.tabHeaderSuppressClickUntil = runtime.deps.Date.now() + 450;
      applyTabHeaderOrder(runtime, true);
      (0, runtime.deps.queueImportantSave)(300);
      activateTabButtonFromDrag(runtime, state.button);
    }
  }
  function releaseTabDragPointer(state, commit) {
    if (state.button.hasPointerCapture?.(state.pointerId)) state.button.releasePointerCapture(state.pointerId);
    if (commit || !state.dragging || !state.originalParent.isConnected) return;
    const next = state.originalNext?.parentElement === state.originalParent ? state.originalNext : null;
    state.originalParent.insertBefore(state.button, next);
  }
  function tabDragPressMs(runtime, button) {
    const classes = runtime.deps.document.body.classList;
    if (classes.contains("desktop-windowed-ui")) return 0;
    if (!classes.contains("mobile-primary-navigation")) return runtime.state.TAB_DRAG_LONG_PRESS_MS;
    return button.closest("#tab-header-bottom") ? runtime.state.MOBILE_DOCK_LONG_PRESS_MS : 0;
  }
  function onTabHeaderPointerDown(runtime, event) {
    if (runtime.state.tabHeaderDragState) return;
    let button = getTabButtonFromTarget(runtime, event.target);
    let pressMs = button ? tabDragPressMs(runtime, button) : 0;
    if (!pressMs || event.pointerType === "mouse" && event.button !== 0) return;
    let header = button.closest ? button.closest(".tab-header") : null;
    runtime.state.tabHeaderDragState = {
      button,
      header,
      owner: runtime.deps.game,
      originalParent: button.parentElement,
      originalNext: button.nextSibling,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startScrollLeft: header ? header.scrollLeft : 0,
      grabOffsetX: 0,
      grabOffsetY: 0,
      ghost: null,
      dragging: false,
      scrolling: false,
      longPressTimer: null
    };
    const state = runtime.state.tabHeaderDragState;
    state.longPressTimer = runtime.deps.setTimeout(() => beginTabHeaderDrag(runtime, state), pressMs);
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
  }
  function onTabHeaderPointerMove(runtime, event) {
    let state = runtime.state.tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    if (scrollTabHeaderGesture(runtime, state, event)) return;
    let dx = Math.abs(event.clientX - state.startX);
    let dy = Math.abs(event.clientY - state.startY);
    let cancelPx = state.pointerType === "touch" ? 16 : runtime.state.TAB_DRAG_CANCEL_PX;
    if (!state.dragging && dx + dy > cancelPx) {
      clearTabHeaderDragState(runtime, false);
      return;
    }
    if (!state.dragging) return;
    event.preventDefault();
    updateTabDragGhost(runtime, state, event.clientX, event.clientY);
    moveDraggedTabToPoint(runtime, state, event.clientX, event.clientY);
  }
  function scrollTabHeaderGesture(runtime, state, event) {
    if (state.scrolling) {
      if (state.header) state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
      event.preventDefault();
      return true;
    }
    if (state.dragging || state.pointerType !== "touch") return false;
    const dx = Math.abs(event.clientX - state.startX), dy = Math.abs(event.clientY - state.startY);
    if (dy > dx && dy > runtime.state.TAB_DRAG_CANCEL_PX) {
      clearTabHeaderDragState(runtime, false);
      return true;
    }
    if (!(dx > dy && dx > runtime.state.TAB_DRAG_CANCEL_PX)) return false;
    return beginTabHeaderSwipe(runtime, state, event);
  }
  function beginTabHeaderSwipe(runtime, state, event) {
    if (!state.header || state.header.scrollWidth <= state.header.clientWidth + 1) return false;
    state.scrolling = true;
    (0, runtime.deps.clearTimeout)(state.longPressTimer);
    state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
    event.preventDefault();
    return true;
  }
  function onTabHeaderPointerEnd(runtime, event) {
    let state = runtime.state.tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    if (state.scrolling) {
      if (Math.abs(state.lastX - state.startX) > 6) runtime.state.tabHeaderSuppressClickUntil = runtime.deps.Date.now() + 350;
      clearTabHeaderDragState(runtime, false);
      return;
    }
    clearTabHeaderDragState(runtime, true);
  }
  function onTabHeaderClickCapture(runtime, event) {
    if (runtime.deps.Date.now() <= runtime.state.tabHeaderSuppressClickUntil && getTabButtonFromTarget(runtime, event.target)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    returnToBattleFromOpenTab(runtime, event);
  }
  function returnToBattleFromOpenTab(runtime, event) {
    const button = event.target.closest && event.target.closest("#tab-header-bottom > .tab-btn.active");
    if (!button || button.id === "btn-tab-battle" || !runtime.deps.document.body.classList.contains("mobile-primary-navigation")) return;
    event.preventDefault();
    event.stopPropagation();
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function installTabHeaderDragReorder(runtime) {
    if (runtime.state.tabHeaderDragBound) return;
    runtime.state.tabHeaderDragBound = true;
    listenView(runtime, runtime.deps.document, "pointerdown", runtime.handlers.onTabHeaderPointerDown, true);
    listenView(runtime, runtime.deps.document, "pointermove", runtime.handlers.onTabHeaderPointerMove, { capture: true, passive: false });
    listenView(runtime, runtime.deps.document, "pointerup", runtime.handlers.onTabHeaderPointerEnd, true);
    listenView(runtime, runtime.deps.document, "pointercancel", () => clearTabHeaderDragState(runtime, false), true);
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onTabHeaderClickCapture, true);
  }
  function applyTabHeaderOrder(runtime, shouldRenderSettings) {
    const focused = runtime.deps.document.activeElement;
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.tabLayoutUi.current().tabPlacement = runtime.deps.tabLayoutUi.current().tabPlacement || {};
    let headers = Array.from(runtime.deps.document.querySelectorAll(".tab-header"));
    let topHeader = headers.find((header) => header.id !== "tab-header-bottom");
    let bottomHeader = runtime.deps.document.getElementById("tab-header-bottom");
    if (runtime.deps.document.body.classList.contains("desktop-windowed-ui")) {
      teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
      if (typeof runtime.deps.syncDesktopRailGroups === "function") (0, runtime.deps.syncDesktopRailGroups)();
      refreshOrderSettings(runtime, shouldRenderSettings);
      return;
    }
    if (!topHeader) return;
    let mobilePrimary = isMobilePrimaryNavigationEnabled(runtime);
    if (!mobilePrimary) teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
    else ensureMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
    installTabHeaderDragReorder(runtime);
    placeTabHeaderButtons(runtime, headers, topHeader, bottomHeader, mobilePrimary);
    syncBottomHeader(runtime, bottomHeader);
    if (mobilePrimary) renderMobileMenuGroups(runtime, topHeader);
    syncMobilePrimaryNavigationState(runtime);
    restoreMobileMenuFocus(runtime, focused);
    refreshOrderSettings(runtime, shouldRenderSettings);
  }
  function syncBottomHeader(runtime, bottomHeader) {
    if (!bottomHeader) return;
    let more = runtime.deps.document.getElementById("btn-mobile-nav-more");
    if (more) bottomHeader.appendChild(more);
    let hasBottomTabs = bottomHeader.children.length > 0;
    bottomHeader.style.display = hasBottomTabs ? "flex" : "none";
    runtime.deps.document.body.classList.toggle("has-bottom-tabs", hasBottomTabs);
    updateBottomTabSpacing(runtime);
  }
  function refreshOrderSettings(runtime, force) {
    const settings = runtime.deps.document.getElementById("tab-settings");
    if (force || settings?.classList.contains("active")) renderTabOrderSettings(runtime);
  }
  function placeTabHeaderButtons(runtime, headers, topHeader, bottomHeader, mobilePrimary) {
    const primaryIds = new Set(runtime.deps.tabLayoutUi.mobilePrimaryIds());
    let allTabButtons = headers.flatMap((header) => Array.from(header.querySelectorAll(".tab-btn")));
    let ids = allTabButtons.map((el) => el.id);
    let order = Array.from(/* @__PURE__ */ new Set(["btn-tab-battle", ...runtime.deps.tabLayoutUi.current().tabOrder, ...runtime.deps.tabLayoutUi.defaultOrder]));
    let map = {};
    allTabButtons.forEach((el) => map[el.id] = el);
    order.forEach((id) => {
      if (!map[id]) return;
      let target = mobilePrimary ? primaryIds.has(id) ? bottomHeader : topHeader : runtime.deps.game.settings.twoRowTabs && runtime.deps.tabLayoutUi.current().tabPlacement[id] === "bottom" && bottomHeader ? bottomHeader : topHeader;
      target.appendChild(map[id]);
    });
    ids.forEach((id) => {
      if (order.includes(id) || !map[id]) return;
      let target = mobilePrimary && primaryIds.has(id) ? bottomHeader : topHeader;
      target.appendChild(map[id]);
    });
    if (mobilePrimary) primaryIds.forEach((id) => {
      if (map[id]) bottomHeader.appendChild(map[id]);
    });
  }
  function updateBottomTabSpacing(runtime) {
    let bottomHeader = runtime.deps.document.getElementById("tab-header-bottom");
    let visible = bottomHeader && runtime.deps.document.body.classList.contains("has-bottom-tabs") && runtime.deps.window.getComputedStyle(bottomHeader).display !== "none";
    let height = visible ? Math.ceil(bottomHeader.getBoundingClientRect().height) : 0;
    if (runtime.deps.document.body.style.getPropertyValue("--bottom-tab-height") !== height + "px") runtime.deps.document.body.style.setProperty("--bottom-tab-height", height + "px");
  }

  // modules/ui/tab-header-status.mjs
  function moveTabGroupBefore(runtime, sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    let groups = getOrderedTabGroups(runtime);
    let sourceIdx = groups.findIndex((group) => group.key === sourceKey);
    let targetIdx = groups.findIndex((group) => group.key === targetKey);
    if (sourceIdx < 0 || targetIdx < 0) return;
    let moved = groups.slice();
    let source = moved.splice(sourceIdx, 1)[0];
    let insertIdx = moved.findIndex((group) => group.key === targetKey);
    moved.splice(Math.max(0, insertIdx), 0, source);
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.tabLayoutUi.current().tabGroupOrder = moved.map((group) => group.key);
    runtime.state.lastTabHeaderUiSignature = null;
    renderTabCategoryBar(runtime);
    if (typeof runtime.deps.syncDesktopRailGroups === "function" && runtime.deps.document.body.classList.contains("desktop-windowed-ui")) (0, runtime.deps.syncDesktopRailGroups)();
    renderTabOrderSettings(runtime);
    (0, runtime.deps.queueImportantSave)(300);
  }
  function onTabGroupDragStart(runtime, event, groupKey) {
    if (!event || !event.dataTransfer) return;
    runtime.state.draggedGroup = { key: groupKey, owner: runtime.deps.game };
    event.dataTransfer.setData("text/plain", groupKey);
    event.dataTransfer.effectAllowed = "move";
  }
  function onTabGroupDrop(runtime, event, targetKey) {
    if (!event || !event.dataTransfer) return;
    event.preventDefault();
    const source = runtime.state.draggedGroup;
    runtime.state.draggedGroup = null;
    if (!source || source.owner !== runtime.deps.game || source.key !== event.dataTransfer.getData("text/plain")) return;
    moveTabGroupBefore(runtime, source.key, targetKey);
  }
  function selectTabGroup(runtime, groupKey) {
    if (!runtime.state.TAB_GROUPS.some((g) => g.key === groupKey)) return;
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.activeTabGroup = groupKey;
    let activeInGroup = runtime.state.lastActiveTabId && getTabGroupForId(runtime, runtime.state.lastActiveTabId) === groupKey;
    applyTabGroupFilter(runtime);
    if (!activeInGroup) {
      let group = getOrderedTabGroups(runtime).find((g) => g.key === groupKey);
      let firstVisible = group.tabs.find((id) => {
        let btn = runtime.deps.document.getElementById("btn-" + id);
        return btn && btn.style.display !== "none" && !btn.dataset.groupHidden;
      });
      if (firstVisible) (0, runtime.deps.switchTab)(firstVisible);
    }
    renderTabCategoryBar(runtime);
  }
  function applyTabGroupFilter(runtime) {
    updateTabUnlockButtons(runtime);
  }
  function ensureTabCategoryBarPlacement(runtime, bar) {
    let header = runtime.deps.document.querySelector(".tab-header");
    if (bar && header && header.parentElement && bar.nextElementSibling !== header) {
      header.parentElement.insertBefore(bar, header);
    }
  }
  function renderTabCategoryBar(runtime) {
    let bar = runtime.deps.document.getElementById("tab-category-bar");
    if (!bar) return;
    ensureTabCategoryBarPlacement(runtime, bar);
    if (!isTabGroupingActive(runtime)) {
      bar.style.display = "none";
      (0, runtime.deps.syncMapCompleteActionQuickControl)();
      return;
    }
    bar.style.display = "inline-flex";
    let active = getActiveTabGroup(runtime);
    bar.innerHTML = getOrderedTabGroups(runtime).map((group) => {
      let hasNoti = group.key !== active && group.tabs.some((id) => {
        let key = id.replace("tab-", "");
        let gate = typeof runtime.deps.TAB_UNLOCK_GATES !== "undefined" ? runtime.deps.TAB_UNLOCK_GATES[id] : null;
        if (gate && !(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gate])) return false;
        return runtime.deps.game.noti && runtime.deps.game.noti[key] && isNotiEnabled(runtime, key);
      });
      return `<button class="tab-category-btn${group.key === active ? " active" : ""}" draggable="true" ondragstart="onTabGroupDragStart(event,'${group.key}')" ondragover="event.preventDefault()" ondrop="onTabGroupDrop(event,'${group.key}')" onclick="selectTabGroup('${group.key}')">${(0, runtime.deps._t)(group.label)}${hasNoti ? ' <span class="noti-dot" style="display:inline-block; position:static; margin-left:2px;"></span>' : ""}</button>`;
    }).join("");
    (0, runtime.deps.syncMapCompleteActionQuickControl)();
  }
  function scheduleTabHeaderViewportSync(runtime) {
    clearTabHeaderDragState(runtime, false);
    if (runtime.state.viewportPending) return;
    runtime.state.viewportPending = true;
    scheduleViewFrame(runtime, () => {
      runtime.state.viewportPending = false;
      updateBottomTabSpacing(runtime);
      runtime.state.lastTabHeaderUiSignature = null;
      refreshTabHeaderUiIfNeeded(runtime);
    });
  }
  function updateTabNotificationDots(runtime) {
    if (typeof runtime.deps.isSocialTabActive === "function" && (0, runtime.deps.isSocialTabActive)()) runtime.deps.game.noti.social = false;
    TAB_HEADER_NOTI_KEYS.forEach((key) => {
      if (runtime.state.lastActiveTabId === "tab-" + key) runtime.deps.game.noti[key] = false;
      let el = runtime.deps.document.getElementById("noti-" + key);
      if (el) el.style.display = runtime.deps.game.noti[key] && isNotiEnabled(runtime, key) ? "block" : "none";
    });
    let dockDot = runtime.deps.document.getElementById("noti-social-dock");
    if (dockDot) dockDot.style.display = runtime.deps.game.noti.social && isNotiEnabled(runtime, "social") ? "block" : "none";
    syncMergedTabLauncherState(runtime);
    let itemsTabButton = runtime.deps.document.getElementById("btn-tab-items");
    if (itemsTabButton) itemsTabButton.classList.toggle("starter-equip-tutorial-pending", !!(0, runtime.deps.getStarterWeaponTutorialTarget)());
  }
  function syncTabUnlockButton(runtime, key) {
    let button = runtime.deps.document.getElementById("btn-tab-" + key);
    let reserved = key === "map" && !runtime.deps.game.unlocks.map && isMobilePrimaryNavigationEnabled(runtime) && !runtime.deps.contentProgression.opening.applies(runtime.deps.game) && runtime.deps.game.settings.tabLayouts.mobile.tabPlacement["btn-tab-map"] !== "bottom";
    button.classList.toggle("nav-locked", reserved);
    if (reserved) button.setAttribute("aria-disabled", "true");
    else button.removeAttribute("aria-disabled");
    button.style.display = runtime.deps.game.unlocks[key] || reserved ? "flex" : "none";
  }
  function updateTabUnlockButtons(runtime) {
    TAB_UNLOCK_BUTTON_KEYS.forEach(runtime.handlers.syncTabUnlockButton);
    let battleBtn = runtime.deps.document.getElementById("btn-tab-battle");
    if (battleBtn) battleBtn.style.display = isMobilePrimaryNavigationEnabled(runtime) ? "flex" : "none";
    syncMergedTabLauncherVisibility(runtime);
    Object.entries(MERGED_TAB_GROUPS).forEach(([groupKey, group]) => {
      let root = runtime.deps.document.getElementById(group.launcher);
      if (root && root.classList.contains("active")) renderMergedTabPanels(runtime, groupKey);
    });
    closeRelockedTabSurfaces(runtime);
    hideOutOfGroupTabButtons(runtime);
    if (typeof runtime.deps.syncDesktopRailGroups === "function" && runtime.deps.document.body.classList.contains("desktop-windowed-ui")) (0, runtime.deps.syncDesktopRailGroups)();
  }
  function isUngatedPersistentTabButton(runtime, btn) {
    return btn && (btn.id === "btn-tab-settings" || btn.id === "btn-tab-character");
  }
  function hideOutOfGroupTabButtons(runtime) {
    let grouping = isTabGroupingActive(runtime);
    let active = getActiveTabGroup(runtime);
    Array.from(runtime.deps.document.querySelectorAll(".tab-header .tab-btn")).forEach((btn) => {
      if (!grouping) {
        delete btn.dataset.groupHidden;
        if (isUngatedPersistentTabButton(runtime, btn)) btn.style.display = "flex";
        return;
      }
      if (getTabGroupForId(runtime, btn.id) !== active) {
        btn.dataset.groupHidden = "1";
        btn.style.display = "none";
        return;
      }
      delete btn.dataset.groupHidden;
      if (isUngatedPersistentTabButton(runtime, btn)) btn.style.display = "flex";
    });
  }
  function applyStandingTabNotices(runtime) {
    const standing = { char: runtime.deps.game.passivePoints > 0, traits: !!runtime.deps.game.unlocks.traits && (runtime.deps.game.ascendPoints > 0 || runtime.deps.game.ascendKeystonePoints > 0), season: runtime.deps.worldTreeBark.barkHasFreePoints(runtime.deps.game) };
    Object.entries(standing).forEach(([key, on]) => {
      if (on && runtime.state.lastActiveTabId !== "tab-" + key) runtime.deps.game.noti[key] = true;
    });
  }
  function refreshTabHeaderUiIfNeeded(runtime) {
    applyStandingTabNotices(runtime);
    let signature = getTabHeaderUiSignature(runtime);
    if (signature === runtime.state.lastTabHeaderUiSignature) {
      if (getTabNotiSignature(runtime) === runtime.state.lastTabNotiSignature) return false;
      updateTabNotificationDots(runtime);
      if (isTabGroupingActive(runtime)) renderTabCategoryBar(runtime);
      runtime.state.lastTabNotiSignature = getTabNotiSignature(runtime);
      return false;
    }
    runtime.state.lastTabHeaderUiSignature = signature;
    updateTabUnlockButtons(runtime);
    applyTabHeaderOrder(runtime);
    updateTabNotificationDots(runtime);
    applyTabGroupFilter(runtime);
    renderTabCategoryBar(runtime);
    runtime.state.lastTabNotiSignature = getTabNotiSignature(runtime);
    return true;
  }

  // modules/ui/tab-activation.mjs
  function switchTab2(runtime, tabId) {
    const target = prepareTabDestination(runtime, tabId);
    if (!target) return;
    const { deps } = runtime, { mergedEntry, shown } = target;
    setMobileTabDrawerOpen(runtime, false);
    if (shown.id === "tab-items" && deps.game.noti) deps.game.noti.items = false;
    const tab = deps.document.getElementById(tabId);
    if (runtime.state.lastActiveTabId === tabId && tab && tab.classList.contains("active")) {
      refreshShownMergedTab(runtime, mergedEntry, shown);
      updateTabNotificationDots(runtime);
      return;
    }
    activateTabSurface(runtime, tabId, shown.id, mergedEntry);
    selectActivatedTabGroup(runtime, tabId);
    acknowledgeActivatedTab(runtime, tabId, shown.id);
    renderActivatedTab(runtime, tabId, shown.id);
  }
  function prepareTabDestination(runtime, tabId) {
    const { deps } = runtime;
    if (deps.playerGuideUi?.allowsTab(tabId, true) === false) return;
    (0, deps.hideInfoTooltip)();
    (0, deps.hideItemTooltip)();
    if (typeof deps.hidePassiveNodeTooltip === "function") (0, deps.hidePassiveNodeTooltip)();
    const mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry && mergedEntry[1].launcher !== tabId) {
      switchMergedTabSubtab(runtime, mergedEntry[0], tabId);
      return;
    }
    if (mergedEntry && !getSelectedMergedTabId(runtime, mergedEntry[0])) return;
    if (!isTabSurfaceAvailable(runtime, tabId)) {
      runtime.handlers.notifyLockedTab(tabId);
      return;
    }
    return { mergedEntry, shown: resolveShownTab(runtime, tabId, mergedEntry) };
  }
  function activateTabSurface(runtime, tabId, shownId, mergedEntry) {
    const { deps } = runtime;
    deps.document.querySelectorAll(".tab-content:not(.merged-subtab-pane), .tab-btn").forEach((el) => el.classList.remove("active"));
    deps.document.getElementById(tabId).classList.add("active");
    runtime.handlers.runWindowOpenHooks(tabId, shownId);
    runtime.state.pendingRelockedTabFallback = false;
    const button = deps.document.getElementById("btn-" + tabId);
    button.classList.add("active");
    if (mergedEntry) renderMergedTabSubtabs(runtime, mergedEntry[0]);
    syncMergedTabLauncherState(runtime);
    if (button && button.scrollIntoView && deps.uiDisplay.matches("(max-width: 1080px)")) revealActiveTabButton(runtime, button);
  }
  function selectActivatedTabGroup(runtime, tabId) {
    if (!isTabGroupingActive(runtime)) return;
    const { game } = runtime.deps;
    game.settings = game.settings || {};
    const group = getTabGroupForId(runtime, tabId);
    if (game.settings.activeTabGroup !== group) {
      game.settings.activeTabGroup = group;
      applyTabGroupFilter(runtime);
    }
    renderTabCategoryBar(runtime);
  }
  function acknowledgeActivatedTab(runtime, tabId, shownId) {
    const { deps } = runtime, game = deps.game;
    if (tabId === "tab-codex" && game.noti && game.noti.codex) game.codexFocusNewOnOpen = true;
    if (tabId === "tab-map") (0, deps.focusMapAlarmSourceSubtab)();
    TAB_HEADER_NOTI_KEYS.forEach((key) => {
      if (shownId === "tab-" + key) game.noti[key] = false;
    });
    if (tabId === "tab-map") (0, deps.acknowledgeMapMainAlarm)();
    if (runtime.state.lastActiveTabId === "tab-codex" && tabId !== "tab-codex") game.codexNewlyRegistered = {};
    runtime.state.lastActiveTabId = tabId;
  }
  function renderActivatedTab(runtime, tabId, shownId) {
    const { deps } = runtime;
    if (typeof deps.syncSocialChatPolling === "function") (0, deps.syncSocialChatPolling)();
    if (tabId === "tab-talent") deps.talentUi.render();
    if (shownId === "tab-items") runtime.handlers.switchItemSubtab("item-tab-equip");
    (0, deps.updateMobileBattlePipVisibility)();
    if ((0, deps.isMobileBattlePipVisible)()) scheduleViewFrame(runtime, () => (0, deps.refreshMobileBattlePip)());
    (0, deps.updateStaticUI)();
    if (tabId === "tab-char") scheduleTabLayout(runtime, () => {
      (0, deps.fitPassiveCameraToBounds)(false);
      (0, deps.resizePassiveTreeCanvas)(true);
      (0, deps.drawPassiveTree)();
      (0, deps.resizeCanvas)();
    });
    else if (tabId === "tab-battle") {
      (0, deps.startBattleAssetLoadNow)();
      scheduleTabLayout(runtime, () => {
        (0, deps.syncBattleTabLayout)(false);
        (0, deps.scheduleStableResize)();
      });
    } else if (tabId === "tab-settings") deps.settingsUi.sync();
  }
  function scheduleTabLayout(runtime, callback) {
    const owner = runtime.deps.game;
    const handle = runtime.deps.setTimeout(() => {
      runtime.state.activationTimers.delete(handle);
      if (runtime.active && runtime.deps.game === owner) callback();
    }, 40);
    runtime.state.activationTimers.add(handle);
  }

  // modules/ui/tab-subpanels.mjs
  var tab_subpanels_exports = {};
  __export(tab_subpanels_exports, {
    craftSelectInventoryItemById: () => craftSelectInventoryItemById,
    isSelectedSubtab: () => isSelectedSubtab,
    notifyLockedTab: () => notifyLockedTab,
    runWindowOpenHooks: () => runWindowOpenHooks,
    switchItemSubtab: () => switchItemSubtab,
    switchMapSubtab: () => switchMapSubtab,
    switchSkillSubtab: () => switchSkillSubtab,
    syncSingleSubtabRows: () => syncSingleSubtabRows
  });

  // modules/state/navigation-selection.mjs
  function selectSubtab(owner, field, subtabId) {
    owner[field] = subtabId;
  }
  function acknowledgeEquipmentTab(owner, subtabId) {
    if (subtabId === "item-tab-equip" && owner.noti) owner.noti.items = false;
  }

  // modules/ui/tab-subpanels.mjs
  function runWindowOpenHooks(runtime, tabId, shownId) {
    const { deps } = runtime;
    if (shownId === "tab-items" && deps.equipmentTriage) deps.equipmentTriage.onOpen();
    if (tabId === "tab-trade" && deps.marketUi.section === "hall") deps.loadPlayerExchange();
    deps.tutorialActionUi.followOpeningTab(shownId);
  }
  function craftSelectInventoryItemById(runtime, itemId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen("item-tab-craft")) return;
    const id = Number(itemId);
    if (!Number.isFinite(id) || !(owner.inventory || []).some((item) => item && item.id === id)) return;
    openCraftingTab(runtime);
    deps.selectForCrafting(id, false);
    scheduleCraftingScroll(runtime, owner);
  }
  function openCraftingTab(runtime) {
    const { deps } = runtime;
    if (typeof deps.hideItemTooltip === "function") deps.hideItemTooltip();
    if (typeof deps.hideInfoTooltip === "function") deps.hideInfoTooltip();
    if (typeof deps.switchTab === "function") deps.switchTab("tab-items");
    if (deps.document.body.classList.contains("desktop-windowed-ui") && typeof deps.openWindow === "function") deps.openWindow("tab-items");
    runtime.handlers.switchItemSubtab("item-tab-craft");
  }
  function scheduleCraftingScroll(runtime, owner) {
    const loop = owner.loopCount, season = owner.season;
    const timer = runtime.deps.setTimeout(() => {
      runtime.state.activationTimers.delete(timer);
      if (!runtime.active || runtime.deps.game !== owner || owner.loopCount !== loop || owner.season !== season) return;
      const el = runtime.deps.document.getElementById("forge-item-display");
      if (el && el.scrollIntoView) {
        try {
          el.scrollIntoView({ block: "start", behavior: "smooth" });
        } catch (error) {
          runtime.deps.console.warn("crafting scroll fallback:", error);
          el.scrollIntoView();
        }
      }
    }, 60);
    runtime.state.activationTimers.add(timer);
  }
  function isSelectedSubtab(runtime, subtabId) {
    const panel = runtime.deps.document.getElementById(subtabId);
    const button = runtime.deps.document.getElementById("btn-" + subtabId);
    return !!(panel && button && panel.classList.contains("active") && button.classList.contains("active"));
  }
  function switchItemSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (subtabId === "item-tab-fossil") subtabId = "item-tab-craft";
    if (redirectTradeTab(runtime, subtabId)) return;
    if (subtabId !== owner.itemSubtab) deps.craftingWorkspaceUi.stopAuto("");
    if (!deps.contentProgression.canOpen(subtabId)) return;
    acknowledgeEquipmentTab(owner, subtabId);
    if (subtabId === owner.itemSubtab && isSelectedSubtab(runtime, subtabId)) return;
    selectSubtab(owner, "itemSubtab", subtabId);
    if (subtabId === "item-tab-equip" && deps.equipmentTriage) deps.equipmentTriage.onOpen();
    showItemSubtabPanel(runtime, subtabId);
    deps.systemTutorialUi.visit(subtabId);
    deps.updateStaticUI();
  }
  function redirectTradeTab(runtime, subtabId) {
    if (!["item-tab-market", "item-tab-hall"].includes(subtabId)) return false;
    const market = runtime.deps.marketUi;
    market.open(subtabId === "item-tab-hall" ? "hall" : market.section);
    return true;
  }
  function showItemSubtabPanel(runtime, subtabId) {
    const { deps } = runtime;
    clearSubtabPanels(runtime, "#tab-items .subtab-content", "#tab-items .subtab-btn");
    deps.document.getElementById(subtabId).classList.add("active");
    deps.document.getElementById("btn-" + subtabId).classList.add("active");
    if (typeof deps.refitDockedWindows === "function") deps.refitDockedWindows();
  }
  function clearSubtabPanels(runtime, panels, buttons) {
    runtime.deps.document.querySelectorAll(panels).forEach((el) => el.classList.remove("active"));
    runtime.deps.document.querySelectorAll(buttons).forEach((el) => el.classList.remove("active"));
  }
  function activateSubtab(runtime, subtabId) {
    const panel = runtime.deps.document.getElementById(subtabId);
    const button = runtime.deps.document.getElementById("btn-" + subtabId);
    if (panel) panel.classList.add("active");
    if (button) button.classList.add("active");
  }
  function switchSkillSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen(subtabId)) return;
    if (subtabId === owner.skillSubtab && isSelectedSubtab(runtime, subtabId)) return;
    selectSubtab(owner, "skillSubtab", subtabId);
    clearSubtabPanels(runtime, "#tab-skills .subtab-content", "#tab-skills .subtab-btn");
    activateSubtab(runtime, subtabId);
    deps.systemTutorialUi.visit(subtabId);
  }
  function switchMapSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen(subtabId)) return;
    if (!deps.isMapPrimaryContentUnlocked(owner, subtabId)) subtabId = "map-tab-zones";
    if (subtabId === owner.mapSubtab && isSelectedSubtab(runtime, subtabId)) {
      reopenMapExplore(runtime, subtabId);
      if (subtabId === "map-tab-cosmos") deps.cosmosAtlasView?.renderCosmosAtlas();
      return;
    }
    selectSubtab(owner, "mapSubtab", subtabId);
    clearSubtabPanels(runtime, "#tab-map .subtab-content", "#tab-map .map-primary-tabs .subtab-btn");
    activateSubtab(runtime, subtabId);
    reopenMapExplore(runtime, subtabId);
    renderMapRegion(runtime, subtabId);
    deps.renderMobileMapNavigation();
    deps.explorationAtlasUi.syncLocation();
  }
  function reopenMapExplore(runtime, subtabId) {
    if (subtabId === "map-tab-zones") runtime.deps.switchMapExploreSubtab(runtime.deps.game.mapExploreSubtab || "map-explore-atlas");
  }
  function renderMapRegion(runtime, subtabId) {
    const { deps } = runtime;
    if (subtabId === "map-tab-pvp" && typeof deps.renderGhostArena === "function") deps.renderGhostArena();
    const render = {
      "map-tab-underworld": () => deps.renderUnderworldMapPanel(),
      "map-tab-ocean": () => deps.oceanDiveUi.render(),
      "map-tab-fishing": () => deps.fishingUi.render(),
      "map-tab-cosmos": () => deps.cosmosAtlasView?.renderCosmosAtlas()
    };
    render[subtabId]?.();
  }
  function syncSingleSubtabRows(runtime) {
    runtime.deps.document.querySelectorAll(".tab-content .subtab-row:not(.merged-tab-subtabs)").forEach((row) => {
      const open = [...row.children].filter((button) => !button.hasAttribute("data-content-locked") && !button.hidden && button.style.display !== "none");
      row.hidden = open.length < 2;
      const count = String(open.length);
      if (row.style.getPropertyValue("--subtab-count") !== count) row.style.setProperty("--subtab-count", count);
    });
  }
  function notifyLockedTab(runtime, tabId) {
    const reserved = !!runtime.deps.document.getElementById("btn-" + tabId)?.classList.contains("nav-locked");
    runtime.deps.addLog(getLockedTabMessage(runtime, tabId), "attack-monster", { toast: reserved });
  }
  function getLockedTabMessage(runtime, tabId) {
    if (tabId === "tab-char") return runtime.deps._t("루프 2부터 해금 탭에서 스킬트리를 열 수 있습니다.");
    const messages = {
      "tab-season": "루프 1을 클리어하면 루프 탭이 열립니다.",
      "tab-items": "장비나 제작 재화를 얻으면 장비 탭이 열립니다.",
      "tab-skills": "새 스킬룬이나 보조스킬룬을 획득하면 스킬룬 탭이 열립니다.",
      "tab-codex": "첫 고유 아이템을 획득하면 도감 탭이 열립니다.",
      "tab-map": "액트 1을 마치면 지도가 열립니다.",
      "tab-traits": "전직 시련을 통과하면 전직 탭이 열립니다.",
      "tab-talent": "재능 개화 시련을 클리어하면 재능 탭이 열립니다."
    };
    return messages[tabId] || "아직 해금되지 않은 탭입니다.";
  }

  // modules/ui/tab-navigation-view.mjs
  function createTabNavigationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    initialize(runtime);
    runtime.state.owner = deps.game;
    runtime.state.titleHosts = /* @__PURE__ */ new Set();
    for (const [name, handler] of Object.entries({ ...navigationHandlers(), ...tab_subpanels_exports })) {
      runtime.handlers[name] = (...args) => {
        if (!runtime.active) return;
        syncNavigationOwner(runtime);
        return handler(runtime, ...args);
      };
    }
    runtime.api = navigationApi(runtime);
    installNavigationEvents(runtime);
    return runtime.api;
  }
  function navigationHandlers() {
    return { switchTab: switchTab2, toggleMobileTabDrawer, handleMobileMenuKey, handleMobileTabActivation, onTabHeaderPointerDown, onTabHeaderPointerMove, onTabHeaderPointerEnd, onTabHeaderClickCapture, syncTabUnlockButton, isMergedTabAvailable, isMobilePrimaryNavigationEnabled, setMobileTabDrawerOpen, renderTabOrderSettings, onTabGroupDragStart, onTabGroupDrop, getTabGroupForId, isTabGroupingActive, getActiveTabGroup, selectTabGroup, applyTabGroupFilter, renderTabCategoryBar, commitMobileDockOrder, applyTabHeaderOrder, scheduleTabHeaderViewportSync, updateTabNotificationDots, updateTabUnlockButtons, hideOutOfGroupTabButtons, refreshTabHeaderUiIfNeeded, isNotiEnabled, getMergedTabGroup, getSelectedMergedTabId, getActiveTopLevelTabElement, getActiveUiTabId, getRenderingUiTabIds, renderVisibleManagementPanels, isTabSurfaceAvailable, closeRelockedTabSurfaces, resolveShownTab, refreshShownMergedTab, switchMergedTabSubtab, syncMergedTabLauncherVisibility, syncMergedTabLauncherState, openMergedTabPicker, openTabPane, renderMergedTabSubtabs, revealActiveTabButton };
  }
  function navigationApi(runtime) {
    const names = ["switchTab", "isMobilePrimaryNavigationEnabled", "setMobileTabDrawerOpen", "renderTabOrderSettings", "onTabGroupDragStart", "onTabGroupDrop", "getTabGroupForId", "isTabGroupingActive", "getActiveTabGroup", "selectTabGroup", "applyTabGroupFilter", "renderTabCategoryBar", "commitMobileDockOrder", "applyTabHeaderOrder", "scheduleTabHeaderViewportSync", "updateTabNotificationDots", "syncTabUnlockButton", "updateTabUnlockButtons", "hideOutOfGroupTabButtons", "refreshTabHeaderUiIfNeeded", "isNotiEnabled", "getMergedTabGroup", "getSelectedMergedTabId", "getActiveTopLevelTabElement", "getActiveUiTabId", "getRenderingUiTabIds", "renderVisibleManagementPanels", "isTabSurfaceAvailable", "closeRelockedTabSurfaces", "resolveShownTab", "refreshShownMergedTab", "switchMergedTabSubtab", "syncMergedTabLauncherVisibility", "syncMergedTabLauncherState", "openMergedTabPicker", "openTabPane", "renderMergedTabSubtabs", "revealActiveTabButton"];
    const api = Object.fromEntries([...names, ...Object.keys(tab_subpanels_exports)].map((name) => [name, runtime.handlers[name]]));
    api.lastActiveTab = () => {
      syncNavigationOwner(runtime);
      return runtime.state.lastActiveTabId;
    };
    api.needsFallback = () => {
      syncNavigationOwner(runtime);
      return runtime.state.pendingRelockedTabFallback;
    };
    api.clearFallback = () => {
      syncNavigationOwner(runtime);
      runtime.state.pendingRelockedTabFallback = false;
    };
    api.dispose = () => disposeNavigation(runtime);
    return Object.freeze(api);
  }
  function syncNavigationOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    runtime.state.lastActiveTabId = null;
    runtime.state.pendingRelockedTabFallback = false;
    clearNavigationWork(runtime);
    runtime.state.tabHeaderSuppressClickUntil = 0;
    runtime.state.lastTabHeaderUiSignature = "";
    runtime.state.lastTabNotiSignature = "";
    runtime.state.mergedPaneShown.clear();
    runtime.state.mergedTabSwitching = false;
    setMobileTabDrawerOpen(runtime, false);
  }
  function clearNavigationWork(runtime) {
    cancelViewFrames(runtime);
    for (const handle of runtime.state.activationTimers) runtime.deps.clearTimeout(handle);
    runtime.state.activationTimers.clear();
    clearTabHeaderDragState(runtime, false);
    if (runtime.state.revealTimer != null) runtime.deps.clearTimeout(runtime.state.revealTimer);
    runtime.state.revealTimer = null;
    runtime.state.revealButton = null;
    runtime.state.revealPending = false;
    runtime.state.viewportPending = false;
    runtime.state.draggedGroup = null;
  }
  function installNavigationEvents(runtime) {
    if (!runtime.deps.window) return;
    listenView(runtime, runtime.deps.window, "resize", runtime.handlers.scheduleTabHeaderViewportSync);
    listenView(runtime, runtime.deps.window, "orientationchange", runtime.handlers.scheduleTabHeaderViewportSync);
    listenView(runtime, runtime.deps.window, "game:languagechange", () => {
      syncNavigationOwner(runtime);
      runtime.deps.playerStatCache.invalidate();
      runtime.deps.cachedTooltipStats = null;
      runtime.deps.clearGemTooltipCache();
      if (runtime.deps.document.getElementById("info-tooltip")) runtime.deps.hideInfoTooltip();
      const pip = runtime.deps.document.getElementById("mobile-battle-pip");
      if (pip) runtime.deps.setMobileBattlePipCollapsed(pip, pip.classList.contains("is-collapsed"));
      scheduleTabHeaderViewportSync(runtime);
    });
  }
  function disposeNavigation(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    clearNavigationWork(runtime);
    const document2 = runtime.deps.document;
    if (document2?.body) teardownMobilePrimaryNavigation(
      runtime,
      document2.getElementById("tab-header-main"),
      document2.getElementById("tab-header-bottom")
    );
    runtime.state.titleHosts.clear();
    runtime.state.mergedPaneShown.clear();
  }
  function initialize(runtime) {
    runtime.state.lastActiveTabId = null;
    runtime.state.activationTimers = /* @__PURE__ */ new Set();
    runtime.state.pendingRelockedTabFallback = false;
    runtime.state.mobileNavigationKeyBound = false;
    runtime.state.TAB_DRAG_LONG_PRESS_MS = 180;
    runtime.state.MOBILE_DOCK_LONG_PRESS_MS = 450;
    runtime.state.TAB_DRAG_CANCEL_PX = 8;
    runtime.state.tabHeaderDragState = null;
    runtime.state.tabHeaderSuppressClickUntil = 0;
    runtime.state.lastTabHeaderUiSignature = "";
    runtime.state.TAB_GROUPS = [
      { key: "character", label: "캐릭터", icon: "👤", tabs: ["tab-character"] },
      { key: "growth", label: "성장", icon: "📈", tabs: ["tab-char", "tab-traits", "tab-talent", "tab-unlocks", "tab-season", "tab-stump", "tab-skills"] },
      { key: "content", label: "콘텐츠", icon: "🗺️", tabs: ["tab-map", "tab-codex", "tab-journal", "tab-guide", "tab-records"] },
      { key: "gear", label: "장비", icon: "⚔️", tabs: ["tab-items", "tab-trade"] },
      { key: "etc", label: "기타", icon: "⚙️", tabs: ["tab-settings", "tab-battle"] }
    ];
    runtime.state.lastTabNotiSignature = "";
    runtime.state.mergedPaneShown = /* @__PURE__ */ new Map();
    runtime.state.mergedTabSwitching = false;
    runtime.state.tabHeaderDragBound = false;
  }

  // modules/tab-navigation-ui-classic.mjs
  var tabNavigationView = createTabNavigationView({
    get cosmosAtlasView() {
      return window.GameModules.cosmosAtlas?.view;
    },
    get hideItemTooltip() {
      return hideItemTooltip;
    },
    get equipmentTriage() {
      return window.equipmentTriage;
    },
    get marketUi() {
      return marketUi;
    },
    get loadPlayerExchange() {
      return loadPlayerExchange;
    },
    get craftingWorkspaceUi() {
      return craftingWorkspaceUi;
    },
    get systemTutorialUi() {
      return systemTutorialUi;
    },
    get openWindow() {
      return typeof openWindow === "undefined" ? void 0 : openWindow;
    },
    get refitDockedWindows() {
      return typeof refitDockedWindows === "undefined" ? void 0 : refitDockedWindows;
    },
    get selectForCrafting() {
      return selectForCrafting;
    },
    get console() {
      return console;
    },
    get isMapPrimaryContentUnlocked() {
      return isMapPrimaryContentUnlocked;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get renderGhostArena() {
      return typeof renderGhostArena === "undefined" ? void 0 : renderGhostArena;
    },
    get renderUnderworldMapPanel() {
      return renderUnderworldMapPanel;
    },
    get oceanDiveUi() {
      return oceanDiveUi;
    },
    get fishingUi() {
      return fishingUi;
    },
    get renderMobileMapNavigation() {
      return renderMobileMapNavigation;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get addLog() {
      return addLog;
    },
    get focusMapAlarmSourceSubtab() {
      return focusMapAlarmSourceSubtab;
    },
    get acknowledgeMapMainAlarm() {
      return acknowledgeMapMainAlarm;
    },
    get updateMobileBattlePipVisibility() {
      return updateMobileBattlePipVisibility;
    },
    get isMobileBattlePipVisible() {
      return isMobileBattlePipVisible;
    },
    get refreshMobileBattlePip() {
      return refreshMobileBattlePip;
    },
    get fitPassiveCameraToBounds() {
      return fitPassiveCameraToBounds;
    },
    get resizePassiveTreeCanvas() {
      return resizePassiveTreeCanvas;
    },
    get drawPassiveTree() {
      return drawPassiveTree;
    },
    get resizeCanvas() {
      return resizeCanvas;
    },
    get startBattleAssetLoadNow() {
      return startBattleAssetLoadNow;
    },
    get syncBattleTabLayout() {
      return syncBattleTabLayout;
    },
    get scheduleStableResize() {
      return scheduleStableResize;
    },
    get settingsUi() {
      return settingsUi;
    },
    get playerGuideUi() {
      return window.playerGuideUi;
    },
    get hidePassiveNodeTooltip() {
      return window.hidePassiveNodeTooltip;
    },
    get syncSocialChatPolling() {
      return typeof syncSocialChatPolling === "undefined" ? void 0 : syncSocialChatPolling;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get toggleGoalDrawer() {
      return typeof toggleGoalDrawer === "undefined" ? void 0 : toggleGoalDrawer;
    },
    get i18n() {
      return i18n;
    },
    get _t() {
      return _t;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get tabLayoutUi() {
      return tabLayoutUi;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get syncDesktopRailGroups() {
      return typeof syncDesktopRailGroups === "undefined" ? void 0 : syncDesktopRailGroups;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get switchTab() {
      return typeof switchTab === "undefined" ? void 0 : switchTab;
    },
    get syncMapCompleteActionQuickControl() {
      return syncMapCompleteActionQuickControl;
    },
    get TAB_UNLOCK_GATES() {
      return typeof TAB_UNLOCK_GATES === "undefined" ? void 0 : TAB_UNLOCK_GATES;
    },
    get clampNumber() {
      return clampNumber;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get Date() {
      return Date;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get MOBILE_BATTLE_BREAKPOINT() {
      return MOBILE_BATTLE_BREAKPOINT;
    },
    get contentProgression() {
      return contentProgression;
    },
    get isSocialTabActive() {
      return typeof isSocialTabActive === "undefined" ? void 0 : isSocialTabActive;
    },
    get getStarterWeaponTutorialTarget() {
      return getStarterWeaponTutorialTarget;
    },
    get worldTreeBark() {
      return worldTreeBark;
    },
    get isJournalTabUnlockReady() {
      return isJournalTabUnlockReady;
    },
    get talentUi() {
      return talentUi;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get renderMarketUI() {
      return renderMarketUI;
    },
    get refreshBlackMarket() {
      return refreshBlackMarket;
    },
    get closeWindow() {
      return typeof closeWindow === "undefined" ? void 0 : closeWindow;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get cachedTooltipStats() {
      return window.GameModules.uiRuntime.stats.snapshot();
    },
    set cachedTooltipStats(value) {
      window.GameModules.uiRuntime.stats.store(value);
    },
    clearGemTooltipCache: () => window.GameModules.tooltipView.clearGemCache(),
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get setMobileBattlePipCollapsed() {
      return setMobileBattlePipCollapsed;
    }
  });
  window.GameModules.tabNavigationView = tabNavigationView;
  safeExposeGlobals({
    runWindowOpenHooks: tabNavigationView.runWindowOpenHooks,
    craftSelectInventoryItemById: tabNavigationView.craftSelectInventoryItemById,
    isSelectedSubtab: tabNavigationView.isSelectedSubtab,
    switchItemSubtab: tabNavigationView.switchItemSubtab,
    switchSkillSubtab: tabNavigationView.switchSkillSubtab,
    switchMapSubtab: tabNavigationView.switchMapSubtab,
    syncSingleSubtabRows: tabNavigationView.syncSingleSubtabRows,
    notifyLockedTab: tabNavigationView.notifyLockedTab,
    switchTab: tabNavigationView.switchTab,
    isMobilePrimaryNavigationEnabled: tabNavigationView.isMobilePrimaryNavigationEnabled,
    setMobileTabDrawerOpen: tabNavigationView.setMobileTabDrawerOpen,
    renderTabOrderSettings: tabNavigationView.renderTabOrderSettings,
    onTabGroupDragStart: tabNavigationView.onTabGroupDragStart,
    onTabGroupDrop: tabNavigationView.onTabGroupDrop,
    getTabGroupForId: tabNavigationView.getTabGroupForId,
    isTabGroupingActive: tabNavigationView.isTabGroupingActive,
    getActiveTabGroup: tabNavigationView.getActiveTabGroup,
    selectTabGroup: tabNavigationView.selectTabGroup,
    applyTabGroupFilter: tabNavigationView.applyTabGroupFilter,
    renderTabCategoryBar: tabNavigationView.renderTabCategoryBar,
    commitMobileDockOrder: tabNavigationView.commitMobileDockOrder,
    applyTabHeaderOrder: tabNavigationView.applyTabHeaderOrder,
    scheduleTabHeaderViewportSync: tabNavigationView.scheduleTabHeaderViewportSync,
    updateTabNotificationDots: tabNavigationView.updateTabNotificationDots,
    syncTabUnlockButton: tabNavigationView.syncTabUnlockButton,
    updateTabUnlockButtons: tabNavigationView.updateTabUnlockButtons,
    hideOutOfGroupTabButtons: tabNavigationView.hideOutOfGroupTabButtons,
    refreshTabHeaderUiIfNeeded: tabNavigationView.refreshTabHeaderUiIfNeeded,
    isNotiEnabled: tabNavigationView.isNotiEnabled,
    getMergedTabGroup: tabNavigationView.getMergedTabGroup,
    getSelectedMergedTabId: tabNavigationView.getSelectedMergedTabId,
    getActiveTopLevelTabElement: tabNavigationView.getActiveTopLevelTabElement,
    getActiveUiTabId: tabNavigationView.getActiveUiTabId,
    getRenderingUiTabIds: tabNavigationView.getRenderingUiTabIds,
    renderVisibleManagementPanels: tabNavigationView.renderVisibleManagementPanels,
    isTabSurfaceAvailable: tabNavigationView.isTabSurfaceAvailable,
    closeRelockedTabSurfaces: tabNavigationView.closeRelockedTabSurfaces,
    resolveShownTab: tabNavigationView.resolveShownTab,
    refreshShownMergedTab: tabNavigationView.refreshShownMergedTab,
    switchMergedTabSubtab: tabNavigationView.switchMergedTabSubtab,
    syncMergedTabLauncherVisibility: tabNavigationView.syncMergedTabLauncherVisibility,
    syncMergedTabLauncherState: tabNavigationView.syncMergedTabLauncherState,
    openMergedTabPicker: tabNavigationView.openMergedTabPicker,
    openTabPane: tabNavigationView.openTabPane,
    renderMergedTabSubtabs: tabNavigationView.renderMergedTabSubtabs,
    revealActiveTabButton: tabNavigationView.revealActiveTabButton
  });
})();
