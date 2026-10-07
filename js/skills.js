// Skill module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.skills = {
  get db() { return window.SKILL_DB; },
  // TODO: move gem equip/enhance/support toggle handlers into here.
};

/**
 * Adds combat XP to a normalized gem record. Overflow carries until the level-20 cap.
 * @param {ReturnType<typeof normalizeGemRecord>} gem
 * @param {number} amount Nonnegative integer combat XP.
 * @returns {number} Levels gained; presentation and expert rewards belong to the caller.
 */
function gainGemExperience(gem, amount) {
    if (amount <= 0 || gem.level >= 20) return 0;
    const previousLevel = gem.level;
    gem.exp += amount;
    while (gem.level < 20 && gem.exp >= getGemReqExp(gem.level)) {
        gem.exp -= getGemReqExp(gem.level);
        gem.level++;
    }
    if (gem.level === 20) gem.exp = 0;
    return gem.level - previousLevel;
}

function getGemResearchCollectionState() {
    let attackPool = Object.keys(SKILL_DB || {}).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
    let supportPool = Object.keys(SUPPORT_GEM_DB || {});
    let ownedAttack = attackPool.filter(name => typeof hasSkillGemOwned === 'function'
        ? hasSkillGemOwned(name)
        : (game.skills || []).includes(name));
    let ownedSupport = supportPool.filter(name => typeof hasSupportGemOwned === 'function'
        ? hasSupportGemOwned(name)
        : (game.supports || []).includes(name));
    return {
        attack: { owned: ownedAttack.length, total: attackPool.length, missing: attackPool.filter(name => !ownedAttack.includes(name)) },
        support: { owned: ownedSupport.length, total: supportPool.length, missing: supportPool.filter(name => !ownedSupport.includes(name)) }
    };
}

function getGemResearchCost(kind) {
    return kind === 'support' ? 8 : 12;
}

/** Resolve fragments once and grant them to the wallet immediately. */
function grantGemResearchFragments(amount, source = 'reward') {
    if (source === 'drop' && !contentProgression.canDropCurrency('gemShard')) return 0;
    let gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (gain <= 0) return 0;
    game.currencies = game.currencies || {};
    if (typeof awardCurrency === 'function') awardCurrency('gemShard', gain, 'reward');
    else game.currencies.gemShard = Math.max(0, Math.floor(game.currencies.gemShard || 0)) + gain;
    return gain;
}

function canResearchGemKind(kind) {
    return contentProgression.isUnlocked('research') && (kind !== 'support' || contentProgression.isUnlocked('support'));
}

function ownsResearchGem(kind, name) {
    if (kind === 'support') return hasSupportGemOwned(name);
    return hasSkillGemOwned(name);
}

function researchMissingGem(kind, name) {
    if (!canResearchGemKind(kind)) return;
    if (game.woodsmanBuildLock) return addLog('나무꾼 전투 중에는 젬 구성을 변경할 수 없습니다.', 'attack-monster');
    let isSupport = kind === 'support';
    let db = isSupport ? SUPPORT_GEM_DB[name] : SKILL_DB[name];
    if (!db || (!isSupport && !db.isGem)) return addLog('연구할 수 있는 젬이 아닙니다.', 'attack-monster');
    let alreadyOwned = ownsResearchGem(kind, name);
    if (alreadyOwned) return addLog('이미 보유한 젬입니다.', 'attack-monster');
    let cost = getGemResearchCost(kind);
    game.currencies = game.currencies || {};
    if ((game.currencies.gemShard || 0) < cost) return addLog(`젬 잔향이 부족합니다. (필요: ${cost})`, 'attack-monster');

    game.currencies.gemShard -= cost;
    if (isSupport) {
        game.supports = Array.isArray(game.supports) ? game.supports : [];
        game.supportGemData = game.supportGemData || {};
        game.supports.push(name);
        game.supportGemData[name] = normalizeGemRecord({ level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
    } else {
        game.skills = Array.isArray(game.skills) ? game.skills : [];
        game.gemData = game.gemData || {};
        game.skills.push(name);
        game.gemData[name] = normalizeGemRecord({ level: 1, exp: 0, awakened: false });
    }
    game.noti = game.noti || {};
    game.noti.skills = true;
    if (typeof checkUnlocks === 'function') checkUnlocks();
    if (typeof normalizeSupportLoadout === 'function') normalizeSupportLoadout(false);
    addLog(`🔬 젬 연구 완료: ${isSupport ? '보조' : '공격'} 젬 [${name}] 해금 (젬 잔향 ${cost} 소모)`, isSupport ? 'loot-rare' : 'loot-magic');
    if (typeof queueImportantSave === 'function') queueImportantSave(180);
    updateStaticUI();
    return true;
}

// Phase-3 extracted gem/skill progression handlers.

/** 각인은 '젬 각인' 해금과 함께 모두 열리고, 각성 각인만 '젬 각성' 해금이 따로 연다(2026-10-01, 젬 각인사 레벨 대신). */
function getSkyEnhancementUnlockId(enhanceId) {
    return String(enhanceId || '').startsWith('sky_awakened') ? 'gemAwakening' : null;
}

function canUseSkyEnhancement(enhanceId) {
    const unlockId = getSkyEnhancementUnlockId(enhanceId);
    return !unlockId || contentProgression.isUnlocked(unlockId);
}

function isAwakenedSkyEnhancement(enhanceId) {
    return String(enhanceId || '').startsWith('sky_awakened');
}

function isEnhanceableAttackGem(name) {
    return !!(name && SKILL_DB[name] && SKILL_DB[name].isGem);
}

function getEquippedEnhanceableGemNames() {
    let names = [];
    if (isEnhanceableAttackGem(game.activeSkill)) names.push(game.activeSkill);
    if (isEnhanceableAttackGem(game.mobilitySkill) && !names.includes(game.mobilitySkill)) names.push(game.mobilitySkill);
    (Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : []).forEach(name => {
        if (isEnhanceableAttackGem(name) && !names.includes(name)) names.push(name);
    });
    return names;
}

function getGemEnhanceTargetSkill() {
    let equippedTargets = getEquippedEnhanceableGemNames();
    game.gemEnhanceTargetSkill = equippedTargets.includes(game.gemEnhanceTargetSkill) ? game.gemEnhanceTargetSkill : null;
    if (game.gemEnhanceTargetSkill) return game.gemEnhanceTargetSkill;
    return equippedTargets[0] || game.activeSkill;
}

function selectGemEnhanceTargetSkill(name) {
    if (!getEquippedEnhanceableGemNames().includes(name)) return addLog('장착 중인 공격 젬만 강화할 수 있습니다.', 'attack-monster');
    game.gemEnhanceTargetSkill = name;
    game.gemEngraveSelectedSlot = 0;
    addLog(`💎 강화 대상 젬: [${name}]`, 'loot-magic');
    updateStaticUI();
}

function upgradeActiveGemWithCondensedSkyPower() {
    if (!contentProgression.isUnlocked('gemForge')) return;
    let active = getGemEnhanceTargetSkill();
    if (!isEnhanceableAttackGem(active) || !Array.isArray(game.skills) || !game.skills.includes(active)) return addLog('영구 강화할 공격 젬을 먼저 선택하세요.', 'attack-monster');
    let st = ensureSkyTowerState();
    if (!st.unlocked) return addLog('응축 창공 젬 강화는 창공의 탑 해금 이후 가능합니다.', 'attack-monster');
    let current = getSkyTowerGemBoostLevel(active);
    if (current >= getSkyTowerGemBoostMaxLevel()) return addLog('해당 젬의 응축 창공 강화는 최대 단계입니다.', 'attack-monster');
    let cost = getSkyTowerGemBoostCost(active);
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return addLog(`응축된 창공의 정수가 부족합니다. (필요: ${cost})`, 'attack-monster');
    st.condensedPower -= cost;
    st.gemBoosts[active] = current + 1;
    queueImportantSave(200);
    addLog(`☁️ [${active}] 응축 창공 영구 강화 ${current + 1}/${getSkyTowerGemBoostMaxLevel()} (루프 초기화 없음)`, 'loot-unique');
    updateStaticUI();
}

function upgradeSkyEngraveCap() {
    if (!contentProgression.isUnlocked('engraving') || (game.season || 1) < 4) {
        addLog('창공 각인 확장은 루프4부터 가능합니다.', 'attack-monster');
        return false;
    }
    let active = getGemEnhanceTargetSkill();
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !isEnhanceableAttackGem(active)) {
        addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
        return false;
    }
    if (gem.skyEnhanceCap >= 5) {
        addLog('창공 각인 슬롯은 최대 5개입니다.', 'attack-monster');
        return false;
    }
    let need = gem.skyEnhanceCap + 1;
    if ((game.currencies.skyEssence || 0) < need) {
        addLog(`창공의 정수가 부족합니다. (필요: ${need})`, 'attack-monster');
        return false;
    }
    game.currencies.skyEssence -= need;
    gem.skyEnhanceCap = Math.min(5, gem.skyEnhanceCap + 1);
    addLog(`☁️ [${active}] 창공 각인 슬롯이 ${gem.skyEnhanceCap}개로 확장되었습니다. (소모 ${need})`, 'loot-unique');
    updateStaticUI();
    return true;
}

function normalizeSkyGemEnhancementSlots(rawSlots) {
    let result = [null, null, null, null, null];
    let used = new Set();
    let hasProjectilePattern = false;
    (Array.isArray(rawSlots) ? rawSlots : []).slice(0, 5).forEach((id, index) => {
        if (!id || !GEM_SKY_ENHANCEMENTS[id] || used.has(id)) return;
        if (GEM_SKY_ENHANCEMENTS[id].projectilePatternMode && hasProjectilePattern) return;
        result[index] = id;
        used.add(id);
        if (GEM_SKY_ENHANCEMENTS[id].projectilePatternMode) hasProjectilePattern = true;
    });
    return result;
}

function getSkyEnhancementSlotsForSkill(skillName) {
    game.skyGemEnhancements = game.skyGemEnhancements || {};
    let slots = normalizeSkyGemEnhancementSlots(game.skyGemEnhancements[skillName]);
    game.skyGemEnhancements[skillName] = slots;
    return slots;
}

function getSkyEnhancementForSkill(skillName) {
    if (!contentProgression.isUnlocked('engraving')) return [];
    return getSkyEnhancementSlotsForSkill(skillName).filter(Boolean);
}

function getSkyProjectilePatternMode(skillName) {
    let id = getSkyEnhancementForSkill(skillName).find(enhanceId => GEM_SKY_ENHANCEMENTS[enhanceId].projectilePatternMode);
    return id ? GEM_SKY_ENHANCEMENTS[id].projectilePatternMode : null;
}

function isSkyEnhancementCompatibleWithSkill(enhanceId, skillName) {
    let enhancement = GEM_SKY_ENHANCEMENTS[enhanceId];
    if (enhancement?.projectilePatternMode && SKILL_DB[skillName]?.projectilePattern?.fixed) return false;
    if (!enhancement || !enhancement.requiredTag) return !!enhancement;
    let tags = (SKILL_DB[skillName] && SKILL_DB[skillName].tags) || [];
    return tags.includes(enhancement.requiredTag);
}

function applyProjectilePatternMode(skill, mode, source, damageMultiplierOverride) {
    let config = PROJECTILE_PATTERN_MODE_DB[mode];
    if (!canChangeProjectilePattern(skill, config)) return skill;
    let hasDamageMultiplierOverride = damageMultiplierOverride !== null
        && damageMultiplierOverride !== undefined
        && Number.isFinite(Number(damageMultiplierOverride));
    let damageMultiplier = hasDamageMultiplierOverride
        ? Number(damageMultiplierOverride)
        : config.damageMultiplier;
    let next = { ...skill, projectilePattern: { mode, kind: config.kind }, projectilePatternSource: source || '효과', projectilePatternDamageMultiplier: damageMultiplier };
    if (config.rays) Object.assign(next.projectilePattern, { rays: config.rays, spreadDeg: config.spreadDeg });
    if (config.targetMode) next.targetMode = config.targetMode;
    if (config.targetLimit) next.targets = config.targetLimit;
    if (config.minTargets) next.targets = Math.max(config.minTargets, Number(next.targets) || 1);
    if (config.extraProjectileDamagePct) next.extraProjectileDamagePct = config.extraProjectileDamagePct;
    if (next.combatPattern && next.combatPattern.kind === 'boomerang') delete next.combatPattern;
    if (config.combatPattern) next.combatPattern = { ...config.combatPattern };
    if (Number.isFinite(next.dmg) && Number.isFinite(damageMultiplier)) next.dmg *= damageMultiplier;
    return next;
}

function canChangeProjectilePattern(skill,config) {
    return !!config?.kind && !!skill?.tags?.includes('projectile') && !skill.projectilePattern?.fixed;
}

function getSelectedGemEngraveSlot() {
    let index = Math.floor(Number(game.gemEngraveSelectedSlot) || 0);
    return Math.max(0, Math.min(4, index));
}

function selectGemEngraveSlot(index) {
    if (!contentProgression.isUnlocked('engraving')) return false;
    let active = getGemEnhanceTargetSkill();
    let gem = normalizeGemRecord((game.gemData || {})[active]);
    if (!isEnhanceableAttackGem(active) || !gem) return false;
    game.gemData = game.gemData || {};
    game.gemData[active] = gem;
    let slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    let cap = gem.skyEnhanceCap;
    if (slotIndex >= cap) {
        if (slotIndex !== cap) {
            addLog('앞쪽 각인 슬롯부터 순서대로 해금하세요.', 'attack-monster');
            return false;
        }
        if (!upgradeSkyEngraveCap()) return false;
    }
    game.gemEngraveSelectedSlot = slotIndex;
    updateStaticUI();
    return true;
}

function getFirstEmptyGemEngraveSlot(skillName) {
    let gem = normalizeGemRecord((game.gemData || {})[skillName]);
    let cap = Math.max(1, Math.min(5, Math.floor((gem && gem.skyEnhanceCap) || 1)));
    let slots = getSkyEnhancementSlotsForSkill(skillName);
    return slots.slice(0, cap).findIndex(id => !id);
}

// Total skill-gem-level bonus granted by sky engravings (e.g. '각성: 심층 초월' = 젬 레벨 +3).
// Shared by the active skill and summon gem-level paths so engravings apply consistently.
function getGemSkyEnhanceGemLevelBonus(skillName) {
    let bonus = 0;
    getSkyEnhancementForSkill(skillName).forEach(id => {
        let enh = GEM_SKY_ENHANCEMENTS[id];
        if (enh && enh.stat === 'awakenedGemLevel') bonus += (enh.gemLvVal || 0);
    });
    return Math.max(0, Math.floor(bonus));
}

function applySkyGemEnhancementToActive(enhanceId, requestedSlotIndex) {
    if (!contentProgression.isUnlocked('engraving') || (game.season || 1) < 4) {
        addLog('창공의 정수는 루프4부터 사용할 수 있습니다.', 'attack-monster');
        return false;
    }
    if ((game.currencies.skyEssence || 0) <= 0) {
        addLog('창공의 정수가 부족합니다.', 'attack-monster');
        return false;
    }
    if (!canUseSkyEnhancement(enhanceId)) {
        addLog('각성 각인은 ‘해금’의 젬 각성을 열어야 쓸 수 있습니다.', 'attack-monster');
        return false;
    }
    let active = getGemEnhanceTargetSkill();
    let gem = game.gemData[active];
    if (!gem || !isEnhanceableAttackGem(active)) {
        addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
        return false;
    }
    let enhance = GEM_SKY_ENHANCEMENTS[enhanceId];
    if (!enhance) return false;
    if (!isSkyEnhancementCompatibleWithSkill(enhanceId, active)) {
        addLog('이 발사 방식 각인은 투사체 젬에만 적용할 수 있습니다.', 'attack-monster');
        return false;
    }
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let slots = getSkyEnhancementSlotsForSkill(active);
    let cap = game.gemData[active].skyEnhanceCap;
    let hasRequestedSlot = Number.isFinite(Number(requestedSlotIndex));
    let currentPatternSlot = enhance.projectilePatternMode
        ? slots.findIndex(id => id && GEM_SKY_ENHANCEMENTS[id].projectilePatternMode)
        : -1;
    let selectedSlot = hasRequestedSlot
        ? Math.max(0, Math.min(4, Math.floor(Number(requestedSlotIndex))))
        : (currentPatternSlot >= 0 ? currentPatternSlot : getFirstEmptyGemEngraveSlot(active));
    if (selectedSlot < 0) {
        addLog(`젬 특수 옵션은 현재 최대 ${cap}개까지 부여할 수 있습니다. 슬롯을 눌러 교체할 각인을 선택하세요.`, 'attack-monster');
        return false;
    }
    if (selectedSlot >= cap) {
        addLog('먼저 선택한 각인 슬롯을 해금하세요.', 'attack-monster');
        return false;
    }
    let previousId = slots[selectedSlot];
    if (previousId === enhanceId) return false;
    if (slots.some((id, index) => index !== selectedSlot && id === enhanceId)) {
        addLog('같은 각인은 한 젬에 중복 적용할 수 없습니다.', 'attack-monster');
        return false;
    }
    let previousPatternSlot = enhance.projectilePatternMode
        ? slots.findIndex((id, index) => index !== selectedSlot && id && GEM_SKY_ENHANCEMENTS[id].projectilePatternMode)
        : -1;
    // 각성 각인은 각성 젬 전용이 아니라 모든 공격 젬에 부여할 수 있습니다.
    // 각성 젬 상태는 별도의 보너스(+2 젬 레벨/슬롯 보정)만 제공합니다.
    if (isAwakenedSkyEnhancement(enhanceId) && slots.some((id, index) => index !== selectedSlot && isAwakenedSkyEnhancement(id))) {
        addLog('각성 각인은 각성 젬 여부와 관계없이 모든 공격 젬에 부여할 수 있지만, 젬당 1개만 가능합니다.', 'attack-monster');
        return false;
    }
    game.currencies.skyEssence--;
    if (previousPatternSlot >= 0) slots[previousPatternSlot] = null;
    slots[selectedSlot] = enhanceId;
    game.skyGemEnhancements[active] = slots;
    let previous = previousId && GEM_SKY_ENHANCEMENTS[previousId];
    addLog(`☁️ [${active}] ${selectedSlot + 1}번 슬롯에 '${enhance.name}' 각인을 ${previous ? `'${previous.name}'에서 교체` : '부여'}했습니다.`, 'loot-unique');
    updateStaticUI();
    return true;
}

function toggleSkyGemEnhancement(enhanceId) {
    let active = getGemEnhanceTargetSkill();
    let slots = getSkyEnhancementSlotsForSkill(active);
    let appliedSlot = slots.indexOf(enhanceId);
    if (appliedSlot >= 0) return removeSkyGemEnhancementFromActive(enhanceId, appliedSlot);
    return applySkyGemEnhancementToActive(enhanceId);
}

function getSkyGemEnhancementRemoveCost() {
    // 각인 해제는 창공의 정수 2를 쓴다(예전 젬 각인사 Lv.7의 무료 해제는 전문가와 함께 없어졌다).
    return 2;
}

function removeSkyGemEnhancementFromActive(enhanceId, slotIndex) {
    if (!contentProgression.isUnlocked('engraving')) return false;
    let active = getGemEnhanceTargetSkill();
    let slots = getSkyEnhancementSlotsForSkill(active);
    let selectedSlot = Number.isFinite(Number(slotIndex)) ? Math.max(0, Math.min(4, Math.floor(Number(slotIndex)))) : getSelectedGemEngraveSlot();
    if (slots[selectedSlot] !== enhanceId) selectedSlot = slots.indexOf(enhanceId);
    if (selectedSlot < 0) return false;
    let cost = getSkyGemEnhancementRemoveCost();
    if (cost > 0 && (game.currencies.skyEssence || 0) < cost) {
        addLog(`각인 해제에 필요한 창공의 정수가 부족합니다. (필요: ${cost})`, 'attack-monster');
        return false;
    }
    if (cost > 0) game.currencies.skyEssence -= cost;
    slots[selectedSlot] = null;
    game.skyGemEnhancements[active] = slots;
    let enh = GEM_SKY_ENHANCEMENTS[enhanceId];
    addLog(`☁️ [${active}] ${enh ? enh.name : '각인'} 옵션을 해제했습니다.${cost > 0 ? ` (창공의 정수 ${cost} 소모)` : ''}`, 'attack-monster');
    updateStaticUI();
    return true;
}


function upgradeActiveGemQuality() {
    let active = getGemEnhanceTargetSkill();
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !isEnhanceableAttackGem(active)) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    if ((gem.quality || 0) >= 20) return addLog('젬 퀄리티는 최대 20%입니다.', 'attack-monster');
    let need = 1 + Math.floor((gem.quality || 0) / 5);
    if ((game.currencies.bossCore || 0) < need) return addLog(`군주의 핵이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.bossCore -= need;
    gem.quality = Math.min(20, (gem.quality || 0) + 1);
    addLog(`💎 [${active}] 퀄리티 +1% (현재 ${gem.quality}%, 소모 ${need})`, 'loot-unique');
    updateStaticUI();
}

function getSupportGemSkyProcessState(name) {
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
    let tierCap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    let unlockedTier = Math.max(1, Math.min(tierCap, Math.floor(rec.unlockedTier || 1)));
    rec.unlockedTier = unlockedTier;
    rec.activeTier = Math.max(1, Math.min(unlockedTier, Math.floor(rec.activeTier || 1)));
    let improvingTier = unlockedTier < tierCap;
    let need = improvingTier ? unlockedTier + 1 : Math.max(3, Math.ceil((rec.level || 1) / 5));
    return {
        record: rec,
        tierCap: tierCap,
        improvingTier: improvingTier,
        need: need,
        maxed: !improvingTier && (rec.level || 1) >= 30,
        nextTier: improvingTier ? Math.min(tierCap, unlockedTier + 1) : unlockedTier
    };
}

function processSupportGemWithSkyEssence(name) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!SUPPORT_GEM_DB[name]) return addLog('가공할 보조 젬을 찾을 수 없습니다.', 'attack-monster');
    game.supports = Array.isArray(game.supports) ? game.supports : [];
    if (!game.supports.includes(name)) return addLog('보유한 보조 젬만 가공할 수 있습니다.', 'attack-monster');
    game.supportGemData = game.supportGemData || {};
    let processState = getSupportGemSkyProcessState(name);
    let rec = processState.record;
    let improvingTier = processState.improvingTier;
    let need = processState.need;
    if (processState.maxed) return addLog('해당 보조 젬은 이미 최대 등급·레벨입니다.', 'attack-monster');
    if ((game.currencies.skyEssence || 0) < need) return addLog(`창공의 정수가 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.skyEssence -= need;
    if (improvingTier) {
        rec.unlockedTier = Math.min(processState.tierCap, Math.floor(rec.unlockedTier || 1) + 1);
        addLog(`☁️ 보조 젬 [${name}] 창공 가공 완료: ${rec.unlockedTier === 3 ? '상급' : '중급'} 해금 · 적용 등급은 현재 설정 유지 (소모 ${need})`, 'loot-unique');
    } else {
        rec.level = Math.min(30, Math.floor(rec.level || 1) + 1);
        addLog(`☁️ 보조 젬 [${name}] 숙련 가공 완료: Lv.${rec.level} (소모 ${need})`, 'loot-unique');
    }
    game.supportGemData[name] = rec;
    if (typeof normalizeSupportLoadout === 'function') normalizeSupportLoadout(false);
    updateStaticUI();
}


function awakenActiveGemCandidate() {
    if (!contentProgression.isUnlocked('gemAwakening')) return addLog('각성 후보 변환은 ‘해금’의 젬 각성을 열어야 쓸 수 있습니다.', 'attack-monster');
    let active = getGemEnhanceTargetSkill();
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !isEnhanceableAttackGem(active)) return addLog('각성할 공격 젬을 먼저 장착하세요.', 'attack-monster');
    if (gem.awakened) return addLog('이미 각성 후보로 변환된 젬입니다.', 'attack-monster');
    if ((gem.level || 1) < 20) return addLog('Lv.20 이상의 공격 젬만 각성 후보로 변환할 수 있습니다.', 'attack-monster');
    let echoNeed = 3;
    if ((game.currencies.awakenedEcho || 0) < echoNeed) return addLog(`각성 잔향이 부족합니다. (필요: ${echoNeed})`, 'attack-monster');
    game.currencies.awakenedEcho -= echoNeed;
    gem.awakened = true;
    gem.skyEnhanceCap = Math.min(5, Math.max(gem.skyEnhanceCap || 1, 2));
    addLog(`🌌 [${active}] 각성 젬 변환 완료! 총 젬 레벨 +2 및 각인 슬롯 보정이 적용됩니다. 각성 각인은 각성 젬이 아니어도 부여할 수 있습니다.`, 'loot-unique');
    updateStaticUI();
}

async function applyFossilCraft() {
    if (game.season < 3) return addLog('미궁 제작은 루프3부터 사용할 수 있습니다.', 'attack-monster');
    let have = Math.max(0, Math.floor(game.currencies.fossil));
    if (have <= 0) return addLog('미궁 화석이 부족합니다.', 'attack-monster');
    let raw = await requestGameNumber({
        title: '미궁 화석 정제',
        message: `한 번에 정제할 기본 화석 개수를 선택하세요.\n보유량: ${have}개`,
        min: 1,
        max: have,
        value: have,
        confirmLabel: '정제'
    });
    if (raw === null) return;
    let count = Math.max(0, Math.min(have, Math.floor(Number(raw))));
    if (!Number.isFinite(count) || count <= 0) return addLog('정제 개수가 올바르지 않습니다.', 'attack-monster');
    if (game.season < 3 || game.currencies.fossil < count) return addLog('진행도 또는 보유 화석이 변경되었습니다. 정제를 다시 선택하세요.', 'attack-monster');
    let underworldOnlyFossils = new Set(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']);
    let refinablePool = FOSSIL_DB.filter(fossil => !fossil.ancientPrimalOnly && !underworldOnlyFossils.has(fossil.key));
    let gained = {};
    for (let i = 0; i < count; i++) {
        game.currencies.fossil--;
        let randomFossil = rndChoice(refinablePool);
        game.currencies[randomFossil.key] = (game.currencies[randomFossil.key] || 0) + 1;
        gained[randomFossil.name] = (gained[randomFossil.name] || 0) + 1;
    }
    let summary = Object.keys(gained).map(name => `[${name}] ${gained[name]}개`).join(', ');
    addLog(`🪨 기본 화석 ${count}개를 정제해 ${summary}를 획득했습니다.`, 'loot-magic');
    updateStaticUI();
}

const FOSSIL_SURPLUS_REFINING_COSTS = Object.freeze({
    fossil: 20,
    fossilJagged: 12,
    fossilBound: 12,
    fossilGale: 12,
    fossilPrismatic: 12,
    fossilAbyssal: 16,
    fossilBulwark: 12,
    fossilWedge: 12
});

function getFossilSurplusRefiningCost(fossilKey) {
    let cost = Number(FOSSIL_SURPLUS_REFINING_COSTS[fossilKey]);
    return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : null;
}

function refineFossilSurplus(fossilKey) {
    let cost = getFossilSurplusRefiningCost(fossilKey);
    if (!cost) return false;
    if (!contentProgression.isUnlocked('fossilRestore')) return addLog('잉여 화석 정제는 ‘해금’의 화석 복원을 열어야 쓸 수 있습니다.', 'attack-monster');
    if ((game.currencies[fossilKey] || 0) < cost) return addLog(`잉여 화석 정제에는 같은 화석 ${cost}개가 필요합니다.`, 'attack-monster');
    game.currencies[fossilKey] -= cost;
    awardCurrency('fossilPrimal', 1);
    let sourceName = fossilKey === 'fossil' ? '미궁 화석' : ((FOSSIL_DB.find(row => row.key === fossilKey) || {}).name || fossilKey);
    addLog(`🪨 ${sourceName} ${cost}개를 압축해 원시 화석 1개를 만들었습니다.`, 'loot-magic');
    updateStaticUI();
    return true;
}

function getFossilExclusivePool(item) {
    // 화석 전용 옵션끼리만 중복을 막고, 같은 효과의 기본 추가옵션과는 공존할 수 있도록 한다.
    let existing = new Set((item && Array.isArray(item.stats) ? item.stats : [])
        .filter(stat => stat && (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore))
        .map(stat => stat.id)
        .filter(Boolean));
    return FOSSIL_EXCLUSIVE_MODS
        .filter(mod => mod.slots.includes(item.slot))
        .filter(mod => {
            let resolvedId = mod.statId || (mod.id === 'fossilVoidHeart' ? 'chaosPctDmg' : (mod.id === 'fossilWarMarch' ? 'move' : (mod.id === 'fossilSoulWard' ? 'resAll' : (mod.id === 'fossilGemPulse' ? 'gemLevel' : 'suppCap'))));
            return !existing.has(resolvedId);
        })
        .map(mod => ({
            ...mod,
            id: mod.statId || (mod.id === 'fossilVoidHeart' ? 'chaosPctDmg' : (mod.id === 'fossilWarMarch' ? 'move' : (mod.id === 'fossilSoulWard' ? 'resAll' : (mod.id === 'fossilGemPulse' ? 'gemLevel' : 'suppCap'))))
        }));
}

// Shared by crafting and its preview; preserve the armor exception and immutable options.
function getFossilGuaranteedPool(item, fossil) {
    const immutableIds = new Set(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item).map(stat => stat && stat.id).filter(Boolean) : []);
    const candidate = { ...item, stats: (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift)), chaosInfusion: null };
    const pool = getAvailableMods(candidate).filter(mod => fossil.guaranteedStats.includes(mod.statId || mod.id));
    if (fossil.key === 'fossilBulwark' && pool.length === 0 && ['투구', '갑옷', '장갑', '신발', '방패'].includes(item.slot)) {
        return MOD_DB.filter(mod => fossil.guaranteedStats.includes(mod.statId || mod.id) && !immutableIds.has(mod.statId || mod.id));
    }
    return pool;
}

function applyFossilChaosCraft(fossilKey) {
    let fossil = FOSSIL_DB.find(entry => entry.key === fossilKey);
    let item = getSelectedCraftItem();
    const craftBlock = equipmentCrafting.getFossilUseReason(item, fossil, game.season, game.currencies);
    if (craftBlock) return addLog(craftBlock, 'attack-monster');
    let immutableIds = new Set(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item).map(stat => stat && stat.id).filter(Boolean) : []);
    let lockedStats = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift));
    let rerollCandidate = { ...item, stats: lockedStats, chaosInfusion: null };
    let guaranteedPool = getFossilGuaranteedPool(item, fossil);
    let specialFossil = ['fossilOld', 'fossilRift'].includes(fossilKey);
    if (!specialFossil && guaranteedPool.length === 0) return addLog('해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.', 'attack-monster');
    let fossilExclusivePool = fossilKey === 'fossilOld' ? getFossilExclusivePool(rerollCandidate) : null;
    if (fossilExclusivePool && fossilExclusivePool.length <= 0) return addLog('화석 전용 옵션을 부여할 수 없습니다.', 'attack-monster');

    let tierRange = typeof getCraftTierRangeForItem === 'function' ? getCraftTierRangeForItem(item, 'fossil') : { min: 1, max: getItemCraftTier(item) };
    let maxTier = tierRange.max;
    let previousChaosInfusion = item.chaosInfusion || null;
    if (previousChaosInfusion) item.chaosInfusion = null;
    let reservedInfusionCount = previousChaosInfusion ? 1 : 0;
    let hiddenTier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || maxTier));
    let guaranteedMinTier = Math.max(tierRange.min || 1, hiddenTier >= 11 ? tierRange.min : hiddenTier - 3);
    let guaranteedMaxTier = Math.max(guaranteedMinTier, hiddenTier);
    let guaranteed = specialFossil ? null : pickWeightedMod(guaranteedPool);
    let newStats = lockedStats.slice();
    let blockedIds = new Set([...immutableIds, ...newStats.map(stat => stat.id)]);
    if (guaranteed) {
        let guaranteedRoll = rollAffixValueInTierRange(guaranteed, guaranteedMinTier, guaranteedMaxTier);
        guaranteedRoll.craftSource = 'fossil';
        if (!blockedIds.has(guaranteedRoll.id) && (newStats.length + reservedInfusionCount) < 6) {
            newStats.push(guaranteedRoll);
            blockedIds.add(guaranteedRoll.id);
        }
    } else if (fossilKey === 'fossilOld') {
        let row = rndChoice(fossilExclusivePool);
        let fixedVal = Number.isFinite(Number(row.fixedVal)) ? Number(row.fixedVal) : Number((row.base + Math.max(0, hiddenTier - 1) * row.step).toFixed(2));
        let rolled = Number(fixedVal.toFixed(2));
        newStats.push({ id: row.id, statName: row.statName, val: rolled, valMin: rolled, valMax: rolled, fossilExclusive: true, craftSource: 'fossil' });
    }

    let count = 4 + Math.floor(Math.random() * 2);
    while ((newStats.length + reservedInfusionCount) < Math.min(6, Math.max(count, lockedStats.length + 1))) {
        let pool = getAvailableMods({ ...item, stats: newStats, chaosInfusion: previousChaosInfusion })
            .filter(mod => !blockedIds.has(mod.statId || mod.id));
        if (pool.length === 0) break;
        // 화석이 보정하는 보장 옵션만 고티어 보정을 받고, 나머지 옵션은 일반 티어 분포(1티어부터)로 굴린다.
        let roll = rollAffixValue(pickWeightedMod(pool), maxTier);
        newStats.push(roll);
        blockedIds.add(roll.id);
    }
    if (fossilKey === 'fossilRift') {
        let riftMarker = lockedStats.find(stat => stat.id === 'fossilRiftBlank') || { id: 'fossilRiftBlank', statName: '균열 옵션: 균열 표식 (제거/변경 불가)', val: 0, lockedByRift: true, craftSource: 'fossil' };
        let ampMarker = { id: 'fossilRiftAmp', statName: '균열 옵션: 추가 옵션 효과 50% 증폭', val: 50, craftSource: 'fossil' };
        let markerIds = new Set(['fossilRiftBlank', 'fossilRiftAmp']);
        newStats = newStats.filter(stat => !(stat && markerIds.has(stat.id)));
        let ensureMarker = (marker) => {
            if ((newStats.length + reservedInfusionCount) < 6) { newStats.push(marker); return; }
            let replaceIdx = -1;
            for (let i = newStats.length - 1; i >= 0; i--) {
                let st = newStats[i];
                if (!st || st.lockedByHoney || st.lockedByRift) continue;
                replaceIdx = i;
                break;
            }
            if (replaceIdx >= 0) newStats[replaceIdx] = marker;
        };
        ensureMarker(riftMarker);
        ensureMarker(ampMarker);
    }

    item.stats = newStats;
    item.rarity = 'rare';
    if (typeof rerollChaosInfusionForItem === 'function') rerollChaosInfusionForItem(item, previousChaosInfusion);
    game.currencies[fossilKey]--;
    updateItemName(item);
    let line = guaranteed ? `확정 옵션: [${guaranteed.statName}] (T${guaranteedMinTier}~T${guaranteedMaxTier})` : (fossilKey === 'fossilOld' ? '확정 옵션: [화석 전용 옵션]' : '확정 옵션 2줄: [균열 표식] + [추가 옵션 효과 50% 증폭]');
    addLog(`🪨 ${fossil.name} 재련 성공! ${line}`, 'loot-magic');
    updateStaticUI();
}

function restorePrimalFossil(kind) {
    let key = kind === 'ancient' ? 'fossilAncientPrimal' : 'fossilPrimal';
    let isAncient = key === 'fossilAncientPrimal';
    if (!contentProgression.isUnlocked('fossilRestore')) return addLog(`${isAncient ? '원시 고대 화석' : '원시 화석'} 복원은 ‘해금’의 화석 복원을 열어야 쓸 수 있습니다.`, 'attack-monster');
    if ((game.currencies[key] || 0) <= 0) return addLog(`${ORB_DB[key] ? ORB_DB[key].name : key}이 부족합니다.`, 'attack-monster');
    game.currencies[key]--;
    let rewardLines = [];
    let baseFossilGain = isAncient ? 2 : 1;
    awardCurrency('fossil', baseFossilGain);
    rewardLines.push(`미궁 화석 +${baseFossilGain}`);
    let typed = rndChoice(FOSSIL_DB.filter(row => row.key !== 'fossilAbyssal' && !row.ancientPrimalOnly && row.key !== 'fossilOld' && row.key !== 'fossilRift'));
    awardCurrency(typed.key, 1);
    rewardLines.push(`${typed.name} +1`);
    if (isAncient) {
        awardCurrency('fossilPrimordial', 1);
        rewardLines.push('태고 화석 +1');
        if (Math.random() < 0.35) {
            awardCurrency('fossilAbyssal', 1);
            rewardLines.push('심연 화석 +1');
        }
    }
    let currencyRoll = Math.random();
    if (isAncient) {
        if (currencyRoll < 0.08) { awardCurrency('goldenRule', 1); rewardLines.push('황금률 +1'); }
        else if (currencyRoll < 0.30) { awardCurrency('sapBud', 1); rewardLines.push('수액 봉우리 +1'); }
        else { awardCurrency('formlessDew', 2); rewardLines.push('형체 없는 이슬 +2'); }
    } else {
        if (currencyRoll < 0.04) { awardCurrency('sapBud', 1); rewardLines.push('수액 봉우리 +1'); }
        else if (currencyRoll < 0.24) { awardCurrency('formlessDew', 1); rewardLines.push('형체 없는 이슬 +1'); }
        else { awardCurrency('magicBud', 2); rewardLines.push('마법의 새싹 +2'); }
    }
    let greatChance = isAncient ? 0.16 : 0.07;
    if (Math.random() < greatChance) {
        let bonus = isAncient ? 'goldenRule' : 'sapBud';
        awardCurrency(bonus, 1);
        rewardLines.push(`대성공: ${ORB_DB[bonus].name} +1`);
    }
    addLog(`🪨 ${ORB_DB[key].name} 복원 완료! [${rewardLines.join(' / ')}]`, isAncient ? 'loot-unique' : 'loot-magic');
    updateStaticUI();
}


function getItemTotalStats(item) {
    let bucket = createEmptyStatBucket();
    applyStatsToBucket(bucket, item.baseStats || []);
    applyStatsToBucket(bucket, item.stats || []);
    if (typeof getImmutableItemSpecialStats === 'function') applyStatsToBucket(bucket, getImmutableItemSpecialStats(item));
    return bucket;
}

// knownStats: 이미 계산해 둔 스탯이 있으면 넘긴다. getPlayerStats는 한 번에 2.7ms가
// 드는데, 화면 갱신마다 여기서 한 번, 바로 뒤에서 또 한 번 부르고 있었다.
function normalizeSupportLoadout(logChange, knownStats) {
    let stats = knownStats;
    if (!stats) {
        let statsProvider = (typeof getPlayerStats === 'function')
            ? getPlayerStats
            : ((typeof window !== 'undefined' && typeof window.getPlayerStats === 'function') ? window.getPlayerStats : null);
        if (!statsProvider) return false;
        stats = statsProvider();
    }
    let cap = Math.max(0, Math.floor((stats || {}).suppCap || 0));
    if ((game.equippedSupports || []).length <= cap) return false;
    let removed = game.equippedSupports.splice(cap);
    if (logChange && removed.length > 0) addLog("🟢 장착 한도가 줄어 보조 젬 일부가 자동 해제되었습니다.", "attack-monster");
    return removed.length > 0;
}

const GEM_LEVEL_TAG_RULES = [
    { stat: 'elementalGemLevel', tag: 'elemental' },
    { stat: 'fireGemLevel', tag: 'fire' },
    { stat: 'coldGemLevel', tag: 'cold' },
    { stat: 'lightGemLevel', tag: 'lightning' },
    { stat: 'chaosGemLevel', tag: 'chaos' },
    { stat: 'physGemLevel', tag: 'physical' },
    { stat: 'projectileGemLevel', tag: 'projectile' },
    { stat: 'meleeGemLevel', tag: 'melee' },
    { stat: 'slamGemLevel', tag: 'slam' },
    { stat: 'spellGemLevel', tag: 'spell' },
    { stat: 'dotGemLevel', tag: 'dot' },
    { stat: 'aoeGemLevel', tag: 'aoe' },
    { stat: 'summonGemLevel', tag: 'summon_attack' }
];

function getGemLevelTargetTags(target) {
    let def = null;
    let tags = [];
    if (Array.isArray(target)) {
        tags = target.slice();
    } else {
        let name = target || game.activeSkill;
        def = SKILL_DB[name] || SUPPORT_GEM_DB[name] || SKILL_DB['기본 공격'];
        tags = Array.isArray(def.tags) ? def.tags.slice() : [];
    }
    if (def && def.ele) {
        if (def.ele === 'fire') tags.push('fire', 'elemental');
        if (def.ele === 'cold') tags.push('cold', 'elemental');
        if (def.ele === 'light') tags.push('lightning', 'elemental');
        if (def.ele === 'chaos') tags.push('chaos');
        if (def.ele === 'phys') tags.push('physical');
    }
    return Array.from(new Set(tags));
}

/** Gem levels from the talisman row (척력 · 중력 · 오만 · 주베누비아의 선택까지 합산한 값). */
function getTalismanGemBonusSources(activeTags) {
    const tags = Array.isArray(activeTags) ? activeTags : [];
    const stats = talismanEffects.summarize().stats;
    return GEM_LEVEL_TAG_RULES.reduce((total, rule) => total + (tags.includes(rule.tag) ? Number(stats[rule.stat]) || 0 : 0),
        Number(stats.gemLevel) || 0);
}

function getGemLevelValueFromStatLines(stats, activeTags) {
    let total = 0;
    let visit = stat => {
        if (!stat || typeof stat !== 'object') return;
        let value = Number(stat.val);
        if (Number.isFinite(value) && stat.id === 'gemLevel') total += value;
        GEM_LEVEL_TAG_RULES.forEach(rule => {
            if (Number.isFinite(value) && stat.id === rule.stat && activeTags.includes(rule.tag)) total += value;
        });
        (stat.extraStats || []).forEach(visit);
    };
    (stats || []).forEach(visit);
    return total;
}

function getPassiveGemLevelEffects(node) {
    return getEffectivePassiveNodeEffects(node);
}

/**
 * One synchronous stat evaluation owns this context. Never store it on game or a UI cache.
 * Keeps equipment groups and effect order so fractional gem levels retain their rounding.
 * @param {Array<ReturnType<typeof getResolvedEquipmentStatLists>>} [resolvedStats]
 */
function createGemBonusEvaluation(resolvedStats) {
    let sources = resolvedStats;
    if (!sources) {
        sources = getPlayerStatSourceItemEntries().map(([slotKey, item]) =>
            getResolvedEquipmentStatLists(slotKey, item, game));
    }
    const ids = new Set(['gemLevel', ...GEM_LEVEL_TAG_RULES.map(rule => rule.stat)]);
    const gearLines = sources.map(resolved => collectGemLevelStatLines([...resolved.baseStats, ...resolved.explicitStats], ids));
    const passiveEffects = (game.passives || []).flatMap(id => getPassiveGemLevelEffects(PASSIVE_TREE.nodes[id])
        .filter(effect => ids.has(effect.stat)));
    return { gearLines, passiveEffects, memo: new Map() };
}

function collectGemLevelStatLines(stats, ids) {
    const lines = [];
    const visit = stat => {
        if (!stat || typeof stat !== 'object') return;
        if (ids.has(stat.id)) lines.push({ id: stat.id, val: stat.val });
        (stat.extraStats || []).forEach(visit);
    };
    stats.forEach(visit);
    return lines;
}

/**
 * @param {string|string[]} target Gem name or tags.
 * @param {Array<ReturnType<typeof getResolvedEquipmentStatLists>>} [resolvedStats] Read-only, from this same stat evaluation.
 * @param {ReturnType<typeof createGemBonusEvaluation>} [evaluation] Discard after this synchronous evaluation.
 */
function getGemBonusSources(target, resolvedStats, evaluation) {
    let gear = 0;
    let passive = 0;
    let reward = 0;
    let activeTags = getGemLevelTargetTags(target);
    const memo = getBackgroundBuildMemo(game) || evaluation?.memo;
    const memoKey = `gem-bonus:${activeTags.join(',')}`;
    if (memo?.has(memoKey)) return memo.get(memoKey);
    const inputs = evaluation || createGemBonusEvaluation(resolvedStats);
    inputs.gearLines.forEach(lines => {
        gear += getGemLevelValueFromStatLines(lines, activeTags);
    });
    inputs.passiveEffects.forEach(effect => {
        if (effect.stat === 'gemLevel') passive += Number(effect.val) || 0;
        GEM_LEVEL_TAG_RULES.forEach(rule => {
            if (effect.stat === rule.stat && activeTags.includes(rule.tag)) passive += Number(effect.val) || 0;
        });
    });
    (game.actRewardBonuses || []).forEach(entry => {
        if (entry.stat === 'gemLevel') reward += entry.value;
    });
    (game.journalBonuses || []).forEach(entry => {
        if (entry && entry.stat === 'gemLevel') reward += entry.value;
    });
    reward += getTalismanGemBonusSources(activeTags);
    const result = { gear: gear, passive: passive, reward: reward, total: gear + passive + reward };
    memo?.set(memoKey, result);
    return result;
}

function hasEquippedShield() {
    let shield = combatEquipmentStats.activeEquipment(game)['방패'];
    return !!(shield && shield.slot === '방패');
}

function canUseSkillWithCurrentEquipment(name) {
    let skill = SKILL_DB[name];
    return !skill || !skill.requiresShield || hasEquippedShield();
}

/** Add ten percent only to growth earned from reaching level 20 onward. */
function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
}

/** Growth steps, not a displayed/effective gem level. Offset supports delayed cap growth. */
function getGemLevelGrowthSteps(level, offset = 1) {
    return getGemHighLevelGrowth(Math.max(0, level - offset), Math.max(0, 19 - offset));
}

/** Skill-owned flat damage only; equipment flat damage is added by the stat pipeline. */
function getGemSpellBaseDamage(skill, level) {
    const base = skill.spellFlatBase || 0, scale = skill.spellFlatScale || 0;
    const logarithmicGrowth = getGemHighLevelGrowth(Math.log2(Math.max(1, level)) ** 2, Math.log2(19) ** 2);
    return (base * 3 + getGemLevelGrowthSteps(level) * scale + base * 0.8 * logarithmicGrowth) * getGemSpellEarlyMultiplier(skill, level);
}

/** A spell that is strong before weapons matter (중력 붕괴) starts lower: spellEarlyMul of its flat damage at gem level 1, rising
 * evenly to the full curve at spellEarlyUntil (2026-10-07 user decision: only its early game, slightly). */
function getGemSpellEarlyMultiplier(skill, level) {
    const start = Number(skill.spellEarlyMul), until = Number(skill.spellEarlyUntil);
    if (!(start > 0 && start < 1 && until > 1)) return 1;
    return start + (1 - start) * Math.min(1, Math.max(0, (level - 1) / (until - 1)));
}

function getActiveSkillStats(bonusLevel) {
    let skill = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
    if (!canUseSkillWithCurrentEquipment(game.activeSkill)) {
        game.activeSkill = '기본 공격';
        skill = SKILL_DB['기본 공격'];
    }
    if (skill && Array.isArray(skill.tags) && skill.tags.includes('summon_attack')) {
        game.activeSkill = '기본 공격';
        skill = SKILL_DB['기본 공격'];
    }
    let usesGemProgression = !!skill.isGem;
    if (!usesGemProgression && !skill.levelable) return { ...skill, baseLevel: 0, finalLevel: 0, bonusLevel: 0 };
    game.gemData = game.gemData || {};
    let gem = normalizeGemRecord((game.gemData || {})[game.activeSkill]);
    if (skill.levelable) game.gemData[game.activeSkill] = gem;
    let permanentSkyBonus = usesGemProgression && typeof getSkyTowerGemBoostLevel === 'function' ? getSkyTowerGemBoostLevel(game.activeSkill) : 0;
    let materialBonus = usesGemProgression ? gemCoreForge.effects(gem).levels + (gem.awakened ? 2 : 0) + permanentSkyBonus : 0;
    let awakenedGemLevelBonus = usesGemProgression ? getGemSkyEnhanceGemLevelBonus(game.activeSkill) : 0;
    let levelBonus = usesGemProgression ? bonusLevel : 0;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + awakenedGemLevelBonus;
    let totalLevel = gem.level + levelBonus + materialBonus + awakenedGemLevelBonus;
    let stats = { ...skill, baseLevel: gem.level, finalLevel: finalLevel, totalLevel: totalLevel, bonusLevel: bonusLevel, materialBonusLevel: materialBonus, permanentSkyBonusLevel: permanentSkyBonus };
    stats.dmg = stats.baseDmg + (getGemLevelGrowthSteps(finalLevel) * stats.dmgScale);
    stats.spd = stats.baseSpd + (getGemLevelGrowthSteps(finalLevel) * stats.spdScale);
    if (stats.critScale) stats.crit = (stats.crit || 0) + (getGemLevelGrowthSteps(finalLevel, 0) * stats.critScale);
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    stats.dmg *= qualityMul * (usesGemProgression ? gemCoreForge.effects(gem).damage : 1);
    stats.spd *= qualityMul * (usesGemProgression ? gemCoreForge.effects(gem).speed : 1);
    if (usesGemProgression && gem.level >= 20) {
        if (game.activeSkill === '연속 베기') stats.spd *= 1.2;
        if (game.activeSkill === '흡혈 타격') stats.leech *= 2;
        if (game.activeSkill === '암살자의 일격') stats.crit += 15;
    }
    if (!usesGemProgression) return stats;
    getSkyEnhancementForSkill(game.activeSkill).forEach(id => {
        let enh = GEM_SKY_ENHANCEMENTS[id];
        if (!enh) return;
        if (enh.stat === 'pctDmg') stats.dmg *= (1 + enh.val / 100);
        if (enh.stat === 'aspd') stats.spd *= (1 + enh.val / 100);
        if (enh.stat === 'crit') stats.crit += enh.val;
        if (enh.stat === 'leech') stats.leech += enh.val;
        if (enh.stat === 'targets') stats.targets = Math.min(99, Math.max(1, (stats.targets || 1) + enh.val));
        if (enh.stat === 'critDmg') stats.critDmgBonus = (stats.critDmgBonus || 0) + enh.val;
        if (enh.stat === 'ds') stats.dsBonus = (stats.dsBonus || 0) + enh.val;
        if (enh.stat === 'flatSkillDmgPct') stats.flatSkillDmgPct = (stats.flatSkillDmgPct || 0) + enh.val;
        if (enh.stat === 'leechRegenHybrid') {
            stats.leech += (enh.leechVal || 0);
            stats.regenBonus = (stats.regenBonus || 0) + (enh.regenVal || 0);
        }
        if (enh.stat === 'physIgnore') stats.physIgnoreBonus = (stats.physIgnoreBonus || 0) + enh.val;
        if (enh.stat === 'resPen') stats.resPenBonus = (stats.resPenBonus || 0) + enh.val;
        if (enh.stat === 'dotMulti' && Array.isArray(stats.tags) && stats.tags.includes('dot')) stats.dmg *= (1 + enh.val / 100);
        if (enh.stat === 'dotMultiplier' && Array.isArray(stats.tags) && stats.tags.includes('dot')) stats.dotMultiplier = (stats.dotMultiplier || 1) * (1 + enh.val / 100);
        if (enh.stat === 'hybrid') {
            stats.dmg *= (1 + enh.val / 100);
            stats.spd *= (1 + enh.val / 100);
        }
        if (enh.stat === 'awakenedDamageMul') stats.dmg *= (1 + (enh.val || 0) / 100);
        if (enh.stat === 'awakenedAspdMul') stats.spd *= (1 + (enh.val || 0) / 100);
        if (enh.stat === 'awakenedSpellFlatMul' && Array.isArray(stats.tags) && stats.tags.includes('spell')) stats.spellFlatMulBonus = (stats.spellFlatMulBonus || 0) + (enh.val || 0);
        if (enh.stat === 'awakenedNoCritDouble') {
            stats.dmg *= (1 + (enh.val || 0) / 100);
            stats.cannotCrit = true;
        }
        if (enh.penaltyDmgPct) stats.dmg *= (1 - (enh.penaltyDmgPct / 100));
        if (enh.penaltyAspdPct) stats.spd *= (1 - (enh.penaltyAspdPct / 100));
        if (enh.penaltyCrit) stats.crit = (stats.crit || 0) - enh.penaltyCrit;
        if (enh.penaltyCritDmg) stats.critDmgBonus = (stats.critDmgBonus || 0) - enh.penaltyCritDmg;
        if (enh.penaltyResPen) stats.resPenBonus = (stats.resPenBonus || 0) - enh.penaltyResPen;
    });
    let projectilePatternMode = getSkyProjectilePatternMode(game.activeSkill);
    if (projectilePatternMode) stats = applyProjectilePatternMode(stats, projectilePatternMode, '창공 각인');
    return stats;
}

safeExposeGlobals({
    hasEquippedShield, canUseSkillWithCurrentEquipment, gainGemExperience,
    getGemHighLevelGrowth, getGemLevelGrowthSteps, getGemSpellBaseDamage
});


safeExposeGlobals({ getGemResearchCollectionState, getGemResearchCost, grantGemResearchFragments, researchMissingGem, upgradeActiveGemWithCondensedSkyPower, upgradeSkyEngraveCap, normalizeSkyGemEnhancementSlots, getSkyEnhancementSlotsForSkill, getSkyEnhancementForSkill, getSkyProjectilePatternMode, isSkyEnhancementCompatibleWithSkill, applyProjectilePatternMode, getSelectedGemEngraveSlot, selectGemEngraveSlot, getFirstEmptyGemEngraveSlot, applySkyGemEnhancementToActive, toggleSkyGemEnhancement, removeSkyGemEnhancementFromActive, getSkyGemEnhancementRemoveCost, getGemSkyEnhanceGemLevelBonus, upgradeActiveGemQuality, getEquippedEnhanceableGemNames, getGemEnhanceTargetSkill, selectGemEnhanceTargetSkill, getSupportGemSkyProcessState, processSupportGemWithSkyEssence, awakenActiveGemCandidate, getSkyEnhancementUnlockId, canUseSkyEnhancement, isAwakenedSkyEnhancement, applyFossilCraft, getFossilSurplusRefiningCost, refineFossilSurplus, getFossilGuaranteedPool, applyFossilChaosCraft, restorePrimalFossil, normalizeSupportLoadout, sealSkillGem, unsealSkillGem, sealSupportGem, unsealSupportGem, sealAllInactiveSkillGems, sealAllInactiveSupportGems });


function sealSkillGem(name){ if(!name||[game.activeSkill, game.mobilitySkill].includes(name)) return addLog('활성 스킬은 봉인할 수 없습니다.','attack-monster'); if(name==='기본 공격') return addLog('기본 공격은 봉인할 수 없습니다.','attack-monster'); if((game.equippedSummonSkills||[]).includes(name)) return addLog('장착 중 소환수 젬은 봉인할 수 없습니다.','attack-monster'); game.skills=dedupeList(game.skills); game.sealedSkills=dedupeList(game.sealedSkills).filter(v=>!game.skills.includes(v)); if(!game.skills.includes(name)) return; game.skills=game.skills.filter(v=>v!==name); if(game.summonSkillCounts&&typeof game.summonSkillCounts==='object') delete game.summonSkillCounts[name]; if(!game.sealedSkills.includes(name)) game.sealedSkills.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 공격 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSkillGem(name){ game.skills=dedupeList(game.skills); game.sealedSkills=dedupeList(game.sealedSkills); if(!game.sealedSkills.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.skills.includes(name)) game.skills.push(name); game.sealedSkills=game.sealedSkills.filter(v=>v!==name); addLog(`🔓 공격 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
function sealSupportGem(name){ game.supports=dedupeList(game.supports); game.sealedSupports=dedupeList(game.sealedSupports).filter(v=>!game.supports.includes(v)); if(!game.supports.includes(name)) return; if((game.equippedSupports||[]).includes(name)) return addLog('장착 중 보조젬은 봉인할 수 없습니다.','attack-monster'); game.supports=game.supports.filter(v=>v!==name); if(!game.sealedSupports.includes(name)) game.sealedSupports.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 보조 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSupportGem(name){ game.supports=dedupeList(game.supports); game.sealedSupports=dedupeList(game.sealedSupports); if(!game.sealedSupports.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.supports.includes(name)) game.supports.push(name); game.sealedSupports=game.sealedSupports.filter(v=>v!==name); addLog(`🔓 보조 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
function sealAllInactiveSkillGems(){ (game.skills||[]).slice().forEach(name => { if(![game.activeSkill, game.mobilitySkill, '기본 공격'].includes(name) && !(game.equippedSummonSkills||[]).includes(name)) sealSkillGem(name); }); }
function sealAllInactiveSupportGems(){ (game.supports||[]).slice().forEach(name => { if(!(game.equippedSupports||[]).includes(name)) sealSupportGem(name); }); }
