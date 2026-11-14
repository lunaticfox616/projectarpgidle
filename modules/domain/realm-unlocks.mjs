/** domain/realm-unlocks: native owner; state is read from the supplied current-game port. */
export class RealmUnlockRules {
    constructor(deps, data, { chaos, progress }) {
        this.deps = deps;
        this.data = data;
        this.chaos = chaos;
        this.progress = progress;
        this.canEnterChaosRealm = this.canEnterChaosRealm.bind(this);
        this.underworldGateFacts = this.underworldGateFacts.bind(this);
        this.getUnderworldEntryBlock = this.getUnderworldEntryBlock.bind(this);
        this.getUnderworldEntryLockReason = this.getUnderworldEntryLockReason.bind(this);
        this.canEnterUnderworld = this.canEnterUnderworld.bind(this);
        this.underworldHasProgress = this.underworldHasProgress.bind(this);
        this.getUnderworldUnlockChecks = this.getUnderworldUnlockChecks.bind(this);
        this.isUnderworldUnlockReady = this.isUnderworldUnlockReady.bind(this);
        this.getCosmosUnlockChecks = this.getCosmosUnlockChecks.bind(this);
        this.isCosmosContentUnlockReady = this.isCosmosContentUnlockReady.bind(this);
        this.isMapPrimaryContentUnlockReady = this.isMapPrimaryContentUnlockReady.bind(this);
        this.isMapPrimaryContentUnlocked = this.isMapPrimaryContentUnlocked.bind(this);
        this.reconcileMapPrimaryContentUnlocks = this.reconcileMapPrimaryContentUnlocks.bind(this);
        this.getMapPrimaryContentEntryCondition = this.getMapPrimaryContentEntryCondition.bind(this);
        this.getPinnacleRequirementProgress = this.getPinnacleRequirementProgress.bind(this);
        this.getSeasonBossProgressGate = this.getSeasonBossProgressGate.bind(this);
    }

    canEnterChaosRealm() {
        return !!this.chaos.ensureChaosRealmState().unlocked && this.progress.hasCurrentLoopChaos20Clear();
    }

    underworldGateFacts(state) {
        const rootBosses = Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : [];
        return { chaosRealm: !!state.chaosRealm?.unlocked, cerberus: rootBosses.includes('s6_beast_cerberus'),
            deep: this.progress.getHighestUnlockedEndlessChaosDepth(state), labyrinth: Math.max(1, Math.floor(state.labyrinthUnlockedMaxFloor || state.labyrinthFloor || 1)) };
    }

    getUnderworldEntryBlock(source) {
        const state = source || this.deps.game, { chaosRealm, cerberus, deep, labyrinth } = this.underworldGateFacts(state);
        if (!chaosRealm) return { label: this.deps._t('혼돈계 해금 필요'), route: 'outside-chaos' };
        if (!this.progress.hasCurrentLoopChaos20Clear(state)) return { label: this.deps._t('이번 루프 혼돈 20 클리어 필요'), route: 'map-explore-chaos' };
        if (!cerberus) return { label: this.deps._t('케르베로스 처치 필요'), route: 'map-explore-root-boss' };
        if (deep < 30) return { label: this.deps._t('혼돈 심화 30층 필요 (현재 {floor})', { floor: deep }), route: 'map-explore-chaos' };
        if (labyrinth < 100) return { label: this.deps._t('고대 미궁 100층 필요 (현재 {floor})', { floor: labyrinth }), route: 'map-explore-labyrinth' };
        return null;
    }

    getUnderworldEntryLockReason(source) {
        return this.getUnderworldEntryBlock(source)?.label || '';
    }

    canEnterUnderworld() {
        return this.getUnderworldEntryLockReason(this.deps.game) === '';
    }

    underworldHasProgress(state) {
        const progress = state.underworldProgress;
        return Math.floor(progress?.highestFloor || 1) > 1 || !!progress?.floor10Cleared
            || Math.floor(state.underworldRunes?.unlockedSlots || 0) > 0;
    }

    getUnderworldUnlockChecks(state) {
        const { chaosRealm, cerberus, deep, labyrinth } = this.underworldGateFacts(state);
        const inherited = this.underworldHasProgress(state);
        return [['혼돈계 개방 기록', inherited || chaosRealm, 'outside-chaos'], ['케르베로스 처치', inherited || cerberus, 'map-explore-root-boss'],
            ['혼돈 심화 30층 도달', inherited || deep >= 30, 'map-explore-chaos'], ['고대 미궁 100층 도달', inherited || labyrinth >= 100, 'map-explore-labyrinth']];
    }

    isUnderworldUnlockReady(source) {
        return this.getUnderworldUnlockChecks(source || this.deps.game).every(row => row[1]);
    }

    getCosmosUnlockChecks(state) {
        const { unlocked, cleared, bossClears } = state.cosmosAtlas || {};
        const inherited = !!unlocked || [cleared, bossClears].some(rows => Array.isArray(rows) && rows.length > 0);
        const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
        const highest = Math.floor(state.underworldProgress?.highestFloor || 1);
        return [['혼돈 밖의 나무꾼 처치', inherited || journal.includes('woodsman'), 'outside-chaos'], ['지하계 30층 도달', inherited || highest >= 30, 'map-tab-underworld']];
    }

    isCosmosContentUnlockReady(source) {
        return this.getCosmosUnlockChecks(source || this.deps.game).every(row => row[1]);
    }

    isMapPrimaryContentUnlockReady(contentId, source) {
        let state = source || this.deps.game;
        if (contentId === 'map-tab-zones') return true;
        if (contentId === 'map-tab-pvp') return state.season >= this.deps.MAP_PRIMARY_CONTENTS.find(entry => entry.id === contentId).unlockLoop;
        if (contentId === 'map-tab-chaos-realm') return this.savedRealmUnlocked(state, 'chaosRealm');
        if (contentId === 'map-tab-sky') return this.savedRealmUnlocked(state, 'skyTower');
        if (contentId === 'map-tab-underworld') return this.isUnderworldUnlockReady(state);
        if (contentId === 'map-tab-cosmos') return this.isCosmosContentUnlockReady(state);
        if (contentId === 'map-tab-ocean' || contentId === 'map-tab-fishing') {
            return this.oceanUnlockReady(state);
        }
        return false;
    }

    isMapPrimaryContentUnlocked(source, contentId) {
        let unlocked = Array.isArray(source && source.unlockedMapContents) ? source.unlockedMapContents : [];
        if (contentId === 'map-tab-pvp' && !this.isMapPrimaryContentUnlockReady(contentId, source)) return false;
        return unlocked.includes(contentId);
    }

    reconcileMapPrimaryContentUnlocks(source) {
        if (!source || typeof source !== 'object') return [];
        let validIds = new Set(this.deps.MAP_PRIMARY_CONTENTS.map(def => def.id));
        let savedIds = Array.isArray(source.unlockedMapContents) ? source.unlockedMapContents : [];
        let unlocked = new Set(savedIds.filter(id => validIds.has(id)));
        if (!this.isMapPrimaryContentUnlockReady('map-tab-pvp', source)) unlocked.delete('map-tab-pvp');
        let newlyUnlocked = [];
        this.deps.MAP_PRIMARY_CONTENTS.forEach(def => {
            if (unlocked.has(def.id) || !this.isMapPrimaryContentUnlockReady(def.id, source)) return;
            unlocked.add(def.id);
            newlyUnlocked.push(def.id);
        });
        source.unlockedMapContents = this.deps.MAP_PRIMARY_CONTENTS.map(def => def.id).filter(id => unlocked.has(id));
        return newlyUnlocked;
    }

    getMapPrimaryContentEntryCondition(contentId, source) {
        let state = source || this.deps.game;
        if (!this.isMapPrimaryContentUnlocked(state, contentId)) return '';
        if (contentId === 'map-tab-chaos-realm' && !this.progress.hasCurrentLoopChaos20Clear(state)) return this.deps._t('이번 루프 혼돈 20 클리어 필요');
        if (contentId === 'map-tab-sky' && !this.progress.hasCurrentLoopChaosAccess(state)) return this.deps._t('혼돈 진입 필요');
        if (contentId === 'map-tab-underworld') return this.getUnderworldEntryLockReason(state);
        return '';
    }

    getPinnacleRequirementProgress(requirement, source) {
        const target = Math.max(1, Math.floor(Number(requirement && requirement.target) || 1));
        if (!source || !requirement) return { met: false, current: 0, target, label: '진행 정보 없음' };
        if (requirement.kind === 'underworldFloor') {
            return this.underworldRequirementProgress(source, target);
        }
        if (requirement.kind === 'oceanDepth') {
            return this.oceanRequirementProgress(source, target);
        }
        if (requirement.kind === 'skyFloor') {
            const current = this.progress.getClearedSkyTowerFloor(source);
            return { met: current >= target, current, target, label: `창공의 탑 ${current}/${target}층` };
        }
        return { met: false, current: 0, target, label: '알 수 없는 선행 조건' };
    }

    getSeasonBossProgressGate(zone, source) {
        const state = source || this.deps.game;
        if (!zone || !state) return { met: false, label: '진행 정보 없음' };
        if (Array.isArray(zone.requiresRivals)) {
            return this.rivalProgressGate(zone, state);
        }
        if (Array.isArray(zone.requiresCosmosBosses)) {
            return this.cosmosBossProgressGate(zone, state);
        }
        if (zone.pinnacleRequirement) return this.getPinnacleRequirementProgress(zone.pinnacleRequirement, state);
        if (Array.isArray(zone.requiresPinnacles)) {
            const cleared = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
            const current = zone.requiresPinnacles.filter(id => cleared.has(id)).length;
            return { met: current >= zone.requiresPinnacles.length, current, target: zone.requiresPinnacles.length, label: `수호자 격파 ${current}/${zone.requiresPinnacles.length}` };
        }
        return { met: true, label: '' };
    }

    savedRealmUnlocked(state, key) {
        return !!(state && state[key] && state[key].unlocked);
    }

    oceanUnlockReady(state) {
        return this.savedRealmUnlocked(state, 'ocean') || Math.max(1, Math.floor((state && state.season) || 1)) >= this.deps.OCEAN_UNLOCK_LOOP;
    }

    underworldRequirementProgress(source, target) {
            const progress = source.underworldProgress && typeof source.underworldProgress === 'object' ? source.underworldProgress : {};
            const current = Math.max(0, Math.floor(Number(progress.highestFloor) || 1) - 1);
            return { met: current >= target, current, target, label: `지하계 ${current}/${target}층` };
    }

    oceanRequirementProgress(source, target) {
            const ocean = source.ocean && typeof source.ocean === 'object' ? source.ocean : {};
            const current = Math.max(0, Math.floor(Number(ocean.bossClearM) || 0));
            return { met: current >= target, current, target, label: `심해 가디언 ${current}/${target}m` };
    }

    rivalProgressGate(zone, state) {
            const progress = state.loopProgressCurrent && typeof state.loopProgressCurrent === 'object' ? state.loopProgressCurrent : {};
            const cleared = new Set(Array.isArray(progress.specialBosses) ? progress.specialBosses : []);
            const current = zone.requiresRivals.filter(id => cleared.has(id)).length;
            return { met: current >= zone.requiresRivals.length, current, target: zone.requiresRivals.length, label: `이번 루프 선행 결투 ${current}/${zone.requiresRivals.length}` };
    }

    cosmosBossProgressGate(zone, state) {
            const atlas = state.cosmosAtlas && typeof state.cosmosAtlas === 'object' ? state.cosmosAtlas : {};
            const cleared = new Set(Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
            const current = zone.requiresCosmosBosses.filter(id => cleared.has(id)).length;
            return { met: current >= zone.requiresCosmosBosses.length, current, target: zone.requiresCosmosBosses.length, label: `이번 루프 은하 보스 ${current}/${zone.requiresCosmosBosses.length}` };
    }
}
