/** domain/passive-progression: native owner; state is read from the supplied current-game port. */
export class PassiveProgression {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.getAscendanciesForClass = this.getAscendanciesForClass.bind(this);
        this.getAscendancyOrder = this.getAscendancyOrder.bind(this);
        this.isAscendancyOfClass = this.isAscendancyOfClass.bind(this);
        this.getAllAscendKeystoneDefs = this.getAllAscendKeystoneDefs.bind(this);
        this.pickRandomAscendKeystoneId = this.pickRandomAscendKeystoneId.bind(this);
        this.rememberLoopAscendancyPlan = this.rememberLoopAscendancyPlan.bind(this);
        this.getAscendKeystoneName = this.getAscendKeystoneName.bind(this);
        this.getSeasonPassiveNodeDef = this.getSeasonPassiveNodeDef.bind(this);
        this.getAllSeasonPassiveNodeIds = this.getAllSeasonPassiveNodeIds.bind(this);
        this.getSeasonPassiveUnlockLoop = this.getSeasonPassiveUnlockLoop.bind(this);
        this.getPassiveStatTierValue = this.getPassiveStatTierValue.bind(this);
        this.hasPermanentTalentTabUnlock = this.hasPermanentTalentTabUnlock.bind(this);
        this.syncPermanentTalentTabUnlock = this.syncPermanentTalentTabUnlock.bind(this);
        this.normalizeCombatTacticsSettings = this.normalizeCombatTacticsSettings.bind(this);
        this.hasCombatTacticsUnlockProgress = this.hasCombatTacticsUnlockProgress.bind(this);
        this.isFreePassiveStartNodeId = this.isFreePassiveStartNodeId.bind(this);
        this.getPaidPassiveNodeIds = this.getPaidPassiveNodeIds.bind(this);
    }

    getAscendanciesForClass(classId) {
        const list = this.deps.ASCENDANCIES_BY_PLAYER_CLASS[classId];
        return list ? list.slice() : Object.keys(this.deps.CLASS_TEMPLATES);
    }

    getAscendancyOrder() {
        return Object.values(this.deps.ASCENDANCIES_BY_PLAYER_CLASS).flat();
    }

    isAscendancyOfClass(ascendId, classId) {
        return this.getAscendanciesForClass(classId).includes(ascendId);
    }

    getAllAscendKeystoneDefs() {
        let out = [];
        Object.keys(this.deps.CLASS_KEYSTONE_DEFS || {}).forEach(cls => {
            (this.deps.CLASS_KEYSTONE_DEFS[cls] || []).forEach(node => { if (node && node.id) out.push(node); });
        });
        return out;
    }

    pickRandomAscendKeystoneId(classId = this.deps.game.selectedClassId) {
        const allowed = new Set(this.getAscendanciesForClass(classId));
        let defs = Object.keys(this.deps.CLASS_KEYSTONE_DEFS).filter(cls => allowed.has(cls)).flatMap(cls => this.deps.CLASS_KEYSTONE_DEFS[cls] || []);
        if (!defs.length) defs = this.getAllAscendKeystoneDefs();
        if (!defs.length) return null;
        return defs[Math.floor(Math.random() * defs.length)].id;
    }

    rememberLoopAscendancyPlan(state = this.deps.game) {
        const keystones = Array.isArray(state.ascendKeystones) ? state.ascendKeystones.slice() : [];
        if (state.ascendClass && this.deps.CLASS_TEMPLATES[state.ascendClass]) {
            state.lastLoopAscendPlan = { ascendClass: state.ascendClass, nodes: (state.ascendNodes || []).slice(), keystones: keystones.slice() };
        }
        return keystones;
    }

    getAscendKeystoneName(id) {
        if (!id) return '';
        let node = this.getAllAscendKeystoneDefs().find(n => n && n.id === id);
        return node ? node.name : id;
    }

    getSeasonPassiveNodeDef(id) {
        return this.data.SEASON_NODES[id] || this.data.SEASON_INNER_NODES[id] || null;
    }

    getAllSeasonPassiveNodeIds() {
        return Object.keys(this.data.SEASON_NODES).concat(Object.keys(this.data.SEASON_INNER_NODES));
    }

    getSeasonPassiveUnlockLoop(id) {
        if (this.data.SEASON_INNER_NODES[id]) return 1;
        const rowIndex = this.data.SEASON_NODE_ROWS.findIndex(row => row.includes(id));
        return rowIndex >= 4 ? 5 : 1;
    }

    getPassiveStatTierValue(statKey, tier) {
        const statDef = this.data.P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        const size = tier === 1 || tier === 2 ? tier : 3;
        const key = this.data.PASSIVE_TIER_SIZE_ORDER[size].find(name => statDef[name] !== undefined);
        return key ? statDef[key] : this.data.PASSIVE_TIER_FALLBACK[size];
    }

    hasPermanentTalentTabUnlock(state) {
        if (!state || typeof state !== 'object') return false;
        if (Math.max(0, Math.floor(Number(state.talentBloomClears) || 0)) > 0) return true;
        if (['talentBloomCombos', 'bloomedClasses'].some(key => Array.isArray(state[key]) && state[key].length > 0)) return true;
        if (state.talentCards && typeof state.talentCards === 'object' && Object.keys(state.talentCards).length > 0) return true;
        return false;
    }

    syncPermanentTalentTabUnlock(state) {
        if (!state || typeof state !== 'object') return state;
        state.unlocks = (state.unlocks && typeof state.unlocks === 'object') ? state.unlocks : {};
        if (this.hasPermanentTalentTabUnlock(state)) state.unlocks.talent = true;
        if (state.npcMet && Object.keys(state.npcMet).length) state.unlocks.npcs = true;
        return state;
    }

    normalizeCombatTacticsSettings(settings) {
        let target = settings && this.data.COMBAT_TACTIC_TARGET_PRIORITIES.includes(settings.combatTargetPriority)
            ? settings.combatTargetPriority : 'nearest';
        let position = settings && this.data.COMBAT_TACTIC_POSITION_MODES.includes(settings.combatPositionMode)
            ? settings.combatPositionMode : 'auto';
        return { targetPriority: target, positionMode: position };
    }

    hasCombatTacticsUnlockProgress(state) {
        if (!state || typeof state !== 'object') return false;
        let journal = [...(Array.isArray(state.journalUnlocked) ? state.journalUnlocked : []),
            ...(Array.isArray(state.journalEntries) ? state.journalEntries : [])];
        let claimed = Array.isArray(state.claimedActRewards) ? state.claimedActRewards : [];
        return journal.includes('act_3') || claimed.includes(2) || Math.floor(Number(state.maxZoneId) || 0) >= 3;
    }

    isFreePassiveStartNodeId(nodeId) {
        if (String(nodeId) === 'n0') return true;
        const authoredNodes = typeof this.deps.PASSIVE_TREE_V22 !== 'undefined' && this.deps.PASSIVE_TREE_V22
            ? this.deps.PASSIVE_TREE_V22.nodes : null;
        const node = authoredNodes && authoredNodes[String(nodeId)];
        return !!(node && node.kind === 'start');
    }

    getPaidPassiveNodeIds(nodeIds) {
        return (Array.isArray(nodeIds) ? nodeIds : []).filter(nodeId => !this.isFreePassiveStartNodeId(nodeId));
    }
}
