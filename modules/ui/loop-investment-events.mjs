import { listenView } from './view-events.mjs';
import { investmentSessionIsCurrent } from './loop-investment-session.mjs';

/** One delegated listener set survives innerHTML updates of the loop tree. */
export function installLoopInvestmentEvents(runtime) {
    installAscendancyChoiceEvents(runtime);
    const host = runtime.deps.document.getElementById('ui-season-tree');
    if (!host) return;
    listenView(runtime, host, 'click', event => dispatchLoopInvestment(runtime, host, event, false));
    listenView(runtime, host, 'keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') dispatchLoopInvestment(runtime, host, event, true);
    });
    const hint = event => {
        const node = event.target.closest?.('[data-loop-hint]');
        if (node && host.contains(node)) runtime.handlers.loopPassiveHint(node.dataset.loopHint);
    };
    listenView(runtime, host, 'mouseover', event => {
        const node = event.target.closest?.('[data-loop-hint]');
        if (node?.contains(event.relatedTarget)) return;
        hint(event);
    });
    listenView(runtime, host, 'focusin', hint);
}

function installAscendancyChoiceEvents(runtime) {
    for (const id of ['ui-class-grid', 'ui-class-plan']) {
        const host = runtime.deps.document.getElementById(id);
        if (!host) continue;
        listenView(runtime, host, 'click', event => {
            if (!runtime.selectionSession || !investmentSessionIsCurrent(runtime, runtime.selectionSession)) {
                runtime.handlers.fillAscendancyPickScreen();
                return;
            }
            const target = event.target.closest?.('[data-loop-class], [data-loop-plan]');
            if (!target || !host.contains(target)) return;
            if (target.dataset.loopClass) runtime.handlers.selectClass(target.dataset.loopClass);
            else runtime.handlers.chooseLastLoopAscendPlan();
        });
    }
}

function dispatchLoopInvestment(runtime, host, event, keyboard) {
    const target = event.target.closest?.('[data-loop-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.loopAction, id = target.dataset.loopId;
    if (!['press', 'buy', 'refund'].includes(action)) return;
    event.preventDefault();
    if (action === 'refund') event.stopPropagation();
    if (action === 'refund') return runtime.handlers.askRefundSeasonNode(id);
    if (action === 'buy' || keyboard) return runtime.handlers.buySeason(id);
    return runtime.handlers.loopPassivePress(id);
}
