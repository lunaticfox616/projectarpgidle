// GENERATED from modules/ui-runtime-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/domain/hero-selection.mjs
  function createHeroSelectionRules(defs) {
    return Object.freeze({
      definition: (id) => defs.classes[id] || defs.talents[id] || defs.classes.archer,
      validClass: (id) => !!defs.classes[id],
      appearance: (owner) => heroSelectionAppearance(defs, owner),
      normalize: (owner, options) => heroSelectionNormalize(defs, owner, options),
      select: (owner, id, options) => heroSelectionSetClass(defs, owner, id, options),
      cosmetic: (owner, id) => heroSelectionCosmetic(defs, owner, id),
      mode: (owner, value) => heroSelectionMode(defs, owner, value),
      markInitialized: (owner) => {
        owner.heroSelectionInitialized = true;
      },
      initialize: (owner, stats, hpCap) => {
        owner.playerHp = hpCap;
        owner.playerEnergyShield = stats.energyShield;
      }
    });
  }
  function heroSelectionAppearance(defs, owner) {
    const selected = owner && defs.classes[owner.selectedClassId] ? owner.selectedClassId : "archer";
    if (!owner?.settings || owner.settings.heroAppearanceMode !== "fixed") return selected;
    return defs.classes[owner.appearanceClassId] ? owner.appearanceClassId : selected;
  }
  function heroSelectionNormalize(defs, owner, options = {}) {
    if (!Array.isArray(owner.discoveredClassIds)) owner.discoveredClassIds = [];
    owner.discoveredClassIds = owner.discoveredClassIds.filter((id) => defs.classes[id]);
    normalizeIdentity(defs, owner);
    const record = options.recordSelected || owner.heroSelectionInitialized || owner.classFreeSwitchUnlocked;
    if (record && !owner.discoveredClassIds.includes(owner.selectedClassId)) owner.discoveredClassIds.push(owner.selectedClassId);
    const wasUnlocked = !!owner.classFreeSwitchUnlocked;
    if (owner.discoveredClassIds.length >= defs.order.length) owner.classFreeSwitchUnlocked = true;
    return !wasUnlocked && !!owner.classFreeSwitchUnlocked;
  }
  function normalizeIdentity(defs, owner) {
    if (!defs.classes[owner.selectedClassId]) owner.selectedClassId = "archer";
    if (!defs.talents[owner.selectedHeroId]) owner.selectedHeroId = "hero1";
    owner.talentSelectionInitialized = !!owner.talentSelectionInitialized;
    if (owner.appearanceClassId && !defs.classes[owner.appearanceClassId]) owner.appearanceClassId = null;
  }
  function heroSelectionSetClass(defs, owner, id, options = {}) {
    if (!defs.classes[id]) return false;
    const oldAppearance = heroSelectionAppearance(defs, owner), initialized = !!owner.heroSelectionInitialized;
    owner.selectedClassId = id;
    if (options.alignTalent || !initialized || !owner.talentSelectionInitialized) {
      owner.selectedHeroId = defs.classes[id].recommendedTalentHeroId;
      owner.talentSelectionInitialized = true;
    }
    if (owner.settings.heroAppearanceMode === "fixed" && (!initialized || !defs.classes[owner.appearanceClassId])) {
      owner.appearanceClassId = initialized ? oldAppearance : id;
    }
    return true;
  }
  function heroSelectionCosmetic(defs, owner, id) {
    if (!defs.classes[id] || !owner.classFreeSwitchUnlocked || owner.settings.heroAppearanceMode !== "fixed") return false;
    owner.appearanceClassId = id;
    return true;
  }
  function heroSelectionMode(defs, owner, value) {
    const next = value === "fixed" ? "fixed" : "loop";
    const previous = owner.settings.heroAppearanceMode === "fixed" ? "fixed" : "loop";
    const oldAppearance = heroSelectionAppearance(defs, owner);
    owner.settings.heroAppearanceMode = next;
    if (next === "fixed") owner.appearanceClassId = oldAppearance;
    return previous !== next;
  }

  // modules/ui/hero-selection-controls.mjs
  function syncHeroSelectionState(runtime, source, options = {}) {
    const { deps } = runtime;
    if (deps.rules.normalize(deps.game, options)) {
      deps.addLog(deps._t("모든 직업을 경험했습니다. 설정에서 외형을 자유롭게 변경할 수 있습니다."), "season-up");
    }
    if (source !== "init") renderHeroSummary(runtime);
  }
  function renderHeroSummary({ deps }) {
    const owner = deps.game, el = deps.document.getElementById("ui-hero-talent-summary");
    if (!el) return;
    const def = deps.rules.definition(owner.selectedClassId);
    const look = deps.rules.definition(deps.rules.appearance(owner));
    const discovered = Math.min(deps.PLAYER_CLASS_ORDER.length, owner.discoveredClassIds.length);
    const unlockText = owner.classFreeSwitchUnlocked ? deps._t("외형 변경 해금됨, 외형: {label}", { label: look.label }) : deps._t("경험한 직업 {discovered}/{length}", { discovered, length: deps.PLAYER_CLASS_ORDER.length });
    const modeText = owner.settings?.heroAppearanceMode === "fixed" ? deps._t("고정") : deps._t("현재 직업 연동");
    el.innerText = deps._t("{label}, {unlockText}, 외형: {modeText}", { label: deps._t(def.label), unlockText, modeText });
  }
  function renderHeroSelectionControls(runtime) {
    const { deps } = runtime, owner = deps.game;
    const el = deps.document.getElementById("sel-active-hero");
    if (!el) return;
    const mode = owner.settings?.heroAppearanceMode === "fixed" ? "fixed" : "loop";
    const modeEl = deps.document.getElementById("sel-hero-appearance-mode");
    if (modeEl) modeEl.value = mode;
    el.innerHTML = deps.PLAYER_CLASS_ORDER.map((id) => `<option value="${id}">${deps._t(deps.PLAYER_CLASS_DEFS[id].label)}</option>`).join("");
    el.value = deps.rules.appearance(owner);
    el.disabled = mode !== "fixed" || !owner.classFreeSwitchUnlocked;
    el.dataset.tip = mode !== "fixed" ? deps._t("루프마다 선택한 현재 직업의 외형을 사용합니다.") : !owner.classFreeSwitchUnlocked ? deps._t("다른 외형 선택은 여섯 직업을 한 번씩 경험하면 해금됩니다.") : "";
    syncHeroSelectionState(runtime);
  }
  function onHeroAppearanceModeChanged(runtime) {
    const el = runtime.deps.document.getElementById("sel-hero-appearance-mode");
    if (!el) return;
    runtime.handlers.applyHeroAppearanceMode(el.value);
    runtime.deps.updateStaticUI();
  }
  function onHeroSelectionChanged(runtime) {
    const { deps } = runtime, el = deps.document.getElementById("sel-active-hero");
    if (!el) return;
    if (!deps.game.classFreeSwitchUnlocked) {
      deps.addLog(deps._t("아직 자유 변경이 잠겨 있습니다. 루프를 돌며 여섯 직업을 모두 경험하세요."), "attack-monster");
      el.value = deps.rules.appearance(deps.game);
      return;
    }
    runtime.handlers.applyHeroSelection(el.value, { cosmeticOnly: true });
    deps.updateStaticUI();
  }

  // modules/ui/hero-selection-actions.mjs
  function persistHeroSelectionChange({ deps }, reason) {
    if (!deps.saveGame({ skipCloudSync: true })) return;
    if (typeof deps.requestImmediateCloudSave === "function") deps.requestImmediateCloudSave(reason || "플레이어 직업 변경");
  }
  function applyHeroSelection(runtime, id, options = {}) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.rules.validClass(id)) return false;
    if (options.cosmeticOnly) return applyCosmetic(runtime, id, options);
    const previous = owner.selectedClassId, look = deps.rules.appearance(owner);
    const refunded = deps.rebasePassiveTreeForClassChange(previous, id);
    deps.rules.select(owner, id, options);
    if (previous !== id || refunded > 0) {
      deps.calculateReachableNodes();
      deps.refreshPassiveVisibility();
    }
    syncHeroSelectionState(runtime, null, { recordSelected: true });
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent) reportClassChange(runtime, id, previous, refunded);
    if (!options.skipSave) persistHeroSelectionChange(runtime, "플레이어 직업 변경");
    return true;
  }
  function reportClassChange({ deps }, id, previous, refunded) {
    if (previous !== id) deps.addLog(deps._t("직업 변경: {label}", { label: deps._t(deps.rules.definition(id).label) }), "season-up");
    if (refunded > 0) deps.addLog(deps._t("직업 시작점 변경으로 패시브 {refundedPassiveCount}개를 반환했습니다.", { refundedPassiveCount: refunded }), "season-up");
  }
  function applyCosmetic(runtime, id, options) {
    const { deps } = runtime, look = deps.rules.appearance(deps.game);
    if (!deps.rules.cosmetic(deps.game, id)) return false;
    syncHeroSelectionState(runtime);
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent && look !== id) deps.addLog(deps._t("캐릭터 외형 변경: {label}", { label: deps._t(deps.rules.definition(id).label) }), "season-up");
    if (!options.skipSave) persistHeroSelectionChange(runtime, "캐릭터 외형 변경");
    return true;
  }
  function applyHeroAppearanceMode(runtime, value, options = {}) {
    const { deps } = runtime, look = deps.rules.appearance(deps.game);
    const changed = deps.rules.mode(deps.game, value);
    syncHeroSelectionState(runtime);
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent && changed) {
      const label = deps.game.settings.heroAppearanceMode === "fixed" ? deps._t("고정") : deps._t("현재 직업 연동");
      deps.addLog(deps._t("캐릭터 외형 방식: {label}", { label }), "season-up");
    }
    if (!options.skipSave && changed) persistHeroSelectionChange(runtime, "캐릭터 외형 방식 변경");
    return changed;
  }
  function refreshAppearance({ deps }, previous) {
    if (previous !== deps.rules.appearance(deps.game) && deps.battleAssets?.ready) deps.battleAssets.atlas = deps.buildBattleAssetAtlas();
  }

  // modules/ui/hero-selection-markup.mjs
  function buildHeroChoiceTooltipHtml({ deps }, classId, experienced) {
    const def = deps.PLAYER_CLASS_DEFS[classId];
    if (!def) return "";
    const basic = deps.BASIC_SKILL_WEAPONS.find((row) => row.family === deps.basicSkills.familyOf(classId));
    return `<div class="tooltip-title">${deps.escapeHTML(deps._t(def.label))}${experienced ? deps._t(' <span style="color:#9fd8ff;">경험함</span>') : ""}</div>
        ${basic ? `<div class="tooltip-line" style="color:#f6c461;">${deps.escapeHTML(deps._t("기초 스킬: {name}, 속성은 골라서 받습니다", { name: deps._t(basic.base) }))}</div>
        <div class="tooltip-line">${deps.escapeHTML(deps._t(basic.desc))}</div>` : ""}
        <div class="tooltip-line" style="color:#d8b4ff;">전직: ${deps.escapeHTML(deps.getAscendanciesForClass(classId).map((id) => deps.CLASS_TEMPLATES[id].name).join(", "))}</div>`;
  }
  function showHeroChoiceTooltip(runtime, event, classId, experienced) {
    const { deps } = runtime;
    if (typeof deps.showInfoTooltipHtml !== "function" || deps.uiDisplay.matches("(max-width: 1080px)")) return;
    deps.showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(runtime, classId, !!experienced), "#f6c461");
  }
  function renderLoopHeroChoiceDetail(runtime, classId, experienced) {
    const { document: document2 } = runtime.deps;
    const detail = document2.getElementById("loop-hero-select-detail"), start = document2.getElementById("loop-hero-select-start");
    if (!detail || !start) return;
    detail.innerHTML = classId ? buildHeroChoiceTooltipHtml(runtime, classId, !!experienced) : "";
    start.value = classId || "";
    start.disabled = !classId;
    if (!classId) return;
    document2.querySelectorAll("#loop-hero-select-grid [data-class-id]").forEach((card) => {
      const selected = card.dataset.classId === classId;
      card.setAttribute("aria-pressed", String(selected));
      if (selected) card.scrollIntoView({ block: "nearest" });
    });
  }
  function loopHeroMutationHtml({ deps }) {
    const rule = deps.loopMutation.current();
    if (!rule) return "";
    return `<span class="loop-hero-mutation">${deps.escapeHTML(deps._t(rule.empowered ? "강화 변이시간선" : "변이시간선"))}: ${deps.loopMutation.partsHtml(rule, ", ")}</span>`;
  }
  function heroChoicesHtml({ deps }) {
    const experienced = new Set(deps.game.heroSelectionInitialized && Array.isArray(deps.game.discoveredClassIds) ? deps.game.discoveredClassIds : []);
    return deps.PLAYER_CLASS_ORDER.map((id) => {
      const def = deps.PLAYER_CLASS_DEFS[id], known = experienced.has(id);
      const badge = known ? '<span class="hero-choice-badge">경험함</span>' : "";
      return `<button class="reward-choice hero-choice" aria-label="${deps._t("{label} 선택", { label: deps.escapeHTML(deps._t(def.label)) })}" data-class-id="${deps.escapeHTML(id)}" data-experienced="${known}" data-info-tooltip-anchor="1">${badge}<img class="hero-choice-portrait" src="${deps.escapeHTML(def.portrait)}" alt="" draggable="false"><strong>${deps.escapeHTML(deps._t(def.label))}</strong></button>`;
    }).join("");
  }
  function loopBasicSkillCardHtml({ deps }, name, ele, rule) {
    const weak = rule && rule.weak === ele ? deps._t(", 약점 피해 +{weakTakenPct}%", { weakTakenPct: deps.LOOP_MUTATION.weakTakenPct }) : "";
    return `<button type="button" class="basic-skill-choice" style="--basic-ele:${deps.getElementColor(ele)}" data-basic-element="${ele}">
        <img class="basic-skill-icon" src="${deps.escapeHTML(deps.SKILL_GEM_ART_PATHS[name] || "")}" alt="" draggable="false">
        <strong>${deps.escapeHTML(deps._t(name))}</strong><span class="basic-skill-element">${deps.escapeHTML(deps._t(deps.DAMAGE_ELEMENT_LABELS[ele]) + weak)}</span>
        <small>${deps.escapeHTML(deps._t(deps.SKILL_DB[name].desc))}</small></button>`;
  }

  // modules/ui/hero-selection-session.mjs
  function isLoopHeroSelectOpen({ deps }) {
    return !!deps.document.getElementById("loop-hero-select-overlay")?.classList.contains("active");
  }
  function openLoopHeroSelection(runtime, onSelect, options = {}) {
    const { deps } = runtime, doc = deps.document;
    const overlay = doc.getElementById("loop-hero-select-overlay"), grid = doc.getElementById("loop-hero-select-grid");
    if (!overlay || !grid) {
      deps.console.error("직업 선택 화면을 열 수 없습니다: 필수 DOM이 없습니다.");
      return false;
    }
    runtime.owner = deps.game;
    runtime.onSelect = typeof onSelect === "function" ? onSelect : null;
    runtime.basicClass = null;
    runtime.elements = [];
    renderHeroSelectionHeading(runtime, options);
    grid.classList.remove("is-basic-pick");
    grid.innerHTML = heroChoicesHtml(runtime);
    renderLoopHeroChoiceDetail(runtime, null);
    overlay.classList.add("active");
    grid.parentElement.scrollTo(0, 0);
    return true;
  }
  function renderHeroSelectionHeading(runtime, options) {
    const { deps } = runtime, doc = deps.document;
    const kicker = doc.getElementById("loop-hero-select-kicker"), title = doc.getElementById("loop-hero-select-title");
    const body = doc.getElementById("loop-hero-select-body");
    if (kicker) kicker.innerText = options.kicker || deps._t("다음 루프");
    if (title) title.innerText = options.title || deps._t("다음 루프 직업 선택");
    if (body) body.innerHTML = deps.escapeHTML(options.body || deps._t("이번 루프에서 사용할 직업을 선택하세요.")) + loopHeroMutationHtml(runtime);
  }
  function acceptsHeroChoice(runtime) {
    if (!runtime.active || !runtime.owner) return false;
    if (runtime.owner === runtime.deps.game) return true;
    resetHeroSelectionForSave(runtime);
    return false;
  }
  function closeHeroSelection(runtime) {
    runtime.deps.document.getElementById("loop-hero-select-overlay")?.classList.remove("active");
    runtime.deps.document.getElementById("loop-hero-select-grid")?.classList.remove("is-basic-pick");
    runtime.owner = null;
    runtime.onSelect = null;
    runtime.basicClass = null;
    runtime.elements = [];
  }
  function finishLoopHeroChoice(runtime, classId) {
    if (!acceptsHeroChoice(runtime)) return;
    const callback = runtime.onSelect;
    closeHeroSelection(runtime);
    if (typeof callback === "function") callback(classId);
    runtime.deps.session.lastTime = runtime.deps.Date.now();
  }
  function ensureInitialHeroSelection(runtime) {
    if (runtime.deps.game.heroSelectionInitialized) return true;
    if (isLoopHeroSelectOpen(runtime)) {
      if (runtime.owner === runtime.deps.game) return true;
      closeHeroSelection(runtime);
    }
    const { deps } = runtime, owner = deps.game;
    return openLoopHeroSelection(runtime, (id) => finishInitialChoice(runtime, owner, id), {
      kicker: deps._t("첫 루프"),
      title: deps._t("시작 직업 선택"),
      body: deps._t("첫 루프에서 사용할 직업을 선택하세요.")
    });
  }
  function finishInitialChoice(runtime, owner, id) {
    const { deps } = runtime;
    if (!runtime.active || owner !== deps.game) return;
    deps.rules.markInitialized(owner);
    const stats = deps.getUiPlayerStats();
    deps.rules.initialize(owner, stats, deps.getPlayerHpCap(stats));
    deps.updateCombatUI(stats);
    deps.addLog(deps._t("시작 직업을 선택했습니다: {blindLabel}", { blindLabel: deps.PLAYER_CLASS_DEFS[id].blindLabel }), "season-up");
    persistHeroSelectionChange(runtime, "시작 직업 선택");
    deps.openingJourney.afterStartPick();
  }
  function resetHeroSelectionForSave(runtime) {
    const wasOpen = isLoopHeroSelectOpen(runtime);
    closeHeroSelection(runtime);
    if (wasOpen && !runtime.deps.game.heroSelectionInitialized) ensureInitialHeroSelection(runtime);
  }

  // modules/ui/hero-selection-choice.mjs
  function pressLoopHeroChoice(runtime, classId, experienced) {
    if (!acceptsHeroChoice(runtime) || runtime.basicClass) return;
    const start = runtime.deps.document.getElementById("loop-hero-select-start");
    if (!runtime.deps.uiDisplay.matches("(max-width: 1080px)") || start?.value === classId) return chooseLoopHero(runtime, classId);
    renderLoopHeroChoiceDetail(runtime, classId, experienced);
  }
  function chooseLoopHero(runtime, classId) {
    if (!acceptsHeroChoice(runtime) || runtime.basicClass || !runtime.deps.rules.validClass(classId)) return;
    applyHeroSelection(runtime, classId, { silent: true, skipSave: true, alignTalent: true });
    openLoopBasicSkillPick(runtime, classId);
  }
  function openLoopBasicSkillPick(runtime, classId) {
    if (!acceptsHeroChoice(runtime)) return;
    const { deps } = runtime, grid = deps.document.getElementById("loop-hero-select-grid"), family = deps.basicSkills.familyOf(classId);
    if (!grid || !family) {
      if (family) deps.basicSkills.grant(deps.game, classId, deps.basicSkills.autoPick(deps.game));
      return finishLoopHeroChoice(runtime, classId);
    }
    runtime.basicClass = classId;
    runtime.elements = deps.basicSkills.offer(deps.game);
    const rule = deps.loopMutation.of(deps.game.season);
    deps.document.getElementById("loop-hero-select-title").innerText = deps._t("시작 속성 선택");
    deps.document.getElementById("loop-hero-select-body").innerHTML = deps.escapeHTML(deps._t("{label}의 기초 스킬 속성을 고르세요.", { label: deps._t(deps.PLAYER_CLASS_DEFS[classId].label) })) + loopHeroMutationHtml(runtime);
    grid.classList.add("is-basic-pick");
    grid.innerHTML = runtime.elements.map((ele) => loopBasicSkillCardHtml(runtime, deps.basicSkills.nameOf(family, ele), ele, rule)).join("");
    renderLoopHeroChoiceDetail(runtime, null);
    grid.parentElement.scrollTo(0, 0);
  }
  function chooseLoopBasicSkill(runtime, ele) {
    if (!acceptsHeroChoice(runtime) || !runtime.deps.rules.validClass(runtime.basicClass) || !runtime.elements.includes(ele)) return;
    const classId = runtime.basicClass;
    runtime.basicClass = null;
    runtime.deps.basicSkills.grant(runtime.deps.game, classId, ele);
    finishLoopHeroChoice(runtime, classId);
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

  // modules/ui/hero-selection-events.mjs
  function installHeroSelectionEvents(runtime) {
    const { deps } = runtime, overlay = deps.document.getElementById("loop-hero-select-overlay");
    if (overlay) {
      listenView(runtime, overlay, "click", (event) => clickChoice(runtime, event));
      listenView(runtime, overlay, "mouseover", (event) => tooltipChoice(runtime, event));
      listenView(runtime, overlay, "mousemove", (event) => tooltipChoice(runtime, event));
      listenView(runtime, overlay, "mouseout", (event) => {
        const card = event.target.closest("[data-class-id]");
        if (card && !card.contains(event.relatedTarget)) deps.hideInfoTooltip();
      });
    }
    for (const [id, handler] of [["sel-active-hero", "onHeroSelectionChanged"], ["sel-hero-appearance-mode", "onHeroAppearanceModeChanged"]]) {
      const select = deps.document.getElementById(id);
      if (select) listenView(runtime, select, "change", () => runtime.handlers[handler]());
    }
    listenView(runtime, deps.window, "project-idle:loop-hero-selection-requested", (event) => requestSelection(runtime, event));
    listenView(runtime, deps.window, "project-idle:loop-hero-selection-completed", (event) => completeSelection(runtime, event));
  }
  function clickChoice(runtime, event) {
    if (!acceptsHeroChoice(runtime)) return;
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const { handlers, deps } = runtime;
    if (button.dataset.classId) {
      deps.hideInfoTooltip();
      handlers.pressLoopHeroChoice(button.dataset.classId, button.dataset.experienced === "true");
    } else if (button.dataset.basicElement) handlers.chooseLoopBasicSkill(button.dataset.basicElement);
    else if (button.id === "loop-hero-select-start") handlers.chooseLoopHero(button.value);
  }
  function tooltipChoice(runtime, event) {
    if (!acceptsHeroChoice(runtime)) return;
    const card = event.target.closest("[data-class-id]");
    if (card) runtime.handlers.showHeroChoiceTooltip(event, card.dataset.classId, card.dataset.experienced === "true");
  }
  function requestSelection(runtime, event) {
    const { deps, handlers } = runtime, detail = event?.detail;
    if (!detail || typeof detail.select !== "function") return;
    if (handlers.isLoopHeroSelectOpen() || deps.isStartupOverlayOpen() || deps.isLoadingOverlayOpen() || deps.isDeathOverlayOpen()) return;
    detail.handled = handlers.openLoopHeroSelection(detail.select, detail.options || {});
  }
  function completeSelection({ deps }, event) {
    const detail = event?.detail;
    if (!detail) return;
    if (detail.changed) deps.addLog(deps._t("루프 전환 직업: {label}", { label: deps.rules.definition(detail.classId).label }), "season-up");
    deps.switchTab("tab-character");
  }

  // modules/ui/hero-selection-view.mjs
  function createHeroSelectionView(deps) {
    const runtime = { deps, owner: null, onSelect: null, basicClass: null, elements: [], active: true, handlers: {}, listeners: [] };
    const methods = {
      syncHeroSelectionState,
      renderHeroSelectionControls,
      onHeroAppearanceModeChanged,
      onHeroSelectionChanged,
      applyHeroSelection,
      applyHeroAppearanceMode,
      persistHeroSelectionChange,
      isLoopHeroSelectOpen,
      openLoopHeroSelection,
      ensureInitialHeroSelection,
      resetHeroSelectionForSave,
      pressLoopHeroChoice,
      chooseLoopHero,
      openLoopBasicSkillPick,
      chooseLoopBasicSkill,
      showHeroChoiceTooltip
    };
    for (const [name, handler] of Object.entries(methods)) {
      runtime.handlers[name] = (...args) => {
        if (runtime.active) return handler(runtime, ...args);
      };
    }
    installHeroSelectionEvents(runtime);
    return Object.freeze({
      ...runtime.handlers,
      getHeroSelectionDef: (id) => deps.rules.definition(id),
      getHeroAppearanceId: () => deps.rules.appearance(deps.game),
      dispose() {
        if (!runtime.active) return;
        closeHeroSelection(runtime);
        releaseViewEvents(runtime);
      }
    });
  }

  // modules/ui/tactics-data.mjs
  var TACTICS_RULES_LOCK_MESSAGE = "액트 3을 클리어하면 전투 전술이 무료로 해금됩니다.";
  var CONDITION_RULE_LIVE_TEXT = Object.freeze({ on: "지금 맞음", shadow: "위 규칙이 먼저", wait: "기다림", off: "꺼짐" });
  var TACTIC_NOW_LABELS = Object.freeze({ nearest: "가까운 적부터", weakest: "약한 적부터", dangerous: "위험한 적부터", dense: "밀집 지역부터", auto: "거리 자동", pressure: "압박", keepRange: "거리 유지" });

  // modules/ui/tactics-live.mjs
  function getConditionRuleLiveState(runtime, rule, locked, pStats, now) {
    if (!rule.enabled) return "off";
    if (!(0, runtime.deps.rules.evaluateConditionPatternRule)(rule, pStats, runtime.deps.game, now)) return "wait";
    const action = (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, true).find((row) => row.id === (0, runtime.deps.rules.normalizeConditionPatternRule)(rule).actionType);
    const keys = Object.keys(action && action.tactic || {});
    if (keys.length && keys.every((key) => locked.has(key))) return "shadow";
    keys.forEach((key) => locked.add(key));
    return "on";
  }
  function syncConditionRuleLive(runtime) {
    const panel = runtime.deps.document.getElementById("ui-skill-rules-panel"), now = runtime.deps.document.getElementById("combat-tactics-now");
    if (!panel || !runtime.deps.editor.isOpen(runtime.deps.game)) return;
    const rules = Array.isArray(runtime.deps.game.skillAutoRules) ? runtime.deps.game.skillAutoRules : [], pStats = (0, runtime.deps.getPlayerStats)(), at = (0, runtime.deps.getCombatTime)(), locked = /* @__PURE__ */ new Set();
    const states = [];
    rules.map((rule, index) => ({ rule, index })).sort((a, b) => (a.rule.priority || 0) - (b.rule.priority || 0)).forEach(({ rule, index }) => {
      states[index] = getConditionRuleLiveState(runtime, rule, locked, pStats, at);
    });
    panel.querySelectorAll(".condition-pattern-rule").forEach((card, index) => {
      const state = states[index] || "off", lamp = card.querySelector(".condition-rule-lamp");
      if (card.dataset.live !== state) card.dataset.live = state;
      if (lamp && lamp.textContent !== CONDITION_RULE_LIVE_TEXT[state]) lamp.textContent = CONDITION_RULE_LIVE_TEXT[state];
    });
    const tactic = (0, runtime.deps.rules.resolveConditionalCombatTactics)((0, runtime.deps.normalizeCombatTacticsSettings)(runtime.deps.game.settings), pStats, runtime.deps.game, at);
    const text = (0, runtime.deps._t)("지금: {TACTIC_NOW_LABELS}, {TACTIC_NOW_LABELS2}{value}", { TACTIC_NOW_LABELS: TACTIC_NOW_LABELS[tactic.targetPriority], TACTIC_NOW_LABELS2: TACTIC_NOW_LABELS[tactic.positionMode], value: states.includes("on") ? (0, runtime.deps._t)("(조건부 규칙이 바꿈)") : "" });
    if (now && now.textContent !== text) now.textContent = text;
  }

  // modules/ui/tactics-cards.mjs
  function renderConditionPatternValueControl(runtime, rule, index, trigger) {
    if (!trigger || trigger.valueKind === "none") return "";
    if (trigger.valueKind === "ailment") {
      let values = [["any", "아무 상태이상"], ["ignite", "점화"], ["chill", "냉각"], ["freeze", "동결"], ["shock", "감전"], ["poison", "중독"], ["bleed", "출혈"]];
      return `<select data-condition-field="ailment" data-condition-index="${index}">${values.map(([value, label]) => `<option value="${value}" ${rule.ailmentType === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
    }
    let config = trigger.valueKind === "cells" ? { min: 1, max: 7, suffix: (0, runtime.deps._t)("칸") } : trigger.valueKind === "seconds" ? { min: 1, max: 10, suffix: (0, runtime.deps._t)("초 이내") } : trigger.valueKind === "count" ? { min: 1, max: 30, suffix: (0, runtime.deps._t)("마리") } : { min: 1, max: 100, suffix: "%" };
    return `<input type="number" min="${config.min}" max="${config.max}" value="${rule.triggerValue}" data-condition-field="value" data-condition-index="${index}"><span>${config.suffix}</span>`;
  }
  function getConditionRuleKind(runtime, action) {
    const tactic = action && action.tactic || {};
    if (tactic.targetPriority) return "대상";
    return tactic.positionMode ? "거리" : "귀환";
  }
  function renderConditionRuleHead(runtime, rule, idx, action) {
    return `<div class="condition-rule-head"><b class="condition-rule-rank" data-tip="${(0, runtime.deps._t)("우선순위")}">${idx + 1}</b><span class="condition-rule-kind">${getConditionRuleKind(runtime, action)}</span>
            <span class="condition-rule-lamp"></span><span class="condition-rule-tools">
            <label><input type="checkbox" ${rule.enabled ? "checked" : ""} data-condition-field="enabled" data-condition-index="${idx}"> ${(0, runtime.deps._t)("사용")}</label></span></div>`;
  }
  function renderConditionRuleMoves(runtime, idx) {
    const last = runtime.deps.game.skillAutoRules.length - 1;
    return `<span class="condition-rule-moves"><button aria-label="${(0, runtime.deps._t)("규칙 위로 이동")}" data-condition-action="up" data-condition-index="${idx}" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button aria-label="${(0, runtime.deps._t)("규칙 아래로 이동")}" data-condition-action="down" data-condition-index="${idx}" ${idx === last ? "disabled" : ""}>↓</button>
            <button data-condition-action="remove" data-condition-index="${idx}">${(0, runtime.deps._t)("삭제")}</button></span>`;
  }
  function renderConditionRuleLine(runtime, rule, idx, choice, options) {
    const pick = (rows, current) => rows.map((row) => `<option value="${row.id}" ${current && current.id === row.id ? "selected" : ""}>${(0, runtime.deps._t)(row.label)}</option>`).join("");
    return `<div class="condition-rule-line"><span class="condition-rule-if"><span>${(0, runtime.deps._t)("조건")}</span>
            <select aria-label="${(0, runtime.deps._t)("발동 조건")}" data-condition-field="trigger" data-condition-index="${idx}">${pick(options.triggers, choice.trigger)}</select>
            ${renderConditionPatternValueControl(runtime, rule, idx, choice.trigger)}<span class="condition-rule-arrow" aria-hidden="true">→</span></span><span class="condition-rule-do"><span>${(0, runtime.deps._t)("행동")}</span>
            <select aria-label="${(0, runtime.deps._t)("실행 행동")}" data-condition-field="action" data-condition-index="${idx}">${pick(options.actions, choice.action)}</select>${renderConditionRuleMoves(runtime, idx)}</span></div>`;
  }
  function renderConditionPatternRule(runtime, rule, idx, options) {
    const trigger = options.triggers.find((row) => row.id === rule.triggerType) || options.triggers[0];
    const action = options.actions.find((row) => row.id === rule.actionType) || options.actions[0];
    return `<div class="condition-pattern-rule${rule.enabled ? "" : " is-off"}">${renderConditionRuleHead(runtime, rule, idx, action)}${renderConditionRuleLine(runtime, rule, idx, { trigger, action }, options)}</div>`;
  }

  // modules/ui/tactics-panel.mjs
  function isTacticsRulesOpen(runtime) {
    return runtime.deps.editor.isOpen(runtime.deps.game);
  }
  function renderConditionPatternRoadmap(runtime) {
    let lockedTriggers = (0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, true).filter((row) => !(0, runtime.deps.rules.isConditionPatternRequirementMet)(row.unlock, runtime.deps.game));
    let lockedActions = (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, true).filter((row) => !(0, runtime.deps.rules.isConditionPatternRequirementMet)(row.unlock, runtime.deps.game));
    let entries = lockedTriggers.map((row) => `${row.label}, ${(0, runtime.deps.rules.getConditionPatternRequirementLabel)(row.unlock)}`).concat(lockedActions.map((row) => `${row.label}, ${(0, runtime.deps.rules.getConditionPatternRequirementLabel)(row.unlock)}`));
    if (entries.length === 0) return '<div class="condition-pattern-roadmap is-complete">모든 조건과 행동 패턴을 해금했습니다.</div>';
    return `<details class="condition-pattern-roadmap"><summary>${(0, runtime.deps._t)("다음 패턴 해금 {length}개", { length: entries.length })}</summary><div>${entries.map((text) => `<span>${(0, runtime.deps.escapeHTML)(text)}</span>`).join("")}</div></details>`;
  }
  function paintSkillRulesPanel(runtime, panel, html) {
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
  }
  function renderSkillAutoRulePanel2(runtime) {
    syncCombatTacticsControls(runtime);
    let panel = runtime.deps.document.getElementById("ui-skill-rules-panel");
    if (!panel) return;
    runtime.owner = runtime.deps.game;
    let unlocked = isTacticsRulesOpen(runtime);
    let addButton = runtime.deps.document.getElementById("btn-condition-rule-add");
    let sortButton = runtime.deps.document.getElementById("btn-condition-rule-sort");
    if (addButton) addButton.disabled = !unlocked || !(0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, false).length;
    if (sortButton) sortButton.disabled = !unlocked;
    if (!unlocked) return paintSkillRulesPanel(runtime, panel, `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">${(0, runtime.deps._t)("잠금 상태: {value}", { value: TACTICS_RULES_LOCK_MESSAGE })}</div>`);
    runtime.deps.editor.normalize(runtime.deps.game);
    let summary = `<div class="condition-pattern-summary"><div><strong>${(0, runtime.deps._t)("수호, 함성, 저주")}</strong><span>${(0, runtime.deps._t)("그루터기 함에서 깨어난 부적의 조건부 줄이 맡습니다.")}</span></div></div>${renderConditionPatternRoadmap(runtime)}`;
    if (runtime.deps.game.skillAutoRules.length === 0) {
      return paintSkillRulesPanel(runtime, panel, summary + '<div class="condition-rule-empty">[+ 규칙 추가]로 조건과 행동을 고르세요.</div>');
    }
    const options = { triggers: (0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, false), actions: (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, false) };
    paintSkillRulesPanel(runtime, panel, summary + runtime.deps.game.skillAutoRules.map((rule, idx) => renderConditionPatternRule(runtime, rule, idx, options)).join(""));
    syncConditionRuleLive(runtime);
  }
  function syncCombatTacticsControls(runtime) {
    let targetSelect = runtime.deps.document.getElementById("sel-combat-target-priority");
    let positionSelect = runtime.deps.document.getElementById("sel-combat-position-mode");
    let help = runtime.deps.document.getElementById("combat-tactics-help");
    if (!targetSelect || !positionSelect) return;
    let tactics = (0, runtime.deps.normalizeCombatTacticsSettings)(runtime.deps.game.settings);
    let unlocked = isTacticsRulesOpen(runtime);
    targetSelect.value = tactics.targetPriority;
    positionSelect.value = tactics.positionMode;
    targetSelect.disabled = !unlocked;
    positionSelect.disabled = !unlocked;
    const firstUse = unlocked && runtime.deps.contentProgression.opening.applies(runtime.deps.game) && !runtime.deps.game.seenTutorials.includes("opening_tactics_selected");
    targetSelect.classList.toggle("tutorial-callout", firstUse);
    if (help) help.textContent = unlocked ? (0, runtime.deps._t)(firstUse ? "먼저 공격할 적을 골라 보세요. 자동 전투가 그 대상을 우선합니다." : "조건부 규칙이 맞지 않을 때 쓰는 전술입니다. 전술 이동 시 다음 공격이 0.3~0.65초 미뤄집니다.") : TACTICS_RULES_LOCK_MESSAGE;
  }

  // modules/ui/tactics-actions.mjs
  function addSkillAutoRule(runtime) {
    if (!isTacticsRulesOpen(runtime)) return (0, runtime.deps.addLog)(TACTICS_RULES_LOCK_MESSAGE, "attack-monster");
    if (!runtime.deps.editor.add(runtime.deps.game)) return;
    renderSkillAutoRulePanel2(runtime);
    runtime.deps.document.querySelector("#ui-skill-rules-panel .condition-pattern-rule:last-child")?.scrollIntoView({ block: "nearest" });
  }
  function sortSkillAutoRules(runtime) {
    if (!isTacticsRulesOpen(runtime)) return (0, runtime.deps.addLog)(TACTICS_RULES_LOCK_MESSAGE, "attack-monster");
    if (runtime.deps.editor.sort(runtime.deps.game)) renderSkillAutoRulePanel2(runtime);
  }
  function moveSkillAutoRule(runtime, index, delta) {
    if (runtime.deps.editor.move(runtime.deps.game, index, delta)) renderSkillAutoRulePanel2(runtime);
  }
  function setConditionPatternTrigger(runtime, index, triggerType) {
    if (runtime.deps.editor.trigger(runtime.deps.game, index, triggerType)) renderSkillAutoRulePanel2(runtime);
  }
  function setConditionPatternAction(runtime, index, actionType) {
    if (runtime.deps.editor.action(runtime.deps.game, index, actionType)) renderSkillAutoRulePanel2(runtime);
  }
  function setConditionPatternValue(runtime, index, value) {
    runtime.deps.editor.value(runtime.deps.game, index, value);
  }

  // modules/ui/tactics-events.mjs
  var DEFAULT_KEYS = Object.freeze({
    "sel-combat-target-priority": "combatTargetPriority",
    "sel-combat-position-mode": "combatPositionMode"
  });
  function installTacticsEvents(runtime) {
    const panel = runtime.deps.document.getElementById("skill-tab-condition");
    if (!panel) return;
    listenView(runtime, panel, "change", (event) => changeTactic(runtime, event));
    listenView(runtime, panel, "click", (event) => clickTactic(runtime, event));
  }
  function acceptsTacticsEvent(runtime, event) {
    if (!runtime.active || event.target.disabled) return false;
    if (runtime.owner !== runtime.deps.game) {
      runtime.owner = runtime.deps.game;
      renderSkillAutoRulePanel2(runtime);
      return false;
    }
    return runtime.deps.editor.isOpen(runtime.deps.game);
  }
  function changeTactic(runtime, event) {
    if (!acceptsTacticsEvent(runtime, event)) return;
    const target = event.target;
    if (Object.hasOwn(DEFAULT_KEYS, target.id)) changeDefaultTactic(runtime, target);
    else if (target.dataset.conditionField) changeRuleField(runtime, target);
    if (target.closest("button, input, select")) (0, runtime.deps.queueImportantSave)(180);
  }
  function changeDefaultTactic(runtime, target) {
    const { deps } = runtime, game = deps.game;
    if (!deps.editor.defaultTactic(game, DEFAULT_KEYS[target.id], target.value)) return;
    if (deps.contentProgression.opening.applies(game) && !game.seenTutorials.includes("opening_tactics_selected")) {
      game.seenTutorials.push("opening_tactics_selected");
      syncCombatTacticsControls(runtime);
    }
  }
  function changeRuleField(runtime, target) {
    const kind = target.dataset.conditionField, index = Number(target.dataset.conditionIndex);
    const edit = runtime.deps.editor;
    const commands = { trigger: edit.trigger, action: edit.action, value: edit.value, enabled: edit.enabled, ailment: edit.ailment };
    if (!Object.hasOwn(commands, kind)) return;
    if (kind === "ailment" && !Array.from(target.options).some((option) => option.value === target.value)) return;
    const value = kind === "enabled" ? target.checked : target.value;
    if (!commands[kind](runtime.deps.game, index, value)) return;
    if (kind !== "value" && kind !== "ailment") renderSkillAutoRulePanel2(runtime);
  }
  function clickTactic(runtime, event) {
    if (!acceptsTacticsEvent(runtime, event)) return;
    const button = event.target.closest("[data-condition-action]");
    if (button && !button.disabled) applyRuleAction(runtime, button);
    if (event.target.closest("button, input, select")) (0, runtime.deps.queueImportantSave)(180);
  }
  function applyRuleAction(runtime, button) {
    const kind = button.dataset.conditionAction, index = Number(button.dataset.conditionIndex);
    if (kind === "add") runtime.handlers.addSkillAutoRule();
    else if (kind === "sort") runtime.handlers.sortSkillAutoRules();
    else if (kind === "up" || kind === "down") runtime.handlers.moveSkillAutoRule(index, kind === "up" ? -1 : 1);
    else if (kind === "remove" && runtime.deps.editor.remove(runtime.deps.game, index)) renderSkillAutoRulePanel2(runtime);
  }

  // modules/ui/tactics-view.mjs
  function createTacticsView(deps) {
    const runtime = { deps, owner: deps.game, active: true, handlers: {}, listeners: [] };
    const api = {};
    for (const [name, handler] of Object.entries({ isTacticsRulesOpen, addSkillAutoRule, sortSkillAutoRules, moveSkillAutoRule, setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue, renderSkillAutoRulePanel: renderSkillAutoRulePanel2, syncCombatTacticsControls })) {
      api[name] = (...args) => {
        if (!runtime.active) return;
        return handler(runtime, ...args);
      };
    }
    runtime.handlers = api;
    installTacticsEvents(runtime);
    api.dispose = () => {
      if (runtime.active) releaseViewEvents(runtime);
    };
    return Object.freeze(api);
  }

  // modules/ui/ui-stat-queries.mjs
  var ui_stat_queries_exports = {};
  __export(ui_stat_queries_exports, {
    callUiProvider: () => callUiProvider,
    coerceUiPlayerStatNumbers: () => coerceUiPlayerStatNumbers,
    formatUiTakenDamageShockLine: () => formatUiTakenDamageShockLine,
    getDefaultUiPlayerStats: () => getDefaultUiPlayerStats,
    getUiCrowdProgressPaused: () => getUiCrowdProgressPaused,
    getUiEnemyDamageAilmentDps: () => getUiEnemyDamageAilmentDps,
    getUiEnemyShockTakenDamageIncreasePct: () => getUiEnemyShockTakenDamageIncreasePct,
    getUiGemPresentation: () => getUiGemPresentation,
    getUiGlobalFunction: () => getUiGlobalFunction,
    getUiPlayerDamageAilmentDps: () => getUiPlayerDamageAilmentDps,
    getUiPlayerShockTakenDamageIncreasePct: () => getUiPlayerShockTakenDamageIncreasePct,
    getUiPlayerStats: () => getUiPlayerStats2,
    getUiSkillTargets: () => getUiSkillTargets,
    getUiStoredAilmentHitDamage: () => getUiStoredAilmentHitDamage,
    isUiDamageAilmentType: () => isUiDamageAilmentType,
    normalizeUiPlayerStats: () => normalizeUiPlayerStats,
    runUiCoreLoop: () => runUiCoreLoop,
    runUiGlobalFunction: () => runUiGlobalFunction,
    runUiStartEncounter: () => runUiStartEncounter,
    uiPlayerStatDefaultTable: () => uiPlayerStatDefaultTable
  });
  function getDefaultUiPlayerStats() {
    return {
      maxHp: 1,
      energyShield: 0,
      baseDmg: 0,
      directDps: 0,
      dps: 0,
      totalDps: 0,
      summonDps: 0,
      aspd: 1,
      crit: 0,
      critDmg: 150,
      move: 100,
      moveSpeed: 100,
      dr: 0,
      armor: 0,
      evasion: 0,
      resF: 0,
      rawResF: 0,
      resC: 0,
      rawResC: 0,
      resL: 0,
      rawResL: 0,
      resChaos: 0,
      rawResChaos: 0,
      regen: 0,
      regenSuppress: 0,
      leech: 0,
      ds: 0,
      igniteChance: 0,
      chillChance: 0,
      freezeChance: 0,
      poisonChance: 0,
      bleedChance: 0,
      blockChance: 0,
      blockChanceMax: 50,
      deflectChance: 0,
      deflectDamageReduce: 0,
      suppCap: 0,
      summonCap: 1,
      mystique: 0,
      devotion: 0,
      cycle: 0,
      passiveFanaticismStacks: 0,
      passiveRevelationCombatDamageMorePct: 0,
      passiveRevelationGuardTakenLessPct: 0,
      passiveRevelationLifeBonusPct: 0,
      runeResonancePower: 0,
      uniqueResonanceFloor: 0,
      inquisitorResonanceBonus: 0,
      breakdowns: {}
    };
  }
  function uiPlayerStatDefaultTable(runtime) {
    if (!runtime.state.uiPlayerStatDefaults) {
      runtime.state.uiPlayerStatDefaults = runtime.handlers.getDefaultUiPlayerStats();
      delete runtime.state.uiPlayerStatDefaults.breakdowns;
    }
    return runtime.state.uiPlayerStatDefaults;
  }
  function coerceUiPlayerStatNumbers(normalized, defaults) {
    for (const key in defaults) {
      if (key === "breakdowns") continue;
      let value = normalized[key];
      if (typeof value === "number" && Number.isFinite(value)) continue;
      value = Number(value);
      normalized[key] = Number.isFinite(value) ? value : defaults[key];
    }
  }
  function normalizeUiPlayerStats(runtime, stats, fallback = {}) {
    let fromFallback = !!(stats && stats.__uiFallbackStats || fallback && fallback.__uiFallbackStats);
    let numericDefaults = runtime.handlers.uiPlayerStatDefaultTable();
    let normalized = Object.assign({}, numericDefaults, fallback || {}, stats && typeof stats === "object" ? stats : {});
    if (fromFallback) normalized.__uiFallbackStats = true;
    runtime.handlers.coerceUiPlayerStatNumbers(normalized, numericDefaults);
    constrainUiPlayerStats(normalized);
    return normalized;
  }
  function constrainUiPlayerStats(normalized) {
    normalized.maxHp = Math.max(1, Number(normalized.maxHp) || 1);
    normalized.aspd = Math.max(0.01, Number(normalized.aspd) || 1);
    normalized.move = Math.max(0, Number(normalized.move) || 100);
    normalized.moveSpeed = Math.max(0, Number(normalized.moveSpeed) || 100);
    normalized.critDmg = Number.isFinite(Number(normalized.critDmg)) ? Number(normalized.critDmg) : 150;
    normalized.breakdowns = normalized.breakdowns && typeof normalized.breakdowns === "object" ? normalized.breakdowns : {};
  }
  function getUiGlobalFunction(runtime, name) {
    let provider = runtime.deps.providers[name];
    if (typeof provider !== "function" || provider.__placeholderGlobal === true) return null;
    return provider;
  }
  function callUiProvider(runtime, name, provider, args = []) {
    try {
      return provider.apply(null, args);
    } catch (error) {
      runtime.deps.console.error(`${name} failed:`, error);
      throw error;
    }
  }
  function getUiPlayerStats2(runtime, fallback = {}, includeBreakdowns) {
    let provider = runtime.handlers.getUiGlobalFunction("getPlayerStats");
    if (provider) return runtime.handlers.normalizeUiPlayerStats(runtime.handlers.callUiProvider("getPlayerStats", provider, [includeBreakdowns]), fallback);
    if (runtime.state.cachedTooltipStats && runtime.state.cachedTooltipStats.__uiFallbackStats !== true) return runtime.handlers.normalizeUiPlayerStats(runtime.state.cachedTooltipStats, fallback);
    return runtime.handlers.normalizeUiPlayerStats(Object.assign({}, fallback || {}, { __uiFallbackStats: true }), fallback);
  }
  function isUiDamageAilmentType(runtime, type) {
    let provider = runtime.handlers.getUiGlobalFunction("isDamageAilmentType");
    if (provider) return !!runtime.handlers.callUiProvider("isDamageAilmentType", provider, [type]);
    return type === "ignite" || type === "poison" || type === "bleed";
  }
  function getUiStoredAilmentHitDamage(runtime, ail) {
    let provider = runtime.handlers.getUiGlobalFunction("getStoredAilmentHitDamage");
    if (provider) return Math.max(0, Number(runtime.handlers.callUiProvider("getStoredAilmentHitDamage", provider, [ail])) || 0);
    return Math.max(0, Number(ail && (ail.sourceHitDamage || ail.hitDamage) || 0) || 0);
  }
  function getUiPlayerDamageAilmentDps(runtime, ail, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getPlayerDamageAilmentDps");
    if (provider) return Math.max(0, Math.floor(Number(runtime.handlers.callUiProvider("getPlayerDamageAilmentDps", provider, [ail, stats])) || 0));
    let source = runtime.handlers.getUiStoredAilmentHitDamage(ail);
    if (source <= 0 && stats && stats.maxHp) source = Math.max(1, Math.floor((stats.maxHp || 1) * 0.08));
    return Math.max(0, Math.floor(source * 0.9));
  }
  function getUiEnemyDamageAilmentDps(runtime, ail, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getEnemyDamageAilmentDps");
    if (provider) return Math.max(0, Math.floor(Number(runtime.handlers.callUiProvider("getEnemyDamageAilmentDps", provider, [ail, stats])) || 0));
    return Math.max(0, Math.floor(runtime.handlers.getUiStoredAilmentHitDamage(ail) * 0.9));
  }
  function getUiPlayerShockTakenDamageIncreasePct(runtime, power, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getPlayerShockTakenDamageIncreasePct");
    if (provider) return Number(runtime.handlers.callUiProvider("getPlayerShockTakenDamageIncreasePct", provider, [stats || {}, power])) || 0;
    let reduction = Math.max(0, Math.min(0.95, Number(stats && stats.shockEffectReducePct || 0) / 100));
    let value = 22 * (1 - reduction);
    return stats && stats.uniqueShockInvertTaken ? -value : value;
  }
  function getUiEnemyShockTakenDamageIncreasePct(runtime, power, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getEnemyShockTakenDamageIncreasePct");
    if (provider) return Math.max(0, Number(runtime.handlers.callUiProvider("getEnemyShockTakenDamageIncreasePct", provider, [{ type: "shock", time: 1, power }, stats || {}])) || 0);
    let base = Math.min(35, 8 + Math.max(0, Number(power || 0)) * 12);
    let bonus = Math.max(0, Number(stats && stats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
  }
  function formatUiTakenDamageShockLine(runtime, value) {
    let pct = Math.abs(Number(value) || 0).toFixed(1).replace(/\.0$/, "");
    return value < 0 ? (0, runtime.deps._t)("받는 피해 감소: {pct}%", { pct }) : (0, runtime.deps._t)("받는 피해 증가: {pct}%", { pct });
  }
  function getUiSkillTargets(runtime, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getSkillTargets");
    return provider ? runtime.handlers.callUiProvider("getSkillTargets", provider, [stats]) || [] : [];
  }
  function getUiCrowdProgressPaused(runtime) {
    let provider = runtime.handlers.getUiGlobalFunction("isCrowdProgressPaused");
    return provider ? !!runtime.handlers.callUiProvider("isCrowdProgressPaused", provider) : false;
  }
  function runUiGlobalFunction(runtime, name, args = []) {
    let provider = runtime.handlers.getUiGlobalFunction(name);
    return provider ? runtime.handlers.callUiProvider(name, provider, args) : void 0;
  }
  function runUiStartEncounter(runtime) {
    return runtime.handlers.runUiGlobalFunction("startEncounterRun");
  }
  function runUiCoreLoop(runtime, nowMs) {
    return runtime.handlers.runUiGlobalFunction("coreLoop", [nowMs]);
  }
  function getUiGemPresentation(runtime, name, isSupport, stats) {
    let provider = runtime.handlers.getUiGlobalFunction("getGemPresentation");
    if (provider) return runtime.handlers.callUiProvider("getGemPresentation", provider, [name, isSupport, stats]) || {};
    let db = isSupport ? runtime.deps.SUPPORT_GEM_DB[name] || {} : runtime.deps.SKILL_DB[name] || {};
    const level = fallbackGemLevel(runtime, name, isSupport);
    return isSupport ? fallbackSupportPresentation(db, level, name) : fallbackSkillPresentation(runtime, db, level, name);
  }
  function fallbackGemLevel(runtime, name, isSupport) {
    let store = isSupport ? runtime.deps.game.supportGemData || {} : runtime.deps.game.gemData || {};
    return Math.max(1, Math.floor((store[name] || {}).level || 1));
  }
  function fallbackSupportPresentation(db, level, name) {
    return { baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || "", statName: db.name || name, statId: db.stat || null, activeTier: 1 };
  }
  function fallbackSkillPresentation(runtime, db, level, name) {
    return { baseLevel: db.isGem || db.levelable ? level : 0, totalLevel: db.isGem || db.levelable ? level : 0, finalLevel: db.isGem || db.levelable ? level : 0, desc: db.desc || "", statName: name, skill: db, tags: (0, runtime.deps.getSkillTagList)(db) };
  }

  // modules/ui/ui-refresh-input.mjs
  var ui_refresh_input_exports = {};
  __export(ui_refresh_input_exports, {
    beginUiPointerInteraction: () => beginUiPointerInteraction,
    canEditBuild: () => canEditBuild,
    captureUiDisclosureState: () => captureUiDisclosureState,
    finishUiPointerInteraction: () => finishUiPointerInteraction,
    getUiDisclosureKey: () => getUiDisclosureKey,
    isClickSensitiveTarget: () => isClickSensitiveTarget,
    isUiPointerInteractionActive: () => isUiPointerInteractionActive,
    isUiSelectInteractionActive: () => isUiSelectInteractionActive,
    passiveTreeBoxKey: () => passiveTreeBoxKey,
    restoreUiDisclosureState: () => restoreUiDisclosureState,
    shouldRedrawPassiveTree: () => shouldRedrawPassiveTree2
  });
  function isClickSensitiveTarget(target) {
    return !!(target && target.closest && target.closest('button, .tab-btn, .subtab-btn, a, input, select, textarea, [onclick], [role="button"], .item-card, .skill-gem, .slot-box, .map-item'));
  }
  function beginUiPointerInteraction(runtime, event) {
    if (event && event.pointerType === "mouse" && event.button !== 0) return;
    if (!runtime.handlers.isClickSensitiveTarget(event && event.target)) return;
    runtime.state.uiPointerInteraction = { pointerId: event.pointerId, startedAt: runtime.deps.Date.now() };
  }
  function finishUiPointerInteraction(runtime, event) {
    if (!runtime.state.uiPointerInteraction) return;
    if (event && event.pointerId !== runtime.state.uiPointerInteraction.pointerId) return;
    runtime.state.uiPointerInteraction = null;
    if (runtime.state.uiRefreshQueued) runtime.handlers.scheduleDeferredStaticUiFlush(runtime.state.UI_REFRESH_POINTER_FLUSH_DELAY_MS);
  }
  function isUiPointerInteractionActive(runtime, now = runtime.deps.Date.now()) {
    if (!runtime.state.uiPointerInteraction) return false;
    return now - runtime.state.uiPointerInteraction.startedAt < runtime.state.UI_REFRESH_LONG_POINTER_LIMIT_MS;
  }
  function getUiDisclosureKey(details) {
    if (!details || !details.dataset) return "";
    if (details.dataset.uiDisclosure) return `named:${details.dataset.uiDisclosure}`;
    if (details.id) return `id:${details.id}`;
    let owner = typeof details.closest === "function" ? details.closest("[id]") : null;
    if (!owner || typeof owner.querySelectorAll !== "function") return "";
    let siblings = Array.from(owner.querySelectorAll("details"));
    let index = siblings.indexOf(details);
    return index >= 0 ? `owner:${owner.id}:${index}` : "";
  }
  function captureUiDisclosureState(runtime, root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("details").forEach((details) => {
      let key = runtime.handlers.getUiDisclosureKey(details);
      if (key) runtime.state.uiDisclosureState[key] = !!details.open;
    });
  }
  function restoreUiDisclosureState(runtime, root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("details").forEach((details) => {
      let key = runtime.handlers.getUiDisclosureKey(details);
      if (key && Object.prototype.hasOwnProperty.call(runtime.state.uiDisclosureState, key)) details.open = runtime.state.uiDisclosureState[key];
    });
  }
  function isUiSelectInteractionActive(runtime) {
    let active = typeof runtime.deps.document !== "undefined" ? runtime.deps.document.activeElement : null;
    return !!(active && active.tagName === "SELECT" && active.isConnected !== false);
  }
  function shouldRedrawPassiveTree2(runtime) {
    let signature = [
      runtime.deps.game.passivePoints || 0,
      (runtime.deps.game.passives || []).length,
      (runtime.deps.game.discoveredPassives || []).length,
      runtime.deps.game.startNode || "",
      runtime.deps.game.ascendClass || "",
      runtime.deps.game.season || 1,
      ...passiveTreeSettingsKey(runtime.deps.game.settings),
      runtime.handlers.passiveTreeBoxKey()
    ].join("|");
    let changed = signature !== runtime.state.lastPassiveTreeSignature;
    if (changed) runtime.state.lastPassiveTreeSignature = signature;
    return changed;
  }
  function passiveTreeSettingsKey(settings) {
    return [
      settings && settings.passiveTreeSearch || "",
      settings && settings.passiveTreeFilter || "all",
      settings && settings.passiveTreeShowLabels === false ? "labels-off" : "labels-on"
    ];
  }
  function passiveTreeBoxKey(runtime) {
    const canvas = runtime.deps.document.getElementById("tree-canvas"), box = canvas && canvas.parentElement;
    return box ? `${box.clientWidth}x${box.clientHeight}@${runtime.deps.passiveSelectionUi.pixelRatio()}` : "";
  }
  function canEditBuild(runtime) {
    if (!runtime.deps.game.woodsmanBuildLock) return true;
    runtime.deps.addLog(runtime.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster");
    return false;
  }

  // modules/ui/ui-refresh-queue.mjs
  var ui_refresh_queue_exports = {};
  __export(ui_refresh_queue_exports, {
    processQueuedUIRefresh: () => processQueuedUIRefresh,
    scheduleDeferredStaticUiFlush: () => scheduleDeferredStaticUiFlush,
    updateStaticUI: () => updateStaticUI2
  });

  // modules/ui/ui-refresh-lifetime.mjs
  function syncUiRuntimeOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
      runtime.owner = runtime.deps.game;
      cancelUiRefreshWork(runtime);
      runtime.state.cachedTooltipStats = null;
      runtime.state.lastPassiveTreeSignature = "";
    }
    return true;
  }
  function cancelUiRefreshWork(runtime) {
    const state = runtime.state;
    runtime.epoch++;
    if (state.refreshFrame !== null) (0, runtime.deps.cancelAnimationFrame)(state.refreshFrame);
    if (state.uiPointerFlushTimer !== null) (0, runtime.deps.clearTimeout)(state.uiPointerFlushTimer);
    state.refreshFrame = null;
    state.uiPointerFlushTimer = null;
    state.uiRefreshQueued = false;
    state.uiRefreshRunning = false;
    state.uiPointerInteraction = null;
  }
  function currentUiRefresh(runtime, epoch) {
    return syncUiRuntimeOwner(runtime) && epoch === runtime.epoch;
  }
  function queueUiRefreshFrame(runtime) {
    const state = runtime.state;
    if (state.refreshFrame !== null || state.uiRefreshRunning || !state.uiRefreshQueued) return;
    const epoch = runtime.epoch;
    state.refreshFrame = (0, runtime.deps.requestAnimationFrame)(() => {
      if (!currentUiRefresh(runtime, epoch)) return;
      state.refreshFrame = null;
      runtime.handlers.processQueuedUIRefresh();
    });
  }
  function installUiRefreshEvents(runtime) {
    const { document: document2 } = runtime.deps;
    const guard = (handler) => (event) => {
      if (syncUiRuntimeOwner(runtime)) handler(event);
    };
    listenView(runtime, document2, "pointerdown", guard(runtime.handlers.beginUiPointerInteraction), true);
    listenView(runtime, document2, "pointerup", guard(runtime.handlers.finishUiPointerInteraction), true);
    listenView(runtime, document2, "pointercancel", guard(runtime.handlers.finishUiPointerInteraction), true);
    listenView(runtime, document2, "focusout", guard((event) => {
      if (event?.target?.tagName === "SELECT" && runtime.state.uiRefreshQueued) {
        runtime.handlers.scheduleDeferredStaticUiFlush(0);
      }
    }), true);
    listenView(runtime, document2, "toggle", guard((event) => {
      const key = runtime.handlers.getUiDisclosureKey(event?.target);
      if (key) runtime.state.uiDisclosureState[key] = !!event.target.open;
    }), true);
  }
  function disposeUiRuntime(runtime) {
    if (!runtime.active) return;
    cancelUiRefreshWork(runtime);
    runtime.state.cachedTooltipStats = null;
    runtime.state.uiDisclosureState = /* @__PURE__ */ Object.create(null);
    releaseViewEvents(runtime);
  }

  // modules/ui/ui-refresh-queue.mjs
  function scheduleDeferredStaticUiFlush(runtime, delayMs) {
    if (runtime.state.uiPointerFlushTimer !== null) return;
    const epoch = runtime.epoch;
    runtime.state.uiPointerFlushTimer = (0, runtime.deps.setTimeout)(() => {
      if (!currentUiRefresh(runtime, epoch)) return;
      runtime.state.uiPointerFlushTimer = null;
      queueUiRefreshFrame(runtime);
    }, Math.max(0, delayMs || 0));
  }
  function updateStaticUI2(runtime, forceImmediate) {
    if (!syncUiRuntimeOwner(runtime) || runtime.deps.game.isBackgroundCalculation) return;
    void forceImmediate;
    if (runtime.state.uiRefreshQueued) return;
    runtime.state.uiRefreshQueued = true;
    queueUiRefreshFrame(runtime);
  }
  function processQueuedUIRefresh(runtime) {
    if (!syncUiRuntimeOwner(runtime) || runtime.state.uiRefreshRunning) return;
    const state = runtime.state, handlers = runtime.handlers;
    state.uiRefreshQueued = false;
    if (handlers.isUiPointerInteractionActive()) {
      state.uiRefreshQueued = true;
      scheduleDeferredStaticUiFlush(runtime, state.UI_REFRESH_POINTER_FLUSH_DELAY_MS);
      return;
    }
    if (handlers.isUiSelectInteractionActive()) {
      state.uiRefreshQueued = true;
      return;
    }
    const epoch = runtime.epoch;
    handlers.captureUiDisclosureState(runtime.deps.document);
    state.uiRefreshRunning = true;
    try {
      renderUiRefresh(runtime, epoch);
    } finally {
      if (currentUiRefresh(runtime, epoch)) {
        handlers.restoreUiDisclosureState(runtime.deps.document);
        state.uiRefreshRunning = false;
        queueUiRefreshFrame(runtime);
      }
    }
  }
  function renderUiRefresh(runtime, epoch) {
    const deps = runtime.deps;
    if (!deps.game.isGuideReplay) (0, deps.checkUnlocks)();
    if (!currentUiRefresh(runtime, epoch)) return;
    (0, deps.performUpdateStaticUI)();
    if (!currentUiRefresh(runtime, epoch)) return;
    (0, deps.updateBuildFeedback)(runtime.state.cachedTooltipStats);
    deps.tutorialActionUi.refresh();
    deps.combatCurrencyHud.update();
    deps.cosmosAtlasView?.renderCosmosAtlas();
  }

  // modules/ui/ui-runtime.mjs
  var PUBLIC_CALLS = [
    "canEditBuild",
    "normalizeUiPlayerStats",
    "getUiPlayerStats",
    "isUiDamageAilmentType",
    "getUiStoredAilmentHitDamage",
    "getUiPlayerDamageAilmentDps",
    "getUiEnemyDamageAilmentDps",
    "getUiPlayerShockTakenDamageIncreasePct",
    "getUiEnemyShockTakenDamageIncreasePct",
    "formatUiTakenDamageShockLine",
    "getUiSkillTargets",
    "getUiCrowdProgressPaused",
    "runUiGlobalFunction",
    "runUiStartEncounter",
    "runUiCoreLoop",
    "getUiGemPresentation",
    "beginUiPointerInteraction",
    "scheduleDeferredStaticUiFlush",
    "finishUiPointerInteraction",
    "isUiPointerInteractionActive",
    "getUiDisclosureKey",
    "captureUiDisclosureState",
    "restoreUiDisclosureState",
    "processQueuedUIRefresh",
    "shouldRedrawPassiveTree",
    "updateStaticUI"
  ];
  function createUiRuntime(deps) {
    const runtime = { deps, state: initialState(), handlers: {}, owner: deps.game, active: true, epoch: 0, listeners: [] };
    const pure = /* @__PURE__ */ new Set(["getDefaultUiPlayerStats", "coerceUiPlayerStatNumbers", "isClickSensitiveTarget", "getUiDisclosureKey"]);
    for (const [name, handler] of Object.entries({ ...ui_stat_queries_exports, ...ui_refresh_input_exports, ...ui_refresh_queue_exports })) {
      runtime.handlers[name] = pure.has(name) ? handler : handler.bind(void 0, runtime);
    }
    const api = {};
    for (const name of PUBLIC_CALLS) {
      const handler = runtime.handlers[name];
      api[name] = (...args) => {
        if (syncUiRuntimeOwner(runtime)) return handler(...args);
      };
    }
    api.stats = Object.freeze({
      snapshot: () => syncUiRuntimeOwner(runtime) ? runtime.state.cachedTooltipStats : null,
      store: (value) => {
        if (syncUiRuntimeOwner(runtime)) runtime.state.cachedTooltipStats = value;
      }
    });
    api.status = () => {
      syncUiRuntimeOwner(runtime);
      const { uiRefreshQueued: queued, uiRefreshRunning: running } = runtime.state;
      return { queued, running, idle: !queued && !running };
    };
    api.disclosure = Object.freeze({
      setOpen: (key, open) => {
        if (syncUiRuntimeOwner(runtime)) runtime.state.uiDisclosureState[key] = !!open;
      }
    });
    api.dispose = () => disposeUiRuntime(runtime);
    installUiRefreshEvents(runtime);
    return Object.freeze(api);
  }
  function initialState() {
    return {
      cachedTooltipStats: null,
      uiPlayerStatDefaults: null,
      lastPassiveTreeSignature: "",
      uiRefreshQueued: false,
      uiRefreshRunning: false,
      refreshFrame: null,
      uiPointerInteraction: null,
      uiPointerFlushTimer: null,
      // Expansion choices belong to the UI session, as before; they are not save data.
      uiDisclosureState: /* @__PURE__ */ Object.create(null),
      UI_REFRESH_POINTER_FLUSH_DELAY_MS: 35,
      UI_REFRESH_LONG_POINTER_LIMIT_MS: 8e3
    };
  }

  // modules/ui/static-ui-data.mjs
  var MOBILE_CRAFT_ORB_KEYS = ["magicBud", "sapBud", "formlessDew", "goldenRule", "fairyRing", "pruningShears", "blightSpore", "emberBranch", "blessing", "deepWhetstone", "rootIron", "jewelPolish", "abyssCatalyst"];
  var seasonNodeIcons = {
    expGain: "up",
    pctDmg: "sword",
    pctHp: "heart",
    crit: "eye",
    dotPctDmg: "flame",
    move: "boot",
    dr: "shield",
    aspd: "speed",
    physIgnore: "pierce",
    resPen: "pierce",
    ds: "speed",
    critDmg: "star",
    flatHp: "heart",
    regen: "drop",
    projectilePctDmg: "reticle",
    meleePctDmg: "sword",
    physPctDmg: "sword",
    elementalPctDmg: "flame",
    chaosPctDmg: "drop",
    minDmgRoll: "fork",
    maxDmgRoll: "up"
  };
  var journalHintById = {
    prologue: "게임 시작",
    woodsman: "혼돈 밖의 나무꾼 처치",
    woodsman_echo: "혼돈 밖에서 나무꾼 완전 격파",
    meteor_fall: "운석 낙하 지점 첫 정산",
    beehive_queen: "벌집 원정에서 여왕 격파",
    void_grand_breach: "대균열의 지배자 격파",
    labyrinth_10: "고대 미궁 10층 클리어",
    ocean_500: "심해 500m 가디언 격파",
    sky_tower_10: "창공의 탑 10층 클리어",
    time_rift_fusion: "시간의 균열에서 유물 1회 융합",
    colony_wave_10: "군락지 웨이브 10 클리어",
    rival_overheat: "버려진 두 번째 날 「과열」 격파",
    rival_dull: "버려진 세 번째 날 「무딤」 격파",
    rival_glutton: "버려진 네 번째 날 「탐식」 격파",
    rival_afterimage: "버려진 다섯 번째 날 「잔영」 격파",
    rival_backedge: "버려진 여섯 번째 날 「역린」 격파",
    rival_masterwork: "일곱 번째 날 「완성작」 격파",
    cosmos_astra: "우주계의 잔향체 아스트라 격파",
    pinnacle_underking: "지하계 30층 이후 지핵군주 모르그란 격파",
    pinnacle_leviathan: "심해 1000m 이후 무광해의 포식자 탈라사 격파",
    pinnacle_sky: "창공의 탑 30층 이후 빈 왕좌의 집행자 카엘룸 격파",
    pinnacle_observer: "세 영역의 지배자와 아스트라 격파 후 경계의 관측자 베일라 격파"
  };
  var categoryOrder = ["스토리", "세계의 흔적", "기억의 잎", "탐험 기록", "버려진 날", "우주계 기록", "최종 관문", "숨겨진 기록"];

  // modules/ui/static-craft-admission.mjs
  function getCraftActionValidators(runtime, item) {
    let hasHoneyLocked = (item.stats || []).some((v) => v.lockedByHoney);
    return {
      honey: !!item && (runtime.deps.game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
      stinger: !!item && (runtime.deps.game.currencies.venomStinger || 0) > 0 && !(0, runtime.deps.getVenomStingerRefusal)(item),
      baseUpgrade: !!item && !(0, runtime.deps.getBaseUpgradeRefusal)(item),
      voidSocket: !!item && runtime.deps.equipmentSockets.canChisel(item)
    };
  }
  function getCraftOrbUseState(runtime, key, item) {
    if (!item) return { enabled: false, reason: (0, runtime.deps._t)("아이템 미선택") };
    if ((runtime.deps.game.currencies[key] || 0) <= 0) return { enabled: false, reason: (0, runtime.deps._t)("재화 부족") };
    let actionKey = runtime.deps.equipmentCrafting.resolveAction(key, item.rarity);
    const block = runtime.deps.craftCurrencyUse.blockReason(item, actionKey);
    if (block) return { enabled: false, reason: block };
    let sporeMode = (0, runtime.deps.isSporeCraftEquipment)(item) ? runtime.deps.game.sporeCraftModes[key] || "none" : "none";
    const sporeBlock = runtime.deps.craftCurrencyUse.addonReason(item, actionKey, sporeMode);
    if (sporeBlock) return { enabled: false, reason: sporeBlock };
    if (isCraftSporeCostMissing(runtime, key, item, sporeMode)) {
      return { enabled: false, reason: runtime.deps.craftingCatalogUi.sporeShortage(sporeMode) };
    }
    return { enabled: true, reason: (0, runtime.deps._t)("사용 가능") };
  }
  function isCraftSporeCostMissing(runtime, key, item, sporeMode) {
    return ["magicBud", "sapBud", "formlessDew"].includes(key) && typeof runtime.deps.isSporeCraftEquipment === "function" && (0, runtime.deps.isSporeCraftEquipment)(item) && sporeMode !== "none" && typeof runtime.deps.hasSporeCraftCost === "function" && !(0, runtime.deps.hasSporeCraftCost)(sporeMode);
  }
  function getMobileCraftCurrencyUseState(runtime, key, item) {
    if (!key || !runtime.deps.ORB_DB[key]) return { enabled: false, reason: (0, runtime.deps._t)("재화를 선택하세요.") };
    if ((runtime.deps.game.currencies[key] || 0) <= 0) return { enabled: false, reason: (0, runtime.deps._t)("보유량 없음") };
    if (!item) return { enabled: false, reason: (0, runtime.deps._t)("아이템을 선택하세요.") };
    if (item.fusedRelic || item.corrupted) return getCraftOrbUseState(runtime, key, item);
    return resolveMobileCraftCurrencyUseState(runtime, key, item);
  }
  function resolveMobileCraftCurrencyUseState(runtime, key, item) {
    if (key === "enchantedHoney") {
      let v = getCraftActionValidators(runtime, item);
      return { enabled: !!v.honey, reason: v.honey ? "사용 가능" : "현재 아이템 조건 불일치" };
    }
    if (key === "venomStinger") {
      let v = getCraftActionValidators(runtime, item);
      return { enabled: !!v.stinger, reason: v.stinger ? "사용 가능" : "현재 아이템 조건 불일치" };
    }
    if (key === "voidChisel") {
      let enabled = runtime.deps.equipmentSockets.canChisel(item);
      return { enabled, reason: enabled ? "사용 가능" : "소켓이 이미 있거나 뚫을 수 없는 장비" };
    }
    if (MOBILE_CRAFT_ORB_KEYS.includes(key)) return resolveBasicCraftCurrencyUseState(runtime, key, item);
    return { enabled: false, reason: (0, runtime.deps._t)("지원하지 않는 재화") };
  }
  function resolveBasicCraftCurrencyUseState(runtime, key, item) {
    if (key === "blessing") {
      const enabled = Array.isArray(item.baseStats) && item.baseStats.length > 0;
      return { enabled, reason: enabled ? "사용 가능" : "베이스 옵션 없음" };
    }
    if (["deepWhetstone", "rootIron", "jewelPolish"].includes(key)) return getCraftQualityUseState(key, item);
    if (key === "abyssCatalyst") {
      let enabled = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
      return { enabled, reason: enabled ? "사용 가능" : "퀄리티와 추가 옵션이 있는 장비에만 사용 가능" };
    }
    return getCraftOrbUseState(runtime, key, item);
  }
  var QUALITY_SLOTS = {
    deepWhetstone: ["무기"],
    rootIron: ["투구", "갑옷", "방패", "장갑", "신발", "허리띠"],
    jewelPolish: ["목걸이", "반지"]
  };
  function getCraftQualityUseState(key, item) {
    const slotOk = QUALITY_SLOTS[key].includes(String(item.slot || ""));
    const qualityOk = Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
    const enabled = slotOk && qualityOk;
    return { enabled, reason: enabled ? "사용 가능" : "현재 아이템 조건 불일치" };
  }

  // modules/ui/static-search-actions.mjs
  function updateSearchFilter(runtime, key, value) {
    const d = (0, runtime.deps.getSearchFilterState)();
    d[key] = String(value || "");
    const { cursor, activeTabId } = captureSearchCursor(runtime, key, value);
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
    restoreSearchCursor(runtime, key, cursor, activeTabId);
  }
  function captureSearchCursor(runtime, key, value) {
    let cursor = null;
    let active = runtime.deps.document.activeElement;
    let activeTabId = null;
    if (active && active.tagName === "INPUT" && active.dataset && active.dataset.searchKey === key) {
      let pos = Number(active.selectionStart);
      cursor = Number.isFinite(pos) ? pos : String(value || "").length;
      let activeTab = active.closest(".tab-content.active");
      activeTabId = activeTab ? activeTab.id : null;
    }
    return { cursor, activeTabId };
  }
  function restoreSearchCursor(runtime, key, cursor, activeTabId) {
    if (cursor !== null) {
      let scope = activeTabId ? runtime.deps.document.getElementById(activeTabId) : null;
      let next = scope ? scope.querySelector(`input[data-search-key="${key}"]`) : runtime.deps.document.querySelector(`input[data-search-key="${key}"]`);
      if (next) {
        next.focus();
        let len = next.value.length;
        let pos = Math.max(0, Math.min(cursor, len));
        next.setSelectionRange(pos, pos);
      }
    }
  }
  function isGemLibraryMatchVisible(runtime, searchable, query, foldInactive, isActive) {
    if (!(0, runtime.deps.matchSearchQuery)(searchable, query)) return false;
    return !foldInactive || !!String(query || "").trim() || !!isActive;
  }
  function getGemSearchText(runtime, name, definition) {
    let def = definition || {};
    let tags = Array.isArray(def.tags) ? def.tags : [];
    let localizedTags = tags.map((tag) => (0, runtime.deps.translateSkillTag)(tag));
    let statIds = Array.isArray(def.stats) ? def.stats.map((stat) => stat.id || stat.stat || "").filter(Boolean) : [];
    if (def.stat) statIds.push(def.stat);
    let statNames = statIds.map((statId) => (0, runtime.deps.getStatName)(statId));
    return [
      name,
      def.name || "",
      tags.join(" "),
      localizedTags.join(" "),
      def.desc || "",
      def.type || "",
      def.ele || "",
      def.targetMode || "",
      statIds.join(" "),
      statNames.join(" ")
    ].join(" ");
  }
  function shouldBulkSalvageBySearch(runtime, isMatched, salvageUnmatched) {
    return salvageUnmatched ? !isMatched : isMatched;
  }
  async function bulkSalvageEquipBySearch(runtime, salvageUnmatched) {
    if (!(0, runtime.deps.assertBuildEditable)()) return;
    const owner = runtime.deps.game;
    const sf = (0, runtime.deps.getSearchFilterState)();
    const targetItems = (runtime.deps.game.inventory || []).filter((item) => {
      if (!item) return false;
      const hay = (0, runtime.deps.getEquipmentSearchText)(item);
      const matched = (0, runtime.deps.matchSearchQuery)(hay, sf.equip);
      return shouldBulkSalvageBySearch(runtime, matched, !!salvageUnmatched) && !(0, runtime.deps.isBulkSalvageProtectedItem)(item);
    });
    const targetCount = targetItems.length;
    if (targetCount <= 0) return (0, runtime.deps.addLog)((0, runtime.deps._t)("해체 대상이 없습니다."), "attack-monster");
    const note = runtime.deps.bagItems.countNote(targetItems);
    if (!await (0, runtime.deps.requestGameConfirmation)(`검색 조건에 해당하는 장비 ${targetCount}개를 해체합니다.${note ? `
${note} 포함` : ""}
잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
      title: (0, runtime.deps._t)("검색 장비 일괄 해체"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("{targetCount}개 해체", { targetCount })
    })) return;
    if (!runtime.active || owner !== runtime.deps.game) return;
    const targets = (0, runtime.deps.confirmedSalvageTargets)(targetItems), lockedSkipped = targetCount - targets.length;
    const rewards = (0, runtime.deps.salvageBagItems)(targets);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧪 장비 {count}개 해체 완료, {rewards}{kept}", { count: targets.length, rewards: (0, runtime.deps.formatSalvageRewardSummary)(rewards), kept: lockedSkipped > 0 ? ` ${(0, runtime.deps._t)("(잠금, 세팅, 우선 보관 {n}개는 남김)", { n: lockedSkipped })}` : "" }), "loot-normal");
    (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/static-inventory-filters.mjs
  function getInventoryRarityFilterKeys() {
    return ["normal", "magic", "rare", "unique"];
  }
  function getInventoryRarityFilterLabels(runtime) {
    return runtime.deps.ITEM_RARITY_LABELS;
  }
  function getInventoryRarityFilter(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let f = runtime.deps.game.settings.inventoryViewRarities;
    if (!f || typeof f !== "object") f = runtime.deps.game.settings.inventoryViewRarities = {};
    getInventoryRarityFilterKeys().forEach((r) => {
      if (typeof f[r] !== "boolean") f[r] = true;
    });
    return f;
  }
  function isItemRarityVisible(runtime, item) {
    let rarity = item && item.rarity || "normal";
    if (!getInventoryRarityFilterKeys().includes(rarity)) return true;
    return !!getInventoryRarityFilter(runtime)[rarity];
  }
  function isAllInventoryRarityFilterOn(runtime) {
    let f = getInventoryRarityFilter(runtime);
    return getInventoryRarityFilterKeys().every((k) => !!f[k]);
  }
  function renderRarityFilterChips(runtime, scope) {
    let f = getInventoryRarityFilter(runtime);
    let labels = getInventoryRarityFilterLabels(runtime);
    let stop = scope === "picker" ? "event.stopPropagation(); " : "";
    let allOn = isAllInventoryRarityFilterOn(runtime);
    let allChip = `<button type="button" class="rarity-filter-chip rarity-all${allOn ? " active" : ""}" aria-pressed="${allOn}" onclick="${stop}toggleAllInventoryRarityFilter()">${(0, runtime.deps._t)("전체")}</button>`;
    let chips = getInventoryRarityFilterKeys().map((key) => {
      let active = !!f[key];
      return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? " active" : ""}" aria-pressed="${active}" onclick="${stop}toggleInventoryRarityFilter('${key}')">${(0, runtime.deps._t)(labels[key])}</button>`;
    }).join("");
    return allChip + chips;
  }
  function getAutoSalvageRarities(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let f = runtime.deps.game.settings.autoSalvageRarities;
    if (!f || typeof f !== "object") f = runtime.deps.game.settings.autoSalvageRarities = { normal: true, magic: true, rare: false, unique: false };
    getInventoryRarityFilterKeys().forEach((r) => {
      if (typeof f[r] !== "boolean") f[r] = false;
    });
    return f;
  }
  function renderAutoSalvageRarityChips(runtime) {
    let f = getAutoSalvageRarities(runtime);
    let labels = getInventoryRarityFilterLabels(runtime);
    return getInventoryRarityFilterKeys().map((key) => {
      let active = !!f[key];
      return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? " active" : ""}" aria-pressed="${active}" onclick="toggleAutoSalvageRarity('${key}')">${labels[key]}</button>`;
    }).join("");
  }

  // modules/ui/static-picker-cards.mjs
  function getCraftPickerItemLines(runtime, item) {
    if (!item) return "";
    let rows = [];
    (item.baseStats || []).slice(0, 1).forEach((stat) => rows.push(`${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, stat.val)}`));
    (item.stats || []).slice(0, 2).forEach((stat) => rows.push(`${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, stat.val)}`));
    if (item.chaosInfusion) rows.push(`[주입] ${(0, runtime.deps._t)(item.chaosInfusion.statName || (0, runtime.deps.getStatName)(item.chaosInfusion.id))} +${(0, runtime.deps.formatValue)(item.chaosInfusion.id, item.chaosInfusion.val)}`);
    if (item.encroached && !item.encroached.liberated) rows.push("[잠식] 해방 전");
    return rows.map((row) => `<div class="craft-picker-stat">${(0, runtime.deps.escapeHTML)(row)}</div>`).join("");
  }
  function getCraftPickerCardHtml(runtime, item, options) {
    const presentation = craftPickerCardPresentation(runtime, item, options);
    options = presentation.options;
    const { selected, rarity, slotLabel, sourceBadge, extraClass, exceptionalStars } = presentation;
    return `<button type="button" class="craft-picker-card ${extraClass} ${selected ? "selected" : ""}" onclick="${options.onclick || ""}" ${options.tooltip || ""}>
        <div class="item-title ${rarity}" style="font-size:12px;">[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(item, slotLabel))}] ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.name || "장비"))}${exceptionalStars}${sourceBadge}${item.encroached ? (0, runtime.deps._t)(' <span style="color:#b084ff;">(잠식)</span>') : ""}${item.locked ? " 🔒" : ""}</div>
        <div class="item-base-line" style="font-size:12px;">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName || ""))}</div>
        ${getCraftPickerItemLines(runtime, item)}
    </button>`;
  }
  function craftPickerCardPresentation(runtime, item, options) {
    options = options || {};
    let selected = !!options.selected;
    let rarity = item && item.rarity ? item.rarity : "normal";
    let slotLabel = options.slotLabel || (item && item.slot ? item.slot : "장비");
    const sourceBadge = craftPickerSourceBadge(runtime, item);
    let extraClass = options.extraClass || "";
    let exceptionalStars = typeof runtime.deps.getExceptionalBaseStarsHtml === "function" ? (0, runtime.deps.getExceptionalBaseStarsHtml)(item) : "";
    return { options, selected, rarity, slotLabel, sourceBadge, extraClass, exceptionalStars };
  }
  function craftPickerSourceBadge(runtime, item) {
    let sourceMeta = item && typeof runtime.deps.getDropOnlyItemSourceMeta === "function" ? (0, runtime.deps.getDropOnlyItemSourceMeta)(item) : null;
    let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${(0, runtime.deps._t)(sourceMeta.label)}</span>` : "";
    return sourceBadge;
  }
  function getCraftPickerBodyHtml(runtime, kind, browse = {}) {
    let isEquip = kind === "equip";
    let currentRef = (0, runtime.deps.getCraftSelectionRef)();
    let currentIsEquip = (0, runtime.deps.isCraftSelectionEquip)();
    if (isEquip) {
      let slots = ["무기", "투구", "목걸이", "장갑1", "갑옷", "방패", "반지1", "허리띠", "반지2", "신발", "장갑2"];
      return `<div class="paperdoll craft-picker-equip-grid">${slots.map((slot) => {
        let item = runtime.deps.game.equipment && runtime.deps.game.equipment[slot];
        let slotClass = `slot-box slot-${slot}`;
        if (!item) return `<button type="button" class="craft-picker-card ${slotClass} empty" disabled><div style="font-weight:800;">[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(null, slot))}]</div><div style="color:var(--copy-muted); margin-top:5px;">${(0, runtime.deps._t)("비어있음")}</div></button>`;
        return getCraftPickerCardHtml(runtime, item, {
          slotLabel: slot,
          selected: currentIsEquip && currentRef === slot,
          onclick: `selectCraftPickerEquipment('${slot}')`,
          extraClass: slotClass,
          tooltip: `onmouseenter="showItemTooltip(event, '${slot}', true)" onmousemove="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"`
        });
      }).join("")}</div>`;
    }
    return renderCraftPickerInventory(runtime, currentRef, currentIsEquip, { ...browse, kind });
  }
  function renderCraftPickerPages(runtime, page, pages, count) {
    return `<nav class="craft-picker-pages" aria-label="${(0, runtime.deps._t)("제작 대상 페이지")}"><button type="button" data-craft-page="${page - 1}" ${page === 0 ? "disabled" : ""}>${(0, runtime.deps._t)("이전")}</button><span>${(0, runtime.deps._t)("{value} / {pages}, {count}개", { value: page + 1, pages, count })}</span><button type="button" data-craft-page="${page + 1}" ${page === pages - 1 ? "disabled" : ""}>${(0, runtime.deps._t)("다음")}</button></nav>`;
  }
  function renderCraftPickerInventory(runtime, currentRef, currentIsEquip, browse) {
    let totalInv = (runtime.deps.game.inventory || []).length;
    const mobile = runtime.deps.uiDisplay.matches("(max-width: 1080px)");
    const plain = runtime.deps.game.inventory.filter((item) => !runtime.deps.bagItems.isSpecial(item));
    const candidates = browse.kind === "altar" ? plain.filter((item) => !(0, runtime.deps.getTimeAltarItemIssue)(item)) : plain;
    const matching = candidates.filter((item) => item && isItemRarityVisible(runtime, item) && (0, runtime.deps.matchSearchQuery)((0, runtime.deps.getEquipmentSearchText)(item), browse.query));
    const pages = Math.max(1, Math.ceil(matching.length / 6));
    const page = Math.min(browse.page || 0, pages - 1);
    const visible = mobile ? matching.slice(page * 6, page * 6 + 6) : matching;
    let rows = visible.map((item) => getCraftPickerCardHtml(runtime, item, {
      selected: !currentIsEquip && currentRef === item.id,
      onclick: `selectCraftPickerInventoryItem(${item.id})`,
      tooltip: `onmouseenter="showItemTooltip(event, ${runtime.deps.game.inventory.indexOf(item)}, false)" onmouseleave="hideItemTooltip()"`
    })).join("");
    const navigation = mobile ? renderCraftPickerPages(runtime, page, pages, matching.length) : "";
    return navigation + (rows ? `<div class="craft-picker-grid">${rows}</div>` : `<div class="deathlog-empty">${totalInv > 0 ? (0, runtime.deps._t)("검색/등급 조건에 맞는 장비가 없습니다.") : (0, runtime.deps._t)("인벤토리에 제작할 장비가 없습니다.")}</div>`);
  }

  // modules/ui/static-picker-frame.mjs
  function getCraftPickerPanelHtml(runtime, kind, real, options) {
    let filterRowHtml = real ? "" : `<div class="craft-picker-filter"><span class="inventory-view-filter-label">${(0, runtime.deps._t)("표시")}</span>${renderRarityFilterChips(runtime, "picker")}</div>`;
    let desc = options.desc || (real ? (0, runtime.deps._t)("장비를 누르면 제작실 대상 장비로 바로 선택됩니다.") : (0, runtime.deps._t)("카드를 클릭하면 제작실 대상 장비로 바로 선택됩니다."));
    let title = options.title || (kind === "equip" ? (0, runtime.deps._t)("장착 장비에서 제작 대상 선택") : (0, runtime.deps._t)("인벤토리에서 제작 대상 선택"));
    return `<div class="craft-picker-panel"><div class="craft-picker-head"><div><div class="craft-picker-title" id="craft-picker-title">${title}</div><div class="craft-picker-desc">${desc}</div></div><button type="button" autofocus onclick="closeCraftItemPickerOverlay()">${(0, runtime.deps._t)("닫기")}</button></div>${filterRowHtml}<div class="craft-picker-body">${real ? "" : getCraftPickerBodyHtml(runtime, kind)}</div></div>`;
  }
  function refuseCraftPickerItem(runtime, reason) {
    let line = runtime.deps.document.querySelector("#craft-item-picker-overlay .craft-picker-desc");
    if (!line) return;
    line.textContent = reason;
    line.classList.add("is-refused");
  }
  function decorateCraftPickerCards(runtime, overlay, kind) {
    if (kind === "altar") {
      overlay.querySelector(".craft-picker-title").textContent = (0, runtime.deps._t)("제단 장비 선택");
      overlay.querySelector(".craft-picker-desc").textContent = (0, runtime.deps._t)("제단에 올릴 수 있는 장비만 표시됩니다. 선택 후 제단에 올리세요.");
    }
    if (runtime.deps.uiDisplay.matches("(max-width: 1080px)")) overlay.querySelector(".craft-picker-head").insertAdjacentHTML("afterend", '<form class="craft-picker-search"><input name="craftSearch" type="search" aria-label="제작 장비 이름/베이스/등급/부위/옵션 검색" placeholder="이름/베이스/등급/옵션 검색"><button type="submit">검색</button></form>');
  }

  // modules/ui/static-picker-dialog.mjs
  function prepareCraftItemPickerDialog(runtime, overlay, kind, closePicker) {
    const opener = runtime.deps.document.activeElement;
    runtime.state.pickerDialog = overlay;
    const host = opener?.closest(".tab-content, dialog");
    const tooltips = ["item-tooltip-box", "info-tooltip"].map((id) => runtime.deps.document.getElementById(id)).filter(Boolean).map((node) => ({ node, parent: node.parentNode, next: node.nextSibling }));
    (0, runtime.deps.hideItemTooltip)();
    (0, runtime.deps.hideInfoTooltip)();
    tooltips.forEach(({ node }) => overlay.appendChild(node));
    overlay.oncancel = (event) => {
      event.preventDefault();
      closePicker();
    };
    overlay.onclose = () => {
      if (runtime.state.pickerDialog !== overlay) return;
      runtime.state.pickerDialog = null;
      runtime.state.craftPickerKind = null;
      runtime.deps.craftPickerHostUi.unmount();
      (0, runtime.deps.hideItemTooltip)();
      (0, runtime.deps.hideInfoTooltip)();
      tooltips.slice().reverse().forEach(({ node, parent, next }) => {
        if (node.parentNode !== overlay) return;
        parent.insertBefore(node, next?.parentNode === parent ? next : null);
      });
      overlay.remove();
      const modal = [...runtime.deps.document.querySelectorAll("dialog:modal")].at(-1);
      if (modal && !modal.contains(host || opener)) return;
      const target = opener?.isConnected ? opener : host?.querySelector(`button[onclick*="openCraftItemPickerOverlay('${kind}')"]`);
      target?.focus({ preventScroll: true });
    };
  }
  function closeCraftItemPickerOverlay(runtime) {
    const overlay = runtime.state.pickerDialog;
    if (!overlay) return;
    overlay.close();
    overlay.onclose();
  }
  function selectCraftPickerEquipment(runtime, slot) {
    if (!slot || !(runtime.deps.game.equipment || {})[slot]) return;
    if (typeof runtime.deps.hideItemTooltip === "function") (0, runtime.deps.hideItemTooltip)();
    if (typeof runtime.deps.hideInfoTooltip === "function") (0, runtime.deps.hideInfoTooltip)();
    (0, runtime.deps.selectForCrafting)(slot, true);
    closeCraftItemPickerOverlay(runtime);
  }
  function selectCraftPickerInventoryItem(runtime, itemId) {
    let id = Number(itemId);
    if (!Number.isFinite(id) || !(runtime.deps.game.inventory || []).some((item) => item && item.id === id)) return;
    if (typeof runtime.deps.hideItemTooltip === "function") (0, runtime.deps.hideItemTooltip)();
    if (typeof runtime.deps.hideInfoTooltip === "function") (0, runtime.deps.hideInfoTooltip)();
    (0, runtime.deps.selectForCrafting)(id, false);
    closeCraftItemPickerOverlay(runtime);
  }
  function refreshCraftItemPickerOverlay(runtime) {
    let overlay = runtime.deps.document.getElementById("craft-item-picker-overlay");
    if (!overlay || !runtime.state.craftPickerKind) return;
    if (runtime.deps.craftPickerHostUi.shows(runtime.state.craftPickerKind)) return;
    let filterEl = overlay.querySelector(".craft-picker-filter");
    if (filterEl) filterEl.innerHTML = `<span class="inventory-view-filter-label">${(0, runtime.deps._t)("표시")}</span>${renderRarityFilterChips(runtime, "picker")}`;
    let bodyEl = overlay.querySelector(".craft-picker-body");
    if (bodyEl) bodyEl.innerHTML = getCraftPickerBodyHtml(runtime, runtime.state.craftPickerKind, { query: overlay.querySelector('[name="craftSearch"]')?.value || "", page: Number(overlay.dataset.page) || 0 });
  }
  function openCraftItemPickerOverlay(runtime, kind, options = {}) {
    closeCraftItemPickerOverlay(runtime);
    let real = kind === "equip" || kind === "inventory";
    runtime.state.craftPickerKind = kind;
    let overlay = runtime.deps.document.createElement("dialog");
    overlay.id = "craft-item-picker-overlay";
    overlay.className = real ? "craft-picker-overlay is-real" : "craft-picker-overlay";
    overlay.setAttribute("aria-labelledby", "craft-picker-title");
    overlay.onclick = (event) => {
      if (event.target === overlay) closeCraftItemPickerOverlay(runtime);
      const button = event.target.closest("[data-craft-page]");
      if (!button) return;
      overlay.dataset.page = button.dataset.craftPage;
      refreshCraftItemPickerOverlay(runtime);
    };
    overlay.onsubmit = (event) => {
      event.preventDefault();
      overlay.dataset.page = "0";
      refreshCraftItemPickerOverlay(runtime);
    };
    overlay.innerHTML = getCraftPickerPanelHtml(runtime, kind, real, options);
    if (real) runtime.deps.craftPickerHostUi.mount(overlay.querySelector(".craft-picker-body"), kind, { equip: runtime.handlers.selectCraftPickerEquipment, inventory: runtime.handlers.selectCraftPickerInventoryItem, refuse: runtime.handlers.refuseCraftPickerItem, ...options.picks });
    else decorateCraftPickerCards(runtime, overlay, kind);
    prepareCraftItemPickerDialog(runtime, overlay, kind, runtime.handlers.closeCraftItemPickerOverlay);
    runtime.deps.document.body.appendChild(overlay);
    overlay.showModal();
    if (real) (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/static-inventory-actions.mjs
  function applyInventoryRarityFilterChange(runtime) {
    if (runtime.deps.document.getElementById("craft-item-picker-overlay") && runtime.state.craftPickerKind) {
      refreshCraftItemPickerOverlay(runtime);
    }
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
  }
  function toggleInventoryRarityFilter(runtime, rarity) {
    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getInventoryRarityFilter(runtime);
    f[rarity] = !f[rarity];
    applyInventoryRarityFilterChange(runtime);
  }
  function toggleAllInventoryRarityFilter(runtime) {
    let f = getInventoryRarityFilter(runtime);
    let next = !isAllInventoryRarityFilterOn(runtime);
    getInventoryRarityFilterKeys().forEach((k) => {
      f[k] = next;
    });
    applyInventoryRarityFilterChange(runtime);
  }
  function toggleAutoSalvageRarity(runtime, rarity) {
    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getAutoSalvageRarities(runtime);
    f[rarity] = !f[rarity];
    refreshAutoSalvagePanel(runtime);
    if (typeof runtime.deps.syncSalvageControlsFromSettings === "function") (0, runtime.deps.syncSalvageControlsFromSettings)();
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(400);
  }
  function refreshAutoSalvagePanel(runtime) {
    let host = runtime.deps.document.getElementById("ui-equipment-auto-salvage");
    if (host) host.innerHTML = runtime.deps.equipmentLootUi.renderAutoSalvage(renderAutoSalvageRarityChips(runtime));
  }
  function resetSearchFilter(runtime, key) {
    updateSearchFilter(runtime, key, "");
  }

  // modules/ui/static-jewel-details.mjs
  var JEWEL_TONES = [
    [["firePctDmg", "resF", "igniteChance"], "#ff9a76"],
    [["coldPctDmg", "resC", "freezeChance"], "#8fd3ff"],
    [["lightPctDmg", "resL", "shockChance"], "#ffe083"],
    [["chaosPctDmg", "resChaos", "dotPctDmg", "poisonChance"], "#c7a6ff"],
    [["armor", "armorPct", "dr"], "#ffd2a6"],
    [["evasion", "evasionPct", "deflectChance", "deflectDamageReduce"], "#baffc2"],
    [["energyShield", "energyShieldPct", "energyShieldRegen"], "#8fdcff"],
    [["flatHp", "pctHp", "regen"], "#ffb3b3"],
    [["crit", "critDmg"], "#ffd6f2"],
    [["aspd", "move"], "#fff3a8"]
  ];
  function getJewelStatToneColor(runtime, statId) {
    return JEWEL_TONES.find(([ids]) => ids.includes(statId))?.[1] || "#d7e9ff";
  }
  function getCosmosKeystoneTooltipLine(runtime, jewel) {
    if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return "";
    const id = jewel.cosmosKeystone;
    const ksName = typeof runtime.deps.getAscendKeystoneName === "function" ? (0, runtime.deps.getAscendKeystoneName)(id) : id;
    const owner = typeof runtime.deps.getAscendKeystoneOwnerClass === "function" ? (0, runtime.deps.getAscendKeystoneOwnerClass)(id) : null;
    const ascName = owner && runtime.deps.CLASS_TEMPLATES[owner] ? `(${runtime.deps.CLASS_TEMPLATES[owner].name})` : "";
    const active = Array.isArray(runtime.deps.game.cosmosTwinKeystones) && runtime.deps.game.cosmosTwinKeystones.includes(id);
    return `<div class="tooltip-line" style="color:${active ? "#8fe7b0" : "#ffd68a"};">${(0, runtime.deps._t)("🔯 배정 키스톤: {ksName}{ascName}{value}", { ksName: (0, runtime.deps.escapeHTML)(ksName), ascName, value: active ? (0, runtime.deps._t)(", 할당 중") : (0, runtime.deps._t)(", 짝 주얼의 키스톤과 같으면 할당") })}</div>`;
  }
  function createJewelRangeTooltipHtml(runtime, jewel) {
    if (!jewel) return '<div class="tooltip-title">주얼</div><div class="tooltip-line">정보 없음</div>';
    let stats = (0, runtime.deps.getJewelStats)(jewel);
    let coreStats = stats.filter((stat) => !(0, runtime.deps.isJewelPetiteStat)(stat));
    let tierSummary = jewel.rarity !== "unique" && coreStats.length > 0 ? coreStats.reduce((sum, stat) => sum + Math.max(1, Math.floor(Number(stat.tier) || 1)), 0) / coreStats.length : null;
    let lines = stats.map((stat) => {
      let min = stat.valMin !== void 0 && stat.valMin !== null ? (0, runtime.deps.formatJewelStatValue)(stat.id, stat.valMin) : (0, runtime.deps.formatJewelStatValue)(stat.id, stat.val);
      let max = stat.valMax !== void 0 && stat.valMax !== null ? (0, runtime.deps.formatJewelStatValue)(stat.id, stat.valMax) : (0, runtime.deps.formatJewelStatValue)(stat.id, stat.val);
      let petite = (0, runtime.deps.isJewelPetiteStat)(stat);
      let tier = Number.isFinite(Number(stat.tier)) && !petite ? ` <span style="color:#ffd68a;">T${Math.floor(stat.tier)}</span>` : "";
      let petiteLabel = petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : "";
      let waxLabel = stat.waxBonus ? '<span style="color:#ffd98a;">밀랍 </span>' : "";
      let tone = getJewelStatToneColor(runtime, stat.id);
      return `<div class="tooltip-line"><span style="color:${tone};">${waxLabel}${petiteLabel}${(0, runtime.deps.getStatName)(stat.id)}: +${(0, runtime.deps.formatJewelStatValue)(stat.id, stat.val)}${tier}</span> <span style="color:var(--copy-bright);">${(0, runtime.deps._t)("(고정 범위 {min}~{max})", { min, max })}</span></div>`;
    }).join("");
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:var(--copy-bright);">${(0, runtime.deps._t)("옵션 평균 티어: T{tierSummary}", { tierSummary: tierSummary.toFixed(1) })}</div>` : "";
    let fixedTierLine = jewel.rarity === "unique" ? `<div class="tooltip-line" style="color:#bca7dc;">${(0, runtime.deps._t)("고유 고정 옵션, 티어 평가 제외")}</div>` : "";
    let uniqueLine = jewel.rarity === "unique" && (0, runtime.deps.getJewelUniqueEffectText)(jewel) ? `<div class="tooltip-line" style="color:#d7b8ff;">${(0, runtime.deps._t)("✨ 고유 효과: {jewel}", { jewel: (0, runtime.deps.escapeHTML)((0, runtime.deps.getJewelUniqueEffectText)(jewel)) })}</div>` : "";
    let keystoneLine = getCosmosKeystoneTooltipLine(runtime, jewel);
    let main = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(jewel.name || "주얼"))}</div>${uniqueLine}${keystoneLine}${fixedTierLine}${tierLine}${lines || (0, runtime.deps._t)('<div class="tooltip-line">옵션 정보 없음</div>')}`;
    return main;
  }

  // modules/ui/static-search-highlight.mjs
  function highlightSearchText(runtime, text, query) {
    let raw = String(text || "");
    let lower = raw.toLowerCase();
    let tokens = (0, runtime.deps.getSearchTokens)(query).sort((a, b) => b.length - a.length);
    if (tokens.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    let ranges = [];
    tokens.forEach((tok) => {
      if (!tok) return;
      let needle = tok.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        let idx = lower.indexOf(needle, from);
        if (idx < 0) break;
        let start = idx;
        let end = idx + needle.length;
        if (needle.length > 0) ranges.push([start, end]);
        from = idx + Math.max(1, needle.length);
      }
    });
    if (ranges.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let merged = [];
    for (let i = 0; i < ranges.length; i++) {
      let cur = ranges[i];
      if (merged.length <= 0) {
        merged.push(cur.slice());
        continue;
      }
      let last = merged[merged.length - 1];
      if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
      else merged.push(cur.slice());
    }
    let out = "";
    let cursor = 0;
    merged.forEach(([start, end]) => {
      if (start > cursor) out += (0, runtime.deps.escapeHTML)(raw.slice(cursor, start));
      out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${(0, runtime.deps.escapeHTML)(raw.slice(start, end))}</mark>`;
      cursor = end;
    });
    if (cursor < raw.length) out += (0, runtime.deps.escapeHTML)(raw.slice(cursor));
    return out;
  }

  // modules/ui/static-currency-tooltip.mjs
  function getCurrencyIconHtml(runtime, orbKey, className = "currency-icon") {
    let icon = runtime.deps.ORB_DB[orbKey] && runtime.deps.ORB_DB[orbKey].icon;
    return icon ? `<img class="${className}" src="${icon}" alt="" aria-hidden="true">` : "";
  }
  function showCurrencyCardTooltip(runtime, event, key, reason) {
    let orb = runtime.deps.ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title currency-tooltip-title">${getCurrencyIconHtml(runtime, key, "currency-tooltip-icon")}<span>${(0, runtime.deps._t)(orb.name)}</span></div><div class="tooltip-line">${(0, runtime.deps._t)(orb.desc) || ""}</div><div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${(0, runtime.deps._t)("상태: {reason}", { reason: reason || "-" })}</div>`;
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, html, "#f1c40f");
  }

  // modules/ui/static-frame-progress.mjs
  function prepareStaticUi(runtime) {
    runtime.deps.craftingWorkspaceState.capture(runtime.deps.game);
    runtime.deps.currencyExchange.capture(runtime.deps.game);
    (0, runtime.deps.updateInventoryFullWarnings)();
    (0, runtime.deps.announceMapPrimaryContentUnlocks)();
    (0, runtime.deps.syncMapPrimaryContentTabs)();
  }
  function syncStaticProgress(runtime) {
    (0, runtime.deps.tryUnlockMeteorContentByProgress)();
    if (runtime.deps.equipmentTriage) runtime.deps.equipmentTriage.checkFreshGear();
    if (typeof runtime.deps.requestGoalSystemRefresh === "function") (0, runtime.deps.requestGoalSystemRefresh)();
    (0, runtime.deps.validateItemTooltipAnchor)();
    (0, runtime.deps.applySeasonContentProgression)({ silent: false });
    (0, runtime.deps.refreshTabHeaderUiIfNeeded)();
    let passiveStateSig = [
      runtime.deps.game.passivePoints || 0,
      (runtime.deps.game.passives || []).length,
      (runtime.deps.game.discoveredPassives || []).length,
      runtime.deps.game.startNode || "",
      runtime.deps.game.ascendClass || "",
      runtime.deps.game.season || 1
    ].join("|");
    if (passiveStateSig !== runtime.state.lastReachableSignature) {
      runtime.state.lastReachableSignature = passiveStateSig;
      (0, runtime.deps.calculateReachableNodes)();
      (0, runtime.deps.refreshPassiveVisibility)();
    }
  }
  function syncStaticLoopControls(runtime) {
    (0, runtime.deps.applyPanelLayoutSettings)();
    let loopDecisionOverlay = runtime.deps.document.getElementById("loop-decision-overlay");
    if (loopDecisionOverlay) loopDecisionOverlay.classList.toggle("active", !!runtime.deps.game.pendingLoopDecision);
    (0, runtime.deps.updateLoopDecisionOverlayUi)();
    if (typeof runtime.deps.hotkeysUi !== "undefined") runtime.deps.hotkeysUi.sync();
    let loopReadyBanner = runtime.deps.document.getElementById("loop-ready-banner");
    if (loopReadyBanner) loopReadyBanner.classList.toggle("active", !!runtime.deps.game.pendingLoopReady);
    let combatLoopBtn = runtime.deps.document.getElementById("btn-combat-loop-advance");
    if (combatLoopBtn) combatLoopBtn.style.display = (0, runtime.deps.canShowCombatLoopAdvanceButton)() ? "inline-flex" : "none";
  }
  function renderStaticPassiveTree(runtime) {
    let charTabActive = (0, runtime.deps.getRenderingUiTabIds)().has("tab-char");
    if (charTabActive) {
      if ((0, runtime.deps.shouldRedrawPassiveTree)()) {
        (0, runtime.deps.resizePassiveTreeCanvas)(false);
        (0, runtime.deps.drawPassiveTree)();
      }
    }
  }

  // modules/ui/static-frame-timing.mjs
  function startStaticTiming(runtime) {
    const __perfNow = typeof runtime.deps.performance !== "undefined" && runtime.deps.performance.now ? () => runtime.deps.performance.now() : () => runtime.deps.Date.now();
    const __pm = [["start", __perfNow()]];
    const __mark = (n) => __pm.push([n, __perfNow()]);
    return { mark: __mark, now: __perfNow, marks: __pm };
  }
  function reportStaticTiming(runtime, timing) {
    const { now: __perfNow, marks: __pm } = timing;
    let __ptot = __perfNow() - __pm[0][1];
    if (__ptot > 150 || runtime.deps.perfLog) {
      let __parts = [];
      for (let i = 1; i < __pm.length; i++) __parts.push(`${__pm[i][0]}:${Math.round(__pm[i][1] - __pm[i - 1][1])}`);
      runtime.deps.console.warn(`[perf] updateStaticUI ${Math.round(__ptot)}ms | ${__parts.join(" ")}`);
    }
  }

  // modules/ui/tab-notification-keys.mjs
  var TAB_HEADER_NOTI_KEYS = ["char", "season", "items", "skills", "codex", "map", "traits", "talent", "journal", "currency", "fossil", "ascend", "loop", "social", "stump", "npcs"];
  var TAB_UNLOCK_BUTTON_KEYS = ["char", "season", "items", "skills", "codex", "map", "traits", "talent", "stump"];

  // modules/ui/static-frame-tabs.mjs
  function syncStaticTabHeader(runtime) {
    TAB_HEADER_NOTI_KEYS.forEach((key) => {
      let el = runtime.deps.document.getElementById("noti-" + key);
      if (!el) return;
      el.style.display = runtime.deps.game.noti[key] && (0, runtime.deps.isNotiEnabled)(key) ? "block" : "none";
    });
    TAB_UNLOCK_BUTTON_KEYS.forEach(runtime.deps.syncTabUnlockButton);
    let battleBtn = runtime.deps.document.getElementById("btn-tab-battle");
    if (battleBtn) battleBtn.style.display = (0, runtime.deps.isMobilePrimaryNavigationEnabled)() ? "flex" : "none";
    (0, runtime.deps.syncMergedTabLauncherVisibility)();
    if (typeof runtime.deps.hideOutOfGroupTabButtons === "function") (0, runtime.deps.hideOutOfGroupTabButtons)();
    let summarySkillTreeBtn = runtime.deps.document.getElementById("btn-summary-tab-char");
    if (summarySkillTreeBtn) {
      summarySkillTreeBtn.disabled = !runtime.deps.game.unlocks.char;
      summarySkillTreeBtn.innerText = runtime.deps.game.unlocks.char ? (0, runtime.deps._t)("스킬트리") : (0, runtime.deps._t)("스킬트리 (Lv.2)");
    }
  }
  function getStaticRenderContext(runtime) {
    let activeTabId = (0, runtime.deps.getActiveUiTabId)();
    let renderingTabIds = (0, runtime.deps.getRenderingUiTabIds)();
    let isTabRendering = (tabId) => renderingTabIds.has(tabId);
    let activeHostId = ((0, runtime.deps.getActiveTopLevelTabElement)() || {}).id || "";
    (0, runtime.deps.closeRelockedTabSurfaces)();
    let activeGate = activeTabId ? runtime.deps.TAB_UNLOCK_GATES[activeTabId] : null;
    if (activeGate && !runtime.deps.game.unlocks[activeGate] || runtime.deps.tabNavigation.needsFallback() || activeHostId && !(0, runtime.deps.isTabSurfaceAvailable)(activeHostId)) {
      runtime.deps.tabNavigation.clearFallback();
      (0, runtime.deps.switchTab)("tab-character");
      return;
    }
    return { renderingTabIds, isTabRendering, itemsTabActive: isTabRendering("tab-items"), sf: (0, runtime.deps.getSearchFilterState)() };
  }
  function syncStaticTradeButton(runtime) {
    const tradeButton = runtime.deps.document.getElementById("btn-tab-trade");
    if (tradeButton) tradeButton.style.display = runtime.deps.contentProgression.canOpen("tab-trade") ? "flex" : "none";
  }

  // modules/ui/static-frame-panels.mjs
  function renderStaticCharacter(runtime, context) {
    const { isTabRendering, pStats } = context;
    (0, runtime.deps.syncPassiveTreeHeader)();
    if (isTabRendering("tab-char")) (0, runtime.deps.renderPassiveInvestmentSummary)();
    runtime.deps.document.getElementById("ui-season-text-tab").innerText = runtime.deps.game.season;
    runtime.deps.document.getElementById("ui-season-pts").innerText = runtime.deps.game.seasonPoints;
    runtime.deps.document.getElementById("ui-ascend-pts").innerText = runtime.deps.game.ascendPoints;
    if (isTabRendering("tab-character")) {
      (0, runtime.deps.renderCharacterEhpSummary)(pStats);
      (0, runtime.deps.renderCharacterPassiveSpecialStats)(pStats);
    }
  }
  function renderStaticTraits(runtime) {
    if (runtime.deps.game.ascendClass) {
      runtime.deps.document.getElementById("ui-class-select").style.display = "none";
      runtime.deps.document.getElementById("ui-class-locked").style.display = "none";
      runtime.deps.document.getElementById("ui-class-tree").style.display = "block";
      runtime.deps.document.getElementById("ui-selected-class-name").innerText = "";
      runtime.deps.ascendancyTreeUi.render();
    } else if (runtime.deps.game.ascendPoints > 0) {
      runtime.deps.document.getElementById("ui-class-select").style.display = "block";
      runtime.deps.document.getElementById("ui-class-locked").style.display = "none";
      runtime.deps.document.getElementById("ui-class-tree").style.display = "none";
      (0, runtime.deps.fillAscendancyPickScreen)();
    } else {
      runtime.deps.document.getElementById("ui-class-select").style.display = "none";
      runtime.deps.document.getElementById("ui-class-locked").style.display = "block";
      runtime.deps.document.getElementById("ui-class-tree").style.display = "none";
      runtime.deps.document.getElementById("ui-class-trial-link").disabled = !runtime.deps.contentProgression.isUnlocked("battleTrials");
    }
  }
  function renderStaticKnowledge(runtime, context) {
    const { isTabRendering, pStats, sf } = context;
    if (isTabRendering("tab-codex")) runtime.deps.uniqueCodexUi.render();
    if (isTabRendering("tab-records") && typeof runtime.deps.renderRecordsTab === "function") (0, runtime.deps.renderRecordsTab)();
    if (isTabRendering("tab-guide")) runtime.deps.playerGuideUi.render();
    if (isTabRendering("tab-skills") && typeof runtime.deps.renderSkillGemScreen === "function") (0, runtime.deps.withBuildMemoPass)(() => (0, runtime.deps.renderSkillGemScreen)({ pStats, searchFilters: sf }));
  }
  function finishStaticPanels(runtime, context) {
    const { itemsTabActive, isTabRendering } = context;
    if (itemsTabActive) (0, runtime.deps.switchItemSubtab)(runtime.deps.game.itemSubtab || "item-tab-equip");
    if (isTabRendering("tab-skills")) {
      (0, runtime.deps.renderSkillAutoRulePanel)();
      (0, runtime.deps.switchSkillSubtab)(runtime.deps.game.skillSubtab || "skill-tab-equip");
    }
    if (isTabRendering("tab-map")) (0, runtime.deps.switchMapSubtab)(runtime.deps.game.mapSubtab || "map-tab-zones");
    (0, runtime.deps.syncSingleSubtabRows)();
  }

  // modules/ui/static-equipment-panel.mjs
  function renderEquipmentBagPanel(runtime, sf, isItemRarityVisible2, renderRarityFilterChips2) {
    (0, runtime.deps.syncSalvageControlsFromSettings)();
    if (typeof runtime.deps.salvageRecoveryUi !== "undefined") runtime.deps.salvageRecoveryUi.refreshShortcut();
    runtime.deps.equipmentWindowUi.renderBag();
    let invRarityFilterHost = runtime.deps.document.getElementById("ui-inventory-rarity-filter");
    if (invRarityFilterHost) (0, runtime.deps.writeHtmlIfChanged)(invRarityFilterHost, renderRarityFilterChips2("inventory"));
    if (runtime.deps.equipmentTriage) {
      runtime.deps.equipmentTriage.autoStart();
      runtime.deps.equipmentTriage.render();
    }
    const equipInvRows = (0, runtime.deps.getSortedEquipmentInventoryRows)(sf.equip, isItemRarityVisible2);
    const equipmentGridLayout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    const equipmentPage = runtime.deps.equipmentInventoryInteraction.renderPageControls(equipmentGridLayout, equipInvRows, sf.equip);
    const equipmentPageLayout = runtime.deps.equipmentInventoryGridRuntime.getPageLayout(equipmentGridLayout, equipmentPage);
    const equipmentPageKeys = new Set(equipmentPageLayout.entries.map((entry) => entry.key));
    const equipmentPageRows = equipInvRows.filter((row) => equipmentPageKeys.has(runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    (0, runtime.deps.renderEquipmentInventoryInspector)(equipmentPageRows);
    if (!runtime.deps.equipmentInventoryInteraction.isCarrying()) {
      (0, runtime.deps.renderSearchSection)("ui-inventory-list", "equip", "장비 검색 (이름/슬롯/옵션)", (0, runtime.deps.renderEquipmentInventoryGrid)(equipmentPageLayout, equipmentPageRows), "", "");
      let equipmentGridElement = runtime.deps.document.querySelector("#ui-inventory-list > .search-result-list");
      if (equipmentGridElement) equipmentGridElement.dataset.equipmentGridRows = String(equipmentPageLayout.rows);
    }
  }
  function renderStaticEquipment(runtime, context) {
    const { itemsTabActive, pStats, sf } = context;
    if (itemsTabActive) {
      (0, runtime.deps.syncEquipmentMobilePane)();
      (0, runtime.deps.renderEquipmentLoadoutSummary)(pStats);
      if (runtime.deps.equipmentLoadoutUi) runtime.deps.equipmentLoadoutUi.render();
      (0, runtime.deps.renderPaperdoll)("ui-equip-list", false);
    } else if (runtime.deps.craftPickerHostUi.shows("equip")) (0, runtime.deps.renderPaperdoll)("ui-equip-list", false);
    if (runtime.deps.stumpBoxUi.syncEquipmentBag(itemsTabActive) || itemsTabActive || runtime.deps.craftPickerHostUi.shows("inventory")) renderEquipmentBagPanel(runtime, sf, runtime.handlers.isItemRarityVisible, runtime.handlers.renderRarityFilterChips);
  }

  // modules/ui/static-craft-panel.mjs
  function buildSporeSummaryHtml(runtime) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    const targetDisabled = !item || !(0, runtime.deps.isSporeCraftEquipment)(item);
    const advanced = runtime.deps.contentProgression.isUnlocked("advancedSpores");
    const riftBlock = item ? runtime.deps.equipmentCrafting.getRiftHarvestBlockReason(item) : "";
    const rule = runtime.deps.STUMP_BOX_HARVEST_CRAFT;
    const costs = [...rule.rot.map((color) => [runtime.deps.stumpBox.harvestPriceKey("any", color), color]), [runtime.deps.stumpBox.harvestPriceKey(rule.riftKind), "physical"]];
    const held = costs.map(([key, color]) => `<div class="orb-tone" style="padding:5px; border-width:1px; border-style:solid; --orb-tone:${runtime.deps.STUMP_BOX_COLORS[color].tone}; font-size:12px;">${runtime.deps.stumpBox.harvestPriceName(key)}<br><strong>x ${runtime.deps.stumpBox.harvestPriceHeld(runtime.deps.game, key)}</strong></div>`).join("");
    return `<div class="craft-spores">
            <div class="craft-spores-title">${(0, runtime.deps._t)("수확 재료")}</div>
            <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:6px;">${held}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'corrupt')" onmousemove="showSporeCraftTooltip(event,'corrupt')" onmouseleave="hideInfoTooltip()" onclick="applyCorruptSporeToSelectedItem()" ${targetDisabled || !advanced ? "disabled" : ""}>${(0, runtime.deps._t)("부패 수확 (화염, 냉기, 번개 식물 1씩)")}</button>
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'rift')" onmousemove="showSporeCraftTooltip(event,'rift')" onmouseleave="hideInfoTooltip()" onclick="applyRiftSporeToSelectedItem()" ${targetDisabled || !advanced || riftBlock ? "disabled" : ""}>${(0, runtime.deps._t)("균열 수확 (화석 1, 뿌리 1)")}</button>
            </div>
        </div>`;
  }
  function getCraftEmptyStateHtml(runtime) {
    return `<div class="cl-empty-head"><strong>${(0, runtime.deps._t)("제작할 장비를 고르세요")}</strong><button type="button" id="craft-target-inventory-open" onclick="openCraftItemPickerOverlay('inventory')">${(0, runtime.deps._t)("인벤토리에서 고르기")}</button></div>${getCraftPickerBodyHtml(runtime, "equip")}`;
  }
  function getCraftTargetControlsHtml(runtime) {
    return `<div class="craft-target-actions"><button type="button" id="craft-target-equip-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('equip')">${(0, runtime.deps._t)("장비")}</button><button type="button" id="craft-target-inventory-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('inventory')">${(0, runtime.deps._t)("인벤토리")}</button></div>`;
  }
  function buildCraftActionButtons(runtime, item) {
    let v = getCraftActionValidators(runtime, item);
    let defs = [
      { key: "baseUpgrade", label: (0, runtime.deps._t)("베이스 업그레이드"), onclick: "upgradeSelectedItemBase()" }
    ];
    return defs.map((d) => `<button onclick="${d.onclick}" ${v[d.key] ? "" : "disabled"}>${(0, runtime.deps._t)(d.label)}</button>`).join("");
  }
  function renderStaticCrafting(runtime, itemsTabActive) {
    if (itemsTabActive) {
      let selectedItem = (0, runtime.deps.getSelectedCraftItem)(), details = "";
      if (selectedItem) {
        let equipSelectedButtonHtml = (0, runtime.deps.isCraftSelectionEquip)() ? "" : `<button onclick="equipSelectedCraftInventoryItem()">${(0, runtime.deps._t)("착용")}</button>`;
        let selectedUniqueEffectHtml = getSelectedUniqueEffectHtml(runtime, selectedItem);
        details = selectedUniqueEffectHtml + '<div class="craft-actions">' + equipSelectedButtonHtml + buildCraftActionButtons(runtime, selectedItem) + "</div>";
      }
      runtime.deps.craftingWorkspaceUi.render(false, { details, useState: runtime.handlers.getMobileCraftCurrencyUseState, targetControls: runtime.handlers.getCraftTargetControlsHtml, emptyState: runtime.handlers.getCraftEmptyStateHtml });
      (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-craft-spore-actions"), buildSporeSummaryHtml(runtime));
    }
  }
  function getSelectedUniqueEffectHtml(runtime, selectedItem) {
    let selectedUniqueEffectHint = selectedItem.rarity === "unique" && selectedItem.uniqueEffect ? (0, runtime.deps.getUniqueEffectApplicationHint)(selectedItem, typeof runtime.deps.isCraftSelectionEquip === "function" && (0, runtime.deps.isCraftSelectionEquip)(), typeof runtime.deps.getCraftSelectionRef === "function" ? (0, runtime.deps.getCraftSelectionRef)() : null) : "";
    let selectedUniqueEffectHtml = selectedItem.rarity === "unique" && selectedItem.uniqueEffect ? `<div class="craft-unique-effect"><strong>${(0, runtime.deps._t)("고유 효과")}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(selectedItem.uniqueEffect))}</span>${selectedUniqueEffectHint ? `<small>${(0, runtime.deps.escapeHTML)(selectedUniqueEffectHint)}</small>` : ""}</div>` : "";
    return selectedUniqueEffectHtml;
  }

  // modules/ui/static-map-destinations.mjs
  function renderTimeRiftPanel(runtime) {
    const host = runtime.deps.document.getElementById("ui-timerift-panel");
    if (!host) return;
    runtime.deps.document.getElementById("ui-timerift-header").style.display = "block";
    host.style.display = "block";
    runtime.deps.sideEncounterUi.timeRiftPanel(host, (0, runtime.deps.ensureTimeRiftState)());
  }
  function renderStaticSideMaps(runtime) {
    let timeRiftOpen = runtime.deps.explorationAtlasUi.discovered("map-explore-timerift");
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-timerift", timeRiftOpen);
    if (timeRiftOpen) renderTimeRiftPanel(runtime);
    let labyrinthOpen = runtime.deps.explorationAtlasUi.discovered("map-explore-labyrinth");
    runtime.deps.document.getElementById("ui-labyrinth-header").style.display = labyrinthOpen ? "block" : "none";
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-labyrinth", labyrinthOpen);
    if (labyrinthOpen) {
      runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById("ui-labyrinth-list"), runtime.deps.sideEncounterUi.labyrinthPanel());
    } else runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById("ui-labyrinth-list"), "");
    runtime.deps.document.getElementById("ui-deep-chaos-header").style.display = "none";
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-deep-chaos-list"), "");
    let deepChaosTabBtn = runtime.deps.document.getElementById("btn-map-explore-deep-chaos");
    if (deepChaosTabBtn) deepChaosTabBtn.style.display = "none";
    if (runtime.deps.game.mapExploreSubtab === "map-explore-deep-chaos") (0, runtime.deps.switchMapExploreSubtab)("map-explore-hunting");
  }
  function renderStaticMeteor(runtime) {
    let meteorUnlocked = runtime.deps.explorationAtlasUi.discovered("map-explore-meteor");
    runtime.deps.document.getElementById("ui-meteor-header").style.display = meteorUnlocked ? "block" : "none";
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-meteor", meteorUnlocked);
    let meteorAutoBtn = runtime.deps.document.getElementById("btn-meteor-auto-enter");
    if (meteorAutoBtn) {
      meteorAutoBtn.style.display = meteorUnlocked ? "inline-block" : "none";
      meteorAutoBtn.innerText = (0, runtime.deps._t)("자동입장 {value}", { value: runtime.deps.game.settings.autoEnterMeteor ? (0, runtime.deps._t)("켜짐") : (0, runtime.deps._t)("꺼짐") });
    }
    runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById("ui-meteor-list"), meteorUnlocked ? runtime.deps.sideEncounterUi.meteorPanel((0, runtime.deps.buildMapPowerEstimateHtml)((0, runtime.deps.getZone)(runtime.deps.METEOR_FALL_ZONE_ID))) : "");
  }
  function renderStaticRealmMaps(runtime) {
    runtime.deps.atlasUi.render();
    (0, runtime.deps.renderChaosRealmMapPanel)();
    (0, runtime.deps.renderSkyTowerMapPanel)();
    if (runtime.deps.game.mapSubtab === "map-tab-underworld") (0, runtime.deps.renderUnderworldMapPanel)();
    (0, runtime.deps.ensureOceanState)();
    if (runtime.deps.game.mapSubtab === "map-tab-ocean") runtime.deps.oceanDiveUi.render();
    if (runtime.deps.game.mapSubtab === "map-tab-fishing") {
      runtime.deps.fishingUi.render();
    }
  }
  function renderStaticTrials(runtime) {
    let availTrials = runtime.deps.explorationAtlasUi.trials().sort((a, b) => Number(runtime.deps.game.completedTrials.includes(a.id)) - Number(runtime.deps.game.completedTrials.includes(b.id)));
    runtime.deps.document.getElementById("ui-trials-header").style.display = availTrials.length > 0 ? "block" : "none";
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-trials", availTrials.length > 0);
    runtime.deps.sideEncounterUi.refreshDestinations();
    (0, runtime.deps.renderMapExploreNotiDots)();
    (0, runtime.deps.renderLoop9VoidRiftPanel)();
    (0, runtime.deps.renderTrialMapList)(availTrials);
    (0, runtime.deps.renderMobileMapNavigation)();
  }

  // modules/ui/static-map-panels.mjs
  function renderStaticMaps(runtime) {
    let mapTabActive = (runtime.deps.document.getElementById("tab-map") || {}).classList.contains("active");
    let activeMapExploreId = runtime.deps.game.mapExploreSubtab || "map-explore-hunting";
    (0, runtime.deps.renderLoop8BeehivePanel)(mapTabActive && activeMapExploreId === "map-explore-beehive");
    if (mapTabActive && activeMapExploreId === "map-explore-colony") (0, runtime.deps.renderLoop15ColonyPanel)();
    if (mapTabActive) {
      renderStaticHuntingMaps(runtime);
      renderStaticBossMaps(runtime);
      renderStaticSideMaps(runtime);
      renderStaticMeteor(runtime);
      renderStaticRealmMaps(runtime);
      renderStaticTrials(runtime);
    }
    return mapTabActive;
  }
  function renderStaticHuntingMaps(runtime) {
    let legacyMapOverview = runtime.deps.document.querySelector("#tab-map .map-overview-card");
    if (legacyMapOverview) legacyMapOverview.remove();
    let seasonMapCap = typeof runtime.deps.getVisibleHuntingMapCapZoneId === "function" ? (0, runtime.deps.getVisibleHuntingMapCapZoneId)() : Math.min((0, runtime.deps.getCurrentSeasonFinalZoneId)(), (0, runtime.deps.getAbyssZoneIdForDepth)(20));
    let highestMapZone = Math.min(Math.max(0, Math.floor(runtime.deps.game.maxZoneId || 0)), seasonMapCap);
    let mapZones = Array.from({ length: highestMapZone + 1 }, (_, idx) => (0, runtime.deps.getZone)(idx)).filter(Boolean);
    let recommendedHuntingZone = (0, runtime.deps.getRecommendedHuntingZone)(mapZones);
    let recommendedHuntingZoneId = recommendedHuntingZone ? Number(recommendedHuntingZone.id) : null;
    let mapRouteSummary = runtime.deps.document.getElementById("ui-map-route-summary");
    let routeSummaryHtml = (0, runtime.deps.buildMapRouteSummaryHtml)((0, runtime.deps.getZone)(runtime.deps.game.currentZoneId), recommendedHuntingZone);
    (0, runtime.deps.writeHtmlIfChanged)(mapRouteSummary, routeSummaryHtml);
    runtime.deps.mapListUi.render(mapZones, recommendedHuntingZoneId);
    for (const route of ["map-explore-chaos", "map-explore-beehive", "map-explore-voidrift", "map-explore-colony"]) {
      (0, runtime.deps.setExploreSubtabAvailable)(route, runtime.deps.explorationAtlasUi.discovered(route));
    }
    let boundaryState = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-beyond", runtime.deps.explorationAtlasUi.discovered("map-explore-beyond"));
    if (boundaryState.unlocked) (0, runtime.deps.renderBeyondBoundaryPanel)();
  }
  function renderStaticBossMaps(runtime) {
    let seasonBosses = runtime.deps.explorationAtlasUi.bosses();
    runtime.deps.document.getElementById("ui-season-boss-header").style.display = seasonBosses.length > 0 ? "block" : "none";
    (0, runtime.deps.setExploreSubtabAvailable)("map-explore-root-boss", seasonBosses.length > 0);
    let seasonBossRepeatWrap = runtime.deps.document.getElementById("ui-season-boss-repeat-wrap");
    let seasonBossRepeatBtn = runtime.deps.document.getElementById("btn-season-boss-repeat");
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = "none";
    if (seasonBossRepeatBtn) {
      seasonBossRepeatBtn.style.display = seasonBosses.length > 0 ? "inline-block" : "none";
      seasonBossRepeatBtn.innerText = (0, runtime.deps._t)("입장권 보스 반복 {value}", { value: runtime.deps.game.autoRepeatSeasonBoss ? (0, runtime.deps._t)("켜짐") : (0, runtime.deps._t)("꺼짐") });
      seasonBossRepeatBtn.style.background = runtime.deps.game.autoRepeatSeasonBoss ? "#2f6a42" : "#5b4a2f";
      seasonBossRepeatBtn.style.minWidth = "0";
    }
    runtime.deps.mapListUi.renderBosses(seasonBosses);
  }

  // modules/ui/static-season-nodes.mjs
  function renderSeasonNode(runtime, id, placement, x, y) {
    let node = (0, runtime.deps.getSeasonPassiveNodeDef)(id);
    if (!node) return "";
    const state = seasonNodePresentation(runtime, id, node);
    const { lv, active, cap, reqMet, statInfo, suffix, scaled, stateText } = state;
    const { style, horizontalClass, stateClass, maxedClass, actionAttrs } = seasonNodeLayout(id, x, y, state);
    return `<div class="loop-passive-node ${placement || ""} ${horizontalClass} ${stateClass} ${maxedClass}"${style}${actionAttrs} data-loop-hint="${id}" aria-label="${(0, runtime.deps._t)(node.name)}: ${(0, runtime.deps._t)(node.desc)}"><span class="loop-node-core">${(0, runtime.deps.renderPixelIcon)(seasonNodeIcons[node.stat] || "star", "loop-node-icon")}<span class="loop-node-rank">${active ? `${lv}/${cap}` : reqMet ? "+" : "×"}</span></span><span class="loop-node-tooltip"><strong>${(0, runtime.deps._t)(node.name)}</strong><small>${runtime.deps.statToneText.html((0, runtime.deps._t)(node.desc))}</small><em style="color:${(0, runtime.deps.getItemStatToneColor)(node.stat)}">${(0, runtime.deps._t)(statInfo.name) || node.stat} +${(0, runtime.deps.formatValue)(node.stat, scaled)}${suffix}</em><b>${stateText}</b>${active ? `<span class="loop-node-refund" role="button" tabindex="0" data-loop-action="refund" data-loop-id="${id}">${(0, runtime.deps._t)("마름병 포자로 반환")}</span>` : ""}</span></div>`;
  }
  function seasonNodePresentation(runtime, id, node) {
    let lv = (0, runtime.deps.getSeasonNodeLevel)(id);
    let active = lv > 0;
    let evolved = (0, runtime.deps.isSeasonTreeEvolved)();
    let cap = node.inner ? 1 : evolved ? 5 : 1;
    let unlockLoop = (0, runtime.deps.getSeasonPassiveUnlockLoop)(id);
    let contentUnlocked = (runtime.deps.game.season || 1) >= unlockLoop;
    let reqMet = contentUnlocked && (0, runtime.deps.isSeasonNodeRequirementMet)(node);
    let statInfo = runtime.deps.P_STATS[node.stat] || {};
    let suffix = statInfo.isPct ? "%" : "";
    let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
    const stateText = seasonNodeStateLabel(runtime, { contentUnlocked, unlockLoop, reqMet, active, lv, cap });
    return { lv, active, cap, reqMet, statInfo, suffix, scaled, stateText };
  }
  function seasonNodeStateLabel(runtime, state) {
    const { contentUnlocked, unlockLoop, reqMet, active, lv, cap } = state;
    let stateText = !contentUnlocked ? (0, runtime.deps._t)("루프 {unlockLoop} 해금", { unlockLoop }) : !reqMet ? "선행 노드 필요" : active ? lv >= cap ? "최대" : "강화" : "활성화";
    return stateText;
  }
  function seasonNodeLayout(id, x, y, state) {
    const { reqMet, active, lv, cap } = state;
    let style = Number.isFinite(x) && Number.isFinite(y) ? ` style="--loop-node-x:${x}%;--loop-node-y:${y}%;"` : "";
    let horizontalClass = x < 25 ? "tooltip-right" : x > 75 ? "tooltip-left" : "";
    let stateClass = active ? "active" : reqMet ? "available" : "locked";
    let maxedClass = active && lv >= cap ? "maxed" : "";
    let actionAttrs = reqMet ? ` role="button" tabindex="0" data-loop-action="press" data-loop-id="${id}"` : ' aria-disabled="true"';
    return { style, horizontalClass, stateClass, maxedClass, actionAttrs };
  }

  // modules/ui/static-season-panel.mjs
  function renderStaticSeason(runtime) {
    let seasonVisible = runtime.deps.game.season > 1 || runtime.deps.game.seasonPoints > 0;
    runtime.deps.document.getElementById("trait-season-section").style.display = seasonVisible ? "block" : "none";
    runtime.deps.document.getElementById("season-content-section").style.display = seasonVisible ? "block" : "none";
    runtime.deps.loopClimbUi.render();
    runtime.deps.worldTreeBarkUi.renderBarkPanel();
    renderStaticSeasonRoadmap(runtime);
    renderStaticSeasonOrbit(runtime);
  }
  function renderStaticSeasonRoadmap(runtime) {
    let seasonRoadmapKeys = Object.keys(runtime.deps.SEASON_CONTENT_ROADMAP).map(Number).filter((v) => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    let collapsePast = runtime.deps.game.settings.collapsePastLoopMilestones !== false;
    let roadmapToggle = runtime.deps.document.getElementById("btn-toggle-past-loop-milestones");
    if (roadmapToggle) roadmapToggle.innerText = collapsePast ? (0, runtime.deps._t)("지난 루프 펼치기") : (0, runtime.deps._t)("지난 루프 접기");
    let pastRoadmapCount = seasonRoadmapKeys.filter((seasonNum) => seasonNum < runtime.deps.game.season).length;
    let collapsedRoadmapSummary = collapsePast && pastRoadmapCount > 0 ? `<div style="color:#78d99a; border:1px dashed rgba(46,204,113,.55); border-radius:8px; padding:8px 12px;">${(0, runtime.deps._t)("완료한 지난 루프 이정표 {pastRoadmapCount}개가 접혀 있습니다.", { pastRoadmapCount })}</div>` : "";
    let roadmapCards = seasonRoadmapKeys.map((seasonNum) => {
      let def = runtime.deps.SEASON_CONTENT_ROADMAP[seasonNum];
      if (!def) return "";
      let unlocked = seasonNum <= runtime.deps.game.season;
      let current = seasonNum === runtime.deps.game.season;
      let stateColor = current ? "#f1c40f" : unlocked ? "#2ecc71" : "#7f8c8d";
      let stateText = current ? "진행 중" : unlocked ? "지남" : "잠김";
      let reqText = (0, runtime.deps.getLoopAbyssRequirementText)(seasonNum);
      let hiddenStyle = collapsePast && unlocked && !current ? "display:none;" : "";
      return `<div style="${hiddenStyle}background:#121822; border:1px solid ${stateColor}; border-radius:8px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <strong style="color:${stateColor};">${(0, runtime.deps._t)(def.title)}</strong><span style="color:${stateColor}; font-size:12px;">${stateText}</span>
            </div>
            <div style="color:var(--copy-bright); font-size:12px; line-height:1.5;">• ${reqText}<br>${(def.features || []).map((v) => `• ${v}`).join("<br>")}</div>
        </div>`;
    }).join("");
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-season-content-roadmap"), collapsedRoadmapSummary + roadmapCards || `<div style="color:var(--copy-muted);">${(0, runtime.deps._t)("루프 1을 클리어하면 루프 이정표가 열립니다.")}</div>`);
  }
  function renderStaticSeasonOrbit(runtime) {
    let seasonNodeIds = Object.keys(runtime.deps.SEASON_NODES || {});
    let activeSeasonNodeCount = seasonNodeIds.filter((id) => (0, runtime.deps.getSeasonNodeLevel)(id) > 0).length;
    let seasonEvolved = (0, runtime.deps.isSeasonTreeEvolved)();
    let seasonSummary = `<div class="trait-progress-summary"><div><strong>${(0, runtime.deps._t)(seasonEvolved ? "순환 완성" : "우로보로스 원환")}</strong><span>${(0, runtime.deps._t)("{n}/{total} 노드 활성화", { n: activeSeasonNodeCount, total: seasonNodeIds.length })}</span></div><div><strong>${(0, runtime.deps._t)("{max} 포인트", { max: Math.max(0, Math.floor(runtime.deps.game.seasonPoints || 0)) })}</strong><span>${seasonEvolved ? (0, runtime.deps._t)("외곽 노드 강화 및 내부 노드 투자 가능") : (0, runtime.deps._t)("남은 원형 노드 {max}개", { max: Math.max(0, seasonNodeIds.length - activeSeasonNodeCount) })}</span></div></div>`;
    let ringNodes = runtime.deps.SEASON_OUROBOROS_RING_NODES.map((id, index) => {
      const angle = (90 - index * 360 / runtime.deps.SEASON_OUROBOROS_RING_NODES.length) * Math.PI / 180;
      const radius = 40.7;
      return renderSeasonNode(runtime, id, id === "s_root" ? "origin-node" : "ring-node", 50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius);
    }).join("");
    let innerIds = Object.keys(runtime.deps.SEASON_INNER_NODES || {});
    let innerNodes = seasonEvolved ? innerIds.map((id, index) => {
      let angle = (-90 + index * 360 / innerIds.length) * Math.PI / 180;
      return renderSeasonNode(runtime, id, "inner-node", 50 + Math.cos(angle) * 17.2, 50 + Math.sin(angle) * 17.2);
    }).join("") : "";
    let innerCircle = seasonEvolved ? '<div class="loop-magic-circle" aria-hidden="true"><span class="loop-magic-runes"></span><span class="loop-magic-core"></span></div>' : "";
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-season-tree"), `${seasonSummary}<div class="loop-passive-orbit ${seasonEvolved ? "complete" : ""}"><div class="loop-orbit-ambient" aria-hidden="true"></div><span class="loop-ouroboros-silhouette" aria-hidden="true"></span>${innerCircle}${(0, runtime.deps.loopOrbitCenterHtml)()}${ringNodes}${innerNodes}</div>`);
  }

  // modules/ui/static-journal-model.mjs
  function getStaticJournalModel(runtime) {
    let unlocked = new Set((runtime.deps.game.journalEntries || []).filter((id) => runtime.deps.JOURNAL_DB[id]));
    let orderedIds = runtime.deps.JOURNAL_ENTRY_ORDER.filter((id) => runtime.deps.JOURNAL_DB[id] && (!runtime.deps.JOURNAL_DB[id].discoveryOnly || unlocked.has(id)));
    let entries = orderedIds.map((id) => ({ id, def: runtime.deps.JOURNAL_DB[id] }));
    let availabilityById = new Map(entries.map((entry) => [entry.id, runtime.deps.storyJournalUi.getJournalEntryAvailability(entry, Array.from(unlocked))]));
    let categoryCounts = {};
    entries.forEach(({ id }) => {
      let category = runtime.deps.storyJournalUi.getJournalCategory(id);
      if (!categoryCounts[category]) categoryCounts[category] = { total: 0, unlocked: 0 };
      categoryCounts[category].total++;
      if (unlocked.has(id)) categoryCounts[category].unlocked++;
    });
    let standardEntries = entries.filter(({ def }) => !def.hidden);
    let hiddenEntries = entries.filter(({ id }) => runtime.deps.storyJournalUi.getJournalCategory(id) === "숨겨진 기록");
    let unlockedCount = entries.filter(({ id }) => unlocked.has(id)).length;
    let standardUnlockedCount = standardEntries.filter(({ id }) => unlocked.has(id)).length;
    let hiddenUnlockedCount = hiddenEntries.filter(({ id }) => unlocked.has(id)).length;
    let rewardCount = entries.filter(({ id, def }) => unlocked.has(id) && !!(def.bonus || def.displayEffect)).length;
    let progressPct = standardEntries.length > 0 ? Math.floor(standardUnlockedCount / standardEntries.length * 100) : 0;
    let availableEntries = entries.filter(({ id }) => availabilityById.get(id) === "available");
    return { unlocked, entries, availabilityById, categoryCounts, standardEntries, hiddenEntries, unlockedCount, standardUnlockedCount, hiddenUnlockedCount, rewardCount, progressPct, availableEntries };
  }

  // modules/ui/static-journal-hints.mjs
  function getJournalHint(runtime, id, def) {
    if (def && def.hint) return def.hint;
    let actMatch = /^act_(\d+)$/.exec(id);
    if (actMatch) return (0, runtime.deps._t)("액트 {actMatch} 보스 처치", { actMatch: actMatch[1] });
    return journalHintById[id] || "관련 콘텐츠 탐험";
  }

  // modules/ui/static-journal-summary.mjs
  function renderJournalNextTarget(runtime, model) {
    const { availableEntries, unlockedCount, entries } = model;
    let nextLocked = availableEntries[0];
    let nextTarget = "";
    if (nextLocked) {
      let nextAction = runtime.deps.storyJournalUi.getJournalEntryAction(nextLocked.id);
      let nextTitle = nextLocked.def.hidden ? "숨겨진 기록" : nextLocked.def.title;
      nextTarget = `<div class="journal-next-target">
                <div><span>${(0, runtime.deps._t)("확인 가능한 해금 조건 {length}개", { length: availableEntries.length })}</span><strong>${nextTitle}</strong><small>${getJournalHint(runtime, nextLocked.id, nextLocked.def)}${availableEntries.length > 1 ? (0, runtime.deps._t)(", 다른 조건 {value}개", { value: availableEntries.length - 1 }) : ""}</small></div>
                ${nextAction ? `<button type="button" data-journal-action="${nextLocked.id}">${(0, runtime.deps._t)(nextAction.label)}</button>` : ""}
            </div>`;
    } else if (unlockedCount === entries.length && entries.length > 0) {
      nextTarget = `<div class="journal-next-target is-complete"><div><span>${(0, runtime.deps._t)("기록 완성")}</span><strong>${(0, runtime.deps._t)("모든 저널을 해금했습니다.")}</strong><small>${(0, runtime.deps._t)("영구 효과와 세계의 단서가 모두 활성화되었습니다.")}</small></div></div>`;
    }
    return nextTarget;
  }
  function renderStaticJournalSummary(runtime, model) {
    const { entries, categoryCounts, standardEntries, hiddenEntries, unlockedCount, standardUnlockedCount, hiddenUnlockedCount, rewardCount, progressPct } = model;
    const nextTarget = renderJournalNextTarget(runtime, model);
    let summary = `<div class="journal-summary">
            <div class="journal-summary-main">
                <div><strong>${(0, runtime.deps._t)("주요 기록 {standardUnlockedCount}/{length}", { standardUnlockedCount, length: standardEntries.length })}</strong><span>${(0, runtime.deps._t)("전체 {unlockedCount}/{length}, 숨겨진 기록 {hiddenUnlockedCount}/{length2}, 영구 효과 {rewardCount}개", { unlockedCount, length: entries.length, hiddenUnlockedCount, length2: hiddenEntries.length, rewardCount })}</span></div>
                <b>${progressPct}%</b>
            </div>
            <div class="journal-progress"><i style="width:${progressPct}%"></i></div>
            <div class="journal-category-strip" role="group" aria-label="${(0, runtime.deps._t)("저널 분류")}"><button type="button" data-journal-filter="전체">${(0, runtime.deps._t)("전체")}</button>${categoryOrder.filter((name) => categoryCounts[name]).map((name) => {
      let count = categoryCounts[name];
      return `<button type="button" data-journal-filter="${name}">${(0, runtime.deps._t)(name)} <b>${count.unlocked}</b></button>`;
    }).join("")}</div>
            <label class="journal-conditions"><input type="checkbox" data-journal-conditions> ${(0, runtime.deps._t)("해금 조건 보기")}</label>
        </div>${nextTarget}<p class="journal-empty" hidden>${(0, runtime.deps._t)("아직 획득한 기록이 없습니다.")}</p>`;
    return summary;
  }

  // modules/ui/static-journal-cards.mjs
  function renderStaticJournalCard(runtime, model, entry) {
    const { id, def, isUnlocked, availability, available, displayTitle, rewardText, action, stateLabel, lockedHint } = journalCardPresentation(runtime, model, entry);
    return `<article class="journal-card ${isUnlocked ? "is-unlocked" : "is-locked"} is-${availability} ${def.hidden ? "is-hidden" : ""}">
                        ${isUnlocked ? `<button type="button" class="journal-card-head journal-entry-open" data-journal-entry="${id}"><strong>${displayTitle}</strong><span>${(0, runtime.deps._t)("읽기 ›")}</span></button>` : `<div class="journal-card-head"><strong>${displayTitle}</strong><span>${stateLabel}</span></div>`}
                        <div class="journal-card-body">${isUnlocked ? "" : available ? `<p class="journal-hint">${getJournalHint(runtime, id, def)}</p>` : `<p class="journal-hint">${lockedHint}</p>`}</div>
                        ${rewardText ? `<div class="journal-reward ${isUnlocked ? "" : "is-preview"}">${isUnlocked ? (0, runtime.deps._t)("영구 효과") : (0, runtime.deps._t)("기록 보상")}, ${rewardText}</div>` : ""}
                        ${action ? `<button type="button" class="journal-card-action" data-journal-action="${id}">${(0, runtime.deps._t)(action.label)}</button>` : ""}
                    </article>`;
  }
  function journalCardPresentation(runtime, model, entry) {
    const { unlocked, availabilityById } = model;
    const { id, def } = entry;
    let isUnlocked = unlocked.has(id);
    let availability = availabilityById.get(id);
    let available = availability === "available";
    let displayTitle = isUnlocked || available ? (0, runtime.deps._t)(def.title) : def.hidden ? (0, runtime.deps._t)("히든 저널, ???") : (0, runtime.deps._t)("미확인 기록");
    let rewardText = runtime.deps.storyJournalUi.journalRewardText(def, isUnlocked || available);
    let action = available ? runtime.deps.storyJournalUi.getJournalEntryAction(id) : null;
    let stateLabel = isUnlocked ? (0, runtime.deps._t)("해금") : (0, runtime.deps._t)("해금 필요");
    let lockedHint = runtime.deps.storyJournalUi.getJournalLockedHint(availability, id);
    return { id, def, isUnlocked, availability, available, displayTitle, rewardText, action, stateLabel, lockedHint };
  }
  function renderStaticJournalCards(runtime, model) {
    const { entries, unlocked } = model;
    let cards = categoryOrder.map((category) => {
      let rows = entries.filter(({ id }) => runtime.deps.storyJournalUi.getJournalCategory(id) === category);
      if (rows.length === 0) return "";
      return `<section class="journal-section" data-journal-category="${category}">
                <div class="journal-section-title">${(0, runtime.deps._t)(category)}<span>${rows.filter(({ id }) => unlocked.has(id)).length}/${rows.length}</span></div>
                <div class="journal-card-grid">${rows.map((entry) => renderStaticJournalCard(runtime, model, entry)).join("")}</div>
            </section>`;
    }).join("");
    return cards;
  }

  // modules/ui/static-journal-panel.mjs
  function renderStaticJournal(runtime, journalList) {
    if (!journalList) return;
    const model = getStaticJournalModel(runtime);
    const summary = renderStaticJournalSummary(runtime, model);
    const cards = renderStaticJournalCards(runtime, model);
    let journalHtml = summary + cards;
    const changed = journalList.__lastHtml !== journalHtml;
    if (changed) {
      journalList.innerHTML = journalHtml;
      journalList.__lastHtml = journalHtml;
    }
    runtime.deps.storyJournalUi.refreshArchiveFilter(changed);
  }

  // modules/ui/static-frame-render.mjs
  function performUpdateStaticUI(runtime) {
    prepareStaticUi(runtime);
    const timing = startStaticTiming(runtime), mark = timing.mark;
    syncStaticProgress(runtime);
    let pStats = (0, runtime.deps.getUiPlayerStats)();
    if ((0, runtime.deps.normalizeSupportLoadout)(true, pStats.__uiFallbackStats ? null : pStats)) pStats = (0, runtime.deps.getUiPlayerStats)();
    mark("stats");
    runtime.deps.uiStats.store(pStats);
    (0, runtime.deps.updateCombatUI)(pStats);
    mark("combatUI");
    syncStaticLoopControls(runtime);
    renderStaticPassiveTree(runtime);
    mark("tree");
    syncStaticTabHeader(runtime);
    const context = getStaticRenderContext(runtime);
    if (!context) return;
    context.pStats = pStats;
    renderStaticCharacter(runtime, context);
    renderStaticEquipment(runtime, context);
    renderStaticCrafting(runtime, context.itemsTabActive);
    syncStaticTradeButton(runtime);
    mark("midRender");
    (0, runtime.deps.renderVisibleManagementPanels)(context.renderingTabIds);
    mark("market");
    const mapTabActive = renderStaticMaps(runtime);
    mark("mapPanels");
    if (mapTabActive) runtime.deps.explorationAtlasUi.render();
    if (context.isTabRendering("tab-season")) renderStaticSeason(runtime);
    if (context.isTabRendering("tab-traits")) renderStaticTraits(runtime);
    mark("progressionTabs");
    renderStaticKnowledge(runtime, context);
    mark("codex+skills");
    renderStaticJournal(runtime, context.isTabRendering("tab-journal") ? runtime.deps.document.getElementById("ui-journal-list") : null);
    mark("journal");
    finishStaticPanels(runtime, context);
    mark("end");
    reportStaticTiming(runtime, timing);
  }

  // modules/ui/static-ui-view.mjs
  function createStaticUiView(deps) {
    const runtime = { deps, state: { lastReachableSignature: "", craftPickerKind: null, pickerDialog: null }, owner: deps.game, active: true, handlers: {} };
    const handlers = { getCraftOrbUseState, updateSearchFilter, resetSearchFilter, toggleInventoryRarityFilter, toggleAllInventoryRarityFilter, renderRarityFilterChips, refreshAutoSalvagePanel, toggleAutoSalvageRarity, bulkSalvageEquipBySearch, openCraftItemPickerOverlay, closeCraftItemPickerOverlay, selectCraftPickerEquipment, selectCraftPickerInventoryItem, createJewelRangeTooltipHtml, isItemRarityVisible, getGemSearchText, isGemLibraryMatchVisible, highlightSearchText, showCurrencyCardTooltip, performUpdateStaticUI, getMobileCraftCurrencyUseState, getCraftTargetControlsHtml, getCraftEmptyStateHtml, refuseCraftPickerItem };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    const api = {};
    for (const name of ["getCraftOrbUseState", "updateSearchFilter", "resetSearchFilter", "toggleInventoryRarityFilter", "toggleAllInventoryRarityFilter", "renderRarityFilterChips", "refreshAutoSalvagePanel", "toggleAutoSalvageRarity", "bulkSalvageEquipBySearch", "openCraftItemPickerOverlay", "closeCraftItemPickerOverlay", "selectCraftPickerEquipment", "selectCraftPickerInventoryItem", "createJewelRangeTooltipHtml", "isItemRarityVisible", "getGemSearchText", "isGemLibraryMatchVisible", "highlightSearchText", "showCurrencyCardTooltip", "performUpdateStaticUI"]) {
      api[name] = (...args) => {
        if (syncOwner(runtime)) return runtime.handlers[name](...args);
      };
    }
    api.dispose = () => {
      if (!runtime.active) return;
      runtime.active = false;
      runtime.handlers.closeCraftItemPickerOverlay();
    };
    return Object.freeze(api);
  }
  function syncOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
      runtime.owner = runtime.deps.game;
      runtime.state.lastReachableSignature = "";
      runtime.handlers.closeCraftItemPickerOverlay();
    }
    return true;
  }

  // modules/ui/battle-presentation-gates.mjs
  var PAUSE_OVERLAYS = [
    ".tutorial-overlay.active:not(#tutorial-overlay):not(#death-overlay)",
    "#act-exploration-dialog[open]",
    "#beehive-choice-overlay",
    ".selection-overlay",
    "#mobile-craft-currency-overlay",
    "#craft-item-picker-overlay"
  ];
  function battlePresentationSuspended(deps) {
    return deps.document.hidden || deps.background.appInactive || deps.background.processing || deps.startupOpen() || deps.loadingOpen();
  }
  function overlayOpen(deps, selector) {
    const element = deps.document.querySelector(selector);
    if (!element) return false;
    if (element.classList && element.classList.contains("active")) return true;
    const style = typeof deps.window.getComputedStyle === "function" ? deps.window.getComputedStyle(element) : null;
    return !style || style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
  }
  function pauseSettingOverlayOpen(deps) {
    return PAUSE_OVERLAYS.some((selector) => overlayOpen(deps, selector));
  }
  function tutorialPausingCombat(deps) {
    if (!(deps.game.settings && deps.game.settings.pauseGameOnOverlay)) return false;
    return deps.tutorialOpen() && deps.tutorialActions.requiresAttention(deps.activeTutorial) || deps.tutorialActions.holdsQueue();
  }

  // modules/ui/mobile-battle-dock.mjs
  var MAP_CONTEXTS = [
    ["atlas", "map-explore-worldtree"],
    ["labyrinth", "map-explore-labyrinth"],
    ["chaosRealm", "map-tab-chaos-realm"],
    ["sky", "map-tab-sky"],
    ["colony", "map-explore-colony"],
    ["beehive", "map-explore-beehive"],
    ["timerift", "map-explore-timerift"],
    ["underworld", "map-tab-underworld"]
  ];
  function setBattlePreviewCollapsed(deps, host, collapsed) {
    host.classList.toggle("is-collapsed", collapsed);
    const toggle = host.querySelector("[data-pip-toggle]");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", deps._t(collapsed ? "작은 전투 화면 펼치기" : "작은 전투 화면 접기"));
    toggle.textContent = collapsed ? deps._t("전투 보기") : deps._t("접기");
  }
  function syncContext(deps, host, context) {
    if ((host.dataset.compactContext || "") !== context) {
      if (host.hasAttribute("data-context-collapsed")) {
        setBattlePreviewCollapsed(deps, host, host.dataset.contextCollapsed === "true");
        delete host.dataset.contextCollapsed;
      }
      if (context) {
        host.dataset.contextCollapsed = String(host.classList.contains("is-collapsed"));
        setBattlePreviewCollapsed(deps, host, true);
      }
      host.dataset.compactContext = context;
    }
    for (const [name, id] of MAP_CONTEXTS) {
      const panel = deps.document.getElementById(id);
      if (!panel) continue;
      const hasPip = context === name && deps.game.settings.showMobileBattlePip !== false;
      panel.classList.toggle("has-battle-pip", hasPip);
      panel.classList.toggle("is-pip-expanded", hasPip && !host.classList.contains("is-collapsed"));
    }
  }
  function itemTarget(document2) {
    if (!document2.querySelector("#tab-items.active")) return { context: "", anchor: null };
    const toggle = document2.querySelector("#tab-items.active #item-tab-equip.active .eqw-mini-toggle");
    return { context: "items", anchor: toggle && toggle.offsetParent ? toggle.closest(".eqw-summary-card") : null };
  }
  function dockTarget(deps) {
    const document2 = deps.document;
    if (!deps.display.matches("(max-width: 1080px)")) return { context: "", anchor: null };
    if (document2.querySelector("#tab-guide.active")) return { context: "guide", anchor: null };
    const workshop = document2.querySelector('#tab-map.active #map-tab-fishing.active #fishing-workshop[data-mobile-selected="true"] #fishing-battle-preview');
    if (workshop) return { context: "fishing", anchor: workshop };
    const title = deps.display.matches("(orientation: landscape) and (max-height: 600px)") ? document2.querySelector("#tab-char.active .merged-tab-shell:not(:has(> .window-tab-strip:not([hidden]))) .h2-right") : null;
    if (title) return { context: "tree", anchor: title };
    const map = MAP_CONTEXTS.find(([, id]) => document2.querySelector(`#tab-map.active #${id}.active`));
    return map ? { context: map[0], anchor: null } : itemTarget(document2);
  }
  function dockBattlePreview(deps, host) {
    const dock = dockTarget(deps);
    syncContext(deps, host, dock.context);
    const docked = !!dock.anchor && (dock.context === "fishing" || host.classList.contains("is-collapsed"));
    host.classList.toggle("is-tree-docked", docked && dock.context === "tree");
    host.classList.toggle("is-summary-docked", docked && dock.context === "items");
    host.classList.toggle("is-workshop-docked", docked && dock.context === "fishing");
    const parent = docked ? dock.anchor : deps.document.body;
    if (host.parentElement !== parent) parent.appendChild(host);
  }

  // modules/ui/mobile-battle-preview.mjs
  var BASE_INTERVAL_MS = 150;
  var BLOCKING_SHEETS = "#passive-mobile-detail:not([hidden]), #ui-equipment-inventory-inspector:popover-open, .selection-overlay, dialog[open], .tutorial-overlay.active, #background-combat-result-overlay, #tab-settings.active, #tab-traits.active .ascend-detail:not(.is-empty), #tab-items.active .shop-info:not(:empty)";
  var MARKUP = '<button type="button" class="mobile-battle-pip-preview" data-pip-return data-i18n-attr="aria-label" aria-label="전투 화면으로 이동"><canvas width="320" height="180" aria-hidden="true"></canvas></button><div class="mobile-battle-pip-actions"><button type="button" data-pip-return data-i18n class="mobile-battle-dock-label">전투로</button><button type="button" data-pip-toggle aria-expanded="true" aria-label="작은 전투 화면 접기">접기</button></div>';
  var MobileBattlePreview = class {
    constructor(deps) {
      this.deps = deps;
      this.canvas = null;
      this.ctx = null;
      this.handle = null;
      this.errorReported = false;
      this.active = true;
      this.host = null;
      this.onClick = this.click.bind(this);
      this.onTick = this.tick.bind(this);
    }
    ensure() {
      let host = this.deps.document.getElementById("mobile-battle-pip");
      if (!host) {
        host = this.deps.document.createElement("div");
        host.id = "mobile-battle-pip";
        host.className = "mobile-battle-dock";
        host.style.display = "none";
        host.setAttribute("role", "region");
        host.setAttribute("aria-label", "작은 전투 화면");
        host.dataset.i18nAttr = "aria-label";
        host.innerHTML = MARKUP;
        this.deps.i18n.applyStatic(host);
        this.collapse(host, false);
        this.deps.document.body.appendChild(host);
      }
      if (this.host !== host) {
        if (this.host) this.host.removeEventListener("click", this.onClick);
        this.host = host;
        host.addEventListener("click", this.onClick);
        this.canvas = host.querySelector("canvas");
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      }
      return host;
    }
    collapse(host, collapsed) {
      setBattlePreviewCollapsed(this.deps, host, collapsed);
    }
    click(event) {
      if (!this.active) return;
      const host = this.host, toggle = event.target.closest("[data-pip-toggle]");
      if (toggle) {
        const collapsed = !host.classList.contains("is-collapsed");
        this.collapse(host, collapsed);
        dockBattlePreview(this.deps, host);
        if (collapsed) this.stop();
        else this.refresh();
      } else if (event.target.closest("[data-pip-return]")) this.deps.switchTab("tab-battle");
    }
    blocked() {
      return battlePresentationSuspended(this.deps) || this.deps.document.body.classList.contains("mobile-tab-drawer-open") || !!this.deps.document.querySelector(BLOCKING_SHEETS);
    }
    updateVisibility(schedule = true) {
      if (!this.active) return;
      const host = this.ensure();
      dockBattlePreview(this.deps, host);
      const mobile = this.deps.display.matches("(max-width: 1080px)");
      const battle = this.deps.document.getElementById("tab-battle").classList.contains("active");
      const blocked = mobile && !battle && this.blocked();
      const display = mobile && !battle && !blocked && this.deps.game.settings.showMobileBattlePip !== false ? "grid" : "none";
      if (host.style.display !== display) host.style.display = display;
      this.syncTimer(schedule);
    }
    syncTimer(schedule) {
      if (this.visible()) {
        if (schedule && this.handle === null) this.handle = this.deps.setTimeout(this.onTick, BASE_INTERVAL_MS);
      } else this.stop();
    }
    visible() {
      const host = this.deps.document.getElementById("mobile-battle-pip");
      return !!(host && host.style.display !== "none" && !host.classList.contains("is-collapsed"));
    }
    refresh() {
      if (!this.active || !this.visible() || battlePresentationSuspended(this.deps)) return;
      const src = this.deps.document.getElementById("battlefield-canvas");
      if (src.width !== this.canvas.width || src.height !== this.canvas.height || src.dataset.renderScale !== "1") {
        src.width = this.canvas.width;
        src.height = this.canvas.height;
        src.dataset.renderScale = "1";
        this.deps.canvasBox.forget();
      }
      this.deps.renderBattlefield(true, BASE_INTERVAL_MS);
      this.copy();
    }
    copy() {
      if (!this.active || !this.ctx || !this.canvas || !this.visible()) return;
      const src = this.deps.document.getElementById("battlefield-canvas");
      if (!src) return;
      if (src.width < 32 || src.height < 32) {
        src.width = this.canvas.width;
        src.height = this.canvas.height;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(src, 0, 0, this.canvas.width, this.canvas.height);
    }
    tick() {
      this.handle = null;
      if (!this.active) return;
      let nextDelay = BASE_INTERVAL_MS;
      try {
        this.updateVisibility(false);
        if (!this.visible() || battlePresentationSuspended(this.deps)) return;
        const began = this.deps.now();
        this.refresh();
        const cost = this.deps.now() - began;
        if (cost > 16) nextDelay = Math.min(420, Math.round(BASE_INTERVAL_MS + cost * 8));
        else if (cost > 9) nextDelay = BASE_INTERVAL_MS + 70;
        this.errorReported = false;
      } catch (error) {
        if (!this.errorReported) this.deps.console.error("mobile battle PIP refresh failed:", error);
        this.errorReported = true;
      }
      if (this.visible() && !battlePresentationSuspended(this.deps)) this.handle = this.deps.setTimeout(this.onTick, nextDelay);
    }
    start() {
      this.stop();
      this.updateVisibility();
    }
    stop() {
      if (this.handle !== null) this.deps.clearTimeout(this.handle);
      this.handle = null;
    }
    dispose() {
      this.active = false;
      this.stop();
      if (this.host) this.host.removeEventListener("click", this.onClick);
      this.host = this.canvas = this.ctx = null;
    }
  };

  // modules/ui/battle-canvas-interaction.mjs
  var BattleCanvasInteraction = class {
    constructor(deps) {
      this.deps = deps;
      this.canvas = null;
      this.active = true;
      this.frames = /* @__PURE__ */ new Set();
      this.lastMobile = void 0;
      this.waitingForLoad = false;
      this.onClick = (event) => {
        event.preventDefault();
        this.command(event);
      };
      this.onMove = (event) => this.deps.explorationUi.hover(this.canvas, event);
      this.onLeave = () => this.deps.explorationUi.hover(this.canvas, null);
      this.onLoad = () => {
        this.waitingForLoad = false;
        this.scheduleResize();
      };
    }
    bindBattleCanvas() {
      const canvas = this.deps.document.getElementById("battlefield-canvas");
      if (!this.active || !canvas || canvas.dataset.movementInteractionBound === "true") return;
      this.unbind();
      this.canvas = canvas;
      canvas.dataset.movementInteractionBound = "true";
      canvas.addEventListener("click", this.onClick);
      canvas.addEventListener("pointermove", this.onMove);
      canvas.addEventListener("pointerleave", this.onLeave);
    }
    setup() {
      if (this.active) this.deps.passiveScene.setupCanvasEvents(() => this.bindBattleCanvas());
    }
    command(event) {
      if (!this.active || this.deps.bossMoves.observer.sceneActive()) return;
      const point = this.deps.canvasBox.clientPoint(this.canvas, event.clientX, event.clientY);
      const npc = this.deps.titleCard.npcAt(point);
      if (npc && this.deps.unlockUi.openNpc(npc)) {
        this.face(point);
        return;
      }
      const door = this.deps.doors.targetAt(point);
      if (door) {
        this.deps.explorationUi.commandMove(door);
        return;
      }
      if (this.deps.explorationUi.lockOnAt(point)) return;
      const cell = this.deps.explorationView.cellAt(point);
      if (cell) this.deps.explorationUi.commandMove(cell, this.deps.explorationView.cellAt(point, true));
    }
    face(point) {
      const visual = this.deps.visual, hero = visual.playerPos;
      if (hero && Math.abs(point.x - hero.x) > 4) visual.playerFacingDirection = point.x < hero.x ? "west" : "east";
    }
    resize() {
      if (!this.active) return;
      this.responsiveLayout();
      const canvas = this.deps.document.getElementById("tree-canvas");
      if (canvas && canvas.offsetParent !== null) {
        this.deps.fitTree(false);
        if (this.deps.passiveScene.resizePassiveTreeCanvas(false)) this.deps.drawTree();
      }
      this.deps.resizeBattlefield();
      try {
        this.deps.renderBattlefield();
      } catch (error) {
        this.deps.console.error("renderBattlefield on resize failed:", error);
      }
    }
    queueFrame(action) {
      const handle = this.deps.requestFrame(() => {
        this.frames.delete(handle);
        if (this.active) action();
      });
      this.frames.add(handle);
    }
    scheduleResize() {
      if (!this.active) return;
      if (this.deps.document.readyState !== "complete") {
        if (!this.waitingForLoad) this.deps.window.addEventListener("load", this.onLoad, { once: true });
        this.waitingForLoad = true;
        return;
      }
      this.queueFrame(() => this.queueFrame(() => this.resize()));
    }
    resetDesktopScroll() {
      this.deps.window.scrollTo(0, 0);
      const document2 = this.deps.document;
      document2.documentElement.scrollTop = 0;
      document2.body.scrollTop = 0;
      const left = document2.getElementById("left-pane"), right = document2.getElementById("right-pane");
      if (left) left.scrollTop = 0;
      if (right) right.scrollTop = 0;
      document2.querySelectorAll(".tab-content").forEach((node) => {
        node.scrollTop = 0;
      });
    }
    responsiveLayout() {
      const mobile = this.deps.display.matches("(max-width: 1080px)");
      if (this.lastMobile && !mobile) {
        this.resetDesktopScroll();
        this.queueFrame(() => this.resetDesktopScroll());
      }
      this.lastMobile = mobile;
    }
    unbind() {
      if (!this.canvas) return;
      this.canvas.removeEventListener("click", this.onClick);
      this.canvas.removeEventListener("pointermove", this.onMove);
      this.canvas.removeEventListener("pointerleave", this.onLeave);
      delete this.canvas.dataset.movementInteractionBound;
      this.canvas = null;
    }
    dispose() {
      this.active = false;
      this.unbind();
      this.deps.window.removeEventListener("load", this.onLoad);
      this.waitingForLoad = false;
      for (const handle of this.frames) this.deps.cancelFrame(handle);
      this.frames.clear();
      this.lastMobile = void 0;
    }
  };

  // modules/application/battle-presentation-loop.mjs
  var BattlePresentationLoop = class {
    constructor(deps, preview) {
      this.deps = deps;
      this.preview = preview;
      this.handle = null;
      this.lastDrawAt = 0;
      this.active = true;
      this.tick = this.tick.bind(this);
    }
    throttle(frameNow) {
      const exploration = !!this.deps.explorationState.current(this.deps.game);
      const interval = exploration ? this.deps.display.explorationFrameMs : this.deps.display.battleFrameMs;
      const elapsed = frameNow - this.lastDrawAt;
      if (elapsed + 0.5 < interval) return;
      this.lastDrawAt = exploration ? this.lastDrawAt + Math.max(1, Math.floor((elapsed + 0.5) / interval)) * interval : frameNow;
      this.preview.updateVisibility();
      const began = this.deps.now();
      if (this.deps.renderBattlefield(false, interval)) this.deps.frameStats.noteBattleDraw(began, this.deps.now(), interval);
    }
    schedule() {
      if (!this.active || this.handle !== null || this.deps.startupOpen()) return;
      this.handle = this.deps.requestFrame(this.tick);
    }
    passiveTree() {
      if (!this.deps.document.getElementById("tab-char").classList.contains("active")) return;
      if (!this.deps.shouldRedrawTree()) return;
      this.deps.passiveScene.resizePassiveTreeCanvas(false);
      this.deps.drawTree();
    }
    tick(frameNow = this.deps.now()) {
      this.handle = null;
      if (!this.active) return;
      try {
        if (battlePresentationSuspended(this.deps)) return;
        if (!this.deps.game.isGuideReplay) {
          this.deps.explorationFrame(frameNow);
          this.deps.explorationUi.render();
          this.deps.showTutorial();
          this.deps.deathOverlay.flushPending();
        }
        this.passiveTree();
        if (!this.deps.game.isGuideReplay) this.throttle(frameNow);
      } catch (error) {
        this.deps.console.error("gameLoop error:", error);
        this.deps.recover();
      } finally {
        this.schedule();
      }
    }
    stop() {
      if (this.handle !== null) this.deps.cancelFrame(this.handle);
      this.handle = null;
    }
    dispose() {
      this.active = false;
      this.stop();
      this.lastDrawAt = 0;
    }
  };

  // modules/ui/battle-presentation.mjs
  function createBattlePresentation(deps) {
    const preview = new MobileBattlePreview(deps), canvas = new BattleCanvasInteraction(deps);
    const loop = new BattlePresentationLoop(deps, preview);
    return Object.freeze({
      setMobileBattlePipCollapsed: preview.collapse.bind(preview),
      updateMobileBattlePipVisibility: preview.updateVisibility.bind(preview),
      refreshMobileBattlePip: preview.refresh.bind(preview),
      isMobileBattlePipVisible: preview.visible.bind(preview),
      renderMobileBattlePipFrame: preview.copy.bind(preview),
      startMobilePipRefreshLoop: preview.start.bind(preview),
      isPauseSettingOverlayOpen: () => pauseSettingOverlayOpen(deps),
      isTutorialPausingCombat: () => tutorialPausingCombat(deps),
      setupCanvasEvents: canvas.setup.bind(canvas),
      resizeCanvas: canvas.resize.bind(canvas),
      scheduleStableResize: canvas.scheduleResize.bind(canvas),
      renderBattlefieldThrottled: loop.throttle.bind(loop),
      scheduleGameLoop: loop.schedule.bind(loop),
      gameLoop: loop.tick,
      stopGameLoop: loop.stop.bind(loop),
      dispose() {
        loop.dispose();
        preview.dispose();
        canvas.dispose();
      }
    });
  }

  // modules/ui-runtime-ui-classic.mjs
  var staticUiView = createStaticUiView({
    get uiStats() {
      return uiRuntime.stats;
    },
    get equipmentTriage() {
      return window.equipmentTriage;
    },
    get equipmentLoadoutUi() {
      return window.equipmentLoadoutUi;
    },
    get perfLog() {
      return typeof window !== "undefined" && window.__perfLog;
    },
    get document() {
      return document;
    },
    get hideItemTooltip() {
      return typeof hideItemTooltip === "undefined" ? void 0 : hideItemTooltip;
    },
    get hideInfoTooltip() {
      return typeof hideInfoTooltip === "undefined" ? void 0 : hideInfoTooltip;
    },
    get craftPickerHostUi() {
      return craftPickerHostUi;
    },
    get syncSalvageControlsFromSettings() {
      return typeof syncSalvageControlsFromSettings === "undefined" ? void 0 : syncSalvageControlsFromSettings;
    },
    get salvageRecoveryUi() {
      return typeof salvageRecoveryUi === "undefined" ? void 0 : salvageRecoveryUi;
    },
    get equipmentWindowUi() {
      return equipmentWindowUi;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    },
    get getSortedEquipmentInventoryRows() {
      return getSortedEquipmentInventoryRows;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get renderEquipmentInventoryInspector() {
      return renderEquipmentInventoryInspector;
    },
    get renderSearchSection() {
      return renderSearchSection;
    },
    get renderEquipmentInventoryGrid() {
      return renderEquipmentInventoryGrid;
    },
    get getSearchTokens() {
      return getSearchTokens;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get _t() {
      return _t;
    },
    get queueImportantSave() {
      return typeof queueImportantSave === "undefined" ? void 0 : queueImportantSave;
    },
    get equipmentLootUi() {
      return equipmentLootUi;
    },
    get getSearchFilterState() {
      return getSearchFilterState;
    },
    get matchSearchQuery() {
      return matchSearchQuery;
    },
    get translateSkillTag() {
      return translateSkillTag;
    },
    get getStatName() {
      return getStatName;
    },
    get assertBuildEditable() {
      return uiRuntime.canEditBuild;
    },
    get addLog() {
      return addLog;
    },
    get bagItems() {
      return bagItems;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get confirmedSalvageTargets() {
      return confirmedSalvageTargets;
    },
    get salvageBagItems() {
      return salvageBagItems;
    },
    get formatSalvageRewardSummary() {
      return formatSalvageRewardSummary;
    },
    get getEquipmentSearchText() {
      return getEquipmentSearchText;
    },
    get isBulkSalvageProtectedItem() {
      return isBulkSalvageProtectedItem;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getAscendKeystoneName() {
      return typeof getAscendKeystoneName === "undefined" ? void 0 : getAscendKeystoneName;
    },
    get getAscendKeystoneOwnerClass() {
      return typeof getAscendKeystoneOwnerClass === "undefined" ? void 0 : getAscendKeystoneOwnerClass;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get getVenomStingerRefusal() {
      return getVenomStingerRefusal;
    },
    get getBaseUpgradeRefusal() {
      return getBaseUpgradeRefusal;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get craftCurrencyUse() {
      return craftCurrencyUse;
    },
    get isSporeCraftEquipment() {
      return typeof isSporeCraftEquipment === "undefined" ? void 0 : isSporeCraftEquipment;
    },
    get hasSporeCraftCost() {
      return typeof hasSporeCraftCost === "undefined" ? void 0 : hasSporeCraftCost;
    },
    get craftingCatalogUi() {
      return craftingCatalogUi;
    },
    get sideEncounterUi() {
      return sideEncounterUi;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get contentProgression() {
      return contentProgression;
    },
    get STUMP_BOX_HARVEST_CRAFT() {
      return STUMP_BOX_HARVEST_CRAFT;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get selectForCrafting() {
      return selectForCrafting;
    },
    get formatValue() {
      return formatValue;
    },
    get getDropOnlyItemSourceMeta() {
      return typeof getDropOnlyItemSourceMeta === "undefined" ? void 0 : getDropOnlyItemSourceMeta;
    },
    get getExceptionalBaseStarsHtml() {
      return typeof getExceptionalBaseStarsHtml === "undefined" ? void 0 : getExceptionalBaseStarsHtml;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getCraftSelectionRef() {
      return typeof getCraftSelectionRef === "undefined" ? void 0 : getCraftSelectionRef;
    },
    get isCraftSelectionEquip() {
      return typeof isCraftSelectionEquip === "undefined" ? void 0 : isCraftSelectionEquip;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get getTimeAltarItemIssue() {
      return getTimeAltarItemIssue;
    },
    get getJewelStats() {
      return getJewelStats;
    },
    get getJewelUniqueEffectText() {
      return getJewelUniqueEffectText;
    },
    get isJewelPetiteStat() {
      return isJewelPetiteStat;
    },
    get formatJewelStatValue() {
      return formatJewelStatValue;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get currencyExchange() {
      return currencyExchange;
    },
    get updateInventoryFullWarnings() {
      return updateInventoryFullWarnings;
    },
    get announceMapPrimaryContentUnlocks() {
      return announceMapPrimaryContentUnlocks;
    },
    get syncMapPrimaryContentTabs() {
      return syncMapPrimaryContentTabs;
    },
    get tryUnlockMeteorContentByProgress() {
      return tryUnlockMeteorContentByProgress;
    },
    get requestGoalSystemRefresh() {
      return typeof requestGoalSystemRefresh === "undefined" ? void 0 : requestGoalSystemRefresh;
    },
    get validateItemTooltipAnchor() {
      return validateItemTooltipAnchor;
    },
    get applySeasonContentProgression() {
      return applySeasonContentProgression;
    },
    get refreshTabHeaderUiIfNeeded() {
      return refreshTabHeaderUiIfNeeded;
    },
    get calculateReachableNodes() {
      return calculateReachableNodes;
    },
    get refreshPassiveVisibility() {
      return refreshPassiveVisibility;
    },
    get applyPanelLayoutSettings() {
      return applyPanelLayoutSettings;
    },
    get updateLoopDecisionOverlayUi() {
      return updateLoopDecisionOverlayUi;
    },
    get hotkeysUi() {
      return typeof hotkeysUi === "undefined" ? void 0 : hotkeysUi;
    },
    get canShowCombatLoopAdvanceButton() {
      return canShowCombatLoopAdvanceButton;
    },
    get getRenderingUiTabIds() {
      return getRenderingUiTabIds;
    },
    get shouldRedrawPassiveTree() {
      return shouldRedrawPassiveTree;
    },
    get resizePassiveTreeCanvas() {
      return resizePassiveTreeCanvas;
    },
    get drawPassiveTree() {
      return drawPassiveTree;
    },
    get syncTabUnlockButton() {
      return syncTabUnlockButton;
    },
    get isMobilePrimaryNavigationEnabled() {
      return isMobilePrimaryNavigationEnabled;
    },
    get syncMergedTabLauncherVisibility() {
      return syncMergedTabLauncherVisibility;
    },
    get hideOutOfGroupTabButtons() {
      return typeof hideOutOfGroupTabButtons === "undefined" ? void 0 : hideOutOfGroupTabButtons;
    },
    get isNotiEnabled() {
      return isNotiEnabled;
    },
    get getActiveUiTabId() {
      return getActiveUiTabId;
    },
    get getActiveTopLevelTabElement() {
      return getActiveTopLevelTabElement;
    },
    get closeRelockedTabSurfaces() {
      return closeRelockedTabSurfaces;
    },
    get TAB_UNLOCK_GATES() {
      return TAB_UNLOCK_GATES;
    },
    get tabNavigation() {
      return window.GameModules.tabNavigationView;
    },
    get isTabSurfaceAvailable() {
      return isTabSurfaceAvailable;
    },
    get switchTab() {
      return switchTab;
    },
    get syncPassiveTreeHeader() {
      return syncPassiveTreeHeader;
    },
    get renderPassiveInvestmentSummary() {
      return renderPassiveInvestmentSummary;
    },
    get renderCharacterEhpSummary() {
      return renderCharacterEhpSummary;
    },
    get renderCharacterPassiveSpecialStats() {
      return renderCharacterPassiveSpecialStats;
    },
    get renderPaperdoll() {
      return renderPaperdoll;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get syncEquipmentMobilePane() {
      return syncEquipmentMobilePane;
    },
    get renderEquipmentLoadoutSummary() {
      return renderEquipmentLoadoutSummary;
    },
    get craftingWorkspaceUi() {
      return craftingWorkspaceUi;
    },
    get getUniqueEffectApplicationHint() {
      return getUniqueEffectApplicationHint;
    },
    get renderLoop8BeehivePanel() {
      return renderLoop8BeehivePanel;
    },
    get renderLoop15ColonyPanel() {
      return renderLoop15ColonyPanel;
    },
    get getVisibleHuntingMapCapZoneId() {
      return typeof getVisibleHuntingMapCapZoneId === "undefined" ? void 0 : getVisibleHuntingMapCapZoneId;
    },
    get getCurrentSeasonFinalZoneId() {
      return getCurrentSeasonFinalZoneId;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get getRecommendedHuntingZone() {
      return getRecommendedHuntingZone;
    },
    get buildMapRouteSummaryHtml() {
      return buildMapRouteSummaryHtml;
    },
    get getZone() {
      return getZone;
    },
    get mapListUi() {
      return mapListUi;
    },
    get ensureBeyondBoundaryState() {
      return ensureBeyondBoundaryState;
    },
    get setExploreSubtabAvailable() {
      return setExploreSubtabAvailable;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get renderBeyondBoundaryPanel() {
      return renderBeyondBoundaryPanel;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get atlasUi() {
      return atlasUi;
    },
    get renderChaosRealmMapPanel() {
      return renderChaosRealmMapPanel;
    },
    get renderSkyTowerMapPanel() {
      return renderSkyTowerMapPanel;
    },
    get renderUnderworldMapPanel() {
      return renderUnderworldMapPanel;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get oceanDiveUi() {
      return oceanDiveUi;
    },
    get fishingUi() {
      return fishingUi;
    },
    get renderMapExploreNotiDots() {
      return renderMapExploreNotiDots;
    },
    get renderLoop9VoidRiftPanel() {
      return renderLoop9VoidRiftPanel;
    },
    get renderTrialMapList() {
      return renderTrialMapList;
    },
    get renderMobileMapNavigation() {
      return renderMobileMapNavigation;
    },
    get loopClimbUi() {
      return loopClimbUi;
    },
    get worldTreeBarkUi() {
      return worldTreeBarkUi;
    },
    get SEASON_CONTENT_ROADMAP() {
      return SEASON_CONTENT_ROADMAP;
    },
    get getLoopAbyssRequirementText() {
      return getLoopAbyssRequirementText;
    },
    get getSeasonPassiveNodeDef() {
      return getSeasonPassiveNodeDef;
    },
    get getSeasonNodeLevel() {
      return getSeasonNodeLevel;
    },
    get isSeasonTreeEvolved() {
      return isSeasonTreeEvolved;
    },
    get getSeasonPassiveUnlockLoop() {
      return getSeasonPassiveUnlockLoop;
    },
    get isSeasonNodeRequirementMet() {
      return isSeasonNodeRequirementMet;
    },
    get P_STATS() {
      return P_STATS;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get statToneText() {
      return statToneText;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get SEASON_NODES() {
      return SEASON_NODES;
    },
    get SEASON_OUROBOROS_RING_NODES() {
      return SEASON_OUROBOROS_RING_NODES;
    },
    get SEASON_INNER_NODES() {
      return SEASON_INNER_NODES;
    },
    get loopOrbitCenterHtml() {
      return loopOrbitCenterHtml;
    },
    get ascendancyTreeUi() {
      return ascendancyTreeUi;
    },
    get fillAscendancyPickScreen() {
      return fillAscendancyPickScreen;
    },
    get uniqueCodexUi() {
      return uniqueCodexUi;
    },
    get renderRecordsTab() {
      return typeof renderRecordsTab === "undefined" ? void 0 : renderRecordsTab;
    },
    get playerGuideUi() {
      return playerGuideUi;
    },
    get renderSkillGemScreen() {
      return typeof renderSkillGemScreen === "undefined" ? void 0 : renderSkillGemScreen;
    },
    get withBuildMemoPass() {
      return withBuildMemoPass;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get syncSingleSubtabRows() {
      return syncSingleSubtabRows;
    },
    get renderSkillAutoRulePanel() {
      return renderSkillAutoRulePanel;
    },
    get switchSkillSubtab() {
      return switchSkillSubtab;
    },
    get JOURNAL_ENTRY_ORDER() {
      return JOURNAL_ENTRY_ORDER;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get storyJournalUi() {
      return storyJournalUi;
    },
    get performance() {
      return typeof performance === "undefined" ? void 0 : performance;
    },
    get Date() {
      return Date;
    },
    get console() {
      return console;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get normalizeSupportLoadout() {
      return normalizeSupportLoadout;
    },
    get updateCombatUI() {
      return updateCombatUI;
    },
    get renderVisibleManagementPanels() {
      return renderVisibleManagementPanels;
    }
  });
  window.GameModules.staticUiView = staticUiView;
  safeExposeGlobals({
    getCraftOrbUseState: staticUiView.getCraftOrbUseState,
    updateSearchFilter: staticUiView.updateSearchFilter,
    resetSearchFilter: staticUiView.resetSearchFilter,
    toggleInventoryRarityFilter: staticUiView.toggleInventoryRarityFilter,
    toggleAllInventoryRarityFilter: staticUiView.toggleAllInventoryRarityFilter,
    renderRarityFilterChips: staticUiView.renderRarityFilterChips,
    refreshAutoSalvagePanel: staticUiView.refreshAutoSalvagePanel,
    toggleAutoSalvageRarity: staticUiView.toggleAutoSalvageRarity,
    bulkSalvageEquipBySearch: staticUiView.bulkSalvageEquipBySearch,
    openCraftItemPickerOverlay: staticUiView.openCraftItemPickerOverlay,
    closeCraftItemPickerOverlay: staticUiView.closeCraftItemPickerOverlay,
    selectCraftPickerEquipment: staticUiView.selectCraftPickerEquipment,
    selectCraftPickerInventoryItem: staticUiView.selectCraftPickerInventoryItem,
    createJewelRangeTooltipHtml: staticUiView.createJewelRangeTooltipHtml,
    isItemRarityVisible: staticUiView.isItemRarityVisible,
    getGemSearchText: staticUiView.getGemSearchText,
    isGemLibraryMatchVisible: staticUiView.isGemLibraryMatchVisible,
    highlightSearchText: staticUiView.highlightSearchText,
    showCurrencyCardTooltip: staticUiView.showCurrencyCardTooltip,
    showOrbTooltip: staticUiView.showCurrencyCardTooltip
  });
  var uiRuntime = createUiRuntime({
    get cosmosAtlasView() {
      return window.GameModules.cosmosAtlas?.view;
    },
    get addLog() {
      return addLog;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get console() {
      return console;
    },
    get _t() {
      return _t;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getSkillTagList() {
      return getSkillTagList;
    },
    get Date() {
      return Date;
    },
    get document() {
      return document;
    },
    get passiveSelectionUi() {
      return passiveSelectionUi;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get performUpdateStaticUI() {
      return staticUiView.performUpdateStaticUI;
    },
    get updateBuildFeedback() {
      return updateBuildFeedback;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get combatCurrencyHud() {
      return combatCurrencyHud;
    },
    providers: Object.freeze({
      get getPlayerStats() {
        return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
      },
      get isDamageAilmentType() {
        return typeof isDamageAilmentType === "undefined" ? void 0 : isDamageAilmentType;
      },
      get getStoredAilmentHitDamage() {
        return typeof getStoredAilmentHitDamage === "undefined" ? void 0 : getStoredAilmentHitDamage;
      },
      get getPlayerDamageAilmentDps() {
        return typeof getPlayerDamageAilmentDps === "undefined" ? void 0 : getPlayerDamageAilmentDps;
      },
      get getEnemyDamageAilmentDps() {
        return typeof getEnemyDamageAilmentDps === "undefined" ? void 0 : getEnemyDamageAilmentDps;
      },
      get getPlayerShockTakenDamageIncreasePct() {
        return typeof getPlayerShockTakenDamageIncreasePct === "undefined" ? void 0 : getPlayerShockTakenDamageIncreasePct;
      },
      get getEnemyShockTakenDamageIncreasePct() {
        return typeof getEnemyShockTakenDamageIncreasePct === "undefined" ? void 0 : getEnemyShockTakenDamageIncreasePct;
      },
      get getSkillTargets() {
        return typeof getSkillTargets === "undefined" ? void 0 : getSkillTargets;
      },
      get isCrowdProgressPaused() {
        return typeof isCrowdProgressPaused === "undefined" ? void 0 : isCrowdProgressPaused;
      },
      get startEncounterRun() {
        return typeof startEncounterRun === "undefined" ? void 0 : startEncounterRun;
      },
      get coreLoop() {
        return typeof coreLoop === "undefined" ? void 0 : coreLoop;
      },
      get ensureEncounterRun() {
        return typeof ensureEncounterRun === "undefined" ? void 0 : ensureEncounterRun;
      },
      get getGemPresentation() {
        return typeof getGemPresentation === "undefined" ? void 0 : getGemPresentation;
      }
    })
  });
  window.GameModules.uiRuntime = uiRuntime;
  safeExposeGlobals({
    assertBuildEditable: uiRuntime.canEditBuild,
    normalizeUiPlayerStats: uiRuntime.normalizeUiPlayerStats,
    getUiPlayerStats: uiRuntime.getUiPlayerStats,
    isUiDamageAilmentType: uiRuntime.isUiDamageAilmentType,
    getUiStoredAilmentHitDamage: uiRuntime.getUiStoredAilmentHitDamage,
    getUiPlayerDamageAilmentDps: uiRuntime.getUiPlayerDamageAilmentDps,
    getUiEnemyDamageAilmentDps: uiRuntime.getUiEnemyDamageAilmentDps,
    getUiPlayerShockTakenDamageIncreasePct: uiRuntime.getUiPlayerShockTakenDamageIncreasePct,
    getUiEnemyShockTakenDamageIncreasePct: uiRuntime.getUiEnemyShockTakenDamageIncreasePct,
    formatUiTakenDamageShockLine: uiRuntime.formatUiTakenDamageShockLine,
    getUiSkillTargets: uiRuntime.getUiSkillTargets,
    getUiCrowdProgressPaused: uiRuntime.getUiCrowdProgressPaused,
    runUiGlobalFunction: uiRuntime.runUiGlobalFunction,
    runUiStartEncounter: uiRuntime.runUiStartEncounter,
    runUiCoreLoop: uiRuntime.runUiCoreLoop,
    getUiGemPresentation: uiRuntime.getUiGemPresentation,
    beginUiPointerInteraction: uiRuntime.beginUiPointerInteraction,
    scheduleDeferredStaticUiFlush: uiRuntime.scheduleDeferredStaticUiFlush,
    finishUiPointerInteraction: uiRuntime.finishUiPointerInteraction,
    isUiPointerInteractionActive: uiRuntime.isUiPointerInteractionActive,
    getUiDisclosureKey: uiRuntime.getUiDisclosureKey,
    captureUiDisclosureState: uiRuntime.captureUiDisclosureState,
    restoreUiDisclosureState: uiRuntime.restoreUiDisclosureState,
    processQueuedUIRefresh: uiRuntime.processQueuedUIRefresh,
    shouldRedrawPassiveTree: uiRuntime.shouldRedrawPassiveTree,
    updateStaticUI: uiRuntime.updateStaticUI
  });
  var tacticsView = createTacticsView({
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get document() {
      return document;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get normalizeCombatTacticsSettings() {
      return normalizeCombatTacticsSettings;
    },
    get contentProgression() {
      return contentProgression;
    },
    get editor() {
      return window.GameModules.conditionPatterns.editing;
    },
    get rules() {
      return window.GameModules.conditionPatterns.rules;
    },
    get addLog() {
      return addLog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    }
  });
  window.GameModules.tacticsView = tacticsView;
  safeExposeGlobals({
    isTacticsRulesOpen: tacticsView.isTacticsRulesOpen,
    addSkillAutoRule: tacticsView.addSkillAutoRule,
    sortSkillAutoRules: tacticsView.sortSkillAutoRules,
    moveSkillAutoRule: tacticsView.moveSkillAutoRule,
    setConditionPatternTrigger: tacticsView.setConditionPatternTrigger,
    setConditionPatternAction: tacticsView.setConditionPatternAction,
    setConditionPatternValue: tacticsView.setConditionPatternValue,
    renderSkillAutoRulePanel: tacticsView.renderSkillAutoRulePanel,
    syncCombatTacticsControls: tacticsView.syncCombatTacticsControls
  });
  var heroSelectionView = createHeroSelectionView({
    rules: createHeroSelectionRules({ classes: PLAYER_CLASS_DEFS, talents: HERO_SELECTION_DEFS, order: PLAYER_CLASS_ORDER }),
    get game() {
      return window.GameModules.state.game;
    },
    get session() {
      return window.GameModules.state.session;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get PLAYER_CLASS_ORDER() {
      return PLAYER_CLASS_ORDER;
    },
    get BASIC_SKILL_WEAPONS() {
      return BASIC_SKILL_WEAPONS;
    },
    get basicSkills() {
      return basicSkills;
    },
    get getAscendanciesForClass() {
      return getAscendanciesForClass;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get loopMutation() {
      return loopMutation;
    },
    get LOOP_MUTATION() {
      return LOOP_MUTATION;
    },
    get SKILL_GEM_ART_PATHS() {
      return SKILL_GEM_ART_PATHS;
    },
    get DAMAGE_ELEMENT_LABELS() {
      return DAMAGE_ELEMENT_LABELS;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getElementColor() {
      return getElementColor;
    },
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get console() {
      return console;
    },
    get Date() {
      return Date;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get addLog() {
      return addLog;
    },
    get saveGame() {
      return saveGame;
    },
    get requestImmediateCloudSave() {
      return typeof requestImmediateCloudSave === "undefined" ? void 0 : requestImmediateCloudSave;
    },
    get battleAssets() {
      return battleAssets;
    },
    get buildBattleAssetAtlas() {
      return buildBattleAssetAtlas;
    },
    get rebasePassiveTreeForClassChange() {
      return rebasePassiveTreeForClassChange;
    },
    get calculateReachableNodes() {
      return calculateReachableNodes;
    },
    get refreshPassiveVisibility() {
      return refreshPassiveVisibility;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get updateCombatUI() {
      return updateCombatUI;
    },
    get openingJourney() {
      return openingJourney;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get isStartupOverlayOpen() {
      return isStartupOverlayOpen;
    },
    get isLoadingOverlayOpen() {
      return isLoadingOverlayOpen;
    },
    get isDeathOverlayOpen() {
      return isDeathOverlayOpen;
    },
    get switchTab() {
      return switchTab;
    }
  });
  window.GameModules.heroSelectionView = heroSelectionView;
  safeExposeGlobals({
    syncHeroSelectionState: heroSelectionView.syncHeroSelectionState,
    renderHeroSelectionControls: heroSelectionView.renderHeroSelectionControls,
    persistHeroSelectionChange: heroSelectionView.persistHeroSelectionChange,
    applyHeroSelection: heroSelectionView.applyHeroSelection,
    onHeroAppearanceModeChanged: heroSelectionView.onHeroAppearanceModeChanged,
    onHeroSelectionChanged: heroSelectionView.onHeroSelectionChanged,
    ensureInitialHeroSelection: heroSelectionView.ensureInitialHeroSelection,
    resetHeroSelectionForSave: heroSelectionView.resetHeroSelectionForSave,
    getHeroSelectionDef: heroSelectionView.getHeroSelectionDef,
    applyHeroAppearanceMode: heroSelectionView.applyHeroAppearanceMode,
    getHeroAppearanceId: heroSelectionView.getHeroAppearanceId,
    isLoopHeroSelectOpen: heroSelectionView.isLoopHeroSelectOpen,
    showHeroChoiceTooltip: heroSelectionView.showHeroChoiceTooltip,
    pressLoopHeroChoice: heroSelectionView.pressLoopHeroChoice,
    openLoopHeroSelection: heroSelectionView.openLoopHeroSelection,
    chooseLoopHero: heroSelectionView.chooseLoopHero,
    openLoopBasicSkillPick: heroSelectionView.openLoopBasicSkillPick,
    chooseLoopBasicSkill: heroSelectionView.chooseLoopBasicSkill
  });
  var battlePresentation = createBattlePresentation({
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get console() {
      return console;
    },
    get display() {
      return uiDisplay;
    },
    get i18n() {
      return i18n;
    },
    get _t() {
      return _t;
    },
    get background() {
      return backgroundCombatRuntime;
    },
    get startupOpen() {
      return isStartupOverlayOpen;
    },
    get loadingOpen() {
      return isLoadingOverlayOpen;
    },
    get tutorialOpen() {
      return isTutorialOpen;
    },
    get tutorialActions() {
      return tutorialActionUi;
    },
    get activeTutorial() {
      return activeTutorial;
    },
    get switchTab() {
      return switchTab;
    },
    now: () => performance.now(),
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get requestFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelFrame() {
      return windowCancelAnimationFrame;
    },
    get renderBattlefield() {
      return renderBattlefield;
    },
    get canvasBox() {
      return window.GameModules.battlefieldPresentation.canvasBox;
    },
    get passiveScene() {
      return window.GameModules.passiveScene;
    },
    get explorationState() {
      return actExplorationState;
    },
    get explorationUi() {
      return actExplorationUi;
    },
    get explorationView() {
      return actExplorationView;
    },
    get frameStats() {
      return battleFrameStats;
    },
    get shouldRedrawTree() {
      return shouldRedrawPassiveTree;
    },
    get drawTree() {
      return drawPassiveTree;
    },
    get explorationFrame() {
      return runForegroundExplorationFrame;
    },
    get showTutorial() {
      return showNextTutorial;
    },
    get deathOverlay() {
      return window.GameModules.playFeedback.death;
    },
    get recover() {
      return recoverRuntimeState;
    },
    get bossMoves() {
      return bossMoves;
    },
    get titleCard() {
      return actTitleCard;
    },
    get unlockUi() {
      return contentUnlockUi;
    },
    get doors() {
      return stageDoorMarks;
    },
    get visual() {
      return battleVisualState;
    },
    get fitTree() {
      return fitPassiveCameraToBounds;
    },
    get resizeBattlefield() {
      return resizeBattlefieldCanvas;
    }
  });
  window.GameModules.battlePresentation = battlePresentation;
  safeExposeGlobals({
    setMobileBattlePipCollapsed: battlePresentation.setMobileBattlePipCollapsed,
    updateMobileBattlePipVisibility: battlePresentation.updateMobileBattlePipVisibility,
    refreshMobileBattlePip: battlePresentation.refreshMobileBattlePip,
    isMobileBattlePipVisible: battlePresentation.isMobileBattlePipVisible,
    renderMobileBattlePipFrame: battlePresentation.renderMobileBattlePipFrame,
    startMobilePipRefreshLoop: battlePresentation.startMobilePipRefreshLoop,
    isPauseSettingOverlayOpen: battlePresentation.isPauseSettingOverlayOpen,
    isTutorialPausingCombat: battlePresentation.isTutorialPausingCombat,
    setupCanvasEvents: battlePresentation.setupCanvasEvents,
    resizeCanvas: battlePresentation.resizeCanvas,
    scheduleStableResize: battlePresentation.scheduleStableResize,
    renderBattlefieldThrottled: battlePresentation.renderBattlefieldThrottled,
    scheduleGameLoop: battlePresentation.scheduleGameLoop,
    gameLoop: battlePresentation.gameLoop
  });
})();
