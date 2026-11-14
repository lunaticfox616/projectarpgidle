// GENERATED from modules/loop-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

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

  // modules/ui/loop-settlement-markup.mjs
  function unlockRewardText(runtime) {
    const points = runtime.deps.contentProgression.points();
    const overflow = (0, runtime.deps._t)("넘치는 해금 포인트는 루프마다 그루터기 함 접붙이기 점수 +{n}가 됩니다.", { n: runtime.deps.CONTENT_UNLOCK_POINT_AWARDS.perLoop });
    if (points.complete) return `${(0, runtime.deps._t)("전체 해금 완료.")} ${overflow}`;
    if (!points.nextAward) return `${(0, runtime.deps._t)("남은 해금에 필요한 포인트를 모두 모았습니다.")} ${overflow}`;
    return (0, runtime.deps._t)("해금 포인트 +{n}", { n: points.nextAward });
  }
  function summaryHtml(runtime, preservation = firstPreservationHtml(runtime)) {
    const loop = runtime.deps.game.season || 1;
    const record = runtime.deps.game.records && runtime.deps.game.records.currentLoop;
    const time = record ? (0, runtime.deps.formatRecordDuration)(record.activeMs) : (0, runtime.deps._t)("기록 없음");
    return `<section class="loop-settlement-story" data-loop-section="1">${storyHtml(runtime)}</section>
            <section class="loop-settlement-result" data-loop-section="2"><h2 aria-label="${(0, runtime.deps._t)("루프 {n} 달성", { n: loop + 1 })}">${(0, runtime.deps._t)("루프")} <span class="loop-settlement-count${runtime.state.rolledLoop === loop ? " is-rolled" : ""}" data-loop-count aria-hidden="true"><span><b>${loop}</b><b>${loop + 1}</b></span></span> ${(0, runtime.deps._t)("달성")}</h2>
            <dl class="loop-settlement-stats"><div><dt>${(0, runtime.deps._t)("도달 레벨")}</dt><dd>${runtime.deps.game.level}</dd></div><div><dt>${(0, runtime.deps._t)("처치")}</dt><dd>${Number(runtime.deps.game.loopKills || 0).toLocaleString()}</dd></div><div><dt>${(0, runtime.deps._t)("활동 시간")}</dt><dd>${time}</dd></div></dl>${runtime.deps.worldTreeBarkUi.barkSettlementHtml()}
            <div class="loop-settlement-next"><ul>${nextLoopLines(runtime, loop).map((row) => `<li class="is-${row.kind}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.text)).replace(/\+\d+/g, (gain) => `<b>${gain}</b>`)}</li>`).join("")}</ul></div>
            <p class="loop-settlement-reset">${(0, runtime.deps._t)("루프 시 레벨, 장비 및 재화를 포함한 대부분의 진행도가 초기화됩니다.")}</p>${preservation}</section>
            <section class="loop-settlement-controls" data-loop-section="3">${stallWarningHtml(runtime)}${runtime.deps.loopAutomationUi.controlsHtml()}</section>
            <button type="button" class="loop-settlement-continue" data-loop-continue>${(0, runtime.deps._t)("눌러서 계속")}</button>`;
  }
  function firstPreservationHtml(runtime) {
    if (runtime.deps.game.season !== 1) return "";
    const gear = [...Object.values(runtime.deps.game.equipment), ...runtime.deps.game.inventory, ...runtime.deps.game.equipmentTemporaryStorage || []].filter((item) => item && !runtime.deps.bagItems.isSpecial(item));
    const gearKept = gear.filter((item) => item.loopSealed).length;
    const box = runtime.deps.game.stumpBox;
    const stumpKept = box?.sealed.filter((cell) => box.board[cell] != null).length || 0;
    const lines = [(0, runtime.deps._t)("장비 {kept}개 유지 · 미봉인 장비 {lost}개 초기화", { kept: gearKept, lost: gear.length - gearKept })];
    if (runtime.deps.game.currencies.ouroboros > 0) lines.push((0, runtime.deps._t)("장비를 가져가려면 장비 정리에서 나무꾼의 손길로 봉인하세요."));
    if (box?.acquired) {
      lines.push((0, runtime.deps._t)("그루터기 함 {kept}개 유지 · 봉인 칸 밖 {lost}개 초기화", { kept: stumpKept, lost: box.items.length - stumpKept }));
      lines.push((0, runtime.deps._t)(runtime.deps.stumpBox.sealLimit(runtime.deps.game) ? "가져갈 그루터기 아이템을 봉인 칸에 놓으세요." : "그루터기 함의 봉인 칸은 아직 열리지 않았습니다."));
    }
    return `<aside class="loop-settlement-preservation"><strong>${(0, runtime.deps._t)("다음 루프에 가져갈 것")}</strong>
            <ul>${lines.map((line) => `<li>${(0, runtime.deps.escapeHTML)(line)}</li>`).join("")}</ul></aside>`;
  }
  function nextLoopLines(runtime, loop) {
    const roadmap = runtime.deps.game.contentProgression ? milestoneLines(runtime, loop + 1) : (runtime.deps.SEASON_CONTENT_ROADMAP[loop + 1] || { features: ["심화 도전을 이어갑니다."] }).features.filter((text) => !runtime.state.LOOP_STUMP_ROADMAP_LINE.test(text)).map((text) => (0, runtime.deps._t)(text));
    return [
      { kind: "unlock", text: runtime.deps.game.contentProgression ? unlockRewardText(runtime) : "" },
      { kind: "stump", text: stumpCellLine(runtime) },
      { kind: "loop", text: `${(0, runtime.deps._t)("루프 포인트 +1")}${loopPointLockText(runtime)}` },
      { kind: "loop", text: runtime.deps.worldTreeBark.nextLoopBarkLine(loop + 1) },
      ...roadmap.map((text) => ({ kind: "road", text })),
      ...runtime.deps.loopMutationUi.nextLoopLines(loop + 1).map((text) => ({ kind: "mutation", text }))
    ].filter((row) => row.text);
  }
  function stumpCellLine(runtime) {
    const now = runtime.deps.stumpBox.openCount(runtime.deps.game), next = runtime.deps.stumpBox.openCount({ ...runtime.deps.game, season: (runtime.deps.game.season || 1) + 1 });
    return next > now ? (0, runtime.deps._t)("그루터기 함 슬롯 +{gain} (현재 {now}칸)", { gain: next - now, now }) : "";
  }
  function loopPointLockText(runtime) {
    return runtime.deps.game.contentProgression && !runtime.deps.contentProgression.isUnlocked("loopTree") ? ` ${(0, runtime.deps._t)("(해금 후 사용 가능)")}` : "";
  }
  function storyHtml(runtime) {
    return `<p>${runtime.deps.STORY_LOOP_MILESTONES.default.narration.map((line) => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(line))).join("<br>")}</p>`;
  }
  function milestoneLines(runtime, next) {
    return runtime.deps.contentUnlockUi.roadmapAdditions(next).filter((text) => !runtime.state.LOOP_STUMP_ROADMAP_LINE.test(text));
  }
  function resetButtonAttr(runtime, ready) {
    return ready && !(0, runtime.deps.getHeldGearLoopBlockReason)() ? "" : "disabled";
  }
  function stallWarningHtml(runtime) {
    const reason = (0, runtime.deps.getHeldGearLoopBlockReason)();
    return reason ? `<p class="loop-settlement-warning" role="alert">${(0, runtime.deps.escapeHTML)(reason)}</p>` : "";
  }

  // modules/ui/loop-settlement-reveal.mjs
  function playLoopRewriteEffect(runtime) {
    if (!runtime.active) return;
    const overlay = runtime.deps.document.getElementById("loop-rewrite-overlay");
    if (!overlay) return;
    cancelLoopRewrite(runtime);
    runtime.state.rewriteOverlay = overlay;
    overlay.innerHTML = '<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">전투의 기억을 간직한 채, 새로운 루프를 시작합니다.</div></div>';
    runtime.deps.document.body.classList.add("loop-rewrite-active");
    overlay.classList.remove("active");
    void overlay.offsetWidth;
    overlay.classList.add("active");
    runtime.state.rewriteTimer = runtime.deps.setTimeout(() => cancelLoopRewrite(runtime), 1950);
  }
  function cancelLoopRewrite(runtime) {
    runtime.deps.clearTimeout(runtime.state.rewriteTimer);
    runtime.state.rewriteTimer = 0;
    if (!runtime.state.rewriteOverlay) return;
    runtime.state.rewriteOverlay.classList.remove("active");
    runtime.deps.document.body.classList.remove("loop-rewrite-active");
    runtime.state.rewriteOverlay = null;
  }
  function togglePastLoopMilestones(runtime) {
    if (!runtime.active) return;
    const settings = runtime.deps.game.settings;
    settings.collapsePastLoopMilestones = settings.collapsePastLoopMilestones === false;
    runtime.deps.updateStaticUI();
  }
  function startReveal(runtime) {
    if (runtime.state.revealLoop === runtime.deps.game.season) return false;
    runtime.state.revealLoop = runtime.deps.game.season;
    runtime.state.revealStep = runtime.deps.game.settings.autoLoop ? 3 : 1;
    return true;
  }
  function showReveal(runtime, fresh) {
    if (!runtime.active) return;
    const cards = runtime.deps.document.querySelectorAll("#loop-ready-overlay .loop-settlement-card, #loop-decision-overlay .loop-settlement-card");
    cards.forEach((card) => {
      card.dataset.loopStep = String(runtime.state.revealStep);
      if (fresh) card.dataset.loopFresh = fresh;
    });
    if (!fresh) return;
    (0, runtime.deps.clearTimeout)(runtime.state.freshTimer);
    const owner = runtime.deps.game;
    runtime.state.freshTimer = (0, runtime.deps.setTimeout)(() => {
      runtime.state.freshTimer = 0;
      if (runtime.active && runtime.deps.game === owner) cards.forEach((card) => delete card.dataset.loopFresh);
    }, 800);
  }
  function advanceReveal(runtime, event) {
    if (!runtime.active || runtime.state.owner !== runtime.deps.game) return;
    if (runtime.state.revealStep >= 3) return;
    if (!event.target.closest("[data-loop-continue]") && event.target.closest("button, select, input, label, a, summary")) return;
    runtime.state.revealStep += 1;
    showReveal(runtime, String(runtime.state.revealStep));
    if (runtime.state.revealStep === 2) rollLoop(runtime);
    focusRevealedSection(runtime, event.currentTarget);
  }
  function focusRevealedSection(runtime, overlay) {
    const card = overlay.querySelector(".loop-settlement-card");
    const parts = card ? card.querySelectorAll(`[data-loop-section="${runtime.state.revealStep}"]`) : [];
    if (parts.length) parts[parts.length - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
    card?.querySelector("[data-loop-continue]")?.focus({ preventScroll: true });
  }
  function rollLoop(runtime) {
    if (!runtime.active) return;
    if (runtime.state.rolledLoop === runtime.deps.game.season) return;
    runtime.state.rolledLoop = runtime.deps.game.season;
    const owner = runtime.deps.game, season = owner.season;
    const roll = () => {
      runtime.state.rollTimer = 0;
      if (!runtime.active || runtime.deps.game !== owner || owner.season !== season) return;
      runtime.deps.document.querySelectorAll(".loop-settlement-card [data-loop-count]").forEach((node) => node.classList.add("is-rolled"));
    };
    (0, runtime.deps.clearTimeout)(runtime.state.rollTimer);
    if (typeof runtime.deps.matchMedia === "function" && (0, runtime.deps.matchMedia)("(prefers-reduced-motion: reduce)").matches) roll();
    else runtime.state.rollTimer = (0, runtime.deps.setTimeout)(roll, 650);
  }
  function nudgeStallWarning(runtime) {
    runtime.deps.document.querySelectorAll(".loop-settlement-warning").forEach((node) => {
      node.classList.remove("is-nudged");
      node.getBoundingClientRect();
      node.classList.add("is-nudged");
    });
  }
  function showFreshReveal(runtime) {
    if (!startReveal(runtime)) return showReveal(runtime, "");
    showReveal(runtime, runtime.state.revealStep === 3 ? "all" : "1");
    if (runtime.state.revealStep >= 2) rollLoop(runtime);
  }
  function cancelSettlementTimers(runtime) {
    cancelLoopRewrite(runtime);
    (0, runtime.deps.clearTimeout)(runtime.state.freshTimer);
    (0, runtime.deps.clearTimeout)(runtime.state.rollTimer);
    runtime.state.freshTimer = 0;
    runtime.state.rollTimer = 0;
    runtime.deps.document.querySelectorAll(".loop-settlement-card").forEach((card) => delete card.dataset.loopFresh);
  }
  function syncSettlementOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    cancelSettlementTimers(runtime);
    runtime.state.owner = runtime.deps.game;
    runtime.state.renderedKey = "";
    runtime.state.dismissedReadyLoop = 0;
    runtime.state.revealLoop = 0;
    runtime.state.revealStep = 3;
    runtime.state.rolledLoop = 0;
  }

  // modules/ui/loop-settlement-render.mjs
  function render(runtime) {
    if (!runtime.active) return;
    syncSettlementOwner(runtime);
    const ready = !!runtime.deps.game.pendingLoopReady;
    const decision = !!runtime.deps.game.pendingLoopDecision;
    const overlay = runtime.deps.document.getElementById("loop-ready-overlay");
    if (!overlay) return;
    overlay.classList.toggle("active", ready && runtime.state.dismissedReadyLoop !== runtime.deps.game.season);
    runtime.deps.document.getElementById("loop-decision-overlay").classList.toggle("active", decision);
    if (!ready && !decision) {
      runtime.state.renderedKey = "";
      runtime.state.dismissedReadyLoop = 0;
      return;
    }
    const preservation = firstPreservationHtml(runtime);
    const key = `${runtime.deps.game.season}:${ready}:${decision}:${unlockRewardText(runtime)}:${(0, runtime.deps.getHeldGearLoopBlockReason)()}:${runtime.deps.game.settings.autoLoop}:${runtime.deps.game.settings.autoLoopClass}:${runtime.deps.worldTreeBark.barkPoints(runtime.deps.game).free}:${preservation}`;
    if (key === runtime.state.renderedKey) return;
    if (!runtime.state.renderedKey.startsWith(`${runtime.deps.game.season}:`)) runtime.deps.document.querySelectorAll("#loop-ready-overlay .tutorial-card, #loop-decision-overlay .tutorial-card").forEach((card) => card.scrollTo(0, 0));
    runtime.state.renderedKey = key;
    const html = summaryHtml(runtime, preservation);
    runtime.deps.document.getElementById("loop-ready-summary").innerHTML = html;
    runtime.deps.document.getElementById("loop-decision-summary").innerHTML = html;
    showFreshReveal(runtime);
  }
  function getLoopPathUiState(runtime) {
    let season = runtime.deps.game ? runtime.deps.game.season || 1 : 1;
    let chaosReady = typeof runtime.deps.hasCurrentLoopChaosRequirementClear === "function" ? (0, runtime.deps.hasCurrentLoopChaosRequirementClear)(season) : typeof runtime.deps.hasCurrentLoopAbyssRequirementClear === "function" && (0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(season);
    let cosmosReady = typeof runtime.deps.hasCurrentLoopCosmosRequirementClear === "function" ? (0, runtime.deps.hasCurrentLoopCosmosRequirementClear)(season) : false;
    return { chaosReady, cosmosReady, showPathChoices: season >= 31 && cosmosReady };
  }
  function updateLoopDecisionOverlayUi(runtime) {
    runtime.api.render();
    let state = getLoopPathUiState(runtime);
    let body = runtime.deps.document.getElementById("loop-decision-body");
    if (body) body.innerText = state.showPathChoices ? (0, runtime.deps._t)("다음 루프로 사용할 경로를 선택하거나, 이번 루프를 유지하고 심화 등반을 계속하세요.") : (0, runtime.deps._t)("다음 루프로 즉시 넘어갈지, 이번 루프를 유지하고 심화 등반을 계속할지 선택하세요.");
    let genericBtn = runtime.deps.document.getElementById("loop-decision-generic-btn");
    let chaosBtn = runtime.deps.document.getElementById("loop-decision-chaos-btn");
    let cosmosBtn = runtime.deps.document.getElementById("loop-decision-cosmos-btn");
    if (genericBtn) genericBtn.style.display = state.showPathChoices ? "none" : "";
    if (chaosBtn) {
      chaosBtn.style.display = state.showPathChoices ? "" : "none";
      chaosBtn.disabled = !state.chaosReady;
    }
    if (cosmosBtn) {
      cosmosBtn.style.display = state.showPathChoices ? "" : "none";
      cosmosBtn.disabled = !state.cosmosReady;
    }
  }

  // modules/ui/loop-settlement-actions.mjs
  function announceCodexStarter(runtime, { item, pick }) {
    const { deps } = runtime;
    deps.addLog(deps._t("🎁 도감 완성 특전 지급: [{itemSlotDisplayLabel}] {name} (액트1 고유 랜덤 1개)", {
      itemSlotDisplayLabel: deps.getItemSlotDisplayLabel(item, pick.slots[0]),
      name: deps._t(pick.name)
    }), "loot-unique");
  }
  function organize(runtime) {
    runtime.state.dismissedReadyLoop = runtime.deps.game.season;
    render(runtime);
    (0, runtime.deps.switchTab)("tab-items");
    if (runtime.deps.playerStall.loopBlockReason(runtime.deps.game)) runtime.deps.marketUi.open("stall");
    else if ((0, runtime.deps.getHeldGearLoopBlockReason)()) runtime.deps.marketUi.open("hall");
  }
  function reopen(runtime) {
    runtime.state.dismissedReadyLoop = 0;
    render(runtime);
  }
  function canShowCombatLoopAdvanceButton(runtime) {
    if (runtime.deps.game && (runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision)) return true;
    if (!runtime.deps.game) return false;
    return typeof runtime.deps.hasCurrentLoopAbyssRequirementClear === "function" ? (0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(runtime.deps.game.season || 1) : !!(runtime.deps.game.loopProgressCurrent && runtime.deps.game.loopProgressCurrent.chaos20Cleared);
  }
  async function requestManualLoopAdvanceConfirmation(runtime) {
    if (!runtime.active) return false;
    const owner = runtime.deps.game, season = owner.season;
    const stallReason = (0, runtime.deps.getHeldGearLoopBlockReason)();
    if (stallReason) {
      if (typeof runtime.deps.addLog === "function") (0, runtime.deps.addLog)(stallReason, "attack-monster", { toast: true });
      runtime.api.nudgeStallWarning();
      return Promise.resolve(false);
    }
    const confirmed = await (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("정말 지금 루프하시겠습니까?\n현재 루프를 정산하고 다음 루프로 이동합니다."),
      {
        title: (0, runtime.deps._t)("루프 진행 확인"),
        tone: "danger",
        confirmLabel: (0, runtime.deps._t)("루프 진행"),
        cancelLabel: (0, runtime.deps._t)("취소"),
        dismissOnBackdrop: false
      }
    );
    return !!confirmed && runtime.active && runtime.deps.game === owner && owner.season === season;
  }
  async function handleLoopDecisionAdvanceButton(runtime, path) {
    if (!runtime.deps.game || !runtime.deps.game.pendingLoopDecision) return;
    let selectedPath = path === "chaos" || path === "cosmos" ? path : null;
    if (!await requestManualLoopAdvanceConfirmation(runtime)) return;
    if (!runtime.deps.game || !runtime.deps.game.pendingLoopDecision) return;
    if (selectedPath) (0, runtime.deps.chooseLoopAdvancePath)(selectedPath);
    else (0, runtime.deps.chooseLoopAdvance)(true);
  }
  function openLoopPathChoice(runtime) {
    runtime.deps.game.pendingLoopDecision = true;
    let overlay = runtime.deps.document.getElementById("loop-decision-overlay");
    if (overlay) overlay.classList.toggle("active", true);
    updateLoopDecisionOverlayUi(runtime);
    if (typeof runtime.deps.addLog === "function") (0, runtime.deps.addLog)((0, runtime.deps._t)("진행할 루프 경로를 선택하세요."), "season-up");
  }
  async function handleCombatLoopAdvanceButton(runtime) {
    if (!runtime.active) return;
    if (canConfirmReadyLoop(runtime)) {
      return confirmReadyLoop(runtime);
    }
    if (runtime.deps.game && runtime.deps.game.pendingLoopDecision && typeof runtime.deps.chooseLoopAdvance === "function") {
      await handleLoopDecisionAdvanceButton(runtime);
      return;
    }
    if (canShowCombatLoopAdvanceButton(runtime) && typeof runtime.deps.triggerSeasonReset === "function") {
      return confirmDirectLoop(runtime);
    }
    if (typeof runtime.deps.addLog === "function") (0, runtime.deps.addLog)((0, runtime.deps._t)("아직 루프 진행 조건을 달성하지 못했습니다."), "attack-monster");
  }
  function canConfirmReadyLoop(runtime) {
    return runtime.deps.game && runtime.deps.game.pendingLoopReady && typeof runtime.deps.confirmLoopReady === "function";
  }
  function availablePaths(runtime) {
    return typeof runtime.deps.getAvailableLoopAdvancePaths === "function" ? runtime.deps.getAvailableLoopAdvancePaths(runtime.deps.game.season || 1) : [];
  }
  async function confirmReadyLoop(runtime) {
    if (availablePaths(runtime).length > 1) return (0, runtime.deps.confirmLoopReady)();
    if (!await requestManualLoopAdvanceConfirmation(runtime) || !runtime.deps.game.pendingLoopReady) return;
    (0, runtime.deps.confirmLoopReady)();
  }
  async function confirmDirectLoop(runtime) {
    if (availablePaths(runtime).length > 1) return openLoopPathChoice(runtime);
    const season = runtime.deps.game.season || 1;
    if (!await requestManualLoopAdvanceConfirmation(runtime)) return;
    if (!runtime.deps.game || (runtime.deps.game.season || 1) !== season || !canShowCombatLoopAdvanceButton(runtime)) return;
    (0, runtime.deps.triggerSeasonReset)();
  }

  // modules/ui/loop-settlement-view.mjs
  function createLoopSettlementView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { announceCodexStarter, playLoopRewriteEffect, togglePastLoopMilestones, unlockRewardText, summaryHtml, firstPreservationHtml, nextLoopLines, stumpCellLine, loopPointLockText, storyHtml, startReveal, showReveal, advanceReveal, rollLoop, milestoneLines, resetButtonAttr, nudgeStallWarning, stallWarningHtml, render, showFreshReveal, organize, reopen, canShowCombatLoopAdvanceButton, updateLoopDecisionOverlayUi, handleCombatLoopAdvanceButton, handleLoopDecisionAdvanceButton };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    listenView(runtime, deps.window, "project-idle:loop-rewrite-started", () => {
      runtime.handlers.render();
      runtime.handlers.playLoopRewriteEffect();
    });
    runtime.api = Object.assign(settlementFields(runtime), runtime.handlers, { dispose: () => disposeLoopSettlementView(runtime) });
    for (const id of ["loop-ready-overlay", "loop-decision-overlay"]) {
      const overlay = deps.document.getElementById(id);
      if (overlay) listenView(runtime, overlay, "click", runtime.handlers.advanceReveal);
    }
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.LOOP_STUMP_ROADMAP_LINE = /^그루터기 함: 루프마다/;
    runtime.state.renderedKey = "";
    runtime.state.dismissedReadyLoop = 0;
    runtime.state.revealLoop = 0;
    runtime.state.revealStep = 3;
    runtime.state.freshTimer = 0;
    runtime.state.rolledLoop = 0;
    runtime.state.rollTimer = 0;
    runtime.state.owner = null;
    runtime.state.rewriteTimer = 0;
    runtime.state.rewriteOverlay = null;
  }
  function disposeLoopSettlementView(runtime) {
    releaseViewEvents(runtime);
    cancelSettlementTimers(runtime);
    runtime.state.owner = null;
    for (const id of ["loop-ready-overlay", "loop-decision-overlay"]) {
      runtime.deps.document.getElementById(id)?.classList.remove("active");
    }
  }
  function settlementFields(runtime) {
    return {
      get renderedKey() {
        return runtime.state.renderedKey;
      },
      set renderedKey(value) {
        runtime.state.renderedKey = value;
      },
      get dismissedReadyLoop() {
        return runtime.state.dismissedReadyLoop;
      },
      set dismissedReadyLoop(value) {
        runtime.state.dismissedReadyLoop = value;
      },
      get revealLoop() {
        return runtime.state.revealLoop;
      },
      set revealLoop(value) {
        runtime.state.revealLoop = value;
      },
      get revealStep() {
        return runtime.state.revealStep;
      },
      set revealStep(value) {
        runtime.state.revealStep = value;
      },
      get freshTimer() {
        return runtime.state.freshTimer;
      },
      set freshTimer(value) {
        runtime.state.freshTimer = value;
      },
      get rolledLoop() {
        return runtime.state.rolledLoop;
      },
      set rolledLoop(value) {
        runtime.state.rolledLoop = value;
      }
    };
  }

  // modules/loop-ui-classic.mjs
  var loopSettlementUi = createLoopSettlementView({
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get window() {
      return window;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get contentProgression() {
      return contentProgression;
    },
    get _t() {
      return _t;
    },
    get CONTENT_UNLOCK_POINT_AWARDS() {
      return CONTENT_UNLOCK_POINT_AWARDS;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get formatRecordDuration() {
      return formatRecordDuration;
    },
    get worldTreeBarkUi() {
      return worldTreeBarkUi;
    },
    get loopAutomationUi() {
      return loopAutomationUi;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get bagItems() {
      return bagItems;
    },
    get stumpBox() {
      return stumpBox;
    },
    get SEASON_CONTENT_ROADMAP() {
      return SEASON_CONTENT_ROADMAP;
    },
    get worldTreeBark() {
      return worldTreeBark;
    },
    get loopMutationUi() {
      return loopMutationUi;
    },
    get STORY_LOOP_MILESTONES() {
      return STORY_LOOP_MILESTONES;
    },
    get document() {
      return document;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : windowMatchMedia;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get getHeldGearLoopBlockReason() {
      return getHeldGearLoopBlockReason;
    },
    get switchTab() {
      return switchTab;
    },
    get playerStall() {
      return playerStall;
    },
    get marketUi() {
      return marketUi;
    },
    get hasCurrentLoopAbyssRequirementClear() {
      return typeof hasCurrentLoopAbyssRequirementClear === "undefined" ? void 0 : hasCurrentLoopAbyssRequirementClear;
    },
    get hasCurrentLoopChaosRequirementClear() {
      return typeof hasCurrentLoopChaosRequirementClear === "undefined" ? void 0 : hasCurrentLoopChaosRequirementClear;
    },
    get hasCurrentLoopCosmosRequirementClear() {
      return typeof hasCurrentLoopCosmosRequirementClear === "undefined" ? void 0 : hasCurrentLoopCosmosRequirementClear;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get chooseLoopAdvancePath() {
      return chooseLoopAdvancePath;
    },
    get chooseLoopAdvance() {
      return typeof chooseLoopAdvance === "undefined" ? void 0 : chooseLoopAdvance;
    },
    get confirmLoopReady() {
      return typeof confirmLoopReady === "undefined" ? void 0 : confirmLoopReady;
    },
    get triggerSeasonReset() {
      return typeof triggerSeasonReset === "undefined" ? void 0 : triggerSeasonReset;
    },
    get getAvailableLoopAdvancePaths() {
      return typeof getAvailableLoopAdvancePaths === "undefined" ? void 0 : getAvailableLoopAdvancePaths;
    }
  });
  safeExposeGlobals({
    loopSettlementUi,
    playLoopRewriteEffect: loopSettlementUi.playLoopRewriteEffect,
    togglePastLoopMilestones: loopSettlementUi.togglePastLoopMilestones,
    canShowCombatLoopAdvanceButton: loopSettlementUi.canShowCombatLoopAdvanceButton,
    updateLoopDecisionOverlayUi: loopSettlementUi.updateLoopDecisionOverlayUi,
    handleCombatLoopAdvanceButton: loopSettlementUi.handleCombatLoopAdvanceButton,
    handleLoopDecisionAdvanceButton: loopSettlementUi.handleLoopDecisionAdvanceButton
  });
})();
