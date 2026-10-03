/** 시련 함정의 실체 (js/combat.js createTrialHazard → 'trialTrapWarning', resolveTrialHazardImpact → 'trialTrap'):
 * 원소마다 바닥에서 솟는 도트 그림. 물리는 칼날 가시, 불은 불기둥, 냉기는 얼음 가시, 번개는 벼락, 카오스는 독구름.
 * 맵 그림과 같은 칸당 16점으로 그리고, 색은 다시 찍은 스킬 효과의 원소 단계(js/canvas-fx-remake.js)와 같다.
 * 바닥 부분(갈라짐, 달아오름, 서리, 문양, 독 웅덩이, 그을음)은 인물 아래에(js/canvas-battlefield.js drawBattleGroundLayer),
 * 솟는 부분은 인물 위에(drawTrialTrapGridFx) 그린다. 그림은 처음 쓸 때 한 번 만들어 둔다. 표시 전용: 피해와 시간은 그대로다.
 */
const trialTrapArt = (() => {
    const ART = 16; // art pixels per tile (the painted act maps' density)
    const STAGES = 3, WARN_FRAMES = 4, WARN_FRAME_MS = 130, IMPACT_FRAMES = 8;
    const CRACKS = Object.freeze([[[1, 11], [4, 9], [8, 10], [11, 8], [15, 9]], [[4, 9], [5, 13]], [[8, 10], [10, 14]], [[11, 8], [12, 5]], [[8, 10], [7, 6]]]);
    const RAMPS = Object.freeze({ // dark, mid, light, highlight: the re-dotted skill effects' element ramps
        phys: ['#353844', '#7f899d', '#c4d5df', '#fff3d3'], fire: ['#572c31', '#c14936', '#ff963e', '#fff1b8'],
        cold: ['#263b59', '#378cb9', '#81ddef', '#ecfffb'], light: ['#4b3e39', '#c18b3a', '#ffd35a', '#fffbc9'],
        chaos: ['#352c4d', '#8151a8', '#d093ee', '#fae4ff']
    });
    const EXTRA = Object.freeze({ crack: '#17151c', scorch: 'rgba(22,14,12,0.62)', flame: '#ffd35a', smoke: 'rgba(66,58,62,0.6)',
        frost: 'rgba(214,244,255,0.85)', bolt: '#ffffff', flash: 'rgba(255,240,170,0.55)', puddle: '#2a1f3c', venom: '#9bc35a', venomHi: '#d4ec9a' });
    let sheets = null;

    // ---------------------------------------------------------------- pixel painting
    function rng(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    /** A canvas painted dot by dot in tile coordinates: y 0..15 is the tile, negative y rises above it (rows - 16 of them). */
    function layer(rows) {
        const canvas = document.createElement('canvas');
        canvas.width = ART;
        canvas.height = rows;
        const ctx = canvas.getContext('2d'), lift = rows - ART;
        const dot = (x, y, color) => {
            const px = Math.round(x), py = Math.round(y) + lift;
            if (!color || px < 0 || px >= ART || py < 0 || py >= rows) return;
            ctx.fillStyle = color;
            ctx.fillRect(px, py, 1, 1);
        };
        return { canvas, dot };
    }
    function line(dot, from, to, color) {
        const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1);
        for (let i = 0; i <= steps; i++) dot(from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps, color);
    }
    /** Cracks with a lit lip one dot below, so they read on dark floors too. */
    function cracks(dot, count, color, lip) {
        CRACKS.slice(0, count).forEach(path => path.slice(1).forEach((point, i) => {
            if (lip) line(dot, [path[i][0], path[i][1] + 1], [point[0], point[1] + 1], lip);
            line(dot, path[i], point, color);
        }));
    }
    /** shape: [cx, cy, rx, ry] in tile art pixels; rim colours the outer ring (optional). */
    function ellipse(dot, [cx, cy, rx, ry], fill, rim) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
                if (d <= 1) dot(x, y, rim && d > 0.62 ? rim : fill);
            }
        }
    }
    /** Ordered 2×2 fade: level 0 keeps every dot, 3 keeps one in four. */
    const kept = (x, y, level) => level <= [0, 2, 3, 1][(Math.round(y) & 1) * 2 + (Math.round(x) & 1)];

    // ---------------------------------------------------------------- 물리: 칼날 가시
    // Four blades per tile: [x, ground y, height, half base, delay in frames].
    const BLADES = Object.freeze([[3, 12, 9, 1.6, 1], [6, 10, 16, 2.6, 0], [10, 11, 13, 2.2, 0], [13, 13, 8, 1.6, 1]]);
    /** A blade: lit left face, shaded right face, dark rim, bright tip and a glint down the lit edge. */
    function spike(dot, [x, groundY], height, half, ramp) {
        for (let r = 0; r < height; r++) {
            const w = Math.round(half * (1 - r / height));
            for (let dx = -w; dx <= w; dx++) {
                const edge = Math.abs(dx) === w && w > 0;
                dot(x + dx, groundY - r, edge ? ramp[0] : (dx < 0 ? ramp[2] : (dx === 0 ? ramp[1] : ramp[0])));
            }
        }
        dot(x, groundY - height + 1, ramp[3]);
        if (height > 5) line(dot, [x - 1, groundY - Math.floor(height * 0.3)], [x - 1, groundY - Math.floor(height * 0.6)], ramp[3]);
    }
    function physWarn(ground, rise, stage, frame) {
        const ramp = RAMPS.phys;
        cracks(ground.dot, 2 + stage, EXTRA.crack, ramp[1]);
        if (stage === 0) return;
        BLADES.forEach(([x, y], i) => {
            const tip = stage === 1 ? (i === 1 || i === 2 ? 1 : 0) : 2 + (i === 1 ? 1 : 0);
            if (tip) spike(rise.dot, [x, y], tip, 1, ramp);
            if (stage === 2 && (frame + i) % 2 === 0) rise.dot(x, y - tip, ramp[3]);
        });
    }
    function physImpact(ground, rise, frame) {
        const ramp = RAMPS.phys, rises = [0.45, 0.9, 1, 1, 0.95, 0.7, 0.35, 0.1];
        cracks(ground.dot, CRACKS.length, EXTRA.crack, ramp[1]);
        BLADES.forEach(([x, y, tall, half, delay]) => {
            ellipse(ground.dot, [x, y + 0.5, half + 1, 1], EXTRA.crack);
            const k = rises[Math.max(0, frame - delay)];
            if (k * tall >= 1) spike(rise.dot, [x, y], Math.round(k * tall), half, ramp);
        });
        if (frame < 3) for (let d = 0; d < 6; d++) ground.dot(8 + Math.cos(d) * (4 + frame * 2), 11 + Math.sin(d) * (1.5 + frame), ramp[2]);
    }

    // ---------------------------------------------------------------- 불: 불기둥
    function flameColor(d, t, ramp) {
        if (d > 0.82) return ramp[1];
        if (d > 0.56) return ramp[2];
        if (d > 0.28 || t > 0.6) return EXTRA.flame;
        return ramp[3];
    }
    /** shape: [cx, ground y, height, half width at the base]; frame drives the flicker. */
    function flame(dot, [cx, groundY, height, half0], frame) {
        const ramp = RAMPS.fire;
        for (let r = 0; r < height; r++) {
            const t = r / height, wobble = Math.sin(frame * 2.1 + r * 0.7) * 1.1 * t;
            const half = half0 * (1 - Math.pow(t, 1.3)) + (r < 2 ? 0.6 : 0);
            for (let x = Math.round(cx + wobble - half); x <= Math.round(cx + wobble + half); x++) {
                dot(x, groundY - r, flameColor(half > 0 ? Math.abs(x - cx - wobble) / (half + 0.01) : 0, t, ramp));
            }
        }
    }
    function fireWarn(ground, rise, stage, frame) {
        const ramp = RAMPS.fire, hot = [ramp[0], ramp[1], ramp[2]][stage];
        cracks(ground.dot, 2 + stage, hot);
        const random = rng(31 + frame * 7);
        for (let i = 0; i < 2 + stage * 2; i++) {
            const path = CRACKS[Math.floor(random() * (2 + stage))], point = path[Math.floor(random() * path.length)];
            ground.dot(point[0], point[1], stage === 2 ? EXTRA.flame : ramp[2]);
        }
        for (let i = 0; i < stage; i++) rise.dot(3 + ((i * 5 + frame * 3) % 10), 8 - ((frame + i * 2) % 4) * 2 - stage, ramp[2]);
    }
    function fireImpact(ground, rise, frame) {
        const ramp = RAMPS.fire, heights = [9, 18, 24, 22, 24, 19, 12, 5];
        ellipse(ground.dot, [8, 11, 6.5, 3.2], EXTRA.scorch);
        cracks(ground.dot, CRACKS.length, frame < 5 ? ramp[2] : ramp[0]);
        const peak = frame >= 1 && frame <= 4;
        flame(rise.dot, [8, 12, heights[frame], peak ? 5 : 4], frame);
        if (peak) flame(rise.dot, [frame % 2 ? 4 : 12, 11 - heights[frame] * 0.45, 4, 1.2], frame + 3);
        fireAfter(ground, rise, frame, heights[frame]);
    }
    /** After the peak: embers on the floor, then smoke drifting up from the flame's top. */
    function fireAfter(ground, rise, frame, height) {
        const random = rng(53 + frame);
        for (let i = 0; i < (frame >= 4 ? 4 : 0); i++) ground.dot(2 + random() * 12, 7 + random() * 7, RAMPS.fire[2]);
        if (frame >= 5) for (let i = 0; i < 6; i++) rise.dot(5 + (i * 3) % 7, 6 - height - (frame - 5) * 3 - (i % 3), EXTRA.smoke);
    }

    // ---------------------------------------------------------------- 냉기: 얼음 가시
    // Three crystals per tile: [x, ground y, height, half width].
    const CRYSTALS = Object.freeze([[4, 12, 10, 2], [8, 10, 16, 3], [12, 12, 11, 2]]);
    /** A crystal: a lit left face, a bright ridge, a cool right face, a dark rim and a pointed top. */
    function crystal(dot, [x, groundY], height, half, ramp) {
        const tipRows = Math.min(height, half + 2);
        for (let r = 0; r < height; r++) {
            const w = r < height - tipRows ? half : Math.round(half * (height - r) / tipRows);
            for (let dx = -w; dx <= w; dx++) {
                const edge = Math.abs(dx) === w && w > 0;
                dot(x + dx, groundY - r, edge ? ramp[0] : (dx < 0 ? ramp[2] : (dx === 0 ? ramp[3] : ramp[1])));
            }
        }
        dot(x, groundY - height + 1, ramp[3]);
    }
    const FROST = Object.freeze([[8, 10], [6, 9], [10, 11], [5, 12], [11, 8], [3, 10], [13, 12], [8, 13], [7, 6], [2, 13], [14, 9], [9, 4], [4, 7], [12, 14]]);
    function frostField(dot, radius, frame, ramp) {
        FROST.forEach(([x, y], i) => {
            if (Math.hypot(x - 8, y - 10) > radius) return;
            dot(x, y, EXTRA.frost);
            if (i % 3 === 0) { dot(x - 1, y, ramp[2]); dot(x + 1, y, ramp[2]); }
            if (i % 4 === frame % 4) dot(x, y - 1, ramp[3]);
        });
    }
    function coldWarn(ground, rise, stage, frame) {
        const ramp = RAMPS.cold;
        frostField(ground.dot, [3.5, 6, 9][stage], frame, ramp);
        if (stage === 2) CRYSTALS.forEach(([x, y], i) => { if ((frame + i) % 2 === 0) crystal(rise.dot, [x, y], 2, 1, ramp); });
    }
    function coldImpact(ground, rise, frame) {
        const ramp = RAMPS.cold;
        frostField(ground.dot, frame < 6 ? 9 : 6, frame, ramp);
        if (frame <= 4) {
            CRYSTALS.forEach(([x, y, tall, half]) => crystal(rise.dot, [x, y], Math.round(tall * (frame === 0 ? 0.55 : 1)), half, ramp));
            return;
        }
        // Shatter: shards fly out from the crystals and fall.
        const random = rng(77 + frame), spread = frame - 4;
        for (let i = 0; i < 21; i++) {
            const [x, y, tall] = CRYSTALS[i % 3], up = random() * tall;
            const sx = x + (random() - 0.5) * 5 * spread, sy = y - up + spread * spread * 0.9;
            rise.dot(sx, sy, [ramp[1], ramp[2], ramp[3]][i % 3]);
            if (i % 4 === 0) rise.dot(sx + 1, sy, ramp[2]);
        }
    }

    // ---------------------------------------------------------------- 번개: 벼락
    function rune(dot, lit, frame, ramp) {
        for (let i = 0; i < 12; i++) {
            if ((i + frame) % lit !== 0) continue;
            const angle = i / 12 * Math.PI * 2;
            dot(8 + Math.cos(angle) * 5.5, 10 + Math.sin(angle) * 3.2, i % 2 ? ramp[2] : ramp[3]);
        }
    }
    /** A jagged path from three tiles up to the floor: short sharp kinks, wandering a little either way. */
    function boltPath(seed, groundY) {
        const random = rng(seed), points = [[6 + Math.round(random() * 4), -48]];
        while (points[points.length - 1][1] < groundY) {
            const [x, y] = points[points.length - 1], kink = Math.round(random() * 4 + 1) * (random() < 0.5 ? -1 : 1);
            points.push([Math.max(2, Math.min(13, x + kink)), Math.min(groundY, y + 3 + Math.round(random() * 4))]);
        }
        return points;
    }
    /** A one-dot white core with a pale glow on both sides; fading, only the pale core is left. */
    function bolt(dot, points, bright, ramp) {
        points.slice(1).forEach((point, i) => {
            const from = points[i];
            if (bright) for (const dx of [-1, 1]) line(dot, [from[0] + dx, from[1]], [point[0] + dx, point[1]], ramp[2]);
            line(dot, from, point, bright ? EXTRA.bolt : ramp[3]);
        });
    }
    /** Two short forks off the bolt, flickering per frame. */
    function forks(dot, points, seed, ramp) {
        const random = rng(seed);
        for (let f = 0; f < 2; f++) {
            const start = points[2 + Math.floor(random() * (points.length - 4))], side = random() < 0.5 ? -1 : 1;
            const mid = [start[0] + side * 2, start[1] + 3], end = [mid[0] + side * (1 + Math.round(random() * 2)), mid[1] + 3];
            line(dot, start, mid, ramp[3]);
            line(dot, mid, end, ramp[2]);
        }
    }
    /** Where the bolt lands: a bright core and eight rays, flattened like the floor. */
    function burst(dot, size, ramp) {
        ellipse(dot, [8, 10, size, size * 0.5], ramp[3]);
        for (let a = 0; a < 8; a++) {
            const cos = Math.cos(a * Math.PI / 4), sin = Math.sin(a * Math.PI / 4) * 0.5;
            line(dot, [8 + cos * size, 10 + sin * size], [8 + cos * (size + 3), 10 + sin * (size + 3)], ramp[2]);
        }
    }
    function lightWarn(ground, rise, stage, frame) {
        const ramp = RAMPS.light;
        rune(ground.dot, [3, 2, 1][stage], frame, ramp);
        const random = rng(91 + frame * 13 + stage);
        for (let i = 0; i <= stage; i++) rise.dot(3 + random() * 10, 2 + random() * 9 - stage * 2, ramp[3]);
    }
    /** variant: one of three bolt shapes, picked per cell, so a line of strikes never repeats one silhouette. */
    function lightImpact(ground, rise, frame, variant) {
        const ramp = RAMPS.light, path = boltPath([17, 29, 43][variant], 10);
        if (frame <= 2) burst(ground.dot, 4 - frame, ramp);
        else {
            for (let a = 0; a < 8; a++) line(ground.dot, [8, 10], [8 + Math.cos(a * Math.PI / 4) * 5, 10 + Math.sin(a * Math.PI / 4) * 2.5], EXTRA.crack);
            rune(ground.dot, frame < 6 ? 1 : 2, frame, ramp);
        }
        if (frame <= 1) bolt(rise.dot, path, frame === 0, ramp);
        if (frame === 0) forks(rise.dot, path, 5 + variant, ramp);
        const random = rng(37 + frame);
        for (let i = 0; i < (frame >= 1 ? 6 : 0); i++) rise.dot(8 + (random() - 0.5) * (frame + 4) * 1.6, 10 - random() * (8 - frame), i % 2 ? ramp[3] : ramp[2]);
    }

    // ---------------------------------------------------------------- 카오스: 독구름
    function bubble(dot, x, y, phase, ramp) {
        if (phase === 0) return dot(x, y, EXTRA.venomHi);
        if (phase === 3) { dot(x - 1, y - 1, ramp[3]); dot(x + 1, y - 1, ramp[3]); return; }
        const r = phase === 1 ? 1 : 1.6;
        for (let a = 0; a < 8; a++) dot(x + Math.cos(a * Math.PI / 4) * r, y + Math.sin(a * Math.PI / 4) * r, a === 5 || a === 6 ? ramp[3] : ramp[1]);
    }
    function chaosWarn(ground, rise, stage, frame) {
        const ramp = RAMPS.chaos, random = rng(5 + stage);
        ellipse(ground.dot, [8, 11, 3.5 + stage * 1.6, 2 + stage * 0.6], EXTRA.puddle, ramp[0]);
        for (let i = 0; i <= stage; i++) bubble(ground.dot, 5 + random() * 6, 10 + random() * 2, (frame + i) % 4, ramp);
        if (stage === 2) rise.dot(6 + (frame * 3) % 5, 6 - frame, EXTRA.venom);
    }
    /** A soft puff: lit top, body, shaded underside, no rim; its edge is dithered so the cloud reads as air, not a ball. */
    /** shape: [cx, cy, radius]. */
    function puff(dot, [cx, cy, r], fade, ramp) {
        for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
            for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
                const d = Math.hypot(x - cx, (y - cy) * 1.15);
                if (d > r || !kept(x, y, d > r - 1.3 ? Math.min(3, fade + 1) : fade)) continue;
                const tilt = (x - cx) * 0.6 + (y - cy);
                dot(x, y, tilt < -r * 0.45 ? ramp[3] : (tilt < -r * 0.05 ? ramp[2] : (tilt < r * 0.55 ? ramp[1] : ramp[0])));
            }
        }
    }
    // The poison cloud is the chaos ramp muted toward grey: the skill ramp's bright lilac reads as a solid ball, not a fog.
    const FOG = Object.freeze(['#2e2840', '#5a4a78', '#8a74ab', '#c3b2df']);
    const PUFFS = Object.freeze([[-3, 1, 2], [3, 0, 2], [0, -3, 2], [6, -3, 0], [-5, -2, 0]]);
    function chaosImpact(ground, rise, frame) {
        const ramp = RAMPS.chaos, fade = Math.max(0, frame - 4);
        if (fade < 3) ellipse(ground.dot, [8, 11, 6.7, 3.2], EXTRA.puddle, ramp[0]);
        PUFFS.forEach(([dx, dy, size], i) => {
            const r = Math.min(5.5, 2 + frame * 0.6 + size * 0.5);
            puff(rise.dot, [8 + dx + Math.sin(frame * 0.8 + i) * 0.8, 9 + dy - frame * 1.3, r], fade, FOG);
        });
        for (let i = 0; i < 4 && fade < 2; i++) rise.dot(4 + i * 3, 6 - frame * 1.3 - (i % 2) * 3, i % 2 ? EXTRA.venomHi : EXTRA.venom);
    }

    // ---------------------------------------------------------------- sheets and drawing
    const STYLES = Object.freeze({
        phys: { rows: 32, warn: physWarn, impact: physImpact }, fire: { rows: 40, warn: fireWarn, impact: fireImpact },
        cold: { rows: 32, warn: coldWarn, impact: coldImpact },
        // 벼락: 칸마다 세 모양 중 하나, 칸 순서대로 빠르게 이어 떨어진다(한 줄에 똑같은 기둥이 나란히 서지 않게).
        light: { rows: 64, warn: lightWarn, impact: lightImpact, variants: 3, stagger: 0.05 },
        chaos: { rows: 32, warn: chaosWarn, impact: chaosImpact }
    });
    function paintFrame(style, paint) {
        const ground = layer(ART), rise = layer(style.rows);
        paint(ground, rise);
        return { ground: ground.canvas, rise: rise.canvas };
    }
    function buildSheet(style) {
        const warn = Array.from({ length: STAGES }, (_, stage) => Array.from({ length: WARN_FRAMES },
            (_, frame) => paintFrame(style, (ground, rise) => style.warn(ground, rise, stage, frame))));
        const impact = Array.from({ length: style.variants || 1 }, (_, variant) => Array.from({ length: IMPACT_FRAMES },
            (_, frame) => paintFrame(style, (ground, rise) => style.impact(ground, rise, frame, variant))));
        return { warn, impact };
    }
    function sheetOf(element) {
        if (!sheets) sheets = {};
        if (!sheets[element]) sheets[element] = buildSheet(STYLES[element]);
        return sheets[element];
    }
    const isTrap = fx => !!fx && (fx.type === 'trialTrapWarning' || fx.type === 'trialTrap') && Array.isArray(fx.targetCells) && !!STYLES[fx.element];
    const cellHash = cell => ((cell.gx * 73856093) ^ (cell.gy * 19349663)) >>> 0;
    /** The frame a cell shows: warnings loop and grow in three stages; an impact runs once (in the cell's own shape), rippling along the trap. */
    function frameOf(fx, progress, index, cell) {
        const sheet = sheetOf(fx.element), stagger = STYLES[fx.element].stagger || 0.02;
        if (fx.type === 'trialTrapWarning') {
            const stage = Math.min(STAGES - 1, Math.floor(progress * STAGES));
            return sheet.warn[stage][Math.floor(progress * fx.duration / WARN_FRAME_MS + index) % WARN_FRAMES];
        }
        const delayed = Math.max(0, progress - Math.min(stagger * 7, index * stagger));
        return sheet.impact[cellHash(cell) % sheet.impact.length][Math.min(IMPACT_FRAMES - 1, Math.floor(delayed * IMPACT_FRAMES))];
    }
    const flipped = cell => (cellHash(cell) >>> 1) % 2 === 1;
    function drawPart(ctx, fx, progress, gridProj, part) {
        const tile = gridProj.tileW;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = fx.type === 'trialTrapWarning' ? Math.min(1, progress * 5) : 1;
        fx.targetCells.forEach((cell, index) => {
            const image = frameOf(fx, progress, index, cell)[part], pos = gridProj.cellToScreen(cell.gx, cell.gy);
            const height = tile * image.height / ART, left = pos.x - tile / 2, top = pos.y + tile / 2 - height;
            if (!flipped(cell)) return ctx.drawImage(image, left, top, tile, height);
            ctx.save();
            ctx.translate(left + tile, top);
            ctx.scale(-1, 1);
            ctx.drawImage(image, 0, 0, tile, height);
            ctx.restore();
        });
        ctx.restore();
    }
    /** The warned cells keep a thin dotted edge in the element's colour, so the exact area reads at a glance. */
    function outline(ctx, fx, progress, gridProj) {
        const tile = gridProj.tileW, dot = tile / ART, pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.3 + pulse * 0.35;
        ctx.strokeStyle = fx.color || RAMPS[fx.element][2];
        ctx.lineWidth = Math.max(1, dot);
        ctx.setLineDash([dot * 2, dot * 2]);
        ctx.beginPath();
        fx.targetCells.forEach(cell => {
            const pos = gridProj.cellToScreen(cell.gx, cell.gy);
            ctx.rect(pos.x - tile / 2 + dot / 2, pos.y - tile / 2 + dot / 2, tile - dot, tile - dot);
        });
        ctx.stroke();
        ctx.restore();
    }
    /** Under the actors: cracks, glow, frost, rune, puddle and scorch of every live trap effect. */
    function drawGround(ctx, effects, now, gridProj) {
        if (!gridProj || !Array.isArray(effects)) return;
        for (const fx of effects) {
            if (!isTrap(fx) || now < fx.start) continue;
            drawPart(ctx, fx, Math.max(0, Math.min(1, (now - fx.start) / fx.duration)), gridProj, 'ground');
        }
    }
    /** Over the actors: what rises from the floor. @returns {boolean} false when this effect has no art (old element, boss areas). */
    function drawRise(ctx, fx, progress, gridProj, warning) {
        if (!gridProj || !isTrap(fx)) return false;
        if (warning) outline(ctx, fx, progress, gridProj);
        drawPart(ctx, fx, progress, gridProj, 'rise');
        return true;
    }
    return Object.freeze({ drawGround, drawRise, elements: Object.keys(STYLES), sheetOf });
})();
safeExposeGlobals({ trialTrapArt });
