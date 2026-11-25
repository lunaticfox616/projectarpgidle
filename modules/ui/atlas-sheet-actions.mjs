// 천문도(아틀라스 개편 2026-11-24 D1): 양피지 그림 위의 길(SVG), 지도 표식(양피지 원판), 보스 자리(그림의 문장 위 누르는 자리와 이름 판), 시작 육분의와 피나클 장치.
// 모양은 사용자 패키지의 시뮬레이터(.atlas-world-map)를 따른다.
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

/** 지도 표식(패키지 시뮬레이터의 모양): 양피지 원판 안에 천문도 등급, 테는 권역의 빛깔(--pin). 이름과 등급은 마우스를 올리면(data-tip),
 * 고르면 이웃 표식을 덮지 않는 쪽의 판에(platePlace). */
export function pinHtml(runtime, node, parts) {
    const status = shownStatus(runtime, node.id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), picked = node.id === parts.node;
    const tip = (0, runtime.deps.escapeHTML)(`${(0, runtime.deps._t)(node.name)} T${tier}`), name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name));
    return `<button type="button" class="as-pin is-${status} ${stateClasses(runtime, node.id, parts.node)}" style="--x:${node.point[0]}%;--y:${node.point[1]}%;--pin:${runtime.state.TONE[node.id]}"
            data-atlas-node="${node.id}" data-tip="${tip}" aria-pressed="${picked}" aria-label="${tip}" onclick="atlasSheetUi.tap('${node.id}')"><b>${tier}</b>${picked ? `<em class="at-${platePlace(runtime, node)}">${name}</em>` : ''}</button>`;
}

/** 고른 지도의 이름 판 자리: 아래, 위, 오른쪽, 왼쪽 가운데 다른 표식과 천문도 가장자리에 덜 걸리는 첫 자리. 크기는 PC 천문도(약 800x446px) 기준의 어림. */
export function platePlace(runtime, node) {
    const width = (0, runtime.deps._t)(node.name).length * 12 + 12, at = point => [point[0] * 8, point[1] * 4.46], [x, y] = at(node.point);
    const others = runtime.deps.atlas.nodes.filter(other => other.id !== node.id && other.gate !== 'outer').map(other => [...at(other.point), other.kind === 'gate' ? 22 : 12]);
    const boxes = { below: [x - width / 2, y + 16, x + width / 2, y + 34], above: [x - width / 2, y - 34, x + width / 2, y - 16],
        right: [x + 16, y - 9, x + 16 + width, y + 9], left: [x - 16 - width, y - 9, x - 16, y + 9] };
    const hits = ([left, top, right, bottom]) => others.filter(([ox, oy, r]) => ox + r > left && ox - r < right && oy + r > top && oy - r < bottom).length
        + Number(left < 0 || top < 0 || right > 800 || bottom > 446) * 9;
    return Object.keys(boxes).reduce((best, key) => (hits(boxes[key]) < hits(boxes[best]) ? key : best), 'below');
}

/** 보스 자리(패키지 시뮬레이터의 모양): 그림에 이미 있는 문장(신전, 해, 달, 세계수의 두 틈) 위의 투명한 누르는 자리와 이름 판.
 * 들어갈 수 있으면(is-ready) 테와 옅은 빛이 서고 판의 색이 뒤집힌다. 마친 자리는 판 앞에 표시. */
export function gatePinHtml(runtime, node, parts) {
    const status = shownStatus(runtime, node.id), label = gateLabel(runtime, node), name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name));
    const ready = status === 'open' && !runtime.deps.game.atlas.run ? ' is-ready' : '';
    return `<button type="button" class="as-gate gate-${node.gate} is-${status}${ready} ${stateClasses(runtime, node.id, parts.node)}" style="--x:${node.point[0]}%;--y:${node.point[1]}%;--pin:${runtime.state.TONE[node.id]}"
            data-atlas-node="${node.id}" data-tip="${name}" aria-pressed="${node.id === parts.node}" aria-label="${name}" onclick="atlasSheetUi.tap('${node.id}')">`
        + `${label ? `<small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</small>` : ''}</button>`;
}

/** 패키지의 이름 판(태양 보스, 달 보스, 위 입구, 아래 입구, 중간 보스). 외부 피나클은 판이 없다(피나클 장치가 대신한다). */
export function gateLabel(runtime, node) { return runtime.deps.ATLAS.starChart.bosses.find(row => row.id === node.id)?.gate || ''; }

/** 표지 둘(패키지 시뮬레이터의 이름 판): 시작 육분의(켤 수 있으면 손짓)와 피나클 장치(외부 피나클 둘이 그 자리에 선다, 둘 중 하나가 열리면 열림). */
export function marksHtml(runtime, picked) {
    const marks = runtime.deps.ATLAS.starChart.landmarks;
    return [['entry', sextantState(runtime)], ['device', deviceState(runtime)]].map(([id, status]) => {
        const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(marks[id].name)), [x, y] = runtime.state.MARK_AT[id];
        return `<button type="button" class="as-mark mark-${id} is-${status} ${stateClasses(runtime, id, picked)}" style="--x:${x}%;--y:${y}%" data-atlas-mark="${id}"
                aria-pressed="${id === picked}" onclick="atlasSheetUi.tap('${id}')">${name}</button>`;
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

/** 천문도의 길: 천문도 표의 SVG 경로를 그대로, 패키지 시뮬레이터처럼 두 겹으로 그린다(아래에 밝은 테, 위에 갈래 빛깔의 가는 선).
 * 0~100 상자를 그림에 맞춰 늘인다. 숨긴 길(권역 보스 → 외부 피나클)은 그리지 않는다. 고른 곳까지 가는 길이 아닌 길은 옅게(is-muted). */
export function routesHtml(runtime, picked) {
    const path = pathTo(runtime, picked), forks = runtime.state.FORKS;
    const paths = runtime.deps.ATLAS.starChart.routes.filter(route => !route.hidden).map(route => {
        const muted = path && !(path.has(route.to) && (route.from === 'entry' || path.has(route.from))) ? ' is-muted' : '';
        return `<g class="as-route side-${route.side} is-${routeState(runtime, route)}${forks.has(route.to) ? ' is-fork' : ''}${muted}">`
            + `<path class="as-route-casing" d="${route.path}" vector-effect="non-scaling-stroke"/><path class="as-route-ink" d="${route.path}" vector-effect="non-scaling-stroke"/></g>`;
    }).join('');
    return `<svg class="as-routes" viewBox="${runtime.deps.ATLAS.starChart.viewBox.join(' ')}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

/** 고른 노드에서 시작 육분의까지 거슬러 오르는 노드들(갈래가 둘인 보스 자리는 둘 다). 노드를 고르지 않았으면(표지, 없음) null: 모든 길이 짙다. */
export function pathTo(runtime, picked) {
    if (!runtime.deps.atlas.node(picked)) return null;
    const routes = runtime.deps.ATLAS.starChart.routes, seen = new Set([picked]), queue = [picked];
    while (queue.length) {
        const id = queue.shift();
        routes.filter(route => route.to === id && !seen.has(route.from)).forEach(route => { seen.add(route.from); queue.push(route.from); });
    }
    return seen;
}

/** 세계 지도로 돌아가는 단추: 세계 지도에서 아틀라스 입구가 선 바로 그 자리(2026-11-10 사용자). 누르면 입구와 같은 전환이 거꾸로 돈다. */
export function homeHtml(runtime) {
    const at = runtime.deps.worldMapUi.atlasEntranceSpot();
    return `<button type="button" class="as-home" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%" aria-label="${(0, runtime.deps._t)('세계 지도')}" data-tip="${(0, runtime.deps._t)('세계 지도')}"
            onclick="worldMapUi.turnToWorld(this)"><i aria-hidden="true" style="background-image:url('${runtime.deps.worldMapUi.atlasIcon('tree', '#e2a94a', false, true)}')"></i></button>`;
}

/** parts: 고른 것(node: 노드 id나 표지 id). 외부 피나클 둘은 그리지 않는다(피나클 장치가 대신한다). */
export function chart(runtime, parts) {
    rememberScroll(runtime);
    noteFresh(runtime);
    runtime.state.unseen.delete(parts.node);
    const nodes = runtime.deps.atlas.nodes.filter(node => node.gate !== 'outer');
    const pins = nodes.map(node => (node.kind === 'gate' ? gatePinHtml(runtime, node, parts) : pinHtml(runtime, node, parts))).join('');
    return `<div class="as-chart" role="group" aria-label="${(0, runtime.deps._t)('천문도')}" style="background-image:url('${runtime.deps.ATLAS.starChart.picture.src}')">
            ${routesHtml(runtime, parts.node)}${homeHtml(runtime)}${marksHtml(runtime, parts.node)}${pins}</div>`;
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
    const focus = focusOf(box), key = focusKey(focus);
    if (runtime.state.settled && key === runtime.state.centredOn) return; // 이 그림은 이미 자리를 잡았다(창 크기가 바뀌어 다시 불림): 그리기 전의 자리로 되돌리지 않는다
    const centre = key !== runtime.state.centredOn || runtime.state.scrollLeft === null;
    box.scrollLeft = centre && focus ? focus.offsetLeft - box.clientWidth / 2 : runtime.state.scrollLeft ?? box.scrollLeft;
    Object.assign(runtime.state, { settled: true, centredOn: key });
}

/** 가운데 세울 표식: 고른 것, 열린 싸움, 켤 수 있는 시작 육분의, 열린 지도 차례로. */
export function focusOf(box) {
    return ['.is-selected', '.is-running', '.as-mark.is-ready', '.as-pin.is-open'].map(selector => box.querySelector(selector)).find(Boolean) || null;
}

export function focusKey(focus) { return focus ? focus.dataset.atlasNode || focus.dataset.atlasMark : ''; }

export function done(runtime, id) { return ['complete', 'bonus'].includes(runtime.deps.atlas.status(runtime.deps.game, id)); }

/** 화면의 상태 이름: 보너스는 더는 따로 보이지 않는다(완료). */
export function shownStatus(runtime, id) { return done(runtime, id) ? 'complete' : runtime.deps.atlas.status(runtime.deps.game, id); }

export function openIds(runtime) { return runtime.deps.atlas.nodes.filter(node => runtime.deps.atlas.status(runtime.deps.game, node.id) === 'open').map(node => node.id); }

export function revealing(runtime) { return runtime.deps.Date.now() - runtime.state.fresh.at < runtime.state.REVEAL_MS + 600; }
