import { listenView } from './view-events.mjs';

export function installAscendTreeEvents(runtime) {
    const host = runtime.deps.document.getElementById('ui-ascend-tree-container');
    if (!host) return;
    listenView(runtime, host, 'click', event => {
        const cell = event.target.closest?.('[data-ascend-kind]');
        if (cell && host.contains(cell)) return runtime.handlers.press(cell.dataset.ascendKind, cell.dataset.ascendId);
        const action = event.target.closest?.('[data-ascend-action]');
        if (!action || !host.contains(action)) return;
        const commands = { clear: runtime.handlers.clear, act: runtime.handlers.act, reset: runtime.handlers.reset,
            'reset-nodes': runtime.handlers.resetNodes, 'continue-plan': runtime.handlers.continuePlan };
        commands[action.dataset.ascendAction]?.();
    });
    listenView(runtime, host, 'focusin', event => hintAscendCell(runtime, host, event));
    listenView(runtime, host, 'mouseover', event => {
        const cell = event.target.closest?.('[data-ascend-kind]');
        if (cell?.contains(event.relatedTarget)) return;
        hintAscendCell(runtime, host, event);
    });
    listenView(runtime, host, 'pointerover', event => tipAscendCell(runtime, host, event));
    listenView(runtime, host, 'pointermove', event => tipAscendCell(runtime, host, event));
    listenView(runtime, host, 'pointerout', event => {
        const cell = event.target.closest?.('[data-ascend-kind]');
        if (cell && host.contains(cell) && !cell.contains(event.relatedTarget)) (0, runtime.deps.hideInfoTooltip)();
    });
}

function hintAscendCell(runtime, host, event) {
    const cell = event.target.closest?.('[data-ascend-kind]');
    if (cell && host.contains(cell)) runtime.handlers.hint(cell.dataset.ascendKind, cell.dataset.ascendId);
}

function tipAscendCell(runtime, host, event) {
    const cell = event.target.closest?.('[data-ascend-kind]');
    if (!cell || !host.contains(cell)) return;
    runtime.handlers.tip({ currentTarget: cell, pointerType: event.pointerType, clientX: event.clientX, clientY: event.clientY },
        cell.dataset.ascendKind, cell.dataset.ascendId);
}
