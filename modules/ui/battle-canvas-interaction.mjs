/** Canvas input and deferred sizing own their listeners/RAF handles. No game or save reference is captured. */
export class BattleCanvasInteraction {
    constructor(deps) {
        this.deps = deps; this.canvas = null; this.active = true; this.frames = new Set();
        this.lastMobile = undefined; this.waitingForLoad = false;
        this.onClick = event => { event.preventDefault(); this.command(event); };
        this.onMove = event => this.deps.explorationUi.hover(this.canvas, event);
        this.onLeave = () => this.deps.explorationUi.hover(this.canvas, null);
        this.onLoad = () => { this.waitingForLoad = false; this.scheduleResize(); };
    }

    bindBattleCanvas() {
        const canvas = this.deps.document.getElementById('battlefield-canvas');
        if (!this.active || !canvas || canvas.dataset.movementInteractionBound === 'true') return;
        this.unbind();
        this.canvas = canvas;
        canvas.dataset.movementInteractionBound = 'true';
        canvas.addEventListener('click', this.onClick);
        canvas.addEventListener('pointermove', this.onMove);
        canvas.addEventListener('pointerleave', this.onLeave);
    }

    setup() {
        if (this.active) this.deps.passiveScene.setupCanvasEvents(() => this.bindBattleCanvas());
    }

    command(event) {
        if (!this.active || this.deps.bossMoves.observer.sceneActive()) return;
        const point = this.deps.canvasBox.clientPoint(this.canvas, event.clientX, event.clientY);
        const npc = this.deps.titleCard.npcAt(point);
        if (npc && this.deps.unlockUi.openNpc(npc)) { this.face(point); return; }
        const door = this.deps.doors.targetAt(point);
        if (door) { this.deps.explorationUi.commandMove(door); return; }
        if (this.deps.explorationUi.lockOnAt(point)) return;
        const cell = this.deps.explorationView.cellAt(point);
        if (cell) this.deps.explorationUi.commandMove(cell, this.deps.explorationView.cellAt(point, true));
    }

    face(point) {
        const visual = this.deps.visual, hero = visual.playerPos;
        if (hero && Math.abs(point.x - hero.x) > 4) visual.playerFacingDirection = point.x < hero.x ? 'west' : 'east';
    }

    resize() {
        if (!this.active) return;
        this.responsiveLayout();
        const canvas = this.deps.document.getElementById('tree-canvas');
        if (canvas && canvas.offsetParent !== null) {
            this.deps.fitTree(false);
            if (this.deps.passiveScene.resizePassiveTreeCanvas(false)) this.deps.drawTree();
        }
        this.deps.resizeBattlefield();
        // Initialization must still reach cloud/login setup when drawing fails.
        try { this.deps.renderBattlefield(); }
        catch (error) { this.deps.console.error('renderBattlefield on resize failed:', error); }
    }

    queueFrame(action) {
        const handle = this.deps.requestFrame(() => {
            this.frames.delete(handle);
            if (this.active) action();
        });
        this.frames.add(handle);
    }

    scheduleResize() {
        if (!this.active) return;
        if (this.deps.document.readyState !== 'complete') {
            if (!this.waitingForLoad) this.deps.window.addEventListener('load', this.onLoad, { once: true });
            this.waitingForLoad = true;
            return;
        }
        this.queueFrame(() => this.queueFrame(() => this.resize()));
    }

    resetDesktopScroll() {
        this.deps.window.scrollTo(0, 0);
        const document = this.deps.document;
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const left = document.getElementById('left-pane'), right = document.getElementById('right-pane');
        if (left) left.scrollTop = 0;
        if (right) right.scrollTop = 0;
        document.querySelectorAll('.tab-content').forEach(node => { node.scrollTop = 0; });
    }

    responsiveLayout() {
        const mobile = this.deps.display.matches('(max-width: 1080px)');
        if (this.lastMobile && !mobile) {
            this.resetDesktopScroll();
            this.queueFrame(() => this.resetDesktopScroll());
        }
        this.lastMobile = mobile;
    }

    unbind() {
        if (!this.canvas) return;
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('pointermove', this.onMove);
        this.canvas.removeEventListener('pointerleave', this.onLeave);
        delete this.canvas.dataset.movementInteractionBound;
        this.canvas = null;
    }

    dispose() {
        this.active = false;
        this.unbind();
        this.deps.window.removeEventListener('load', this.onLoad);
        this.waitingForLoad = false;
        for (const handle of this.frames) this.deps.cancelFrame(handle);
        this.frames.clear();
        this.lastMobile = undefined;
    }
}
