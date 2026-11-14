// GENERATED from modules/exploration-atlas-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/exploration-atlas-actions.mjs
  function trials(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked("battleTrials")) return [];
    return runtime.deps.TRIAL_ZONES.filter((trial) => trial.bloomTrial ? (0, runtime.deps.canSeeTalentBloomTrial)() : trial.reqZone !== -1 && runtime.deps.game.maxZoneId >= trial.reqZone || runtime.deps.game.unlockedTrials.includes(trial.id));
  }
  function discovered(runtime, route) {
    if (runtime.state.discoveredBy[route]) return runtime.state.discoveredBy[route]();
    const button = runtime.deps.document.getElementById("btn-" + route);
    return !!button && !button.hidden && button.style.display !== "none";
  }
  function available(runtime, route) {
    return runtime.deps.contentProgression.canOpen(route) && discovered(runtime, route);
  }
  function open(runtime, atlasMap = false) {
    clearAtlasTurn(runtime);
    runtime.deps.worldMapUi.showAtlas(atlasMap);
    (0, runtime.deps.switchTab)("tab-map", { keepWindowOpen: true });
    (0, runtime.deps.switchMapSubtab)("map-tab-zones");
    (0, runtime.deps.switchMapExploreSubtab)("map-explore-atlas");
    render(runtime);
    scrollToTop(runtime);
    if (atlasMap) focusAtlasControl(runtime, true);
  }
  function openAct(runtime, zoneId) {
    open(runtime);
    runtime.deps.worldMapUi.pickAct(zoneId);
  }
  function revealAtlasMap(runtime, on) {
    runtime.deps.worldMapUi.showAtlas(on);
    render(runtime);
    focusAtlasControl(runtime, on);
  }
  function focusAtlasControl(runtime, on) {
    const selector = on ? ".wm-atlas-back" : ".wm-atlas-entrance";
    const control = runtime.deps.document.querySelector("#ui-exploration-atlas " + selector);
    if (!on) control?.scrollIntoView({ block: "nearest", inline: "nearest" });
    control?.focus({ preventScroll: true });
  }
  function clearAtlasTurn(runtime) {
    const turn = runtime.state.atlasTurn;
    if (!turn) return;
    runtime.state.atlasTurn = null;
    turn.motions.forEach((motion) => motion.cancel());
    turn.layer?.remove();
    turn.view.classList.remove("is-atlas-turning");
    turn.map.inert = false;
    turn.map.removeAttribute("aria-busy");
  }
  function decodeAtlasPlate(runtime) {
    if (!runtime.state.atlasPlate) {
      runtime.state.atlasPlate = new runtime.deps.Image();
      runtime.state.atlasPlate.src = runtime.deps.WORLD_MAP.atlas.src;
    }
    return runtime.state.atlasPlate.decode();
  }
  function turnIsVisible(runtime, turn) {
    return turn.owner === runtime.deps.game && overviewSelected(runtime) && turn.map.isConnected && turn.map.getClientRects().length > 0;
  }
  function beginAtlasTurn(runtime, map) {
    const turn = runtime.state.atlasTurn = { map, view: map.parentElement, owner: runtime.deps.game, layer: null, motions: [] };
    map.inert = true;
    map.setAttribute("aria-busy", "true");
    return turn;
  }
  function addAtlasLayer(runtime, turn) {
    const layer = runtime.deps.document.createElement("div");
    layer.className = "wm-map wm-atlas-arriving";
    layer.setAttribute("aria-hidden", "true");
    layer.style.backgroundImage = `url('${runtime.deps.WORLD_MAP.atlas.src}')`;
    turn.view.classList.add("is-atlas-turning");
    turn.view.append(layer);
    return layer;
  }
  function blendAtlasTurn(runtime, turn) {
    if (runtime.deps.uiDisplay.reducedEffects() || !turn.map.animate) return;
    const oldHeight = turn.view.offsetHeight;
    const layer = turn.layer = addAtlasLayer(runtime, turn);
    const timing = { duration: 760, fill: "both" };
    turn.motions.push(
      turn.map.animate([{ filter: "invert(0)", easing: "ease-in-out" }, { filter: "invert(1)", offset: 0.54 }, { filter: "invert(1)" }], timing),
      layer.animate([{ opacity: 0 }, { opacity: 0, offset: 0.24, easing: "ease-in-out" }, { opacity: 1 }], timing)
    );
    if (Math.abs(oldHeight - layer.offsetHeight) > 1) turn.motions.push(turn.view.animate([
      { height: `${oldHeight}px` },
      { height: `${oldHeight}px`, offset: 0.24, easing: "ease-in-out" },
      { height: `${layer.offsetHeight}px` }
    ], timing));
    return Promise.all(turn.motions.map((motion) => motion.finished));
  }
  function atlasTurnFailed(runtime, turn, error) {
    if (runtime.state.atlasTurn !== turn) return;
    runtime.state.atlasPlate = null;
    clearAtlasTurn(runtime);
    runtime.deps.console.warn("[atlas-map] Failed to prepare chart", error);
    if (!turnIsVisible(runtime, turn)) return;
    turn.map.querySelector(".wm-atlas-entrance")?.focus();
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)("아틀라스 지도를 불러오지 못했습니다. 다시 눌러 주세요."));
  }
  async function transitionAtlasMap(runtime, turn) {
    try {
      await decodeAtlasPlate(runtime);
      if (runtime.state.atlasTurn === turn && turnIsVisible(runtime, turn)) await blendAtlasTurn(runtime, turn);
    } catch (error) {
      atlasTurnFailed(runtime, turn, error);
      return;
    }
    if (runtime.state.atlasTurn !== turn) return;
    const visible = turnIsVisible(runtime, turn);
    clearAtlasTurn(runtime);
    if (visible) revealAtlasMap(runtime, true);
  }
  function showAtlasMap(runtime, on) {
    if (!on) {
      clearAtlasTurn(runtime);
      revealAtlasMap(runtime, false);
      return;
    }
    if (runtime.state.atlasTurn || !overviewSelected(runtime)) return;
    const map = runtime.deps.document.querySelector("#ui-exploration-atlas .wm-map:not(.wm-atlas-map)");
    if (map?.getClientRects().length) return transitionAtlasMap(runtime, beginAtlasTurn(runtime, map));
  }
  function enterAtlasRegion(runtime, id) {
    if (!available(runtime, "map-explore-worldtree") || !runtime.deps.ATLAS.regions.some((region) => region.id === id)) return;
    runtime.deps.atlasUi.selectRegion(id, true);
    enter(runtime, "map-explore-worldtree");
    runtime.deps.document.querySelector('#ui-atlas .atlas-region-tabs [aria-pressed="true"]')?.focus({ preventScroll: true });
  }
  function enterAtlasNode(runtime, id) {
    if (!available(runtime, "map-explore-worldtree") || !runtime.deps.atlas.nodes.some((node) => node.id === id)) return;
    enter(runtime, "map-explore-worldtree");
    runtime.deps.atlasUi.selectNode(id, true);
  }
  function enter(runtime, route) {
    if (!regionFor(runtime, route) && route !== "map-tab-pvp") return;
    if (!available(runtime, route)) return;
    clearAtlasTurn(runtime);
    if (route.startsWith("map-explore-")) {
      (0, runtime.deps.switchMapSubtab)("map-tab-zones");
      (0, runtime.deps.switchMapExploreSubtab)(route);
    } else (0, runtime.deps.switchMapSubtab)(route);
    syncLocation(runtime);
    scrollToTop(runtime);
  }
  function scrollToTop(runtime) {
    const panel = runtime.deps.document.getElementById("tab-map");
    (panel.querySelector(".ui-window-body") || panel).scrollTop = 0;
  }
  function hunt(runtime, index) {
    if (!runtime.deps.STORY_ACTS.some((act, id) => id === index && id <= runtime.deps.game.maxZoneId) || !available(runtime, "map-explore-hunting")) return;
    if (runtime.deps.game.currentZoneId === index && !runtime.deps.game.combatHalted) return (0, runtime.deps.switchTab)("tab-battle");
    if ((0, runtime.deps.getZoneTravelBlockReason)(index) || (0, runtime.deps.getHeldRunBlockReason)()) return;
    (0, runtime.deps.changeZone)(index);
    if (runtime.deps.game.currentZoneId === index) (0, runtime.deps.switchTab)("tab-battle");
  }
  function routeLabel(runtime, route) {
    if (route === "map-explore-worldtree") return (0, runtime.deps._t)("세계수 아틀라스");
    if (route === "map-explore-chaos") return (0, runtime.deps._t)("혼돈 심화");
    if (route === "map-explore-beehive") return (0, runtime.deps._t)("벌집");
    return runtime.deps.document.getElementById("btn-" + route).textContent.trim();
  }
  function regionProgress(runtime, region) {
    if (region.id === "tree") return (0, runtime.deps.getActZoneDisplayName)(Math.min(runtime.deps.STORY_ACTS.length - 1, runtime.deps.game.maxZoneId));
    if (runtime.state.LISTING_REGIONS.has(region.id)) return region.routes.filter(runtime.handlers.available).map(runtime.handlers.routeLabel).join(", ");
    if (region.id === "worldtree") return runtime.deps.atlasUi.progressLine();
    return routeSummary(runtime, region.routes[0]).status;
  }
  function floorProgress(runtime, cleared, current) {
    return (0, runtime.deps._t)("돌파 {n}층", { n: cleared }) + (current == null ? "" : ` / ${(0, runtime.deps._t)("현재 루프 {n}층", { n: current })}`);
  }
  function rewardNamesHtml(runtime, route) {
    const rewards = {
      "map-explore-root-boss": [[(0, runtime.deps._t)("고유 장비"), (0, runtime.deps._t)("고유 효과를 가진 장비입니다.")], [(0, runtime.deps._t)("군주의 핵"), (0, runtime.deps._t)(runtime.deps.ORB_DB.bossCore.desc), "bossCore"]],
      "map-explore-beehive": [[(0, runtime.deps._t)("고유 장비"), (0, runtime.deps._t)("고유 효과를 가진 장비입니다.")], [(0, runtime.deps._t)("마력 깃든 벌꿀"), (0, runtime.deps._t)(runtime.deps.ORB_DB.enchantedHoney.desc), "enchantedHoney"], [(0, runtime.deps._t)("독벌침"), (0, runtime.deps._t)(runtime.deps.ORB_DB.venomStinger.desc), "venomStinger"]],
      "map-explore-trials": [[(0, runtime.deps._t)("전직 포인트"), (0, runtime.deps._t)("전직 노드에 할당하는 포인트입니다.")], [(0, runtime.deps._t)("스킬룬"), (0, runtime.deps._t)("장착하여 스킬을 사용하는 룬입니다.")]],
      "map-explore-colony": [[(0, runtime.deps._t)("액막이 부적"), (0, runtime.deps._t)("군락지 액막이 슬롯에 장착하여 효과를 받습니다.")]]
    };
    const names = (rewards[route] || []).filter(([, , key]) => !key || runtime.deps.contentProgression.canDropCurrency(key)).map(([name, description]) => `<span class="atlas-reward-name" role="button" tabindex="0" data-info-tooltip-anchor="1" data-description="${(0, runtime.deps.escapeHTML)(description)}" onmouseenter="explorationAtlasUi.rewardTooltip(event)" onfocus="explorationAtlasUi.rewardTooltip(event)" onmouseleave="hideInfoTooltip()" onblur="hideInfoTooltip()" onclick="event.stopPropagation(); explorationAtlasUi.rewardTooltip(event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();explorationAtlasUi.rewardTooltip(event)}">${name}</span>`).join("");
    return names ? `<span class="atlas-reward-names">${names}</span>` : "";
  }
  function rewardTooltip(runtime, event) {
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    (0, runtime.deps.showInfoTooltipHtml)(bounds.left, bounds.bottom, `<b>${(0, runtime.deps.escapeHTML)(target.textContent)}</b><div class="tooltip-line">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(target.dataset.description))}</div>`, "#c9b17b");
  }
  function huntingActionsHtml(runtime, index, rewards) {
    const current = runtime.deps.game.currentZoneId === index && !runtime.deps.game.combatHalted;
    const blocked = !current && ((0, runtime.deps.getZoneTravelBlockReason)(index) || (0, runtime.deps.getHeldRunBlockReason)());
    return `${rewards.length ? `<button class="atlas-claim" onclick="openActReward(${rewards[0]})">${(0, runtime.deps._t)("받을 보상")} ${rewards.length}</button>` : ""}
            <button class="atlas-hunt-now" ${current ? "" : "data-exploration-departure"} onclick="explorationAtlasUi.hunt(${index})" ${blocked ? "disabled" : ""}>${current ? (0, runtime.deps._t)("전투로 돌아가기") : blocked ? (0, runtime.deps._t)("이동 대기") : (0, runtime.deps._t)("즉시 이동")}</button>
            <button class="atlas-hunt-select" onclick="explorationAtlasUi.enter('map-explore-hunting')">${(0, runtime.deps._t)("세부 지역")}</button>`;
  }
  function trackedRewardHtml(runtime, route) {
    const targets = runtime.deps.game.uniqueHuntTargets.slice(0, runtime.deps.uniqueHuntRuntime.limit).map((key) => runtime.deps.uniqueHuntRuntime.getEntry(key)).filter(Boolean);
    return targets.filter((entry) => {
      const source = runtime.deps.uniqueHuntUi.getSource(entry);
      return (source.exploreSubtab || source.mapSubtab) === route;
    }).map((entry) => `<span class="atlas-tracked-reward">${(0, runtime.deps._t)("추적 중")}, ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(entry.name))}</span>`).join("");
  }
  function routeSummary(runtime, route) {
    return runtime.state.ROUTE_SUMMARIES[route] ? runtime.state.ROUTE_SUMMARIES[route]() : { status: "" };
  }
  function meteorLine(runtime) {
    if (runtime.deps.game.meteorSite.skyRiftReady) return `${(0, runtime.deps._t)("하늘의 균열 충전 완료")}, ${(0, runtime.deps._t)((0, runtime.deps.getMeteorKind)().name)}`;
    return `${(0, runtime.deps._t)("하늘의 균열")} ${Math.min(100, Math.floor(runtime.deps.game.meteorSite.skyRiftGauge))}%`;
  }
  function chaosDepthLine(runtime) {
    const depth = runtime.deps.game.loopProgressCurrent.bestAbyssDepth;
    return depth > 0 ? (0, runtime.deps._t)("이번 루프 심화 {n}층", { n: depth }) : "";
  }
  function trialRouteSummary(runtime) {
    const pending = runtime.deps.document.querySelector("#ui-trial-list .trial-pending:not(.current)[data-trial-id]");
    const ready = !!pending && !(0, runtime.deps.getZoneTravelBlockReason)(pending.dataset.trialId) && !(0, runtime.deps.getHeldRunBlockReason)();
    return { attention: ready, status: ready ? (0, runtime.deps._t)("새 시련 도전 가능") : (0, runtime.deps._t)("완료한 시련 {n}개", { n: runtime.deps.game.completedTrials.length }) };
  }
  function hiveRouteSummary(runtime) {
    const step = runtime.deps.game.beehive.queenActive ? (0, runtime.deps._t)("여왕벌 전투") : (0, runtime.deps._t)("갈림길 {n}/10", { n: Math.min(10, runtime.deps.game.beehive.branchStep) });
    return { status: runtime.deps.game.beehive.inRun ? `${(0, runtime.deps._t)("원정 중")}, ${step}` : `${(0, runtime.deps._t)("벌집 열쇠")} ${(0, runtime.deps._t)("{n}개", { n: runtime.deps.game.currencies.hiveKey })}` };
  }
  function colonyRouteSummary(runtime) {
    if (runtime.deps.game.colony.inRun && runtime.deps.game.colony.lootPending) return { status: (0, runtime.deps.getZone)("colony_run").name };
    return { status: runtime.deps.game.colony.inRun ? `${(0, runtime.deps._t)("방어 중")}, ${(0, runtime.deps._t)("{n}웨이브", { n: runtime.deps.game.colony.wave })}` : (0, runtime.deps._t)("최고 도달 {wave}웨이브, 흔적 {n}개", { wave: runtime.deps.game.colony.highestWave, n: runtime.deps.game.currencies.colonyTrace }) };
  }
  function bossSummary(runtime) {
    const zones = runtime.deps.SEASON_BOSS_ZONES.filter((zone) => runtime.deps.game.season >= (zone.reqSeason || 2));
    const ready = zones.filter((zone) => bossEntry(runtime, zone).ready);
    const target = ready.find((zone) => !runtime.deps.game.clearedRootBosses.includes(zone.id)) || ready[0] || zones[0];
    return { target: target?.name || "", status: "" };
  }
  function bossEntry(runtime, zone) {
    const gate = (0, runtime.deps.getSeasonBossProgressGate)(zone, runtime.deps.game);
    const keyCount = zone.key ? Math.max(0, Math.floor(runtime.deps.game.currencies[zone.key] || 0)) : 0;
    const hasEntry = !!zone.milestonePinnacle || keyCount > 0;
    const current = runtime.deps.game.currentZoneId === zone.id && !runtime.deps.game.combatHalted;
    const travelBlocked = !!(0, runtime.deps.getZoneTravelBlockReason)(zone.id) || !!(0, runtime.deps.getHeldRunBlockReason)();
    return { gate, keyCount, hasEntry, current, travelBlocked, ready: current || gate.met && hasEntry && !travelBlocked };
  }
  function bossRewardLabel(runtime, zone) {
    if (zone.milestonePinnacle && runtime.deps.game.clearedRootBosses.includes(zone.id)) return (0, runtime.deps._t)("첫 격파 보상 수령 완료");
    const key = (0, runtime.deps.getCanonicalCurrencyKey)(zone.firstClearReward?.key || zone.reward);
    const equipment = key === "bossCore";
    if (!runtime.deps.contentProgression.canDropCurrency(key)) return equipment ? (0, runtime.deps._t)("고유 장비, 확률 획득") : "";
    const name = (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name);
    if (zone.firstClearReward) return `${(0, runtime.deps._t)("첫 격파")}, ${name} ${(0, runtime.deps._t)("{n}개", { n: zone.firstClearReward.amount })}`;
    return equipment ? `${(0, runtime.deps._t)("고유 장비")}, ${name}, ${(0, runtime.deps._t)("확률 획득")}` : name;
  }
  function render(runtime) {
    const host = runtime.deps.document.getElementById("ui-exploration-atlas");
    syncLocation(runtime);
    if (runtime.state.atlasTurn && turnIsVisible(runtime, runtime.state.atlasTurn)) return;
    clearAtlasTurn(runtime);
    if (!host || !overviewSelected(runtime)) return;
    const arena = available(runtime, "map-tab-pvp") ? `<button class="atlas-arena" onclick="explorationAtlasUi.enter('map-tab-pvp')">${(0, runtime.deps._t)("대전")}</button>` : "";
    const body = runtime.deps.worldMapUi.overviewHtml(reader(runtime));
    const key = JSON.stringify([body, arena]);
    if (runtime.state.signature === key && host.innerHTML) return;
    runtime.state.signature = key;
    updateOverview(runtime, host, body, arena);
  }
  function updateOverview(runtime, host, body, arena) {
    const left = host.querySelector(".wm-view")?.scrollLeft || 0;
    const focus = host.contains(runtime.deps.document.activeElement) ? runtime.deps.document.activeElement.getAttribute("onclick") : null;
    host.innerHTML = `<header class="atlas-heading"><h2>${(0, runtime.deps._t)("탐험")}</h2>${arena}</header>` + body;
    host.querySelector(".wm-view").scrollLeft = left;
    if (focus) [...host.querySelectorAll("button")].find((button) => button.getAttribute("onclick") === focus)?.focus({ preventScroll: true });
  }
  function markMapTone(runtime, panel, region, route) {
    panel.dataset.mapRegion = region ? region.id : "";
    panel.dataset.mapRoute = route || "";
  }
  function syncLocation(runtime) {
    const host = runtime.deps.document.getElementById("exploration-location");
    if (!host) return;
    const route = runtime.deps.game.mapSubtab === "map-tab-zones" ? runtime.deps.game.mapExploreSubtab : runtime.deps.game.mapSubtab;
    const overview = route === "map-explore-atlas";
    host.hidden = overview;
    const panel = runtime.deps.document.getElementById("tab-map");
    panel.classList.toggle("is-atlas-overview", overview);
    if (overview) {
      markMapTone(runtime, panel, null, null);
      return;
    }
    const region = regionFor(runtime, route);
    markMapTone(runtime, panel, region, route);
    (0, runtime.deps.writeHtmlIfChanged)(host, locationHtml(runtime, route));
    syncRegionBanner(runtime, region, route);
  }
  function pageChips(runtime, route) {
    const pages = runtime.state.ROUTE_PAGES[route] && runtime.state.ROUTE_PAGES[route]();
    if (pages) return pages.items.map((page2) => ({ ...page2, action: `explorationAtlasUi.page('${route}','${page2.id}')` }));
    const place = runtime.deps.WORLD_MAP.regions.find((region) => region.also && [region.route, ...region.also].includes(route));
    if (place) return [place.route, ...place.also].filter(runtime.handlers.available).map((entry) => ({ label: routeLabel(runtime, entry), on: entry === route, action: `explorationAtlasUi.enter('${entry}')` }));
    return [{ label: (0, runtime.deps._t)(runtime.state.PAGE_NAMES[route] || routeLabel(runtime, route)), on: true, action: `explorationAtlasUi.enter('${route}')` }];
  }
  function page(runtime, route, id) {
    const pages = runtime.state.ROUTE_PAGES[route] && runtime.state.ROUTE_PAGES[route]();
    if (!pages || !pages.items.some((entry) => entry.id === id)) return;
    const keyboard = !!runtime.deps.document.activeElement?.closest?.("#exploration-location");
    pages.select(id);
    syncLocation(runtime);
    if (keyboard) runtime.deps.document.querySelector('#exploration-location .exploration-routes [aria-pressed="true"]')?.focus();
  }
  function openEntryPage(runtime, route) {
    const entry = runtime.deps.EXPLORATION_REGIONS.guides[route]?.page;
    if (entry) page(runtime, route, entry);
  }
  function locationHtml(runtime, route) {
    const places = runtime.deps.worldMapUi.placeTabsHtml(reader(runtime), route);
    const others = runtime.deps.worldMapUi.offMapRoutes().map((entry) => `<button class="exploration-place-tab is-plain" aria-pressed="${entry === route}" onclick="explorationAtlasUi.enter('${entry}')"><span>${(0, runtime.deps.escapeHTML)(routeLabel(runtime, entry))}</span></button>`).join("");
    const chips = pageChips(runtime, route).map((chip) => `<button aria-pressed="${!!chip.on}" onclick="${chip.action}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(chip.label))}${chip.badge ? `<i>${(0, runtime.deps.escapeHTML)(chip.badge)}</i>` : ""}</button>`).join("");
    const atlasMap = route === "map-explore-worldtree" ? `<button class="exploration-home" onclick="explorationAtlasUi.open(true)">${(0, runtime.deps._t)("아틀라스 지도")}</button>` : "";
    return `<div class="exploration-regions"><button class="exploration-home" onclick="explorationAtlasUi.open()">${(0, runtime.deps._t)("세계 지도")}</button>${atlasMap}${places}${others}</div><div class="exploration-routes" role="group" aria-label="${(0, runtime.deps.escapeHTML)(routeLabel(runtime, route))}">${chips}</div>`;
  }
  function bannerLine(runtime, region, route) {
    const status = route && routeSummary(runtime, route).status;
    if (status) return status;
    const goal = runtime.deps.EXPLORATION_REGIONS.guides[route]?.goal;
    return goal ? (0, runtime.deps._t)(goal) : regionProgress(runtime, region);
  }
  function syncRegionBanner(runtime, region, route) {
    const banner = runtime.deps.document.getElementById("exploration-region-banner");
    banner.hidden = !region;
    if (banner.hidden) return;
    const hunting = route === "map-explore-hunting";
    const progress = hunting ? `<div class="atlas-hunt-destination">${(0, runtime.deps.buildMapRouteSummaryHtml)((0, runtime.deps.getZone)(runtime.deps.game.currentZoneId), (0, runtime.deps.getZone)(Math.min(runtime.deps.STORY_ACTS.length - 1, runtime.deps.game.maxZoneId)))}</div>` : `<p>${(0, runtime.deps.escapeHTML)(bannerLine(runtime, region, route))}</p>`;
    const html = `<img class="atlas-landscape" src="${region.landscape}" alt="" decoding="async"><div>
            <h2>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(!route ? region.name : hunting ? "나무" : routeLabel(runtime, route)))}</h2>${progress}</div>`;
    if ((0, runtime.deps.writeHtmlIfChanged)(banner, html)) banner.className = "atlas-theme-" + region.id;
  }
  function overviewSelected(runtime) {
    return runtime.deps.game.mapSubtab === "map-tab-zones" && runtime.deps.game.mapExploreSubtab === "map-explore-atlas";
  }
  function regionFor(runtime, route) {
    return runtime.deps.EXPLORATION_REGIONS.regions.find((region) => region.routes.includes(route));
  }
  function bosses(runtime) {
    return runtime.deps.SEASON_BOSS_ZONES.filter((zone) => (runtime.deps.game.season || 1) >= (zone.reqSeason || 2));
  }
  function actActionsHtml(runtime, index) {
    return huntingActionsHtml(runtime, index, (0, runtime.deps.getAvailableActRewardZoneIds)());
  }
  function reader(runtime) {
    return { available: runtime.handlers.available, routeLabel: runtime.handlers.routeLabel, routeSummary: runtime.handlers.routeSummary, actActionsHtml: runtime.handlers.actActionsHtml, trackedRewardHtml: runtime.handlers.trackedRewardHtml, rewardNamesHtml: runtime.handlers.rewardNamesHtml, actRewardZoneIds: runtime.deps.getAvailableActRewardZoneIds };
  }

  // modules/ui/exploration-atlas-view.mjs
  function createExplorationAtlasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { available, routeLabel, routeSummary, actActionsHtml, trackedRewardHtml, rewardNamesHtml, open, openAct, enter, discovered, bosses, trials, showAtlasMap, enterAtlasRegion, enterAtlasNode, page, openEntryPage, hunt, render, syncLocation, bossRewardLabel, bossEntry, rewardTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = { open: runtime.handlers.open, openAct: runtime.handlers.openAct, enter: runtime.handlers.enter, available: runtime.handlers.available, discovered: runtime.handlers.discovered, bosses: runtime.handlers.bosses, trials: runtime.handlers.trials, routeLabel: runtime.handlers.routeLabel, showAtlasMap: runtime.handlers.showAtlasMap, enterAtlasRegion: runtime.handlers.enterAtlasRegion, enterAtlasNode: runtime.handlers.enterAtlasNode, page: runtime.handlers.page, openEntryPage: runtime.handlers.openEntryPage, hunt: runtime.handlers.hunt, render: runtime.handlers.render, syncLocation: runtime.handlers.syncLocation, bossRewardLabel: runtime.handlers.bossRewardLabel, bossEntry: runtime.handlers.bossEntry, rewardTooltip: runtime.handlers.rewardTooltip };
    runtime.api.dispose = () => disposeExplorationAtlasView(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.signature = "";
    runtime.state.atlasTurn = null;
    runtime.state.atlasPlate = null;
    runtime.state.discoveredBy = Object.freeze({
      "map-explore-chaos": () => Math.min(runtime.deps.game.maxZoneId, (0, runtime.deps.getVisibleHuntingMapCapZoneId)()) >= runtime.deps.ABYSS_START_ZONE_ID || (0, runtime.deps.getDeepChaosEntryState)().open,
      "map-explore-root-boss": () => bosses(runtime).length > 0,
      "map-explore-beehive": () => runtime.deps.game.season >= 8,
      "map-explore-voidrift": () => runtime.deps.game.season >= 9,
      "map-explore-colony": () => runtime.deps.game.season >= 15,
      "map-explore-beyond": () => !!runtime.deps.game.beyondBoundary?.unlocked,
      "map-explore-timerift": () => runtime.deps.game.season >= runtime.deps.TIME_RIFT_UNLOCK_LOOP,
      "map-explore-labyrinth": () => runtime.deps.game.season >= 3,
      "map-explore-meteor": () => !!runtime.deps.game.meteorSite?.unlocked,
      "map-explore-trials": () => trials(runtime).length > 0
    });
    runtime.state.ROUTE_SUMMARIES = {
      "map-explore-root-boss": () => bossSummary(runtime),
      "map-explore-trials": () => trialRouteSummary(runtime),
      "map-explore-beehive": () => hiveRouteSummary(runtime),
      "map-explore-colony": () => colonyRouteSummary(runtime),
      "map-explore-labyrinth": () => ({ status: (0, runtime.deps._t)("최고 입장 {n}층", { n: runtime.deps.game.labyrinthUnlockedMaxFloor }) }),
      "map-tab-chaos-realm": () => ({ status: (0, runtime.deps._t)("최고 입장 {n}층", { n: runtime.deps.game.chaosRealm.highestFloor }) }),
      "map-explore-chaos": () => ({ status: chaosDepthLine(runtime) }),
      "map-explore-meteor": () => ({ status: meteorLine(runtime) }),
      "map-tab-underworld": () => ({ status: floorProgress(runtime, Math.max(0, runtime.deps.game.underworldProgress.highestFloor - 1), runtime.deps.game.loopProgressCurrent.bestUnderworldFloor) }),
      "map-tab-sky": () => ({ status: floorProgress(runtime, (0, runtime.deps.getClearedSkyTowerFloor)(runtime.deps.game), runtime.deps.game.loopProgressCurrent.bestSkyFloor) }),
      "map-tab-ocean": () => ({ status: (0, runtime.deps._t)("현재 {depth}m, 거점 {checkpoint}m", { depth: Math.floor(runtime.deps.game.ocean.depthM), checkpoint: Math.floor(runtime.deps.game.ocean.checkpointM) }) }),
      "map-tab-cosmos": () => ({ status: `${(0, runtime.deps._t)("보스 격파 기록")} ${(runtime.deps.game.cosmosAtlas?.bossClears || []).length}` })
    };
    runtime.state.ROUTE_PAGES = {
      "map-explore-worldtree": () => runtime.deps.atlasUi.pages(),
      "map-tab-cosmos": () => runtime.deps.cosmosRouteUi.pages(),
      "map-tab-underworld": () => runtime.deps.underworldRuneUi.pages()
    };
    runtime.state.PAGE_NAMES = { "map-explore-hunting": "세부 지역" };
    runtime.state.LISTING_REGIONS = /* @__PURE__ */ new Set(["trail", "roots"]);
  }
  function disposeExplorationAtlasView(runtime) {
    clearAtlasTurn(runtime);
    runtime.state.atlasPlate = null;
    runtime.state.signature = "";
  }

  // modules/exploration-atlas-ui-classic.mjs
  var explorationAtlasUi = createExplorationAtlasView({
    get contentProgression() {
      return contentProgression;
    },
    get TRIAL_ZONES() {
      return TRIAL_ZONES;
    },
    get canSeeTalentBloomTrial() {
      return canSeeTalentBloomTrial;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get worldMapUi() {
      return worldMapUi;
    },
    get switchTab() {
      return switchTab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get Image() {
      return Image;
    },
    get WORLD_MAP() {
      return WORLD_MAP;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get console() {
      return console;
    },
    get showGameToast() {
      return showGameToast;
    },
    get _t() {
      return _t;
    },
    get ATLAS() {
      return ATLAS;
    },
    get atlasUi() {
      return atlasUi;
    },
    get atlas() {
      return atlas;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get getHeldRunBlockReason() {
      return getHeldRunBlockReason;
    },
    get changeZone() {
      return changeZone;
    },
    get getActZoneDisplayName() {
      return getActZoneDisplayName;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get uniqueHuntRuntime() {
      return uniqueHuntRuntime;
    },
    get uniqueHuntUi() {
      return uniqueHuntUi;
    },
    get getMeteorKind() {
      return getMeteorKind;
    },
    get getZone() {
      return getZone;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get getSeasonBossProgressGate() {
      return getSeasonBossProgressGate;
    },
    get getCanonicalCurrencyKey() {
      return getCanonicalCurrencyKey;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get buildMapRouteSummaryHtml() {
      return buildMapRouteSummaryHtml;
    },
    get getAvailableActRewardZoneIds() {
      return getAvailableActRewardZoneIds;
    },
    get getVisibleHuntingMapCapZoneId() {
      return getVisibleHuntingMapCapZoneId;
    },
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get getDeepChaosEntryState() {
      return getDeepChaosEntryState;
    },
    get TIME_RIFT_UNLOCK_LOOP() {
      return TIME_RIFT_UNLOCK_LOOP;
    },
    get getClearedSkyTowerFloor() {
      return getClearedSkyTowerFloor;
    },
    get cosmosRouteUi() {
      return cosmosRouteUi;
    },
    get underworldRuneUi() {
      return underworldRuneUi;
    }
  });
  safeExposeGlobals({ explorationAtlasUi });
})();
