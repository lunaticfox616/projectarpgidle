import { buildWispEnemyVariants, buildEnemyTransparentImage } from './battle-enemy-atlas.mjs';
import { createLegacyAtlasParts } from '../data/legacy-hero-frames.mjs';
import { hasUsableFrame, isNearSize, buildScaledHeroParts } from './hero-frame-layout.mjs';
import { buildHeroFrameSetFromStripKeys } from './hero-strip-frames.mjs';
import { buildHeroFrameSetFromDetectedRows, buildHeroFrameSet, buildHeroFrameSetBattleHero1 } from './hero-frame-sets.mjs';

export function buildBattleAssetAtlas(inputs) {
    const { heroParts, heroPartsV2, enemyParts, tileParts } = createLegacyAtlasParts();
    const legacyHeroImage = inputs.battleAssets.images.heroLegacy;
    let heroFramesLegacy = legacyHeroImage ? heroParts.map(part => inputs.trimRectToContent(legacyHeroImage, part, 3)) : [];
    let heroFramesV2 = legacyHeroImage ? heroPartsV2.map(part => inputs.trimRectToContent(legacyHeroImage, part, 3)) : [];

    let { selectedHeroDef, heroFrameSetSource, heroFrameSet } = selectBattleHeroFrames(inputs, heroFramesLegacy, legacyHeroImage, heroFramesV2);
    const enemySpriteImage = buildEnemyTransparentImage(inputs, inputs.battleAssets.images.enemies);
    const enemyFrames = Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, inputs.trimRectToContent(enemySpriteImage, part, key === 'boss' ? 5 : 3)]));
    // The frames are measured once; drop the pixel-reading copy of the atlas (another full decode).
    inputs.battleImageCanvasCache.delete(enemySpriteImage);
    const wispEnemyVariants = buildWispEnemyVariants(inputs, inputs.battleAssets.images);

    let { enemyVariantPools, bossImages } = createEnemyAtlasPools(wispEnemyVariants, enemySpriteImage, enemyFrames, inputs);
    const tileImage = inputs.battleAssets.images.tiles || null;
    const tileFrames = tileImage ? tileParts.map(part => inputs.trimRectToContent(tileImage, part, 2)) : [];
    return describeBattleAtlas({ inputs, heroFrameSetSource, legacyHeroImage, selectedHeroDef, heroFrameSet, enemySpriteImage, enemyVariantPools, bossImages, enemyFrames, tileImage, tileFrames });
}

export function resolveHeroImageForFrameSet(inputs, heroFrameSetSource, legacyHeroImage, selectedHeroDef) {
    if (heroFrameSetSource === 'legacy') return legacyHeroImage;
    let sourceDef = inputs.getHeroSelectionDef(heroFrameSetSource) || selectedHeroDef || inputs.PLAYER_CLASS_DEFS.archer;
    let strips = (sourceDef && sourceDef.strips) || {};
    return selectLoadedHeroImage(inputs, strips, legacyHeroImage);
}

function selectBattleHeroFrames(inputs, heroFramesLegacy, legacyHeroImage, heroFramesV2) {
    let selectedHeroDef = inputs.getHeroSelectionDef(typeof inputs.getHeroAppearanceId === 'function' ? inputs.getHeroAppearanceId() : inputs.game.selectedHeroId);

    let heroFrameSetSource = selectedHeroDef.id;
    let heroFrameSet = buildHeroFrameSetFromStripKeys(inputs, selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== 'archer') {
        heroFrameSet = buildHeroFrameSetFromStripKeys(inputs, inputs.PLAYER_CLASS_DEFS.archer.strips, 'archer');
        if (heroFrameSet) heroFrameSetSource = 'archer';
    }
    if (!heroFrameSet && heroFramesLegacy.length > 0) {
        heroFrameSet = buildHeroFrameSet(heroFramesLegacy);
        heroFrameSetSource = 'legacy';
    }
    // v2 하드 매핑 + 어떤 해상도든 커스텀/비표준 시트는 스케일/감지 fallback을 탄다.
    ({ heroFrameSet } = selectLegacyHeroFrames(heroFrameSet, legacyHeroImage, inputs, heroFramesV2));
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
    return { selectedHeroDef, heroFrameSetSource, heroFrameSet };
}

function createEnemyAtlasPools(wispEnemyVariants, enemySpriteImage, enemyFrames, inputs) {
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
    // Original transparent sheets supply the fallback pools above.
    const bossImages = {};
    if (typeof inputs.BOSS_ASSET_MANIFEST !== 'undefined') {
        Object.keys(inputs.BOSS_ASSET_MANIFEST).forEach(key => {
            if (inputs.battleAssets.images[key]) bossImages[key] = inputs.battleAssets.images[key];
        });
    }
    return { enemyVariantPools, bossImages };
}

function describeBattleAtlas({ inputs, heroFrameSetSource, legacyHeroImage, selectedHeroDef, heroFrameSet, enemySpriteImage, enemyVariantPools, bossImages, enemyFrames, tileImage, tileFrames }) {
    return {
        hero: {
            image: resolveHeroImageForFrameSet(inputs, heroFrameSetSource, legacyHeroImage, selectedHeroDef),
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
                grass: readAtlasTile(tileFrames, 0),
                grassDeep: readAtlasTile(tileFrames, 1),
                moss: readAtlasTile(tileFrames, 2),
                stone: readAtlasTile(tileFrames, 3),
                dirt: readAtlasTile(tileFrames, 4),
                dirtWarm: readAtlasTile(tileFrames, 5),
                grassBright: readAtlasTile(tileFrames, 6),
                swamp: readAtlasTile(tileFrames, 7),
                ruin: readAtlasTile(tileFrames, 8),
                frost: readAtlasTile(tileFrames, 9),
                lava: readAtlasTile(tileFrames, 10),
                chest: readAtlasTile(tileFrames, 11),
                roots: readAtlasTile(tileFrames, 12),
                abyss: readAtlasTile(tileFrames, 13),
                temple: readAtlasTile(tileFrames, 14),
                templeAlt: readAtlasTile(tileFrames, 15)
            }
        }
    };
}

function selectLoadedHeroImage(inputs, strips, legacyHeroImage) { return selectClassHeroImage(inputs, strips)
        || inputs.battleAssets.images.hero1Idle
        || inputs.battleAssets.images.hero1Walk
        || inputs.battleAssets.images.hero1Attack
        || inputs.battleAssets.images.hero1Hurt
        || inputs.battleAssets.images.hero1Death
        || legacyHeroImage; }

function selectClassHeroImage(inputs, strips) { return inputs.battleAssets.images[strips.idle]
        || inputs.battleAssets.images[strips.walk]
        || inputs.battleAssets.images[strips.attack]
        || inputs.battleAssets.images[strips.hurt]
        || inputs.battleAssets.images[strips.death]; }

function detectCustomHeroFrames(legacyHeroImage, inputs, heroFrameSet) {
    let scaledParts = buildScaledHeroParts(legacyHeroImage);
    let scaledFrames = scaledParts.map(part => inputs.trimRectToContent(legacyHeroImage, part, 3));
    let scaledUsableCount = scaledFrames.filter(hasUsableFrame).length;
    if (scaledUsableCount >= 5) heroFrameSet = buildHeroFrameSet(scaledFrames);
    let detectedCustom = buildHeroFrameSetFromDetectedRows(inputs, legacyHeroImage);
    if (detectedCustom) heroFrameSet = detectedCustom;
    return { heroFrameSet };
}

function selectLegacyHeroFrames(heroFrameSet, legacyHeroImage, inputs, heroFramesV2) {
    if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1448, 1086, 0.05)) {
        heroFrameSet = buildHeroFrameSetBattleHero1(inputs, legacyHeroImage);
    } else if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1264, 842, 0.05)) {
        heroFrameSet = buildHeroFrameSet(heroFramesV2);
        let detectedV2 = buildHeroFrameSetFromDetectedRows(inputs, legacyHeroImage);
        if (detectedV2) heroFrameSet = detectedV2;
    } else if (!heroFrameSet && legacyHeroImage) {
        ({ heroFrameSet } = detectCustomHeroFrames(legacyHeroImage, inputs, heroFrameSet));

    }
    return { heroFrameSet };
}

function readAtlasTile(tileFrames, index) { return tileFrames[index] || null; }
