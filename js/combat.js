// TODO: phased extraction target. Kept for load-order compatibility in phase 1.

function coreLoop() {
    if (ensurePendingLoopHeroSelectionPrompt()) return;
    const pStats = getPlayerStats();
    tickAilments(pStats, 0.1);
    let ailmentMap = {};
    (game.playerAilments || []).forEach(ail => { ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0); });
    if (ailmentMap.chill) pStats.aspd *= 0.82;
    if (ailmentMap.shock) pStats.dr = Math.max(-40, pStats.dr - 12);
    if (isDeathOverlayOpen()) return;
    if (game.combatHalted) return;
    if (!Number.isFinite(game.runProgress) || game.runProgress < 0) game.runProgress = 0;
    if (!Number.isFinite(game.moveTimer)) game.moveTimer = 0;
    if (game.playerHp > 0 && game.playerHp < pStats.maxHp) game.playerHp = Math.min(pStats.maxHp, game.playerHp + (pStats.maxHp * (pStats.regen / 100)) * 0.1);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(game.playerEnergyShield, Math.floor(pStats.energyShield || 0)));
    if (!Number.isFinite(game.playerEsLastHitAt)) game.playerEsLastHitAt = 0;
    if ((pStats.energyShield || 0) > 0 && game.playerEnergyShield < (pStats.energyShield || 0)) {
        let sinceHit = (Date.now() - (game.playerEsLastHitAt || 0)) / 1000;
        if (sinceHit >= (pStats.energyShieldRechargeDelay || 3)) {
            let regenPerSec = (pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100);
            game.playerEnergyShield = Math.min((pStats.energyShield || 0), game.playerEnergyShield + regenPerSec * 0.1);
        }
    }

    if (game.moveTimer > 0) {
        game.moveTimer -= 0.1;
        if (game.moveTimer <= 0) {
            if (game.isTownReturning) {
                game.isTownReturning = false;
                if ((game.settings.townReturnAction || 'retry') === 'stop') {
                    game.combatHalted = true;
                    game.enemies = [];
                    game.encounterPlan = [];
                    game.encounterIndex = 0;
                    game.runProgress = 0;
                    updateStaticUI();
                    return;
                }
            }
            startEncounterRun();
        }
        return;
    }

    syncCrowdPauseState();
    let progressBefore = game.runProgress;
    advanceMapProgress(pStats);
    if (game.moveTimer <= 0 && (game.enemies || []).length === 0) {
        if (game.runProgress <= progressBefore + 0.0001) progressStallTicks++;
        else progressStallTicks = 0;
        if (progressStallTicks >= 20) {
            ensureEncounterRun();
            game.runProgress = Math.min(99.9, progressBefore + 0.4);
            progressStallTicks = 0;
        }
    } else {
        progressStallTicks = 0;
    }
    if ((game.enemies || []).length > 0) {
        tickEnemyDotEffects(pStats, 0.1);
        pTimer += 0.1 * pStats.aspd;
        while (pTimer >= 1.0 && game.enemies.length > 0) {
            pTimer -= 1.0;
            performPlayerAttack(pStats);
            let dsChance = Math.max(0, pStats.ds || 0);
            let guaranteedExtra = Math.floor(dsChance / 100);
            let extraRemainder = dsChance - (guaranteedExtra * 100);
            let extraHits = guaranteedExtra + ((Math.random() * 100 < extraRemainder) ? 1 : 0);
            for (let chain = 0; chain < extraHits && game.enemies.length > 0; chain++) {
                if (game.settings.showCombatLog) addLog(`⚔️ [연속 타격] ${chain + 2}연속 공격!`, "loot-rare", { rateKey: 'combat:double-strike', minIntervalMs: 220, aggregateKey: 'combat:double-strike', aggregateWindowMs: 500 });
                performPlayerAttack(pStats);
            }
        }
        performMonsterAttacks(pStats);
    }
    let zoneNow = getZone(game.currentZoneId);
    if ((game.season || 1) >= 9 && zoneNow && zoneNow.type === 'abyss') {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        if (v.active && Math.random() < 0.20 && game.runProgress < 99.5 && game.killsInZone < (zoneNow.maxKills || 1)) {
            let alive = (game.enemies || []).filter(e => e.hp > 0).length;
            if (alive < 12) {
                let spawn = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < spawn; i++) game.enemies.push(createEnemy(zoneNow, { elite: Math.random() < 0.2, boss: false }));
                if (game.settings.showSpawnLog !== false) addLog(`🕳️ 균열 증식: 추가 몬스터 ${spawn}마리!`, 'attack-monster');
            }
        }
    }
    let currentZone = getZone(game.currentZoneId);
    if (currentZone && currentZone.type === 'act' && game.runProgress >= 100) {
        let currentStoryAct = getStoryActByZoneId(currentZone.id);
        let hasBossAlive = (game.enemies || []).some(enemy => enemy.isBoss && enemy.hp > 0);
        if (hasBossAlive && currentStoryAct && currentStoryAct.specialType === 'loop_gate' && handleStoryActSpecialDefeat(currentZone, pStats)) return;
    }
    if (game.playerHp > 0) applyTrialTrapTick(pStats);
    if (game.playerHp <= 0) {
        handlePlayerDefeat(getZone(game.currentZoneId), pStats, "☠️ 상태이상으로 쓰러졌습니다.", { fatalElement: 'other', sourceName: '상태이상' });
        return;
    }
    syncCrowdPauseState();

    if (game.runProgress >= 100 && game.encounterIndex >= game.encounterPlan.length && game.enemies.length === 0) finishEncounterRun();
}


safeExposeGlobals({ coreLoop });

// Phase-3 extracted core combat runtime block.
function getPlayerStats() {
    const safePassives = Array.isArray(game.passives) ? game.passives : [];
    const safeSeasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    const safeAscendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    const safeRewardBonuses = Array.isArray(game.actRewardBonuses) ? game.actRewardBonuses : [];
    const safeJournalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    const safeEquippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let baseDmg = 8 + (game.level * 1.5);
    let baseHp = 90 + (game.level * 8);
    let baseMove = 100;
    let glovePairAspdBonus = 0;
    let glove1 = game.equipment ? game.equipment['장갑1'] : null;
    let glove2 = game.equipment ? game.equipment['장갑2'] : null;
    if (glove1 && glove2 && glove1.baseId && glove2.baseId && glove1.baseId === glove2.baseId) glovePairAspdBonus = 0.1;

    let gearBase = createEmptyStatBucket();
    let gearExplicit = createEmptyStatBucket();
    let passive = createEmptyStatBucket();
    let support = createEmptyStatBucket();
    let season = createEmptyStatBucket();
    let ascend = createEmptyStatBucket();
    let reward = createEmptyStatBucket();
    let starBlessing = createEmptyStatBucket();

    let localDefenseTotals = { armor: 0, evasion: 0, energyShield: 0 };
    Object.values(game.equipment || {}).forEach(item => {
        if (!item) return;
        applyStatsToBucket(gearBase, item.baseStats || []);
        applyStatsToBucket(gearExplicit, item.stats || []);
        let itemBaseArmor = 0, itemBaseEvasion = 0, itemBaseEs = 0;
        let itemFlatArmor = 0, itemFlatEvasion = 0, itemFlatEs = 0;
        let itemPctArmor = 0, itemPctEvasion = 0, itemPctEs = 0;
        (item.baseStats || []).forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemBaseArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemBaseEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemBaseEs += Number(stat.val || 0);
        });
        (item.stats || []).forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemFlatArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemFlatEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemFlatEs += Number(stat.val || 0);
            if (stat.id === 'armorPct') itemPctArmor += Number(stat.val || 0);
            if (stat.id === 'evasionPct') itemPctEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShieldPct') itemPctEs += Number(stat.val || 0);
        });
        localDefenseTotals.armor += (itemBaseArmor + itemFlatArmor) * (1 + itemPctArmor / 100);
        localDefenseTotals.evasion += (itemBaseEvasion + itemFlatEvasion) * (1 + itemPctEvasion / 100);
        localDefenseTotals.energyShield += (itemBaseEs + itemFlatEs) * (1 + itemPctEs / 100);
        if (item.voidSocket && item.voidSocket.open && item.voidSocket.jewel) {
            getJewelStats(item.voidSocket.jewel).forEach(stat => addStatToBucket(gearExplicit, stat.id, stat.val));
        }
    });
    game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [0, 0];
    (game.jewelSlots || []).forEach((jewel, idx) => {
        let amp = Math.max(0, Math.floor((game.jewelSlotAmplify[idx] || 0)));
        let ampMul = 1 + (amp * 0.03);
        getJewelStats(jewel).forEach(stat => addStatToBucket(gearExplicit, stat.id, Math.round(stat.val * ampMul)));
    });

    recalculateStarWedgeMutations();
    let mutationMap = (game.starWedge && game.starWedge.nodeMutations) || {};
    safePassives.forEach(id => {
        let node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        let mut = mutationMap[id];
        if (mut && mut.currentStat) addStatToBucket(passive, mut.currentStat, mut.currentVal);
        else addStatToBucket(passive, node.stat, node.val);
    });

    safeSeasonNodes.forEach(id => {
        let node = SEASON_NODES[id];
        if (node) addStatToBucket(season, node.stat, node.val);
    });

    if (game.ascendClass) {
        let tree = getClassTreeDef(game.ascendClass);
        safeAscendNodes.forEach(id => {
            let node = tree[id];
            if (node) addStatToBucket(ascend, node.stat, node.val);
        });
    }
    safeRewardBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    let loop10Bonus = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    let loopDeep = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    addStatToBucket(reward, 'flatHp', (loop10Bonus.flatHp || 0) * 12);
    addStatToBucket(reward, 'flatDmg', (loop10Bonus.flatDmg || 0) * 3);
    addStatToBucket(reward, 'aspd', (loop10Bonus.aspd || 0) * 1.5);
    addStatToBucket(reward, 'move', (loop10Bonus.move || 0) * 1.0);
    addStatToBucket(reward, 'flatHp', (loopDeep.flatHp || 0) * 10);
    addStatToBucket(reward, 'flatDmg', (loopDeep.flatDmg || 0) * 2);
    addStatToBucket(reward, 'aspd', (loopDeep.aspd || 0) * 1.2);
    addStatToBucket(reward, 'move', (loopDeep.move || 0) * 0.8);
    addStatToBucket(reward, 'dr', (loopDeep.dr || 0) * 0.5);
    addStatToBucket(reward, 'crit', (loopDeep.crit || 0) * 0.6);
    safeJournalBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    let heroDef = getHeroSelectionDef(game.selectedHeroId);
    (heroDef.stats || []).forEach(row => {
        if (row && row.stat) addStatToBucket(reward, row.stat, row.value);
    });
    if (game.passiveStarEvolution) {
        Object.keys(PASSIVE_STAR_BLESSING).forEach(statId => addStatToBucket(starBlessing, statId, PASSIVE_STAR_BLESSING[statId]));
    }
    Object.values(game.talismanPlacements || {}).forEach(entry => {
        if (entry && entry.talisman && entry.talisman.stat) addStatToBucket(reward, entry.talisman.stat, entry.talisman.value);
    });

    let gemSources = getGemBonusSources();
    safeEquippedSupports.forEach(name => {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return;
        let activeTier = Math.max(1, Math.min(3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
        let effectiveLevel = Math.max(1, gem.level + gemSources.total);
        let val = (db.baseVal + ((effectiveLevel - 1) * db.scale)) * tierMul;
        addStatToBucket(support, db.stat, val);
    });

    if (game.shrineBuff && Date.now() > (game.shrineBuff.expiresAt || 0)) game.shrineBuff = null;
    if (game.shrineBuff && game.shrineBuff.stat) addStatToBucket(reward, game.shrineBuff.stat, game.shrineBuff.value || 0);
    let skill = getActiveSkillStats(gemSources.total);
    let targetBonus = (gearBase.targetAny + gearExplicit.targetAny + passive.targetAny + season.targetAny + ascend.targetAny + reward.targetAny);
    if (Array.isArray(skill.tags) && skill.tags.includes('projectile')) targetBonus += (gearBase.targetProjectile + gearExplicit.targetProjectile + passive.targetProjectile + season.targetProjectile + ascend.targetProjectile + reward.targetProjectile);
    if (Array.isArray(skill.tags) && skill.tags.includes('slam')) targetBonus += (gearBase.targetSlam + gearExplicit.targetSlam + passive.targetSlam + season.targetSlam + ascend.targetSlam + reward.targetSlam);
    if (targetBonus > 0) skill.targets = Math.min(6, Math.max(1, (skill.targets || 1) + Math.floor(targetBonus)));
    else skill.targets = Math.min(6, Math.max(1, skill.targets || 1));
    let gearTagged = getTaggedDamageBreakdown(gearBase, skill);
    let gearExplicitTagged = getTaggedDamageBreakdown(gearExplicit, skill);
    let passiveTagged = getTaggedDamageBreakdown(passive, skill);
    let seasonTagged = getTaggedDamageBreakdown(season, skill);
    let ascendTagged = getTaggedDamageBreakdown(ascend, skill);
    let supportTagged = getTaggedDamageBreakdown(support, skill);
    let rewardTagged = getTaggedDamageBreakdown(reward, skill);
    let starTagged = getTaggedDamageBreakdown(starBlessing, skill);

    let taggedTotal = gearTagged.total + gearExplicitTagged.total + passiveTagged.total + seasonTagged.total + ascendTagged.total + supportTagged.total + rewardTagged.total + starTagged.total;
    let taggedParts = [].concat(gearTagged.parts, gearExplicitTagged.parts, passiveTagged.parts, seasonTagged.parts, ascendTagged.parts, supportTagged.parts, rewardTagged.parts, starTagged.parts);
    let taggedMap = {};
    taggedParts.forEach(part => {
        let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === part.statId);
        if (!tag) return;
        taggedMap[tag] = (taggedMap[tag] || 0) + part.value;
    });
    let taggedSummary = Object.keys(taggedMap).map(tag => `${translateSkillTag(tag)} ${Math.floor(taggedMap[tag])}%`);

    let gearFlatDmg = gearBase.flatDmg + gearExplicit.flatDmg;
    let passiveFlatDmg = passive.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    let isSpellSkill = Array.isArray(skill.tags) && skill.tags.includes('spell');
    let isDotSkill = Array.isArray(skill.tags) && skill.tags.includes('dot');
    let spellFlatDmg = 0;
    if (isSpellSkill) {
        let skillLevel = Number.isFinite(skill.finalLevel) ? skill.finalLevel : 1;
        let spellBase = Number.isFinite(skill.spellFlatBase) ? skill.spellFlatBase : 0;
        let spellScale = Number.isFinite(skill.spellFlatScale) ? skill.spellFlatScale : 0;
        let logBoost = Math.log2(Math.max(1, skillLevel));
        spellFlatDmg = Math.max(1, (spellBase * 3) + Math.max(0, skillLevel - 1) * spellScale + (spellBase * 0.8 * logBoost * logBoost));
    }
    let totalFlatDmg = isSpellSkill ? spellFlatDmg : (baseDmg + gearFlatDmg + passiveFlatDmg);
    let codexBonusRatio = 1 + (getCodexBonusPct() / 100);
    let finalBaseDmg = Math.floor(totalFlatDmg * (1 + (generalPctDmg + taggedTotal) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio);

    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);

    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd;
    let rawAspd = (1.0 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    let finalAspd = rawAspd <= 5 ? rawAspd : (5 + Math.pow(Math.max(0, rawAspd - 5), 0.72));
    finalAspd = Math.min(12, finalAspd);

    let gearCrit = gearBase.crit + gearExplicit.crit;
    let passiveCrit = passive.crit + season.crit + ascend.crit + reward.crit;
    let finalCrit = Math.min(100, (5 + gearCrit + passiveCrit + support.crit + (skill.crit || 0)) * 0.82);
    let finalMove = baseMove + gearBase.move + gearExplicit.move + passive.move + season.move + ascend.move + support.move + reward.move + starBlessing.move;
    
    let gearArmor = localDefenseTotals.armor;
    let gearEvasion = localDefenseTotals.evasion;
    let gearEnergyShield = localDefenseTotals.energyShield;
    let totalArmorPct = passive.armorPct + season.armorPct + ascend.armorPct + reward.armorPct;
    let totalEvasionPct = passive.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct;
    let totalEnergyShieldPct = passive.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.4, 3 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor((2 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 3.1)));
    let armorReduction = Math.min(90, (finalArmor / (finalArmor + referenceIncomingPhysical * 10)) * 100);
    let enemyAccuracy = Math.max(60, Math.floor(90 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 24));
    let evadeChance = Math.min(90, (finalEvasion / (finalEvasion + enemyAccuracy)) * 100);

    let finalCritDmg = 150 + gearBase.critDmg + gearExplicit.critDmg + passive.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0);
    let finalLeech = ((skill.leech || 0) + gearBase.leech + gearExplicit.leech + passive.leech + season.leech + ascend.leech + support.leech + reward.leech) * 0.45;
    let finalDr = Math.min(75, gearBase.dr + gearExplicit.dr + passive.dr + season.dr + ascend.dr + support.dr + reward.dr);
    let finalPhysIgnore = gearBase.physIgnore + gearExplicit.physIgnore + passive.physIgnore + season.physIgnore + ascend.physIgnore + support.physIgnore + reward.physIgnore + (skill.physIgnoreBonus || 0);
    let finalDs = (gearBase.ds + gearExplicit.ds + passive.ds + season.ds + ascend.ds + support.ds + reward.ds) * 0.75;
    let finalRegen = gearBase.regen + gearExplicit.regen + passive.regen + season.regen + ascend.regen + support.regen + reward.regen;
    let finalRegenSuppress = gearBase.regenSuppress + gearExplicit.regenSuppress + passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + support.regenSuppress + reward.regenSuppress;
    let finalResPen = gearBase.resPen + gearExplicit.resPen + passive.resPen + season.resPen + ascend.resPen + support.resPen + reward.resPen + (skill.resPenBonus || 0);
    let finalMinDmgRoll = Math.max(5, 80 + gearBase.minDmgRoll + gearExplicit.minDmgRoll + passive.minDmgRoll + season.minDmgRoll + ascend.minDmgRoll + support.minDmgRoll + reward.minDmgRoll);
    let finalMaxDmgRoll = Math.max(finalMinDmgRoll, 100 + gearBase.maxDmgRoll + gearExplicit.maxDmgRoll + passive.maxDmgRoll + season.maxDmgRoll + ascend.maxDmgRoll + support.maxDmgRoll + reward.maxDmgRoll);

    let resistPenalty = (game.maxZoneId >= 5 ? 30 : 0) + (game.maxZoneId >= 10 ? 30 : 0);
    let finalResF = Math.min(75, gearBase.resF + gearExplicit.resF + passive.resF + season.resF + ascend.resF + reward.resF - resistPenalty);
    let finalResC = Math.min(75, gearBase.resC + gearExplicit.resC + passive.resC + season.resC + ascend.resC + reward.resC - resistPenalty);
    let finalResL = Math.min(75, gearBase.resL + gearExplicit.resL + passive.resL + season.resL + ascend.resL + reward.resL - resistPenalty);
    let finalResChaos = Math.min(75, gearBase.resChaos + gearExplicit.resChaos + passive.resChaos + season.resChaos + ascend.resChaos + reward.resChaos - resistPenalty);
    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(finalBaseDmg * hpScaleRatio);
    finalBaseDmg = Math.floor(finalBaseDmg + hpFlatBonus);
    let regenScaledBonus = 1 + Math.max(0, finalRegen * (skill.regenDmgScale || 0) / 100);
    let fireResScaledBonus = 1 + Math.max(0, finalResF * (skill.fireResDmgScale || 0));
    let dotMultiplier = skill.dotMultiplier || 1;
    let dotStatMultiplier = isDotSkill ? (1 + Math.max(0, dotPctDmg) / 100) : 1;
    let totalDotDamageMultiplier = dotMultiplier * dotStatMultiplier;
    finalBaseDmg = Math.floor(finalBaseDmg * regenScaledBonus * fireResScaledBonus);
    let damageScales = {
        hpFlatBonus: hpFlatBonus,
        hpScaleRatio: hpScaleRatio,
        regen: regenScaledBonus,
        fireRes: fireResScaledBonus,
        dot: dotMultiplier,
        dotStat: dotStatMultiplier
    };
    let suppCap = 2 + gearBase.suppCap + gearExplicit.suppCap + passive.suppCap + season.suppCap + ascend.suppCap + reward.suppCap;

    let critChance = finalCrit / 100;
    let critMulti = finalCritDmg / 100;
    let avgHit = finalBaseDmg * (1 - critChance) + finalBaseDmg * critChance * critMulti;
    let finalDps = avgHit * finalAspd;

    let breakdowns = {
        atk: {
            title: '공격력',
            lines: [
                isSpellSkill ? `주문 내장 피해 ${Math.floor(spellFlatDmg)}` : `기본 공격력 ${Math.floor(baseDmg)}`,
                isSpellSkill ? null : makeSourceLine('장비', gearFlatDmg),
                isSpellSkill ? null : makeSourceLine('패시브', passiveFlatDmg),
                makeSourceLine('성좌 각성', starBlessing.pctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('총 피해 증가', generalPctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('태그 보너스', taggedTotal, '%', value => `${Math.floor(value)}%`),
                taggedSummary.length > 0 ? `적용 태그: ${taggedSummary.join(' / ')}` : null,
                `스킬 배율 ${formatPercentMultiplier(skill.dmg || 1)}`,
                (skill.hpDmgScale || 0) > 0 ? `생명력 비례 추가 공격력 +${Math.floor(hpFlatBonus)} (최대 생명력 ${Math.floor(finalMaxHp)})` : null,
                (skill.regenDmgScale || 0) > 0 ? `재생 계수 배율 ${regenScaledBonus.toFixed(2)}x (재생 ${formatValue('regen', finalRegen)}%)` : null,
                (skill.fireResDmgScale || 0) > 0 ? `화염 저항 계수 배율 ${fireResScaledBonus.toFixed(2)}x (화염 저항 ${Math.floor(finalResF)}%)` : null,
                (skill.dotMultiplier || 1) !== 1 ? `스킬 지속 피해 배율 ${dotMultiplier.toFixed(2)}x` : null,
                isDotSkill && dotPctDmg > 0 ? `지속 피해 배율 스탯 ${Math.floor(dotPctDmg)}% (${dotStatMultiplier.toFixed(2)}x)` : null,
                `피해 범위 ${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalBaseDmg)}`
        },
        aps: {
            title: '공속',
            lines: [
                `기본 1.00`,
                makeSourceLine('장비', gearAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passiveAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.aspd, '%', value => `${Math.floor(value)}%`),
                glovePairAspdBonus > 0 ? `동형 장갑 세트 보너스 +${glovePairAspdBonus.toFixed(2)} 기본 공속` : null,
                `스킬 속도 배율 ${formatPercentMultiplier(skill.spd || 1)}`,
                rawAspd > 5 ? `소프트캡 적용중 (원시 ${rawAspd.toFixed(2)} → 최종 ${finalAspd.toFixed(2)})` : null
            ].filter(Boolean),
            final: `${finalAspd.toFixed(2)}`
        },
        crit: {
            title: '치명타 확률',
            lines: [
                `기본 5.0%`,
                makeSourceLine('장비', gearCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passiveCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support.crit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('스킬', skill.crit || 0, '%', value => `${value.toFixed(1)}%`)
            ].filter(Boolean),
            final: `${finalCrit.toFixed(1)}%`
        },
        critDmg: {
            title: '치명타 피해',
            lines: [
                `기본 150%`,
                makeSourceLine('장비', gearBase.critDmg + gearExplicit.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.critDmg + season.critDmg + ascend.critDmg + reward.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.critDmg, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalCritDmg)}%`
        },
        move: {
            title: '이동 속도',
            lines: [
                `기본 100%`,
                makeSourceLine('장비', gearBase.move + gearExplicit.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.move + season.move + ascend.move + reward.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('성좌 각성', starBlessing.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.move, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalMove)}%`
        },
        hp: {
            title: '최대 생명력',
            lines: [
                `기본 생명력 ${Math.floor(baseHp)}`,
                makeSourceLine('장비', gearFlatHp),
                makeSourceLine('패시브', passiveFlatHp),
                makeSourceLine('성좌 각성', starBlessing.flatHp),
                makeSourceLine('생명력 증가', totalPctHp, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalMaxHp)}`
        },
        regen: {
            title: '초당 재생',
            lines: [
                makeSourceLine('장비', gearBase.regen + gearExplicit.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('패시브', passive.regen + season.regen + ascend.regen + reward.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('보조 젬', support.regen, '%', value => `${formatValue('regen', value)}%`)
            ].filter(Boolean),
            final: `${formatValue('regen', finalRegen)}%`
        },
        regenSuppress: {
            title: '재생 억제',
            lines: [
                makeSourceLine('장비', gearBase.regenSuppress + gearExplicit.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('패시브', passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + reward.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('보조 젬', support.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                '공격 시 적의 생명력 재생을 해당 수치(%)만큼 줄여주는 옵션입니다.'
            ].filter(Boolean),
            final: `${formatValue('regenSuppress', finalRegenSuppress)}%`
        },
        leech: {
            title: '흡혈',
            lines: [
                makeSourceLine('스킬', skill.leech || 0, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('장비', gearBase.leech + gearExplicit.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('패시브', passive.leech + season.leech + ascend.leech + reward.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('보조 젬', support.leech, '%', value => `${formatValue('leech', value)}%`)
            ].filter(Boolean),
            final: `${formatValue('leech', finalLeech)}%`
        },
        ds: {
            title: '연속 타격',
            lines: [
                makeSourceLine('장비', gearBase.ds + gearExplicit.ds, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.ds + season.ds + ascend.ds + reward.ds, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.ds, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalDs)}%`
        },
        dr: {
            title: '물리 피해 감소',
            lines: [
                makeSourceLine('장비', gearBase.dr + gearExplicit.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.dr + season.dr + ascend.dr + reward.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.dr, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalDr)}%`
        },
        armor: {
            title: '방어도',
            lines: [
                makeSourceLine('장비', gearBase.armor + gearExplicit.armor),
                makeSourceLine('패시브', passive.armor + season.armor + ascend.armor + reward.armor),
                makeSourceLine('방어도 증가', totalArmorPct, '%', value => `${Math.floor(value)}%`),
                `예상 물리 피해 감소율(기준 타격 ${Math.floor(referenceIncomingPhysical)}): ${armorReduction.toFixed(1)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalArmor)}`
        },
        evasion: {
            title: '회피',
            lines: [
                makeSourceLine('장비', gearBase.evasion + gearExplicit.evasion),
                makeSourceLine('패시브', passive.evasion + season.evasion + ascend.evasion + reward.evasion),
                makeSourceLine('회피 증가', totalEvasionPct, '%', value => `${Math.floor(value)}%`),
                `예상 회피 확률(동일 레벨 적 기준): ${evadeChance.toFixed(1)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalEvasion)}`
        },
        energyShield: {
            title: '에너지 보호막',
            lines: [
                makeSourceLine('장비', gearBase.energyShield + gearExplicit.energyShield),
                makeSourceLine('패시브', passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield),
                makeSourceLine('보호막 증가', totalEnergyShieldPct, '%', value => `${Math.floor(value)}%`),
                `재충전 대기시간: ${finalEnergyShieldRechargeDelay.toFixed(2)}초`,
                `에너지 보호막 재생량: 초당 ${Math.floor(finalEnergyShield * (finalEnergyShieldRegenRate / 100))} (${finalEnergyShieldRegenRate.toFixed(1)}%)`
            ].filter(Boolean),
            final: `${Math.floor(finalEnergyShield)}`
        },
        physIgnore: {
            title: '물리 피해 감소 무시',
            lines: [
                makeSourceLine('장비', gearBase.physIgnore + gearExplicit.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.physIgnore + season.physIgnore + ascend.physIgnore + reward.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.physIgnoreBonus || 0, '%', value => `${Math.floor(value)}%`),
                '적의 양수 물리 피해 감소만 0%까지 깎습니다.'
            ].filter(Boolean),
            final: `${Math.floor(finalPhysIgnore)}%`
        },
        resPen: {
            title: '저항 관통',
            lines: [
                makeSourceLine('장비', gearBase.resPen + gearExplicit.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resPen + season.resPen + ascend.resPen + reward.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.resPenBonus || 0, '%', value => `${Math.floor(value)}%`),
                '원소/카오스 저항은 음수까지 떨어질 수 있으며, 음수만큼 추가 피해를 줍니다.'
            ].filter(Boolean),
            final: `${Math.floor(finalResPen)}%`
        },
        resF: {
            title: '화염 저항',
            lines: [
                makeSourceLine('장비', gearBase.resF + gearExplicit.resF, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resF + season.resF + ascend.resF + reward.resF, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResF)}%`
        },
        resC: {
            title: '냉기 저항',
            lines: [
                makeSourceLine('장비', gearBase.resC + gearExplicit.resC, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resC + season.resC + ascend.resC + reward.resC, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResC)}%`
        },
        resL: {
            title: '번개 저항',
            lines: [
                makeSourceLine('장비', gearBase.resL + gearExplicit.resL, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resL + season.resL + ascend.resL + reward.resL, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResL)}%`
        },
        resChaos: {
            title: '카오스 저항',
            lines: [
                makeSourceLine('장비', gearBase.resChaos + gearExplicit.resChaos, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resChaos + season.resChaos + ascend.resChaos + reward.resChaos, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResChaos)}%`
        },
        dmgRoll: {
            title: '피해 보정 범위',
            lines: [
                makeSourceLine('최소', finalMinDmgRoll, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('최대', finalMaxDmgRoll, '%', value => `${Math.floor(value)}%`)
            ],
            final: `${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
        },
        dps: {
            title: 'DPS',
            lines: [
                `평균 한 방 ${Math.floor(avgHit)}`,
                `공격 속도 ${finalAspd.toFixed(2)}`,
                `치명 기대값 반영`
            ],
            final: `${Math.floor(finalDps)}`
        },
        gem: {
            title: '젬 레벨 보너스',
            lines: [
                makeSourceLine('패시브', gemSources.passive + gemSources.reward),
                makeSourceLine('장비', gemSources.gear)
            ].filter(Boolean),
            final: `총 +${gemSources.total}`
        }
    };

    return {
        baseDmg: finalBaseDmg,
        maxHp: finalMaxHp,
        aspd: finalAspd || 1.0,
        crit: finalCrit,
        moveSpeed: finalMove,
        dps: finalDps || 0,
        critDmg: finalCritDmg,
        regen: finalRegen,
        regenSuppress: finalRegenSuppress,
        leech: finalLeech,
        dr: finalDr,
        physIgnore: finalPhysIgnore,
        ds: finalDs,
        minDmgRoll: finalMinDmgRoll,
        maxDmgRoll: finalMaxDmgRoll,
        gemLv: gemSources.total,
        gemBonusSources: gemSources,
        glovePairAspdBonus: glovePairAspdBonus,
        suppCap: suppCap,
        expGain: season.expGain,
        sSkill: skill,
        resPen: finalResPen,
        resF: finalResF,
        resC: finalResC,
        resL: finalResL,
        resChaos: finalResChaos,
        resistPenalty: resistPenalty,
        dotDamageScale: totalDotDamageMultiplier,
        damageScales: damageScales,
        armor: finalArmor,
        evasion: finalEvasion,
        energyShield: finalEnergyShield,
        armorReduction: armorReduction,
        evadeChance: evadeChance,
        energyShieldRegenRate: finalEnergyShieldRegenRate,
        energyShieldRechargeDelay: finalEnergyShieldRechargeDelay,
        breakdowns: breakdowns
    };
}

function getGemPresentation(name, isSupport) {
    let stats = getPlayerStats();
    if (isSupport) {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: '정의되지 않은 보조젬', statName: name, statId: null };
        let totalLevel = Math.max(1, gem.level + stats.gemBonusSources.total);
        let val = db.baseVal + ((totalLevel - 1) * db.scale);
        let activeTier = Math.max(1, Math.min(3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
        return { baseLevel: gem.level, totalLevel: totalLevel, value: val * tierMul, desc: db.desc, statName: db.name, statId: db.stat, activeTier: activeTier };
    }
    let db = SKILL_DB[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: '정의되지 않은 스킬', skill: SKILL_DB['기본 공격'], tags: ['attack'] };
    if (!db.isGem) return { baseLevel: 0, totalLevel: 0, desc: db.desc, statName: name, skill: db, tags: getSkillTagList(db) };
    let gem = normalizeGemRecord((game.gemData || {})[name]);
    let materialBonus = (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0);
    let totalLevel = gem.level + stats.gemBonusSources.total + materialBonus;
    let finalLevel = Math.min(20, gem.level) + stats.gemBonusSources.total + materialBonus;
    let skill = { ...db };
    skill.dmg = skill.baseDmg + ((finalLevel - 1) * skill.dmgScale);
    skill.spd = skill.baseSpd + ((finalLevel - 1) * skill.spdScale);
    return { baseLevel: gem.level, totalLevel: totalLevel, finalLevel: finalLevel, materialBonus: materialBonus, bossCoreLevel: gem.bossCoreLevel || 0, skyCoreLevel: gem.skyCoreLevel || 0, skyEnhanceCap: gem.skyEnhanceCap || 1, desc: db.desc, skill: skill, tags: getSkillTagList(skill) };
}

function getSkillTargets(pStats) {
    let alive = (game.enemies || []).filter(enemy => enemy.hp > 0);
    if (alive.length === 0) return [];
    let skill = pStats.sSkill;
    let targetCount = Math.max(1, skill.targets || 1);
    if (skill.targetMode === 'all') return alive.slice(0, Math.min(8, Math.max(6, skill.targets || 6))).map(enemy => ({ enemy: enemy, mult: 1 }));
    if (skill.targetMode === 'whirl') {
        return alive.slice(0, targetCount).map((enemy, idx) => ({
            enemy: enemy,
            mult: idx === 0 ? 1 : (idx < 3 ? 0.82 : (idx < 5 ? 0.68 : 0.56))
        }));
    }
    if (skill.targetMode === 'cleave') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.72 }));
    if (skill.targetMode === 'chain') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: Math.max(0.45, 1 - idx * 0.2) }));
    if (skill.targetMode === 'pierce') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.65 }));
    if (targetCount > 1) return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.7 }));
    return [{ enemy: alive[0], mult: 1 }];
}




function rollEnemyTrait(zone, isElite, isBoss, seed) {
    if (!isElite && !isBoss) return null;
    let list = ENEMY_TRAIT_POOL.slice();
    if (zone && zone.type === 'trial' && zone.id === 'trial_3') {
        list = list.filter(trait => trait.id !== 'bloodless');
    }
    if (zone && zone.type === 'trial' && zone.id === 'trial_4') {
        list = list.map(trait => trait.id === 'bloodless' ? { id: 'leechResist_trial4', name: '흡혈저항', leechEffMul: 0.45, expMul: trait.expMul, dropMul: trait.dropMul } : trait);
    }
    if (zone.ele === 'fire') list.unshift({ id: 'fireWard+', name: '화염 과충전', resF: 36 });
    if (zone.ele === 'cold') list.unshift({ id: 'coldWard+', name: '빙결 과충전', resC: 36 });
    if (zone.ele === 'light') list.unshift({ id: 'lightWard+', name: '뇌전 과충전', resL: 36 });
    if (zone.ele === 'chaos') list.unshift({ id: 'chaosWard+', name: '공허 장막', resChaos: 32 });
    let idx = Math.abs(seed || 0) % list.length;
    return { ...list[idx] };
}

function getEnemyElementResistance(skillEle, zoneTier, enemy) {
    let baseRes = 0;
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light') baseRes = Math.min(32, zoneTier * 3);
    else if (skillEle === 'chaos') baseRes = Math.min(22, zoneTier * 2.2);
    if (!enemy) return baseRes;
    if (skillEle === 'fire') return baseRes + (enemy.resF || 0);
    if (skillEle === 'cold') return baseRes + (enemy.resC || 0);
    if (skillEle === 'light') return baseRes + (enemy.resL || 0);
    if (skillEle === 'chaos') return baseRes + (enemy.resChaos || 0);
    if (skillEle === 'phys') return baseRes + (enemy.dr || 0);
    return baseRes;
}

function getEffectiveEnemyMitigation(skillEle, zoneTier, enemy, pStats) {
    let rawMitigation = getEnemyElementResistance(skillEle, zoneTier, enemy);
    if (skillEle === 'phys') {
        let cappedReduction = Math.max(0, Math.min(80, rawMitigation));
        if (cappedReduction > 0) cappedReduction = Math.max(0, cappedReduction - Math.max(0, pStats.physIgnore || 0));
        if (rawMitigation < 0) return rawMitigation;
        return cappedReduction;
    }
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light' || skillEle === 'chaos') {
        let effective = rawMitigation - Math.max(0, pStats.resPen || 0);
        if (effective > 0) effective = Math.min(80, effective);
        return effective;
    }
    return Math.min(80, rawMitigation);
}

function createEnemy(zone, marker, groupIndex) {
    let seasonDepth = Math.max(0, (game.season || 1) - 1);
    let tierProgress = clampNumber(((zone.tier || 1) - 1) / 18, 0, 1);
    let seasonHpScale = 1 + seasonDepth * (0.08 + (tierProgress * 0.52));
    let lateGameHpScale = 1 + (tierProgress * 9);
    let hp = Math.floor(((56 + zone.tier * 30) * 1.15) * seasonHpScale * lateGameHpScale);
    let loopHpScale = 1 + Math.max(0, (game.loopCount || 0) * 0.12);
    hp = Math.floor(hp * loopHpScale);
    let abyssScale = getAbyssMonsterScales(zone);
    let isBoss = !!marker.boss;
    let isElite = !!marker.elite && !isBoss;
    let abyssDepth = zone.type === 'abyss' ? Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1)) : 0;
    if (zone.type === 'abyss' && !isElite && !isBoss) {
        let hpRamp = Math.min(0.20, Math.max(0, abyssDepth - 1) * 0.015);
        hp = Math.floor(hp * (1 + hpRamp));
    }
    if (isElite) hp = Math.floor(hp * (1.4 + Math.max(0, (game.loopCount || 0) * 0.05)));
    if (isBoss) hp = Math.floor(hp * (2.4 + zone.tier * 0.6));
    if (isBoss) hp = Math.floor(hp * (1 + (tierProgress * 4)));
    hp = Math.floor(hp * (abyssScale.hpMul || 1) * (isBoss ? (abyssScale.bossMul || 1) : 1));
    if (game.beehive && game.beehive.inRun) {
        let empower = Math.max(0, Math.floor(game.beehive.enemyEmpower || 0));
        if (empower > 0) hp = Math.floor(hp * (1 + empower * 0.08));
    }
    let enemyElePool = zone.ele === 'chaos' ? ['fire','cold','light','chaos'] : ['phys', zone.ele || 'phys', 'fire', 'cold', 'light', 'chaos'];
    let enemyEle = rndChoice(enemyElePool);
    let eleIcon = enemyEle === 'fire' ? '🔥' : (enemyEle === 'cold' ? '❄️' : (enemyEle === 'light' ? '⚡' : (enemyEle === 'chaos' ? '☠️' : '🩸')));
    let name = `${eleIcon} ${zone.name.split(':')[0]} 추종자`;
    if (isElite) name = `정예 ${name}`;
    if (isBoss) {
        let bossName = zone.type === 'trial' ? `${zone.name} 수호자` : (zone.type === 'seasonBoss' ? zone.name : (zone.type === 'meteor' ? '검은 별의 심장' : (ACT_BOSS_NAMES[zone.id] || `${zone.name.split(':')[0]} 지배자`)));
        name = `👿 ${bossName}`;
    }
    let zoneSeed = Number.isFinite(zone.id) ? zone.id : hashSeed(zone.id || zone.name || 'zone');
    let variantSeed = ((zoneSeed + 1) * 37 + (marker.at || 0) * 13 + groupIndex * 17) % 997;
    let trait = rollEnemyTrait(zone, isElite, isBoss, variantSeed);
    if (trait && trait.hpMul) hp = Math.floor(hp * trait.hpMul);
    let isSky = (game.season || 1) >= 4 && zone.type === 'abyss' && !isBoss && Math.random() < 0.08;
    if (isSky) name = `☁️ ${name}`;
    return {
        id: game.nextEnemyId++,
        hp: hp,
        maxHp: hp,
        name: name,
        isElite: isElite,
        isBoss: isBoss,
        attackTimer: (((zoneSeed + 1) * 13 + (marker.at || 0) * 3 + groupIndex * 7) % 10) / 20,
        spawnAt: marker.at,
        groupIndex: groupIndex,
        variantSeed: variantSeed,
        ele: enemyEle,
        dr: Math.max(0, Math.floor(zone.tier * 0.8) + (trait && trait.dr ? trait.dr : 0)),
        resF: (trait && trait.resF ? trait.resF : 0) + (abyssScale.resistBonus || 0),
        resC: (trait && trait.resC ? trait.resC : 0) + (abyssScale.resistBonus || 0),
        resL: (trait && trait.resL ? trait.resL : 0) + (abyssScale.resistBonus || 0),
        resChaos: (trait && trait.resChaos ? trait.resChaos : 0) + (abyssScale.resistBonus || 0),
        atkMul: trait && trait.atkMul ? trait.atkMul : 1,
        attackSpeedVar: (0.85 + (((variantSeed % 11) / 10) * 0.5)) * (trait && trait.attackSpeedVarMul ? trait.attackSpeedVarMul : 1),
        critChance: ((game.season || 1) >= 2 ? (isBoss ? 16 : isElite ? 10 : 4) : 0) + (trait && trait.critChanceBonus ? trait.critChanceBonus : 0),
        regenRate: ((game.season || 1) >= 3 ? (isBoss ? 0.004 : (isElite ? 0.0022 : 0.0012)) : 0) * 0.12,
        regenSuppressPct: 0,
        penetration: (game.season || 1) >= 4 ? (isBoss ? 14 : (isElite ? 8 : 3)) : 0,
        hybridElement: (game.season || 1) >= 3 ? rndChoice(['fire', 'cold', 'light', 'chaos']) : null,
        ailmentChance: (game.season || 1) >= 4 ? (isBoss ? 0.14 : (isElite ? 0.08 : 0.03)) : 0,
        firstHitGuard: (game.season || 1) >= 5 ? (isBoss ? 0.75 : ((trait && trait.firstHitGuard) || 0)) : 0,
        hitRateGuard: (game.season || 1) >= 5 ? ((trait && trait.hitRateGuard) || (isBoss ? 0.06 : 0)) : 0,
        recentHitsTaken: 0,
        recentHitsTimer: 0,
        patternMode: (game.season || 1) >= 6 && isBoss ? rndChoice(['burst', 'ramp', 'slam']) : null,
        traitName: trait ? trait.name : null,
        leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1,
        expMul: trait && Number.isFinite(trait.expMul) ? Math.max(1, trait.expMul) : 1,
        dropMul: trait && Number.isFinite(trait.dropMul) ? Math.max(1, trait.dropMul) : 1,
        isSky: isSky
    };
}

function getZoneEncounterProfile(zone) {
    if (zone.type === 'meteor') return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 1, bossAdds: 2, label: '운석' };
    if (zone.type === 'trial') return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: '시련' };
    if (zone.type === 'seasonBoss') return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: '보스' };
    if (zone.type === 'labyrinth') {
        let floor = Math.max(1, zone.floor || 1);
        let minPack = 2 + Math.floor(floor / 10);
        let maxPack = Math.min(9, minPack + 2);
        return { markerCount: 5 + Math.floor(floor / 5), minPack: minPack, maxPack: maxPack, eliteChance: Math.min(0.46, 0.14 + floor * 0.009), bossAdds: floor % 5 === 0 ? 2 : 1, label: `미궁 ${floor}층` };
    }
    if (zone.type === 'abyss') {
        let abyssScale = getAbyssMonsterScales(zone);
        let minPack = 2 + Math.floor(zone.tier / 7);
        let maxPack = Math.min(10, 4 + Math.floor(zone.tier * 0.42));
        minPack = Math.max(1, Math.floor(minPack * (abyssScale.hordeMul || 1)));
        maxPack = Math.max(minPack, Math.floor(maxPack * (abyssScale.hordeMul || 1)));
        return {
            markerCount: Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (abyssScale.mapLengthMul || 1))),
            minPack: minPack,
            maxPack: maxPack,
            eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (abyssScale.eliteBonus || 0)),
            bossAdds: 2 + Math.floor(zone.tier / 4),
            label: `${minPack}-${maxPack}기`
        };
    }
    let minPack = 1;
    let maxPack = Math.min(3, 1 + Math.floor((zone.id + 2) / 3));
    return {
        markerCount: 3 + Math.floor(zone.tier * 0.8),
        minPack: minPack,
        maxPack: maxPack,
        eliteChance: 0.05 + zone.tier * 0.015,
        bossAdds: zone.tier >= 4 ? 1 : 0,
        label: `${minPack}-${maxPack}기`
    };
}

function generateEncounterPlan(zone) {
    if (zone.type === 'meteor') return [{ at: 36, count: 2, elite: true }, { at: 76, count: 3, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.type === 'trial') return [{ at: 18, count: 1, elite: true }, { at: 54, count: 2, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.id === 's6_beast_cerberus') {
        return [
            { at: 33, count: 3, boss: true, phase: 1 },
            { at: 66, count: 2, boss: true, phase: 2 },
            { at: 100, count: 1, boss: true, phase: 3 }
        ];
    }
    if (zone.type === 'seasonBoss') return [{ at: 100, count: 1, boss: true }];
    let profile = getZoneEncounterProfile(zone);
    let rng = zone.type === 'act' ? createSeededRng(`act:${zone.id}`) : Math.random;
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
        let at = Math.floor(((i + 1) / (profile.markerCount + 1)) * 96 + (rng() * 8 - 4));
        let spread = profile.maxPack - profile.minPack;
        let count = profile.minPack + Math.floor(Math.pow(rng(), 0.78) * (spread + 1));
        markers.push({
            at: clampNumber(at, 6, 94),
            count: clampNumber(count, profile.minPack, profile.maxPack),
            elite: rng() < profile.eliteChance
        });
    }
    markers.push({ at: 100, count: 1 + profile.bossAdds, boss: true });
    markers.sort((a, b) => a.at - b.at);
    return markers;
}

function resetBattleRuntimeVisuals() {
    battleFx = [];
    battleFxId = 0;
    battleVisualState = {
        projectiles: [],
        damageTexts: [],
        skillProjectiles: [],
        skillEffects: [],
        skillPlayback: null,
        lastAutoSwingId: 0,
        lastAutoSkillAt: 0,
        processedFxIds: new Set(),
        enemyGhostPos: {},
        playerPos: null,
        playerAdvanceBlend: 0,
        playerAttackBlend: 0,
        playerHurtBlend: 0,
        playerDownBlend: 0,
        lastNow: 0,
        advanceDesired: false,
        advanceChangedAt: 0
    };
    crowdPauseActive = false;
    trialHazardTimer = 0;
}

function reserveBattleSlot(usedSlots) {
    let slotSet = usedSlots instanceof Set ? usedSlots : new Set();
    for (let i = 0; i < BATTLE_SLOT_ORDER.length; i++) {
        if (!slotSet.has(BATTLE_SLOT_ORDER[i])) return BATTLE_SLOT_ORDER[i];
    }
    let fallback = 0;
    while (slotSet.has(fallback)) fallback++;
    return fallback;
}

function primeTrialHazardTimer(zone) {
    if (!zone || zone.type !== 'trial') {
        trialHazardTimer = 0;
        return;
    }
    trialHazardTimer = 1.8 + Math.random() * 1.6;
}

function isCrowdProgressPaused() {
    if (game.moveTimer > 0) return false;
    return (game.enemies || []).filter(enemy => enemy.hp > 0).length >= ENEMY_CROWD_PAUSE_LIMIT;
}

function getDotStackMultiplier(stacks) {
    let safeStacks = Math.max(1, Math.min(DOT_STACK_MAX, Math.floor(stacks || 1)));
    return Math.pow(1 + DOT_STACK_GROWTH_PER_STACK, safeStacks - 1);
}

function applyEnemyDotFromHit(enemy, hitDamage, pStats) {
    if (!enemy || enemy.hp <= 0) return;
    let prev = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
    let nextStacks = Math.min(DOT_STACK_MAX, Math.max(0, (prev && prev.stacks) || 0) + 1);
    let stackMultiplier = getDotStackMultiplier(nextStacks);
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let baseTick = Math.max(1, Math.floor(Math.max(1, hitDamage) * DOT_TICK_FROM_HIT_RATIO * dotDamageScale));
    let nextRawTickDamage = Math.max(1, Math.floor(baseTick * stackMultiplier));
    enemy.dotState = {
        stacks: nextStacks,
        rawTickDamage: Math.max(nextRawTickDamage, (prev && prev.rawTickDamage) || 0),
        tickTimer: (prev && Number.isFinite(prev.tickTimer)) ? Math.min(prev.tickTimer, DOT_TICK_INTERVAL) : DOT_TICK_INTERVAL,
        timeLeft: DOT_EFFECT_DURATION,
        ele: (pStats && pStats.sSkill && pStats.sSkill.ele) || 'chaos',
        skillName: game.activeSkill || 'dot'
    };
    enemy.dotStacks = nextStacks;
}

function tickEnemyDotEffects(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        let dotState = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
        if (!dotState) return;
        dotState.timeLeft = Math.max(0, (dotState.timeLeft || 0) - dt);
        dotState.tickTimer = (dotState.tickTimer || DOT_TICK_INTERVAL) - dt;
        while (dotState.tickTimer <= 0 && dotState.timeLeft > 0 && enemy.hp > 0) {
            dotState.tickTimer += DOT_TICK_INTERVAL;
            let dotEle = dotState.ele || 'chaos';
            let enemyRes = getEffectiveEnemyMitigation(dotEle, zoneTier, enemy, pStats);
            let dotDmg = Math.max(1, Math.floor((dotState.rawTickDamage || 1) * (1 - (enemyRes / 100))));
            dotDmg = Math.max(1, Math.floor(dotDmg * abyssPlayerMul));
            let hpAfterDot = Math.max(0, enemy.hp - dotDmg);
            if (enemy.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop()))) {
                hpAfterDot = Math.max(1, hpAfterDot);
            }
            enemy.hp = hpAfterDot;
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(dotEle), damage: dotDmg, duration: 240, element: dotEle });
            if (enemy.hp <= 0) {
                handleEnemyDeath(enemy, pStats);
                break;
            }
        }
        if (dotState.timeLeft <= 0 || enemy.hp <= 0) {
            enemy.dotState = null;
            enemy.dotStacks = 0;
        }
    });
}

function syncCrowdPauseState() {
    let paused = isCrowdProgressPaused();
    if (paused === crowdPauseActive) return paused;
    crowdPauseActive = paused;
    if (game.settings.showCrowdPauseLog !== false) {
        if (paused) addLog(`⛔ 적이 ${ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 맵 진행이 멈췄습니다. 적 수를 줄이면 다시 전진합니다.`, 'attack-monster');
        else addLog('🧭 적 숫자가 줄어 맵 진행을 재개합니다.', 'loot-normal');
    }
    return paused;
}

function startEncounterRun() {
    pTimer = 0;
    progressStallTicks = 0;
    game.runProgress = 0;
    game.encounterIndex = 0;
    let zone = getZone(game.currentZoneId) || getZone(0);
    resetBattleRuntimeVisuals();
    primeTrialHazardTimer(zone);
    game.encounterPlan = generateEncounterPlan(zone);
    game.enemies = [];
}

function startMoving(isTown) {
    pTimer = 0;
    progressStallTicks = 0;
    resetBattleRuntimeVisuals();
    let ms = getPlayerStats().moveSpeed;
    if (!Number.isFinite(ms) || ms <= 0) ms = 100;
    let time = Math.max(0.5, 1.2 * (100 / ms));
    game.moveTotalTime = time;
    game.moveTimer = time;
    game.isTownReturning = !!isTown;
    game.combatHalted = false;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.playerAilments = [];
}

function returnToTown() {
    if (game.isTownReturning && game.moveTimer > 0) return;
    let pStats = getPlayerStats();
    game.playerHp = pStats.maxHp;
    game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    pTimer = 0;
    addLog("⛺ 마을 귀환", "season-up");
    startMoving(true);
    updateStaticUI();
}

function ensureEncounterRun() {
    if (game.moveTimer <= 0 && (!game.encounterPlan || game.encounterPlan.length === 0)) startEncounterRun();
}

function spawnEncounterMarker(marker) {
    let zone = getZone(game.currentZoneId);
    let count = marker.count || 1;
    let isCerberus = zone && zone.id === 's6_beast_cerberus';
    let usedSlots = new Set((game.enemies || []).map(enemy => enemy.battleSlot).filter(slot => Number.isFinite(slot)));
    if (marker.boss) {
        for (let i = 0; i < Math.max(0, count - 1); i++) {
            let enemy = createEnemy(zone, { ...marker, boss: false, elite: true }, i);
            if (isCerberus) {
                enemy.name = `👿 케르베로스 머리 ${Math.max(1, (count - i))}`;
                if (marker.phase === 1) enemy.ele = ['cold', 'fire', 'light'][i % 3];
                else enemy.ele = 'phys';
                enemy.atkMul *= 1.55;
                enemy.penetration += 12;
                enemy.critChance += marker.phase >= 2 ? 10 : 0;
            }
            enemy.battleSlot = reserveBattleSlot(usedSlots);
            usedSlots.add(enemy.battleSlot);
            enemy.spawnStamp = performance.now();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 360, boss: false });
        }
        let bossEnemy = createEnemy(zone, { ...marker, count: 1 }, count);
        let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
        if (storyAct && storyAct.specialType === 'forced_defeat') {
            let now = performance.now();
            bossEnemy.forcedDefeatBoss = true;
            bossEnemy.nextForcedRegenAt = now + 5000;
            bossEnemy.forcedDoomAt = now + 10000;
        }
        if (isCerberus) {
            bossEnemy.name = marker.phase === 3 ? '👿 케르베로스 본체' : `👿 케르베로스 머리`;
            bossEnemy.ele = marker.phase === 1 ? 'fire' : 'phys';
            bossEnemy.atkMul *= marker.phase === 3 ? 2.1 : 1.7;
            bossEnemy.penetration += 18;
            bossEnemy.critChance += marker.phase >= 2 ? 14 : 0;
            bossEnemy.hybridElement = marker.phase === 3 ? 'chaos' : bossEnemy.hybridElement;
        }
        bossEnemy.battleSlot = reserveBattleSlot(usedSlots);
        usedSlots.add(bossEnemy.battleSlot);
        bossEnemy.spawnStamp = performance.now();
        game.enemies.push(bossEnemy);
        addBattleFx('enemySpawn', { enemyId: bossEnemy.id, color: getElementColor(bossEnemy.ele), duration: 460, boss: true });
        if (game.settings.showSpawnLog !== false) {
            addLog(`👑 '${bossEnemy.name.replace(/^👿\s*/, '')}' 등장.`, "loot-unique");
            if (isCerberus && marker.phase === 1) addLog('🐺 케르베로스 1페이즈: 냉기/화염/번개 머리 3개', 'attack-monster');
            if (isCerberus && marker.phase === 2) addLog('🐺 케르베로스 2페이즈: 물리 머리 2개 (치명/연속공격 강화)', 'attack-monster');
            if (isCerberus && marker.phase === 3) addLog('🐺 케르베로스 3페이즈: 본체 (브레스/헬파이어/몸통박치기)', 'attack-monster');
        }
    } else {
        for (let i = 0; i < count; i++) {
            let enemy = createEnemy(zone, marker, i);
            enemy.battleSlot = reserveBattleSlot(usedSlots);
            usedSlots.add(enemy.battleSlot);
            enemy.spawnStamp = performance.now();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 320, boss: false });
        }
        if (game.settings.showSpawnLog !== false) addLog(`⚠️ 적 ${count}마리 참전`, marker.elite ? "loot-rare" : "attack-monster");
    }
    addBattleFx('spawnWave', { count: count, boss: !!marker.boss, duration: 420 });
}

function advanceMapProgress(pStats) {
    if (game.moveTimer > 0) return;
    ensureEncounterRun();
    if (game.runProgress >= 100) return;
    if (isCrowdProgressPaused()) return;
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    let enemyCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let baseGain = zone.type === 'trial' ? 0.26 : (zone.type === 'abyss' ? 0.42 : 0.36);
    let crowdPenalty = enemyCount > 0 ? Math.max(0.4, 1 - enemyCount * 0.13) : 0.94;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let gain = baseGain * 0.5 * (moveSpeed / 100) * crowdPenalty * (abyssScale.mapProgressMul || 1);
    game.runProgress = Math.min(100, game.runProgress + gain);
    while (game.encounterIndex < game.encounterPlan.length && game.runProgress >= game.encounterPlan[game.encounterIndex].at) {
        spawnEncounterMarker(game.encounterPlan[game.encounterIndex]);
        game.encounterIndex++;
    }
}

function grantExpAndGem(enemy, pStats) {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    let abyssDepth = zone.type === 'abyss' ? Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1)) : 0;
    let exp = Math.floor((14 + zone.tier * 10) * (1 + game.season * 0.35));
    if (enemy.isElite) exp = Math.floor(exp * 1.8);
    if (enemy.isBoss) exp = Math.floor(exp * Math.max(3, zone.tier * 1.5));
    exp = Math.floor(exp * (enemy.expMul || 1));
    exp = Math.floor(exp * (1 + (pStats.expGain / 100)) * (abyssScale.expMul || 1));
    if (abyssDepth > 1) {
        let depthExpDampen = Math.max(0.68, 1 - (abyssDepth - 1) * 0.012);
        exp = Math.floor(exp * depthExpDampen);
    }
    game.exp += exp;
    if (game.settings.showExpLog) addLog(`✨ 경험치 +${exp}`, "exp-txt");

    let gemExp = Math.floor(exp * 0.45);
    if (pStats.sSkill.isGem && game.gemData[game.activeSkill] && game.gemData[game.activeSkill].level < 20) {
        let gem = game.gemData[game.activeSkill];
        gem.exp += gemExp;
        if (gem.exp >= getGemReqExp(gem.level)) {
            gem.level++;
            gem.exp = 0;
            addLog(`✨ 젬 [${game.activeSkill}] 레벨업!`, "loot-unique");
        }
    }
    (game.equippedSupports || []).forEach(name => {
        let gem = game.supportGemData[name];
        if (gem && gem.level < 20) {
            gem.exp += gemExp;
            if (gem.exp >= getGemReqExp(gem.level)) {
                gem.level++;
                gem.exp = 0;
                addLog(`🟢 젬 [${name}] 레벨업!`, "loot-rare");
            }
        }
    });

    let req = getExpReq(game.level);
    let guard = 0;
    let leveledUp = false;
    while (game.level < MAX_PLAYER_LEVEL && game.exp >= req && guard < 50) {
        game.exp -= req;
        game.level++;
        leveledUp = true;
        game.passivePoints++;
        game.noti.char = true;
        game.playerHp = getPlayerStats().maxHp;
        addLog(`🎉 레벨업! (Lv.${game.level})`, "level-up");
        req = getExpReq(game.level);
        guard++;
        checkUnlocks();
    }
    if (game.level >= MAX_PLAYER_LEVEL) game.exp = 0;
    if (leveledUp) queueImportantSave(250);
}

function rollLootForEnemy(enemy) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (Math.random() < (enemy.isBoss ? 0.15 : enemy.isElite ? 0.03 : 0.005)) {
        if (Math.random() < 0.5) {
            let available = Object.keys(SKILL_DB).filter(name => !(game.skills || []).includes(name) && SKILL_DB[name].isGem);
            if (available.length > 0) {
                let skill = rndChoice(available);
                game.skills.push(skill);
                game.gemData[skill] = { level: 1, exp: 0 };
                game.noti.skills = true;
                checkUnlocks();
                if (game.settings.showLootLog) addLog(`✨ 공격 젬 <span class='loot-magic'>[${skill}]</span> 획득!`);
            }
        } else {
            let available = Object.keys(SUPPORT_GEM_DB);
            if (available.length > 0) {
                let gem = rndChoice(available);
                let didImprove = false;
                game.supportGemData = game.supportGemData || {};
                if (!(game.supports || []).includes(gem)) {
                    game.supports.push(gem);
                    game.supportGemData[gem] = { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 };
                    didImprove = true;
                } else {
                    let record = normalizeGemRecord(game.supportGemData[gem] || { level:1, exp:0 });
                    let before = Math.max(1, Math.floor(record.unlockedTier || 1));
                    if (before < 3) {
                        record.unlockedTier = before + 1;
                        if ((record.activeTier || 1) < record.unlockedTier) record.activeTier = record.unlockedTier;
                        game.supportGemData[gem] = record;
                        didImprove = true;
                    }
                }
                if (didImprove) {
                    game.noti.skills = true;
                    checkUnlocks();
                    let tier = ((game.supportGemData[gem] || {}).unlockedTier || 1);
                    if (game.settings.showLootLog) addLog(`🟢 보조젬 <span class='loot-rare'>[${gem}]</span> 획득! (해금: ${tier >= 3 ? '상급' : tier === 2 ? '중급' : '하급'})`);
                }
            }
        }
    }

    getCurrencyDrops(enemy).forEach(drop => {
        awardCurrency(drop[0], drop[1]);
        addBattleFx('lootPickup', { enemyId: enemy.id, color: (drop[0] === 'divine' || drop[0] === 'exalted') ? '#ffd166' : '#9ad1ff', duration: 760 });
        if (drop[0] === 'divine' || drop[0] === 'exalted') addBattleFx('lootCelebration', { enemyId: enemy.id, color: '#ffcf6b', duration: 980 });
        if (game.settings.showLootLog) addLog(`🪙 ${ORB_DB[drop[0]].name} +${drop[1]}`, drop[0] === 'divine' || drop[0] === 'exalted' ? 'loot-unique' : 'loot-magic');
    });

    let itemChance = enemy.isBoss ? 0.46 : (enemy.isElite ? 0.15 : 0.04);
    itemChance *= (1 + (getCodexBonusPct() / 100));
    itemChance *= Math.max(0.2, 1 + ((getAbyssPassiveState().tenacity || 0) * 0.01));
    if (zone.type === 'abyss') {
        let abyssDepth = Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1));
        let depthDropDampen = Math.max(0.62, 1 - (abyssDepth - 1) * 0.015);
        itemChance *= depthDropDampen;
    }
    if (Math.random() < itemChance) {
        let item = generateEquipmentDrop(enemy);
        if (addItemToInventory(item) && game.settings.showLootLog) {
            addBattleFx('lootPickup', { enemyId: enemy.id, color: item.rarity === 'unique' ? '#ffb05a' : '#9ed6ff', duration: 780 });
            if (item.rarity === 'unique') addBattleFx('lootCelebration', { enemyId: enemy.id, color: '#ff9f43', duration: 1200 });
            addLog(`🛡️ <span class='loot-${item.rarity}'>[${item.name}]</span> 획득!`);
        }
    }
    if ((game.season || 1) >= 5 && (enemy.isElite || enemy.isBoss) && Math.random() < 0.056) {
        let jewel = generateJewelDrop((getZone(game.currentZoneId) || { tier: 1 }).tier || 1);
        game.jewelInventory = game.jewelInventory || [];
        if (game.jewelInventory.length >= getJewelInventoryLimit()) {
            salvageJewelObject(jewel, true);
            if (game.settings.showLootLog) addLog(`💠 주얼 인벤토리 초과로 [${jewel.name}] 자동 해체`, 'attack-monster');
        } else if (game.settings.jewelAutoSalvageEnabled && game.settings.jewelAutoSalvageRarities && game.settings.jewelAutoSalvageRarities[jewel.rarity || 'normal']) {
            salvageJewelObject(jewel, true);
            if (game.settings.showLootLog) addLog(`💠 주얼 자동해체: [${jewel.name}]`, 'loot-normal');
        } else {
            game.jewelInventory.push(jewel);
            let lineText = getJewelStats(jewel).map(stat => `${getStatName(stat.id)} +${stat.val}`).join(' / ');
            if (game.settings.showLootLog) addLog(`💠 ${getJewelRarityLabel(jewel.rarity)} 주얼 [${jewel.name}] 획득! (${lineText})`, 'loot-rare');
        }
    }
    let beeUnlocked = !!(game.beehive && game.beehive.unlockedPermanent);
    let mappingZone = zone && zone.type === 'abyss';
    if (beeUnlocked && mappingZone && !enemy.isBoss) {
        if (Math.random() < 0.10) awardCurrency('pollen', enemy.isElite ? 5 : 2);
        if (enemy.isElite && Math.random() < 0.03) awardCurrency('venomStinger', 1);
        if (enemy.isElite && Math.random() < 0.004) awardCurrency('enchantedHoney', 1);
        if (game.settings.showLootLog && Math.random() < 0.10) {
            let beeDrops = ['마력 깃든 벌꿀', '독벌침'];
            addLog(`🐝 전리품 획득: ${rndChoice(beeDrops)} x1`, 'loot-normal');
        }
    }
    if ((game.season || 1) >= 8 && mappingZone && Math.random() < (enemy.isBoss ? 0.05 : enemy.isElite ? 0.015 : 0.002)) {
        awardCurrency('hiveKey', 1);
        if (game.settings.showLootLog) addLog('🗝️ 벌집 입장권 열쇠를 발견했습니다.', 'loot-rare');
    }
}

function handleEnemyDeath(enemy, pStats) {
    let zone = getZone(game.currentZoneId);
    game.loopKills = Math.max(0, Math.floor(game.loopKills || 0)) + 1;
    addBattleFx('enemyDeath', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 420 });
    grantExpAndGem(enemy, pStats);
    rollLootForEnemy(enemy);
    gainSkyRiftGaugeFromCombat(zone, enemy);
    if (enemy.isBoss && zone && zone.type === 'act') markLoopSpecialBossKill(`act_boss_${zone.id}`);
    if ((game.season || 1) >= 9 && zone && zone.type === 'abyss') {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        if (!v.active && Math.random() < (enemy.isElite ? 0.015 : 0.004)) {
            v.active = true;
            v.activeKills = 0;
            v.requiredKills = 15 + Math.floor(Math.random() * 9);
            addLog('🕳️ 공허의 구멍이 랜덤으로 열렸습니다!', 'attack-monster');
        } else if (v.active) {
            v.activeKills = Math.max(0, Math.floor(v.activeKills || 0)) + 1;
            if (v.activeKills >= Math.max(1, Math.floor(v.requiredKills || 18))) {
                v.active = false;
                v.breachClears = (v.breachClears || 0) + 1;
                if (Math.random() < 0.20) v.grandBreachUnlock = true;
                addLog('🕳️ 균열이 안정화되어 자동으로 닫혔습니다.', 'loot-magic');
            }
        }
    }
    let equippedHeralds = (game.equippedSupports || []).map(name => {
        let db = SUPPORT_GEM_DB[name];
        if (!db || !Number.isFinite(db.heraldExplodeBase)) return null;
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let lvl = Math.max(1, gem.level + (pStats.gemLv || 0));
        return db.heraldExplodeBase + ((lvl - 1) * (db.heraldExplodeScale || 0));
    }).filter(Boolean);
    if (equippedHeralds.length > 0) {
        let explodeChance = clampNumber(equippedHeralds.reduce((a, b) => a + b, 0), 0, 0.85);
        if (Math.random() < explodeChance) {
            let splash = Math.floor((enemy.maxHp || enemy.hp || 0) * 0.10);
            (game.enemies || []).forEach(target => {
                if (!target || target.id === enemy.id || target.hp <= 0) return;
                target.hp = Math.max(0, target.hp - splash);
            });
            if (game.settings.showCombatLog) addLog(`💥 전령 시체폭발 발동! 주변 몬스터에게 ${splash} 피해`, 'attack-player');
        }
    }
    game.enemies = game.enemies.filter(entry => entry.id !== enemy.id);
    pendingHeavyUiRefresh = true;
}

function canBreakWoodsmanLoop() {
    return Math.max(0, Math.floor(game.woodsmanDefeatAttempts || 0)) >= WOODSMAN_BREAK_LOOP_REQUIRED;
}

function handleStoryActSpecialDefeat(zone, pStats) {
    let storyAct = getStoryActByZoneId(zone && zone.id);
    if (!storyAct) return false;
    if (storyAct.specialType === 'loop_gate') {
        if (canBreakWoodsmanLoop()) return false;
        game.woodsmanDefeatAttempts = Math.max(0, Math.floor(game.woodsmanDefeatAttempts || 0)) + 1;
        game.loopCount = Math.max(0, Math.floor(game.loopCount || 0)) + 1;
        addLog(`🪓 ${storyAct.clearText}`, 'death');
        addLog(`❄️ 나무꾼의 창조 권능이 세계를 되감았습니다. (루프 ${game.loopCount}/${WOODSMAN_BREAK_LOOP_REQUIRED})`, 'attack-monster');
        game.currentZoneId = 0;
        game.maxZoneId = 0;
        game.killsInZone = 0;
        game.playerHp = pStats.maxHp;
        startMoving(false);
        updateStaticUI();
        return true;
    }
    return false;
}

function finishEncounterRun() {
    let zone = getZone(game.currentZoneId);
    game.killsInZone++;

    if (zone.type === 'meteor') {
        grantMeteorEncounterRewards();
        let st = ensureStarWedgeState();
        st.entriesCleared = (st.entriesCleared || 0) + 1;
        st.activeMeteorTier = null;
        game.currentZoneId = game.maxZoneId;
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }

    if (zone.type === 'trial') {
        let isFirstClear = !game.completedTrials.includes(zone.id);
        if (isFirstClear) game.completedTrials.push(zone.id);
        if (zone.id === 'trial_4') {
            game.ascendPoints += isFirstClear ? 1 : 0;
            if (isFirstClear) {
                game.ascendRank = Math.max(game.ascendRank || 0, 4);
                addLog(`👑 [${zone.name}] 통과! 4차 전직 핵심 노드 선택권 +1 획득!`, "loot-unique");
            }
        } else {
            game.ascendPoints += 2;
            game.ascendRank = Math.max(game.ascendRank || 0, zone.id === 'trial_3' ? 3 : (zone.id === 'trial_2' ? 2 : 1));
        }
        if (!game.unlocks.traits) game.unlocks.traits = true;
        game.noti.traits = true;
        if (zone.id === 'trial_1' && isFirstClear) {
            queueTutorialNotice('unlock_first_ascend', '1차 전직 해금', '1차 전직 시련을 통과했습니다!\n직업전직 탭에서 클래스를 선택하고 전직 노드를 활성화하세요.', 'tab-traits');
        }
        checkUnlocks();
        if (zone.id !== 'trial_4') addLog(`👑 [${zone.name}] 통과! 전직 포인트 2점 획득!`, "loot-unique");
        game.currentZoneId = game.maxZoneId;
        game.killsInZone = 0;
        game.inTicketBossFight = false;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (zone.type === 'seasonBoss') {
        awardCurrency(zone.reward || 'bossCore', 1);
        if (Math.random() < 0.4) {
            let bossUnique = generateUniqueItem(zone.tier || 12);
            addItemToInventory(bossUnique);
            addLog(`👑 시즌 보스 전리품 [${bossUnique.name}] 획득!`, 'loot-unique');
        }
        addLog(`🗝️ [${zone.name}] 토벌 완료! 군주의 핵 +1`, 'loot-unique');
        let shouldRepeat = !!game.autoRepeatSeasonBoss;
        let keyLeft = game.currencies[zone.key] || 0;
        if (shouldRepeat && keyLeft > 0) {
            game.currencies[zone.key]--;
            game.currentZoneId = zone.id;
            game.killsInZone = 0;
            game.inTicketBossFight = true;
            addLog(`🔁 입장권 1개 소모, [${zone.name}] 자동 재도전 시작! (남은 열쇠 ${game.currencies[zone.key] || 0})`, 'season-up');
            startMoving(true);
        } else {
            if (shouldRepeat && keyLeft <= 0) addLog('🔁 반복 도전이 켜져 있지만 입장권이 없어 자동 재도전을 중단합니다.', 'attack-monster');
            game.currentZoneId = game.maxZoneId;
            game.killsInZone = 0;
            game.inTicketBossFight = false;
            startMoving(false);
        }
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (zone.type === 'labyrinth') {
        game.labyrinthFloor = (game.labyrinthFloor || 1) + 1;
        game.labyrinthUnlockedMaxFloor = Math.max(game.labyrinthUnlockedMaxFloor || 1, game.labyrinthFloor || 1);
        let gotBaseFossil = Math.random() < 0.5;
        if (gotBaseFossil) awardCurrency('fossil', 1);
        let rolledFossil = rndChoice(FOSSIL_DB);
        let gotTypedFossil = Math.random() < 0.5;
        if (gotTypedFossil) awardCurrency(rolledFossil.key, 1);
        if (Math.random() < 0.03) {
            awardCurrency('fossilAbyssal', 1);
            addLog('🌌 희귀 화석 [심연 화석]을 발견했습니다!', 'loot-unique');
        }
        if ((game.season || 1) >= 6 && Math.random() < 0.1) awardCurrency('sealShard', 1);
        if ((game.season || 1) >= 6 && Math.random() < 0.015) awardCurrency('strongSealShard', 1);
        let fossilSummary = [];
        if (gotBaseFossil) fossilSummary.push('기본 화석 +1');
        if (gotTypedFossil) fossilSummary.push(`${rolledFossil.name} +1`);
        addLog(`🏛️ 미궁 ${game.labyrinthFloor}층으로 진입합니다. [${fossilSummary.join(' / ') || '화석 없음'}]`, 'season-up');
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }

    if (game.killsInZone >= zone.maxKills) {
        if (zone.type === 'abyss') {
            let depth = Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1));
            if (depth === 5 && !game.woodsmanSimulatorSeenLoop) {
                game.woodsmanSimulatorSeenLoop = true;
                unlockJournalEntry('woodsman');
                queueTutorialNotice('woodsman_simulator_loop', '나무꾼의 시뮬레이터', '“다음은 더 나은 세계를 바라지.”\n정체를 드러낸 존재는 진짜 나무꾼이 아닌 시뮬레이터였다.\n더 깊은 혼돈을 돌파해야 루프가 열린다.', 'tab-season');
            }
            let capDepth = 20;
            game.abyssClearedDepths = Array.isArray(game.abyssClearedDepths) ? game.abyssClearedDepths : [];
            if (depth <= capDepth && !game.abyssClearedDepths.includes(depth)) {
                game.abyssClearedDepths.push(depth);
            }
        }
        if (zone.type === 'act' && zone.id <= 9) markActRewardReady(zone.id);
        if (zone.type === 'act') {
            let storyAct = getStoryActByZoneId(zone.id);
            if (storyAct && storyAct.clearText) addLog(`📜 ${storyAct.clearText}`, 'season-up');
            if (zone.id === 1) addLog('📖 정원사의 불멸 앞에서 패배를 기록했지만, 전진을 위한 보상은 확보했다.', 'season-up');
            if (zone.id === 0) unlockJournalEntry('act_1');
            if (zone.id === 1) unlockJournalEntry('act_2');
            if (zone.id === 2) unlockJournalEntry('act_3');
            if (zone.id === 3) unlockJournalEntry('act_4');
            if (zone.id === 4) unlockJournalEntry('act_5');
            if (zone.id === 5) unlockJournalEntry('act_6');
            if (zone.id === 6) unlockJournalEntry('act_7');
            if (zone.id === 7) unlockJournalEntry('act_8');
            if (zone.id === 8) unlockJournalEntry('act_9');
            if (zone.id === 9) unlockJournalEntry('act_10');
            if (zone.id === 9 && Math.max(0, Math.floor(game.loopDeaths || 0)) <= 0) unlockJournalEntry('immortal');
            if (storyAct && storyAct.specialType === 'loop_gate') {
                addLog('🗡️ 창조 권능 절단이 완성되었다. 나무꾼을 베어낸 루프가 새 시즌의 문을 연다.', 'loot-unique');
                triggerSeasonReset();
                return;
            }
        }
        if (zone.id === getCurrentSeasonFinalZoneId()) {
            if ((game.season || 1) >= 10 && zone.type === 'abyss') {
                let depth = Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1));
                game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
                let nextDepth = Math.max(21, Math.floor(game.abyssEndlessDepth || depth) + 1);
                if (!game.abyssUnlockedDepths.includes(nextDepth)) game.abyssUnlockedDepths.push(nextDepth);
                game.abyssEndlessDepth = Math.max(nextDepth, Math.floor(game.abyssEndlessDepth || 20));
                game.pendingLoopDecision = true;
                game.combatHalted = true;
                game.enemies = [];
                game.encounterPlan = [];
                game.encounterIndex = 0;
                game.runProgress = 0;
                updateStaticUI();
                return;
            }
            triggerSeasonReset();
            return;
        }
        if (zone.type === 'abyss' && !game.unlockedTrials.includes('trial_3')) {
            let shouldUnlockTrial3 = zone.name === '혼돈 5' || Math.random() < 0.15;
            if (shouldUnlockTrial3) {
                game.unlockedTrials.push('trial_3');
                game.noti.map = true;
                addLog(zone.name === '혼돈 5' ? "✨ [여신의 헌사] 혼돈 5 보스 확정 드랍! 3차 전직 시련 개방!" : "✨ [여신의 헌사] 획득! 3차 전직 시련 개방!", "loot-unique");
            }
        }
        if (game.maxZoneId <= game.currentZoneId) {
            game.maxZoneId = Math.min(getCurrentSeasonFinalZoneId(), game.maxZoneId + 1);
            game.noti.map = true;
            triggerMapUnlockReveal(game.maxZoneId);
            let clearedStoryAct = getStoryActByZoneId(zone.id);
            if (clearedStoryAct && clearedStoryAct.unlockText) addLog(`🧭 ${clearedStoryAct.unlockText}`, 'season-up');
            addLog(`🗺️ 신규 사냥터 [${MAP_ZONES[game.maxZoneId].name}] 개방!`, "season-up");
        }
        game.killsInZone = 0;
        let mapAction = game.settings.mapCompleteAction || 'nextZone';
        if (game.beehive && game.beehive.inRun) mapAction = 'repeatZone';
        if (mapAction === 'repeatZone') game.currentZoneId = zone.id;
        else if (mapAction === 'stop') {
            game.combatHalted = true;
            game.enemies = [];
            game.encounterPlan = [];
            game.encounterIndex = 0;
            game.runProgress = 0;
            updateStaticUI();
            queueImportantSave(180);
            return;
        } else game.currentZoneId = Math.max(game.currentZoneId, game.maxZoneId);
    }
    checkUnlocks();
    if ((game.settings.townReturnAction || 'retry') === 'stop') {
        game.combatHalted = true;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
    } else startMoving(false);
    updateStaticUI();
    queueImportantSave(220);
}

function performPlayerAttack(pStats) {
    let targets = getSkillTargets(pStats);
    if (targets.length === 0) return;
    let isDotSkill = Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('dot');

    let isCrit = Math.random() < (pStats.crit / 100);
    let baseDamage = pStats.baseDmg;
    if (isCrit) {
        baseDamage = Math.floor(baseDamage * (pStats.critDmg / 100));
        if (game.activeSkill === '묵직한 강타' && pStats.sSkill.finalLevel >= 20) baseDamage *= 2;
    }
    addBattleFx('playerSwing', {
        color: getElementColor(pStats.sSkill.ele || 'phys'),
        crit: isCrit,
        projectile: (pStats.sSkill.tags || []).includes('projectile'),
        skillName: game.activeSkill,
        duration: 600
    });

    let zoneTier = getZone(game.currentZoneId).tier;
    let hits = [];
    let totalDamage = 0;
    let totalLeechableDamage = 0;
    targets.forEach(hit => {
        if (!hit.enemy || hit.enemy.hp <= 0) return;
        let enemyRes = getEffectiveEnemyMitigation(pStats.sSkill.ele || 'phys', zoneTier, hit.enemy, pStats);
        let dmg = Math.floor(baseDamage * hit.mult);
        let minRoll = Math.max(1, Math.floor(pStats.minDmgRoll || 80));
        let maxRoll = Math.max(minRoll, Math.floor(pStats.maxDmgRoll || 100));
        let rollPct = minRoll + Math.random() * (maxRoll - minRoll);
        dmg = Math.floor(dmg * (rollPct / 100));
        if ((hit.enemy.firstHitGuard || 0) > 0 && !hit.enemy.firstHitConsumed) {
            dmg = Math.floor(dmg * (1 - hit.enemy.firstHitGuard));
            hit.enemy.firstHitConsumed = true;
        }
        let burstHits = Math.max(0, (hit.enemy.recentHitsTaken || 0) - 2);
        let hitGuard = (hit.enemy.hitRateGuard || 0) * Math.min(5, burstHits);
        if (hitGuard > 0) dmg = Math.floor(dmg * Math.max(0.2, 1 - hitGuard));
        let damageBeforeMitigation = dmg;
        dmg = Math.floor(dmg * (1 - (enemyRes / 100)));
        dmg = Math.floor(dmg * (getAbyssMonsterScales(getZone(game.currentZoneId)).playerDamageMul || 1));
        let zone = getZone(game.currentZoneId);
        let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
        let hpAfterDamage = Math.max(0, hit.enemy.hp - dmg);
        if (hit.enemy.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop()))) {
            hpAfterDamage = Math.max(1, hpAfterDamage);
        }
        hit.enemy.hp = hpAfterDamage;
        if ((pStats.regenSuppress || 0) > 0) hit.enemy.regenSuppressPct = Math.min(95, (hit.enemy.regenSuppressPct || 0) + pStats.regenSuppress);
        hit.enemy.recentHitsTaken = (hit.enemy.recentHitsTaken || 0) + 1;
        hit.enemy.recentHitsTimer = 1.8;
        totalDamage += dmg;
        totalLeechableDamage += dmg * (hit.enemy && hit.enemy.leechEffMul !== undefined ? hit.enemy.leechEffMul : 1);
        hits.push(dmg);
        addBattleFx('hit', {
            enemyId: hit.enemy.id,
            color: getElementColor(pStats.sSkill.ele || 'phys'),
            crit: isCrit,
            projectile: (pStats.sSkill.tags || []).includes('projectile'),
            chain: pStats.sSkill.targetMode === 'chain',
            skillName: game.activeSkill,
            damage: dmg,
            duration: 320
        });
        if (isDotSkill) applyEnemyDotFromHit(hit.enemy, damageBeforeMitigation, pStats);
    });
    if (pStats.leech > 0 && totalLeechableDamage > 0) game.playerHp = Math.min(pStats.maxHp, game.playerHp + (totalLeechableDamage * (pStats.leech / 100)));

    if (game.settings.showCombatLog) {
        let dotInfo = '';
        if (isDotSkill) {
            let maxDotStack = targets.reduce((max, hit) => Math.max(max, (hit.enemy && hit.enemy.dotStacks) || 0), 0);
            if (maxDotStack > 0) dotInfo = ` · 도트중첩 ${maxDotStack}/${DOT_STACK_MAX} (${getDotStackMultiplier(maxDotStack).toFixed(2)}x)`;
        }
        let hitPrefix = isDotSkill ? '⚔️ 직격' : '⚔️';
        let line = '';
        if (hits.length >= 5) {
            let maxHit = Math.max(...hits);
            let minHit = Math.min(...hits);
            line = `${hitPrefix} ${maxHit} / ... / ${minHit} 피해 (${hits.length}타겟)`;
        } else if (hits.length > 1) {
            line = `${hitPrefix} ${hits.join(' / ')} 피해 (${hits.length}타겟)`;
        } else {
            line = `${hitPrefix} ${hits[0] || 0} 피해`;
        }
        line += dotInfo;
        if (isCrit) line = `💥 ${line}`;
        let scales = pStats.damageScales || {};
        let hiddenScaleTags = Array.isArray(pStats.sSkill.hideCombatScales) ? pStats.sSkill.hideCombatScales : [];
        let scaleLabels = [];
        if ((scales.hpFlatBonus || 0) > 0) scaleLabels.push(`생명력추가+${Math.floor(scales.hpFlatBonus || 0)}`);
        if (!hiddenScaleTags.includes('regen') && (scales.regen || 1) > 1.0001) scaleLabels.push(`재생x${(scales.regen || 1).toFixed(2)}`);
        if (!hiddenScaleTags.includes('fireRes') && (scales.fireRes || 1) > 1.0001) scaleLabels.push(`화저x${(scales.fireRes || 1).toFixed(2)}`);
        if (scaleLabels.length > 0) line += ` [계수 ${scaleLabels.join(' / ')}]`;
        addLog(line, isCrit ? 'attack-crit' : 'attack-player', { rateKey: isCrit ? 'combat:hit-crit' : 'combat:hit', minIntervalMs: isCrit ? 120 : 180, aggregateKey: isCrit ? 'combat:hit-crit' : 'combat:hit', aggregateWindowMs: 500 });
    }

    targets.forEach(hit => {
        if (hit.enemy && hit.enemy.hp <= 0) handleEnemyDeath(hit.enemy, pStats);
    });
}

function handlePlayerDefeat(zone, pStats, message, options) {
    let opts = options || {};
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    addBattleFx('playerDown', { color: '#ff6b6b', duration: 600 });
    let expLost = 0;
    if (storyAct && storyAct.specialType === 'forced_defeat') {
        addLog(`🩸 ${storyAct.clearText}`, 'death');
        addLog('🧊 이 패배는 담금질로 기록된다.', 'season-up');
        unlockJournalEntry('act_2');
        if (zone && zone.type === 'act' && zone.id <= 9) markActRewardReady(zone.id);
        if (game.maxZoneId <= zone.id) {
            game.maxZoneId = Math.min(getCurrentSeasonFinalZoneId(), game.maxZoneId + 1);
            triggerMapUnlockReveal(game.maxZoneId);
        }
        game.currentZoneId = game.maxZoneId;
        game.killsInZone = 0;
        game.playerHp = pStats.maxHp;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(160);
        return;
    }
    game.loopDeaths = Math.max(0, Math.floor(game.loopDeaths || 0)) + 1;
    if (zone.type === 'seasonBoss' && game.inTicketBossFight) {
        addLog(message || "☠️ 시즌 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.", "death");
        game.currentZoneId = 0;
        game.killsInZone = 0;
        game.inTicketBossFight = false;
    } else if (zone.type === 'trial') {
        addLog(message || "☠️ 시련 실패! 마을로 귀환합니다.", "death");
        game.currentZoneId = game.maxZoneId;
        game.killsInZone = 0;
    } else {
        expLost = Math.floor(getExpReq(game.level) * 0.1);
        addLog(message || "☠️ 사망! 경험치 페널티 적용", "death");
        game.exp = Math.max(0, game.exp - expLost);
    }
    let damageSummary = buildDeathDamageSummary(3000);
    let primaryEntry = damageSummary[0] || null;
    let primaryElement = primaryEntry ? primaryEntry.ele : normalizeDamageElementKey(opts.fatalElement);
    let reasonText = DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys;
    game.lastDeathLog = {
        at: Date.now(),
        zoneName: zone && zone.name ? zone.name : '알 수 없는 지역',
        expLost: expLost,
        primaryElement: primaryElement,
        reasonText: reasonText,
        damageSummary: damageSummary,
        sourceName: opts.sourceName || ''
    };
    if (game.settings.showDeathNotice !== false) openDeathOverlay(game.lastDeathLog);
    game.playerHp = pStats.maxHp;
    startMoving(false);
    updateStaticUI();
    queueImportantSave(160);
}

function applyPlayerAilment(type, duration) {
    if (!type || duration <= 0) return;
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let existing = game.playerAilments.find(row => row.type === type);
    if (existing) existing.time = Math.max(existing.time || 0, duration);
    else game.playerAilments.push({ type: type, time: duration });
}

function tickAilments(pStats, dt) {
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let next = [];
    game.playerAilments.forEach(ail => {
        ail.time = Math.max(0, (ail.time || 0) - dt);
        if (ail.type === 'ignite') {
            let burn = Math.max(1, Math.floor(pStats.maxHp * 0.0028));
            game.playerHp -= burn;
            recordIncomingDamage('fire', burn, '점화');
        } else if (ail.type === 'poison') {
            let poison = Math.max(1, Math.floor(pStats.maxHp * 0.0022));
            game.playerHp -= poison;
            recordIncomingDamage('chaos', poison, '중독');
        }
        if (ail.time > 0) next.push(ail);
    });
    game.playerAilments = next;
}

function performMonsterAttacks(pStats) {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(Math.floor(Number(game.playerEnergyShield) || 0), Math.floor(pStats.energyShield || 0)));
    let aliveCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let crowdPenalty = Math.max(0.34, 1 - Math.max(0, aliveCount - 1) * 0.055);
    for (let enemy of (game.enemies || [])) {
        if (enemy.hp <= 0) continue;
        if (enemy.forcedDefeatBoss) {
            let now = performance.now();
            if (now >= (enemy.nextForcedRegenAt || 0)) {
                enemy.hp = enemy.maxHp;
                enemy.nextForcedRegenAt = now + 5000;
                if (game.settings.showCombatLog) addLog('✂️ 정원사의 불멸성이 상처를 되감아 풀피로 회복했다.', 'attack-monster');
            }
            if (now >= (enemy.forcedDoomAt || 0)) {
                enemy.forcedDoomAt = now + 10000;
                game.playerHp = 0;
                recordIncomingDamage('chaos', pStats.maxHp, '정원사의 가지치기');
                handlePlayerDefeat(zone, pStats, '☠️ 정원사의 가지치기가 당신의 생명력을 절단했습니다.', { fatalElement: 'chaos', sourceName: '정원사' });
                return;
            }
        }
        if ((enemy.regenRate || 0) > 0) {
            let suppress = Math.max(0, Math.min(95, enemy.regenSuppressPct || 0));
            let effectiveRegenRate = Math.max(0, enemy.regenRate * (1 - suppress / 100));
            enemy.hp = Math.min(enemy.maxHp || enemy.hp, enemy.hp + Math.max(1, Math.floor((enemy.maxHp || 1) * effectiveRegenRate)));
        }
        enemy.recentHitsTimer = Math.max(0, (enemy.recentHitsTimer || 0) - 0.1);
        if (enemy.recentHitsTimer <= 0) enemy.recentHitsTaken = Math.max(0, (enemy.recentHitsTaken || 0) - 1);
        let seasonDepth = Math.max(0, (game.season || 1) - 1);
        let tierPressure = clampNumber(((zone.tier || 1) - 1) / 10, 0, 1);
        let seasonAtkScale = 1 + seasonDepth * (0.012 + (tierPressure * 0.018));
        let atkRate = (0.26 + zone.tier * 0.013) * seasonAtkScale * (enemy.isElite || enemy.isBoss ? 1.16 : 1) * (enemy.atkMul || 1) * (enemy.attackSpeedVar || 1);
        enemy.attackTimer += 0.1 * atkRate;
        while (enemy.attackTimer >= 1) {
            enemy.attackTimer -= 1;
            let seasonDmgScale = 1 + seasonDepth * (0.04 + (tierPressure * 0.06));
            let dmg = Math.floor((2 + zone.tier * 3.1) * seasonDmgScale);
            if (zone.type === 'act' && zone.id <= 1 && (game.season || 1) >= 3) dmg = Math.floor(dmg * 0.58);
            if (enemy.isElite) dmg = Math.floor(dmg * 1.2);
            if (enemy.isBoss) dmg = Math.floor(dmg * (1.08 + zone.tier * 0.15));
            if (!enemy.isBoss) dmg = Math.floor(dmg * crowdPenalty);
            dmg = Math.floor(dmg * (abyssScale.dmgMul || 1) * (abyssScale.playerTakenMul || 1) * (enemy.isBoss ? (abyssScale.bossMul || 1) : 1));
            let physicalPortion = Math.floor(dmg * 0.5);
            let elementalPortion = Math.max(0, dmg - physicalPortion);
            let pRes = 0;
            if (enemy.ele === 'phys') { physicalPortion = dmg; elementalPortion = 0; pRes = pStats.dr + (pStats.armor / (pStats.armor + Math.max(1, physicalPortion) * 10)) * 100; }
            else if (enemy.ele === 'fire') pRes = pStats.resF;
            else if (enemy.ele === 'cold') pRes = pStats.resC;
            else if (enemy.ele === 'light') pRes = pStats.resL;
            else if (enemy.ele === 'chaos') pRes = pStats.resChaos;
            pRes = Math.max(-60, pRes - (enemy.penetration || 0));
            elementalPortion = Math.floor(elementalPortion * (1 - (pRes / 100)));
            let physRes = Math.max(-60, (pStats.dr + (pStats.armor / (pStats.armor + Math.max(1, physicalPortion) * 10)) * 100) - (enemy.penetration || 0));
            physicalPortion = Math.floor(physicalPortion * (1 - (physRes / 100)));
            dmg = Math.max(1, elementalPortion + physicalPortion);
            if ((enemy.critChance || 0) > 0 && Math.random() < (enemy.critChance / 100)) dmg = Math.floor(dmg * 1.55);
            if (enemy.hybridElement && Math.random() < 0.35) {
                let hybridRes = enemy.hybridElement === 'fire' ? pStats.resF : enemy.hybridElement === 'cold' ? pStats.resC : enemy.hybridElement === 'light' ? pStats.resL : pStats.resChaos;
                hybridRes = Math.max(-60, hybridRes - ((enemy.penetration || 0) * 0.7));
                let hybrid = Math.floor(dmg * 0.32 * (1 - (hybridRes / 100)));
                dmg += Math.max(0, hybrid);
            }
            dmg = Math.max(1, dmg);
            if (enemy.ele === 'phys' && Math.random() * 100 < Math.max(0, pStats.evadeChance || 0)) {
                if (game.settings.showCombatLog) addLog(`🌀 회피 성공`, "loot-magic");
                continue;
            }
            if ((enemy.ailmentChance || 0) > 0 && Math.random() < enemy.ailmentChance) {
                let ail = enemy.ele === 'fire' ? 'ignite' : enemy.ele === 'cold' ? 'chill' : enemy.ele === 'light' ? 'shock' : 'poison';
                applyPlayerAilment(ail, enemy.isBoss ? 5 : 3);
                if (game.settings.showCombatLog) addLog(`☣️ 상태이상: ${ail === 'ignite' ? '점화' : ail === 'chill' ? '냉각' : ail === 'shock' ? '감전' : '중독'} (${enemy.isBoss ? 5 : 3}초)`, 'attack-monster');
            }

            let remaining = dmg;
            game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
            if (remaining > 0 && game.playerEnergyShield > 0) {
                let absorbed = Math.min(game.playerEnergyShield, remaining);
                game.playerEnergyShield -= absorbed;
                remaining -= absorbed;
            }
            game.playerHp = Math.floor(game.playerHp - remaining);
            game.playerEsLastHitAt = Date.now();
            recordIncomingDamage(enemy.ele, dmg, enemy.name);
            addBattleFx('playerHit', { enemyId: enemy.id, color: getElementColor(enemy.ele), damage: dmg, duration: 220 });
            if (game.settings.showCombatLog) addLog(`🩸 [${getDamageElementLabel(enemy.ele)}] 피격 (${dmg} 피해)`, "attack-monster");
            if (game.playerHp <= 0) {
                handlePlayerDefeat(zone, pStats, null, { fatalElement: enemy.ele, sourceName: enemy.name });
                return;
            }
        }
    }
}

function applyTrialTrapTick(pStats) {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'trial' || game.moveTimer > 0) return;
    if (game.runProgress >= 100 && game.encounterIndex >= (game.encounterPlan || []).length && (game.enemies || []).length === 0) return;
    trialHazardTimer -= 0.1;
    if (trialHazardTimer > 0) return;
    trialHazardTimer = Math.max(2.2, 4.2 - zone.tier * 0.12) + Math.random() * 1.4;
    let trapDamage = Math.floor((pStats.maxHp * (0.035 + zone.tier * 0.005)) + 10 + zone.tier * 3);
    trapDamage = Math.max(10, Math.floor(trapDamage * (1 - (pStats.dr * 0.45 / 100))));
    game.playerHp = Math.floor(game.playerHp - trapDamage);
    recordIncomingDamage('other', trapDamage, '시련 함정');
    addBattleFx('trialTrap', { color: '#ffd36b', duration: 460 });
    addLog(`⚠️ 시련 함정 발동 [${getDamageElementLabel('other')}] (${trapDamage} 피해)`, 'attack-monster');
    if (game.playerHp <= 0) {
        handlePlayerDefeat(zone, pStats, "☠️ 시련 함정에 쓰러졌습니다. 마을로 귀환합니다.", { fatalElement: 'other', sourceName: '시련 함정' });
    }
}

function ensurePendingLoopHeroSelectionPrompt() {
    if (!game || !game.pendingLoopHeroSelection) return false;
    if (isLoopHeroSelectOpen() || isStartupOverlayOpen() || isLoadingOverlayOpen() || isDeathOverlayOpen()) return false;
    let previousHeroId = game.selectedHeroId || 'hero1';
    openLoopHeroSelection((heroId) => {
        if (heroId !== previousHeroId) addLog(`🧬 루프 전환으로 ${getHeroSelectionDef(heroId).label} 캐릭터를 선택했습니다.`, 'season-up');
        game.pendingLoopHeroSelection = false;
        saveGame({ skipCloudSync: true });
        startMoving(true);
        switchTab('tab-character');
    }, {
        kicker: 'Loop Resume',
        title: '중단된 루프의 재능 선택',
        body: '저장된 루프 진행을 이어가기 전에 이번 루프 재능을 선택하세요.'
    });
    return true;
}

function playLoopRewriteEffect() {
    let overlay = document.getElementById('loop-rewrite-overlay');
    if (!overlay) return;
    overlay.innerHTML = `<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">흔적을 거슬러, 이전 루프로 복귀합니다.</div></div>`;
    document.body.classList.add('loop-rewrite-active');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
        document.body.classList.remove('loop-rewrite-active');
    }, 1950);
}

function markLoopSpecialBossKill(bossKey) {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    game.loopProgressCurrent.specialBosses = Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : [];
    if (!game.loopProgressCurrent.specialBosses.includes(bossKey)) game.loopProgressCurrent.specialBosses.push(bossKey);
}

function awardLoopProgressPoints() {
    game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    let baseDepth = Math.max(20, Math.floor(game.loopProgressBase.abyssEndlessDepth || 20));
    let nowDepth = Math.max(20, Math.floor(game.abyssEndlessDepth || 20));
    let depthGain = Math.max(0, nowDepth - baseDepth);
    let baseLab = Math.max(1, Math.floor(game.loopProgressBase.labyrinthUnlockedMaxFloor || 1));
    let nowLab = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let labGain = Math.max(0, nowLab - baseLab);
    let baseBosses = new Set(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []);
    let newBosses = (Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : []).filter(id => !baseBosses.has(id));
    let bonus = (depthGain * 2) + Math.floor(labGain / 5) + (newBosses.length * 3);
    if (bonus > 0) game.loopDeepPoints = Math.max(0, Math.floor(game.loopDeepPoints || 0)) + bonus;
    game.loopProgressBase = { abyssEndlessDepth: nowDepth, labyrinthUnlockedMaxFloor: nowLab, specialBosses: Array.from(new Set([...(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []), ...newBosses])) };
    game.loopProgressCurrent = { specialBosses: [] };
    return { bonus, depthGain, labGain, bossGain: newBosses.length };
}

function triggerSeasonReset() {
    if (isRewardOpen()) closeRewardOverlay();
    let codexReveal = {};
    Object.keys(game.uniqueCodex || {}).forEach(key => {
        if (!key || !game.uniqueCodex[key]) return;
        let parts = key.split('|');
        codexReveal[key] = { revealed: true, slot: parts[0] || '', name: parts[1] || '' };
    });
    playLoopRewriteEffect();
    let previousHeroId = game.selectedHeroId || 'hero1';
    let prevLabMax = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let loopReward = awardLoopProgressPoints();
    let abyssLoopPointGain = Math.max(0, (Array.isArray(game.abyssClearedDepths) ? game.abyssClearedDepths.length : 0) * 5);
    game.season++;
    game.loopCount = Math.max(0, Math.floor(game.loopCount || 0)) + 1;
    game.seasonPoints++;
    if (loopReward.bonus > 0) addLog(`🧬 심화 루프 보상: +${loopReward.bonus}pt (혼돈 심화 +${loopReward.depthGain}, 미궁 +${loopReward.labGain}, 특수보스 +${loopReward.bossGain})`, 'season-up');
    if (abyssLoopPointGain > 0) addLog(`🌌 루프 정산: 혼돈 최초 클리어 보상 +${abyssLoopPointGain}pt`, 'season-up');
    game.level = 1;
    game.exp = 0;
    game.killsInZone = 0;
    game.loopDeaths = 0;
    game.loopKills = 0;
    game.woodsmanSimulatorSeenLoop = false;
    game.currentZoneId = 0;
    game.maxZoneId = 0;
    game.combatHalted = false;
    game.passivePoints = 0;
    game.passives = ['n0'];
    game.skills = ['기본 공격'];
    game.activeSkill = '기본 공격';
    game.gemData = {};
    game.skyGemEnhancements = {};
    game.supports = [];
    game.equippedSupports = [];
    game.supportGemData = {};
    game.sealedSkills = [];
    game.sealedSupports = [];
    game.resonancePower = 10;
    game.completedTrials = [];
    game.unlockedTrials = [];
    game.ascendNodes = [];
    game.ascendPoints = 0;
    game.ascendRank = 0;
    game.ascendClass = null;
    game.inventory = [];
    game.equipment = { ...defaultGame.equipment };
    game.currencies = { ...defaultGame.currencies };
    game.labyrinthFloor = 1;
    game.labyrinthUnlockedMaxFloor = Math.max(1, Math.floor(prevLabMax / 2));
    game.jewelInventory = [];
    game.jewelSlots = [null, null];
    game.jewelSlotAmplify = [0, 0];
    game.abyssPassivePoints = abyssLoopPointGain;
    game.abyssPassives = { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 };
    game.abyssClearedDepths = [];
    game.claimableActRewards = [];
    game.claimedActRewards = [];
    game.actRewardBonuses = [];
    game.seasonChaseUniqueDropped = false;
    game.uniqueCodex = codexReveal;
    game.starWedge = JSON.parse(JSON.stringify(defaultGame.starWedge));
    game.unlocks = { ...defaultGame.unlocks };
    game.noti = { ...defaultGame.noti };
    game.itemSubtab = 'item-tab-equip';
    game.skillSubtab = 'skill-tab-equip';
    game.mapSubtab = 'map-tab-zones';
    game.gemEnhanceUnlocked = false;
    game.inTicketBossFight = false;
    game.talismanUnlocked = false;
    game.talismanBoardUnlock = 3;
    game.talismanInventory = [];
    game.talismanBoard = [];
    game.talismanPlacements = {};
    game.talismanSelectedId = null;
    game.talismanUnseal = null;
    game.talismanUnlockPickMode = false;
    if (game.settings) {
        game.settings.autoSalvageEnabled = false;
        game.settings.itemFilterEnabled = false;
    }
    grantCodexLegacyStarterUniques();
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    progressStallTicks = 0;
    clearCraftSelection();
    applySeasonContentProgression({ silent: false });
    assignStarWedgeSockets();
    recalculateStarWedgeMutations();
    calculateReachableNodes();
    refreshPassiveVisibility();
    game.playerHp = getPlayerStats().maxHp;
    ensureActJournalCompletionForLoop({ silent: false });
    addLog("🌟 [루프 포인트 1점] 획득. 밝혀낸 성좌 지형은 유지됩니다.", "season-up");
    checkUnlocks();
    game.pendingLoopHeroSelection = true;
    saveGame({ skipCloudSync: true });
    openLoopHeroSelection((heroId) => {
        if (heroId !== previousHeroId) addLog(`🧬 루프 전환으로 ${getHeroSelectionDef(heroId).label} 캐릭터를 선택했습니다.`, 'season-up');
        game.pendingLoopHeroSelection = false;
        saveGame({ skipCloudSync: true });
        startMoving(true);
        switchTab('tab-character');
    });
}

function chooseLoopAdvance(shouldLoop) {
    if (!game.pendingLoopDecision) return;
    if (shouldLoop) {
        game.pendingLoopDecision = false;
        triggerSeasonReset();
        return;
    }
    game.pendingLoopDecision = false;
    game.currentZoneId = Math.max(0, Math.floor(getCurrentSeasonFinalZoneId() || game.currentZoneId || 0));
    game.killsInZone = 0;
    game.combatHalted = true;
    addLog('⏸️ 루프를 보류했습니다. 루프 탭에서 심화 진행/포인트 분배 후 원할 때 다음 루프로 이동하세요.', 'season-up');
    updateStaticUI();
}


safeExposeGlobals({ getPlayerStats, getSkillTargets, createEnemy, generateEncounterPlan, startEncounterRun, startMoving, returnToTown, ensureEncounterRun, advanceMapProgress, grantExpAndGem, rollLootForEnemy, handleEnemyDeath, finishEncounterRun, performPlayerAttack, handlePlayerDefeat, applyPlayerAilment, tickAilments, performMonsterAttacks, applyTrialTrapTick, ensurePendingLoopHeroSelectionPrompt, triggerSeasonReset, chooseLoopAdvance, markLoopSpecialBossKill });
