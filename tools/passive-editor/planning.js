// 계획 영역(2026-10-28 사용자: 설계자에서 그린 직업 계획 영역을 이 편집기에서도). 트리의 planningRegions와 planningRegionsVisible을 설계자와 같은
// 모양으로 쓴다: { id, name, nodeIds, focusNodeId, color, opacity, note, visible, showLabel }. 설계자는 경계 연결의 안쪽을 칠하고, 여기서는 영역 노드를
// 감싸는 볼록한 테두리를 칠한다(모양이 오목하면 조금 넓게 보인다). 이름은 중심 노드 자리에, 없으면 영역 가운데에 쓴다.
const COLORS = ['#f73b3b', '#f051e3', '#ff7b00', '#0040ff', '#228000', '#00ffaa', '#f2c14e', '#5bc0eb'];

/** The convex outline of points (monotone chain), clockwise on screen. */
function hull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (sorted.length < 3) return sorted;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = list => list.reduce((chain, point) => {
        while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) chain.pop();
        chain.push(point);
        return chain;
    }, []);
    const lower = half(sorted), upper = half(sorted.slice().reverse());
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** What the canvas draws for the tree's regions (hidden ones and all of them when the tree hides regions are left out). */
export function regionShapes(tree, selectedId) {
    if (tree.planningRegionsVisible === false) return [];
    const byId = new Map(tree.nodes.map(node => [String(node.id), node]));
    return (tree.planningRegions || []).filter(region => region.visible !== false).map(region => {
        const nodes = (region.nodeIds || []).map(id => byId.get(String(id))).filter(Boolean), focus = byId.get(String(region.focusNodeId));
        const label = focus ? `${region.name} · 중심: ${focus.name || focus.id}` : region.name;
        return { label, color: region.color || COLORS[0], opacity: region.opacity, showLabel: region.showLabel, selected: region.id === selectedId,
            points: hull(nodes.map(node => ({ x: Number(node.x), y: Number(node.y) }))), labelAt: focus ? { x: Number(focus.x), y: Number(focus.y) } : null };
    });
}

/** @param {object} ctx from editor.js: elements, canvas, getTree, change, selectedIds(), setSelection(ids), setStatus, escapeHtml, nodeName(id) */
export function createPlanning(ctx) {
    const { elements, escapeHtml } = ctx;
    let selectedId = null;
    const regions = () => ctx.getTree().planningRegions || [];
    const current = () => regions().find(region => region.id === selectedId) || null;

    function redraw() {
        ctx.canvas.setRegions(regionShapes(ctx.getTree(), elements['region-panel'].hidden ? null : selectedId));
    }

    function renderList() {
        elements['regions-visible'].checked = ctx.getTree().planningRegionsVisible !== false;
        elements['region-list'].innerHTML = regions().map(region => `<button type="button" class="region-chip${region.id === selectedId ? ' selected' : ''}" data-region="${escapeHtml(region.id)}" style="--region:${escapeHtml(region.color)}">${escapeHtml(region.name)} <small>${(region.nodeIds || []).length}</small></button>`).join('')
            || '<p class="field-help">아직 영역이 없습니다. 노드를 3개 이상 고른 뒤 아래 단추로 만듭니다.</p>';
        elements['region-list'].querySelectorAll('[data-region]').forEach(button => { button.onclick = () => select(button.dataset.region); });
    }

    function renderForm() {
        const region = current();
        elements['region-form'].hidden = !region;
        if (!region) return;
        elements['region-name'].value = region.name || '';
        elements['region-color'].value = region.color || COLORS[0];
        elements['region-opacity'].value = region.opacity ?? 0.2;
        elements['region-note'].value = region.note || '';
        elements['region-show-label'].checked = region.showLabel !== false;
        elements['region-visible'].checked = region.visible !== false;
        elements['region-focus'].innerHTML = '<option value="">중심 노드 없음</option>' + (region.nodeIds || []).map(id =>
            `<option value="${escapeHtml(id)}" ${String(id) === String(region.focusNodeId) ? 'selected' : ''}>${escapeHtml(ctx.nodeName(id))}</option>`).join('');
    }

    function render() {
        if (elements['region-panel'].hidden) return redraw();
        renderList();
        renderForm();
        redraw();
    }

    function select(id) {
        selectedId = id;
        render();
    }

    function edit(field, value, message) {
        const id = selectedId;
        ctx.change(tree => { const region = (tree.planningRegions || []).find(row => row.id === id); if (region) region[field] = value; }, message);
        render();
    }

    function create() {
        const ids = ctx.selectedIds();
        if (ids.length < 3) return ctx.setStatus('노드를 3개 이상 고른 뒤 영역을 만드세요.', 'error');
        const id = `r${Date.now().toString(36)}`, color = COLORS[regions().length % COLORS.length];
        ctx.change(tree => {
            tree.planningRegions = tree.planningRegions || [];
            if (tree.planningSchemaVersion === undefined) tree.planningSchemaVersion = 1;
            tree.planningRegions.push({ id, name: `새 영역 ${tree.planningRegions.length + 1}`, nodeIds: ids, focusNodeId: null, color, opacity: 0.2, note: '', visible: true, showLabel: true });
        }, '계획 영역을 만들었습니다. 이름, 중심 노드, 메모를 정하세요.');
        select(id);
    }

    function bind() {
        elements['regions-button'].onclick = () => {
            const open = elements['region-panel'].hidden;
            elements['region-panel'].hidden = !open;
            elements['regions-button'].setAttribute('aria-pressed', String(open));
            ctx.renderInspector();
            render();
        };
        elements['regions-visible'].onchange = event => { ctx.change(tree => { tree.planningRegionsVisible = event.target.checked; }, event.target.checked ? '계획 영역을 보입니다.' : '계획 영역을 숨깁니다.'); render(); };
        elements['region-create-button'].onclick = create;
        elements['region-name'].onchange = event => edit('name', event.target.value.trim() || '이름 없는 영역', '영역 이름을 바꿨습니다.');
        elements['region-color'].onchange = event => edit('color', event.target.value, '영역 색을 바꿨습니다.');
        elements['region-opacity'].onchange = event => edit('opacity', Math.max(0.04, Math.min(0.6, Number(event.target.value) || 0.2)), '영역 진하기를 바꿨습니다.');
        elements['region-note'].onchange = event => edit('note', event.target.value, '영역 메모를 바꿨습니다.');
        elements['region-show-label'].onchange = event => edit('showLabel', event.target.checked, '영역 이름 표시를 바꿨습니다.');
        elements['region-visible'].onchange = event => edit('visible', event.target.checked, '영역 보이기를 바꿨습니다.');
        elements['region-focus'].onchange = event => edit('focusNodeId', event.target.value || null, '중심 노드를 정했습니다.');
        elements['region-focus-selected'].onclick = () => {
            const [id] = ctx.selectedIds();
            if (!id) return ctx.setStatus('중심으로 삼을 노드를 고르세요.', 'error');
            const regionId = selectedId;
            ctx.change(tree => {
                const region = (tree.planningRegions || []).find(row => row.id === regionId);
                if (!region) return;
                if (!(region.nodeIds || []).map(String).includes(id)) region.nodeIds = [...(region.nodeIds || []), id];
                region.focusNodeId = id;
            }, '고른 노드를 영역의 중심으로 정했습니다.');
            render();
        };
        elements['region-replace-button'].onclick = () => {
            const ids = ctx.selectedIds();
            if (ids.length < 3) return ctx.setStatus('노드를 3개 이상 고르세요.', 'error');
            edit('nodeIds', ids, `영역 범위를 고른 노드 ${ids.length}개로 바꿨습니다.`);
        };
        elements['region-select-nodes'].onclick = () => { const region = current(); if (region) ctx.setSelection((region.nodeIds || []).map(String)); };
        elements['region-show-button'].onclick = () => { const region = current(); if (region) ctx.canvas.fitNodes((region.nodeIds || []).map(String)); };
        elements['region-delete-button'].onclick = () => {
            const region = current();
            if (!region || !window.confirm(`'${region.name}' 영역을 지울까요? 노드는 그대로입니다.`)) return;
            ctx.change(tree => { tree.planningRegions = (tree.planningRegions || []).filter(row => row.id !== region.id); }, '계획 영역을 지웠습니다.');
            select(null);
        };
    }

    return { bind, render, isOpen: () => !elements['region-panel'].hidden };
}
