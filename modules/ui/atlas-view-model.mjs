export function terrainOf(runtime, node) { return (runtime.deps.ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || ''; }

export function flowerWallet(runtime) { return runtime.state.FLOWER_COLORS.flatMap(color => [runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true)]); }

export function ledger(runtime) { return runtime.deps.game.atlas; }

export function nodeName(runtime, id) { return runtime.deps.atlas.node(id)?.name || ''; }

export function selectedMap(runtime) { return ledger(runtime).stash.find(map => map.uid === runtime.state.selectedUid) || null; }

export function panelOpen(runtime) { return runtime.deps.game.mapExploreSubtab === 'map-explore-worldtree' && runtime.deps.game.mapSubtab === 'map-tab-zones'; }

export function encounterNames(runtime, types, golden = []) { return types.map(type => `${golden.includes(type) ? `${runtime.deps.ATLAS.goldenRoom.prefix} ` : ''}${runtime.deps.ATLAS.encounters[type].name}`).join(', '); }

export function tierStyle(runtime, tier) { return `--atlas-tier:${runtime.deps.atlas.tierBand(tier).tone}`; }

export function viewOpen(runtime, id) { return id !== 'board' || runtime.deps.atlasBoard.unlocked(runtime.deps.game); }

export function sortedStash(runtime) { return [...ledger(runtime).stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid); }

export function mapName(runtime, map) { return (0, runtime.deps._t)('{node} {tier}등급 {name}', { node: nodeName(runtime, map.node), tier: map.tier, name: runtime.deps.ATLAS.rarities[map.rarity].name }); }

export function plainUpTo(runtime, tier) { return ledger(runtime).stash.filter(map => runtime.deps.atlas.plainMap(map) && map.tier <= tier).length; }

export function tierCounts(runtime, made) { return Object.entries(made).sort(([a], [b]) => b - a).map(([tier, count]) => (0, runtime.deps._t)('{tier}등급 {count}개', { tier, count })).join(', '); }

export function sumOf(runtime, made) { return Object.values(made).reduce((sum, count) => sum + count, 0); }

export function shownNodes(runtime) { return runtime.deps.atlas.nodes.filter(node => node.region === runtime.state.selectedRegion || (runtime.state.selectedRegion === 'trunk' && node.kind === 'pinnacle')); }

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

export function nodeLabel(runtime, node, tier, status) { return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)('{name} {tier}등급 {STATUS}', {
        name: (0, runtime.deps._t)(node.name), tier, STATUS: (0, runtime.deps._t)(runtime.state.STATUS[status])
    })); }

export function heldLate(runtime, run) { return Object.entries((run.endgame && run.endgame.items) || {}).map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(', '); }

export function TICKET(runtime, key) { return runtime.deps.ORB_DB[key].name.replace('그림자 뿌리 입장권: ', ''); }

export function momentClass(runtime, moment) { return moment ? ` moment-${moment}` : ''; }
