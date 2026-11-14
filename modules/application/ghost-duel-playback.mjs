import { LOAD_WAIT_MS, OUTRO_MS, RESULT_TITLES } from '../data/ghost-duel-stage.mjs';

/** Owns one replay, its animation frame and its DOM events. Never changes combat/save state. */
export class GhostDuelPlayback {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
        this.scene = null;
        this.active = true;
        this.actions = {
            pause: scene => { scene.paused = !scene.paused; },
            speed: scene => { scene.speed = scene.speed === 1 ? 2 : 1; },
            skip: scene => { scene.clock = Math.max(scene.clock, scene.endAt + OUTRO_MS); },
            again: scene => this.restart(scene),
            tab: () => this.openDuelTab(),
            close: () => this.stop()
        };
    }

    sceneOf(duel, outcome) {
        const actors = this.links.fighters, timeline = this.links.timeline;
        const fighters = { left: actors.fighterOf(duel, 'left', actors.ownLook()), right: actors.fighterOf(duel, 'right', null) };
        const track = timeline.trackOf(duel), strikes = timeline.strikesOf(duel, fighters, track);
        const winner = RESULT_TITLES[duel.winner] ? duel.winner : '', now = this.deps.performance.now();
        return {
            duel, outcome, fighters, strikes, track, life: timeline.lifeOf(duel), scale: timeline.damageScale(duel, fighters),
            region: actors.regionOfHere(), sheets: new Map(), dashes: timeline.dashesOf(duel),
            winner, loser: { left: 'right', right: 'left' }[winner] || '', endAt: timeline.endOf(duel, strikes),
            clock: 0, speed: 1, paused: false, started: false, opened: now, last: now,
            frame: 0, root: null, canvas: null, onClick: null, onFrame: null
        };
    }

    play(duel, outcome) {
        if (!this.active) return false;
        this.stop();
        if (!duel || !Array.isArray(duel.events)) return false;
        try {
            const scene = this.sceneOf(duel, outcome);
            this.scene = scene;
            if (typeof this.deps.closeAllWindows === 'function') this.deps.closeAllWindows();
            if (!this.mount(scene)) { this.stop(); return false; }
            this.queueFrame(scene);
            return true;
        } catch (error) {
            this.stop();
            this.deps.console.warn('ghost duel replay could not open:', error);
            return false;
        }
    }

    mount(scene) {
        scene.root = this.links.view.mountRoot(scene);
        if (!scene.root) return false;
        scene.canvas = scene.root.querySelector('canvas');
        scene.onClick = event => this.onClick(scene, event);
        scene.onFrame = now => this.tick(scene, now);
        scene.root.addEventListener('click', scene.onClick);
        for (const fighter of Object.values(scene.fighters)) {
            for (const clip of Object.values(fighter.clips)) this.links.pictures.sheetOf(scene, clip.file);
        }
        return true;
    }

    queueFrame(scene) {
        if (!this.active || this.scene !== scene) return;
        scene.frame = this.deps.requestAnimationFrame(scene.onFrame);
    }

    tick(scene, now) {
        if (!this.active || this.scene !== scene) return;
        scene.frame = 0;
        if (!scene.root.isConnected) { this.stop(); return; }
        const step = Math.min(100, Math.max(0, now - scene.last));
        scene.last = now;
        if (!scene.started && (this.links.pictures.sheetsSettled(scene) || now - scene.opened > LOAD_WAIT_MS)) scene.started = true;
        if (scene.started && !scene.paused) scene.clock += step * scene.speed;
        this.drawFrame(scene);
        this.queueFrame(scene);
    }

    /** One failed picture must not leave the game paused behind an unusable replay. */
    drawFrame(scene) {
        try {
            this.links.renderer.drawScene(scene, scene.clock);
            this.links.view.updateHud(scene, scene.clock);
            if (scene.clock >= scene.endAt + OUTRO_MS) this.links.view.showResult(scene);
        } catch (error) {
            if (!scene.drawFailed) this.deps.console.warn('ghost duel replay frame failed:', error);
            scene.drawFailed = true;
        }
    }

    restart(scene) {
        const panel = scene.root.querySelector('[data-duel-result]');
        panel.hidden = true;
        scene.root.querySelector('.ghost-duel-controls').hidden = false;
        scene.clock = 0;
        scene.paused = false;
    }

    onClick(scene, event) {
        if (!this.active || this.scene !== scene) return;
        const button = event.target.closest('[data-duel]');
        if (!button || !scene.root.contains(button)) return;
        const action = this.actions[button.dataset.duel];
        if (!Object.hasOwn(this.actions, button.dataset.duel)) return;
        action(scene);
        if (this.scene === scene) this.links.view.syncButtons(scene);
    }

    openDuelTab() {
        this.stop();
        this.deps.switchTab('tab-map', { keepWindowOpen: true });
        this.deps.switchMapSubtab('map-tab-pvp');
    }

    stop() {
        const scene = this.scene;
        if (!scene) return;
        this.scene = null;
        this.deps.cancelAnimationFrame(scene.frame);
        scene.frame = 0;
        if (scene.root) {
            scene.root.removeEventListener('click', scene.onClick);
            scene.root.remove();
        }
        this.links.pictures.release(scene);
    }

    /** Result screens also pause foreground gameplay, as before. */
    playing() { return !!this.scene; }

    dispose() {
        if (!this.active) return;
        this.active = false;
        this.stop();
    }
}
