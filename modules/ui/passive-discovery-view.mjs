import { consumeDomainCommands } from '../common/consume-commands.mjs';

/** The UI consumes discovery effects. Domain services are read lazily after the passive boot slot. */
export class PassiveDiscoveryView {
    constructor(deps, scene) {
        this.deps = deps;
        this.scene = scene;
        this.effects = {
            passiveRenderDirty: scene.markPassiveRenderCacheDirty,
            passiveRevealBurst: this.presentBurst.bind(this)
        };
        this.calculateReachability = this.calculateReachability.bind(this);
        this.refreshDiscovery = this.refreshDiscovery.bind(this);
        this.revealNodes = this.revealNodes.bind(this);
        this.visibilityForNode = this.visibilityForNode.bind(this);
    }

    calculateReachability() {
        return consumeDomainCommands(this.deps.rules.calculateReachableNodes(this.deps.game), this.effects);
    }

    refreshDiscovery() {
        return consumeDomainCommands(this.deps.rules.refreshPassiveVisibility(this.deps.game), this.effects);
    }

    revealNodes(nodeId, options) {
        return consumeDomainCommands(this.deps.rules.revealAroundNode(this.deps.game, nodeId, options), this.effects);
    }

    visibilityForNode(nodeId) {
        return this.deps.rules.getPassiveVisibility(this.deps.game, nodeId);
    }

    presentBurst(details) {
        const burst = { ...details, startTime: this.deps.performance.now() };
        this.scene.state.passiveRevealBursts.push(burst);
        const showOverlay = this.deps.spawnPassiveRevealBurstOverlay;
        if (typeof showOverlay === 'function') showOverlay(burst);
    }
}
