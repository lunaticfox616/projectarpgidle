

export function loopFlowCollectLoopSealedBagItems(owner) {
    return [...(owner.inventory || []), ...(owner.equipmentTemporaryStorage || [])]
        .filter(item => item && item.loopSealed).map(item => JSON.parse(JSON.stringify(item)));
}

export function loopFlowClearLoopItemStorage(owner) {
    owner.inventory = [];
    owner.equipmentTemporaryStorage = [];
}

export function loopFlowGetLoopCodexReveal(owner) {
    let codexReveal = {};
    Object.keys(owner.uniqueCodex || {}).forEach(key => {
        if (!key || !owner.uniqueCodex[key]) return;
        let parts = key.split('|');
        codexReveal[key] = { revealed: true, slot: parts[0] || '', name: parts[1] || '' };
    });
    return codexReveal;
}

export function loopFlowCaptureLoopKeptState(env, owner) {
    return { ...loopFlowCaptureLoopKeptContents(env, owner), ...loopFlowCaptureLoopKeptItems(env, owner) };
}

export function loopFlowCaptureLoopKeptContents(env, owner) {
    let prevMeteorSite = env.deps.ensureMeteorSiteState();
    let preservedConstellationBuff = (prevMeteorSite.constellationBuff && prevMeteorSite.constellationBuff.permanent)
        ? JSON.parse(JSON.stringify(prevMeteorSite.constellationBuff))
        : null;
    let prevLabMax = Math.max(1, Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    let preservedChaosRealm = JSON.parse(JSON.stringify(env.deps.ensureChaosRealmState()));
    // 시간의 균열은 시간압 기록만 루프를 건넌다: 제단은 정산이 비운다(resetLoopContents, 2026-10-20 사용자).
    let preservedTimeRift = JSON.parse(JSON.stringify(env.deps.ensureTimeRiftState()));
    let preservedSkyTower = JSON.parse(JSON.stringify(env.deps.ensureSkyTowerState()));
    let preservedOcean = JSON.parse(JSON.stringify(env.deps.ensureOceanState()));
    let preservedGemEnhanceUnlocked = !!owner.gemEnhanceUnlocked;
    return { preservedConstellationBuff, prevLabMax, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked };
}

export function loopFlowCaptureLoopKeptItems(env, owner) {
    // 나무꾼의 손길로 봉인된 장비(장착/인벤)와 나무꾼의 손길 보유분은 루프가 지나도 유지한다.
    let preservedSealedEquipment = {};
    Object.keys(owner.equipment || {}).forEach(slot => {
        let it = owner.equipment[slot];
        if (it && it.loopSealed) preservedSealedEquipment[slot] = JSON.parse(JSON.stringify(it));
    });
    let preservedSealedInventory = loopFlowCollectLoopSealedBagItems(owner);
    let preservedWoodsmanTouch = Math.max(0, Math.floor((owner.currencies && owner.currencies.ouroboros) || 0));
    let preservedAltarMaterials = env.deps.atlasEndgame.loopKeptCurrencies(owner);
    let preservedWoodsmanTouchSeen = !!owner.woodsmanTouchSeen;
    return { preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedAltarMaterials, preservedWoodsmanTouchSeen };
}
