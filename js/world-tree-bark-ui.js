// GENERATED from modules/world-tree-bark-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/world-tree-bark-markup.mjs
  function barkReachText(runtime, zones) {
    const acts = runtime.deps.WORLD_TREE_BARK.points.actTenZoneId + 1;
    return zones <= acts ? (0, runtime.deps._t)("액트 1~{zones}", { zones }) : (0, runtime.deps._t)("액트 전체, 혼돈 1~{value}", { value: zones - acts });
  }
  function barkStatValueText(runtime, def) {
    const total = pointsIn(runtime, def.key) * def.per;
    if (def.key === "damage") return (0, runtime.deps._t)("{value}배", { value: (1 + total / 100).toFixed(1) });
    if (def.key === "taken") return total ? `-${total}%` : "없음";
    if (def.key === "move") return total ? `+${total}%` : "없음";
    return barkReachText(runtime, (0, runtime.deps.getWorldTreeBarkReach)(runtime.deps.game));
  }
  function barkRingsHtml(runtime, count, size = 84) {
    const center = size / 2, pith = 5, step = Math.min(4, (center - pith - 3) / Math.max(1, count)), tones = statTones(runtime);
    const spent = runtime.deps.WORLD_TREE_BARK.stats.flatMap((def) => Array(pointsIn(runtime, def.key)).fill(tones[def.key]));
    const ringTone = (at) => spent.length ? spent[Math.floor(at / count * spent.length)] : "#3b2d1d";
    const rings = Array.from({ length: count }, (_, at) => `<circle cx="${center}" cy="${center}" r="${(pith + step * (at + 1)).toFixed(1)}" fill="none" stroke="${ringTone(at)}" stroke-width="${Math.max(1, step - 1).toFixed(1)}"/>`).join("");
    return `<svg class="bark-rings" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${center}" cy="${center}" r="${pith}" fill="#8a6a3e"/>${rings}</svg>`;
  }
  function barkRouteHtml(runtime) {
    const reach = (0, runtime.deps.getWorldTreeBarkReach)(runtime.deps.game), acts = runtime.deps.WORLD_TREE_BARK.points.actTenZoneId + 1, done = Math.max(0, Math.floor(runtime.deps.game.maxZoneId || 0));
    const ticks = Array.from({ length: runtime.deps.WORLD_TREE_BARK.maxZones }, (_, id) => {
      const state = id >= reach ? "is-off" : id < done ? "is-cleared" : "is-on";
      return `<i class="${state}${id === acts ? " is-chaos-start" : ""}"></i>`;
    }).join("");
    return `<div class="bark-route"><span>${(0, runtime.deps._t)("껍질 구간")}</span><b>${esc(runtime, barkReachText(runtime, reach))}</b><div class="bark-route-ticks" aria-hidden="true">${ticks}</div></div>`;
  }
  function barkStatCardHtml(runtime, def, free, tones) {
    const now = pointsIn(runtime, def.key), full = def.max !== null && now >= def.max;
    const button = (label, delta, off) => `<button type="button" onclick="worldTreeBarkUi.moveBarkPoints('${def.key}',${delta})"${off ? " disabled" : ""}>${label}</button>`;
    return `<article class="bark-stat" style="--stat-tone:${tones[def.key]}"><strong>${esc(runtime, (0, runtime.deps._t)(def.label))}</strong><b>${esc(runtime, barkStatValueText(runtime, def))}</b><small>${(0, runtime.deps._t)("{perPointText}, {now}점", { perPointText: runtime.state.perPointText[def.key], now })}</small><div class="bark-stat-buttons">${button("-5", -5, !now)}${button("-1", -1, !now)}${button("+1", 1, !free || full)}${button("+5", 5, !free || full)}</div></article>`;
  }
  function barkAllocateHtml(runtime) {
    const { free } = runtime.deps.worldTreeBark.barkPoints(runtime.deps.game), tones = statTones(runtime);
    return `<div class="bark-allocate-head"><span>${(0, runtime.deps._t)("남은 껍질 포인트")}</span><b>${free}</b><button type="button" onclick="worldTreeBarkUi.resetBarkAllocation()">${(0, runtime.deps._t)("다시 나누기")}</button></div>${barkRouteHtml(runtime)}<div class="bark-stats">${runtime.deps.WORLD_TREE_BARK.stats.map((def) => barkStatCardHtml(runtime, def, free, tones)).join("")}</div>`;
  }
  function barkSourcesHtml(runtime) {
    const rule = runtime.deps.WORLD_TREE_BARK.points, journal = runtime.deps.game.journalEntries || [];
    const kills = runtime.deps.PINNACLE_FIRST_KILL_JOURNALS.filter((id) => journal.includes(id)).length, have = runtime.deps.game.worldTreeBark.timeGoals || [];
    const best = Math.floor(Number(((runtime.deps.game.records || {}).actBest || {})[rule.actTenZoneId]) || 0);
    const goals = rule.actTenMinutes.map((goal) => `<i class="${have.includes(goal) ? "is-on" : ""}">${(0, runtime.deps._t)("{goal}분", { goal })}</i>`).join("");
    return `<ul class="bark-sources"><li><span>${(0, runtime.deps._t)("루프")}</span><b>+${rule.start + (runtime.deps.game.season - rule.startLoop) * rule.perLoop}</b></li><li><span>${(0, runtime.deps._t)("정점 보스 첫 처치 {kills}/{length}", { kills, length: runtime.deps.PINNACLE_FIRST_KILL_JOURNALS.length })}</span><b>+${kills * rule.pinnacle}</b></li><li><span>액트 10 돌파 시간${best ? (0, runtime.deps._t)(", 최고 {best}", { best: esc(runtime, (0, runtime.deps.formatRecordDuration)(best)) }) : ""}</span><em>${goals}</em><b>+${have.length * rule.actTenGoal}</b></li></ul>`;
  }
  function renderBarkPanel(runtime) {
    const section = runtime.deps.document.getElementById("world-tree-bark-section"), panel = runtime.deps.document.getElementById("world-tree-bark-panel");
    if (!section || !panel) return;
    const count = barkStepsNow(runtime), next = runtime.deps.WORLD_TREE_BARK.loops[count];
    section.style.display = count ? "block" : "none";
    if (!count) return;
    (0, runtime.deps.updateGamePanelMarkup)(panel, `<div class="bark-head">${barkRingsHtml(runtime, count)}<div class="bark-head-copy"><b>${(0, runtime.deps._t)("{count}단계", { count })}</b><span>${barkFixedText(runtime, count)}</span>${next ? `<small>${(0, runtime.deps._t)("다음 단계 루프 {next}", { next })}</small>` : ""}</div></div>${barkAllocateHtml(runtime)}${barkSourcesHtml(runtime)}`);
  }
  function barkSettlementHtml(runtime) {
    const count = barkStepsNow(runtime);
    if (!count) return "";
    const { free } = runtime.deps.worldTreeBark.barkPoints(runtime.deps.game);
    return `<div class="loop-settlement-bark"><p>${(0, runtime.deps._t)("세계수 껍질 {count}단계: {count2}", { count, count2: barkFixedText(runtime, count) })}</p>${free ? `<span>${(0, runtime.deps._t)("남은 껍질 포인트 {free}", { free })}</span>` : ""}<button type="button" onclick="worldTreeBarkUi.openBarkDialog()">${(0, runtime.deps._t)("껍질 포인트 나누기")}</button></div>`;
  }
  function esc(runtime, value) {
    return (0, runtime.deps.escapeHTML)(String(value ?? ""));
  }
  function statTones(runtime) {
    return { damage: (0, runtime.deps.getItemStatToneColor)("pctDmg"), taken: (0, runtime.deps.getItemStatToneColor)("dr"), move: (0, runtime.deps.getItemStatToneColor)("move"), reach: "#9fd46a" };
  }
  function barkStepsNow(runtime) {
    return (0, runtime.deps.getWorldTreeBarkLayers)(runtime.deps.game.season);
  }
  function barkFixedText(runtime, count) {
    return (0, runtime.deps._t)("최대 생명력 +{value}%, 받는 피해 -{value2}%", { value: count * runtime.deps.WORLD_TREE_BARK.pctHp, value2: count * runtime.deps.WORLD_TREE_BARK.taken });
  }
  function pointsIn(runtime, key) {
    return Math.max(0, Math.floor(Number(runtime.deps.game.worldTreeBark[key]) || 0));
  }
  function barkMapChipHtml(runtime, zone) {
    return (0, runtime.deps.isWorldTreeBarkZone)(zone) ? '<span class="map-bark-chip">껍질 구간</span>' : "";
  }

  // modules/ui/world-tree-bark-actions.mjs
  function drawBarkDialog(runtime) {
    if (!runtime.active) return;
    runtime.state.dialogOwner = runtime.deps.game;
    runtime.deps.selectionDialog.show({ id: runtime.state.DIALOG, title: (0, runtime.deps._t)("세계수 껍질"), panelClass: "bark-dialog", body: barkAllocateHtml(runtime) });
  }
  function refreshBarkScreens(runtime) {
    runtime.deps.playerStatCache.invalidate();
    renderBarkPanel(runtime);
    if (barkDialogOpen(runtime)) drawBarkDialog(runtime);
    runtime.deps.loopSettlementUi.render();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.queueImportantSave)(200);
  }
  function refused(runtime) {
    if (!runtime.active) return true;
    if (barkDialogOpen(runtime) && runtime.state.dialogOwner !== runtime.deps.game) {
      runtime.deps.selectionDialog.close(runtime.state.DIALOG);
      runtime.state.dialogOwner = null;
      return true;
    }
    const reason = runtime.deps.worldTreeBark.barkAllocationRefusal(runtime.deps.game);
    if (reason) (0, runtime.deps.addLog)(reason, "attack-monster", { toast: true });
    return !!reason;
  }
  function moveBarkPoints(runtime, key, delta) {
    if (refused(runtime)) return;
    if (runtime.deps.worldTreeBark.allocateBarkPoints(runtime.deps.game, key, delta)) refreshBarkScreens(runtime);
  }
  function resetBarkAllocation(runtime) {
    if (refused(runtime)) return;
    if (runtime.deps.worldTreeBark.resetBarkPoints(runtime.deps.game)) refreshBarkScreens(runtime);
  }
  function openBarkDialog(runtime) {
    if (!refused(runtime)) drawBarkDialog(runtime);
  }
  function barkDialogOpen(runtime) {
    return !!runtime.deps.document.getElementById(runtime.state.DIALOG);
  }

  // modules/ui/world-tree-bark-view.mjs
  function createWorldTreeBarkView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderBarkPanel, openBarkDialog, moveBarkPoints, resetBarkAllocation, barkSettlementHtml, barkMapChipHtml, barkDialogOpen };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      dispose: () => disposeWorldTreeBarkView(runtime),
      renderBarkPanel: runtime.handlers.renderBarkPanel,
      openBarkDialog: runtime.handlers.openBarkDialog,
      moveBarkPoints: runtime.handlers.moveBarkPoints,
      resetBarkAllocation: runtime.handlers.resetBarkAllocation,
      barkSettlementHtml: runtime.handlers.barkSettlementHtml,
      barkMapChipHtml: runtime.handlers.barkMapChipHtml,
      barkDialogOpen: runtime.handlers.barkDialogOpen
    });
    listenView(runtime, runtime.deps.window, "project-idle:bark-points", (event) => {
      const { gain, why } = event.detail || {};
      if (barkStepsNow(runtime)) (0, runtime.deps.addLog)((0, runtime.deps._t)("🌿 껍질 포인트 +{gain}: {why}", { gain, why }), "season-up", { toast: true });
    });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.DIALOG = "bark-allocate-dialog";
    runtime.state.perPointText = { damage: "1점당 +10%", taken: "1점당 -1%", move: "1점당 +1%", reach: "1점당 지역 1개" };
  }
  function disposeWorldTreeBarkView(runtime) {
    releaseViewEvents(runtime);
    runtime.deps.selectionDialog.close(runtime.state.DIALOG);
    runtime.state.dialogOwner = null;
  }

  // modules/world-tree-bark-ui-classic.mjs
  var worldTreeBarkUi = createWorldTreeBarkView({
    get WORLD_TREE_BARK() {
      return WORLD_TREE_BARK;
    },
    get _t() {
      return _t;
    },
    get getWorldTreeBarkReach() {
      return getWorldTreeBarkReach;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get worldTreeBark() {
      return worldTreeBark;
    },
    get PINNACLE_FIRST_KILL_JOURNALS() {
      return PINNACLE_FIRST_KILL_JOURNALS;
    },
    get formatRecordDuration() {
      return formatRecordDuration;
    },
    get document() {
      return document;
    },
    get updateGamePanelMarkup() {
      return updateGamePanelMarkup;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get loopSettlementUi() {
      return loopSettlementUi;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get addLog() {
      return addLog;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getWorldTreeBarkLayers() {
      return getWorldTreeBarkLayers;
    },
    get isWorldTreeBarkZone() {
      return isWorldTreeBarkZone;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ worldTreeBarkUi });
})();
