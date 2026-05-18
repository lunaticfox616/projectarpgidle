// Skill module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.skills = {
  get db() { return window.SKILL_DB; },
  // TODO: move gem equip/enhance/support toggle handlers into here.
};

// Phase-3 extracted gem/skill progression handlers.

function getGemEngraverLevelForUnlocks() {
    return typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1;
}

function getSkyEnhancementUnlockLevel(enhanceId) {
    if (['sky_fury', 'sky_swiftness', 'sky_precision', 'sky_blood', 'sky_tempest', 'sky_keen', 'sky_blitz', 'sky_harmony', 'sky_sunder', 'sky_pierce'].includes(enhanceId)) return 1;
    const byLevel = {
        sky_gemcraft_edge: 2, sky_gemcraft_swift: 3, sky_gemcraft_focus: 4, sky_gemcraft_pierce: 5, sky_gemcraft_break: 6,
        sky_gemcraft_vigor: 7, sky_gemcraft_echo: 8, sky_gemcraft_hybrid: 9, sky_gemcraft_dot: 10, sky_gemcraft_critical: 11,
        sky_awakened_force: 12, sky_awakened_surge: 12, sky_awakened_focus: 13, sky_awakened_overdrive: 14, sky_awakened_resonance: 15
    };
    return byLevel[enhanceId] || 6;
}

function canUseSkyEnhancement(enhanceId) {
    return getGemEngraverLevelForUnlocks() >= getSkyEnhancementUnlockLevel(enhanceId);
}

function isAwakenedSkyEnhancement(enhanceId) {
    return String(enhanceId || '').startsWith('sky_awakened');
}

function upgradeActiveGem(materialKey, amount) {
    if ((game.season || 1) < 2) return addLog('아직 시즌 전용 젬 강화가 잠겨 있습니다.', 'attack-monster');
    let active = game.activeSkill;
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    let isBossCore = materialKey === 'bossCore';
    let levelKey = isBossCore ? 'bossCoreLevel' : 'skyCoreLevel';
    let currentLevel = Number.isFinite(gem[levelKey]) ? gem[levelKey] : 0;
    if (currentLevel >= 5) return addLog(isBossCore ? '군주의 핵 강화는 최대 5레벨입니다.' : '창공의 힘 강화는 최대 5레벨입니다.', 'attack-monster');
    let need = currentLevel + 1;
    if ((game.currencies[materialKey] || 0) < need) return addLog(`강화 재료가 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies[materialKey] -= need;
    gem[levelKey] = currentLevel + 1;
    let totalLevel = gem.level + (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', isBossCore ? 'boss_core_upgrade' : 'sky_core_upgrade');
    if (isBossCore) addLog(`💎 [${active}] 군주의 핵 강화 ${gem.bossCoreLevel}/5 (소모 ${need}). 총 레벨 ${totalLevel}`, 'loot-unique');
    else addLog(`☁️ [${active}] 창공의 힘 강화 ${gem.skyCoreLevel}/5 (소모 ${need}). 총 레벨 ${totalLevel}`, 'loot-unique');
    updateStaticUI();
}

function upgradeSkyEngraveCap() {
    if ((game.season || 1) < 4) return addLog('창공 각인 확장은 시즌4부터 가능합니다.', 'attack-monster');
    let active = game.activeSkill;
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    if ((gem.skyEnhanceCap || 1) >= 5) return addLog('창공 각인 슬롯은 최대 5개입니다.', 'attack-monster');
    let need = gem.skyEnhanceCap + 1;
    if ((game.currencies.skyEssence || 0) < need) return addLog(`창공의 힘이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.skyEssence -= need;
    gem.skyEnhanceCap = Math.min(5, gem.skyEnhanceCap + 1);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'engrave_slot_expand');
    addLog(`☁️ [${active}] 창공 각인 슬롯이 ${gem.skyEnhanceCap}개로 확장되었습니다. (소모 ${need})`, 'loot-unique');
    updateStaticUI();
}

function getSkyEnhancementForSkill(skillName) {
    let pool = (game.skyGemEnhancements && game.skyGemEnhancements[skillName]) || [];
    return Array.isArray(pool) ? pool : [];
}

function applySkyGemEnhancementToActive(enhanceId) {
    if ((game.season || 1) < 4) return addLog('창공의 힘은 시즌4부터 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.skyEssence || 0) <= 0) return addLog('창공의 힘이 부족합니다.', 'attack-monster');
    if (!canUseSkyEnhancement(enhanceId)) return addLog(`해당 각인은 젬 각인사 Lv.${getSkyEnhancementUnlockLevel(enhanceId)}에 해금됩니다.`, 'attack-monster');
    let active = game.activeSkill;
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    let enhance = GEM_SKY_ENHANCEMENTS[enhanceId];
    if (!enhance) return;
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    game.skyGemEnhancements = game.skyGemEnhancements || {};
    game.skyGemEnhancements[active] = Array.isArray(game.skyGemEnhancements[active]) ? game.skyGemEnhancements[active] : [];
    if (game.skyGemEnhancements[active].includes(enhanceId)) return addLog('이미 해당 젬에 적용된 특수 옵션입니다.', 'attack-monster');
    // 각성 각인은 각성 젬 전용이 아니라 모든 공격 젬에 부여할 수 있습니다.
    // 각성 젬 상태는 별도의 보너스(+2 젬 레벨/슬롯 보정)만 제공합니다.
    if (isAwakenedSkyEnhancement(enhanceId) && game.skyGemEnhancements[active].some(id => isAwakenedSkyEnhancement(id))) {
        return addLog('각성 각인은 각성 젬 여부와 관계없이 모든 공격 젬에 부여할 수 있지만, 젬당 1개만 가능합니다.', 'attack-monster');
    }
    let cap = game.gemData[active].skyEnhanceCap || 1;
    if (game.skyGemEnhancements[active].length >= cap) return addLog(`젬 특수 옵션은 현재 최대 ${cap}개까지 부여할 수 있습니다.`, 'attack-monster');
    game.currencies.skyEssence--;
    game.skyGemEnhancements[active].push(enhanceId);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'engrave_apply');
    addLog(`☁️ [${active}] 젬에 '${enhance.name}' 옵션을 부여했습니다.`, 'loot-unique');
    updateStaticUI();
}

function removeSkyGemEnhancementFromActive(enhanceId) {
    if (getGemEngraverLevelForUnlocks() < 7) return addLog('각인 자유 해제는 젬 각인사 Lv.7에 해금됩니다.', 'attack-monster');
    let active = game.activeSkill;
    let pool = Array.isArray(game.skyGemEnhancements && game.skyGemEnhancements[active]) ? game.skyGemEnhancements[active] : [];
    if (!pool.includes(enhanceId)) return;
    game.skyGemEnhancements[active] = pool.filter(id => id !== enhanceId);
    let enh = GEM_SKY_ENHANCEMENTS[enhanceId];
    addLog(`☁️ [${active}] ${enh ? enh.name : '각인'} 옵션을 해제했습니다.`, 'attack-monster');
    updateStaticUI();
}


function upgradeActiveGemQuality() {
    let gemLv = getGemEngraverLevelForUnlocks();
    if (gemLv < 8) return addLog('젬 퀄리티 강화는 젬 각인사 Lv.8에 해금됩니다.', 'attack-monster');
    let active = game.activeSkill;
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    if ((gem.quality || 0) >= 20) return addLog('젬 퀄리티는 최대 20%입니다.', 'attack-monster');
    let discount = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('gemQualityCostReducePct') || 0) / 100 : 0;
    let need = Math.max(1, Math.floor((1 + Math.floor((gem.quality || 0) / 5)) * (1 - discount)));
    if ((game.currencies.bossCore || 0) < need) return addLog(`군주의 핵이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.bossCore -= need;
    gem.quality = Math.min(20, (gem.quality || 0) + 1);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'boss_core_upgrade');
    addLog(`💎 [${active}] 퀄리티 +1% (현재 ${gem.quality}%, 소모 ${need})`, 'loot-unique');
    updateStaticUI();
}


function processSupportGemWithSkyEssence(name) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let gemLv = getGemEngraverLevelForUnlocks();
    if (gemLv < 5) return addLog('보조 젬 창공 가공은 젬 각인사 Lv.5에 해금됩니다.', 'attack-monster');
    if (!SUPPORT_GEM_DB[name]) return addLog('가공할 보조 젬을 찾을 수 없습니다.', 'attack-monster');
    game.supports = Array.isArray(game.supports) ? game.supports : [];
    if (!game.supports.includes(name)) return addLog('보유한 보조 젬만 가공할 수 있습니다.', 'attack-monster');
    game.supportGemData = game.supportGemData || {};
    let rec = normalizeGemRecord(game.supportGemData[name] || { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
    let improvingTier = (rec.unlockedTier || 1) < 3;
    let need = improvingTier ? Math.max(1, Math.floor(rec.unlockedTier || 1) + 1) : Math.max(3, Math.ceil((rec.level || 1) / 5));
    let discount = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('inscriptionCostReducePct') || 0) / 100 : 0;
    need = Math.max(1, Math.floor(need * (1 - discount)));
    if ((game.currencies.skyEssence || 0) < need) return addLog(`창공의 힘이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.skyEssence -= need;
    if (improvingTier) {
        rec.unlockedTier = Math.min(3, Math.floor(rec.unlockedTier || 1) + 1);
        rec.activeTier = Math.max(Math.floor(rec.activeTier || 1), rec.unlockedTier);
        addLog(`☁️ 보조 젬 [${name}] 창공 가공 완료: ${rec.unlockedTier === 3 ? '상급' : '중급'} 해금 (소모 ${need})`, 'loot-unique');
    } else {
        rec.level = Math.min(30, Math.floor(rec.level || 1) + 1);
        addLog(`☁️ 보조 젬 [${name}] 숙련 가공 완료: Lv.${rec.level} (소모 ${need})`, 'loot-unique');
    }
    game.supportGemData[name] = rec;
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'support_gem_upgrade');
    if (typeof normalizeSupportLoadout === 'function') normalizeSupportLoadout(false);
    updateStaticUI();
}


function awakenActiveGemCandidate() {
    let gemLv = getGemEngraverLevelForUnlocks();
    if (gemLv < 15) return addLog('각성 후보 변환은 젬 각인사 Lv.15에 해금됩니다.', 'attack-monster');
    let active = game.activeSkill;
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('각성할 공격 젬을 먼저 장착하세요.', 'attack-monster');
    if (gem.awakened) return addLog('이미 각성 후보로 변환된 젬입니다.', 'attack-monster');
    if ((gem.level || 1) < 20) return addLog('Lv.20 이상의 공격 젬만 각성 후보로 변환할 수 있습니다.', 'attack-monster');
    let echoNeed = 3;
    if ((game.currencies.awakenedEcho || 0) < echoNeed) return addLog(`각성 잔향이 부족합니다. (필요: ${echoNeed})`, 'attack-monster');
    game.currencies.awakenedEcho -= echoNeed;
    gem.awakened = true;
    gem.skyEnhanceCap = Math.min(5, Math.max(gem.skyEnhanceCap || 1, 2));
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'engrave_apply');
    addLog(`🌌 [${active}] 각성 젬 변환 완료! 총 젬 레벨 +2 및 각인 슬롯 보정이 적용됩니다. 각성 각인은 각성 젬이 아니어도 부여할 수 있습니다.`, 'loot-unique');
    updateStaticUI();
}

function applyFossilCraft() {
    if ((game.season || 1) < 3) return addLog('미궁 제작은 시즌3부터 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.fossil || 0) <= 0) return addLog('미궁 화석이 부족합니다.', 'attack-monster');
    game.currencies.fossil--;
    let randomFossil = rndChoice(FOSSIL_DB.filter(fossil => !fossil.ancientPrimalOnly));
    game.currencies[randomFossil.key] = (game.currencies[randomFossil.key] || 0) + 1;
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'fossil_refine');
    addLog(`🪨 기본 화석을 정제해 [${randomFossil.name}] 1개를 획득했습니다.`, 'loot-magic');
    updateStaticUI();
}

function getFossilExclusivePool(item) {
    let existing = typeof getItemOccupiedExplicitModIds === 'function' ? getItemOccupiedExplicitModIds(item) : new Set((item.stats || []).map(stat => stat.id));
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

function applyFossilChaosCraft(fossilKey) {
    if ((game.season || 1) < 3) return addLog('미궁 제작은 시즌3부터 사용할 수 있습니다.', 'attack-monster');
    let fossil = FOSSIL_DB.find(entry => entry.key === fossilKey);
    if (!fossil) return;
    if ((game.currencies[fossilKey] || 0) <= 0) return addLog(`${fossil.name}이 부족합니다.`, 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (item.corrupted) return addLog('타락한 아이템은 제작할 수 없습니다.', 'attack-monster');
    let immutableIds = new Set(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item).map(stat => stat && stat.id).filter(Boolean) : []);
    let guaranteedPool = MOD_DB.filter(mod => mod.slots.includes(item.slot) && fossil.guaranteedStats.includes(mod.id) && !immutableIds.has(mod.statId || mod.id));
    if (guaranteedPool.length === 0) return addLog('해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.', 'attack-monster');

    let maxTier = getItemCraftTier(item);
    let previousChaosInfusion = item.chaosInfusion || null;
    if (previousChaosInfusion) item.chaosInfusion = null;
    let reservedInfusionCount = previousChaosInfusion ? 1 : 0;
    let hiddenTier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || maxTier));
    let guaranteedMinTier = Math.max(1, hiddenTier - 3);
    let guaranteedMaxTier = Math.max(1, hiddenTier);
    let guaranteed = pickWeightedMod(guaranteedPool);

    let lockedStats = (item.stats || []).filter(stat => stat && stat.lockedByHoney);
    let newStats = lockedStats.slice();
    let blockedIds = new Set([...immutableIds, ...newStats.map(stat => stat.id)]);
    let guaranteedRoll = rollAffixValueInTierRange(guaranteed, guaranteedMinTier, guaranteedMaxTier);
    if (!blockedIds.has(guaranteedRoll.id) && (newStats.length + reservedInfusionCount) < 6) {
        newStats.push(guaranteedRoll);
        blockedIds.add(guaranteedRoll.id);
    }

    let count = 4 + Math.floor(Math.random() * 2);
    while ((newStats.length + reservedInfusionCount) < Math.min(6, Math.max(count, lockedStats.length + 1))) {
        let pool = MOD_DB.filter(mod => mod.slots.includes(item.slot) && !blockedIds.has(mod.statId || mod.id));
        if (pool.length === 0) break;
        let roll = rollAffixValue(pickWeightedMod(pool), maxTier);
        newStats.push(roll);
        blockedIds.add(roll.id);
    }

    item.stats = newStats;
    item.rarity = 'rare';
    if (typeof rerollChaosInfusionForItem === 'function') rerollChaosInfusionForItem(item, previousChaosInfusion);
    game.currencies[fossilKey]--; if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'fossil_craft');
    updateItemName(item);
    addLog(`🪨 ${fossil.name} 재련 성공! 확정 옵션: [${guaranteed.statName}] (T${guaranteedMinTier}~T${guaranteedMaxTier})`, 'loot-magic');
    updateStaticUI();
}

function restorePrimalFossil(kind) {
    let key = kind === 'ancient' ? 'fossilAncientPrimal' : 'fossilPrimal';
    let isAncient = key === 'fossilAncientPrimal';
    let mycologistLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    if (mycologistLv < (isAncient ? 5 : 4)) return addLog(`${isAncient ? '원시 고대 화석' : '원시 화석'} 복원은 균사학자 Lv.${isAncient ? 5 : 4}에 해금됩니다.`, 'attack-monster');
    if ((game.currencies[key] || 0) <= 0) return addLog(`${ORB_DB[key] ? ORB_DB[key].name : key}이 부족합니다.`, 'attack-monster');
    game.currencies[key]--;
    let rewardLines = [];
    let baseFossilGain = isAncient ? 2 : 1;
    awardCurrency('fossil', baseFossilGain);
    rewardLines.push(`미궁 화석 +${baseFossilGain}`);
    let typed = rndChoice(FOSSIL_DB.filter(row => row.key !== 'fossilAbyssal' && !row.ancientPrimalOnly));
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
        if (currencyRoll < 0.08) { awardCurrency('divine', 1); rewardLines.push('신성한 오브 +1'); }
        else if (currencyRoll < 0.30) { awardCurrency('exalted', 1); rewardLines.push('엑잘티드 오브 +1'); }
        else { awardCurrency('chaos', 2); rewardLines.push('카오스 오브 +2'); }
    } else {
        if (currencyRoll < 0.04) { awardCurrency('exalted', 1); rewardLines.push('엑잘티드 오브 +1'); }
        else if (currencyRoll < 0.24) { awardCurrency('chaos', 1); rewardLines.push('카오스 오브 +1'); }
        else { awardCurrency('alteration', 2); rewardLines.push('변화의 오브 +2'); }
    }
    let restoreBonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('fossilRestoreRewardPct') || 0) : 0;
    let greatChance = (isAncient ? 0.16 : 0.07) + (typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('fossilRestoreGreatChancePct') || 0) / 100 : 0);
    if (restoreBonus > 0 && Math.random() < Math.min(0.75, restoreBonus / 100)) {
        awardCurrency('chaos', 1);
        rewardLines.push('복원 보너스: 카오스 +1');
    }
    if (Math.random() < greatChance) {
        let bonus = isAncient ? 'divine' : 'regal';
        awardCurrency(bonus, 1);
        rewardLines.push(`대성공: ${ORB_DB[bonus].name} +1`);
    }
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'fossil_restore');
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

function normalizeSupportLoadout(logChange) {
    let cap = getPlayerStats().suppCap;
    if ((game.equippedSupports || []).length <= cap) return false;
    let removed = game.equippedSupports.splice(cap);
    if (logChange && removed.length > 0) addLog("🟢 장착 한도가 줄어 보조 젬 일부가 자동 해제되었습니다.", "attack-monster");
    return removed.length > 0;
}

function getGemBonusSources() {
    let gear = 0;
    let passive = 0;
    let reward = 0;
    let activeSkillDef = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
    let activeTags = Array.isArray(activeSkillDef.tags) ? activeSkillDef.tags : [];
    const tagGemLevelRules = [
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
        { stat: 'aoeGemLevel', tag: 'aoe' }
    ];
    Object.values(game.equipment || {}).forEach(item => {
        if (!item) return;
        [...(item.baseStats || []), ...(item.stats || []), ...(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [])].forEach(stat => { if (stat.id === 'gemLevel') gear += stat.val; });
    });
    (game.passives || []).forEach(id => {
        let node = PASSIVE_TREE.nodes[id];
        let mut = game.starWedge && game.starWedge.nodeMutations ? game.starWedge.nodeMutations[id] : null;
        let statId = mut && mut.currentStat ? mut.currentStat : (node && node.stat);
        let statVal = mut && Number.isFinite(mut.currentVal) ? mut.currentVal : (node && node.val);
        if (node && statId === 'gemLevel') passive += statVal;
        tagGemLevelRules.forEach(rule => {
            if (node && statId === rule.stat && activeTags.includes(rule.tag)) passive += statVal;
        });
    });
    (game.actRewardBonuses || []).forEach(entry => {
        if (entry.stat === 'gemLevel') reward += entry.value;
    });
    (game.journalBonuses || []).forEach(entry => {
        if (entry && entry.stat === 'gemLevel') reward += entry.value;
    });
    return { gear: gear, passive: passive, reward: reward, total: gear + passive + reward };
}

function getActiveSkillStats(bonusLevel) {
    let skill = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
    if (!skill.isGem) return { ...skill, baseLevel: 0, finalLevel: 0, bonusLevel: 0 };
    let gem = normalizeGemRecord((game.gemData || {})[game.activeSkill]);
    let materialBonus = (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0) + (gem.awakened ? 2 : 0);
    let awakenedGemLevelBonus = 0;
    getSkyEnhancementForSkill(game.activeSkill).forEach(id => {
        let enh = GEM_SKY_ENHANCEMENTS[id];
        if (enh && enh.stat === 'awakenedGemLevel') awakenedGemLevelBonus += (enh.gemLvVal || 0);
    });
    let finalLevel = Math.min(20, gem.level) + bonusLevel + materialBonus + awakenedGemLevelBonus;
    let totalLevel = gem.level + bonusLevel + materialBonus + awakenedGemLevelBonus;
    let stats = { ...skill, baseLevel: gem.level, finalLevel: finalLevel, totalLevel: totalLevel, bonusLevel: bonusLevel, materialBonusLevel: materialBonus };
    stats.dmg = stats.baseDmg + ((finalLevel - 1) * stats.dmgScale);
    stats.spd = stats.baseSpd + ((finalLevel - 1) * stats.spdScale);
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    stats.dmg *= qualityMul;
    stats.spd *= qualityMul;
    if (gem.level >= 20) {
        if (game.activeSkill === '연속 베기') stats.spd *= 1.2;
        if (game.activeSkill === '흡혈 타격') stats.leech *= 2;
        if (game.activeSkill === '암살자의 일격') stats.crit += 15;
    }
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
    return stats;
}


safeExposeGlobals({ upgradeActiveGem, upgradeSkyEngraveCap, applySkyGemEnhancementToActive, removeSkyGemEnhancementFromActive, upgradeActiveGemQuality, processSupportGemWithSkyEssence, awakenActiveGemCandidate, getSkyEnhancementUnlockLevel, canUseSkyEnhancement, isAwakenedSkyEnhancement, applyFossilCraft, applyFossilChaosCraft, restorePrimalFossil, normalizeSupportLoadout, sealSkillGem, unsealSkillGem, sealSupportGem, unsealSupportGem, sealAllInactiveSkillGems, sealAllInactiveSupportGems });


function sealSkillGem(name){ if(!name||name===game.activeSkill) return addLog('활성 스킬은 봉인할 수 없습니다.','attack-monster'); if(name==='기본 공격') return addLog('기본 공격은 봉인할 수 없습니다.','attack-monster'); game.skills=dedupeList(game.skills); game.sealedSkills=dedupeList(game.sealedSkills).filter(v=>!game.skills.includes(v)); if(!game.skills.includes(name)) return; game.skills=game.skills.filter(v=>v!==name); if(!game.sealedSkills.includes(name)) game.sealedSkills.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 공격 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSkillGem(name){ game.skills=dedupeList(game.skills); game.sealedSkills=dedupeList(game.sealedSkills); if(!game.sealedSkills.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.skills.includes(name)) game.skills.push(name); game.sealedSkills=game.sealedSkills.filter(v=>v!==name); addLog(`🔓 공격 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
function sealSupportGem(name){ game.supports=dedupeList(game.supports); game.sealedSupports=dedupeList(game.sealedSupports).filter(v=>!game.supports.includes(v)); if(!game.supports.includes(name)) return; if((game.equippedSupports||[]).includes(name)) return addLog('장착 중 보조젬은 봉인할 수 없습니다.','attack-monster'); game.supports=game.supports.filter(v=>v!==name); if(!game.sealedSupports.includes(name)) game.sealedSupports.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 보조 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSupportGem(name){ game.supports=dedupeList(game.supports); game.sealedSupports=dedupeList(game.sealedSupports); if(!game.sealedSupports.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.supports.includes(name)) game.supports.push(name); game.sealedSupports=game.sealedSupports.filter(v=>v!==name); addLog(`🔓 보조 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
function sealAllInactiveSkillGems(){ (game.skills||[]).slice().forEach(name => { if(name!==game.activeSkill && name!=='기본 공격') sealSkillGem(name); }); }
function sealAllInactiveSupportGems(){ (game.supports||[]).slice().forEach(name => { if(!(game.equippedSupports||[]).includes(name)) sealSupportGem(name); }); }
