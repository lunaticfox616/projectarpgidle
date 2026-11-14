import { pixelEffectLine } from './pixel-effect-math.mjs';

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

class StageProjectileBodies {
    constructor(deps, brush) {
        this.deps = deps;
        this.spearHalfInk = (ink, y) => (y < 0 ? ink.c2 : ink.c3);
        this.SPEAR_DECOR = SPEAR_DECOR;
        this.BLOCKS = Object.freeze({
            arrow: [[-24, 0, 26, 1, '#b08858'], [2, -2, 3, 5, '#cfd3dc'], [5, -1, 2, 3, '#f1ece2'], [-26, -2, 5, 1, '#e8e2d6'], [-26, 2, 5, 1, '#e8e2d6'], [-24, -1, 4, 1, '#8a6b48'], [-24, 1, 4, 1, '#8a6b48']],
            harpoon: [[-28, 0, 28, 2, '#8a6b48'], [0, -3, 7, 8, '#c9ced8'], [7, -1, 3, 4, '#f1ece2'], [-4, -5, 3, 3, '#c9ced8'], [-4, 4, 3, 3, '#c9ced8']]
        });
        this.FLASK = Object.freeze({ rim: '#0b0b0b', glassEdge: '#779186', glass: '#8da6a1', shine: '#ccf4d2' });
        this.EMPTY = Object.freeze({ OL: '#0b0b0b', RIM: '#779186', GLS: '#8da6a1', DK: '#5b726d', IN: '#a9c4bd', HI: '#ccf4d2', WH: '#f4fff6' });
        this.ROCK = Object.freeze({ outline: '#141210', dark: '#4a4238', mid: '#6e6456', light: '#968a76', high: '#bdb29a', crack: '#2a2420',
            rune: '#c9a65e', cork: '#8a6b48', rope: '#c9b48a', ropeDark: '#7a6448' });
        this.BODIES = Object.freeze({
            spear: (g, t, element) => this.drawSpear(g, t, element, false), bigspear: (g, t, element) => this.drawSpear(g, t, element, true),
            fang: this.drawFangs.bind(this), shield: this.drawShield.bind(this), arrow: g => this.drawBlocks(g, 'arrow'), harpoon: g => this.drawBlocks(g, 'harpoon'), flask: this.drawFlask.bind(this), emptyFlask: this.drawEmptyFlask.bind(this), rock: this.drawRock.bind(this)
        });
        this.brush = brush;
    }

    /** 물미: 자루 끝의 마름모. */
    spearButt(px, ink, s) {
        for (let y = -3; y <= 3; y++) for (let x = 0; x <= 4; x++) {
            const d = Math.abs(y) + Math.abs(x - 2);
            if (d <= 3) px(x, s.cy + y - (y > 0 ? 1 : 0), d === 3 ? ink.rim : this.spearHalfInk(ink, y));
        }
    }

    /** 날밑: 자루와 날 사이의 네모. */
    spearGuard(px, ink, s) {
        for (let y = -3; y <= 2; y++) for (let x = s.blade - 2; x <= s.blade + 1; x++) {
            const edge = y === -3 || y === 2 || x === s.blade - 2;
            px(x, s.cy + y, edge ? ink.rim : this.spearHalfInk(ink, y));
        }
    }

    spearShaft(px, ink, s) {
        const upper = s.big ? this.brush.drawMix(ink.c2, ink.c1, 0.3) : ink.c2;
        for (let x = 3; x < s.blade + 2; x++) { px(x, s.cy - 2, ink.rim); px(x, s.cy - 1, upper); px(x, s.cy, ink.c3); px(x, s.cy + 1, ink.rim); }
        this.spearButt(px, ink, s);
        this.spearGuard(px, ink, s);
    }

    /** 날(잎 모양): 앞 30%까지 넓어졌다가 끝으로 좁아진다. */
    spearBlade(px, ink, s) {
        for (let x = s.blade + 2; x <= s.length; x++) {
            const k = (x - s.blade - 2) / (s.length - s.blade - 2), w = Math.max(0, Math.round(k < 0.3 ? s.half * (0.55 + 1.5 * k) : s.half * (1 - (k - 0.3) / 0.7) ** 0.85));
            for (let y = -w - 1; y <= w; y++) {
                const edge = y === -w - 1 || y === w, bright = y === -1 || (y === 0 && w <= 1);
                px(x, s.cy + y, edge ? ink.rim : bright ? ink.c1 : y < 0 ? this.brush.drawMix(ink.c2, ink.c1, 0.35) : ink.c2);
            }
        }
        px(s.length + 1, s.cy - 1, ink.rim);
    }

    spearSprite(big, element, frame) {
        return this.brush.cached(`spear|${big}|${element}|${frame}`, () => {
            const s = { big, length: big ? 84 : 64, head: big ? 26 : 19, half: big ? 6 : 4, cy: 12 }, look = this.brush.drawInk(element);
            s.blade = s.length - s.head;
            const ink = { ...look, rim: this.brush.drawMix(look.c3, '#000000', 0.55) }, sheet = this.brush.drawCanvas(s.length + 2, 25);
            this.spearShaft(sheet.px, ink, s);
            this.spearBlade(sheet.px, ink, s);
            if (this.SPEAR_DECOR[element]) this.SPEAR_DECOR[element](sheet.px, ink, s, frame);
            return { canvas: sheet.canvas, tipX: s.length + 1, cy: s.cy };
        });
    }

    /** 창과 그 뒤의 잔상(속성 색 줄 세 가닥, 뒤로 갈수록 옅다). 붓은 창끝이 놓일 자리에 있고 오른쪽을 본다. */
    drawSpear(g, t, element, big) {
        const ink = this.brush.drawInk(element), sprite = this.spearSprite(big, element, Math.floor(t / 90) % 2), length = big ? 54 : 42, beat = Math.floor(t / 60);
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

    /** 이빨 하나의 열마다 위아래 끝: 가운데 선은 안쪽으로 휘고 끝 15%는 갈고리처럼 더 말린다. */
    fangColumns(oy, bend, length) {
        const columns = [];
        for (let x = 0; x <= length; x++) {
            const k = x / length, hook = k > 0.82 ? ((k - 0.82) / 0.18) ** 2 * 3.5 : 0, yc = oy + bend * (6.5 * k * k + hook), w = 3.2 * (1 - k) ** 0.75 + 0.4;
            columns.push([Math.round(yc - w), Math.round(yc + w)]);
        }
        return columns;
    }

    /** 이빨 안쪽 한 점의 색: 윗면이 밝은 세 단 음영, 굵은 쪽에는 광택 줄, 끝은 밝다. */
    fangShade(ink, spot) {
        if (spot.along > 0.9) return ink.c1;
        if (spot.thick >= 4 && spot.row === 1 && spot.along < 0.55) return '#ffffff';
        return spot.upper < 0.3 ? ink.c1 : spot.upper < 0.6 ? ink.c2 : spot.upper < 0.85 ? ink.c3 : ink.c4;
    }

    /** 뿌리 잇몸: 어두운 둥근 턱과 밝은 점. */
    fangGum(px, ink, tooth) {
        for (let y = -4; y <= 4; y++) for (let x = -2; x <= 2; x++) {
            const far = x * x + y * y * 0.5, body = y < -1 ? ink.c2 : ink.c4;
            if (far <= 9) px(tooth.ox + x - 1, tooth.oy + y, far > 5.5 ? ink.rim : body);
        }
        px(tooth.ox - 2, tooth.oy - 2, ink.c1);
    }

    /** 이빨의 세로 한 줄: 안쪽은 명암, 바로 바깥 한 칸은 테두리. */
    fangColumn(px, ink, tooth, x, inside) {
        const [top, bottom] = inside.columns[x - tooth.ox], thick = bottom - top + 1;
        for (let y = top - 1; y <= bottom + 1; y++) {
            if (inside(x, y)) {
                const rel = (y - top) / Math.max(1, thick - 1);
                px(x, y, this.fangShade(ink, { along: (x - tooth.ox) / tooth.length, thick, row: y - top, upper: tooth.bend > 0 ? rel : 1 - rel }));
            } else if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => inside(x + dx, y + dy))) px(x, y, ink.rim);
        }
    }

    fangTooth(px, ink, tooth) {
        const columns = this.fangColumns(tooth.oy, tooth.bend, tooth.length), inside = (x, y) => { const c = columns[x - tooth.ox]; return !!c && y >= c[0] && y <= c[1]; };
        inside.columns = columns;
        for (let x = tooth.ox; x <= tooth.ox + tooth.length; x++) this.fangColumn(px, ink, tooth, x, inside);
        this.fangGum(px, ink, tooth);
    }

    fangSprite(element, frame) {
        return this.brush.cached(`fang|${element}|${frame}`, () => {
            const look = this.brush.drawInk(element), length = 44, sheet = this.brush.drawCanvas(length + 8, 44);
            const ink = { rim: this.brush.drawMix(look.c3, '#000000', 0.55), c1: this.brush.drawMix(look.c1, '#ffffff', 0.25), c2: look.c2, c3: this.brush.drawMix(look.c3, look.c2, 0.35), c4: look.c3 };
            this.fangTooth(sheet.px, ink, { ox: 4, oy: 11, bend: 1, length });
            this.fangTooth(sheet.px, ink, { ox: 4, oy: 32, bend: -1, length });
            // 끝에 맺힌 독 방울(프레임마다 흘러내린다).
            [[4 + length, 21], [4 + length, 22]].forEach(([x, y], i) => {
                const slip = frame ? (i ? -1 : 1) : 0;
                sheet.px(x + 1, y + slip, ink.c1); sheet.px(x + 2, y + slip, look.c1); sheet.px(x + 1, y + slip + (i ? -1 : 1), ink.c2);
            });
            return { canvas: sheet.canvas, cy: 22 };
        });
    }

    /** 쌍독니와 뒤로 흐르는 옅은 독 안개. */
    drawFangs(g, t, element) {
        const ink = this.brush.drawInk(element), sprite = this.fangSprite(element, Math.floor(t / 90) % 2);
        for (let i = 0; i < 28; i += 2) {
            g.globalAlpha = 0.45 * (1 - i / 28); g.fillStyle = ink.c2;
            g.fillRect(-sprite.canvas.width + 2 - i, -2 + ((i / 2 + Math.floor(t / 70)) % 3), 2, 2);
        }
        g.globalAlpha = 1;
        g.drawImage(sprite.canvas, -sprite.canvas.width + 8, -sprite.cy);
    }

    /** 방패 한 장: 세로축으로 도는 만큼 가로가 눌린다. back = 뒤따르는 잔상의 차례. */
    shieldFace(g, spin, back, alpha) {
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
    drawShield(g, t) {
        const spin = t / 55;
        this.shieldFace(g, spin, 2, 0.22); this.shieldFace(g, spin, 1, 0.45); this.shieldFace(g, spin, 0, 1);
        g.globalAlpha = 0.6; g.fillStyle = this.brush.drawInk('phys').c1;
        for (let i = 0; i < 4; i++) { const a = spin * 1.3 + i * Math.PI / 2; g.fillRect(Math.round(Math.cos(a) * 26) - 1, Math.round(Math.sin(a) * 26) - 1, 2, 2); }
        g.globalAlpha = 1;
    }

    drawBlocks(g, name) { for (const [x, y, w, h, colour] of this.BLOCKS[name]) { g.fillStyle = colour; g.fillRect(x, y, w, h); } }

    /** 병 속에서 도는 물결 두 줄 위인지. */
    flaskSwirl(x, y) {
        const wave = (x + 1) * (x + 1) / 38 + (y - 1) * (y - 1) / 9, swirl = (x - 3) * (x - 3) / 16 + (y - 5) * (y - 5) / 4;
        return (Math.abs(wave - 1) < 0.2 && x < 4) || (Math.abs(swirl - 1) < 0.25 && x > 0);
    }

    flaskFill(x, y, ink) {
        if (y < -8) return this.FLASK.glass;
        if (y === -7 && x > -7 && x < 6) return ink.c1;
        if (this.flaskSwirl(x, y)) return ink.mid;
        return y > 5 || x > 6 ? ink.c3 : ink.c2;
    }

    flaskBody(px, ink, cx, cy) {
        for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) {
            const far = Math.hypot(x, y);
            if (far > 12.4) continue;
            if (far > 11.3) px(cx + x, cy + y, this.FLASK.rim);
            else if (far > 10.3) px(cx + x, cy + y, y < 0 ? this.FLASK.glassEdge : ink.c3);
            else px(cx + x, cy + y, this.flaskFill(x, y, ink));
        }
        for (const [x, y] of [[-7, -4], [-7, -3], [-6, -5], [-8, -2]]) px(cx + x, cy + y, this.FLASK.shine);
    }

    /** 목과 입구. */
    flaskNeck(px, cx, cy) {
        for (let y = cy - 18; y < cy - 11; y++) { px(cx - 3, y, this.FLASK.rim); px(cx + 2, y, this.FLASK.rim); px(cx - 2, y, this.FLASK.glass); px(cx - 1, y, this.FLASK.shine); px(cx, y, this.FLASK.glass); px(cx + 1, y, this.FLASK.glassEdge); }
        for (let x = cx - 4; x <= cx + 3; x++) { px(x, cy - 21, this.FLASK.rim); px(x, cy - 18, this.FLASK.rim); }
        for (let y = cy - 20; y <= cy - 19; y++) {
            px(cx - 4, y, this.FLASK.rim); px(cx + 3, y, this.FLASK.rim);
            for (let x = cx - 3; x <= cx + 2; x++) px(x, y, x === cx - 2 ? this.FLASK.shine : this.FLASK.glass);
        }
    }

    flaskSprite(element) {
        return this.brush.cached('flask|' + element, () => {
            const look = this.brush.drawInk(element), sheet = this.brush.drawCanvas(28, 37);
            this.flaskBody(sheet.px, { ...look, mid: this.brush.drawMix(look.c2, look.c1, 0.45) }, 14, 23);
            this.flaskNeck(sheet.px, 14, 23);
            return sheet.canvas;
        });
    }

    /** 던진 플라스크: 70ms마다 사분의 일씩 돈다. 붓은 플라스크의 가운데에 있다. */
    drawFlask(g, t, element) {
        g.rotate(Math.floor(t / 70) * Math.PI / 2);
        g.drawImage(this.flaskSprite(element), -14, -23);
    }

    emptyGlassInk(x, y, d, R) {
        if (d > R - 2.4) return x + y < -4 ? this.EMPTY.HI : (y > 3 || x > 6 ? this.EMPTY.DK : this.EMPTY.RIM);   // 유리 두께: 왼쪽 위 밝게, 오른쪽 아래 어둡게
        let c = x * 0.6 + y > 6 ? this.EMPTY.RIM : this.EMPTY.GLS;
        if (x + y > 15) c = this.EMPTY.DK;
        if (Math.abs(Math.hypot((x + 1) / 12.5, (y - 2) / 11) - 1) < 0.09 && y > -1) c = this.EMPTY.IN;   // 안쪽 뒷벽이 비치는 고리
        return y < -10 ? this.EMPTY.IN : c;
    }

    emptyFlaskNeck(px, cx, cy) {
        const top = cy - 25, bottom = cy - 15;
        for (let y = top + 2; y <= bottom; y++) [[-4, this.EMPTY.OL], [3, this.EMPTY.OL], [-3, this.EMPTY.HI], [-2, this.EMPTY.GLS], [-1, this.EMPTY.IN], [0, this.EMPTY.GLS], [1, this.EMPTY.GLS], [2, this.EMPTY.RIM]].forEach(([x, c]) => px(cx + x, y, c));
        for (let x = cx - 5; x <= cx + 4; x++) { px(x, top - 1, this.EMPTY.OL); px(x, top + 2, this.EMPTY.OL); }
        for (let y = top; y <= top + 1; y++) {
            px(cx - 5, y, this.EMPTY.OL); px(cx + 4, y, this.EMPTY.OL);
            for (let x = cx - 4; x <= cx + 3; x++) px(x, y, x === cx - 3 ? this.EMPTY.WH : x > cx + 1 ? this.EMPTY.RIM : this.EMPTY.HI);
        }
    }

    emptyFlaskSprite() {
        return this.brush.cached('emptyFlask', () => {
            const sheet = this.brush.drawCanvas(38, 50), px = sheet.px, cx = 19, cy = 32, R = 16.4;
            for (let y = -17; y <= 17; y++) for (let x = -17; x <= 17; x++) {
                const d = Math.hypot(x, y);
                if (d <= R) px(cx + x, cy + y, d > R - 1.2 ? this.EMPTY.OL : this.emptyGlassInk(x, y, d, R));
            }
            for (let a = 3.3; a < 4.4; a += 0.04) px(Math.round(cx + Math.cos(a) * 11.6), Math.round(cy + Math.sin(a) * 11.6), this.EMPTY.WH);   // 큰 흰 반사 호
            for (let a = 3.5; a < 4.1; a += 0.06) px(Math.round(cx + Math.cos(a) * 9.6), Math.round(cy + Math.sin(a) * 9.6), this.EMPTY.HI);
            [[6, 7], [7, 6], [5, 8], [8, 5]].forEach(([x, y]) => px(cx + x, cy + y, this.EMPTY.HI));   // 오른쪽 아래 작은 반사
            px(cx - 8, cy - 9, this.EMPTY.WH); px(cx - 9, cy - 8, this.EMPTY.WH);
            this.emptyFlaskNeck(px, cx, cy);
            return sheet.canvas;
        });
    }

    /** 던진 빈 플라스크: 80ms마다 사분의 일씩 돌고, 0.18초마다 병에 흰 반짝임이 스친다. */
    drawEmptyFlask(g, t) {
        g.save();
        g.rotate(Math.floor(t / 80) * Math.PI / 2);
        g.drawImage(this.emptyFlaskSprite(), -19, -32);
        g.restore();
        if (Math.floor(t / 60) % 3 !== 0) return;
        g.globalAlpha = 0.9; g.fillStyle = this.EMPTY.WH;
        g.fillRect(-10, -8, 7, 1); g.fillRect(-7, -11, 1, 7);
        g.globalAlpha = 1;
    }

    /** 바위 병: 플라스크와 같은 크기(둥근 몸 지름 23도트), 왼쪽 위에서 빛을 받는 거친 돌결(추가본의 rockFlaskSprite 그대로). */
    rockSprite() {
        return this.brush.cached('rock', () => {
            const sheet = this.brush.drawCanvas(28, 37), px = sheet.px, cx = 14, cy = 23;
            const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
            for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) {
                const d = Math.hypot(x, y) + (hash(Math.floor(x / 3), Math.floor(y / 3)) - 0.5) * 1.2;   // 울퉁불퉁한 돌 테두리
                if (d > 12.2) continue;
                if (d > 11.1) { px(cx + x, cy + y, this.ROCK.outline); continue; }
                const lit = (-x - y) / 17 + (hash(Math.floor((x + 13) / 2), Math.floor((y + 13) / 2)) - 0.5) * 0.7;   // 왼쪽 위 빛과 돌결 얼룩
                px(cx + x, cy + y, lit > 0.55 ? this.ROCK.high : lit > 0.1 ? this.ROCK.light : lit > -0.45 ? this.ROCK.mid : this.ROCK.dark);
            }
            this.rockMarks(px, cx, cy);
            return sheet.canvas;
        });
    }

    /** 갈라진 금 넷, 연성 룬 금빛 줄, 돌 병목, 코르크, 병목에 감은 줄. */
    rockMarks(px, cx, cy) {
        for (const [x0, y0, x1, y1] of [[-6, -6, -1, 1], [-1, 1, 2, 7], [4, -8, 7, -2], [-9, 3, -5, 6]]) {
            pixelEffectLine(cx + x0, cy + y0, cx + x1, cy + y1, (x, y) => px(x, y, this.ROCK.crack));
        }
        for (let i = -6; i <= 6; i++) px(cx + i, cy + 2 + Math.round(Math.sin(i / 2.2) * 1.5), this.ROCK.rune);
        for (const [x, y] of [[-3, -1], [3, 5], [0, -1]]) px(cx + x, cy + y, this.ROCK.rune);
        this.rockBox(px, { x: cx, y: cy, x0: -3, x1: 3, y0: -17, y1: -11 }, x => (Math.abs(x) === 3 ? this.ROCK.outline : x < 0 ? this.ROCK.light : this.ROCK.mid));   // 돌 병목
        this.rockBox(px, { x: cx, y: cy, x0: -2, x1: 2, y0: -21, y1: -18 }, (x, y) => (Math.abs(x) === 2 || y === -21 ? this.ROCK.outline : this.ROCK.cork));   // 코르크
        this.rockBox(px, { x: cx, y: cy, x0: -4, x1: 4, y0: -14, y1: -13 }, (x, y) => (y === -14 ? this.ROCK.rope : this.ROCK.ropeDark));   // 병목에 감은 줄
        px(cx + 4, cy - 15, this.ROCK.rope); px(cx + 5, cy - 16, this.ROCK.rope);
    }

    /** 칸 하나하나를 colourOf(x, y)의 색으로 찍는다(가운데 기준의 x0..x1, y0..y1). */
    rockBox(px, box, colourOf) {
        for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) px(box.x + x, box.y + y, colourOf(x, y));
    }

    /** 던진 바위 병: 플라스크처럼 70ms마다 사분의 일씩 돈다. */
    drawRock(g, t) {
        g.rotate(Math.floor(t / 70) * Math.PI / 2);
        g.drawImage(this.rockSprite(), -14, -23);
    }

    /** 투사체의 몸을 그 자리에 그린다. @param {string} look 'spear'|'bigspear'|'fang'|'shield'|'arrow'|'harpoon'|'flask'|'emptyFlask'|'rock'
     * @param {{x:number,y:number,dot:number,face:number,angle?:number,t:number,element:string}} at 화면 자리, 보는 쪽, 기울기(오른쪽을 볼 때의 라디안), 날아온 시간 */
    drawBody(ctx, look, at) {
        const body = this.BODIES[look];
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
}

export function createStageProjectileBodies(deps, brush) {
    const instance = new StageProjectileBodies(deps, brush);
    return Object.freeze({ body: instance.drawBody.bind(instance), rock: instance.ROCK });
}
