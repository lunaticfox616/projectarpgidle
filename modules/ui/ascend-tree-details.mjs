import { ascendTreeLinesOf, ascendTreeLineText, ascendTreeEsc, ascendTreeDetailHead, ascendTreeCanTake, ascendTreePreviewHtml, ascendTreeActionHtml, ascendTreeReqIds, ascendTreeTouchOnly, ascendTreeKeystoneReqs } from './ascend-tree-common.mjs';
import { ascendTreeNodeState } from './ascend-tree-nodes.mjs';
import { RANK, NODE_TEXT, NODE_ACTIONS, KEYSTONE_TEXT, KEYSTONE_ACTIONS } from './ascend-tree-data.mjs';
import { ascendTreeKeystoneState } from './ascend-tree-keystones.mjs';

export function ascendTreeNextPoints(runtime) {
        const done = Array.isArray(runtime.deps.game.completedTrials) ? runtime.deps.game.completedTrials : [];
        const trial = ['trial_1', 'trial_2', 'trial_3', 'trial_4'].find(id => !done.includes(id));
        if (trial) return runtime.deps._t('다음 포인트: {trial}차 전직 시련 첫 통과(노드 +{value}, 키스톤 +1)', { trial: trial.slice(-1), value: trial === 'trial_4' ? 1 : 2 });
        return runtime.deps.game.bloomedClassThisLoop ? '이번 루프의 포인트를 모두 받았습니다.' : '다음 포인트: 재능 개화(노드 +2, 키스톤 +1)';
    }

export function ascendTreeTotalsText(runtime, tree) {
        const sums = new Map();
        runtime.deps.game.ascendNodes.forEach(id => ascendTreeLinesOf(tree[id]).forEach(line => sums.set(line.stat, (sums.get(line.stat) || 0) + Number(line.val || 0))));
        return [...sums].map(([stat, val]) => ascendTreeLineText(runtime, { stat, val })).join(', ');
    }

export function ascendTreeSummaryHtml(runtime, cls, tree) {
        const template = runtime.deps.CLASS_TEMPLATES[cls], total = ascendTreeTotalsText(runtime, tree), ks = runtime.deps.game.ascendKeystones.length;
        return `<div class="ascend-summary"><div class="ascend-summary-name"><strong>${ascendTreeEsc(runtime, runtime.deps._t(template.name))}</strong><span>${ascendTreeEsc(runtime, runtime.deps._t(template.desc))}</span></div>
            <div class="ascend-summary-chips"><span class="is-node">${runtime.deps._t('노드 포인트')} <b>${Math.max(0, Math.floor(runtime.deps.game.ascendPoints || 0))}</b></span>
            <span class="is-key">${runtime.deps._t('키스톤')} <b>${ks}/${runtime.deps.CLASS_KEYSTONE_PICK_LIMIT}</b>${runtime.deps._t(', 포인트')} <b>${Math.max(0, Math.floor(runtime.deps.game.ascendKeystonePoints || 0))}</b></span>
            <span class="is-taken">${runtime.deps._t('할당한 노드')} <b>${runtime.deps.game.ascendNodes.length}</b></span>
            ${runtime.deps.game.ascendNodes.length ? `<button type="button" class="ascend-reset" data-ascend-action="reset-nodes">${runtime.deps._t('노드 초기화')}</button>` : ''}</div>
            <p class="ascend-muted">${runtime.deps._t('{nextPoints}. 이번 루프의 노드 포인트는 최대 9점이라 전부 할당할 수는 없습니다.', { nextPoints: ascendTreeEsc(runtime, ascendTreeNextPoints(runtime)) })}</p>
            ${total ? `<p class="ascend-total">${runtime.deps._t('합계: {html}', { html: runtime.deps.statToneText.html(total) })}</p>` : ''}${runtime.deps.getAscendancyPlanContinueHtml()}</div>`;
    }

export function ascendTreeNodeNote(runtime, tree, id) {
        const node = tree[id];
        if (!node) return '';
        const state = ascendTreeNodeState(runtime, node, id), lines = ascendTreeLinesOf(node);
        const body = lines.length ? lines.map(line => `<span style="color:${runtime.deps.getItemStatToneColor(line.stat)}">${ascendTreeEsc(runtime, ascendTreeLineText(runtime, line))}</span>`).join('<br>') : runtime.deps._t('개화한 재능에 따라 정해집니다.');
        return `${ascendTreeDetailHead(runtime, runtime.deps._t(RANK[id] || '전직 노드'), runtime.deps._t(NODE_TEXT[state]), state)}<p class="ascend-detail-lines">${body}</p>
            ${ascendTreeCanTake(state) ? ascendTreePreviewHtml(runtime, 'ascendNodes', id, runtime.deps._t('할당하면')) : ''}<p class="ascend-detail-advice">${ascendTreeEsc(runtime, ascendTreeNodeAdvice(runtime, tree, node, id, state))}</p>${ascendTreeActionHtml(runtime, NODE_ACTIONS[state] && runtime.deps._t(NODE_ACTIONS[state]))}`;
    }

export function ascendTreeNodeAdvice(runtime, tree, node, id, state) {
        if (state === 'future') return node.future;
        if (state === 'taken') return runtime.deps._t('다시 누르면 반환합니다(마름병 포자 1개, 이 노드를 선행으로 둔 노드가 없을 때).');
        if (state === 'closed') return runtime.deps._t('둘 중 하나만 할당할 수 있습니다. 짝 노드를 반환하면 할당할 수 있습니다.');
        if (state === 'locked') return runtime.deps._t('선행 노드 필요: {list}', { list: ascendTreeReqIds(node.req).map(req => ascendTreeLinesOf(tree[req]).map((...args) => ascendTreeLineText(runtime, ...args)).join(', ')).join(runtime.deps._t(' 또는 ')) });
        if (state === 'nopoint') return runtime.deps._t('전직 포인트가 없습니다. {nextPoints}.', { nextPoints: ascendTreeNextPoints(runtime) });
        return runtime.deps._t('{value} 할당합니다{value2}.', { value: ascendTreeTouchOnly(runtime) ? runtime.deps._t('한 번 더 누르면') : runtime.deps._t('누르면'), value2: node.exclusive ? runtime.deps._t('(짝 노드와 둘 중 하나)') : '' });
    }

export function ascendTreeKeystoneNote(runtime, defs, id) {
        const k = defs.find(row => row.id === id);
        if (!k) return '';
        const state = ascendTreeKeystoneState(runtime, k), names = ascendTreeKeystoneReqs(k).map(req => (defs.find(row => row.id === req) || {}).name).filter(Boolean);
        const advice = {
            taken: runtime.deps._t('다시 누르면 반환합니다(마름병 포자 1개, 이 키스톤을 선행으로 둔 키스톤이 없을 때).'),
            fifth: runtime.deps._t('재능 개화(5차 전직)를 하면 할당할 수 있습니다.'),
            locked: runtime.deps._t('선행 키스톤 필요: {names}', { names: names.map(name => runtime.deps._t(name)).join(Array.isArray(k.reqAny) ? runtime.deps._t(' 또는 ') : ', ') }),
            full: runtime.deps._t('키스톤은 {value}개까지 할당할 수 있습니다. 하나를 반환하면 바꿀 수 있습니다.', { value: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT }),
            nopoint: runtime.deps._t('키스톤 포인트가 없습니다. 전직 시련을 처음 통과할 때마다 1점씩 받습니다.'),
            open: runtime.deps._t('{value} 할당합니다.', { value: ascendTreeTouchOnly(runtime) ? runtime.deps._t('한 번 더 누르면') : runtime.deps._t('누르면') })
        }[state];
        return `${ascendTreeDetailHead(runtime, runtime.deps._t(k.name), runtime.deps._t(KEYSTONE_TEXT[state]), state)}<p class="ascend-detail-lines">${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</p>
            ${ascendTreeCanTake(state) ? ascendTreePreviewHtml(runtime, 'ascendKeystones', id, runtime.deps._t('할당하면')) : ''}<p class="ascend-detail-advice">${ascendTreeEsc(runtime, advice)}</p>${ascendTreeActionHtml(runtime, KEYSTONE_ACTIONS[state] && runtime.deps._t(KEYSTONE_ACTIONS[state]))}`;
    }

export function ascendTreeDetailBody(runtime, tree, defs) {
        const body = runtime.shown ? (runtime.shown.kind === 'node' ? ascendTreeNodeNote(runtime, tree, runtime.shown.id) : ascendTreeKeystoneNote(runtime, defs, runtime.shown.id)) : '';
        return body || '<p class="ascend-muted">노드나 키스톤을 가리키거나 누르면 효과와 할 수 있는 일이 여기에 나옵니다.</p>';
    }

export function ascendTreeTipHtml(runtime, kind, id, tree, defs) {
        if (kind === 'keystone') {
            const k = defs.find(row => row.id === id);
            return k ? `<div class="tooltip-title">${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</div><div class="tooltip-line">${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</div><div class="tooltip-line" style="color:#b3a58c;">${ascendTreeEsc(runtime, runtime.deps._t(KEYSTONE_TEXT[ascendTreeKeystoneState(runtime, k)]))}</div>` : '';
        }
        const node = tree[id];
        if (!node) return '';
        const lines = ascendTreeLinesOf(node), body = lines.length ? lines.map(line => `<span style="color:${runtime.deps.getItemStatToneColor(line.stat)}">${ascendTreeEsc(runtime, ascendTreeLineText(runtime, line))}</span>`).join('<br>') : runtime.deps._t('개화한 재능에 따라 정해집니다.');
        return `<div class="tooltip-title">${ascendTreeEsc(runtime, runtime.deps._t(RANK[id] || '전직 노드'))}</div><div class="tooltip-line">${body}</div><div class="tooltip-line" style="color:#b3a58c;">${ascendTreeEsc(runtime, runtime.deps._t(NODE_TEXT[ascendTreeNodeState(runtime, node, id)]))}</div>`;
    }
