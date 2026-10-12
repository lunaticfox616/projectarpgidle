/** 옆에서 보는 무대의 스킬 이펙트 (data/stage-skill-vfx.js, 2026-10-13 사용자: "첨부한 파일은 새로운 스킬 이펙트니까 이것도 게임에
 * 적용시켜줘"). 인계 받은 이펙트 그림 한 장(assets/stage-vfx/vfx.png)에서 클립을 잘라 재생한다. 인계 쪽 시뮬레이터의 재생기를 옮긴 것이다.
 * - 클립은 '이름@램프'로 부른다: 그림의 밝기를 램프의 여섯 색으로 다시 칠한다('@='는 원래 색). 색감은 인계의 기본값인 "옅게"다.
 * - 맞은 적에 붙는 타격 클립은 인계의 기본값 "약하게"로 낸다: 작게, 조금 투명하게, 다섯 칸까지만, 동시에 다섯 개까지.
 * - 클립의 자리는 칸(소수)과 거기서의 도트 오프셋으로 적어 둔다: 방이 화면보다 넓어 카메라가 움직여도 제자리에 남는다.
 * - 그림 1px이 캐릭터 도트 하나다(인계의 캐릭터와 무대 캐릭터가 같은 그림이다).
 * 무엇을 언제 틀지는 js/canvas-stage-skill-rules.js가 정하고 여기는 틀고 그리기만 한다. 전투 계산에는 닿지 않는다.
 * 그림이 없는 판(저장소에는 넣지 않는다)이나 무대가 꺼진 창에서는 vfxReady가 거짓이라 예전 이펙트가 그대로 나온다.
 */
const stageSkillVfx = (() => {
    /** 타격 클립의 세기(인계의 "약하게"): 배율, 불투명도, 칸 수의 상한, 같은 적에게 다시 붙이는 간격(ms), 동시에 떠 있는 수. */
    const HIT = Object.freeze({ scale: 0.65, alpha: 0.82, frames: 5, gap: 160, max: 5 });
    /** 색감(인계의 "옅게"): 채도를 낮추고 밝기를 위로 모은다. */
    const TONE = Object.freeze({ s: 0.72, l0: 0.32, l1: 0.92 });
    const MAX_LIVE = 120;                         // 동시에 재생하는 클립의 상한(넘으면 새 클립을 틀지 않는다)
    let picture = null, failed = false, clock = 0, tintBlocked = false;
    const sheets = new Map();                     // "원본|램프" → 다시 칠한 띠 그림(칸을 가로로 늘어놓은 것)
    const boxes = new Map();                      // 클립 이름 → 기준점과 크기
    const tones = new Map();                      // 색 → 옅게 바꾼 색
    const live = [];                              // 재생 중인 클립

    function loadVfxPicture() {
        if (picture || typeof STAGE_SKILL_VFX !== 'object') return;
        picture = new Image();
        picture.decoding = 'async';
        picture.onerror = () => { failed = true; };
        picture.src = STAGE_SKILL_VFX.path + STAGE_SKILL_VFX.file + '?v=' + STAGE_SKILL_VFX.version;
    }
    /** 무대가 켜져 있고, 설정에서 끄지 않았고, 그림이 왔는가. 처음 물을 때 그림을 불러오기 시작한다. */
    function vfxReady() {
        if (typeof stageView !== 'object' || !stageView.enabled() || game.settings.stageSkillFx === 'off') return false;
        loadVfxPicture();
        return !!picture && !failed && picture.complete && picture.naturalWidth > 0;
    }

    // ---------------------------------------------------------------- colours
    const vfxHueStep = (p, q, x) => { const t = x < 0 ? x + 1 : x > 1 ? x - 1 : x; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    /** 색 하나를 옅게: 채도를 TONE.s배, 밝기를 l0~l1 사이로 옮긴다. */
    function vfxToneColour(r, g, b) {
        const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), mid = (max + min) / 2, d = max - min;
        const light = TONE.l0 + (TONE.l1 - TONE.l0) * mid;
        if (!d) { const v = Math.round(light * 255); return [v, v, v]; }
        const sat = (mid > 0.5 ? d / (2 - max - min) : d / (max + min)) * TONE.s;
        const hue = (max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4) / 6;
        const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat, p = 2 * light - q;
        return [vfxHueStep(p, q, hue + 1 / 3), vfxHueStep(p, q, hue), vfxHueStep(p, q, hue - 1 / 3)].map(value => Math.round(value * 255));
    }
    function vfxToned(colour) {
        const key = (colour[0] << 16) | (colour[1] << 8) | colour[2];
        if (!tones.has(key)) tones.set(key, vfxToneColour(colour[0], colour[1], colour[2]));
        return tones.get(key);
    }
    const vfxRampColours = name => (STAGE_SKILL_VFX.ramps[name] || null) && STAGE_SKILL_VFX.ramps[name].map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
    /** 띠 그림의 점마다 색을 바꾼다: 램프가 있으면 밝기를 여섯 단계로 나눠 램프의 색으로(가장 어두운 테만 0단계), 그리고 옅게. */
    function vfxRecolour(data, ramp, range) {
        const low = range[0], span = Math.max(1, range[1] - range[0]);
        for (let i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            const t = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] - low) / span;
            const colour = vfxToned(ramp ? ramp[t < 0 ? 0 : 1 + Math.floor(Math.min(0.999, t) * 5)] : [data[i], data[i + 1], data[i + 2]]);
            data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2];
        }
    }
    /** 원본 하나의 칸들을 가로로 늘어놓고 다시 칠한 띠. 한 번 만들어 둔다. */
    function vfxSheetOf(anim, rampName) {
        const key = anim + '|' + rampName;
        if (sheets.has(key)) return sheets.get(key);
        const row = STAGE_SKILL_VFX.atlas[anim], canvas = document.createElement('canvas');
        canvas.width = row.w * row.n;
        canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        row.fx.forEach(([x, y], index) => ctx.drawImage(picture, x, y, row.w, row.h, index * row.w, 0, row.w, row.h));
        if (!tintBlocked) {
            try {
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                vfxRecolour(pixels.data, rampName === '=' ? null : vfxRampColours(rampName), row.p);
                ctx.putImageData(pixels, 0, 0);
            } catch { tintBlocked = true; }   // 그림을 읽을 수 없는 환경: 원래 색 그대로 쓴다
        }
        sheets.set(key, canvas);
        return canvas;
    }
    /** 원본의 f0~f1 칸에서 그림이 차지하는 상자를 모두 덮는 상자 [왼쪽, 위, 오른쪽, 아래]. */
    function vfxFramesBox(row, f0, f1) {
        const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
        if (!boxes.length) return [0, 0, row.w, row.h];
        return [Math.min(...boxes.map(q => q[0])), Math.min(...boxes.map(q => q[1])), Math.max(...boxes.map(q => q[2])), Math.max(...boxes.map(q => q[3]))];
    }
    /** 클립의 기준점(ax, ay: 원본 칸 안의 px)과 쓰는 칸의 범위, 그림이 차지하는 크기. */
    function vfxClipBox(name) {
        if (boxes.has(name)) return boxes.get(name);
        const clip = STAGE_SKILL_VFX.clips[name], row = STAGE_SKILL_VFX.atlas[clip.a];
        const [f0, f1] = clip.f || [0, row.n - 1], b = vfxFramesBox(row, f0, f1);
        const ax = { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay = clip.an === 'bottom' ? b[3] : (b[1] + b[3]) / 2;
        const box = { ax, ay, w: b[2] - b[0], h: b[3] - b[1], f0, f1, frames: f1 - f0 + 1 };
        boxes.set(name, box);
        return box;
    }
    const vfxClipOf = ref => STAGE_SKILL_VFX.clips[String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]] || null;
    /** 클립이 화면에서 차지하는 가로(도트). */
    const vfxClipWidth = ref => { const clip = vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]; return clip ? vfxClipBox(name).w * (clip.sc || 1) : 0; };
    /** 클립 한 번의 길이(ms). */
    const vfxClipLength = ref => { const clip = vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]; return clip ? vfxClipBox(name).frames * (clip.ms || 70) : 0; };

    // ---------------------------------------------------------------- vfxPlaying
    /** 타격 클립의 세기를 입힌다. 이미 max개가 떠 있으면 틀지 않는다(false). */
    function vfxStyleHit(row) {
        if (live.filter(other => other.hit && clock - other.start < other.life).length >= HIT.max) return false;
        row.hit = true;
        if (!row.clip.small) row.scale *= HIT.scale;
        row.alpha *= HIT.alpha;
        row.frames = Math.min(row.frames, HIT.frames);
        row.next = null;
        if (!row.clip.loop) row.life = Math.min(row.life, row.frames * row.ms);
        return true;
    }
    /** 틀 때의 선택값: 주지 않은 것(undefined)은 바탕값을 쓴다. */
    const PLAY_DEFAULTS = Object.freeze({ face: 1, delay: 0, ramp: 'phys', life: 1000, layer: 'top', alpha: 1, scale: 1, rot: 0, move: null, fall: null, nextLife: 0, hit: false, fadeIn: 0 });
    function vfxOptions(options) {
        const o = { ...PLAY_DEFAULTS };
        for (const [key, value] of Object.entries(options || {})) if (value !== undefined) o[key] = value;
        return o;
    }
    /**
     * @param {(string|string[])} ref 클립 '이름@램프'(배열이면 첫 것)
     * @param {{gx:number,gy:number,dx?:number,dy?:number}} at 칸(소수, 그 칸에 선 발 자리)과 거기서의 도트 오프셋
     * @param {object} [o] face 방향(1 오른쪽, -1 왼쪽), delay 늦춤(ms), ramp 클립이 램프를 정하지 않았을 때의 램프, life 반복 클립의 길이,
     *   layer 'ground'|'top', alpha, scale, rot 돌림(라디안), hit 타격 클립, move { dx, dy, ms } 그동안 옮겨 가는 도트,
     *   fall { from, to, ms } 위에서 가속하며 떨어지는 도트, nextLife 이어지는 반복 클립의 길이
     * @returns {?object} 튼 클립(틀지 못했으면 null)
     */
    function vfxPlay(ref, at, options) {
        const text = String(Array.isArray(ref) ? ref[0] : ref), [name, rampName] = text.split('@'), clip = STAGE_SKILL_VFX.clips[name];
        if (!clip || live.length >= MAX_LIVE) return null;
        const o = vfxOptions(options), box = vfxClipBox(name), ms = clip.ms || 70;
        const row = { name, clip, box, ramp: rampName === undefined ? o.ramp : rampName, at: { dx: 0, dy: 0, ...at }, face: o.face, start: clock + o.delay, ms,
            frames: box.frames, life: clip.loop ? o.life : box.frames * ms, layer: o.layer, alpha: o.alpha, scale: o.scale, rot: o.rot, move: o.move, fall: o.fall,
            next: clip.next || null, nextLife: o.nextLife, hit: false, fadeIn: o.fadeIn };
        if (o.hit && !vfxStyleHit(row)) return null;
        live.push(row);
        return row;
    }
    /** 끝난 클립을 걷어 낸다. 이어지는 클립이 정해진 것은 그 자리에서 이어 튼다. */
    function vfxSweep() {
        for (let i = live.length - 1; i >= 0; i--) {
            const row = live[i];
            if (clock - row.start < row.life) continue;
            live.splice(i, 1);
            if (row.next) vfxPlay(row.next + '@' + row.ramp, row.at, { face: row.face, layer: row.layer, alpha: row.alpha, life: row.nextLife, nextLife: 0 });
        }
    }
    /** 클립의 지금 자리(도트 오프셋): 옮겨 가는 중이면 그만큼, 떨어지는 중이면 가속해서. */
    function vfxOffsetOf(row, t) {
        let dx = row.at.dx, dy = row.at.dy;
        if (row.move) { const k = Math.min(1, t / row.move.ms); dx += row.move.dx * k; dy += row.move.dy * k; }
        if (row.fall) { const k = Math.min(1, t / row.fall.ms); dy += row.fall.from + (row.fall.to - row.fall.from) * k * k; }
        return { dx, dy };
    }
    function vfxAlphaOf(row, t, index) {
        const last = row.hit && !row.clip.loop && index === row.frames - 1 ? 0.55 : 1, fadeIn = row.fadeIn ? Math.min(1, t / row.fadeIn) : 1;
        const fadeOut = row.clip.loop && row.life - t < 120 ? Math.max(0, (row.life - t) / 120) : 1;
        return row.alpha * last * fadeIn * fadeOut;
    }
    function vfxDrawRow(ctx, row, p, dot) {
        const t = clock - row.start;
        if (t < 0) return;
        const step = Math.floor(t / row.ms), index = row.clip.loop ? step % row.frames : Math.min(row.frames - 1, step);
        const base = p.cellToScreen(row.at.gx, row.at.gy), offset = vfxOffsetOf(row, t), size = (row.clip.sc || 1) * row.scale * dot;
        const sheet = vfxSheetOf(row.clip.a, row.ramp), cell = STAGE_SKILL_VFX.atlas[row.clip.a];
        ctx.save();
        ctx.globalAlpha *= vfxAlphaOf(row, t, index);
        ctx.translate(Math.round(base.x + offset.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + offset.dy * dot));
        if (row.face < 0) ctx.scale(-1, 1);
        if (row.rot) ctx.rotate(row.rot);
        if (row.clip.flat) ctx.scale(1, row.clip.flat);
        ctx.imageSmoothingEnabled = row.scale < 1;   // 줄인 타격 클립은 부드럽게(도트가 깨지지 않게)
        ctx.drawImage(sheet, (row.box.f0 + index) * cell.w, 0, cell.w, cell.h, Math.round(-row.box.ax * size), Math.round(-row.box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
        ctx.restore();
    }
    /** 프레임마다 한 번: 재생 시계를 맞추고 끝난 클립을 걷는다. time은 전장의 그림 시계(타격 멈춤 동안 멎는다). */
    function vfxTick(time) {
        if (time < clock - 2000) live.length = 0;   // 시계가 되돌아갔다(다른 판을 불러왔다)
        clock = time;
        vfxSweep();
    }
    /** 한 층('ground' 바닥, 'top' 캐릭터 위)의 클립을 그린다. */
    function vfxDraw(ctx, layer, p) {
        if (!live.length || !vfxReady()) return;
        const dot = stageActors.scaleFor(p.tileW);
        for (const row of live) if (row.layer === layer) vfxDrawRow(ctx, row, p, dot);
    }
    /** 클립 원본의 한 칸을 그 자리에 바로 그린다(투사체처럼 매 프레임 자리가 바뀌는 것). */
    function vfxStamp(ctx, ref, t, at) {
        const [name, rampName] = String(ref).split('@'), clip = STAGE_SKILL_VFX.clips[name];
        if (!clip) return false;
        const box = vfxClipBox(name), ms = clip.ms || 70, step = Math.floor(t / ms), index = clip.loop ? step % box.frames : Math.min(box.frames - 1, step);
        const cell = STAGE_SKILL_VFX.atlas[clip.a], size = (clip.sc || 1) * (at.scale || 1) * at.dot;
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        if (at.face < 0) ctx.scale(-1, 1);
        if (at.rot) ctx.rotate(at.rot);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(vfxSheetOf(clip.a, rampName !== undefined ? rampName : (at.ramp || 'phys')), (box.f0 + index) * cell.w, 0, cell.w, cell.h,
            Math.round(-box.ax * size), Math.round(-box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
        ctx.restore();
        return true;
    }
    const vfxNow = () => clock;
    return Object.freeze({ ready: vfxReady, play: vfxPlay, draw: vfxDraw, tick: vfxTick, stamp: vfxStamp, now: vfxNow, clipOf: vfxClipOf, clipWidth: vfxClipWidth,
        clipLength: vfxClipLength, HIT });
})();
safeExposeGlobals({ stageSkillVfx });
