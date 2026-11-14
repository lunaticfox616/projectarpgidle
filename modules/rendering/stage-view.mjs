/** Side-view layout policy and remembered facing. The entry passes settings; no game/save state is owned here. */
class StageView {
    constructor(deps) {
        this.deps = deps;
        this.sides = new WeakMap();
        // Keep the local trial flag stable for this page, including the original leading-1 rule.
        this.stageByAddress = typeof deps.location === 'object' && ['localhost', '127.0.0.1', '[::1]'].includes(deps.location.hostname)
            && /^1(?!\d)/.test(new deps.URLSearchParams(deps.location.search).get('stage') || '');
    }

    trial() { return this.stageByAddress; }
    rooms() { return typeof this.deps.actExplorationRoomPlans === 'object'; }
    depth() { return this.deps.STAGE_VIEW.depth; }
    anchorY() { return this.deps.STAGE_VIEW.anchorY; }

    /** Width in CSS pixels per cell. Explicit zoom wins; otherwise fit both the room and headroom. */
    tile(settings, width, height, rows) {
        const rule = this.deps.STAGE_VIEW.minColumns, narrow = width < rule.narrowBelow, columns = narrow ? rule.narrow : rule.wide;
        if (Number(settings.stageZoom)) return this.deps.STAGE_VIEW.heroTile * Number(settings.stageZoom);
        if (this.stacked()) return Math.floor(width / this.deps.STAGE_ROOMS.stacked.columns);
        const widest = Math.floor(Math.min(width / columns, rows ? this.tallestTile(width, height, rows) : Infinity));
        const free = this.deps.STAGE_VIEW.heroTile * Math.max(this.deps.STAGE_VIEW.minDot, widest / this.deps.STAGE_VIEW.heroTile);
        return narrow || this.phonePortrait(width, height) ? free : this.steppedTile(width, height, rows) || free;
    }

    /** Integer canvas-pixel steps on desktop; zero lets tile() use the continuous scale. */
    steppedTile(width, height, rows) {
        const rule = this.deps.STAGE_VIEW.tileSteps, step = rule.canvasPx / (typeof this.deps.uiDisplay === 'object' ? this.deps.uiDisplay.battleRenderScale : 1);
        const smallest = Math.ceil(this.deps.STAGE_VIEW.heroTile * this.deps.STAGE_VIEW.minDot / step);
        const byWidth = Math.max(smallest, Math.ceil(width / rule.maxColumns / step));
        const steps = rows ? Math.min(byWidth, Math.floor(this.tallestTile(width, height, rows, 0) / step)) : byWidth;
        return steps >= smallest && width / (steps * step) <= rule.maxColumns ? steps * step : 0;
    }

    /** Front edge of the floor as a share of viewport height, above the HUD. */
    floorShare(width, height) {
        const share = this.deps.STAGE_ROOMS.floorBottom;
        if (this.stacked()) return 1 - this.deps.STAGE_ROOMS.stacked.clear / height;
        if (this.phonePortrait(width, height)) return Math.max(share.narrow, 1 - this.deps.STAGE_ROOMS.phoneClear / height);
        return width >= this.deps.STAGE_VIEW.minColumns.narrowBelow ? Math.min(share.wide, 1 - this.deps.STAGE_ROOMS.hudClear / height) : share.narrow;
    }

    /** Match the mobile battle layout without allocating a media query every frame. */
    stacked() {
        return typeof this.deps.document === 'object' && this.deps.document.body.dataset.uiSkin === 'rift' && this.deps.document.body.classList.contains('mobile-battle-tab')
            && (this.deps.window.innerHeight >= this.deps.window.innerWidth || this.deps.window.innerHeight >= 601 * this.deps.uiDisplay.factor);
    }

    phonePortrait(width, height) {
        return height > width && width <= this.deps.STAGE_ROOMS.phoneWidth;
    }

    tallestTile(width, height, rows, top = this.deps.STAGE_VIEW.headroom.top) {
        const room = this.deps.STAGE_VIEW.headroom, floor = height * this.floorShare(width, height);
        return (floor - top) / (rows * this.deps.STAGE_VIEW.depth + room.dots / this.deps.STAGE_VIEW.heroTile);
    }

    /** Up/down movement retains the most recent side-facing row. */
    facing(unit, direction) {
        if (direction === 'east' || direction === 'west') this.sides.set(unit, direction);
        return this.sides.get(unit) || 'west';
    }
}

export function createStageView(deps) {
    const view = new StageView(deps);
    return Object.freeze({
        trial: view.trial.bind(view), rooms: view.rooms.bind(view), depth: view.depth.bind(view),
        tile: view.tile.bind(view), steppedTile: view.steppedTile.bind(view), floorShare: view.floorShare.bind(view),
        stacked: view.stacked.bind(view), phonePortrait: view.phonePortrait.bind(view), tallestTile: view.tallestTile.bind(view),
        anchorY: view.anchorY.bind(view), facing: view.facing.bind(view)
    });
}
