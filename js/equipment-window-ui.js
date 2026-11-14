// GENERATED from modules/equipment-window-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/equipment-window-actions.mjs
  function fillEmptySlots(runtime) {
    const { deps } = runtime;
    const equipped = deps.equipIntoEmptySlots(deps.game.inventory.slice());
    if (equipped) deps.showGameToast(deps._t("빈 장비 칸 {equipped}개를 채웠습니다", { equipped }), { tone: "success" });
    deps.updateStaticUI();
  }
  function renderLoadoutSummary(runtime, stats) {
    render(runtime, stats);
    runtime.deps.knittingUi.render();
  }
  function updateFullWarnings(runtime) {
    const { deps } = runtime;
    const element = deps.document.getElementById("inventory-full-warning");
    if (!element) return;
    const used = deps.getInventoryUsedCellCount(deps.game), limit = deps.getInventoryLimit(deps.game);
    const full = used >= limit, display = full ? "inline-block" : "none";
    const changed = element.style.display !== display;
    element.style.display = display;
    element.dataset.tip = full ? `${deps._t("{label} {used}/{limit}칸", { label: "장비", used, limit })}, ${deps._t("공간을 확보하세요")}` : "";
    if (changed && deps.document.body.classList.contains("desktop-windowed-ui") && typeof deps.syncDesktopRailGroups === "function") {
      deps.syncDesktopRailGroups();
    }
  }
  function setHtml(runtime, node, html) {
    if (node && node.__eqwHtml !== html) {
      node.innerHTML = html;
      node.__eqwHtml = html;
    }
  }
  function ehpItems(runtime, stats) {
    const profile = typeof runtime.deps.calculatePlayerEhpProfile === "function" ? (0, runtime.deps.calculatePlayerEhpProfile)(stats) : null;
    if (!profile) return "";
    return runtime.state.EHP.map(([name, key]) => `<span style="--c:${runtime.state.COLOR[key]}" data-tip="${(0, runtime.deps._t)("직격 {value}", { value: fmt(runtime, profile.elements[key].direct) })}">${(0, runtime.deps._t)(name)} <b>${fmt(runtime, profile.elements[key].entropy)}</b></span>`).join("");
  }
  function ehpHtml(runtime, stats) {
    const items = ehpItems(runtime, stats);
    return items ? `<div class="eqw-ehp"><span class="eqw-ehp-label">${(0, runtime.deps._t)("유효 생명력")}</span>${items}</div>` : "";
  }
  function fullHtml(runtime, stats, dps) {
    const ehp = ehpItems(runtime, stats);
    return `<div class="eqw-summary-full"><span class="eqw-sum-label"><span class="px-center">DPS</span></span><div class="eqw-sum-value eqw-dps" style="--c:${runtime.state.COLOR.dps}"><b>${dps}</b></div>` + (ehp ? `<span class="eqw-sum-label"><span class="px-center">${(0, runtime.deps._t)("유효 생명력")}</span></span><div class="eqw-sum-value eqw-ehp">${ehp}</div>` : "") + "</div>";
  }
  function miniHtml(runtime, stats, dps) {
    const open = (runtime.deps.game.settings || {}).equipmentMobilePane === "loadout";
    return `<div class="eqw-summary-mini"><button type="button" class="eqw-mini-toggle" aria-expanded="${open}" onclick="equipmentWindowUi.toggleLoadout()">${(0, runtime.deps._t)("장착 장비")} ${open ? "▴" : "▾"}</button>
            <div class="eqw-mini-dps" style="--c:${runtime.state.COLOR.dps}"><small>DPS</small><b>${dps}</b></div><div class="eqw-mini-line">${ehpHtml(runtime, stats)}</div></div>`;
  }
  function toggleLoadout(runtime) {
    (0, runtime.deps.setEquipmentMobilePane)((runtime.deps.game.settings || {}).equipmentMobilePane === "loadout" ? "inventory" : "loadout");
    (0, runtime.deps.updateStaticUI)();
  }
  function renderHead(runtime) {
    const cap = runtime.deps.document.getElementById("ui-equipment-bag-capacity");
    if (cap) {
      const used = (0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game), limit = Math.max(1, (0, runtime.deps.getInventoryLimit)(runtime.deps.game));
      setHtml(runtime, cap, `<b>${(0, runtime.deps._t)("가방")}</b><small>${(0, runtime.deps._t)("{used}/{limit}칸", { used, limit })}</small><i style="--v:${Math.min(100, Math.round(100 * used / limit))}%"></i>`);
      cap.classList.toggle("is-full", used >= limit);
    }
    const input = runtime.deps.document.getElementById("ui-equipment-bag-search");
    const query = String((0, runtime.deps.getSearchFilterState)().equip || "");
    if (input && runtime.deps.document.activeElement !== input && input.value !== query) input.value = query;
  }
  function closeMenus(runtime, event) {
    runtime.deps.document.querySelectorAll(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  }
  function fillRailIcons(runtime) {
    runtime.deps.document.querySelectorAll(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-tool[data-icon]").forEach((tool) => {
      if (!tool.querySelector("svg")) tool.insertAdjacentHTML("afterbegin", (0, runtime.deps.renderPixelIcon)(tool.dataset.icon, "eqw-rail-icon"));
    });
  }
  function markFilter(runtime) {
    const summary = runtime.deps.document.querySelector("#eqw-filter-menu > summary");
    if (!summary) return;
    const settings = runtime.deps.game.settings || {};
    const slot = String(settings.equipmentSlotFilter || "all");
    const slotPicked = slot !== "all" && (runtime.deps.game.inventory || []).some((item) => item && item.slot === slot);
    const gradeHidden = Object.values(settings.inventoryViewRarities || {}).some((shown) => shown === false);
    summary.dataset.active = String(slotPicked || gradeHidden);
    const judge = runtime.deps.document.querySelector("#eqw-judge-menu > summary");
    if (judge) judge.dataset.active = String(runtime.deps.equipmentTriage.currentFilter() !== "all");
    const order = settings.bagArrangeOrder || "recent";
    runtime.deps.document.querySelectorAll("#eqw-arrange-menu [data-arrange-order]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.arrangeOrder === order));
    });
  }
  function markSearchSalvage(runtime) {
    const empty = !(0, runtime.deps.getSearchFilterState)().equip.trim();
    runtime.deps.document.querySelectorAll(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) [data-search-salvage]").forEach((button) => {
      button.disabled = empty;
      button.dataset.tip = empty ? (0, runtime.deps._t)("가방 검색어를 먼저 입력하세요.") : "";
    });
  }
  function keepOnePanel(runtime, event) {
    const menu = event.target;
    if (!menu.matches || !menu.matches(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu") || !menu.open) return;
    runtime.deps.document.querySelectorAll(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu[open]").forEach((other) => {
      if (other !== menu) other.removeAttribute("open");
    });
  }
  function closePanelOnEscape(runtime, event) {
    if (event.key !== "Escape") return;
    const menu = runtime.deps.document.querySelector(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]");
    if (!menu || !menu.getClientRects().length) return;
    menu.removeAttribute("open");
    menu.querySelector("summary").focus();
    event.preventDefault();
    event.stopPropagation();
  }
  function runRailToolOnDoubleClick(runtime, event) {
    const summary = event.target.closest && event.target.closest(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu > summary");
    const action = summary && runtime.state.RAIL_DOUBLE_CLICK[summary.parentElement.id];
    if (!action) return;
    event.preventDefault();
    summary.parentElement.removeAttribute("open");
    action();
  }
  function openSalvage(runtime) {
    const menu = runtime.deps.document.getElementById("eqw-salvage-menu");
    if (menu) menu.open = true;
  }
  function openItemFilter(runtime) {
    (0, runtime.deps.switchTab)("tab-settings");
    runtime.deps.settingsUi.select("items");
  }
  function salvageKind(runtime, item) {
    if (runtime.deps.bagItems.isJewel(item)) return runtime.deps.bagItems.JEWEL;
    if (runtime.deps.bagItems.isCore(item)) return runtime.deps.bagItems.CORE;
    if (runtime.deps.colonyWards.isWard(item)) return "액막이";
    return String(item.slot || "").replace(/[123]$/, "") || "기타";
  }
  function countBy(runtime, items, keyOf) {
    const counts = /* @__PURE__ */ new Map();
    items.forEach((item) => {
      const key = keyOf(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }
  function salvageSummaryHtml(runtime, items) {
    const grades = countBy(runtime, items, (item) => item.rarity), kinds = countBy(runtime, items, runtime.handlers.salvageKind);
    const shown = ["normal", "magic", "rare", "unique"].filter((grade) => grades.get(grade));
    const rank = (kind) => {
      const at = runtime.state.SALVAGE_KIND_ORDER.indexOf(kind);
      return at < 0 ? runtime.state.SALVAGE_KIND_ORDER.length : at;
    };
    const chip = (label, count, grade = "") => `<span class="salvage-sum-chip"${grade ? ` data-grade="${grade}"` : ""}><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</b>${count}</span>`;
    const bar = shown.map((grade) => `<i data-grade="${grade}" style="flex:${grades.get(grade)}"></i>`).join("");
    const gradeChips = shown.map((grade) => chip(runtime.deps.ITEM_RARITY_LABELS[grade], grades.get(grade), grade)).join("");
    const kindChips = [...kinds].sort((a, b) => rank(a[0]) - rank(b[0])).map(([kind, count]) => chip(kind, count)).join("");
    return `<div class="salvage-sum">${bar ? `<div class="salvage-sum-bar" aria-hidden="true">${bar}</div>` : ""}
            ${gradeChips ? `<div class="salvage-sum-row"><h5>${(0, runtime.deps._t)("등급")}</h5>${gradeChips}</div>` : ""}
            <div class="salvage-sum-row"><h5>${(0, runtime.deps._t)("종류")}</h5>${kindChips}</div></div>`;
  }
  function watchBag(runtime) {
    const target = runtime.deps.document.querySelector(":is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .equipment-inventory-grid-shell");
    if (!runtime.active || !target || typeof runtime.deps.IntersectionObserver !== "function") return;
    const owner = runtime.deps.game;
    if (runtime.state.watched === target && runtime.state.bagOwner === owner) return;
    runtime.state.bagObserver?.disconnect();
    runtime.state.watched = target;
    runtime.state.bagOwner = owner;
    runtime.state.bagShown = false;
    const observer = new runtime.deps.IntersectionObserver((entries) => {
      if (!runtime.active || runtime.state.bagObserver !== observer || runtime.deps.game !== owner) return;
      if (entries.some((entry) => entry.isIntersecting)) runtime.state.bagShown = true;
      else if (runtime.state.bagShown) {
        runtime.state.bagShown = false;
        runtime.deps.game.bagSeenId = runtime.deps.window.GameModules.state.session.itemIdCounter;
      }
    });
    runtime.state.bagObserver = observer;
    observer.observe(target);
  }
  function render(runtime, stats) {
    const dps = fmt(runtime, stats.totalDps || stats.dps);
    setHtml(runtime, runtime.deps.document.getElementById("ui-equipment-loadout-summary"), fullHtml(runtime, stats, dps) + miniHtml(runtime, stats, dps));
  }
  function renderBag(runtime) {
    renderHead(runtime);
    fillRailIcons(runtime);
    markFilter(runtime);
    markSearchSalvage(runtime);
    watchBag(runtime);
  }
  function compareSlots(runtime, item) {
    if (runtime.deps.bagItems.isJewel(item)) return [];
    const slots = (0, runtime.deps.getEquipCandidateSlots)(item);
    const filled = slots.filter((slot) => (runtime.deps.game.equipment || {})[slot]);
    return filled.length ? filled : slots;
  }
  function compareNode(runtime, panes, selectedLabel) {
    const wrap = runtime.deps.document.createElement("div");
    wrap.className = "eqw-compare";
    wrap.dataset.panes = String(panes.length);
    const selected = Math.max(0, panes.findIndex((pane) => pane.label === selectedLabel));
    const tabs = panes.map((pane, index) => `<button type="button" aria-pressed="${index === selected}" class="${index === selected ? "active" : ""}" onclick="equipmentWindowUi.showPane(this, ${index})">${(0, runtime.deps.escapeHTML)(pane.tab)}</button>`);
    wrap.innerHTML = `<div class="eqw-compare-tabs">${tabs.join("")}</div><div class="eqw-compare-panes"></div>`;
    panes.forEach((pane, index) => {
      const section = runtime.deps.document.createElement("section");
      section.className = `eqw-compare-pane${index === selected ? " active" : ""}`;
      const head = runtime.deps.document.createElement("h5");
      head.textContent = (0, runtime.deps._t)(pane.label);
      section.append(head, pane.node);
      wrap.lastElementChild.append(section);
    });
    return wrap;
  }
  function showPane(runtime, button, index) {
    const wrap = button.closest(".eqw-compare");
    wrap.querySelectorAll(".eqw-compare-tabs > button, .eqw-compare-pane").forEach((node) => node.classList.remove("active"));
    wrap.querySelectorAll(".eqw-compare-tabs > button").forEach((node, tabIndex) => node.setAttribute("aria-pressed", String(tabIndex === index)));
    wrap.querySelectorAll(".eqw-compare-tabs > button")[index].classList.add("active");
    wrap.querySelectorAll(".eqw-compare-pane")[index].classList.add("active");
    runtime.deps.equipmentInventoryInteraction.positionInspector();
  }
  function wornNames(runtime, slots) {
    const worn = slots.map((slot) => runtime.deps.game.equipment[slot]).filter(Boolean);
    if (!worn.length) return "비어 있음";
    return worn.map((row) => `<span class="${row.rarity || "normal"}">${(0, runtime.deps.escapeHTML)(row.name || row.baseName || "장비")}</span>`).join(", ");
  }
  function subtitleOf(runtime, slot, slots) {
    if (slot) return (0, runtime.deps._t)("{slot} 칸에 장착 중", { slot: slotName(runtime, slot) });
    return slots.length ? (0, runtime.deps._t)("{slots} 칸과 비교", { slots: slots.map(runtime.handlers.slotName).join(", ") }) : "";
  }
  function inspectorHtml(runtime, item, slot, actionsHtml, flags) {
    const slots = slot ? [] : compareSlots(runtime, item);
    const hint = slot ? (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName || "장착 중")) : runtime.deps.bagItems.isJewel(item) ? "빈 소켓이 있는 장비에 끼웁니다" : (0, runtime.deps._t)("지금 장착: {slots}", { slots: wornNames(runtime, slots) });
    const rarity = item.rarity || "normal";
    return `<h4 class="eqw-title">${(0, runtime.deps._t)("선택한 장비")}<small>${(0, runtime.deps.escapeHTML)(subtitleOf(runtime, slot, slots))}</small></h4>
            <div class="eqw-pick rarity-${rarity}"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"><div><b class="${rarity}">${(0, runtime.deps.escapeHTML)(item.name || item.baseName || "장비")}</b>
                <small>${hint}${flags ? `, ${(0, runtime.deps.escapeHTML)(flags)}` : ""}</small></div></div>
            <div class="eqw-inspector-body">${deltaTablesHtml(runtime, slots)}${orderedBody(runtime, actionsHtml)}</div>
            <button type="button" class="equipment-grid-inspector-close" aria-label="${(0, runtime.deps._t)("선택 닫기")}" onclick="equipmentInventoryInteraction.focus(null)">×</button>`;
  }
  function orderedBody(runtime, actionsHtml) {
    const actions = `<div class="equipment-grid-inspector-actions">${actionsHtml}</div>`, details = '<div class="equipment-inspection-details"></div>';
    const inspector = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
    return inspector && inspectorDock(runtime, inspector) === "sheet" ? details + actions : actions + details;
  }
  function toggleTools(runtime, button) {
    const actions = button.closest(".equipment-grid-inspector-actions");
    const open = actions.classList.toggle("tools-open");
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? (0, runtime.deps._t)("관리 닫기") : (0, runtime.deps._t)("장비 관리");
  }
  function fmt(runtime, value) {
    return Math.floor(Number(value) || 0).toLocaleString(runtime.deps.i18n.locale);
  }
  function pretty(runtime, text) {
    return /^-?\d{4,}$/.test(text) ? Number(text).toLocaleString(runtime.deps.i18n.locale) : text;
  }
  function slotName(runtime, slot) {
    return typeof runtime.deps.getDualSlotDisplayLabel === "function" ? (0, runtime.deps.getDualSlotDisplayLabel)(slot) : String(slot).replace(/[123]$/, "");
  }
  function seenId(runtime) {
    if (!Number.isFinite(Number(runtime.deps.game.bagSeenId)) || runtime.deps.game.bagSeenId === null) runtime.deps.game.bagSeenId = runtime.deps.window.GameModules.state.session.itemIdCounter;
    return Number(runtime.deps.game.bagSeenId);
  }
  function isNew(runtime, item) {
    return !!item && Number(item.id) > seenId(runtime);
  }
  function newDotHtml(runtime, item) {
    return isNew(runtime, item) ? '<span class="eqw-new-dot" aria-label="새 아이템"></span>' : "";
  }
  function tierHtml(runtime, item) {
    return item && !runtime.deps.bagItems.isSpecial(item) ? `<span class="eqw-item-tier ${(0, runtime.deps.getTierClassName)((0, runtime.deps.getItemCraftTier)(item))}" aria-hidden="true">T${(0, runtime.deps.getItemCraftTier)(item)}</span>` : "";
  }
  function baseStepHtml(runtime, item) {
    const info = item && !runtime.deps.bagItems.isSpecial(item) ? (0, runtime.deps.getItemBaseChainInfo)(item) : null;
    return info && info.total > 1 ? `<span class="eqw-base-step ${(0, runtime.deps.getBaseStepClassName)(info)}" aria-hidden="true">${info.step}/${info.total}</span>` : "";
  }
  function inspectorDock(runtime, inspector) {
    return (0, runtime.deps.getComputedStyle)(inspector).getPropertyValue("--eqw-dock").trim();
  }
  function wornSlots(runtime, item) {
    return runtime.deps.bagItems.isSpecial(item) ? [] : compareSlots(runtime, item).filter((slot) => (runtime.deps.game.equipment || {})[slot]).slice(0, 3);
  }
  function deltaTablesHtml(runtime, slots) {
    return slots.length ? `<div class="eqw-deltas${slots.length > 1 ? " is-multi" : ""}" data-eqw-slot="${(0, runtime.deps.escapeHTML)(slots.join(","))}" style="--eqw-sides:${slots.length}"><div class="eqw-dl-head">바꾸면</div>
        <div class="eqw-dl-body"><p class="eqw-none">${(0, runtime.deps._t)("계산 중")}</p></div></div>` : "";
  }
  function emptyHtml(runtime, message) {
    return `<h4 class="eqw-title">${(0, runtime.deps._t)("선택한 장비")}</h4><div class="equipment-grid-inspector-empty">${message}</div>`;
  }

  // modules/ui/equipment-window-comparison.mjs
  function swapStats(runtime, item, slot, before) {
    const equipment = runtime.deps.game.equipment, had = Object.prototype.hasOwnProperty.call(equipment, slot), backup = equipment[slot];
    const twins = Array.isArray(runtime.deps.game.cosmosTwinKeystones) ? runtime.deps.game.cosmosTwinKeystones.slice() : runtime.deps.game.cosmosTwinKeystones;
    try {
      equipment[slot] = item;
      return [before, (0, runtime.deps.getUiPlayerStats)({}, false)];
    } finally {
      if (had) equipment[slot] = backup;
      else delete equipment[slot];
      runtime.deps.game.cosmosTwinKeystones = twins;
    }
  }
  function deltaText(runtime, key, a, d) {
    const sign = d > 0 ? "+" : "-";
    return key === "dps" && a > 0 ? `${sign}${Math.abs(100 * d / a).toFixed(1)}%` : `${sign}${pretty(runtime, runtime.deps.COMPARE_STAT_META[key].format(Math.abs(d)))}`;
  }
  function deltaRow(runtime, key, a, b, rest) {
    const meta = runtime.deps.COMPARE_STAT_META[key], d = b - a;
    return `<div class="eqw-dl ${d > 0 ? "up" : "down"}${rest ? " is-rest" : ""}">${deltaLabel(runtime, key)}<b>${pretty(runtime, meta.format(a))}</b><i>→</i><b>${pretty(runtime, meta.format(b))}</b><em>${deltaText(runtime, key, a, d)}</em></div>`;
  }
  function multiDeltaRow(runtime, key, now, sides, rest) {
    const meta = runtime.deps.COMPARE_STAT_META[key], a = Number(now[key]) || 0;
    const cells = sides.map((side) => {
      const d = (Number(side.after[key]) || 0) - a;
      if (Math.abs(d) < 1e-3) return '<span class="eqw-dl-side is-same">-</span>';
      return `<span class="eqw-dl-side ${d > 0 ? "up" : "down"}"><b>${pretty(runtime, meta.format(a + d))}</b><em>${deltaText(runtime, key, a, d)}</em></span>`;
    }).join("");
    return `<div class="eqw-dl eqw-dl-multi${rest ? " is-rest" : ""}">${deltaLabel(runtime, key)}<b>${pretty(runtime, meta.format(a))}</b>${cells}</div>`;
  }
  function sideNotes(runtime, item, slot) {
    const notes = wardRows(runtime, item, slot) + uniqueRows(runtime, item, runtime.deps.game.equipment[slot]);
    return notes ? `<div class="eqw-dl-side-name">${(0, runtime.deps.escapeHTML)(slotName(runtime, slot))}</div>${notes}` : "";
  }
  function multiDeltaHtml(runtime, item, slots, now) {
    const sides = slots.map((slot) => ({ slot, after: swapStats(runtime, item, slot, now)[1] }));
    const keys = Object.keys(runtime.deps.COMPARE_STAT_META).filter((key) => sides.some((side) => Math.abs((Number(side.after[key]) || 0) - (Number(now[key]) || 0)) >= 1e-3));
    const rest = keys.filter((key) => !runtime.state.DELTA_TINT[key]), fold = rest.length < keys.length ? rest : [];
    const head = `<div class="eqw-dl eqw-dl-multi eqw-dl-cols"><span></span><b>${(0, runtime.deps._t)("지금")}</b>${sides.map((side) => `<b>${(0, runtime.deps.escapeHTML)(slotName(runtime, side.slot))}</b>`).join("")}</div>`;
    const rows = keys.map((key) => multiDeltaRow(runtime, key, now, sides, fold.includes(key))).join("");
    return (rows ? head + rows + restButton(runtime, fold.length) : "") + sides.map((side) => sideNotes(runtime, item, side.slot)).join("") || '<p class="eqw-none">능력치 변화 없음</p>';
  }
  function slotsDeltaHtml(runtime, item, slotsKey, now) {
    const slots = slotsKey.split(",");
    return slots.length > 1 ? multiDeltaHtml(runtime, item, slots, now) : deltaHtml(runtime, item, slots[0], now);
  }
  function uniqueRows(runtime, item, worn) {
    if ((worn && worn.uniqueEffect) === item.uniqueEffect) return "";
    const gain = item.uniqueEffect ? `<div class="eqw-dl-note is-gain">${(0, runtime.deps._t)("획득: {uniqueEffect}", { uniqueEffect: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect)) })}</div>` : "";
    return gain + (worn && worn.uniqueEffect ? `<div class="eqw-dl-note is-loss">${(0, runtime.deps._t)("상실: {uniqueEffect}", { uniqueEffect: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(worn.uniqueEffect)) })}</div>` : "");
  }
  function wardRows(runtime, item, slot) {
    const change = runtime.deps.colonyWards.slotChange(item, slot);
    if (!change) return "";
    return `<div class="eqw-dl-note ${change.to > change.from ? "is-gain" : "is-loss"}">${(0, runtime.deps._t)("액막이 칸 {from} → {to}", { from: change.from, to: change.to })}</div>`;
  }
  function restButton(runtime, count) {
    return count ? `<button type="button" class="eqw-dl-more" data-rest="${count}" onclick="equipmentWindowUi.toggleDeltas(this)">${(0, runtime.deps._t)("나머지 변화 {count}줄 보기", { count })}</button>` : "";
  }
  function toggleDeltas(runtime, button) {
    const open = button.closest(".eqw-dl-body").classList.toggle("is-open");
    button.textContent = open ? (0, runtime.deps._t)("접기") : (0, runtime.deps._t)("나머지 변화 {rest}줄 보기", { rest: button.dataset.rest });
    runtime.deps.equipmentInventoryInteraction.positionInspector();
  }
  function deltaHtml(runtime, item, slot, now) {
    const [before, after] = swapStats(runtime, item, slot, now);
    const keys = Object.keys(runtime.deps.COMPARE_STAT_META).filter((key) => Math.abs((Number(after[key]) || 0) - (Number(before[key]) || 0)) >= 1e-3);
    const rest = keys.filter((key) => !runtime.state.DELTA_TINT[key]);
    const fold = rest.length < keys.length ? rest : [];
    const rows = keys.map((key) => deltaRow(runtime, key, Number(before[key]) || 0, Number(after[key]) || 0, fold.includes(key))).join("");
    return rows + restButton(runtime, fold.length) + wardRows(runtime, item, slot) + uniqueRows(runtime, item, runtime.deps.game.equipment[slot]) || '<p class="eqw-none">능력치 변화 없음</p>';
  }
  function hashKey(runtime, text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  }
  function fillDeltas(runtime, root, item, signature) {
    if (!runtime.active) return;
    cancelDeltaJob(runtime, runtime.state.deltaJobs.get(root));
    const tables = [...root.querySelectorAll(".eqw-deltas[data-eqw-slot]")];
    if (!tables.length) return;
    const owner = runtime.deps.game;
    if (runtime.state.deltaOwner !== owner) runtime.state.deltaCache.clear();
    runtime.state.deltaOwner = owner;
    const job = { root, frame: 0, timer: 0 };
    runtime.state.deltaJobs.set(root, job);
    runtime.state.pendingDeltas.add(job);
    const sig = hashKey(runtime, String(signature));
    let now = null;
    const fill = (table) => {
      if (!table.isConnected) return;
      const key = `${sig}|${table.dataset.eqwSlot}`;
      if (!runtime.state.deltaCache.has(key)) runtime.state.deltaCache.set(key, slotsDeltaHtml(runtime, item, table.dataset.eqwSlot, now || (now = (0, runtime.deps.getUiPlayerStats)({}, false))));
      const body = table.querySelector(".eqw-dl-body");
      const focused = body.contains(runtime.deps.document.activeElement);
      body.innerHTML = runtime.state.deltaCache.get(key);
      const more = body.querySelector(".eqw-dl-more");
      if (more && body.classList.contains("is-open")) more.textContent = (0, runtime.deps._t)("접기");
      if (focused) more?.focus({ preventScroll: true });
    };
    const run = () => {
      const current = runtime.state.deltaJobs.get(root) === job;
      cancelDeltaJob(runtime, job);
      if (!runtime.active || !current || runtime.deps.game !== owner) return;
      tables.forEach(fill);
      runtime.deps.equipmentInventoryInteraction.positionInspector();
    };
    if (runtime.state.deltaCache.size > 24) runtime.state.deltaCache.clear();
    job.frame = runtime.deps.requestAnimationFrame(() => {
      job.frame = 0;
      job.timer = runtime.deps.setTimeout(run, 0);
    });
  }
  function cancelDeltaJob(runtime, job) {
    if (!job) return;
    runtime.deps.cancelAnimationFrame(job.frame);
    runtime.deps.clearTimeout(job.timer);
    if (runtime.state.deltaJobs.get(job.root) === job) runtime.state.deltaJobs.delete(job.root);
    runtime.state.pendingDeltas.delete(job);
  }
  function deltaLabel(runtime, key) {
    const tint = runtime.state.COLOR[runtime.state.DELTA_TINT[key]];
    return `<span${tint ? ` style="color:${tint}"` : ""}>${(0, runtime.deps._t)(runtime.deps.COMPARE_STAT_META[key].label)}</span>`;
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

  // modules/ui/equipment-window-view.mjs
  function createEquipmentWindowView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { fillEmptySlots, renderLoadoutSummary, updateFullWarnings, salvageKind, slotName, render, renderBag, toggleLoadout, newDotHtml, tierHtml, baseStepHtml, inspectorDock, inspectorHtml, emptyHtml, fillDeltas, wornSlots, compareNode, showPane, toggleDeltas, openSalvage, openItemFilter, toggleTools, salvageSummaryHtml, closeMenus, keepOnePanel, closePanelOnEscape, runRailToolOnDoubleClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      render: runtime.handlers.render,
      renderBag: runtime.handlers.renderBag,
      toggleLoadout: runtime.handlers.toggleLoadout,
      newDotHtml: runtime.handlers.newDotHtml,
      tierHtml: runtime.handlers.tierHtml,
      baseStepHtml: runtime.handlers.baseStepHtml,
      inspectorDock: runtime.handlers.inspectorDock,
      inspectorHtml: runtime.handlers.inspectorHtml,
      emptyHtml: runtime.handlers.emptyHtml,
      fillDeltas: runtime.handlers.fillDeltas,
      wornSlots: runtime.handlers.wornSlots,
      compareNode: runtime.handlers.compareNode,
      showPane: runtime.handlers.showPane,
      toggleDeltas: runtime.handlers.toggleDeltas,
      openSalvage: runtime.handlers.openSalvage,
      openItemFilter: runtime.handlers.openItemFilter,
      toggleTools: runtime.handlers.toggleTools,
      salvageSummaryHtml: runtime.handlers.salvageSummaryHtml,
      fillEmptySlots: runtime.handlers.fillEmptySlots,
      renderLoadoutSummary: runtime.handlers.renderLoadoutSummary,
      updateFullWarnings: runtime.handlers.updateFullWarnings,
      dispose: () => disposeEquipmentWindow(runtime)
    });
    if (typeof runtime.deps.document !== "undefined" && typeof runtime.deps.document.addEventListener === "function") {
      listenView(runtime, runtime.deps.document, "pointerdown", runtime.handlers.closeMenus, true);
      listenView(runtime, runtime.deps.document, "toggle", runtime.handlers.keepOnePanel, true);
      listenView(runtime, runtime.deps.document, "keydown", runtime.handlers.closePanelOnEscape, true);
      listenView(runtime, runtime.deps.document, "dblclick", runtime.handlers.runRailToolOnDoubleClick, true);
    }
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.COLOR = Object.freeze({
      dps: "#ffcf6e",
      life: "#ff6b6b",
      es: "#7fd3ff",
      fire: "#ff8a50",
      cold: "#6cb8ff",
      light: "#ffd54f",
      chaos: "#c39bff",
      armor: "#d2b98c",
      evasion: "#8fe08f",
      phys: "#d6cdb8"
    });
    runtime.state.EHP = Object.freeze([["물리", "phys"], ["화염", "fire"], ["냉기", "cold"], ["번개", "light"], ["카오스", "chaos"]]);
    runtime.state.DELTA_TINT = Object.freeze({
      dps: "dps",
      summonDps: "dps",
      maxHp: "life",
      energyShield: "es",
      resF: "fire",
      resC: "cold",
      resL: "light",
      resChaos: "chaos",
      armor: "armor",
      evasion: "evasion"
    });
    runtime.state.RAIL_DOUBLE_CLICK = Object.freeze({
      "eqw-arrange-menu": () => runtime.deps.equipmentInventoryInteraction.autoArrange(),
      "eqw-salvage-menu": () => (0, runtime.deps.bulkSalvageAllInventory)(),
      "eqw-judge-menu": () => runtime.deps.equipmentTriage.start()
    });
    runtime.state.SALVAGE_KIND_ORDER = Object.freeze(["무기", "방패", "투구", "갑옷", "장갑", "신발", "반지", "목걸이", "허리띠", runtime.deps.bagItems.JEWEL, runtime.deps.bagItems.CORE, "액막이"]);
    runtime.state.watched = null;
    runtime.state.bagShown = false;
    runtime.state.deltaCache = /* @__PURE__ */ new Map();
    runtime.state.deltaJobs = /* @__PURE__ */ new WeakMap();
    runtime.state.pendingDeltas = /* @__PURE__ */ new Set();
    runtime.state.deltaOwner = null;
    runtime.state.bagObserver = null;
    runtime.state.bagOwner = null;
  }
  function disposeEquipmentWindow(runtime) {
    releaseViewEvents(runtime);
    runtime.state.bagObserver?.disconnect();
    runtime.state.bagObserver = null;
    runtime.state.bagOwner = null;
    runtime.state.watched = null;
    runtime.state.bagShown = false;
    for (const job of runtime.state.pendingDeltas) cancelDeltaJob(runtime, job);
    runtime.state.deltaCache.clear();
    runtime.state.deltaOwner = null;
  }

  // modules/equipment-window-ui-classic.mjs
  var equipmentWindowUi = createEquipmentWindowView({
    get equipIntoEmptySlots() {
      return equipIntoEmptySlots;
    },
    get showGameToast() {
      return showGameToast;
    },
    get knittingUi() {
      return knittingUi;
    },
    get syncDesktopRailGroups() {
      return typeof syncDesktopRailGroups === "function" ? syncDesktopRailGroups : void 0;
    },
    get calculatePlayerEhpProfile() {
      return typeof calculatePlayerEhpProfile === "undefined" ? void 0 : calculatePlayerEhpProfile;
    },
    get _t() {
      return _t;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get setEquipmentMobilePane() {
      return setEquipmentMobilePane;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get getSearchFilterState() {
      return getSearchFilterState;
    },
    get getInventoryUsedCellCount() {
      return getInventoryUsedCellCount;
    },
    get getInventoryLimit() {
      return getInventoryLimit;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get equipmentTriage() {
      return equipmentTriage;
    },
    get switchTab() {
      return switchTab;
    },
    get settingsUi() {
      return settingsUi;
    },
    get bagItems() {
      return bagItems;
    },
    get colonyWards() {
      return colonyWards;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get IntersectionObserver() {
      return typeof IntersectionObserver === "undefined" ? void 0 : IntersectionObserver;
    },
    get window() {
      return window;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get COMPARE_STAT_META() {
      return COMPARE_STAT_META;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get i18n() {
      return i18n;
    },
    get getDualSlotDisplayLabel() {
      return typeof getDualSlotDisplayLabel === "undefined" ? void 0 : getDualSlotDisplayLabel;
    },
    get getTierClassName() {
      return getTierClassName;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get getItemBaseChainInfo() {
      return getItemBaseChainInfo;
    },
    get getBaseStepClassName() {
      return getBaseStepClassName;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get bulkSalvageAllInventory() {
      return bulkSalvageAllInventory;
    }
  });
  safeExposeGlobals({
    equipmentWindowUi,
    fillEmptyEquipmentSlots: equipmentWindowUi.fillEmptySlots,
    renderEquipmentLoadoutSummary: equipmentWindowUi.renderLoadoutSummary,
    updateInventoryFullWarnings: equipmentWindowUi.updateFullWarnings
  });
})();
