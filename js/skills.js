// Skill module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.skills = {
  get db() { return window.SKILL_DB; },
  // TODO: move gem equip/enhance/support toggle handlers into here.
};

// Phase-3 extracted gem/skill progression handlers.
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
    let active = game.activeSkill;
    let gem = game.gemData[active];
    if (!gem || !SKILL_DB[active] || !SKILL_DB[active].isGem) return addLog('강화 가능한 공격 젬을 먼저 장착하세요.', 'attack-monster');
    let enhance = GEM_SKY_ENHANCEMENTS[enhanceId];
    if (!enhance) return;
    game.skyGemEnhancements = game.skyGemEnhancements || {};
    game.skyGemEnhancements[active] = Array.isArray(game.skyGemEnhancements[active]) ? game.skyGemEnhancements[active] : [];
    if (game.skyGemEnhancements[active].includes(enhanceId)) return addLog('이미 해당 젬에 적용된 특수 옵션입니다.', 'attack-monster');
    game.gemData[active] = normalizeGemRecord(game.gemData[active]);
    let cap = game.gemData[active].skyEnhanceCap || 1;
    if (game.skyGemEnhancements[active].length >= cap) return addLog(`젬 특수 옵션은 현재 최대 ${cap}개까지 부여할 수 있습니다.`, 'attack-monster');
    game.currencies.skyEssence--;
    game.skyGemEnhancements[active].push(enhanceId);
    addLog(`☁️ [${active}] 젬에 '${enhance.name}' 옵션을 부여했습니다.`, 'loot-unique');
    updateStaticUI();
}

function removeSkyGemEnhancementFromActive(enhanceId) {
    let active = game.activeSkill;
    let pool = Array.isArray(game.skyGemEnhancements && game.skyGemEnhancements[active]) ? game.skyGemEnhancements[active] : [];
    if (!pool.includes(enhanceId)) return;
    game.skyGemEnhancements[active] = pool.filter(id => id !== enhanceId);
    let enh = GEM_SKY_ENHANCEMENTS[enhanceId];
    addLog(`☁️ [${active}] ${enh ? enh.name : '각인'} 옵션을 해제했습니다.`, 'attack-monster');
    updateStaticUI();
}

function applyFossilCraft() {
    if ((game.season || 1) < 3) return addLog('미궁 제작은 시즌3부터 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.fossil || 0) <= 0) return addLog('미궁 화석이 부족합니다.', 'attack-monster');
    game.currencies.fossil--;
    let randomFossil = rndChoice(FOSSIL_DB);
    game.currencies[randomFossil.key] = (game.currencies[randomFossil.key] || 0) + 1;
    addLog(`🪨 기본 화석을 정제해 [${randomFossil.name}] 1개를 획득했습니다.`, 'loot-magic');
    updateStaticUI();
}

function getFossilExclusivePool(item) {
    let existing = new Set((item.stats || []).map(stat => stat.id));
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
    let guaranteedPool = MOD_DB.filter(mod => mod.slots.includes(item.slot) && fossil.guaranteedStats.includes(mod.id));
    if (guaranteedPool.length === 0) return addLog('해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.', 'attack-monster');

    let maxTier = getItemCraftTier(item);
    let hiddenTier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || maxTier));
    let guaranteedMinTier = Math.max(1, hiddenTier - 3);
    let guaranteedMaxTier = Math.max(1, hiddenTier);
    let guaranteed = pickWeightedMod(guaranteedPool);
    let newStats = [rollAffixValueInTierRange(guaranteed, guaranteedMinTier, guaranteedMaxTier)];

    let count = 4 + Math.floor(Math.random() * 2);
    let includeExclusive = Math.random() < (fossil.bonusExclusiveChance || 0.16);
    if (includeExclusive) {
        let exclusivePool = getFossilExclusivePool({ ...item, stats: newStats });
        if (exclusivePool.length > 0) newStats.push(rollAffixValue(pickWeightedMod(exclusivePool), maxTier));
    }
    while (newStats.length < Math.min(6, count)) {
        let blocked = new Set(newStats.map(stat => stat.id));
        let pool = MOD_DB.filter(mod => mod.slots.includes(item.slot) && !blocked.has(mod.statId || mod.id));
        if (pool.length === 0) break;
        newStats.push(rollAffixValue(pickWeightedMod(pool), maxTier));
    }
    item.stats = newStats;
    item.rarity = 'rare';
    game.currencies[fossilKey]--;
    updateItemName(item);
    addLog(`🪨 ${fossil.name} 재련 성공! 확정 옵션: [${guaranteed.statName}] (T${guaranteedMinTier}~T${guaranteedMaxTier})`, 'loot-magic');
    updateStaticUI();
}

function getItemTotalStats(item) {
    let bucket = createEmptyStatBucket();
    applyStatsToBucket(bucket, item.baseStats || []);
    applyStatsToBucket(bucket, item.stats || []);
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
    Object.values(game.equipment || {}).forEach(item => {
        if (!item) return;
        [...(item.baseStats || []), ...(item.stats || [])].forEach(stat => { if (stat.id === 'gemLevel') gear += stat.val; });
    });
    (game.passives || []).forEach(id => {
        let node = PASSIVE_TREE.nodes[id];
        let mut = game.starWedge && game.starWedge.nodeMutations ? game.starWedge.nodeMutations[id] : null;
        let statId = mut && mut.currentStat ? mut.currentStat : (node && node.stat);
        let statVal = mut && Number.isFinite(mut.currentVal) ? mut.currentVal : (node && node.val);
        if (node && statId === 'gemLevel') passive += statVal;
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
    let materialBonus = (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0);
    let finalLevel = Math.min(20, gem.level) + bonusLevel + materialBonus;
    let totalLevel = gem.level + bonusLevel + materialBonus;
    let stats = { ...skill, baseLevel: gem.level, finalLevel: finalLevel, totalLevel: totalLevel, bonusLevel: bonusLevel, materialBonusLevel: materialBonus };
    stats.dmg = stats.baseDmg + ((finalLevel - 1) * stats.dmgScale);
    stats.spd = stats.baseSpd + ((finalLevel - 1) * stats.spdScale);
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
        if (enh.stat === 'physIgnore') stats.physIgnoreBonus = (stats.physIgnoreBonus || 0) + enh.val;
        if (enh.stat === 'resPen') stats.resPenBonus = (stats.resPenBonus || 0) + enh.val;
        if (enh.stat === 'dotMulti' && Array.isArray(stats.tags) && stats.tags.includes('dot')) stats.dmg *= (1 + enh.val / 100);
        if (enh.stat === 'hybrid') {
            stats.dmg *= (1 + enh.val / 100);
            stats.spd *= (1 + enh.val / 100);
        }
    });
    return stats;
}


safeExposeGlobals({ upgradeActiveGem, upgradeSkyEngraveCap, applySkyGemEnhancementToActive, removeSkyGemEnhancementFromActive, normalizeSupportLoadout, sealSkillGem, unsealSkillGem, sealSupportGem, unsealSupportGem });


function sealSkillGem(name){ if(!name||name===game.activeSkill) return addLog('활성 스킬은 봉인할 수 없습니다.','attack-monster'); if(name==='기본 공격') return addLog('기본 공격은 봉인할 수 없습니다.','attack-monster'); if(!game.skills.includes(name)) return; game.skills=game.skills.filter(v=>v!==name); game.sealedSkills=Array.isArray(game.sealedSkills)?game.sealedSkills:[]; if(!game.sealedSkills.includes(name)) game.sealedSkills.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 공격 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSkillGem(name){ game.sealedSkills=Array.isArray(game.sealedSkills)?game.sealedSkills:[]; if(!game.sealedSkills.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.skills.includes(name)) game.skills.push(name); game.sealedSkills=game.sealedSkills.filter(v=>v!==name); addLog(`🔓 공격 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
function sealSupportGem(name){ if(!game.supports.includes(name)) return; if((game.equippedSupports||[]).includes(name)) return addLog('장착 중 보조젬은 봉인할 수 없습니다.','attack-monster'); game.supports=game.supports.filter(v=>v!==name); game.sealedSupports=Array.isArray(game.sealedSupports)?game.sealedSupports:[]; game.sealedSupports.push(name); game.resonancePower=(game.resonancePower||10)+1; addLog(`🔒 보조 젬 봉인: ${name} (공명력 +1)`,'loot-magic'); updateStaticUI(); }
function unsealSupportGem(name){ game.sealedSupports=Array.isArray(game.sealedSupports)?game.sealedSupports:[]; if(!game.sealedSupports.includes(name)) return; if((game.resonancePower||0)<=0) return addLog('공명력이 부족합니다.','attack-monster'); game.resonancePower--; if (!game.supports.includes(name)) game.supports.push(name); game.sealedSupports=game.sealedSupports.filter(v=>v!==name); addLog(`🔓 보조 젬 해제: ${name} (공명력 -1)`,'loot-normal'); updateStaticUI(); }
