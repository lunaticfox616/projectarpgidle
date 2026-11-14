import { clampNumber } from '../common/numbers.mjs';
import { getBattleActorDrawAlpha } from './battle-sprite-alpha.mjs';
import { notePlayerMotionFx, getHanaSwingTiming, getHeroRunRate } from './player-figure-timing.mjs';
const HANA_THROWN_FLASK_GEMS = new Set([44, 47, 48, 49]);

class PlayerFigureRenderer {
    constructor(deps) { this.deps = deps; }

    /** The stance the stage hero holds: the worn weapon's (settings.stageStance forces one from the test panel). */
    getStageHeroStance() {
        return this.deps.stance();
    }

    /** The side-view stage draws its own hero (js/canvas-stage-actors.js) once the worn class × stance sheets have loaded. */
    canDrawStagePlayer() {
        return this.deps.actors.isReady(this.deps.appearance(), this.getStageHeroStance());
    }

    /** The hero's head top drawn this frame (null: the stage hero was not drawn). */
    getHeroHeadY(now) {
        return this.deps.actors.headY(now) ?? null;
    }

    /** Legacy strips face east and are mirrored for west poses; stage and monster sheets turn by themselves. */
    isBattlePlayerMirrored(motion) {
        if (this.canDrawStagePlayer()) return false;
        let pose = motion.facingDirection || motion.attackDirection || 'east';
        return motion.advanceBlend <= 0.08 && pose === 'west';
    }

    drawBattlePlayerFigure(ctx, state, position) {
        if (this.canDrawStagePlayer() && this.drawStagePlayerBody(ctx, state, position)) return;
        this.drawLegacyPlayerBody(ctx, state, position);
    }

    /** 이 휘두름의 룬이 무대 주인공에게 정하는 것: 주문이면 시전, 던지는 플라스크면 던지기, 룬의 동작(전달본의 동작 표).
     * 휘두름에 적힌 룬을 따른다(이동 칸의 룬을 쓰는 동안에는 주 룬이 아니다). */
    getStageHeroSwingLook(timing, stance) {
        const name = (timing.attack && timing.attack.skillName) || this.deps.activeSkill(), skill = this.deps.skills[name] || {};
        return { spell: (skill.tags || []).includes('spell'), throwsWeapon: stance === 'flask' && HANA_THROWN_FLASK_GEMS.has(this.deps.atlas[name]?.id),
            motion: this.deps.stageView.poseMotions[timing.attack && timing.attack.pose] || this.deps.actors.motionFor(name, this.deps.appearance(), stance) };
    }

    /** 몸이 뜨는 이동 룬(도약 강타, 섬머솔트 슬래시) 동안의 몸 그림: 포물선 높이만큼 띄우고, 공중제비는 몸 가운데를 축으로 돌린다
     * (battleVisualState.playerAir, js/canvas-battlefield.js getStageHeroAirGround). 2026-10-17 사용자가 시뮬레이터처럼 이 두 룬만 그림을 움직이게 했다.
     * drawHeroBodyAt(y)는 발의 y로 몸을 그린다. */
    drawStageHeroAloft(ctx, position, tile, drawHeroBodyAt) {
        const air = this.deps.playerAir();
        if (!air) return drawHeroBodyAt(position.y);
        const dot = this.deps.actors.scaleFor(tile), y = position.y - air.lift * dot, centre = y - 56 * dot;   // 몸 가운데(새 주인공은 키 약 110도트)
        ctx.save();
        ctx.translate(position.x, centre); ctx.rotate(air.rot); ctx.translate(-position.x, -centre);
        try { return drawHeroBodyAt(y); } finally { ctx.restore(); }
    }

    /** The stage hero: timing from the battle effects; spells play the cast clips, a thrown flask the throw. */
    drawStagePlayerBody(ctx, state, position) {
        const motion = state.motionState, stance = this.getStageHeroStance();
        const previous = ctx.battleActorAlpha;
        ctx.battleActorAlpha = state.actorAlpha;
        // 무대의 주인공은 휘두르는 동안에도 보는 쪽(facingDirection: 걷는 쪽, 치는 쪽. js/canvas-battlefield.js resolveStageStrikeSide)을 본다.
        // 휘두름에 따로 적힌 방향(주 스킬의 첫 대상 쪽)을 따르면, 이동기로 건너가 뒤를 베는 동안 다른 적을 겨냥한 쪽으로 돌아섰다.
        const facing = motion.facingDirection || motion.attackDirection || 'east', timing = this.collectHanaPlayerMotion(motion, state.now);
        if (timing.attack) timing.attack = { ...timing.attack, direction: facing };
        try {
            return this.drawStageHeroAloft(ctx, position, state.gridProj.tileW, y => this.deps.actors.drawPlayer(ctx, position.x, y, {
                ...timing, ...this.getStageHeroSwingLook(timing, stance), classId: this.deps.appearance(), stance, tile: state.gridProj.tileW,
                facing,
                moving: motion.advanceBlend > 0.08, moveDirection: motion.moveDirection,
                alpha: getBattleActorDrawAlpha(ctx, 1)
            }, state.now));
        } finally { ctx.battleActorAlpha = previous; }
    }

    /** Timing the hero sprites need. An attack clip outlives the swing's windup (duration): the record stays tailMs longer for that
     * (js/passives.js cleanupBattleFx), so the frames after the hit still find it. */
    collectHanaPlayerMotion(motion, now) {
        let found = { swing: null, hit: null, down: null };
        const effects = this.deps.effects();
        for (let index = effects.length - 1; index >= 0; index--) {
            let fx = effects[index];
            if (fx && fx.start <= now) notePlayerMotionFx(found, fx, now);
        }
        let stats = motion.playerStats || {};
        let move = Number(stats.moveSpeed || stats.move) || 100;
        return {
            attack: getHanaSwingTiming(found.swing, motion.attackDirection),
            hurtAt: found.hit ? found.hit.start : null,
            downProgress: found.down ? clampNumber((now - found.down.start) / Math.max(1, found.down.duration), 0, 1) : null,
            running: move >= 90,
            moveRate: getHeroRunRate(move, this.deps.runMotion(), this.deps.moveIntervalSec, this.deps.maxRunRate)
        };
    }

    drawLegacyPlayerBody(ctx,state,position) {
        const previous=ctx.battleActorAlpha;
        ctx.battleActorAlpha=state.actorAlpha;
        try {
            this.deps.drawLegacyHero(ctx, { x: position.x, y: position.y, scale: 2.15*state.gridUnitScale,
                flash: state.playerFlash, swingPower: state.swingPower, skillVisual: state.currentSkillVisual,
                now: state.now, motion: state.motionState });
        } finally {ctx.battleActorAlpha=previous;}
    }
}

export function createPlayerFigureRenderer(deps) {
    const owner = new PlayerFigureRenderer(deps);
    return Object.freeze({
        getStageHeroStance: owner.getStageHeroStance.bind(owner),
        canDrawStagePlayer: owner.canDrawStagePlayer.bind(owner),
        getHeroHeadY: owner.getHeroHeadY.bind(owner),
        isBattlePlayerMirrored: owner.isBattlePlayerMirrored.bind(owner),
        drawBattlePlayerFigure: owner.drawBattlePlayerFigure.bind(owner),
        drawStageHeroAloft: owner.drawStageHeroAloft.bind(owner)
    });
}
