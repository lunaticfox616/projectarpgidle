// 캔버스의 덧그림과 고르기(2026-10-28 사용자: 설계자에서 쓰던 기능). 계획 영역, 범위 선택 상자, 놓을 자리 미리 보기, 고른 연결과 연결 고르기.
// 모두 canvas.js의 PassiveTreeCanvas(view)를 받아 그 화면 좌표(screenPoint)로 그린다.

/** Planning regions from the designer: a filled outline in the region's colour and its name in the middle. */
export function drawRegions(view) {
    (view.regions || []).forEach(region => {
        if (!region.points.length) return;
        const points = region.points.map(point => view.screenPoint(point));
        view.ctx.save();
        view.ctx.beginPath();
        points.forEach((point, index) => (index ? view.ctx.lineTo(point.x, point.y) : view.ctx.moveTo(point.x, point.y)));
        view.ctx.closePath();
        view.ctx.globalAlpha = Math.max(0.04, Math.min(0.6, Number(region.opacity) || 0.18));
        view.ctx.fillStyle = region.color;
        view.ctx.fill();
        view.ctx.globalAlpha = region.selected ? 0.95 : 0.55;
        view.ctx.strokeStyle = region.color;
        view.ctx.lineWidth = region.selected ? 2.5 : 1.5;
        view.ctx.setLineDash(region.selected ? [] : [6, 5]);
        view.ctx.stroke();
        if (region.showLabel !== false && region.label) drawRegionLabel(view, region, points);
        view.ctx.restore();
    });
}

function drawRegionLabel(view, region, points) {
    const at = region.labelAt ? view.screenPoint(region.labelAt)
        : { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
    view.ctx.globalAlpha = 1;
    view.ctx.setLineDash([]);
    view.ctx.font = '700 13px system-ui';
    view.ctx.textAlign = 'center';
    view.ctx.textBaseline = 'middle';
    view.ctx.lineWidth = 4;
    view.ctx.strokeStyle = 'rgba(5, 8, 12, .85)';
    view.ctx.strokeText(region.label, at.x, at.y);
    view.ctx.fillStyle = region.color;
    view.ctx.fillText(region.label, at.x, at.y);
}

/** The range box of a Shift+drag, in canvas pixels. */
export function drawBox(view) {
    const box = view.pointer && view.pointer.mode === 'box' ? view.pointer : null;
    if (!box) return;
    const left = Math.min(box.x0, box.x1), top = Math.min(box.y0, box.y1);
    view.ctx.save();
    view.ctx.fillStyle = 'rgba(121, 188, 232, .1)';
    view.ctx.fillRect(left, top, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0));
    view.ctx.strokeStyle = 'rgba(121, 188, 232, .9)';
    view.ctx.setLineDash([5, 4]);
    view.ctx.strokeRect(left, top, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0));
    view.ctx.restore();
}

/** Ids of the nodes whose centre lies in the range box (outside the worked area does not count). */
export function nodesInBox(view, box) {
    const left = Math.min(box.x0, box.x1), right = Math.max(box.x0, box.x1), top = Math.min(box.y0, box.y1), bottom = Math.max(box.y0, box.y1);
    return view.tree.nodes.filter(node => {
        if (!view.inFocus(node)) return false;
        const point = view.screenPoint(node);
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    }).map(node => String(node.id));
}

/** Where a click will put new nodes (노드 추가, 도형 배치, 붙여넣기 자리): ghost rings under the pointer. */
export function drawPlacePreview(view) {
    if (!view.place || !view.hoverWorld) return;
    const points = view.place.preview(view.hoverWorld);
    view.ctx.save();
    view.ctx.strokeStyle = 'rgba(241, 214, 159, .9)';
    view.ctx.fillStyle = 'rgba(241, 214, 159, .14)';
    view.ctx.setLineDash([4, 3]);
    view.ctx.lineWidth = 1.5;
    const screen = points.map(point => view.screenPoint(point));
    if (view.place.outline && screen.length > 2) {
        view.ctx.beginPath();
        screen.forEach((point, index) => (index ? view.ctx.lineTo(point.x, point.y) : view.ctx.moveTo(point.x, point.y)));
        view.ctx.closePath();
        view.ctx.stroke();
    }
    screen.forEach(point => {
        view.ctx.beginPath();
        view.ctx.arc(point.x, point.y, Math.max(4, (view.place.radius || 9) * view.scale), 0, Math.PI * 2);
        view.ctx.fill();
        view.ctx.stroke();
    });
    view.ctx.restore();
}

const edgeKey = edge => [String(edge.a), String(edge.b)].sort().join('|');

/** The link nearest the pointer within 6 pixels (both ends in the worked area). */
export function hitEdge(view, clientX, clientY) {
    const rect = view.canvas.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestDistance = 6;
    view.tree.edges.forEach(edge => {
        const a = view.nodeMap.get(String(edge.a)), b = view.nodeMap.get(String(edge.b));
        if (!a || !b || !view.inFocus(a) || !view.inFocus(b)) return;
        const p = view.screenPoint(a), q = view.screenPoint(b), dx = q.x - p.x, dy = q.y - p.y, length = dx * dx + dy * dy;
        const t = length ? Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / length)) : 0;
        const distance = Math.hypot(x - (p.x + dx * t), y - (p.y + dy * t));
        if (distance < bestDistance) { bestDistance = distance; best = edgeKey(edge); }
    });
    return best;
}

export function drawSelectedEdge(view) {
    if (!view.selectedEdge) return;
    const [a, b] = view.selectedEdge.split('|').map(id => view.nodeMap.get(id));
    if (!a || !b) return;
    const p = view.screenPoint(a), q = view.screenPoint(b);
    view.ctx.save();
    view.ctx.strokeStyle = 'rgba(128, 201, 245, .95)';
    view.ctx.lineWidth = 5;
    view.ctx.lineCap = 'round';
    view.ctx.beginPath();
    view.ctx.moveTo(p.x, p.y);
    view.ctx.lineTo(q.x, q.y);
    view.ctx.stroke();
    view.ctx.restore();
}
