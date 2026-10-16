/** 옆에서 보는 무대의 스킬 이펙트 (data/stage-skill-vfx.js, 2026-10-13 사용자: "첨부한 파일은 새로운 스킬 이펙트니까 이것도 게임에
 * 적용시켜줘"). 인계 받은 이펙트 그림 한 장(assets/stage-vfx/vfx.png)에서 클립을 잘라 재생한다. 인계 쪽 시뮬레이터의 재생기를 옮긴 것이다.
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
const stageSkillVfx = (() => {
    /** 타격 클립의 세기(인계의 "약하게"): 배율, 불투명도, 칸 수의 상한, 같은 적에게 다시 붙이는 간격(ms), 동시에 떠 있는 수. */
    const HIT = Object.freeze({ scale: 0.65, alpha: 0.82, frames: 5, gap: 160, max: 5 });
    /** 색감(인계의 "옅게"): 채도를 낮추고 밝기를 위로 모은다. */
    const TONE = Object.freeze({ s: 0.72, l0: 0.32, l1: 0.92 });
    const MAX_LIVE = 120;                         // 동시에 재생하는 클립의 상한(넘으면 새 클립을 틀지 않는다)
    const CUT_BUDGET_MS = 3;                      // 한 차례에 띠를 만드는 데 쓰는 시간(띠 하나는 끝까지 만든다)
    const CUT_GAP_MS = 16;                        // 차례 사이의 쉼: 한 프레임에 한 차례만 들게 한다(느린 기기에서 잇달아 돌면 한 프레임에 몰렸다)
    const ATLAS_IDLE_MS = 3000;                   // 만들 띠가 없어진 뒤 이만큼 지나면 풀어 둔 원본을 놓는다(62MB)
    let picture = null, failed = false, clock = 0, tintBlocked = false;
    const sheets = new Map();                     // "원본|램프" → 다시 칠한 띠 그림(칸을 가로로 늘어놓은 것). 다 만든 것만 든다
    const cutQueue = [];                          // 만들 띠의 열쇠(차례대로)
    const asked = new Set();                      // cutQueue에 든 열쇠
    let atlas = null, atlasUsedAt = 0;            // 풀어 둔 원본(자르는 동안만 든다)과 마지막으로 쓴 때
    let pumpTimer = null, pumpDue = 0;            // 걸어 둔 다음 차례와 그때
    const boxes = new Map();                      // 클립 이름 → 기준점과 크기
    const tones = new Map();                      // 색 → 옅게 바꾼 색
    const live = [];                              // 재생 중인 클립
    const watchers = [];                          // 프레임마다 부르는 일(거짓을 돌려주면 그만 부른다)

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
    /** 원본 하나의 칸들을 가로로 늘어놓고 다시 칠한 띠를 만들어 둔다. source: 풀어 둔 원본. */
    function vfxCutStrip(key, source) {
        const [anim, rampName] = key.split('|'), row = STAGE_SKILL_VFX.atlas[anim], canvas = document.createElement('canvas');
        canvas.width = row.w * row.n;
        canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        row.fx.forEach(([x, y], index) => ctx.drawImage(source, x, y, row.w, row.h, index * row.w, 0, row.w, row.h));
        if (!tintBlocked) {
            try {
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                vfxRecolour(pixels.data, rampName === '=' ? null : vfxRampColours(rampName), row.p);
                ctx.putImageData(pixels, 0, 0);
            } catch { tintBlocked = true; }   // 그림을 읽을 수 없는 환경: 원래 색 그대로 쓴다
        }
        sheets.set(key, canvas);
    }
    /** 그 띠를 만들어 달라고 해 둔다(이미 있거나 해 둔 것은 그대로). 원본에 없는 이름은 받지 않는다. */
    function vfxAskStrip(key) {
        if (sheets.has(key) || asked.has(key) || !STAGE_SKILL_VFX.atlas[key.split('|')[0]]) return;
        asked.add(key);
        cutQueue.push(key);
        vfxSchedulePump(0);
    }
    /** delay 뒤에 한 차례를 건다. 더 이른 차례가 이미 걸려 있으면 그대로 둔다(늦은 차례는 앞당긴다). */
    function vfxSchedulePump(delay) {
        const due = performance.now() + delay;
        if (pumpTimer !== null && pumpDue <= due) return;
        if (pumpTimer !== null) clearTimeout(pumpTimer);
        pumpDue = due;
        pumpTimer = setTimeout(vfxCutPump, delay);
    }
    /** 한 차례: 만들 띠가 있으면 원본을 열고(풀리기를 기다린다), CUT_BUDGET_MS 동안 띠를 만든다. 다 만들고 한동안 일이 없으면 원본을 놓는다. */
    function vfxCutPump() {
        pumpTimer = null;
        if (!cutQueue.length) { vfxRestAtlas(); return; }
        if (!atlas) atlas = stagePictures.openPicture(picture.src);
        atlasUsedAt = performance.now();
        // 밖에서 풀지 못한 곳에서는 불러온 그림 그대로 자른다(처음 자를 때 풀린다)
        const source = atlas.ready ? atlas.source : (atlas.failed ? picture : null);
        if (!source) { vfxSchedulePump(CUT_GAP_MS); return; }
        const until = atlasUsedAt + CUT_BUDGET_MS;
        while (cutQueue.length && performance.now() < until) {
            const key = cutQueue.shift();
            asked.delete(key);
            vfxCutStrip(key, source);
        }
        vfxSchedulePump(cutQueue.length ? CUT_GAP_MS : ATLAS_IDLE_MS);
    }
    /** 만들 띠가 없는 채로 ATLAS_IDLE_MS가 지났으면 풀어 둔 원본을 놓는다. 아직이면 그때 다시 본다. */
    function vfxRestAtlas() {
        if (!atlas) return;
        const idle = performance.now() - atlasUsedAt;
        if (idle < ATLAS_IDLE_MS) { vfxSchedulePump(ATLAS_IDLE_MS - idle + 20); return; }
        stagePictures.closePicture(atlas);
        atlas = null;
    }
    /** 그 띠(다 만든 것). 아직 없으면 null: 만들어 달라고 해 두고, 그리는 쪽은 그 프레임을 건너뛴다. */
    function vfxSheetOf(anim, rampName) {
        const key = anim + '|' + rampName, sheet = sheets.get(key);
        if (!sheet) vfxAskStrip(key);
        return sheet || null;
    }
    /** 클립 '이름@램프'(램프가 없으면 phys)가 쓰는 띠의 열쇠. 없는 클립이면 ''. */
    function vfxStripKey(ref) {
        const [name, rampName] = String(ref).split('@'), clip = STAGE_SKILL_VFX.clips[name];
        return clip ? clip.a + '|' + (rampName !== undefined ? rampName : 'phys') : '';
    }
    /** 낀 룬이 쓰는 클립들(refs: '이름@램프')의 띠를 미리 만들어 두고, 그 밖의 띠는 놓는다(지금 재생 중인 클립의 띠는 둔다).
     * 룬이 바뀔 때 부른다. 원본 그림이 아직 오지 않았으면 아무 일도 하지 않는다(부른 쪽이 그림이 온 뒤에 다시 부른다). */
    function vfxKeepStrips(refs) {
        if (!vfxReady()) return;
        const wanted = new Set(refs.map(vfxStripKey).filter(Boolean));
        for (const row of live) if (row.clip) wanted.add(row.clip.a + '|' + row.ramp);
        for (const [key, canvas] of [...sheets]) {
            if (wanted.has(key)) continue;
            canvas.width = canvas.height = 1;
            sheets.delete(key);
        }
        for (let i = cutQueue.length - 1; i >= 0; i--) if (!wanted.has(cutQueue[i])) asked.delete(cutQueue.splice(i, 1)[0]);
        wanted.forEach(vfxAskStrip);
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
    const PLAY_DEFAULTS = Object.freeze({ face: 1, delay: 0, ramp: 'phys', life: 1000, layer: 'top', alpha: 1, scale: 1, rot: 0, move: null, fall: null, nextLife: 0, hit: false, fadeIn: 0,
        follow: null, ms: 0, cut: 0 });
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
     *   fall { from, to, ms } 위에서 가속하며 떨어지는 도트, nextLife 이어지는 반복 클립의 길이, follow 프레임마다 자리(칸)를 돌려주는 함수(없어지면 null),
     *   ms 한 칸의 시간을 바꿀 때, cut 이보다 길면 여기서 끊는다(ms)
     * @returns {?object} 튼 클립(틀지 못했으면 null). life를 줄이면 일찍 끝난다.
     */
    /** 틀 클립 하나의 줄: 클립의 길이와 속도, 옵션이 정한 모습을 한데 묶는다. */
    function vfxClipRow(name, clip, at, o) {
        const box = vfxClipBox(name), ms = o.ms || clip.ms || 70, whole = clip.loop ? o.life : box.frames * ms;
        return { name, clip, box, ramp: o.ramp, at: { dx: 0, dy: 0, ...at }, face: o.face, start: clock + o.delay, ms,
            frames: box.frames, life: o.cut ? Math.min(whole, o.cut) : whole, layer: o.layer, alpha: o.alpha, scale: o.scale, rot: o.rot, move: o.move, fall: o.fall,
            next: clip.next || null, nextLife: o.nextLife, hit: false, fadeIn: o.fadeIn, follow: o.follow };
    }
    function vfxPlay(ref, at, options) {
        const text = String(Array.isArray(ref) ? ref[0] : ref), [name, rampName] = text.split('@'), clip = STAGE_SKILL_VFX.clips[name];
        if (!clip || live.length >= MAX_LIVE) return null;
        const o = vfxOptions(options);
        if (rampName !== undefined) o.ramp = rampName;
        const row = vfxClipRow(name, clip, at, o);
        if (o.hit && !vfxStyleHit(row)) return null;
        live.push(row);
        vfxAskStrip(clip.a + '|' + o.ramp); // 미리 만들어 두지 않은 띠면 지금 맡긴다(늦춰 트는 클립은 그 사이에 준비된다)
        return row;
    }
    /** 코드로 그리는 연출 하나를 건다. paint(ctx, t, dot): 붓은 그 자리(발 자리 + 오프셋)로 옮겨져 있고, t는 시작한 뒤의 ms, dot은 도트 하나의 화면 크기다.
     * @param {{gx:number,gy:number,dx?:number,dy?:number}} at @param {{life:number, delay?:number, layer?:string, follow?:Function}} o */
    function vfxPaint(at, o, paint) {
        if (live.length >= MAX_LIVE) return null;
        const row = { paint, at: { dx: 0, dy: 0, ...at }, start: clock + (o.delay || 0), life: o.life, layer: o.layer || 'top', follow: o.follow || null, next: null };
        live.push(row);
        return row;
    }
    /** 프레임마다 부를 일을 건다: fn(지금 시각)이 거짓을 돌려주면 그만 부른다. */
    function vfxWatch(fn) { if (watchers.length < 64) watchers.push(fn); }
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
    /** 따라가는 클립은 그 몸의 지금 자리로 옮긴다(몸이 없어지면 마지막 자리에 남는다). */
    function vfxFollow(row) {
        const spot = row.follow ? row.follow() : null;
        if (spot) { row.at.gx = spot.gx; row.at.gy = spot.gy; }
    }
    function vfxPaintRow(ctx, row, p, dot) {
        const t = clock - row.start;
        if (t < 0) return;
        const base = p.cellToScreen(row.at.gx, row.at.gy);
        ctx.save();
        ctx.translate(Math.round(base.x + row.at.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + row.at.dy * dot));
        row.paint(ctx, t, dot);
        ctx.restore();
    }
    function vfxDrawRow(ctx, row, p, dot) {
        vfxFollow(row);
        if (row.paint) { vfxPaintRow(ctx, row, p, dot); return; }
        const t = clock - row.start;
        if (t < 0) return;
        const step = Math.floor(t / row.ms), index = row.clip.loop ? step % row.frames : Math.min(row.frames - 1, step);
        const base = p.cellToScreen(row.at.gx, row.at.gy), offset = vfxOffsetOf(row, t), size = (row.clip.sc || 1) * row.scale * dot;
        const sheet = vfxSheetOf(row.clip.a, row.ramp), cell = STAGE_SKILL_VFX.atlas[row.clip.a];
        if (!sheet) return; // 띠를 만드는 중이다: 다 되면 그때부터 그린다
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
        if (time < clock - 2000) { live.length = 0; watchers.length = 0; }   // 시계가 되돌아갔다(다른 판을 불러왔다)
        clock = time;
        vfxSweep();
        for (let i = watchers.length - 1; i >= 0; i--) if (!watchers[i](clock)) watchers.splice(i, 1);
    }
    /** 한 층('ground' 바닥, 'top' 캐릭터 위)의 클립을 그린다. */
    function vfxDraw(ctx, layer, p) {
        if (!live.length || !vfxReady()) return;
        const dot = stageActors.scaleFor(p.tileW);
        for (const row of live) if (row.layer === layer) vfxDrawRow(ctx, row, p, dot);
    }
    /** 바로 그리는 클립의 램프: 클립이 정한 것, 없으면 부른 쪽이 준 것, 그것도 없으면 phys. */
    const vfxStampRamp = (rampName, at) => (rampName !== undefined ? rampName : (at.ramp || 'phys'));
    /** 클립 원본의 한 칸을 그 자리에 바로 그린다(투사체처럼 매 프레임 자리가 바뀌는 것). */
    function vfxStamp(ctx, ref, t, at) {
        const [name, rampName] = String(ref).split('@'), clip = STAGE_SKILL_VFX.clips[name];
        if (!clip) return false;
        const box = vfxClipBox(name), ms = clip.ms || 70, step = Math.floor(t / ms), index = clip.loop ? step % box.frames : Math.min(box.frames - 1, step);
        const cell = STAGE_SKILL_VFX.atlas[clip.a], size = (clip.sc || 1) * (at.scale || 1) * at.dot;
        const sheet = vfxSheetOf(clip.a, vfxStampRamp(rampName, at));
        if (!sheet) return true; // 띠를 만드는 중이다: 이 연출이 맡은 그림이므로 예전 그림으로 돌아가지 않고 그 프레임을 건너뛴다
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        if (at.face < 0) ctx.scale(-1, 1);
        if (at.rot) ctx.rotate(at.rot);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, (box.f0 + index) * cell.w, 0, cell.w, cell.h,
            Math.round(-box.ax * size), Math.round(-box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
        ctx.restore();
        return true;
    }
    const vfxNow = () => clock;
    /** 재생 중인 클립과 걸어 둔 일을 모두 걷는다(방을 옮길 때: js/canvas-stage-rooms.js). */
    function vfxClear() { live.length = 0; watchers.length = 0; }
    return Object.freeze({ ready: vfxReady, play: vfxPlay, paint: vfxPaint, watch: vfxWatch, draw: vfxDraw, tick: vfxTick, stamp: vfxStamp, now: vfxNow, clipOf: vfxClipOf,
        clipWidth: vfxClipWidth, clipLength: vfxClipLength, keepStrips: vfxKeepStrips, clear: vfxClear, HIT });
})();
safeExposeGlobals({ stageSkillVfx });
