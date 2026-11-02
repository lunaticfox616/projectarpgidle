/** 해금 탭(2026-11-02 사용자: 선행 조건 2~3개에서 갈래로 뻗어, 다음 해금만 고민하게. 한눈에 보이고 가로 스크롤로. 분류로 나누지 말 것).
 * 세 뿌리(장비 제련, 보조스킬룬, 루프 패시브)에서 뻗는 한 나무: 가로축은 루프, 줄은 unlockBoard가 채운다. 위에 해금 포인트, 해금 가능, 판 전체 지도, 아래에 고른 해금의 설명.
 * 규칙과 장부는 contentProgression, 사고 받는 일은 contentUnlockUi의 것이다. 칸에 NPC 그림은 넣지 않는다. */
const UNLOCK_BOARD_SIZE = Object.freeze({ cardGap: 10, minCardText: 36, gainFrom: 32, left: 38, ruler: 24, pip: 44, pipH: 22, minPitch: 30, maxPitch: 52, maxCard: 44, minRows: 8, maxRows: 24 });
// side: 가지가 먼저 뻗는 쪽(위 -1, 아래 1), at: 뿌리가 놓이는 높이(줄 수에 대한 몫). 심화 혼돈은 어느 뿌리에도 묶지 않지만 빛깔은 전투 쪽을 쓴다.
const UNLOCK_FAMILIES = Object.freeze([
    { id: 'gear', root: 'craft', side: -1, at: 0.22 },
    { id: 'rune', root: 'support', side: 1, at: 0.56 },
    { id: 'growth', root: 'loopTree', side: 1, at: 0.84 }
]);
const UNLOCK_LOOSE_FAMILY = Object.freeze({ deepChaos: 'rune' });

/** 판의 자리: 시간을 따라 앞에서부터 빈 줄을 찾아 채운다. 끝난 가지의 줄은 다음 가지가 쓰고, 그 많은 칸을 담는 가장 적은 줄 수를 고른다. 게임 상태를 읽지 않으니 한 번만 잰다. */
const unlockBoard = (() => {
    const SIZE = UNLOCK_BOARD_SIZE, byId = new Map(CONTENT_UNLOCK_CATALOG.map(def => [def.id, def]));
    const rows = CONTENT_UNLOCK_CATALOG.filter(def => def.minLoop > 1);
    const isStep = def => !!def.rail && byId.get(def.after)?.rail === def.rail;
    /** 줄기를 따라 뿌리까지 올라간 뿌리의 빛깔. */
    function familyOf(def) {
        let row = def;
        while (row.after && !UNLOCK_LOOSE_FAMILY[row.id]) row = byId.get(row.after);
        return UNLOCK_LOOSE_FAMILY[row.id] || UNLOCK_FAMILIES.find(family => family.root === row.id).id;
    }
    const slotKey = (loop, sub) => loop + sub / 10;
    let base = null;
    /** 칸 글의 폭: 갈무리 12px에서 한글은 12, 나머지는 8을 넘지 않는다. 글꼴이 늦게 와도 자리가 흔들리지 않게 글자로 센다. */
    const textWidth = text => [...String(text)].reduce((sum, letter) => sum + (letter.charCodeAt(0) > 0x2000 ? 12 : 8), 0);
    /** 카드 너비: 아이콘과, 이름과 얻는 글 중 긴 쪽이 한 줄에 들어가는 만큼(2026-11-02 사용자: 박스 크기를 글에 맞춘다). 칸이 낮으면 얻는 글은 안 보인다. */
    function cardWidth(def, height) {
        const texts = [unlockTabUi.cardName(def), ...(height >= SIZE.gainFrom ? [unlockTabUi.cardGain(def)] : [])];
        return height - 2 + 5 + Math.max(SIZE.minCardText, ...texts.map(textWidth)) + 8;
    }
    const pipWidth = def => Math.max(SIZE.pip, textWidth(unlockTabUi.upgradeEffect(def.series, def.rank)) + 10);
    const cellWidth = (def, height) => (isStep(def) ? pipWidth(def) : cardWidth(def, height));

    /** 앞 해금이 먼저 오는 차례. */
    function treeOrder() {
        const done = new Set(), order = [];
        while (order.length < rows.length) {
            const before = order.length;
            for (const def of rows) {
                if (done.has(def.id) || !contentProgression.parents(def).every(id => done.has(id))) continue;
                done.add(def.id);
                order.push(def);
            }
            if (order.length === before) throw new Error('unlock board: a cycle in the prerequisites');
        }
        return order;
    }
    function readTree() {
        const sorted = treeOrder(), loopOf = new Map(), depthOf = new Map(), kids = new Map(), sizes = new Map();
        for (const def of sorted) {
            const earlier = contentProgression.parents(def);
            const at = Math.max(def.minLoop, ...earlier.map(id => loopOf.get(id)));
            loopOf.set(def.id, at);
            depthOf.set(def.id, earlier.filter(id => loopOf.get(id) === at).reduce((best, id) => Math.max(best, depthOf.get(id) + 1), 0));
            if (def.after) kids.set(def.after, [...(kids.get(def.after) || []), def]);
        }
        for (const def of [...sorted].reverse()) sizes.set(def.id, 1 + (kids.get(def.id) || []).reduce((sum, kid) => sum + sizes.get(kid.id), 0));
        const familyRank = def => UNLOCK_FAMILIES.findIndex(row => row.id === familyOf(def));
        const order = rows.map((def, index) => ({ def, index, loop: loopOf.get(def.id), depth: depthOf.get(def.id), family: familyRank(def) }))
            .sort((p, q) => p.loop - q.loop || p.depth - q.depth || p.family - q.family || p.index - q.index).map(row => row.def);
        // 줄기: 부모의 줄을 그대로 잇는 자식. 강화 줄의 다음 단계가 먼저, 그다음 딸린 칸이 가장 많은 자식.
        const stems = new Map();
        kids.forEach((list, id) => stems.set(id, (list.find(isStep) || list.reduce((best, kid) => (sizes.get(kid.id) > sizes.get(best.id) ? kid : best))).id));
        return { loopOf, order, stems };
    }
    const free = (plan, row, from, to) => row >= 0 && row < plan.count && !plan.rows[row].some(([a, b, owner]) => owner !== plan.me && a < to && b > from);
    function nearRows(plan, start, side) {
        const list = [];
        for (let step = 1; step < plan.count; step++) list.push(start + side * step, start - side * step);
        return list;
    }
    /** 칸을 놓고, 줄기 자식이 올 때까지 그 줄을 맡아 둔다(강화 줄과 긴 가지가 끊기지 않게). from: 선이 이 줄에 들어오는 자리. */
    function putCell(plan, def, spot, from) {
        const here = slotKey(spot.loop, spot.sub), stem = plan.tree.stems.get(def.id);
        plan.rows[spot.row].push([from === null ? here - 0.01 : from, here + 0.01, '']);
        plan.spots.set(def.id, { def, ...spot });
        if (stem && plan.tree.loopOf.get(stem) > spot.loop) plan.rows[spot.row].push([here + 0.01, slotKey(plan.tree.loopOf.get(stem), 0) + 0.01, stem]);
        return true;
    }
    function placeRoot(plan, def) {
        const loop = plan.tree.loopOf.get(def.id), family = UNLOCK_FAMILIES.find(row => row.id === familyOf(def));
        const start = Math.round((plan.count - 1) * family.at), spot = slotKey(loop, 0);
        const row = [start, ...nearRows(plan, start, family.side)].find(value => free(plan, value, spot - 0.01, spot + 0.01));
        return row !== undefined && putCell(plan, def, { loop, sub: 0, row }, null);
    }
    function placeStep(plan, def, parent) {
        const loop = plan.tree.loopOf.get(def.id), from = slotKey(parent.loop, parent.sub) + 0.01;
        let sub = parent.loop === loop ? parent.sub + 1 : 0;
        while (sub < 9 && !free(plan, parent.row, slotKey(loop, sub) - 0.01, slotKey(loop, sub) + 0.01)) sub++;
        return free(plan, parent.row, from, slotKey(loop, sub) + 0.01) && putCell(plan, def, { loop, sub, row: parent.row }, from);
    }
    /** 부모가 맡아 둔 줄 또는 가까운 빈 줄에서, 부모부터 이 칸까지 비어 있는 곳을 찾는다. */
    function placeAlong(plan, def, parent, firstSub, withParentRow) {
        const loop = plan.tree.loopOf.get(def.id), side = UNLOCK_FAMILIES.find(row => row.id === familyOf(def)).side, parentKey = slotKey(parent.loop, parent.sub);
        const candidates = [...(withParentRow ? [parent.row] : []), ...nearRows(plan, parent.row, side)];
        const fromOf = row => parentKey + (row === parent.row ? 0.01 : 0.05);
        for (let sub = firstSub; sub < 9; sub++) {
            const row = candidates.find(value => free(plan, value, fromOf(value), slotKey(loop, sub) + 0.01));
            if (row !== undefined) return putCell(plan, def, { loop, sub, row }, fromOf(row));
        }
        return false;
    }
    /** 같은 루프의 이어짐: 바로 위아래에 쌓고, 자리가 없으면 칸을 나눈다. */
    function placeStacked(plan, def, parent) {
        const side = UNLOCK_FAMILIES.find(row => row.id === familyOf(def)).side, here = slotKey(parent.loop, parent.sub);
        const row = [parent.row + side, parent.row - side].find(value => free(plan, value, here - 0.01, here + 0.01));
        return row !== undefined ? putCell(plan, def, { loop: parent.loop, sub: parent.sub, row }, null) : placeAlong(plan, def, parent, parent.sub + 1, true);
    }
    function placeRow(plan, def) {
        const parent = def.after ? plan.spots.get(def.after) : null;
        if (!parent) return placeRoot(plan, def);
        if (isStep(def)) return placeStep(plan, def, parent);
        if (plan.tree.loopOf.get(def.id) === parent.loop) return placeStacked(plan, def, parent);
        return placeAlong(plan, def, parent, 0, plan.tree.stems.get(parent.def.id) === def.id);
    }
    function tryCount(count, tree) {
        const plan = { count, tree, rows: Array.from({ length: count }, () => []), spots: new Map(), me: '' };
        for (const def of tree.order) {
            plan.me = def.id;
            if (!placeRow(plan, def)) return null;
        }
        return plan.spots;
    }
    /** 칸마다 가로 자리: 그 칸에 놓인 가장 넓은 칸만큼. 같은 루프의 칸들을 한 눈금으로 묶는다. */
    function measureColumns(spots) {
        const slots = new Map();
        spots.forEach(spot => {
            const name = `${spot.loop}.${spot.sub}`, slot = slots.get(name) || { loop: spot.loop, sub: spot.sub, w: 0 };
            slot.w = Math.max(slot.w, cellWidth(spot.def, SIZE.maxCard) + SIZE.cardGap);
            slots.set(name, slot);
        });
        let x = SIZE.left;
        const columns = [...slots.values()].sort((a, b) => a.loop - b.loop || a.sub - b.sub), loops = [];
        columns.forEach(slot => {
            slot.x = x;
            x += slot.w;
            const last = loops[loops.length - 1];
            if (last && last.loop === slot.loop) last.w += slot.w;
            else loops.push({ loop: slot.loop, x: slot.x, w: slot.w });
        });
        spots.forEach(spot => { spot.col = slots.get(`${spot.loop}.${spot.sub}`); });
        return { loops, width: x + 40 };
    }
    function buildBase() {
        const tree = readTree();
        for (let count = SIZE.minRows; count <= SIZE.maxRows; count++) {
            const spots = tryCount(count, tree);
            if (spots) return { spots, count, ...measureColumns(spots) };
        }
        throw new Error('unlock board: no row count fits the tree');
    }
    const built = () => base || (base = buildBase());
    /** 판 높이에 맞춘 칸의 자리. */
    function layout(height) {
        const board = built(), pitch = Math.max(SIZE.minPitch, Math.min(SIZE.maxPitch, Math.floor((height - SIZE.ruler) / board.count)));
        const cardH = Math.min(pitch - 4, SIZE.maxCard), pos = new Map();
        board.spots.forEach((spot, id) => {
            const step = isStep(spot.def), rowTop = SIZE.ruler + spot.row * pitch, y = rowTop + Math.floor(pitch / 2);
            const w = cellWidth(spot.def, cardH), h = step ? SIZE.pipH : cardH, left = spot.col.x + Math.floor((spot.col.w - w) / 2);
            pos.set(id, { def: spot.def, step, row: spot.row, loop: spot.loop, left, right: left + w, y, top: y - Math.floor(h / 2), w, h, cx: left + Math.floor(w / 2), rowTop, rowBottom: rowTop + pitch, col: spot.col });
        });
        return { board, pos, pitch, cardH, height, fullHeight: Math.max(height, SIZE.ruler + board.count * pitch) };
    }
    const clearRun = (L, y, from, to, skip) => ![...L.pos.values()].some(row => !skip.includes(row.def.id) && row.y === y && row.left < to && row.right > from);
    /** 선: 줄기 선은 부모 칸을 나서자 꺾어 자식 줄을 따라간다(배치가 그 길을 비워 두었다). 다른 선행은 비어 있는 길을 찾고, 없으면 줄 사이 틈으로 간다. */
    function edgePoints(L, from, to) {
        const p = L.pos.get(from), c = L.pos.get(to), skip = [from, to], out = p.col.x + p.col.w, inn = c.col.x;
        if (p.col === c.col) return c.y > p.y ? [[p.cx, p.top + p.h], [p.cx, c.top]] : [[p.cx, p.top], [p.cx, c.top + c.h]];
        const toward = (x, y) => [[p.right, p.y], [x, p.y], [x, y], [c.left, c.y]];
        if (byId.get(to).after === from) return p.y === c.y ? [[p.right, p.y], [c.left, c.y]] : toward(out, c.y);
        if (clearRun(L, p.y, p.right, inn, skip)) return toward(inn, c.y);
        if (clearRun(L, c.y, out, c.left, skip)) return toward(out, c.y);
        const gap = c.y < p.y ? p.rowTop : p.rowBottom;
        return [[p.right, p.y], [out, p.y], [out, gap], [inn, gap], [inn, c.y], [c.left, c.y]];
    }
    return Object.freeze({ rows, built, layout, edgePoints, familyOf, isStep, has: id => rows.some(def => def.id === id) });
})();

const unlockTabUi = {
    selectedId: '',
    shownKey: '',
    centerNow: true,
    revealId: '',
    jump: 0,
    shownOwned: null,
    shownOpenParents: null,
    layoutNow: null,

    // ---------------------------------------------------------------- 칸의 상태
    /** owned 열림, ready 지금 가능, short 포인트 모자람, soon 앞 해금은 열렸고 루프나 조건을 기다림, far 앞 해금이 아직. */
    stateOf(def) {
        const status = contentProgression.status(def.id);
        if (status.unlocked) return 'owned';
        if (status.available) return 'ready';
        if (!this.parentsOpen(def)) return 'far';
        return contentProgression.requirements(def.id).every(row => row.met) ? 'short' : 'soon';
    },
    parentsOpen: def => contentProgression.parents(def).every(id => contentProgression.isUnlocked(id)),
    readyRows() {
        return unlockBoard.rows.filter(def => contentProgression.kind(def) === 'paid' && contentProgression.status(def.id).available);
    },
    openCount: () => unlockBoard.rows.filter(def => contentProgression.isUnlocked(def.id)).length,
    /** 강화 단계에서 되는 값: 칸에 그대로 적는다. rank 0은 강화 전. */
    upgradeEffect(series, rank) {
        const spec = CONTENT_UNLOCK_SERIES.find(row => row.series === series);
        if (series === 'offlineHours') return `${OFFLINE_PROGRESS_RECOGNITION_HOURS[rank]}시간`;
        if (series === 'offlineRate') return `${Math.round(OFFLINE_PROGRESS_EFFICIENCY_RATES[rank] * 100)}%`;
        if (series === 'bagPage') return `${1 + rank}페이지`;
        if (series === 'stumpSeal') return `${rank}칸`;
        if (series === 'stumpQuality') return `${130 + rank * 10}%`;
        return `+${rank * spec.storage}`;
    },
    gainOf(def) {
        if (!def.series) return def.gain || '';
        const after = this.upgradeEffect(def.series, def.rank);
        if (def.series === 'stumpSeal') return `봉인 칸 ${after}`;
        if (def.series === 'stumpQuality') return `품질 상한 ${after}${def.rank > 1 ? `, 접붙이기 ${def.rank + 4}단계` : ''}`;
        if (def.series === 'stumpStorage') return `보관함 ${after}칸`;
        return `${this.upgradeEffect(def.series, def.rank - 1)} → ${after}`;
    },
    cardName: def => (def.rail ? CONTENT_UNLOCK_RAILS.find(row => row.rail === def.rail).name : def.name),
    cardGain(def) { return this.gainOf(def) || (def.cost ? '' : '자동'); },
    /** 칸을 잠시 가리키면 나오는 설명: 칸에 보이지 않는 효과. 강화 단계는 칸에 값만 있어 이름과 값도 적는다. */
    tipOf(def, step) {
        const lines = step ? [`${def.name}, ${def.cost}P`, this.gainOf(def), def.description] : [this.gainOf(def), def.description];
        return escapeHTML(lines.filter(Boolean).join('\n'));
    },

    // ---------------------------------------------------------------- 판
    nodeClass(def, state, marks) {
        const lit = marks.lit.has(def.id) ? ' is-lit' : '', fresh = marks.fresh.has(def.id) ? ' is-fresh' : '', chosen = this.selectedId === def.id ? ' is-chosen' : '';
        return `fam-${unlockBoard.familyOf(def)} kind-${contentProgression.kind(def)} is-${state}${lit}${fresh}${chosen}`;
    },
    nodeHtml(def, L, marks) {
        const at = L.pos.get(def.id), state = this.stateOf(def), style = `left:${at.left}px;top:${at.top}px;width:${at.w}px;height:${at.h}px`, name = escapeHTML(def.name);
        if (at.step) return `<button type="button" class="unlock-pip ${this.nodeClass(def, state, marks)}" data-unlock-select="${def.id}" data-tip="${this.tipOf(def, true)}" aria-label="${name}" style="${style}">${escapeHTML(this.upgradeEffect(def.series, def.rank))}</button>`;
        const chip = state !== 'owned' && def.cost ? `<small class="unlock-chip">${def.cost}P</small>` : '';
        const second = L.cardH >= UNLOCK_BOARD_SIZE.gainFrom ? `<small class="unlock-card-gain">${escapeHTML(this.cardGain(def))}</small>` : '';
        return `<button type="button" class="unlock-card ${this.nodeClass(def, state, marks)}" data-unlock-select="${def.id}" data-tip="${this.tipOf(def, false)}" aria-label="${name}" style="${style};--icon:${at.h - 2}px">
            <span class="unlock-ic"><img src="${contentUnlockUi.art(def)}" alt="" draggable="false" loading="lazy">${chip}</span><span class="unlock-card-text"><b>${escapeHTML(this.cardName(def))}</b>${second}</span></button>`;
    },
    edgesHtml(L, marks) {
        const rank = { 'is-dim': 0, 'is-next': 1, 'is-lit': 2 }, edges = [];
        unlockBoard.rows.forEach(def => contentProgression.parents(def).forEach(from => {
            const points = unlockBoard.edgePoints(L, from, def.id), long = Math.abs(points[points.length - 1][0] - points[0][0]) > 300;
            const state = contentProgression.isUnlocked(def.id) ? 'is-lit' : contentProgression.isUnlocked(from) ? 'is-next' : 'is-dim';
            edges.push({ from, to: def.id, points, long, state, side: def.after !== from, fresh: marks.lit.has(from) && marks.fresh.has(def.id) });
        }));
        return edges.sort((a, b) => rank[a.state] - rank[b.state]).map(edge => {
            const name = `fam-${unlockBoard.familyOf(CONTENT_UNLOCK_CATALOG.find(row => row.id === edge.from))} ${edge.state}${edge.fresh ? ' is-new' : ''}${edge.long ? ' is-long' : ''}${edge.side ? ' is-side' : ''}`;
            return `<polyline class="${name}"${edge.fresh ? ' pathLength="1"' : ''} data-from="${edge.from}" data-to="${edge.to}" points="${edge.points.map(point => point.join(',')).join(' ')}"/>`;
        }).join('');
    },
    nowEntry(board) {
        return board.loops.filter(row => row.loop <= game.season).pop() || board.loops[0];
    },
    /** 고를 수 있는 칸은 늘 지금 루프나 그 왼쪽에 있다: 지금 칸을 오른쪽에 두어 왼쪽을 넓게 보여 준다. */
    nowLeft(scroller) {
        const now = this.nowEntry(this.layoutNow.board);
        return Math.max(0, now.x + now.w - scroller.clientWidth * 0.72);
    },
    railLabelsHtml(L) {
        const rails = new Map();
        unlockBoard.rows.filter(def => def.rail).forEach(def => {
            const at = L.pos.get(def.id), span = rails.get(def.rail) || { left: at.left, right: at.right, first: at.right, y: at.y, def };
            span.right = Math.max(span.right, at.right);
            rails.set(def.rail, span);
        });
        return [...rails.values()].map(span => `<div class="unlock-rail fam-${unlockBoard.familyOf(span.def)}" data-card-end="${span.first}" style="left:${span.left}px;width:${span.right - span.left}px;top:${span.y - 24}px"><span>${escapeHTML(this.cardName(span.def))}</span></div>`).join('');
    },
    canvasHtml(L, marks, height) {
        const board = L.board, now = this.nowEntry(board);
        const ticks = board.loops.map(row => `<span class="unlock-tick${row === now ? ' is-now' : ''}${row.loop < now.loop ? ' is-past' : ''}${row.loop % 5 === 0 ? ' is-major' : ''}" style="left:${row.x}px;width:${row.w}px">${row.loop}</span>`).join('');
        const bands = board.loops.map(row => `<span class="unlock-col${Math.floor(row.loop / 5) % 2 ? ' is-alt' : ''}" style="left:${row.x}px;width:${row.w}px"></span>`).join('');
        return `${bands}<div class="unlock-past" style="width:${now.x}px"></div><div class="unlock-now" style="left:${now.x}px;width:${now.w}px"></div><div class="unlock-ruler">${ticks}</div>
            <svg class="unlock-lines" width="${board.width}" height="${height}" aria-hidden="true">${this.edgesHtml(L, marks)}</svg>${this.railLabelsHtml(L)}${unlockBoard.rows.map(def => this.nodeHtml(def, L, marks)).join('')}`;
    },
    /** 판 전체 지도: 칸 하나가 점 하나. 눌러 옮기고 끌어서 훑는다. */
    overviewHtml(L) {
        const total = L.board.width, step = 38 / L.board.count;
        const ticks = unlockBoard.rows.map(def => {
            const at = L.pos.get(def.id);
            return `<i class="fam-${unlockBoard.familyOf(def)} is-${this.stateOf(def)}" style="left:${(at.cx / total * 100).toFixed(2)}%;top:${Math.round(at.row * step) + 1}px"></i>`;
        }).join('');
        const now = this.nowEntry(L.board);
        return `<div class="unlock-over" data-unlock-over="1">${ticks}<span class="unlock-over-now" style="left:${((now.x + now.w / 2) / total * 100).toFixed(2)}%"></span><span class="unlock-over-win"></span></div>`;
    },

    // ---------------------------------------------------------------- 머리와 설명
    pointsHtml() {
        const points = contentProgression.points();
        if (points.complete) return '<div class="unlock-stat is-points" data-tip="넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 됩니다."><strong class="is-done">전체 해금 완료</strong></div>';
        const tip = points.balance === points.remaining ? '남은 해금에 필요한 포인트를 모두 모았습니다. 넘치는 몫은 그루터기 함 접붙이기 점수가 됩니다.'
            : `루프마다 ${CONTENT_UNLOCK_POINT_AWARDS.perLoop}P. 남은 해금 비용을 넘는 몫은 그루터기 함 접붙이기 점수가 됩니다.`;
        return `<div class="unlock-stat is-points" data-tip="${tip}"><span>해금 포인트</span><strong>${points.balance}<small>P</small></strong></div>`;
    },
    headHtml() {
        const ready = this.readyRows().length;
        return `<header class="unlocks-head">${this.pointsHtml()}<button type="button" class="unlock-stat is-ready" data-unlock-next="1"${ready ? '' : ' disabled'}><span>해금 가능</span><strong>${ready}</strong></button>
            <div class="unlock-over-slot"></div><div class="unlock-stat is-total"><span>전체</span><strong>${this.openCount()}<small>/${unlockBoard.rows.length}</small></strong></div></header>`;
    },
    lifecycleHtml(def) {
        const life = def.lifecycle;
        if (!life) return '<p class="unlock-lifetime-note">기능 해금은 다음 루프에도 유지됩니다.</p>';
        return `<div class="unlock-lifetime"><h5>루프 전환 시, ${escapeHTML(life.label)}</h5><p class="unlock-lifetime-note">기능 해금은 영구 유지</p>
            ${life.kept ? `<p><b>유지</b>${escapeHTML(life.kept)}</p>` : ''}${life.reset ? `<p><b>초기화</b>${escapeHTML(life.reset)}</p>` : ''}</div>`;
    },
    relatedHtml(def) {
        if (!def.features) return '';
        return `<div class="unlock-related"><h5>포함된 성장 요소</h5>${def.features.map(row => `<p><strong>${escapeHTML(row.name)}</strong>${escapeHTML(row.description)}</p>`).join('')}</div>`;
    },
    /** 이 해금을 두고 누가 한 말(data/story-journal.js STORY_LOOP_MILESTONES). 글만 보인다. */
    loreHtml(id) {
        const lore = STORY_LOOP_MILESTONES[id];
        if (!lore) return '';
        return `<blockquote class="story-scene-quote"><p>${lore.narration.map(escapeHTML).join(' ')}</p><p>${escapeHTML(lore.quote)} - ${escapeHTML(speakerShortName(lore.speaker))}</p></blockquote>`;
    },
    moreHtml(def) {
        return `<details class="unlock-more" id="unlock-more-${def.id}"><summary>자세히</summary><div class="unlock-more-body">${this.loreHtml(def.id)}${this.lifecycleHtml(def)}${this.relatedHtml(def)}</div></details>`;
    },
    nextHtml(def) {
        const kids = unlockBoard.rows.filter(row => contentProgression.parents(row).includes(def.id));
        if (!kids.length) return '<div class="unlock-next"></div>';
        return `<div class="unlock-next"><h5>이어지는 해금</h5><div>${kids.map(kid => `<button type="button" class="unlock-next-chip fam-${unlockBoard.familyOf(kid)}" data-unlock-select="${kid.id}">
            <span class="unlock-ic"><img src="${contentUnlockUi.art(kid)}" alt="" loading="lazy"></span><span>${escapeHTML(unlockBoard.isStep(kid) ? kid.name : this.cardName(kid))}</span></button>`).join('')}</div></div>`;
    },
    actionHtml(def, status) {
        if (status.unlocked) return contentUnlockUi.routeAction(def) ? `<button type="button" class="unlock-act" data-open-content="${def.id}">바로 사용하기</button>` : '<button type="button" class="unlock-act" disabled>해금 완료</button>';
        if (contentProgression.kind(def) === 'auto') return `<button type="button" class="unlock-act" disabled>${escapeHTML(status.reason)}</button>`;
        return status.available ? `<button type="button" class="unlock-act is-go" data-unlock-content="${def.id}">${def.cost}P 해금</button>` : `<button type="button" class="unlock-act" disabled>${escapeHTML(status.reason)}</button>`;
    },
    detailHtml(def) {
        const status = contentProgression.status(def.id), kind = contentProgression.kind(def), kindName = kind === 'auto' ? '자동 개방' : def.rail ? '강화' : '포인트 해금';
        const conditions = contentProgression.requirements(def.id).map(row => `<span class="${row.met ? 'is-met' : ''}">${escapeHTML(row.label)}</span>`).join('');
        const gain = this.gainOf(def);
        return `<div class="unlock-detail-art fam-${unlockBoard.familyOf(def)} kind-${kind} is-${this.stateOf(def)}"><span class="unlock-ic"><img src="${contentUnlockUi.art(def)}" alt=""></span></div>
            <div class="unlock-detail-text"><span class="unlock-eyebrow fam-${unlockBoard.familyOf(def)}">${def.rail ? kindName : `${escapeHTML(def.group)}, ${kindName}`}</span><h4>${escapeHTML(def.name)}${gain ? `<em>${escapeHTML(gain)}</em>` : ''}</h4>
            <p class="unlock-desc">${escapeHTML(def.description)}</p><div class="unlock-reqs">${status.unlocked ? '' : conditions}</div></div>
            ${this.nextHtml(def)}<div class="unlock-detail-action">${contentUnlockUi.entryReward(def, status)}${this.actionHtml(def, status)}${this.moreHtml(def)}</div>`;
    },

    // ---------------------------------------------------------------- 그리기
    /** 고른 칸: 다른 창이 고른 칸, 없으면 지금 살 수 있는 첫 칸, 그것도 없으면 첫 뿌리. */
    settleSelection() {
        if (!unlockBoard.has(this.selectedId)) {
            const ready = this.readyRows();
            this.selectedId = (ready.find(def => !def.rail) || ready[0] || unlockBoard.rows.find(def => def.id === UNLOCK_FAMILIES[0].root)).id;
        }
        return CONTENT_UNLOCK_CATALOG.find(def => def.id === this.selectedId);
    },
    /** 지난번 그림과 달라진 칸: 방금 열린 칸은 번쩍이고, 앞 해금이 막 열린 칸은 튀어나온다. 처음 그릴 때는 소식이 아니다. */
    readMarks() {
        const owned = new Set(unlockBoard.rows.filter(def => contentProgression.isUnlocked(def.id)).map(def => def.id));
        const open = new Set(unlockBoard.rows.filter(def => this.parentsOpen(def)).map(def => def.id));
        const marks = { lit: new Set(), fresh: new Set() };
        if (this.shownOwned) {
            owned.forEach(id => { if (!this.shownOwned.has(id)) marks.lit.add(id); });
            open.forEach(id => { if (!this.shownOpenParents.has(id) && !owned.has(id)) marks.fresh.add(id); });
        }
        this.shownOwned = owned;
        this.shownOpenParents = open;
        return marks;
    },
    render() {
        const root = document.getElementById('content-unlock-panel');
        if (!root || !game.contentProgression) return;
        const selected = this.settleSelection();
        const states = unlockBoard.rows.map(def => this.stateOf(def)).join();
        const key = JSON.stringify([game.season, contentProgression.balance(), states, this.selectedId, root.clientHeight, root.clientWidth]);
        if (this.shownKey === key && root.childNodes.length) return;
        this.shownKey = key;
        this.bindPanel(root);
        const keep = root.querySelector('.unlocks-scroll')?.scrollLeft || 0, keepTop = root.querySelector('.unlocks-scroll')?.scrollTop || 0;
        captureUiDisclosureState(root);
        root.innerHTML = `${this.headHtml()}<div class="unlocks-view"><div class="unlocks-scroll"><div class="unlocks-canvas"></div></div>
            <div class="unlock-fade is-left"></div><div class="unlock-fade is-right"></div><div class="unlock-corner">루프</div>
            <button type="button" class="unlock-edge is-left" data-unlock-edge="-1"></button><button type="button" class="unlock-edge is-right" data-unlock-edge="1"></button>
            <button type="button" class="unlock-to-now" data-unlock-now="1">지금으로</button></div><aside class="unlock-detail" aria-label="고른 해금">${this.detailHtml(selected)}</aside>`;
        restoreUiDisclosureState(root);
        this.fillBoard(root, keep, keepTop);
    },
    fillBoard(root, keep, keepTop) {
        const view = root.querySelector('.unlocks-view'), height = view.clientHeight;
        if (!height) return; // 창이 닫혀 있다: 열려서 크기가 생기면 다시 그린다(bindPanel).
        const L = this.layoutNow = unlockBoard.layout(height), marks = this.readMarks();
        const canvas = root.querySelector('.unlocks-canvas'), scroller = root.querySelector('.unlocks-scroll');
        canvas.style.width = `${L.board.width}px`;
        canvas.style.height = `${L.fullHeight}px`;   // 창이 낮으면 판이 더 높다: 끌어서 위아래로 본다(startPan)
        canvas.innerHTML = this.canvasHtml(L, marks, L.fullHeight);
        root.querySelector('.unlock-over-slot').innerHTML = this.overviewHtml(L);
        scroller.scrollLeft = this.centerNow || this.shownSeason !== game.season ? this.nowLeft(scroller) : keep;
        scroller.scrollTop = keepTop;
        if (scroller.clientWidth) { this.centerNow = false; this.shownSeason = game.season; }
        this.syncOverlays(root);
        if (this.revealId) this.scrollToNode(root, this.revealId);
        this.revealId = '';
    },
    /** 지도 창과 화면 밖의 고를 거리: 스크롤마다 다시 그리지 않고 값만 옮긴다. */
    syncOverlays(root) {
        const scroller = root.querySelector('.unlocks-scroll'), win = root.querySelector('.unlock-over-win');
        if (!scroller || !win || !this.layoutNow) return;
        const total = this.layoutNow.board.width, left = scroller.scrollLeft, width = scroller.clientWidth;
        win.style.left = `${(left / total * 100).toFixed(2)}%`;
        win.style.width = `${(width / total * 100).toFixed(2)}%`;
        const spots = this.readyRows().map(def => this.layoutNow.pos.get(def.id));
        const paint = (selector, count, label) => {
            const el = root.querySelector(selector);
            el.textContent = label(count);
            el.classList.toggle('is-on', count > 0);
        };
        paint('.unlock-edge.is-left', spots.filter(at => at.left < left).length, count => `◀ 가능 ${count}`);
        paint('.unlock-edge.is-right', spots.filter(at => at.right > left + width).length, count => `가능 ${count} ▶`);
        root.querySelectorAll('.unlock-rail').forEach(el => el.classList.toggle('is-stuck', Number(el.dataset.cardEnd) < left));
        root.querySelector('.unlock-fade.is-left').classList.toggle('is-on', left > 2);
        root.querySelector('.unlock-fade.is-right').classList.toggle('is-on', left + width < total - 2);
    },
    scrollToNode(root, id) {
        const scroller = root.querySelector('.unlocks-scroll'), at = this.layoutNow?.pos.get(id);
        if (at && scroller) scroller.scrollTo({ left: at.cx - scroller.clientWidth / 2, top: at.y - scroller.clientHeight / 2, behavior: 'smooth' });
    },
    /** 고르기: 다른 창에서 불러도 된다. 판 밖의 줄(루프 1에 열리는 전술, 저널 들)은 고르지 않는다. */
    select(id) {
        if (!unlockBoard.has(id)) return;
        this.selectedId = id;
        this.revealId = id;
        this.render();
    },

    // ---------------------------------------------------------------- 손놀림
    jumpOffscreen(root, direction) {
        const scroller = root.querySelector('.unlocks-scroll'), seenFrom = scroller.scrollLeft, seenTo = seenFrom + scroller.clientWidth;
        const list = this.readyRows().map(def => this.layoutNow.pos.get(def.id)).filter(at => (direction < 0 ? at.left < seenFrom : at.right > seenTo)).sort((a, b) => a.left - b.left);
        if (list.length) this.select((direction < 0 ? list[list.length - 1] : list[0]).def.id);
    },
    cycleReady() {
        const list = this.readyRows().sort((a, b) => this.layoutNow.pos.get(a.id).left - this.layoutNow.pos.get(b.id).left);
        if (!list.length) return;
        this.jump = (this.jump + 1) % list.length;
        this.select(list[this.jump].id);
    },
    handleClick(event) {
        const control = event.target.closest?.('#content-unlock-panel button');
        if (!control) return;
        const root = document.getElementById('content-unlock-panel'), data = control.dataset;
        if (data.unlockSelect) { this.select(data.unlockSelect); return; }
        if (data.unlockNext) { this.cycleReady(); return; }
        if (data.unlockEdge) { this.jumpOffscreen(root, Number(data.unlockEdge)); return; }
        if (data.unlockNow) { const scroller = root.querySelector('.unlocks-scroll'); scroller.scrollTo({ left: this.nowLeft(scroller), behavior: 'smooth' }); }
    },
    /** 칸 위에 마우스를 올리면 뿌리까지의 선행이 밝아진다(다시 그리지 않고 표시만 옮긴다). */
    markPath(root, id) {
        root.querySelectorAll('.is-path').forEach(el => el.classList.remove('is-path'));
        if (!id) return;
        const path = new Set(), waiting = [id];
        while (waiting.length) {
            const step = waiting.pop();
            path.add(step);
            waiting.push(...contentProgression.parents(CONTENT_UNLOCK_CATALOG.find(def => def.id === step)));
        }
        root.querySelectorAll('.unlocks-canvas [data-unlock-select]').forEach(el => { if (path.has(el.dataset.unlockSelect)) el.classList.add('is-path'); });
        root.querySelectorAll('polyline[data-to]').forEach(el => {
            if (!path.has(el.dataset.to) || !path.has(el.dataset.from)) return;
            el.classList.add('is-path');
            el.parentNode.appendChild(el);
        });
    },
    /** 마우스로 판의 빈 곳을 끌면 판이 움직인다(스킬트리처럼). 손가락은 그대로 스크롤한다. */
    startPan(event, root) {
        if (event.pointerType !== 'mouse' || event.target.closest('button')) return;
        const scroller = root.querySelector('.unlocks-scroll'), scale = uiDisplay.factor || 1, from = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
        const pan = move => {
            scroller.scrollLeft = from.left - (move.clientX - from.x) / scale;
            scroller.scrollTop = from.top - (move.clientY - from.y) / scale;
        };
        const release = () => { window.removeEventListener('pointermove', pan); scroller.classList.remove('is-panning'); };
        scroller.classList.add('is-panning');
        window.addEventListener('pointermove', pan);
        window.addEventListener('pointerup', release, { once: true });
    },
    startOverview(event, root) {
        const box = root.querySelector('.unlock-over'), scroller = root.querySelector('.unlocks-scroll');
        const go = move => {
            const rect = box.getBoundingClientRect();
            scroller.scrollLeft = (move.clientX - rect.left) / rect.width * this.layoutNow.board.width - scroller.clientWidth / 2;
        };
        go(event);
        window.addEventListener('pointermove', go);
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', go), { once: true });
    },
    onPointerDown(event, root) {
        if (event.button) return;
        if (event.target.closest?.('.unlock-over')) { this.startOverview(event, root); return; }
        if (event.target.closest?.('.unlocks-scroll')) this.startPan(event, root);
    },
    /** 세로 휠은 판을 가로로 민다. */
    onWheel(event, root) {
        if (!event.target.closest?.('.unlocks-view')) return;
        event.preventDefault();
        root.querySelector('.unlocks-scroll').scrollLeft += event.deltaY || event.deltaX;
    },
    bindPanel(root) {
        if (root.dataset.unlockBound) return;
        root.dataset.unlockBound = '1';
        root.addEventListener('pointerover', event => {
            const node = event.target.closest?.('.unlocks-canvas [data-unlock-select]');
            this.markPath(root, node ? node.dataset.unlockSelect : '');
        });
        root.addEventListener('pointerleave', () => this.markPath(root, ''));
        root.addEventListener('pointerdown', event => this.onPointerDown(event, root));
        root.addEventListener('wheel', event => this.onWheel(event, root), { passive: false });
        root.addEventListener('scroll', () => this.syncOverlays(root), true);
        new ResizeObserver(() => { if (root.clientWidth) this.render(); }).observe(root);
    }
};
document.addEventListener('click', event => unlockTabUi.handleClick(event));
safeExposeGlobals({ unlockTabUi, unlockBoard });
