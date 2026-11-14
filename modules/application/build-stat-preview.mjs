/** Synchronous comparison boundary. The inventory is shared read-only; edits target the cloned build.
 * The original owner is restored even if cloning, editing or stat calculation throws. */
export class BuildStatPreview {
    constructor(state, readStats) { this.state = state; this.readStats = readStats; }

    previewBuildStats(edit) {
        const live = this.state.game, before = this.readStats(false);
        try {
            this.state.game = JSON.parse(JSON.stringify({ ...live, inventory: undefined }));
            this.state.game.inventory = live.inventory;
            edit(this.state.game);
            const after = this.readStats(false);
            return { dps: [before.dps || 0, after.dps || 0], life: [before.maxHp || 0, after.maxHp || 0], before, after };
        } finally {
            this.state.game = live;
        }
    }

    previewPassiveNodeStats(nodeIds) {
        return this.previewBuildStats(copy => { copy.passives = [...new Set([...(copy.passives || []), ...nodeIds])]; });
    }
}
