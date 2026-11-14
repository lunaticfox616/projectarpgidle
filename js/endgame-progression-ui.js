// GENERATED from modules/endgame-progression-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/beyond-boundary-markup.mjs
  function formatBeyondBoundarySealStats(runtime, definition, level) {
    return definition.stats.map((stat) => {
      let value = Number((stat.val * level).toFixed(2));
      let suffix = runtime.deps.P_STATS[stat.id] && runtime.deps.P_STATS[stat.id].isPct ? "%" : "";
      return `${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, value)}${suffix}`;
    }).join(", ");
  }
  function renderBeyondBoundarySeal(runtime, definition, state) {
    let progress = state.seals[definition.id];
    let selected = state.selectedSealId === definition.id;
    let maxed = progress.level >= definition.maxLevel;
    let cost = maxed ? 0 : (0, runtime.deps.getBeyondBoundarySealLevelCost)(progress.level);
    let progressText = maxed ? selected ? "최대 레벨, 경험치가 더 쌓이지 않으니 다른 인장을 고르세요" : "최대 레벨" : (0, runtime.deps._t)("{xp}/{cost} 경험치", { xp: progress.xp, cost });
    return `<button type="button" class="beyond-seal ${selected ? "selected" : ""}" onclick="chooseBeyondBoundarySeal('${definition.id}')" ${state.activeRun ? "disabled" : ""}>
        <span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(definition.name))}</span><strong>Lv.${progress.level}/${definition.maxLevel}</strong>
        <small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(definition.description))}</small><i>${formatBeyondBoundarySealStats(runtime, definition, progress.level)}</i>
        <em>${progressText}${selected ? (0, runtime.deps._t)(", 성장 대상") : ""}</em>
    </button>`;
  }
  function renderBeyondBoundaryMutators(runtime, tier) {
    let profile = (0, runtime.deps.getBeyondBoundaryTierProfile)(tier);
    let activeIds = new Set(profile.mutatorIds);
    let active = runtime.deps.BEYOND_BOUNDARY_MUTATOR_DB.filter((row) => activeIds.has(row.id));
    if (active.length <= 0) return '<span class="beyond-mutator empty">추가 변형 없음</span>';
    return active.map((row) => `<span class="beyond-mutator"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span>`).join("");
  }
  function formatBeyondBoundaryCosts(runtime, costs) {
    if (!Array.isArray(costs) || costs.length === 0) return "소모 없음";
    return costs.map((row) => `${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((runtime.deps.ORB_DB[row.key] || {}).name) || row.key)} ${row.amount}`).join(" + ");
  }
  function renderBeyondBoundaryRewardFocuses(runtime, state) {
    let selectedId = state.activeRun ? state.activeRun.rewardFocusId : state.selectedRewardFocusId;
    return runtime.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.map((row) => {
      const status = (0, runtime.deps.getBeyondBoundaryRewardFocusStatus)(row.id);
      return `<button type="button" class="beyond-farm-option ${selectedId === row.id ? "selected" : ""}"
            onclick="chooseBeyondBoundaryRewardFocus('${row.id}')" ${state.activeRun || !status.available ? "disabled" : ""}>
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span><small>${(0, runtime.deps.escapeHTML)(status.reason || row.risk)}</small>
        </button>`;
    }).join("");
  }
  function renderBeyondBoundaryStartAction(runtime, state) {
    if (state.activeRun) return `<button class="primary" type="button" onclick="viewBeyondBoundaryCombat()">${(0, runtime.deps._t)("전투 보기")}</button><button class="danger" type="button" onclick="leaveBeyondBoundaryRun()">${(0, runtime.deps._t)("도전 포기")}</button>`;
    const status = (0, runtime.deps.getBeyondBoundaryRewardFocusStatus)(state.selectedRewardFocusId);
    const note = status.available ? "" : `<small>${(0, runtime.deps._t)("{reason}, 다른 보상을 선택하세요.", { reason: (0, runtime.deps.escapeHTML)(status.reason) })}</small>`;
    return `<button class="primary" type="button" data-exploration-departure onclick="enterBeyondBoundaryRun()" ${status.available ? "" : "disabled"}>${(0, runtime.deps._t)("{selectedTier}단계 도전 시작", { selectedTier: state.selectedTier })}</button>${note}`;
  }
  function renderBeyondBoundaryIntensities(runtime, state) {
    let selectedId = state.activeRun ? state.activeRun.intensityId : state.selectedIntensityId;
    return runtime.deps.BEYOND_BOUNDARY_INTENSITY_DB.map((row) => `<button type="button" class="beyond-farm-option intensity ${selectedId === row.id ? "selected" : ""}"
        onclick="chooseBeyondBoundaryIntensity('${row.id}')" ${state.activeRun ? "disabled" : ""}>
        <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span><small>${formatBeyondBoundaryCosts(runtime, row.costs)}</small>
    </button>`).join("");
  }
  function renderBeyondBoundaryPanel(runtime) {
    let panel = runtime.deps.document.getElementById("ui-beyond-boundary-panel");
    if (!panel) return;
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    if (!state.unlocked) {
      panel.innerHTML = "";
      return;
    }
    let run = state.activeRun;
    let selectedTier = run ? run.tier : state.selectedTier;
    let zone = (0, runtime.deps.getZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID);
    let estimate = typeof runtime.deps.buildMapPowerEstimateHtml === "function" ? (0, runtime.deps.buildMapPowerEstimateHtml)(zone) : "";
    let tierControls = run ? `<div class="beyond-run-state"><strong>${(0, runtime.deps._t)("{tier}단계 진행 중", { tier: run.tier })}</strong><span>${(0, runtime.deps._t)("{wave}/{value} 조우", { wave: run.wave, value: runtime.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER })}</span></div>` : `<div class="beyond-tier-controls"><button type="button" onclick="stepBeyondBoundaryTier(-1)" ${state.selectedTier <= 1 ? "disabled" : ""}>−</button><label>${(0, runtime.deps._t)("도전 단계")}<input type="number" min="1" max="${state.highestTier}" value="${state.selectedTier}" onchange="setBeyondBoundaryTier(this.value)"></label><button type="button" onclick="stepBeyondBoundaryTier(1)" ${state.selectedTier >= state.highestTier ? "disabled" : ""}>＋</button></div>`;
    let action = renderBeyondBoundaryStartAction(runtime, state);
    panel.innerHTML = `<section class="beyond-head"><div><span>${(0, runtime.deps._t)("연속 조우 도전")}</span><h3>${(0, runtime.deps._t)("경계 너머")}</h3><p>${(0, runtime.deps._t)("다섯 조우를 연속 돌파해 빌드의 한계를 시험합니다. 마지막 조우는 보스전입니다.")}</p></div><dl><div><dt>${(0, runtime.deps._t)("최고 도달")}</dt><dd>${(0, runtime.deps._t)("{bestTier}단계", { bestTier: state.bestTier })}</dd></div><div><dt>${(0, runtime.deps._t)("도전 가능")}</dt><dd>${(0, runtime.deps._t)("{highestTier}단계", { highestTier: state.highestTier })}</dd></div><div><dt>${(0, runtime.deps._t)("완료")}</dt><dd>${(0, runtime.deps._t)("{completions}회", { completions: state.completions })}</dd></div></dl></section>
        <section class="beyond-challenge"><div>${tierControls}<div class="beyond-mutators">${renderBeyondBoundaryMutators(runtime, selectedTier)}</div>${estimate}</div><div class="beyond-actions">${action}</div></section>
        <section class="beyond-farming"><header><div><span>${(0, runtime.deps._t)("파밍 집중")}</span><h3>${(0, runtime.deps._t)("완료 보상 집중")}</h3></div><p>${(0, runtime.deps._t)("원하는 파밍 계열을 고릅니다. 위험은 보상 계열에 따라 달라지고, 조율 재화는 도전 시작 때 한 번만 소모됩니다.")}</p></header><div class="beyond-focus-grid">${renderBeyondBoundaryRewardFocuses(runtime, state)}</div><div class="beyond-intensity-grid">${renderBeyondBoundaryIntensities(runtime, state)}</div></section>
        <section class="beyond-seals"><header><div><span>${(0, runtime.deps._t)("완료 보상")}</span><h3>${(0, runtime.deps._t)("경계 인장 성장")}</h3></div><p>${(0, runtime.deps._t)("선택한 인장에 완료 경험치가 들어갑니다. 획득한 모든 인장 효과는 누적 적용됩니다.")}</p></header><div>${runtime.deps.BEYOND_BOUNDARY_SEAL_DB.map((seal) => renderBeyondBoundarySeal(runtime, seal, state)).join("")}</div></section>`;
  }

  // modules/ui/beyond-boundary-actions.mjs
  function setBeyondBoundaryTier(runtime, value) {
    (0, runtime.deps.selectBeyondBoundaryTier)(value, runtime.deps.game);
    renderBeyondBoundaryPanel(runtime);
  }
  function stepBeyondBoundaryTier(runtime, delta) {
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    setBeyondBoundaryTier(runtime, state.selectedTier + Math.sign(Number(delta) || 0));
  }
  function chooseBeyondBoundarySeal(runtime, sealId) {
    if (!(0, runtime.deps.selectBeyondBoundarySeal)(sealId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)();
  }
  function chooseBeyondBoundaryRewardFocus(runtime, focusId) {
    if (!(0, runtime.deps.selectBeyondBoundaryRewardFocus)(focusId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)();
  }
  function chooseBeyondBoundaryIntensity(runtime, intensityId) {
    if (!(0, runtime.deps.selectBeyondBoundaryIntensity)(intensityId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)();
  }
  function enterBeyondBoundaryRun(runtime) {
    if (runtime.deps.game.pendingLoopDecision) return (0, runtime.deps.addLog)((0, runtime.deps._t)("루프 정산 화면에서 먼저 결정하세요(루프 진행 또는 나중에 루프)."), "attack-monster");
    const held = (0, runtime.deps.getZoneTravelBlockReason)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID) || (0, runtime.deps.getHeldRunBlockReason)();
    if (held) return (0, runtime.deps.addLog)(held, "attack-monster");
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    const previousTier = state.selectedTier, previousRun = state.activeRun;
    const wallet = (0, runtime.deps.getBeyondBoundaryIntensityCosts)(state.selectedIntensityId).map(({ key }) => [key, runtime.deps.game.currencies[key]]);
    let result = (0, runtime.deps.startBeyondBoundaryRun)(state.selectedTier, runtime.deps.game);
    if (!result.ok) {
      const messages = {
        locked: "경계 너머가 아직 잠겨 있습니다.",
        active: "이미 경계 너머에 도전 중입니다.",
        cost: (0, runtime.deps._t)("조율 재화가 부족합니다. (필요: {costs})", { costs: formatBeyondBoundaryCosts(runtime, result.costs) })
      };
      return (0, runtime.deps.addLog)(result.reason || messages[result.code], "attack-monster");
    }
    try {
      (0, runtime.deps.changeZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID);
    } finally {
      if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) {
        state.activeRun = previousRun;
        state.selectedTier = previousTier;
        wallet.forEach(([key, value]) => {
          runtime.deps.game.currencies[key] = value;
        });
      }
    }
    if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) return;
    (0, runtime.deps.switchTab)("tab-battle");
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)();
  }
  function viewBeyondBoundaryCombat(runtime) {
    if (!(0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game).activeRun) return;
    if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) (0, runtime.deps.changeZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID);
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function leaveBeyondBoundaryRun(runtime) {
    let returnZoneId = (0, runtime.deps.abandonBeyondBoundaryRun)(runtime.deps.game);
    if (returnZoneId === null || returnZoneId === void 0) return;
    runtime.deps.game.currentZoneId = returnZoneId;
    runtime.deps.game.killsInZone = 0;
    (0, runtime.deps.startMoving)(false);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("경계 너머 도전을 포기했습니다."), "attack-monster");
    (0, runtime.deps.updateStaticUI)();
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)();
  }

  // modules/ui/beyond-boundary-view.mjs
  function createBeyondBoundaryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderBeyondBoundaryPanel, setBeyondBoundaryTier, stepBeyondBoundaryTier, chooseBeyondBoundarySeal, chooseBeyondBoundaryRewardFocus, chooseBeyondBoundaryIntensity, enterBeyondBoundaryRun, viewBeyondBoundaryCombat, leaveBeyondBoundaryRun };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = {
      renderBeyondBoundaryPanel: runtime.handlers.renderBeyondBoundaryPanel,
      setBeyondBoundaryTier: runtime.handlers.setBeyondBoundaryTier,
      stepBeyondBoundaryTier: runtime.handlers.stepBeyondBoundaryTier,
      chooseBeyondBoundarySeal: runtime.handlers.chooseBeyondBoundarySeal,
      chooseBeyondBoundaryRewardFocus: runtime.handlers.chooseBeyondBoundaryRewardFocus,
      chooseBeyondBoundaryIntensity: runtime.handlers.chooseBeyondBoundaryIntensity,
      enterBeyondBoundaryRun: runtime.handlers.enterBeyondBoundaryRun,
      viewBeyondBoundaryCombat: runtime.handlers.viewBeyondBoundaryCombat,
      leaveBeyondBoundaryRun: runtime.handlers.leaveBeyondBoundaryRun
    };
    return runtime.api;
  }

  // modules/endgame-progression-ui-classic.mjs
  var beyondBoundaryView = createBeyondBoundaryView({
    get P_STATS() {
      return P_STATS;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    },
    get getBeyondBoundarySealLevelCost() {
      return getBeyondBoundarySealLevelCost;
    },
    get _t() {
      return _t;
    },
    get getBeyondBoundaryTierProfile() {
      return getBeyondBoundaryTierProfile;
    },
    get BEYOND_BOUNDARY_MUTATOR_DB() {
      return BEYOND_BOUNDARY_MUTATOR_DB;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() {
      return BEYOND_BOUNDARY_REWARD_FOCUS_DB;
    },
    get getBeyondBoundaryRewardFocusStatus() {
      return getBeyondBoundaryRewardFocusStatus;
    },
    get BEYOND_BOUNDARY_INTENSITY_DB() {
      return BEYOND_BOUNDARY_INTENSITY_DB;
    },
    get document() {
      return document;
    },
    get ensureBeyondBoundaryState() {
      return ensureBeyondBoundaryState;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getZone() {
      return getZone;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get buildMapPowerEstimateHtml() {
      return typeof buildMapPowerEstimateHtml === "undefined" ? void 0 : buildMapPowerEstimateHtml;
    },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() {
      return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER;
    },
    get BEYOND_BOUNDARY_SEAL_DB() {
      return BEYOND_BOUNDARY_SEAL_DB;
    },
    get selectBeyondBoundaryTier() {
      return selectBeyondBoundaryTier;
    },
    get selectBeyondBoundarySeal() {
      return selectBeyondBoundarySeal;
    },
    get saveGame() {
      return typeof saveGame === "undefined" ? void 0 : saveGame;
    },
    get selectBeyondBoundaryRewardFocus() {
      return selectBeyondBoundaryRewardFocus;
    },
    get selectBeyondBoundaryIntensity() {
      return selectBeyondBoundaryIntensity;
    },
    get addLog() {
      return addLog;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get getHeldRunBlockReason() {
      return getHeldRunBlockReason;
    },
    get getBeyondBoundaryIntensityCosts() {
      return getBeyondBoundaryIntensityCosts;
    },
    get startBeyondBoundaryRun() {
      return startBeyondBoundaryRun;
    },
    get switchTab() {
      return switchTab;
    },
    get changeZone() {
      return changeZone;
    },
    get abandonBeyondBoundaryRun() {
      return abandonBeyondBoundaryRun;
    },
    get startMoving() {
      return startMoving;
    },
    get updateStaticUI() {
      return updateStaticUI;
    }
  });
  safeExposeGlobals({
    renderBeyondBoundaryPanel: beyondBoundaryView.renderBeyondBoundaryPanel,
    setBeyondBoundaryTier: beyondBoundaryView.setBeyondBoundaryTier,
    stepBeyondBoundaryTier: beyondBoundaryView.stepBeyondBoundaryTier,
    chooseBeyondBoundarySeal: beyondBoundaryView.chooseBeyondBoundarySeal,
    chooseBeyondBoundaryRewardFocus: beyondBoundaryView.chooseBeyondBoundaryRewardFocus,
    chooseBeyondBoundaryIntensity: beyondBoundaryView.chooseBeyondBoundaryIntensity,
    enterBeyondBoundaryRun: beyondBoundaryView.enterBeyondBoundaryRun,
    viewBeyondBoundaryCombat: beyondBoundaryView.viewBeyondBoundaryCombat,
    leaveBeyondBoundaryRun: beyondBoundaryView.leaveBeyondBoundaryRun
  });
})();
