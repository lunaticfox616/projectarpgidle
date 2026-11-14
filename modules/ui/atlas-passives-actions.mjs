/** Ring and angle from the node's place (its id): the root, a step along a branch, between two branches, or a keystone between
* the branches of the two notables it hangs on. */
export function place(runtime, node) {
    const key = suffix(runtime, node.id), [first, second] = key;
    if (key === 'r') return { ring: 0, angle: 0 };
    if (runtime.state.BRANCH[first] !== undefined && runtime.state.STEPS[second]) return { ring: runtime.state.STEPS[second], angle: radians(runtime, runtime.state.BRANCH[first]) };
    if (runtime.state.BRANCH[first] !== undefined && runtime.state.BRANCH[second] !== undefined) return { ring: 2, angle: between(runtime, first, second) };
    const [p, q] = node.requires.map(id => suffix(runtime, id)[0]);
    return { ring: 4, angle: between(runtime, p, q) };
}

/** A place on the wheel's own shape: turned, its ring at the wheel's radius, twisted a little more on each ring outwards. */
export function point(runtime, { ring, angle }, shape) {
    const turned = angle + radians(runtime, shape.turn + shape.twist * ring), radius = shape.rings[ring];
    return { x: 50 + radius * Math.cos(turned), y: 50 + radius * Math.sin(turned), ring, angle: turned };
}

/** Taken on both ends: gold; the way on from a taken node: sap; the rest waits dim. */
export function linkState(runtime, a, b) {
    const ends = [status(runtime, a), status(runtime, b)];
    if (ends.every(state => state === 'taken')) return 'done';
    return ends.includes('taken') ? 'lit' : 'dim';
}

export function wheelModel(runtime, wheel) {
    const shape = shapeOf(runtime, wheel.id), at = new Map(wheel.nodes.map(node => [node.id, point(runtime, place(runtime, node), shape)]));
    const links = wheel.nodes.flatMap(node => node.requires.map(req => {
        const from = at.get(req), to = at.get(node.id), sameRing = from.ring === to.ring && from.ring > 0;
        return { from, to, arc: sameRing ? { radius: shape.rings[from.ring], from: from.angle, to: to.angle } : null, state: linkState(runtime, req, node.id) };
    }));
    const nodes = wheel.nodes.map(node => ({ ...at.get(node.id), rank: rankOf(runtime, node), state: status(runtime, node.id) }));
    return { tint: wheel.tint, rings: shape.rings, nodes, links };
}

/** Paints every wheel on screen at about one dot per 2 CSS px (js/atlas-ui.js calls it after rendering and on resizes). */
export function paint(runtime) {
    runtime.deps.document.querySelectorAll('#ui-atlas .atlas-wheel-art').forEach(box => {
        const wheel = runtime.deps.ATLAS_PASSIVES.wheels.find(row => row.id === box.dataset.wheel), canvas = box.querySelector('canvas');
        if (wheel && canvas && box.clientWidth) runtime.deps.atlasChartArt.paintWheel(canvas, box.dataset.mini ? runtime.state.MINI_DOTS : Math.max(80, Math.round(box.clientWidth / 2)), wheelModel(runtime, wheel));
    });
}

export function toggle(runtime, id) {
    runtime.state.focusId = id;
    (0, runtime.deps.hideInfoTooltip)(); // a tap also fires the hover card; the note under the wheel shows the passive now
    const reason = runtime.deps.game.atlas.passives.includes(id) ? runtime.deps.atlasPassives.refund(runtime.deps.game, id) : runtime.deps.atlasPassives.allocate(runtime.deps.game, id);
    if (reason) (0, runtime.deps.addLog)(reason, 'attack-monster');
    else {
        runtime.deps.atlas.setLoadout(runtime.deps.game, runtime.deps.game.atlas.loadout); // refunding the slot passive shrinks the loadout to the slots left
        (0, runtime.deps.queueImportantSave)(200);
    }
    runtime.deps.atlasUi.refresh();
}

export function noteBody(runtime, node) {
    if (!node) return '';
    return `<strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</strong> <small>${withState(runtime, runtime.state.RANK_NAME[rankOf(runtime, node)], node)}</small>
            <br>${(0, runtime.deps.escapeHTML)(effectText(runtime, node.effect))}`;
}

/** Pointer or keyboard on a passive: the note beside the wheel reads it; leaving shows the pressed one again. A floating card
* covered that note (review 6). */
export function hint(runtime, event, id) {
    const wheel = event.currentTarget.closest('.atlas-wheel'), note = wheel && wheel.querySelector('.atlas-wheel-note');
    const node = runtime.deps.atlasPassives.nodes.get(id || runtime.state.focusId);
    if (note) note.innerHTML = noteBody(runtime, node && node.wheel === event.currentTarget.closest('.atlas-wheel-art').dataset.wheel ? node : null);
}

export function nodeHtml(runtime, node, at) {
    const state = status(runtime, node.id), rank = rankOf(runtime, node);
    const label = withState(runtime, `${node.name}, ${runtime.state.RANK_NAME[rank]}, ${effectText(runtime, node.effect)}`, node);
    return `<button class="atlas-passive-node rank-${rank} is-${state}${node.id === runtime.state.focusId ? ' is-focus' : ''}" style="--x:${at.x}%;--y:${at.y}%"
            aria-pressed="${state === 'taken'}" aria-label="${(0, runtime.deps.escapeHTML)(label)}" onclick="atlasPassivesUi.toggle('${node.id}')"
            onmouseenter="atlasPassivesUi.hint(event,'${node.id}')" onfocus="atlasPassivesUi.hint(event,'${node.id}')"
            onmouseleave="atlasPassivesUi.hint(event,null)" onblur="atlasPassivesUi.hint(event,null)"></button>`;
}

/** Under each wheel: the passive last pressed there (a phone has no hover), else how the wheel reads. */
export function noteHtml(runtime, wheel) {
    return `<p class="atlas-wheel-note">${noteBody(runtime, wheel.nodes.find(row => row.id === runtime.state.focusId))}</p>`;
}

export function pick(runtime, id) {
    runtime.state.wheelId = id;
    (0, runtime.deps.hideInfoTooltip)();
    runtime.deps.atlasUi.refresh();
}

export function tabsHtml(runtime) {
    return `<nav class="atlas-wheel-tabs" aria-label="${(0, runtime.deps._t)('패시브 갈래')}">${runtime.deps.ATLAS_PASSIVES.wheels.map(wheel => {
        const taken = wheel.nodes.filter(node => runtime.deps.game.atlas.passives.includes(node.id)).length;
        return `<button type="button" style="--tint:${wheel.tint}" aria-pressed="${wheel.id === shownWheelId(runtime)}" onclick="atlasPassivesUi.pick('${wheel.id}')">`
            + `${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}<span>${taken}/${wheel.nodes.length}</span></button>`;
    }).join('')}</nav>`;
}

export function wheelHtml(runtime, wheel, side = '') {
    const at = new Map(wheel.nodes.map(node => [node.id, point(runtime, place(runtime, node), shapeOf(runtime, wheel.id))]));
    return `<section class="atlas-wheel" style="--tint:${wheel.tint}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}"${wheel.id === shownWheelId(runtime) ? '' : ' hidden'}>
            <div class="atlas-wheel-art" data-wheel="${wheel.id}"><canvas aria-hidden="true"></canvas>${wheel.nodes.map(node => nodeHtml(runtime, node, at.get(node.id))).join('')}</div>
            ${side ? `<div class="as-wheel-side"><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}</h3>${noteHtml(runtime, wheel)}${side}</div>` : noteHtml(runtime, wheel)}</section>`;
}

/** 왼쪽 줄: 갈래마다 지금 찍힌 모습 그대로의 작은 바퀴와 이름, 찍은 수 막대. 누르면 그 바퀴가 가운데에 크게 선다. */
export function railHtml(runtime) {
    return `<nav class="as-wheel-rail" aria-label="${(0, runtime.deps._t)('패시브 갈래')}">${runtime.deps.ATLAS_PASSIVES.wheels.map(wheel => {
        const taken = wheel.nodes.filter(node => runtime.deps.game.atlas.passives.includes(node.id)).length;
        return `<button type="button" style="--tint:${wheel.tint}" aria-pressed="${wheel.id === shownWheelId(runtime)}" onclick="atlasPassivesUi.pick('${wheel.id}')">`
            + `<span class="atlas-wheel-art" data-wheel="${wheel.id}" data-mini="1"><canvas aria-hidden="true"></canvas></span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}</b>`
            + `<small>${taken}/${wheel.nodes.length}</small><i style="--fill:${Math.round(taken / wheel.nodes.length * 100)}%"></i></button>`;
    }).join('')}</nav>`;
}

/** 오른쪽 칸 아래: 찍은 것의 합계를 한 줄에 하나씩. */
export function totalRowsHtml(runtime) {
    const rows = Object.entries(runtime.deps.atlasPassives.effects(runtime.deps.game)).filter(([key, value]) => value && runtime.state.labels[key]).map(([key, value]) =>
        `<li><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.state.labels[key][0]))}</span>${runtime.state.labels[key][1] === 'on' ? '' : `<b>+${value}${runtime.state.labels[key][1]}</b>`}</li>`).join('');
    return `<h4>${(0, runtime.deps._t)('합계')}</h4>${rows ? `<ul class="as-passive-totals">${rows}</ul>` : `<p class="atlas-muted">${(0, runtime.deps._t)('아직 찍은 패시브가 없습니다.')}</p>`}`;
}

export function sheetHtml(runtime) {
    const used = runtime.deps.game.atlas.passives.length, points = runtime.deps.atlas.points(runtime.deps.game), side = totalRowsHtml(runtime);
    return `<div class="atlas-passives as-passives">${railHtml(runtime)}<div class="atlas-wheels">${runtime.deps.ATLAS_PASSIVES.wheels.map(wheel => wheelHtml(runtime, wheel, side)).join('')}</div>
            <p class="as-passive-points" style="--fill:${points ? Math.round(used / points * 100) : 0}%"><b>${(0, runtime.deps._t)('아틀라스 포인트 {used}/{points} 사용', { used, points })}</b></p></div>`;
}

export function totalsHtml(runtime) {
    const total = runtime.deps.atlasPassives.effects(runtime.deps.game), text = effectText(runtime, total);
    return text ? `<p class="atlas-passive-total">${(0, runtime.deps._t)('합계: {text}', { text: (0, runtime.deps.escapeHTML)(text) })}</p>` : '';
}

export function html(runtime) {
    if (runtime.deps.atlasSheetUi.on()) return sheetHtml(runtime);
    const used = runtime.deps.game.atlas.passives.length, points = runtime.deps.atlas.points(runtime.deps.game);
    return `<div class="atlas-passives"><p class="atlas-muted">${(0, runtime.deps._t)('아틀라스 포인트 {used}/{points} 사용', { used, points })}</p>${totalsHtml(runtime)}${tabsHtml(runtime)}<div class="atlas-wheels">${runtime.deps.ATLAS_PASSIVES.wheels.map(runtime.handlers.wheelHtml).join('')}</div></div>`;
}

export function effectText(runtime, effect) { return Object.entries(effect).map(([key, value]) => runtime.state.labels[key][1] === 'on' ? runtime.state.labels[key][0] : `${runtime.state.labels[key][0]} +${value}${runtime.state.labels[key][1]}`).join(', '); }

export function suffix(runtime, id) { return id.slice(id.indexOf('_') + 1); }

export function rankOf(runtime, node) { return suffix(runtime, node.id) === 'r' ? 'root' : node.rank; }

export function status(runtime, id) { return runtime.deps.atlasPassives.status(runtime.deps.game, id); }

export function stateText(runtime, node) { return runtime.deps.atlasPassives.waits(runtime.deps.game, node.id) ? (0, runtime.deps._t)('루프 {loopOf}부터 찍을 수 있습니다', { loopOf: runtime.deps.atlasPassives.loopOf(node.id) }) : runtime.state.STATE_TEXT[status(runtime, node.id)]; }

export function withState(runtime, text, node) { return [text, stateText(runtime, node)].filter(Boolean).join(', '); }

export function radians(runtime, degrees) { return degrees * Math.PI / 180; }

export function between(runtime, p, q) { return Math.atan2(Math.sin(radians(runtime, runtime.state.BRANCH[p])) + Math.sin(radians(runtime, runtime.state.BRANCH[q])), Math.cos(radians(runtime, runtime.state.BRANCH[p])) + Math.cos(radians(runtime, runtime.state.BRANCH[q]))); }

export function shapeOf(runtime, wheelId) { return runtime.state.SHAPES[wheelId] || runtime.state.DEFAULT_SHAPE; }

export function shownWheelId(runtime) { return runtime.state.wheelId || runtime.deps.ATLAS_PASSIVES.wheels[0].id; }
