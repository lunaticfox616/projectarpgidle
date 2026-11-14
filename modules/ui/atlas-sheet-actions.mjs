/** 원화 위의 자리(백분율): 권역의 칸 0~8과 수호자(칸 9), 정점. */
export function place(runtime, node) {
    const [x, y] = node.kind === 'pinnacle' ? runtime.deps.WORLD_MAP.atlas.pinnacle : anchorOf(runtime, node.region).nodes[node.slot];
    return { x, y };
}

export function linkState(runtime, a, b) {
    if (done(runtime, a) && done(runtime, b)) return 'done';
    return (done(runtime, a) || done(runtime, b)) && runtime.deps.atlas.reachable(runtime.deps.game, a) && runtime.deps.atlas.reachable(runtime.deps.game, b) ? 'lit' : 'dim';
}

/** 그리기 전에 한 번: 지난번에 본 것과 견주어 새 완료, 새로 열린 곳, 새 씨앗을 가려 둔다. 다른 저장을 불러왔거나 처음 열 때는 조용히 지금을 기억한다. */
export function noteFresh(runtime) {
    const st = runtime.deps.game.atlas, now = { owner: st, done: new Set(st.completed), open: new Set(openIds(runtime)), seeds: st.seeds };
    const same = runtime.state.seen && runtime.state.seen.owner === st;
    const newly = key => new Set(same ? [...now[key]].filter(id => !runtime.state.seen[key].has(id)) : []);
    const found = { done: newly('done'), open: newly('open'), seeds: same ? Math.max(0, now.seeds - runtime.state.seen.seeds) : 0, at: runtime.deps.Date.now() };
    runtime.state.seen = now;
    if (!found.done.size && !found.seeds) return; // 열린 곳만 달라진 것(입장권)은 밝히지 않는다
    runtime.state.fresh = found;
    (0, runtime.deps.playUiFeedbackSound)('uiConfirm');
}

export function strokeRoad(runtime, c, ends, state, share) {
    const [from, to] = ends;
    c.strokeStyle = runtime.state.ROAD[state];
    c.globalAlpha = state === 'dim' ? 0.55 : 1;
    c.lineWidth = state === 'dim' ? 1 : 2;
    c.setLineDash(state === 'dim' ? [2, 4] : []);
    c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share); c.stroke();
}

/** 새로 깬 노드에 닿은 길은 그 노드에서부터 자란다(progress 0~1). */
export function paintRoad(runtime, c, at, [a, b], progress) {
    const state = linkState(runtime, a, b), grows = state !== 'dim' && (runtime.state.fresh.done.has(a) || runtime.state.fresh.done.has(b)) && progress < 1;
    const ends = runtime.state.fresh.done.has(b) && !runtime.state.fresh.done.has(a) ? [at(b), at(a)] : [at(a), at(b)];
    if (grows) strokeRoad(runtime, c, ends, 'dim', 1);
    strokeRoad(runtime, c, ends, state, grows ? progress : 1);
}

export function paintRoads(runtime, canvas, progress) {
    const w = canvas.width, h = canvas.height, c = canvas.getContext('2d');
    const at = id => { const p = place(runtime, runtime.deps.atlas.node(id)); return { x: Math.round(p.x / 100 * w), y: Math.round(p.y / 100 * h) }; };
    c.clearRect(0, 0, w, h);
    for (const state of ['dim', 'lit', 'done']) for (const link of runtime.deps.atlas.links) if (linkState(runtime, link[0], link[1]) === state) paintRoad(runtime, c, at, link, progress);
    c.globalAlpha = 1;
}

export function paint(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .as-chart'), canvas = box && box.querySelector('.as-art');
    if (!canvas || !box.clientWidth) return;
    canvas.width = box.clientWidth; canvas.height = box.clientHeight;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.frame);
    const growAtlasRoads = () => {
        const progress = Math.min(1, (runtime.deps.Date.now() - runtime.state.fresh.at) / runtime.state.REVEAL_MS);
        if (!canvas.isConnected) return;
        paintRoads(runtime, canvas, progress);
        if (progress < 1) runtime.state.frame = (0, runtime.deps.requestAnimationFrame)(growAtlasRoads);
    };
    growAtlasRoads();
}

/** 한 번 누르면 고르고, 같은 노드를 곧바로 한 번 더 누르면 그 노드의 지도석으로 연다(고를 때 화면을 다시 그려서 dblclick이 오지 않는다). */
export function tap(runtime, id) {
    const now = runtime.deps.Date.now(), again = runtime.state.lastTap.id === id && now - runtime.state.lastTap.at < 450;
    runtime.state.lastTap = { id, at: now };
    if (again) runtime.deps.atlasUi.openNode(id); else runtime.deps.atlasUi.selectNode(id);
}

export function nodeClasses(runtime, node, status, picked) {
    const held = runtime.deps.game.atlas.stash.some(map => map.node === node.id), running = runtime.deps.game.atlas.run && runtime.deps.game.atlas.run.map.node === node.id, live = revealing(runtime);
    return ['as-node', `is-${status}`, `kind-${node.kind}`, node.id === picked ? 'is-selected' : '', running ? 'is-running' : '', held ? 'has-stone' : '',
        live && runtime.state.fresh.done.has(node.id) ? 'is-fresh' : '', live && runtime.state.fresh.open.has(node.id) ? 'is-unsealed' : ''].filter(Boolean).join(' ');
}

export function nodeHtml(runtime, node, picked) {
    const at = place(runtime, node), status = runtime.deps.atlas.status(runtime.deps.game, node.id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), tint = tintOf(runtime, node);
    const held = runtime.deps.game.atlas.stash.filter(map => map.node === node.id).length;
    const icon = runtime.deps.worldMapUi.atlasIcon(runtime.deps.WORLD_MAP.atlas.icons[node.kind] ? node.kind : 'stone', tint, status === 'locked');
    return `<button class="${nodeClasses(runtime, node, status, picked)}" style="--x:${at.x}%;--y:${at.y}%;--tone:${runtime.deps.atlas.tierBand(tier).tone};--tint:${tint}" data-atlas-node="${node.id}"
            data-info-tooltip-anchor="1" aria-pressed="${node.id === picked}" aria-label="${runtime.deps.atlasUi.nodeLabel(node, tier, status)}" onclick="atlasSheetUi.tap('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><span class="as-stone" style="background-image:url('${icon}')">${node.kind === 'map' ? tier : ''}</span>`
        + `${held ? `<i>${held}</i>` : ''}${node.id === picked ? `<em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</em>` : ''}</button>`;
}

export function regionTagHtml(runtime, region) {
    const nodes = runtime.deps.atlas.nodes.filter(node => node.region === region.id), cleared = nodes.filter(node => runtime.deps.game.atlas.completed.includes(node.id)).length, [x, y] = runtime.state.TAG_AT[region.id] || anchorOf(runtime, region.id).label;
    return `<span class="as-region" style="--x:${x}%;--y:${y}%;--tint:${region.tint}"><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}</span>`
        + `<i style="--fill:${Math.round(cleared / nodes.length * 100)}%"></i><b>${cleared}/${nodes.length}</b></span>`;
}

/** 세계 지도로 돌아가는 단추: 세계 지도에서 아틀라스 입구가 선 바로 그 자리(2026-11-10 사용자). 누르면 입구와 같은 전환이 거꾸로 돈다. */
export function homeHtml(runtime) {
    const at = runtime.deps.worldMapUi.atlasEntranceSpot();
    return `<button type="button" class="as-home" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%" aria-label="${(0, runtime.deps._t)('세계 지도')}" data-tip="${(0, runtime.deps._t)('세계 지도')}"
            onclick="worldMapUi.turnToWorld(this)"><i aria-hidden="true" style="background-image:url('${runtime.deps.worldMapUi.atlasIcon('tree', '#e2a94a', false, true)}')"></i></button>`;
}

export function chartHtml(runtime, picked) {
    return `<div class="as-chart" role="group" aria-label="${(0, runtime.deps._t)('아틀라스 지도')}" style="aspect-ratio:${runtime.deps.WORLD_MAP.width}/${runtime.deps.WORLD_MAP.height};background-image:url('${runtime.deps.WORLD_MAP.atlas.src}')">
            <canvas class="as-art" aria-hidden="true"></canvas>${homeHtml(runtime)}${runtime.deps.ATLAS.regions.map(runtime.handlers.regionTagHtml).join('')}${runtime.deps.atlas.nodes.map(node => nodeHtml(runtime, node, picked)).join('')}</div>`;
}

/** 아틀라스의 모든 쪽이 쓰는 윗줄(js/atlas-ui.js render). chart: 지도 쪽을 그리는 중인가(처음 보는 완료는 지도 쪽에서만 밝힌다). */
export function top(runtime, chart) {
    if (chart) noteFresh(runtime);
    // 완료 수와 남은 포인트는 예전 머리줄과 같은 셈이다(js/atlas-ui.js headerHtml): 깨어난 아틀라스는 후반 싸움만큼 넓어진다.
    const st = runtime.deps.game.atlas, total = runtime.deps.atlas.nodes.length + (runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? runtime.deps.atlas.lateNodes.length : 0), points = runtime.deps.atlas.points(runtime.deps.game), free = runtime.deps.atlasPassives.spendable(runtime.deps.game);
    const firstNew = st.seeds - runtime.state.fresh.seeds, live = revealing(runtime);
    const seeds = Array.from({ length: runtime.deps.ATLAS.seeds.max }, (_, i) => `<i class="${i < st.seeds ? 'is-on' : ''}${live && i >= firstNew && i < st.seeds ? ' is-fresh' : ''}"></i>`).join('');
    return `<header class="as-top"><span class="as-progress" style="--fill:${Math.round(st.completed.length / total * 100)}%"><b>${(0, runtime.deps._t)('완료')} ${st.completed.length}/${total}</b></span>
            <span class="as-seeds" aria-label="${(0, runtime.deps._t)('씨앗')} ${st.seeds}/${runtime.deps.ATLAS.seeds.max}">${(0, runtime.deps._t)('씨앗')}${seeds}</span>
            <span class="as-points">${(0, runtime.deps._t)('보너스')} <b>${st.bonus.length}</b></span><span class="as-points">${(0, runtime.deps._t)('포인트')} <b>${points}</b>${free > 0 ? ` <em>+${free}</em>` : ''}</span>
            <label class="as-auto"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${(0, runtime.deps._t)('자동 지도')}</span></label></header>`;
}

export function nodeInfoHtml(runtime, picked) {
    const node = runtime.deps.atlas.node(picked);
    if (!node) return `<div class="as-info"><p class="atlas-muted">${(0, runtime.deps._t)('노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.')}</p></div>`;
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), status = runtime.deps.atlas.status(runtime.deps.game, node.id), region = runtime.deps.ATLAS.regions.find(row => row.id === node.region);
    const where = region ? (0, runtime.deps._t)(region.name) : (0, runtime.deps._t)('정점');
    const detail = status === 'locked' && node.kind !== 'pinnacle' ? '' : `<p>${(0, runtime.deps._t)('{tier}등급, {node}, 보스 {boss}', { tier, node: terrainOf(runtime, node), boss: (0, runtime.deps.escapeHTML)(node.boss) })}</p>
            <p class="atlas-muted">${(0, runtime.deps._t)('장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당', { lootTier: runtime.deps.atlas.lootTier(tier), equivalentDepth: runtime.deps.atlas.equivalentDepth(tier) })}</p>`;
    return `<div class="as-info" style="--tint:${tintOf(runtime, node)};--tone:${runtime.deps.atlas.tierBand(tier).tone}"><small>${(0, runtime.deps.escapeHTML)(where)}</small><h3><b>${tier}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>${detail}</div>`;
}

export function fragmentsHtml(runtime) {
    const st = runtime.deps.game.atlas, slots = runtime.deps.atlas.slots(runtime.deps.game);
    const owned = runtime.deps.ATLAS.fragments.filter(fragment => st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
    const chips = owned.map(fragment => {
        const loaded = st.loadout.includes(fragment.id);
        return `<button class="as-fragment${loaded ? ' is-on' : ''}" aria-pressed="${loaded}" onclick="atlasUi.toggleFragment('${fragment.id}')"><span>${(0, runtime.deps._t)(fragment.name)}</span><small>${st.fragments[fragment.id] || 0}</small></button>`;
    }).join('');
    const holes = Array.from({ length: slots }, (_, i) => `<i class="${i < st.loadout.length ? 'is-on' : ''}"></i>`).join('');
    return `<div class="as-fragments"><p>${(0, runtime.deps._t)('각인 홈')} ${holes}</p><div>${chips || `<span class="atlas-muted">${(0, runtime.deps._t)('가진 각인이 없습니다.')}</span>`}</div></div>`;
}

export function stoneGoHtml(runtime, map, lock) {
    return `<span class="as-loaded rarity-${map.rarity}" style="--tone:${runtime.deps.atlas.tierBand(map.tier).tone}"><b>${map.tier}</b>${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name)}</span>${departHtml(runtime, '지도 열기', 'atlasUi.open()', lock)}`;
}

/** 도크 오른쪽: 열린 지도로 돌아가기, 정점 열기, 고른 지도석으로 열기, 고른 것이 없으면 무엇을 고를지. */
export function goHtml(runtime, parts) {
    const st = runtime.deps.game.atlas, node = runtime.deps.atlas.node(parts.node), map = st.stash.find(entry => entry.uid === parts.uid);
    let body = `<small>${st.stash.length ? (0, runtime.deps._t)('보관함이나 노드에서 지도석을 고르세요.') : (0, runtime.deps._t)('지도석이 없습니다.')}</small><button class="atlas-primary" disabled>${(0, runtime.deps._t)('지도 열기')}</button>`;
    if (st.run) body = departHtml(runtime, '열린 지도로', 'atlasUi.reenter()', '');
    else if (node && node.kind === 'pinnacle') body = departHtml(runtime, '정점 열기', 'atlasUi.openPinnacle()', runtime.deps.atlas.pinnacleReason(runtime.deps.game) || parts.block);
    else if (map) body = stoneGoHtml(runtime, map, parts.lock);
    return `<div class="as-go">${body}</div>`;
}

export function stoneHtml(runtime, map, parts) {
    const mine = !parts.node || map.node === parts.node, omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    return `<button class="as-tile rarity-${map.rarity}${mine ? '' : ' is-other'}${map.corrupted ? ' is-corrupted' : ''}" style="--tone:${runtime.deps.atlas.tierBand(map.tier).tone}" aria-pressed="${map.uid === parts.uid}"
            data-tip="${(0, runtime.deps.escapeHTML)(parts.mapName(map))}" onclick="atlasUi.selectMap(${map.uid})"><b>${map.tier}</b>${omen ? `<i style="--omen:${omen.tone}"></i>` : ''}</button>`;
}

export function drawerHtml(runtime, parts) {
    const maps = [...runtime.deps.game.atlas.stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
    const tiles = maps.length ? `<div class="as-tiles">${maps.map(map => stoneHtml(runtime, map, parts)).join('')}</div>` : `<p class="atlas-muted">${(0, runtime.deps._t)('비어 있습니다. 보관함은 루프마다 비워집니다.')}</p>`;
    return `<aside class="as-drawer"><section class="as-stash"><h3>${(0, runtime.deps._t)('지도석 보관함')} <span>${maps.length}/${runtime.deps.ATLAS.stashCap}</span></h3>${tiles}${parts.tools}</section>${parts.side}${parts.after}</aside>`;
}

/** parts: js/atlas-ui.js가 건네는 고른 것과 이미 만든 조각들(node, uid, lock, block, side, tools, after, mapName). */
export function html(runtime, parts) {
    // 진행 줄은 지도 아래에 둔다(2026-11-10 사용자: 크기를 맞출 수는 없나): 지도가 세계 지도와 같은 자리, 같은 크기에 서서 전환이 튀지 않는다.
    const strip = top(runtime, true);   // 지도석 노드보다 먼저: 처음 보는 완료를 가려 둔다
    return `<div class="atlas-sheet"><div class="as-body">${chartHtml(runtime, parts.node)}${drawerHtml(runtime, parts)}</div>${strip}
            <footer class="as-dock">${nodeInfoHtml(runtime, parts.node)}${fragmentsHtml(runtime)}${goHtml(runtime, parts)}</footer></div>`;
}

/** 세계 지도의 아틀라스 입구에 붙는 말(js/world-map-ui.js): 진행과 준비된 지도석 수. */
export function entranceNote(runtime) {
    const st = runtime.deps.game.atlas, total = runtime.deps.atlas.nodes.length + (runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? runtime.deps.atlas.lateNodes.length : 0);
    return { progress: `${st.completed.length}/${total}`, stones: st.stash.length };
}

export function on(runtime) { return !!runtime.deps.game.settings && runtime.deps.game.settings.atlasSheet !== 'off'; }

export function anchorOf(runtime, id) { return runtime.deps.WORLD_MAP.atlas.regions.find(row => row.id === id); }

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

export function tintOf(runtime, node) { return (runtime.deps.ATLAS.regions.find(row => row.id === node.region) || { tint: '#6f5a86' }).tint; }

export function openIds(runtime) { return runtime.deps.atlas.nodes.filter(node => runtime.deps.atlas.status(runtime.deps.game, node.id) === 'open').map(node => node.id); }

export function revealing(runtime) { return runtime.deps.Date.now() - runtime.state.fresh.at < runtime.state.REVEAL_MS + 600; }

export function terrainOf(runtime, node) { return (runtime.deps.ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || ''; }

export function departHtml(runtime, label, action, reason) { return `${reason ? `<small>${(0, runtime.deps.escapeHTML)(reason)}</small>` : ''}<button class="atlas-primary" data-exploration-departure onclick="${action}" ${reason ? 'disabled' : ''}>${(0, runtime.deps._t)(label)}</button>`; }
