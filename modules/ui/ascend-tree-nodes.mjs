import { RANK, NODE_TEXT, ROWS, ROW_LABEL } from './ascend-tree-data.mjs';
import { ascendTreeLinesOf, ascendTreeShortValue, ascendTreeStatName, ascendTreeEsc, ascendTreeArtHtml, ascendTreeStatFamily, ascendTreeReqIds, ascendTreeLayout, ascendTreeLinkHtml, ascendTreeLinkState } from './ascend-tree-common.mjs';

export function ascendTreeFullTree(runtime, cls) {
        const tree = { ...runtime.deps.getClassTreeDef(cls) }, defs = runtime.deps.ASCENDANCY_NODE_DEFS[cls] || {};
        const pair = (ids, lines, req, future) => ids.forEach((id, index) => {
            if (!tree[id]) tree[id] = { ...(lines ? { stat: lines[index].stat, val: lines[index].val } : {}), req, exclusive: ids[1 - index], future };
        });
        pair(['n11', 'n12'], defs.core || runtime.deps.ASCENDANCY_NODE_FALLBACK.core, 'n10', '4차 전직 시련을 처음 통과하면 열립니다.');
        pair(['n13a', 'n13b'], null, ['n11', 'n12'], '재능 개화(5차 전직)를 하면 그 재능의 특화 둘이 열립니다.');
        pair(['n13c', 'n13d'], defs.job || runtime.deps.ASCENDANCY_NODE_FALLBACK.job, ['n11', 'n12'], '재능 개화(5차 전직)를 하면 열립니다.');
        return tree;
    }

export function ascendTreeNodeState(runtime, node, id) {
        if (node.future) return 'future';
        if (runtime.deps.game.ascendNodes.includes(id)) return 'taken';
        if (node.exclusive && runtime.deps.game.ascendNodes.includes(node.exclusive)) return 'closed';
        if (!runtime.deps.isAscendNodeRequirementMet(node)) return 'locked';
        return runtime.deps.game.ascendPoints > 0 ? 'open' : 'nopoint';
    }

export function ascendTreeNodeClass(runtime, id, state, tight) {
        const focused = runtime.focus && runtime.focus.kind === 'node' && runtime.focus.id === id;
        return `ascend-node is-${state}${RANK[id] ? ' is-major' : ''}${id === 'n10' ? ' is-peak' : ''}${tight ? ' is-tight' : ''}${focused ? ' is-focus' : ''}`;
    }

export function ascendTreeNodeButton(runtime, id, node, pos, options) {
        const { state, tight } = options;
        const lines = ascendTreeLinesOf(node), first = (lines[0] || {}).stat, label = lines.length ? ascendTreeShortValue(runtime, lines[0]) : '?';
        const stat = lines.length ? ascendTreeStatName(runtime, first) : runtime.deps._t('재능 특화'), name = `${RANK[id] ? runtime.deps._t(RANK[id]) : stat}, ${runtime.deps._t(NODE_TEXT[state])}`;
        return `<button type="button" class="${ascendTreeNodeClass(runtime, id, state, tight)}" style="--x:${pos.x}%;--y:${pos.y}%;--tone:${runtime.deps.getItemStatToneColor(first)}"
            aria-label="${ascendTreeEsc(runtime, name)}" aria-pressed="${state === 'taken'}" data-ascend-kind="node" data-ascend-id="${id}"
            data-info-tooltip-anchor="1">${ascendTreeArtHtml(runtime, ascendTreeStatFamily(runtime, first))}<span class="ascend-plate"><b>${ascendTreeEsc(runtime, label)}</b><span class="ascend-node-name">${ascendTreeEsc(runtime, stat)}</span></span></button>`;
    }

export function ascendTreeLinkSources(tree, rows, at, id) {
        const reqs = ascendTreeReqIds(tree[id].req).filter(req => at.has(req)), key = reqs.join(',');
        const row = rows.find(ids => ids.includes(id)) || [];
        if (reqs.length < 2 || row.filter(other => ascendTreeReqIds(tree[other].req).join(',') === key).length < 2) return reqs;
        const x = at.get(id).x;
        return [reqs.reduce((best, req) => (Math.abs(at.get(req).x - x) < Math.abs(at.get(best).x - x) ? req : best))];
    }

export function ascendTreeNodeGraphHtml(runtime, tree) {
        const rows = ROWS.map(ids => ids.filter(id => tree[id])).filter(ids => ids.length), at = ascendTreeLayout(rows);
        const states = new Map([...at.keys()].map(id => [id, ascendTreeNodeState(runtime, tree[id], id)]));
        const links = [...at.keys()].flatMap(id => ascendTreeLinkSources(tree, rows, at, id)
            .map(req => ascendTreeLinkHtml([at.get(req), at.get(id)], ascendTreeLinkState(states.get(req), states.get(id)))));
        const tight = new Set(rows.filter(ids => ids.length > 3).flat());
        const buttons = [...at.keys()].map(id => ascendTreeNodeButton(runtime, id, tree[id], at.get(id), { state: states.get(id), tight: tight.has(id) }));
        const labels = rows.map(ids => ids.find(id => ROW_LABEL[id])).filter(Boolean)
            .map(id => `<span class="ascend-row-label" style="--y:${at.get(id).y}%">${ascendTreeEsc(runtime, runtime.deps._t(ROW_LABEL[id]))}</span>`);
        return `<div class="ascend-graph" style="--rows:${rows.length}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join('')}</svg>${labels.join('')}${buttons.join('')}</div>`;
    }
