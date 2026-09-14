const gemCoreForge = (() => {
    /** Read-only effects from a gem record; absent enhancements grant no bonus. */
    function effects(record) {
        const core = Math.min(GEM_CORE_FORGE.maxLevel, Math.max(0, Number(record?.bossCoreLevel) || 0));
        const sky = Math.min(GEM_CORE_FORGE.maxLevel, Math.max(0, Number(record?.skyCoreLevel) || 0));
        return { damage: 1 + core * GEM_CORE_FORGE.tracks.bossCore.stepPct / 100,
            speed: 1 + sky * GEM_CORE_FORGE.tracks.skyEssence.stepPct / 100,
            levels: Number(core === GEM_CORE_FORGE.maxLevel) + Number(sky === GEM_CORE_FORGE.maxLevel) };
    }

    function forSkill(name) { return effects(game.gemData[name]); }

    function unavailable(name, done, owned, cost) {
        if (game.season < 2 || !contentProgression.isUnlocked('gemForge')) return '젬 강화를 먼저 해금하세요.';
        if (!getEquippedEnhanceableGemNames().includes(name) || !game.gemData[name]) return '강화할 공격 젬을 먼저 장착하세요.';
        if (done) return '최대 강화';
        return owned < cost ? '재료 부족' : '';
    }

    /** Read-only availability, cost and probability for an equipped attack gem. */
    function inspect(name, materialKey) {
        if (!Object.hasOwn(GEM_CORE_FORGE.tracks, materialKey)) return { error: '사용할 강화 재료를 선택하세요.' };
        const track = GEM_CORE_FORGE.tracks[materialKey];
        const gem = normalizeGemRecord(game.gemData[name]);
        const level = gem[track.levelKey], failures = gem[track.pityKey];
        const done = level >= GEM_CORE_FORGE.maxLevel;
        const chance = done ? 100 : Math.min(100, GEM_CORE_FORGE.successPct[level] + GEM_CORE_FORGE.pityBonusPct[failures]);
        const pityBonus = done ? 0 : chance - GEM_CORE_FORGE.successPct[level];
        const nextPityGain = done ? 0 : Math.min(100 - chance, GEM_CORE_FORGE.pityBonusPct[Math.min(failures + 1, GEM_CORE_FORGE.pityBonusPct.length - 1)] - GEM_CORE_FORGE.pityBonusPct[failures]);
        const owned = Math.max(0, Number(game.currencies[materialKey]) || 0);
        const cost = done ? 0 : level + 1;
        const error = unavailable(name, done, owned, cost);
        return { track, name, materialKey, level, failures, chance, pityBonus, nextPityGain, owned, cost, done, error };
    }

    /** Atomic attempt. A failed roll spends material and raises pity, never lowers the level. */
    function attempt(name, materialKey) {
        const before = inspect(name, materialKey);
        if (before.error) return { ...before, status: 'blocked' };
        const gem = normalizeGemRecord(game.gemData[name]);
        const success = before.chance === 100 || Math.random() * 100 < before.chance;
        game.currencies[materialKey] -= before.cost;
        gem[before.track.levelKey] = before.level + Number(success);
        gem[before.track.pityKey] = success ? 0 : before.failures + 1;
        game.gemData[name] = gem;
        if (success) grantExpertExpByAction('gemEngraver', materialKey === 'bossCore' ? 'boss_core_upgrade' : 'sky_core_upgrade');
        return { ...before, status: success ? 'success' : 'failure', next: inspect(name, materialKey) };
    }

    return Object.freeze({ effects, forSkill, inspect, attempt });
})();
