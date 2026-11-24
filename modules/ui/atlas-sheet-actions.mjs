// 천문도(아틀라스 개편 2026-11-24 D1): 양피지 그림 위의 길(SVG), 지도 표식(먹 핀), 보스 자리(마름모 핀과 이름 판), 시작 육분의와 피나클 장치.
// 고른 것과 그 아래 카드 띠는 js/atlas-ui.js가 그린다(atlas-view-pick, -stash, -progress). 색은 css/atlas-sheet.css.

/** 길의 끝이 지나온 곳인지: 시작 육분의는 켰을 때, 노드는 완료했을 때. */
export function passed(runtime, id) { return id === 'entry' ? runtime.deps.game.atlas.sextant === true : done(runtime, id); }

/** 길 하나의 상태: 양 끝을 지났으면 'done', 부모를 지나 자식이 열렸으면 'lit', 아니면 'dim'. */
export function routeState(runtime, route) {
    if (passed(runtime, route.from) && passed(runtime, route.to)) return 'done';
    return passed(runtime, route.from) && runtime.deps.atlas.reachable(runtime.deps.game, route.to) ? 'lit' : 'dim';
}

/** 그리기 전에 한 번: 지난번에 본 것과 견주어 새 완료, 새로 열린 곳, 새 씨앗을 가려 둔다. 새로 열린 곳은 처음 고를 때까지 테를 두른다(unseen).
 * 다른 저장을 불러왔거나 처음 열 때는 조용히 지금을 기억한다. */
export function noteFresh(runtime) {
    const st = runtime.deps.game.atlas, now = { owner: st, done: new Set(st.completed), open: new Set(openIds(runtime)), seeds: st.seeds };
    const same = runtime.state.seen && runtime.state.seen.owner === st;
    const newly = key => new Set(same ? [...now[key]].filter(id => !runtime.state.seen[key].has(id)) : []);
    const found = { done: newly('done'), open: newly('open'), seeds: same ? Math.max(0, now.seeds - runtime.state.seen.seeds) : 0, at: runtime.deps.Date.now() };
    if (!same) runtime.state.unseen.clear();
    found.open.forEach(id => runtime.state.unseen.add(id));
    runtime.state.seen = now;
    if (!found.done.size && !found.seeds) return; // 열린 곳만 달라진 것은 밝히지 않는다
    runtime.state.fresh = found;
    (0, runtime.deps.playUiFeedbackSound)('uiConfirm');
}

/** 한 번 누르면 고르고, 같은 노드를 곧바로 한 번 더 누르면 연다(고를 때 화면을 다시 그려서 dblclick이 오지 않는다). 표지(육분의, 장치)는 고르기만. */
export function tap(runtime, id) {
    const now = runtime.deps.Date.now(), again = runtime.state.lastTap.id === id && now - runtime.state.lastTap.at < 450;
    runtime.state.lastTap = { id, at: now };
    if (again && runtime.deps.atlas.node(id)) runtime.deps.atlasUi.openNode(id); else runtime.deps.atlasUi.selectNode(id);
}

/** 열린 싸움이 선 천문도의 노드: 보스 자리가 치르는 싸움은 그 자리(기억 싸움과 원정 판은 제 노드). */
export function runningId(runtime) {
    const run = runtime.deps.game.atlas.run;
    if (!run) return null;
    return (!run.board && !run.map.memory && runtime.deps.atlas.gateOf(run.map.node)?.id) || run.map.node;
}

/** 표식 공통의 상태 이름: 고름, 열린 싸움, 처음 고르기 전의 새로 열린 곳, 방금 깬 곳과 방금 풀린 곳의 번쩍임. */
export function stateClasses(runtime, id, picked) {
    const live = revealing(runtime), fresh = runtime.state.fresh;
    return [id === picked ? 'is-selected' : '', runningId(runtime) === id ? 'is-running' : '', runtime.state.unseen.has(id) ? 'is-new' : '',
        live && fresh.done.has(id) ? 'is-fresh' : '', live && fresh.open.has(id) ? 'is-unsealed' : ''].filter(Boolean).join(' ');
}

/** 지도 표식: 먹 핀 안에 천문도 등급. 지침이 있는 아직 깨지 않은 열린 지도에는 작은 점. 이름과 등급은 마우스를 올리면(data-tip), 고르면 핀 아래 판에. */
export function pinHtml(runtime, node, parts) {
    const game = runtime.deps.game, status = shownStatus(runtime, node.id), tier = runtime.deps.atlas.effectiveTier(game, node);
    const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name)), held = status === 'open' && parts.held(node);
    const tip = (0, runtime.deps.escapeHTML)(`${(0, runtime.deps._t)(node.name)} T${tier}`);
    return `<button type="button" class="as-pin is-${status} ${stateClasses(runtime, node.id, parts.node)}${held ? ' has-stone' : ''}" style="--x:${node.point[0]}%;--y:${node.point[1]}%"
            data-atlas-node="${node.id}" data-tip="${tip}" aria-pressed="${node.id === parts.node}" aria-label="${tip}" onclick="atlasSheetUi.tap('${node.id}')"><b>${tier}</b>${node.id === parts.node ? `<em>${name}</em>` : ''}</button>`;
}

/** 보스 자리: 마름모 핀(종류마다 도트 그림 하나)과 패키지의 이름 판(중간 보스, 태양 보스, 위 입구 같은). */
export function gatePinHtml(runtime, node, parts) {
    const status = shownStatus(runtime, node.id), label = gateLabel(runtime, node), name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name));
    const icon = (0, runtime.deps.renderPixelIcon)(runtime.state.GATE_ICON[node.id] || runtime.state.GATE_ICON[node.gate], 'as-gate-icon');
    return `<button type="button" class="as-gate gate-${node.gate} is-${status} ${stateClasses(runtime, node.id, parts.node)}" style="--x:${node.point[0]}%;--y:${node.point[1]}%"
            data-atlas-node="${node.id}" data-tip="${name}" aria-pressed="${node.id === parts.node}" aria-label="${name}" onclick="atlasSheetUi.tap('${node.id}')">`
        + `<span class="as-gate-mark">${icon}</span>${label ? `<small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</small>` : ''}</button>`;
}

/** 패키지의 이름 판(태양 보스, 달 보스, 위 입구, 아래 입구, 중간 보스). 외부 피나클은 판이 없다(피나클 장치가 대신한다). */
export function gateLabel(runtime, node) { return runtime.deps.ATLAS.starChart.bosses.find(row => row.id === node.id)?.gate || ''; }

/** 표지 둘: 시작 육분의(켤 수 있으면 손짓, 켰으면 표시)와 피나클 장치(외부 피나클 둘이 그 자리에 선다, 둘 중 하나가 열리면 열림). */
export function marksHtml(runtime, picked) {
    const marks = runtime.deps.ATLAS.starChart.landmarks;
    return [['entry', sextantState(runtime)], ['device', deviceState(runtime)]].map(([id, status]) => {
        const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(marks[id].name)), [x, y] = runtime.state.MARK_AT[id] || marks[id].point;
        return `<button type="button" class="as-mark mark-${id} is-${status} ${stateClasses(runtime, id, picked)}" style="--x:${x}%;--y:${y}%" data-atlas-mark="${id}"
                aria-pressed="${id === picked}" onclick="atlasSheetUi.tap('${id}')"><i aria-hidden="true"></i><small>${name}</small></button>`;
    }).join('');
}

/** 'ready'(켤 수 있다) | 'complete'(켰다) | 'locked'(아틀라스가 닫혔다). */
export function sextantState(runtime) {
    if (runtime.deps.game.atlas.sextant === true) return 'complete';
    return runtime.deps.atlas.sextantReason(runtime.deps.game) ? 'locked' : 'ready';
}

/** 외부 피나클 둘의 상태를 하나로: 둘 다 마쳤으면 'complete', 하나라도 열렸으면 'open', 아니면 'locked'. */
export function deviceState(runtime) {
    const states = runtime.state.OUTER.map(id => shownStatus(runtime, id));
    if (states.every(state => state === 'complete')) return 'complete';
    return states.some(state => state !== 'locked') ? 'open' : 'locked';
}

/** 천문도의 길: 천문도 표의 SVG 경로를 그대로 그린다(0~100 상자를 그림에 맞춰 늘인다). 숨긴 길(권역 보스 → 외부 피나클)은 그리지 않는다. */
export function routesHtml(runtime) {
    const paths = runtime.deps.ATLAS.starChart.routes.filter(route => !route.hidden)
        .map(route => `<path class="is-${routeState(runtime, route)}" d="${route.path}" vector-effect="non-scaling-stroke"/>`).join('');
    return `<svg class="as-routes" viewBox="${runtime.deps.ATLAS.starChart.viewBox.join(' ')}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

/** 세계 지도로 돌아가는 단추: 세계 지도에서 아틀라스 입구가 선 바로 그 자리(2026-11-10 사용자). 누르면 입구와 같은 전환이 거꾸로 돈다. */
export function homeHtml(runtime) {
    const at = runtime.deps.worldMapUi.atlasEntranceSpot();
    return `<button type="button" class="as-home" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%" aria-label="${(0, runtime.deps._t)('세계 지도')}" data-tip="${(0, runtime.deps._t)('세계 지도')}"
            onclick="worldMapUi.turnToWorld(this)"><i aria-hidden="true" style="background-image:url('${runtime.deps.worldMapUi.atlasIcon('tree', '#e2a94a', false, true)}')"></i></button>`;
}

/** parts: 고른 것(node: 노드 id나 표지 id)과 held(node)(그 지도에 쓸 지침이 있는가). 외부 피나클 둘은 그리지 않는다(피나클 장치가 대신한다). */
export function chart(runtime, parts) {
    rememberScroll(runtime);
    noteFresh(runtime);
    runtime.state.unseen.delete(parts.node);
    const nodes = runtime.deps.atlas.nodes.filter(node => node.gate !== 'outer');
    const pins = nodes.map(node => (node.kind === 'gate' ? gatePinHtml(runtime, node, parts) : pinHtml(runtime, node, parts))).join('');
    return `<div class="as-chart" role="group" aria-label="${(0, runtime.deps._t)('천문도')}" style="background-image:url('${runtime.deps.ATLAS.starChart.picture.src}')">
            ${routesHtml(runtime)}${homeHtml(runtime)}${marksHtml(runtime, parts.node)}${pins}</div>`;
}

/** 좁은 화면에서 천문도는 옆으로 민다. 다시 그리기 전에 민 자리를 적어 두고(rememberScroll), 그린 뒤에 그 자리로 돌린다(settle).
 * 고른 것이 바뀌었거나 처음 그릴 때는 고른 것(없으면 열린 지도, 켤 수 있는 시작 육분의)이 가운데 오게 선다. 자리를 잡아 준 적 없는 그림
 * (보이지 않는 탭에서 그려 너비가 0이었다)의 자리는 적지 않는다: 처음 보일 때 가운데로 선다. */
export function rememberScroll(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .as-chart-box');
    runtime.state.scrollLeft = box && runtime.state.settled ? box.scrollLeft : null;
    runtime.state.settled = false;
}

export function settle(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .as-chart-box');
    if (!box || box.scrollWidth <= box.clientWidth) return;
    const focus = focusOf(box), key = focus ? focus.dataset.atlasNode || focus.dataset.atlasMark : '';
    const centre = key !== runtime.state.centredOn || runtime.state.scrollLeft === null;
    box.scrollLeft = centre && focus ? focus.offsetLeft - box.clientWidth / 2 : runtime.state.scrollLeft ?? box.scrollLeft;
    Object.assign(runtime.state, { settled: true, centredOn: key });
}

/** 가운데 세울 표식: 고른 것, 열린 싸움, 켤 수 있는 시작 육분의, 열린 지도 차례로. */
export function focusOf(box) {
    return ['.is-selected', '.is-running', '.as-mark.is-ready', '.as-pin.is-open'].map(selector => box.querySelector(selector)).find(Boolean) || null;
}

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

/** 화면의 상태 이름: 보너스는 더는 따로 보이지 않는다(완료). */
export function shownStatus(runtime, id) { return done(runtime, id) ? 'complete' : runtime.deps.atlas.status(runtime.deps.game, id); }

export function openIds(runtime) { return runtime.deps.atlas.nodes.filter(node => runtime.deps.atlas.status(runtime.deps.game, node.id) === 'open').map(node => node.id); }

export function revealing(runtime) { return runtime.deps.Date.now() - runtime.state.fresh.at < runtime.state.REVEAL_MS + 600; }
