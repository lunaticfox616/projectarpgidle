/** domain/loop-permanent-bonuses: native owner; state is read from the supplied current-game port. */
export class LoopPermanentBonuses {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.getLoop10StatCost = this.getLoop10StatCost.bind(this);
        this.allocateLoop10BonusStat = this.allocateLoop10BonusStat.bind(this);
        this.getWorldTreeBarkLayers = this.getWorldTreeBarkLayers.bind(this);
        this.getWorldTreeBarkReach = this.getWorldTreeBarkReach.bind(this);
        this.getWorldTreeBarkEarned = this.getWorldTreeBarkEarned.bind(this);
        this.normalizeWorldTreeBark = this.normalizeWorldTreeBark.bind(this);
        this.getLoopDeepStatCost = this.getLoopDeepStatCost.bind(this);
        this.allocateLoopDeepStat = this.allocateLoopDeepStat.bind(this);
    }

    getLoop10StatCost(statKey, owner = this.deps.game) {
        owner.loop10BonusStats = owner.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
        let lv = Math.max(0, Math.floor(owner.loop10BonusStats[statKey] || 0));
        return 1 + Math.floor(lv / 3);
    }

    *allocateLoop10BonusStat(statKey) {
        if ((this.deps.game.season || 1) < 10) return;
        // 나무꾼 전투 중에는 루프 포인트가 매 틱 돌아가 강화만 남았다(js/combat.js enforceWoodsmanBuildLock).
        if (this.deps.game.woodsmanBuildLock) return (yield { kind: 'addLog', args: [this.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
        let cost = this.getLoop10StatCost(statKey);
        if ((this.deps.game.seasonPoints || 0) < cost) return (yield { kind: 'addLog', args: [this.deps._t('루프 포인트가 부족합니다. (필요: {cost})', { cost }), 'attack-monster'] });
        this.deps.game.loop10BonusStats = this.deps.game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
        this.deps.game.loop10BonusStats[statKey] = Math.max(0, Math.floor(this.deps.game.loop10BonusStats[statKey] || 0)) + 1;
        this.deps.game.seasonPoints -= cost;
        (yield { kind: 'addLog', args: [this.deps._t('🧬 루프10 강화: {statKey} 투자 +1 (비용 {cost})', { statKey: this.deps.getStatName(statKey), cost }), 'season-up'] });
        (yield { kind: 'updateStaticUI', args: [] });
    }

    getWorldTreeBarkLayers(season) {
        const loop = Math.max(1, Math.floor(Number(season) || 1));
        return this.deps.WORLD_TREE_BARK.loops.filter(at => loop >= at).length;
    }

    getWorldTreeBarkReach(owner) {
        return Math.min(this.deps.WORLD_TREE_BARK.maxZones, this.deps.WORLD_TREE_BARK.baseZones + Math.max(0, Math.floor(Number((owner.worldTreeBark || {}).reach) || 0)));
    }

    getWorldTreeBarkEarned(owner) {
        const rule = this.deps.WORLD_TREE_BARK.points, loop = Math.max(1, Math.floor(Number(owner.season) || 1));
        if (loop < rule.startLoop) return 0;
        const journal = Array.isArray(owner.journalEntries) ? owner.journalEntries : [], goals = (owner.worldTreeBark || {}).timeGoals;
        return rule.start + (loop - rule.startLoop) * rule.perLoop + this.deps.PINNACLE_FIRST_KILL_JOURNALS.filter(id => journal.includes(id)).length * rule.pinnacle
            + (Array.isArray(goals) ? goals.length : 0) * rule.actTenGoal;
    }

    normalizeWorldTreeBark(raw, owner) {
        const bark = raw && typeof raw === 'object' ? raw : {}, rule = this.deps.WORLD_TREE_BARK.points;
        const best = Math.floor(Number((((owner.records || {}).actBest) || {})[rule.actTenZoneId]) || 0);
        const timeGoals = Array.isArray(bark.timeGoals) ? rule.actTenMinutes.filter(goal => bark.timeGoals.includes(goal)) : rule.actTenMinutes.filter(goal => best > 0 && best <= goal * 60000);
        const clean = { timeGoals };
        let room = this.getWorldTreeBarkEarned({ ...owner, worldTreeBark: clean });
        this.deps.WORLD_TREE_BARK.stats.forEach(def => {
            const points = Math.max(0, Math.floor(Number(bark[def.key]) || 0));
            clean[def.key] = Math.min(points, room, def.max === null ? Infinity : def.max);
            room -= clean[def.key];
        });
        return clean;
    }

    getLoopDeepStatCost(statKey) {
        this.deps.game.loopDeepStats = this.deps.game.loopDeepStats || { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
        let lv = Math.max(0, Math.floor(this.deps.game.loopDeepStats[statKey] || 0));
        return 1 + Math.floor(lv / 2);
    }

    *allocateLoopDeepStat(statKey) {
        if (!this.deps.contentProgression.isUnlocked('deepTree') || !this.deps.LOOP_DEEP_STATS.some(def => def.key === statKey)) return;
        if ((this.deps.game.season || 1) < 10) return;
        let cost = this.getLoopDeepStatCost(statKey);
        if ((this.deps.game.loopDeepPoints || 0) < cost) return (yield { kind: 'addLog', args: [this.deps._t('심화 루프 포인트가 부족합니다. (필요: {cost})', { cost }), 'attack-monster'] });
        this.deps.game.loopDeepStats = this.deps.game.loopDeepStats || { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
        this.deps.game.loopDeepStats[statKey] = Math.max(0, Math.floor(this.deps.game.loopDeepStats[statKey] || 0)) + 1;
        this.deps.game.loopDeepPoints -= cost;
        (yield { kind: 'addLog', args: [this.deps._t('🧬 심화 루프 강화: {label} Lv.{level} (비용 {cost})', { label: this.deps._t(this.deps.LOOP_DEEP_STATS.find(def => def.key === statKey).label), level: this.deps.game.loopDeepStats[statKey], cost }), 'season-up'] });
        (yield { kind: 'updateStaticUI', args: [] });
    }
}
