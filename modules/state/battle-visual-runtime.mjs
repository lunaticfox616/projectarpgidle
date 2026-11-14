/** Ephemeral canvas state; never serialized. Every consumer reads the current scene after reset. */
export function createBattleVisualState() {
    return {
        projectiles: [],
        damageTexts: [],
        skillEffects: [],
        skillPlayback: null,
        lastAutoSwingId: 0,
        lastAutoSkillAt: 0,
        processedFxIds: new Set(),
        enemyGhostPos: {},
        enemySmoothPos: {},
        playerFacingDirection: 'east',
        playerPos: null,
        playerGridMotion: null,
        playerAttackBlend: 0,
        playerAttackMotionSeed: 0,
        playerHurtBlend: 0,
        playerDownBlend: 0,
        lastNow: 0,
        visualNow: 0,
        lastWallNow: 0,
        frameTimeEma: 16.7,
        vfxDensity: 1,
        hitStopRemainingMs: 0,
        nextHitStopAt: 0,
        enemyHitPulses: new Map(), // Last accepted body flash per enemy, visual ms; never saved.
        lastHitStopFxId: 0
    };
}

export class BattleVisualRuntime {
    constructor() {
        this.suppressed = false;
        this.swingTailMs = null;
        this.reset();
    }

    reset() {
        this.fx = [];
        this.fxId = 0;
        this.latestSwingImpactAt = 0;
        this.scene = createBattleVisualState();
    }
}
