// 여러 노드를 고른 때와 연결을 고른 때의 패널(2026-10-28 사용자: 설계자의 다중 선택 패널). 고른 노드 수와 등급별 수, 등급과 분류 일괄 변경,
// 능력 일괄 적용(전체 교체, 첫 옵션 교체, 옵션 추가)과 비우기, 회전(15°)과 반전(화면 기준, 트리 기준), 복사, 복제, 삭제.
import { CATEGORIES, NODE_TYPES, applyEffectToNodes, arrangeNodes, mirrorNodes, ringEdges, rotateNodes } from './edit-tools.js';

/** @param {object} ctx from editor.js: elements, canvas, getConfig, selectedNodes(), selectedIds(), change, syncEffects, statOptions, setStatus,
 *   escapeHtml, nodeName(id), duplicate(), copy(), deleteSelected(), deleteEdge(key) */
export function createBulkPanel(ctx) {
    const { elements, escapeHtml } = ctx;
    const ids = () => new Set(ctx.selectedIds());
    const picked = tree => tree.nodes.filter(node => ids().has(String(node.id)));

    function render() {
        const nodes = ctx.selectedNodes();
        elements['multi-form'].hidden = nodes.length < 2;
        if (nodes.length < 2) return;
        const counts = NODE_TYPES.map(type => [type.label, nodes.filter(node => node.type === type.id).length]).filter(([, count]) => count);
        elements['multi-title'].textContent = `노드 ${nodes.length}개`;
        elements['multi-counts'].textContent = counts.map(([label, count]) => `${label} ${count}`).join(', ');
        if (!elements['bulk-stat'].options.length) elements['bulk-stat'].innerHTML = ctx.statOptions('');
    }

    function setField(field, value, label) {
        if (!value) return;
        ctx.change(tree => picked(tree).forEach(node => { node[field] = value; }), `노드 ${ids().size}개의 ${label} 바꿨습니다.`);
    }

    function applyEffect() {
        const effect = { statId: elements['bulk-stat'].value, value: Number(elements['bulk-value'].value) || 0 };
        const mode = elements['bulk-mode'].value, words = { replace: '모든 옵션을 바꿨습니다', first: '첫 옵션을 바꿨습니다', add: '옵션을 더했습니다' };
        ctx.change(tree => applyEffectToNodes(picked(tree), effect, mode, ctx.syncEffects), `노드 ${ids().size}개에 ${words[mode]}.`);
    }

    function arrange(action) {
        const basis = elements['mirror-basis'].value, angle = ctx.canvas.getRotation();
        const run = {
            left: nodes => rotateNodes(nodes, -15), right: nodes => rotateNodes(nodes, 15),
            horizontal: nodes => mirrorNodes(nodes, 'horizontal', basis, angle), vertical: nodes => mirrorNodes(nodes, 'vertical', basis, angle),
            rowH: nodes => arrangeNodes(nodes, 'rowH', angle), rowV: nodes => arrangeNodes(nodes, 'rowV', angle),
            spreadH: nodes => arrangeNodes(nodes, 'spreadH', angle), spreadV: nodes => arrangeNodes(nodes, 'spreadV', angle),
            circle: nodes => arrangeNodes(nodes, 'circle', angle)
        }[action];
        const words = { left: '반시계 방향으로 15° 돌렸습니다', right: '시계 방향으로 15° 돌렸습니다', horizontal: '좌우로 뒤집었습니다', vertical: '상하로 뒤집었습니다',
            rowH: '가로 한 줄로 맞췄습니다', rowV: '세로 한 줄로 맞췄습니다', spreadH: '가로로 같은 간격으로 벌렸습니다', spreadV: '세로로 같은 간격으로 벌렸습니다',
            circle: '같은 간격의 원으로 폈습니다' };
        ctx.change(tree => run(picked(tree)), `노드 ${ids().size}개를 ${words[action]}.`);
    }

    /** 고리로 잇기: the picked nodes in a ring round their centre (links already there stay); 서로 끊기: every link between two picked nodes goes. */
    function relink(action) {
        const key = edge => [String(edge.a), String(edge.b)].sort().join('|');
        if (action === 'ring') {
            ctx.change(tree => {
                const known = new Set(tree.edges.map(key));
                ringEdges(picked(tree)).forEach(edge => { if (!known.has(key(edge))) { tree.edges.push(edge); known.add(key(edge)); } });
            }, `노드 ${ids().size}개를 고리로 이었습니다.`);
        } else {
            ctx.change(tree => { const chosen = ids(); tree.edges = tree.edges.filter(edge => !(chosen.has(String(edge.a)) && chosen.has(String(edge.b)))); }, '고른 노드끼리의 연결을 모두 끊었습니다.');
        }
    }

    function renderEdge(key) {
        elements['edge-form'].hidden = !key;
        if (!key) return;
        const [a, b] = key.split('|');
        elements['edge-ends'].innerHTML = `<strong>${escapeHtml(ctx.nodeName(a))}</strong> ↔ <strong>${escapeHtml(ctx.nodeName(b))}</strong>`;
    }

    function bind() {
        elements['bulk-type'].innerHTML = '<option value="">등급 고르기…</option>' + NODE_TYPES.map(type => `<option value="${type.id}">${type.label}</option>`).join('');
        elements['bulk-cat'].innerHTML = '<option value="">분류 고르기…</option>' + CATEGORIES.map(cat => `<option value="${cat.id}">${cat.label}</option>`).join('');
        elements['bulk-type'].onchange = event => { setField('type', event.target.value, '등급을'); event.target.value = ''; };
        elements['bulk-cat'].onchange = event => { setField('cat', event.target.value, '분류를'); event.target.value = ''; };
        elements['bulk-apply-button'].onclick = applyEffect;
        elements['bulk-clear-button'].onclick = () => ctx.change(tree => picked(tree).forEach(node => ctx.syncEffects(node, [])), `노드 ${ids().size}개의 옵션을 비웠습니다.`);
        document.querySelectorAll('[data-arrange]').forEach(button => { button.onclick = () => arrange(button.dataset.arrange); });
        document.querySelectorAll('[data-relink]').forEach(button => { button.onclick = () => relink(button.dataset.relink); });
        elements['bulk-copy-button'].onclick = () => { const copied = ctx.copy(); ctx.setStatus(`노드 ${copied.nodes.length}개를 복사했습니다. Ctrl+V로 마우스 자리에 붙여 넣습니다.`, 'success'); };
        elements['bulk-duplicate-button'].onclick = ctx.duplicate;
        elements['bulk-delete-button'].onclick = ctx.deleteSelected;
        elements['edge-delete-button'].onclick = () => ctx.deleteEdge(ctx.canvas.getSelectedEdge());
    }

    return { bind, render, renderEdge };
}
