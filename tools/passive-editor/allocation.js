// 찍어 보기(2026-10-28 사용자: 설계자의 할당 모드). 시작점에서 이어진 노드만 차례로 찍고, 찍은 포인트와 효과 합계를 본다. 찍은 노드를 다시
// 누르면 빼는데, 빼면 시작점과 끊기는 노드가 생기면 빼지 않는다. 보는 사람 혼자의 시험이라 트리에는 쓰지 않는다(함께 편집 상대에게도 가지 않는다).

/** @param {object} ctx from editor.js: elements, canvas, getTree, setStatus, escapeHtml, statLabel(id), statSuffix(id) */
export function createAllocation(ctx) {
    const { elements, escapeHtml } = ctx;
    let allocated = new Set(), on = false;

    function neighbours() {
        const links = new Map();
        ctx.getTree().edges.forEach(edge => {
            const a = String(edge.a), b = String(edge.b);
            if (!links.has(a)) links.set(a, []);
            if (!links.has(b)) links.set(b, []);
            links.get(a).push(b);
            links.get(b).push(a);
        });
        return links;
    }

    /** Whether every allocated node still reaches the start through allocated nodes without this one. */
    function stillJoined(without, links) {
        const rest = new Set([...allocated].filter(id => id !== without));
        const start = [...rest].find(id => (nodeById(id) || {}).type === 'start');
        if (!start) return rest.size === 0;
        const seen = new Set([start]), queue = [start];
        while (queue.length) (links.get(queue.shift()) || []).forEach(next => { if (rest.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); } });
        return seen.size === rest.size;
    }

    const nodeById = id => ctx.getTree().nodes.find(node => String(node.id) === id);

    function toggle(node) {
        const id = String(node.id), links = neighbours();
        if (allocated.has(id)) {
            if (!stillJoined(id, links)) return ctx.setStatus('이 노드를 빼면 시작점과 끊기는 노드가 있습니다. 끝에서부터 빼세요.', 'error');
            allocated.delete(id);
            ctx.setStatus(`${node.name || id} 뺌`, 'success');
        } else if (!allocated.size) {
            if (node.type !== 'start') return ctx.setStatus('시작점부터 찍으세요.', 'error');
            allocated.add(id);
            ctx.setStatus('시작점을 찍었습니다. 이어진 노드를 차례로 누릅니다.', 'success');
        } else {
            if (node.type === 'start' || !(links.get(id) || []).some(next => allocated.has(next))) return ctx.setStatus('찍은 노드와 이어진 노드만 찍을 수 있습니다.', 'error');
            allocated.add(id);
            ctx.setStatus(`${node.name || id} 찍음`, 'success');
        }
        render();
    }

    function totals(nodes) {
        const sums = new Map();
        nodes.forEach(node => (node.runtimeEffects || []).forEach(effect => sums.set(effect.statId, (sums.get(effect.statId) || 0) + Number(effect.value || 0))));
        return [...sums].sort((a, b) => ctx.statLabel(a[0]).localeCompare(ctx.statLabel(b[0])));
    }

    function render() {
        elements['allocation-panel'].hidden = !on;
        ctx.canvas.setAllocation(on ? allocated : null);
        if (!on) return;
        const tree = ctx.getTree(), live = tree.nodes.filter(node => allocated.has(String(node.id)));
        allocated = new Set(live.map(node => String(node.id)));
        const start = live.find(node => node.type === 'start'), points = live.filter(node => node.type !== 'start').length;
        elements['allocation-summary'].textContent = start ? `${start.name || start.id}에서 ${points}포인트` : '시작점을 눌러 시작하세요.';
        elements['allocation-totals'].innerHTML = totals(live).map(([statId, value]) =>
            `<li><span>${escapeHtml(ctx.statLabel(statId))}</span><b>${Number(value.toFixed(2))}${escapeHtml(ctx.statSuffix(statId))}</b></li>`).join('');
        ctx.canvas.setAllocation(allocated);
    }

    function setOn(value) {
        on = !!value;
        render();
    }

    function bind() {
        elements['allocation-clear-button'].onclick = () => { allocated = new Set(); render(); ctx.setStatus('찍은 노드를 모두 지웠습니다.', 'success'); };
    }

    return { bind, setOn, toggle, render };
}
