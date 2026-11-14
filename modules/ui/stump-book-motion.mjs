/** Each animation continuation belongs to this dialog, save and opening/closing sequence. */
export function afterStumpBookMotion(runtime, animation, next) {
    const epoch = runtime.state.bookOpening, owner = runtime.deps.game, dialog = runtime.state.bookDialog;
    for (const previous of runtime.state.bookAnimations) {
        if (previous.effect?.target !== animation.effect?.target) continue;
        runtime.state.bookAnimations.delete(previous);
        previous.cancel();
    }
    runtime.state.bookAnimations.add(animation);
    animation.finished.then(() => {
        if (!runtime.state.bookAnimations.has(animation)) return;
        if (runtime.active && epoch === runtime.state.bookOpening && owner === runtime.deps.game && dialog === runtime.state.bookDialog) next();
    }, error => {
        runtime.state.bookAnimations.delete(animation);
        if (error?.name !== 'AbortError') runtime.deps.window.console.error('[stump recipe book] animation failed', error);
    });
}

export function stopStumpBookMotion(runtime) {
    runtime.state.bookOpening += 1;
    for (const animation of runtime.state.bookAnimations) animation.cancel();
    runtime.state.bookAnimations.clear();
    runtime.state.bookTurning = null;
}

export function syncStumpCubeOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    stopStumpBookMotion(runtime);
    if (runtime.state.pickerPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
    if (runtime.state.resultPanel?.isConnected) runtime.deps.selectionDialog.close('stump-cube-result');
    runtime.state.bookDialog?.close();
    Object.assign(runtime.state, { owner: runtime.deps.game, pickerSelection: null, pickerItems: [], lastResult: null, pickerPanel: null, resultPanel: null });
    return true;
}
