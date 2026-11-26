/** 날아가는 플라스크의 도트 그림(2026-11-26 스킬 전달본 V3.24 후속 flask-detail.js): 병마다 실루엣, 마개, 유리 반사, 내용물을 나눠 그린다.
 * 44×46 캔버스, 병의 가운데(22, 29)가 붓의 원점이다. 내용물이 든 병은 날아가는 동안 액면이 세 장으로 흔들린다(phase 0, 1, 2).
 * 전달본은 병을 45도씩(탄성 플라스크와 바위 병은 15도, 6도씩) 돌린다. 게임은 도트가 깨지지 않게 굴러가는 병을 90도씩만 돌리고(전달본과 같은
 * 빠르기: 0.102초에 한 번), 흔들리기만 하는 탄성 플라스크와 바위 병은 세워 둔다. 그림과 색은 전달본 그대로다. */
const WIDTH = 44, HEIGHT = 46, CENTRE_X = 22, CENTRE_Y = 29, STROKE = '#16121d';
const NEUTRAL_GLASS = Object.freeze(['#26383c', '#405d5e', '#689293', '#9dc8c4', '#d9eee0']);
const LIQUID = Object.freeze({
    phys: ['#29282f', '#544954', '#8c7371', '#c4a58e'],
    fire: ['#421b26', '#833127', '#d66e35', '#f8bb62'],
    cold: ['#18283c', '#23506e', '#55aac4', '#a4e4eb'],
    light: ['#312b31', '#655436', '#b59555', '#f4d991'],
    chaos: ['#281337', '#502653', '#91519c', '#d88dd2']
});
const STYLES = Object.freeze({
    elastic: { glass: ['#2b2437', '#473956', '#76667c', '#bfafbf', '#e8d9db'],
        shell: [[16, 11], [27, 11], [27, 17], [30, 20], [35, 23], [38, 28], [38, 34], [34, 39], [28, 42], [15, 42], [8, 39], [5, 34], [5, 28], [8, 23], [13, 20], [16, 17]],
        inner: [[17, 17], [26, 17], [28, 21], [33, 24], [36, 29], [36, 33], [32, 37], [27, 40], [16, 40], [10, 37], [7, 33], [7, 29], [10, 24], [15, 21]], level: 27, contents: 'chaos' },
    fire: { shell: [[17, 10], [27, 10], [27, 16], [29, 20], [35, 27], [39, 35], [39, 40], [34, 43], [10, 43], [5, 40], [5, 35], [9, 27], [15, 20], [17, 16]],
        inner: [[18, 17], [26, 17], [28, 21], [34, 28], [37, 35], [37, 39], [33, 41], [11, 41], [7, 39], [7, 35], [10, 28], [16, 21]], level: 30, contents: 'fire' },
    frost: { glass: ['#253849', '#3d5870', '#658eab', '#a3c7d9', '#daeae9'],
        shell: [[17, 8], [27, 8], [27, 15], [31, 17], [35, 21], [35, 37], [30, 43], [13, 43], [9, 38], [9, 21], [13, 17], [17, 15]],
        inner: [[18, 15], [26, 15], [29, 18], [33, 22], [33, 36], [29, 41], [14, 41], [11, 37], [11, 22], [15, 18]], level: 26, contents: 'cold' },
    empty: { shell: [[16, 7], [28, 7], [28, 15], [32, 18], [38, 23], [41, 30], [41, 34], [38, 39], [33, 43], [10, 43], [5, 40], [2, 35], [2, 29], [5, 23], [11, 18], [16, 15]],
        inner: [[18, 13], [26, 13], [27, 17], [31, 20], [36, 24], [39, 30], [39, 34], [36, 38], [32, 41], [11, 41], [6, 38], [4, 34], [4, 30], [7, 24], [12, 20], [17, 17]], open: true },
    petrify: { glass: ['#2c3031', '#545854', '#737b67', '#adb598', '#e3e6c6'],
        shell: [[17, 9], [27, 9], [27, 17], [32, 18], [36, 22], [36, 38], [32, 42], [12, 42], [8, 38], [8, 22], [12, 18], [17, 17]],
        inner: [[17, 17], [27, 17], [28, 19], [32, 20], [34, 23], [34, 37], [31, 40], [13, 40], [10, 37], [10, 23], [14, 20], [16, 19]], level: 30, contents: 'phys' },
    static: { glass: ['#302c3a', '#504956', '#827365', '#c7b88c', '#eadbbc'],
        shell: [[17, 8], [27, 8], [27, 17], [30, 20], [37, 27], [36, 34], [31, 41], [22, 44], [13, 41], [8, 35], [7, 27], [14, 20], [17, 17]],
        inner: [[18, 17], [26, 17], [28, 21], [35, 28], [34, 34], [30, 39], [22, 42], [14, 39], [10, 34], [9, 28], [16, 21]], level: 31, contents: 'light' },
    basic: { shell: [[18, 10], [26, 10], [26, 18], [30, 21], [32, 25], [32, 38], [28, 42], [16, 42], [12, 38], [12, 25], [14, 21], [18, 18]],
        inner: [[19, 17], [25, 17], [25, 19], [28, 22], [30, 26], [30, 37], [27, 40], [17, 40], [14, 37], [14, 26], [16, 22], [19, 19]], level: 29 },
    rock: {}
});
/** 룬 번호 → 병(그 밖의 플라스크 룬과 기초 약병은 basic). */
const STYLE_BY_GEM = Object.freeze({ 44: 'elastic', 47: 'fire', 48: 'frost', 49: 'empty', 77: 'rock', 79: 'petrify', 87: 'static' });

class StageFlaskDetail {
    constructor(deps) {
        this.deps = deps;
        this.sprites = new Map();
    }

    raster() {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = WIDTH; canvas.height = HEIGHT;
        const g = canvas.getContext('2d');
        const rect = (x, y, w, h, colour) => { g.fillStyle = colour; g.fillRect(x, y, w, h); };
        const dot = (x, y, colour) => rect(x, y, 1, 1, colour);
        const line = (x0, y0, x1, y1, colour) => this.line(dot, [x0, y0, x1, y1], colour);
        const poly = (points, colour) => this.poly(rect, points, colour);
        return { canvas, g, rect, dot, line, poly };
    }

    /** 브레젠험 선. */
    line(dot, [x0, y0, x1, y1], colour) {
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let x = x0, y = y0, error = dx + dy;
        for (;;) {
            dot(x, y, colour);
            if (x === x1 && y === y1) break;
            const next = error * 2;
            if (next >= dy) { error += dy; x += sx; }
            if (next <= dx) { error += dx; y += sy; }
        }
    }

    /** 줄마다 가로지르는 점으로 채운 다각형. */
    poly(rect, points, colour) {
        for (let y = 0; y < HEIGHT; y++) {
            const hits = [], scan = y + 0.5;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const [x1, y1] = points[j], [x2, y2] = points[i];
                if ((scan < y1) !== (scan < y2)) hits.push(x1 + (x2 - x1) * (scan - y1) / (y2 - y1));
            }
            hits.sort((a, b) => a - b);
            for (let i = 0; i < hits.length; i += 2) {
                const x = Math.ceil(hits[i] - 0.5);
                rect(x, y, Math.ceil(hits[i + 1] - 0.5) - x, 1, colour);
            }
        }
    }

    /** 마개(열린 병은 없음), 테, 목. 탄성 플라스크와 번개 병은 목에 황동 띠. */
    mouth(art, glass, name, y) {
        const { rect, dot, line } = art, compact = name === 'basic', open = !!STYLES[name].open;
        const left = compact ? 17 : 16, rim = compact ? 10 : 12;
        if (!open) {
            rect(18, y - 5, 8, 8, STROKE); rect(19, y - 4, 6, 6, '#775441'); rect(20, y - 4, 4, 1, '#d2a972'); rect(19, y - 3, 3, 4, '#af804f');
            dot(21, y - 1, '#684634'); dot(24, y - 2, '#ba8b59');
        }
        rect(left - 1, y, rim + 2, 5, STROKE); rect(left, y + 1, rim, 3, glass[2]); rect(left + 1, y + 1, rim - 2, 1, glass[4]); rect(left + rim - 3, y + 2, 2, 2, glass[1]);
        if (open) { rect(left + 2, y + 1, rim - 4, 1, '#17262c'); rect(left + 3, y + 2, rim - 6, 1, '#25393e'); }
        rect(18, y + 5, 2, 4, glass[3]);
        if (name === 'elastic' || name === 'static') { line(16, y + 7, 27, y + 7, '#61463e'); line(17, y + 8, 26, y + 8, '#bd935f'); dot(19, y + 7, '#e2be83'); }
    }

    badgeElastic({ rect, dot, line, poly }) {
        poly([[8, 35], [11, 37], [17, 40], [27, 40], [34, 36], [34, 39], [28, 42], [15, 42], [8, 39]], '#503445');
        line(12, 38, 17, 40, '#c69670'); line(17, 40, 26, 40, '#b58b67');
        poly([[22, 25], [26, 28], [26, 33], [22, 36], [18, 33], [18, 28]], '#3b2337');
        poly([[22, 27], [25, 29], [24, 33], [22, 34], [20, 32], [19, 29]], '#a75b7e');
        line(20, 29, 23, 28, '#e2a4b7'); rect(21, 30, 2, 2, '#542d42');
        dot(11, 36, '#e5b085'); dot(31, 36, '#ac7462');
    }

    badgeFire({ line, poly }) {
        poly([[18, 35], [23, 25], [24, 31], [28, 30], [28, 35], [25, 39], [21, 39]], '#552b2e');
        poly([[21, 36], [24, 30], [24, 34], [26, 33], [26, 36], [23, 38]], '#f4ac5f');
        line(11, 39, 32, 39, '#b78557');
    }

    badgeFrost({ line, poly }) {
        poly([[25, 25], [30, 29], [29, 35], [24, 40], [20, 35], [21, 29]], '#31728e');
        poly([[25, 26], [27, 30], [25, 36], [22, 34], [22, 29]], '#8ac7da');
        line(24, 27, 21, 31, '#d7edf0'); line(19, 36, 16, 30, '#aacedd'); line(23, 39, 31, 37, '#67a5bc');
    }

    badgeEmpty({ line }, glass) {
        line(10, 34, 15, 38, glass[2]); line(15, 38, 28, 40, glass[2]); line(28, 40, 34, 36, glass[3]);
        line(8, 30, 10, 34, glass[3]); line(12, 37, 18, 39, glass[4]); line(30, 27, 34, 30, glass[2]); line(34, 30, 34, 34, glass[3]);
    }

    badgePetrify({ poly }) {
        poly([[13, 36], [15, 30], [20, 29], [24, 33], [22, 39], [15, 39]], '#675956'); poly([[15, 32], [20, 30], [20, 34], [16, 36]], '#aa9484');
        poly([[24, 36], [27, 30], [31, 29], [33, 33], [31, 38], [27, 40]], '#4d4649'); poly([[27, 32], [31, 30], [31, 34], [28, 36]], '#b19f8e');
    }

    badgeStatic({ dot, poly }, glass, colours) {
        poly([[23, 22], [18, 31], [22, 31], [20, 38], [28, 28], [24, 28], [26, 22]], '#b1864f');
        poly([[23, 23], [20, 30], [23, 30], [22, 34], [26, 29], [24, 29], [25, 23]], '#f8dd9d');
        dot(14, 29, colours[3]); dot(29, 35, colours[3]);
    }

    badge(art, name, glass, colours) {
        const draw = { elastic: this.badgeElastic, fire: this.badgeFire, frost: this.badgeFrost, empty: this.badgeEmpty, petrify: this.badgePetrify, static: this.badgeStatic }[name];
        if (draw) draw.call(this, art, glass, colours);
    }

    rockSprite() {
        const art = this.raster(), { line, rect, dot, poly } = art;
        poly([[17, 9], [26, 9], [28, 16], [33, 18], [38, 25], [38, 34], [32, 40], [25, 43], [14, 42], [7, 37], [5, 29], [8, 23], [14, 19], [17, 16]], '#181720');
        poly([[18, 12], [25, 12], [26, 17], [32, 20], [36, 26], [36, 33], [30, 39], [25, 41], [15, 40], [9, 36], [7, 29], [10, 24], [15, 21], [18, 17]], '#55525b');
        poly([[7, 29], [10, 24], [16, 21], [22, 20], [18, 29], [15, 34], [9, 36]], '#918784');
        poly([[18, 29], [22, 20], [31, 21], [35, 27], [27, 30], [22, 35], [16, 39], [15, 34]], '#776e6c');
        poly([[36, 28], [36, 33], [31, 38], [25, 41], [16, 40], [22, 35], [27, 30]], '#454351');
        poly([[9, 27], [15, 23], [19, 23], [14, 28], [10, 30]], '#c1aea0');
        line(14, 29, 19, 32, '#352f39'); line(19, 32, 18, 36, '#352f39'); line(31, 24, 30, 29, '#352f39'); line(30, 29, 34, 31, '#352f39');
        rect(19, 6, 6, 5, '#634735'); rect(20, 6, 4, 1, '#bb9364');
        // 줄이 병 어깨를 가로지른다(줄은 무대의 밧줄이 이어 그린다)
        line(13, 20, 29, 23, '#382c29'); line(13, 19, 29, 22, '#c09a74'); line(19, 22, 32, 20, '#94735d'); line(28, 21, 33, 18, '#bf9c7a');
        rect(20, 31, 2, 5, '#ad7f5d'); line(19, 32, 24, 32, '#b59365'); dot(21, 30, '#e2bb7c'); dot(22, 35, '#deab76');
        return art.canvas;
    }

    /** 병 안: 유리 결, 액면(흔들림 phase), 액체 층. */
    glassInside(art, spec, colours, name, phase) {
        const { poly, rect, dot, line } = art, glass = spec.glass || NEUTRAL_GLASS;
        poly([[4, 18], [16, 10], [16, 27], [13, 34], [4, 34]], glass[1]); poly([[12, 17], [21, 13], [23, 20], [19, 30], [17, 36], [12, 30]], glass[3]);
        poly([[31, 16], [44, 16], [44, 46], [18, 46], [28, 37], [32, 28]], glass[1]); poly([[38, 28], [44, 28], [44, 46], [25, 46], [36, 37]], glass[0]);
        if (!spec.level) return;
        const level = spec.level + (phase === 0 ? -2 : phase === 2 ? 2 : 0);
        const surface = [[2, level + phase * 3], [14, level + phase], [24, level - 1], [34, level + 1 - phase], [42, level + 3 - phase * 3]];
        poly([...surface, [42, 46], [2, 46]], colours[1]); poly([[5, 35], [14, 39], [28, 38], [37, 31], [43, 31], [43, 46], [5, 46]], colours[0]);
        poly([[7, 29], [14, 30], [21, 32], [21, 35], [15, 36], [11, 34]], colours[2]);
        for (let i = 1; i < surface.length; i++) line(...surface[i - 1], ...surface[i], colours[2]);
        rect(14, level + phase, 3, 1, colours[3]); rect(25, level - 1, 4, 1, colours[3]); dot(26 + phase, Math.max(level + 4, 34), colours[2]);
        if (name === 'elastic') { rect(28, level + 4, 2, 2, colours[2]); dot(28, level + 4, colours[3]); dot(12 + phase, level + 6, colours[3]); dot(16 - phase, level - 3, colours[2]); }
    }

    glassSprite(name, element, phase) {
        const art = this.raster(), spec = STYLES[name], { g, poly, dot, line } = art;
        const glass = spec.glass || NEUTRAL_GLASS, colours = LIQUID[element] || LIQUID[spec.contents] || LIQUID.phys;
        poly(spec.shell, STROKE); poly(spec.inner, glass[2]);
        g.save();
        const inside = new this.deps.Path2D();
        inside.moveTo(spec.inner[0][0], spec.inner[0][1]);
        for (const [x, y] of spec.inner.slice(1)) inside.lineTo(x, y);
        inside.closePath();
        g.clip(inside);
        this.glassInside(art, spec, colours, name, phase);
        g.restore();
        // 유리 반사는 액체와 따로, 무거운 바닥
        const x = ['basic', 'frost', 'petrify'].includes(name) ? 13 : name === 'empty' ? 7 : 9;
        line(x, 29, x + 2, 25, glass[4]); line(x + 1, 29, x + 3, 26, glass[3]); dot(x + 3, 24, glass[4]); line(16, 40, 25, 40, glass[3]); dot(26, 39, glass[2]);
        this.badge(art, name, glass, colours);
        this.mouth(art, glass, name, spec.shell[0][1]);
        return art.canvas;
    }

    styleOf(gemId) { return STYLE_BY_GEM[gemId] || 'basic'; }

    sprite(name, element, phase) {
        const key = name + '/' + element + '/' + phase;
        if (!this.sprites.has(key)) this.sprites.set(key, name === 'rock' ? this.rockSprite() : this.glassSprite(name, element, phase));
        return this.sprites.get(key);
    }

    /** 붓의 원점(병 가운데)에 그린다. at: { t 날아간 ms, element, progress 0~1, gem 룬 번호, style 병 이름(없으면 룬 번호로) }. */
    /** 액면의 흔들림 장(날아간 몫에 따라 0, 1, 2). 빈 병과 바위 병은 한 장. */
    phaseOf(name, progress) {
        const u = Math.max(0, Math.min(1, Number(progress) || 0));
        if (name === 'empty' || name === 'rock') return 1;
        return u < 0.3 ? 0 : u < 0.72 ? 1 : 2;
    }

    draw(g, at) {
        const name = at.style || this.styleOf(at.gem), spec = STYLES[name], phase = this.phaseOf(name, at.progress);
        const element = spec.level && LIQUID[at.element] ? at.element : (spec.contents || 'phys');
        const still = name === 'elastic' || name === 'rock';
        g.save();
        if (!still) g.rotate(Math.floor((at.t || 0) / 102) * Math.PI / 2);
        g.imageSmoothingEnabled = false;
        g.drawImage(this.sprite(name, element, phase), -CENTRE_X, -CENTRE_Y);
        g.restore();
    }
}

export function createStageFlaskDetail(deps) {
    const instance = new StageFlaskDetail(deps);
    return Object.freeze({ draw: instance.draw.bind(instance), styleOf: instance.styleOf.bind(instance) });
}
