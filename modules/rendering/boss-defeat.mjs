// 보스 처치 연출(2026-11-19 연출 보강): 보스가 쓰러지는 enemyDeath(보스 1600 ms, 되살아나는 이야기 보스는 그 길이) 안에서만 흐른다.
// 쓰러지는 순간 화면이 하얗게 한 번 번쩍이고, 발밑에서 속성 색 충격파 둘이 바닥을 따라 퍼진다. 방은 어두워지고(보스와 주인공은
// 입장 연출과 같은 층으로 밝게 남는다) 위아래에 띠가 닫혀 든다. 죽는 모습 위로 속성 색 빛 알갱이가 오른다.
// 그림만 그린다: 싸움, 보상, 보상 창이 열리는 때는 바꾸지 않는다. 효과 줄이기에서는 하나도 그리지 않는다.
import { ease, share } from './entrance-timing.mjs';
import { floorRing, letterbox } from './cinema-frame.mjs';

const DEFEAT = Object.freeze({
    dim: 0.45, dimInMs: 200, dimOutFrom: 0.7,
    flash: Object.freeze({ alpha: 0.28, ms: 260 }),
    rings: Object.freeze({ cells: 2.2, ms: 700, gapMs: 140, flat: 0.36, alpha: 0.85 }),
    bars: Object.freeze({ share: 0.06, inMs: 200, outMs: 300, fill: '#050403' })
});

export class BossDefeat {
    /** deps: battleFx, battleVisualState (enemyGhostPos), uiDisplay; motes(ctx, at, o, half, fade) from the entrance. */
    constructor(deps, motes) { this.deps = deps; this.drawMotes = motes; }

    shown() { return this.deps.uiDisplay.richPresentation() && !this.deps.uiDisplay.reducedEffects(); }

    /** The boss death playing now (the latest), or null. */
    active(now) {
        if (!this.shown()) return null;
        let found = null;
        for (const fx of this.deps.battleFx) if (fx && fx.type === 'enemyDeath' && fx.boss && now >= fx.start && now - fx.start <= fx.duration) found = fx;
        return found;
    }

    /** 0..1: in over dimInMs, out over the last 30%. */
    weight(fx, now) {
        const t = now - fx.start, out = t > fx.duration * DEFEAT.dimOutFrom ? 1 - share(t, fx.duration * DEFEAT.dimOutFrom, fx.duration) : 1;
        return Math.min(ease(t / DEFEAT.dimInMs), out);
    }

    /** How dark the room is (scenery drawn with brightness 1 - dim). */
    sceneryDim(now) {
        const fx = this.active(now);
        return fx ? this.weight(fx, now) * DEFEAT.dim : 0;
    }

    feet(fx) { return this.deps.battleVisualState.enemyGhostPos[fx.enemyId] || null; }

    /** Under the actors: the room dims, then two shock rings run out from the boss's feet. under: how dark a boss entrance playing
     * at the same time already made the floor; only the darkness beyond it is added, so the two never stack. */
    drawGround(ctx, state, under) {
        const fx = this.active(state.now), at = fx && this.feet(fx);
        if (!at) return;
        const tile = state.gridProj.tileW;
        ctx.save();
        ctx.globalAlpha = Math.max(0, (this.weight(fx, state.now) * DEFEAT.dim - under) / (1 - under));
        ctx.fillStyle = '#040302';
        ctx.fillRect(-4000, -4000, 8000, 8000);
        const rule = DEFEAT.rings, dot = Math.max(1, Math.round(tile / 32));
        for (const delay of [0, rule.gapMs]) {
            const p = (state.now - fx.start - delay) / rule.ms;
            if (p <= 0 || p >= 1) continue;
            ctx.globalAlpha = rule.alpha * (1 - p);
            floorRing(ctx, at, { radius: tile * rule.cells * ease(p), flat: rule.flat, dot: dot * 2, color: fx.color || '#e8d9b2' });
        }
        ctx.restore();
    }

    /** Over the dying boss (enemy-death.mjs): element motes rising from the body while the clip plays. t: 0..1 of the death. */
    motes(ctx, fx, t, at) {
        if (!fx.boss || !this.shown() || !at.enemy) return;
        const tile = at.gridProj ? at.gridProj.tileW : 64, dot = Math.max(2, Math.round(tile / 20));
        const fade = t < 0.8 ? 1 : Math.max(0, (1 - t) / 0.2);
        ctx.save();
        this.drawMotes(ctx, at.enemy, { t: t * fx.duration, dot, mote: fx.color || '#e8d9b2' }, tile * 0.7, fade);
        this.drawMotes(ctx, { x: at.enemy.x + tile * 0.12, y: at.enemy.y - tile * 0.4 }, { t: t * fx.duration + 500, dot, mote: '#fff4df' }, tile * 0.5, fade * 0.6);
        ctx.restore();
    }

    /** Screen space, over everything: the white flash at the kill and the letterbox bars. area = { width, height, now }. */
    drawScreen(ctx, area) {
        const fx = this.active(area.now);
        if (!fx) return;
        const t = area.now - fx.start, rule = DEFEAT.bars;
        const open = Math.min(ease(t / rule.inMs), ease((fx.duration - t) / rule.outMs));
        ctx.save();
        letterbox(ctx, area, { bar: area.height * rule.share * open, fill: rule.fill });
        if (t < DEFEAT.flash.ms) {
            ctx.globalAlpha = DEFEAT.flash.alpha * (1 - t / DEFEAT.flash.ms);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, area.width, area.height);
        }
        ctx.restore();
    }
}
