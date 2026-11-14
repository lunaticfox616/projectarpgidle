export function buttonOf(runtime, button) {
    if (!button) return null;
    const action = button.getAttribute('onclick') || '';
    return go(runtime, button.textContent.trim(), action, { off: button.disabled || !action, departure: button.hasAttribute('data-exploration-departure') });
}

export function cardRows(runtime, host, card, pick) {
    return [...runtime.deps.document.querySelectorAll(`${host} ${card}`)].map(node => row(runtime, text(runtime, node.querySelector(pick.name)), text(runtime, node.querySelector(pick.state)), buttonOf(runtime, node.querySelector(pick.button))));
}

/** 강대한 적: 목록의 카드(선행 조건을 채운 보스만, 약한 순) 가운데 지금 도전할 수 있는 보스를 앞에. */
export function bosses(runtime) {
    const rows = cardRows(runtime, '#ui-season-boss-list', '.map-boss-card', { name: '.map-boss-title strong', state: '.map-boss-foot span', button: '.map-boss-foot button' });
    return rows.sort((a, b) => Number(live(runtime, b)) - Number(live(runtime, a)));
}

export function trials(runtime) {
    return cardRows(runtime, '#ui-trial-list', '.encounter-card', { name: '.encounter-heading strong', state: '.encounter-footer span', button: '.encounter-footer button' });
}

export function labyrinth(runtime) {
    const max = Math.max(1, Math.floor(runtime.deps.game.labyrinthUnlockedMaxFloor || runtime.deps.game.labyrinthFloor || 1));
    if (inZone(runtime, runtime.deps.LABYRINTH_ZONE_ID)) return [row(runtime, (0, runtime.deps._t)('{n}층', { n: runtime.deps.game.labyrinthFloor }), (0, runtime.deps._t)('탐험 중'), battle(runtime))];
    const blocked = (0, runtime.deps.getZoneTravelBlockReason)(runtime.deps.LABYRINTH_ZONE_ID) || (0, runtime.deps.getHeldRunBlockReason)();
    return [row(runtime, (0, runtime.deps._t)('입장 가능 1 ~ {max}층', { max }), blocked || '', go(runtime, (0, runtime.deps._t)('{n}층 입장', { n: max }), `enterLabyrinthFloor(${max})`, { off: !!blocked }))];
}

export function hive(runtime) {
    const b = runtime.deps.game.beehive, keys = Math.max(0, runtime.deps.game.currencies.hiveKey || 0);
    if (b.inRun) return [row(runtime, b.queenActive ? (0, runtime.deps._t)('여왕벌 전투') : (0, runtime.deps._t)('갈림길 {n}/10', { n: Math.min(10, b.branchStep) }), (0, runtime.deps._t)('원정 중'), battle(runtime))];
    return [row(runtime, (0, runtime.deps._t)('벌집 원정'), `${(0, runtime.deps._t)('벌집 열쇠')} ${(0, runtime.deps._t)('{n}개', { n: keys })}`, go(runtime, (0, runtime.deps._t)('입장'), 'startBeehiveRun()', { off: keys <= 0 }))];
}

export function grand(runtime) {
    const rift = runtime.deps.game.voidRift;
    if (rift.grandRun?.inRun) return [row(runtime, (0, runtime.deps._t)('대균열'), (0, runtime.deps._t)('진행 중'), battle(runtime))];
    const hint = rift.grandBreachUnlock ? (0, runtime.deps._t)('열림') : (0, runtime.deps._t)('공허 균열 완료 시 {pct}% 확률로 열립니다.', { pct: Math.round(runtime.deps.GRAND_BREACH_ENCOUNTER.unlockChance * 100) });
    return [row(runtime, (0, runtime.deps._t)('대균열'), hint, go(runtime, (0, runtime.deps._t)('입장'), 'enterGrandBreach()', { off: !rift.grandBreachUnlock }))];
}

export function meteor(runtime) {
    if (runtime.deps.game.currentZoneId === runtime.deps.METEOR_FALL_ZONE_ID) return [row(runtime, (0, runtime.deps._t)('운석 원정 진행 중'), '', battle(runtime))];
    const ready = runtime.deps.game.meteorSite.skyRiftReady, kind = ready ? (0, runtime.deps.getMeteorKind)() : null;
    const name = ready ? (0, runtime.deps._t)('원정 준비 완료') : (0, runtime.deps._t)('하늘의 균열 충전 {pct}%', { pct: Math.min(100, Math.floor(runtime.deps.game.meteorSite.skyRiftGauge || 0)) });
    return [row(runtime, name, kind ? (0, runtime.deps._t)(kind.name) : '', go(runtime, (0, runtime.deps._t)('입장'), `changeZone('${runtime.deps.METEOR_FALL_ZONE_ID}')`, { off: !ready }))];
}

export function timeRift(runtime) {
    const rift = (0, runtime.deps.ensureTimeRiftState)(), issue = (0, runtime.deps.getTimeRiftFutureEntryReason)(rift);
    const past = runtime.deps.game.currentZoneId === runtime.deps.TIME_RIFT_PAST_ZONE_ID ? battle(runtime) : go(runtime, (0, runtime.deps._t)('입장'), `changeZone('${runtime.deps.TIME_RIFT_PAST_ZONE_ID}')`, { off: !!rift.altarOpen });
    const future = runtime.deps.game.currentZoneId === runtime.deps.TIME_RIFT_FUTURE_ZONE_ID ? battle(runtime) : go(runtime, (0, runtime.deps._t)('입장'), `changeZone('${runtime.deps.TIME_RIFT_FUTURE_ZONE_ID}')`, { off: !!issue });
    return [row(runtime, (0, runtime.deps._t)('과거'), rift.altarOpen ? (0, runtime.deps._t)('제단 개방 완료') : `${(0, runtime.deps._t)('시간압')} ${rift.pressure}`, past), row(runtime, (0, runtime.deps._t)('미래'), issue || (0, runtime.deps._t)('융합 준비 완료'), future)];
}

export function ocean(runtime) {
    const st = (0, runtime.deps.ensureOceanState)();
    if (st.diving) {
        const back = runtime.deps.game.currentZoneId === runtime.deps.OCEAN_ZONE_ID ? battle(runtime) : go(runtime, (0, runtime.deps._t)('심해로 돌아가기'), 'changeZone(OCEAN_ZONE_ID)');
        return [row(runtime, (0, runtime.deps._t)('현재 {depth}m', { depth: Math.floor(st.depthM) }), (0, runtime.deps._t)('잠수 중'), back)];
    }
    const rows = [row(runtime, (0, runtime.deps._t)('잠수 시작'), (0, runtime.deps._t)('{checkpointM}m부터', { checkpointM: st.checkpointM }), go(runtime, (0, runtime.deps._t)('잠수'), 'oceanDiveUi.startDive()'))];
    const lift = (0, runtime.deps.getOceanShallowLiftM)(st);
    if (lift !== null) rows.push(row(runtime, (0, runtime.deps._t)('얕게 잠수'), (0, runtime.deps._t)('{lift}m부터', { lift }), go(runtime, (0, runtime.deps._t)('잠수'), 'oceanDiveUi.startDive(true)')));
    return rows;
}

export function underworld(runtime) {
    const progress = runtime.deps.game.underworldProgress || {}, highest = Math.max(1, Math.floor(progress.highestFloor || 1)), open = (0, runtime.deps.canEnterUnderworld)();
    if (inZone(runtime, runtime.deps.UNDERWORLD_ZONE_ID)) return [row(runtime, (0, runtime.deps._t)('{floor}층', { floor: Math.max(1, Math.floor(progress.currentFloor || 1)) }), (0, runtime.deps._t)('탐험 중'), battle(runtime))];
    const rows = [row(runtime, (0, runtime.deps._t)('최고 개방 {highest}층', { highest }), open ? '' : (0, runtime.deps.getUnderworldEntryLockReason)(runtime.deps.game), go(runtime, (0, runtime.deps._t)('{highest}층 입장', { highest }), `enterUnderworldFloor(${highest})`, { off: !open }))];
    if (open && highest > 1) rows.push(row(runtime, (0, runtime.deps._t)('다른 층…'), '', go(runtime, (0, runtime.deps._t)('선택'), 'enterUnderworldPrompt()')));
    return rows;
}

export function sky(runtime) {
    const tower = runtime.deps.game.skyTower;
    if (inZone(runtime, runtime.deps.SKY_TOWER_ZONE_ID)) return [row(runtime, (0, runtime.deps._t)('{floor}층', { floor: tower.currentFloor }), (0, runtime.deps._t)('탐험 중'), battle(runtime))];
    const meta = (0, runtime.deps._t)('이번 루프 남은 보상 전투: {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', {
        skyTowerRemainingClears: (0, runtime.deps.getSkyTowerRemainingClears)(), skyTowerLoopClearLimit: (0, runtime.deps.getSkyTowerLoopClearLimit)()
    });
    return [row(runtime, (0, runtime.deps._t)('최고 입장 {highest}층', { highest: tower.highestFloor }), meta, go(runtime, (0, runtime.deps._t)('층 골라 입장'), 'enterSkyTowerPrompt()', { off: !(0, runtime.deps.canEnterSkyTower)() }))];
}

export function chaosRealm(runtime) {
    const st = (0, runtime.deps.ensureChaosRealmState)(), highest = Math.max(1, Math.floor(st.highestFloor || 1));
    if (inZone(runtime, runtime.deps.CHAOS_REALM_ZONE_ID)) return [row(runtime, (0, runtime.deps._t)('{floor}층', { floor: Math.max(1, Math.floor(st.currentFloor || 1)) }), (0, runtime.deps._t)('탐험 중'), battle(runtime))];
    const ready = !!st.unlocked && (0, runtime.deps.canEnterChaosRealm)();
    return [row(runtime, (0, runtime.deps._t)('최고 입장 {highest}층', { highest }), (0, runtime.deps._t)('클리어 {length}층', { length: (st.clearedFloors || []).length }), go(runtime, (0, runtime.deps._t)('층 골라 입장'), 'enterChaosRealmPrompt()', { off: !ready }))];
}

/** 혼돈: 지금 있는 층, 다음 층(완료는 maxZoneId 앞, js/map-list-ui.js factsOf), 열린 심화층. */
export function chaos(runtime) {
    const highest = Math.min(Math.max(0, Math.floor(runtime.deps.game.maxZoneId || 0)), (0, runtime.deps.getVisibleHuntingMapCapZoneId)());
    const zones = Array.from({ length: highest + 1 }, (_, id) => (0, runtime.deps.getZone)(id)).filter(zone => zone && zone.type === 'abyss');
    const current = zones.find(zone => Number(zone.id) === runtime.deps.game.currentZoneId);
    const next = zones.find(zone => Number(zone.id) >= runtime.deps.game.maxZoneId && Number(zone.id) !== runtime.deps.game.currentZoneId);
    const rows = [];
    if (current) rows.push(row(runtime, `${(0, runtime.deps._t)('혼돈')} ${(0, runtime.deps.getAbyssDepthFromZoneId)(current.id)}`, (0, runtime.deps._t)('현재'), battle(runtime)));
    if (next) rows.push(row(runtime, `${(0, runtime.deps._t)('혼돈')} ${(0, runtime.deps.getAbyssDepthFromZoneId)(next.id)}`, (0, runtime.deps._t)('다음'), go(runtime, (0, runtime.deps._t)('이동'), `changeZone(${Number(next.id)})`)));
    const deep = (0, runtime.deps.getDeepChaosEntryState)();
    if (deep.open) rows.push(row(runtime, (0, runtime.deps._t)('혼돈 심화층'), (0, runtime.deps._t)('입장 가능: 21 ~ {highestDepth}', { highestDepth: deep.highestDepth }), go(runtime, (0, runtime.deps._t)('층 골라 입장'), 'enterDeepChaosPrompt()')));
    return rows;
}

/** 아틀라스: 아틀라스 화면 맨 위의 다음 목표 카드(js/atlas-ui.js journey) 한 줄. 단추는 그 화면을 연 뒤 같은 일을 한다. */
export function atlasNext(runtime) {
    const next = typeof runtime.deps.atlasUi.journey === 'function' ? runtime.deps.atlasUi.journey() : null;
    if (!next) return [];
    return [row(runtime, (0, runtime.deps._t)(next.title), next.text ? (0, runtime.deps._t)(next.text) : '', go(runtime, (0, runtime.deps._t)(next.label), `explorationAtlasUi.enter('map-explore-worldtree');${next.action}`, { departure: false }))];
}

/** 우주계: 탐사 중이면 진행, 재도전 대기면 남은 초, 아니면 가장 먼 열린 은하의 탐사 출발(js/cosmos-atlas.js handleCosmosRouteAction). */
export function cosmos(runtime) {
    const route = runtime.deps.game.cosmosRoute;
    if (runtime.deps.cosmosRouteRuntime.active(runtime.deps.game)) {
        const total = route.plan.flat().length;
        return [row(runtime, (0, runtime.deps._t)('{galaxy}은하 탐사 중', { galaxy: route.galaxy || 1 }), `${(0, runtime.deps._t)('탐사 {length}/{total}', { length: route.history.length, total })}`, battle(runtime))];
    }
    const retry = Math.ceil(runtime.deps.cosmosRouteRuntime.retryRemaining(runtime.deps.game) / 1000);
    if (retry) return [row(runtime, (0, runtime.deps._t)('재도전까지'), `${retry}${(0, runtime.deps._t)('초, 일반 사냥 가능')}`, null)];
    const galaxy = [5, 4, 3, 2, 1].find(id => runtime.deps.cosmosRouteRuntime.unlocked(runtime.deps.game, id)) || 1, plan = runtime.deps.cosmosRouteRuntime.preview(runtime.deps.game, galaxy);
    return [row(runtime, `${galaxy}${(0, runtime.deps._t)('은하')}`, (0, runtime.deps._t)('{length}구간, {length2}곳', { length: plan.plan.length, length2: plan.plan.flat().length }), go(runtime, (0, runtime.deps._t)('탐사 출발'), `handleCosmosRouteAction('start',${galaxy})`))];
}

export function rowHtml(runtime, { name, meta, button }) {
    const press = button && !button.off ? ` onclick="${esc(runtime, button.action)}"${button.departure ? ' data-exploration-departure' : ''}` : ' disabled';
    return `<div class="wm-brief-row"><span><b>${esc(runtime, name)}</b>${meta ? `<small>${esc(runtime, meta)}</small>` : ''}</span>${button ? `<button type="button"${press}>${esc(runtime, button.label)}</button>` : ''}</div>`;
}

/** 한 자리의 바로 가기 묶음(머리글 없이 줄만, 사용자 11-09). 줄이 없으면 빈 글, 넘치면 끝에 +N. */
export function html(runtime, route) {
    const make = runtime.state.BRIEFS[route];
    const all = make ? make() : [], rows = all.slice(0, runtime.state.LIMIT), more = all.length - rows.length;
    if (!rows.length) return '';
    return `<div class="wm-brief">${rows.map(runtime.handlers.rowHtml).join('')}${more > 0 ? `<small class="wm-brief-more">+${more}</small>` : ''}</div>`;
}

export function esc(runtime, value) { return (0, runtime.deps.escapeHTML)(String(value ?? '')); }

export function go(runtime, label, action, { off = false, departure = true } = {}) { return { label, action, off, departure }; }

export function battle(runtime) { return go(runtime, (0, runtime.deps._t)('전투'), "switchTab('tab-battle')", { departure: false }); }

export function row(runtime, name, meta, button) { return { name, meta, button }; }

export function inZone(runtime, id) { return runtime.deps.game.currentZoneId === id && !runtime.deps.game.combatHalted; }

export function text(runtime, node) { return node ? [...node.childNodes].filter(child => child.tagName !== 'SMALL').map(child => child.textContent).join('').trim() : ''; }

export function live(runtime, entry) { return !!entry.button && !entry.button.off; }
