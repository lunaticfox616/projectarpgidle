// 처치 보상: 경험치, 드롭, 지역과 콘텐츠 클리어 처리 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/** A kill's experience at the hero's level. kind 'gemExperience' is the runes' share before their 45%: a softer level gap
 * (LEVEL_PROGRESSION.gemExperienceGap) so a new rune can grow in weaker areas. */
function getEnemyExperienceReward(enemy, pStats, kind = 'experience') {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    let abyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    const level = levelProgression.monsterLevel(zone, enemy);
    let exp = Math.floor(levelProgression.monsterExperience(level)
        * levelProgression.loopExperienceMultiplier(game.season, game.level, level));
    if (enemy.isElite) exp = Math.floor(exp * 1.8);
    if (enemy.isBoss) exp = Math.floor(exp * 6);
    exp = Math.floor(exp * (enemy.expMul || 1));
    exp = Math.floor(exp * (1 + (pStats.expGain / 100)) * (abyssScale.expMul || 1));
    if (abyssDepth > 1) {
        let depthExpDampen = Math.max(0.68, 1 - (abyssDepth - 1) * 0.012);
        exp = Math.floor(exp * depthExpDampen);
    }
    return Math.max(0, Math.floor(exp * levelProgression.rewardMultiplier(zone, enemy, game.level, kind)));
}

/** The main gem (or a levelable skill) and the worn 이동 스킬 gem gain experience; returns the ones that leveled up.
 * A kill during a mobility cast still feeds the real main gem, not the mobility gem twice. */
function grantWornGemExp(gemExp, pStats) {
    const main = mobilitySkill.mainGem(), mainSkill = main === game.activeSkill ? pStats.sSkill : (SKILL_DB[main] || {});
    const worn = new Set([(mainSkill.isGem || mainSkill.levelable) && main, mobilitySkill.equipped()].filter(Boolean));
    game.gemData = game.gemData || {};
    return [...worn].filter(name => {
        game.gemData[name] = normalizeGemRecord(game.gemData[name]);
        return gainGemExperience(game.gemData[name], gemExp) > 0;
    });
}

function grantExpAndGem(enemy, pStats) {
    let gemLeveled = false;
    const experience=(kind,scale=1)=>[enemy,...(enemy.cerberusRewards||[])].reduce(
        (sum,part)=>sum+Math.floor(getEnemyExperienceReward(part,pStats,kind)*scale),0);
    let exp = experience('experience');
    game.exp += exp;
    // 낮은 지역에서 처치마다 쌓이던 '경험치 +0' 줄은 남기지 않는다(검토 4차).
    if (game.settings.showExpLog && exp > 0) addLog(_t('✨ 경험치 +{exp}', { exp }), "exp-txt");

    let gemExp = experience('gemExperience',0.45);
    for (const name of grantWornGemExp(gemExp, pStats)) {
        gemLeveled = true;
        addLog(_t(SKILL_DB[name]?.isGem ? '✨ 룬 [{name}] 레벨업!' : '✨ 스킬 [{name}] 레벨업!', { name: _t(name) }), "loot-unique");
    }
    game.equippedSummonSkills = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    game.equippedSummonSkills.forEach(name => {
        let def = SKILL_DB[name] || {};
        // 소환 칸의 룬은 모두(위습, 수액 골렘, 가호) 처치 경험치를 받는다: 옛 전령과 골렘은 보조룬 길로 받았다
        if (!def || !Array.isArray(def.tags) || !def.tags.includes('summon')) return;
        game.gemData = game.gemData || {};
        game.gemData[name] = normalizeGemRecord(game.gemData[name]);
        let gem = game.gemData[name];
        if (gainGemExperience(gem, gemExp) > 0) {
            gemLeveled = true;
            addLog(_t('✦ 소환수 룬 [{name}] 레벨업!', { name }), "loot-unique");
        }
    });
    (game.equippedSupports || []).forEach(name => {
        let gem = game.supportGemData[name];
        const levels = gem ? gainGemExperience(gem, gemExp) : 0;
        if (levels > 0) {
            gemLeveled = true;
            addLog(_t('🟢 룬 [{name}] 레벨업!', { name }), "loot-rare");
        }
    });

    let req = getExpReq(game.level);
    let guard = 0;
    let leveledUp = false;
    while (game.level < MAX_PLAYER_LEVEL && game.exp >= req && guard < 50) {
        game.exp -= req;
        game.level++;
        leveledUp = true;
        awardLevelPassivePoint();
        game.playerHp = getPlayerHpCap(getPlayerStats());
        addLog(_t('🎉 레벨업! (Lv.{level})', { level: game.level }), "level-up");
        req = getExpReq(game.level);
        guard++;
        checkUnlocks();
    }
    if (game.level >= MAX_PLAYER_LEVEL) game.exp = 0;
    if (leveledUp) {
        let autoInvest = typeof runPassiveTreeAutoInvest === 'function' ? runPassiveTreeAutoInvest() : { nodes: 0 };
        if (autoInvest.nodes > 0) addLog(_t('🧭 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: autoInvest.nodes }), 'season-up');
        addBattleFx('levelUp', { level: game.level, duration: 1050, color: '#ffe59a' });
        queueImportantSave(250);
    }
    return gemLeveled;
}

function awardLevelPassivePoint() {
    const unlocked = contentProgression.canOpen('tab-char');
    if (game.season >= 2 || unlocked) game.passivePoints++;
    if (unlocked) game.noti.char = true;
}

function applyGrandBreachMobTuning(zone, enemy) {
    if (!zone || zone.id !== 'grand_breach_run' || !enemy || enemy.isBoss) return;
    const role = GRAND_BREACH_ROLE_TUNING[enemy.monsterVisualId] || GRAND_BREACH_BASE_ROLE;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 5 * role.hp));
    enemy.atkMul *= 1.25;
    enemy.damageMul *= 1.25 * role.damage;
    enemy.attackSpeedVar *= role.speed;
    enemy.penetration += role.penetration;
    enemy.resChaos = Math.min(95, enemy.resChaos + role.chaosRes);
    enemy.ailmentChance += role.ailment;
    enemy.hp = enemy.maxHp;
}

// 공허 증원: 경험치·생명력 2배, 공격 속도 1.25배, 피해 1.3배.
/** Colony waves and a void rift on the 9×8 board hold the map's progress plan. A wide map needs no hold: its walk already pauses
 * while anything fights, and the hero must finish the step it is taking to reach the rift's monsters. */
function isMapProgressHeld(zone, rift) {
    if (zone?.type === 'colony') return true;
    return isVoidRiftCombatZone(zone) && rift.active && !actExplorationState.current(game);
}

function isVoidRiftCombatZone(zone) {
    return !!zone && zone.type === 'abyss';
}

function applyVoidRiftMobTuning(enemy) {
    if (!enemy || enemy.isBoss) return;
    enemy.maxHp = Math.max(1, Math.floor((enemy.maxHp || 1) * 2));
    enemy.hp = enemy.maxHp;
    enemy.atkMul = (enemy.atkMul || 1) * 1.25;
    enemy.damageMul = (enemy.damageMul || 1) * 1.3;
    enemy.expMul = (enemy.expMul || 1) * 2;
}

function isBeeMappingZone(zone) {
    return !!zone && zone.type === 'abyss';
}

/** 벌 이벤트(2026-10-01 양봉업자 대신): 아틀라스 '여왕의 방' 패시브가 있으면 아틀라스 지도 처치 중 꽃가루 10개로 일어난다. */
function maybeTriggerBeeMappingEvent(enemy) {
    if (!enemy || enemy.isBoss) return;
    if ((game.currencies.pollen || 0) < 10) return;
    let chance = enemy.isElite ? 0.012 : 0.0025;
    if (Math.random() >= chance) return;
    game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 10);
    let roll = Math.random();
    if (roll < 0.08) {
        let pollen = 25;
        awardCurrency('pollen', pollen);
        awardCurrency('enchantedHoney', 1);
        awardCurrency('beeswax', 2);
        addLog(_t('👑 여왕벌 이벤트! 꽃가루 +{pollen}, 벌꿀 +1, 밀랍 +2', { pollen }), 'loot-unique');
    } else if (roll < 0.28) {
        awardCurrency('venomStinger', 1);
        if (Math.random() < 0.35) awardCurrency('beeswax', 1);
        addLog(_t('🐝 독침벌 무리 이벤트! 독벌침 +1'), 'loot-rare');
    } else if (roll < 0.55) {
        awardCurrency('pollen', 15);
        awardCurrency('beeswax', 1);
        addLog(_t('🐝 호박벌 이벤트! 꽃가루 +15, 밀랍 +1'), 'loot-rare');
    } else {
        awardCurrency('pollen', 8);
        addLog(_t('🐝 벌 이벤트! 꽃가루 +8'), 'loot-magic');
    }
}

/** Read-only visual receipt; rewards are already committed. Never replay grants from presentation. */
function queueEnemyGroundLoot(enemy, receipt) {
    if (game.isBackgroundCalculation || battleFxSuppressed) return;
    const item = receipt.item;
    const loot = { ...receipt, zoneId: game.currentZoneId, sourceCell: { gx: enemy.gx, gy: enemy.gy } };
    if (item) loot.item = { name: item.name, baseId: item.baseId, slot: item.slot,
        rarity: item.rarity, family: item.family, lines: item.lines };
    addBattleFx('lootPickup', { enemyId: enemy.id, loot, duration: 1200 });
    celebrateEnemyLoot(enemy, item, receipt.highlight);
}

/** The ground-loot name colour of a jewel: violet for uniques, blue otherwise. */
function getJewelLootColor(jewel) {
    return jewel.rarity === 'unique' ? '#dca6ff' : '#78cfff';
}

function celebrateEnemyLoot(enemy, item, highlight) {
    if (highlight) addBattleFx('lootCelebration', { enemyId: enemy.id, ...highlight,
        itemName: item.name, tier: item.rarity, groundLoot: true, duration: 1800 });
}

/**
 * One equipment drop. On an exploration map a drop the pickup would keep waits on its cell until the hero walks over it or the
 * player clicks it (js/exploration-ground-loot.js, 2026-10-05 user request); offline, outside a map, or when the pickup would
 * filter or auto-salvage it, it is picked up now as before.
 * @returns {'floor'|'kept'|null} null when the pickup filtered or salvaged it
 */
/** A special encounter holds a drop for its boss payout, but not one the pickup would filter or salvage (it filled the floor) nor
 * a unique or a guaranteed drop (a failed run lost it after the season had already recorded a chase unique). */
function holdEncounterDrop(enemy, item, options, highlight, guaranteed) {
    if (guaranteed || item.rarity === 'unique') return false;
    return actExplorationState.groundLoot.reserve({ gx: enemy.gx, gy: enemy.gy, item, highlight: !!highlight, guaranteed,
        filterOnPickup: !options?.ignoreFilter, ignoreAutoSalvage: !!options?.ignoreAutoSalvage });
}

function keepEquipmentDrop(enemy, item, options) {
    const highlight = equipmentLootPolicy.highlight(item, game), keep = previewEquipmentPickup(item, options) === 'kept';
    const guaranteed = isGuaranteedEquipmentPickup(item, options);
    if (keep && holdEncounterDrop(enemy, item, options, highlight, guaranteed)) return 'floor';
    const run = explorationFloorFor(enemy);
    if (run && keep) {
        actExplorationState.groundLoot.place(run, enemy, item, { highlight: !!highlight, guaranteed });
        if (!battleFxSuppressed) celebrateEnemyLoot(enemy, item, highlight);
        return 'floor';
    }
    if (!addItemToInventory(item, options)) return null;
    queueEnemyGroundLoot(enemy, { item, itemKind: 'equipment', highlight });
    return 'kept';
}

/**
 * Grants floor rows (js/exploration-ground-loot.js) through the normal pickup: auto-equip, space and auto-salvage. The drop
 * already passed the pickup filter, so a later filter change does not throw an item away from the floor.
 * @returns {number} items that reached the inventory or an equipment slot
 */
function collectExplorationFloorLoot(rows) {
    const kindOf = actExplorationState.groundLoot.kindOf;
    const currencies = rows.filter(row => kindOf(row) === 'currency');
    currencies.forEach(row => commitCurrencyGain(row.currency, row.count));
    rows.forEach(row => receiveFloorItem[kindOf(row)]?.(row));
    // Uniques new to the codex, known before the pickup registers them (the reveal shows a 새 고유 badge).
    const fresh = rows.filter(row => kindOf(row) === 'equipment' && lootMoments.isNewUnique(row.item)).map(row => row.item.id);
    const kept = rows.filter(row => kindOf(row) === 'equipment'
        && addItemToInventory(row.item, { ignoreFilter: !row.filterOnPickup, ignoreAutoSalvage: !!row.ignoreAutoSalvage,
            guaranteedKeep: row.guaranteed })).map(row => row.item);
    if (kept.length || currencies.length) dispatchRuntimeEvent('floor-loot-collected', { items: kept, fresh: fresh.filter(id => kept.some(item => item.id === id)),
        currencies: currencies.map(row => ({ key: row.currency, count: row.count })) }); // the loot log lines (js/battle-ground-loot-ui.js)
    return kept.length + currencies.length;
}

/** A floor seed or sap picked up: in the box, with the same notice a drop had. */
function receiveStumpDropRow(row) {
    const { item, compost } = stumpBox.receiveDrop(game, row.item);
    if (game.noti) game.noti.stump = true;
    dispatchRuntimeEvent('stump-box-changed', { ripened: compost ? compost.ripened : [], drop: item, compost });
}

/** Rolled combat runes stay unowned until the boss's floor pile is collected. */
function receiveDeferredRune(row) {
    gemDropRewards.grant(game, row.gem, row.gem.kind === 'support' ? gemDropRewards.resonanceCap(game, getPlayerStats()) : 0);
    playerStatCache.invalidate();
    dispatchRuntimeEvent('gem-loot-received', { kind: row.gem.kind, gem: row.gem, deferred: true });
}

/** Jewels, cores and wild talismans wait on the exploration floor like equipment (2026-10-06 user request). Returns whether the
 * drop was laid there; elsewhere the caller grants it at once. */
function placeFloorItem(enemy, kind, item, overflow) {
    if (actExplorationState.groundLoot.reserve({ gx: enemy.gx, gy: enemy.gy, kind, item, overflow })) return true;
    const run = explorationFloorFor(enemy);
    if (!run || (kind === 'jewel' && bagItems.salvagedOnDrop(item))) return false; // 자동해체될 주얼은 바닥에 놓지 않고 바로 해체한다(장비와 같다)
    actExplorationState.groundLoot.placeItem(run, enemy, kind, item, overflow);
    return true;
}

/** The live exploration run whose floor a drop at `enemy`'s cell lands on, or null where drops are picked up at once (offline
 * replay, outside a map, a map already completing or lost). */
function explorationFloorFor(enemy) {
    const run = actExplorationState.current(game);
    return run && !run.arrival && !run.completionApplied && run.status !== 'failed' && !game.isBackgroundCalculation
        && hasGridCell(enemy) ? run : null;
}

/**
 * A currency drop (2026-10-06 user request: currency is picked up like equipment). The gain is resolved now (a still-locked
 * currency drops nothing); on an exploration map it waits on the cell, elsewhere it is committed at once as before.
 * @returns {{gain:number, floor:boolean}}
 */
function keepCurrencyDrop(enemy, currencyKey, amount) {
    const award = resolveCurrencyAward(currencyKey, amount, 'drop');
    if (award.refused || award.gain <= 0) return { gain: 0, floor: false };
    if (actExplorationState.groundLoot.reserve({ gx: enemy.gx, gy: enemy.gy, currency: award.key, count: award.gain }))
        return { gain: award.gain, floor: true };
    const run = explorationFloorFor(enemy);
    if (run) {
        actExplorationState.groundLoot.placeCurrency(run, enemy, award.key, award.gain);
        return { gain: award.gain, floor: true };
    }
    commitCurrencyGain(award.key, award.gain);
    queueEnemyGroundLoot(enemy, { currency: award.key, count: award.gain });
    return { gain: award.gain, floor: false };
}

/** One dropped equipment item: generate, apply a drop variant (js/loot.js equipmentDropVariants) and drop it. Returns the items
 * picked up at once (the loot log names the first); floor items log when collected. */
function grantEquipmentPick(enemy, zone, minimumRarity, slot) {
    const drop = equipmentDropVariants.expand(generateEquipmentDrop(enemy, { minimumRarity, zone, slot }));
    const keep = enemy.roomInvader ? { guaranteedKeep: true } : undefined; // 뿌리 절단자의 보상은 줍기 필터에도 사라지지 않는다
    return drop.items.filter(item => keepEquipmentDrop(enemy, item, keep) === 'kept');
}

/** A weapon root (data/bosses.js ROOT_MONSTER_RULES) drops a weapon of its own category on weaponDropChance of its kills, apart
 * from the ordinary equipment roll (2026-10-07 user request: far fewer roots, and their weapon far likelier). */
function grantRootWeaponPick(enemy, zone) {
    if (!getRootMonsterWeapon(enemy) || Math.random() >= ROOT_MONSTER_RULES.weaponDropChance) return [];
    return grantEquipmentPick(enemy, zone, null, '무기');
}

/** One kill's currency and gear rolls, not yet applied. itemChance is the kill's expected equipment count (js/loot.js rollEquipmentDrop).
 * 뿌리 절단자 throws away a roll with neither, so the odds between them stay the table's (data/bosses.js lootRolls); after emptyRollRetries
 * empty rolls the last one has an item. */
function rollCurrencyAndGear(enemy, zone, itemChance) {
    let drops = getCurrencyDrops(enemy), gear = rollEquipmentDrop(zone, enemy, itemChance);
    for (let tries = 1; enemy.roomInvader && !drops.length && !gear.count; tries++) {
        drops = getCurrencyDrops(enemy);
        gear = rollEquipmentDrop(zone, enemy, tries >= ROOM_INVADER.emptyRollRetries ? Math.max(1, itemChance) : itemChance);
    }
    return { drops, gear };
}

function grantRealmBossUniqueLoot(enemy, zone) {
    const item = generateRealmBossUniqueDrop(zone, enemy);
    return item && keepEquipmentDrop(enemy, item, { guaranteedKeep: true }) ? item : null;
}

/** Ordinary kills grant drops now; special encounters reserve the rolled drops until their boss falls. */
function grantEnemyLoot(enemy) {
    return combatLootReceipts.capture(game,()=>{
        // 한 몸의 처치에서 기존 정예 머리 몫도 한 번만 지급한다. 떨어지는 자리는 본체의 발밑이다.
        for(const part of enemy.cerberusRewards||[])rollLootForEnemy({...part,gx:enemy.gx,gy:enemy.gy},addLog);
        atlasRun.onKill(enemy);roomInvaders.grantExtraLoot(enemy);return rollLootForEnemy(enemy,addLog);
    });
}

function awardEnemyLootCurrency(key,amount,source='reward') {
    const award = resolveCurrencyAward(key, amount, source);
    if (award.refused || award.gain <= 0) return 0;
    if (!actExplorationState.groundLoot.reserve({ gx: game.gridPlayer.gx, gy: game.gridPlayer.gy, currency: award.key, count: award.gain }))
        commitCurrencyGain(award.key, award.gain);
    return award.gain;
}

function rollEnemyAttackGem(awakening, boss) {
    const name=pickSkillRuneReward(gemDropRewards.attackRunes({ includeDropOnly: true, boss })),awakened=!!awakening&&Math.random()<0.035;   // 지금 무기로 쓸 수 있는 룬 쪽으로
    return {kind:'attack',name,awakened};
}

/** Count runes not yet picked up (an encounter's held loot, runes lying on the map's floor) when rolling the next drop, without
 * granting their skills or tiers early: two support runes on the floor are two tiers, not the same tier twice. */
function ownedAndReservedRuneState() {
    const held = actExplorationState.groundLoot.encounterOwner()?.pendingLoot || [], lying = actExplorationState.current(game)?.groundLoot || [];
    const waiting = [...held, ...lying].filter(row => row.kind === 'rune');
    if (!waiting.length) return game;
    const state = { ...game, skills: [...game.skills], supports: [...game.supports],
        gemData: { ...game.gemData }, supportGemData: { ...game.supportGemData } };
    for (const row of waiting) Object.assign(state, gemDropRewards.prepare(state, [row.gem]));
    return state;
}

/** A rolled rune waits on the floor like equipment (2026-11-05 사용자 "바닥에 떨어지게", 전에는 탐험에서도 바로 가방으로): an encounter
 * holds it until its reward is released, an exploration map lays it on the kill's cell. Returns false where it is granted at once
 * (offline replay, outside a map). It is granted and logged when picked up (receiveDeferredRune). */
function placeFloorRune(enemy, gem) {
    if (actExplorationState.groundLoot.reserve({ gx: enemy.gx, gy: enemy.gy, kind: 'rune', gem })) return true;
    const run = explorationFloorFor(enemy);
    if (!run) return false;
    actExplorationState.groundLoot.placeRune(run, enemy, gem);
    return true;
}

/** One kill's loot, in its fixed roll order: awakened echoes, a rune, currencies, gear and talismans, a jewel, hive loot, a hive
 * key, a colony trace. Split into its steps on 2026-10-18 with the same rolls in the same order; log lines and the unlock
 * check reach the steps through ui. */
function rollLootForEnemy(enemy, say = addLog) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    // 탐욕의 광기(2026-11-08 전달본 V3.13)가 걸려 있으면 이 처치의 드랍률이 모두 오른다: 룬, 보석, 장비, 부적, 재화(js/loot.js getEnemyLootDropMultiplier).
    const greed = window.GameModules.combat.supports.blessingGreed(game);
    enemy.greedDropMul = greed ? 1 + greed.dropPct / 100 : 1;
    let contentDropMul = getContentDropRateMultiplier(zone) * enemy.greedDropMul;
    let gemAwakening = contentProgression.isUnlocked('gemAwakening');
    // The resonance cap is read only for a support rune drop (the skill screen script owns it, some runs lack it).
    const deferred = !!actExplorationState.groundLoot.encounterOwner();
    const ui = { say: deferred ? () => {} : say, unlocks: checkUnlocks,
        get resonanceCap() { return getEffectiveResonanceCap; } };
    rollAwakenedEchoDrop(enemy, contentDropMul, gemAwakening, ui);
    rollEnemyRuneDrop(enemy, contentDropMul, gemAwakening, ui);
    let { equipment: itemChance, talisman: talismanChance } = getEquipmentDropChances(zone, enemy);
    const { drops, gear } = rollCurrencyAndGear(enemy, zone, itemChance);
    drops.forEach(drop => keepEnemyCurrencyDrop(enemy, drop, ui));
    const keptItem = rollEquipmentLoot(enemy, zone, gear);
    grantRealmBossUniqueLoot(enemy, zone);
    if (keptItem && game.settings.showLootLog) addLog(_t("🛡️ <span class='loot-{rarity}'>[{name}]</span> 획득!", { rarity: keptItem.rarity, name: _t(keptItem.name) }), '', { item: keptItem });
    rollWildTalismanDrop(enemy, talismanChance);
    rollEnemyJewelDrop(enemy, contentDropMul);
    let mappingZone = isBeeMappingZone(zone);
    rollBeeLoot(enemy, mappingZone, ui);
    if (zone && zone.type === 'atlasMap' && atlasPassives.has(game, 'beeEvents')) maybeTriggerBeeMappingEvent(enemy);
    rollHiveKeyDrop(enemy, mappingZone, ui);
    rollColonyTraceDrop(zone, ui);
    rollKnittingYarn(enemy, zone);
    dropLabyrinthGuardianFossils(enemy, zone, ui);
}

/** Threads share floor pickup and offline settlement. Reserve one-per-loop drops when laid, before the hero picks them up. */
function rollKnittingYarn(enemy, zone) {
    const id = knitting.rollKill(game, zone, enemy);
    if (!id) return;
    knitting.markDrop(game, id);
    if (actExplorationState.groundLoot.reserve({ gx: enemy.gx, gy: enemy.gy, kind: 'yarn', yarn: id })) return;
    const run = explorationFloorFor(enemy);
    if (run) actExplorationState.groundLoot.placeYarn(run, enemy, id);
    else receiveKnittingYarn(id);
}

function rollAwakenedEchoDrop(enemy, contentDropMul, gemAwakening, ui) {
    if (!(contentProgression.canDropCurrency('awakenedEcho') && gemAwakening && (enemy.isBoss || enemy.isElite))) return;
    let echoChance = enemy.isBoss ? 0.045 : 0.004;
    if (Math.random() < echoChance * contentDropMul) {
        awardEnemyLootCurrency('awakenedEcho', 1);
        if (game.settings.showLootLog) ui.say(_t('🌌 각성 잔향 +1'), 'loot-unique');
    }
}

function rollEnemyRuneDrop(enemy, contentDropMul, gemAwakening, ui) {
    if (!(Math.random() < (enemy.isBoss ? 0.09 : enemy.isElite ? 0.018 : 0.003) * contentDropMul * getEnemyGemDropMul(enemy))) return;
    const reward=rollEnemyGemReward(gemAwakening, !!enemy.isBoss);   // 체이싱 룬(탐욕의 광기)은 보스에게서만
    if (reward.gem && placeFloorRune(enemy, reward.gem)) return;
    if (actExplorationState.groundLoot.encounterOwner()) return;
    if(reward.gem) {
        gemDropRewards.grant(game,reward.gem,reward.kind==='support'?ui.resonanceCap():0);
        ui.unlocks();
    }
    dispatchRuntimeEvent('gem-loot-received',reward);
}

/** One currency drop: a core goes to the floor or the core box; a currency is kept (a floor pile logs when picked up). */
function keepEnemyCurrencyDrop(enemy, drop, ui) {
    if (!drop || !drop[0]) return;
    if (drop[0] === 'core') {
        const core = coreItems.roll();
        if (placeFloorItem(enemy, 'core', core)) return;
        coreItems.keep(core);
        queueEnemyGroundLoot(enemy, { item: core, itemKind: 'core' });
        dispatchRuntimeEvent('core-item-received', core);
        return;
    }
    const { gain, floor } = keepCurrencyDrop(enemy, drop[0], drop[1]);
    if (gain <= 0 || floor) return; // a floor drop logs when picked up (js/battle-ground-loot-ui.js)
    logEnemyCurrencyGain(drop[0], gain, ui);
}

function logEnemyCurrencyGain(key, gain, ui) {
    let currencyName = typeof getStyledOrbName === 'function' ? getStyledOrbName(key) : ((ORB_DB[key] && _t(ORB_DB[key].name)) || key);
    if (game.settings.showLootLog) ui.say(`🪙 ${currencyName} +${gain}`, key === 'goldenRule' || key === 'sapBud' ? 'loot-unique' : 'loot-magic');
}

function rollEnemyJewelDrop(enemy, contentDropMul) {
    if (!(contentProgression.isUnlocked('jewel') && (game.season || 1) >= 5 && (enemy.isElite || enemy.isBoss) && Math.random() < 0.0056 * contentDropMul)) return;
    let jewel = generateJewelDrop(getZone(game.currentZoneId) || { type: 'act', storyOrder: 1 });
    if (placeFloorItem(enemy, 'jewel', jewel)) return;
    const receipt=receiveJewelDrop(jewel);
    if (receipt.stored) queueEnemyGroundLoot(enemy, { item: jewel, itemKind: 'jewel', color: getJewelLootColor(jewel) });
    dispatchRuntimeEvent('jewel-drop-received',receipt);
}

/** Hive loot once the hive is open for good, in hunting zones, not from bosses: pollen, and from elites venom stingers, enchanted honey
 * and beeswax. */
function rollBeeLoot(enemy, mappingZone, ui) {
    let beeUnlocked = !!(game.beehive && game.beehive.unlockedPermanent);
    if (!(beeUnlocked && mappingZone && !enemy.isBoss)) return;
    let beeLootLogs = [];
    rollPollenDrop(enemy, beeLootLogs);
    if (enemy.isElite) rollEliteBeeLoot(beeLootLogs);
    if (game.settings.showLootLog && beeLootLogs.length > 0) beeLootLogs.forEach(msg => ui.say(`🐝 ${msg}`, 'loot-normal'));
}

/** 꽃가루: 드물게 처치 자리 바닥에(2026-11-02 사용자, 전에는 5% 확률로 바로 들어왔다). 바닥이 없는 곳에서만 바로 들어오며 그때 기록을 남긴다. */
function rollPollenDrop(enemy, beeLootLogs) {
    if (Math.random() >= 0.015) return;
    const amount = enemy.isElite ? 2 : 1;
    if (!keepCurrencyDrop(enemy, 'pollen', amount).floor) beeLootLogs.push(`꽃가루 +${amount}`);
}

function rollEliteBeeLoot(beeLootLogs) {
    if (Math.random() < 0.0048) {
        awardEnemyLootCurrency('venomStinger', 1);
        beeLootLogs.push('독벌침 +1');
    }
    if (Math.random() < 0.00064) {
        awardEnemyLootCurrency('enchantedHoney', 1);
        beeLootLogs.push('마력 깃든 벌꿀 +1');
    }
    if (Math.random() < 0.0032) {
        awardEnemyLootCurrency('beeswax', 1);
        beeLootLogs.push('밀랍 +1');
    }
}

function rollHiveKeyDrop(enemy, mappingZone, ui) {
    if (!((game.season || 1) >= 8 && mappingZone && Math.random() < (enemy.isBoss ? 0.005 : enemy.isElite ? 0.0015 : 0.0002))) return;
    awardEnemyLootCurrency('hiveKey', 1);
    if (game.settings.showLootLog) ui.say(_t('🗝️ 벌집 입장권 열쇠를 발견했습니다.'), 'loot-rare');
}

function rollColonyTraceDrop(zone, ui) {
    let isDeepChaosZone = isDeepChaosLootZone(zone);
    if (!((game.season || 1) >= 15 && (isDeepChaosZone || game.currentZoneId === 'beehive_run' || game.currentZoneId === 'grand_breach_run'))) return;
    let traceChance = isDeepChaosZone ? 0.00075 : (game.currentZoneId === 'grand_breach_run' ? 0.001125 : 0.0005);
    if (Math.random() < traceChance) {
        awardEnemyLootCurrency('colonyTrace', 1);
        ui.say(_t('🧭 군락지 흔적을 발견했습니다.'), 'loot-magic', { noToast: true });
    }
}

function clearDotFxThrottleForEnemy(enemyId) {
    if (!Number.isFinite(enemyId)) return;
    let fxState = game.dotFxThrottle;
    if (!fxState || typeof fxState !== 'object') return;
    let prefix = `${enemyId}:`;
    Object.keys(fxState).forEach(key => {
        if (key && key.startsWith(prefix)) delete fxState[key];
    });
}

// 루프의 첫 처치는 그 직업의 대표 무기를 떨어뜨린다(2026-11-09 사용자: "기존 몹 잡아서 룬 떨어지는 건 직업에 맞는 무기로 바꿔서 장비 장착 튜토리얼로").
// 기초 스킬은 직업을 고를 때 받고(js/basic-skills.js) 그 무기를 들어야 쓴다. 무기 칸이 차 있으면(봉인해 물려받은 무기) 떨어뜨리지 않는다.
// 탐험 지도에서는 그 처치 자리 바닥에 떨어지고 주울 때 들어온다(액트 1 입구 방의 첫 몬스터, createStarterRescuePack). 장착 안내를 아직 안 본
// 저장(새 게임의 첫 루프)은 그 무기를 안내까지 가방에 둔다(starterWeaponTutorialPending, js/content-progression-ui.js announceStarterWeapon).
// 그 뒤 루프는 빈 칸 자동 장착 설정대로 낀다. enemy가 없으면(스크립트) 바로 가방으로 간다.
function grantLoopStarterWeaponOnFirstKill(enemy) {
    if (game.loopStarterWeaponGranted) return;
    game.loopStarterWeaponGranted = true;
    const item = createClassStarterWeapon(game.selectedClassId);
    if (!item) return;
    if (!(game.seenTutorials || []).includes(basicSkills.weaponGuide)) game.starterWeaponTutorialPending = item.id;
    if (enemy) keepEquipmentDrop(enemy, item, { guaranteedKeep: true });
    else addItemToInventory(item, { guaranteedKeep: true });
}

/** Resolve a live victim once; a defeated training target finishes its measurement without becoming a rewarded kill. */
function resolveEnemyDeath(enemy) {
    if (!enemy || !Number.isFinite(enemy.id)) return null;
    const liveRef = (game.enemies || []).find(entry => entry && entry.id === enemy.id);
    // 이미 처리되어 enemies 배열에서 제거된 적(중복 재귀 호출)은 무시한다.
    if (!liveRef || liveRef.hp > 0) return null;
    enemy = liveRef;
    // A training target is not a kill: no experience, loot, growth or on-kill rewards.
    if (game.currentZoneId === WOODSMAN_ECHO_ZONE_ID) {
        const run = ensureWoodsmanEchoRunState();
        run.totalDamage = Math.max(run.totalDamage, Math.floor(enemy.echoStartHp || enemy.maxHp));
        finishWoodsmanEchoRun();
        return null;
    }
    return enemy;
}

/** The kill in the counters: a boss's content records, the grand breach's survival count, the loop's kills, and during an offline
 * settlement the normal/elite/boss mix it projects the rest with. */
function countKillForContent(enemy, zone, pStats) {
    if (enemy.isBoss) markBossKillForContent(enemy, zone, pStats);
    countGrandBreachSurvivalKill(enemy, zone);
    noteOceanKill(enemy, zone);
    combatIncidents.onKill(enemy, zone);
    game.loopKills = Math.max(0, Math.floor(game.loopKills || 0)) + 1;
    if (game.isBackgroundCalculation) countBackgroundKillMix(enemy);
}

function markBossKillForContent(enemy, zone, pStats) {
    completeHiddenJournalBossRun(enemy, zone, pStats);
    // 재능 개화 미궁의 보스를 실제로 처치한 경우에만 개화 완료를 허용하기 위해 기록한다.
    if (zone && zone.type === 'trial' && zone.bloomTrial) game.bloomBossDefeated = true;
}

function countGrandBreachSurvivalKill(enemy, zone) {
    const grand = game.voidRift.grandRun;
    if (zone?.id !== 'grand_breach_run' || !grand?.inRun || grand.phase !== 'survival' || enemy.isBoss) return;
    const progress = getGrandBreachProgress(grand.gauge);
    if (progress.complete) {
        grand.phase = 'bossPending';
        return;
    }
    grand.kills = getGrandBreachRewardSummary(grand.kills).kills + 1;
    const gain = enemy.isElite ? GRAND_BREACH_ENCOUNTER.eliteGaugeGain : GRAND_BREACH_ENCOUNTER.normalGaugeGain;
    const next = getGrandBreachProgress(progress.gauge + gain);
    grand.gauge = next.gauge;
    if (next.complete) grand.phase = 'bossPending';
}

/** 백그라운드 정산이 남은 구간을 예상할 때 쓸 처치 구성. 재화 드랍 확률은 일반/정예/보스가 자릿수 단위로 다르므로(황금률: 보스 0.6% vs
 * 일반 0.007%), 총 처치 수만으로는 남은 구간의 재화를 제대로 다시 굴릴 수 없다. 시뮬레이션 중에만 센다. */
function countBackgroundKillMix(enemy) {
    const mix = game.backgroundKillMix && typeof game.backgroundKillMix === 'object'
        ? game.backgroundKillMix : (game.backgroundKillMix = { normal: 0, elite: 0, boss: 0 });
    const bucket = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'normal');
    mix[bucket] = Math.max(0, Math.floor(mix[bucket] || 0)) + 1;
}

/** Talent state kept per kill: the inquisitor's marks on this monster go, 콜로세움 브레이커 counts the crowd's roar (5 = next strike). */
function tickTalentKillRuntime(enemy) {
    // 재능 런타임: 적별 누적 상태 정리(메모리 누수 방지)
    if (game.talentInquisitorMarks) delete game.talentInquisitorMarks[enemy.id];
    if (typeof isTalentCardActive !== 'function' || !isTalentCardActive('hero2__gladiator')) return;
    game.talentRuntime = (game.talentRuntime && typeof game.talentRuntime === 'object') ? game.talentRuntime : {};
    game.talentRuntime.colosseumKills = (game.talentRuntime.colosseumKills || 0) + 1;
    if (game.talentRuntime.colosseumKills >= 5) { game.talentRuntime.colosseumKills = 0; game.talentRuntime.colosseumReady = true; }
}

/** From loop 9 in void rift zones: a kill counts toward an open rift's wave, and with no rift open may open one at random. */
function rollRandomVoidRiftOnKill(enemy, zone, say) {
    // 루프 특수 보스 집계에는 일반 액트/혼돈 보스를 포함하지 않음.
    if ((game.season || 1) < 9 || !isVoidRiftCombatZone(zone)) return;
    const v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (v.active) {
        if (enemy.fromVoidRift) v.defeatedCount = Math.max(0, Math.floor(v.defeatedCount || 0)) + 1;
        return;
    }
    if (Math.random() >= (enemy.isElite ? 0.0003335 : 0.000075)) return;
    Object.assign(v, { active: true, activeKills: 0, requiredKills: 0, pendingWave: true, totalToSpawn: 6 + Math.floor(Math.random() * 4), spawnedCount: 0, defeatedCount: 0, spawnTick: 0 });
    say('🕳️ 공허의 구멍이 랜덤으로 열렸습니다!', 'attack-monster', { noToast: true });
}

/** Corpse explosions a kill may set off, each rolled in turn: rune corpses, 종말의 논리, 시체 역병. chain kills what a blast
 * brings to 0, log writes a blast's line. */
function explodeCorpsesOnKill(enemy, pStats, say) {
    const chain = target => handleEnemyDeath(target, pStats);
    const log = line => { if (line && game.settings.showCombatLog) say(line, 'attack-player'); };
    explodeRuneCorpse(enemy, pStats, chain, log);
    explodeUniqueCorpse(enemy, pStats, chain, log);
    explodePlagueCorpse(enemy, chain, log);
}

function explodeRuneCorpse(enemy, pStats, chain, log) {
    if (!pStats || !((pStats.runeCorpseExplodeChance || 0) > 0) || Math.random() >= corpseExplosionChance(pStats.runeCorpseExplodeChance)) return;
    log(explodeCorpse(enemy, corpseExplosionSplash(enemy, pStats.runeCorpseExplodeLifePct), '룬 시체 폭발', chain));
}

/** 종말의 논리: rolled whenever the unique is worn (even at 0%), as it always was. 대폭발(폭약술사 bm7, 2026-11-11): 점화된 채 쓰러진
 * 적은 굴림 없이 터진다. */
function explodeUniqueCorpse(enemy, pStats, chain, log) {
    if (!pStats || !pStats.uniqueCorpseExplode) return;
    const ignited = hasKeystone('bm7') && (enemy.ailments || []).some(row => row && row.type === 'ignite' && (row.time || 0) > 0);
    if (!ignited && Math.random() >= corpseExplosionChance(pStats.uniqueCorpseExplode.chance)) return;
    const splash = corpseExplosionSplash(enemy, pStats.uniqueCorpseExplode.lifePct);
    const line = explodeCorpse(enemy, splash, hasKeystone('bm7') ? '대폭발' : '종말의 논리 시체 폭발', chain);
    addBattleFx('hit', { enemyId: enemy.id, color: '#c56cff', damage: splash, duration: 360, element: 'chaos', syncToSwing: true });
    log(line);
}

/** 시체 역병(워록 wlk9): 카오스 피해로 처치 시 50% 확률로 시체 폭발(적 최대 생명력의 20%를 주변에 카오스 피해). 심연 각인(wlk1)으로 모든
 * 피해가 카오스인 경우 처치 원소와 무관하게 카오스 처치로 간주. */
function explodePlagueCorpse(enemy, chain, log) {
    if (!hasKeystone('wlk9') || !(enemy.lastHitElement === 'chaos' || hasKeystone('wlk1')) || Math.random() >= 0.5) return;
    const splash = Math.max(1, Math.floor((enemy.maxHp || enemy.hp || 0) * 0.20));
    const line = explodeCorpse(enemy, splash, '시체 역병', chain, '카오스 피해');
    addBattleFx('hit', { enemyId: enemy.id, color: '#9b59ff', damage: splash, duration: 360, element: 'chaos', syncToSwing: true });
    log(line);
}

/** Unique on-kill effects: movement stacks (with their cooldown) and the leech efficiency window. */
function applyUniqueKillEffects(pStats) {
    if (!pStats) return;
    if (pStats.uniqueKillMoveStacks) stackUniqueKillMove(pStats.uniqueKillMoveStacks);
    if (pStats.uniqueLeechEfficiencyOnKill) {
        game.uniqueLeechEfficiencyUntil = getCombatTime() + Math.max(1000, Math.floor((pStats.uniqueLeechEfficiencyOnKill.duration || 8) * 1000));
    }
}

function stackUniqueKillMove(rule) {
    const now = getCombatTime();
    const state = game.uniqueKillMoveStacksState || { stacks: 0, expiresAt: 0, lastProcAt: 0 };
    if ((state.lastProcAt || 0) + Math.floor((rule.cooldownSec || 1) * 1000) <= now) {
        state.stacks = Math.min(Math.max(1, Math.floor(rule.maxStacks || 20)), Math.max(0, Math.floor(state.stacks || 0)) + 1);
        state.lastProcAt = now;
    }
    state.expiresAt = now + Math.floor((rule.duration || 20) * 1000);
    game.uniqueKillMoveStacksState = state;
}

/** The overkill a unique splashes onto the other monsters after a kill, or 0. */
function getOverkillSplash(enemy, pStats) {
    const left = Number(enemy.lastOverkillDamage);
    return pStats && pStats.uniqueOverkillSplash && Number.isFinite(left) && left > 0 ? Math.max(1, Math.floor(left)) : 0;
}

/** A kill in the colony run, and when the wave's kills are in, the wave's end. */
function advanceColonyWaveOnKill(zone, say, enemy) {
    if (!zone || zone.id !== 'colony_run' || !game.colony || !game.colony.inRun) return;
    releaseColonyBossLootOnKill(enemy);
    game.colony.kills = Math.max(0, Math.floor((game.colony.kills || 0) + 1));
    if ((game.colony.kills || 0) >= Math.max(1, Math.floor(game.colony.requiredKills || 1))) completeColonyWave(zone, say, enemy);
}

function releaseColonyBossLootOnKill(enemy) {
    if (game.colony.wave%5===0 && enemy?.isBoss) game.colony.bossLootCell={gx:enemy.gx,gy:enemy.gy};
    if (game.colony.bossLootCell) actExplorationState.groundLoot.releaseEncounter(game.colony,game.colony.bossLootCell);
}

/** A ward from a colony wave (straight into the bag): a log line with its line, or a 고유 액막이 (js/colony-wards.js createUnique) by name
 * with the chase notice the floor pickups give (js/battle-ground-loot-ui.js revealUnique), not during an away settlement. */
function announceColonyWard(ward, say) {
    if (!ward) return;
    const line = ward.baseStats[0];
    if (ward.rarity !== 'unique') return say(_t('🛡️ 군락지 액막이 부적 획득: {statName} +{id}', { statName: colonyWardsUi.statName(line.id), id: formatValue(line.id, line.val) }), 'loot-rare', { item: ward, itemKind: 'talisman' });
    say(_t('🛡️ 군락지 고유 액막이 획득: [{name}]', { name: ward.name }), 'loot-unique', { item: ward, itemKind: 'talisman' });
    if (!game.isBackgroundCalculation) dispatchRuntimeEvent('incident', { text: _t('체이싱 고유 장비를 획득했습니다. 「{name}」', { name: ward.name }), tone: 'chase', chase: true });
}

function grantColonyWaveCurrencies(completedWave) {
    // A wave's own rewards come at once (the log says so); only kill drops wait for the overlord
    const shards=1+Math.floor(completedWave/3);
    awardCurrency('colonyShard',shards);
    if(Math.random()<0.35)awardCurrency('formlessDew',1,'drop');
    if(completedWave%10===0)awardCurrency('colonyTrace',1);
    return shards;
}

function repairColonyDefenseCore() {
    const run=getColonyRoomRun(),colony=game.colony;
    if(!run || !actExplorationMap.forRun(run).colonyDefense || colony.coreMaxHp<=0)return;
    colony.coreHp=Math.min(colony.coreMaxHp,colony.coreHp+Math.max(1,Math.floor(colony.coreMaxHp*0.1)));
}

/** A colony wave's rewards (shards, a chance of dew, a trace every 10th wave, a ward) and the next wave. */
function completeColonyWave(zone, say, lastEnemy) {
    if(!game.colony?.inRun)return;
    const completedWave = Math.max(1, Math.floor(game.colony.wave || 1));
    const shardReward=grantColonyWaveCurrencies(completedWave);
    // 액막이도 바닥에(5웨이브마다 반드시, 나머지 웨이브 28%, js/colony-wards.js rollColonyWave): 마지막 몬스터 자리에서 다른 드랍과 함께 기다린다.
    announceColonyWard(colonyWards.rollColonyWave(completedWave, zone, Math.random, lastEnemy), say);
    releaseCompletedColonyWaveLoot(completedWave,lastEnemy);
    game.colony.wave = Math.max(1, Math.floor((game.colony.wave || 1) + 1));
    game.colony.highestWave = Math.max(Math.floor(game.colony.highestWave || 1), game.colony.wave);
    if (game.colony.highestWave >= 11) unlockJournalEntry('colony_wave_10');
    game.colony.kills = 0;
    game.colony.requiredKills = getColonyWaveEnemyCount(game.colony.wave);
    repairColonyDefenseCore();
    // The same arena raises the next wave on the next tick; a legacy board still spawns now.
    if (!getColonyRoomRun() && !game.colony.lootPending) spawnColonyWave();
    say(_t('🪲 군락지 {completedWave}웨이브 완료. 군락지 편린 +{shardReward}{value}', { completedWave, shardReward, value: completedWave % 10 === 0 ? _t(', 군락지 흔적 +1') : '' }), 'loot-magic');
    queueImportantSave(200);
}

function releaseCompletedColonyWaveLoot(completedWave,lastEnemy) {
    if(completedWave%5===0) {
        actExplorationState.groundLoot.releaseEncounter(game.colony,game.colony.bossLootCell || lastEnemy);
        game.colony.lootPending=true;
    }
    game.colony.bossLootCell=null;
}

function grantGrandBreachClearRewards(kills, enemy = game.gridPlayer) {
    const rewards = getGrandBreachRewardSummary(kills);
    rewards.voidChisel = keepCurrencyDrop(enemy, 'voidChisel', rewards.voidChisel).gain;
    rewards.jewelShard = rewards.jewelShard > 0 ? keepCurrencyDrop(enemy, 'jewelShard', rewards.jewelShard).gain : 0;
    return rewards;
}

function grandBreachClearRewardText(rewards) {
    const pieces = [_t('균열 몬스터 {kills}처치 정산', { kills: rewards.kills })];
    if (rewards.voidChisel) pieces.push(`공허의 끌 +${rewards.voidChisel}`);
    if (rewards.jewelShard) pieces.push(`주얼 결정 +${rewards.jewelShard}`);
    return pieces.join(', ');
}

/** The lord releases the held horde loot; the hero leaves only after picking up the floor. */
function finishGrandBreachOnBossKill(enemy, zone, say) {
    const grand = game.voidRift.grandRun;
    if (!zone || zone.id !== 'grand_breach_run' || !enemy.isBoss || !grand || !grand.inRun || grand.phase!=='boss') return;
    const v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    const rewards = grantGrandBreachClearRewards(grand.kills,enemy);
    actExplorationState.groundLoot.releaseEncounter(grand,enemy);
    grand.rewardVoidChisel = rewards.voidChisel;
    grand.rewardJewelShard = rewards.jewelShard;
    grand.phase = 'loot';
    v.grandBreachCleared = true;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    markLoopSpecialBossKill('void_grand_breach');
    unlockJournalEntry('void_grand_breach');
    say(_t('🌌 대균열 보스를 격파했습니다! {rewards}. 바닥 전리품을 모두 획득하면 귀환합니다.', { rewards: grandBreachClearRewardText(rewards) }), 'level-up');
    finishGrandBreachLootCollection(zone);
    queueImportantSave(200);
}

/** Whether the lord's floor still holds items. An offline replay walks no detours (collectingLoot is foreground only): it takes
 * the floor at once. */
function grandBreachFloorLeft() {
    const floor=actExplorationState.current(game);
    if(floor?.groundLoot.length && game.isBackgroundCalculation)collectExplorationFloorLoot(actExplorationState.groundLoot.takeAll(floor));
    return !!floor?.groundLoot.length;
}

/** A cleared breach stays on its field until every released item has been collected. */
function finishGrandBreachLootCollection(zone) {
    const grand=game.voidRift.grandRun;
    if(!grand?.inRun || grand.phase!=='loot')return;
    if(grandBreachFloorLeft())return;
    if(!actExplorationProgress.beginCompletion(zone))return;
    grand.inRun=false;
    grand.phase='done';
    actExplorationProgress.depart(game);
    game.currentZoneId=grand.returnZoneId!==undefined && grand.returnZoneId!==null
        ? grand.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
    queueImportantSave(200);
}

/** The full UI redraw after a kill that changed more than the fight: a boss or elite, new currency, a gem level, the colony, a badge. */
function flagHeavyUiAfterKill(enemy, zone, gemLeveled, currencyDropVersionBefore) {
    const currencyChanged = Math.max(0, Math.floor(game.currencyDropVersion || 0)) !== currencyDropVersionBefore;
    const colonyStateChanged = Boolean(zone && zone.id === 'colony_run' && game.colony && game.colony.inRun);
    const badge = ['char', 'skills', 'items', 'map'].some(key => game.noti[key]);
    if ([enemy.isBoss, enemy.isElite, currencyChanged, gemLeveled, colonyStateChanged, badge].some(Boolean)) pendingHeavyUiRefresh = true;
}

function transferSkillDotOnDeath(enemy) {
    let dotState = enemy && enemy.dotState;
    let skill = dotState && SKILL_DB[dotState.skillName];
    let config = skill && skill.dotTransferOnDeath;
    if (!config || dotState.timeLeft <= 0) return;
    let target = (game.enemies || []).find(entry => entry && entry.id !== enemy.id && entry.hp > 0);
    if (!target) return;
    let scale = Math.max(0, Number(config.remainingDamagePct) || 0) / 100;
    let transferred = { ...dotState, rawTickDamage: Math.max(1, Math.floor(dotState.rawTickDamage * scale)) };
    if (!target.dotState || transferred.rawTickDamage >= target.dotState.rawTickDamage) target.dotState = transferred;
    target.dotStacks = Math.max(target.dotStacks || 0, transferred.stacks || 1);
    addConfirmedSkillEffect('confirmedTransfer',{skillName:dotState.skillName,sourceCell:copyCombatGridCell(enemy)},target,dotState.ele);
    addBattleFx('statusText', {
        enemyId: target.id,
        text: _t('지속 피해 이전'),
        color: '#b98cff',
        duration: 700,
        dedupeKey: `dot-transfer:${enemy.id}:${target.id}`
    });
}

/** 급소 표식(r5): every third hit adds 3% of the target's maximum life. A boss takes at most the triggering hit again
 * (2026-10-04): a share of maximum life ignores the boss's size, so it let any ranger cut the woodsman (93M life) by a third. */
/** 급소 표식(r5): 최대 생명력의 lifePct%, 보스에게는 최대 생명력의 bossLifePct%와 그 적중 피해의 bossHitMul배 가운데 큰 값(2026-11-11 사용자). */
function getRangerWeakpointBonus(enemy, hitDamage) {
    const v = ASCENDANCY_KEYSTONE_VALUES.r5, maxHp = enemy.maxHp || enemy.hp || 1;
    if (!enemy.isBoss) return Math.max(1, Math.floor(maxHp * v.lifePct / 100));
    return Math.max(1, Math.floor(maxHp * v.bossLifePct / 100), Math.floor((hitDamage || 0) * v.bossHitMul));
}

/** Share of regeneration left after fatigueMs of fighting, 1 → 0. */
function getEnemyRegenFatigueFactor(fatigueMs) {return Math.max(0, 1 - Math.max(0, fatigueMs) / ENEMY_REGEN_FATIGUE_MS);}

function applyEnemyRegen(enemy, pStats) {
    const maxHp = Math.max(1, enemy.maxHp || enemy.hp || 1), fatigue = tireEnemyRegen(enemy, getCombatTime());
    if ((enemy.regenRate || 0) > 0 && enemy.hp < maxHp && fatigue > 0) {
        const wholeRegen = takeEnemyRegenAmount(enemy, maxHp * getEnemyRegenRate(enemy, pStats) * fatigue);
        if (wholeRegen > 0) enemy.hp = Math.min(maxHp, enemy.hp + wholeRegen);
    }
    enemy.regenHpMark = enemy.hp;
}

function tireEnemyRegen(enemy, now) {
    if (enemy.isWoodsman) return 1;
    const mark = Number(enemy.regenHpMark);
    if (Number.isFinite(mark) && enemy.hp < mark) enemy.regenLastLossAt = now;
    const fighting = now - (Number(enemy.regenLastLossAt) || -Infinity) < regenCalmWindowMs(enemy);
    enemy.regenFatigueMs = fighting ? Math.min(ENEMY_REGEN_FATIGUE_MS, (Number(enemy.regenFatigueMs) || 0) + ENEMY_REGEN_STEP_MS) : 0;
    return getEnemyRegenFatigueFactor(enemy.regenFatigueMs);
}

/** Life fraction healed per step after suppression, curses, uniques and talents. */
function getEnemyRegenRate(enemy, pStats) {
    const suppress = Math.max(0, Math.min(95, enemy.regenSuppressPct || 0));
    const curseFx = getEnemyConditionDebuffFactor(enemy);
    const uniqueRegenCut = (pStats && pStats.uniqueEnemyRegenCutAndMinRoll) ? Math.max(0, Number(pStats.uniqueEnemyRegenCutAndMinRoll.enemyRegenRateMul || 1)) : 1;
    const talentRegenMul = typeof getTalentEnemyRegenMultiplier === 'function' ? getTalentEnemyRegenMultiplier(enemy) : 1;
    return Math.max(0, enemy.regenRate * (1 - suppress / 100) * (curseFx.enemyRegenRateMul || 1) * uniqueRegenCut * talentRegenMul);
}

/** Whole life points healed now; the fractional rest waits in enemy.regenBank (tenths). */
function takeEnemyRegenAmount(enemy, rawRegen) {
    let wholeRegen = Math.floor(Math.max(0, rawRegen));
    const fractionalRegen = Math.max(0, rawRegen) - wholeRegen;
    enemy.regenBank = Math.max(0, Number(enemy.regenBank) || 0);
    if (fractionalRegen > 0) enemy.regenBank = Math.round((enemy.regenBank + Math.max(0.1, Math.round(fractionalRegen * 10) / 10)) * 10) / 10;
    if (enemy.regenBank >= 1) {
        wholeRegen += Math.floor(enemy.regenBank);
        enemy.regenBank = Math.round((enemy.regenBank - Math.floor(enemy.regenBank)) * 10) / 10;
    }
    return wholeRegen;
}

function ensureNextEndlessChaosDepthUnlocked(depth) {
    let clearedDepth = Math.max(1, Math.floor(depth || 1));
    if ((game.season || 1) < 10 || clearedDepth < 20) return 0;
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    let nextDepth = Math.max(21, clearedDepth + 1);
    if (!game.abyssUnlockedDepths.includes(nextDepth)) game.abyssUnlockedDepths.push(nextDepth);
    game.abyssUnlockedDepths = Array.from(new Set(game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b);
    return nextDepth;
}

function resolveNextLoopBestPlusOneZone(zone) {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, cosmosPlanets: [] };
    let resolveAnyClimb = zone && zone.type === 'meteor';
    let currentAbyssDepth = zone && zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    let currentLoopAbyssDepth = Math.max(0, Math.floor(game.loopProgressCurrent.bestAbyssDepth || 0), currentAbyssDepth);
    if (zone && (zone.type === 'abyss' || resolveAnyClimb) && currentLoopAbyssDepth >= 20) {
        // 이번 루프에 깬 최고 층의 다음 층(js/state.js getAutoProgressZoneId와 같은 한 층씩 규칙, 현재 심화층 기록도 맞춘다).
        return getAutoProgressZoneId(getAbyssZoneIdForDepth(Math.max(21, currentLoopAbyssDepth + 1)));
    }
    if (zone && (zone.type === 'labyrinth' || resolveAnyClimb) && Math.max(0, Math.floor(game.loopProgressCurrent.bestLabyrinthFloor || 0)) >= 1) {
        game.labyrinthFloor = Math.max(1, Math.floor(game.loopProgressCurrent.bestLabyrinthFloor || 1) + 1);
        return LABYRINTH_ZONE_ID;
    }
    if (zone && (zone.type === 'chaosRealm' || resolveAnyClimb) && Math.max(0, Math.floor(game.loopProgressCurrent.bestChaosRealmFloor || 0)) >= 1) {
        let st = ensureChaosRealmState();
        st.currentFloor = Math.min(Math.max(1, Math.floor(st.highestFloor || 1)), Math.max(1, Math.floor(game.loopProgressCurrent.bestChaosRealmFloor || 1) + 1));
        return CHAOS_REALM_ZONE_ID;
    }
    return null;
}

function enterAutomaticMeteorEncounter() {
    prepareMeteorEncounterEntry(game.currentZoneId);
    game.currentZoneId = METEOR_FALL_ZONE_ID;
}

/** 혼돈 20 · 심화 클리어: 창공의 탑 해금 검사와 세계수 아틀라스(첫 해금 · 이번 루프의 첫 지도석). */
function onChaos20Cleared() {
    maybeUnlockSkyTowerFromChaos20();
    atlasRun.onChaos20();
}

function enterAutomaticMapInterruptionAfterClear(clearedZone) {
    let star = game.meteorSite || {};
    let beehiveRunning = typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun);
    let grandRunning = !!(game.voidRift && game.voidRift.grandRun && game.voidRift.grandRun.inRun);
    if (game.settings && game.settings.autoEnterMeteor && !beehiveRunning && !grandRunning && star.unlocked && star.skyRiftReady && (!clearedZone || clearedZone.type !== 'meteor')) {
        enterAutomaticMeteorEncounter();
        addLog(_t('☄️ 자동입장: 하늘 균열 100% 충전으로 운석 낙하 지점에 진입합니다.'), 'season-up');
        return true;
    }
    if (typeof autoEnterGrandBreachIfReady === 'function' && autoEnterGrandBreachIfReady()) return true;
    return autoRediveOceanAfterClear(clearedZone);
}

/** 잠수가 가디언 경계(500m마다)에 닿았는데 무리 구간을 돌고 있으면 그 구간을 접고 가디언 판을 연다(2026-10-19 사용자: "경계에
 * 닿으면 가디언 바로 등장"). 남은 무리는 처치 보상 없이 사라지고, 이미 다 깬 구간은 끝나는 대로(낚시 게이지를 받고) 가디언 판으로
 * 넘어간다. 이동하는 동안 넘었으면 걸어 들어갈 무리 지도를 투기장으로 바꿔 짓는다. 멈춤과 쓰러짐에는 손대지 않는다(이 틱의
 * 산소가 영웅을 수면으로 올렸으면 지역이 이미 바뀌어 있다). */
function callOceanGuardianAtBoundary() {
    if (game.currentZoneId !== OCEAN_ZONE_ID || game.combatHalted || !(game.playerHp > 0)) return;
    const st = ensureOceanState();
    if (!st.diving || getOceanPendingBossBoundary(st) <= 0) return;
    if (game.moveTimer > 0) relayOceanArrivalToGuardian();
    else if (isOceanSectionRunning()) startMoving(false);
}

/** 심해에서 쓰러뜨린 몬스터: 수심을 내리고(A안) 공기 방울을 남기면 영웅 머리 위에 채운 산소를 초로 띄운다(B안, js/passives.js
 * applyOceanKill. 산소 막대도 "약 N초 남음"으로 읽는다). */
function noteOceanKill(enemy, zone) {
    if (!zone || zone.type !== 'oceanDepth') return;
    const seconds = applyOceanKill(enemy);
    if (!(seconds > 0)) return;
    addBattleFx('statusText', { text: _t('🫧 산소 +{seconds}초', { seconds }), color: '#8fd8ff', duration: 620 });
    // 쓰러진 자리에서 공기 기둥이 솟는다(js/canvas-stage-ocean.js): 여덟 장(장마다 125ms)을 두 바퀴
    addBattleFx('oceanAir', { enemyId: enemy.id, cell: { gx: enemy.gx, gy: enemy.gy }, duration: 2000 });
}

/** 심해 가디언이 졸개를 부른다(B안, OCEAN_COMBAT_DIVE.guardianAdds): 가디언이 선 뒤 everyMs마다(다음 시각은 가디언이 들고 있다),
 * 살아 있는 졸개가 max보다 적으면. 졸개는 쓰러지며 공기 방울을 남긴다(js/passives.js getOceanKillAirSec). say: 전투 기록(addLog). */
function callOceanGuardianAdds(say) {
    const guardian = getOceanGuardianInFight();
    if (!guardian) return;
    const rule = OCEAN_COMBAT_DIVE.guardianAdds, now = getCombatTime();
    if (!(guardian.oceanAddsAt > 0)) guardian.oceanAddsAt = now + rule.everyMs;
    if (now < guardian.oceanAddsAt) return;
    guardian.oceanAddsAt = now + rule.everyMs;
    const alive = game.enemies.filter(enemy => enemy && enemy.hp > 0 && enemy.oceanAirAdd).length;
    const called = spawnOceanGuardianAdds(guardian, Math.min(rule.count, rule.max - alive));
    if (called > 0 && game.settings.showSpawnLog !== false) say(_t('🫧 심해 가디언이 졸개 {called}마리를 불렀습니다. 쓰러뜨리면 공기 방울이 나옵니다.', { called }), 'attack-monster', { noToast: true });
}

/** 심해 가디언 판에서 싸우고 있는 가디언(칸에 선 살아 있는 보스), 아니면 null. */
function getOceanGuardianInFight() {
    if (game.currentZoneId !== OCEAN_ZONE_ID || !game.oceanBossRunPending || game.combatHalted || !(game.playerHp > 0)) return null;
    const guardian = (game.enemies || []).find(enemy => enemy && enemy.isBoss && enemy.hp > 0);
    return guardian && hasGridCell(guardian) ? guardian : null;
}

/** 가디언 곁 빈칸에 졸개를 세운다. @returns {number} 세운 수 */
function spawnOceanGuardianAdds(guardian, count) {
    const zone = getZone(OCEAN_ZONE_ID), blocked = getGridBlockedCells();
    let called = 0;
    for (; called < count; called++) {
        const cell = findFreeGridCell(blocked, guardian);
        if (!cell) break;
        const enemy = createEnemy(zone, { at: 90, elite: false, boss: false }, 40 + called);
        Object.assign(enemy, cell, { gridMoveTimer: 0.25, attackTimer: 0, oceanAirAdd: true, spawnStamp: getBattleSpawnStamp() });
        blocked.add(gridCellKey(cell.gx, cell.gy));
        game.enemies.push(enemy);
        addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 320, boss: false });
    }
    return called;
}

/** 이동하는 동안 지어 둔 도착 지도가 무리 구간이면 가디언 투기장으로 다시 짓는다(도착한 뒤 한 번 더 이동하지 않게). */
function relayOceanArrivalToGuardian() {
    const run = actExplorationState.current(game);
    if (run && run.arrival && !(run.source && run.source.arena)) prepareActExplorationArrival();
}

/** 무리 구간이 돌고 있는가: 가디언 판이 아니고 아직 다 깨지 않았다(방 단위 지도는 탐험의 상태, 판은 남은 무리와 살아 있는 몬스터). */
function isOceanSectionRunning() {
    const run = actExplorationState.current(game);
    if (run) return !(run.source && run.source.arena) && run.status === 'active';
    const plan = game.encounterPlan || [];
    if (!plan.length || plan.some(marker => marker && marker.boss)) return false;
    return game.encounterIndex < plan.length || (game.enemies || []).some(enemy => enemy && enemy.hp > 0);
}

/** 자동 재잠수(설정 autoRediveOcean, 2026-10-19 사용자: "떠오른 뒤 자동 재잠수 설정"): 산소가 떨어지거나 가디언에게 쓰러져 떠오른 뒤
 * 사냥터 하나를 깨면 다시 잠수한다. 가장 깊은 리프트가 넘지 못한 가디언 앞이면 얕은 리프트부터 내려가 물고기를 모은다
 * (getOceanShallowLiftM, 2026-10-19 사용자 결정 "얕게 돌기"). 부른 쪽(지역 클리어 뒤 출발)이 걸어 들어간다. 소득 없이 떠오른 잠수가
 * 이어지거나 무리에게 쓰러지면 멈춘다(OCEAN_AUTO_REDIVE, data/maps.js). @returns {boolean} 잠수를 시작했는지 */
function autoRediveOceanAfterClear(clearedZone) {
    if (!canAutoRediveOcean(ensureOceanState()) || !isOceanRediveMoment(clearedZone)) return false;
    if (!enterOceanDive({ auto: true, shallow: true })) return false;
    game.killsInZone = 0;
    return true;
}

/** 설정과 잠수 기록이 다시 잠수를 허락하는가: 켜져 있고, 산소가 떨어지거나 가디언에게 쓰러져 떠올랐고, 멈추지 않았다(isOceanAutoRediveHalted). 방치 정산
 * 에서는 잠수하지 않는다: 심해는 투영하지 않아 잠수가 정산의 실제 전투 한도(OFFLINE_PROJECTION.realCapMs)를 써 버리고, 가디언에게
 * 거듭 쓰러지면 정산의 연속 사망 멈춤에 걸린다. */
function canAutoRediveOcean(st) {
    if (!game.settings.autoRediveOcean || game.isBackgroundCalculation || !st.unlocked || st.diving) return false;
    return ['oxygen', 'guardian'].includes(st.lastSurfaceReason) && !isOceanAutoRediveHalted(st);
}

/** 지금 다시 잠수해도 되는 때: 사냥터(액트, 혼돈)를 막 깼고, 귀환 뒤 멈춤이 아니고, 다른 도전 중이 아니고, 생명력이 거의 찼고,
 * 심해로 가는 길이 막히지 않았다(거절 사유는 알리지 않는다: 다음 클리어에 다시 묻는다). */
function isOceanRediveMoment(clearedZone) {
    if (!clearedZone || !['act', 'abyss'].includes(clearedZone.type) || game.settings.townReturnAction === 'stop') return false;
    if (isColonyOrGrandBreachRunning() || game.playerHp < getPlayerHpCap(getPlayerStats()) * 0.9) return false;
    return !getZoneTravelBlockReason(OCEAN_ZONE_ID) && !getContentStartBlockReason();
}

// Keep the destination stable through a pathfinding detour. Re-picking the nearest enemy
// at every cell can reverse that detour forever; attackable enemies still take precedence.
function resolvePlayerApproachTarget(alive) {
    let target = alive.find(enemy => enemy.id === combatTacticsRuntime.approachTargetId);
    if (!target) target = findNearestGridEnemy(game.gridPlayer, alive);
    combatTacticsRuntime.approachTargetId = target ? target.id : null;
    return target;
}

// Called only after a map/floor payout, never between waves of a committed expedition.
function continueMapAfterClear(zone) {
    if (isSkyTowerAtRewardLimit(zone)) {
        actExplorationProgress.stopAfterCompletion(game);
        game.moveTimer = 0;
        return;
    }
    if (game.settings.mapCompleteAction === 'stop') {
        game.combatHalted = true;
        game.moveTimer = 0;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        return;
    }
    enterAutomaticMapInterruptionAfterClear(zone);
    startMoving(false);
}

function grantGuaranteedTrialSkillGem() {
    let skill = pickSkillRuneReward(gemDropRewards.attackRunes());
    gemDropRewards.grant(game, { kind: 'attack', name: skill, awakened: false }, 0);
    addLog(_t("✨ 전직 시련 보상: 공격 룬 <span class='loot-magic'>[{skill}]</span> 획득!", { skill }), 'loot-magic');
    return true;
}

function getTrialSkillGemRewardChance(zone, isFirstClear) {
    if (isFirstClear) return 1;
    return Math.max(0, Math.min(1, Number(zone && zone.repeatGemChance) || 0));
}

function getGrandBreachRewardSummary(kills) {
    let safeKills = Math.max(0, Math.floor(Number(kills) || 0));
    return {
        kills: safeKills,
        voidChisel: 2 + Math.floor(safeKills / 10),
        jewelShard: Math.min(3, Math.floor(safeKills / 15))
    };
}

/** A pinnacle's own unique (data/maps.js signatureUnique): sure on the first clear, then its dropOnly.bossDropChance per clear. */
function grantPinnacleSignatureUnique(zone, firstClear, say) {
    const definition = UNIQUE_DB.find(unique => unique.name === zone.signatureUnique);
    const repeatChance = definition && definition.dropOnly ? Number(definition.dropOnly.bossDropChance) || 0 : 0;
    if (!definition || Math.random() >= (firstClear ? 1 : repeatChance)) return null;
    const item = generateUniqueItem(definition.reqTier, null, definition.name);
    if (addItemToInventory(item, { guaranteedKeep: true })) say(_t('👑 [{name}] 획득!', { name: item.name }), 'loot-unique', { item });
    return item;
}

function grantMilestonePinnacleClearRewards(zone, firstClear, say) {
    if (!zone || !zone.milestonePinnacle) return;
    if (zone.journalId && firstClear && typeof unlockJournalEntry === 'function') unlockJournalEntry(zone.journalId);
    grantPinnacleSignatureUnique(zone, firstClear, say);
    if (!firstClear) {
        addLog(_t('♜ [{name}] 재도전 완료, 최초 격파 보상은 이미 획득했습니다.', { name: _t(zone.name) }), 'season-up');
        return;
    }
    const reward = zone.firstClearReward && typeof zone.firstClearReward === 'object' ? zone.firstClearReward : null;
    const amount = Math.max(0, Math.floor(Number(reward && reward.amount) || 0));
    if (reward && reward.key && amount > 0) awardCurrency(reward.key, amount);
    const rewardName = reward && ORB_DB[reward.key] ? _t(ORB_DB[reward.key].name) : '';
    const rewardText = rewardName ? `, ${rewardName} +${amount}` : '';
    const prefix = zone.pinnacleCapstone ? '👁️ 모든 경계의 관측을 끝냈습니다.' : '♜ 새로운 최종 관문을 정복했습니다.';
    addLog(_t('{prefix} [{name}] 최초 격파{rewardText}', { prefix, name: _t(zone.name), rewardText }), 'loot-unique');
}

function getBeyondBoundaryCompletionRewardContext(result) {
    let focus = BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === result.rewardFocusId)
        || BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    // Pre-patch active runs retain their earned payout as equipment. New runs
    // reject a locked selection before payment instead of using this fallback.
    if (!getBeyondBoundaryRewardFocusStatus(focus.id).available) {
        focus = BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    }
    let intensity = BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === result.intensityId)
        || BEYOND_BOUNDARY_INTENSITY_DB[0];
    let tier = Math.max(1, Math.floor(Number(result.tier) || 1));
    let liveZone = getZone(BEYOND_BOUNDARY_ZONE_ID) || {};
    let zone = {
        ...liveZone, tier: getUnderworldTier(30) + Math.floor((tier - 1) / 2),
        boundaryTier: tier, name: _t('경계 너머 {tier}단계 완료 보상', { tier })
    };
    return { focus, intensity, tier, zone, rewardChanged: focus.id !== result.rewardFocusId };
}

/** Every 10 underworld floors: rune slots (to 6) and rune numbers (to 30) through floor 300; past it, rune growth materials. */
function grantUnderworldFloorMilestone(floor, progress) {
    const reward = window.GameModules.state.underworldMilestoneReward(floor);
    if (!reward) return;
    if (!reward.rune) return grantUnderworldDeepFloorReward(floor, progress);
    let runeState = game.underworldRunes;
    let prevSlots = Math.max(0, Math.floor(runeState.unlockedSlots || 0));
    let prevMaxRuneNo = Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0));
    runeState.unlockedSlots = Math.min(6, Math.max(prevSlots, reward.slots));
    runeState.unlockedRunesMaxNumber = Math.min(30, Math.max(prevMaxRuneNo, reward.rune.no));
    const lines = [];
    if (runeState.unlockedRunesMaxNumber > prevMaxRuneNo) {
        runeState.obtainedRunes.push(reward.rune.no);
        lines.push(`${reward.rune.name} 지하석 1개`);
    }
    if (runeState.unlockedSlots > prevSlots) lines.push(`지하석 슬롯 ${runeState.unlockedSlots}/6`);
    if (lines.length) dispatchRuntimeEvent('underworld-milestone', { floor, text: _t('🧿 지하계 {floor}층 보상: {lines}', { floor, lines: lines.join(', ') }) });
}

/** Past floor 300 (data/constants.js UNDERWORLD_DEEP_FLOOR_REWARD), each `every`-th floor pays rune materials once:
 * progress.deepRewardFloor keeps the deepest paid floor, so repeating a floor pays nothing. */
function grantUnderworldDeepFloorReward(floor, progress) {
    const reward = window.GameModules.state.underworldMilestoneReward(floor);
    const paid = Math.max(UNDERWORLD_DEEP_FLOOR_REWARD.fromFloor, Math.floor(Number(progress.deepRewardFloor) || 0));
    if (!reward || floor <= paid) return;
    progress.deepRewardFloor = floor;
    const { runeShard: shards, underGold: gold } = reward.currencies;
    awardCurrency('runeShard', shards);
    awardCurrency('underGold', gold);
    dispatchRuntimeEvent('underworld-milestone', { floor, text: _t('🧿 지하계 {floor}층 보상: 지하석 조각 {shards}, 금 {gold}', { floor, shards, gold }) });
}

function rollBeyondBoundaryRewardCount(rewardMul) {
    let multiplier = Math.max(1, Number(rewardMul) || 1);
    return 1 + (Math.random() < Math.min(0.9, multiplier - 1) ? 1 : 0);
}

function grantBeyondBoundaryEquipmentRewards(context) {
    if (context.rewardChanged) addLog(_t('선택한 보상이 잠겨 있어 이번 도전 보상을 장비로 지급합니다.'), 'loot-rare');
    let count = rollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let names = [];
    for (let index = 0; index < count; index++) {
        let item = generateEquipmentDrop({ isBoss: true }, { minimumRarity: 'rare', zone: context.zone });
        if (!item || !addItemToInventory(item, { guaranteedKeep: true })) continue;
        names.push(item.name);
        addLog(_t('경계 완료 보상: [{name}]', { name: _t(item.name) }), 'loot-rare', { item });
    }
    return _t('{length}개의 희귀 이상 장비', { length: names.length });
}

function grantBeyondBoundaryJewelRewards(context) {
    let count = rollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let stored = 0;
    for (let index = 0; index < count; index++) {
        let jewel = generateJewelDrop(context.zone);
        if (!bagItems.put(bagItems.asJewel(jewel))) { // 가방이 차면 주얼 결정으로
            salvageJewelObject(jewel, true);
            continue;
        }
        stored++;
        addLog(_t('경계 완료 보상: [{name}]', { name: _t(jewel.name) }), 'loot-rare', { item:jewel, itemKind:'jewel' });
    }
    let shards = Math.max(1, Math.round((3 + getBeyondBoundaryPayoutTier(context.tier) / 5) * context.intensity.rewardMul));
    awardCurrency('jewelShard', shards);
    return _t('주얼 {stored}개, 주얼 결정 {shards}개', { stored, shards });
}

function grantBeyondBoundaryGemRewards(context) {
    let amount = Math.max(1, Math.round((3 + getBeyondBoundaryPayoutTier(context.tier) / 10) * context.intensity.rewardMul));
    awardCurrency('awakenedEcho', amount);
    return _t('각성 잔향 {amount}개', { amount });
}

function grantBeyondBoundaryCurrencyRewards(context) {
    let tier = getBeyondBoundaryPayoutTier(context.tier);
    let multiplier = context.intensity.rewardMul;
    let buds = Math.max(1, Math.round((3 + tier / 10) * multiplier));
    let dew = Math.max(1, Math.round((2 + tier / 20) * multiplier));
    let sap = tier >= 10 ? 1 + Math.floor(tier / 50) : 0;
    awardCurrency('magicBud', buds);
    awardCurrency('formlessDew', dew);
    if (sap > 0) awardCurrency('sapBud', sap);
    return `마법의 새싹 ${buds}개, 형체 없는 이슬 ${dew}개${sap ? _t(', 수액 새싹 {sap}개', { sap }) : ''}`;
}

function grantBeyondBoundaryFocusedReward(result) {
    let context = getBeyondBoundaryCompletionRewardContext(result);
    let summary = context.focus.id === 'armory' ? grantBeyondBoundaryEquipmentRewards(context)
        : context.focus.id === 'jewel' ? grantBeyondBoundaryJewelRewards(context)
            : context.focus.id === 'gem' ? grantBeyondBoundaryGemRewards(context)
                : grantBeyondBoundaryCurrencyRewards(context);
    return { focusId: context.focus.id, intensityId: context.intensity.id, summary };
}

/** An encounter's end: the zone kind's own finish, else the zone clear once its kills are done, else the next encounter. Split by
 * zone kind on 2026-10-18 (it was one function of complexity 258): the same steps, rolls and UI calls in the same order. The UI
 * calls reach the parts through ui (addLog, updateStaticUI, checkUnlocks, the map reveal). */
function finishEncounterRun() {
    let zone = getZone(game.currentZoneId);
    // 나무꾼의 잔상은 30초가 끝나야 끝난다. 방 단위 지도에서 허수아비가 먼저 쓰러져 지도가 비면 그 자리에서 기록하고 끝낸다.
    if (finishSpecialEncounterEarly(zone)) return;
    if(!actExplorationProgress.beginCompletion(zone))return;
    dispatchRuntimeEvent('encounter-finished', {
        zoneId: zone.id,
        zoneType: zone.type,
        contentContext: getEncounterTelemetryContext(zone),
        background: !!game.isBackgroundCalculation
    });
    let mapAction = game.settings.mapCompleteAction;
    game.killsInZone++;
    if (zone.type === 'atlasMap') return atlasRun.finish(zone);
    // The map reveal is looked up only when a zone opens (it lives in the passive tree canvas script, which some runs lack).
    const ui = { say: addLog, redraw: updateStaticUI, unlocks: checkUnlocks, get reveal() { return triggerMapUnlockReveal; } };
    const finishKind = ENCOUNTER_FINISH_BY_KIND[zone.type];
    if (finishKind) return finishKind(zone, mapAction, ui);
    if (game.killsInZone >= zone.maxKills) return finishZoneClear(zone, mapAction, ui);
    // 구역 maxKills 미달성 시 — 다음 encounter 진행
    checkUnlocks();
    startMoving(false);
    updateStaticUI();
}

function finishSpecialEncounterEarly(zone) {
    if(zone?.type==='woodsmanEcho'){finishWoodsmanEchoRun();return true;}
    if(zone?.id==='grand_breach_run' && game.voidRift?.grandRun?.phase==='loot'){
        finishGrandBreachLootCollection(zone);
        return true;
    }
    return false;
}

/** This loop's progress record, made when missing. */
function ensureLoopProgressCurrent() {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, cosmosPlanets: [] };
    return game.loopProgressCurrent;
}

/** With the next-best-floor map action: the zone it resolves to, else fallback. */
function nextBestZoneOr(zone, fallback) {
    let nextZone = resolveNextLoopBestPlusOneZone(zone);
    return nextZone !== null ? nextZone : fallback;
}

function finishBeyondBoundaryEncounter(zone, mapAction, ui) {
    let result = completeBeyondBoundaryEncounter(game);
    if (!result.ok) return;
    game.killsInZone = 0;
    if (!result.completed) {
        ui.say(_t('경계 너머 {tier}단계, {wave}/{BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER} 조우로 전진합니다.', { tier: result.tier, wave: result.wave, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER }), 'season-up');
        startMoving(false);
    } else finishBeyondBoundaryTier(result, mapAction, ui);
    ui.unlocks();
    ui.redraw();
    queueImportantSave(180);
}

/** A boundary tier broken: the seal's experience (or that it is at its max level), the focused reward, back to the zone it left. */
function finishBeyondBoundaryTier(result, mapAction, ui) {
    let seal = BEYOND_BOUNDARY_SEAL_DB.find(row => row.id === result.sealId);
    let levelText = result.sealResult.levelsGained > 0 ? _t(', 인장 {level}레벨', { level: result.sealResult.level }) : '';
    let focusedReward = grantBeyondBoundaryFocusedReward(result);
    // 최대 레벨 인장은 경험치를 받지 못한다: "경험치 +N" 대신 그렇다고 적는다(2026-10-18).
    let sealMaxed = !!seal && result.sealResult.levelsGained === 0 && result.sealResult.level >= seal.maxLevel;
    let sealText = sealMaxed ? _t('{name} 최대 레벨(경험치 없음)', { name: seal.name }) : _t('{value} 경험치 +{rewardXp}{levelText}', { value: seal ? seal.name : _t('경계 인장'), rewardXp: result.rewardXp, levelText });
    ui.say(_t('경계 너머 {tier}단계 돌파, {sealText}, {summary}', { tier: result.tier, sealText, summary: focusedReward.summary }), 'loot-unique');
    game.currentZoneId = result.returnZoneId !== null && result.returnZoneId !== undefined
        ? result.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
    if (mapAction === 'stop') {
        actExplorationProgress.depart(game);
        actExplorationProgress.stopAfterCompletion(game);
        prepareActExplorationArrival();
    } else startMoving(false);
}

function finishMeteorEncounter(zone, mapAction, ui) {
    grantMeteorEncounterRewards();
    let st = ensureMeteorSiteState();
    st.entriesCleared = (st.entriesCleared || 0) + 1;
    st.activeMeteorTier = null;
    st.kind = null;
    clearWoodsmanBuildLock();
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    game.currentZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    startMoving(false);
    ui.redraw();
    queueImportantSave(200);
}

function finishOutsideChaosEncounter(zone, mapAction, ui) {
    // outsideChaos는 현재 단일 보스(나무꾼) 클리어 전투이므로
    // 완료 시점이면 보스 처치로 간주한다.
    addWoodsmanPendingScore(1000000);
    let realm = ensureChaosRealmState();
    realm.woodsmanBestDamagePct = 100;
    unlockJournalEntry('woodsman_echo');
    maybeUnlockChaosRealmFromWoodsman({ isBoss: true, hp: 0, maxHp: 1 }, { finalize: true });
    markLoopSpecialBossKill('woodsman_true');
    ui.say(_t('🪓 나무꾼을 쓰러뜨렸습니다. 다음 경계가 열립니다.'), 'loot-unique');
    clearWoodsmanBuildLock();
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    enterAutomaticMapInterruptionAfterClear(zone);
    startMoving(false);
    ui.redraw();
    queueImportantSave(220);
}

function finishOceanEncounter(zone, mapAction, ui) {
    // 잠수 중이 아니면(예: 강제 귀환 후 호출) 진행을 변경하지 않는다.
    let oceanSt = ensureOceanState();
    if (oceanSt.unlocked && oceanSt.diving) advanceOceanAfterClear(zone, oceanSt, ui);
    game.currentZoneId = OCEAN_ZONE_ID;
    game.killsInZone = 0;
    startMoving(false);
    ui.redraw();
    queueImportantSave(200);
}

function advanceOceanAfterClear(zone, oceanSt, ui) {
    if (!game.oceanBossRunPending) return advanceOceanDiveFromKill(zone);
    // 방금 클리어한 런은 500m 경계의 심해 가디언 전투였다 → 경계 통과 처리.
    let pendingBoundary = getOceanPendingBossBoundary(oceanSt);
    if (pendingBoundary > 0) {
        oceanSt.bossClearM = pendingBoundary;
        oceanSt.pressureLevel = getOceanDepthTier(oceanSt.depthM);
        awardCurrency('reefFragment', 3);
        ui.say(_t('🌊 수심 {pendingBoundary}m의 심해 가디언을 처치했습니다! 더 깊은 곳으로 길이 열립니다. (암초 조각 +3)', { pendingBoundary }), 'loot-unique');
        if (pendingBoundary >= 500) unlockJournalEntry('ocean_500');
    }
    game.oceanBossRunPending = false;
}

/** This loop's best floor of a content, which the map action 최고층 returns to (resolveNextLoopBestPlusOneZone; the loop settlement
 * clears it). The labyrinth and the chaos realm stopped writing theirs when finishEncounterRun was split (b4d1a2af). */
function recordLoopBestFloor(key, floor) {
    const progress = ensureLoopProgressCurrent();
    progress[key] = Math.max(Math.floor(progress[key] || 0), floor);
}

function finishChaosRealmEncounter(zone, mapAction, ui) {
    let st = ensureChaosRealmState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    recordLoopBestFloor('bestChaosRealmFloor', floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    if (firstClear) {
        st.clearedFloors.push(floor);
        st.clearedFloors.sort((a, b) => a - b);
        grantChaosRealmFloorBonus(floor);
    }
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    ui.say(_t('🌌 혼돈계 {floor}층 돌파!', { floor }), 'season-up');
    game.currentZoneId = mapAction === 'nextLoopBestPlusOne' ? nextBestZoneOr(zone, CHAOS_REALM_ZONE_ID) : CHAOS_REALM_ZONE_ID;
    game.killsInZone = 0;
    continueMapAfterClear(zone);
    ui.redraw();
    queueImportantSave(220);
}

function finishSkyTowerEncounter(zone, mapAction, ui) {
    let st = ensureSkyTowerState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    let remainingBefore = getSkyTowerRemainingClears();
    const kind = remainingBefore === 0 ? 'practice' : st.clearedFloors.includes(floor) ? 'repeat' : 'first';
    const reward = remainingBefore > 0 ? clearSkyTowerFloor(st, floor, mapAction, ui) : 0;
    if (remainingBefore === 0) ui.say(_t('☁️ 창공의 탑 {floor}층 연습 완료.', { floor }), 'season-up');
    st.lastResult = { season: game.season, floor, kind, condensedPower: reward };
    game.killsInZone = 0;
    game.currentZoneId = SKY_TOWER_ZONE_ID;
    continueMapAfterClear(zone);
    ui.redraw();
    queueImportantSave(220);
}

/** A sky tower floor within this loop's clear limit: a first clear's reward and the next floor, else a 16% repeat reward. */
function clearSkyTowerFloor(st, floor, mapAction, ui) {
    game.loopProgressCurrent.bestSkyFloor = Math.max(game.loopProgressCurrent.bestSkyFloor || 0, floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    let reward = firstClear ? firstSkyTowerClear(st, floor, mapAction) : repeatSkyTowerClear(st, floor, mapAction);
    if (reward > 0) st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + reward;
    st.clearedThisLoop = Math.min(getSkyTowerLoopClearLimit(), Math.max(0, Math.floor(st.clearedThisLoop || 0)) + 1);
    let rewardText = firstClear
        ? _t('최초 클리어 보상: 응축된 창공의 정수 +{reward}', { reward })
        : (reward > 0 ? _t('반복 클리어 보상: 응축된 창공의 정수 +{reward}', { reward }) : '반복 클리어: 응축된 창공의 정수 미발견');
    ui.say(_t('☁️ 창공의 탑 {floor}층 돌파! {rewardText}, 이번 루프 잔여 클리어 {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', { floor, rewardText, skyTowerRemainingClears: getSkyTowerRemainingClears(), skyTowerLoopClearLimit: getSkyTowerLoopClearLimit() }), reward > 0 ? 'loot-unique' : 'season-up');
    return reward;
}

function firstSkyTowerClear(st, floor, mapAction) {
    let reward = getSkyTowerRewardAmount(floor);
    st.clearedFloors.push(floor);
    st.clearedFloors = Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b);
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    if (floor >= 10) unlockJournalEntry('sky_tower_10');
    return reward;
}

/** A floor cleared before: 16% of the time a part of the reward, and the next floor as the map complete action says, as a first clear
 * (it stayed on the floor, so a low floor picked early spent the loop's clears there, 2026-10-20). */
function repeatSkyTowerClear(st, floor, mapAction) {
    let reward = 0;
    if (Math.random() < 0.16) reward = Math.max(1, Math.floor(getSkyTowerRewardAmount(floor) * 0.35));
    const highest = Math.max(1, Math.floor(st.highestFloor || 1));
    st.currentFloor = Math.max(1, Math.min(highest, ['repeatZone', 'stop'].includes(mapAction) ? floor : floor + 1));
    return reward;
}

function finishTimeRiftEncounter(zone, mapAction, ui) {
    let rift = ensureTimeRiftState();
    if (zone.riftPhase === 'past') {
        rift.altarOpen = true;
        ui.say(_t('⏳ 과거의 제단이 열렸습니다. (시간압 {pressure}) 시간의 균열에서 장비를 골라 같은 부위의 고유 1개/희귀 1개를 올리세요.', { pressure: zone.pressure }), 'loot-unique');
    } else finishTimeRiftFusion(rift, ui);
    rift.activePressure = null;
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    continueMapAfterClear(zone);
    ui.redraw();
    queueImportantSave(220);
}

function finishTimeRiftFusion(rift, ui) {
    let fusion = typeof resolveTimeRiftFusion === 'function' ? resolveTimeRiftFusion() : null;
    if (!fusion) return;
    rift.fusionCount = Math.max(0, Math.floor(rift.fusionCount || 0)) + 1;
    unlockJournalEntry('time_rift_fusion');
    let gradeLabel = fusion.grade === 'perfect' ? '완벽한 융합' : (fusion.grade === 'normal' ? '보통 융합' : '불안정한 융합');
    ui.say(_t('⌛ {grade}! [{name}]{particle} 억겁의 시간을 건너 돌아왔습니다. (계승한 추가 옵션 {inherited}개{lost})', { grade: gradeLabel, name: _t(fusion.fused.name), particle: pickParticle(fusion.fused.name, '이', '가'), inherited: fusion.inherited, lost: fusion.lost > 0 ? `, ${_t('{n}개 유실', { n: fusion.lost })}` : `, ${_t('유실 없음')}` }), 'loot-unique');
}

function finishTrialEncounter(zone, mapAction, ui) {
    if (zone.bloomTrial) return finishBloomTrial(zone, ui);
    let isFirstClear = !game.completedTrials.includes(zone.id);
    if (isFirstClear) game.completedTrials.push(zone.id);
    if (Math.random() < getTrialSkillGemRewardChance(zone, isFirstClear)) grantGuaranteedTrialSkillGem();
    if (isFirstClear) grantTrialKeystonePoint(ui);
    grantTrialAscendPoints(zone, isFirstClear, ui);
    if (!game.unlocks.traits) game.unlocks.traits = true;
    game.noti.traits = true;
    if (zone.id === 'trial_1' && isFirstClear) {
        queueTutorialNotice('unlock_first_ascend', _t('1차 전직'), _t('1차 전직 시련을 통과했습니다.\n‘스킬트리 → 전직’에서 전직을 고르고 전직 노드를 할당하세요.'), 'tab-traits');
    }
    ui.unlocks();
    if (zone.id !== 'trial_4') {
        if (isFirstClear) ui.say(_t('👑 [{name}] 통과! 전직 포인트 2점 획득!', { name: _t(zone.name) }), "loot-unique");
        else ui.say(_t('🔁 [{name}] 재도전 완료 (전직 포인트 보상 없음)', { name: _t(zone.name) }), "attack-monster", { noToast: true });
    }
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    game.inTicketBossFight = false;
    enterAutomaticMapInterruptionAfterClear(zone);
    startMoving(false);
    ui.redraw();
    queueImportantSave(200);
}

function finishBloomTrial(zone, ui) {
    // 보스를 실제로 처치하지 않았는데 런이 완료 처리된 경우(예: 보스 미스폰/즉시 제거 등)에는
    // 개화를 인정하지 않고 전투를 다시 구성한다. 보스를 잡아야만 재능 개화가 완료된다.
    if (!game.bloomBossDefeated) {
        ui.say(_t('❄️ 개화 미궁의 수호자를 아직 쓰러뜨리지 못했습니다. 전투를 다시 구성합니다.'), 'attack-monster', { noToast: true });
        startEncounterRun();
        return;
    }
    handleTalentBloomClear(zone);
}

function grantTrialKeystonePoint(ui) {
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    ui.say(_t('💠 키스톤 포인트 +1 (현재 {ascendKeystonePoints})', { ascendKeystonePoints: game.ascendKeystonePoints }), 'loot-unique');
}

/** A trial's ascendancy points and rank: the fourth gives a core node pick on its first clear, the others 2 points. */
function grantTrialAscendPoints(zone, isFirstClear, ui) {
    if (zone.id === 'trial_4') {
        game.ascendPoints += isFirstClear ? 1 : 0;
        if (isFirstClear) {
            game.ascendRank = Math.max(game.ascendRank || 0, 4);
            ui.say(_t('👑 [{name}] 통과! 4차 전직 핵심 노드 선택권 +1 획득!', { name: _t(zone.name) }), "loot-unique");
        }
        return;
    }
    if (isFirstClear) game.ascendPoints += 2;
    game.ascendRank = Math.max(game.ascendRank || 0, zone.id === 'trial_3' ? 3 : (zone.id === 'trial_2' ? 2 : 1));
}

function finishSeasonBossEncounter(zone, mapAction, ui) {
    let firstRootBossClear = !(game.clearedRootBosses || []).includes(zone.id);
    game.clearedRootBosses = Array.isArray(game.clearedRootBosses) ? game.clearedRootBosses : [];
    if (firstRootBossClear) game.clearedRootBosses.push(zone.id);
    if (zone.rivalBlade) noteRivalBladeKill(zone, firstRootBossClear, ui);
    grantSeasonBossRewards(zone, firstRootBossClear, ui);
    ui.say(_t('🗝️ [{name}] 토벌 완료!', { name: _t(zone.name) }), 'loot-unique');
    departSeasonBoss(zone, ui);
    ui.unlocks();
    ui.redraw();
    queueImportantSave(200);
}

function noteRivalBladeKill(zone, firstRootBossClear, ui) {
    markLoopSpecialBossKill(zone.id);
    if (zone.journalId && firstRootBossClear && typeof unlockJournalEntry === 'function') unlockJournalEntry(zone.journalId);
    if (zone.capstoneRival) return ui.say(_t('🗡️ 완성작이 무릎 꿇었습니다. 버려진 날이 벼려진 날을 이겼습니다.'), 'loot-unique');
    let killedRivals = (game.loopProgressCurrent && Array.isArray(game.loopProgressCurrent.specialBosses)) ? game.loopProgressCurrent.specialBosses : [];
    let remaining = SEASON_BOSS_ZONES.filter(rival => rival.rivalBlade && !rival.capstoneRival && !killedRivals.includes(rival.id)).length;
    if (remaining > 0) ui.say(_t('🗡️ 버려진 날 격파! 이번 루프에 남은 날: {remaining}개 (모두 꺾으면 「완성작」이 나타납니다)', { remaining }), 'season-up');
    else ui.say(_t('🗡️ 다섯 날이 모두 꺾였습니다. 「일곱 번째 날 - 완성작」이 결투를 기다립니다.'), 'loot-unique');
}

/** A root boss's rewards: a milestone pinnacle's, 아스트라's, else its currency (half the time; a capstone rival's on its first
 * clear) and a 40% unique, half of them its own (data/items.js ROOT_BOSS_UNIQUE_RULES, data/maps.js signatureUnique). */
function grantSeasonBossRewards(zone, firstRootBossClear, ui) {
    if (zone.milestonePinnacle) return grantMilestonePinnacleClearRewards(zone, firstRootBossClear, ui.say);
    if (zone.cosmosCapstone) return grantCosmosCapstoneRewards(zone, firstRootBossClear, ui);
    let grantsClearCurrency = zone.capstoneRival ? firstRootBossClear : Math.random() < 0.5;
    if (grantsClearCurrency) awardCurrency(zone.reward || 'bossCore', 1, 'drop');
    if (Math.random() < ROOT_BOSS_UNIQUE_RULES.chance) {
        let bossUnique = generateUniqueItem(zone.tier || 12, null, pickRootBossUniqueName(zone));
        addItemToInventory(bossUnique);
        ui.say(_t('👑 [{name}] 획득!', { name: _t(bossUnique.name) }), 'loot-unique', { item:bossUnique });
    }
}

/** The boss's own unique (its signatureUnique) for ROOT_BOSS_UNIQUE_RULES.signatureShare of the unique rolls, else null (any unique). */
function pickRootBossUniqueName(zone) {
    return zone.signatureUnique && Math.random() < ROOT_BOSS_UNIQUE_RULES.signatureShare ? zone.signatureUnique : null;
}

function grantCosmosCapstoneRewards(zone, firstRootBossClear, ui) {
    if (zone.journalId && firstRootBossClear && typeof unlockJournalEntry === 'function') unlockJournalEntry(zone.journalId);
    ui.say(_t('🌌 잔향체가 흩어졌습니다. 다섯 별의 메아리가 마침내 잠잠해집니다.'), 'loot-unique');
    awardCurrency(zone.reward || 'goldenRule', 2, 'drop');
    rollCosmosAstraUniqueDrop(zone);
}

/** After a root boss: with repeat on and a key left, spend it and fight again; else back to the auto progress zone. */
function departSeasonBoss(zone, ui) {
    let shouldRepeat = !!game.autoRepeatSeasonBoss && !zone.milestonePinnacle;
    let keyLeft = zone.key ? game.currencies[zone.key] || 0 : 0;
    if (shouldRepeat && keyLeft > 0) {
        game.currencies[zone.key]--;
        game.currentZoneId = zone.id;
        game.killsInZone = 0;
        game.inTicketBossFight = true;
        ui.say(_t('🔁 입장권 1개 소모, [{name}] 자동 재도전 시작! (남은 열쇠 {value})', { name: _t(zone.name), value: game.currencies[zone.key] || 0 }), 'season-up');
        startMoving(true);
        return;
    }
    if (shouldRepeat && keyLeft <= 0) ui.say(_t('🔁 반복 도전이 켜져 있지만 입장권이 없어 자동 재도전을 중단합니다.'), 'attack-monster');
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    game.inTicketBossFight = false;
    enterAutomaticMapInterruptionAfterClear(zone);
    startMoving(false);
}

function finishLabyrinthEncounter(zone, mapAction, ui) {
    let clearedFloor = Math.max(1, Math.floor(game.labyrinthFloor || zone.floor || 1));
    const currenciesBefore = { ...game.currencies };
    if (clearedFloor >= 10) unlockJournalEntry('labyrinth_10');
    recordLoopBestFloor('bestLabyrinthFloor', clearedFloor);
    game.labyrinthUnlockedMaxFloor = Math.max(game.labyrinthUnlockedMaxFloor || 1, clearedFloor + 1);
    game.labyrinthFloor = ['repeatZone', 'stop'].includes(mapAction) ? clearedFloor : clearedFloor + 1;
    rollLabyrinthSealShards(clearedFloor);
    game.labyrinthLastResult = labyrinthFloorResult(clearedFloor, currenciesBefore);
    ui.say(_t('🏛️ 미궁 {clearedFloor}층 돌파!{fossilSummary}', { clearedFloor, fossilSummary: labyrinthFossilNote(game.labyrinthLastResult.currencies) }), 'season-up');
    if (mapAction === 'nextLoopBestPlusOne') {
        let nextZone = resolveNextLoopBestPlusOneZone(zone);
        if (nextZone !== null) game.currentZoneId = nextZone;
    }
    game.killsInZone = 0;
    continueMapAfterClear(zone);
    ui.redraw();
    queueImportantSave(200);
}

/** 미궁 지배자의 화석(2026-11-04 사용자: 층을 깨면 그냥 받던 것을 보스가 떨어뜨려 직접 줍게): 층을 깰 때 굴리던 확률 그대로(기본, 종류,
 * 원시, 원시 고대, 심연) 쓰러진 자리에 재화 드랍처럼 떨어진다. 떨어진 것은 바로 그 층의 결과(game.labyrinthLastResult, pending)에 적고,
 * 층을 마칠 때 다른 보상과 합친다. 방에 난입한 보스는 떨어뜨리지 않는다. */
function dropLabyrinthGuardianFossils(enemy, zone, ui) {
    if (zone?.type !== 'labyrinth' || !enemy.isBoss || enemy.roomInvader) return;
    const floor = Math.max(1, Math.floor(game.labyrinthFloor || zone.floor || 1));
    const keys = rollLabyrinthFossilKeys(floor);
    keys.forEach(key => keepCurrencyDrop(enemy, key, 1));
    if (keys.includes('fossilAbyssal')) ui.say(_t('🌌 희귀 화석 [심연 화석]을 발견했습니다!'), 'loot-unique');
    const currencies = {};
    keys.forEach(key => { currencies[key] = (currencies[key] || 0) + 1; });
    game.labyrinthLastResult = { season: game.season, floor, pending: true, currencies };
}

/** The fossils a guardian of clearedFloor drops (currency keys), each roll as the floor clear rolled them. */
function rollLabyrinthFossilKeys(clearedFloor) {
    const dropMul = contentProgression.isUnlocked('fossil') ? 1 : 0, chances = getLabyrinthFossilDropChances(clearedFloor, dropMul, dropMul);
    const typed = rndChoice(FOSSIL_DB.filter(fossil => !fossil.ancientPrimalOnly)), primal = contentProgression.isUnlocked('fossilRestore');
    return [['fossil', chances.base], [typed.key, chances.typed], ['fossilPrimal', primal ? chances.primal : 0],
        ['fossilAncientPrimal', primal ? chances.ancient : 0], ['fossilAbyssal', chances.abyssal]].filter(([, chance]) => Math.random() < chance).map(([key]) => key);
}

/** The floor's result card: what the clear itself gave (currencies against `before`) and what its guardian dropped (pending). */
function labyrinthFloorResult(clearedFloor, before) {
    const last = game.labyrinthLastResult, dropped = last?.pending && last.season === game.season && last.floor === clearedFloor ? last.currencies : {};
    const currencies = { ...dropped };
    for (const key of Object.keys(ORB_DB)) {
        const gain = (game.currencies[key] || 0) - (before[key] || 0);
        if (gain > 0) currencies[key] = (currencies[key] || 0) + gain;
    }
    return { season: game.season, floor: clearedFloor, pending: false, currencies };
}

function labyrinthFossilNote(currencies) {
    const typedName = key => FOSSIL_DB.find(fossil => fossil.key === key && !fossil.ancientPrimalOnly)?.name;
    const found = Object.keys(currencies).map(key => LABYRINTH_FOSSIL_NOTE_NAMES[key] || typedName(key)).filter(Boolean).map(name => `${_t(name)} +1`);
    if (!found.length && !contentProgression.isUnlocked('fossil')) return '';
    return ` [${found.join(' / ') || _t('화석 없음')}]`;
}

/** From loop 6 a labyrinth floor may give seal shards: 2.5%, strong 0.75%, radiant 0.16% from floor 30. */
function rollLabyrinthSealShards(clearedFloor) {
    if ((game.season || 1) < 6) return;
    if (Math.random() < 0.025) awardCurrency('sealShard', 1, 'drop');
    if (Math.random() < 0.0075) awardCurrency('strongSealShard', 1, 'drop');
    if (clearedFloor >= 30 && Math.random() < 0.0016) awardCurrency('radiantSealShard', 1, 'drop');
}

function finishUnderworldEncounter(zone, mapAction, ui) {
    let { uw, floor } = advanceUnderworldFloor(zone, mapAction);
    if (!game.underworldRunes || typeof game.underworldRunes !== 'object') game.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] };
    grantUnderworldFloorMilestone(floor, uw);
    ui.say(_t('🕳️ 지하계 {floor}층 돌파! {highestFloor}층까지 하강 가능합니다.', { floor, highestFloor: uw.highestFloor }), 'season-up');
    game.killsInZone = 0;
    game.currentZoneId = mapAction === 'nextLoopBestPlusOne' ? nextBestZoneOr(zone, UNDERWORLD_ZONE_ID) : UNDERWORLD_ZONE_ID;
    continueMapAfterClear(zone);
    ui.redraw();
    queueImportantSave(220);
}

/** The underworld progress after a floor clear: this loop's best, the next floor open, where the next descent starts. */
function advanceUnderworldFloor(zone, mapAction) {
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    let floor = Math.max(1, Math.floor(zone.floor || uw.currentFloor || 1));
    game.loopProgressCurrent.bestUnderworldFloor = Math.max(game.loopProgressCurrent.bestUnderworldFloor || 0, floor);
    uw.highestFloor = Math.max(Math.floor(uw.highestFloor || 1), floor + 1);
    uw.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(uw.highestFloor, floor + 1);
    if (floor >= 10) uw.floor10Cleared = true;
    return { uw, floor };
}

function finishCosmosEncounter(zone, mapAction, ui) {
    if (typeof window.exploreSelectedCosmosNode === 'function') {
        window.exploreSelectedCosmosNode(zone.cosmosNodeId || null);
    }
    if (typeof window.continueCosmosChallengeAfterClear === 'function'
        && window.continueCosmosChallengeAfterClear(mapAction)) {
        ui.redraw();
        queueImportantSave(200);
        return;
    }
    if (game.cosmosAtlas && typeof game.cosmosAtlas === 'object') game.cosmosAtlas.activeChallenge = null;
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    if (mapAction === 'stop') game.combatHalted = true;
    enterAutomaticMapInterruptionAfterClear(zone);
    if (mapAction !== 'stop') startMoving(false);
    ui.redraw();
    queueImportantSave(200);
}

/** A hunting zone or chaos depth with its kills done: its marks, the loop's final zone, trial 3, the next zone, this loop's best
 * depth, then where the hero goes. */
function finishZoneClear(zone, mapAction, ui) {
    if (zone.type === 'abyss') markChaosDepthClear(zone);
    if (zone.type === 'act') markActZoneClear(zone, ui);
    if (isSeasonFinalZoneClear(zone)) return finishSeasonFinalZone(zone, mapAction, ui);
    if (zone.type === 'abyss' && !game.unlockedTrials.includes('trial_3')) unlockTrial3FromChaos(zone, ui);
    unlockNextZoneAfterClear(zone, ui);
    game.killsInZone = 0;
    noteBestChaosDepth(zone, ensureLoopProgressCurrent());
    if (game.beehive && game.beehive.inRun) mapAction = 'repeatZone';
    departAfterZoneClear(zone, mapAction, ui);
}

function noteBestChaosDepth(zone, progress) {
    if (zone.type !== 'abyss') return;
    let d = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    if (d >= 20) progress.bestAbyssDepth = Math.max(Math.floor(progress.bestAbyssDepth || 0), d);
}

function markChaosDepthClear(zone) {
    let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    if (depth === 5 && !game.woodsmanSimulatorSeenLoop) {
        game.woodsmanSimulatorSeenLoop = true;
        game.chaosInfuserUnlocked = true;
        unlockJournalEntry('woodsman');
        queueTutorialNotice('woodsman_simulator_loop', _t('나무꾼의 시뮬레이터'), _t('“다음은 더 나은 세계를 바라지.”\n정체를 드러낸 존재는 진짜 나무꾼이 아닌 시뮬레이터였다.\n더 깊은 혼돈을 돌파해야 루프가 열린다.'), 'tab-season');
    }
    let capDepth = 20;
    game.abyssClearedDepths = Array.isArray(game.abyssClearedDepths) ? game.abyssClearedDepths : [];
    if (depth <= capDepth && !game.abyssClearedDepths.includes(depth)) {
        game.abyssClearedDepths.push(depth);
    }
    ensureNextEndlessChaosDepthUnlocked(depth);
    if (depth >= 20) {
        ensureLoopProgressCurrent().chaos20Cleared = true;
        onChaos20Cleared();
    }
}

function markActZoneClear(zone, ui) {
    if (zone.id <= 9) markActRewardReady(zone.id);
    // 전적: 이번 루프 시작 기준 액트 돌파 경과 시간(루프당 첫 돌파만).
    worldTreeBark.noteActTenClear(zone);
    if (typeof recordActClear === 'function') recordActClear(zone.id);
    sayActClearStory(zone, ui);
    const journalEntry = ACT_CLEAR_JOURNAL_ENTRIES.get(zone.id);
    if (journalEntry) unlockJournalEntry(journalEntry);
    // 클리어 후 정지·방치 정산에서도 다음 화면 갱신을 기다리지 않고 전술을 연다.
    if (zone.id === 2) contentUnlockUi.syncOpened();
    if (zone.id === 9 && Math.max(0, Math.floor(game.loopDeaths || 0)) <= 0) unlockJournalEntry('immortal');
}

/** An act's clear story, once a loop: on the clear at the frontier (the one that opens the next zone, like its unlock line), not
 * on each repeat clear (a new hero who fell back to level up read act 1's five times in its first 15 minutes, 2026-10-18). */
function sayActClearStory(zone, ui) {
    if (zone.id < game.maxZoneId) return;
    let storyAct = getStoryActByZoneId(zone.id);
    if (storyAct && storyAct.clearText) ui.say(`📜 ${storyAct.clearText}`, 'season-up');
}

/** Whether this clear is the loop's final zone: the season's final zone, or a chaos depth at the season's cap or deeper. */
function isSeasonFinalZoneClear(zone) {
    let clearedAbyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return zone.id === getCurrentSeasonFinalZoneId() || (zone.type === 'abyss' && clearedAbyssDepth >= getSeasonAbyssDepthCap(game.season || 1));
}

function finishSeasonFinalZone(zone, mapAction, ui) {
    if ((game.season || 1) >= 10 && zone.type === 'abyss') return finishEndlessChaosClear(zone, mapAction, ui);
    handleSeasonLoopConditionMet();
}

/** From loop 10 the cleared final chaos depth: deep chaos opens past it, this loop's record, then the map action: stay, go one
 * deeper (or deeper anyway past 21 when the loop condition was met before), or the loop condition. */
function finishEndlessChaosClear(zone, mapAction, ui) {
    let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    // 깬 층이 곧 지금 층이다(2026-10-11): 예전에는 21층부터 지난 루프의 기록(game.abyssEndlessDepth)과 견줘 더 큰 쪽을
    // 써서, 루프 조건 층을 깨면 다음 층이 아니라 기록한 최고 층의 다음으로 뛰었다.
    let nowEndless = Math.max(20, depth);
    ensureNextEndlessChaosDepthUnlocked(nowEndless);
    // Chaos 20 is the entrance to deep chaos, so continuing after that clear must start at 21
    // even if the save has a higher recorded deep-chaos floor from a previous loop.
    // Setting this to the unlocked next depth would double-advance and skip a floor (e.g. 20 -> 22).
    game.abyssEndlessDepth = nowEndless;
    let hadCurrentSeasonLoopRequirementBeforeClear = recordEndlessChaosClear(depth);
    if (mapAction === 'repeatZone') return repeatEndlessChaosDepth(zone, ui);
    if (mapAction === 'nextLoopBestPlusOne' || (depth >= 21 && hadCurrentSeasonLoopRequirementBeforeClear)) {
        enterNextEndlessChaosDepth(zone);
        return;
    }
    handleSeasonLoopConditionMet();
}

/** This loop's chaos record for a cleared final depth; returns whether the loop condition was met before this clear. */
function recordEndlessChaosClear(depth) {
    const progress = ensureLoopProgressCurrent();
    let seasonAbyssCap = getSeasonAbyssDepthCap(game.season || 1);
    let bestAbyssDepthBeforeClear = Math.max(0, Math.floor(progress.bestAbyssDepth || 0));
    let hadCurrentSeasonLoopRequirementBeforeClear = seasonAbyssCap <= 20
        ? (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!progress.chaos20Cleared)
        : bestAbyssDepthBeforeClear >= seasonAbyssCap;
    if (depth >= 20) progress.bestAbyssDepth = Math.max(bestAbyssDepthBeforeClear, depth);
    progress.chaos20Cleared = true;
    onChaos20Cleared();
    return hadCurrentSeasonLoopRequirementBeforeClear;
}

function repeatEndlessChaosDepth(zone, ui) {
    game.currentZoneId = zone.id;
    game.killsInZone = 0;
    enterAutomaticMapInterruptionAfterClear(zone);
    ui.unlocks();
    if ((game.settings.townReturnAction || 'retry') === 'stop') {
        game.combatHalted = true;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
    } else startMoving(false);
    ui.redraw();
    queueImportantSave(220);
}

function unlockTrial3FromChaos(zone, ui) {
    let shouldUnlockTrial3 = zone.name === '혼돈 5' || Math.random() < 0.15;
    if (!shouldUnlockTrial3) return;
    game.unlockedTrials.push('trial_3');
    game.noti.map = true;
    ui.say(zone.name === '혼돈 5' ? "✨ [시련의 증표] 혼돈 5 보스 확정 드랍! 3차 전직 시련 개방!" : "✨ [시련의 증표] 획득! 3차 전직 시련 개방!", "loot-unique");
}

function unlockNextZoneAfterClear(zone, ui) {
    // 다음 지역 해금은 "지금 막 클리어한 존"을 기준으로 보정한다.
    // 특히 혼돈 구간은 반복/자동화 상태와 무관하게 N 클리어 시 N+1이 열려야 하므로
    // targetUnlockZone을 직접 계산해 누락을 방지한다.
    let targetUnlockZone = Math.min(getCurrentSeasonFinalZoneId(), zone.id + 1);
    // 이미 열려 있는 이전 구역 반복 클리어로 프론티어를 우회 해금하지 않도록
    // "현재 프론티어(=maxZoneId) 이상 구역을 클리어했을 때만" 다음 구역을 연다.
    let clearedAtFrontier = zone.id >= game.maxZoneId;
    if (!(clearedAtFrontier && game.maxZoneId < targetUnlockZone)) return;
    game.maxZoneId = targetUnlockZone;
    if (typeof npcShop === 'object') npcShop.syncAllRunes();
    game.noti.map = true;
    ui.reveal(game.maxZoneId);
    let clearedStoryAct = getStoryActByZoneId(zone.id);
    if (clearedStoryAct && clearedStoryAct.unlockText) ui.say(`🧭 ${clearedStoryAct.unlockText}`, 'season-up');
    let unlockedZone = getZone(game.maxZoneId);
    ui.say(_t('🗺️ 신규 사냥터 [{zone}] 개방!', { zone: unlockedZone ? _t(unlockedZone.name) : _t('구역 {n}', { n: game.maxZoneId }) }), "season-up");
    noteCampaignResistPenalty(game.maxZoneId);
}

/** Where the hero goes after a zone clear: the map action's zone (or a stop), the act retreat hold, a deferred departure. */
function departAfterZoneClear(zone, mapAction, ui) {
    if (mapAction === 'repeatZone') game.currentZoneId = zone.id;
    else if (mapAction === 'nextLoopBestPlusOne') {
        let nextZone = resolveNextLoopBestPlusOneZone(zone);
        game.currentZoneId = nextZone !== null ? nextZone : getAutoProgressZoneId(Math.max(game.currentZoneId, game.maxZoneId));
    }
    else if (mapAction === 'stop') {
        actExplorationProgress.stopAfterCompletion(game);
        ui.redraw();
        queueImportantSave(180);
        return;
    } else if (!holdActRetreat(zone)) game.currentZoneId = getAutoProgressZoneId(Math.max(game.currentZoneId, game.maxZoneId));
    if(actExplorationProgress.deferDeparture(game)) {
        ui.unlocks();ui.redraw();queueImportantSave(220);return;
    }
    actExplorationProgress.reconcileDeparture(game);
    enterAutomaticMapInterruptionAfterClear(zone);
    ui.unlocks();
    if ((game.settings.townReturnAction || 'retry') === 'stop') {
        actExplorationProgress.stopAfterCompletion(game);
    } else startMoving(false);
    ui.redraw();
    queueImportantSave(220);
}

exposeFileGlobals({ getEnemyExperienceReward, grantExpAndGem, awardLevelPassivePoint, applyGrandBreachMobTuning, isMapProgressHeld, isVoidRiftCombatZone, applyVoidRiftMobTuning, queueEnemyGroundLoot, getJewelLootColor, keepEquipmentDrop, collectExplorationFloorLoot, receiveStumpDropRow, receiveDeferredRune, placeFloorItem, explorationFloorFor, keepCurrencyDrop, grantEquipmentPick, grantRootWeaponPick, rollCurrencyAndGear, grantEnemyLoot, awardEnemyLootCurrency, rollEnemyAttackGem, ownedAndReservedRuneState, rollLootForEnemy, rollKnittingYarn, clearDotFxThrottleForEnemy, grantLoopStarterWeaponOnFirstKill, resolveEnemyDeath, countKillForContent, tickTalentKillRuntime, rollRandomVoidRiftOnKill, explodeCorpsesOnKill, applyUniqueKillEffects, getOverkillSplash, advanceColonyWaveOnKill, finishGrandBreachOnBossKill, flagHeavyUiAfterKill, transferSkillDotOnDeath, getRangerWeakpointBonus, applyEnemyRegen, ensureNextEndlessChaosDepthUnlocked, onChaos20Cleared, enterAutomaticMapInterruptionAfterClear, callOceanGuardianAtBoundary, noteOceanKill, callOceanGuardianAdds, autoRediveOceanAfterClear, resolvePlayerApproachTarget, getTrialSkillGemRewardChance, getGrandBreachRewardSummary, grantUnderworldFloorMilestone, finishEncounterRun, finishBeyondBoundaryEncounter, finishMeteorEncounter, finishOutsideChaosEncounter, finishOceanEncounter, finishChaosRealmEncounter, finishSkyTowerEncounter, finishTimeRiftEncounter, finishTimeRiftFusion, finishTrialEncounter, finishSeasonBossEncounter, grantSeasonBossRewards, departSeasonBoss, finishLabyrinthEncounter, finishUnderworldEncounter, finishCosmosEncounter, finishZoneClear });
})();


const GRAND_BREACH_BASE_ROLE = Object.freeze({ hp: 1, speed: 1, damage: 1, penetration: 0, chaosRes: 0, ailment: 0 });
const GRAND_BREACH_ROLE_TUNING = Object.freeze({
    'breach-scout': Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 0.82, speed: 1.22 }),
    'breach-reflux': Object.freeze({ ...GRAND_BREACH_BASE_ROLE, damage: 1.15, penetration: 4 }),
    'breach-veil': Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.25, chaosRes: 12 }),
    'breach-venom': Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.2, ailment: 0.12 })
});


/** Floor jewels, cores and wild talismans reach the same places (jewels and cores the bag), and raise the same notices, as an immediate drop. */
const receiveFloorItem = {
    jewel: row => dispatchRuntimeEvent('jewel-drop-received', receiveJewelDrop(row.item)),
    core: row => { if (coreItems.keep(row.item)) dispatchRuntimeEvent('core-item-received', row.item); },
    talisman: row => announceWildTalisman(talismans.receiveWild(game, { talisman: row.item, overflow: row.overflow })),
    stump: receiveStumpDropRow,
    leaf: row => atlasFinds.receiveMemoryLeaf(row.leaf),
    yarn: row => receiveKnittingYarn(row.yarn),
    rune: receiveDeferredRune
};


/** roll (rollEquipmentDrop): above 1 expected item a kill drops several, each with its own rarity; the drought guarantee lifts only the
 * first. Returns the first kept item for the loot log. */
const rollEquipmentLoot = function (enemy, zone, roll) {
    const kept = [];
    for (let i = 0; i < roll.count; i++) kept.push(...grantEquipmentPick(enemy, zone, i === 0 ? roll.minimumRarity : null));
    game.equipmentDropProgress = roll.nextProgress;
    kept.push(...grantRootWeaponPick(enemy, zone), ...colonyWards.rollFieldDrop(enemy, zone));
    return kept[0] || null;
};


function rollEnemyGemReward(awakening, boss) {
    if(!contentProgression.isUnlocked('support')||Math.random()<0.5) return {kind:'attack',gem:rollEnemyAttackGem(awakening, boss)};
    const names=Object.keys(SUPPORT_GEM_DB);
    if(!names.length)return {kind:'support',gem:null};
    const name=rndChoice(names);
    return {kind:'support',name,gem:gemDropRewards.nextSupport(ownedAndReservedRuneState(),name)};
}


function receiveKnittingYarn(id) {
    const result = knitting.receive(game, id);
    if (!result) return;
    combatLootReceipts.yarn(game, id);
    dispatchRuntimeEvent('knitting-yarn', result);
}
/** From loop 15 deep chaos (21+), hive runs and grand breach runs may give a colony trace. */
const isDeepChaosLootZone = zone => !!zone && zone.type === 'abyss' && Math.max(0, Math.floor(zone.depth || 0)) >= 21;


/** A monster's death, once: it leaves the field, the kill is counted, rewards are given, kill effects and content runs advance, and
 * monsters a kill effect brought to 0 die in turn. 2026-10-18 split into the steps below (it was one function of complexity 151);
 * the order of every random roll is kept. */
function handleEnemyDeath(enemy, pStats) {
    enemy = resolveEnemyDeath(enemy);
    if (!enemy) return;
    woodsmanStumps.clear(enemy);
    if (woodsmanStumps.retireAdd(enemy)) return;
    // Rewards below change build inputs under one settlement memo revision: stats asked for until the end are not kept.
    playerStatCache.beginEvent();
    // Retire the victim before rewards or corpse explosions can recursively report it again.
    game.enemies = game.enemies.filter(entry => entry.id !== enemy.id);
    window.GameModules.combat.supports.retire(enemy);
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.erosionLegacy) {
        let inheritedErosion = Math.floor(Math.max(0, Number(enemy.chaosErosionShred) || 0) * 0.5);
        if (inheritedErosion > 0) game.passiveChaosErosionTransfer = inheritedErosion;
    }
    transferSkillDotOnDeath(enemy);
    const zone = getZone(game.currentZoneId);
    countKillForContent(enemy, zone, pStats);
    grantLoopStarterWeaponOnFirstKill(enemy);
    tickTalentKillRuntime(enemy);
    addBattleFx('enemyDeath', {
        enemyId: enemy.id,
        name: enemy.name,
        color: getElementColor(enemy.ele),
        // 보스: 쓰러짐 그림을 보여 준다(js/canvas-battlefield.js drawEnemyDeathFx). 다시 일어나는 보스는 일어나 선 채 흐려질 때까지.
        duration: enemy.isBoss ? (STAGE_STORY_ART.revives[enemy.bossAssetKey]?.total || 1600) : (enemy.isElite ? 500 : 340),
        boss: !!enemy.isBoss,
        elite: !!enemy.isElite
    });
    grantEliteTraitBuffFromEnemy(enemy, pStats);
    const gemLeveled = grantExpAndGem(enemy, pStats);
    const currencyDropVersionBefore = Math.max(0, Math.floor(game.currencyDropVersion || 0));
    grantEnemyLoot(enemy);
    recordKillProgress(enemy);
    if(actExplorationState.recordDeath(game,enemy))actExplorationProgress.objects.afterDeath(actExplorationState.current(game));
    gainSkyRiftGaugeFromCombat(zone, enemy);
    applyAilmentEffectsOnDeath(enemy, pStats);
    // The steps below log through say (addLog, passed from here): they stay free of the UI themselves.
    rollRandomVoidRiftOnKill(enemy, zone, addLog);
    explodeCorpsesOnKill(enemy, pStats, addLog);
    applyUniqueKillEffects(pStats);
    // 남은 피해 튀기기: the rest of the killing blow hits every other monster, each death handled at once (in this order).
    const overkill = getOverkillSplash(enemy, pStats);
    if (overkill > 0) (game.enemies || []).forEach(target => {
        if (!target || target.id === enemy.id || target.hp <= 0) return;
        applyDamageToEnemyResource(target, overkill);
        if (target.hp <= 0) handleEnemyDeath(target, pStats);
    });
    if (game.enemyWitherStacks && typeof game.enemyWitherStacks === 'object') delete game.enemyWitherStacks[enemy.id];
    clearDotFxThrottleForEnemy(enemy.id);
    if (zone && zone.id === 'beehive_run' && game.beehive && game.beehive.inRun && countBeehiveWaveAlive() === 0) {
        if (typeof onBeehiveWaveCleared === 'function') onBeehiveWaveCleared();
    }
    advanceColonyWaveOnKill(zone, addLog, enemy);
    finishGrandBreachOnBossKill(enemy, zone, addLog);
    // 시체폭발/연쇄 피해 등으로 동시에 0 이하가 된 적은
    // 일반 타격 루프를 통하지 않으면 사망 처리(handleEnemyDeath)가 누락될 수 있다.
    // 누락 시 enemies 배열에 hp<=0 엔트리가 남아 100% 진행 후에도 클리어가 멈춘다.
    (game.enemies || []).filter(entry => entry && entry.hp <= 0).forEach(defeated => handleEnemyDeath(defeated, pStats));
    flagHeavyUiAfterKill(enemy, zone, gemLeveled, currencyDropVersionBefore);
    playerStatCache.endEvent();
}


const corpseExplosionSplash = (enemy, lifePct) => Math.max(1, Math.floor((enemy.maxHp || 0) * (Math.max(0, Number(lifePct || 0)) / 100)));
const corpseExplosionChance = pct => Math.max(0, Math.min(1, Number(pct || 0) / 100));


// Monster regeneration (0.1 s step) tires while the monster keeps losing life (2026-10-04): it falls in a straight line to nothing over
// ENEMY_REGEN_FATIGUE_MS of fighting and comes back once nothing has hurt it for ENEMY_REGEN_COMBAT_WINDOW_MS. A chaos 20 boss
// healed 0.48% of its life a second (about 21,000) and a build dealing less never finished it, an idle run standing still for
// ever. Short fights keep the full regeneration (the boundary renewal mutator, the map estimate). The woodsman never tires (the
// cliff is deliberate; his curse ends a long fight).
const ENEMY_REGEN_COMBAT_WINDOW_MS = 2000, ENEMY_REGEN_FATIGUE_MS = 60000, ENEMY_REGEN_STEP_MS = 100;
/** One step of fighting tires the regeneration; the life mark set after each step tells a loss from any source. */
/** How long a monster must go unhurt before its regeneration comes back. A final boss's combos make the hero step out and back in
 * (data/atlas-endgame.js combo): its window spans one dodge, or dodging well handed it full regeneration (2026-10-18: a T15 hero
 * dodging the archbishop never dented it). */
const regenCalmWindowMs = enemy => ENEMY_REGEN_COMBAT_WINDOW_MS + (enemy.patternMode === 'apex' ? ATLAS_ENDGAME.combo.finisherWarningMs : 0);


/** 군락지 원정이나 대균열 도전 중인가: 그 지역을 떠나면 도전이 끝나므로(holdZoneBoundRuns) 자동 입장이 끊지 않는다. */
const isColonyOrGrandBreachRunning = () => !!(game.colony && game.colony.inRun) || !!(game.voidRift && game.voidRift.grandRun && game.voidRift.grandRun.inRun);


/**
 * @param {{id?: string, tier?: number, cosmosCapstone?: boolean}|null} zone
 * @param {() => number} [randomFn]
 * @returns {{name:string, slot:string, rarity:string}|null}
 */
const rollCosmosAstraUniqueDrop = (zone, randomFn) => {
    if (!zone || !zone.cosmosCapstone) return null;
    const definition = UNIQUE_DB.find(unique => unique && unique.dropOnly
        && unique.dropOnly.id === zone.id && Number.isFinite(Number(unique.dropOnly.bossDropChance)));
    if (!definition) return null;
    const chance = Math.max(0, Math.min(1, Number(definition.dropOnly.bossDropChance)));
    const roll = typeof randomFn === 'function' ? randomFn : Math.random;
    if (roll() >= chance) return null;
    const item = generateUniqueItem(zone.tier || definition.reqTier || 1, null, definition.name);
    if (!item || !addItemToInventory(item, { guaranteedKeep: true })) return null;
    addLog(_t('👑 [{name}] 획득!', { name: _t(item.name) }), 'loot-unique', { item });
    return item;
};


/** The fossils found, or that none were, once fossils can drop at all (before that the clear says nothing of them: '[화석 없음]'
 * after every floor read as a missed drop, 2026-10-18). The abyssal fossil has its own line when it drops. */
const LABYRINTH_FOSSIL_NOTE_NAMES = Object.freeze({ fossil: '기본 화석', fossilPrimal: '원시 화석', fossilAncientPrimal: '원시 고대 화석' });


/** Zone kinds that finish their own way (an atlas map finishes in atlasRun; the rest clear by kills, finishZoneClear). */
const ENCOUNTER_FINISH_BY_KIND = Object.freeze({
    beyondBoundary: finishBeyondBoundaryEncounter, meteor: finishMeteorEncounter, outsideChaos: finishOutsideChaosEncounter,
    oceanDepth: finishOceanEncounter, chaosRealm: finishChaosRealmEncounter, skyTower: finishSkyTowerEncounter,
    timeRift: finishTimeRiftEncounter, trial: finishTrialEncounter, seasonBoss: finishSeasonBossEncounter,
    labyrinth: finishLabyrinthEncounter, underworld: finishUnderworldEncounter, cosmos: finishCosmosEncounter
});

/** The journal entry each of the first ten act zones (ids 0 to 9) opens when cleared. */
const ACT_CLEAR_JOURNAL_ENTRIES = new Map(['act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10'].map((entry, id) => [id, entry]));

safeExposeGlobals({ getEnemyExperienceReward, grantExpAndGem, rollLootForEnemy, handleEnemyDeath, finishEncounterRun });
