// 게스트 저장을 계정으로 옮기기 전의 간단한 조작 검사(2026-10-03 사용자 요청). 세이브를 직접 고치거나 콘솔로 값을 바꾼
// 흔적 가운데 정상 플레이로는 나올 수 없는 값만 잡는다. 정상 세이브가 걸리면 안 되므로 상한은 넉넉하다(GUEST_SAVE_CHECK).
// 브라우저 안의 검사라 작정하고 우회하는 것까지 막지는 못한다. 전당처럼 남과 나누는 기능은 서버가 따로 검사한다.
const guestSaveCheck = (() => {
    const LABELS = Object.freeze({
        level: '레벨', passive: '스킬트리 포인트', currency: '화폐', gem: '젬', item: '장비 수치', duplicate: '장비 중복', clock: '기기 시간'
    });

    function levelProblem(save) {
        const level = Number(save.level);
        return !(Number.isInteger(level) && level >= 1 && level <= MAX_PLAYER_LEVEL);
    }

    function journalPoints(entry) {
        return entry && entry.bonus && entry.bonus.stat === 'passivePoint' ? Math.max(0, Math.floor(entry.bonus.value || 0)) : 0;
    }

    /** What an act reward choice can add: a points choice, or the points a gem choice turns into when the gem is owned. */
    function actRewardPoints(choice) {
        if (choice.kind === 'points') return Math.max(0, Number(choice.value) || 0);
        return choice.kind === 'skill' || choice.fallbackKind === 'points' ? Math.max(1, Math.floor(Number(choice.fallbackValue) || 1)) : 0;
    }

    /** Passive points come from level-ups (one each), journal bonuses, act rewards and 창백한 푸른 점 voids; a loop starts over. */
    function passiveAllowance(save) {
        const journal = Object.values(JOURNAL_DB).reduce((sum, entry) => sum + journalPoints(entry), 0);
        const acts = Object.values(ACT_REWARD_DB).reduce((sum, row) => sum + Math.max(0, ...(row.choices || []).map(actRewardPoints)), 0);
        const pale = passiveRouting.transcendentNodeIds(save, 'paleBlueDot').length * GUEST_SAVE_CHECK.passivePerPaleVoid;
        return Math.max(0, Number(save.level) - 1) + journal + acts + pale + GUEST_SAVE_CHECK.passiveSlack;
    }

    function passiveProblem(save) {
        const spent = Array.isArray(save.passives) ? save.passives.length : 0;
        return spent + Math.max(0, Number(save.passivePoints) || 0) > passiveAllowance(save);
    }

    function withinCap(value, max) {
        return Number.isFinite(value) && value >= 0 && value <= max;
    }

    function currencyProblem(save) {
        return Object.values(save.currencies || {})
            .some(value => value !== null && value !== undefined && !withinCap(Number(value), GUEST_SAVE_CHECK.currencyMax));
    }

    function gemRecordProblem(record) {
        return !!record && (Number(record.level) > GUEST_SAVE_CHECK.gemLevelMax || Number(record.quality) > GUEST_SAVE_CHECK.gemQualityMax);
    }

    function gemProblem(save) {
        return [save.gemData, save.supportGemData].some(records => Object.values(records || {}).some(gemRecordProblem));
    }

    /** Far above its own roll range. Exceptional base lines roll about 1.2 times their stored maximum, well inside the margin. */
    function aboveRollRange(stat, value) {
        const low = Number(stat.valMin ?? stat.baseRollMin), high = Number(stat.valMax ?? stat.baseRollMax);
        if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
        const margin = Math.max(Math.abs(low), Math.abs(high), 1) * (GUEST_SAVE_CHECK.statRangeMul - 1) + 1;
        return value > Math.max(low, high) + margin;
    }

    function statProblem(stat) {
        const value = Number(stat && stat.val);
        if (!Number.isFinite(value)) return false;
        return Math.abs(value) > GUEST_SAVE_CHECK.statValueMax || Number(stat.tier) > GUEST_SAVE_CHECK.statTierMax || aboveRollRange(stat, value);
    }

    function isItemLike(value) {
        return Array.isArray(value.stats) && !!(value.rarity || value.slot || value.baseId);
    }

    function itemLinesProblem(item) {
        const lines = [...item.stats, ...(Array.isArray(item.baseStats) ? item.baseStats : [])];
        return item.stats.length > GUEST_SAVE_CHECK.statLinesMax || lines.some(statProblem);
    }

    /** Every item anywhere in the save: bag, worn, stashes, codex copies, sockets. Walked with a stack, not recursion. */
    function someItem(root, test) {
        const stack = [root], seen = new Set();
        while (stack.length) {
            const value = stack.pop();
            if (!value || typeof value !== 'object' || seen.has(value)) continue;
            seen.add(value);
            if (!Array.isArray(value) && isItemLike(value) && test(value)) return true;
            for (const child of Object.values(value)) stack.push(child);
        }
        return false;
    }

    function itemProblem(save) {
        return someItem(save, itemLinesProblem);
    }

    /** The same item twice among owned places. The unique codex keeps copies with the same id, so it is not counted. */
    function duplicateProblem(save) {
        const owned = [save.inventory, save.equipmentTemporaryStorage, Object.values(save.equipment || {})]
            .flatMap(list => Array.isArray(list) ? list : []);
        const ids = owned.filter(item => item && item.id !== undefined && item.id !== null).map(item => String(item.id));
        return new Set(ids).size !== ids.length;
    }

    /** The latest time the save has seen (saveMeta.maxSeenAt, kept by persistLocalSave) is ahead of now: the clock was moved. */
    function clockProblem(save, now) {
        const meta = save.saveMeta || {};
        return Math.max(Number(meta.maxSeenAt) || 0, Number(meta.lastModifiedAt) || 0) > now + GUEST_SAVE_CHECK.clockSlackMs;
    }

    const RULES = Object.freeze([
        ['level', levelProblem], ['passive', passiveProblem], ['currency', currencyProblem], ['gem', gemProblem],
        ['item', itemProblem], ['duplicate', duplicateProblem], ['clock', clockProblem]
    ]);

    /** A rule that cannot read the save counts as a problem: a broken save does not move into an account either. */
    function failsRule(test, save, now) {
        try {
            return test(save, now);
        } catch (error) {
            console.warn('guest save check could not read the save:', error);
            return true;
        }
    }

    function inspect(save, now = Date.now()) {
        const state = save && typeof save === 'object' ? save : {};
        const keys = RULES.filter(([, test]) => failsRule(test, state, now)).map(([key]) => key);
        return { ok: keys.length === 0, keys, problems: keys.map(key => LABELS[key]) };
    }

    return Object.freeze({ inspect });
})();
safeExposeGlobals({ guestSaveCheck });
