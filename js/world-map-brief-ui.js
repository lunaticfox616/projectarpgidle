// 세계 지도 설명 칸의 바로 가기(2026-11-09 사용자: 세부 탭의 대략적인 내용도, 예를 들어 강대한 적이면 지금 입장 가능한 보스와 바로 입장 단추).
// 자리마다 세부 탭이 지금 내주는 일을 줄 몇 개(이름, 상태, 작은 단추)로 줄인다. 규칙과 입장은 세부 탭의 함수 그대로라 이 파일은 읽고 그 이름을
// onclick 글로 적을 뿐이다. 강대한 적과 전직 시련은 세부 탭의 카드(DOM)를 그대로 읽어 같은 상태와 단추를 낸다: 그 두 목록은 지도 탭이 열려 있으면
// 어느 쪽에 있든 늘 그려진다(js/ui.js updateStaticUI). 나머지 자리의 판은 그 쪽이 열려야 그려지므로 상태에서 바로 읽는다.
const worldMapBrief = (() => {
    const LIMIT = 5;   // 줄 수 한도. 넘치면 끝에 +N
    const esc = value => escapeHTML(String(value ?? ''));
    const go = (label, action, { off = false, departure = true } = {}) => ({ label, action, off, departure });
    const battle = () => go(_t('전투'), "switchTab('tab-battle')", { departure: false });
    const row = (name, meta, button) => ({ name, meta, button });
    const inZone = id => game.currentZoneId === id && !game.combatHalted;

    /** 세부 탭 카드의 줄: 제목(small을 뺀 글), 상태 글, 그 단추(onclick 글, 비활성, 출발 확인 표시 그대로). */
    const text = node => node ? [...node.childNodes].filter(child => child.tagName !== 'SMALL').map(child => child.textContent).join('').trim() : '';
    function buttonOf(button) {
        if (!button) return null;
        const action = button.getAttribute('onclick') || '';
        return go(button.textContent.trim(), action, { off: button.disabled || !action, departure: button.hasAttribute('data-exploration-departure') });
    }
    function cardRows(host, card, pick) {
        return [...document.querySelectorAll(`${host} ${card}`)].map(node => row(text(node.querySelector(pick.name)), text(node.querySelector(pick.state)), buttonOf(node.querySelector(pick.button))));
    }
    const live = entry => !!entry.button && !entry.button.off;
    /** 강대한 적: 목록의 카드(선행 조건을 채운 보스만, 약한 순) 가운데 지금 도전할 수 있는 보스를 앞에. */
    function bosses() {
        const rows = cardRows('#ui-season-boss-list', '.map-boss-card', { name: '.map-boss-title strong', state: '.map-boss-foot span', button: '.map-boss-foot button' });
        return rows.sort((a, b) => Number(live(b)) - Number(live(a)));
    }
    function trials() {
        return cardRows('#ui-trial-list', '.encounter-card', { name: '.encounter-heading strong', state: '.encounter-footer span', button: '.encounter-footer button' });
    }

    function labyrinth() {
        const max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        if (inZone(LABYRINTH_ZONE_ID)) return [row(_t('{n}층', { n: game.labyrinthFloor }), _t('탐험 중'), battle())];
        const blocked = getZoneTravelBlockReason(LABYRINTH_ZONE_ID) || getHeldRunBlockReason();
        return [row(_t('입장 가능 1 ~ {max}층', { max }), blocked || '', go(_t('{n}층 입장', { n: max }), `enterLabyrinthFloor(${max})`, { off: !!blocked }))];
    }
    function hive() {
        const b = game.beehive, keys = Math.max(0, game.currencies.hiveKey || 0);
        if (b.inRun) return [row(b.queenActive ? _t('여왕벌 전투') : _t('갈림길 {n}/10', { n: Math.min(10, b.branchStep) }), _t('원정 중'), battle())];
        return [row(_t('벌집 원정'), `${_t('벌집 열쇠')} ${_t('{n}개', { n: keys })}`, go(_t('입장'), 'startBeehiveRun()', { off: keys <= 0 }))];
    }
    function grand() {
        const rift = game.voidRift;
        if (rift.grandRun?.inRun) return [row(_t('대균열'), _t('진행 중'), battle())];
        const hint = rift.grandBreachUnlock ? _t('열림') : _t('공허 균열 완료 시 {pct}% 확률로 열립니다.', { pct: Math.round(GRAND_BREACH_ENCOUNTER.unlockChance * 100) });
        return [row(_t('대균열'), hint, go(_t('입장'), 'enterGrandBreach()', { off: !rift.grandBreachUnlock }))];
    }
    function meteor() {
        if (game.currentZoneId === METEOR_FALL_ZONE_ID) return [row(_t('운석 원정 진행 중'), '', battle())];
        const ready = game.meteorSite.skyRiftReady, kind = ready ? getMeteorKind() : null;
        const name = ready ? _t('원정 준비 완료') : _t('하늘의 균열 충전 {pct}%', { pct: Math.min(100, Math.floor(game.meteorSite.skyRiftGauge || 0)) });
        return [row(name, kind ? _t(kind.name) : '', go(_t('입장'), `changeZone('${METEOR_FALL_ZONE_ID}')`, { off: !ready }))];
    }
    function timeRift() {
        const rift = ensureTimeRiftState(), issue = getTimeRiftFutureEntryReason(rift);
        const past = game.currentZoneId === TIME_RIFT_PAST_ZONE_ID ? battle() : go(_t('입장'), `changeZone('${TIME_RIFT_PAST_ZONE_ID}')`, { off: !!rift.altarOpen });
        const future = game.currentZoneId === TIME_RIFT_FUTURE_ZONE_ID ? battle() : go(_t('입장'), `changeZone('${TIME_RIFT_FUTURE_ZONE_ID}')`, { off: !!issue });
        return [row(_t('과거'), rift.altarOpen ? _t('제단 개방 완료') : `${_t('시간압')} ${rift.pressure}`, past), row(_t('미래'), issue || _t('융합 준비 완료'), future)];
    }
    function ocean() {
        const st = ensureOceanState();
        if (st.diving) {
            const back = game.currentZoneId === OCEAN_ZONE_ID ? battle() : go(_t('심해로 돌아가기'), 'changeZone(OCEAN_ZONE_ID)');
            return [row(_t('현재 {depth}m', { depth: Math.floor(st.depthM) }), _t('잠수 중'), back)];
        }
        const rows = [row(_t('잠수 시작'), _t('{checkpointM}m부터', { checkpointM: st.checkpointM }), go(_t('잠수'), 'oceanDiveUi.startDive()'))];
        const lift = getOceanShallowLiftM(st);
        if (lift !== null) rows.push(row(_t('얕게 잠수'), _t('{lift}m부터', { lift }), go(_t('잠수'), 'oceanDiveUi.startDive(true)')));
        return rows;
    }
    function underworld() {
        const progress = game.underworldProgress || {}, highest = Math.max(1, Math.floor(progress.highestFloor || 1)), open = canEnterUnderworld();
        if (inZone(UNDERWORLD_ZONE_ID)) return [row(_t('{floor}층', { floor: Math.max(1, Math.floor(progress.currentFloor || 1)) }), _t('탐험 중'), battle())];
        const rows = [row(_t('최고 개방 {highest}층', { highest }), open ? '' : getUnderworldEntryLockReason(game), go(_t('{highest}층 입장', { highest }), `enterUnderworldFloor(${highest})`, { off: !open }))];
        if (open && highest > 1) rows.push(row(_t('다른 층…'), '', go(_t('선택'), 'enterUnderworldPrompt()')));
        return rows;
    }
    function sky() {
        const tower = game.skyTower;
        if (inZone(SKY_TOWER_ZONE_ID)) return [row(_t('{floor}층', { floor: tower.currentFloor }), _t('탐험 중'), battle())];
        const meta = _t('이번 루프 남은 보상 전투: {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', {
            skyTowerRemainingClears: getSkyTowerRemainingClears(), skyTowerLoopClearLimit: getSkyTowerLoopClearLimit()
        });
        return [row(_t('최고 입장 {highest}층', { highest: tower.highestFloor }), meta, go(_t('층 골라 입장'), 'enterSkyTowerPrompt()', { off: !canEnterSkyTower() }))];
    }
    function chaosRealm() {
        const st = ensureChaosRealmState(), highest = Math.max(1, Math.floor(st.highestFloor || 1));
        if (inZone(CHAOS_REALM_ZONE_ID)) return [row(_t('{floor}층', { floor: Math.max(1, Math.floor(st.currentFloor || 1)) }), _t('탐험 중'), battle())];
        const ready = !!st.unlocked && canEnterChaosRealm();
        return [row(_t('최고 입장 {highest}층', { highest }), _t('클리어 {length}층', { length: (st.clearedFloors || []).length }), go(_t('층 골라 입장'), 'enterChaosRealmPrompt()', { off: !ready }))];
    }
    /** 혼돈: 지금 있는 층, 다음 층(완료는 maxZoneId 앞, js/map-list-ui.js factsOf), 열린 심화층. */
    function chaos() {
        const highest = Math.min(Math.max(0, Math.floor(game.maxZoneId || 0)), getVisibleHuntingMapCapZoneId());
        const zones = Array.from({ length: highest + 1 }, (_, id) => getZone(id)).filter(zone => zone && zone.type === 'abyss');
        const current = zones.find(zone => Number(zone.id) === game.currentZoneId);
        const next = zones.find(zone => Number(zone.id) >= game.maxZoneId && Number(zone.id) !== game.currentZoneId);
        const rows = [];
        if (current) rows.push(row(`${_t('혼돈')} ${getAbyssDepthFromZoneId(current.id)}`, _t('현재'), battle()));
        if (next) rows.push(row(`${_t('혼돈')} ${getAbyssDepthFromZoneId(next.id)}`, _t('다음'), go(_t('이동'), `changeZone(${Number(next.id)})`)));
        const deep = getDeepChaosEntryState();
        if (deep.open) rows.push(row(_t('혼돈 심화층'), _t('입장 가능: 21 ~ {highestDepth}', { highestDepth: deep.highestDepth }), go(_t('층 골라 입장'), 'enterDeepChaosPrompt()')));
        return rows;
    }
    /** 아틀라스: 아틀라스 화면 맨 위의 다음 목표 카드(js/atlas-ui.js journey) 한 줄. 단추는 그 화면을 연 뒤 같은 일을 한다. */
    function atlasNext() {
        const next = typeof atlasUi.journey === 'function' ? atlasUi.journey() : null;
        if (!next) return [];
        return [row(_t(next.title), next.text ? _t(next.text) : '', go(_t(next.label), `explorationAtlasUi.enter('map-explore-worldtree');${next.action}`, { departure: false }))];
    }
    /** 우주계: 탐사 중이면 진행, 재도전 대기면 남은 초, 아니면 가장 먼 열린 은하의 탐사 출발(js/cosmos-atlas.js handleCosmosRouteAction). */
    function cosmos() {
        const route = game.cosmosRoute;
        if (cosmosRouteRuntime.active(game)) {
            const total = route.plan.flat().length;
            return [row(_t('{galaxy}은하 탐사 중', { galaxy: route.galaxy || 1 }), `${_t('탐사 {length}/{total}', { length: route.history.length, total })}`, battle())];
        }
        const retry = Math.ceil(cosmosRouteRuntime.retryRemaining(game) / 1000);
        if (retry) return [row(_t('재도전까지'), `${retry}${_t('초, 일반 사냥 가능')}`, null)];
        const galaxy = [5, 4, 3, 2, 1].find(id => cosmosRouteRuntime.unlocked(game, id)) || 1, plan = cosmosRouteRuntime.preview(game, galaxy);
        return [row(`${galaxy}${_t('은하')}`, _t('{length}구간, {length2}곳', { length: plan.plan.length, length2: plan.plan.flat().length }), go(_t('탐사 출발'), `handleCosmosRouteAction('start',${galaxy})`))];
    }

    const BRIEFS = Object.freeze({ 'map-explore-root-boss': bosses, 'map-explore-trials': trials, 'map-explore-labyrinth': labyrinth, 'map-explore-beehive': hive,
        'map-explore-voidrift': grand, 'map-explore-meteor': meteor, 'map-explore-timerift': timeRift, 'map-tab-ocean': ocean, 'map-tab-underworld': underworld,
        'map-tab-chaos-realm': chaosRealm, 'map-explore-chaos': chaos, 'map-explore-worldtree': atlasNext, 'map-tab-cosmos': cosmos, 'map-tab-sky': sky });

    function rowHtml({ name, meta, button }) {
        const press = button && !button.off ? ` onclick="${esc(button.action)}"${button.departure ? ' data-exploration-departure' : ''}` : ' disabled';
        return `<div class="wm-brief-row"><span><b>${esc(name)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</span>${button ? `<button type="button"${press}>${esc(button.label)}</button>` : ''}</div>`;
    }
    /** 한 자리의 바로 가기 묶음(머리글 없이 줄만, 사용자 11-09). 줄이 없으면 빈 글, 넘치면 끝에 +N. */
    function html(route) {
        const make = BRIEFS[route];
        const all = make ? make() : [], rows = all.slice(0, LIMIT), more = all.length - rows.length;
        if (!rows.length) return '';
        return `<div class="wm-brief">${rows.map(rowHtml).join('')}${more > 0 ? `<small class="wm-brief-more">+${more}</small>` : ''}</div>`;
    }
    return { html };
})();
safeExposeGlobals({ worldMapBrief });
