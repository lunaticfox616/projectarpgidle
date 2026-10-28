// 편집 모드와 키보드(2026-10-28 사용자: 키보드로 노드 이동, 마우스 클릭 위치에 노드 만들기 등 설계자에서 쓰던 기능).
// 모드: 선택, 노드 추가(고른 등급의 노드를 클릭한 자리에), 도형 배치(원, 사각형, 삼각형), 연결 편집, 찍어 보기. 키보드: 방향키 이동과 화면 이동,
// Ctrl+A, Ctrl+C/X/V, Ctrl+D 복제, Esc, Backspace. 트리를 바꾸는 계산은 edit-tools.js, 화면과 실행 취소는 ctx(editor.js)가 맡는다.
import { NODE_TYPES, SHAPES, blankNode, copySelection, newNodeId, nudgeNodes, outlineEdges, pasteClipboard, shapePoints, turnAbout } from './edit-tools.js';

export const MODE_HINTS = Object.freeze({
    select: '빈 곳 드래그: 화면 이동 · Shift+드래그: 범위 선택 · Shift/Ctrl+클릭: 여럿 고르기 · 노드 드래그: 옮기기(Alt: 격자 무시) · 방향키: 옮기기 · 휠: 확대',
    add: '빈 곳을 클릭하면 고른 등급의 노드가 그 자리에 생깁니다 · Esc: 선택으로',
    shape: '빈 곳을 클릭하면 도형 모양으로 노드가 생기고 함께 선택됩니다 · Esc: 선택으로',
    connect: '노드 둘을 차례로 누르면 잇거나 끊습니다 · Esc: 선택으로',
    allocate: '시작점부터 이어진 노드를 눌러 찍습니다. 찍은 노드를 다시 누르면 뺍니다 · Esc: 선택으로'
});
const MODES = ['select', 'add', 'shape', 'connect', 'allocate'];
const NUDGE_GROUP_MS = 800;

/**
 * @param {object} ctx from editor.js: elements, canvas, getTree, change(fn, message), setSelection(ids), selectedIds(), setStatus,
 *   setConnectionMode(on), setAllocating(on), gridSize(), snapOn(), deleteNodes(ids), isTyping(target)
 */
export function createModes(ctx) {
    const { elements, canvas } = ctx;
    let mode = 'select', clipboard = null, lastNudge = { at: 0, key: '' };

    const snapPoint = point => {
        if (!ctx.snapOn()) return point;
        const grid = ctx.gridSize();
        return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
    };
    const takenIds = () => new Set(ctx.getTree().nodes.map(node => String(node.id)));
    const placeType = () => elements['place-type'].value || 'minor';

    function shapeAt(point) {
        const centre = snapPoint(point);
        const points = shapePoints(elements['shape-kind'].value, elements['shape-count'].value, elements['shape-size'].value, centre);
        return turnAbout(points, centre, -canvas.getRotation());
    }

    function placeNode(point) {
        const at = snapPoint(point), id = newNodeId(takenIds()), type = placeType();
        ctx.change(tree => tree.nodes.push(blankNode(id, type, at)), `새 노드(${NODE_TYPES.find(row => row.id === type).label})를 놓았습니다. 계속 클릭해 더 놓거나 Esc로 끝냅니다.`);
        ctx.setSelection([id]);
    }

    function placeShape(point) {
        const points = shapeAt(point), taken = takenIds(), type = placeType();
        const ids = points.map(() => { const id = newNodeId(taken); taken.add(id); return id; });
        ctx.change(tree => {
            points.forEach((at, index) => tree.nodes.push(blankNode(ids[index], type, at)));
            if (elements['shape-outline'].checked) tree.edges.push(...outlineEdges(ids));
        }, `${(SHAPES.find(row => row.id === elements['shape-kind'].value) || SHAPES[0]).label} 모양으로 노드 ${ids.length}개를 놓고 모두 골랐습니다.`);
        ctx.setSelection(ids);
    }

    const PLACE_SPECS = {
        add: () => ({ preview: point => [snapPoint(point)], radius: 9 }),
        shape: () => ({ preview: shapeAt, radius: 9, get outline() { return elements['shape-outline'].checked; } })
    };

    function setMode(next) {
        if (!MODES.includes(next)) return;
        if (mode === 'connect' && next !== 'connect') ctx.setConnectionMode(false);
        if (mode === 'allocate' && next !== 'allocate') ctx.setAllocating(false);
        mode = next;
        document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
        elements['add-options'].hidden = !['add', 'shape'].includes(mode);
        elements['shape-options'].hidden = mode !== 'shape';
        canvas.setPlaceMode(PLACE_SPECS[mode] ? PLACE_SPECS[mode]() : null);
        if (mode === 'connect') ctx.setConnectionMode(true);
        if (mode === 'allocate') ctx.setAllocating(true);
        elements['canvas-help'].textContent = MODE_HINTS[mode];
    }

    function nudge(event, dx, dy) {
        const ids = ctx.selectedIds();
        const step = event.shiftKey ? ctx.gridSize() : Math.max(0.1, Number(elements['nudge-input'].value) || 10);
        const angle = canvas.getRotation() * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        // 화면에서 누른 방향으로 간다(돌린 시점이면 트리 좌표로 되돌려 옮긴다). 잇따라 누른 이동은 실행 취소 한 번으로 되돌린다.
        const world = { x: (dx * cos + dy * sin) * step, y: (-dx * sin + dy * cos) * step };
        const key = ids.join(','), grouped = Date.now() - lastNudge.at < NUDGE_GROUP_MS && lastNudge.key === key;
        lastNudge = { at: Date.now(), key };
        ctx.change(tree => nudgeNodes(tree.nodes.filter(node => ids.includes(String(node.id))), world.x, world.y), `노드 ${ids.length}개를 옮겼습니다.`, { grouped });
    }

    function arrowKey(event) {
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return false;
        event.preventDefault();
        if (ctx.selectedIds().length && !event.ctrlKey && !event.metaKey && mode !== 'allocate') nudge(event, ...direction);
        else canvas.panBy(-direction[0] * (event.shiftKey ? 240 : 80), -direction[1] * (event.shiftKey ? 240 : 80));
        return true;
    }

    function pasteAt() {
        const pointer = canvas.getPointerWorld();
        return snapPoint(pointer && elements['tree-editor-canvas'].matches(':hover') ? pointer : canvas.getViewCenter());
    }

    function paste(data) {
        if (!data || data.passiveTreeClipboard !== 1 || !Array.isArray(data.nodes) || !data.nodes.length) return false;
        let ids = [];
        ctx.change(tree => { ids = pasteClipboard(tree, data, pasteAt()); }, `노드 ${data.nodes.length}개를 붙여 넣었습니다(연결 ${data.edges.length}개).`);
        ctx.setSelection(ids);
        return true;
    }

    function duplicate() {
        const ids = ctx.selectedIds();
        if (!ids.length) return;
        const copied = copySelection(ctx.getTree(), ids), grid = ctx.gridSize(), centre = canvas.getViewCenter();
        let made = [];
        const xs = copied.nodes.map(node => Number(node.x)), ys = copied.nodes.map(node => Number(node.y));
        const at = { x: (Math.min(...xs) + Math.max(...xs)) / 2 + grid * 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 + grid * 2 };
        ctx.change(tree => { made = pasteClipboard(tree, copied, Number.isFinite(at.x) ? at : centre); }, `노드 ${ids.length}개를 복제했습니다.`);
        ctx.setSelection(made);
    }

    function shortcut(event) {
        const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
        if (event.key === 'Escape') {
            if (mode !== 'select') setMode('select');
            else { ctx.setSelection([]); canvas.setSelectedEdge(null); }
            return true;
        }
        if (command && key === 'a') { event.preventDefault(); ctx.selectAll(); return true; }
        if (command && key === 'd') { event.preventDefault(); duplicate(); return true; }
        if (command && key === 'y') { event.preventDefault(); ctx.redo(); return true; }
        if (!command && event.key === 'Backspace') { ctx.deleteSelected(); return true; }
        return arrowKey(event);
    }

    /** Keys while not typing in a field; true when the key was used. */
    function handleKey(event) {
        if (ctx.isTyping(event.target)) return event.key === 'Escape' && mode !== 'select' ? (setMode('select'), true) : false;
        return shortcut(event);
    }

    // Copy, cut and paste go through the page's clipboard events, so they also work between two editor tabs (no permission prompt).
    function bindClipboard() {
        document.addEventListener('copy', event => {
            if (ctx.isTyping(event.target) || !ctx.selectedIds().length) return;
            clipboard = copySelection(ctx.getTree(), ctx.selectedIds());
            event.clipboardData.setData('text/plain', JSON.stringify(clipboard));
            event.preventDefault();
            ctx.setStatus(`노드 ${clipboard.nodes.length}개를 복사했습니다. Ctrl+V로 마우스 자리에 붙여 넣습니다.`, 'success');
        });
        document.addEventListener('cut', event => {
            if (ctx.isTyping(event.target) || !ctx.selectedIds().length) return;
            const ids = ctx.selectedIds();
            clipboard = copySelection(ctx.getTree(), ids);
            event.clipboardData.setData('text/plain', JSON.stringify(clipboard));
            event.preventDefault();
            ctx.deleteNodes(ids, `노드 ${ids.length}개를 잘라 냈습니다.`);
        });
        document.addEventListener('paste', event => {
            if (ctx.isTyping(event.target)) return;
            let data = clipboard;
            try { data = JSON.parse(event.clipboardData.getData('text/plain')); } catch { /* 다른 글이 들어 있으면 이 편집기에서 복사한 것을 붙인다 */ }
            if (paste(data) || paste(clipboard)) event.preventDefault();
        });
    }

    function bind() {
        elements['place-type'].innerHTML = NODE_TYPES.map(type => `<option value="${type.id}">${type.label}</option>`).join('');
        elements['shape-kind'].innerHTML = SHAPES.map(shape => `<option value="${shape.id}">${shape.label}</option>`).join('');
        document.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => setMode(mode === button.dataset.mode && mode !== 'select' ? 'select' : button.dataset.mode); });
        ['shape-kind', 'shape-count', 'shape-size', 'shape-outline'].forEach(id => { elements[id].oninput = () => canvas.setPlaceMode(PLACE_SPECS[mode] ? PLACE_SPECS[mode]() : null); });
        elements['free-drag-input'].onchange = event => canvas.setFreeDrag(event.target.checked);
        elements['zoom-in-button'].onclick = () => canvas.zoomBy(1.25);
        elements['zoom-out-button'].onclick = () => canvas.zoomBy(1 / 1.25);
        bindClipboard();
        setMode('select');
    }

    return {
        bind, handleKey, setMode, getMode: () => mode, duplicate,
        onPlace: point => (mode === 'shape' ? placeShape(point) : placeNode(point)),
        copySelected: () => { clipboard = copySelection(ctx.getTree(), ctx.selectedIds()); return clipboard; },
        pasteCopied: () => paste(clipboard)
    };
}
