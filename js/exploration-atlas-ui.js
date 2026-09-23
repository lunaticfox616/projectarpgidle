// Navigation only: existing content entry handlers retain costs, gates and combat rules.
const explorationAtlasUi = (() => {
    let selected = null;
    let signature = '';
    const regionFor = route => WORLD_TREE_JOURNEY.atlasRegions.find(region => region.routes.includes(route));
    function available(route) {
        const button = document.getElementById('btn-' + route);
        return !!button && !button.hidden && button.style.display !== 'none' && contentProgression.canOpen(route);
    }
    function open() {
        if (!document.getElementById('tab-map').classList.contains('active')) switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-atlas');
        selected = null;
        render();
        scrollToTop();
    }
    function select(id) {
        const region = WORLD_TREE_JOURNEY.atlasRegions.find(entry => entry.id === id);
        if (!region || !region.routes.some(available)) return;
        const routes = region.routes.filter(available);
        if (routes.length === 1) return enter(routes[0]);
        if (game.mapExploreSubtab !== 'map-explore-atlas' || game.mapSubtab !== 'map-tab-zones') open();
        selected = id;
        render();
        scrollToTop();
    }
    function enter(route) {
        if (!regionFor(route) && route !== 'map-tab-pvp') return;
        if (!available(route)) return;
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
        if (getZoneTravelBlockReason(index) || isBeehiveRunLockedForMapTravel() || game.beyondBoundary.activeRun) return;
        changeZone(index);
        if (game.currentZoneId === index) switchTab('tab-battle');
    }
    function routeLabel(route) {
        if (route === 'map-explore-worldtree') return '지도 탐험';
        if (route === 'map-explore-chaos') return '혼돈 · 심화';
        if (route === 'map-explore-beehive') return '벌집';
        return document.getElementById('btn-' + route).textContent.trim();
    }
    function regionHtml(region) {
        const name = region.id === 'tree' ? '탐험' : region.name;
        const progress = region.id === 'tree' ? region.routes.filter(route => route !== 'map-explore-hunting' && available(route)).map(routeLabel).join(' · ') : regionProgress(region);
        const attention = region.id === 'tree' && available('map-explore-trials') && trialRouteSummary().attention;
        return `<button class="atlas-region atlas-theme-${region.id}${attention ? ' has-new-challenge' : ''}" aria-label="${name}"
            onclick="explorationAtlasUi.select('${region.id}')"><img class="atlas-landscape" src="${region.landscape}" alt="" loading="lazy" decoding="async">
            <span class="atlas-region-copy"><strong>${name}</strong>
            <span>${escapeHTML(progress)}</span></span><span class="atlas-region-enter">탐험하기</span></button>`;
    }
    function regionProgress(region) {
        if (region.id === 'tree') return getActZoneDisplayName(Math.min(STORY_ACTS.length-1,game.maxZoneId));
        if (region.id === 'roots') return `혼돈계 ${game.chaosRealm.highestFloor}층 · 이번 루프 심화 ${game.loopProgressCurrent.bestAbyssDepth}층`;
        if (region.id === 'underworld') return floorProgress(Math.max(0,game.underworldProgress.highestFloor-1),game.loopProgressCurrent.bestUnderworldFloor);
        if (region.id === 'sky') return floorProgress(getClearedSkyTowerFloor(game),game.loopProgressCurrent.bestSkyFloor);
        if (region.id === 'sea') return `현재 ${Math.floor(game.ocean.depthM)}m · 거점 ${Math.floor(game.ocean.checkpointM)}m`;
        return `보스 격파 기록 ${(game.cosmosAtlas?.bossClears || []).length}`;
    }
    function floorProgress(highest,current) {
        return `최고 ${highest}층` + (current == null ? '' : ` / 현재 루프 ${current}층`);
    }
    function destinationGroupsHtml(region) {
        const routes = region.routes.filter(available).filter(route => route !== 'map-explore-hunting');
        return [['탐험',routes.filter(route => !region.sideRoutes.includes(route))],
            ['주변 콘텐츠',routes.filter(route => region.sideRoutes.includes(route))]]
            .filter(([,entries]) => entries.length).map(([label,entries]) =>
                `<section class="atlas-destinations" aria-label="${region.name}의 ${label}">${region.id === 'tree' ? '' : `<h3>${label}</h3>`}${entries.map(routeHtml).join('')}</section>`).join('');
    }
    function regionDetailHtml(region) {
        return `<div class="atlas-region-detail atlas-theme-${region.id}"><header class="atlas-region-hero">
            <img class="atlas-landscape" src="${region.landscape}" alt="" decoding="async"><div><small>탐험 권역</small><h2>${region.id === 'tree' ? '탐험' : region.name}</h2>
            <p>${escapeHTML(regionProgress(region))}</p></div></header>${currentHuntHtml()}<div class="atlas-region-routes">${destinationGroupsHtml(region)}</div></div>`;
    }
    function routeHtml(route) {
        const condition = document.getElementById('btn-' + route).dataset.entryCondition || '';
        const summary = routeSummary(route);
        const activity = WORLD_TREE_JOURNEY.atlasActivities[route];
        const status = route === 'map-explore-root-boss' ? '' : condition || summary.status;
        return `<button class="atlas-destination${summary.attention ? ' has-new-challenge' : ''}" data-atlas-route="${route}" data-atlas-tone="${activity.tone}" onclick="explorationAtlasUi.enter('${route}')">
            <strong>${escapeHTML(routeLabel(route))}</strong>${activity.kind ? `<span class="atlas-activity-kind">${escapeHTML(activity.kind)}</span>` : ''}
            ${summary.target ? `<span class="atlas-route-target">${escapeHTML(summary.target)}</span>` : ''}
            ${rewardNamesHtml(route)}${trackedRewardHtml(route)}
            ${status ? `<span class="atlas-route-status">${escapeHTML(status)}</span>` : ''}<small class="atlas-route-action">이동</small></button>`;
    }
    function rewardNamesHtml(route) {
        const rewards = {
            'map-explore-root-boss': [['고유 장비','고유 효과를 가진 장비입니다.'],['군주의 핵',ORB_DB.bossCore.desc,'bossCore']],
            'map-explore-beehive': [['고유 장비','고유 효과를 가진 장비입니다.'],['벌꿀',ORB_DB.enchantedHoney.desc,'enchantedHoney'],['독벌침',ORB_DB.venomStinger.desc,'venomStinger']],
            'map-explore-trials': [['전직 포인트','전직 패시브에 투자하는 포인트입니다.'],['스킬 젬','장착하여 스킬을 사용하는 젬입니다.']],
            'map-explore-colony': [['액막이 부적','군락지 액막이 슬롯에 장착하여 효과를 받습니다.']]
        };
        const names = (rewards[route] || []).filter(([, ,key]) => !key || contentProgression.canDropCurrency(key)).map(([name,description]) =>
            `<span class="atlas-reward-name" role="button" tabindex="0" data-info-tooltip-anchor="1" data-description="${escapeHTML(description)}" onmouseenter="explorationAtlasUi.rewardTooltip(event)" onfocus="explorationAtlasUi.rewardTooltip(event)" onmouseleave="hideInfoTooltip()" onblur="hideInfoTooltip()" onclick="event.stopPropagation(); explorationAtlasUi.rewardTooltip(event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();explorationAtlasUi.rewardTooltip(event)}">${name}</span>`).join('');
        return names ? `<span class="atlas-reward-names">${names}</span>` : '';
    }
    function rewardTooltip(event) {
        const target = event.currentTarget;
        const bounds = target.getBoundingClientRect();
        showInfoTooltipHtml(bounds.left,bounds.bottom,`<b>${escapeHTML(target.textContent)}</b><div class="tooltip-line">${escapeHTML(target.dataset.description)}</div>`,'#c9b17b');
    }
    function huntingHtml() {
        const index = Math.min(STORY_ACTS.length-1,game.maxZoneId);
        const act = STORY_ACTS[index];
        const rewards = getAvailableActRewardZoneIds();
        const steps = STORY_ACTS.slice(0,index+1).map((entry,i) => `<span class="${i === index ? 'is-current' : ''}">${entry.displayAct}</span>`).join('');
        return `<section class="atlas-hunting" data-atlas-route="map-explore-hunting" aria-label="나무">
            <img class="atlas-landscape" src="${ACT_BATTLE_MAP_SOURCES['bgAct'+act.order]}" alt="" decoding="async">
            <button class="atlas-hunting-copy" aria-label="나무" onclick="explorationAtlasUi.enter('map-explore-hunting')"><strong>나무</strong><small>액트 ${act.displayAct} · ${act.title}</small>
            <span class="atlas-act-steps" aria-label="열린 액트">${steps}</span>${trackedRewardHtml('map-explore-hunting')}</button>
            <div class="atlas-hunting-action">${huntingActionsHtml(index,rewards)}</div></section>`;
    }
    function huntingActionsHtml(index,rewards) {
        const current = game.currentZoneId === index && !game.combatHalted;
        const blocked = !current && (getZoneTravelBlockReason(index) || isBeehiveRunLockedForMapTravel() || game.beyondBoundary.activeRun);
        return `${rewards.length ? `<button class="atlas-claim" onclick="openActReward(${rewards[0]})">받을 보상 ${rewards.length}</button>` : ''}
            <button class="atlas-hunt-now" ${current ? '' : 'data-exploration-departure'} onclick="explorationAtlasUi.hunt(${index})" ${blocked ? 'disabled' : ''}>${current ? '전투로 돌아가기' : blocked ? '이동 대기' : '즉시 이동'}</button>
            <button class="atlas-hunt-select" onclick="explorationAtlasUi.enter('map-explore-hunting')">세부 지역</button>`;
    }
    function trackedRewardHtml(route) {
        const targets = game.uniqueHuntTargets.slice(0,uniqueHuntRuntime.limit).map(key => uniqueHuntRuntime.getEntry(key)).filter(Boolean);
        return targets.filter(entry => {
            const source = uniqueHuntUi.getSource(entry);
            return (source.exploreSubtab || source.mapSubtab) === route;
        }).map(entry => `<span class="atlas-tracked-reward">추적 중 · ${escapeHTML(entry.name)}</span>`).join('');
    }
    // Read progression only; availability and payment remain in the existing entry handlers.
    function routeSummary(route) {
        if (route === 'map-explore-root-boss') return bossSummary();
        if (route === 'map-explore-trials') return trialRouteSummary();
        if (route === 'map-explore-beehive') return hiveRouteSummary();
        if (route === 'map-explore-colony') return colonyRouteSummary();
        if (route === 'map-explore-meteor') return {status:game.starWedge.skyRiftReady ? '하늘의 균열 충전 완료' : `하늘의 균열 ${Math.min(100,Math.floor(game.starWedge.skyRiftGauge))}%`};
        return {status:''};
    }
    function trialRouteSummary() {
        // The existing trial list owns unlock/completion eligibility and renders before this chooser.
        const pending = document.querySelector('#ui-trial-list .trial-pending:not(.current)[data-trial-id]');
        const ready = !!pending && !getZoneTravelBlockReason(pending.dataset.trialId)
            && !isBeehiveRunLockedForMapTravel() && !game.beyondBoundary.activeRun;
        return {attention:ready,status:ready ? '새 시련 도전 가능' : `완료한 시련 ${game.completedTrials.length}개`};
    }
    function hiveRouteSummary() {
        const step = game.beehive.queenActive ? '여왕벌 전투' : `갈림길 ${Math.min(10,game.beehive.branchStep)}/10`;
        return {status:game.beehive.inRun ? `원정 중 · ${step}` : `벌집 열쇠 ${game.currencies.hiveKey}개`};
    }
    function colonyRouteSummary() {
        return {status:game.colony.inRun ? `방어 중 · ${game.colony.wave}웨이브` : `최고 도달 ${game.colony.highestWave}웨이브 · 흔적 ${game.currencies.colonyTrace}개`};
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
        const travelBlocked = !!getZoneTravelBlockReason(zone.id) || isBeehiveRunLockedForMapTravel() || !!game.beyondBoundary.activeRun;
        return {gate,keyCount,hasEntry,current,travelBlocked,ready:current || (gate.met && hasEntry && !travelBlocked)};
    }
    function bossRewardLabel(zone) {
        if (zone.milestonePinnacle && game.clearedRootBosses.includes(zone.id)) return '첫 격파 보상 수령 완료';
        const key = getCanonicalCurrencyKey(zone.firstClearReward?.key || zone.reward);
        const equipment = key === 'bossCore';
        if (!contentProgression.canDropCurrency(key)) return equipment ? '고유 장비 · 확률 획득' : '';
        const name = ORB_DB[key].name;
        if (zone.firstClearReward) return `첫 격파 · ${name} ${zone.firstClearReward.amount}개`;
        return equipment ? `고유 장비 · ${name} · 확률 획득` : name;
    }
    function currentHuntHtml() {
        const zone = getZone(game.currentZoneId);
        return `<div class="atlas-current-hunt"><div><small>현재 위치</small><strong>${escapeHTML(zone.name)}</strong></div>
            <button data-atlas-current onclick="switchTab('tab-battle')">전투로 돌아가기</button></div>`;
    }
    function render() {
        syncLocation();
        const host = document.getElementById('ui-exploration-atlas');
        if (!host || game.mapSubtab !== 'map-tab-zones' || game.mapExploreSubtab !== 'map-explore-atlas') return;
        const regions = WORLD_TREE_JOURNEY.atlasRegions.filter(region => region.routes.some(route => route !== 'map-explore-hunting' && available(route)));
        if (!regions.some(region => region.id === selected)) selected = null;
        const region = regions.find(entry => entry.id === selected);
        const arena = available('map-tab-pvp') ? '<button class="atlas-arena" onclick="explorationAtlasUi.enter(\'map-tab-pvp\')">대전</button>' : '';
        const body = region ? regionDetailHtml(region) : currentHuntHtml() + overviewHtml(regions);
        const key = JSON.stringify([selected,body,arena]);
        if (signature === key && host.innerHTML) return;
        signature = key;
        updateOverview(host,body,region,arena);
    }
    function overviewHtml(regions) {
        const acts = available('map-explore-hunting') ? `<div class="atlas-act-entry">${huntingHtml()}</div>` : '';
        return acts + `<div class="atlas-regions" role="group" aria-label="탐험 권역">${regions.map(regionHtml).join('')}</div>`;
    }
    function updateOverview(host,body,region,arena) {
        const focus = host.contains(document.activeElement) ? document.activeElement.getAttribute('onclick') : null;
        const title = region ? `<nav class="atlas-breadcrumb" aria-label="탐험 위치"><button class="atlas-back" onclick="explorationAtlasUi.open()">전체 탐험</button><span>${region.id === 'tree' ? '탐험' : region.name}</span></nav>` : '<h2>탐험</h2>';
        host.innerHTML = `<header class="atlas-heading">${title}${arena}</header>` + body;
        if (focus) [...host.querySelectorAll('button')].find(button => button.getAttribute('onclick') === focus)?.focus({preventScroll:true});
    }
    function syncLocation() {
        const host = document.getElementById('exploration-location');
        if (!host) return;
        const route = game.mapSubtab === 'map-tab-zones' ? game.mapExploreSubtab : game.mapSubtab;
        const overview = route === 'map-explore-atlas';
        host.hidden = overview;
        document.getElementById('tab-map').classList.toggle('is-atlas-overview',overview);
        if (overview) return;
        const region = regionFor(route);
        if (region && region.routes.filter(available).length > 1) selected = region.id;
        const html = '<button onclick="explorationAtlasUi.open()">전체 탐험</button>' + (region && route !== 'map-explore-hunting'
            ? `<button class="exploration-region-name" onclick="explorationAtlasUi.select('${region.id}')">${region.id === 'tree' ? '탐험' : region.name}</button>` : '');
        if (host.innerHTML !== html) host.innerHTML = html;
        syncRegionBanner(region,route);
    }
    function syncRegionBanner(region,route) {
        const banner = document.getElementById('exploration-region-banner');
        banner.hidden = !region;
        if (banner.hidden) return;
        const hunting = route === 'map-explore-hunting';
        const progress = hunting ? `<div class="atlas-hunt-destination">${buildMapRouteSummaryHtml(getZone(game.currentZoneId),getZone(Math.min(STORY_ACTS.length-1,game.maxZoneId)))}</div>`
            : `<p>${escapeHTML(regionProgress(region))}</p>`;
        const html = `<img class="atlas-landscape" src="${region.landscape}" alt="" decoding="async"><div>
            <h2>${escapeHTML(hunting ? '나무' : routeLabel(route))}</h2>${progress}</div>`;
        if (banner.innerHTML !== html) {banner.className='atlas-theme-'+region.id;banner.innerHTML=html;}
    }
    return {open,select,enter,hunt,render,syncLocation,bossRewardLabel,bossEntry,rewardTooltip};
})();
safeExposeGlobals({explorationAtlasUi});
