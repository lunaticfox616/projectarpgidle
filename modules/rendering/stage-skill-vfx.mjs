import { createStageSkillSheets } from './stage-skill-sheets.mjs';
import { scaleForStageArt } from '../common/stage-art-scale.mjs';

/** 옆에서 보는 무대의 스킬 이펙트 (data/stage-skill-vfx.js, 2026-10-13 사용자: "첨부한 파일은 새로운 스킬 이펙트니까 이것도 게임에
 * 적용시켜줘"). 인계 받은 이펙트 그림(assets/stage-vfx/vfx.png, 2026-10-17 스킬룬 인계 v32부터 둘째 장 vfx2.png, 2026-11-01 전달본 V3.6부터 셋째 장 vfx3.png, 2026-11-02 V3.9.1부터 넷째 장 vfx5.png)에서 클립을 잘라 재생한다.
 * 인계 쪽 시뮬레이터의 재생기를 옮긴 것이다. 칸 표의 im이 그 클립 원본이 든 그림(STAGE_SKILL_VFX.files의 몇째 장)이다.
 * - 클립은 '이름@램프'로 부른다: 그림의 밝기를 램프의 여섯 색으로 다시 칠한다('@='는 원래 색). 색감은 인계의 기본값인 "옅게"다.
 * - 맞은 적에 붙는 타격 클립은 인계의 기본값 "약하게"로 낸다: 작게, 조금 투명하게, 다섯 칸까지만, 동시에 다섯 개까지.
 * - 클립의 자리는 칸(소수)과 거기서의 도트 오프셋으로 적어 둔다: 방이 화면보다 넓어 카메라가 움직여도 제자리에 남는다.
 * - 그림 1px이 캐릭터 도트 하나다(인계의 캐릭터와 무대 캐릭터가 같은 그림이다).
 * - 그림 대신 코드로 그리는 연출(바늘 찌르기, 우주 틈: js/canvas-stage-skill-draws.js)도 같은 시계와 자리 셈으로 여기서 돌린다(paint).
 * - 클립이 움직이는 몸을 따라가게 할 수 있고(follow), 프레임마다 전투를 살피는 일을 맡길 수 있다(watch: 대상이 죽는 순간 터지는 연출).
 * 무엇을 언제 틀지는 js/canvas-stage-skill-rules.js가 정하고 여기는 틀고 그리기만 한다. 전투 계산에는 닿지 않는다.
 * 그림이 없는 판(저장소에는 넣지 않는다)이나 무대가 꺼진 창에서는 vfxReady가 거짓이라 예전 이펙트가 그대로 나온다.
 * 띠(원본의 칸들을 가로로 늘어놓고 램프로 다시 칠한 그림)는 그리는 도중에 만들지 않는다(2026-10-14, docs/stage-render-performance-20261013.md 7번). 원본 한 장을 푸는
 * 데만 데스크톱에서 60ms, 느린 기기에서 300ms가 걸려, 룬의 이펙트가 처음 나오는 프레임이 그만큼 멈췄다. 지금은:
 * - 낀 룬이 쓰는 띠를 미리 만든다(keepStrips: js/canvas-stage-warmup.js가 룬이 바뀔 때 부른다). 낀 룬이 쓰지 않는 띠는 놓는다.
 * - 만들기는 그리기 밖에서 조금씩 한다(vfxCutPump). 원본은 메인 스레드 밖에서 풀고(js/canvas-stage-pictures.js) 자르는 동안만 든다.
 * - 그릴 때 띠가 아직 없으면 그 클립은 그 프레임을 건너뛰고, 띠를 만들어 달라고 해 둔다(미리 짚지 못한 램프의 클립).
 */
class StageSkillVfx {
    constructor(deps, assets) {
        this.deps = deps;
        this.assets = assets;
        this.HIT = Object.freeze({ scale: 0.65, alpha: 0.82, frames: 7, gap: 160, max: 5, longest: 240, tail: 85, widest: 76 });

        this.MAX_LIVE = 120;

        this.clock = 0;

        this.lastProjection = null;

        this.live = [];
        this.watchers = [];

        this.PLAY_DEFAULTS = Object.freeze({ face: 1, delay: 0, ramp: 'phys', life: 1000, layer: 'top', alpha: 1, scale: 1, rot: 0, move: null, fall: null, nextLife: 0, hit: false, fadeIn: 0,
            follow: null, ms: 0, cut: 0, tail: 0, flat: 0, pocket: null, order: null });
        this.vfxRowLife = (clip, o, frames, ms) => { const whole = clip.loop ? o.life : frames * ms; return o.cut ? Math.min(whole, o.cut) : whole; };
        this.vfxStampRamp = (rampName, at) => (rampName !== undefined ? rampName : (at.ramp || 'phys'));

        this.vfxNow = () => this.clock;
        this.vfxProjection = () => this.lastProjection;
    }

    /** 타격 클립의 세기를 입힌다. 이미 max개가 떠 있으면 틀지 않는다(false). */
    vfxStyleHit(row) {
        if (this.live.filter(other => other.hit && this.clock - other.start < other.life).length >= this.HIT.max) return false;
        row.hit = true;
        if (!row.clip.small) row.scale *= this.HIT.scale;
        row.alpha *= this.HIT.alpha;
        row.frames = Math.min(row.frames, this.HIT.frames);
        row.next = null;
        if (row.clip.loop) return true;
        row.ms = Math.max(26, Math.min(row.ms, this.HIT.longest / row.frames));
        row.life = row.frames * row.ms;
        row.tail = Math.min(this.HIT.tail, row.life * 0.43);
        const longest = Math.max(row.box.w, row.box.h) * (row.clip.sc || 1) * row.scale;
        if (longest > this.HIT.widest) row.scale *= this.HIT.widest / longest;
        return true;
    }

    vfxOptions(options) {
        const o = { ...this.PLAY_DEFAULTS };
        for (const [key, value] of Object.entries(options || {})) if (value !== undefined) o[key] = value;
        return o;
    }

    vfxClipRow(name, clip, at, o) {
        const box = this.assets.vfxClipBox(name), ms = o.ms || clip.ms || 70, frames = o.order ? o.order.length : box.frames;
        return { name, clip, box, ramp: o.ramp, at: { dx: 0, dy: 0, ...at }, face: o.face, start: this.clock + o.delay, ms,
            frames, order: o.order, life: this.vfxRowLife(clip, o, frames, ms), layer: o.layer, alpha: o.alpha, scale: o.scale, rot: o.rot, move: o.move, fall: o.fall,
            next: clip.next || null, nextLife: o.nextLife, hit: false, fadeIn: o.fadeIn || clip.fadeIn || 0, follow: o.follow, tail: o.tail, flat: o.flat || clip.flat || 0, pocket: o.pocket };
    }

    vfxPlay(ref, at, options) {
        const text = String(Array.isArray(ref) ? ref[0] : ref), [name, rampName] = text.split('@'), clip = this.deps.STAGE_SKILL_VFX.clips[name];
        if (!clip || this.live.length >= this.MAX_LIVE) return null;
        const o = this.vfxOptions(options);
        if (rampName !== undefined) o.ramp = rampName;
        const row = this.vfxClipRow(name, clip, at, o);
        if (o.hit && !this.vfxStyleHit(row)) return null;
        this.live.push(row);
        this.assets.vfxAskStrip(clip.a + '|' + o.ramp); // 미리 만들어 두지 않은 띠면 지금 맡긴다(늦춰 트는 클립은 그 사이에 준비된다)
        return row;
    }

    /** 코드로 그리는 연출 하나를 건다. paint(ctx, t, dot): 붓은 그 자리(발 자리 + 오프셋)로 옮겨져 있고, t는 시작한 뒤의 ms, dot은 도트 하나의 화면 크기다.
     * @param {{gx:number,gy:number,dx?:number,dy?:number}} at @param {{life:number, delay?:number, layer?:string, follow?:Function}} o */
    vfxPaint(at, o, paint) {
        if (this.live.length >= this.MAX_LIVE) return null;
        const row = { paint, at: { dx: 0, dy: 0, ...at }, start: this.clock + (o.delay || 0), life: o.life, layer: o.layer || 'top', follow: o.follow || null, next: null };
        this.live.push(row);
        return row;
    }

    /** 프레임마다 부를 일을 건다: fn(지금 시각)이 거짓을 돌려주면 그만 부른다. */
    /** fn(timeMs, owner) observes the current frame's state, never the state captured at cast time. */
    vfxWatch(fn) { if (this.watchers.length < 64) this.watchers.push(fn); }

    /** 끝난 클립을 걷어 낸다. 이어지는 클립이 정해진 것은 그 자리에서 이어 튼다. */
    vfxSweep() {
        for (let i = this.live.length - 1; i >= 0; i--) {
            const row = this.live[i];
            if (this.clock - row.start < row.life) continue;
            this.live.splice(i, 1);
            if (row.next) this.vfxPlay(row.next + '@' + row.ramp, row.at, { face: row.face, layer: row.layer, alpha: row.alpha, life: row.nextLife, nextLife: 0 });
        }
    }

    /** 클립의 지금 자리(도트 오프셋): 옮겨 가는 중이면 그만큼, 떨어지는 중이면 가속해서. */
    vfxOffsetOf(row, t) {
        let dx = row.at.dx, dy = row.at.dy;
        if (row.move) { const k = Math.min(1, t / row.move.ms); dx += row.move.dx * k; dy += row.move.dy * k; }
        if (row.fall) { const k = Math.min(1, t / row.fall.ms); dy += row.fall.from + (row.fall.to - row.fall.from) * k * k; }
        return { dx, dy };
    }

    vfxAlphaOf(row, t) {
        const fadeIn = row.fadeIn ? Math.min(1, t / row.fadeIn) : 1;
        // fadeOut(ms): 2026-11-01 V3.6 클립이 스스로 정한 끝의 옅어짐. 없으면 반복 클립만 0.12초에 옅어진다.
        const tail = row.tail || row.clip.fadeOut || (row.clip.loop ? 120 : 0), fadeOut = tail && row.life - t < tail ? Math.max(0, (row.life - t) / tail) : 1;
        return row.alpha * fadeIn * fadeOut;
    }

    /** 따라가는 클립은 그 몸의 지금 자리로 옮긴다(몸이 없어지면 마지막 자리에 남는다). */
    vfxFollow(row) {
        const spot = row.follow ? row.follow() : null;
        if (spot) { row.at.gx = spot.gx; row.at.gy = spot.gy; }
    }

    vfxPaintRow(ctx, row, p, dot) {
        const t = this.clock - row.start;
        if (t < 0) return;
        const base = p.cellToScreen(row.at.gx, row.at.gy);
        ctx.save();
        ctx.translate(Math.round(base.x + row.at.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + row.at.dy * dot));
        row.paint(ctx, t, dot);
        ctx.restore();
    }

    /** 그 줄이 비워 달라는 네모를 뺀 곳에만 그리게 붓을 자른다(앞쪽 연기가 쇠 향로 머리를 덮지 않게). */
    vfxCutPocket(ctx, row, p, dot) {
        const hole = row.pocket ? row.pocket() : null;
        if (!hole) return;
        const base = p.cellToScreen(hole.spot.gx, hole.spot.gy), lift = p.actorGroundOffsetY || 0, span = ctx.canvas.width + ctx.canvas.height;
        ctx.beginPath();
        ctx.rect(-span, -span, span * 2, span * 2);
        ctx.rect(base.x + hole.x * dot, base.y + lift + hole.y * dot, hole.w * dot, hole.h * dot);
        ctx.clip('evenodd');
    }

    /** 지금 그릴 칸(클립 안의 번호): 반복 클립은 돌고, 아니면 끝 칸에 머문다. order를 준 줄은 그 순서의 칸. */
    vfxFrameOf(row, t) {
        const step = Math.floor(t / row.ms), index = row.clip.loop ? step % row.frames : Math.min(row.frames - 1, step);
        return row.order ? row.order[index] : index;
    }

    vfxDrawRow(ctx, row, p, dot) {
        this.vfxFollow(row);
        if (row.paint) { this.vfxPaintRow(ctx, row, p, dot); return; }
        const t = this.clock - row.start;
        if (t < 0) return;
        const index = this.vfxFrameOf(row, t);
        const base = p.cellToScreen(row.at.gx, row.at.gy), offset = this.vfxOffsetOf(row, t), size = (row.clip.sc || 1) * row.scale * dot;
        const sheet = this.assets.vfxSheetOf(row.clip.a, row.ramp), cell = this.deps.STAGE_SKILL_VFX.atlas[row.clip.a];
        if (!sheet) return; // 띠를 만드는 중이다: 다 되면 그때부터 그린다
        ctx.save();
        this.vfxCutPocket(ctx, row, p, dot);
        ctx.globalAlpha *= this.vfxAlphaOf(row, t);
        ctx.translate(Math.round(base.x + offset.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + offset.dy * dot));
        if (row.face < 0) ctx.scale(-1, 1);
        if (row.rot) ctx.rotate(row.rot);
        if (row.flat) ctx.scale(1, row.flat);
        ctx.imageSmoothingEnabled = row.scale < 1;   // 줄인 타격 클립은 부드럽게(도트가 깨지지 않게)
        ctx.drawImage(sheet, (row.box.f0 + index) * cell.w, 0, cell.w, cell.h, Math.round(-row.box.ax * size), Math.round(-row.box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
        ctx.restore();
    }

    /** 프레임마다 한 번: 재생 시계를 맞추고 끝난 클립을 걷는다. time은 전장의 그림 시계(타격 멈춤 동안 멎는다). */
    vfxTick(owner, time) {
        if (time < this.clock - 2000) { this.live.length = 0; this.watchers.length = 0; }   // 시계가 되돌아갔다(다른 판을 불러왔다)
        this.clock = time;
        this.vfxSweep();
        for (let i = this.watchers.length - 1; i >= 0; i--) if (!this.watchers[i](this.clock, owner)) this.watchers.splice(i, 1);
    }

    /** 한 층('ground' 바닥, 'top' 캐릭터 위)의 클립을 그린다. */
    vfxDraw(owner, ctx, layer, p) {
        this.lastProjection = p;
        if (!this.live.length || !this.assets.vfxReady(owner)) return;
        const dot = scaleForStageArt(p.tileW, this.deps.STAGE_VIEW.heroTile);
        for (const row of this.live) if (row.layer === layer) this.vfxDrawRow(ctx, row, p, dot);
    }

    /** 바로 그리는 클립의 붓을 그 자리와 모습으로 놓는다(vfxStamp). */
    vfxStampPlace(ctx, at) {
        if (at.alpha !== undefined) ctx.globalAlpha *= at.alpha;
        ctx.translate(Math.round(at.x), Math.round(at.y));
        if (at.face < 0) ctx.scale(-1, 1);
        if (at.rot) ctx.rotate(at.rot);
        if (at.flat) ctx.scale(1, at.flat);
        if (at.turn) ctx.rotate(at.turn);
        ctx.imageSmoothingEnabled = !!at.smooth;
    }

    /** 클립 원본의 한 칸을 그 자리에 바로 그린다(투사체처럼 매 프레임 자리가 바뀌는 것). 바닥에 둘 때는 at.flat(눕히는 비율)과
     * at.turn(누운 바닥 평면에서 돌리는 각, 라디안: 사역룬 가호의 결정진, js/canvas-stage-blessing.js), 그리고 at.alpha, at.smooth(줄일 때 부드럽게). */
    vfxStamp(ctx, ref, t, at) {
        const [name, rampName] = String(ref).split('@'), clip = this.deps.STAGE_SKILL_VFX.clips[name];
        if (!clip) return false;
        const box = this.assets.vfxClipBox(name), ms = clip.ms || 70, step = Math.floor(t / ms), index = clip.loop ? step % box.frames : Math.min(box.frames - 1, step);
        const cell = this.deps.STAGE_SKILL_VFX.atlas[clip.a], size = (clip.sc || 1) * (at.scale || 1) * at.dot;
        const sheet = this.assets.vfxSheetOf(clip.a, this.vfxStampRamp(rampName, at));
        if (!sheet) return true; // 띠를 만드는 중이다: 이 연출이 맡은 그림이므로 예전 그림으로 돌아가지 않고 그 프레임을 건너뛴다
        ctx.save();
        this.vfxStampPlace(ctx, at);
        ctx.drawImage(sheet, (box.f0 + index) * cell.w, 0, cell.w, cell.h,
            Math.round(-box.ax * size), Math.round(-box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
        ctx.restore();
        return true;
    }

    /** 재생 중인 클립과 걸어 둔 일을 모두 걷는다(방을 옮길 때: js/canvas-stage-rooms.js). */
    vfxClear() { this.live.length = 0; this.watchers.length = 0; }
}

export function createStageSkillVfx(deps) {
    const assets = createStageSkillSheets(deps);
    const instance = new StageSkillVfx(deps, assets);
    return Object.freeze({ ready: assets.vfxReady, play: instance.vfxPlay.bind(instance), paint: instance.vfxPaint.bind(instance), watch: instance.vfxWatch.bind(instance), draw: instance.vfxDraw.bind(instance), tick: instance.vfxTick.bind(instance), stamp: instance.vfxStamp.bind(instance), now: instance.vfxNow, projection: instance.vfxProjection, clipOf: assets.vfxClipOf, picture: assets.vfxPicture,
        clipWidth: assets.vfxClipWidth, clipLength: assets.vfxClipLength, keepStrips: (owner, refs) => assets.vfxKeepStrips(owner, refs, instance.live), clear: instance.vfxClear.bind(instance), dispose: () => { instance.vfxClear(); assets.dispose(); }, HIT: instance.HIT });
}
