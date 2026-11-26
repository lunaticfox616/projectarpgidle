import { createStageFlaskDetail } from './stage-flask-detail.mjs';
import { createStageKiWave } from './stage-ki-wave.mjs';

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
        this.flasks = createStageFlaskDetail(deps);
        this.ki = createStageKiWave(deps);
        this.ROCK = Object.freeze({ outline: '#141210', dark: '#4a4238', mid: '#6e6456', light: '#968a76', high: '#bdb29a', crack: '#2a2420',
            rune: '#c9a65e', cork: '#8a6b48', rope: '#c9b48a', ropeDark: '#7a6448' });
        this.BODIES = Object.freeze({
            spear: (g, t, element) => this.drawSpear(g, t, element, false), bigspear: (g, t, element) => this.drawSpear(g, t, element, true),
            fang: this.drawFangs.bind(this), shield: this.drawShield.bind(this), arrow: g => this.drawBlocks(g, 'arrow'), harpoon: g => this.drawBlocks(g, 'harpoon'), flask: this.drawFlask.bind(this), emptyFlask: this.drawEmptyFlask.bind(this), rock: this.drawRock.bind(this),
            ki: (g, t, element) => this.ki.body(g, t, element)
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

    /** 던진 플라스크, 빈 플라스크, 바위 병(2026-11-26 전달본 V3.24 후속의 병 그림, modules/rendering/stage-flask-detail.mjs). 붓은 병의 가운데에 있다. */
    drawFlask(g, t, element, at) { this.flasks.draw(g, { ...at, t, element }); }

    /** 빈 플라스크: 병 위로 0.18초마다 흰 반짝임이 스친다(병 그림은 돌아도 반짝임은 그대로). */
    drawEmptyFlask(g, t, element, at) {
        this.flasks.draw(g, { ...at, t, element, style: 'empty' });
        if (Math.floor(t / 60) % 3 !== 0) return;
        g.globalAlpha = 0.9; g.fillStyle = '#f4fff6';
        g.fillRect(-10, -8, 7, 1); g.fillRect(-7, -11, 1, 7);
        g.globalAlpha = 1;
    }

    drawRock(g, t, element, at) { this.flasks.draw(g, { ...at, t, element, style: 'rock' }); }

    /** 투사체의 몸을 그 자리에 그린다. @param {string} look 'spear'|'bigspear'|'fang'|'shield'|'arrow'|'harpoon'|'flask'|'emptyFlask'|'rock'|'ki'
     * @param {{x:number,y:number,dot:number,face:number,angle?:number,t:number,element:string,progress?:number,gem?:number,style?:string}} at 화면 자리, 보는 쪽, 기울기(오른쪽을 볼 때의 라디안), 날아온 시간,
     *     플라스크는 날아간 몫(0~1)과 룬 번호 또는 병 이름(modules/rendering/stage-flask-detail.mjs) */
    drawBody(ctx, look, at) {
        const body = this.BODIES[look];
        if (!body) return false;
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        ctx.scale(at.face * at.dot, at.dot);
        if (at.angle) ctx.rotate(at.angle);
        ctx.imageSmoothingEnabled = false;
        body(ctx, at.t, at.element, at);
        ctx.restore();
        return true;
    }
}

export function createStageProjectileBodies(deps, brush) {
    const instance = new StageProjectileBodies(deps, brush);
    return Object.freeze({ body: instance.drawBody.bind(instance), rock: instance.ROCK, kiMuzzle: instance.ki.muzzle, kiImpact: instance.ki.impact });
}
