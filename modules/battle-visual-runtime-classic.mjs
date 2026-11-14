import { HeroMotionPlayback } from './rendering/hero-motion-playback.mjs';
import { getSpriteFrameRectByIndex, getHeroFrameMeta, getHeroDrawMetrics } from './rendering/hero-frame-metrics.mjs';
import { DamageTextQueue } from './rendering/damage-text-queue.mjs';
import { DamageTextRenderer } from './rendering/damage-text-renderer.mjs';
import { drawVisualProjectile } from './rendering/visual-projectile.mjs';
import { BattleVisualRuntime } from './state/battle-visual-runtime.mjs';
import { BattleEffectQueue } from './rendering/battle-effect-queue.mjs';
import { getBattleFeedbackProfile } from './rendering/battle-hit-feedback.mjs';

const runtime = new BattleVisualRuntime();
const queue = new BattleEffectQueue({
    get game() { return window.GameModules.state.game; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get performance() { return performance; },
    get STAGE_CHARACTERS() { return typeof STAGE_CHARACTERS === 'undefined' ? undefined : STAGE_CHARACTERS; },
    get STAGE_STORY_ART() { return STAGE_STORY_ART; }
}, runtime);
const damageQueue = new DamageTextQueue({ get performance() { return performance; } }, runtime);
const damageRenderer = new DamageTextRenderer({
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get damageNumberFormat() { return window.GameModules.state.game?.settings?.damageNumberFormat; },
    translate: (...args) => _t(...args),
    get drawCrispCanvasText() { return drawCrispCanvasText; }
}, runtime);
const spawnDamageText = Object.assign(damageQueue.spawnDamageText.bind(damageQueue), { fromHit: damageQueue.fromHit.bind(damageQueue) });
const drawDamageTexts = damageRenderer.render.bind(damageRenderer);
const heroMotion = new HeroMotionPlayback({
    get performance() { return performance; },
    get SKILL_DB() { return SKILL_DB; },
    get SKILL_GEM_VFX_PROFILES() { return SKILL_GEM_VFX_PROFILES; }
}, runtime);
const getSkillPlaybackState = heroMotion.getSkillPlaybackState.bind(heroMotion);
const playSkillFromActiveGem = heroMotion.playSkillFromActiveGem.bind(heroMotion);
window.GameModules.battleVisuals = Object.freeze({ runtime, dispose() { queue.dispose(); damageRenderer.dispose(); } });

// Retire these live aliases when the last classic consumer reads the composition instance.
safeExposeGlobals({ battleFx: runtime.fx, battleVisualState: runtime.scene, battleFxSuppressed: runtime.suppressed });
const accessors = {
    battleFx: { configurable: true, get() { return runtime.fx; }, set(value) { runtime.fx = value; } },
    battleVisualState: { configurable: true, get() { return runtime.scene; }, set(value) { runtime.scene = value; } },
    battleFxSuppressed: { configurable: true, get() { return runtime.suppressed; }, set(value) { runtime.suppressed = value; } }
};
Object.defineProperties(window, accessors);
if (globalThis !== window) Object.defineProperties(globalThis, accessors);
const addBattleFx = queue.addBattleFx.bind(queue);
const getBattleSpawnStamp = queue.getBattleSpawnStamp.bind(queue);
const clearBattleVisualBacklog = queue.clearBattleVisualBacklog.bind(queue);
const setBattleFxSuppressed = queue.setBattleFxSuppressed.bind(queue);
const cleanupBattleFx = queue.cleanupBattleFx.bind(queue);
const cleanupBattleVisualState = queue.cleanupBattleVisualState.bind(queue);
exposeFileGlobals({ getSpriteFrameRectByIndex, getHeroFrameMeta, getHeroDrawMetrics, getSkillPlaybackState, playSkillFromActiveGem, spawnDamageText, drawDamageTexts, drawVisualProjectile, addBattleFx, getBattleSpawnStamp, clearBattleVisualBacklog, setBattleFxSuppressed, cleanupBattleFx, cleanupBattleVisualState, getBattleFeedbackProfile });
