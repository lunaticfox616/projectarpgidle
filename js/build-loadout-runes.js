// Build presets store choices only. Gem progression and ownership always stay in the current save.
(function () {
    'use strict';
    /** @typedef {{version:1,activeSkill:string,mobilitySkill:string,equippedSummonSkills:string[],summonSkillCounts:Object<string,number>,equippedSupports:string[],supportTiers:Object<string,number>}} BuildRuneLoadout */
    const failure = reason => ({ ok: false, reason });
    const names = value => Array.isArray(value) && value.length <= 64 && value.every(name => typeof name === 'string' && name.length > 0 && name.length <= 80);
    const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
    // Storage ceiling protects the stat preview from corrupt counts before the real build cap is known.
    const positiveInteger = value => Number.isInteger(value) && value > 0 && value <= 64;

    function loadoutShapeReason(raw) {
        if (!record(raw) || raw.version !== 1) return '저장된 룬 구성 형식을 읽을 수 없습니다. 다시 저장해 주세요.';
        if (typeof raw.activeSkill !== 'string' || !raw.activeSkill || typeof raw.mobilitySkill !== 'string') return '주 공격 또는 이동 룬 정보가 올바르지 않습니다.';
        if (!names(raw.equippedSummonSkills) || !names(raw.equippedSupports)) return '저장된 소환 또는 보조 룬 목록이 올바르지 않습니다.';
        if (!record(raw.summonSkillCounts) || !record(raw.supportTiers)) return '저장된 소환 수 또는 보조 등급 정보가 없습니다.';
        return loadoutMapReason(raw);
    }

    function loadoutMapReason(raw) {
        const pairs = [[raw.equippedSummonSkills, raw.summonSkillCounts], [raw.equippedSupports, raw.supportTiers]];
        for (const [list, values] of pairs) {
            if (Object.keys(values).length !== list.length || list.some(name => !Object.hasOwn(values, name) || !positiveInteger(values[name]))) {
                return '저장된 룬 목록과 소환 수 또는 보조 등급이 일치하지 않습니다.';
            }
        }
        return '';
    }

    /** null means an older equipment-only preset. Invalid snapshots remain invalid across save/load. */
    function normalizeRuneLoadout(raw) {
        if (raw === null || raw === undefined) return null;
        const invalidReason = typeof raw.invalidReason === 'string' && raw.invalidReason ? raw.invalidReason : loadoutShapeReason(raw);
        if (invalidReason) return { version: 1, invalidReason: invalidReason.slice(0, 180) };
        return { version: 1, activeSkill: raw.activeSkill, mobilitySkill: raw.mobilitySkill,
            equippedSummonSkills: raw.equippedSummonSkills.slice(), summonSkillCounts: { ...raw.summonSkillCounts },
            equippedSupports: raw.equippedSupports.slice(), supportTiers: { ...raw.supportTiers } };
    }

    function savedSupportTier(name, state) {
        const gem = normalizeGemRecord(state.supportGemData?.[name]);
        return Math.min(getSupportTierCap(name), gem.activeTier);
    }

    function captureRuneLoadout(state = game) {
        const summons = (state.equippedSummonSkills || []).slice(), supports = (state.equippedSupports || []).slice();
        return { version: 1, activeSkill: state.activeSkill, mobilitySkill: state.mobilitySkill || '',
            equippedSummonSkills: summons,
            summonSkillCounts: Object.fromEntries(summons.map(name => [name, state.summonSkillCounts?.[name] ?? 1])),
            equippedSupports: supports, supportTiers: Object.fromEntries(supports.map(name => [name, savedSupportTier(name, state)])) };
    }

    /** Caller validates first; this copies choices and selected tiers, without replacing gem progression.
     * The saved main rune also replaces a main rune the old weapon rested (weaponBlockedSkill). */
    function applyRuneLoadout(config, state = game) {
        if (!config) return;
        state.activeSkill = config.activeSkill;
        state.weaponBlockedSkill = '';
        state.mobilitySkill = config.mobilitySkill;
        state.equippedSummonSkills = config.equippedSummonSkills.slice();
        state.summonSkillCounts = { ...config.summonSkillCounts };
        state.equippedSupports = config.equippedSupports.slice();
        state.supportGemData = { ...state.supportGemData };
        for (const name of config.equippedSupports) {
            state.supportGemData[name] = { ...state.supportGemData[name], activeTier: config.supportTiers[name] };
        }
        state.summonLoadoutInitialized = true;
    }

    function sameRuneLoadout(config, state = game) {
        if (!config) return true;
        if (config.invalidReason || loadoutShapeReason(config)) return false;
        const current = captureRuneLoadout(state);
        return config.activeSkill === current.activeSkill && config.mobilitySkill === current.mobilitySkill
            && sameRuneRows(config.equippedSummonSkills, current.equippedSummonSkills, config.summonSkillCounts, current.summonSkillCounts)
            && sameRuneRows(config.equippedSupports, current.equippedSupports, config.supportTiers, current.supportTiers);
    }

    function sameRuneRows(wanted, current, values, currentValues) {
        return wanted.length === current.length && wanted.every((name, index) => name === current[index] && values[name] === currentValues[name]);
    }

    function skillOwnershipReason(name, state) {
        if (!Object.hasOwn(SKILL_DB, name)) return `존재하지 않는 스킬룬: ${name}`;
        if (name === '기본 공격') return '';
        if ((state.sealedSkills || []).includes(name)) return `봉인된 스킬룬입니다: ${name}`;
        return (state.skills || []).includes(name) ? '' : `보유하지 않은 스킬룬입니다: ${name}`;
    }

    function attackSlotReason(config, state) {
        const ownership = skillOwnershipReason(config.activeSkill, state);
        if (ownership) return ownership;
        const tags = SKILL_DB[config.activeSkill].tags || [];
        if (tags.includes('summon')) return '소환 룬은 주 공격 칸에 저장할 수 없습니다.';
        if (tags.includes('mobility') && !isMobilityRuneAttackWorn(state)) return `주 공격 칸의 이동 룬은 ${MOBILITY_RUNE_ATTACK_UNIQUE} 착용이 필요합니다.`;
        if (config.mobilitySkill === config.activeSkill) return '같은 이동 룬을 주 공격과 이동 칸에 동시에 저장할 수 없습니다.';
        return '';
    }

    function mobilitySlotReason(config, state) {
        if (!config.mobilitySkill) return '';
        const ownership = skillOwnershipReason(config.mobilitySkill, state);
        if (ownership) return ownership;
        return (SKILL_DB[config.mobilitySkill].tags || []).includes('mobility') ? '' : '이동 칸에는 이동 스킬룬만 저장할 수 있습니다.';
    }

    function summonSlotReason(config, state) {
        if (new Set(config.equippedSummonSkills).size !== config.equippedSummonSkills.length) return '저장된 소환 룬 이름이 중복되었습니다.';
        for (const name of config.equippedSummonSkills) {
            const ownership = skillOwnershipReason(name, state);
            if (ownership) return ownership;
            const tags = SKILL_DB[name].tags || [];
            if (!tags.includes('summon')) return `소환 칸에 넣을 수 없는 룬입니다: ${name}`;
            if (!tags.includes('summon_attack') && config.summonSkillCounts[name] !== 1) return `${name}: 한 개만 장착할 수 있습니다.`;
        }
        return '';
    }

    function supportOwnershipReason(name, config, state) {
        if (!Object.hasOwn(SUPPORT_GEM_DB, name)) return `존재하지 않는 보조룬: ${name}`;
        if ((state.sealedSupports || []).includes(name)) return `봉인된 보조룬입니다: ${name}`;
        if (!(state.supports || []).includes(name)) return `보유하지 않은 보조룬입니다: ${name}`;
        const tier = config.supportTiers[name], unlocked = normalizeGemRecord(state.supportGemData?.[name]).unlockedTier;
        return tier <= Math.min(unlocked, getSupportTierCap(name)) ? '' : `${name}: 저장된 ${tier}등급이 해금되어 있지 않습니다.`;
    }

    function supportSlotReason(config, state) {
        if (new Set(config.equippedSupports).size !== config.equippedSupports.length) return '저장된 보조룬 이름이 중복되었습니다.';
        const candidate = { ...state, ...config };
        for (const name of config.equippedSupports) {
            const reason = supportOwnershipReason(name, config, state) || window.GameModules.skills.supports.conflictReason(name, candidate);
            if (reason) return reason;
        }
        return '';
    }

    function loadoutLimitInspection(config, state, stats) {
        const supportCount = config.equippedSupports.length, supportCap = Math.max(0, Math.floor(stats.suppCap || 0));
        const resonance = config.equippedSupports.reduce((sum, name) => sum + getSupportResonanceCostAtTier(name, config.supportTiers[name]), 0);
        const resonanceCap = gemDropRewards.resonanceCap(state, stats);
        const summonCount = Object.values(config.summonSkillCounts).reduce((sum, count) => sum + count, 0);
        const summonCap = stats.passiveKeystoneFlags?.soleMinion ? 1 : Math.max(1, Math.floor(stats.summonCap || 1));
        const totals = { supportCount, supportCap, resonance, resonanceCap, summonCount, summonCap };
        if (supportCount > supportCap) return { ...failure(`보조룬 칸이 부족합니다. (${supportCount}/${supportCap})`), ...totals };
        if (resonance > resonanceCap) return { ...failure(`공명력이 부족합니다. (${resonance}/${resonanceCap})`), ...totals };
        if (summonCount > summonCap) return { ...failure(`소환 한도를 넘었습니다. (${summonCount}/${summonCap})`), ...totals };
        return { ok: true, reason: '', ...totals };
    }

    function inspectRuneLoadout(config, state = game, stats) {
        if (!config) return { ok: true, reason: '' };
        const shape = config.invalidReason || loadoutShapeReason(config);
        if (shape) return failure(shape);
        const reason = attackSlotReason(config, state) || mobilitySlotReason(config, state)
            || summonSlotReason(config, state) || supportSlotReason(config, state);
        if (reason) return failure(reason);
        return stats ? loadoutLimitInspection(config, state, stats) : { ok: true, reason: '' };
    }

    window.GameModules.skills.loadouts = Object.freeze({ normalize: normalizeRuneLoadout, capture: captureRuneLoadout,
        apply: applyRuneLoadout, equals: sameRuneLoadout, inspect: inspectRuneLoadout });
})();
