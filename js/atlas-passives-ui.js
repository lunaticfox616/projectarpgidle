/** 세계수 아틀라스 패시브 보기 (data/atlas-passives.js · js/atlas-passives.js): 갈래마다 가운데 뿌리에서 세 줄기가 뻗는 둥근 나무.
 * 고리 넷이 맞물린다 — 뿌리, 줄기 첫 칸, 줄기 둘째 칸과 줄기 사이 노드, 주요 노드, 줄기 끝과 핵심 노드. 갈래마다 생김새가 다르다
 * (SHAPES: 줄기 방향, 고리 크기, 고리마다 비트는 각도, 2026-10-25 사용자 "각 패시브 별 구조 생긴 것도 다르게"). 도트 그림은
 * js/canvas-atlas-chart.js(paintWheel), 그 위 투명한 버튼이 누르기 · 읽기를 맡는다. 누르면 찍고, 찍힌 노드를 다시 누르면
 * 되돌린다(무료, 그 노드에만 기대는 노드가 없을 때).
 */
const atlasPassivesUi = (() => {
    const labels = ATLAS_PASSIVES.labels;
    // Branch directions (degrees, screen y down) and ring radii (0~100 wheel units around the centre 50), turned, sized and twisted per
    // wheel (twist: degrees more on each ring outwards, so the three branches curl into arms): 뿌리는 아래로 곧게 뻗고, 줄기는 안쪽이
    // 좁게 시계 방향으로 감기고, 가지는 반대로 감기고, 잎은 크게 소용돌이치고, 열매는 반대로 크게 감긴 둥근 송이다.
    const BRANCH = Object.freeze({ a: -90, b: 30, c: 150 });
    const SHAPES = Object.freeze({
        sustain: Object.freeze({ turn: 180, twist: 0, rings: Object.freeze([0, 12, 24, 35, 46]) }),
        loot: Object.freeze({ turn: 0, twist: 22, rings: Object.freeze([0, 9, 19, 33, 47]) }),
        boss: Object.freeze({ turn: 60, twist: -22, rings: Object.freeze([0, 13, 25, 35, 45]) }),
        content: Object.freeze({ turn: 0, twist: 38, rings: Object.freeze([0, 14, 26, 36, 46]) }),
        fruit: Object.freeze({ turn: 30, twist: -38, rings: Object.freeze([0, 15, 27, 37, 45]) })
    });
    const DEFAULT_SHAPE = SHAPES.sustain;
    const STEPS = Object.freeze({ 1: 1, 2: 2, N: 3, T: 4 });
    const RANK_NAME = Object.freeze({ root: '뿌리', small: '작은 노드', notable: '주요 노드', keystone: '핵심 노드' });
    // 2026-10-25 사용자: '누르면 찍습니다', '이어진 노드를 먼저 찍으세요'는 없앤다(노드 색이 말해 준다).
    const STATE_TEXT = Object.freeze({ taken: '찍음 (다시 누르면 되돌립니다)', open: '', locked: '' });
    let focusId = null, wheelId = null;
    const effectText = effect => Object.entries(effect).map(([key, value]) => labels[key][1] === 'on' ? labels[key][0] : `${labels[key][0]} +${value}${labels[key][1]}`).join(', ');
    const suffix = id => id.slice(id.indexOf('_') + 1);
    const rankOf = node => (suffix(node.id) === 'r' ? 'root' : node.rank);
    const status = id => atlasPassives.status(game, id);
    /** What pressing does now; a node waiting for its loop names it (js/atlas-passives.js loopOf). */
    const stateText = node => (atlasPassives.waits(game, node.id) ? `루프 ${atlasPassives.loopOf(node.id)}부터 찍을 수 있습니다` : STATE_TEXT[status(node.id)]);
    const withState = (text, node) => [text, stateText(node)].filter(Boolean).join(', ');
    const radians = degrees => degrees * Math.PI / 180;
    const between = (p, q) => Math.atan2(Math.sin(radians(BRANCH[p])) + Math.sin(radians(BRANCH[q])), Math.cos(radians(BRANCH[p])) + Math.cos(radians(BRANCH[q])));

    /** Ring and angle from the node's place (its id): the root, a step along a branch, between two branches, or a keystone between
     * the branches of the two notables it hangs on. */
    function place(node) {
        const key = suffix(node.id), [first, second] = key;
        if (key === 'r') return { ring: 0, angle: 0 };
        if (BRANCH[first] !== undefined && STEPS[second]) return { ring: STEPS[second], angle: radians(BRANCH[first]) };
        if (BRANCH[first] !== undefined && BRANCH[second] !== undefined) return { ring: 2, angle: between(first, second) };
        const [p, q] = node.requires.map(id => suffix(id)[0]);
        return { ring: 4, angle: between(p, q) };
    }
    const shapeOf = wheelId => SHAPES[wheelId] || DEFAULT_SHAPE;
    /** A place on the wheel's own shape: turned, its ring at the wheel's radius, twisted a little more on each ring outwards. */
    function point({ ring, angle }, shape) {
        const turned = angle + radians(shape.turn + shape.twist * ring), radius = shape.rings[ring];
        return { x: 50 + radius * Math.cos(turned), y: 50 + radius * Math.sin(turned), ring, angle: turned };
    }
    /** Taken on both ends: gold; the way on from a taken node: sap; the rest waits dim. */
    function linkState(a, b) {
        const ends = [status(a), status(b)];
        if (ends.every(state => state === 'taken')) return 'done';
        return ends.includes('taken') ? 'lit' : 'dim';
    }
    function wheelModel(wheel) {
        const shape = shapeOf(wheel.id), at = new Map(wheel.nodes.map(node => [node.id, point(place(node), shape)]));
        const links = wheel.nodes.flatMap(node => node.requires.map(req => {
            const from = at.get(req), to = at.get(node.id), sameRing = from.ring === to.ring && from.ring > 0;
            return { from, to, arc: sameRing ? { radius: shape.rings[from.ring], from: from.angle, to: to.angle } : null, state: linkState(req, node.id) };
        }));
        const nodes = wheel.nodes.map(node => ({ ...at.get(node.id), rank: rankOf(node), state: status(node.id) }));
        return { tint: wheel.tint, rings: shape.rings, nodes, links };
    }
    /** Paints every wheel on screen at about one dot per 2 CSS px (js/atlas-ui.js calls it after rendering and on resizes). */
    function paint() {
        document.querySelectorAll('#ui-atlas .atlas-wheel-art').forEach(box => {
            const wheel = ATLAS_PASSIVES.wheels.find(row => row.id === box.dataset.wheel), canvas = box.querySelector('canvas');
            if (wheel && canvas && box.clientWidth) atlasChartArt.paintWheel(canvas, Math.max(80, Math.round(box.clientWidth / 2)), wheelModel(wheel));
        });
    }

    function toggle(id) {
        focusId = id;
        hideInfoTooltip(); // a tap also fires the hover card; the note under the wheel shows the passive now
        const reason = game.atlas.passives.includes(id) ? atlasPassives.refund(game, id) : atlasPassives.allocate(game, id);
        if (reason) addLog(reason, 'attack-monster');
        else {
            atlas.setLoadout(game, game.atlas.loadout); // refunding the slot passive shrinks the loadout to the slots left
            queueImportantSave(200);
        }
        atlasUi.refresh();
    }
    function noteBody(node) {
        if (!node) return '';
        return `<strong>${escapeHTML(node.name)}</strong> <small>${withState(RANK_NAME[rankOf(node)], node)}</small>
            <br>${escapeHTML(effectText(node.effect))}`;
    }
    /** Pointer or keyboard on a passive: the note beside the wheel reads it; leaving shows the pressed one again. A floating card
     * covered that note (review 6). */
    function hint(event, id) {
        const wheel = event.currentTarget.closest('.atlas-wheel'), note = wheel && wheel.querySelector('.atlas-wheel-note');
        const node = atlasPassives.nodes.get(id || focusId);
        if (note) note.innerHTML = noteBody(node && node.wheel === event.currentTarget.closest('.atlas-wheel-art').dataset.wheel ? node : null);
    }
    function nodeHtml(node, at) {
        const state = status(node.id), rank = rankOf(node);
        const label = withState(`${node.name}, ${RANK_NAME[rank]}, ${effectText(node.effect)}`, node);
        return `<button class="atlas-passive-node rank-${rank} is-${state}${node.id === focusId ? ' is-focus' : ''}" style="--x:${at.x}%;--y:${at.y}%"
            aria-pressed="${state === 'taken'}" aria-label="${escapeHTML(label)}" onclick="atlasPassivesUi.toggle('${node.id}')"
            onmouseenter="atlasPassivesUi.hint(event,'${node.id}')" onfocus="atlasPassivesUi.hint(event,'${node.id}')"
            onmouseleave="atlasPassivesUi.hint(event,null)" onblur="atlasPassivesUi.hint(event,null)"></button>`;
    }
    /** Under each wheel: the passive last pressed there (a phone has no hover), else how the wheel reads. */
    function noteHtml(wheel) {
        return `<p class="atlas-wheel-note">${noteBody(wheel.nodes.find(row => row.id === focusId))}</p>`;
    }
    /** 갈래는 한 번에 하나만 보인다: 바퀴 넷(2×2)이 창 높이를 넘어 둘째 줄과 노드 설명이 화면 밖이었다(검토 5차). */
    const shownWheelId = () => wheelId || ATLAS_PASSIVES.wheels[0].id;
    function pick(id) {
        wheelId = id;
        hideInfoTooltip();
        atlasUi.refresh();
    }
    function tabsHtml() {
        return `<nav class="atlas-wheel-tabs" aria-label="패시브 갈래">${ATLAS_PASSIVES.wheels.map(wheel => {
            const taken = wheel.nodes.filter(node => game.atlas.passives.includes(node.id)).length;
            return `<button type="button" style="--tint:${wheel.tint}" aria-pressed="${wheel.id === shownWheelId()}" onclick="atlasPassivesUi.pick('${wheel.id}')">`
                + `${escapeHTML(wheel.name)}<span>${taken}/${wheel.nodes.length}</span></button>`;
        }).join('')}</nav>`;
    }
    function wheelHtml(wheel) {
        const at = new Map(wheel.nodes.map(node => [node.id, point(place(node), shapeOf(wheel.id))]));
        return `<section class="atlas-wheel" style="--tint:${wheel.tint}" aria-label="${escapeHTML(wheel.name)}"${wheel.id === shownWheelId() ? '' : ' hidden'}>
            <div class="atlas-wheel-art" data-wheel="${wheel.id}"><canvas aria-hidden="true"></canvas>${wheel.nodes.map(node => nodeHtml(node, at.get(node.id))).join('')}</div>
            ${noteHtml(wheel)}</section>`;
    }
    function totalsHtml() {
        const total = atlasPassives.effects(game), text = effectText(total);
        return text ? `<p class="atlas-passive-total">합계: ${escapeHTML(text)}</p>` : '';
    }
    function html() {
        const used = game.atlas.passives.length, points = atlas.points(game);
        return `<div class="atlas-passives"><p class="atlas-muted">아틀라스 포인트 ${used}/${points} 사용</p>${totalsHtml()}${tabsHtml()}<div class="atlas-wheels">${ATLAS_PASSIVES.wheels.map(wheelHtml).join('')}</div></div>`;
    }
    return Object.freeze({ html, paint, toggle, hint, pick });
})();
safeExposeGlobals({ atlasPassivesUi });
