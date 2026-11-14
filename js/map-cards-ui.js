// GENERATED from modules/map-cards-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/map-card-actions.mjs
  function isMapZoneGroupCollapsed(runtime, groupKey, defaultCollapsed = false) {
    return runtime.state.mapZoneGroupCollapseState[groupKey] ?? defaultCollapsed;
  }
  function toggleMapZoneGroup(runtime, groupKey, collapsed = isMapZoneGroupCollapsed(runtime, groupKey)) {
    if (!Object.prototype.hasOwnProperty.call(runtime.state.mapZoneGroupCollapseState, groupKey)) return;
    runtime.state.mapZoneGroupCollapseState[groupKey] = !collapsed;
    (0, runtime.deps.updateStaticUI)();
  }
  function buildMapZoneGroupHtml(runtime, groupKey, title, cards, defaultCollapsed = false) {
    if (!cards.length) return "";
    let collapsed = isMapZoneGroupCollapsed(runtime, groupKey, defaultCollapsed);
    let icon = collapsed ? "▶" : "▼";
    let countText = (0, runtime.deps._t)("{length}개", { length: cards.length });
    let gridHtml = collapsed ? "" : `<div class="map-zone-grid map-zone-grid--${groupKey}">${cards.map((card) => card.html).join("")}</div>`;
    return `<section class="map-zone-group ${collapsed ? "collapsed" : ""}" data-map-zone-group="${groupKey}">
        <button type="button" class="map-zone-group-header" onclick="toggleMapZoneGroup('${groupKey}',this.getAttribute('aria-expanded')==='false')" aria-expanded="${collapsed ? "false" : "true"}">
            <span class="map-zone-group-title"><span class="map-zone-group-icon">${icon}</span>${title}</span>
            <span class="map-zone-group-count">${countText}</span>
        </button>
        ${gridHtml}
    </section>`;
  }
  function formatApproximateMapPower(runtime, value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString(runtime.deps.i18n.locale, {
      notation: "compact",
      maximumSignificantDigits: 2
    });
  }
  function getMapPowerReadinessModel(runtime, estimate) {
    if (typeof runtime.deps.getMapPowerReadiness !== "function") return null;
    if (!runtime.deps.cachedTooltipStats && typeof runtime.deps.getPlayerStats === "function") runtime.deps.cachedTooltipStats = (0, runtime.deps.getPlayerStats)();
    return runtime.deps.cachedTooltipStats ? (0, runtime.deps.getMapPowerReadiness)(runtime.deps.cachedTooltipStats, estimate) : null;
  }
  function getMapPowerEstimateParts(runtime, zone) {
    let estimate = typeof runtime.deps.estimateMapZonePowerRequirements === "function" ? (0, runtime.deps.estimateMapZonePowerRequirements)(zone) : null;
    let model = estimate ? getMapPowerReadinessModel(runtime, estimate) : null;
    if (!model) return null;
    let bossElements = (0, runtime.deps.getChaosBossElements)(zone) ? (0, runtime.deps.getChaosBossElements)(zone).join(",") : "";
    let attrs = `data-info-tooltip-anchor="1" ${runtime.deps.levelProgressionUi.rewardData(zone)} data-player-dps="${Math.round(model.playerDps)}" data-recommended-dps="${Math.round(model.recommendedDps)}" data-player-ehp="${Math.round(model.playerEhp)}" data-recommended-ehp="${Math.round(model.recommendedEhp)}" data-limiting-element="${model.element}" data-boss-elements="${bossElements}"`;
    return { met: model.meetsRecommendation, attrs, environment: buildMapEnvironmentEstimateHtml(runtime, model.environment) };
  }
  function buildMapPowerEstimateHtml(runtime, zone, options = {}) {
    let parts = getMapPowerEstimateParts(runtime, zone);
    if (!parts) return "";
    let label = (0, runtime.deps._t)("권장 전투력 {value}", { value: parts.met ? (0, runtime.deps._t)("달성") : (0, runtime.deps._t)("미달성") });
    let reward = options.hideReward ? "" : runtime.deps.levelProgressionUi.rewardHint(zone);
    return `<span class="map-zone-status map-power-estimate" tabindex="0" aria-label="${label}" ${parts.attrs} onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" ontouchstart="event.stopPropagation(); showMapPowerEstimateTooltip(event)" onclick="event.stopPropagation(); this.focus(); showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()"><span class="map-power-grade grade-${parts.met ? "high" : "low"}">${label}</span>${parts.environment}${reward ? `<span class="map-power-grade grade-low">${reward}</span>` : ""}</span>`;
  }
  function buildMapEnvironmentEstimateHtml(runtime, environment) {
    if (!environment) return "";
    return `<span hidden data-environment-loss="${environment.lossPct}" data-environment-regen="${environment.regenPct}"></span>`;
  }
  function buildMapEnvironmentTooltipHtml(runtime, target) {
    const environment = target.querySelector("[data-environment-loss]");
    if (!environment) return "";
    const loss = Number(environment.dataset.environmentLoss).toFixed(1);
    const regen = Number(environment.dataset.environmentRegen).toFixed(1);
    return `<div class="map-power-tip-row is-hazard"><span>${(0, runtime.deps._t)("환경 피해")}</span><b>${(0, runtime.deps._t)("초당 생명력 {loss}%", { loss })}</b><em>${(0, runtime.deps._t)("재생 {regen}%/초, 방어로 못 막음", { regen })}</em></div>`;
  }
  function getMapEstimateElementName(runtime, key) {
    const name = { phys: "물리", fire: "화염", cold: "냉기", light: "번개", chaos: "카오스" }[key];
    return name ? (0, runtime.deps._t)(name) : "";
  }
  function formatLoopDeepValue(runtime, def, level) {
    const total = Math.max(0, Number(level) || 0) * def.per;
    return `${Number.isInteger(total) ? total : total.toFixed(1)}${def.unit}`;
  }
  function buildMapBossElementLine(runtime, keys) {
    const chips = String(keys || "").split(",").filter(runtime.handlers.getMapEstimateElementName).map((key) => `<i class="map-power-element is-${key}">${getMapEstimateElementName(runtime, key)}</i>`);
    return chips.length ? `<div class="map-power-tip-row"><span>${(0, runtime.deps._t)("보스 속성")}</span><b>${chips.join("")}</b><em></em></div>` : "";
  }
  function buildMapPowerCompareRow(runtime, label, mine, recommended) {
    const ratio = Number(recommended) > 0 ? Number(mine) / Number(recommended) : 1;
    return `<div class="map-power-tip-row ${ratio >= 1 ? "is-met" : "is-short"}"><span>${label}</span><b>${formatApproximateMapPower(runtime, mine)}</b><em>${(0, runtime.deps._t)("권장 {recommended}, {round}%", { recommended: formatApproximateMapPower(runtime, recommended), round: Math.round(ratio * 100) })}</em></div>`;
  }
  function buildMapRewardRow(runtime, data) {
    const xp = Number(data.rewardXp), rune = Number(data.rewardRune), loot = Number(data.rewardLoot);
    const runeText = Number.isFinite(rune) && rune !== xp ? (0, runtime.deps._t)(", 룬 {rune}%", { rune }) : "";
    return `<div class="map-power-tip-row ${xp < 100 || loot < 100 ? "is-short" : "is-met"}"><span>${(0, runtime.deps._t)("보상")}</span><b>Lv.${(0, runtime.deps.escapeHTML)(data.areaLevel)}</b><em>${(0, runtime.deps._t)("경험치 {xp}%{runeText}, 드랍 {loot}%", { xp, runeText, loot })}</em></div>`;
  }
  function mapPowerTooltipPoint(event) {
    let target = event.currentTarget;
    let rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    let x = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : rect ? rect.left + rect.width / 2 : 0;
    let y = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : rect ? rect.bottom : 0;
    return { x, y };
  }
  function showMapPowerEstimateTooltip(runtime, event) {
    const target = event.currentTarget;
    const { x, y } = mapPowerTooltipPoint(event);
    let data = target ? target.dataset : {};
    let elementLabel = getMapEstimateElementName(runtime, data.limitingElement) || "취약 속성";
    let html = `<div class="tooltip-title">${(0, runtime.deps._t)("권장 전투력")}</div><div class="map-power-tip">
        ${buildMapPowerCompareRow(runtime, "공격 DPS", data.playerDps, data.recommendedDps)}
        ${buildMapPowerCompareRow(runtime, "생존 EHP", data.playerEhp, data.recommendedEhp)}
        ${buildMapBossElementLine(runtime, data.bossElements)}${buildMapEnvironmentTooltipHtml(runtime, target)}
        ${buildMapRewardRow(runtime, data)}</div>
        <div class="tooltip-line tooltip-muted">${(0, runtime.deps._t)("{elementLabel} 피해 기준, 지속 피해, 회복 제외", { elementLabel })}</div>`;
    (0, runtime.deps.showInfoTooltipHtml)(x, y, html, "#6ba7d8");
  }
  function getRecommendedHuntingZone(runtime, zones) {
    let huntingZones = (Array.isArray(zones) ? zones : []).filter((zone) => zone && zone.type !== "abyss");
    return huntingZones.length > 0 ? huntingZones[huntingZones.length - 1] : null;
  }
  function buildMapRouteSummaryHtml(runtime, currentZone, recommendedZone) {
    if (!recommendedZone) return "";
    let currentName = currentZone ? (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(currentZone.name)) : (0, runtime.deps._t)("선택 없음");
    let recommendedName = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(recommendedZone.name));
    let sameZone = currentZone && Number(currentZone.id) === Number(recommendedZone.id);
    let action = sameZone ? "switchTab('tab-battle')" : `changeZone(${Number(recommendedZone.id)})`;
    let actionLabel = (0, runtime.deps._t)(sameZone ? "전투로 돌아가기" : "즉시 이동");
    return `<div class="map-route-copy"><span class="map-route-kicker">${(0, runtime.deps._t)(sameZone ? "현재 위치" : "다음 진행 지역")}</span><strong>${recommendedName}</strong><small>${(0, runtime.deps._t)("현재")}, ${currentName}</small></div><button type="button" class="map-route-action" ${sameZone ? "" : "data-exploration-departure"} onclick="${action}">${actionLabel}</button>`;
  }
  function getMapCardState(runtime, isCurrent, cleared, recommended) {
    if (isCurrent) return { label: (0, runtime.deps._t)("현재"), className: "current" };
    if (cleared) return { label: (0, runtime.deps._t)("완료"), className: "cleared" };
    if (recommended) return { label: (0, runtime.deps._t)("다음"), className: "recommended" };
    return { label: (0, runtime.deps._t)("도전"), className: "available" };
  }
  function buildMapCardActionsHtml(runtime, options) {
    let state = options.state;
    let rewardButton = options.isActRewardZone && options.rewardReady && (0, runtime.deps.getActRewardChoices)(options.zoneId).some((choice) => (0, runtime.deps.isActRewardChoiceAvailable)(choice)) ? `<button class="map-reward-btn" onclick="event.stopPropagation(); openActReward(${options.zoneId})">${(0, runtime.deps._t)("보상 받기")}</button>` : "";
    let stateLabel = options.isActRewardZone && options.rewardClaimed ? (0, runtime.deps._t)("{label}, 보상 수령", { label: state.label }) : state.label;
    let stateBadge = rewardButton ? "" : `<span class="map-state-badge ${state.className}${options.rewardClaimed ? " reward-claimed" : ""}">${stateLabel}</span>`;
    let enterButton = `<button type="button" class="map-enter-btn" ${options.enterAction.startsWith("changeZone(") ? "data-exploration-departure" : ""} onclick="event.stopPropagation(); ${options.enterAction}">${options.enterLabel}</button>`;
    return stateBadge + rewardButton + enterButton;
  }
  function buildTrialTitleHtml(runtime, name) {
    const parts = /^(.*?)\s*\((.+)\)$/.exec(name);
    return parts ? `<strong>${parts[1]}<small class="trial-place">-${parts[2]}</small></strong>` : `<strong>${name}</strong>`;
  }
  function buildTrialMapItemHtml(runtime, trial) {
    if (trial.bloomTrial) return buildBloomTrialCard(runtime, trial);
    const { isCurrent, isCompleted, needsTicket, hasTicket } = trialCardState(runtime, trial);
    let cls = `${isCompleted ? "trial-completed" : "trial-pending"}${isCurrent ? " current" : ""}`;
    let action = isCompleted && needsTicket ? `enterTrialWithTicket('${trial.id}')` : `changeZone('${trial.id}')`;
    let repeatReward = trialRepeatReward(runtime, trial);
    let status = trialRetryStatus(runtime, isCompleted, needsTicket);
    let state = isCompleted ? "완료" : "미완료";
    const button = trialEntryButton(runtime, { isCurrent, isCompleted, needsTicket, hasTicket, action });
    return `<div class="map-item encounter-card ${cls}" data-trial-id="${trial.id}"><div class="encounter-heading">${buildTrialTitleHtml(runtime, trial.name)}<span class="encounter-state trial-state-badge">${state}</span></div>
        ${buildMapPowerEstimateHtml(runtime, trial)}
        ${isCompleted ? `<div class="encounter-reward"><small>${(0, runtime.deps._t)("재도전 보상")}</small><span>${repeatReward}</span></div>` : ""}
        <div class="encounter-footer"><span>${status}</span>${button}</div></div>`;
  }
  function buildBloomTrialCard(runtime, trial) {
    let isCurrent = runtime.deps.game.currentZoneId === trial.id;
    let chaosKeys = Math.floor(runtime.deps.game.currencies.chaosKey || 0);
    let coreKeys = Math.floor(runtime.deps.game.currencies.coreKey || 0);
    let ready = (0, runtime.deps.canEnterTalentBloomTrial)();
    const hint = bloomTrialHint(runtime, ready, chaosKeys, coreKeys);
    return `<div class="map-item encounter-card ${isCurrent ? "current" : "trial"}"><div class="encounter-heading">${buildTrialTitleHtml(runtime, trial.name)}<span class="encounter-state">${(0, runtime.deps._t)("재능 개화")}</span></div>${buildMapPowerEstimateHtml(runtime, trial)}<div class="encounter-footer"><span>${hint}</span><button ${ready ? 'data-exploration-departure onclick="enterTalentBloomTrial()"' : "disabled"}>${(0, runtime.deps._t)("개화 도전")}</button></div></div>`;
  }
  function bloomTrialHint(runtime, ready, chaosKeys, coreKeys) {
    if (ready) return "개화 도전";
    if (chaosKeys < 1 || coreKeys < 1) return (0, runtime.deps._t)("카오스 {chaosKeys}/1, 코어 {coreKeys}/1", { chaosKeys, coreKeys });
    if (!(0, runtime.deps.isWoodsmanEchoUnlocked)()) return "나무꾼의 잔상 필요";
    if (!runtime.deps.game.ascendClass) return "직업(전직) 필요";
    return "조건 미충족";
  }
  function trialCardState(runtime, trial) {
    let isCurrent = runtime.deps.game.currentZoneId === trial.id;
    let isCompleted = runtime.deps.game.completedTrials.includes(trial.id);
    let needsTicket = isCompleted && (trial.id === "trial_3" || trial.id === "trial_4");
    let hasTicket = (runtime.deps.game.currencies.trialKey3 || 0) > 0;
    return { isCurrent, isCompleted, needsTicket, hasTicket };
  }
  function trialRepeatReward(runtime, trial) {
    let repeatGemChance = typeof runtime.deps.getTrialSkillGemRewardChance === "function" ? (0, runtime.deps.getTrialSkillGemRewardChance)(trial, false) : 0;
    return repeatGemChance >= 1 ? "룬 확정" : (0, runtime.deps._t)("룬 {round}%", { round: Math.round(repeatGemChance * 100) });
  }
  function trialRetryStatus(runtime, isCompleted, needsTicket) {
    return isCompleted ? needsTicket ? (0, runtime.deps._t)("재도전권 {trialKey3}개, 입장 시 1개", { trialKey3: runtime.deps.game.currencies.trialKey3 || 0 }) : "무료 재도전" : "";
  }
  function trialEntryButton(runtime, { isCurrent, isCompleted, needsTicket, hasTicket, action }) {
    return `<button data-exploration-departure ${isCompleted && needsTicket && !hasTicket ? "disabled" : `onclick="${action}"`}>${isCurrent ? (0, runtime.deps._t)("다시 시작") : isCompleted ? (0, runtime.deps._t)("재도전") : (0, runtime.deps._t)("도전")}</button>`;
  }
  function renderTrialMapList(runtime, trials) {
    const panel = runtime.deps.document.getElementById("ui-trial-list");
    const html = trials.map(runtime.handlers.buildTrialMapItemHtml).join("");
    if (panel.__lastHtml !== html) panel.innerHTML = panel.__lastHtml = html;
    const count = String(trials.length);
    if (panel.style.getPropertyValue("--trial-count") !== count) panel.style.setProperty("--trial-count", count);
  }

  // modules/ui/map-card-view.mjs
  function createMapCardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getMapEstimateElementName, buildTrialMapItemHtml, toggleMapZoneGroup, buildMapZoneGroupHtml, formatApproximateMapPower, getMapPowerEstimateParts, buildMapPowerEstimateHtml, formatLoopDeepValue, buildMapRewardRow, showMapPowerEstimateTooltip, getRecommendedHuntingZone, buildMapRouteSummaryHtml, getMapCardState, buildMapCardActionsHtml, renderTrialMapList };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = { toggleMapZoneGroup: runtime.handlers.toggleMapZoneGroup, buildMapZoneGroupHtml: runtime.handlers.buildMapZoneGroupHtml, formatApproximateMapPower: runtime.handlers.formatApproximateMapPower, getMapPowerEstimateParts: runtime.handlers.getMapPowerEstimateParts, buildMapPowerEstimateHtml: runtime.handlers.buildMapPowerEstimateHtml, getMapEstimateElementName: runtime.handlers.getMapEstimateElementName, formatLoopDeepValue: runtime.handlers.formatLoopDeepValue, buildMapRewardRow: runtime.handlers.buildMapRewardRow, showMapPowerEstimateTooltip: runtime.handlers.showMapPowerEstimateTooltip, getRecommendedHuntingZone: runtime.handlers.getRecommendedHuntingZone, buildMapRouteSummaryHtml: runtime.handlers.buildMapRouteSummaryHtml, getMapCardState: runtime.handlers.getMapCardState, buildMapCardActionsHtml: runtime.handlers.buildMapCardActionsHtml, buildTrialMapItemHtml: runtime.handlers.buildTrialMapItemHtml, renderTrialMapList: runtime.handlers.renderTrialMapList };
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.mapZoneGroupCollapseState = { availableBosses: false, rootBosses: null, rivalBosses: null, pinnacleBosses: null, finalGate: null };
  }

  // modules/map-cards-ui-classic.mjs
  var mapCardView = createMapCardView({
    get updateStaticUI() {
      return updateStaticUI;
    },
    get _t() {
      return _t;
    },
    get i18n() {
      return i18n;
    },
    get getMapPowerReadiness() {
      return typeof getMapPowerReadiness === "undefined" ? void 0 : getMapPowerReadiness;
    },
    get cachedTooltipStats() {
      return window.GameModules.uiRuntime.stats.snapshot();
    },
    set cachedTooltipStats(value) {
      window.GameModules.uiRuntime.stats.store(value);
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get estimateMapZonePowerRequirements() {
      return typeof estimateMapZonePowerRequirements === "undefined" ? void 0 : estimateMapZonePowerRequirements;
    },
    get getChaosBossElements() {
      return getChaosBossElements;
    },
    get levelProgressionUi() {
      return levelProgressionUi;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get getActRewardChoices() {
      return getActRewardChoices;
    },
    get isActRewardChoiceAvailable() {
      return isActRewardChoiceAvailable;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getTrialSkillGemRewardChance() {
      return typeof getTrialSkillGemRewardChance === "undefined" ? void 0 : getTrialSkillGemRewardChance;
    },
    get canEnterTalentBloomTrial() {
      return canEnterTalentBloomTrial;
    },
    get isWoodsmanEchoUnlocked() {
      return isWoodsmanEchoUnlocked;
    },
    get document() {
      return document;
    }
  });
  safeExposeGlobals({
    toggleMapZoneGroup: mapCardView.toggleMapZoneGroup,
    buildMapZoneGroupHtml: mapCardView.buildMapZoneGroupHtml,
    formatApproximateMapPower: mapCardView.formatApproximateMapPower,
    getMapPowerEstimateParts: mapCardView.getMapPowerEstimateParts,
    buildMapPowerEstimateHtml: mapCardView.buildMapPowerEstimateHtml,
    getMapEstimateElementName: mapCardView.getMapEstimateElementName,
    formatLoopDeepValue: mapCardView.formatLoopDeepValue,
    buildMapRewardRow: mapCardView.buildMapRewardRow,
    showMapPowerEstimateTooltip: mapCardView.showMapPowerEstimateTooltip,
    getRecommendedHuntingZone: mapCardView.getRecommendedHuntingZone,
    buildMapRouteSummaryHtml: mapCardView.buildMapRouteSummaryHtml,
    getMapCardState: mapCardView.getMapCardState,
    buildMapCardActionsHtml: mapCardView.buildMapCardActionsHtml,
    buildTrialMapItemHtml: mapCardView.buildTrialMapItemHtml,
    renderTrialMapList: mapCardView.renderTrialMapList
  });
})();
