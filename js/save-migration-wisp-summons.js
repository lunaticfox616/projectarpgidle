/** 예전 저장의 동물 소환 젬 → 위습 정령 소환 젬 (스킬 변경분 2, 2026-09-30 · 표 data/wisp-summons.js LEGACY_SUMMON_GEM_TO_WISP).
 * mergeDefaults가 SKILL_DB에 없는 이름을 걸러내기 전에 부른다. 이름이 들어 있는 저장 필드를 모두 새 이름으로 바꾸고,
 * 같은 위습이 된 두 젬은 하나로 합친다: 젬 기록은 더 자란 쪽(레벨 → 경험치), 각성은 둘 중 하나라도, 소환 수는 합,
 * 하늘탑 젬 강화는 큰 쪽. 탐험 보상 줄은 한 줄로 합친다(같은 젬 두 줄은 저장 검증에서 거부된다).
 * 여러 번 불러와도 같다 — 예전 이름이 없으면 아무것도 바꾸지 않는다. 없는 필드는 만들지 않는다.
 */
function renameLegacySummonGem(name) {
    return LEGACY_SUMMON_GEM_TO_WISP[name] || name;
}

/** Gem record that grew further (level, then experience). */
function pickGrownLegacySummonGem(gemData, names) {
    const growth = name => { const row = gemData[name] || {}; return [Number(row.level) || 0, Number(row.exp) || 0]; };
    return names.reduce((best, name) => {
        const [level, exp] = growth(name), [bestLevel, bestExp] = growth(best);
        return level > bestLevel || (level === bestLevel && exp > bestExp) ? name : best;
    });
}

/** Old names per wisp, only those this save has in `gemData`. */
function legacySummonGemSources(gemData) {
    const sources = {};
    Object.keys(gemData).forEach(name => {
        const wisp = LEGACY_SUMMON_GEM_TO_WISP[name];
        if (wisp) (sources[wisp] = sources[wisp] || []).push(name);
    });
    return sources;
}

/** Engraving slots holding at least one real engraving. Opening a gem's slots stores [null, null, null, null, null],
 * which is an empty record, not an engraving. */
function hasLegacySummonEngraving(slots) {
    return Array.isArray(slots) && slots.some(id => id && GEM_SKY_ENHANCEMENTS[id]);
}

/** gemData + skyGemEnhancements: the grown record per wisp, awakened if any was (a wisp already in the save counts too).
 * Engravings follow the kept record; when it has none, the first merged gem that has some keeps them. */
function mergeLegacySummonGemRecords(state) {
    const gemData = state.gemData && typeof state.gemData === 'object' ? state.gemData : null;
    if (!gemData) return;
    const engravings = state.skyGemEnhancements && typeof state.skyGemEnhancements === 'object' ? state.skyGemEnhancements : {};
    Object.entries(legacySummonGemSources(gemData)).forEach(([wisp, oldNames]) => {
        const names = gemData[wisp] ? [wisp, ...oldNames] : oldNames, keep = pickGrownLegacySummonGem(gemData, names);
        const awakened = names.some(name => gemData[name] && gemData[name].awakened);
        const engraved = [keep, ...names].find(name => hasLegacySummonEngraving(engravings[name]));
        gemData[wisp] = { ...gemData[keep], awakened };
        if (engraved) engravings[wisp] = engravings[engraved];
        oldNames.forEach(name => { delete gemData[name]; delete engravings[name]; });
    });
}

/** { name: number }: renamed keys, two gems that became one folded with `fold` (sum or max). */
function renameLegacySummonGemCounts(counts, fold) {
    const out = {};
    Object.entries(counts).forEach(([name, value]) => {
        const key = renameLegacySummonGem(name);
        out[key] = key in out ? fold(Number(out[key]) || 0, Number(value) || 0) : value;
    });
    return out;
}

/** Exploration loot rows: renamed, one row per gem (awakened if any merged row was). */
function renameLegacySummonGemLoot(rows) {
    const out = [];
    rows.forEach(row => {
        if (!row || row.kind !== 'attack') { out.push(row); return; }
        const name = renameLegacySummonGem(row.name), held = out.find(other => other && other.kind === 'attack' && other.name === name);
        if (held) held.awakened = held.awakened || row.awakened === true;
        else out.push({ ...row, name });
    });
    return out;
}

/** Fields of one gem loadout (the save itself or the woodsman build snapshot). */
function migrateLegacySummonGemLoadout(state) {
    mergeLegacySummonGemRecords(state);
    ['skills', 'sealedSkills', 'equippedSummonSkills'].forEach(key => {
        if (Array.isArray(state[key])) state[key] = [...new Set(state[key].map(renameLegacySummonGem))];
    });
    ['activeSkill', 'gemEnhanceTargetSkill', 'starterGemTutorialPending'].forEach(key => {
        if (typeof state[key] === 'string') state[key] = renameLegacySummonGem(state[key]);
    });
    if (state.summonSkillCounts && typeof state.summonSkillCounts === 'object') {
        state.summonSkillCounts = renameLegacySummonGemCounts(state.summonSkillCounts, (a, b) => a + b);
    }
}

/** Outside the loadout: sky tower gem boosts, black market gem offers, pending exploration loot. */
function migrateLegacySummonGemHoldings(merged) {
    const boosts = merged.skyTower?.gemBoosts;
    if (boosts && typeof boosts === 'object') merged.skyTower.gemBoosts = renameLegacySummonGemCounts(boosts, Math.max);
    (Array.isArray(merged.blackMarket?.offers) ? merged.blackMarket.offers : []).forEach(offer => {
        if (offer && offer.type === 'skillGem') offer.name = renameLegacySummonGem(offer.name);
    });
    const loot = merged.actExploration?.loot;
    if (loot && Array.isArray(loot.gems)) loot.gems = renameLegacySummonGemLoot(loot.gems);
}

function migrateLegacySummonGemSave(merged) {
    migrateLegacySummonGemLoadout(merged);
    if (merged.woodsmanBuildSnapshot && typeof merged.woodsmanBuildSnapshot === 'object') migrateLegacySummonGemLoadout(merged.woodsmanBuildSnapshot);
    migrateLegacySummonGemHoldings(merged);
    if (merged.settings) delete merged.settings.summonArtStyle; // the animal sheets' look (glow · dark · simple · cute)
}

safeExposeGlobals({ migrateLegacySummonGemSave });
