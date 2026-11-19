/** Synchronous comparison boundary. The inventory is shared read-only; edits target the cloned build.
 * The original owner is restored even if cloning, editing or stat calculation throws. */
export class BuildStatPreview {
    /** @param {(state: object) => object} copySpecialization the passive state for a copy (shares the karma history) */
    constructor(state, readStats, copySpecialization) { this.state = state; this.readStats = readStats; this.copySpecialization = copySpecialization; }

    /** The copy shares what no build edit or stat read writes, the bulk of a save in play: the inventory, the room map
     * (actExploration) and the karma history (copySpecialization). Every other field is a fresh copy the edit may change. */
    copyBuild(live) {
        const { inventory, actExploration, passiveSpecialization, ...build } = live;
        const copy = JSON.parse(JSON.stringify(build));
        copy.inventory = inventory;
        if (actExploration !== undefined) copy.actExploration = actExploration;
        if (passiveSpecialization !== undefined) copy.passiveSpecialization = this.copySpecialization(passiveSpecialization);
        return copy;
    }

    previewBuildStats(edit) {
        const live = this.state.game, before = this.readStats(false);
        try {
            this.state.game = this.copyBuild(live);
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
