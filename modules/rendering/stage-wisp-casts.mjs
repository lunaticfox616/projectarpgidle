import { scaleForStageArt } from '../common/stage-art-scale.mjs';

class StageWispCasts {
    constructor(deps, seen) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.WIDE = this.K.WIDE;
        this.DEEP = this.K.DEEP;
        this.seen = seen;
        this.WISP_HIT = Object.freeze({ fire: 'h_fire@fire', cold: 'h_ice@cold', light: 'h_lit@light', chaos: 'h_chaos@chaos', phys: 'h_xs@phys' });
        this.wispPictures = new Map();
        this.wispHit = element => this.WISP_HIT[element] || this.WISP_HIT.phys;
    }

    /** 소환된 위습의 몸: 그 속성의 구슬이 몸 높이에서 조금씩 오르내린다. @returns {?number} 그린 몸의 맨 위(화면 y). 새 그림이 없으면 null */
    wispBody(ctx, summon, at, view) {
        const gem = this.deps.stageSkillVfx.ready() ? this.K.gemOf(summon.gemName) : null;
        if (!gem || !gem.map.body) return null;
        const dot = scaleForStageArt(view.proj.tileW, this.deps.STAGE_VIEW.heroTile), phase = (Number(summon.id) || 0) * 0.7, bob = Math.round(Math.sin(view.now / 260 + phase) * 3);
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,12,0.3)';
        ctx.fillRect(Math.round(at.x - 5 * dot), Math.round(at.y + dot), Math.round(11 * dot), Math.max(1, Math.round(2 * dot)));
        const spot = { x: at.x, y: at.y + (bob - 76) * dot, dot, face: this.K.heroFace(), phase, t: view.now };
        if (!this.wispSprite(ctx, gem.meta.el, spot)) this.deps.stageSkillVfx.stamp(ctx, gem.map.body, view.now + phase * 500, { ...spot, ramp: this.K.ramp(gem, gem.meta.el) });
        ctx.restore();
        return at.y - 96 * dot;
    }

    /** 소환 위습 그림(2026-11-01 전달본 V3.6 wisp-appearance.js): 네 장을 오른쪽을 보는 그림으로 틀고 보는 쪽으로 뒤집는다. 아직 안 왔으면 거짓(그때는 클립을 찍는다). */
    wispSprite(ctx, element, spot) {
        const art = this.deps.STAGE_SKILL_VFX.wisps, file = art.files[element];
        if (!file) return false;
        if (!this.wispPictures.has(element)) this.wispPictures.set(element, this.deps.stageAssetRetry.image(art.path + file));
        const image = this.wispPictures.get(element);
        if (!this.deps.stageAssetRetry.loaded(image)) return false;
        const frame = ((Math.floor((spot.t + spot.phase * 500) / art.ms) % art.frames) + art.frames) % art.frames, size = art.size * spot.dot;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(spot.x), Math.round(spot.y));
        if (spot.face < 0) ctx.scale(-1, 1);
        ctx.drawImage(image, frame * art.size, 0, art.size, art.size, Math.round(-size / 2), Math.round(-size / 2), Math.round(size), Math.round(size));
        ctx.restore();
        return true;
    }

    /** 위습이 쏜 한 발: 구슬이 위습에게서 대상의 몸으로 날아가 닿는 자리에 속성 타격이 붙는다. */
    wispShot(fx, gem) {
        const from = { gx: fx.sourceGx, gy: fx.sourceGy }, to = { gx: fx.targetGx, gy: fx.targetGy }, rule = (this.deps.WISP_SUMMONS[fx.gemName] || {}).flight || { base: 120, perDot: 0 };
        const dx = (to.gx - from.gx) * this.WIDE, dy = (to.gy - from.gy) * this.DEEP, ms = Math.max(120, rule.base + rule.perDot * Math.hypot(to.gx - from.gx, to.gy - from.gy) * 16);
        const element = gem.meta.el, ramp = this.deps.STAGE_SKILL_VFX.elementRamp[element] || 'phys';
        this.deps.stageSkillVfx.play(gem.map.shot, this.K.at(from, 0, -72), { ramp, face: Math.sign(dx) || 1, life: ms, move: { dx, dy: dy + 22, ms } });
        this.deps.stageSkillVfx.play(this.WISP_HIT[element] || this.WISP_HIT.phys, this.K.at(to, 0, this.K.BODY), { ramp, face: Math.sign(dx) || 1, delay: ms, hit: true });
    }

    /** 위습들의 공격을 새 클립으로 옮긴다(공격마다 한 번). @returns {boolean} 새 그림이 맡았는지(맡았으면 예전 위습 공격 그림은 그리지 않는다) */
    wispShots(now) {
        if (!this.deps.stageSkillVfx.ready()) return false;
        for (const fx of this.deps.battleFx) {
            if (!fx || fx.type !== 'summonAttack' || fx.start > now || this.seen.has(fx)) continue;
            const gem = this.K.gemOf(fx.gemName);
            this.seen.add(fx);
            if (gem && gem.map.shot && Number.isFinite(fx.targetGx)) this.wispShot(fx, gem);
        }
        return true;
    }
}

export function createStageWispCasts(deps, seen) {
    const instance = new StageWispCasts(deps, seen);
    return Object.freeze({ wispBody: instance.wispBody.bind(instance), wispShots: instance.wispShots.bind(instance), wispHit: instance.wispHit });
}
