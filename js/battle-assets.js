// 전투 그림(2026-11-10에 js/passives.js에서 그대로 옮겼다): 그림판을 받아 다듬고(initBattleAssets, 배경 지우기, 아틀라스 묶기) 전장에
// 그리는 데 쓰는 조각 찾기와 그리기(drawBattleSprite). js/passives.js 바로 뒤에 읽는다.

const CUSTOM_HERO_SHEET_STORAGE_KEY = 'projectidle_custom_hero_sheet';

function getCustomHeroSheetDataUrl() {
    try {
        let saved = localStorage.getItem(CUSTOM_HERO_SHEET_STORAGE_KEY);
        if (!saved || typeof saved !== 'string') return null;
        return saved.startsWith('data:image/') ? saved : null;
    } catch (error) {
        return null;
    }
}

function isLocalFileProtocol() {
    return typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
}

function isLocalRuntimeHost() {
    if (typeof window === 'undefined' || !window.location) return false;
    if (window.location.protocol === 'file:') return true;
    let host = String(window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/** Sheets shipped already sanitized (assets/battle-clean, scripts/export-clean-battle-sheets.cjs): no runtime copy. */
function isPreCleanedBattleSheet(key) {
    return key === 'enemies' || key === 'summon1' || key.startsWith('bossAct');
}

/** A loaded sheet with its matte cleaned (sanitizeBattleSheet); the image itself where pixels cannot be read
 * (file:// throws SecurityError on getImageData) or cleaning fails. */
function cleanLoadedBattleSheet(key, image) {
    if (!ENABLE_BATTLE_SHEET_SANITIZATION || isLocalFileProtocol()) return image;
    try {
        const sanitized = sanitizeBattleSheet(image);
        return key === 'enemies' ? sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(sanitized)) : sanitized;
    } catch {
        return image;
    }
}

function shouldPreserveOriginalBattleSheet(key) {
    return isPreCleanedBattleSheet(key)
        || key === 'tiles'
        || key.startsWith('hero')
        || key.startsWith('playerClass')
        || key.startsWith('bossTelegraph')
        || key.startsWith('skillFx')
        || key.startsWith('passiveTree');
}

function initBattleAssets() {
    if (battleAssets.ready) return Promise.resolve(true);
    if (battleAssets.loading && battleAssets.loadPromise) return battleAssets.loadPromise;
    if (battleAssets.failed) return Promise.resolve(false);
    battleAssets.loading = true;
    battleAssets.failedKeys = [];
    battleAssets.loadTicket = (battleAssets.loadTicket || 0) + 1;
    battleAssets.loadPromise = null;
    const loadTicket = battleAssets.loadTicket;
    let resolveLoadPromise;
    battleAssets.loadPromise = new Promise(resolve => { resolveLoadPromise = resolve; });
    const customHeroSrc = getCustomHeroSheetDataUrl();
    const defaultHeroSrc = customHeroSrc || null;
    const manifest = {
        hero1Idle: 'assets/playable/hero1/idle.png',
        hero1Walk: 'assets/playable/hero1/walk.png',
        hero1Attack: 'assets/playable/hero1/attack.png',
        hero1Hurt: 'assets/playable/hero1/idle.png',
        hero1Death: 'assets/playable/hero1/idle.png',
        hero2Idle: 'assets/playable/hero2/idle.png',
        hero2Walk: 'assets/playable/hero2/walk.png',
        hero2Attack: 'assets/playable/hero2/attack.png',
        hero2Hurt: 'assets/playable/hero2/idle.png',
        hero2Death: 'assets/playable/hero2/idle.png',
        hero3Idle: 'assets/playable/hero3/idle.png',
        hero3Walk: 'assets/playable/hero3/walk.png',
        hero3Attack: 'assets/playable/hero3/attack.png',
        hero3Hurt: 'assets/playable/hero3/idle.png',
        hero3Death: 'assets/playable/hero3/idle.png',
        hero4Idle: 'assets/playable/hero4/idle.png',
        hero4Walk: 'assets/playable/hero4/walk.png',
        hero4Attack: 'assets/playable/hero4/attack.png',
        hero4Hurt: 'assets/playable/hero4/idle.png',
        hero4Death: 'assets/playable/hero4/idle.png',
        hero5Idle: 'assets/playable/hero5/idle.png',
        hero5Walk: 'assets/playable/hero5/walk.png',
        hero5Attack: 'assets/playable/hero5/attack.png',
        hero5Hurt: 'assets/playable/hero5/idle.png',
        hero5Death: 'assets/playable/hero5/idle.png',
        hero6Idle: 'assets/playable/hero6/idle.png',
        hero6Walk: 'assets/playable/hero6/walk.png',
        hero6Attack: 'assets/playable/hero6/attack.png',
        hero6Hurt: 'assets/playable/hero6/idle.png',
        hero6Death: 'assets/playable/hero6/idle.png',
        hero7Idle: 'assets/playable/hero7/idle.png',
        hero7Walk: 'assets/playable/hero7/walk.png',
        hero7Attack: 'assets/playable/hero7/attack.png',
        hero7Hurt: 'assets/playable/hero7/idle.png',
        hero7Death: 'assets/playable/hero7/idle.png',
        hero8Idle: 'assets/playable/hero8/idle.png',
        hero8Walk: 'assets/playable/hero8/walk.png',
        hero8Attack: 'assets/playable/hero8/attack.png',
        hero8Hurt: 'assets/playable/hero8/idle.png',
        hero8Death: 'assets/playable/hero8/idle.png',
        hero9Idle: 'assets/playable/hero9/idle.png',
        hero9Walk: 'assets/playable/hero9/walk.png',
        hero9Attack: 'assets/playable/hero9/attack.png',
        hero9Hurt: 'assets/playable/hero9/idle.png',
        hero9Death: 'assets/playable/hero9/idle.png',
        hero10Idle: 'assets/playable/hero10/idle.png',
        hero10Walk: 'assets/playable/hero10/walk.png',
        hero10Attack: 'assets/playable/hero10/attack.png',
        hero10Hurt: 'assets/playable/hero10/idle.png',
        hero10Death: 'assets/playable/hero10/idle.png',
        playerClassOccultistIdle: 'assets/playable/classes/occultist/idle.webp',
        playerClassOccultistIdleNorth: 'assets/playable/classes/occultist/idle-north.webp',
        playerClassOccultistIdleSouth: 'assets/playable/classes/occultist/idle-south.webp',
        playerClassOccultistWalk: 'assets/playable/classes/occultist/walk.webp',
        playerClassOccultistWalkNorth: 'assets/playable/classes/occultist/walk-north.webp',
        playerClassOccultistWalkSouth: 'assets/playable/classes/occultist/walk-south.webp?v=20260902-walk-repair3',
        playerClassOccultistWalkWest: 'assets/playable/classes/occultist/walk-west.webp',
        playerClassOccultistAttack: 'assets/playable/classes/occultist/attack.webp',
        playerClassOccultistAttack2: 'assets/playable/classes/occultist/attack-2.webp',
        playerClassOccultistAttackNorth: 'assets/playable/classes/occultist/attack-north.webp',
        playerClassOccultistAttack2North: 'assets/playable/classes/occultist/attack-2-north.webp',
        playerClassOccultistAttackSouth: 'assets/playable/classes/occultist/attack-south.webp',
        playerClassOccultistAttack2South: 'assets/playable/classes/occultist/attack-2-south.webp',
        playerClassWandererIdle: 'assets/playable/classes/wanderer/idle.webp',
        playerClassWandererIdleNorth: 'assets/playable/classes/wanderer/idle-north.webp',
        playerClassWandererIdleSouth: 'assets/playable/classes/wanderer/idle-south.webp',
        playerClassWandererWalk: 'assets/playable/classes/wanderer/walk.webp',
        playerClassWandererWalkNorth: 'assets/playable/classes/wanderer/walk-north.webp',
        playerClassWandererWalkSouth: 'assets/playable/classes/wanderer/walk-south.webp',
        playerClassWandererWalkWest: 'assets/playable/classes/wanderer/walk-west.webp',
        playerClassWandererAttack: 'assets/playable/classes/wanderer/attack.webp',
        playerClassWandererAttack2: 'assets/playable/classes/wanderer/attack-2.webp',
        playerClassWandererAttackNorth: 'assets/playable/classes/wanderer/attack-north.webp',
        playerClassWandererAttackSouth: 'assets/playable/classes/wanderer/attack-south.webp',
        playerClassWandererAttack2South: 'assets/playable/classes/wanderer/attack-2-south.webp',
        playerClassClericIdle: 'assets/playable/classes/cleric/idle.webp',
        playerClassClericIdleNorth: 'assets/playable/classes/cleric/idle-north.webp',
        playerClassClericIdleSouth: 'assets/playable/classes/cleric/idle-south.webp',
        playerClassClericWalk: 'assets/playable/classes/cleric/walk.webp',
        playerClassClericWalkNorth: 'assets/playable/classes/cleric/walk-north.webp',
        playerClassClericWalkSouth: 'assets/playable/classes/cleric/walk-south.webp?v=20260902-walk-repair2',
        playerClassClericWalkWest: 'assets/playable/classes/cleric/walk-west.webp',
        playerClassClericAttack: 'assets/playable/classes/cleric/attack.webp',
        playerClassClericAttackNorth: 'assets/playable/classes/cleric/attack-north.webp',
        playerClassClericAttackSouth: 'assets/playable/classes/cleric/attack-south.webp',
        playerClassArcherIdle: 'assets/playable/classes/archer/idle.webp',
        playerClassArcherIdleNorth: 'assets/playable/classes/archer/idle-north.webp',
        playerClassArcherIdleSouth: 'assets/playable/classes/archer/idle-south.webp',
        playerClassArcherWalk: 'assets/playable/classes/archer/walk.webp',
        playerClassArcherWalkNorth: 'assets/playable/classes/archer/walk-north.webp',
        playerClassArcherWalkSouth: 'assets/playable/classes/archer/walk-south.webp',
        playerClassArcherWalkWest: 'assets/playable/classes/archer/walk-west.webp',
        playerClassArcherAttack: 'assets/playable/classes/archer/attack.webp',
        playerClassArcherAttack2: 'assets/playable/classes/archer/attack-2.webp',
        playerClassArcherAttackNorth: 'assets/playable/classes/archer/attack-north.webp',
        playerClassArcherAttack2North: 'assets/playable/classes/archer/attack-2-north.webp',
        playerClassArcherAttackSouth: 'assets/playable/classes/archer/attack-south.webp',
        playerClassArcherAttack2South: 'assets/playable/classes/archer/attack-2-south.webp',
        playerClassAlchemistIdle: 'assets/playable/classes/alchemist/idle.webp',
        playerClassAlchemistIdleNorth: 'assets/playable/classes/alchemist/idle-north.webp',
        playerClassAlchemistIdleSouth: 'assets/playable/classes/alchemist/idle-south.webp',
        playerClassAlchemistWalk: 'assets/playable/classes/alchemist/walk.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkNorth: 'assets/playable/classes/alchemist/walk-north.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkSouth: 'assets/playable/classes/alchemist/walk-south.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkWest: 'assets/playable/classes/alchemist/walk-west.webp?v=20260902-walk-repair2',
        playerClassAlchemistAttack: 'assets/playable/classes/alchemist/attack.webp',
        playerClassAlchemistAttack2: 'assets/playable/classes/alchemist/attack-2.webp',
        playerClassAlchemistAttack3: 'assets/playable/classes/alchemist/attack-3.webp',
        playerClassAlchemistAttackNorth: 'assets/playable/classes/alchemist/attack-north.webp',
        playerClassAlchemistAttack2North: 'assets/playable/classes/alchemist/attack-2-north.webp',
        playerClassAlchemistAttackSouth: 'assets/playable/classes/alchemist/attack-south.webp',
        playerClassWarriorIdle: 'assets/playable/classes/warrior/idle.webp',
        playerClassWarriorIdleNorth: 'assets/playable/classes/warrior/idle-north.webp',
        playerClassWarriorIdleSouth: 'assets/playable/classes/warrior/idle-south.webp',
        playerClassWarriorWalk: 'assets/playable/classes/warrior/walk.webp?v=20260906-sheathed',
        playerClassWarriorWalkNorth: 'assets/playable/classes/warrior/walk-north.webp',
        playerClassWarriorWalkSouth: 'assets/playable/classes/warrior/walk-south.webp',
        playerClassWarriorWalkWest: 'assets/playable/classes/warrior/walk-west.webp?v=20260906-sheathed',
        playerClassWarriorAttack: 'assets/playable/classes/warrior/attack.webp',
        playerClassWarriorAttack2: 'assets/playable/classes/warrior/attack-2.webp',
        playerClassWarriorAttack3: 'assets/playable/classes/warrior/attack-3.webp',
        playerClassWarriorAttackNorth: 'assets/playable/classes/warrior/attack-north.webp',
        playerClassWarriorAttack2North: 'assets/playable/classes/warrior/attack-2-north.webp',
        playerClassWarriorAttack3North: 'assets/playable/classes/warrior/attack-3-north.webp',
        playerClassWarriorAttackSouth: 'assets/playable/classes/warrior/attack-south.webp',
        playerClassWarriorAttack2South: 'assets/playable/classes/warrior/attack-2-south.webp',
        playerClassWarriorAttack3South: 'assets/playable/classes/warrior/attack-3-south.webp',
        ...(defaultHeroSrc ? { heroLegacy: defaultHeroSrc } : {}),
        // Sanitized ahead of time (both passes the atlas used to get at runtime); v2 and v3 are no longer drawn.
        enemies: 'assets/battle-clean/battle-enemies-v1.png',
        bossTelegraphRing: 'assets/effects/boss-telegraph-ring-v1.png',
        bossTelegraphFan: 'assets/effects/boss-telegraph-fan-v1.png',
        bossTelegraphPulse: 'assets/effects/boss-telegraph-pulse-v1.png',
        skillFxWhirlwind: 'assets/effects/skill-whirlwind-v2.png',
        skillFxChainPrimary: 'assets/effects/skill-chain-primary-v2.png',
        skillFxChainJump: 'assets/effects/skill-chain-jump-v1.png',
        skillFxSlamPrimary: 'assets/effects/skill-slam-primary-v2.png',
        skillFxSlamAftershock: 'assets/effects/skill-slam-aftershock-v2.png',
        skillFxMeteorProjectile: 'assets/effects/skill-meteor-projectile-v2.png',
        skillFxMeteorImpact: 'assets/effects/skill-meteor-impact-v2.png',
        skillFxMeteorGround: 'assets/effects/skill-meteor-ground-v2.png',
        skillFxContinuousSlash: 'assets/effects/skill-continuous-slash-v1.png',
        skillFxProjectile: 'assets/effects/skill-projectile-v2.png',
        skillFxEnemyProjectiles: 'assets/effects/enemy-projectiles-v1.webp',
        skillFxVenomFang: 'assets/effects/skill-venom-fang-v3.png',
        skillFxFrostField: 'assets/effects/skill-frost-field-v2.png',
        skillFxBlizzardAmbient: 'assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v2.png',
        skillFxBlizzardImpact: 'assets/effects/skill-bludgeoning-blizzard-impact-sheet-v2.png',
        skillFxFrostWave: 'assets/effects/skill-frost-wave-v2.png',
        skillFxChaosBoomerang: 'assets/effects/skill-chaos-boomerang-v2.png',
        skillFxFrostBurst: 'assets/effects/skill-frost-burst-v1.png',
        skillFxFrostWaveRing: 'assets/effects/skill-frost-wave-ring-v1.png',
        skillFxBurst: 'assets/effects/skill-burst-v2.png',
        skillFxImpactFlare: 'assets/effects/skill-impact-flare-v1.png',
        ...SKILL_AREA_VFX_ASSETS,
        skillFxEarthSpike: 'assets/effects/pixel-earth-spike-v1.png',
        skillFxDotField: 'assets/effects/skill-dot-field-v2.png',
        skillFxSummonStrike: 'assets/effects/skill-summon-strike-v1.png',
        passiveTreeIcons: 'assets/ui/passive-tree-icons-v5.png',
        passiveTreeKeystoneIcons: 'assets/ui/passive-tree-keystone-icons-v2.png',
        passiveTreeNotableIcons: 'assets/ui/passive-tree-notable-icons-v5.png',
        passiveTreeFrames: 'assets/ui/passive-tree-frames-v1.png',
        backdropAct1: 'assets/battlefield-act1.png',
        backdropAct2_6: 'assets/battlefield-act2-6.png',
        backdropAct3_7: 'assets/battlefield-act3-7.png',
        backdropAct4_8: 'assets/battlefield-act4-8.png',
        backdropAct5: 'assets/battlefield-act5.png',
        backdropAct9_10: 'assets/battlefield-act9-10.png',

        ...ACT_BATTLE_MAP_SOURCES,
        bgAct9Sap: ACT_BATTLE_MAP_EFFECTS.bgAct9.source,
        bgChaos0: 'assets/background/refined-20260910/bgChaos0.webp',
        bgChaos1: 'assets/background/refined-20260910/bgChaos1.webp',
        bgChaos2: 'assets/background/refined-20260910/bgChaos2.webp',
        bgChaos3: 'assets/background/refined-20260910/bgChaos3.webp',
        bgChaos4: 'assets/background/refined-20260910/bgChaos4.webp',
        bgChaos5: 'assets/background/refined-20260910/bgChaos5.webp',
        bgChaos6: 'assets/background/refined-20260910/bgChaos6.webp',
        bgChaos7: 'assets/background/refined-20260910/bgChaos7.webp',
        bgChaos8: 'assets/background/refined-20260910/bgChaos8.webp',
        bgChaos9: 'assets/background/refined-20260910/bgChaos9.webp',
        bgChaos10: 'assets/background/refined-20260910/bgChaos10.webp',
        bgChaos11: 'assets/background/refined-20260910/bgChaos11.webp',
        bgChaos12: 'assets/background/refined-20260910/bgChaos12.webp',
        bgChaos13: 'assets/background/refined-20260910/bgChaos13.webp',
        bgChaos14: 'assets/background/refined-20260910/bgChaos11.webp',
        bgChaos15: 'assets/background/refined-20260910/bgChaos10.webp',
        bgChaos16: 'assets/background/refined-20260910/bgChaos9.webp',
        bgChaos17: 'assets/background/refined-20260910/bgChaos1.webp',
        bgChaos18: 'assets/background/refined-20260910/bgChaos18.webp',
        summon1: 'assets/battle-clean/summon1.png',
        ...((typeof BOSS_ASSET_MANIFEST !== 'undefined' && BOSS_ASSET_MANIFEST) || {}),
    };
    Object.values((typeof PASSIVE_TREE_V22 !== 'undefined' && PASSIVE_TREE_V22.nodes) || {}).forEach(node => {
        const source = String(node && node.iconAsset || '');
        if (!/^assets\/ui\/passive-custom-icons\/[a-zA-Z0-9._-]+\.webp$/.test(source)) return;
        manifest[`passiveTreeCustom_${node.id}`] = source;
    });
    Object.keys(manifest).forEach(key => {
        if ((key.startsWith('hero') || key.startsWith('playerClass'))
            && typeof manifest[key] === 'string' && manifest[key].startsWith('assets/playable/')) {
            manifest[key] += '?v=20260902-directional-poses2';
        }
    });
    const optionalManifestKeys = new Set(Object.keys(manifest).filter(key => key.startsWith('hero') || key.startsWith('playerClass') || key.startsWith('bg') || key.startsWith('bossTelegraph') || key.startsWith('skillFx') || key.startsWith('passiveTree')));
    // Avoid synchronous HEAD probes during boot. Missing optional files are handled by img.onerror,
    // which keeps first-page entry responsive while still waiting for all attempted assets to settle.
    const selectedHeroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : ((game && PLAYER_CLASS_DEFS[game.selectedClassId]) ? game.selectedClassId : 'archer');
    const selectedHeroDef = typeof getHeroSelectionDef === 'function'
        ? getHeroSelectionDef(selectedHeroId)
        : (PLAYER_CLASS_DEFS[selectedHeroId] || PLAYER_CLASS_DEFS.archer);
    const selectedHeroKeys = new Set(Object.values((selectedHeroDef || {}).strips || {})
        .flatMap(value => Array.isArray(value) ? value : ((value && typeof value === 'object') ? Object.values(value) : [value]))
        .filter(value => typeof value === 'string' && value));
    const criticalManifestKeys = new Set(['enemies', 'effects', 'summon1', ...getFirstBattleBackdropKeys(getZone(game.currentZoneId)), ...selectedHeroKeys]);
    const manifestGroups = prepareBattleAssetGroups(manifest, criticalManifestKeys, battleAssets.images, game.activeSkill, battleAssets.backdrops);
    const maxParallelLoads = Math.max(4, Math.min(8, Number((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 6) || 6));
    let pending = manifestGroups.length;
    let nextGroupIndex = 0;
    let activeLoads = 0;
    const totalAssets = pending;
    let settled = false;
    function updateBattleAssetLoadProgress() {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('loading-overlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        let loaded = Math.max(0, totalAssets - pending);
        let ratio = totalAssets > 0 ? (loaded / totalAssets) : 1;
        let progress = Math.floor(58 + ratio * 34);
        if (typeof advanceLoadingOverlay === 'function') {
            advanceLoadingOverlay({
                progress: progress,
                detail: _t('그림 불러오는 중 ({loaded}/{totalAssets})', { loaded, totalAssets }),
                caption: _t('전투 그림 준비')
            });
        }
    }
    function finishLoad() {
        if (settled || pending > 0 || battleAssets.loadTicket !== loadTicket) return;
        settled = true;
        if (battleAssets.failedKeys.length > 0) {
            console.warn('battle asset load completed with missing files:', battleAssets.failedKeys.join(', '));
        }
        finalizeBattleAssets();
        if (resolveLoadPromise) resolveLoadPromise(!!battleAssets.ready);
    }

    function queueBattleSheetSanitization(key, image) {
        if (battleAssets.loadTicket !== loadTicket) return;
        battleAssets.images[key] = cleanLoadedBattleSheet(key, image);
    }

    function storeLoadedBattleImage(key, image) {
        try {
            if (key.startsWith('backdrop') || key.startsWith('bg')) {
                battleAssets.backdrops[key] = image;
            } else {
                battleAssets.images[key] = image;
                if (!shouldPreserveOriginalBattleSheet(key)) queueBattleSheetSanitization(key, image);
            }
        } catch (error) {
            battleAssets.images[key] = image;
        }
    }

    function markBattleAssetGroupDone() {
        pending--;
        activeLoads = Math.max(0, activeLoads - 1);
        updateBattleAssetLoadProgress();
        finishLoad();
        pumpBattleAssetQueue();
    }

    function pumpBattleAssetQueue() {
        if (settled || battleAssets.loadTicket !== loadTicket) return;
        const concurrency = startupOverlayActive && !document.body.classList.contains('loading-active') ? 2 : maxParallelLoads;
        while (activeLoads < concurrency && nextGroupIndex < manifestGroups.length) {
            let group = manifestGroups[nextGroupIndex++];
            activeLoads++;
            let img = new Image();
            if (!isLocalFileProtocol()) img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.loading = 'eager';
            if ('fetchPriority' in img) img.fetchPriority = concurrency === 2 ? 'low' : 'auto';
            img.onload = function() {
                group.keys.forEach(key => storeLoadedBattleImage(key, img));
                markBattleAssetGroupDone();
            };
            img.onerror = function() {
                let requiredKeys = group.keys.filter(key => !optionalManifestKeys.has(key));
                if (requiredKeys.length > 0) {
                    battleAssets.failed = true;
                    requiredKeys.forEach(key => battleAssets.failedKeys.push(key));
                    console.warn('battle asset load failed:', requiredKeys.join(','), group.src);
                }
                markBattleAssetGroupDone();
            };
            img.src = group.src;
        }
    }
    updateBattleAssetLoadProgress();
    pumpBattleAssetQueue();
    return battleAssets.loadPromise;
}

function sanitizeBattleSheet(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        return image;
    }
    const px = frame.data;
    const samples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    });

    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }

    function isBgLike(r, g, b, a, loose) {
        if (a < 18) return true;
        let dist = bgDistance(r, g, b);
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 232 && (max - min) <= 26) return true;
        return loose ? dist <= 62 : dist <= 42;
    }

    let visited = new Uint8Array(canvas.width * canvas.height);
    let queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
        let pos = y * canvas.width + x;
        if (visited[pos]) return;
        let idx = pos * 4;
        if (!isBgLike(px[idx], px[idx + 1], px[idx + 2], px[idx + 3], true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }

    for (let x = 0; x < canvas.width; x++) {
        pushSeed(x, 0);
        pushSeed(x, canvas.height - 1);
    }
    for (let y = 0; y < canvas.height; y++) {
        pushSeed(0, y);
        pushSeed(canvas.width - 1, y);
    }

    while (queue.length > 0) {
        let pos = queue.pop();
        let idx = pos * 4;
        px[idx + 3] = 0;
        let x = pos % canvas.width;
        let y = Math.floor(pos / canvas.width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }

    for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i + 1];
        let b = px[i + 2];
        let a = px[i + 3];
        if (a === 0) continue;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let dist = bgDistance(r, g, b);
        if ((dist <= 32 && (max - min) <= 40) || a < 28) {
            px[i + 3] = 0;
        } else if (dist <= 48 && (max - min) <= 48) {
            px[i + 3] = Math.min(px[i + 3], 120);
        }
    }
    const alphaSnapshot = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let pos = y * canvas.width + x;
            let idx = pos * 4;
            if (alphaSnapshot[pos] === 0) continue;
            let r = px[idx];
            let g = px[idx + 1];
            let b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if (avg < 170 || (max - min) > 72) continue;
            let touchesTransparent = false;
            for (let oy = -1; oy <= 1 && !touchesTransparent; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * canvas.width + (x + ox)] === 0) {
                        touchesTransparent = true;
                        break;
                    }
                }
            }
            if (!touchesTransparent) continue;
            if (avg >= 196 && (max - min) <= 62) px[idx + 3] = 0;
            else px[idx + 3] = Math.min(px[idx + 3], 54);
        }
    }
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let pos = y * canvas.width + x;
            let idx = pos * 4;
            let alpha = px[idx + 3];
            if (alpha === 0) continue;
            let r = px[idx];
            let g = px[idx + 1];
            let b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if ((max - min) > 52 || avg < 154) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (px[((y + oy) * canvas.width + (x + ox)) * 4 + 3] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors >= 2 && avg >= 182) px[idx + 3] = 0;
            else if (transparentNeighbors >= 1 && avg >= 164 && alpha < 220) px[idx + 3] = Math.min(alpha, 32);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function sanitizeWhiteBackdropSheet(image) {
    if (!image) return image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        return image;
    }
    const px = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const visited = new Uint8Array(width * height);
    const queue = [];
    const edgeSamples = [];
    function sampleEdgePixel(x, y) {
        let idx = (y * width + x) * 4;
        let a = px[idx + 3];
        if (a < 20) return;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        if ((r + g + b) / 3 >= 186 && (max - min) <= 58) edgeSamples.push([r, g, b]);
    }
    [[0, 0], [1, 1], [width - 1, 0], [width - 2, 1], [0, height - 1], [1, height - 2], [width - 1, height - 1], [width - 2, height - 2], [Math.floor(width * 0.5), 0], [0, Math.floor(height * 0.5)], [width - 1, Math.floor(height * 0.5)]].forEach(([x, y]) => {
        sampleEdgePixel(clampNumber(x, 0, width - 1), clampNumber(y, 0, height - 1));
    });
    function edgeDistance(r, g, b) {
        let best = Infinity;
        edgeSamples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 20) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let lowSaturation = (max - min) <= (loose ? 64 : 42);
        if (avg >= 246 && lowSaturation) return true;
        if (!lowSaturation) return false;
        let dist = edgeDistance(r, g, b);
        if (avg >= 222 && dist <= (loose ? 92 : 72)) return true;
        if (avg >= 196 && dist <= (loose ? 64 : 46)) return true;
        return false;
    }
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) {
        pushSeed(x, 0);
        pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        pushSeed(0, y);
        pushSeed(width - 1, y);
    }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => pushSeed(nx, ny));
    }
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 20) {
            px[i + 3] = 0;
            continue;
        }
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 236 && (max - min) <= 38) px[i + 3] = 0;
    }
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pos = y * width + x;
            let idx = pos * 4;
            if (alphaSnapshot[pos] === 0) continue;
            let r = px[idx], g = px[idx + 1], b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if (avg < 176 || (max - min) > 62) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors >= 3 && avg >= 198) px[idx + 3] = 0;
            else if (transparentNeighbors >= 1 && avg >= 186) px[idx + 3] = Math.min(px[idx + 3], 48);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function sanitizeLocalMonsterBackdropSheet(image) {
    if (!image || !isLocalRuntimeHost()) return image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        return image;
    }
    const px = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const samples = [];
    function addSample(x, y) {
        x = clampNumber(Math.round(x), 0, width - 1);
        y = clampNumber(Math.round(y), 0, height - 1);
        let idx = (y * width + x) * 4;
        if (px[idx + 3] < 24) return;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    }
    let step = Math.max(4, Math.round(Math.min(width, height) / 36));
    for (let x = 0; x < width; x += step) { addSample(x, 0); addSample(x, height - 1); }
    for (let y = 0; y < height; y += step) { addSample(0, y); addSample(width - 1, y); }
    if (samples.length === 0) return image;
    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isLocalBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 24) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 232 && saturation <= 58) return true;
        if (saturation <= 46 && dist <= (loose ? 88 : 62)) return true;
        return dist <= (loose ? 54 : 38) && saturation <= 72;
    }
    const visited = new Uint8Array(width * height);
    const queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isLocalBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) { pushSeed(x, 0); pushSeed(x, height - 1); }
    for (let y = 0; y < height; y++) { pushSeed(0, y); pushSeed(width - 1, y); }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 224 && saturation <= 76) px[i + 3] = 0;
        else if (avg >= 204 && saturation <= 54 && dist <= 86) px[i + 3] = Math.min(px[i + 3], 28);
    }
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pos = y * width + x;
            if (alphaSnapshot[pos] === 0) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors <= 0) continue;
            let idx = pos * 4;
            if (isLocalBackdropPixel(pos, false)) px[idx + 3] = transparentNeighbors >= 3 ? 0 : Math.min(px[idx + 3], 40);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function finalizeBattleAssets() {
    try {
        battleAssets.atlas = buildBattleAssetAtlas();
        // Preserve legacy hero-sheet detection path: do not alias atlas hero strips into images.hero.
        battleAssets.ready = true;
        battleAssets.loading = false;
        renderBattlefield();
    } catch (error) {
        battleAssets.failed = true;
        battleAssets.loading = false;
        console.error('battle asset atlas error', error);
    }
}

function sortSheetComponents(list) {
    let avgHeight = list.length > 0 ? list.reduce((sum, entry) => sum + entry.height, 0) / list.length : 48;
    return [...list].sort((a, b) => {
        if (Math.abs(a.y - b.y) > avgHeight * 0.45) return a.y - b.y;
        return a.x - b.x;
    });
}

function padSpriteRect(rect, image, pad) {
    return {
        x: Math.max(0, rect.x - pad),
        y: Math.max(0, rect.y - pad),
        width: Math.min(image.width - Math.max(0, rect.x - pad), rect.width + pad * 2),
        height: Math.min(image.height - Math.max(0, rect.y - pad), rect.height + pad * 2)
    };
}

function detectSpriteComponents(image, minArea) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (error) {
        return [];
    }
    const visited = new Uint8Array(canvas.width * canvas.height);
    const components = [];
    const backgroundSamples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2],
        [Math.floor(canvas.width * 0.5), 0], [0, Math.floor(canvas.height * 0.5)], [canvas.width - 1, Math.floor(canvas.height * 0.5)]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        backgroundSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    });
    function isBackgroundPixel(pixelIndex) {
        let r = data[pixelIndex * 4];
        let g = data[pixelIndex * 4 + 1];
        let b = data[pixelIndex * 4 + 2];
        let a = data[pixelIndex * 4 + 3];
        if (a < 20) return true;
        if (r > 247 && g > 247 && b > 247) return true;
        return backgroundSamples.some(sample => Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]) <= 28);
    }
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let idx = y * canvas.width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (isBackgroundPixel(idx)) continue;
            let qx = [x];
            let qy = [y];
            let head = 0;
            let minX = x, maxX = x, minY = y, maxY = y, area = 0;
            while (head < qx.length) {
                let px = qx[head];
                let py = qy[head];
                head++;
                area++;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
                let neighbors = [
                    [px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]
                ];
                neighbors.forEach(([nx, ny]) => {
                    if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) return;
                    let nIdx = ny * canvas.width + nx;
                    if (visited[nIdx]) return;
                    visited[nIdx] = 1;
                    if (isBackgroundPixel(nIdx)) return;
                    qx.push(nx);
                    qy.push(ny);
                });
            }
            if (area >= minArea) {
                components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area: area });
            }
        }
    }
    return components;
}

function resolveHeroMotionStripAnchor(baseAnchor, motionAnchors, motion, variantIndex, direction) {
    if (!baseAnchor) return null;
    motionAnchors = { ...motionAnchors, ...(motionAnchors && motionAnchors[direction]) };
    let configured = motion === 'attack' && motionAnchors && Array.isArray(motionAnchors.attacks)
        ? motionAnchors.attacks[variantIndex]
        : (motionAnchors && motionAnchors[motion]);
    if (!Number.isFinite(configured)) return baseAnchor;
    return { ...baseAnchor, anchorY: configured };
}

function getWispAtlasFrame(cell, motion, directionIndex, frameIndex) {
    const animated = motion !== 'idle';
    const tileWidth = animated ? 576 : 256;
    const tileHeight = animated ? 256 : 64;
    return {
        x: (cell % 3) * tileWidth + (animated ? frameIndex : directionIndex) * 64,
        y: Math.floor(cell / 3) * tileHeight + (animated ? directionIndex * 64 : 0),
        width: 64,
        height: 64,
        anchorX: 32,
        anchorY: 62,
        basisHeight: 64
    };
}

function buildWispEnemyVariants(images) {
    if (typeof WISP_MONSTER_VISUALS === 'undefined') return [];
    const attackImage = images.wispEnemyAttack;
    const glowImage = images.wispEnemyGlow;
    if (!attackImage || !glowImage) return [];
    const directions = ['south', 'north', 'west', 'east'];
    return WISP_MONSTER_VISUALS.map(wisp => {
        const directional = Object.fromEntries(directions.map((direction, directionIndex) => {
            const frames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: glowImage,
                frame: getWispAtlasFrame(wisp.cell, 'glow', directionIndex, frameIndex)
            }));
            const attackFrames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: attackImage,
                frame: getWispAtlasFrame(wisp.cell, 'attack', directionIndex, frameIndex)
            }));
            return [direction, { image: glowImage, frame: frames[0].frame, frames, attackFrames }];
        }));
        return {
            id: wisp.id, skinId: wisp.id, label: wisp.name,
            image: glowImage, frame: directional.south.frame,
            frames: directional.south.frames, attackFrames: directional.south.attackFrames,
            directions: directional
        };
    });
}

function buildBattleAssetAtlas() {
    const heroParts = [
        { x: 212, y: 402, width: 161, height: 206 },
        { x: 438, y: 402, width: 167, height: 205 },
        { x: 676, y: 402, width: 218, height: 205 },
        { x: 899, y: 402, width: 223, height: 204 },
        { x: 1204, y: 402, width: 195, height: 205 }
    ];
    const heroPartsV2 = [
        { x: 174, y: 331, width: 132, height: 169 },
        { x: 360, y: 331, width: 137, height: 169 },
        { x: 556, y: 331, width: 179, height: 169 },
        { x: 740, y: 331, width: 183, height: 168 },
        { x: 991, y: 331, width: 160, height: 169 }
    ];
    const enemyParts = {
        slime: { x: 471, y: 312, width: 193, height: 102 },
        wraith: { x: 762, y: 231, width: 177, height: 217 },
        knight: { x: 1017, y: 222, width: 294, height: 233 },
        bandit: { x: 214, y: 624, width: 152, height: 207 },
        shadow: { x: 451, y: 605, width: 156, height: 219 },
        boss: { x: 603, y: 497, width: 376, height: 342 },
        skeleton: { x: 1024, y: 561, width: 297, height: 271 }
    };
    const tileParts = [
        { x: 151, y: 180, width: 170, height: 186 },
        { x: 364, y: 181, width: 174, height: 185 },
        { x: 581, y: 181, width: 179, height: 184 },
        { x: 800, y: 180, width: 188, height: 185 },
        { x: 1023, y: 181, width: 176, height: 184 },
        { x: 1234, y: 185, width: 165, height: 180 },
        { x: 153, y: 399, width: 170, height: 192 },
        { x: 363, y: 404, width: 178, height: 187 },
        { x: 581, y: 404, width: 179, height: 187 },
        { x: 799, y: 405, width: 189, height: 186 },
        { x: 1024, y: 404, width: 175, height: 187 },
        { x: 1238, y: 417, width: 171, height: 127 },
        { x: 151, y: 628, width: 170, height: 189 },
        { x: 366, y: 628, width: 172, height: 189 },
        { x: 581, y: 629, width: 179, height: 190 },
        { x: 800, y: 628, width: 188, height: 189 },
        { x: 1024, y: 630, width: 175, height: 187 }
    ];
    const legacyHeroImage = battleAssets.images.heroLegacy;
    let heroFramesLegacy = legacyHeroImage ? heroParts.map(part => trimRectToContent(legacyHeroImage, part, 3)) : [];
    let heroFramesV2 = legacyHeroImage ? heroPartsV2.map(part => trimRectToContent(legacyHeroImage, part, 3)) : [];
    function hasUsableFrame(frame) {
        return !!(frame && Number.isFinite(frame.width) && Number.isFinite(frame.height) && frame.width >= 18 && frame.height >= 24);
    }
    function isNearSize(image, width, height, tolerance) {
        let tw = tolerance || 0.035;
        let th = tolerance || 0.035;
        return Math.abs((image.width || 0) - width) <= width * tw && Math.abs((image.height || 0) - height) <= height * th;
    }
    function buildScaledHeroParts(image) {
        let scaleX = image.width / 1536;
        let scaleY = image.height / 1024;
        return heroParts.map(part => ({
            x: Math.max(0, Math.round(part.x * scaleX)),
            y: Math.max(0, Math.round(part.y * scaleY)),
            width: Math.max(10, Math.round(part.width * scaleX)),
            height: Math.max(10, Math.round(part.height * scaleY))
        }));
    }
    function withImageRef(image, frame) {
        if (!image || !frame) return null;
        return { ...frame, image: image };
    }
    function inferStripFallbackColumns(image) {
        let width = Math.max(1, Math.round(image && image.width || 1));
        let height = Math.max(1, Math.round(image && image.height || 1));
        let squareFrameCols = width / height;
        let roundedSquareFrameCols = Math.round(squareFrameCols);
        if (roundedSquareFrameCols >= 1 && Math.abs(squareFrameCols - roundedSquareFrameCols) <= 0.02) {
            return roundedSquareFrameCols;
        }
        return Math.max(1, Math.round(width / 80));
    }
    const heroStripFrameCounts = {
        hero1Idle: 1, hero1Walk: 15, hero1Attack: 7, hero1Hurt: 1, hero1Death: 1,
        hero2Idle: 1, hero2Walk: 17, hero2Attack: 7, hero2Hurt: 1, hero2Death: 1,
        hero3Idle: 1, hero3Walk: 17, hero3Attack: 7, hero3Hurt: 1, hero3Death: 1,
        hero4Idle: 1, hero4Walk: 13, hero4Attack: 7, hero4Hurt: 1, hero4Death: 1,
        hero5Idle: 1, hero5Walk: 17, hero5Attack: 7, hero5Hurt: 1, hero5Death: 1,
        hero6Idle: 1, hero6Walk: 10, hero6Attack: 7, hero6Hurt: 1, hero6Death: 1,
        hero7Idle: 1, hero7Walk: 17, hero7Attack: 7, hero7Hurt: 1, hero7Death: 1,
        hero8Idle: 1, hero8Walk: 15, hero8Attack: 7, hero8Hurt: 1, hero8Death: 1,
        hero9Idle: 1, hero9Walk: 13, hero9Attack: 7, hero9Hurt: 1, hero9Death: 1,
        hero10Idle: 1, hero10Walk: 11, hero10Attack: 7, hero10Hurt: 1, hero10Death: 1,
        playerClassOccultistIdle: 1, playerClassOccultistWalk: 9, playerClassOccultistAttack: 9, playerClassOccultistAttack2: 9,
        playerClassWandererIdle: 1, playerClassWandererWalk: 9, playerClassWandererAttack: 7, playerClassWandererAttack2: 7,
        playerClassClericIdle: 1, playerClassClericWalk: 9, playerClassClericAttack: 9,
        playerClassArcherIdle: 1, playerClassArcherWalk: 9, playerClassArcherAttack: 9, playerClassArcherAttack2: 9,
        playerClassAlchemistIdle: 1, playerClassAlchemistWalk: 9, playerClassAlchemistAttack: 8,
        playerClassAlchemistAttack2: 9, playerClassAlchemistAttack3: 4,
        playerClassWarriorIdle: 1, playerClassWarriorWalk: 9, playerClassWarriorAttack: 8,
        playerClassWarriorAttack2: 9, playerClassWarriorAttack3: 9,
        playerClassOccultistWalkSouth: 7,
        playerClassArcherWalkSouth: 8
    };
    function buildFixedStripFramesFromImage(image, frameCount) {
        if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return [];
        let frames = [];
        for (let i = 0; i < frameCount; i++) {
            let x = Math.round(i * image.width / frameCount);
            let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
            let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
            let trimmed = trimRectToContent(image, raw, 1);
            if (trimmed && trimmed.width >= 10 && trimmed.height >= 10) frames.push(withImageRef(image, trimmed));
            else frames.push(withImageRef(image, raw));
        }
        return frames.filter(Boolean);
    }
    function buildStripFramesFromImage(image, minArea, frameCount) {
        if (!image) return [];
        if (Number.isFinite(frameCount) && frameCount > 0) {
            let fixedFrames = buildFixedStripFramesFromImage(image, frameCount);
            if (fixedFrames.length > 0) return fixedFrames;
        }
        let detected = sortSheetComponents(detectSpriteComponents(image, minArea || 220))
            .map(rect => trimRectToContent(image, padSpriteRect(rect, image, 2), 2))
            .filter(rect => rect && rect.width >= 22 && rect.height >= 38)
            .map(rect => withImageRef(image, rect))
            .filter(Boolean);
        if (detected.length > 0) return detected;
        let fallbackCols = inferStripFallbackColumns(image);
        return buildFixedStripFramesFromImage(image, fallbackCols);
    }
    function getHeroStripAnchor(image, frameCount) {
        if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return null;
        let frameWidth = Math.max(1, Math.round(image.width / frameCount));
        let raw = { x: 0, y: 0, width: frameWidth, height: image.height };
        let content = trimRectToContent(image, raw, 1) || raw;
        return {
            xRatio: 0.5,
            anchorY: content.y + content.height - raw.y,
            basisHeight: Math.max(1, content.height)
        };
    }
    function buildAnchoredHeroStripFrames(image, frameCount, anchor) {
        if (!image || !anchor || !Number.isFinite(frameCount) || frameCount <= 0) return [];
        let frames = [];
        for (let i = 0; i < frameCount; i++) {
            let x = Math.round(i * image.width / frameCount);
            let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
            let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
            frames.push(withImageRef(image, {
                ...raw,
                anchorX: raw.width * anchor.xRatio,
                anchorY: anchor.anchorY,
                basisHeight: anchor.basisHeight
            }));
        }
        return frames.filter(Boolean);
    }
    function buildDirectionalHeroAttackFrames(directionKeys, anchor, motionAnchors) {
        let result = {};
        Object.entries(directionKeys || {}).forEach(([direction, keys]) => {
            let variants = (Array.isArray(keys) ? keys : []).map((key, index) => {
                let image = battleAssets.images[key];
                let frameCount = heroStripFrameCounts[key] || inferStripFallbackColumns(image);
                let motionAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index, direction);
                return buildAnchoredHeroStripFrames(image, frameCount, motionAnchor);
            }).filter(frames => frames.length > 0);
            if (variants.length > 0) result[direction] = variants;
        });
        return result;
    }
    function buildHeroFrameSetFromStripKeys(stripKeys, heroId) {
        if (!stripKeys) return null;
        let motionDefinition = typeof PLAYER_CLASS_DEFS === 'object'
            ? PLAYER_CLASS_DEFS[heroId]
            : null;
        let motionAnchors = motionDefinition && motionDefinition.motionAnchors;
        let idleImage = battleAssets.images[stripKeys.idle];
        let idleCount = heroStripFrameCounts[stripKeys.idle];
        let anchor = getHeroStripAnchor(idleImage, idleCount);
        let idleAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0);
        let walkAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0);
        let idleFrames = buildAnchoredHeroStripFrames(idleImage, idleCount, idleAnchor);
        let idleDirections = Object.fromEntries(Object.entries(stripKeys.idleDirections || {}).map(([direction, key]) => [
            direction,
            buildAnchoredHeroStripFrames(battleAssets.images[key], heroStripFrameCounts[key] || idleCount, resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0, direction))
        ]).filter(entry => entry[1].length > 0));
        let walkFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.walk], heroStripFrameCounts[stripKeys.walk], walkAnchor);
        let walkDirections = Object.fromEntries(Object.entries(stripKeys.walkDirections || {}).map(([direction, key]) => [
            direction,
            buildAnchoredHeroStripFrames(battleAssets.images[key], heroStripFrameCounts[key] || heroStripFrameCounts[stripKeys.walk], resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0, direction))
        ]).filter(entry => entry[1].length > 0));
        let attackKeys = Array.isArray(stripKeys.attacks) && stripKeys.attacks.length > 0 ? stripKeys.attacks : [stripKeys.attack];
        let attackVariants = attackKeys.map((key, index) => buildAnchoredHeroStripFrames(
            battleAssets.images[key], heroStripFrameCounts[key],
            resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index)
        )).filter(frames => frames.length > 0);
        let attackDirections = buildDirectionalHeroAttackFrames(stripKeys.attackDirections, anchor, motionAnchors);
        let attackVariantWeights = motionDefinition && Array.isArray(motionDefinition.attackVariantWeights)
            && motionDefinition.attackVariantWeights.length === attackVariants.length
            ? motionDefinition.attackVariantWeights.slice()
            : null;
        let attackFrames = attackVariants[0] || [];
        let hurtFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.hurt], heroStripFrameCounts[stripKeys.hurt], idleAnchor);
        let downFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.death], heroStripFrameCounts[stripKeys.death], idleAnchor);
        if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
        let hold = idleFrames[0] || walkFrames[0] || attackFrames[0];
        return {
            characterAnimations: {
                idle: idleFrames,
                idleDirections: idleDirections,
                walk_or_run: walkFrames,
                walkDirections: walkDirections,
                attackDirections: attackDirections,
                sword_attack_body: attackFrames,
                cast_body: attackFrames,
                hurt: hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
                down_or_knockdown: downFrames.length > 0 ? downFrames : (hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean)),
                bow_attack_body: attackFrames
            },
            clipLoop: {
                idle: true,
                walk_or_run: true,
                sword_attack_body: false,
                cast_body: false,
                hurt: false,
                down_or_knockdown: false,
                bow_attack_body: false
            },
            idle: idleFrames,
            idleDirections: idleDirections,
            walk: walkFrames,
            run: walkFrames,
            attackVariants: attackVariants,
            attackDirections: attackDirections,
            attackVariantWeights: attackVariantWeights,
            swordCombo: attackFrames,
            castCombo: attackFrames,
            projectileCombo: attackFrames,
            bowCombo: attackFrames,
            hurt: hurtFrames,
            down: downFrames,
            attack: attackFrames[0] || hold || null,
            sideIdle: hold || null,
            sideWalk: walkFrames[0] || hold || null,
            frontIdle: hold || null,
            frontGuard: idleFrames[1] || hold || null
        };
    }
    function buildHeroFrameSetFromDetectedRows(image) {
        let detected = detectSpriteComponents(image, 650)
            .filter(rect => rect.width >= 36 && rect.height >= 48)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x));
        if (detected.length < 4) return null;
        let rows = [];
        let rowThreshold = Math.max(14, Math.round((image.height || 900) * 0.07));
        detected.forEach(rect => {
            let row = rows.find(entry => Math.abs(entry.anchorY - rect.y) <= rowThreshold);
            if (!row) {
                row = { anchorY: rect.y, items: [] };
                rows.push(row);
            }
            row.items.push(rect);
            row.anchorY = Math.round((row.anchorY * (row.items.length - 1) + rect.y) / row.items.length);
        });
        rows.sort((a, b) => a.anchorY - b.anchorY);
        rows.forEach(row => row.items.sort((a, b) => a.x - b.x));
        let walkRow = rows[0] ? rows[0].items : [];
        let combatRow = rows[1] ? rows[1].items : walkRow;
        if (walkRow.length === 0 || combatRow.length === 0) return null;
        function trim(rect) {
            return trimRectToContent(image, padSpriteRect(rect, image, 4), 2);
        }
        let walkA = trim(walkRow[0]);
        let walkB = trim(walkRow[1] || walkRow[0]);
        let frontIdle = trim(combatRow[0] || walkRow[0]);
        let frontGuard = trim(combatRow[1] || combatRow[0] || walkRow[0]);
        let sideIdle = trim(combatRow[2] || combatRow[1] || combatRow[0] || walkRow[0]);
        let attack = trim(combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        let extraA = trim(combatRow[4] || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        let extraB = trim(combatRow[5] || extraA || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        return buildHeroFrameSet([frontIdle, frontGuard, sideIdle, attack, walkA, extraA, extraB, attack, walkB]);
    }
    function buildHeroFrameSet(frames) {
        let base = (frames || []).filter(Boolean);
        let frontIdle = base[0];
        let frontGuard = base[1] || frontIdle;
        let sideIdle = base[2] || frontIdle || frontGuard;
        let attack = base[3] || sideIdle || frontIdle;
        let sideWalk = base[4] || sideIdle || attack;
        let rangedAttack = base[5] || attack;
        let castAttack = base[6] || rangedAttack || attack;
        let heavyAttack = base[7] || attack;
        return {
            frontIdle: frontIdle,
            frontGuard: frontGuard,
            sideIdle: sideIdle,
            attack: attack,
            sideWalk: sideWalk,
            rangedAttack: rangedAttack,
            castAttack: castAttack,
            heavyAttack: heavyAttack,
            idle: [frontIdle, frontGuard, sideIdle],
            walk: [sideWalk, sideIdle, sideWalk, frontGuard],
            swordCombo: [attack, sideIdle, attack],
            whirlCombo: [attack, sideWalk, attack, sideIdle],
            chaosCombo: [attack, sideIdle, attack],
            lightningCombo: [rangedAttack, sideIdle, rangedAttack],
            castCombo: [castAttack, frontGuard, castAttack],
            frostCombo: [castAttack, sideIdle, frontGuard],
            quakeCombo: [heavyAttack, attack, frontGuard],
            projectileCombo: [rangedAttack, sideIdle, rangedAttack]
        };
    }
    function buildHeroFrameSetFromDefs(image, defs) {
        let trimPadding = defs.trimPadding || {};
        let rawKeys = defs.rawKeys || {};
        function mergeFrameMeta(target, source) {
            let next = { ...target };
            if (source && Number.isFinite(source.basisHeight)) next.basisHeight = source.basisHeight;
            if (source && Number.isFinite(source.offsetX)) next.offsetX = source.offsetX;
            if (source && Number.isFinite(source.offsetY)) next.offsetY = source.offsetY;
            if (source && Number.isFinite(source.cropLeft)) next.cropLeft = source.cropLeft;
            if (source && Number.isFinite(source.cropRight)) next.cropRight = source.cropRight;
            if (source && Number.isFinite(source.cropTop)) next.cropTop = source.cropTop;
            if (source && Number.isFinite(source.cropBottom)) next.cropBottom = source.cropBottom;
            return next;
        }
        function buildList(key, list, pad) {
            let raw = !!rawKeys[key];
            return (list || []).map(rect => {
                let prepared = padSpriteRect(rect, image, raw ? 2 : (pad || 3));
                if (raw) return mergeFrameMeta(prepared, rect);
                return mergeFrameMeta(trimRectToContent(image, prepared, 2), rect);
            }).filter(hasUsableFrame);
        }
        let idle = buildList('idle', defs.idle, trimPadding.idle || 4);
        let walk = buildList('walk', defs.walk, trimPadding.walk || 4);
        let run = buildList('run', defs.run, trimPadding.run || 4);
        let swordCombo = buildList('swordCombo', defs.swordCombo, trimPadding.swordCombo || 4);
        let assassinCombo = buildList('assassinCombo', defs.assassinCombo, trimPadding.assassinCombo || 4);
        let whirlCombo = buildList('whirlCombo', defs.whirlCombo, trimPadding.whirlCombo || 4);
        let castCombo = buildList('castCombo', defs.castCombo, trimPadding.castCombo || 4);
        let chaosCombo = buildList('chaosCombo', defs.chaosCombo, trimPadding.chaosCombo || 4);
        let lightningCombo = buildList('lightningCombo', defs.lightningCombo, trimPadding.lightningCombo || 4);
        let flameCombo = buildList('flameCombo', defs.flameCombo, trimPadding.flameCombo || 4);
        let frostCombo = buildList('frostCombo', defs.frostCombo, trimPadding.frostCombo || 4);
        let greatswordCombo = buildList('greatswordCombo', defs.greatswordCombo, trimPadding.greatswordCombo || 4);
        let quakeCombo = buildList('quakeCombo', defs.quakeCombo, trimPadding.quakeCombo || 4);
        let projectileCombo = buildList('projectileCombo', defs.projectileCombo, trimPadding.projectileCombo || 4);
        let bowCombo = buildList('bowCombo', defs.bowCombo, trimPadding.bowCombo || 4);
        let hurt = buildList('hurt', defs.hurt, trimPadding.hurt || 4);
        let down = buildList('down', defs.down, trimPadding.down || 4);
        let frontIdle = idle[0] || walk[0] || swordCombo[0];
        let frontGuard = idle[1] || frontIdle;
        let sideIdle = idle[2] || idle[1] || walk[0] || frontIdle;
        let attack = swordCombo[1] || swordCombo[0] || sideIdle || frontIdle;
        let sideWalk = walk[1] || walk[0] || run[0] || sideIdle;
        let rangedAttack = projectileCombo[1] || projectileCombo[0] || castCombo[1] || castCombo[0] || attack;
        let castAttack = castCombo[2] || castCombo[1] || castCombo[0] || rangedAttack;
        let heavyAttack = quakeCombo[1] || quakeCombo[0] || whirlCombo[1] || whirlCombo[0] || attack;
        function uniqueFrames(list) {
            return (list || []).filter((frame, index, source) => frame && source.indexOf(frame) === index);
        }
        function pickPreferredFrame(list, indices, fallback) {
            let sequence = (list || []).filter(Boolean);
            for (let i = 0; i < indices.length; i++) {
                let idx = indices[i];
                if (sequence[idx]) return sequence[idx];
            }
            if (sequence.length > 0) return sequence[Math.floor(sequence.length / 2)];
            return fallback || null;
        }
        function withFallbackMeta(frame, defaults) {
            if (!frame) return frame;
            let next = { ...frame };
            if (defaults && Number.isFinite(defaults.basisHeight) && !Number.isFinite(next.basisHeight)) next.basisHeight = defaults.basisHeight;
            if (defaults && Number.isFinite(defaults.offsetX) && !Number.isFinite(next.offsetX)) next.offsetX = defaults.offsetX;
            if (defaults && Number.isFinite(defaults.offsetY) && !Number.isFinite(next.offsetY)) next.offsetY = defaults.offsetY;
            return next;
        }
        let idleHold = sideIdle || frontIdle || frontGuard;
        let walkSimple = uniqueFrames([
            walk[1] || walk[0],
            walk[5] || walk[4] || walk[2] || walk[walk.length - 1] || walk[0]
        ]);
        let runSimple = walkSimple.length > 0 ? walkSimple : uniqueFrames([
            run[1] || run[0],
            run[5] || run[4] || run[2] || run[run.length - 1] || run[0]
        ]);
        let swordMain = withFallbackMeta(pickPreferredFrame(swordCombo, [2, 0, 1, 4, 3, 5], attack), { basisHeight: 82, offsetY: 3 });
        let assassinMain = pickPreferredFrame(assassinCombo, [0, 1], swordMain || attack);
        let whirlMain = withFallbackMeta(pickPreferredFrame(whirlCombo, [1, 2, 3, 0, 4], swordMain || heavyAttack || attack), { basisHeight: 82, offsetY: 3 });
        let castMain = pickPreferredFrame(castCombo, [2, 3, 1, 4, 0], castAttack || rangedAttack || attack);
        let chaosMain = withFallbackMeta(pickPreferredFrame(chaosCombo, [2, 1, 3, 0], castMain || castAttack || attack), { basisHeight: 84, offsetY: 2 });
        let lightningMain = pickPreferredFrame(lightningCombo, [1, 0, 2, 4, 3], rangedAttack || attack);
        let flameMain = withFallbackMeta(pickPreferredFrame(flameCombo, [0, 1, 2, 3, 4, 5], swordMain || attack), { basisHeight: 82, offsetY: 3 });
        let frostMain = castMain || pickPreferredFrame(frostCombo, [1, 0, 2, 3, 4], castMain || castAttack || attack);
        let quakeMain = pickPreferredFrame(quakeCombo, [1, 2, 0], heavyAttack || swordMain || attack);
        let greatswordMain = pickPreferredFrame(greatswordCombo, [0, 1], heavyAttack || quakeMain || swordMain || attack);
        let projectileMain = pickPreferredFrame(projectileCombo, [1, 2, 3, 0], lightningMain || rangedAttack || attack);
        let bowMain = pickPreferredFrame(bowCombo, [5, 6, 4, 7, 3, 2, 8, 1, 0], projectileMain || rangedAttack || attack);
        let hurtHold = hurt[1] || hurt[0] || frontGuard || sideIdle || frontIdle;
        return {
            frontIdle: frontIdle,
            frontGuard: frontGuard,
            sideIdle: sideIdle,
            attack: attack,
            sideWalk: sideWalk,
            rangedAttack: rangedAttack,
            castAttack: castAttack,
            heavyAttack: heavyAttack,
            hurt: [hurtHold].filter(Boolean),
            down: down,
            idle: [idleHold].filter(Boolean),
            walk: walkSimple.length > 0 ? walkSimple : [sideWalk, sideIdle].filter(Boolean),
            run: runSimple.length > 0 ? runSimple : (walkSimple.length > 0 ? walkSimple : [sideWalk, sideIdle].filter(Boolean)),
            swordCombo: [swordMain].filter(Boolean),
            assassinCombo: [assassinMain].filter(Boolean),
            whirlCombo: [whirlMain].filter(Boolean),
            chaosCombo: [chaosMain].filter(Boolean),
            lightningCombo: [lightningMain].filter(Boolean),
            castCombo: [castMain].filter(Boolean),
            flameCombo: [flameMain].filter(Boolean),
            frostCombo: [frostMain].filter(Boolean),
            greatswordCombo: [greatswordMain].filter(Boolean),
            quakeCombo: [quakeMain].filter(Boolean),
            projectileCombo: [projectileMain].filter(Boolean),
            bowCombo: [bowMain].filter(Boolean)
        };
    }
    function scaleHeroFrameDefs(defs, scaleX, scaleY) {
        let next = {};
        Object.entries(defs || {}).forEach(([key, list]) => {
            if (key === 'trimPadding' || key === 'rawKeys') {
                next[key] = { ...(list || {}) };
                return;
            }
            next[key] = (list || []).map(rect => {
                let scaled = {
                    ...rect,
                    x: Math.max(0, Math.round(rect.x * scaleX)),
                    y: Math.max(0, Math.round(rect.y * scaleY)),
                    width: Math.max(12, Math.round(rect.width * scaleX)),
                    height: Math.max(12, Math.round(rect.height * scaleY))
                };
                if (Number.isFinite(rect.basisHeight)) scaled.basisHeight = Math.max(12, Math.round(rect.basisHeight * scaleY));
                if (Number.isFinite(rect.offsetX)) scaled.offsetX = rect.offsetX * scaleX;
                if (Number.isFinite(rect.offsetY)) scaled.offsetY = rect.offsetY * scaleY;
                if (Number.isFinite(rect.cropLeft)) scaled.cropLeft = Math.max(0, Math.round(rect.cropLeft * scaleX));
                if (Number.isFinite(rect.cropRight)) scaled.cropRight = Math.max(0, Math.round(rect.cropRight * scaleX));
                if (Number.isFinite(rect.cropTop)) scaled.cropTop = Math.max(0, Math.round(rect.cropTop * scaleY));
                if (Number.isFinite(rect.cropBottom)) scaled.cropBottom = Math.max(0, Math.round(rect.cropBottom * scaleY));
                return scaled;
            });
        });
        return next;
    }
    function getBattleHero1FrameDefs() {
        return {
            trimPadding: {
                swordCombo: 12,
                assassinCombo: 10,
                whirlCombo: 12,
                flameCombo: 10,
                frostCombo: 10,
                greatswordCombo: 12,
                lightningCombo: 8,
                projectileCombo: 8,
                bowCombo: 6
            },
            rawKeys: {
                swordCombo: true,
                assassinCombo: true,
                whirlCombo: true,
                flameCombo: true,
                greatswordCombo: true
            },
            idle: [
                { x: 30, y: 16, width: 74, height: 90 },
                { x: 140, y: 16, width: 76, height: 90 },
                { x: 348, y: 16, width: 78, height: 90 },
                { x: 452, y: 16, width: 70, height: 90 }
            ],
            walk: [
                { x: 26, y: 118, width: 76, height: 94 },
                { x: 130, y: 118, width: 90, height: 94 },
                { x: 248, y: 118, width: 78, height: 94 },
                { x: 356, y: 118, width: 74, height: 94 },
                { x: 458, y: 118, width: 82, height: 94 },
                { x: 576, y: 118, width: 74, height: 94 },
                { x: 680, y: 118, width: 76, height: 94 },
                { x: 776, y: 118, width: 78, height: 94 }
            ],
            run: [
                { x: 20, y: 210, width: 98, height: 94 },
                { x: 128, y: 210, width: 92, height: 94 },
                { x: 230, y: 210, width: 100, height: 94 },
                { x: 346, y: 210, width: 96, height: 94 },
                { x: 458, y: 210, width: 108, height: 94 },
                { x: 582, y: 210, width: 88, height: 94 },
                { x: 684, y: 210, width: 96, height: 94 },
                { x: 794, y: 210, width: 100, height: 94 }
            ],
            swordCombo: [
                { x: 18, y: 298, width: 130, height: 108 },
                { x: 144, y: 298, width: 196, height: 108 },
                { x: 322, y: 298, width: 138, height: 108 },
                { x: 462, y: 296, width: 210, height: 112 },
                { x: 646, y: 296, width: 194, height: 112 },
                { x: 814, y: 296, width: 218, height: 112 }
            ],
            assassinCombo: [
                { x: 18, y: 298, width: 130, height: 108, basisHeight: 82, offsetX: 10, offsetY: 3, cropLeft: 10 }
            ],
            whirlCombo: [
                { x: 12, y: 400, width: 160, height: 110 },
                { x: 154, y: 400, width: 214, height: 110 },
                { x: 340, y: 400, width: 170, height: 110 },
                { x: 500, y: 400, width: 162, height: 110 },
                { x: 636, y: 400, width: 148, height: 110 }
            ],
            castCombo: [
                { x: 32, y: 510, width: 72, height: 92 },
                { x: 122, y: 510, width: 78, height: 92 },
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 },
                { x: 526, y: 510, width: 96, height: 92 }
            ],
            chaosCombo: [
                { x: 122, y: 510, width: 78, height: 92 },
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 }
            ],
            lightningCombo: [
                { x: 24, y: 598, width: 98, height: 96 },
                { x: 154, y: 598, width: 92, height: 96 },
                { x: 278, y: 598, width: 88, height: 96 },
                { x: 410, y: 598, width: 96, height: 96 },
                { x: 884, y: 598, width: 82, height: 96 }
            ],
            flameCombo: [
                { x: 20, y: 688, width: 112, height: 104 },
                { x: 138, y: 688, width: 110, height: 104 },
                { x: 256, y: 688, width: 118, height: 104 },
                { x: 382, y: 688, width: 122, height: 104 },
                { x: 498, y: 688, width: 132, height: 104 },
                { x: 618, y: 688, width: 134, height: 104 }
            ],
            frostCombo: [
                { x: 30, y: 776, width: 74, height: 100 },
                { x: 140, y: 776, width: 100, height: 100 },
                { x: 270, y: 776, width: 118, height: 100 },
                { x: 396, y: 776, width: 114, height: 100 },
                { x: 530, y: 776, width: 112, height: 100 }
            ],
            greatswordCombo: [
                { x: 460, y: 294, width: 214, height: 116, basisHeight: 75, offsetX: 22, offsetY: 4, cropLeft: 60, cropTop: 28 }
            ],
            quakeCombo: [
                { x: 368, y: 302, width: 88, height: 100 },
                { x: 522, y: 302, width: 90, height: 100 },
                { x: 706, y: 302, width: 94, height: 100 }
            ],
            projectileCombo: [
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 },
                { x: 526, y: 510, width: 96, height: 92 }
            ],
            bowCombo: [
                { x: 38, y: 975, width: 74, height: 79 },
                { x: 158, y: 975, width: 84, height: 79 },
                { x: 274, y: 976, width: 81, height: 78 },
                { x: 387, y: 978, width: 90, height: 76 },
                { x: 508, y: 977, width: 84, height: 76 },
                { x: 616, y: 980, width: 89, height: 75 },
                { x: 728, y: 982, width: 95, height: 73 },
                { x: 843, y: 982, width: 95, height: 74 },
                { x: 962, y: 982, width: 81, height: 74 }
            ],
            hurt: [
                { x: 28, y: 870, width: 76, height: 94 },
                { x: 152, y: 870, width: 80, height: 94 },
                { x: 276, y: 870, width: 78, height: 94 },
                { x: 378, y: 870, width: 88, height: 94 },
                { x: 494, y: 870, width: 70, height: 94 },
                { x: 618, y: 870, width: 82, height: 94 }
            ],
            down: [
                { x: 42, y: 968, width: 78, height: 96 },
                { x: 184, y: 968, width: 88, height: 96 },
                { x: 330, y: 968, width: 90, height: 96 },
                { x: 458, y: 968, width: 94, height: 96 },
                { x: 582, y: 968, width: 100, height: 96 },
                { x: 710, y: 968, width: 96, height: 96 }
            ]
        };
    }
    function getBattleHero1SafeClipDefs() {
        return {
            bodyFrames: {
                B_IDLE_01: { x: 30, y: 16, width: 74, height: 90 },
                B_IDLE_02: { x: 140, y: 16, width: 76, height: 90 },
                B_IDLE_03: { x: 348, y: 16, width: 78, height: 90 },
                B_IDLE_04: { x: 452, y: 16, width: 70, height: 90 },
                B_WALK_01: { x: 26, y: 118, width: 76, height: 94 },
                B_WALK_02: { x: 130, y: 118, width: 90, height: 94 },
                B_WALK_03: { x: 248, y: 118, width: 78, height: 94 },
                B_WALK_04: { x: 356, y: 118, width: 74, height: 94 },
                B_WALK_05: { x: 458, y: 118, width: 82, height: 94 },
                B_WALK_06: { x: 576, y: 118, width: 74, height: 94 },
                B_WALK_07: { x: 680, y: 118, width: 76, height: 94 },
                B_WALK_08: { x: 776, y: 118, width: 78, height: 94 },
                B_SWORD_01: { x: 368, y: 302, width: 88, height: 100 },
                B_SWORD_02: { x: 522, y: 302, width: 90, height: 100 },
                B_SWORD_03: { x: 706, y: 302, width: 94, height: 100 },
                B_CAST_01: { x: 32, y: 510, width: 72, height: 92 },
                B_CAST_02: { x: 122, y: 510, width: 78, height: 92 },
                B_CAST_03: { x: 216, y: 510, width: 74, height: 92 },
                B_CAST_04: { x: 310, y: 510, width: 86, height: 92 },
                B_CAST_05: { x: 412, y: 510, width: 88, height: 92 },
                B_CAST_06: { x: 526, y: 510, width: 96, height: 92 },
                B_HURT_01: { x: 28, y: 870, width: 76, height: 94 },
                B_HURT_02: { x: 152, y: 870, width: 80, height: 94 },
                B_HURT_03: { x: 276, y: 870, width: 78, height: 94 },
                B_HURT_04: { x: 378, y: 870, width: 88, height: 94 },
                B_HURT_05: { x: 494, y: 870, width: 70, height: 94 },
                B_HURT_06: { x: 618, y: 870, width: 82, height: 94 },
                B_DOWN_01: { x: 42, y: 968, width: 78, height: 96 },
                B_DOWN_02: { x: 184, y: 968, width: 88, height: 96 },
                B_DOWN_03: { x: 330, y: 968, width: 90, height: 96 },
                B_DOWN_04: { x: 458, y: 968, width: 94, height: 96 },
                B_BOW_01: { x: 38, y: 975, width: 74, height: 79 },
                B_BOW_02: { x: 158, y: 975, width: 84, height: 79 },
                B_BOW_03: { x: 274, y: 976, width: 81, height: 78 },
                B_BOW_04: { x: 387, y: 978, width: 90, height: 76 },
                B_BOW_05: { x: 508, y: 977, width: 84, height: 76 },
                B_BOW_06: { x: 616, y: 980, width: 89, height: 75 },
                B_BOW_07: { x: 728, y: 982, width: 95, height: 73 },
                B_BOW_08: { x: 843, y: 982, width: 95, height: 74 },
                B_BOW_09: { x: 962, y: 982, width: 81, height: 74 }
            },
            characterAnimations: {
                idle: ['B_IDLE_01', 'B_IDLE_02', 'B_IDLE_03', 'B_IDLE_04'],
                walk_or_run: ['B_WALK_01', 'B_WALK_02', 'B_WALK_03', 'B_WALK_04', 'B_WALK_05', 'B_WALK_06', 'B_WALK_07', 'B_WALK_08'],
                sword_attack_body: ['B_SWORD_01', 'B_SWORD_02', 'B_SWORD_03'],
                cast_body: ['B_CAST_01', 'B_CAST_02', 'B_CAST_03', 'B_CAST_04', 'B_CAST_05', 'B_CAST_06'],
                hurt: ['B_HURT_01', 'B_HURT_02', 'B_HURT_03', 'B_HURT_04', 'B_HURT_05', 'B_HURT_06'],
                down_or_knockdown: ['B_DOWN_01', 'B_DOWN_02', 'B_DOWN_03', 'B_DOWN_04'],
                bow_attack_body: ['B_BOW_01', 'B_BOW_02', 'B_BOW_03', 'B_BOW_04', 'B_BOW_05', 'B_BOW_06', 'B_BOW_07', 'B_BOW_08', 'B_BOW_09']
            },
            clipLoop: {
                idle: true,
                walk_or_run: true,
                sword_attack_body: false,
                cast_body: false,
                hurt: false,
                down_or_knockdown: false,
                bow_attack_body: false
            }
        };
    }
    function scaleSafeHeroClipDefs(defs, scaleX, scaleY) {
        let scaled = {
            bodyFrames: {},
            characterAnimations: { ...(defs.characterAnimations || {}) },
            clipLoop: { ...(defs.clipLoop || {}) }
        };
        Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
            scaled.bodyFrames[id] = {
                x: Math.max(0, Math.round(rect.x * scaleX)),
                y: Math.max(0, Math.round(rect.y * scaleY)),
                width: Math.max(12, Math.round(rect.width * scaleX)),
                height: Math.max(12, Math.round(rect.height * scaleY))
            };
            if (Number.isFinite(rect.basisHeight)) scaled.bodyFrames[id].basisHeight = Math.max(12, Math.round(rect.basisHeight * scaleY));
            if (Number.isFinite(rect.offsetX)) scaled.bodyFrames[id].offsetX = rect.offsetX * scaleX;
            if (Number.isFinite(rect.offsetY)) scaled.bodyFrames[id].offsetY = rect.offsetY * scaleY;
        });
        return scaled;
    }
    function buildSafeHeroFrameSetFromClipDefs(image, defs) {
        let bodyFrames = {};
        Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
            let prepared = padSpriteRect(rect, image, 4);
            let trimmed = trimRectToContent(image, prepared, 2);
            if (hasUsableFrame(trimmed)) {
                if (Number.isFinite(rect.basisHeight)) trimmed.basisHeight = rect.basisHeight;
                if (Number.isFinite(rect.offsetX)) trimmed.offsetX = rect.offsetX;
                if (Number.isFinite(rect.offsetY)) trimmed.offsetY = rect.offsetY;
                bodyFrames[id] = trimmed;
            }
        });
        function resolveClip(name) {
            return (defs.characterAnimations && defs.characterAnimations[name] ? defs.characterAnimations[name] : [])
                .map(id => bodyFrames[id])
                .filter(Boolean);
        }
        let characterAnimations = {
            idle: resolveClip('idle'),
            walk_or_run: resolveClip('walk_or_run'),
            sword_attack_body: resolveClip('sword_attack_body'),
            cast_body: resolveClip('cast_body'),
            hurt: resolveClip('hurt'),
            down_or_knockdown: resolveClip('down_or_knockdown'),
            bow_attack_body: resolveClip('bow_attack_body')
        };
        return {
            characterAnimations: characterAnimations,
            clipLoop: { ...(defs.clipLoop || {}) },
            idle: characterAnimations.idle,
            walk: characterAnimations.walk_or_run,
            run: characterAnimations.walk_or_run,
            swordCombo: characterAnimations.sword_attack_body,
            castCombo: characterAnimations.cast_body,
            projectileCombo: characterAnimations.cast_body,
            bowCombo: characterAnimations.bow_attack_body,
            hurt: characterAnimations.hurt,
            down: characterAnimations.down_or_knockdown,
            attack: characterAnimations.sword_attack_body[0] || characterAnimations.idle[0] || null,
            sideIdle: characterAnimations.idle[0] || null,
            sideWalk: characterAnimations.walk_or_run[0] || characterAnimations.idle[0] || null,
            frontIdle: characterAnimations.idle[0] || null,
            frontGuard: characterAnimations.idle[1] || characterAnimations.idle[0] || null
        };
    }
    function buildSafeHeroFrameSetBattleHero1(image) {
        return buildSafeHeroFrameSetFromClipDefs(image, getBattleHero1SafeClipDefs());
    }
    function buildHeroFrameSetBattleHero1(image) {
        return buildSafeHeroFrameSetBattleHero1(image);
    }
    function buildHeroFrameSetBattleHeroV1(image) {
        let defs = scaleSafeHeroClipDefs(getBattleHero1SafeClipDefs(), image.width / 1448, image.height / 1086);
        return buildSafeHeroFrameSetFromClipDefs(image, defs);
    }
    let selectedHeroDef = getHeroSelectionDef(typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId);

    function buildEnemyTransparentImage(image) {
        if (!image || isPreCleanedBattleSheet('enemies')) return image;
        try {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(sanitizeBattleSheet(image)));
        } catch (error) {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(image));
        }
    }
    let heroFrameSetSource = selectedHeroDef.id;
    let heroFrameSet = buildHeroFrameSetFromStripKeys(selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== 'archer') {
        heroFrameSet = buildHeroFrameSetFromStripKeys(PLAYER_CLASS_DEFS.archer.strips, 'archer');
        if (heroFrameSet) heroFrameSetSource = 'archer';
    }
    if (!heroFrameSet && heroFramesLegacy.length > 0) {
        heroFrameSet = buildHeroFrameSet(heroFramesLegacy);
        heroFrameSetSource = 'legacy';
    }
    // v2 하드 매핑 + 어떤 해상도든 커스텀/비표준 시트는 스케일/감지 fallback을 탄다.
    if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1448, 1086, 0.05)) {
        heroFrameSet = buildHeroFrameSetBattleHero1(legacyHeroImage);
    } else if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1264, 842, 0.05)) {
        heroFrameSet = buildHeroFrameSet(heroFramesV2);
        let detectedV2 = buildHeroFrameSetFromDetectedRows(legacyHeroImage);
        if (detectedV2) heroFrameSet = detectedV2;
    } else if (!heroFrameSet && legacyHeroImage) {
        let scaledParts = buildScaledHeroParts(legacyHeroImage);
        let scaledFrames = scaledParts.map(part => trimRectToContent(legacyHeroImage, part, 3));
        let scaledUsableCount = scaledFrames.filter(hasUsableFrame).length;
        if (scaledUsableCount >= 5) heroFrameSet = buildHeroFrameSet(scaledFrames);
        let detectedCustom = buildHeroFrameSetFromDetectedRows(legacyHeroImage);
        if (detectedCustom) heroFrameSet = detectedCustom;
    }
    if (!heroFrameSet) {
        heroFrameSetSource = 'none';
        heroFrameSet = {
            characterAnimations: { idle: [], walk_or_run: [], sword_attack_body: [], cast_body: [], hurt: [], down_or_knockdown: [], bow_attack_body: [] },
            clipLoop: {},
            idle: [],
            walk: [],
            run: []
        };
    }
    function resolveHeroImageForFrameSet() {
        if (heroFrameSetSource === 'legacy') return legacyHeroImage;
        let sourceDef = getHeroSelectionDef(heroFrameSetSource) || selectedHeroDef || PLAYER_CLASS_DEFS.archer;
        let strips = (sourceDef && sourceDef.strips) || {};
        return battleAssets.images[strips.idle]
            || battleAssets.images[strips.walk]
            || battleAssets.images[strips.attack]
            || battleAssets.images[strips.hurt]
            || battleAssets.images[strips.death]
            || battleAssets.images.hero1Idle
            || battleAssets.images.hero1Walk
            || battleAssets.images.hero1Attack
            || battleAssets.images.hero1Hurt
            || battleAssets.images.hero1Death
            || legacyHeroImage;
    }
    const enemySpriteImage = buildEnemyTransparentImage(battleAssets.images.enemies);
    const enemyFrames = Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, trimRectToContent(enemySpriteImage, part, key === 'boss' ? 5 : 3)]));
    // The frames are measured once; drop the pixel-reading copy of the atlas (another full decode).
    battleImageCanvasCache.delete(enemySpriteImage);
    const wispEnemyVariants = buildWispEnemyVariants(battleAssets.images);
    function buildDetectedEnemyPools(image) {
        let pools = { normal: [], elite: [], boss: [] };
        if (!image) return pools;
        let detected = sortSheetComponents(detectSpriteComponents(image, 180))
            .map(rect => trimRectToContent(image, padSpriteRect(rect, image, 4), 2))
            .filter(hasUsableFrame);
        if (detected.length === 0) return pools;
        let ranked = [...detected].sort((a, b) => ((b.width * b.height) - (a.width * a.height)));
        let bossCount = Math.min(3, Math.max(1, Math.round(detected.length * 0.12)));
        let eliteCount = Math.min(8, Math.max(4, Math.round(detected.length * 0.24)));
        let bossSet = new Set(ranked.slice(0, bossCount));
        let eliteSet = new Set(ranked.slice(bossCount, bossCount + eliteCount));
        detected.forEach(frame => {
            if (bossSet.has(frame)) pools.boss.push({ image: image, frame: frame });
            else if (eliteSet.has(frame)) pools.elite.push({ image: image, frame: frame });
            else pools.normal.push({ image: image, frame: frame });
        });
        return pools;
    }
    function mergeEnemyPools(base, extra) {
        ['normal', 'elite', 'boss'].forEach(role => {
            base[role] = (base[role] || []).concat(extra[role] || []);
        });
        return base;
    }
    let enemyVariantPools = {
        // 일반과 정예는 자기 시트로 그린다(액트 몬스터 js/canvas-monster-actors.js, 위습 js/canvas-wisp-actors.js).
        // 이 아틀라스 목록은 그 시트를 못 불러왔을 때의 대체 그림이다.
        normal: wispEnemyVariants.length ? wispEnemyVariants : [
            { image: enemySpriteImage, frame: enemyFrames.slime },
            { image: enemySpriteImage, frame: enemyFrames.bandit },
            { image: enemySpriteImage, frame: enemyFrames.shadow },
            { image: enemySpriteImage, frame: enemyFrames.wraith }
        ].filter(entry => hasUsableFrame(entry.frame)),
        elite: wispEnemyVariants.length ? wispEnemyVariants : [
            { image: enemySpriteImage, frame: enemyFrames.knight },
            { image: enemySpriteImage, frame: enemyFrames.skeleton }
        ].filter(entry => hasUsableFrame(entry.frame)),
        boss: [
            { image: enemySpriteImage, frame: enemyFrames.boss },
        ].filter(entry => hasUsableFrame(entry.frame))
    };
    // 배경 불투명 스프라이트가 섞이는 현상을 방지하기 위해
    // 자동 감지 풀(2/3번 시트)은 기본값에서 제외한다.
    // 필요 시 추후 개별 투명화 보정 후 재활성화 가능.
    // enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies2));
    // enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies3));
    const bossImages = {};
    if (typeof BOSS_ASSET_MANIFEST !== 'undefined') {
        Object.keys(BOSS_ASSET_MANIFEST).forEach(key => {
            if (battleAssets.images[key]) bossImages[key] = battleAssets.images[key];
        });
    }
    const tileImage = battleAssets.images.tiles || null;
    const tileFrames = tileImage ? tileParts.map(part => trimRectToContent(tileImage, part, 2)) : [];
    return {
        hero: {
            image: resolveHeroImageForFrameSet(),
            frames: heroFrameSet
        },
        enemies: {
            image: enemySpriteImage,
            variants: enemyVariantPools,
            bossImages: bossImages,
            frames: {
                slime: enemyFrames.slime,
                wraith: enemyFrames.wraith,
                knight: enemyFrames.knight,
                bandit: enemyFrames.bandit,
                shadow: enemyFrames.shadow,
                boss: enemyFrames.boss,
                skeleton: enemyFrames.skeleton
            }
        },
        tiles: {
            image: tileImage,
            frames: {
                grass: tileFrames[0] || null,
                grassDeep: tileFrames[1] || null,
                moss: tileFrames[2] || null,
                stone: tileFrames[3] || null,
                dirt: tileFrames[4] || null,
                dirtWarm: tileFrames[5] || null,
                grassBright: tileFrames[6] || null,
                swamp: tileFrames[7] || null,
                ruin: tileFrames[8] || null,
                frost: tileFrames[9] || null,
                lava: tileFrames[10] || null,
                chest: tileFrames[11] || null,
                roots: tileFrames[12] || null,
                abyss: tileFrames[13] || null,
                temple: tileFrames[14] || null,
                templeAlt: tileFrames[15] || null
            }
        }
    };
}

function getBattleActorDrawAlpha(ctx,alpha) {
    return (alpha ?? 1)*(ctx.battleActorAlpha ?? 1);
}

// 윤곽선 스프라이트 캐시. ctx.filter(drop-shadow 4개)는 그릴 때마다 캔버스 전체 크기의 임시 버퍼를 만들어,
// 전장이 클수록 비싸다(GPU 없는 렌더에서 1440×900 기준 프레임당 약 100ms). 같은 원본 조각·크기·색이면
// 윤곽을 한 번만 만들어 두고 그림처럼 찍는다. 표시 전용이며 판정·좌표와 무관하다.
const OUTLINED_SPRITE_CACHE_LIMIT = 192;
const outlinedSpriteCache = new Map();
const outlinedSpriteImageIds = new WeakMap();
let outlinedSpriteNextImageId = 1;

function getOutlinedSpriteSurface(sourceImage, src, size, outline) {
    let imageId = outlinedSpriteImageIds.get(sourceImage);
    if (!imageId) { imageId = outlinedSpriteNextImageId++; outlinedSpriteImageIds.set(sourceImage, imageId); }
    const key = [imageId, src.x, src.y, src.w, src.h, size.w, size.h, outline.color, outline.thickness, outline.smooth, outline.fill].join('|');
    const cached = outlinedSpriteCache.get(key);
    if (cached) {
        outlinedSpriteCache.delete(key);
        outlinedSpriteCache.set(key, cached);
        return cached;
    }
    const surface = createOutlinedSpriteSurface(sourceImage, src, size, outline);
    if (!surface) return null;
    outlinedSpriteCache.set(key, surface);
    if (outlinedSpriteCache.size > OUTLINED_SPRITE_CACHE_LIMIT) outlinedSpriteCache.delete(outlinedSpriteCache.keys().next().value);
    return surface;
}

function createOutlinedSpriteSurface(sourceImage, src, size, outline) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const t = outline.thickness, color = outline.color;
    const canvas = document.createElement('canvas');
    canvas.width = size.w + t * 2;
    canvas.height = size.h + t * 2;
    const c = canvas.getContext && canvas.getContext('2d');
    if (!c) return null;
    c.imageSmoothingEnabled = outline.smooth;
    if (!outline.fill) c.filter = `drop-shadow(0 ${t}px 0 ${color}) drop-shadow(0 ${-t}px 0 ${color}) drop-shadow(${t}px 0 0 ${color}) drop-shadow(${-t}px 0 0 ${color})`;
    c.drawImage(sourceImage, src.x, src.y, src.w, src.h, t, t, size.w, size.h);
    if (outline.fill) {
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = color;
        c.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
}

/** Source/destination rectangles are [x, y, width, height]. Cache a native-size silhouette, never a full-canvas filter.
 * A short cream flash remains readable even on dark sprites; alpha and transparent pixels remain intact. */
function drawBattleSpriteImage(ctx, image, source, box, flash) {
    ctx.drawImage(image, ...source, ...box);
    if (!(flash > 0)) return;
    const [x, y, w, h] = source;
    const surface = getOutlinedSpriteSurface(image, { x, y, w, h }, { w, h },
        { color: '#fff4df', thickness: 0, smooth: false, fill: true });
    if (!surface) return;
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha *= Math.min(1, Number(flash));
    ctx.drawImage(surface, ...box);
    ctx.restore();
}

// 윤곽 패스: 캐시한 윤곽 그림을 (x, y) 기준으로 찍는다. 원래처럼 윤곽 알파로 그린 뒤 본 그림을 위에 덧그린다.
function drawBattleSpriteOutline(ctx, sourceImage, src, box, options) {
    const thickness = Math.max(1, Math.round(options.outlineThickness || 1));
    const surface = getOutlinedSpriteSurface(sourceImage, src, { w: box.w, h: box.h },
        { color: options.outlineColor, thickness, smooth: ctx.imageSmoothingEnabled !== false });
    if (!surface) return;
    ctx.globalAlpha = (options.alpha === undefined ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
    ctx.drawImage(surface, box.x - thickness, box.y - thickness, box.w + thickness * 2, box.h + thickness * 2);
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
}

function drawBattleSprite(ctx, image, rect, x, y, desiredHeight, options) {
    if (!rect) return;
    options = options || {};
    let sourceImage = rect.image || image;
    if (!sourceImage) return;
    let basisHeight = options.basisHeight || rect.basisHeight || rect.height;
    let scale = desiredHeight / basisHeight;
    let cropLeft = Math.max(0, Math.round(options.cropLeft === undefined ? (rect.cropLeft || 0) : options.cropLeft));
    let cropRight = Math.max(0, Math.round(options.cropRight === undefined ? (rect.cropRight || 0) : options.cropRight));
    let cropTop = Math.max(0, Math.round(options.cropTop === undefined ? (rect.cropTop || 0) : options.cropTop));
    let cropBottom = Math.max(0, Math.round(options.cropBottom === undefined ? (rect.cropBottom || 0) : options.cropBottom));
    let srcX = rect.x + cropLeft;
    let srcY = rect.y + cropTop;
    let srcW = Math.max(1, rect.width - cropLeft - cropRight);
    let srcH = Math.max(1, rect.height - cropTop - cropBottom);
    let drawWidth = Math.max(1, Math.round(srcW * scale));
    let drawHeight = Math.max(1, Math.round(srcH * scale));
    let rawAnchorX = Number.isFinite(options.anchorX) ? options.anchorX : (Number.isFinite(rect.anchorX) ? rect.anchorX : rect.width / 2);
    let rawAnchorY = Number.isFinite(options.anchorY) ? options.anchorY : (Number.isFinite(rect.anchorY) ? rect.anchorY : rect.height);
    let sourceAnchorX = clampNumber(rawAnchorX - cropLeft, 0, srcW);
    let sourceAnchorY = clampNumber(rawAnchorY - cropTop, 0, srcH);
    let drawOffsetX = Number(options.offsetX !== undefined ? options.offsetX : rect.offsetX) || 0;
    let drawOffsetY = Number(options.offsetY !== undefined ? options.offsetY : rect.offsetY) || 0;
    let dx = Math.round(x - sourceAnchorX * scale + drawOffsetX);
    let dy = Math.round(y - sourceAnchorY * scale + drawOffsetY);
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx,options.alpha);
    if (options.smoothing === 'high') {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    } else if (options.smoothing === 'pixel') {
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
    }
    if (options.rotation) {
        ctx.translate(Math.round(x + (options.offsetX || 0)), Math.round(y - drawHeight / 2 + (options.offsetY || 0)));
        ctx.rotate(options.rotation);
        if (options.outlineColor) drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: Math.round(-drawWidth / 2), y: Math.round(-drawHeight / 2), w: drawWidth, h: drawHeight }, options);
        drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight], options.flash);
    } else {
        if (options.devicePixelSnap === true) {
            let snappedRect = snapCanvasRectToDevicePixels(ctx, dx, dy, drawWidth, drawHeight);
            dx = snappedRect.x;
            dy = snappedRect.y;
            drawWidth = snappedRect.width;
            drawHeight = snappedRect.height;
        }
        if (options.flipX) {
            let centerX = dx + drawWidth / 2;
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
        if (options.outlineColor) drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: dx, y: dy, w: drawWidth, h: drawHeight }, options);
        drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [dx, dy, drawWidth, drawHeight], options.flash);
    }
    ctx.restore();
}
