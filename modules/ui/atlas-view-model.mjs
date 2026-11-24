export function flowerWallet(runtime) { return runtime.state.FLOWER_COLORS.flatMap(color => [runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true)]); }

export function ledger(runtime) { return runtime.deps.game.atlas; }

/** 열린 싸움이 선 천문도의 노드: 보스 자리가 치르는 싸움은 그 자리(기억 싸움과 원정 판은 제 노드). 열린 것이 없으면 null. */
export function runningNode(runtime) {
    const run = ledger(runtime).run;
    if (!run) return null;
    return (!run.board && !run.map.memory && runtime.deps.atlas.gateOf(run.map.node)?.id) || run.map.node;
}

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

/** 입장 도크의 형체 없는 이슬 선택: 천문도의 일반 지도석일 때만 보이고(shown), 이슬이 없으면 꺼진다(reason). on: 켜 두었고 쓸 수 있다. */
export function dewChoice(runtime, map) {
    const shown = !!map && runtime.deps.atlas.isMapStone(map), reason = shown ? runtime.deps.atlas.dewReason(runtime.deps.game, map) : '';
    return { shown, held: Math.floor(runtime.deps.game.currencies.formlessDew || 0), reason, on: shown && !reason && runtime.state.useDew === true };
}

/** 입장 상자의 수(패키지 4.3, 4.5): 그 지도 쪽 별 효과(stars), 포털과 장비 상자의 [기준, 지금 고른 입장의 값]. 장비 상자는 이슬 입장이면
 * dewEntry.gearBoxes, 별의 firstChest는 아직 깨지 않은 지도에 하나 더(확률로 더하는 상자는 별 효과 줄이 보인다). */
export function entryTerms(runtime, node, dew) {
    const rules = runtime.deps.ATLAS, stars = runtime.deps.atlasPassives.terms(runtime.deps.game, node.side);
    const first = stars.firstChest > 0 && !ledger(runtime).completed.includes(node.id);
    return { stars, portals: [rules.portals, runtime.deps.atlas.portalCap({ dew, stars })], boxes: [rules.gearBoxes, (dew ? rules.dewEntry.gearBoxes : rules.gearBoxes) + Number(first)] };
}

/** 별 효과 줄: 그 지도에 닿는 확률만(장비 상자 추가는 T8 이상과 이슬 입장의 몫을 더한다, 상위 지침은 T10에 없다). */
export function starChances(runtime, node, dew, stars) {
    const high = node.tier >= runtime.deps.ATLAS.highTier ? stars.highTierChestChance : 0, top = node.tier >= runtime.deps.ATLAS.starChart.tiers;
    const rows = [['추가 장비 상자 {value}%', stars.chestChance + high + (dew ? stars.dewChestChance : 0)], ['상급 상자 승급 {value}%', stars.gradeChance],
        ['이슬 획득 {value}%', stars.dewChance], ['같은 지침 추가 {value}%', stars.alidadeChance], ['연결된 상위 지침 추가 {value}%', top ? 0 : stars.tierChance]];
    return rows.filter(([, value]) => value > 0).map(([text, value]) => (0, runtime.deps._t)(text, { value }));
}

/** 고른 노드에 쓸 지도석:지금 고른 것이 맞으면 그대로, 아니면 보관함에서 맞는 첫 지도석(같은 천문도 등급, 수호자는 그 수호자의 것), 없으면 null. */
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

export function heldLate(runtime, run) { return Object.entries((run.endgame && run.endgame.items) || {}).map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(', '); }

export function TICKET(runtime, key) { return runtime.deps.ORB_DB[key].name.replace('그림자 뿌리 입장권: ', ''); }

export function momentClass(runtime, moment) { return moment ? ` moment-${moment}` : ''; }
