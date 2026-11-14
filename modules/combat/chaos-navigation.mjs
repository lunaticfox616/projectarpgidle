/** combat/chaos-navigation: native owner; state is read from the supplied current-game port. */
export class ChaosNavigation {
    constructor(deps, data, { zones, progress, difficulty }) {
        this.deps = deps;
        this.data = data;
        this.zones = zones;
        this.progress = progress;
        this.difficulty = difficulty;
        this.getContentReturnZoneId = this.getContentReturnZoneId.bind(this);
        this.getAutoProgressZoneId = this.getAutoProgressZoneId.bind(this);
        this.enterNextEndlessChaosDepth = this.enterNextEndlessChaosDepth.bind(this);
        this.enterUnlockedEndlessDepth = this.enterUnlockedEndlessDepth.bind(this);
    }

    getContentReturnZoneId(state = this.deps.game) {
        const id = state.currentZoneId;
        return typeof id !== 'string' || this.zones.getFloorZone(id) !== undefined ? id : this.getAutoProgressZoneId(state.maxZoneId);
    }

    getAutoProgressZoneId(fallbackZoneId) {
        if ((this.deps.game.season || 1) < 10 || !this.progress.hasCurrentLoopChaos20Clear()) return fallbackZoneId;
        let depth = this.progress.getLoopDeepChaosFrontierDepth();
        this.deps.game.abyssEndlessDepth = depth;
        this.deps.ensureNextEndlessChaosDepthUnlocked(depth - 1);
        return this.difficulty.getAbyssZoneIdForDepth(depth);
    }

    *enterNextEndlessChaosDepth(clearedZone) {
        if (this.isMapTravelLocked()) {
            if ((this.deps.canWarnBeehiveMapTravelBlocked ? 'function' : 'undefined') === 'function') return (yield { kind: 'warnBeehiveMapTravelBlocked', args: [] });
            return;
        }
        if ((this.deps.game.season || 1) < 10) return;
        this.deps.game.abyssEndlessDepth = Math.max(20, Math.floor(this.deps.game.abyssEndlessDepth || 20) + 1);
        this.deps.game.abyssUnlockedDepths = Array.isArray(this.deps.game.abyssUnlockedDepths) ? this.deps.game.abyssUnlockedDepths : [20];
        if (!this.deps.game.abyssUnlockedDepths.includes(this.deps.game.abyssEndlessDepth)) this.deps.game.abyssUnlockedDepths.push(this.deps.game.abyssEndlessDepth);
        this.deps.game.currentZoneId = this.difficulty.getAbyssZoneIdForDepth(this.deps.game.abyssEndlessDepth);
        this.deps.game.killsInZone = 0;
        this.deps.game.combatHalted = false;
        this.deps.game.runProgress = 0;
        (yield { kind: 'addLog', args: [this.deps._t('♾️ 혼돈 심화 {abyssEndlessDepth}층 진입', { abyssEndlessDepth: this.deps.game.abyssEndlessDepth }), 'season-up'] });
        (yield { kind: 'enterAutomaticMapInterruptionAfterClear', args: [clearedZone] }); // a ready grand breach or meteor postponed by the map's loot goes first
        (yield { kind: 'startMoving', args: [true] });
        (yield { kind: 'updateStaticUI', args: [] });
    }

    *enterUnlockedEndlessDepth(depth) {
        if (this.isMapTravelLocked()) {
            if ((this.deps.canWarnBeehiveMapTravelBlocked ? 'function' : 'undefined') === 'function') return (yield { kind: 'warnBeehiveMapTravelBlocked', args: [] });
            return;
        }
        if ((this.deps.game.season || 1) < 10) return;
        this.deps.game.abyssUnlockedDepths = Array.isArray(this.deps.game.abyssUnlockedDepths) ? this.deps.game.abyssUnlockedDepths : [20];
        depth = Math.max(20, Math.floor(depth || 20));
        if (!this.deps.game.abyssUnlockedDepths.includes(depth)) return (yield { kind: 'addLog', args: [this.deps._t('아직 도달하지 않은 심화 층수입니다.'), 'attack-monster'] });
        this.deps.game.abyssEndlessDepth = depth;
        this.deps.game.currentZoneId = this.difficulty.getAbyssZoneIdForDepth(depth);
        this.deps.game.killsInZone = 0;
        this.deps.game.combatHalted = false;
        this.deps.game.runProgress = 0;
        (yield { kind: 'addLog', args: [this.deps._t('🧭 기록된 혼돈 심화 {depth}층으로 이동', { depth }), 'season-up'] });
        (yield { kind: 'startMoving', args: [true] });
        (yield { kind: 'updateStaticUI', args: [] });
    }

    isMapTravelLocked() {
        return typeof this.deps.isBeehiveRunLockedForMapTravel === 'function' ? this.deps.isBeehiveRunLockedForMapTravel() : !!(this.deps.game.beehive && this.deps.game.beehive.inRun);
    }
}
