/** Conservative pre-import checks only. Server validation remains authoritative; unreadable rules reject the import. */
export class GuestSaveCheck {
    constructor(deps) {
        this.LABELS=Object.freeze({level:'레벨',passive:'스킬트리 포인트',currency:'화폐',gem:'룬',item:'장비 수치',duplicate:'장비 중복',clock:'기기 시간'});
        this.deps=deps;

        for(const name of ["levelProblem","journalPoints","actRewardPoints","passiveAllowance","passiveProblem","withinCap","currencyProblem","gemRecordProblem","gemProblem","aboveRollRange","statProblem","isItemLike","itemLines","paramsProblem","itemLinesProblem","someItem","itemProblem","duplicateProblem","clockProblem","failsRule","inspect"]) this[name]=this[name].bind(this);
    }
    rules() { return [['level',this.levelProblem],['passive',this.passiveProblem],['currency',this.currencyProblem],['gem',this.gemProblem],['item',this.itemProblem],['duplicate',this.duplicateProblem],['clock',this.clockProblem]]; }

    levelProblem(save) {
        const level = Number(save.level);
        return !(Number.isInteger(level) && level >= 1 && level <= this.deps.MAX_PLAYER_LEVEL);
    }

    journalPoints(entry) {
        return entry && entry.bonus && entry.bonus.stat === 'passivePoint' ? Math.max(0, Math.floor(entry.bonus.value || 0)) : 0;
    }

    /** What an act reward choice can add: a points choice, or the points a gem choice turns into when the gem is owned. */
    actRewardPoints(choice) {
        if (choice.kind === 'points') return Math.max(0, Number(choice.value) || 0);
        return choice.kind === 'skill' || choice.fallbackKind === 'points' ? Math.max(1, Math.floor(Number(choice.fallbackValue) || 1)) : 0;
    }

    /** Passive points come from level-ups (one each), journal bonuses, act rewards and 창백한 푸른 점 voids; a loop starts over. */
    passiveAllowance(save) {
        const journal = Object.values(this.deps.JOURNAL_DB).reduce((sum, entry) => sum + this.journalPoints(entry), 0);
        const acts = Object.values(this.deps.ACT_REWARD_DB).reduce((sum, row) => sum + Math.max(0, ...(row.choices || []).map(this.actRewardPoints)), 0);
        const pale = this.deps.passiveRouting.transcendentNodeIds(save, 'paleBlueDot').length * this.deps.GUEST_SAVE_CHECK.passivePerPaleVoid;
        return Math.max(0, Number(save.level) - 1) + journal + acts + pale + this.deps.GUEST_SAVE_CHECK.passiveSlack;
    }

    passiveProblem(save) {
        const spent = Array.isArray(save.passives) ? save.passives.length : 0;
        return spent + Math.max(0, Number(save.passivePoints) || 0) > this.passiveAllowance(save);
    }

    withinCap(value, max) {
        return Number.isFinite(value) && value >= 0 && value <= max;
    }

    currencyProblem(save) {
        return Object.values(save.currencies || {})
            .some(value => value !== null && value !== undefined && !this.withinCap(Number(value), this.deps.GUEST_SAVE_CHECK.currencyMax));
    }

    gemRecordProblem(record) {
        return !!record && (Number(record.level) > this.deps.GUEST_SAVE_CHECK.gemLevelMax || Number(record.quality) > this.deps.GUEST_SAVE_CHECK.gemQualityMax);
    }

    gemProblem(save) {
        return [save.gemData, save.supportGemData].some(records => Object.values(records || {}).some(this.gemRecordProblem));
    }

    /** Far above its own roll range. Exceptional base lines roll about 1.2 times their stored maximum, well inside the margin. */
    aboveRollRange(stat, value) {
        const low = Number(stat.valMin ?? stat.baseRollMin), high = Number(stat.valMax ?? stat.baseRollMax);
        if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
        const margin = Math.max(Math.abs(low), Math.abs(high), 1) * (this.deps.GUEST_SAVE_CHECK.statRangeMul - 1) + 1;
        return value > Math.max(low, high) + margin;
    }

    statProblem(stat) {
        const value = Number(stat && stat.val);
        if (!Number.isFinite(value)) return false;
        return Math.abs(value) > this.deps.GUEST_SAVE_CHECK.statValueMax || Number(stat.tier) > this.deps.GUEST_SAVE_CHECK.statTierMax || this.aboveRollRange(stat, value);
    }

    isItemLike(value) {
        return Array.isArray(value.stats) && !!(value.rarity || value.slot || value.baseId);
    }

    /** Every line the game adds to the stats (js/equipment-stat-resolution.js): the explicit lines and their second stats, the base lines,
         * ember lines, 하급 부여, 혼돈 주입 and the chosen 잠식 line. The hall check on the server reads the same lines (db/anti-cheat.sql). */
    itemLines(item) {
        const list = value => (Array.isArray(value) ? value : []);
        return [...item.stats, ...item.stats.flatMap(stat => list(stat && stat.extraStats)), ...list(item.baseStats), ...list(item.emberLines),
            item.underEnchant, item.chaosInfusion, item.encroached && item.encroached.chosen].filter(line => line && typeof line === 'object');
    }

    /** 고유 효과 값과 품질: 클라이언트가 상한 없이 곱하는 칸이라 크기를 본다. 서버의 전당 검사(hall_item_params_out_of_range)와 같은 기준. */
    paramsProblem(item) {
        if (Number(item.quality) > this.deps.GUEST_SAVE_CHECK.itemQualityMax) return true;
        const params = item.uniqueEffectParams;
        if (!params || typeof params !== 'object') return false;
        return Object.entries(params).some(([key, value]) => typeof value === 'number' && (Math.abs(value) > this.deps.GUEST_SAVE_CHECK.uniqueParamMax
            || (['mul', 'explicitStatMultiplier', 'level'].includes(key) && value > this.deps.GUEST_SAVE_CHECK.uniqueMultiplierMax)));
    }

    itemLinesProblem(item) {
        return item.stats.length > this.deps.GUEST_SAVE_CHECK.statLinesMax || this.itemLines(item).some(this.statProblem) || this.paramsProblem(item);
    }

    /** Every item anywhere in the save: bag, worn, stashes, codex copies, sockets. Walked with a stack, not recursion. */
    someItem(root, test) {
        const stack = [root], seen = new Set();
        while (stack.length) {
            const value = stack.pop();
            if (!value || typeof value !== 'object' || seen.has(value)) continue;
            seen.add(value);
            if (!Array.isArray(value) && this.isItemLike(value) && test(value)) return true;
            for (const child of Object.values(value)) stack.push(child);
        }
        return false;
    }

    itemProblem(save) {
        return this.someItem(save, this.itemLinesProblem);
    }

    /** The same item twice among owned places. The unique codex keeps copies with the same id, so it is not counted. */
    duplicateProblem(save) {
        const owned = [save.inventory, save.equipmentTemporaryStorage, Object.values(save.equipment || {})]
            .flatMap(list => Array.isArray(list) ? list : []);
        const ids = owned.filter(item => item && item.id !== undefined && item.id !== null).map(item => String(item.id));
        return new Set(ids).size !== ids.length;
    }

    /** The latest time the save has seen (saveMeta.maxSeenAt, kept by persistLocalSave) is ahead of now: the clock was moved. */
    clockProblem(save, now) {
        const meta = save.saveMeta || {};
        return Math.max(Number(meta.maxSeenAt) || 0, Number(meta.lastModifiedAt) || 0) > now + this.deps.GUEST_SAVE_CHECK.clockSlackMs;
    }

    /** A rule that cannot read the save counts as a problem: a broken save does not move into an account either. */
    failsRule(test, save, now) {
        try {
            return test(save, now);
        } catch (error) {
            this.deps.console.warn('guest save check could not read the save:', error);
            return true;
        }
    }

    inspect(save, now = Date.now()) {
        const state = save && typeof save === 'object' ? save : {};
        const keys = this.rules().filter(([, test]) => this.failsRule(test, state, now)).map(([key]) => key);
        return { ok: keys.length === 0, keys, problems: keys.map(key => this.LABELS[key]) };
    }
}
