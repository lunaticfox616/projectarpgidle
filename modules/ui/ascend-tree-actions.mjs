import { ascendTreeFullTree, ascendTreeNodeGraphHtml, ascendTreeNodeState } from './ascend-tree-nodes.mjs';
import { ascendTreeSummaryHtml, ascendTreeDetailBody, ascendTreeTipHtml, ascendTreeNodeAdvice } from './ascend-tree-details.mjs';
import { ascendTreeKeystoneGraphHtml, ascendTreeKeystoneState } from './ascend-tree-keystones.mjs';
import { ascendTreeTouchOnly, ascendTreeScrollerOf } from './ascend-tree-common.mjs';
import { captureInvestmentSession, investmentSessionIsCurrent } from './loop-investment-session.mjs';

export function ascendTreeRender(runtime) {
        const box = runtime.deps.document.getElementById('ui-ascend-tree-container'), cls = runtime.deps.game.ascendClass;
        if (!box || !cls || !runtime.deps.CLASS_TEMPLATES[cls]) return;
        runtime.deps.rules.normalize(runtime.deps.game);
        const tree = ascendTreeFullTree(runtime, cls), defs = runtime.deps.getClassKeystoneDefs(cls);
        box.dataset.ascend = cls;
        box.innerHTML = `${ascendTreeSummaryHtml(runtime, cls, tree)}<div class="ascend-layout">
            <section class="ascend-board is-nodes" aria-label="${runtime.deps._t('전직 노드')}"><h3>${runtime.deps._t('전직 노드')}</h3>${ascendTreeNodeGraphHtml(runtime, tree)}</section>
            <section class="ascend-board is-keystones" aria-label="${runtime.deps._t('키스톤')}"><h3>${runtime.deps._t('키스톤')} <button type="button" class="ascend-reset" data-ascend-action="reset">${runtime.deps._t('키스톤 초기화')}</button></h3>${ascendTreeKeystoneGraphHtml(runtime, defs)}</section>
            <section class="ascend-detail${runtime.shown ? '' : ' is-empty'}" aria-label="${runtime.deps._t('자세히')}" aria-live="polite">${ascendTreeDetailBody(runtime, tree, defs)}</section></div>`;
    }

export function ascendTreeHint(runtime, kind, id) {
        const card = runtime.deps.document.querySelector('#ui-ascend-tree-container .ascend-detail'), cls = runtime.deps.game.ascendClass;
        // 터치의 탭은 가리키기(mouseenter, focus)를 먼저 보낸다: 여기서 카드를 띄우면 좁은 창에서는 아래에 붙은 카드가 누른 칸을 덮어 정작
        // 누름이 카드로 갔다. 터치에서는 누름(press)이 카드를 띄운다.
        if (!card || !cls || ascendTreeTouchOnly(runtime)) return;
        runtime.shown = { kind, id };
        card.innerHTML = ascendTreeDetailBody(runtime, ascendTreeFullTree(runtime, cls), runtime.deps.getClassKeystoneDefs(cls));
        card.classList.remove('is-empty');
    }

export function ascendTreeTip(runtime, event, kind, id) {
        const cls = runtime.deps.game.ascendClass;
        if (!event || event.pointerType === 'touch' || !cls || typeof runtime.deps.showInfoTooltipHtml !== 'function') return;
        const html = ascendTreeTipHtml(runtime, kind, id, ascendTreeFullTree(runtime, cls), runtime.deps.getClassKeystoneDefs(cls));
        if (html) runtime.deps.showInfoTooltipHtml(event.clientX, event.clientY, html, runtime.deps.getComputedStyle(event.currentTarget).getPropertyValue('--asc') || '#c9a86a', `ascend:${kind}:${id}`);
    }

export function ascendTreePress(runtime, kind, id) {
        const again = !!runtime.focus && runtime.focus.kind === kind && runtime.focus.id === id;
        runtime.focus = { kind, id };
        runtime.shown = runtime.focus;
        if (!ascendTreeTouchOnly(runtime) || again) (kind === 'node' ? ascendTreeActOnNode(runtime, id) : ascendTreeActOnKeystone(runtime, id));
        ascendTreeRender(runtime);
        ascendTreeKeepFocusAboveCard(runtime);
    }

export function ascendTreeKeepFocusAboveCard(runtime) {
        if (runtime.scrollFrame !== null) runtime.deps.cancelAnimationFrame(runtime.scrollFrame);
        const session = captureInvestmentSession(runtime);
        runtime.scrollFrame = runtime.deps.requestAnimationFrame(() => {
            runtime.scrollFrame = null;
            if (!investmentSessionIsCurrent(runtime, session)) return;
            const box = runtime.deps.document.getElementById('ui-ascend-tree-container');
            const cell = box && box.querySelector('.ascend-node.is-focus'), card = box && box.querySelector('.ascend-detail');
            if (!cell || !card || runtime.deps.getComputedStyle(card).position !== 'sticky') return;
            // 카드는 스크롤 칸 아래 끝에 붙는다: 그 자리 위로 칸이 오도록 민다(카드가 아직 칸 아래의 제자리에 있어도 밀고 나면 붙는다).
            const scroller = ascendTreeScrollerOf(runtime, box), port = scroller === runtime.deps.document.scrollingElement ? runtime.deps.innerHeight : scroller.getBoundingClientRect().top + scroller.clientTop + scroller.clientHeight;
            const over = cell.getBoundingClientRect().bottom + 8 - (Math.min(port, runtime.deps.innerHeight) - card.getBoundingClientRect().height);
            if (over > 0) scroller.scrollBy({ top: over / (runtime.deps.uiDisplay.factor || 1) });
        });
    }

export function ascendTreeClear(runtime) {
        runtime.shown = null;
        runtime.focus = null;
        ascendTreeRender(runtime);
    }

export function ascendTreeAct(runtime) {
        if (!runtime.shown) return;
        if (runtime.shown.kind === 'node') ascendTreeActOnNode(runtime, runtime.shown.id);
        else ascendTreeActOnKeystone(runtime, runtime.shown.id);
        ascendTreeRender(runtime);
    }

export function ascendTreeActOnNode(runtime, id) {
        const tree = ascendTreeFullTree(runtime, runtime.deps.game.ascendClass), node = tree[id], state = node ? ascendTreeNodeState(runtime, node, id) : 'future';
        if (!node) return;
        if (state === 'taken') return runtime.deps.askRefundAscendNode(id);
        if (state === 'open') return runtime.deps.buyAscend(id);
        runtime.deps.addLog(ascendTreeNodeAdvice(runtime, tree, node, id, state), 'attack-monster');
    }

export function ascendTreeActOnKeystone(runtime, id) {
        const k = runtime.deps.getClassKeystoneDefs(runtime.deps.game.ascendClass).find(row => row.id === id);
        if (!k) return;
        const state = ascendTreeKeystoneState(runtime, k);
        if (state === 'taken') return runtime.deps.refundAscendKeystone(id);
        if (state === 'open') return runtime.deps.buyAscendKeystone(id);
        ascendTreeHint(runtime, 'keystone', id);
    }
