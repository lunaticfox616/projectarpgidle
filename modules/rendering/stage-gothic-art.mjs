class StageGothicArt {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.TAU = Math.PI * 2;
        this.WIDE = this.K.WIDE;
        this.DEEP = this.K.DEEP;
        this.clamp = v => Math.max(0, Math.min(1, v));
        this.snap = v => Math.round(v / 2) * 2;
        this.NAMES = Object.freeze(['bell', 'chandelier', 'bolt', 'gavel', 'censer', 'incense']);
        this.BELL_PARTS = Object.freeze(['bell-body', 'bell-clapper']);
        this.pictures = {};
        this.built = null;
        this.canvas = (w, h) => { const c = this.deps.document.createElement('canvas'); c.width = w; c.height = h; return c; };
        this.image = name => this.pictures[name].source;
        this.GEMS = Object.freeze([50, 51, 80, 89, 90, 91]);
    }

    /** 그림을 연다(처음 부를 때 한 번). 기존 여섯 장이 준비되면 새 종 부품의 로딩 중에도 그릴 수 있다. */
    openGothicPictures() {
        if (this.pictures.bell) return;
        for (const name of [...this.NAMES, ...this.BELL_PARTS, 'time-sword']) this.pictures[name] = this.deps.stagePictures.openPicture(`assets/stage-vfx/gothic/${name}.png`);
    }

    /** 납작한 고리 모양(바깥 테, 중간, 안쪽 빛 세 색). */
    ringMask(colours) {
        const c = this.canvas(128, 64), g = c.getContext('2d');
        for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
            const d = Math.hypot((x - 63.5) / 62, (y - 31.5) / 30);
            if (d > 1 || d < 0.89) continue;
            g.fillStyle = colours[d > 0.975 ? 0 : d > 0.94 ? 1 : 2];
            g.fillRect(x, y, 1, 1);
        }
        return c;
    }

    shadowMask() {
        const c = this.canvas(64, 24), g = c.getContext('2d');
        g.fillStyle = '#15111c';
        for (let y = 0; y < 24; y++) { const w = Math.floor(30 * Math.sqrt(Math.max(0, 1 - ((y - 11.5) / 11.5) ** 2))); g.fillRect(32 - w, y, w * 2, 1); }
        return c;
    }

    /** 그림 한 장을 기울인 자세 하나. frame: { size: 캔버스 [w, h], pivot: 축 자리, at: 축에서 그릴 자리, w, h: 그릴 크기 }. */
    tilted(image, frame, angle) {
        const c = this.canvas(frame.size[0], frame.size[1]), g = c.getContext('2d');
        g.imageSmoothingEnabled = false; g.translate(frame.pivot[0], frame.pivot[1]); g.rotate(angle * Math.PI / 180);
        g.drawImage(image, frame.at[0], frame.at[1], frame.w || image.width, frame.h || image.height);
        return c;
    }

    buildGothicSprites() {
        const src = name => this.pictures[name].source, chandelier = src('chandelier');
        this.built = {
            gold: this.ringMask(['#4c392b', '#d2aa65', '#f2d69c']), fire: this.ringMask(['#613a2c', '#cb743b', '#edb45c']), ivory: this.ringMask(['#554636', '#c5a06b', '#ead8a4']),
            shadow: this.shadowMask(),
            bell: [-12, -8, -4, 0, 4, 8, 12].map(a => this.tilted(src('bell'), { size: [112, 96], pivot: [56, 10], at: [-32, -4], w: 64, h: 72 }, a)),
            // 부서진 샹들리에의 여섯 조각: 그림 그대로를 겹치지 않게 자른 것.
            pieces: [[0, 20, 32, 30], [32, 0, 32, 38], [64, 20, 32, 30], [0, 50, 32, 30], [32, 38, 32, 42], [64, 50, 32, 30]].map(r => {
                const c = this.canvas(r[2], r[3]);
                c.getContext('2d').drawImage(chandelier, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
                return { image: c, rect: r };
            }),
            censer: [-60, -40, -20, 0, 20, 40, 60].map(a => this.tilted(src('censer'), { size: [64, 64], pivot: [32, 32], at: [-16, -22], w: 32, h: 40 }, a)),
            gavels: new Map()
        };
    }

    /** 그림이 다 왔는가(처음 부르면 열기 시작한다). */
    gothicReady() {
        this.openGothicPictures();
        if (this.built) return true;
        if (!this.NAMES.every(name => this.pictures[name].ready)) return false;
        this.buildGothicSprites();
        return true;
    }

    /** 원점 가운데의 납작한 고리나 그림자(a, b: 가로, 세로 반지름). */
    oval(ctx, mask, a, b, alpha) {
        if (a < 2 || b < 1 || alpha <= 0) return;
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= alpha;
        ctx.drawImage(mask, this.snap(-a), this.snap(-b), Math.max(2, this.snap(a * 2)), Math.max(2, this.snap(b * 2)));
        ctx.restore();
    }

    /** from [x, y]에서 move [dx, dy]만큼 늘어선 점 여섯. */
    streak(ctx, from, move, colour, alpha) {
        ctx.globalAlpha = alpha; ctx.fillStyle = colour;
        for (let j = 0; j < 6; j++) { const q = j / 5; ctx.fillRect(this.snap(from[0] + move[0] * q), this.snap(from[1] + move[1] * q), 2, 2); }
    }

    pixelLine(ctx, [x0, y0], [x1, y1], colour, thick = 2) {
        ctx.fillStyle = colour;
        const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2);
        for (let i = 0; i <= n; i++) { const u = n ? i / n : 0; ctx.fillRect(this.snap(x0 + (x1 - x0) * u), this.snap(y0 + (y1 - y0) * u), thick, thick); }
    }

    /** (x, 0) 가운데의 점 고리(a, b: 가로, 세로 반지름). */
    dotRing(ctx, x, a, b, alpha) {
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha; ctx.fillStyle = '#d4b784';
        for (let j = 0; j < 48; j++) { const q = j / 48 * this.TAU; ctx.fillRect(this.snap(x + Math.cos(q) * a), this.snap(Math.sin(q) * b), 4, 2); }
    }

    /** 붓(도트 배율)의 원점에서 캔버스 위 끝까지(도트, 음수). */
    screenTop(ctx) { const m = ctx.getTransform(); return -m.f / m.d; }
}

export function createStageGothicArt(deps) {
    return new StageGothicArt(deps);
}
