/** 사냥터 목록(지도 창의 나무와 혼돈, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 3순위). 카드마다 같은 글이던 목록을 바꿨다.
 * 액트 카드: 보스 그림, 액트 번호와 이름, 보스, 권장 전투력, 상태와 이동 단추. 혼돈 1~20: 층 타일 판(완료, 현재, 다음 색, 보스 속성 점,
 * 전투력이 모자라면 붉은 표시), 타일을 누르면 그 층으로 간다. 목록의 모든 지역이 "보상 감소"면 카드마다 쓰지 않고 머리줄에 한 번 쓴다.
 * 권장 전투력 툴팁과 이동 규칙은 js/ui.js(getMapPowerEstimateParts, showMapPowerEstimateTooltip, changeZone). */
const mapListUi = (() => {
    const POWER_TIP = 'onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="hideInfoTooltip()"';
    let lastActs = '', lastChaos = '';

    const esc = value => escapeHTML(String(value ?? ''));
    const fill = (have, need) => Math.max(0, Math.min(100, need > 0 ? (have / need) * 100 : 0));
    const bar = (have, need) => `<i class="map-list-bar"><i style="width:${fill(have, need).toFixed(1)}%"></i></i>`;
    const reduced = facts => !!levelProgressionUi.rewardHint(facts.zone);

    function chaos20Conquered(id) {
        if (getAbyssDepthFromZoneId(id) !== 20) return false;
        return !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared)
            || (Array.isArray(game.abyssClearedDepths) && game.abyssClearedDepths.includes(20)) || Math.floor(game.abyssEndlessDepth || 0) >= 21;
    }
    /** A zone's card facts: where the hero is, whether it is done, the act reward state. */
    function factsOf(zone, recommendedId) {
        const id = Number(zone.id), chaos = zone.type === 'abyss';
        const rewardReady = (game.claimableActRewards || []).includes(id), rewardClaimed = (game.claimedActRewards || []).includes(id);
        return { zone, id, chaos, current: id === game.currentZoneId, recommended: id === recommendedId && !chaos, rewardReady, rewardClaimed,
            cleared: id < game.maxZoneId || rewardReady || rewardClaimed || chaos20Conquered(id), reveal: id === pendingMapRevealZoneId };
    }
    function headHtml(title, list) {
        const done = list.filter(facts => facts.cleared).length;
        const note = list.length && list.every(reduced) ? '<em>모든 지역 보상 감소</em>' : '';
        return `<header class="map-list-head"><strong>${title}</strong>${note}<b>완료 ${done}/${list.length}</b>${bar(done, list.length)}</header>`;
    }

    // ── 액트 카드 ──────────────────────────────────────────────────
    function actArt(facts) {
        if (facts.zone.type !== 'act') return '';
        const key = getBossAssetKeyForZone({ type: 'act', id: facts.id }, 0, 0);
        return key && BOSS_ASSET_MANIFEST[key] ? BOSS_ASSET_MANIFEST[key] : '';
    }
    function actTitle(zone) {
        const at = zone.name.indexOf(': ');
        return at > 0 ? { label: zone.name.slice(0, at), name: zone.name.slice(at + 2) } : { label: '', name: zone.name };
    }
    function actActionsHtml(facts) {
        const state = getMapCardState(facts.current, facts.cleared, facts.recommended);
        return buildMapCardActionsHtml({ state, isActRewardZone: facts.zone.type === 'act' && facts.id <= 9, rewardReady: facts.rewardReady,
            rewardClaimed: facts.rewardClaimed, zoneId: facts.id, enterAction: facts.current ? "switchTab('tab-battle')" : `changeZone(${facts.id})`,
            enterLabel: facts.current ? '전투 보기' : '이동' });
    }
    function actCardHtml(facts, hideReward) {
        const title = actTitle(facts.zone), story = facts.zone.type === 'act' ? getStoryActByZoneId(facts.id) : null, art = actArt(facts);
        const cls = ['map-act-card', facts.current ? 'current' : '', facts.cleared ? 'is-cleared' : '', facts.recommended ? 'is-recommended' : '', facts.reveal ? 'map-unlock-reveal' : ''];
        return `<div class="${cls.filter(Boolean).join(' ')}" role="group"${facts.current ? ' aria-current="true"' : ''}>`
            + `<span class="map-act-art">${art ? `<img class="map-act-img" src="${art}" alt="" draggable="false">` : ''}</span>`
            + `<div class="map-act-body">${title.label ? `<small>${esc(title.label)}</small>` : ''}<strong>${esc(title.name)}</strong>`
            + `${story ? `<span class="map-act-boss">보스 ${esc(story.bossName)}</span>` : ''}${buildMapPowerEstimateHtml(facts.zone, { hideReward })}</div>`
            + `<div class="map-act-actions">${actActionsHtml(facts)}</div></div>`;
    }
    function actsHtml(list) {
        if (!list.length) return '';
        const hideReward = list.every(reduced);
        return `${headHtml('일반 나무', list)}<div class="map-act-grid">${list.map(facts => actCardHtml(facts, hideReward)).join('')}</div>`;
    }

    // ── 혼돈 타일 ──────────────────────────────────────────────────
    function chaosStateText(facts, next) {
        if (facts.current) return '현재';
        if (facts.cleared) return '완료';
        return next ? '다음' : '도전';
    }
    function chaosTileClass(facts, next, parts) {
        return ['map-chaos-tile', facts.current ? 'is-current' : '', facts.cleared ? 'is-cleared' : '', next ? 'is-next' : '',
            parts && !parts.met ? 'is-short' : '', facts.reveal ? 'map-unlock-reveal' : ''].filter(Boolean).join(' ');
    }
    function chaosTileHtml(facts, next, hideReward) {
        const parts = getMapPowerEstimateParts(facts.zone), depth = getAbyssDepthFromZoneId(facts.id), state = chaosStateText(facts, next);
        const cut = !hideReward && reduced(facts) ? ', 보상 감소' : '';
        const dots = (getChaosBossElements(facts.zone) || []).map(key => `<i class="map-power-element is-${key}" aria-label="${getMapEstimateElementName(key)}"></i>`).join('');
        const go = facts.current ? ` onclick="switchTab('tab-battle')"` : ` data-exploration-departure onclick="changeZone(${facts.id})"`;
        const tip = parts ? ` ${parts.attrs} ${POWER_TIP}` : '';
        return `<button type="button" class="${chaosTileClass(facts, next, parts)}"${go} aria-label="혼돈 ${depth}, ${state}"${tip}>`
            + `<small>혼돈</small><b>${depth}</b><span class="map-chaos-dots">${dots}</span><em>${state}${cut}</em>${parts ? parts.environment : ''}</button>`;
    }
    function chaosHtml(list) {
        const deep = getDeepChaosMapEntryHtml();
        if (!list.length && !deep) return '';
        const hideReward = list.every(reduced), next = list.find(facts => !facts.cleared && !facts.current);
        const tiles = list.map(facts => chaosTileHtml(facts, facts === next, hideReward)).join('');
        return `${headHtml('혼돈', list)}<div class="map-chaos-board">${tiles}</div>${deep}`;
    }

    function paint(id, html, cacheKey) {
        const host = document.getElementById(id);
        if (!host) return;
        if (cacheKey === 'acts' ? lastActs === html : lastChaos === html) return;
        host.innerHTML = html;
        if (cacheKey === 'acts') lastActs = html; else lastChaos = html;
    }
    /** Draws both lists; returns how many chaos entries there are (the chaos sub-tab shows only when there is one). */
    function render(mapZones, recommendedId) {
        const facts = mapZones.map(zone => factsOf(zone, recommendedId));
        const chaos = facts.filter(item => item.chaos), chaosMarkup = chaosHtml(chaos);
        paint('ui-map-list', actsHtml(facts.filter(item => !item.chaos)), 'acts');
        paint('ui-chaos-map-list', chaosMarkup, 'chaos');
        return chaosMarkup ? Math.max(1, chaos.length) : 0;
    }

    // ── 강대한 적 ──────────────────────────────────────────────────
    // 보스마다 그림이 없어(전투에서는 일반 몬스터 그림을 쓴다) 피해 속성의 도트 문장을 그 색으로 그린다.
    const BOSS_EMBLEMS = Object.freeze({ fire: 'flame', cold: 'drop', light: 'up', chaos: 'eye', phys: 'sword' });
    function bossTrack(zone) {
        const tracks = { underworld: '지하계 종착', ocean: '심해 종착', sky: '창공 종착', convergence: '아틀라스 종착' };
        return tracks[zone.pinnacleTrack] || (zone.cosmosCapstone ? '우주계 종착' : '');
    }
    function bossStatus(zone, entry, done) {
        if (entry.travelBlocked) return '현재 탐험 종료 후 이동 가능';
        if (!entry.gate.met) return entry.gate.label;
        if (zone.milestonePinnacle) return done ? '최초 격파 완료, 재도전 가능' : '도전 가능';
        return entry.hasEntry ? '도전 가능' : '열쇠 필요';
    }
    function bossActionHtml(zone, entry) {
        if (entry.current) return '<button type="button" onclick="switchTab(\'tab-battle\')">전투로 돌아가기</button>';
        if (entry.travelBlocked) return '<button type="button" disabled>이동 대기</button>';
        if (!entry.gate.met) return '<button type="button" disabled>선행 조건 필요</button>';
        if (!entry.hasEntry) return '';
        return `<button type="button" data-exploration-departure onclick="changeZone('${zone.id}')">도전</button>`;
    }
    /** The key row: how many keys the hero holds and where they drop (milestone pinnacles need no key). */
    function bossKeyHtml(zone, entry) {
        const key = ORB_DB[zone.key];
        if (!key || zone.milestonePinnacle) return '';
        return `<p class="map-boss-row${entry.keyCount > 0 ? ' is-have' : ''}"><span>열쇠</span><b>${entry.keyCount}개</b>${key.source ? `<small>${esc(key.source)}</small>` : ''}</p>`;
    }
    function bossCardHtml(zone, hideReward) {
        const entry = explorationAtlasUi.bossEntry(zone), done = Array.isArray(game.clearedRootBosses) && game.clearedRootBosses.includes(zone.id);
        const ele = BOSS_EMBLEMS[zone.ele] ? zone.ele : 'phys', track = bossTrack(zone), reward = explorationAtlasUi.bossRewardLabel(zone);
        const cls = ['map-boss-card', `is-${ele}`, entry.ready ? 'is-ready' : 'is-locked', game.currentZoneId === zone.id ? 'current' : ''].filter(Boolean).join(' ');
        return `<div class="${cls}" data-boss-id="${zone.id}"><span class="map-boss-emblem">${renderPixelIcon(BOSS_EMBLEMS[ele], 'map-boss-glyph')}</span>`
            + `<div class="map-boss-body"><div class="map-boss-title"><strong>${esc(zone.name)}</strong><em${done ? ' class="is-done"' : ''}>${done ? '격파 완료' : '미격파'}</em></div>`
            + `${track ? `<span class="map-boss-track">${track}</span>` : ''}${buildMapPowerEstimateHtml(zone, { hideReward })}</div>`
            + `${reward ? `<p class="map-boss-row is-reward"><span>보상</span><b>${esc(reward)}</b></p>` : ''}${bossKeyHtml(zone, entry)}`
            + `<div class="map-boss-foot"><span>${esc(bossStatus(zone, entry, done))}</span>${bossActionHtml(zone, entry)}</div></div>`;
    }
    function bossGroupsHtml(zones) {
        if (!zones.length) return '<p class="encounter-empty">아직 발견한 보스가 없습니다.</p>';
        const hideReward = zones.every(zone => levelProgressionUi.rewardHint(zone));
        const cards = list => list.map(zone => ({ html: bossCardHtml(zone, hideReward) }));
        const ready = zones.filter(zone => explorationAtlasUi.bossEntry(zone).ready)
            .sort((a, b) => Number(game.clearedRootBosses.includes(a.id)) - Number(game.clearedRootBosses.includes(b.id)));
        const pending = zones.filter(zone => !ready.includes(zone));
        const groups = [['rootBosses', '뿌리 보스', zone => !zone.rivalBlade && !zone.cosmosCapstone && !zone.milestonePinnacle],
            ['rivalBosses', '버려진 날붙이', zone => zone.rivalBlade], ['pinnacleBosses', '경계의 수호자', zone => (zone.cosmosCapstone || zone.milestonePinnacle) && !zone.pinnacleCapstone],
            ['finalGate', '최종 관문', zone => zone.pinnacleCapstone]].map(([key, title, test]) => [key, title, pending.filter(test)]).filter(([, , list]) => list.length);
        const done = zones.filter(zone => game.clearedRootBosses.includes(zone.id)).length;
        const head = `<header class="map-list-head"><strong>강대한 적</strong>${hideReward ? '<em>모든 보스 보상 감소</em>' : ''}<b>격파 ${done}/${zones.length}</b>${bar(done, zones.length)}</header>`;
        return head + (ready.length ? buildMapZoneGroupHtml('availableBosses', '입장 가능', cards(ready)) : '')
            + (pending.length ? '<h3 class="encounter-pending-title">준비가 필요한 보스</h3>' : '')
            + groups.map(([key, title, list], index) => buildMapZoneGroupHtml(key, title, cards(list), ready.length > 0 || index > 0)).join('');
    }
    /** The 강대한 적 list; keeps focus on the same boss button across a redraw. */
    function renderBosses(zones) {
        const host = document.getElementById('ui-season-boss-list'), html = bossGroupsHtml(zones);
        if (!host || host._bossMarkup === html) return;
        const focused = host.contains(document.activeElement) ? document.activeElement : null;
        const action = focused?.getAttribute('onclick'), bossId = focused?.closest('[data-boss-id]')?.dataset.bossId;
        host.innerHTML = html;
        host._bossMarkup = html;
        if (!action) return;
        [...host.querySelectorAll('button')].find(button => button.getAttribute('onclick') === action
            && button.closest('[data-boss-id]')?.dataset.bossId === bossId)?.focus({ preventScroll: true });
    }
    return Object.freeze({ render, renderBosses });
})();

safeExposeGlobals({ mapListUi });
