// GENERATED from modules/cosmos-route-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/cosmos-route-actions.mjs
  function focus(runtime, node) {
    runtime.state.galaxy = node.orbit || 1;
    runtime.deps.document.getElementById("cosmos-node-detail").open = true;
  }
  function closeNode(runtime) {
    runtime.deps.document.getElementById("cosmos-node-detail").open = false;
  }
  function branchMap(runtime, plan) {
    const index = Math.min(plan.stage, plan.plan.length - 1);
    const currentId = plan.queue[0] || plan.plan[index][0];
    const current = runtime.state.lastView.nodes.find((node) => node.id === currentId);
    const boss = runtime.state.lastView.nodes.find((node) => node.id === plan.plan.at(-1).at(-1));
    const total = plan.plan.flat().length;
    return `<div class="cosmos-journey-heading"><small>${runtime.deps.cosmosRouteRuntime.active(runtime.deps.game) ? (0, runtime.deps._t)("현재 탐사 중") : (0, runtime.deps._t)("이번 탐사")}</small>
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(current.name))} <span>→</span> <em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(boss.name))}</em></strong>
            <div class="cosmos-goal-chips"><span>${(0, runtime.deps._t)("{length}구간", { length: plan.plan.length })}</span><span>${(0, runtime.deps._t)("행성 {total}곳", { total })}</span><span>${(0, runtime.deps._t)("탐사 {length}/{total}", { length: plan.history.length, total })}</span>
            <span class="is-reward">${(0, runtime.deps._t)("보상 창공의 정수")}</span></div>${difficultyHtml(runtime, currentId, boss.id)}</div>${legendHtml(runtime)}
            <div class="cosmos-expedition-map" role="group" aria-label="${(0, runtime.deps._t)("은하 탐사")}">
            ${plan.plan.map((leg, i) => expeditionStage(runtime, plan, i)).join("")}</div>`;
  }
  function expeditionStage(runtime, plan, index) {
    const progress = plan.history.filter((row) => row.stage === index).length;
    const current = plan.stage === index;
    const done = progress === plan.plan[index].length;
    const title = index === plan.plan.length - 1 ? "마지막 관문" : (0, runtime.deps._t)("{value}번째 탐사", { value: index + 1 });
    return `<details class="cosmos-expedition-stage ${current ? "current" : ""} ${done ? "done" : ""}"
            data-route-segment="${index}" data-route-disclosure="leg-${index}" ${current ? "open" : ""}>
            <summary><b>${title}</b><span>${done ? (0, runtime.deps._t)("완료") : current && runtime.deps.cosmosRouteRuntime.active(runtime.deps.game) ? (0, runtime.deps._t)("탐사 중") : ""}</span>
            <small>${progress}/${plan.plan[index].length}</small></summary>
            <ol class="cosmos-planet-path">${plan.plan[index].map((id) => expeditionPlanet(runtime, plan, id)).join("")}</ol></details>`;
  }
  function expeditionPlanet(runtime, plan, id) {
    const node = runtime.state.lastView.nodes.find((row) => row.id === id);
    const done = plan.history.some((row) => row.id === id);
    const current = plan.queue[0] === id;
    const boss = id === plan.plan.at(-1).at(-1);
    const habitat = runtime.deps.cosmosRouteRuntime.planetHabitat(id);
    const state = current ? "현재 위치" : done ? "탐사 완료" : boss ? "최종 보스" : runtime.deps.COSMOS_ROUTE_G1.habitats[habitat]?.name || "";
    return `<li class="cosmos-planet-stop ${node.kind} ${habitat} ${boss ? "boss" : ""} ${current ? "current" : ""} ${done ? "done" : ""}" data-planned-node="${id}" ${current ? 'aria-current="step"' : ""}>
            <i aria-hidden="true"></i><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</b><small>${state}</small></li>`;
  }
  function difficultyHtml(runtime, currentId, bossId) {
    const ready = (label, id) => {
      const zone = runtime.state.lastView.zoneOf(id), chip = zone ? (0, runtime.deps.buildMapPowerEstimateHtml)(zone) : "";
      return chip ? `<span class="cosmos-ready"><b>${label}</b>${chip}</span>` : "";
    };
    return `<div class="cosmos-difficulty">${ready("다음 행성", currentId)}${currentId === bossId ? "" : ready("보스", bossId)}</div>`;
  }
  function legendHtml(runtime) {
    const rows = Object.entries(runtime.state.HABITAT_HINTS).map(([id, hint]) => `<span class="${id}"><i></i><b>${(0, runtime.deps._t)(runtime.deps.COSMOS_ROUTE_G1.habitats[id].name)}</b> ${hint}</span>`);
    return `<p class="cosmos-legend">${rows.join("")}<span class="boss"><i></i><b>${(0, runtime.deps._t)("보스")}</b> ${(0, runtime.deps._t)("은하의 끝")}</span></p>`;
  }
  function galaxyChipsHtml(runtime) {
    return `<nav class="cosmos-galaxies" aria-label="${(0, runtime.deps._t)("은하")}">${[1, 2, 3, 4, 5].map((id) => {
      const open = runtime.deps.cosmosRouteRuntime.unlocked(runtime.deps.game, id);
      return `<button type="button" style="--galaxy-tone:${runtime.state.GALAXY_TONES[id]}" data-route-action="galaxy" data-route-value="${id}" aria-pressed="${runtime.state.galaxy === id}"${open ? "" : (0, runtime.deps._t)(' data-tip="{value}은하 보스 격파 후 탐사"', { value: id - 1 })} class="${open ? "" : "is-locked"}">${id}은하</button>`;
    }).join("")}</nav>`;
  }
  function routeFooter(runtime, plan, unlocked) {
    if (!unlocked) return '<p class="cosmos-route-notice">나무꾼 격파, 지하계 30층 도달 후 해금</p>';
    const retry = Math.ceil(runtime.deps.cosmosRouteRuntime.retryRemaining(runtime.deps.game) / 1e3);
    if (retry) return `<p class="cosmos-route-notice" role="status">${(0, runtime.deps._t)("재도전까지")} <b data-route-retry>${retry}</b>${(0, runtime.deps._t)("초, 일반 사냥 가능")}</p>`;
    if (runtime.deps.cosmosRouteRuntime.active(runtime.deps.game)) return `<footer class="cosmos-route-footer"><span data-route-progress></span><div>
            <button type="button" data-route-action="retreat">${(0, runtime.deps._t)("종료")}</button><button type="button" class="primary" data-route-action="battle">${(0, runtime.deps._t)("전투 보기")}</button></div></footer>`;
    if (!runtime.deps.cosmosRouteRuntime.unlocked(runtime.deps.game, runtime.state.galaxy)) return `<p class="cosmos-route-notice">${(0, runtime.deps._t)("{value}은하 보스 격파 후 탐사 가능", { value: runtime.state.galaxy - 1 })}</p>`;
    const rewards = runtime.deps.EXPLORATION_REGIONS.guides["map-tab-cosmos"].reward;
    return `<footer class="cosmos-route-footer"><span>${(0, runtime.deps._t)("{length}구간, {length2}곳", { length: plan.plan.length, length2: plan.plan.flat().length })}<br>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(rewards))}</span>
            <div>${currentStarBattle(runtime) ? (0, runtime.deps._t)('<button type="button" data-route-action="battle">전투 보기</button>') : ""}
            <button type="button" class="primary" data-exploration-departure data-route-action="start" data-route-value="${runtime.state.galaxy}">${(0, runtime.deps._t)("탐사 출발")}</button></div></footer>`;
  }
  function outcomeLine(runtime, nodes) {
    const route = runtime.deps.game.cosmosRoute;
    if (!route || runtime.deps.cosmosRouteRuntime.active(runtime.deps.game)) return "";
    const node = nodes.find((row) => row.id === route.failedNode);
    const title = route.phase === "failed" ? `${(0, runtime.deps.escapeHTML)(node ? node.name : "탐사")}에서 실패` : "탐사 종료";
    return `<p class="cosmos-route-outcome">${(0, runtime.deps._t)("{title}, 창공의 정수 +{dust} 확보", { title, dust: route.dust })}</p>`;
  }
  function onStarMapClick(runtime, event) {
    const button = event.target.closest("[data-route-action]");
    if (!button || button.disabled) return;
    if (button.dataset.routeAction === "galaxy") {
      runtime.state.galaxy = Number(button.dataset.routeValue);
      closeNode(runtime);
      renderRouteView(runtime, runtime.state.lastView);
      return;
    }
    runtime.state.lastView.onAction(button.dataset.routeAction, button.dataset.routeValue);
  }
  function bindStarMapActions(runtime, host) {
    if (runtime.state.bound === host) return;
    runtime.state.bound?.removeEventListener("click", runtime.handlers.onStarMapClick);
    runtime.state.bound = host;
    host.addEventListener("click", runtime.handlers.onStarMapClick);
  }
  function renderRouteView(runtime, view) {
    const host = runtime.deps.document.getElementById("cosmos-inner-route");
    if (!host || host.style.display === "none") return;
    runtime.state.lastView = view;
    followStarBattle(runtime, view.nodes);
    const sameGalaxy = (runtime.deps.game.cosmosRoute?.galaxy || 1) === runtime.state.galaxy;
    const plan = sameGalaxy && (runtime.deps.cosmosRouteRuntime.active(runtime.deps.game) || runtime.deps.game.cosmosRoute && runtime.deps.cosmosRouteRuntime.retryRemaining(runtime.deps.game) > 0) ? runtime.deps.game.cosmosRoute : runtime.deps.cosmosRouteRuntime.preview(runtime.deps.game, runtime.state.galaxy);
    const html = `<section class="cosmos-star-chart" style="--galaxy-tone:${runtime.state.GALAXY_TONES[runtime.state.galaxy]}"><header class="cosmos-star-header">${galaxyChipsHtml(runtime)}
            <button type="button" data-route-action="stones">${(0, runtime.deps._t)("우주석")}</button></header>
            ${branchMap(runtime, plan)}${routeFooter(runtime, plan, view.unlocked)}${outcomeLine(runtime, view.nodes)}</section>`;
    replaceRouteMarkup(runtime, host, html);
    bindStarMapActions(runtime, host);
    writeRouteProgress(runtime);
  }
  function replaceRouteMarkup(runtime, host, html) {
    if (html !== runtime.state.lastHtml || host !== runtime.state.bound) {
      const focusKey = host.contains(runtime.deps.document.activeElement) ? runtime.deps.document.activeElement.dataset.routeAction : null;
      const focusValue = runtime.deps.document.activeElement?.dataset.routeValue;
      const disclosures = [...host.querySelectorAll("[data-route-disclosure][open]")].map((node) => node.dataset.routeDisclosure);
      host.innerHTML = html;
      runtime.state.lastHtml = html;
      for (const id of disclosures) host.querySelector(`[data-route-disclosure="${id}"]`)?.setAttribute("open", "");
      if (focusKey) host.querySelector(`[data-route-action="${focusKey}"][data-route-value="${focusValue}"]`)?.focus({ preventScroll: true });
    }
  }
  function currentStarBattle(runtime) {
    if (runtime.deps.game.currentZoneId !== "cosmos_challenge") return null;
    const challenge = runtime.deps.game.cosmosAtlas.activeChallenge;
    return challenge && !challenge.rewardSettled ? challenge : null;
  }
  function followStarBattle(runtime, nodes) {
    const id = currentStarBattle(runtime)?.nodeId;
    if (id === runtime.state.observedBattle) return;
    runtime.state.observedBattle = id;
    const node = nodes.find((row) => row.id === id);
    if (node) runtime.state.galaxy = node.orbit || 1;
  }
  function writeRouteProgress(runtime) {
    if (!runtime.state.bound || runtime.state.bound.style.display === "none" || runtime.deps.game.mapSubtab !== "map-tab-cosmos") return false;
    const label = runtime.state.bound.querySelector("[data-route-progress]");
    if (label) {
      const route = runtime.deps.game.cosmosRoute;
      const name = runtime.state.lastView.nodes.find((node) => node.id === route.queue[0])?.name || "탐사 중";
      const text = (0, runtime.deps._t)("{value}구간, {name}, {length}/{length2}, 창공의 정수 +{dust}", { value: route.stage + 1, name, length: route.history.length, length2: route.plan.flat().length, dust: route.dust });
      if (label.textContent !== text) label.textContent = text;
    }
    return true;
  }
  function updateRouteVitals(runtime) {
    if (!writeRouteProgress(runtime)) return;
    const retry = runtime.state.bound.querySelector("[data-route-retry]");
    if (!retry) return;
    const seconds = Math.ceil(runtime.deps.cosmosRouteRuntime.retryRemaining(runtime.deps.game) / 1e3);
    if (seconds === 0) {
      renderRouteView(runtime, runtime.state.lastView);
      return;
    }
    if (retry.textContent !== String(seconds)) retry.textContent = seconds;
  }
  function updateHud(runtime) {
    const label = runtime.deps.document.getElementById("ui-cosmos-route-progress");
    if (!label) return;
    const visible = runtime.deps.game.currentZoneId === "cosmos_challenge" && runtime.deps.cosmosRouteRuntime.active(runtime.deps.game);
    label.toggleAttribute("hidden", !visible);
    if (!visible) return;
    const route = runtime.deps.game.cosmosRoute;
    const completed = route.history.filter((row) => row.stage === route.stage).length;
    const text = (0, runtime.deps._t)("{value}차 탐사 {completed}/{length}", { value: route.stage + 1, completed, length: route.plan[route.stage].length });
    if (label.textContent !== text) label.textContent = text;
    label.setAttribute("aria-label", (0, runtime.deps._t)("{galaxy}은하 {text}", { galaxy: route.galaxy || 1, text }));
  }
  function pages(runtime) {
    const mastery = runtime.deps.document.getElementById("cosmos-inner-mastery");
    const onMastery = !!mastery && mastery.style.display !== "none";
    return { select: (id) => runtime.deps.window.switchCosmosInnerTab(id), items: [{ id: "route", label: (0, runtime.deps._t)("별 지도"), on: !onMastery }, { id: "mastery", label: (0, runtime.deps._t)("성도술"), on: onMastery }] };
  }

  // modules/ui/cosmos-route-view.mjs
  function createCosmosRouteView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { onStarMapClick, renderRouteView, updateRouteVitals, updateHud, focus, closeNode, pages };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = { render: runtime.handlers.renderRouteView, updateVitals: runtime.handlers.updateRouteVitals, updateHud: runtime.handlers.updateHud, focus: runtime.handlers.focus, closeNode: runtime.handlers.closeNode, pages: runtime.handlers.pages };
    runtime.api.dispose = () => disposeCosmosRouteView(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.GALAXY_TONES = Object.freeze({ 1: "#7fd6cf", 2: "#a98fe8", 3: "#e8b45f", 4: "#e07a6a", 5: "#f3e3a8" });
    runtime.state.HABITAT_HINTS = Object.freeze({ swarm: "약한 무리 여럿", guard: "단단한 정예", storm: "빠른 번개" });
    runtime.state.bound = null;
    runtime.state.lastView = null;
    runtime.state.lastHtml = "";
    runtime.state.galaxy = 1;
    runtime.state.observedBattle = null;
  }
  function disposeCosmosRouteView(runtime) {
    runtime.state.bound?.removeEventListener("click", runtime.handlers.onStarMapClick);
    runtime.state.bound = null;
    runtime.state.lastView = null;
    runtime.state.lastHtml = "";
    runtime.state.observedBattle = null;
  }

  // modules/cosmos-route-ui-classic.mjs
  var cosmosRouteUi = createCosmosRouteView({
    get document() {
      return document;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get COSMOS_ROUTE_G1() {
      return COSMOS_ROUTE_G1;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ cosmosRouteUi });
})();
