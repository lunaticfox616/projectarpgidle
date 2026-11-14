/** A confirmation belongs to one save and one loop/class, including in-place loop reset. */
export function captureInvestmentSession(runtime) {
    const owner = runtime.deps.game;
    return { owner, season: owner.season, loop: owner.loopCount,
        selectedClass: owner.selectedClassId, ascendClass: owner.ascendClass };
}

export function investmentSessionIsCurrent(runtime, session) {
    const owner = runtime.deps.game;
    return runtime.active && session.owner === owner && session.season === owner.season
        && session.loop === owner.loopCount && session.selectedClass === owner.selectedClassId
        && session.ascendClass === owner.ascendClass;
}

export function investmentMayEdit(runtime) {
    return runtime.active && (0, runtime.deps.assertBuildEditable)();
}

export function syncInvestmentSelection(runtime) {
    if (runtime.selectionSession && investmentSessionIsCurrent(runtime, runtime.selectionSession)) return;
    runtime.selectionSession = captureInvestmentSession(runtime);
    runtime.shown = null;
    runtime.pressed = null;
}

export function investmentLog(runtime, text, kind = 'attack-monster', params) {
    (0, runtime.deps.addLog)((0, runtime.deps._t)(text, params), kind);
}
