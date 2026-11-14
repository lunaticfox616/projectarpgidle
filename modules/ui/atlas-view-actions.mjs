import { render } from './atlas-view-screen.mjs';
import { viewOpen, ledger, selectedMap, mapName, sortedStash, plainUpTo, sumOf, tierCounts, nodeName, heldLate } from './atlas-view-model.mjs';

export function openPanel(runtime) {
    if (!runtime.deps.document.getElementById('tab-map').classList.contains('active')) (0, runtime.deps.switchTab)('tab-map');
    (0, runtime.deps.switchMapSubtab)('map-tab-zones');
    (0, runtime.deps.switchMapExploreSubtab)('map-explore-worldtree');
    render(runtime);
}

export function refresh(runtime) {
    runtime.state.signature = '';
    render(runtime);
    (0, runtime.deps.updateStaticUI)();
}

export function setView(runtime, next) {
    runtime.state.view = ['passives', 'epoch', 'late', 'memory', 'board'].includes(next) && viewOpen(runtime, next) ? next : 'maps';
    refresh(runtime);
}

/** 두 번 누른 노드에 맞는 지도석이 있으면 선택하고 출발한다. */
export function openNode(runtime, id) {
    selectNode(runtime, id);
    if (selectedMap(runtime) && selectedMap(runtime).node === id && !ledger(runtime).run) open(runtime);
}

export function selectRegion(runtime, id, showMaps = false) {
    if (!runtime.deps.ATLAS.regions.some(row => row.id === id)) return;
    if (showMaps) runtime.state.view = 'maps';
    runtime.state.selectedRegion = id;
    runtime.state.selectedNode = null;
    refresh(runtime);
}

export function selectNode(runtime, id, reveal = false) {
    const node = runtime.deps.atlas.node(id);
    if (!node) return;
    (0, runtime.deps.hideInfoTooltip)(); // a tap also fires the hover card; the detail panel shows the node now
    if (reveal) runtime.state.view = 'maps';
    runtime.state.selectedNode = id;
    runtime.state.selectedRegion = node.region || 'trunk';
    const maps = ledger(runtime).stash.filter(map => map.node === id);
    if ((reveal || maps.length) && !maps.some(map => map.uid === runtime.state.selectedUid)) runtime.state.selectedUid = maps.length ? maps[0].uid : null;
    render(runtime);
    if (reveal) revealNodeDetail(runtime);
}

export function revealNodeDetail(runtime) {
    const detail = runtime.deps.document.querySelector('#ui-atlas .atlas-node-detail');
    if (!detail) return;
    detail.tabIndex = -1;
    detail.focus({ preventScroll: true });
    detail.scrollIntoView({ block: 'nearest' });
}

export function selectMap(runtime, uid, reveal = false) {
    const map = ledger(runtime).stash.find(entry => entry.uid === uid);
    if (!map) return;
    runtime.state.selectedUid = uid;
    runtime.state.selectedNode = map.node;
    runtime.state.selectedRegion = runtime.deps.atlas.node(map.node).region || 'trunk';
    render(runtime);
    if (reveal) revealDevice(runtime);
}

export function revealDevice(runtime) {
    runtime.deps.document.querySelector('#ui-atlas .atlas-device')?.scrollIntoView({ block: 'start' });
}

export function revealStash(runtime) {
    runtime.deps.document.querySelector('#ui-atlas .atlas-stash')?.scrollIntoView({ block: 'start' });
}

/** 고른 지도석 하나. 손대지 않은 지도석은 묻지 않고(2026-11-06 사용자: 버리기가 너무 귀찮다), 제작한 것만 확인한다. 버린 뒤 다음 줄을 골라
* 같은 단추로 이어서 버린다. */
export async function discard(runtime) {
    const map = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game);
    if (!map) return;
    if (busy) return (0, runtime.deps.addLog)(busy, 'attack-monster');
    const name = mapName(runtime, map);
    if (!runtime.deps.atlas.plainMap(map) && !await (0, runtime.deps.requestGameConfirmation)(`${name} 지도석 1개를 버릴까요?\n지도석과 제작에 쓴 재화는 돌려받을 수 없습니다.`,
            { title: (0, runtime.deps._t)('지도석 버리기'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('버리기'), cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false })) return;
    if (selectedMap(runtime) !== map) return (0, runtime.deps.addLog)((0, runtime.deps._t)('선택한 지도석이 바뀌어 버리기를 취소했습니다.'), 'attack-monster');
    const order = sortedStash(runtime), at = order.indexOf(map);
    const reason = runtime.deps.atlas.discard(runtime.deps.game, map.uid);
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    const next = order[at + 1] || order[at - 1];
    runtime.state.selectedUid = next ? next.uid : null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ {name} 지도석 1개를 버렸습니다.', { name }), 'attack-monster');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

/** 고른 지도석의 등급 이하에서 손대지 않은 지도석 모두(한 번만 묻는다). 마법, 희귀, 품질, 타락 지도석은 남는다. */
export async function discardLow(runtime) {
    const map = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game);
    if (!map) return;
    if (busy) return (0, runtime.deps.addLog)(busy, 'attack-monster');
    const tier = map.tier, count = plainUpTo(runtime, tier);
    if (!count) return (0, runtime.deps.addLog)((0, runtime.deps._t)('{tier}등급 이하에 일반 지도석이 없습니다.', { tier }), 'attack-monster');
    const ok = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('{tier}등급 이하 일반 지도석 {count}개를 모두 버릴까요?\n마법, 희귀, 품질, 타락 지도석은 남습니다.', { tier, count }),
        { title: (0, runtime.deps._t)('지도석 정리'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('{count}개 버리기', { count }), cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false });
    if (!ok) return;
    // 묻는 사이 보관함이 바뀌었으면(새로 떨어진 지도석) 확인한 수와 다르다: 지우지 않고 다시 누르게 한다.
    if (plainUpTo(runtime, tier) !== count) return (0, runtime.deps.addLog)((0, runtime.deps._t)('보관함이 바뀌어 정리를 취소했습니다. 다시 눌러 주세요.'), 'attack-monster');
    const removed = runtime.deps.atlas.discardPlainUpTo(runtime.deps.game, tier);
    if (!ledger(runtime).stash.includes(map)) runtime.state.selectedUid = null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ {tier}등급 이하 일반 지도석 {removed}개를 버렸습니다.', { tier, removed }), 'attack-monster');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

/** 고른 지도석과 같은 등급 둘을 합쳐 한 등급 위 지도석 하나. 제작한 지도석이 들어가면 묻는다. */
export async function combine(runtime) {
    const map = selectedMap(runtime), reason = map && runtime.deps.atlas.combineReason(runtime.deps.game, map.uid);
    if (!map) return;
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    const set = runtime.deps.atlas.combineSet(runtime.deps.game, map.uid);
    if (set.some(entry => !runtime.deps.atlas.plainMap(entry)) && !await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('제작한 지도석이 함께 합쳐집니다.\n{names}', { names: set.map(runtime.handlers.mapName).join('\n') }),
            { title: (0, runtime.deps._t)('지도석 합치기'), confirmLabel: (0, runtime.deps._t)('합치기'), cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false })) return;
    // 묻는 사이 보관함이 바뀌면 합칠 셋도 바뀔 수 있다: 확인한 셋과 같을 때만 합친다.
    const now = runtime.deps.atlas.combineSet(runtime.deps.game, map.uid);
    if (!now || now.length !== set.length || now.some((entry, at) => entry !== set[at])) return (0, runtime.deps.addLog)((0, runtime.deps._t)('보관함이 바뀌어 합치기를 취소했습니다. 다시 눌러 주세요.'), 'attack-monster');
    const result = runtime.deps.atlas.combine(runtime.deps.game, map.uid);
    if (result.reason) return (0, runtime.deps.addLog)(result.reason, 'attack-monster');
    runtime.state.selectedUid = result.map.uid;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ {tier}등급 지도석 {count}개를 합쳐 {name} 지도석을 얻었습니다.', { tier: map.tier, count: result.used.length, name: mapName(runtime, result.map) }), 'loot-normal');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

/** 타락, 수호자 지도석을 뺀 지도석을 등급마다 셋씩 모두 합친다(atlas.combineAllPlan). 한 번만 묻고, 묻는 사이 보관함이 바뀌면 합치지 않는다. */
export async function combineAll(runtime) {
    const busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), plan = runtime.deps.atlas.combineAllPlan(runtime.deps.game);
    if (busy) return (0, runtime.deps.addLog)(busy, 'attack-monster');
    if (!plan.used) return (0, runtime.deps.addLog)((0, runtime.deps._t)('셋씩 합칠 지도석이 없습니다.'), 'attack-monster');
    const ok = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('지도석 {used}개를 합쳐 새 지도석 {made}개를 만들까요?\n{list}\n타락, 수호자 지도석은 남습니다.', { used: plan.used, made: sumOf(runtime, plan.made), list: tierCounts(runtime, plan.made) }),
        { title: (0, runtime.deps._t)('지도석 합치기'), confirmLabel: (0, runtime.deps._t)('합치기'), cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false });
    if (!ok) return;
    if (JSON.stringify(runtime.deps.atlas.combineAllPlan(runtime.deps.game)) !== JSON.stringify(plan)) return (0, runtime.deps.addLog)((0, runtime.deps._t)('보관함이 바뀌어 합치기를 취소했습니다. 다시 눌러 주세요.'), 'attack-monster');
    const result = runtime.deps.atlas.combineAll(runtime.deps.game), made = {};
    for (const map of result.made) made[map.tier] = (made[map.tier] || 0) + 1;
    if (!ledger(runtime).stash.some(map => map.uid === runtime.state.selectedUid)) runtime.state.selectedUid = [...result.made].sort((a, b) => b.tier - a.tier)[0]?.uid ?? null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ 지도석 {used}개를 합쳐 새 지도석 {made}개를 얻었습니다({list}).', { used: result.used, made: result.made.length, list: tierCounts(runtime, made) }), 'loot-normal');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

export function craft(runtime, key) {
    const map = selectedMap(runtime);
    if (!map) return;
    const cost = [{ key, amount: 1 }];
    const reason = runtime.deps.atlasMaps.craftReason(map, key) || ((0, runtime.deps.canPayCurrencyCosts)(cost) ? '' : (0, runtime.deps._t)('{name} 없습니다.', { name: (0, runtime.deps.withSubjectParticle)((0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)) }));
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    (0, runtime.deps.payCurrencyCosts)(cost);
    runtime.deps.atlasMaps.craft(map, key);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ {node} 지도석에 {name} 사용: {label}', { node: nodeName(runtime, map.node), name: (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name), label: runtime.deps.atlasMaps.crafts[key].label }), 'loot-magic');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

/** 꽃 하나로 지도석의 기운을 바꾼다(js/atlas.js changeOmen). 새 기운은 한 번 빛난다. */
export function applyFlower(runtime, map, color, omenId) {
    const result = runtime.deps.atlas.changeOmen(runtime.deps.game, map.uid, color, omenId);
    if (result.reason) return (0, runtime.deps.addLog)(result.reason, 'attack-monster');
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ {node} 지도석에 {golden}{color} 꽃 사용: {omen}', { node: nodeName(runtime, map.node), golden: omenId ? `${(0, runtime.deps._t)('황금')} ` : '', color: (0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[color].label), omen: (0, runtime.deps._t)(runtime.deps.lootOmens.describe(result.omen).name) }), 'loot-magic');
    (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    (0, runtime.deps.queueImportantSave)(200);
    runtime.state.bloomedUid = map.uid;
    refresh(runtime);
    runtime.state.bloomedUid = null;
}

export function flowerOmen(runtime, color) {
    const map = selectedMap(runtime);
    if (map) applyFlower(runtime, map, color, null);
}

/** 황금 꽃: 그 색 묶음의 기운을 보여 주고 고른 것으로 바꾼다. 묻는 사이 지도석이 바뀌었으면 쓰지 않는다. */
export async function goldenFlowerOmen(runtime, color) {
    const map = selectedMap(runtime);
    if (!map) return;
    const choices = runtime.deps.lootOmens.flowerOmens(color, runtime.deps.game, map.omen).map(omen => ({ value: omen.id, label: omen.name, detail: omen.note }));
    const picked = await (0, runtime.deps.requestGameChoice)({ title: (0, runtime.deps._t)('황금 {label} 꽃', { label: runtime.deps.STUMP_BOX_COLORS[color].label }), message: (0, runtime.deps._t)('지도석에 붙일 기운을 고르세요.'), choices, confirmLabel: (0, runtime.deps._t)('이 기운으로'), cancelLabel: (0, runtime.deps._t)('취소') });
    if (!picked) return;
    if (selectedMap(runtime) !== map) return (0, runtime.deps.addLog)((0, runtime.deps._t)('선택한 지도석이 바뀌어 기운 바꾸기를 취소했습니다.'), 'attack-monster');
    applyFlower(runtime, map, color, picked);
}

/** 각인 홈: 누르면 끼우고, 다시 누르면 뺀다. 지도를 열 때마다(자동 지도 포함) 가진 것만 하나씩 쓴다. */
export function toggleFragment(runtime, id) {
    const loadout = ledger(runtime).loadout;
    if (loadout.includes(id)) runtime.deps.atlas.setLoadout(runtime.deps.game, loadout.filter(entry => entry !== id));
    else if (loadout.length < runtime.deps.atlas.slots(runtime.deps.game)) runtime.deps.atlas.setLoadout(runtime.deps.game, [...loadout, id]);
    else return (0, runtime.deps.addLog)((0, runtime.deps._t)('각인 홈은 {slots}개입니다. 먼저 하나를 빼세요.', { slots: runtime.deps.atlas.slots(runtime.deps.game) }), 'attack-monster');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

export function open(runtime) {
    const map = selectedMap(runtime);
    if (!map) return;
    const reason = runtime.deps.atlasRun.open(map.uid);
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    runtime.state.selectedUid = null;
    refresh(runtime);
    (0, runtime.deps.switchTab)('tab-battle');
}

export function openPinnacle(runtime) {
    const reason = runtime.deps.atlasRun.openPinnacle();
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    refresh(runtime);
    (0, runtime.deps.switchTab)('tab-battle');
}

export function reenter(runtime) {
    const reason = runtime.deps.atlasRun.reenter();
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster');
    refresh(runtime);
    (0, runtime.deps.switchTab)('tab-battle');
}

/** Closing loses the entry cost and boss-held rewards; ordinary ground loot is collected by the exit flow. */
export async function abandon(runtime) {
    const run = ledger(runtime).run;
    if (!run) return;
    const ok = await (0, runtime.deps.requestGameConfirmation)(abandonMessage(runtime, run), { title: (0, runtime.deps._t)('지도 닫기'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('지도 닫기'), cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false });
    if (!ok || ledger(runtime).run !== run) return;
    if (runtime.deps.atlasRun.abandon()) (0, runtime.deps.addLog)((0, runtime.deps._t)('🗺️ 지도를 닫았습니다.'), 'attack-monster');
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

export function abandonMessage(runtime, run) {
    const held = run.drops.length + run.found.length, kind = runtime.deps.atlas.node(run.map.node)?.kind;
    // 지도석 없이 연 싸움은 바친 것을 잃는다(정점은 입장권, 최종 보스와 리그 우두머리는 재료, 기억 싸움은 그 기억).
    const offering = run.board ? (0, runtime.deps._t)('보관 재화 {lossPctFor}%', { lossPctFor: runtime.deps.atlasBoard.lossPctFor(ledger(runtime).board, run.board.boss) }) : run.map.memory ? (0, runtime.deps._t)('보스의 기억 {memory}단계', { memory: run.map.memory }) : kind === 'pinnacle' ? '바친 입장권' : (runtime.state.RUN_KIND[kind] ? '바친 재료' : '지도석');
    const lost = [offering, held ? (0, runtime.deps._t)('보류 중인 지도석과 각인 {held}개', { held }) : '', heldLate(runtime, run)].filter(Boolean).join(', ');
    return `${run.board ? run.board.name : nodeName(runtime, run.map.node)} 지도를 닫을까요?\n손실: ${lost}\n일반 장비와 재화, 바닥 전리품은 남습니다.${run.board ? (0, runtime.deps._t)('\n다음 진입에는 심재 주사위 1개가 필요합니다.') : ''}`;
}

export function toggleAuto(runtime, on) {
    ledger(runtime).autoMap = !!on;
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}

export function toggleAutoGuardians(runtime, on) {
    ledger(runtime).autoGuardians = !!on;
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
}
