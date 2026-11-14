import { viewOpen, ledger, nodeName, selectedMap, panelOpen, flowerWallet, tierStyle, encounterNames } from './atlas-view-model.mjs';
import { mapCardHtml, flowersHtml, chancesHtml, runHtml, pinnacleHtml, stashToolsHtml, combineAllHtml, craftButtonHtml, legendHtml, chartHtml, deviceHtml, nodeDetailHtml, stashHtml, watchPanel, omenChipHtml } from './atlas-view-map.mjs';
import { resultHtml } from './atlas-view-results.mjs';

/** The views for the map window's second tab row: { select(id), items: [{ id, label, badge, on }] }. */
export function pages(runtime) {
    const free = runtime.deps.atlasPassives.spendable(runtime.deps.game), memories = runtime.deps.memoryDungeon.total(runtime.deps.game);
    const badges = { passives: free ? `+${free}` : '', memory: memories ? String(memories) : '' };
    return { select: runtime.handlers.setView, items: runtime.state.VIEW_TABS.filter(([id]) => viewOpen(runtime, id)).map(([id, label]) => ({ id, label, badge: badges[id], on: runtime.state.view === id })) };
}

/** The region banner's line: the open map, the lock, or the stones in hand. */
export function progressLine(runtime) {
    const st = ledger(runtime);
    if (st.run) return (0, runtime.deps._t)('열린 지도: {node}', { node: nodeName(runtime, st.run.map.node) });
    return (!st.unlocked && runtime.deps.atlas.lockReason(runtime.deps.game)) || (0, runtime.deps._t)('지도석 {length}개, 완료 {length2}곳', { length: st.stash.length, length2: st.completed.length });
}

export function headerHtml(runtime) {
    // 깨어난 아틀라스는 최종 보스와 리그 우두머리만큼 넓어진다(그 처치도 완료이자 아틀라스 포인트).
    const st = ledger(runtime), total = runtime.deps.atlas.nodes.length + (runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? runtime.deps.atlas.lateNodes.length : 0), free = runtime.deps.atlasPassives.spendable(runtime.deps.game);
    const stat = (label, value, tone) => `<span class="atlas-stat" style="--stat-tone:${tone}">${label} <b>${value}</b></span>`;
    const stats = stat('완료', `${st.completed.length}/${total}`, '#d9b066') + stat('보너스', st.bonus.length, '#9fd46a')
        + stat('씨앗', `${st.seeds}/${runtime.deps.ATLAS.seeds.max}`, '#c9a0f0') + stat('포인트', `${runtime.deps.atlas.points(runtime.deps.game)}${free ? (0, runtime.deps._t)(' (남음 {free})', { free }) : ''}`, '#7fd6cf');
    return `<header class="atlas-head"><span class="atlas-stats">${stats}</span>
            <label class="atlas-auto" data-tip="${(0, runtime.deps._t)('완료하면 같은 등급 이하에서 다음 지도석을 연다')}"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${(0, runtime.deps._t)('자동 지도')}</span>
            <small>${(0, runtime.deps._t)('완료하면 같은 등급 이하에서 다음 지도석을 연다')}</small></label></header>`;
}

/** Navigation only: preparing a suggested map never spends its stone or starts combat. */
export function huntingJourneyAction(runtime) {
    const highest = Math.min(runtime.deps.game.maxZoneId, (0, runtime.deps.getVisibleHuntingMapCapZoneId)());
    const chaos = highest >= (0, runtime.deps.getAbyssZoneIdForDepth)(1) || (0, runtime.deps.getDeepChaosEntryState)().open;
    return { action: `switchMapExploreSubtab('${chaos ? 'map-explore-chaos' : 'map-explore-hunting'}')`,
        label: chaos ? '혼돈 지도 보기' : '일반 사냥터 보기' };
}

export function mapJourney(runtime) {
    const stash = ledger(runtime).stash, guardians = stash.filter(map => runtime.deps.atlas.node(map.node)?.kind === 'guardian');
    const missing = guardians.find(map => { const ticket = runtime.deps.atlas.node(map.node).ticket; return !ticket || !runtime.deps.game.currencies[ticket]; });
    if (missing) return { title: (0, runtime.deps._t)('수호자 지도석 준비됨'), text: (0, runtime.deps._t)('{node} {tier}등급', { node: nodeName(runtime, missing.node), tier: missing.tier }),
        action: `atlasUi.selectMap(${missing.uid},true)`, label: (0, runtime.deps._t)('수호자 준비 보기') };
    const maps = [...stash].sort((a, b) => a.tier - b.tier || a.uid - b.uid), map = selectedMap(runtime) || maps[0];
    if (map) return { title: (0, runtime.deps._t)('지도석 {length}개 준비됨', { length: stash.length }), text: (0, runtime.deps._t)('{node} {tier}등급', { node: nodeName(runtime, map.node), tier: map.tier }),
        action: `atlasUi.selectMap(${map.uid},true)`, label: (0, runtime.deps._t)('지도 준비 보기') };
    return { title: (0, runtime.deps._t)('다음 지도석 모으기'), text: (0, runtime.deps._t)('혼돈 20 이상 보스가 지도석을 줍니다.'),
        ...huntingJourneyAction(runtime) };
}

export function journeyState(runtime) {
    const st = ledger(runtime), lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    if (st.run) return { title: (0, runtime.deps._t)('열린 지도 진행 중'), text: (0, runtime.deps._t)('{node}, 남은 포털 {portals}개', { node: nodeName(runtime, st.run.map.node), portals: st.run.portals }),
        action: 'atlasUi.revealDevice()', label: (0, runtime.deps._t)('열린 지도 보기') };
    if (lock) return { title: (0, runtime.deps._t)('이번 루프의 입장 준비'), text: lock,
        ...huntingJourneyAction(runtime) };
    if (st.seeds >= runtime.deps.ATLAS.seeds.max) return { title: (0, runtime.deps._t)('씨앗을 모두 모았습니다'), text: '',
        action: "atlasUi.setView('late')", label: (0, runtime.deps._t)('최종 보스 보기'), epoch: true };
    if (runtime.deps.ATLAS.pinnacle.tickets.every(key => runtime.deps.game.currencies[key] >= 1)) return { title: (0, runtime.deps._t)('정점 입장권 4종 준비됨'),
        text: '',
        action: "atlasUi.selectNode('pinnacle',true)", label: (0, runtime.deps._t)('정점 준비 보기') };
    return mapJourney(runtime);
}

export function journeyHtml(runtime) {
    const next = journeyState(runtime);
    return `<section class="atlas-journey" aria-label="${(0, runtime.deps._t)('아틀라스 다음 목표')}"><div><h3>${(0, runtime.deps._t)(next.title)}</h3>${next.text ? `<p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(next.text))}</p>` : ''}</div>
            <div class="atlas-actions"><button class="atlas-primary" onclick="${next.action}">${(0, runtime.deps._t)(next.label)}</button>${next.epoch ? `<button onclick="atlasUi.setView('epoch')">${(0, runtime.deps._t)('시대 재생 비교')}</button>` : ''}</div></section>`;
}

export function autoOptionsHtml(runtime) {
    const st = ledger(runtime);
    if (!st.autoMap) return '';
    const stop = runtime.deps.game.settings.mapCompleteAction === 'stop';
    return `<section class="atlas-auto-options" aria-label="${(0, runtime.deps._t)('자동 지도 설정')}"><label><input type="checkbox" ${st.autoGuardians ? 'checked' : ''} onchange="atlasUi.toggleAutoGuardians(this.checked)">${(0, runtime.deps._t)('수호자 지도 포함')}</label>
            ${stop ? (0, runtime.deps._t)('<p>완료 후 멈춤 설정으로 자동 지도가 대기 중입니다.</p>') : ''}
            ${stop ? (0, runtime.deps._t)('<button onclick="openMapCompleteActionPicker(event)">완료 후 행동 변경</button>') : ''}</section>`;
}

/** 한 장 시험판(js/atlas-sheet-ui.js)에 건네는 것: 고른 노드와 지도석, 열 수 없는 까닭, 이미 만든 조각(열린 지도나 정점이나 지도석 카드, 보관함 도구, 결과). */
export function sheetParts(runtime) {
    const st = ledger(runtime), map = selectedMap(runtime), node = runtime.deps.atlas.node(runtime.state.selectedNode), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), block = runtime.deps.atlasRun.blockReason();
    const card = map ? `<section class="atlas-device" aria-label="${(0, runtime.deps._t)('지도 장치')}">${mapCardHtml(runtime, map, (0, runtime.deps.buildMapPowerEstimateHtml)(runtime.deps.atlas.preview(runtime.deps.game, map)))}
            <div class="atlas-crafts" aria-label="${(0, runtime.deps._t)('지도석 제작')}">${runtime.state.CRAFT_ORDER.map(key => craftButtonHtml(runtime, map, key)).join('')}</div>${flowersHtml(runtime, map)}${chancesHtml(runtime)}</section>` : '';
    const side = st.run ? runHtml(runtime, st.run) : node && node.kind === 'pinnacle' ? pinnacleHtml(runtime, node) : card;
    const tools = map ? `${stashToolsHtml(runtime, map, busy)}${busy ? `<small>${busy}</small>` : ''}` : `<div class="atlas-stash-tools">${combineAllHtml(runtime)}</div>`;
    return { node: runtime.state.selectedNode, uid: runtime.state.selectedUid, lock: runtime.deps.atlas.lockReason(runtime.deps.game) || block, block, side, tools, after: `${autoOptionsHtml(runtime)}${resultHtml(runtime)}`, mapName: runtime.handlers.mapName };
}

export function mapsViewHtml(runtime) {
    if (runtime.deps.atlasSheetUi.on()) return runtime.deps.atlasSheetUi.html(sheetParts(runtime));
    return `${journeyHtml(runtime)}<div class="atlas-ancient-entry"><button onclick="atlasUi.setView('late')">${(0, runtime.deps._t)('태양과 달, 피나클')}</button></div>${autoOptionsHtml(runtime)}<div class="atlas-main"><div class="atlas-chart-column">${legendHtml(runtime)}${chartHtml(runtime)}</div><div class="atlas-side">${ledger(runtime).run ? runHtml(runtime, ledger(runtime).run) : deviceHtml(runtime)}${nodeDetailHtml(runtime)}</div></div>
            ${resultHtml(runtime)}${stashHtml(runtime)}`;
}

export function render(runtime) {
    runtime.deps.atlasEndgameUi.noticeAwakened(); // every static refresh, panel open or not (the card follows the state)
    const panel = runtime.deps.document.getElementById('ui-atlas');
    if (!panel || !panelOpen(runtime)) return;
    runtime.deps.atlas.sync(runtime.deps.game);
    runtime.deps.atlasBoard.sync(runtime.deps.game);
    const wallet = [...[...runtime.state.CRAFT_ORDER, ...runtime.deps.ATLAS.pinnacle.tickets].map(key => runtime.deps.game.currencies[key] || 0), ...flowerWallet(runtime)];
    if (!viewOpen(runtime, runtime.state.view)) runtime.state.view = 'maps'; // 다른 저장을 불러와 원정이 닫힌 뒤
    const key = JSON.stringify([runtime.deps.atlasSheetUi.on(), runtime.state.view, runtime.state.selectedRegion, ledger(runtime), runtime.state.selectedNode, runtime.state.selectedUid, wallet, runtime.deps.atlasRun.blockReason(), runtime.deps.game.currentZoneId, runtime.deps.game.maxZoneId, runtime.deps.game.settings.mapCompleteAction, (0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game)]);
    if (key === runtime.state.signature && panel.innerHTML) return;
    runtime.state.signature = key;
    const lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    panel.innerHTML = `<div class="atlas-shell">${runtime.deps.atlasSheetUi.on() ? (runtime.state.view === 'maps' ? '' : runtime.deps.atlasSheetUi.top(false)) : headerHtml(runtime)}${lock && !ledger(runtime).unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            ${runtime.state.VIEWS[runtime.state.view]()}</div>`;
    runtime.state.PAINT[runtime.state.view]();
    watchPanel(runtime, panel);
}

/** The map's kind chip: its rarity in the rarity's colour, a memory step, or the fight it opens. */
export function hudKindHtml(runtime, run) {
    const special = run.map.memory ? (0, runtime.deps._t)('기억 {memory}단계', { memory: run.map.memory }) : runtime.state.RUN_KIND[runtime.deps.atlas.node(run.map.node)?.kind];
    if (special) return `<span class="atlas-hud-chip">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(special))}</span>`;
    return `<span class="atlas-hud-chip rarity-${run.map.rarity}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.ATLAS.rarities[run.map.rarity].name))}</span>`;
}

/** Portals left as lit pips out of the run's portals (a ring map has none: losing or leaving ends it). */
export function hudPortalsHtml(runtime, run) {
    if (run.board) return `<span class="atlas-hud-chip">${(0, runtime.deps._t)('포털 없음')}</span>`;
    const total = runtime.deps.ATLAS.portals + run.bonus.portals, tip = (0, runtime.deps._t)('포털 {portals}/{value}', { portals: run.portals, value: total });
    const pips = Array.from({ length: total }, (_, index) => `<i${index < run.portals ? ' class="is-on"' : ''}></i>`).join('');
    return `<span class="atlas-hud-chip atlas-hud-portals" data-tip="${(0, runtime.deps.escapeHTML)(tip)}"><small>${(0, runtime.deps._t)('포털')}</small>${pips}</span>`;
}

export function updateHud(runtime, zone) {
    const host = runtime.deps.document.getElementById('ui-atlas-combat');
    if (!host) return;
    // The settlement pause still shows the cleared map; the next map's HUD waits until the hero enters it.
    const run = ledger(runtime).run, show = !!run && zone && zone.type === 'atlasMap' && !runtime.deps.actExplorationState.current(runtime.deps.game)?.departure;
    host.toggleAttribute('hidden', !show);
    if (!show) { runtime.state.hudSignature = ''; return; }
    const key = JSON.stringify([run.map.uid, run.portals, run.encounters]);
    if (key === runtime.state.hudSignature) return;
    runtime.state.hudSignature = key;
    // 지도 이름은 위의 지역 이름과 같고, 주운 지도석과 각인 수는 싸우는 동안 볼 일이 없다(2026-11-06 사용자): 등급, 종류, 방, 징조, 포털만.
    const rooms = run.encounters.map(type => `<span class="atlas-hud-chip is-room">${(0, runtime.deps.escapeHTML)(encounterNames(runtime, [type], run.golden || []))}</span>`).join('');
    host.innerHTML = `<span class="atlas-hud-chip atlas-hud-tier" style="${tierStyle(runtime, run.map.tier)}">${(0, runtime.deps._t)('{tier}등급', { tier: run.map.tier })}</span>${hudKindHtml(runtime, run)}${rooms}${omenChipHtml(runtime, run.map)}${hudPortalsHtml(runtime, run)}
            <button type="button" class="combat-action-btn" onclick="atlasUi.openPanel()">${(0, runtime.deps._t)('아틀라스')}</button>`;
}
