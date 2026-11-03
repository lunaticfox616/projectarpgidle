const gemCoreForge = (() => {
    const FORGE = GEM_CORE_FORGE;
    const round = value => Math.round(value * 100) / 100;
    const held = key => Math.max(0, Math.floor(Number(game.currencies[key]) || 0));
    const levelOf = record => Math.min(FORGE.maxLevel, Math.max(0, Math.floor(Number(record?.enhanceLevel) || 0)));

    /** Read-only effects from a gem record; absent enhancements grant no bonus. damage and speed are the amplification multipliers,
     * damageInc and speedInc the increased % added to the other increases. */
    function effects(record) {
        const level = levelOf(record);
        // [단계, 그 단계까지의 합] 표에서 닿은 마지막 합(data/gem-core-forge.js)
        const reached = table => table.reduce((total, [at, value]) => (level >= at ? value : total), 0);
        return { damage: 1 + reached(FORGE.damageMoreAt) / 100, speed: 1 + reached(FORGE.speedMoreAt) / 100,
            damageInc: FORGE.damageIncPct[level], speedInc: reached(FORGE.speedIncAt),
            levels: FORGE.runeLevelAt.filter(at => level >= at).length };
    }

    function forSkill(name) { return effects(game.gemData[name]); }

    /** 빛과 연출의 단계: 0은 아직 없음, GEM_CORE_FORGE.tiers의 몇 번째까지 왔는가. */
    function tierOf(level) { return FORGE.tiers.filter(at => level >= at).length; }

    /** 그 단계의 효과를 적은 글. */
    function effectText(level) {
        if (level <= 0) return '강화 효과 없음';
        const { damage, speed, damageInc, speedInc, levels } = effects({ enhanceLevel: level });
        const percent = mul => Math.round((mul - 1) * 100);
        return [`피해 ${damageInc}% 증가`, speedInc ? `공격/시전 속도 ${speedInc}% 증가` : '', damage > 1 ? `피해 ${percent(damage)}% 증폭` : '',
            speed > 1 ? `공격/시전 속도 ${percent(speed)}% 증폭` : '', levels ? `룬 레벨 +${levels}` : ''].filter(Boolean).join(', ');
    }

    /** 실패 보정 %p: 그 단계 기본 확률에 비례한다(data/gem-core-forge.js pityStepOfBase, pityMaxOfBase). */
    function pityOf(level, failures) {
        return Math.min(failures * FORGE.pityStepOfBase, FORGE.pityMaxOfBase) * FORGE.successPct[level];
    }

    function unavailable(name, done, owned, cost) {
        if (game.season < 2 || !contentProgression.isUnlocked('gemForge')) return '룬 강화를 먼저 해금하세요.';
        if (game.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 룬을 강화할 수 없습니다.';
        if (!getEquippedEnhanceableGemNames().includes(name) || !game.gemData[name]) return '강화할 공격 룬을 먼저 장착하세요.';
        if (done) return '최대 강화';
        return owned < cost ? '재료 부족' : '';
    }

    /** 이번 시도의 확률. coresUsed: 쓰는 군주의 핵, timed: 담금질을 맞혔는가. */
    function oddsOf(level, failures, coresUsed, timed) {
        const pityBonus = round(pityOf(level, failures)), coreBonus = coresUsed * FORGE.boosterPct;
        const before = Math.min(100, FORGE.successPct[level] + pityBonus + coreBonus);
        const chance = round(Math.min(100, before * (timed ? FORGE.timing.mul : 1)));
        return { pityBonus, coreBonus, timingBonus: round(chance - before), chance, destroy: round(Math.min(FORGE.destroyPct[level], 100 - chance)),
            nextPityGain: round(Math.min(100 - chance, pityOf(level, failures + 1) - pityOf(level, failures))) };
    }
    const FINISHED_ODDS = Object.freeze({ pityBonus: 0, coreBonus: 0, timingBonus: 0, chance: 100, destroy: 0, nextPityGain: 0 });

    /** Read-only availability, cost and probability for an equipped attack gem. */
    function inspect(name, { cores = 0, timed = false } = {}) {
        const gem = normalizeGemRecord(game.gemData[name]);
        const level = gem.enhanceLevel, failures = gem.enhanceFailures, done = level >= FORGE.maxLevel;
        const owned = held(FORGE.materialKey), coresOwned = held(FORGE.boosterKey);
        const cost = done ? 0 : FORGE.costs[level];
        const coresUsed = done ? 0 : Math.max(0, Math.min(FORGE.boosterMax, coresOwned, Math.floor(cores)));
        const odds = done ? FINISHED_ODDS : oddsOf(level, failures, coresUsed, timed);
        return { name, level, failures, owned, cost, coresOwned, coresUsed, done, spares: gemDropRewards.spareCount(game, name),
            ...odds, error: unavailable(name, done, owned, cost) };
    }

    /** 끼고 있던 자리에서 파괴된 룬을 뺀다: 공격 칸은 기본 공격이 된다. */
    function takeOffRune(name) {
        game.skills = game.skills.filter(gem => gem !== name);
        if (game.activeSkill === name) game.activeSkill = '기본 공격';
        if (game.weaponBlockedSkill === name) game.weaponBlockedSkill = '';
        if (game.mobilitySkill === name) { game.mobilitySkill = ''; mobilitySkill.reset(); }
        game.equippedSummonSkills = (game.equippedSummonSkills || []).filter(gem => gem !== name);
        if (game.summonSkillCounts) delete game.summonSkillCounts[name];
    }

    /** 룬이 파괴되었다: 강화는 처음으로, 여분이 있으면 하나 꺼내고 없으면 룬을 잃는다. 레벨, 퀄리티, 각인은 이름에 남아 다시 얻으면 이어진다. */
    function shatter(name) {
        game.gemData[name] = { ...normalizeGemRecord(game.gemData[name]), enhanceLevel: 0, enhanceFailures: 0 };
        if (gemDropRewards.takeSpare(game, name)) return false;
        takeOffRune(name);
        return true;
    }

    /** Atomic attempt: pays, rolls and writes the outcome. A failure keeps the level and raises pity; from the risk level a roll can destroy the rune. */
    function attempt(name, options) {
        const before = inspect(name, options);
        if (before.error) return { ...before, status: 'blocked' };
        game.currencies[FORGE.materialKey] -= before.cost;
        game.currencies[FORGE.boosterKey] -= before.coresUsed;
        const roll = Math.random() * 100;
        if (roll >= before.chance && roll < before.chance + before.destroy) return { ...before, status: 'destroyed', lost: shatter(name) };
        const success = roll < before.chance;
        game.gemData[name] = { ...normalizeGemRecord(game.gemData[name]), enhanceLevel: before.level + Number(success), enhanceFailures: success ? 0 : before.failures + 1 };
        return { ...before, status: success ? 'success' : 'failure' };
    }

    return Object.freeze({ effects, forSkill, tierOf, effectText, inspect, attempt });
})();
