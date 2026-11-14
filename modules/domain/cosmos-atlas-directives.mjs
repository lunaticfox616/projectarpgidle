
/** Native atlas directives; no DOM or renderer dependency. */
export class CosmosAtlasDirectives {
    constructor(deps, services) { this.deps = deps; this.state = services.state; this.graph = services.graph; this.progress = services.progress; }

    getCosmosDirectiveChoicesForNode(node, stateOverride) {
        if (!node || typeof this.deps.getCosmosExpeditionDirectiveChoices !== 'function') return [];
        const state = stateOverride || this.state.getState();
        const cycle = Math.max(0, Math.floor(Number(state.directiveCycles[node.id]) || 0));
        return this.deps.getCosmosExpeditionDirectiveChoices(node.id, cycle);
    }

    getSelectedCosmosDirective(node, stateOverride) {
        const routeDirective = this.deps.cosmosRouteRuntime.directive(this.deps.game, node.id);
        if (routeDirective) return routeDirective;
        const state = stateOverride || this.state.getState();
        const choices = this.getCosmosDirectiveChoicesForNode(node, state);
        if (choices.length === 0) return null;
        const selectedId = state.selectedDirectives[node.id];
        return choices.find(row => row.id === selectedId) || choices[0];
    }

    createCosmosDirectiveSnapshot(directive) {
        if (!directive) return null;
        return {
            id: directive.id, name: directive.name,
            enemyHpMul: directive.enemyHpMul, enemyDamageMul: directive.enemyDamageMul,
            enemyAttackSpeedMul: directive.enemyAttackSpeedMul, rewardMul: directive.rewardMul,
            jackpotChance: directive.jackpotChance, jackpotBonusMul: directive.jackpotBonusMul,
            rare: directive.rare === true
        };
    }

    *selectCosmosExpeditionDirective(nodeId, directiveId) {
        const node = this.graph.byId.get(String(nodeId || ''));
        if (!node || this.progress.getNodeStatus(node) === 'locked') return false;
        const state = this.state.getState();
        const fightingThisNode = this.deps.game.currentZoneId === 'cosmos_challenge'
            && state.activeChallenge && state.activeChallenge.nodeId === node.id;
        if (fightingThisNode) return false;
        const choices = this.getCosmosDirectiveChoicesForNode(node, state);
        const selected = choices.find(row => row.id === String(directiveId || ''));
        if (!selected) return false;
        state.selectedDirectives[node.id] = selected.id;
        (yield { kind: 'renderCosmosAtlas', args: [] });
        return true;
    }

    advanceCosmosDirectiveCycle(state, nodeId) {
        const current = Math.max(0, Math.floor(Number(state.directiveCycles[nodeId]) || 0));
        state.directiveCycles[nodeId] = Math.min(999999, current + 1);
        delete state.selectedDirectives[nodeId];
    }

    getCompletedChallengeDirective(state, node) {
        const challenge = state.activeChallenge && state.activeChallenge.nodeId === node.id
            ? state.activeChallenge : null;
        if (challenge && challenge.directive) return challenge.directive;
        return this.createCosmosDirectiveSnapshot(this.getSelectedCosmosDirective(node, state));
    }
}
