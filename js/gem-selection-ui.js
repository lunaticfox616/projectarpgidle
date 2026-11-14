// GENERATED from modules/gem-selection-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/gem-selection-controls.mjs
  function tierButtons(runtime, name) {
    const cap = (0, runtime.deps.getSupportTierCap)(name);
    if (cap <= 1) return "";
    const unlocked = Math.max(1, Math.min(cap, Math.floor(((runtime.deps.game.supportGemData || {})[name] || {}).unlockedTier || 1)));
    const active = (0, runtime.deps.getSupportActiveTier)(name);
    return '<span class="gem-selection-tiers" aria-label="보조스킬룬 등급">' + [1, 2, 3].slice(0, cap).map((tier) => `<button type="button" data-gem-action="tier" data-tier="${tier}" aria-pressed="${tier === active}" ${tier <= unlocked ? "" : "disabled"}>${(0, runtime.deps._t)("{tier}등급", { tier })}</button>`).join("") + "</span>";
  }
  function summonCount(runtime, name) {
    return `<span class="gem-selection-count"><button type="button" data-gem-action="summon-less" aria-label="${(0, runtime.deps._t)("소환 하나 줄이기")}">−</button><b>${(0, runtime.deps._t)("{name}기", { name: (0, runtime.deps.getSummonSkillCount)(name) })}</b><button type="button" data-gem-action="summon-more" aria-label="${(0, runtime.deps._t)("소환 하나 늘리기")}">+</button></span>`;
  }
  function kindControls(runtime, type, name, worn) {
    if (type === "support") return tierButtons(runtime, name);
    const summon = (runtime.deps.SKILL_DB[name].tags || []).includes("summon_attack");
    const enhance = runtime.deps.game.gemEnhanceUnlocked && (0, runtime.deps.getEquippedEnhanceableGemNames)().includes(name);
    return (summon && worn ? summonCount(runtime, name) : "") + (enhance ? '<button type="button" data-gem-action="enhance">강화와 각인</button>' : "");
  }
  function actions(runtime, type, name, anchor) {
    const support = type === "support";
    const worn = anchor.classList.contains("active");
    const canUnequip = support || runtime.deps.skillGemBoardUi.kindOf(name) === "summon" || runtime.deps.mobilitySkill.isMobilityGem(name);
    const refusal = (0, runtime.deps.getSkillGemSealRefusal)(name, support);
    const seal = !worn && name !== "기본 공격" ? `<button type="button" data-gem-action="seal" class="gem-selection-seal" ${refusal ? `disabled data-tip="${(0, runtime.deps.escapeHTML)(refusal)}"` : ""}>${(0, runtime.deps._t)("봉인")}</button>` : "";
    return equipButton(runtime, anchor, canUnequip) + kindControls(runtime, type, name, worn) + seal + '<button type="button" data-gem-action="close" aria-label="룬 상세 닫기">닫기</button>';
  }
  function equipButton(runtime, anchor, canUnequip) {
    const equipped = anchor.classList.contains("active");
    const blocked = anchor.classList.contains("equipment-blocked") && !equipped;
    const label = equipped ? canUnequip ? (0, runtime.deps._t)("장착 해제") : (0, runtime.deps._t)("장착 중") : (0, runtime.deps._t)("장착");
    const disabled = blocked || equipped && !canUnequip;
    return `<button type="button" class="${equipped ? "" : "gem-equip-primary"}" data-gem-action="equip" ${disabled ? "disabled" : ""}>${label}</button>`;
  }

  // modules/ui/gem-selection-comparison.mjs
  function wornWith(runtime, kind, name, replaced, saved) {
    const keep = (list) => list.filter((gem) => gem !== replaced);
    if (kind === "support") return { equippedSupports: keep(saved.equippedSupports).filter((gem) => gem !== name).concat(name) };
    if (kind === "mobility") return { mobilitySkill: name };
    if (kind !== "summon") return { activeSkill: name };
    const counts = { ...saved.summonSkillCounts, [name]: saved.summonSkillCounts[replaced] || 1 };
    if (replaced !== name) delete counts[replaced];
    return { equippedSummonSkills: keep(saved.equippedSummonSkills).concat(name), summonSkillCounts: counts };
  }
  function previewStats(runtime, type, name, replaced) {
    const saved = {
      activeSkill: runtime.deps.game.activeSkill,
      mobilitySkill: runtime.deps.game.mobilitySkill,
      equippedSupports: (runtime.deps.game.equippedSupports || []).slice(),
      equippedSummonSkills: (runtime.deps.game.equippedSummonSkills || []).slice(),
      summonSkillCounts: { ...runtime.deps.game.summonSkillCounts || {} }
    };
    return (0, runtime.deps.previewBuildStats)((copy) => Object.assign(copy, wornWith(runtime, type === "support" ? "support" : runtime.deps.skillGemBoardUi.kindOf(name), name, replaced, saved)));
  }
  function compareRow(runtime, label, before, after) {
    const diff = after - before;
    const pct = before > 0 ? ` ${diff >= 0 ? "▲" : "▼"}${Math.abs(Math.round(diff / before * 100))}%` : "";
    const tone = Math.abs(diff) < 1 ? "" : diff > 0 ? "is-up" : "is-down";
    return `<span>${label}</span><span class="gem-compare-now">${runtime.deps.COMPARE_STAT_META.dps.format(before)}</span><span aria-hidden="true">→</span><span class="gem-compare-next ${tone}">${runtime.deps.COMPARE_STAT_META.dps.format(after)}${tone ? pct : ""}</span>`;
  }
  function packRows(runtime, before, after) {
    const packOf = (stats) => Math.max(stats.dps || 0, stats.packDps || 0);
    const spreads = (stats) => packOf(stats) > (stats.dps || 0) * 1.01;
    return spreads(before) || spreads(after) ? [compareRow(runtime, "무리 최대", packOf(before), packOf(after))] : [];
  }
  function compareHtml(runtime, type, name, replaced) {
    const { before, after } = previewStats(runtime, type, name, replaced);
    const rows = [compareRow(runtime, "전체 DPS", totalDps(runtime, before), totalDps(runtime, after))].concat(packRows(runtime, before, after));
    if ((before.summonDps || 0) > 0 || (after.summonDps || 0) > 0) rows.push(compareRow(runtime, "소환 DPS", before.summonDps || 0, after.summonDps || 0));
    return `<div class="gem-compare"><b>${replaced ? (0, runtime.deps._t)("바꾸면") : (0, runtime.deps._t)("장착하면")}</b><div class="gem-compare-grid">${rows.join("")}</div></div>`;
  }
  function comparison(runtime, type, name, anchor) {
    if (anchor.matches(".active, .equipment-blocked")) return null;
    const holder = runtime.deps.document.createElement("div");
    holder.innerHTML = compareHtml(runtime, type, name);
    return holder.firstElementChild;
  }
  function totalDps(runtime, stats) {
    return stats.totalDps ?? stats.dps ?? 0;
  }

  // modules/ui/gem-selection-summary.mjs
  function targetRows(runtime, name, replaced) {
    const equippedSupports = runtime.deps.game.equippedSupports.filter((gem) => gem !== replaced && gem !== name).concat(name);
    const result = runtime.deps.window.GameModules.skills.supports.targets(name, { ...runtime.deps.game, equippedSupports });
    return [
      { ...result.main, role: "main" },
      { ...result.mobility, role: "mobility" },
      ...result.summons.map((row) => ({ ...row, role: "summon" }))
    ];
  }
  function targetCount(runtime, name, replaced) {
    return targetRows(runtime, name, replaced).filter((row) => row.status === "on").length;
  }
  function application(runtime, name, stats, replaced) {
    const roles = [...new Set(targetRows(runtime, name, replaced).filter((row) => row.status === "on").map((row) => runtime.state.TARGET_LABELS[row.role]))];
    return roles.length ? (0, runtime.deps._t)("적용: {roles}", { roles: roles.join(", ") }) : "맞는 스킬 없음";
  }
  function indicators(runtime, name, replaced) {
    const rows = targetRows(runtime, name, replaced);
    return '<span class="support-targets" aria-label="' + (0, runtime.deps._t)("스킬별 적용") + '">' + Object.entries(runtime.state.TARGET_LABELS).map(([role, rawLabel]) => {
      const label = (0, runtime.deps._t)(rawLabel);
      const group = rows.filter((row) => row.role === role);
      const status = ["on", "na", "off", "buff", "empty"].find((key) => group.some((row) => row.status === key)) || "empty";
      const text = group.map((row) => `${row.name ? (0, runtime.deps._t)(row.name) : label}: ${row.reason || (0, runtime.deps._t)(runtime.state.TARGET_STATES[row.status])}`).join(", ") || (0, runtime.deps._t)(runtime.state.TARGET_STATES.empty);
      return `<span class="support-target is-${status}" data-tip="${(0, runtime.deps.escapeHTML)(text)}" aria-label="${label}: ${(0, runtime.deps.escapeHTML)(text)}"><i aria-hidden="true"></i>${label === "주 공격" ? (0, runtime.deps._t)("주") : label.slice(0, 1)}</span>`;
    }).join("") + "</span>";
  }
  function effectText(runtime, name, tier, stats) {
    const def = runtime.deps.SUPPORT_GEM_DB[name];
    if (def.tierValues) return runtime.deps.window.GameModules.skills.supports.describe(name, tier, runtime.deps.game);
    const info = (0, runtime.deps.getUiGemPresentation)(name, true, stats);
    const value = info.value / (0, runtime.deps.getSupportTierMultiplier)(name, (0, runtime.deps.getSupportActiveTier)(name)) * (0, runtime.deps.getSupportTierMultiplier)(name, tier);
    return `${(0, runtime.deps._t)(info.statName)} +${(0, runtime.deps.formatSupportGemEffectValue)(value)}${def.isPct ? "%" : ""}`;
  }
  function targetDetails(runtime, name, stats, replaced) {
    const effect = effectText(runtime, name, (0, runtime.deps.getSupportActiveTier)(name), stats);
    return `<div class="support-target-details">${targetRows(runtime, name, replaced).map((row) => `<p class="is-${row.status}"><b>${(0, runtime.deps._t)(runtime.state.TARGET_LABELS[row.role])}${row.name ? ` · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}` : ""}</b><span>${(0, runtime.deps.escapeHTML)(row.status === "on" ? effect : row.reason || runtime.state.TARGET_STATES[row.status])}</span></p>`).join("")}</div>`;
  }
  function summonEffect(runtime, name, stats) {
    const def = runtime.deps.SKILL_DB[name];
    if (def.aura) {
      const info = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
      const steps = (0, runtime.deps.getGemLevelGrowthSteps)(info.finalLevel);
      const rows = def.aura.stats.slice();
      if (def.aura.flatStat) rows.unshift({ stat: def.aura.flatStat, base: def.aura.flatBase, scale: def.aura.flatScale });
      return rows.map((row) => `${(0, runtime.deps._t)((0, runtime.deps.getStatName)(row.stat)).replace(/\(%\)$/, "")} +${(0, runtime.deps.formatSupportGemEffectValue)(row.base + steps * row.scale)}${runtime.deps.P_STATS[row.stat]?.isPct ? "%" : ""}`).join(", ");
    }
    if (def.tags.includes("summon_guard")) {
      const preview = (0, runtime.deps.getSummonTooltipPreview)(name, stats);
      return (0, runtime.deps._t)("생명력 {floor}, 적중 피해 {redirectPct}% 대신 받음", { floor: Math.floor(preview.maxHp).toLocaleString(), redirectPct: preview.redirectPct });
    }
    return "";
  }
  function skillSummary(runtime, role, name, stats) {
    const key = role === "active" ? "main" : role;
    const rows = runtime.deps.game.equippedSupports.filter((support) => targetRows(runtime, support).some((row) => row.role === key && row.name === name && row.status === "on"));
    return `<div class="support-skill-summary"><b>${(0, runtime.deps._t)("{name}: 적용 보조 {length}개", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name || runtime.state.TARGET_LABELS[key])), length: rows.length })}</b><span>${rows.map((support) => (0, runtime.deps.escapeHTML)(effectText(runtime, support, (0, runtime.deps.getSupportActiveTier)(support), stats))).join(", ") || (0, runtime.deps._t)("현재 적용되는 보조 효과가 없습니다.")}</span></div>`;
  }
  function migrationNotice(runtime) {
    const migration = runtime.deps.game.saveMeta?.supportRuneMigration;
    if (!migration?.noticePending) return;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("보조룬 개편: {map} 이전, 창공의 정수 {refund}개 환급. 소환 칸에서 사역룬을 확인하세요.", { map: migration.moved.map(runtime.deps.escapeHTML).join(", "), refund: migration.refund }), "loot-unique", { toast: true });
    migration.noticePending = false;
  }

  // modules/ui/gem-selection-actions.mjs
  function close(runtime) {
    const root = runtime.deps.document.getElementById("gem-selection");
    if (root?.matches(":popover-open")) root.hidePopover();
    runtime.state.selection?.anchor.classList.remove("is-gem-selected");
    runtime.state.selection = null;
  }
  function createPanel(runtime) {
    let root = runtime.deps.document.getElementById("gem-selection");
    if (root) {
      bindSelectionPanel(runtime, root);
      return root;
    }
    root = runtime.deps.document.createElement("section");
    root.id = "gem-selection";
    root.setAttribute("popover", "auto");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", (0, runtime.deps._t)("룬 상세"));
    root.innerHTML = '<div class="gem-selection-actions"></div><div class="gem-selection-content"></div>';
    runtime.state.ownsPanel = true;
    bindSelectionPanel(runtime, root);
    runtime.deps.document.getElementById("tab-skills").append(root);
    return root;
  }
  function open(runtime, anchor, type, name) {
    if (!runtime.active) return;
    if (type === "support") {
      close(runtime);
      runtime.deps.gemSlotDialog.open("support", runtime.deps.game.equippedSupports.includes(name) ? name : "", name);
      return;
    }
    close(runtime);
    runtime.state.selection = { anchor, type, name, owner: runtime.deps.game };
    anchor.classList.add("is-gem-selected");
    (0, runtime.deps.hideInfoTooltip)();
    const root = createPanel(runtime);
    root.querySelector(".gem-selection-actions").innerHTML = actions(runtime, type, name, anchor);
    const content = root.querySelector(".gem-selection-content");
    (0, runtime.deps.showGemTooltip)(null, type, name, content);
    const compare = comparison(runtime, type, name, anchor);
    if (compare) content.prepend(compare);
    if (type === "support") {
      const note = runtime.deps.document.createElement("p");
      note.className = "gem-application-note";
      note.textContent = application(runtime, name, (0, runtime.deps.getUiPlayerStats)());
      content.prepend(note);
    }
    if (anchor.classList.contains("equipment-blocked")) {
      const warning = runtime.deps.document.createElement("p");
      warning.className = "condition-rule-warning";
      warning.textContent = anchor.querySelector(".gem-usage-state").textContent;
      content.prepend(warning);
    }
    root.showPopover();
    position(runtime);
    root.querySelector("button:not(:disabled)").focus({ preventScroll: true });
  }
  function act(runtime, event) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) {
      close(runtime);
      return;
    }
    const button = event.target.closest("[data-gem-action]");
    if (!button || !runtime.state.selection) return;
    const current = { type: runtime.state.selection.type, name: runtime.state.selection.name };
    close(runtime);
    runtime.state.ACTIONS[button.dataset.gemAction]?.(current, button);
  }
  function quickEquip(runtime, event) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) {
      close(runtime);
      return;
    }
    if (!runtime.state.selection || event.target.closest("button")) return;
    const { anchor, type, name } = runtime.state.selection;
    if (!anchor.contains(event.target) || anchor.matches(".active,.equipment-blocked")) return;
    event.preventDefault();
    close(runtime);
    if (type === "support") (0, runtime.deps.toggleSupport)(name);
    else (0, runtime.deps.changeSkill)(name);
  }
  function popoverBounds(runtime, anchor) {
    const nav = runtime.deps.document.getElementById("tab-header-bottom");
    const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    const whole = { left: 0, top: 0, right: runtime.deps.innerWidth, bottom: runtime.deps.innerHeight };
    const frame = anchor.closest(".ui-window-open")?.getBoundingClientRect() || whole, pane = anchor.closest(".tab-content")?.getBoundingClientRect() || whole;
    return {
      left: Math.max(0, frame.left, pane.left),
      top: Math.max(0, frame.top, pane.top),
      right: Math.min(runtime.deps.innerWidth, frame.right, pane.right),
      bottom: Math.min(floor, frame.bottom, pane.bottom)
    };
  }
  function popoverSpot(runtime, anchor, size, bounds) {
    const minX = bounds.left + runtime.state.POPOVER_GAP, maxX = bounds.right - runtime.state.POPOVER_GAP - size.width;
    const minY = bounds.top + runtime.state.POPOVER_GAP, maxY = bounds.bottom - runtime.state.POPOVER_GAP - size.height;
    const fitY = (y) => Math.max(minY, Math.min(maxY, y));
    if (anchor.right + runtime.state.POPOVER_GAP <= maxX) return { x: anchor.right + runtime.state.POPOVER_GAP, y: fitY(anchor.top) };
    if (anchor.left - runtime.state.POPOVER_GAP - size.width >= minX) return { x: anchor.left - runtime.state.POPOVER_GAP - size.width, y: fitY(anchor.top) };
    const x = Math.max(minX, Math.min(maxX, anchor.left));
    if (anchor.bottom + runtime.state.POPOVER_GAP <= maxY) return { x, y: anchor.bottom + runtime.state.POPOVER_GAP };
    return { x, y: fitY(anchor.top - runtime.state.POPOVER_GAP - size.height) };
  }
  function placeSheet(runtime, root) {
    const nav = runtime.deps.document.getElementById("tab-header-bottom");
    const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    root.style.left = root.style.top = "";
    root.style.bottom = `${(runtime.deps.innerHeight - floor) / runtime.deps.uiDisplay.factor}px`;
    root.style.maxHeight = `${floor * 0.72 / runtime.deps.uiDisplay.factor}px`;
  }
  function position(runtime) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) {
      close(runtime);
      return;
    }
    if (!runtime.state.selection) return;
    const root = runtime.deps.document.getElementById("gem-selection");
    if (!root.matches(":popover-open")) return;
    if (!runtime.state.selection.anchor.isConnected || !runtime.state.selection.anchor.getClientRects().length) {
      close(runtime);
      return;
    }
    const sheet = runtime.deps.uiDisplay.matches("(max-width: 1080px)");
    root.classList.toggle("is-sheet", sheet);
    if (sheet) {
      placeSheet(runtime, root);
      return;
    }
    root.style.bottom = "";
    const bounds = popoverBounds(runtime, runtime.state.selection.anchor);
    root.style.maxHeight = `${(bounds.bottom - bounds.top - 2 * runtime.state.POPOVER_GAP) / runtime.deps.uiDisplay.factor}px`;
    const spot = popoverSpot(runtime, runtime.state.selection.anchor.getBoundingClientRect(), root.getBoundingClientRect(), bounds);
    root.style.left = `${spot.x / runtime.deps.uiDisplay.factor}px`;
    root.style.top = `${spot.y / runtime.deps.uiDisplay.factor}px`;
  }
  function bindSelectionPanel(runtime, root) {
    if (runtime.state.panel === root) return;
    if (runtime.state.panel) releaseViewTarget(runtime, runtime.state.panel);
    runtime.state.panel = root;
    listenView(runtime, root, "toggle", (event) => {
      if (event.newState === "closed") close(runtime);
      if (typeof runtime.deps.tutorialActionUi === "object") runtime.deps.tutorialActionUi.refresh();
    });
    listenView(runtime, root, "click", runtime.handlers.act);
  }

  // modules/ui/gem-selection-view.mjs
  function createGemSelectionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { act, open, close, application, previewStats, compareHtml, indicators, targetRows, targetCount, targetDetails, effectText, summonEffect, skillSummary, migrationNotice, position, quickEquip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      open: runtime.handlers.open,
      close: runtime.handlers.close,
      application: runtime.handlers.application,
      preview: runtime.handlers.previewStats,
      compareHtml: runtime.handlers.compareHtml,
      indicators: runtime.handlers.indicators,
      targetRows: runtime.handlers.targetRows,
      targetCount: runtime.handlers.targetCount,
      targetDetails: runtime.handlers.targetDetails,
      effectText: runtime.handlers.effectText,
      summonEffect: runtime.handlers.summonEffect,
      skillSummary: runtime.handlers.skillSummary,
      migrationNotice: runtime.handlers.migrationNotice,
      dispose: () => disposeGemSelection(runtime)
    });
    listenView(runtime, runtime.deps.document, "scroll", runtime.handlers.position, true);
    listenView(runtime, runtime.deps.document, "dblclick", runtime.handlers.quickEquip);
    listenView(runtime, runtime.deps.window, "resize", runtime.handlers.position);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.POPOVER_GAP = 8;
    runtime.state.selection = null;
    runtime.state.TARGET_LABELS = Object.freeze({ main: "주 공격", mobility: "이동", summon: "소환" });
    runtime.state.TARGET_STATES = Object.freeze({ on: "적용", off: "태그가 맞지 않음", empty: "장착한 스킬 없음", na: "소환수 대응 효과 없음", buff: "사역룬은 보조 대상 아님" });
    runtime.state.ACTIONS = Object.freeze({
      equip: ({ type, name }) => type === "support" ? (0, runtime.deps.toggleSupport)(name) : (0, runtime.deps.changeSkill)(name),
      enhance: ({ name }) => (0, runtime.deps.openEquippedGemManagement)(name),
      "summon-more": ({ name }) => (0, runtime.deps.changeSummonSkillCount)(name, 1),
      "summon-less": ({ name }) => (0, runtime.deps.changeSummonSkillCount)(name, -1),
      seal: ({ type, name }) => type === "support" ? (0, runtime.deps.sealSupportGem)(name) : (0, runtime.deps.sealSkillGem)(name),
      tier: ({ name }, button) => (0, runtime.deps.setSupportActiveTier)(name, Number(button.dataset.tier))
    });
  }
  function disposeGemSelection(runtime) {
    releaseViewEvents(runtime);
    close(runtime);
    if (runtime.state.ownsPanel) runtime.state.panel?.remove();
    runtime.state.panel = null;
  }

  // modules/gem-selection-ui-classic.mjs
  var gemSelectionUi = createGemSelectionView({
    get game() {
      return window.GameModules.state.game;
    },
    get window() {
      return window;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get getSupportTierMultiplier() {
      return getSupportTierMultiplier;
    },
    get getSupportActiveTier() {
      return getSupportActiveTier;
    },
    get formatSupportGemEffectValue() {
      return formatSupportGemEffectValue;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getGemLevelGrowthSteps() {
      return getGemLevelGrowthSteps;
    },
    get getStatName() {
      return getStatName;
    },
    get P_STATS() {
      return P_STATS;
    },
    get getSummonTooltipPreview() {
      return getSummonTooltipPreview;
    },
    get addLog() {
      return addLog;
    },
    get document() {
      return document;
    },
    get tutorialActionUi() {
      return typeof tutorialActionUi === "undefined" ? void 0 : tutorialActionUi;
    },
    get getSupportTierCap() {
      return getSupportTierCap;
    },
    get getSummonSkillCount() {
      return getSummonSkillCount;
    },
    get getEquippedEnhanceableGemNames() {
      return getEquippedEnhanceableGemNames;
    },
    get skillGemBoardUi() {
      return skillGemBoardUi;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get getSkillGemSealRefusal() {
      return getSkillGemSealRefusal;
    },
    get previewBuildStats() {
      return previewBuildStats;
    },
    get COMPARE_STAT_META() {
      return COMPARE_STAT_META;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get gemSlotDialog() {
      return gemSlotDialog;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get toggleSupport() {
      return toggleSupport;
    },
    get changeSkill() {
      return changeSkill;
    },
    get innerHeight() {
      return innerHeight;
    },
    get innerWidth() {
      return innerWidth;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get openEquippedGemManagement() {
      return openEquippedGemManagement;
    },
    get changeSummonSkillCount() {
      return changeSummonSkillCount;
    },
    get sealSupportGem() {
      return sealSupportGem;
    },
    get sealSkillGem() {
      return sealSkillGem;
    },
    get setSupportActiveTier() {
      return setSupportActiveTier;
    }
  });
  safeExposeGlobals({ gemSelectionUi });
})();
