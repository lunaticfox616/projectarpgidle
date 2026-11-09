// Navigation only: existing content entry handlers retain costs, gates and combat rules.
const explorationAtlasUi = (() => {
    let signature = '', atlasTurn = null, atlasPlate = null;
    const overviewSelected = () => game.mapSubtab === 'map-tab-zones' && game.mapExploreSubtab === 'map-explore-atlas';
    const regionFor = route => EXPLORATION_REGIONS.regions.find(region => region.routes.includes(route));
    function available(route) {
        const button = document.getElementById('btn-' + route);
        return !!button && !button.hidden && button.style.display !== 'none' && contentProgression.canOpen(route);
    }
    /** 전체 탐험은 세계 지도(js/world-map-ui.js)다. 권역을 고르는 중간 화면은 없다(2026-11-08: 지도의 자리가 그 몫이다). */
    function open(atlasMap = false) {
        clearAtlasTurn();
        worldMapUi.showAtlas(atlasMap);
        switchTab('tab-map', { keepWindowOpen: true });
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-atlas');
        render();
        scrollToTop();
        if (atlasMap) focusAtlasControl(true);
    }
    /** The world map with a story act picked: its side panel holds the act's reward, travel and 세부 지역. Goals open this, not the act list
     * (2026-11-09 사용자: 지도 안내가 구버전 맵으로 이동시킴). */
    function openAct(zoneId) {
        open();
        worldMapUi.pickAct(zoneId);
    }
    function revealAtlasMap(on) {
        worldMapUi.showAtlas(on);
        render();
        focusAtlasControl(on);
    }
    function focusAtlasControl(on) {
        const selector = on ? '.wm-atlas-back' : '.wm-atlas-entrance';
        const control = document.querySelector('#ui-exploration-atlas ' + selector);
        if (!on) control?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        control?.focus({ preventScroll: true });
    }
    function clearAtlasTurn() {
        const turn = atlasTurn;
        if (!turn) return;
        atlasTurn = null;
        turn.motions.forEach(motion => motion.cancel());
        turn.layer?.remove();
        turn.view.classList.remove('is-atlas-turning');
        turn.map.inert = false;
        turn.map.removeAttribute('aria-busy');
    }
    function decodeAtlasPlate() {
        if (!atlasPlate) {
            atlasPlate = new Image();
            atlasPlate.src = WORLD_MAP.atlas.src;
        }
        return atlasPlate.decode();
    }
    function turnIsVisible(turn) {
        return turn.owner === game && overviewSelected() && turn.map.isConnected && turn.map.getClientRects().length > 0;
    }
    function beginAtlasTurn(map) {
        const turn = atlasTurn = { map, view: map.parentElement, owner: game, layer: null, motions: [] };
        map.inert = true;
        map.setAttribute('aria-busy', 'true');
        return turn;
    }
    function addAtlasLayer(turn) {
        const layer = document.createElement('div');
        layer.className = 'wm-map wm-atlas-arriving';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.backgroundImage = `url('${WORLD_MAP.atlas.src}')`;
        turn.view.classList.add('is-atlas-turning');
        turn.view.append(layer);
        return layer;
    }
    /** Invert the live chart while the decoded art covers it in place. No pause or empty frame. */
    function blendAtlasTurn(turn) {
        if (uiDisplay.reducedEffects() || !turn.map.animate) return;
        const oldHeight = turn.view.offsetHeight;
        const layer = turn.layer = addAtlasLayer(turn);
        const timing = { duration: 760, fill: 'both' };
        turn.motions.push(
            turn.map.animate([{ filter: 'invert(0)', easing: 'ease-in-out' }, { filter: 'invert(1)', offset: .54 }, { filter: 'invert(1)' }], timing),
            layer.animate([{ opacity: 0 }, { opacity: 0, offset: .24, easing: 'ease-in-out' }, { opacity: 1 }], timing)
        );
        if (Math.abs(oldHeight - layer.offsetHeight) > 1) turn.motions.push(turn.view.animate([
            { height: `${oldHeight}px` }, { height: `${oldHeight}px`, offset: .24, easing: 'ease-in-out' }, { height: `${layer.offsetHeight}px` }
        ], timing));
        return Promise.all(turn.motions.map(motion => motion.finished));
    }
    function atlasTurnFailed(turn, error) {
        if (atlasTurn !== turn) return; // Navigation cancelled the animation intentionally.
        atlasPlate = null;
        clearAtlasTurn();
        console.warn('[atlas-map] Failed to prepare chart', error);
        if (!turnIsVisible(turn)) return;
        turn.map.querySelector('.wm-atlas-entrance')?.focus();
        showGameToast(_t('아틀라스 지도를 불러오지 못했습니다. 다시 눌러 주세요.'));
    }
    /** Decode first so the outgoing map remains visible until the new picture can blend over it. */
    async function transitionAtlasMap(turn) {
        try {
            await decodeAtlasPlate();
            if (atlasTurn === turn && turnIsVisible(turn)) await blendAtlasTurn(turn);
        } catch (error) {
            atlasTurnFailed(turn, error);
            return;
        }
        if (atlasTurn !== turn) return;
        const visible = turnIsVisible(turn);
        clearAtlasTurn();
        if (visible) revealAtlasMap(true);
    }
    function showAtlasMap(on) {
        if (!on) { clearAtlasTurn(); revealAtlasMap(false); return; }
        if (atlasTurn || !overviewSelected()) return;
        const map = document.querySelector('#ui-exploration-atlas .wm-map:not(.wm-atlas-map)');
        if (map?.getClientRects().length) return transitionAtlasMap(beginAtlasTurn(map));
    }
    function enterAtlasRegion(id) {
        if (!available('map-explore-worldtree') || !ATLAS.regions.some(region => region.id === id)) return;
        atlasUi.selectRegion(id, true);
        enter('map-explore-worldtree');
        document.querySelector('#ui-atlas .atlas-region-tabs [aria-pressed="true"]')?.focus({ preventScroll: true });
    }
    function enterAtlasNode(id) {
        if (!available('map-explore-worldtree') || !atlas.nodes.some(node => node.id === id)) return;
        enter('map-explore-worldtree');
        atlasUi.selectNode(id, true);
    }
    function enter(route) {
        if (!regionFor(route) && route !== 'map-tab-pvp') return;
        if (!available(route)) return;
        clearAtlasTurn();
        if (route.startsWith('map-explore-')) {
            switchMapSubtab('map-tab-zones');
            switchMapExploreSubtab(route);
        } else switchMapSubtab(route);
        syncLocation();
        scrollToTop();
    }
    function scrollToTop() {
        const panel = document.getElementById('tab-map');
        (panel.querySelector('.ui-window-body') || panel).scrollTop = 0;
    }
    function hunt(index) {
        if (!STORY_ACTS.some((act,id) => id === index && id <= game.maxZoneId) || !available('map-explore-hunting')) return;
        if (game.currentZoneId === index && !game.combatHalted) return switchTab('tab-battle');
        if (getZoneTravelBlockReason(index) || getHeldRunBlockReason()) return;
        changeZone(index);
        if (game.currentZoneId === index) switchTab('tab-battle');
    }
    function routeLabel(route) {
        if (route === 'map-explore-worldtree') return _t('세계수 아틀라스');
        if (route === 'map-explore-chaos') return _t('혼돈 심화');
        if (route === 'map-explore-beehive') return _t('벌집');
        return document.getElementById('btn-' + route).textContent.trim();
    }
    /** 권역의 진행 한 줄(권역 띠 bannerLine). 길이 하나인 권역(지하계, 창공, 심해, 우주계)은 그 길의 요약과 같다. */
    function regionProgress(region) {
        if (region.id === 'tree') return getActZoneDisplayName(Math.min(STORY_ACTS.length-1,game.maxZoneId));
        if (LISTING_REGIONS.has(region.id)) return region.routes.filter(available).map(routeLabel).join(', ');
        if (region.id === 'worldtree') return atlasUi.progressLine();
        return routeSummary(region.routes[0]).status;
    }
    /** cleared: the highest floor beaten (the entry cards' 도달 최고 is the floor reached, one higher). */
    function floorProgress(cleared,current) {
        return _t('돌파 {n}층', { n: cleared }) + (current == null ? '' : ` / ${_t('현재 루프 {n}층', { n: current })}`);
    }
    /** 보상 이름(세계 지도 설명 칸): 올리면 설명 툴팁. */
    function rewardNamesHtml(route) {
        const rewards = {
            'map-explore-root-boss': [[_t('고유 장비'),_t('고유 효과를 가진 장비입니다.')],[_t('군주의 핵'),_t(ORB_DB.bossCore.desc),'bossCore']],
            'map-explore-beehive': [[_t('고유 장비'),_t('고유 효과를 가진 장비입니다.')],[_t('마력 깃든 벌꿀'),_t(ORB_DB.enchantedHoney.desc),'enchantedHoney'],[_t('독벌침'),_t(ORB_DB.venomStinger.desc),'venomStinger']],
            'map-explore-trials': [[_t('전직 포인트'),_t('전직 노드에 할당하는 포인트입니다.')],[_t('스킬룬'),_t('장착하여 스킬을 사용하는 룬입니다.')]],
            'map-explore-colony': [[_t('액막이 부적'),_t('군락지 액막이 슬롯에 장착하여 효과를 받습니다.')]]
        };
        const names = (rewards[route] || []).filter(([, ,key]) => !key || contentProgression.canDropCurrency(key)).map(([name,description]) =>
            `<span class="atlas-reward-name" role="button" tabindex="0" data-info-tooltip-anchor="1" data-description="${escapeHTML(description)}" onmouseenter="explorationAtlasUi.rewardTooltip(event)" onfocus="explorationAtlasUi.rewardTooltip(event)" onmouseleave="hideInfoTooltip()" onblur="hideInfoTooltip()" onclick="event.stopPropagation(); explorationAtlasUi.rewardTooltip(event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();explorationAtlasUi.rewardTooltip(event)}">${name}</span>`).join('');
        return names ? `<span class="atlas-reward-names">${names}</span>` : '';
    }
    function rewardTooltip(event) {
        const target = event.currentTarget;
        const bounds = target.getBoundingClientRect();
        showInfoTooltipHtml(bounds.left,bounds.bottom,`<b>${escapeHTML(target.textContent)}</b><div class="tooltip-line">${escapeHTML(_t(target.dataset.description))}</div>`,'#c9b17b');
    }
    /** 세계 지도 설명 칸의 액트 단추 묶음(js/world-map-ui.js): 받을 보상, 즉시 이동 또는 전투로 돌아가기, 세부 지역. */
    const actActionsHtml = index => huntingActionsHtml(index,getAvailableActRewardZoneIds());
    function huntingActionsHtml(index,rewards) {
        const current = game.currentZoneId === index && !game.combatHalted;
        const blocked = !current && (getZoneTravelBlockReason(index) || getHeldRunBlockReason());
        return `${rewards.length ? `<button class="atlas-claim" onclick="openActReward(${rewards[0]})">${_t('받을 보상')} ${rewards.length}</button>` : ''}
            <button class="atlas-hunt-now" ${current ? '' : 'data-exploration-departure'} onclick="explorationAtlasUi.hunt(${index})" ${blocked ? 'disabled' : ''}>${current ? _t('전투로 돌아가기') : blocked ? _t('이동 대기') : _t('즉시 이동')}</button>
            <button class="atlas-hunt-select" onclick="explorationAtlasUi.enter('map-explore-hunting')">${_t('세부 지역')}</button>`;
    }
    function trackedRewardHtml(route) {
        const targets = game.uniqueHuntTargets.slice(0,uniqueHuntRuntime.limit).map(key => uniqueHuntRuntime.getEntry(key)).filter(Boolean);
        return targets.filter(entry => {
            const source = uniqueHuntUi.getSource(entry);
            return (source.exploreSubtab || source.mapSubtab) === route;
        }).map(entry => `<span class="atlas-tracked-reward">${_t('추적 중')}, ${escapeHTML(_t(entry.name))}</span>`).join('');
    }
    // Read progression only; availability and payment remain in the existing entry handlers.
    const ROUTE_SUMMARIES = {
        'map-explore-root-boss': () => bossSummary(),
        'map-explore-trials': () => trialRouteSummary(),
        'map-explore-beehive': () => hiveRouteSummary(),
        'map-explore-colony': () => colonyRouteSummary(),
        'map-explore-labyrinth': () => ({status:_t('최고 입장 {n}층', { n: game.labyrinthUnlockedMaxFloor })}),
        'map-tab-chaos-realm': () => ({status:_t('최고 입장 {n}층', { n: game.chaosRealm.highestFloor })}),
        'map-explore-chaos': () => ({status:chaosDepthLine()}),
        'map-explore-meteor': () => ({status:meteorLine()}),
        'map-tab-underworld': () => ({status:floorProgress(Math.max(0,game.underworldProgress.highestFloor-1),game.loopProgressCurrent.bestUnderworldFloor)}),
        'map-tab-sky': () => ({status:floorProgress(getClearedSkyTowerFloor(game),game.loopProgressCurrent.bestSkyFloor)}),
        'map-tab-ocean': () => ({status:_t('현재 {depth}m, 거점 {checkpoint}m', { depth: Math.floor(game.ocean.depthM), checkpoint: Math.floor(game.ocean.checkpointM) })}),
        'map-tab-cosmos': () => ({status:`${_t('보스 격파 기록')} ${(game.cosmosAtlas?.bossClears || []).length}`})
    };
    function routeSummary(route) {
        return ROUTE_SUMMARIES[route] ? ROUTE_SUMMARIES[route]() : {status:''};
    }
    function meteorLine() {
        if (game.meteorSite.skyRiftReady) return `${_t('하늘의 균열 충전 완료')}, ${_t(getMeteorKind().name)}`;
        return `${_t('하늘의 균열')} ${Math.min(100,Math.floor(game.meteorSite.skyRiftGauge))}%`;
    }
    /** This loop's deep chaos floor; nothing before the first one (every loop starts at 0). */
    function chaosDepthLine() {
        const depth = game.loopProgressCurrent.bestAbyssDepth;
        return depth > 0 ? _t('이번 루프 심화 {n}층', { n: depth }) : '';
    }
    function trialRouteSummary() {
        // The existing trial list owns unlock/completion eligibility and renders before this chooser.
        const pending = document.querySelector('#ui-trial-list .trial-pending:not(.current)[data-trial-id]');
        const ready = !!pending && !getZoneTravelBlockReason(pending.dataset.trialId)
            && !getHeldRunBlockReason();
        return {attention:ready,status:ready ? _t('새 시련 도전 가능') : _t('완료한 시련 {n}개', { n: game.completedTrials.length })};
    }
    function hiveRouteSummary() {
        const step = game.beehive.queenActive ? _t('여왕벌 전투') : _t('갈림길 {n}/10', { n: Math.min(10,game.beehive.branchStep) });
        return {status:game.beehive.inRun ? `${_t('원정 중')}, ${step}` : `${_t('벌집 열쇠')} ${_t('{n}개', { n: game.currencies.hiveKey })}`};
    }
    function colonyRouteSummary() {
        if (game.colony.inRun && game.colony.lootPending) return {status:getZone('colony_run').name};
        return {status:game.colony.inRun ? `${_t('방어 중')}, ${_t('{n}웨이브', { n: game.colony.wave })}` : _t('최고 도달 {wave}웨이브, 흔적 {n}개', { wave: game.colony.highestWave, n: game.currencies.colonyTrace })};
    }
    function bossSummary() {
        const zones = SEASON_BOSS_ZONES.filter(zone => game.season >= (zone.reqSeason || 2));
        const ready = zones.filter(zone => bossEntry(zone).ready);
        const target = ready.find(zone => !game.clearedRootBosses.includes(zone.id)) || ready[0] || zones[0];
        return {target:target?.name || '',status:''};
    }
    // Read-only projection of existing entry rules; changeZone remains the payment boundary.
    function bossEntry(zone) {
        const gate = getSeasonBossProgressGate(zone,game);
        const keyCount = zone.key ? Math.max(0,Math.floor(game.currencies[zone.key] || 0)) : 0;
        const hasEntry = !!zone.milestonePinnacle || keyCount > 0;
        const current = game.currentZoneId === zone.id && !game.combatHalted;
        const travelBlocked = !!getZoneTravelBlockReason(zone.id) || !!getHeldRunBlockReason();
        return {gate,keyCount,hasEntry,current,travelBlocked,ready:current || (gate.met && hasEntry && !travelBlocked)};
    }
    function bossRewardLabel(zone) {
        if (zone.milestonePinnacle && game.clearedRootBosses.includes(zone.id)) return _t('첫 격파 보상 수령 완료');
        const key = getCanonicalCurrencyKey(zone.firstClearReward?.key || zone.reward);
        const equipment = key === 'bossCore';
        if (!contentProgression.canDropCurrency(key)) return equipment ? _t('고유 장비, 확률 획득') : '';
        const name = _t(ORB_DB[key].name);
        if (zone.firstClearReward) return `${_t('첫 격파')}, ${name} ${_t('{n}개', { n: zone.firstClearReward.amount })}`;
        return equipment ? `${_t('고유 장비')}, ${name}, ${_t('확률 획득')}` : name;
    }
    /** 세계 지도(js/world-map-ui.js)가 읽는 함수 묶음. 지도는 여기 이름을 onclick 글로만 적어 되부른다. */
    const reader = () => ({available,routeLabel,routeSummary,actActionsHtml,trackedRewardHtml,rewardNamesHtml,actRewardZoneIds:getAvailableActRewardZoneIds});
    /** 전체 탐험 화면은 세계 지도다(2026-11-08). */
    function render() {
        const host = document.getElementById('ui-exploration-atlas');
        syncLocation();
        // Runtime refreshes may change the map markup while the current chart is being turned.
        if (atlasTurn && turnIsVisible(atlasTurn)) return;
        clearAtlasTurn();
        if (!host || !overviewSelected()) return;
        const arena = available('map-tab-pvp') ? `<button class="atlas-arena" onclick="explorationAtlasUi.enter('map-tab-pvp')">${_t('대전')}</button>` : '';
        const body = worldMapUi.overviewHtml(reader());
        const key = JSON.stringify([body,arena]);
        if (signature === key && host.innerHTML) return;
        signature = key;
        updateOverview(host,body,arena);
    }
    function updateOverview(host,body,arena) {
        const left = host.querySelector('.wm-view')?.scrollLeft || 0;
        const focus = host.contains(document.activeElement) ? document.activeElement.getAttribute('onclick') : null;
        host.innerHTML = `<header class="atlas-heading"><h2>${_t('탐험')}</h2>${arena}</header>` + body;
        host.querySelector('.wm-view').scrollLeft = left;
        if (focus) [...host.querySelectorAll('button')].find(button => button.getAttribute('onclick') === focus)?.focus({preventScroll:true});
    }
    /** 세부 화면 위 길잡이(2026-11-08, 세계 지도에 맞춘 탭. 2026-10-25의 권역 탭 두 줄과 권역 고르기 화면을 대신한다): 첫 줄은 세계 지도로
     * 돌아가는 단추, 지도의 열린 자리들(지도와 같은 표식 탭, 액트는 '나무' 하나, 눌린 자리만 이름이 펼쳐진다), 지도에 없는 곳의 이름 탭.
     * 둘째 줄은 지금 자리의 쪽들(아틀라스 보기, 우주계 화면, 지하계 쪽)이고 쪽이 없는 자리는 제 이름 하나다. 드롭다운은 좁은 휴대폰 화면에만 남는다. */
    /** 세부 화면의 색(css/map-tones.css): 그 화면, 없으면 그 권역의 색. */
    function markMapTone(panel,region,route) {
        panel.dataset.mapRegion = region ? region.id : '';
        panel.dataset.mapRoute = route || '';
    }
    function syncLocation() {
        const host = document.getElementById('exploration-location');
        if (!host) return;
        const route = game.mapSubtab === 'map-tab-zones' ? game.mapExploreSubtab : game.mapSubtab;
        const overview = route === 'map-explore-atlas';
        host.hidden = overview;
        const panel = document.getElementById('tab-map');
        panel.classList.toggle('is-atlas-overview',overview);
        if (overview) { markMapTone(panel,null,null); return; }
        const region = regionFor(route);
        markMapTone(panel,region,route);
        writeHtmlIfChanged(host, locationHtml(route));
        syncRegionBanner(region,route);
    }
    const ROUTE_PAGES = {
        'map-explore-worldtree': () => atlasUi.pages(),
        'map-tab-cosmos': () => cosmosRouteUi.pages(),
        'map-tab-underworld': () => underworldRuneUi.pages()
    };
    const PAGE_NAMES = { 'map-explore-hunting': '세부 지역' };   // 보여 줄 때 _t
    function pageChips(route) {
        const pages = ROUTE_PAGES[route] && ROUTE_PAGES[route]();
        if (pages) return pages.items.map(page => ({...page,action:`explorationAtlasUi.page('${route}','${page.id}')`}));
        return [{label:_t(PAGE_NAMES[route] || routeLabel(route)),on:true,action:`explorationAtlasUi.enter('${route}')`}];
    }
    /** A second-row page of a one-route region: the page switches, the row follows at once and a keyboard press keeps its focus. */
    function page(route,id) {
        const pages = ROUTE_PAGES[route] && ROUTE_PAGES[route]();
        if (!pages || !pages.items.some(entry => entry.id === id)) return;
        const keyboard = !!document.activeElement?.closest?.('#exploration-location');
        pages.select(id);
        syncLocation();
        if (keyboard) document.querySelector('#exploration-location .exploration-routes [aria-pressed="true"]')?.focus();
    }
    function locationHtml(route) {
        const places = worldMapUi.placeTabsHtml(reader(),route);
        const others = worldMapUi.offMapRoutes().map(entry => `<button class="exploration-place-tab is-plain" aria-pressed="${entry === route}" onclick="explorationAtlasUi.enter('${entry}')"><span>${escapeHTML(routeLabel(entry))}</span></button>`).join('');
        const chips = pageChips(route).map(chip => `<button aria-pressed="${!!chip.on}" onclick="${chip.action}">${escapeHTML(_t(chip.label))}`
            + `${chip.badge ? `<i>${escapeHTML(chip.badge)}</i>` : ''}</button>`).join('');
        const atlasMap = route === 'map-explore-worldtree' ? `<button class="exploration-home" onclick="explorationAtlasUi.open(true)">${_t('아틀라스 지도')}</button>` : '';
        return `<div class="exploration-regions"><button class="exploration-home" onclick="explorationAtlasUi.open()">${_t('세계 지도')}</button>${atlasMap}${places}${others}</div>`
            + `<div class="exploration-routes" role="group" aria-label="${escapeHTML(routeLabel(route))}">${chips}</div>`;
    }
    /** Regions whose progress line is the list of their places (regionProgress). */
    const LISTING_REGIONS = new Set(['trail', 'roots']);
    /** The banner's line: the open place's progress first (the labyrinth page does not carry an unopened 혼돈계 0층); a place with
     * none in a listing region says its kind; else the region's progress. */
    function bannerLine(region, route) {
        const status = route && routeSummary(route).status;
        if (status) return status;
        const kind = route && LISTING_REGIONS.has(region.id) && EXPLORATION_REGIONS.activities[route]?.kind;
        return kind || regionProgress(region);
    }
    /** route: the open place, or null on the region's own page (its name and progress). */
    function syncRegionBanner(region,route) {
        const banner = document.getElementById('exploration-region-banner');
        banner.hidden = !region;
        if (banner.hidden) return;
        const hunting = route === 'map-explore-hunting';
        const progress = hunting ? `<div class="atlas-hunt-destination">${buildMapRouteSummaryHtml(getZone(game.currentZoneId),getZone(Math.min(STORY_ACTS.length-1,game.maxZoneId)))}</div>`
            : `<p>${escapeHTML(bannerLine(region, route))}</p>`;
        const html = `<img class="atlas-landscape" src="${region.landscape}" alt="" decoding="async"><div>
            <h2>${escapeHTML(_t(!route ? region.name : hunting ? '나무' : routeLabel(route)))}</h2>${progress}</div>`;
        if (writeHtmlIfChanged(banner, html)) banner.className='atlas-theme-'+region.id;
    }
    return {open,openAct,enter,showAtlasMap,enterAtlasRegion,enterAtlasNode,page,hunt,render,syncLocation,bossRewardLabel,bossEntry,rewardTooltip};
})();
safeExposeGlobals({explorationAtlasUi});
