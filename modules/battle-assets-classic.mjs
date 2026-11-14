import { BattleSpriteContent } from './browser/battle-sprite-content.mjs';
import { isLocalFileProtocol as nativeIsLocalFileProtocol, getCustomHeroSheetDataUrl as nativeGetCustomHeroSheetDataUrl } from './browser/battle-image-environment.mjs';
import { sanitizeBattleSheet as nativeSanitizeBattleSheet } from './browser/battle-sheet-matte.mjs';
import { sanitizeWhiteBackdropSheet as nativeSanitizeWhiteBackdropSheet } from './browser/battle-white-matte.mjs';
import { sanitizeLocalMonsterBackdropSheet as nativeSanitizeLocalMonsterBackdropSheet } from './browser/battle-monster-matte.mjs';
import { buildWispEnemyVariants as nativeBuildWispEnemyVariants } from './rendering/battle-enemy-atlas.mjs';
import { buildBattleAssetAtlas as nativeBuildBattleAssetAtlas } from './rendering/battle-atlas.mjs';
import { getBattleActorDrawAlpha } from './rendering/battle-sprite-alpha.mjs';
import { shouldPreserveOriginalBattleSheet, cleanLoadedBattleSheet as nativeCleanLoadedBattleSheet } from './browser/battle-sheet-policy.mjs';
import { BattleSpritePainter } from './rendering/battle-sprite-painter.mjs';

const spriteContent = new BattleSpriteContent({ document, console });
const inputs = {
    get BOSS_ASSET_MANIFEST() { return typeof BOSS_ASSET_MANIFEST !== 'undefined' ? BOSS_ASSET_MANIFEST : undefined; },
    get ENABLE_BATTLE_SHEET_SANITIZATION() { return true; },
    get PLAYER_CLASS_DEFS() { return typeof PLAYER_CLASS_DEFS !== 'undefined' ? PLAYER_CLASS_DEFS : undefined; },
    get WISP_MONSTER_VISUALS() { return typeof WISP_MONSTER_VISUALS !== 'undefined' ? WISP_MONSTER_VISUALS : undefined; },
    get battleAssets() { return assets; },
    get battleImageCanvasCache() { return spriteContent.cache; },
    get clampNumber() { return clampNumber; },
    get document() { return typeof document !== 'undefined' ? document : undefined; },
    get game() { return game; },
    get getHeroAppearanceId() { return typeof getHeroAppearanceId !== 'undefined' ? getHeroAppearanceId : undefined; },
    get getHeroSelectionDef() { return getHeroSelectionDef; },
    get localStorage() { return localStorage; },
    get snapCanvasRectToDevicePixels() { return snapCanvasRectToDevicePixels; },
    trimRectToContent: (...args) => spriteContent.trimRectToContent(...args),
    get window() { return typeof window !== 'undefined' ? window : undefined; },
};
const isLocalFileProtocol = nativeIsLocalFileProtocol.bind(undefined, inputs);
const sanitizeBattleSheet = nativeSanitizeBattleSheet.bind(undefined, inputs);
const sanitizeWhiteBackdropSheet = nativeSanitizeWhiteBackdropSheet.bind(undefined, inputs);
const sanitizeLocalMonsterBackdropSheet = nativeSanitizeLocalMonsterBackdropSheet.bind(undefined, inputs);
const buildWispEnemyVariants = nativeBuildWispEnemyVariants.bind(undefined, inputs);
const buildBattleAssetAtlas = nativeBuildBattleAssetAtlas.bind(undefined, inputs);
const getCustomHeroSheetDataUrl = nativeGetCustomHeroSheetDataUrl.bind(undefined, inputs);
const cleanLoadedBattleSheet = nativeCleanLoadedBattleSheet.bind(undefined, inputs);
const painter = new BattleSpritePainter(inputs);
const drawBattleSpriteImage = painter.drawBattleSpriteImage.bind(painter);
const drawBattleSpriteOutline = painter.drawBattleSpriteOutline.bind(painter);
const drawBattleSprite = (...args) => painter.drawBattleSprite(args);

import { createBattleAssetStartup } from './browser/battle-asset-startup.mjs';
import { createBattleImageManifest } from './browser/battle-image-manifest.mjs';

// Classic names remain until the last rendering consumers use the application composition root.
function selectedHeroDefinition() {
    const selected = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId()
        : ((game && PLAYER_CLASS_DEFS[game.selectedClassId]) ? game.selectedClassId : 'archer');
    return typeof getHeroSelectionDef === 'function' ? getHeroSelectionDef(selected) : (PLAYER_CLASS_DEFS[selected] || PLAYER_CLASS_DEFS.archer);
}
function reportImageProgress({ loaded, total }) {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('loading-overlay');
    if (!overlay || !overlay.classList.contains('active') || typeof advanceLoadingOverlay !== 'function') return;
    advanceLoadingOverlay({ progress: Math.floor(58 + (total > 0 ? loaded / total : 1) * 34),
        detail: _t('그림 불러오는 중 ({loaded}/{totalAssets})', { loaded, totalAssets: total }), caption: _t('전투 그림 준비') });
}
const loader = createBattleAssetStartup({
    manifest: () => createBattleImageManifest({
        customHeroSrc: getCustomHeroSheetDataUrl(), areaVfx: SKILL_AREA_VFX_ASSETS,
        bossAssets: typeof BOSS_ASSET_MANIFEST !== 'undefined' && BOSS_ASSET_MANIFEST || {},
        passiveNodes: typeof PASSIVE_TREE_V22 !== 'undefined' && PASSIVE_TREE_V22.nodes || {}
    }),
    hero: selectedHeroDefinition, activeSkill: () => game.activeSkill,
    skillSheets: { profiles: SKILL_GEM_VFX_PROFILES, signatures: SKILL_SIGNATURE_SPRITES }
}, {
    images: {
        createImage: () => new Image(), protocol: () => isLocalFileProtocol() ? 'file:' : 'http:', now: () => Date.now(),
        schedule: (fn, ms) => setTimeout(fn, ms), cancel: id => clearTimeout(id), warn: (...args) => console.warn(...args)
    },
    maxParallel: () => Math.max(4, Math.min(8, Number((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 6) || 6)),
    idleStartup: () => startupOverlayActive && !document.body.classList.contains('loading-active'),
    clean: (key, image) => shouldPreserveOriginalBattleSheet(key) ? image : cleanLoadedBattleSheet(key, image),
    buildAtlas: () => buildBattleAssetAtlas(), ready: () => renderBattlefield(), progress: reportImageProgress,
    warn: (...args) => console.warn(...args), error: (...args) => console.error(...args)
});
export const assets = loader.state;
export const initBattleAssets = loader.start;
initBattleAssets.dispose = () => { loader.dispose(); painter.dispose(); };

Object.assign(globalThis, { battleAssets: assets });
safeExposeGlobals({ battleAssets: assets });
exposeFileGlobals({ isLocalFileProtocol, initBattleAssets, sanitizeBattleSheet, sanitizeWhiteBackdropSheet, sanitizeLocalMonsterBackdropSheet, buildWispEnemyVariants, buildBattleAssetAtlas, getBattleActorDrawAlpha, drawBattleSpriteImage, drawBattleSpriteOutline, drawBattleSprite });
