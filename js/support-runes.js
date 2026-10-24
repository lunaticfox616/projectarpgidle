// Shared support rules: pure skill-local preparation used by combat and the rune board.
(function () {
    'use strict';
    const elementTags = { phys: 'physical', fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' };
    const summonStatMap = Object.freeze({ aspd: 'summonAspd', crit: 'summonCrit', critDmg: 'summonCritDmg', resPen: 'summonResPen',
        meleePctDmg: 'summonPctDmg', projectilePctDmg: 'summonPctDmg', elementalPctDmg: 'summonPctDmg', aoePctDmg: 'summonPctDmg',
        dotPctDmg: 'summonPctDmg', firePctDmg: 'summonPctDmg', coldPctDmg: 'summonPctDmg', lightPctDmg: 'summonPctDmg', chaosPctDmg: 'summonPctDmg',
        slamPctDmg: 'summonPctDmg', spellFlatPct: 'summonPctDmg', minePctDmg: 'summonPctDmg', potionPctDmg: 'summonPctDmg',
        mobilityPctDmg: 'summonPctDmg', channelingPctDmg: 'summonPctDmg', summonPctDmg: 'summonPctDmg', summonHpPct: 'summonHpPct',
        summonAspd: 'summonAspd', summonCrit: 'summonCrit', summonCritDmg: 'summonCritDmg' });
    const supportedCommonStats = Object.freeze(['aspd', 'crit', 'critDmg', 'resPen']);

    function tagsOf(skill) {
        const tags = new Set(skill.tags || []);
        if (!skill.supportEffects && elementTags[skill.ele]) tags.add(elementTags[skill.ele]);
        if (['fire', 'cold', 'lightning'].some(tag => tags.has(tag))) tags.add('elemental');
        if (!tags.has('aoe') && (skill.targetMode === 'single' || skill.targets === 1)) tags.add('single');
        if (tags.has('summon_attack') || tags.has('summon_guard')) tags.add('summon');
        return tags;
    }

    function conversionBlocked(def, skill) {
        return def.kind === 'conversion' && (skill.supportElementOverride || def.element === (skill.supportBaseElement || skill.ele));
    }
    function behaviorMatches(def, skill, tags) {
        if (conversionBlocked(def, skill)) return false;
        if (def.kind === 'reinforcement' && !tags.has('summon_attack')) return false;
        if (def.transform === 'embers' && tags.has('dot') && !tags.has('attack')) return false;
        return true;
    }
    /** 보조룬을 고를 때의 태그: 룬의 태그에 보조 판정에만 붙는 태그(supportTags)를 더한다. 던지는 위습(화염, 냉기, 물리, 카오스)은 보조룬에게만
     * 투사체다: 룬 태그에 넣으면 영웅의 투사체 피해와 투사체 룬 레벨이 위습에 붙었다(2026-10-24 검수). */
    function matchTags(skill) {
        const tags = tagsOf(skill);
        (skill.supportTags || []).forEach(tag => tags.add(tag));
        return tags;
    }
    function tagMatches(def, skill) {
        const tags = matchTags(skill);
        if (tags.has('summon_buff') || !behaviorMatches(def, skill, tags)) return false;
        return !def.requireTags.length || def.requireTags.some(tag => tags.has(tag));
    }

    function unavailableForSummon(def, skill) {
        const tags = tagsOf(skill);
        if (tags.has('summon_guard')) return def.stat !== 'summonHpPct';
        if (def.kind === 'common') return !supportedCommonStats.includes(def.stat);
        return def.kind === 'tag' && !summonStatMap[def.stat];
    }

    function matches(name, skill, role = 'main') {
        const def = SUPPORT_GEM_DB[name];
        if (!def || !skill || !tagMatches(def, skill)) return false;
        if (role === 'summon' && unavailableForSummon(def, skill)) return false;
        return def.kind !== 'summonOnly' || role === 'summon';
    }

    function tierOf(name, state = game) {
        const def = SUPPORT_GEM_DB[name];
        if (!def || def.noTiers) return 1;
        const record = (state.supportGemData || {})[name] || {};
        const unlocked = Math.max(1, Math.min(3, Math.floor(Number(record.unlockedTier) || 1)));
        return Math.max(1, Math.min(unlocked, Math.floor(Number(record.activeTier) || unlocked)));
    }

    function value(name, tier, state = game) {
        const def = SUPPORT_GEM_DB[name];
        if (!def) return 0;
        const selected = Math.max(1, Math.min(def.noTiers ? 1 : 3, Math.floor(Number(tier) || tierOf(name, state))));
        if (def.tierValues) return def.tierValues[selected - 1];
        const level = Math.max(1, Number((state.supportGemData || {})[name]?.level) || 1);
        return (def.baseVal + getGemLevelGrowthSteps(level) * def.scale) * getSupportTierMultiplier(name, selected);
    }

    const behavior = {
        repeat: (out, val) => { out.repeat = { count: 1, damagePct: val }; out.speedMultiplier *= 0.9; },
        projectiles: (out, val) => { out.projectiles = { extra: val, damagePct: 80 }; out.damageMultiplier *= 0.8; },
        chain: (out, val) => { out.chain = { count: val, stepDamagePct: -25 }; },
        sweep: (out, val) => { out.sweep = { extra: val, damagePct: 70 }; },
        pierce: (out, val) => { out.pierce = val; out.damageMultiplier *= 0.85; },
        expansion: (out, val) => { out.expansion = val; out.damageMultiplier *= 0.85; },
        push: (out, val) => { out.push = val; out.damageMultiplier *= 0.9; },
        ignite: (out, val) => { out.ignite = { chancePct: val, durationMs: 1000 }; },
        corpse: (out, val) => { out.corpse = { chancePct: val, lifePct: 10 }; },
        execute: (out, val) => { out.execute = { thresholdPct: 30, damageMorePct: val, otherwiseMultiplier: 0.9 }; },
        reinforcement: (out, val) => { out.summon = { extra: val, hpMultiplier: 0.7 }; }
    };
    const transformations = {
        throw: (out, val) => { out.throwRange = val; out.damageMultiplier *= 0.8; },
        mine: (out, val) => { out.mineDelayMs = 600; out.damageMultiplier *= 1 + val / 100; },
        slam: (out, val) => { out.slam = true; out.damageMultiplier *= 1 + val / 100; out.speedMultiplier *= 0.8; },
        embers: (out, val) => { out.dot = { damagePct: val, durationMs: 3000 }; out.damageMultiplier *= 0.85; },
        channel: (out, val) => { out.channeling = true; out.damageMultiplier *= 1 + val / 100; },
        spread: (out, val) => { out.spreadRadius = 1; out.damageMultiplier *= 1 + val / 100; },
        focus: (out, val) => { out.focus = true; out.damageMultiplier *= 1 + val / 100; }
    };

    function applyTagChange(result, name, original, state) {
        const def = SUPPORT_GEM_DB[name], val = value(name, undefined, state), out = result.supportEffects;
        const tags = new Set(result.tags);
        if (def.kind === 'transform' || val === 100) (def.stripTags || []).forEach(tag => tags.delete(tag));
        (def.grantTags || []).forEach(tag => tags.add(tag));
        if (def.kind === 'conversion') out.conversion = { element: def.element, pct: val, sourceElement: original.ele || 'phys' };
        else transformations[def.transform](out, val);
        result.tags = Array.from(tags);
        out.applied.push(name);
    }

    function keystoneOn(id, state) {
        return (state.cosmosTwinKeystones || []).includes(id) || ((state.ascendKeystones || []).includes(id)
            && (CLASS_KEYSTONE_DEFS[state.ascendClass] || []).some(row => row.id === id));
    }
    /** Whole-skill ascendancy conversions take priority over support conversions, including in the target indicators. */
    function skillBeforeSupports(skill, state) {
        if ((skill.tags || []).includes('summon')) return skill;
        const random = keystoneOn('e4', state), chaos = keystoneOn('wlk1', state);
        if (!random && !chaos) return skill;
        const tags = (skill.tags || []).filter(tag => !['physical','elemental','fire','cold','lightning','chaos'].includes(tag));
        return { ...skill, ele: random ? 'fire' : 'chaos',
            tags: tags.concat(random ? ['elemental','fire','cold','lightning'] : ['chaos']),
            randomElementPool: random ? ['fire','cold','light'] : null, convertedToChaos: !random,
            supportElementOverride: random ? '융해 결합' : '심연 각인' };
    }

    /** Re-preparing a prepared skill recomputes from its original tags without multiplying skill damage a second time.
     * Only tags and supportEffects are changed; combat owns damage/speed/geometry and their visual presentation. */
    function prepareSupportSkill(skill, state = game) {
        if (!skill) return null;
        const base = { ...skill, ele: skill.supportBaseElement || skill.ele, tags: skill.supportBaseTags || Array.from(tagsOf(skill)) };
        delete base.supportEffects;
        const original = skillBeforeSupports(base, state);
        const result = { ...original, tags: original.tags.slice(), supportBaseTags: base.tags.slice(), supportBaseElement: base.ele,
            supportEffects: { applied: [], damageMultiplier: 1, speedMultiplier: 1 } };
        const role = tagsOf(original).has('summon') ? 'summon' : 'main';
        const names = Array.from(new Set(state.equippedSupports || [])).filter(name => SUPPORT_GEM_DB[name]);
        const changed = new Set();
        names.forEach(name => {
            const def = SUPPORT_GEM_DB[name];
            if (!['conversion', 'transform'].includes(def.kind) || changed.has(def.kind) || !matches(name, original, role)) return;
            applyTagChange(result, name, original, state);
            changed.add(def.kind);
        });
        names.forEach(name => {
            const def = SUPPORT_GEM_DB[name];
            if (['conversion', 'transform'].includes(def.kind) || !matches(name, result, role)) return;
            result.supportEffects.applied.push(name);
            if (behavior[def.kind]) behavior[def.kind](result.supportEffects, value(name, undefined, state));
        });
        return result;
    }

    function selectedSkills(state) {
        const entry = (name, role) => ({ name: name || '', role, skill: SKILL_DB[name] ? skillBeforeSupports(SKILL_DB[name], state) : null });
        return { main: entry(state.activeSkill, 'main'), mobility: entry(state.mobilitySkill, 'mobility'),
            summons: Array.from(new Set(state.equippedSummonSkills || [])).map(name => entry(name, 'summon')) };
    }

    function supportTargetRow(name, entry, state) {
        if (!entry.skill) return { name: entry.name, status: 'empty', reason: '장착한 스킬 없음' };
        if (tagsOf(entry.skill).has('summon_buff')) return { name: entry.name, status: 'buff', reason: '사역룬은 보조를 받지 않음' };
        return activeTargetRow(name, entry, state);
    }
    function activeTargetRow(name, entry, state) {
        const def = SUPPORT_GEM_DB[name];
        const skill = isTagChanger(name) ? entry.skill : prepareSupportSkill(entry.skill, state);
        if (overriddenConversion(def, skill)) return { name: entry.name, status: 'off', reason: `${skill.supportElementOverride} 속성 변환 우선` };
        if (!def || !tagMatches(def, skill)) return { name: entry.name, status: 'off', reason: '요구 태그가 맞지 않음' };
        if (entry.role === 'summon' && unavailableForSummon(def, skill)) return { name: entry.name, status: 'na', reason: '소환수에는 대응 효과 없음' };
        const on = matches(name, skill, entry.role);
        return { name: entry.name, status: on ? 'on' : 'off', reason: on ? '적용 중' : '소환수 전용 효과' };
    }
    function overriddenConversion(def, skill) { return def?.kind === 'conversion' && skill.supportElementOverride; }

    function isTagChanger(name) {
        return ['conversion', 'transform'].includes(SUPPORT_GEM_DB[name]?.kind);
    }

    function supportTargets(name, state = game) {
        const selected = selectedSkills(state);
        return { main: supportTargetRow(name, selected.main, state), mobility: supportTargetRow(name, selected.mobility, state),
            summons: selected.summons.map(entry => supportTargetRow(name, entry, state)) };
    }

    /** Conflicts only when two conversions/transforms apply to the same ORIGINAL skill; changing tags cannot bypass this. */
    function conflictReason(candidate, state = game, replacedName = '') {
        const def = SUPPORT_GEM_DB[candidate];
        if (!def || !['conversion', 'transform'].includes(def.kind)) return '';
        const existing = (state.equippedSupports || []).filter(name => name !== candidate && name !== replacedName && SUPPORT_GEM_DB[name]?.kind === def.kind);
        const selected = selectedSkills(state), entries = [selected.main, selected.mobility, ...selected.summons];
        const collision = entries.find(entry => matches(candidate, entry.skill, entry.role)
            && existing.some(name => matches(name, entry.skill, entry.role)));
        if (!collision) return '';
        return `${collision.name}: ${def.kind === 'conversion' ? '속성 변환' : '태그 변경'} 보조는 스킬당 하나만 장착할 수 있습니다.`;
    }

    const describeBehavior = {
        conversion: (def, val) => `피해 ${val}% ${def.name}`,
        repeat: (def, val) => `한 번 더 발동, 두 번째 피해 ${val}%`,
        projectiles: (def, val) => `부채꼴 투사체 +${val}발`, chain: (def, val) => `추가 연쇄 ${val}회`,
        sweep: (def, val) => `주변 ${val}기 추가 타격, 추가 피해 70%`,
        transform: (def, val) => `${def.name} ${val > 0 ? '+' : ''}${val}${def.isPct ? '%' : '칸'}`
    };
    function describe(name, tier, state = game) {
        const def = SUPPORT_GEM_DB[name];
        if (!def) return '';
        const val = value(name, tier, state);
        if (describeBehavior[def.kind]) return describeBehavior[def.kind](def, val);
        if (def.tierValues) return def.desc;
        return `${def.name} +${formatSupportGemEffectValue(val)}${def.isPct ? '%' : ''}`;
    }

    function normalize(state, cap) {
        const equippedSupports = [], removed = [];
        (state.equippedSupports || []).forEach(name => {
            const candidateState = { ...state, equippedSupports };
            if (!SUPPORT_GEM_DB[name] || equippedSupports.includes(name) || equippedSupports.length >= cap
                || conflictReason(name, candidateState)) removed.push(name);
            else equippedSupports.push(name);
        });
        return { equippedSupports, removed };
    }

    window.GameModules.skills.supports = Object.freeze({ prepare: prepareSupportSkill, matches, targets: supportTargets, conflictReason, tierOf, value, describe, normalize,
        summonStatMap, supportedCommonStats });
})();
