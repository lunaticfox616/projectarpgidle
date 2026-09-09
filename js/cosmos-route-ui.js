// Expedition planning. Atlas supplies read-only node views and legacy challenge details.
const cosmosRouteUi = (() => {
    let bound = null;
    let lastView = null;
    let lastHtml = '';
    let galaxy = 1;
    let observedBattle = null;

    function focus(node) {
        galaxy = node.orbit || 1;
        document.getElementById('cosmos-node-detail').open = true;
    }

    function closeNode() {
        document.getElementById('cosmos-node-detail').open = false;
    }

    function branchMap(plan) {
        const index = Math.min(plan.stage, plan.plan.length-1);
        const currentId = plan.queue[0] || plan.plan[index][0];
        const current = lastView.nodes.find(node => node.id === currentId);
        const boss = lastView.nodes.find(node => node.id === plan.plan.at(-1).at(-1));
        return `<div class="cosmos-journey-heading"><small>${cosmosRouteRuntime.active(game) ? '현재 탐사 중' : '이번 탐사'}</small>
            <strong>${escapeHTML(current.name)} <span>→</span> ${escapeHTML(boss.name)}</strong>
            <span>${plan.history.length}/${plan.plan.flat().length}곳 탐사</span></div>
            <div class="cosmos-expedition-map" role="group" aria-label="은하 탐사">
            ${plan.plan.map((leg,i) => expeditionStage(plan,i)).join('')}</div>`;
    }

    function expeditionStage(plan, index) {
        const progress = plan.history.filter(row => row.stage === index).length;
        const current = plan.stage === index;
        const done = progress === plan.plan[index].length;
        const title = index === plan.plan.length-1 ? '마지막 관문' : `${index+1}번째 탐사`;
        return `<details class="cosmos-expedition-stage ${current ? 'current' : ''} ${done ? 'done' : ''}"
            data-route-segment="${index}" data-route-disclosure="leg-${index}" ${current ? 'open' : ''}>
            <summary><b>${title}</b><span>${done ? '완료' : current && cosmosRouteRuntime.active(game) ? '탐사 중' : ''}</span>
            <small>${progress}/${plan.plan[index].length}</small></summary>
            <ol class="cosmos-planet-path">${plan.plan[index].map(id => expeditionPlanet(plan,id)).join('')}</ol></details>`;
    }

    function expeditionPlanet(plan, id) {
        const node = lastView.nodes.find(row => row.id === id);
        const done = plan.history.some(row => row.id === id);
        const current = plan.queue[0] === id;
        const boss = id === plan.plan.at(-1).at(-1);
        const habitat = cosmosRouteRuntime.planetHabitat(id);
        const state = current ? '현재 위치' : done ? '탐사 완료' : boss ? '최종 보스' : '';
        return `<li class="cosmos-planet-stop ${node.kind} ${habitat} ${boss ? 'boss' : ''} ${current ? 'current' : ''} ${done ? 'done' : ''}" data-planned-node="${id}" ${current ? 'aria-current="step"' : ''}>
            <i aria-hidden="true"></i><b>${escapeHTML(node.name)}</b><small>${state}</small></li>`;
    }

    function routeFooter(plan, unlocked) {
        if (!unlocked) return '<p class="cosmos-route-notice">나무꾼 격파 · 지하계 30층 도달 후 해금</p>';
        const retry = Math.ceil(cosmosRouteRuntime.retryRemaining(game) / 1000);
        if (retry) return `<p class="cosmos-route-notice" role="status">재도전까지 <b data-route-retry>${retry}</b>초 · 일반 사냥 가능</p>`;
        if (cosmosRouteRuntime.active(game)) return `<footer class="cosmos-route-footer"><span data-route-progress></span><div>
            <button type="button" data-route-action="retreat">종료</button><button type="button" class="primary" data-route-action="battle">전투 보기</button></div></footer>`;
        if (!cosmosRouteRuntime.unlocked(game,galaxy)) return `<p class="cosmos-route-notice">${galaxy-1}은하 보스 격파 후 탐사 가능</p>`;
        return `<footer class="cosmos-route-footer"><span>${plan.plan.length}구간 · ${plan.plan.flat().length}곳</span>
            <div>${currentStarBattle() ? '<button type="button" data-route-action="battle">전투 보기</button>' : ''}
            <button type="button" class="primary" data-route-action="start" data-route-value="${galaxy}">탐사 출발</button></div></footer>`;
    }

    function outcomeLine(nodes) {
        const route = game.cosmosRoute;
        if (!route || cosmosRouteRuntime.active(game)) return '';
        const node = nodes.find(row => row.id === route.failedNode);
        const title = route.phase === 'failed' ? `${escapeHTML(node ? node.name : '탐사')}에서 실패` : '탐사 종료';
        return `<p class="cosmos-route-outcome">${title} · 별가루 +${route.dust} 확보</p>`;
    }

    function bindStarMapActions(host) {
        if (bound === host) return;
        bound = host;
        host.addEventListener('click', event => {
            const button = event.target.closest('[data-route-action]');
            if (!button || button.disabled) return;
            lastView.onAction(button.dataset.routeAction, button.dataset.routeValue);
        });
        host.addEventListener('change', changeStarMapSelection);
    }

    function changeStarMapSelection(event) {
        if (event.target.id === 'cosmos-galaxy') {
            galaxy = Number(event.target.value); closeNode(); renderRouteView(lastView);
        }
    }

    function renderRouteView(view) {
        const host = document.getElementById('cosmos-inner-route');
        if (!host || host.style.display === 'none') return;
        lastView = view;
        followStarBattle(view.nodes);
        const sameGalaxy = (game.cosmosRoute?.galaxy || 1) === galaxy;
        const plan = sameGalaxy && (cosmosRouteRuntime.active(game) || (game.cosmosRoute && cosmosRouteRuntime.retryRemaining(game) > 0))
            ? game.cosmosRoute : cosmosRouteRuntime.preview(game,galaxy);
        const html = `<section class="cosmos-star-chart"><header class="cosmos-star-header"><label>은하<select id="cosmos-galaxy" aria-label="은하 선택">
            ${[1,2,3,4,5].map(id => `<option value="${id}" ${galaxy === id ? 'selected' : ''}>${id}은하</option>`).join('')}</select></label>
            <button type="button" data-route-action="stones">우주석</button></header>
            ${branchMap(plan)}${routeFooter(plan, view.unlocked)}${outcomeLine(view.nodes)}</section>`;
        replaceRouteMarkup(host, html);
        bindStarMapActions(host);
        writeRouteProgress();
    }

    function replaceRouteMarkup(host, html) {
        if (html !== lastHtml || host !== bound) {
            const focusKey = host.contains(document.activeElement) ? document.activeElement.dataset.routeAction : null;
            const focusValue = document.activeElement?.dataset.routeValue;
            const disclosures = [...host.querySelectorAll('[data-route-disclosure][open]')].map(node => node.dataset.routeDisclosure);
            host.innerHTML = html; lastHtml = html;
            for (const id of disclosures) host.querySelector(`[data-route-disclosure="${id}"]`)?.setAttribute('open','');
            if (focusKey) host.querySelector(`[data-route-action="${focusKey}"][data-route-value="${focusValue}"]`)?.focus({preventScroll:true});
        }
    }

    function currentStarBattle() {
        if (game.currentZoneId !== 'cosmos_challenge') return null;
        const challenge = game.cosmosAtlas.activeChallenge;
        return challenge && !challenge.rewardSettled ? challenge : null;
    }

    function followStarBattle(nodes) {
        const id = currentStarBattle()?.nodeId;
        if (id === observedBattle) return;
        observedBattle = id;
        const node = nodes.find(row => row.id === id);
        if (node) galaxy = node.orbit || 1;
    }

    function writeRouteProgress() {
        if (!bound || bound.style.display === 'none' || game.mapSubtab !== 'map-tab-cosmos') return false;
        const label = bound.querySelector('[data-route-progress]');
        if (label) {
            const route = game.cosmosRoute;
            const name = lastView.nodes.find(node => node.id === route.queue[0])?.name || '탐사 중';
            const text = `${route.stage+1}구간 · ${name} · ${route.history.length}/${route.plan.flat().length} · 별가루 +${route.dust}`;
            if (label.textContent !== text) label.textContent = text;
        }
        return true;
    }

    function updateRouteVitals() {
        if (!writeRouteProgress()) return;
        const retry = bound.querySelector('[data-route-retry]');
        if (!retry) return;
        const seconds = Math.ceil(cosmosRouteRuntime.retryRemaining(game) / 1000);
        if (seconds === 0) { renderRouteView(lastView); return; }
        if (retry.textContent !== String(seconds)) retry.textContent = seconds;
    }

    function updateHud() {
        const label = document.getElementById('ui-cosmos-route-progress');
        if (!label) return;
        const visible = game.currentZoneId === 'cosmos_challenge' && cosmosRouteRuntime.active(game);
        label.hidden = !visible;
        if (!visible) return;
        const route = game.cosmosRoute;
        const completed = route.history.filter(row => row.stage === route.stage).length;
        const text = `${route.stage + 1}차 탐사 ${completed}/${route.plan[route.stage].length}`;
        if (label.textContent !== text) label.textContent = text;
        label.setAttribute('aria-label',`${route.galaxy || 1}은하 ${text}`);
    }

    return { render: renderRouteView, updateVitals: updateRouteVitals, updateHud, focus, closeNode };
})();
safeExposeGlobals({ cosmosRouteUi });
