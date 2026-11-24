/** 천문도 위의 자리(그림의 백분율). 외부 피나클 둘은 천문도에서 같은 자리(피나클 장치)에 선다: 표식이 겹치지 않게 좌우로 벌린다. */
export function place(runtime, node) {
    const [x, y] = node.point, nudge = node.gate === 'outer' ? runtime.state.OUTER_NUDGE[node.side] || 0 : 0;
    return { x: x + nudge, y };
}

/** 길의 끝이 지나온 곳인지: 시작 육분의는 켰을 때, 노드는 완료했을 때. */
export function passed(runtime, id) { return id === 'entry' ? runtime.deps.game.atlas.sextant === true : done(runtime, id); }

/** 길 하나의 상태: 양 끝을 지났으면 'done', 부모를 지나 자식이 열렸으면 'lit', 아니면 'dim'. */
export function routeState(runtime, route) {
    if (passed(runtime, route.from) && passed(runtime, route.to)) return 'done';
    return passed(runtime, route.from) && runtime.deps.atlas.reachable(runtime.deps.game, route.to) ? 'lit' : 'dim';
}

/** 그리기 전에 한 번: 지난번에 본 것과 견주어 새 완료, 새로 열린 곳, 새 씨앗을 가려 둔다. 다른 저장을 불러왔거나 처음 열 때는 조용히 지금을 기억한다. */
export function noteFresh(runtime) {
    const st = runtime.deps.game.atlas, now = { owner: st, done: new Set(st.completed), open: new Set(openIds(runtime)), seeds: st.seeds };
    const same = runtime.state.seen && runtime.state.seen.owner === st;
    const newly = key => new Set(same ? [...now[key]].filter(id => !runtime.state.seen[key].has(id)) : []);
    const found = { done: newly('done'), open: newly('open'), seeds: same ? Math.max(0, now.seeds - runtime.state.seen.seeds) : 0, at: runtime.deps.Date.now() };
    runtime.state.seen = now;
    if (!found.done.size && !found.seeds) return; // 열린 곳만 달라진 것은 밝히지 않는다
    runtime.state.fresh = found;
    (0, runtime.deps.playUiFeedbackSound)('uiConfirm');
}

/** 한 번 누르면 고르고, 같은 노드를 곧바로 한 번 더 누르면 맞는 지도석으로 연다(고를 때 화면을 다시 그려서 dblclick이 오지 않는다). */
export function tap(runtime, id) {
    const now = runtime.deps.Date.now(), again = runtime.state.lastTap.id === id && now - runtime.state.lastTap.at < 450;
    runtime.state.lastTap = { id, at: now };
    if (again) runtime.deps.atlasUi.openNode(id); else runtime.deps.atlasUi.selectNode(id);
}

export function nodeClasses(runtime, node, status, picked, held) {
    const running = runningId(runtime) === node.id, live = revealing(runtime);
    return ['as-node', `is-${status}`, `kind-${node.kind}`, node.id === picked ? 'is-selected' : '', running ? 'is-running' : '', held ? 'has-stone' : '',
        live && runtime.state.fresh.done.has(node.id) ? 'is-fresh' : '', live && runtime.state.fresh.open.has(node.id) ? 'is-unsealed' : ''].filter(Boolean).join(' ');
}

/** 열린 싸움이 선 천문도의 노드: 보스 자리가 치르는 싸움은 그 자리(기억 싸움과 원정 판은 제 노드). */
export function runningId(runtime) {
    const run = runtime.deps.game.atlas.run;
    if (!run) return null;
    return (!run.board && !run.map.memory && runtime.deps.atlas.gateOf(run.map.node)?.id) || run.map.node;
}

/** 표식 그림(js/world-map-ui.js atlasIcon): 지도는 돌판, 천문도의 보스는 수호자 표식, 외부 피나클은 정점 표식. */
export function iconOf(node) { return node.kind === 'map' ? 'stone' : node.gate === 'outer' ? 'pinnacle' : 'guardian'; }

/** matchingStones(node): the stash stones that open this node (parts.matchingStones); a locked node shows none. */
export function nodeHtml(runtime, node, picked, matchingStones) {
    const at = place(runtime, node), status = runtime.deps.atlas.status(runtime.deps.game, node.id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), tint = tintOf(runtime, node);
    const held = status === 'locked' ? 0 : matchingStones(node).length;
    const icon = runtime.deps.worldMapUi.atlasIcon(iconOf(node), tint, status === 'locked');
    return `<button class="${nodeClasses(runtime, node, status, picked, held)}" style="--x:${at.x}%;--y:${at.y}%;--tone:${toneOf(runtime, node)};--tint:${tint}" data-atlas-node="${node.id}"
            data-info-tooltip-anchor="1" aria-pressed="${node.id === picked}" aria-label="${runtime.deps.atlasUi.nodeLabel(node, tier, status)}" onclick="atlasSheetUi.tap('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><span class="as-stone" style="background-image:url('${icon}')">${node.kind === 'map' ? tier : ''}</span>`
        + `${held ? `<i>${held}</i>` : ''}${node.id === picked ? `<em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</em>` : ''}</button>`;
}

/** 천문도의 길: 천문도 표의 SVG 경로를 그대로 그린다(0~100 상자를 그림에 맞춰 늘인다). 숨긴 길(권역 보스 → 외부 피나클)은 그리지 않는다. */
export function routesHtml(runtime) {
    const paths = runtime.deps.ATLAS.starChart.routes.filter(route => !route.hidden)
        .map(route => `<path class="is-${routeState(runtime, route)}" d="${route.path}" vector-effect="non-scaling-stroke"/>`).join('');
    return `<svg class="as-routes" viewBox="${runtime.deps.ATLAS.starChart.viewBox.join(' ')}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

/** 시작 육분의: 켤 수 있으면 누르는 단추, 켠 뒤와 아직 켤 수 없을 때는 꺼진 단추(켤 수 없는 까닭은 도움말로). */
export function sextantHtml(runtime) {
    const mark = runtime.deps.ATLAS.starChart.landmarks.entry, on = runtime.deps.game.atlas.sextant === true, reason = on ? '' : runtime.deps.atlas.sextantReason(runtime.deps.game);
    const name = (0, runtime.deps._t)(mark.name), label = on || reason ? name : (0, runtime.deps._t)('{name} 켜기', { name });
    return `<button type="button" class="as-sextant${on ? ' is-on' : reason ? '' : ' is-ready'}" style="--x:${mark.point[0]}%;--y:${mark.point[1]}%" onclick="atlasUi.activateSextant()"
            ${on || reason ? 'disabled' : ''}${reason ? ` data-tip="${(0, runtime.deps.escapeHTML)(reason)}"` : ''}>${(0, runtime.deps.escapeHTML)(label)}</button>`;
}

/** 세계 지도로 돌아가는 단추: 세계 지도에서 아틀라스 입구가 선 바로 그 자리(2026-11-10 사용자). 누르면 입구와 같은 전환이 거꾸로 돈다. */
export function homeHtml(runtime) {
    const at = runtime.deps.worldMapUi.atlasEntranceSpot();
    return `<button type="button" class="as-home" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%" aria-label="${(0, runtime.deps._t)('세계 지도')}" data-tip="${(0, runtime.deps._t)('세계 지도')}"
            onclick="worldMapUi.turnToWorld(this)"><i aria-hidden="true" style="background-image:url('${runtime.deps.worldMapUi.atlasIcon('tree', '#e2a94a', false, true)}')"></i></button>`;
}

/** 지도 칸은 세계 지도와 같은 비율로 선다(전환이 튀지 않게, 2026-11-10 사용자): 천문도 그림과 표식, 길이 그 칸에 함께 늘어난다. */
export function chartHtml(runtime, picked, matchingStones) {
    return `<div class="as-chart" role="group" aria-label="${(0, runtime.deps._t)('아틀라스 지도')}" style="aspect-ratio:${runtime.deps.WORLD_MAP.width}/${runtime.deps.WORLD_MAP.height};background-image:url('${runtime.deps.ATLAS.starChart.picture.src}')">
            ${routesHtml(runtime)}${homeHtml(runtime)}${sextantHtml(runtime)}${runtime.deps.atlas.nodes.map(node => nodeHtml(runtime, node, picked, matchingStones)).join('')}</div>`;
}

/** 아틀라스의 모든 쪽이 쓰는 윗줄(js/atlas-ui.js render). chart: 지도 쪽을 그리는 중인가(처음 보는 완료는 지도 쪽에서만 밝힌다). */
export function top(runtime, chart) {
    if (chart) noteFresh(runtime);
    // 깨어난 아틀라스는 천문도에 자리가 없는 후반 싸움만큼 넓어진다(자리가 치르는 싸움은 그 자리로 한 번 센다, atlas.progress).
    const st = runtime.deps.game.atlas, progress = runtime.deps.atlas.progress(runtime.deps.game);
    const firstNew = st.seeds - runtime.state.fresh.seeds, live = revealing(runtime);
    const seeds = Array.from({ length: runtime.deps.ATLAS.seeds.max }, (_, i) => `<i class="${i < st.seeds ? 'is-on' : ''}${live && i >= firstNew && i < st.seeds ? ' is-fresh' : ''}"></i>`).join('');
    return `<header class="as-top"><span class="as-progress" style="--fill:${Math.round(progress.done / progress.total * 100)}%"><b>${(0, runtime.deps._t)('완료')} ${progress.done}/${progress.total}</b></span>
            <span class="as-seeds" aria-label="${(0, runtime.deps._t)('씨앗')} ${st.seeds}/${runtime.deps.ATLAS.seeds.max}">${(0, runtime.deps._t)('씨앗')}${seeds}</span>
            <span class="as-points">${(0, runtime.deps._t)('보너스')} <b>${st.bonus.length}</b></span>
            <label class="as-auto"><input type="checkbox" ${!runtime.deps.atlas.autoUnlocked(runtime.deps.game) ? 'disabled' : ''} ${st.autoMap && runtime.deps.atlas.autoUnlocked(runtime.deps.game) ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${(0, runtime.deps._t)(runtime.deps.atlas.autoUnlocked(runtime.deps.game) ? '자동 지도' : '자동 지도 · 정점 정복 후')}</span></label></header>`;
}

/** 고른 노드의 줄: 지도는 등급과 지형, 보스, 전리품의 등급(싸움 등급으로 센다). 잠긴 곳과 천문도의 보스 자리는 이름만. */
export function nodeInfoHtml(runtime, picked) {
    const node = runtime.deps.atlas.node(picked);
    if (!node) return `<div class="as-info"><p class="atlas-muted">${(0, runtime.deps._t)('노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.')}</p></div>`;
    const game = runtime.deps.game, tier = runtime.deps.atlas.effectiveTier(game, node), fight = runtime.deps.atlas.gameTier(game, node), status = runtime.deps.atlas.status(game, node.id);
    if (node.kind === 'gate') return gateInfoHtml(runtime, node);
    const detail = status === 'locked' ? '' : `<p>${(0, runtime.deps._t)('{tier}등급, {node}, 보스 {boss}', { tier, node: terrainOf(runtime, node), boss: (0, runtime.deps.escapeHTML)(node.boss) })}</p>
            <p class="atlas-muted">${(0, runtime.deps._t)('장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당', { lootTier: runtime.deps.atlas.lootTier(fight), equivalentDepth: runtime.deps.atlas.equivalentDepth(fight) })}</p>`;
    return `<div class="as-info" style="--tint:${tintOf(runtime, node)};--tone:${toneOf(runtime, node)}"><small>${(0, runtime.deps.escapeHTML)(whereOf(runtime, node))}</small><h3><b>${tier}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>${detail}</div>`;
}

/** 보스 자리의 줄: 자리의 권역과 이름, 그 자리가 치르는 싸움의 보스(자세한 것은 서랍의 자리 칸). */
export function gateInfoHtml(runtime, node) {
    const fight = runtime.deps.atlas.node(node.fight);
    return `<div class="as-info" style="--tint:${tintOf(runtime, node)};--tone:${toneOf(runtime, fight)}"><small>${(0, runtime.deps.escapeHTML)(whereOf(runtime, node))}</small><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>
            <p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(fight.boss))}</p></div>`;
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

/** 형체없는 이슬 사용(개편 A2, 화면은 D 단계가 다시 짠다): 각인 단추와 같은 켜고 끄는 단추, 옆의 수는 가진 이슬. 이슬이 없으면 꺼진다. */
export function dewHtml(runtime, dew) {
    if (!dew || !dew.shown) return '';
    return `<button type="button" class="as-fragment as-dew${dew.on ? ' is-on' : ''}" aria-pressed="${dew.on}" onclick="atlasUi.toggleDew()" ${dew.reason ? 'disabled' : ''}>`
        + `<span>${(0, runtime.deps._t)('형체없는 이슬 사용')}</span><small>${dew.held}</small></button>`;
}

export function stoneGoHtml(runtime, map, parts) {
    return `<span class="as-loaded rarity-${map.rarity}" style="--tone:${stoneTone(runtime, map)}"><b>${map.tier}</b>${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name)}</span>${dewHtml(runtime, parts.dew)}${departHtml(runtime, '지도 열기', 'atlasUi.open()', parts.lock)}`;
}

/** 도크 오른쪽: 열린 지도로 돌아가기, 천문도의 보스 자리에 도전(개편 C), 고른 지도석으로 열기, 고른 것이 없으면 무엇을 고를지. */
export function goHtml(runtime, parts) {
    const st = runtime.deps.game.atlas, node = runtime.deps.atlas.node(parts.node), map = st.stash.find(entry => entry.uid === parts.uid);
    let body = `<small>${parts.needed || (st.stash.length ? (0, runtime.deps._t)('보관함이나 노드에서 지도석을 고르세요.') : (0, runtime.deps._t)('지도석이 없습니다.'))}</small><button class="atlas-primary" disabled>${(0, runtime.deps._t)('지도 열기')}</button>`;
    if (st.run) body = departHtml(runtime, '열린 지도로', 'atlasUi.reenter()', '');
    else if (node && node.kind === 'gate') body = departHtml(runtime, '보스 도전', `atlasUi.openGate('${node.id}')`, runtime.deps.atlas.gateReason(runtime.deps.game, node.id) || parts.block);
    else if (map) body = stoneGoHtml(runtime, map, parts);
    return `<div class="as-go">${body}</div>`;
}

export function stoneHtml(runtime, map, parts) {
    const mine = !parts.node || runtime.deps.atlas.matchesNode(runtime.deps.game, map, runtime.deps.atlas.node(parts.node)), omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    return `<button class="as-tile rarity-${map.rarity}${mine ? '' : ' is-other'}${map.corrupted ? ' is-corrupted' : ''}" style="--tone:${stoneTone(runtime, map)}" aria-pressed="${map.uid === parts.uid}"
            data-tip="${(0, runtime.deps.escapeHTML)(parts.mapName(map))}" onclick="atlasUi.selectMap(${map.uid})"><b>${map.tier}</b>${omen ? `<i style="--omen:${omen.tone}"></i>` : ''}</button>`;
}

/** 보관함의 차례: 지도 노드의 지도석을 높은 천문도 등급부터, 예전 수호자의 지도석(싸움 등급을 지닌다)은 그 뒤에. */
export function stashOrder(runtime) {
    const boss = map => Number(!runtime.deps.atlas.isMapStone(map));
    return [...runtime.deps.game.atlas.stash].sort((a, b) => boss(a) - boss(b) || b.tier - a.tier || a.uid - b.uid);
}

export function drawerHtml(runtime, parts) {
    const maps = stashOrder(runtime);
    const tiles = maps.length ? `<div class="as-tiles">${maps.map(map => stoneHtml(runtime, map, parts)).join('')}</div>` : `<p class="atlas-muted">${(0, runtime.deps._t)('비어 있습니다. 보관함은 루프마다 비워집니다.')}</p>`;
    return `<aside class="as-drawer"><section class="as-stash"><h3>${(0, runtime.deps._t)('지도석 보관함')} <span>${maps.length}/${runtime.deps.ATLAS.stashCap}</span></h3>${tiles}${parts.tools}</section>${parts.side}${parts.after}</aside>`;
}

/** 좁은 화면에서 천문도는 옆으로 민다. 다시 그리기 전에 민 자리를 적어 두고(rememberScroll), 그린 뒤에 그 자리로 돌린다(settle).
 * 처음 그릴 때는 고른 곳, 열린 지도, 켤 수 있는 시작 육분의 가운데 먼저 있는 것이 가운데 오게 선다. 자리를 잡아 준 적 없는 그림
 * (보이지 않는 탭에서 그려 너비가 0이었다)의 자리는 적지 않는다: 처음 보일 때 가운데로 선다. */
export function rememberScroll(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .as-chart-box');
    runtime.state.scrollLeft = box && runtime.state.settled ? box.scrollLeft : null;
    runtime.state.settled = false;
}

export function settle(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .as-chart-box');
    if (!box || box.scrollWidth <= box.clientWidth) return;
    const focus = box.querySelector('.as-node.is-selected') || box.querySelector('.as-node.is-running') || box.querySelector('.as-sextant.is-ready') || box.querySelector('.as-node.is-open') || box.querySelector('.as-sextant');
    if (!runtime.state.settled) box.scrollLeft = runtime.state.scrollLeft ?? focus.offsetLeft + focus.offsetWidth / 2 - box.clientWidth / 2;
    runtime.state.settled = true;
}

/** parts: js/atlas-ui.js가 건네는 고른 것과 이미 만든 조각들(node, uid, lock, block, side, tools, after, mapName, needed, matchingStones). */
export function html(runtime, parts) {
    rememberScroll(runtime);
    // 진행 줄은 지도 아래에 둔다(2026-11-10 사용자: 크기를 맞출 수는 없나): 지도가 세계 지도와 같은 자리, 같은 크기에 서서 전환이 튀지 않는다.
    const strip = top(runtime, true);   // 지도석 노드보다 먼저: 처음 보는 완료를 가려 둔다
    return `<div class="atlas-sheet"><div class="as-body"><div class="as-chart-box">${chartHtml(runtime, parts.node, parts.matchingStones)}</div>${drawerHtml(runtime, parts)}</div>${strip}
            <footer class="as-dock">${nodeInfoHtml(runtime, parts.node)}${fragmentsHtml(runtime)}${goHtml(runtime, parts)}</footer></div>`;
}

/** 세계 지도의 아틀라스 입구에 붙는 말(js/world-map-ui.js): 진행과 준비된 지도석 수. */
export function entranceNote(runtime) {
    const st = runtime.deps.game.atlas, progress = runtime.deps.atlas.progress(runtime.deps.game);
    return { progress: `${progress.done}/${progress.total}`, stones: st.stash.length };
}

/** 한 장 화면이 기본이다. 예전 권역별 화면은 개발 설정(atlasSheet 'off')으로만 남아 있다(천문도의 자리에 그대로 세운 거친 모습). */
export function on(runtime) { return !!runtime.deps.game.settings && runtime.deps.game.settings.atlasSheet !== 'off'; }

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

export function tintOf(runtime, node) { return (runtime.deps.ATLAS.regions.find(row => row.id === node.region) || { tint: '#6f5a86' }).tint; }

/** 등급의 빛깔은 싸움 등급을 따른다(data/atlas.js tierBands). */
export function toneOf(runtime, node) { return runtime.deps.atlas.tierBand(runtime.deps.atlas.gameTier(runtime.deps.game, node)).tone; }

export function stoneTone(runtime, map) { return runtime.deps.atlas.tierBand(runtime.deps.atlas.mapGameTier(runtime.deps.game, map)).tone; }

/** 노드가 선 곳의 이름: 천문도의 권역(태양 권역, 외부 피나클도 여기 있다). 천문도 밖의 싸움은 제 권역(예전 수호자), 권역이 없으면 '정점'. */
export function whereOf(runtime, node) {
    const region = runtime.deps.ATLAS.starChart.regions[node.chartRegion] || runtime.deps.ATLAS.regions.find(row => row.id === node.region);
    return (0, runtime.deps._t)(region ? region.name : '정점');
}

export function openIds(runtime) { return runtime.deps.atlas.nodes.filter(node => runtime.deps.atlas.status(runtime.deps.game, node.id) === 'open').map(node => node.id); }

export function revealing(runtime) { return runtime.deps.Date.now() - runtime.state.fresh.at < runtime.state.REVEAL_MS + 600; }

export function terrainOf(runtime, node) { return (runtime.deps.ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || ''; }

export function departHtml(runtime, label, action, reason) { return `${reason ? `<small>${(0, runtime.deps.escapeHTML)(reason)}</small>` : ''}<button class="atlas-primary" data-exploration-departure onclick="${action}" ${reason ? 'disabled' : ''}>${(0, runtime.deps._t)(label)}</button>`; }
