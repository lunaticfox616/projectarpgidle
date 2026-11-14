import { createAttackImpactRenderer } from './rendering/attack-impact/engine.mjs';

// Development overrides are captured once except the live enable switch, as before.
const impacts = createAttackImpactRenderer({
    opacity: Number.isFinite(Number(window.__attackFxOpacity))
        ? Math.max(0.2, Math.min(1, Number(window.__attackFxOpacity))) : 0.72,
    maxSpawnsPerFrame: Number.isFinite(Number(window.__attackFxMaxSpawnsPerFrame))
        ? Math.max(1, Math.floor(Number(window.__attackFxMaxSpawnsPerFrame))) : 3,
    particleScale: Number.isFinite(Number(window.__attackFxParticleScale))
        ? Math.max(0.3, Math.min(1, Number(window.__attackFxParticleScale))) : 0.64,
    enabled: () => window.__attackFxEnabled !== false
});
window.GameModules.attackImpactRenderer = impacts;
safeExposeGlobals({ attackFxSpawn: impacts.spawn, attackFxUpdate: impacts.update,
    attackFxDraw: impacts.draw, attackFxClear: impacts.clear });
