import { showWheelHub } from './atlas-wheel-hub.mjs';
import { atlasChallenges } from '../data/atlas-challenges.mjs';
import { viewOpen, ledger, nodeName, selectedMap, panelOpen, flowerWallet, mapTierStyle, encounterNames, mapName, stonesForNode, stoneForNode, runningNode, tierLabel, chartRun } from './atlas-view-model.mjs';
import { omenChipHtml } from './atlas-view-map.mjs';
import { pickCardHtml, goHtml } from './atlas-view-pick.mjs';
import { stashCardHtml } from './atlas-view-stash.mjs';
import { progressCardHtml } from './atlas-view-progress.mjs';

/** The views for the map window's second tab row: { select(id), items: [{ id, label, badge, on }] }. */
export function pages(runtime) {
    const free = runtime.deps.atlasPassives.available(runtime.deps.game), memories = runtime.deps.memoryDungeon.total(runtime.deps.game);
    const badges = { passives: free ? `+${free}` : '', memory: memories ? String(memories) : '' };
    return { select: runtime.handlers.setView, items: runtime.state.VIEW_TABS.filter(([id]) => viewOpen(runtime, id)).map(([id, label]) => ({ id, label, badge: badges[id], on: runtime.state.view === id })) };
}

/** The region banner's line: the open map, the lock, or the stones in hand. */
export function progressLine(runtime) {
    const st = ledger(runtime);
    if (st.run) return (0, runtime.deps._t)('열린 지도: {node}', { node: nodeName(runtime, st.run.map.node) });
    return (!st.unlocked && runtime.deps.atlas.lockReason(runtime.deps.game)) || (0, runtime.deps._t)('지침 {length}개, 완료 {length2}곳', { length: st.stash.length, length2: st.completed.length });
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
    if (missing) return { title: (0, runtime.deps._t)('수호자 지침 준비됨'), text: (0, runtime.deps._t)('{node} {tier}등급', { node: nodeName(runtime, missing.node), tier: missing.tier }),
        action: `atlasUi.selectMap(${missing.uid},true)`, label: (0, runtime.deps._t)('수호자 준비 보기') };
    const maps = [...stash].sort((a, b) => a.tier - b.tier || a.uid - b.uid), map = selectedMap(runtime) || maps[0];
    if (map) return { title: (0, runtime.deps._t)('지침 {length}개 준비됨', { length: stash.length }), text: mapName(runtime, map),
        action: `atlasUi.selectMap(${map.uid},true)`, label: (0, runtime.deps._t)('지도 준비 보기') };
    return { title: (0, runtime.deps._t)('다음 지침 모으기'), text: (0, runtime.deps._t)('혼돈 20 이상 보스가 지침을 줍니다.'),
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
    if (!runtime.deps.atlas.pinnacleReason(runtime.deps.game)) return { title: (0, runtime.deps._t)('정점 입장권 4종 준비됨'),
        text: '',
        action: `atlasUi.selectNode('${runtime.deps.atlas.gateOf('pinnacle').id}',true)`, label: (0, runtime.deps._t)('정점 준비 보기') };
    return mapJourney(runtime);
}

/** 지도 쪽: 천문도(atlasSheetUi)와 그 아래 띠(고른 것, 지침 보관함, 진행, 주 단추). */
export function mapsViewHtml(runtime) {
    const chart = runtime.deps.atlasSheetUi.chart({ node: runtime.state.selectedNode, held: node => stonesForNode(runtime, node).length > 0 });
    return `<div class="atlas-sheet"><div class="as-chart-box">${chart}</div><div class="as-band">${pickCardHtml(runtime)}${stashCardHtml(runtime)}${progressCardHtml(runtime)}${goHtml(runtime)}</div></div>`;
}

/** 고른 것이 없으면 하나를 고른다: 열린 탐사의 자리, 꺼진 시작 육분의, 지침이 있는 열린 지도(높은 등급부터), 열린 지도, 시작 육분의 차례.
 * 지도를 골랐으면 그 지도에 맞는 지침을 스스로 쥔다: 지도를 마친 뒤 받은 지침, 쓰거나 버려 사라진 지침도 다시 맞춘다. */
export function keepStonePick(runtime) {
    if (!runtime.state.selectedNode) runtime.state.selectedNode = defaultPick(runtime);
    const node = runtime.deps.atlas.node(runtime.state.selectedNode);
    if (node && !ledger(runtime).run) runtime.state.selectedUid = stoneForNode(runtime, node)?.uid ?? null;
}

export function defaultPick(runtime) {
    const atlas = runtime.deps.atlas, game = runtime.deps.game, run = ledger(runtime).run;
    if (run) return runningNode(runtime);
    if (game.atlas.sextant !== true) return 'entry';
    const open = atlas.nodes.filter(node => node.kind === 'map' && atlas.status(game, node.id) === 'open').sort((a, b) => b.tier - a.tier);
    return (open.find(node => stonesForNode(runtime, node).length) || open[0])?.id || 'entry';
}

export function render(runtime) {
    runtime.deps.atlasEndgameUi.noticeAwakened(); // every static refresh, panel open or not (the card follows the state)
    const panel = runtime.deps.document.getElementById('ui-atlas');
    if (!panel || !panelOpen(runtime)) return;
    runtime.deps.atlas.sync(runtime.deps.game);
    runtime.deps.atlasBoard.sync(runtime.deps.game);
    const wallet = [...[...runtime.state.CRAFT_ORDER, ...runtime.deps.ATLAS.pinnacle.tickets].map(key => runtime.deps.game.currencies[key] || 0), ...flowerWallet(runtime)];
    if (!viewOpen(runtime, runtime.state.view)) runtime.state.view = 'maps'; // 다른 저장을 불러와 원정이 닫힌 뒤
    keepStonePick(runtime);
    const key = JSON.stringify([runtime.state.view, ledger(runtime), runtime.state.selectedNode, runtime.state.selectedUid, runtime.state.useDew, runtime.state.craftOpen, runtime.state.progressFace, wallet, runtime.deps.atlasRun.blockReason(), runtime.deps.game.currentZoneId, runtime.deps.game.maxZoneId, runtime.deps.game.settings.mapCompleteAction, (0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game)]);
    if (key === runtime.state.signature && panel.innerHTML) return;
    runtime.state.signature = key;
    const lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    panel.innerHTML = `<div class="atlas-shell">${lock && !ledger(runtime).unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            ${runtime.state.VIEWS[runtime.state.view]()}</div>`;
    if (runtime.state.view === 'maps') runtime.deps.atlasSheetUi.settle();
    watchPanel(runtime, panel);
}

/** 천문도는 창 너비를 따른다: 휴대폰에서 옆으로 민 천문도가 처음 보일 때(보이지 않는 탭에서 그려 너비가 0이었다) 고른 곳을 가운데로 세운다. */
export function watchPanel(runtime, panel) {
    if (runtime.state.panelObserver || typeof runtime.deps.ResizeObserver !== 'function') return;
    runtime.state.panelObserver = new runtime.deps.ResizeObserver(() => { if (panelOpen(runtime) && runtime.state.view === 'maps') runtime.deps.atlasSheetUi.settle(); });
    runtime.state.panelObserver.observe(panel);
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
    const total = runtime.deps.atlas.portalCap(run), tip = (0, runtime.deps._t)('포털 {portals}/{value}', { portals: run.portals, value: total });
    const pips = Array.from({ length: total }, (_, index) => `<i${index < run.portals ? ' class="is-on"' : ''}></i>`).join('');
    return `<span class="atlas-hud-chip atlas-hud-portals" data-tip="${(0, runtime.deps.escapeHTML)(tip)}"><small>${(0, runtime.deps._t)('포털')}</small>${pips}</span>`;
}

export function updateHud(runtime, zone) {
    const host = runtime.deps.document.getElementById('ui-atlas-combat');
    if (!host) return;
    if (showWheelHub(runtime, host)) return;
    // The settlement pause still shows the cleared map; the next map's HUD waits until the hero enters it.
    const run = ledger(runtime).run, show = !!run && zone && zone.type === 'atlasMap' && !runtime.deps.actExplorationState.current(runtime.deps.game)?.departure;
    host.toggleAttribute('hidden', !show);
    if (!show) { runtime.state.hudSignature = ''; return; }
    const field = fieldObjective(runtime,run);
    const key = JSON.stringify([run.map.uid, run.portals, run.encounters, field]);
    if (key === runtime.state.hudSignature) return;
    runtime.state.hudSignature = key;
    // 지도 이름은 위의 지역 이름과 같고, 주운 지도석과 각인 수는 싸우는 동안 볼 일이 없다(2026-11-06 사용자): 등급, 종류, 방, 징조, 포털만.
    const fieldChip = fieldMarkup(runtime,zone,field);
    const rooms = run.encounters.map(type => encounterChip(runtime, run, type)).join('') + fieldChip;
    host.innerHTML = `<span class="atlas-hud-chip atlas-hud-tier" style="${mapTierStyle(runtime, run.map)}">${tierLabel(runtime, run.map.tier, chartRun(runtime, run))}</span>${hudKindHtml(runtime, run)}${rooms}${omenChipHtml(runtime, run.map)}${hudPortalsHtml(runtime, run)}
            <button type="button" class="combat-action-btn" onclick="atlasUi.openPanel()">${(0, runtime.deps._t)('아틀라스')}</button>`;
    host.querySelector('[data-atlas-passage]')?.addEventListener('click', () => walkToPassage(runtime));
}

function fieldMarkup(runtime,zone,field) {
    if (!field) return '';
    const label = runtime.deps.escapeHTML(field);
    return zone.pocket ? '<span class="atlas-hud-chip is-room">'+label+'</span>' :
        '<button type="button" class="combat-action-btn" data-atlas-passage>'+label+'</button>';
}

function walkToPassage(runtime) {
    const owner=runtime.deps.game, run=runtime.deps.actExplorationState.current(owner);
    const site=owner.atlas.run?.passages?.sites.find(row=>!row.used);
    if (run?.status==='active' && site && !run.source.pocket) runtime.deps.actExplorationState.selectDestination(run,site);
}

function fieldObjective(runtime,ledger) {
    if (!ledger.passages) return '';
    const run = runtime.deps.game.actExploration, tr = runtime.deps._t;
    if (run?.source?.pocket) return expeditionObjective(run,tr);
    const site = ledger.passages.sites.find(row => !row.used);
    return site ? tr('발견한 입구 · {name}',{name:tr(runtime.deps.ATLAS.encounters[site.type].name)}) : '';
}

function expeditionObjective(run,tr) {
    const pack = run.packs.find(row => row.task && (row.aliveIds.length || row.task.index < row.task.spots.length));
    if (!pack) return tr('{name} 처치',{name:tr(atlasChallenges[run.source.pocket][1])});
    if (pack.aliveIds.length) return tr('남은 적 {count}',{count:pack.aliveIds.length}) + ' · ' + tr(pack.task.label);
    return tr(pack.task.label) + ' ' + pack.task.index + '/' + pack.task.spots.length;
}

function encounterChip(runtime, run, type) {
    const name = runtime.deps.escapeHTML(encounterNames(runtime, [type], run.golden || []));
    const challenge = run.challengeDoors && atlasChallenges[type];
    if (!challenge) return `<span class="atlas-hud-chip is-room">${name}</span>`;
    const tips = {
        swarm: runtime.deps._t('호위병이 쓰러질 때마다 우두머리의 공격이 빨라집니다.'),
        fracture: runtime.deps._t('호위병이 쓰러지면 우두머리의 생명력이 깎입니다.'),
        drain: runtime.deps._t('우두머리가 쓰러진 호위병의 생명력을 흡수합니다.'),
        ebb: runtime.deps._t('호위병을 쓰러뜨리면 우두머리의 다음 공격 준비가 늦어집니다.'),
        flare: runtime.deps._t('호위병이 쓰러질 때마다 우두머리의 타격이 강해집니다.'),
        regrow: runtime.deps._t('호위병이 쓰러질 때마다 우두머리의 생명력 재생이 강해집니다.'),
        rally: runtime.deps._t('우두머리를 먼저 쓰러뜨리면 남은 호위병의 공격력이 줄어듭니다.')
    };
    const tip = [runtime.deps._t(challenge[1]), tips[challenge[2]], runtime.deps._t('입구가 있는 방을 정리한 뒤 문을 누르세요. 전체 탐색은 자동으로 들어갑니다.')].join(' ');
    return `<span class="atlas-hud-chip is-room" data-tip="${runtime.deps.escapeHTML(tip)}">${name}</span>`;
}
