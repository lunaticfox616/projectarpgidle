/** Transient unlock animation resources, scoped to the current save and loop. */
export class MapTabReveals {
    constructor(deps) {
        this.deps = deps;
        this.owner = null;
        this.season = null;
        this.loop = null;
        this.pending = new Set();
        this.running = new Map();
    }

    observe(owner) {
        if (this.owner === owner && this.season === owner.season && this.loop === owner.loopCount) return;
        this.reset();
        this.owner = owner;
        this.season = owner.season;
        this.loop = owner.loopCount;
    }

    add(owner, id) {
        this.observe(owner);
        this.pending.add(id);
    }

    start(owner, button, id) {
        this.observe(owner);
        if (!button || !this.pending.delete(id)) return;
        this.finish(button);
        const listener = event => { if (event.target === button) this.finish(button); };
        const timer = this.deps.setTimeout(() => this.finish(button), 1400);
        this.running.set(button, {listener, timer});
        button.classList.add('map-primary-tab-unlock-reveal');
        button.addEventListener('animationend', listener);
    }

    finish(button) {
        const binding = this.running.get(button);
        if (!binding) return;
        this.running.delete(button);
        this.deps.clearTimeout(binding.timer);
        button.removeEventListener('animationend', binding.listener);
        button.classList.remove('map-primary-tab-unlock-reveal');
    }

    reset() {
        for (const button of this.running.keys()) this.finish(button);
        this.pending.clear();
        this.owner = null;
    }
}
