// GENERATED from modules/map-list-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/map-list-actions.mjs
  function chaos20Conquered(runtime, id) {
    if ((0, runtime.deps.getAbyssDepthFromZoneId)(id) !== 20) return false;
    return !!(runtime.deps.game.loopProgressCurrent && runtime.deps.game.loopProgressCurrent.chaos20Cleared) || Array.isArray(runtime.deps.game.abyssClearedDepths) && runtime.deps.game.abyssClearedDepths.includes(20) || Math.floor(runtime.deps.game.abyssEndlessDepth || 0) >= 21;
  }
  function factsOf(runtime, zone, recommendedId) {
    const id = Number(zone.id), chaos = zone.type === "abyss";
    const rewardReady = (runtime.deps.game.claimableActRewards || []).includes(id), rewardClaimed = (runtime.deps.game.claimedActRewards || []).includes(id);
    return {
      zone,
      id,
      chaos,
      current: id === runtime.deps.game.currentZoneId,
      recommended: id === recommendedId && !chaos,
      rewardReady,
      rewardClaimed,
      cleared: id < runtime.deps.game.maxZoneId || rewardReady || rewardClaimed || chaos20Conquered(runtime, id),
      reveal: id === runtime.deps.pendingMapRevealZoneId
    };
  }
  function headHtml(runtime, title, list) {
    const done = list.filter((facts) => facts.cleared).length;
    const note = list.length && list.every(runtime.handlers.reduced) ? `<em>${(0, runtime.deps._t)("모든 지역 보상 감소")}</em>` : "";
    return `<header class="map-list-head"><strong>${title}</strong>${note}<b>${(0, runtime.deps._t)("완료")} ${done}/${list.length}</b>${bar(runtime, done, list.length)}</header>`;
  }
  function actLandscape(runtime, facts) {
    const path = facts.zone.type === "act" ? runtime.deps.EXPLORATION_REGIONS.actLandscapes[facts.id - 1] : "";
    return path ? new runtime.deps.URL(path, runtime.deps.document.baseURI).href : "";
  }
  function actTitle(runtime, zone) {
    const at = zone.name.indexOf(": ");
    return at > 0 ? { label: zone.name.slice(0, at), name: zone.name.slice(at + 2) } : { label: "", name: zone.name };
  }
  function actActionsHtml(runtime, facts) {
    const state = (0, runtime.deps.getMapCardState)(facts.current, facts.cleared, facts.recommended);
    return (0, runtime.deps.buildMapCardActionsHtml)({
      state,
      isActRewardZone: facts.zone.type === "act" && facts.id <= 9,
      rewardReady: facts.rewardReady,
      rewardClaimed: facts.rewardClaimed,
      zoneId: facts.id,
      enterAction: facts.current ? "switchTab('tab-battle')" : `changeZone(${facts.id})`,
      enterLabel: (0, runtime.deps._t)(facts.current ? "전투 보기" : "이동")
    });
  }
  function actCardHtml(runtime, facts, hideReward) {
    const title = actTitle(runtime, facts.zone), story = facts.zone.type === "act" ? (0, runtime.deps.getStoryActByZoneId)(facts.id) : null, land = actLandscape(runtime, facts);
    const cls = ["map-act-card", facts.current ? "current" : "", facts.cleared ? "is-cleared" : "", facts.recommended ? "is-recommended" : "", facts.reveal ? "map-unlock-reveal" : ""];
    return `<div class="${cls.filter(Boolean).join(" ")}" role="group"${facts.current ? ' aria-current="true"' : ""}${land ? ` style="--act-land:url('${land}')"` : ""}><div class="map-act-body">${title.label ? `<small>${esc(runtime, (0, runtime.deps._t)(title.label))}</small>` : ""}<strong>${esc(runtime, (0, runtime.deps._t)(title.name))}</strong>${runtime.deps.worldTreeBarkUi.barkMapChipHtml(facts.zone)}${story ? `<span class="map-act-boss">${(0, runtime.deps._t)("보스")} ${esc(runtime, (0, runtime.deps._t)(story.bossName))}</span>` : ""}${(0, runtime.deps.buildMapPowerEstimateHtml)(facts.zone, { hideReward })}</div><div class="map-act-actions">${actActionsHtml(runtime, facts)}</div></div>`;
  }
  function actsHtml(runtime, list) {
    if (!list.length) return "";
    const hideReward = list.every(runtime.handlers.reduced);
    return `${headHtml(runtime, (0, runtime.deps._t)("일반 나무"), list)}<div class="map-act-grid">${list.map((facts) => actCardHtml(runtime, facts, hideReward)).join("")}</div>`;
  }
  function chaosStateText(runtime, facts, next) {
    if (facts.current) return (0, runtime.deps._t)("현재");
    if (facts.cleared) return (0, runtime.deps._t)("완료");
    return (0, runtime.deps._t)(next ? "다음" : "도전");
  }
  function chaosTileClass(runtime, facts, next, parts) {
    return [
      "map-chaos-tile",
      facts.current ? "is-current" : "",
      facts.cleared ? "is-cleared" : "",
      next ? "is-next" : "",
      parts && !parts.met ? "is-short" : "",
      facts.reveal ? "map-unlock-reveal" : ""
    ].filter(Boolean).join(" ");
  }
  function chaosTileHtml(runtime, facts, next, hideReward) {
    const parts = (0, runtime.deps.getMapPowerEstimateParts)(facts.zone), depth = (0, runtime.deps.getAbyssDepthFromZoneId)(facts.id), state = chaosStateText(runtime, facts, next);
    const cut = !hideReward && reduced(runtime, facts) ? `, ${(0, runtime.deps._t)("보상 감소")}` : "";
    const dots = ((0, runtime.deps.getChaosBossElements)(facts.zone) || []).map((key) => `<i class="map-power-element is-${key}" aria-label="${(0, runtime.deps.getMapEstimateElementName)(key)}"></i>`).join("");
    const go = facts.current ? ` onclick="switchTab('tab-battle')"` : ` data-exploration-departure onclick="changeZone(${facts.id})"`;
    const tip = parts ? ` ${parts.attrs} ${runtime.state.POWER_TIP}` : "";
    return `<button type="button" class="${chaosTileClass(runtime, facts, next, parts)}"${go} aria-label="${(0, runtime.deps._t)("혼돈")} ${depth}, ${state}"${tip}><small>${(0, runtime.deps._t)("혼돈")}</small><b>${depth}</b><span class="map-chaos-dots">${dots}</span><em>${state}${cut}</em>${runtime.deps.worldTreeBarkUi.barkMapChipHtml(facts.zone)}${parts ? parts.environment : ""}</button>`;
  }
  function chaosHtml(runtime, list) {
    const deep = (0, runtime.deps.getDeepChaosMapEntryHtml)();
    if (!list.length && !deep) return "";
    const hideReward = list.every(runtime.handlers.reduced), next = list.find((facts) => !facts.cleared && !facts.current);
    const tiles = list.map((facts) => chaosTileHtml(runtime, facts, facts === next, hideReward)).join("");
    return `${headHtml(runtime, (0, runtime.deps._t)("혼돈"), list)}<div class="map-chaos-board">${tiles}</div>${deep}`;
  }
  function paint(runtime, id, html, cacheKey) {
    const host = runtime.deps.document.getElementById(id);
    if (!host) return;
    if (cacheKey === "acts" ? runtime.state.lastActs === html : runtime.state.lastChaos === html) return;
    host.innerHTML = html;
    if (cacheKey === "acts") runtime.state.lastActs = html;
    else runtime.state.lastChaos = html;
  }
  function render(runtime, mapZones, recommendedId) {
    const facts = mapZones.map((zone) => factsOf(runtime, zone, recommendedId));
    const chaos = facts.filter((item) => item.chaos), chaosMarkup = chaosHtml(runtime, chaos);
    paint(runtime, "ui-map-list", actsHtml(runtime, facts.filter((item) => !item.chaos)), "acts");
    paint(runtime, "ui-chaos-map-list", chaosMarkup, "chaos");
  }
  function bossTrack(runtime, zone) {
    const tracks = { underworld: "지하계 종착", ocean: "심해 종착", sky: "창공 종착", convergence: "아틀라스 종착" };
    return (0, runtime.deps._t)(tracks[zone.pinnacleTrack] || (zone.cosmosCapstone ? "우주계 종착" : ""));
  }
  function bossStatus(runtime, zone, entry, done) {
    if (entry.travelBlocked) return (0, runtime.deps._t)("현재 탐험 종료 후 이동 가능");
    if (!entry.gate.met) return entry.gate.label;
    if (zone.milestonePinnacle) return (0, runtime.deps._t)(done ? "최초 격파 완료, 재도전 가능" : "도전 가능");
    return (0, runtime.deps._t)(entry.hasEntry ? "도전 가능" : "열쇠 필요");
  }
  function bossActionHtml(runtime, zone, entry) {
    if (entry.current) return `<button type="button" onclick="switchTab('tab-battle')">` + (0, runtime.deps._t)("전투로 돌아가기") + "</button>";
    if (entry.travelBlocked) return `<button type="button" disabled>${(0, runtime.deps._t)("이동 대기")}</button>`;
    if (!entry.gate.met) return `<button type="button" disabled>${(0, runtime.deps._t)("선행 조건 필요")}</button>`;
    if (!entry.hasEntry) return "";
    return `<button type="button" data-exploration-departure onclick="changeZone('${zone.id}')">${(0, runtime.deps._t)("도전")}</button>`;
  }
  function bossKeyHtml(runtime, zone, entry) {
    const key = runtime.deps.ORB_DB[zone.key];
    if (!key || zone.milestonePinnacle) return "";
    return `<p class="map-boss-row${entry.keyCount > 0 ? " is-have" : ""}"><span>${(0, runtime.deps._t)("열쇠")}</span><b>${(0, runtime.deps._t)("{n}개", { n: entry.keyCount })}</b>${key.source ? `<small>${esc(runtime, key.source)}</small>` : ""}</p>`;
  }
  function bossCardHtml(runtime, zone, hideReward) {
    const entry = runtime.deps.explorationAtlasUi.bossEntry(zone), done = Array.isArray(runtime.deps.game.clearedRootBosses) && runtime.deps.game.clearedRootBosses.includes(zone.id);
    const ele = runtime.state.BOSS_EMBLEMS[zone.ele] ? zone.ele : "phys", track = bossTrack(runtime, zone), reward = runtime.deps.explorationAtlasUi.bossRewardLabel(zone);
    const cls = ["map-boss-card", `is-${ele}`, entry.ready ? "is-ready" : "is-locked", runtime.deps.game.currentZoneId === zone.id ? "current" : ""].filter(Boolean).join(" ");
    const element = `<span class="map-boss-element">${(0, runtime.deps.renderPixelIcon)(runtime.state.BOSS_EMBLEMS[ele], "map-boss-glyph")}${(0, runtime.deps.getMapEstimateElementName)(ele)}</span>`;
    return `<div class="${cls}" data-boss-id="${zone.id}"><div class="map-boss-body"><div class="map-boss-title">${element}<strong>${esc(runtime, (0, runtime.deps._t)(zone.name))}</strong><em${done ? ' class="is-done"' : ""}>${(0, runtime.deps._t)(done ? "격파 완료" : "미격파")}</em></div>${track ? `<span class="map-boss-track">${track}</span>` : ""}${(0, runtime.deps.buildMapPowerEstimateHtml)(zone, { hideReward })}</div>${reward ? `<p class="map-boss-row is-reward"><span>${(0, runtime.deps._t)("보상")}</span><b>${esc(runtime, reward)}</b></p>` : ""}${bossKeyHtml(runtime, zone, entry)}<div class="map-boss-foot"><span>${esc(runtime, bossStatus(runtime, zone, entry, done))}</span>${bossActionHtml(runtime, zone, entry)}</div></div>`;
  }
  function bossGroupsHtml(runtime, zones) {
    const cleared = Array.isArray(runtime.deps.game.clearedRootBosses) ? runtime.deps.game.clearedRootBosses : [];
    const met = zones.filter((zone) => cleared.includes(zone.id) || runtime.deps.explorationAtlasUi.bossEntry(zone).gate.met).sort((a, b) => (a.tier || 0) - (b.tier || 0));
    if (!met.length) return `<p class="encounter-empty">${(0, runtime.deps._t)("아직 발견한 보스가 없습니다.")}</p>`;
    const hideReward = met.every((zone) => runtime.deps.levelProgressionUi.rewardHint(zone));
    const cards = (list) => list.map((zone) => ({ html: bossCardHtml(runtime, zone, hideReward) }));
    const groups = [
      ["rootBosses", "뿌리 보스", (zone) => !zone.rivalBlade && !zone.cosmosCapstone && !zone.milestonePinnacle],
      ["rivalBosses", "버려진 날붙이", (zone) => zone.rivalBlade],
      ["pinnacleBosses", "경계의 수호자", (zone) => (zone.cosmosCapstone || zone.milestonePinnacle) && !zone.pinnacleCapstone],
      ["finalGate", "최종 관문", (zone) => zone.pinnacleCapstone]
    ].map(([key, title, test]) => [key, title, met.filter(test)]).filter(([, , list]) => list.length);
    const done = met.filter((zone) => cleared.includes(zone.id)).length;
    const head = `<header class="map-list-head"><strong>${(0, runtime.deps._t)("강대한 적")}</strong>${hideReward ? `<em>${(0, runtime.deps._t)("모든 보스 보상 감소")}</em>` : ""}<b>${(0, runtime.deps._t)("격파")} ${done}/${met.length}</b>${bar(runtime, done, met.length)}</header>`;
    return head + groups.map(([key, title, list], index) => (0, runtime.deps.buildMapZoneGroupHtml)(key, (0, runtime.deps._t)(title), cards(list), index > 0)).join("");
  }
  function renderBosses(runtime, zones) {
    const host = runtime.deps.document.getElementById("ui-season-boss-list"), html = bossGroupsHtml(runtime, zones);
    if (!host || host._bossMarkup === html) return;
    const focused = host.contains(runtime.deps.document.activeElement) ? runtime.deps.document.activeElement : null;
    const action = focused?.getAttribute("onclick"), bossId = focused?.closest("[data-boss-id]")?.dataset.bossId;
    host.innerHTML = html;
    host._bossMarkup = html;
    if (!action) return;
    [...host.querySelectorAll("button")].find((button) => button.getAttribute("onclick") === action && button.closest("[data-boss-id]")?.dataset.bossId === bossId)?.focus({ preventScroll: true });
  }
  function esc(runtime, value) {
    return (0, runtime.deps.escapeHTML)(String(value ?? ""));
  }
  function fill(runtime, have, need) {
    return Math.max(0, Math.min(100, need > 0 ? have / need * 100 : 0));
  }
  function bar(runtime, have, need) {
    return `<i class="map-list-bar"><i style="width:${fill(runtime, have, need).toFixed(1)}%"></i></i>`;
  }
  function reduced(runtime, facts) {
    return !!runtime.deps.levelProgressionUi.rewardHint(facts.zone);
  }

  // modules/ui/map-list-view.mjs
  function createMapListView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { reduced, render, renderBosses };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ render: runtime.handlers.render, renderBosses: runtime.handlers.renderBosses });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.POWER_TIP = 'onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="hideInfoTooltip()"';
    runtime.state.lastActs = "";
    runtime.state.lastChaos = "";
    runtime.state.BOSS_EMBLEMS = Object.freeze({ fire: "flame", cold: "drop", light: "bolt", chaos: "eye", phys: "sword" });
  }

  // modules/map-list-ui-classic.mjs
  var mapListUi = createMapListView({
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get pendingMapRevealZoneId() {
      return pendingMapRevealZoneId;
    },
    get _t() {
      return _t;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get URL() {
      return URL;
    },
    get document() {
      return document;
    },
    get getMapCardState() {
      return getMapCardState;
    },
    get buildMapCardActionsHtml() {
      return buildMapCardActionsHtml;
    },
    get getStoryActByZoneId() {
      return getStoryActByZoneId;
    },
    get worldTreeBarkUi() {
      return worldTreeBarkUi;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get getMapPowerEstimateParts() {
      return getMapPowerEstimateParts;
    },
    get getChaosBossElements() {
      return getChaosBossElements;
    },
    get getMapEstimateElementName() {
      return getMapEstimateElementName;
    },
    get getDeepChaosMapEntryHtml() {
      return getDeepChaosMapEntryHtml;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get levelProgressionUi() {
      return levelProgressionUi;
    },
    get buildMapZoneGroupHtml() {
      return buildMapZoneGroupHtml;
    },
    get escapeHTML() {
      return escapeHTML;
    }
  });
  safeExposeGlobals({ mapListUi });
})();
