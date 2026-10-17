/** 스킬 이펙트 가운데 그림 없이 코드로 그리는 것 (2026-10-13 사용자가 준 스킬 이펙트 인계의 그리기 코드를 옮긴 것이다. 모양과 수치는
 * 인계 그대로이고, 게임의 붓과 시계에 맞게 나눠 적었다).
 * - 혈기 폭쇄의 바늘 찌르기: 뿌리 굵고 끝이 가는 방추가 0.08초에 뻗고, 잠깐 머문 뒤 뿌리부터 걷힌다. 끝에 십자 번쩍임과 속도선 둘.
 * - 공허 가르기의 우주 틈: 베는 선이 0.08초에 그어지고, 그 자국이 별과 성운이 보이는 틈으로 벌어졌다가 닫힌다.
 * - 투사체의 몸: 속성 장식이 붙은 창과 큰 창, 쌍독니, 세로로 도는 방패, 화살, 작살, 던지는 플라스크.
 * 도트 하나가 캐릭터 도트 하나다. 그리기만 한다: 언제 어디에 그릴지는 js/canvas-stage-skill-rules.js가 정한다.
 */
const stageSkillDraws = (() => {
    const sprites = new Map();                    // "종류|속성|프레임" → 도트로 찍어 둔 그림
    let needle = null;                            // 바늘을 프레임마다 찍는 작업면

    const drawMix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('');
    /** 속성의 세 색(c1 밝은색, c2 중간색, c3 어두운색). */
    const drawInk = element => STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
    function drawCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx, px: (x, y, colour) => { ctx.fillStyle = colour; ctx.fillRect(x, y, 1, 1); } };
    }
    function cached(key, make) {
        if (!sprites.has(key)) sprites.set(key, make());
        return sprites.get(key);
    }
    /** 프레임마다 다시 계산한 난수열(같은 씨앗이면 같은 값). */
    function drawRandom(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

    // ---------------------------------------------------------------- pierce (혈기 폭쇄)
    /** 바늘의 한 줄(x)의 반 두께: 앞으로 갈수록 가늘고, 뒤쪽 꼬리와 걷히는 뒤끝은 둥글게 줄어든다. */
    function needleHalf(x, shape) {
        const along = Math.max(0, x) / shape.length, back = x < 0 ? 1 - Math.pow(x / shape.tail, 1.4) : 1;
        const rear = (x - shape.start) / 7, half = Math.max(0.5, 5 * (1 - along) ** 1.15 + 0.2) * back;
        return rear < 1 ? half * Math.sqrt(Math.max(0.08, rear)) : half;
    }
    function needleBody(put, shape, tip, ink) {
        for (let x = shape.start; x <= tip; x++) {
            const w = needleHalf(x, shape);
            if (w < 0.5) continue;
            for (let y = -Math.ceil(w); y <= Math.ceil(w); y++) {
                const ay = Math.abs(y);
                if (ay <= w + 0.5) put(x, y, ay > w - 0.5 ? ink.dark : y === 0 ? ink.white : ay < w * 0.5 ? ink.lit : ink.mid);
            }
        }
    }
    /** 속도선 둘(끝 조금 뒤, 위아래)과 끝의 십자 번쩍임. */
    function needleMarks(g, t, tip, tailEnd, ink) {
        if (t < 130) {
            const x1 = tip - 10, x0 = Math.max(x1 - 26 - Math.round(Math.min(1, t / 80) * 10), tailEnd);
            g.globalAlpha = 0.7; g.fillStyle = ink.dark;
            if (x1 > tailEnd + 4) for (const dy of [-7, 7]) g.fillRect(x0, dy, x1 - x0, 1);
            g.globalAlpha = 1;
        }
        if (t <= 50 || t >= 130) return;
        const r = t < 90 ? 2 + Math.round((t - 50) / 10) : 6 - Math.round((t - 90) / 10);
        g.fillStyle = ink.white; g.fillRect(tip + 1 - r, 0, r * 2 + 1, 1); g.fillRect(tip + 1, -r, 1, r * 2 + 1);
        g.fillStyle = ink.lit; g.fillRect(tip, -1, 3, 3);
    }
    /** @param {number} face 1 오른쪽, -1 왼쪽 @param {string} rampName 색 램프 @returns {{life:number, paint:Function}} 손 앞(앞으로 14, 위로 42도트)에 걸 연출 */
    function piercePaint(face, rampName) {
        const C = STAGE_SKILL_VFX.ramps[rampName] || STAGE_SKILL_VFX.ramps.phys, ink = { dark: C[1], mid: C[3], lit: C[4], white: C[5] };
        const length = 107, tailX = -22, pad = 10, width = length - tailX + 12, height = pad * 2 + 1;
        return { life: 230, paint(ctx, t, dot) {
            const tip = Math.round(length * (1 - (1 - Math.min(1, t / 80)) ** 2)), gone = t < 140 ? 0 : length * Math.min(1, (t - 140) / 90);
            if (tip - gone < 2) return;
            needle = needle || drawCanvas(width, height);
            const g = needle.ctx, start = Math.round(tailX + (gone / length) * (length - tailX));
            g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, width, height); g.setTransform(1, 0, 0, 1, -tailX, pad);
            needleBody((x, y, colour) => { g.fillStyle = colour; g.fillRect(x, y, 1, 1); }, { length, tail: tailX, start }, tip, ink);
            needleMarks(g, t, tip, Math.round(gone), ink);
            ctx.globalAlpha *= t > 170 ? Math.max(0, 1 - (t - 170) / 60) : 1;
            if (face < 0) ctx.scale(-1, 1);
            stageDots.blit(ctx, needle.canvas, { x: 0, y: 0, w: width, h: height }, { x: Math.round(tailX * dot), y: Math.round(-pad * dot), scale: dot });
        } };
    }

    // ---------------------------------------------------------------- void gash (공허 가르기)
    function lensPath(g, length, w) {
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(length * 0.5, -w * 2, length, 0); g.quadraticCurveTo(length * 0.5, w * 2, 0, 0); g.closePath();
    }
    /** 벌어진 틈: 보라 테두리 두 겹, 검은 속, 그 안의 성운과 반짝이는 별. */
    function gashOpening(g, sky, t, w) {
        const ink = drawInk('chaos');
        g.save();
        g.globalAlpha = 0.55; g.fillStyle = ink.c2; lensPath(g, sky.length, w + 3); g.fill();
        g.globalAlpha = 0.9; g.fillStyle = ink.c1; lensPath(g, sky.length, w + 1.5); g.fill();
        g.globalAlpha = 1; g.fillStyle = '#07040f'; lensPath(g, sky.length, w); g.fill();
        lensPath(g, sky.length, w); g.clip();
        for (const [x, y, r, colour] of sky.clouds) { g.globalAlpha = 0.5; g.fillStyle = colour; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, 6.29); g.fill(); }
        for (const [x, y, size, phase, bright] of sky.stars) {
            g.globalAlpha = (0.55 + 0.45 * Math.sin(t / 110 + phase)) * bright;
            g.fillStyle = size > 1 ? '#fff6ff' : '#d9c8ff';
            g.fillRect(Math.round(x + Math.sin(t / 400 + phase) * 2), Math.round(y), size, size);
        }
        g.restore();
    }
    /** 베는 선(흰 심과 보라 테, 다 긋고 나면 옅어진다)과 선에서 튀는 보라 불티. */
    function gashCut(g, sky, t) {
        const ink = drawInk('chaos'), tip = Math.round(sky.length * (1 - (1 - Math.min(1, t / 80)) ** 2));
        if (t < 150) {
            const alpha = t < 80 ? 1 : 1 - (t - 80) / 70;
            g.globalAlpha = alpha * 0.8; g.fillStyle = ink.c2; g.fillRect(0, -2, tip, 5);
            g.globalAlpha = alpha; g.fillStyle = '#ffffff'; g.fillRect(0, -1, tip, 2);
            g.fillStyle = ink.c1; g.fillRect(Math.max(0, tip - 18), -1, 18, 2);
        }
        for (const [x, side, far, life] of sky.sparks) {
            const age = t - x / sky.length * 80, k = age / life;
            if (age < 0 || age > life) continue;
            g.globalAlpha = 1 - k; g.fillStyle = k < 0.4 ? '#f3eaff' : ink.c2;
            g.fillRect(Math.round(x + k * 6), Math.round((side < 0 ? -1 : 1) * (2 + Math.abs(far) * k)), 2, 2);
        }
    }
    /** 틈 하나의 별, 성운, 불티, 끌려 드는 티끌 자리(씨앗으로 정해 프레임마다 같다). */
    function gashSky(length, seed, rift) {
        const r = drawRandom(777 + seed), stars = [], clouds = [], sparks = [];
        for (let i = 0; i < 70; i++) stars.push([r() * length, (r() - 0.5) * 30, r() < 0.35 ? 2 : 1, r() * 6.28, 0.6 + r() * 0.4]);
        for (let i = 0; i < 8; i++) clouds.push([length * (0.1 + 0.8 * r()), (r() - 0.5) * 12, 10 + r() * 16, ['#7a3fd0', '#3b2a9c', '#b04aa0', '#2a6fb0'][i % 4]]);
        for (let i = 0; i < 14; i++) sparks.push([r() * length, r() - 0.5, (r() - 0.5) * 40, 60 + r() * 120]);
        // 티끌: [선 위치, 시작 거리(위아래), 시작 지연, 걸리는 시간, 크기]
        const motes = rift ? [...Array(46)].map(() => [length * (-0.1 + 1.2 * r()), (r() < 0.5 ? -1 : 1) * (26 + r() * 70), r() * 260, 220 + r() * 120, r() < 0.3 ? 2 : 1]) : [];
        return { length, stars, clouds, sparks, motes, rift };
    }
    /** 끌려 드는 티끌: 틈이 열린 동안 둘레에서 틈 쪽으로 가속하며 빨려 들고, 가는 쪽 반대로 짧은 꼬리를 끈다. 닫히면 없다. */
    function gashMotes(g, sky, t) {
        const ink = drawInk('chaos');
        for (const [x, d0, wait, ms, size] of sky.motes) {
            const age = t - sky.rift.at + 40 - wait;
            if (age < 0 || age > ms || t > sky.rift.close) continue;
            const k = age / ms, ease = k * k, y = d0 * (1 - ease), xx = x + (sky.length * 0.5 - x) * 0.12 * ease;
            g.globalAlpha = Math.min(1, k * 4) * (1 - k * 0.3) * 0.85; g.fillStyle = k > 0.7 ? '#f3eaff' : (size > 1 ? ink.c1 : ink.c2);
            g.fillRect(Math.round(xx), Math.round(y), size, size);
            g.globalAlpha *= 0.5; g.fillRect(Math.round(xx), Math.round(y + Math.sign(d0) * (2 + 6 * k)), 1, Math.round(2 + 5 * k));
        }
        g.globalAlpha = 1;
    }
    /** @param {number} face 1 오른쪽, -1 왼쪽 @param {number} reach 베는 길이(도트) @param {{at:number, close:number}} rift 틈이 끌어당기기
     * 시작하는 때와 닫히는 때(ms, 2026-10-17 스킬룬 인계 v32) @returns {{life:number, paint:Function}} 주인공의 발 자리에 걸 연출:
     * 머리 높이 앞에서 시작해 reach 앞의 무릎 높이까지 비스듬히 벤다. 열린 동안 둘레의 티끌이 틈 쪽으로 가속하며 빨려 든다. */
    function gashPaint(face, reach, seed, rift) {
        const from = [14, -92], to = [reach + 26, -18], sky = gashSky(Math.hypot(to[0] - from[0], to[1] - from[1]), seed, rift), angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        return { life: 780, paint(ctx, t, dot) {
            const open = t < 60 ? 0 : t < 200 ? (t - 60) / 140 : t < 560 ? 1 : Math.max(0, 1 - (t - 560) / 220), w = 14 * Math.sin(open * Math.PI / 2);
            ctx.scale(face * dot, dot);
            ctx.translate(from[0], from[1]);
            ctx.rotate(angle);
            if (w >= 0.5) gashOpening(ctx, sky, t, w);
            gashCut(ctx, sky, t);
            if (sky.rift) gashMotes(ctx, sky, t);
        } };
    }

    // ---------------------------------------------------------------- spears
    /** 자루, 끝 장식, 슴베 고리. */
    const spearHalfInk = (ink, y) => (y < 0 ? ink.c2 : ink.c3);
    /** 물미: 자루 끝의 마름모. */
    function spearButt(px, ink, s) {
        for (let y = -3; y <= 3; y++) for (let x = 0; x <= 4; x++) {
            const d = Math.abs(y) + Math.abs(x - 2);
            if (d <= 3) px(x, s.cy + y - (y > 0 ? 1 : 0), d === 3 ? ink.rim : spearHalfInk(ink, y));
        }
    }
    /** 날밑: 자루와 날 사이의 네모. */
    function spearGuard(px, ink, s) {
        for (let y = -3; y <= 2; y++) for (let x = s.blade - 2; x <= s.blade + 1; x++) {
            const edge = y === -3 || y === 2 || x === s.blade - 2;
            px(x, s.cy + y, edge ? ink.rim : spearHalfInk(ink, y));
        }
    }
    function spearShaft(px, ink, s) {
        const upper = s.big ? drawMix(ink.c2, ink.c1, 0.3) : ink.c2;
        for (let x = 3; x < s.blade + 2; x++) { px(x, s.cy - 2, ink.rim); px(x, s.cy - 1, upper); px(x, s.cy, ink.c3); px(x, s.cy + 1, ink.rim); }
        spearButt(px, ink, s);
        spearGuard(px, ink, s);
    }
    /** 날(잎 모양): 앞 30%까지 넓어졌다가 끝으로 좁아진다. */
    function spearBlade(px, ink, s) {
        for (let x = s.blade + 2; x <= s.length; x++) {
            const k = (x - s.blade - 2) / (s.length - s.blade - 2), w = Math.max(0, Math.round(k < 0.3 ? s.half * (0.55 + 1.5 * k) : s.half * (1 - (k - 0.3) / 0.7) ** 0.85));
            for (let y = -w - 1; y <= w; y++) {
                const edge = y === -w - 1 || y === w, bright = y === -1 || (y === 0 && w <= 1);
                px(x, s.cy + y, edge ? ink.rim : bright ? ink.c1 : y < 0 ? drawMix(ink.c2, ink.c1, 0.35) : ink.c2);
            }
        }
        px(s.length + 1, s.cy - 1, ink.rim);
    }
    /** 속성 장식: 냉기는 슴베의 얼음 가시, 화염은 날 위의 불꽃, 번개는 날 둘레의 꺾임, 카오스는 떨어지는 독 방울. 두 프레임이 번갈아 움직인다. */
    const SPEAR_DECOR = Object.freeze({
        cold(px, ink, s, frame) {
            [[-1, -5], [1, -7], [3, -5], [-1, 4], [1, 6], [3, 4]].forEach(([dx, dy], i) => {
                px(s.blade + dx + frame, s.cy + dy, i % 3 === 1 ? ink.c1 : ink.c2);
                if (i % 3 === 1) px(s.blade + dx + frame, s.cy + dy + (dy < 0 ? 1 : -1), ink.c2);
            });
        },
        fire(px, ink, s, frame) {
            for (let i = 0; i < 6; i++) {
                const x = s.blade + 3 + i * Math.floor(s.head / 6), height = 2 + ((i + frame) % 3);
                for (let j = 0; j < height; j++) px(x + (j % 2 ? frame : 0), s.cy - s.half - 2 - j, j === height - 1 ? ink.c1 : ink.c2);
            }
        },
        light(px, ink, s, frame) {
            for (let x = s.blade + 1; x < s.length - 2; x += 2) { px(x, s.cy - s.half - 3, ink.c1); px(x + 1, s.cy - s.half - 3 + ((x / 2 + frame) % 2 ? 1 : -1), ink.c2); }
            for (let x = s.blade + 3; x < s.length - 4; x += 2) { px(x, s.cy + s.half + 2, ink.c2); px(x + 1, s.cy + s.half + 2 + ((x / 2 + frame) % 2 ? -1 : 1), ink.c1); }
        },
        chaos(px, ink, s, frame) {
            [[4, 0], [9, 1], [13, 0]].forEach(([dx, drop], i) => {
                const long = 2 + ((i + frame) % 2);
                for (let j = 0; j < long; j++) px(s.blade + dx, s.cy + s.half + 1 + j + drop, j === long - 1 ? ink.c1 : ink.c2);
            });
        }
    });
    function spearSprite(big, element, frame) {
        return cached(`spear|${big}|${element}|${frame}`, () => {
            const s = { big, length: big ? 84 : 64, head: big ? 26 : 19, half: big ? 6 : 4, cy: 12 }, look = drawInk(element);
            s.blade = s.length - s.head;
            const ink = { ...look, rim: drawMix(look.c3, '#000000', 0.55) }, sheet = drawCanvas(s.length + 2, 25);
            spearShaft(sheet.px, ink, s);
            spearBlade(sheet.px, ink, s);
            if (SPEAR_DECOR[element]) SPEAR_DECOR[element](sheet.px, ink, s, frame);
            return { canvas: sheet.canvas, tipX: s.length + 1, cy: s.cy };
        });
    }
    /** 창과 그 뒤의 잔상(속성 색 줄 세 가닥, 뒤로 갈수록 옅다). 붓은 창끝이 놓일 자리에 있고 오른쪽을 본다. */
    function drawSpear(g, t, element, big) {
        const ink = drawInk(element), sprite = spearSprite(big, element, Math.floor(t / 90) % 2), length = big ? 54 : 42, beat = Math.floor(t / 60);
        for (let i = 0; i < length; i += 2) {
            const alpha = 0.55 * (1 - i / length), x = -sprite.tipX + 2 - i;
            g.globalAlpha = alpha; g.fillStyle = ink.c2; g.fillRect(x, -1, 2, 2);
            if (i % 4) continue;
            g.globalAlpha = alpha * 0.7; g.fillStyle = ink.c1;
            g.fillRect(x, ((i / 4 + beat) % 3) - 4, 2, 1); g.fillRect(x - 1, 3 - ((i / 4 + beat) % 3), 2, 1);
        }
        g.globalAlpha = 1;
        g.drawImage(sprite.canvas, -sprite.tipX, -sprite.cy);
    }

    // ---------------------------------------------------------------- fangs (독니 사출)
    /** 이빨 하나의 열마다 위아래 끝: 가운데 선은 안쪽으로 휘고 끝 15%는 갈고리처럼 더 말린다. */
    function fangColumns(oy, bend, length) {
        const columns = [];
        for (let x = 0; x <= length; x++) {
            const k = x / length, hook = k > 0.82 ? ((k - 0.82) / 0.18) ** 2 * 3.5 : 0, yc = oy + bend * (6.5 * k * k + hook), w = 3.2 * (1 - k) ** 0.75 + 0.4;
            columns.push([Math.round(yc - w), Math.round(yc + w)]);
        }
        return columns;
    }
    /** 이빨 안쪽 한 점의 색: 윗면이 밝은 세 단 음영, 굵은 쪽에는 광택 줄, 끝은 밝다. */
    function fangShade(ink, spot) {
        if (spot.along > 0.9) return ink.c1;
        if (spot.thick >= 4 && spot.row === 1 && spot.along < 0.55) return '#ffffff';
        return spot.upper < 0.3 ? ink.c1 : spot.upper < 0.6 ? ink.c2 : spot.upper < 0.85 ? ink.c3 : ink.c4;
    }
    /** 뿌리 잇몸: 어두운 둥근 턱과 밝은 점. */
    function fangGum(px, ink, tooth) {
        for (let y = -4; y <= 4; y++) for (let x = -2; x <= 2; x++) {
            const far = x * x + y * y * 0.5, body = y < -1 ? ink.c2 : ink.c4;
            if (far <= 9) px(tooth.ox + x - 1, tooth.oy + y, far > 5.5 ? ink.rim : body);
        }
        px(tooth.ox - 2, tooth.oy - 2, ink.c1);
    }
    /** 이빨의 세로 한 줄: 안쪽은 명암, 바로 바깥 한 칸은 테두리. */
    function fangColumn(px, ink, tooth, x, inside) {
        const [top, bottom] = inside.columns[x - tooth.ox], thick = bottom - top + 1;
        for (let y = top - 1; y <= bottom + 1; y++) {
            if (inside(x, y)) {
                const rel = (y - top) / Math.max(1, thick - 1);
                px(x, y, fangShade(ink, { along: (x - tooth.ox) / tooth.length, thick, row: y - top, upper: tooth.bend > 0 ? rel : 1 - rel }));
            } else if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => inside(x + dx, y + dy))) px(x, y, ink.rim);
        }
    }
    function fangTooth(px, ink, tooth) {
        const columns = fangColumns(tooth.oy, tooth.bend, tooth.length), inside = (x, y) => { const c = columns[x - tooth.ox]; return !!c && y >= c[0] && y <= c[1]; };
        inside.columns = columns;
        for (let x = tooth.ox; x <= tooth.ox + tooth.length; x++) fangColumn(px, ink, tooth, x, inside);
        fangGum(px, ink, tooth);
    }
    function fangSprite(element, frame) {
        return cached(`fang|${element}|${frame}`, () => {
            const look = drawInk(element), length = 44, sheet = drawCanvas(length + 8, 44);
            const ink = { rim: drawMix(look.c3, '#000000', 0.55), c1: drawMix(look.c1, '#ffffff', 0.25), c2: look.c2, c3: drawMix(look.c3, look.c2, 0.35), c4: look.c3 };
            fangTooth(sheet.px, ink, { ox: 4, oy: 11, bend: 1, length });
            fangTooth(sheet.px, ink, { ox: 4, oy: 32, bend: -1, length });
            // 끝에 맺힌 독 방울(프레임마다 흘러내린다).
            [[4 + length, 21], [4 + length, 22]].forEach(([x, y], i) => {
                const slip = frame ? (i ? -1 : 1) : 0;
                sheet.px(x + 1, y + slip, ink.c1); sheet.px(x + 2, y + slip, look.c1); sheet.px(x + 1, y + slip + (i ? -1 : 1), ink.c2);
            });
            return { canvas: sheet.canvas, cy: 22 };
        });
    }
    /** 쌍독니와 뒤로 흐르는 옅은 독 안개. */
    function drawFangs(g, t, element) {
        const ink = drawInk(element), sprite = fangSprite(element, Math.floor(t / 90) % 2);
        for (let i = 0; i < 28; i += 2) {
            g.globalAlpha = 0.45 * (1 - i / 28); g.fillStyle = ink.c2;
            g.fillRect(-sprite.canvas.width + 2 - i, -2 + ((i / 2 + Math.floor(t / 70)) % 3), 2, 2);
        }
        g.globalAlpha = 1;
        g.drawImage(sprite.canvas, -sprite.canvas.width + 8, -sprite.cy);
    }

    // ---------------------------------------------------------------- shield, arrow, harpoon
    /** 방패 한 장: 세로축으로 도는 만큼 가로가 눌린다. back = 뒤따르는 잔상의 차례. */
    function shieldFace(g, spin, back, alpha) {
        const side = Math.cos(spin - back * 0.5), box = (x, y, w, h, colour) => { g.fillStyle = colour; g.fillRect(x, y, w, h); };
        g.save();
        g.globalAlpha = alpha;
        g.translate(-back * 22, 0);
        g.scale(1.7 * Math.max(0.12, Math.abs(side)), 1.7);
        box(-9, -13, 18, 26, '#101218'); box(-8, -12, 16, 24, side > 0 ? '#cfe2f0' : '#9fb3c6'); box(-7, -11, 14, 22, side > 0 ? '#86a8c4' : '#6c889f');
        box(-1, -10, 2, 20, '#f4f9ff'); box(-6, -1, 12, 2, '#f4f9ff'); box(-5, -10, 3, 3, '#e4f0f8');
        g.restore();
    }
    /** 방패 투척: 팽이처럼 도는 방패와 잔상 둘, 둘레를 도는 빛 넷. */
    function drawShield(g, t) {
        const spin = t / 55;
        shieldFace(g, spin, 2, 0.22); shieldFace(g, spin, 1, 0.45); shieldFace(g, spin, 0, 1);
        g.globalAlpha = 0.6; g.fillStyle = drawInk('phys').c1;
        for (let i = 0; i < 4; i++) { const a = spin * 1.3 + i * Math.PI / 2; g.fillRect(Math.round(Math.cos(a) * 26) - 1, Math.round(Math.sin(a) * 26) - 1, 2, 2); }
        g.globalAlpha = 1;
    }
    /** 네모들로 이루어진 작은 투사체: [x, y, 가로, 세로, 색]. */
    const BLOCKS = Object.freeze({
        arrow: [[-24, 0, 26, 1, '#b08858'], [2, -2, 3, 5, '#cfd3dc'], [5, -1, 2, 3, '#f1ece2'], [-26, -2, 5, 1, '#e8e2d6'], [-26, 2, 5, 1, '#e8e2d6'], [-24, -1, 4, 1, '#8a6b48'], [-24, 1, 4, 1, '#8a6b48']],
        harpoon: [[-28, 0, 28, 2, '#8a6b48'], [0, -3, 7, 8, '#c9ced8'], [7, -1, 3, 4, '#f1ece2'], [-4, -5, 3, 3, '#c9ced8'], [-4, 4, 3, 3, '#c9ced8']]
    });
    function drawBlocks(g, name) { for (const [x, y, w, h, colour] of BLOCKS[name]) { g.fillStyle = colour; g.fillRect(x, y, w, h); } }

    // ---------------------------------------------------------------- flask
    const FLASK = Object.freeze({ rim: '#0b0b0b', glassEdge: '#779186', glass: '#8da6a1', shine: '#ccf4d2' });
    /** 둥근 몸 안쪽 한 점의 색: 위쪽은 빈 유리, 아래는 속성 색 액체와 그 물결, 수면의 밝은 줄. */
    /** 병 속에서 도는 물결 두 줄 위인지. */
    function flaskSwirl(x, y) {
        const wave = (x + 1) * (x + 1) / 38 + (y - 1) * (y - 1) / 9, swirl = (x - 3) * (x - 3) / 16 + (y - 5) * (y - 5) / 4;
        return (Math.abs(wave - 1) < 0.2 && x < 4) || (Math.abs(swirl - 1) < 0.25 && x > 0);
    }
    function flaskFill(x, y, ink) {
        if (y < -8) return FLASK.glass;
        if (y === -7 && x > -7 && x < 6) return ink.c1;
        if (flaskSwirl(x, y)) return ink.mid;
        return y > 5 || x > 6 ? ink.c3 : ink.c2;
    }
    function flaskBody(px, ink, cx, cy) {
        for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) {
            const far = Math.hypot(x, y);
            if (far > 12.4) continue;
            if (far > 11.3) px(cx + x, cy + y, FLASK.rim);
            else if (far > 10.3) px(cx + x, cy + y, y < 0 ? FLASK.glassEdge : ink.c3);
            else px(cx + x, cy + y, flaskFill(x, y, ink));
        }
        for (const [x, y] of [[-7, -4], [-7, -3], [-6, -5], [-8, -2]]) px(cx + x, cy + y, FLASK.shine);
    }
    /** 목과 입구. */
    function flaskNeck(px, cx, cy) {
        for (let y = cy - 18; y < cy - 11; y++) { px(cx - 3, y, FLASK.rim); px(cx + 2, y, FLASK.rim); px(cx - 2, y, FLASK.glass); px(cx - 1, y, FLASK.shine); px(cx, y, FLASK.glass); px(cx + 1, y, FLASK.glassEdge); }
        for (let x = cx - 4; x <= cx + 3; x++) { px(x, cy - 21, FLASK.rim); px(x, cy - 18, FLASK.rim); }
        for (let y = cy - 20; y <= cy - 19; y++) {
            px(cx - 4, y, FLASK.rim); px(cx + 3, y, FLASK.rim);
            for (let x = cx - 3; x <= cx + 2; x++) px(x, y, x === cx - 2 ? FLASK.shine : FLASK.glass);
        }
    }
    function flaskSprite(element) {
        return cached('flask|' + element, () => {
            const look = drawInk(element), sheet = drawCanvas(28, 37);
            flaskBody(sheet.px, { ...look, mid: drawMix(look.c2, look.c1, 0.45) }, 14, 23);
            flaskNeck(sheet.px, 14, 23);
            return sheet.canvas;
        });
    }
    /** 던진 플라스크: 70ms마다 사분의 일씩 돈다. 붓은 플라스크의 가운데에 있다. */
    function drawFlask(g, t, element) {
        g.rotate(Math.floor(t / 70) * Math.PI / 2);
        g.drawImage(flaskSprite(element), -14, -23);
    }

    const BODIES = Object.freeze({
        spear: (g, t, element) => drawSpear(g, t, element, false), bigspear: (g, t, element) => drawSpear(g, t, element, true),
        fang: drawFangs, shield: drawShield, arrow: g => drawBlocks(g, 'arrow'), harpoon: g => drawBlocks(g, 'harpoon'), flask: drawFlask
    });
    /** 투사체의 몸을 그 자리에 그린다. @param {string} look 'spear'|'bigspear'|'fang'|'shield'|'arrow'|'harpoon'|'flask'
     * @param {{x:number,y:number,dot:number,face:number,angle?:number,t:number,element:string}} at 화면 자리, 보는 쪽, 기울기(오른쪽을 볼 때의 라디안), 날아온 시간 */
    function drawBody(ctx, look, at) {
        const body = BODIES[look];
        if (!body) return false;
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        ctx.scale(at.face * at.dot, at.dot);
        if (at.angle) ctx.rotate(at.angle);
        ctx.imageSmoothingEnabled = false;
        body(ctx, at.t, at.element);
        ctx.restore();
        return true;
    }
    return Object.freeze({ pierce: piercePaint, gash: gashPaint, body: drawBody });
})();
safeExposeGlobals({ stageSkillDraws });
