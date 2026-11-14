export const BATTLE_FX_QUEUE_CAP = 160;

export const BATTLE_FEEDBACK_PROFILES = Object.freeze({
    normal: Object.freeze({ hitStopMs: 0, shake: 0, duration: 110 }),
    crit: Object.freeze({ hitStopMs: 0, shake: 3, duration: 170 }),
    heavy: Object.freeze({ hitStopMs: 28, shake: 5.4, duration: 220 }),
    annihilate: Object.freeze({ hitStopMs: 20, shake: 4.2, duration: 180 }),
    // 보스 범위기가 땅에 닿는 순간(2026-10-06, js/canvas-boss-attacks.js): 피했어도 화면이 울린다. 맞으면 playerHit가 더한다.
    bossSlam: Object.freeze({ hitStopMs: 0, shake: 4.6, duration: 320 })
});

export const PLAYER_HURT_FEEDBACK = Object.freeze({ shakeMin: 0.8, shakePerLife: 16, shakeMax: 5, heavyRatio: 0.125, hitStopMs: 45, duration: 240 });
