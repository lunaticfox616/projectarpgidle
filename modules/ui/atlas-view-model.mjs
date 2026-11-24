export function terrainOf(runtime, node) { return (runtime.deps.ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || ''; }

export function flowerWallet(runtime) { return runtime.state.FLOWER_COLORS.flatMap(color => [runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true)]); }

export function ledger(runtime) { return runtime.deps.game.atlas; }

export function nodeName(runtime, id) { return runtime.deps.atlas.node(id)?.name || ''; }

export function selectedMap(runtime) { return ledger(runtime).stash.find(map => map.uid === runtime.state.selectedUid) || null; }

export function panelOpen(runtime) { return runtime.deps.game.mapExploreSubtab === 'map-explore-worldtree' && runtime.deps.game.mapSubtab === 'map-tab-zones'; }

export function encounterNames(runtime, types, golden = []) { return types.map(type => `${golden.includes(type) ? `${runtime.deps.ATLAS.goldenRoom.prefix} ` : ''}${runtime.deps.ATLAS.encounters[type].name}`).join(', '); }

/** tier: 싸움 등급(등급의 빛깔은 싸움 등급을 따른다). */
export function tierStyle(runtime, tier) { return `--atlas-tier:${runtime.deps.atlas.tierBand(tier).tone}`; }

/** 지도석의 빛깔: 지도 노드의 지도석은 천문도 등급을 싸움 등급으로 바꿔서. */
export function mapTierStyle(runtime, map) { return tierStyle(runtime, runtime.deps.atlas.mapGameTier(runtime.deps.game, map)); }

export function viewOpen(runtime, id) { return id !== 'board' || runtime.deps.atlasBoard.unlocked(runtime.deps.game); }

export function sortedStash(runtime) { return [...ledger(runtime).stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid); }

/** 고른 노드, 고른 것이 없으면 지도석이 갈 곳(js/atlas.js mapDestination), 갈 곳이 아직 없으면(그 등급의 지도가 닫혔다) 지도석이 가리키는 지도. */
export function selectedDestination(runtime, map) {
    return runtime.deps.atlas.node(runtime.state.selectedNode) || runtime.deps.atlas.mapDestination(runtime.deps.game, map) || runtime.deps.atlas.node(map.node);
}

/** 입장 도크의 형체 없는 이슬 선택: 천문도의 일반 지도석일 때만 보이고(shown), 이슬이 없으면 꺼진다(reason). on: 켜 두었고 쓸 수 있다. */
export function dewChoice(runtime, map) {
    const shown = !!map && runtime.deps.atlas.isMapStone(map), reason = shown ? runtime.deps.atlas.dewReason(runtime.deps.game, map) : '';
    return { shown, held: Math.floor(runtime.deps.game.currencies.formlessDew || 0), reason, on: shown && !reason && runtime.state.useDew === true };
}

/** 고른 노드에 쓸 지도석: 지금 고른 것이 맞으면 그대로, 아니면 보관함에서 맞는 첫 지도석(같은 천문도 등급, 수호자는 그 수호자의 것), 없으면 null. */
export function stoneForNode(runtime, node) {
    const atlas = runtime.deps.atlas, game = runtime.deps.game, picked = selectedMap(runtime);
    return atlas.matchesNode(game, picked, node) ? picked : ledger(runtime).stash.find(map => atlas.matchesNode(game, map, node)) || null;
}

/** 그 노드에 쓸 수 있는 보관함 지도석: 같은 등급 지도석(어느 지역에서 얻었든), 수호자는 그 수호자의 지도석. */
export function stonesForNode(runtime, node) { return ledger(runtime).stash.filter(map => runtime.deps.atlas.matchesNode(runtime.deps.game, map, node)); }

/** 보관함 줄의 이름: 지도 노드의 지도석은 어느 노드에나 쓰므로 노드 이름 대신 지도석이라고 쓴다. */
export function mapLabel(runtime, map) { return runtime.deps.atlas.isMapStone(map) ? (0, runtime.deps._t)('지도석') : (0, runtime.deps._t)(nodeName(runtime, map.node)); }

export function mapName(runtime, map) {
    const name = (0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name);
    return runtime.deps.atlas.isMapStone(map) ? (0, runtime.deps._t)('{tier}등급 {name} 지도석', { tier: map.tier, name })
        : (0, runtime.deps._t)('{node} {tier}등급 {name}', { node: mapLabel(runtime, map), tier: map.tier, name });
}

export function tierCounts(runtime, made) { return Object.entries(made).sort(([a], [b]) => b - a).map(([tier, count]) => (0, runtime.deps._t)('{tier}등급 {count}개', { tier, count })).join(', '); }

export function sumOf(runtime, made) { return Object.values(made).reduce((sum, count) => sum + count, 0); }

export function shownNodes(runtime) { return runtime.deps.atlas.nodes.filter(node => node.region === runtime.state.selectedRegion || (runtime.state.selectedRegion === 'trunk' && node.kind === 'pinnacle')); }

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

/** 천문도의 보스 자리는 등급이 없다: 이름과 상태만. */
export function nodeLabel(runtime, node, tier, status) {
    if (node.kind === 'gate') return (0, runtime.deps.escapeHTML)(`${(0, runtime.deps._t)(node.name)} ${(0, runtime.deps._t)(runtime.state.STATUS[status])}`);
    return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)('{name} {tier}등급 {STATUS}', {
        name: (0, runtime.deps._t)(node.name), tier, STATUS: (0, runtime.deps._t)(runtime.state.STATUS[status])
    })); }

export function heldLate(runtime, run) { return Object.entries((run.endgame && run.endgame.items) || {}).map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(', '); }

export function TICKET(runtime, key) { return runtime.deps.ORB_DB[key].name.replace('그림자 뿌리 입장권: ', ''); }

export function momentClass(runtime, moment) { return moment ? ` moment-${moment}` : ''; }
