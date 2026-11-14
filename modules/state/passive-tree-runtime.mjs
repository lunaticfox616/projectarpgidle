/** Runtime-only tree layout and visibility. Sets may be replaced when a save/view is refreshed.
 * Camera and DOM state remain owned by the separate passive scene view. */
export class PassiveTreeRuntime {
    constructor() {
        this.worldScale = 1.14;
        this.bounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
        this.reachableNodes = new Set();
        this.discoveredNodes = new Set();
        this.previewNodes = new Set();
    }
}
