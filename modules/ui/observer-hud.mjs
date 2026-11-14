class ObserverHud {
    constructor(deps) {
        this.deps = deps;

        this.observerHudHidden = false;
    }

    syncObserverHud(scene) {
        const hidden = !!scene;
        if (hidden === this.observerHudHidden) return;
        this.observerHudHidden = hidden;
        this.deps.document.body.toggleAttribute('data-observer-scene',hidden);
    }
}

export function createObserverHud(deps) {
    const view=new ObserverHud(deps);
    return Object.freeze({ sync:view.syncObserverHud.bind(view) });
}
