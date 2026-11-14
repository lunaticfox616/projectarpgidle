
/** Native atlas encounters; no DOM or renderer dependency. */
export class CosmosAtlasEncounters {
    constructor(deps, services) { this.deps = deps; this.rules = services.rules; this.directives = services.directives; this.state = services.state; this.graph = services.graph; }

    startCosmosBattle(node) {
        if (!this.deps.game || !node) return;
        const tier = this.rules.getCosmosChallengeTier(node);
        const lootTier = this.rules.getDisplayedNodeTier(node);
        const mechanic = this.rules.getCosmosNodeMechanic(node);
        const directive = this.directives.getSelectedCosmosDirective(node);
        const recommendation = this.rules.getCosmosNodeRecommendation(node);
        const state = this.state.getState();
        state.activeChallenge = {
            ...this.cosmosChallengeIdentity(node, mechanic),
            route: this.deps.cosmosRouteRuntime.current(this.deps.game) === node.id,
            habitat: this.deps.cosmosRouteRuntime.habitat(this.deps.game, node.id),
            tier,
            lootTier,
            recommendedDps: recommendation ? recommendation.target.dps : 0,
            recommendedEhp: recommendation ? recommendation.target.ehp : 0,
            directive: this.directives.createCosmosDirectiveSnapshot(directive)
        };
        this.deps.game.currentZoneId = 'cosmos_challenge';
        this.deps.game.killsInZone = 0;
        this.deps.game.enemies = [];
        this.deps.game.encounterPlan = [];
        this.deps.game.encounterIndex = 0;
        this.deps.game.runProgress = 0;
        this.deps.game.moveTimer = 0;
        this.deps.game.combatHalted = false;
        if (typeof this.deps.startMoving === 'function') this.deps.startMoving(!this.deps.cosmosRouteRuntime.active(this.deps.game));
    }

    cosmosChallengeIdentity(node, mechanic) {
        return {
            nodeId: node.id, galaxy: node.orbit, name: node.name,
            gravity: Math.max(1, Number(node.gravity || 1)),
            sizeClass: Math.max(1, Math.floor(node.sizeClass || 1)),
            tag: node.baseTag || node.tag || '', theme: node.theme || '',
            mechanicId: mechanic ? mechanic.id : '', ele: mechanic ? mechanic.element : 'chaos'
        };
    }

    *continueCosmosChallengeAfterClear(mapAction) {
        if (this.state.getState().activeChallenge?.route) return (yield* this.continueCosmosRouteAfterClear());
        if (mapAction === 'repeatZone') return (yield* this.repeatCosmosChallenge());
        if (mapAction !== 'nextZone' && mapAction !== 'nextLoopBestPlusOne') return false;
        const guide = this.rules.getCosmosProgressGuide();
        const node = guide.targetId ? this.graph.byId.get(guide.targetId) : null;
        if (!node || !this.rules.canChallengeNode(node)) return false;
        const state = this.state.getState();
        state.selectedId = node.id;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('🧭 다음 천체 자동 탐사: {name}', { name: node.name }), 'season-up'] });
        this.startCosmosBattle(node);
        return true;
    }

    *repeatCosmosChallenge() {
        const state = this.state.getState();
        const currentNode = this.graph.byId.get(state.activeChallenge?.nodeId);
        if (!this.rules.canChallengeNode(currentNode)) return false;
        state.selectedId = currentNode.id;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('우주계 반복 탐사: {name}', { name: currentNode.name }), 'season-up'] });
        this.startCosmosBattle(currentNode);
        return true;
    }

    *continueCosmosRouteAfterClear() {
        this.graph.buildCosmosAtlasData();
        const id = this.deps.cosmosRouteRuntime.current(this.deps.game);
        const node = this.graph.byId.get(id);
        if (node && this.rules.canChallengeNode(node)) { this.startCosmosBattle(node); return true; }
        if (node) this.deps.cosmosRouteRuntime.stop(this.deps.game);
        this.deps.game.combatHalted = true;
        this.deps.game.enemies = [];
        this.deps.game.encounterPlan = [];
        this.deps.game.encounterIndex = 0;
        this.deps.game.runProgress = 0;
        this.deps.game.moveTimer = 0;
        (yield* this.notifyCosmosRouteStop());
        return true;
    }

    *notifyCosmosRouteStop() {
        const challenge = this.state.getState().activeChallenge;
        if (!challenge || challenge.routeStopNotified) return;
        challenge.routeStopNotified = true;
        const text = '관문권 항로 탐사가 종료되었습니다.';
        if (this.deps.canLog) (yield { kind: 'addLog', args: [text, 'season-up'] });
        if (!this.deps.game.isBackgroundCalculation && this.deps.canToast) {
            (yield { kind: 'showGameToast', args: [text, { duration: 5000 }] });
        }
    }
}
