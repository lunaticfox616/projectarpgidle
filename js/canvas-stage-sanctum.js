/** 뿌리끝 성소의 방 (2026-10-11 사용자: "뿌리 끝 성소라는 테마에 맞게 바닥이랑 오브젝트, 문같은거 다시 만들어주고",
 * "대개는 흙바닥인데 드물게 뿌리들이 있고 약간 그런느낌"과 함께 던파의 숲 전장 한 장면을 견본으로 받았다).
 * 배경 그림을 쓰는 방(js/canvas-stage-terrain.js paintOpen) 가운데 지형의 theme이 'sanctum'인 방을 여기서 그린다.
 * - 바닥: 밟아 다져진 흙바닥의 빈터. 반듯한 판석이나 턱은 없다: 빈터의 가장자리는 들쭉날쭉하고 그 밖은 풀과 이끼가 덮은 어두운 땅이다.
 *   흙에는 얼룩과 잔돌이 있고, 가장자리를 따라 풀 포기와 돌, 고사리가 난다. 뿌리는 드물게(방에 두셋) 뒤쪽이나 옆에서 기어든다.
 *   뒤쪽에 수액이 조금 고여 있고, 빈터 밖 어둠에 빛나는 버섯이 몇 있다.
 * - 문: 잠긴 문은 가시 돋은 뿌리가 얽혀 막고, 열리면 뿌리가 걷힌다. 좌우 문은 뿌리 아치, 앞쪽 문은 낮은 뿌리 울타리,
 *   뒷문은 굴(뿌리 창살). 보스 방으로 가는 문은 썩은 붉은 뿌리다.
 * 그림 파일 없이 그리며(같은 방은 언제나 같은 그림), 색은 data/stage-view.js STAGE_BACKDROPS의 그 지형 palette에 있다. 그리기만 한다.
 */
const stageSanctum = (() => {
    const K = stageTerrain.kit, WIDE = K.WIDE, DEEP = K.DEEP, noise = K.noise, tone = K.tone;
    /** 4 × 4 ordered dither: two neighbouring tones mix in a fixed pattern, so the ground reads as painted dots and not as bands. */
    const BAYER = Object.freeze([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    const DIRT_TONES = Object.freeze([0.7, 0.84, 1, 1.13, 1.26]), WILD_TONES = Object.freeze([0.72, 0.9, 1.08, 1.3]);

    /** Smooth 0..1 noise over the dots (the same broad patches every time). size = dots a patch spans across; half that in depth. */
    function field(x, y, size, salt) {
        const fx = x / size, fy = y / (size / 2), ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const top = noise(ix, iy, salt) * (1 - sx) + noise(ix + 1, iy, salt) * sx;
        const bottom = noise(ix, iy + 1, salt) * (1 - sx) + noise(ix + 1, iy + 1, salt) * sx;
        return top * (1 - sy) + bottom * sy;
    }
    /** A flattened ellipse of dots, row by row. */
    function blob(ctx, x, y, rx, ry) {
        const cx = Math.round(x), cy = Math.round(y), tall = Math.max(1, Math.round(ry));
        for (let row = -tall; row <= tall; row++) {
            const half = Math.max(1, Math.round(rx * Math.sqrt(Math.max(0, 1 - (row * row) / (tall * tall + 0.2)))));
            ctx.fillRect(cx - half, cy + row, half * 2, 1);
        }
    }

    // ---------------------------------------------------------------- the clearing
    /** The room's floor as a clearing of trodden dirt: its bounds in dots, and where its ragged sides and front run. The edge strays
     * up to eight dots either way from the room's straight sides (an eighth of a cell): the cells one can stand on do not change. */
    function clearingOf(room) {
        const left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE, top = room.y0 * DEEP, bottom = (room.y1 + 1) * DEEP;
        const stray = (along, salt) => Math.round((field(along, 0, 52, salt) - 0.5) * 16);
        const glade = { left, right, top, bottom, leftAt: [], rightAt: [], bottomAt: [] };
        for (let y = top; y < bottom + 12; y++) { glade.leftAt[y - top] = left + stray(y * 2, 201); glade.rightAt[y - top] = right - stray(y * 2, 202); }
        for (let x = left - 12; x < right + 12; x++) glade.bottomAt[x - left + 12] = bottom + stray(x, 203);
        return glade;
    }
    function inClearing(glade, x, y) {
        const row = y - glade.top;
        if (row < 0 || row >= glade.leftAt.length || x < glade.leftAt[row] || x >= glade.rightAt[row]) return false;
        return y < glade.bottomAt[x - glade.left + 12];
    }
    /** Trodden ground beyond the clearing: the cell cut for a door, and the path that runs on from it, narrower than its cell and wavering. */
    function onPath(scene, room, x, y) {
        const cx = Math.floor(x / WIDE), cy = Math.floor(y / DEEP);
        if (cx >= room.x0 && cx <= room.x1 && cy >= room.y0 && cy <= room.y1) return false;
        if (!scene.floor(cx, cy)) return false;
        if (cy < room.y0) return true;                                             // 뒷문 자리: 굴 속
        const waver = (field(cy > room.y1 ? y * 2 : x, 0, 40, 204) - 0.5) * 8;
        return cy > room.y1 ? Math.abs(x - (cx + 0.5) * WIDE + waver) < 23 : Math.abs(y - (cy + 0.5) * DEEP + waver / 2) < 12;
    }
    /** 0 in the middle of the clearing … 1 at its edge. */
    function edgeShare(glade, x, y) {
        return Math.max(Math.abs(x - (glade.left + glade.right) / 2) / ((glade.right - glade.left) / 2), Math.abs(y - (glade.top + glade.bottom) / 2) / ((glade.bottom - glade.top) / 2));
    }
    /** Which of `count` tones a value takes at a dot (dithered). */
    function level(value, x, y, count) {
        const dither = (BAYER[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] / 16 - 0.5) * 0.9;
        return Math.max(0, Math.min(count - 1, Math.floor(value * count + dither)));
    }
    /** One colour into the four dots of a 2 × 2 block of an image's data. */
    function putBlock(data, width, at, rgb) {
        for (const index of [(at.y * width + at.x) * 4, (at.y * width + at.x + 1) * 4, ((at.y + 1) * width + at.x) * 4, ((at.y + 1) * width + at.x + 1) * 4]) {
            if (index < data.length) { data[index] = rgb[0]; data[index + 1] = rgb[1]; data[index + 2] = rgb[2]; data[index + 3] = 255; }
        }
    }
    /** The ground from the room's back edge down, two dots at a time: trodden dirt in the clearing and on the door paths (paler
     * where feet pass most, in its middle), dark overgrown ground everywhere else. */
    function paintGround(ctx, scene, room, box) {
        const area = K.dotsOf(box), glade = scene.glade, top = glade.top, width = area.w, height = area.y + area.h - top;
        const image = ctx.createImageData(width, height), data = image.data;
        const dirt = DIRT_TONES.map(k => scene.colours.dirt.map(value => Math.round(value * k))), wild = WILD_TONES.map(k => scene.colours.wild.map(value => Math.round(value * k)));
        for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
            const gx = area.x + x, gy = top + y, inside = inClearing(glade, gx, gy) || onPath(scene, room, gx, gy);
            const broad = field(gx, gy, 150, inside ? 301 : 311) - 0.5, fine = field(gx, gy, 44, inside ? 302 : 312) - 0.5;
            const rgb = inside ? dirt[level(0.45 + broad * 0.85 + fine * 0.5 + 0.12 * (1 - Math.min(1, edgeShare(glade, gx, gy)) ** 2), x, y, 5)]
                : wild[level(0.42 + broad * 0.9 + fine * 0.5, x, y, 4)];
            putBlock(data, width, { x, y }, rgb);
        }
        ctx.putImageData(image, 0, top - area.y);       // putImageData takes canvas pixels: the canvas starts at the box's corner
    }

    // ---------------------------------------------------------------- roots
    /** A root's way from a point: it wanders but keeps its heading, and thins to nothing. One point every dot and a half. */
    function rootWay(seed, from, heading, length, girth) {
        const points = [];
        let x = from.x, y = from.y, angle = heading;
        for (let i = 0; i < length; i++) {
            angle += (noise(i, seed, 81) - 0.5) * 0.55 + (heading - angle) * 0.08;
            x += Math.cos(angle) * 1.5;
            y += Math.sin(angle) * 0.75;        // depth is drawn at half
            points.push({ x, y, r: Math.max(0.5, girth * Math.pow(1 - i / length, 0.75)) });
        }
        return points;
    }
    /** A root and the smaller roots that leave it (drawn first, so the root covers where they join). */
    function rootSystem(seed, from, heading, length, girth) {
        const main = rootWay(seed, from, heading, length, girth), ways = [];
        for (const [share, turn, salt] of [[0.3, 0.8, 1], [0.52, -0.7, 2], [0.72, 0.6, 3]]) {
            const at = main[Math.floor(main.length * share)], side = noise(seed, salt, 82) > 0.5 ? 1 : -1;
            if (at.r > 1.4) ways.push(rootWay(seed * 7 + salt, at, heading + turn * side, Math.round(length * 0.45), at.r * 0.6));
        }
        ways.push(main);
        return ways;
    }
    /** A way between two points with a slow sideways wobble and an even girth (door posts, bars and weave). */
    function vine(seed, from, to, girth) {
        const length = Math.max(2, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 1.4)), points = [];
        const nx = -(to.y - from.y) / (length * 1.4), ny = (to.x - from.x) / (length * 1.4);
        for (let i = 0; i <= length; i++) {
            const t = i / length, sway = Math.sin(t * Math.PI * 2 + seed) * 1.6 * Math.sin(t * Math.PI);
            points.push({ x: from.x + (to.x - from.x) * t + nx * sway, y: from.y + (to.y - from.y) * t + ny * sway, r: girth * (0.82 + 0.18 * Math.sin(t * Math.PI)), upright: true });
        }
        return points;
    }
    /** Stamps a way as a round root: a cast shadow, a dark rim, the body, a lit strip along its upper side. dim darkens it. */
    function strokeRoot(ctx, points, palette, dim = 1) {
        const squash = point => (point.upright ? 1 : 0.62);
        const pass = (colour, grow, dx, dy, least) => {
            ctx.fillStyle = colour;
            for (const p of points) if (p.r >= least) blob(ctx, p.x + dx * p.r, p.y + dy * p.r, p.r * grow.k + grow.add, (p.r * grow.k + grow.add) * squash(p));
        };
        if (!points[0].upright) pass('rgba(8,6,5,0.34)', { k: 1, add: 0.5 }, 0.2, 0.7, 0);
        pass(tone(palette.rootDark, dim), { k: 1, add: 1 }, 0, 0, 0);
        pass(tone(palette.root, dim), { k: 1, add: 0 }, 0, 0, 0);
        pass(tone(palette.rootLight, dim), { k: 0.42, add: 0 }, -0.25, -0.4, 2);
    }
    /** Thorns along a way: a short dark spike on alternate sides every few points. */
    function thorns(ctx, points, palette) {
        ctx.fillStyle = tone(palette.rootDark, 1);
        for (let i = 3; i < points.length - 2; i += 6) {
            const p = points[i], q = points[i + 1], side = (i / 6) % 2 ? 1 : -1, nx = -(q.y - p.y), ny = q.x - p.x, n = Math.hypot(nx, ny) || 1;
            for (let step = 1; step <= 3; step++) ctx.fillRect(Math.round(p.x + nx / n * side * (p.r + step)), Math.round(p.y + ny / n * side * (p.r + step)), step < 3 ? 2 : 1, 1);
        }
    }
    /** Roots are rare: one or two down from the backdrop's foot onto the back of the floor, one in from a side, one along the front outside. */
    function roomRoots(room) {
        const glade = clearingOf(room), width = glade.right - glade.left, seeds = [], rand = (i, salt) => noise(i, room.index * 13 + salt, 85);
        const count = Math.max(1, Math.round(width / 900));
        for (let i = 0; i < count; i++) {
            seeds.push({ seed: 100 + i, from: { x: glade.left + (i + 0.3 + rand(i, 1) * 0.4) * width / count, y: glade.top - 8 }, heading: Math.PI / 2 + (rand(i, 2) - 0.5) * 1.2,
                length: 56 + Math.round(rand(i, 3) * 60), girth: 6 + rand(i, 4) * 3.5, dim: 1 });
        }
        const fromLeft = room.index % 2 === 0;
        seeds.push({ seed: 210, from: { x: fromLeft ? glade.left - 80 : glade.right + 80, y: glade.top + (glade.bottom - glade.top) * (0.3 + rand(0, 10) * 0.4) },
            heading: (fromLeft ? 0 : Math.PI) + (rand(0, 11) - 0.5) * 0.5, length: 76 + Math.round(rand(0, 12) * 30), girth: 5.5 + rand(0, 13) * 2.5, dim: 0.85 });
        seeds.push({ seed: 300, from: { x: glade.left + width * (0.2 + rand(0, 30) * 0.5), y: glade.bottom + 26 + rand(0, 31) * 14 }, heading: rand(0, 32) > 0.5 ? Math.PI + 0.12 : -0.12,
            length: 110, girth: 5.5 + rand(0, 33) * 2, dim: 0.6 });
        return seeds;
    }
    function paintRoots(ctx, room, palette) {
        for (const row of roomRoots(room)) {
            for (const way of rootSystem(row.seed + room.index * 31, row.from, row.heading, row.length, row.girth)) strokeRoot(ctx, way, palette, row.dim);
        }
    }

    // ---------------------------------------------------------------- stones, grass, ferns, sap, glowcaps
    /** A stone half sunk in the ground: shadow, dark rim, body, a lit top. at = { x, y, r, seed }: r = half width in dots
     * (a pebble from 1.5, a rock to 12). */
    function stone(ctx, at, palette) {
        const { x, y, r } = at, shade = (noise(at.seed, 3, 340) - 0.5) * 12;
        ctx.fillStyle = 'rgba(8,6,5,0.4)'; blob(ctx, x + 1, y + r * 0.35 + 1, r + 1, Math.max(1, r * 0.4));
        ctx.fillStyle = tone(palette.stone, 0.42); blob(ctx, x, y, r + 1, r * 0.62 + 1);
        ctx.fillStyle = tone(palette.stone, 0.8, shade); blob(ctx, x, y, r, r * 0.62);
        if (r < 3) return;
        ctx.fillStyle = tone(palette.stone, 1.06, shade); blob(ctx, x - r * 0.2, y - r * 0.22, r * 0.62, r * 0.3);
        ctx.fillStyle = tone(palette.stone, 1.3, shade); ctx.fillRect(Math.round(x - r * 0.45), Math.round(y - r * 0.42), Math.max(2, Math.round(r * 0.5)), 1);
    }
    /** A tuft of grass: three to five blades fanning from a dark foot. */
    function tuft(ctx, x, y, palette, seed) {
        const blades = 3 + Math.floor(noise(seed, 1, 320) * 3);
        ctx.fillStyle = tone(palette.grassDark, 1);
        ctx.fillRect(Math.round(x) - 2, Math.round(y) + 1, blades + 2, 1);
        for (let i = 0; i < blades; i++) {
            const lean = i - (blades - 1) / 2, tall = 3 + Math.floor(noise(seed, i, 321) * 4);
            ctx.fillStyle = tone(noise(seed, i, 322) > 0.6 ? palette.grassLight : palette.grass, 0.85 + noise(seed, i, 323) * 0.3);
            for (let step = 0; step < tall; step++) ctx.fillRect(Math.round(x + lean * 1.6 + lean * step * 0.35), Math.round(y) - step, 1, 1);
        }
    }
    /** A fern: fronds fanning from one foot, each a dark rib with leaflets that shorten toward its drooping tip. at = { x, y, size, seed }. */
    function fern(ctx, at, palette) {
        const { x, y, size, seed } = at, fronds = 5 + Math.floor(noise(seed, 2, 330) * 3);
        for (let f = 0; f < fronds; f++) {
            const spread = (f / (fronds - 1) - 0.5) * 2.5, length = Math.round(size * (0.7 + noise(seed, f, 331) * 0.4));
            for (let step = 0; step < length; step++) {
                const t = step / length, px = Math.round(x + Math.sin(spread) * step + spread * t * t * size * 0.35), py = Math.round(y - Math.cos(spread) * step * 0.8 + t * t * size * 0.3);
                ctx.fillStyle = tone(palette.grassDark, 1);
                ctx.fillRect(px, py, 1, 1);
                if (step % 2) continue;
                const leaf = Math.max(1, Math.round((1 - t) * 4 * Math.min(1, t * 5)));
                ctx.fillStyle = tone(step % 4 ? palette.grass : palette.grassLight, 0.82 + noise(seed + f, step, 332) * 0.2);
                ctx.fillRect(px - leaf, py - 1, leaf * 2 + 1, 1);
            }
        }
    }
    /** Pebbles scattered on the dirt, more where the broad noise gathers them, and a few tufts that took hold on it. */
    function paintLitter(ctx, scene, room) {
        const glade = scene.glade, width = glade.right - glade.left, height = glade.bottom - glade.top, palette = scene.colours;
        for (let i = 0; i < Math.round(width * height / 1300); i++) {
            const x = glade.left + Math.floor(noise(i, room.index, 350) * width), y = glade.top + 4 + Math.floor(noise(i, room.index, 351) * (height - 6));
            if (field(x, y, 110, 352) < 0.5 || !inClearing(glade, x, y)) continue;
            stone(ctx, { x, y, r: 1.5 + noise(i, room.index, 353) * 2.2, seed: i }, palette);
        }
        for (let i = 0; i < Math.round(width * height / 9000); i++) {
            const x = glade.left + 10 + Math.floor(noise(i, room.index, 354) * (width - 20)), y = glade.top + 8 + Math.floor(noise(i, room.index, 355) * (height - 12));
            if (inClearing(glade, x, y)) tuft(ctx, x, y, palette, i + 500);
        }
    }
    /** What grows and lies along the clearing's edge, just outside it: grass thick along the sides and front and thinner along
     * the back, a rock now and then, a fern here and there along the front. */
    function paintEdge(ctx, scene, room) {
        const glade = scene.glade, palette = scene.colours, rand = (i, salt) => noise(i, room.index * 7 + salt, 360);
        const dress = (x, y, i, salt) => {
            if (onPath(scene, room, x, y)) return;
            if (rand(i, salt) > 0.93) stone(ctx, { x, y, r: 4 + rand(i, salt + 1) * 7, seed: i + salt }, palette);
            else if (rand(i, salt) > 0.28) tuft(ctx, x, y, palette, i * 3 + salt);
        };
        for (let y = glade.top + 3, i = 0; y < glade.bottom; y += 5 + Math.floor(rand(i, 1) * 6), i++) {
            dress(glade.leftAt[y - glade.top] - 3 - rand(i, 2) * 12, y, i, 10);
            dress(glade.rightAt[y - glade.top] + 3 + rand(i, 3) * 12, y, i, 20);
        }
        for (let x = glade.left - 6, i = 0; x < glade.right + 6; x += 6 + Math.floor(rand(i, 4) * 7), i++) {
            dress(x, glade.bottomAt[x - glade.left + 12] + 3 + rand(i, 5) * 9, i, 30);
            if (rand(i, 6) > 0.7) dress(x, glade.top + 2 + rand(i, 7) * 5, i, 40);
        }
    }
    /** The overgrown dark beyond the clearing: scattered tufts, ferns along the front and at the sides, a few glowing caps. */
    function paintWild(ctx, scene, room, box) {
        const glade = scene.glade, palette = scene.colours, area = K.dotsOf(box), bottom = area.y + area.h, rand = (i, salt) => noise(i, room.index * 5 + salt, 370);
        for (let i = 0; i < Math.round(area.w * (bottom - glade.top) / 2600); i++) {
            const x = area.x + Math.floor(rand(i, 1) * area.w), y = glade.top + 6 + Math.floor(rand(i, 2) * (bottom - glade.top - 8));
            if (!inClearing(glade, x, y) && !onPath(scene, room, x, y)) tuft(ctx, x, y, palette, i + 900);
        }
        paintFerns(ctx, scene, room, rand);
        paintGlowcaps(ctx, glade, palette, rand);
    }
    /** Ferns along the front of the clearing, outside it, and one at each side. */
    function paintFerns(ctx, scene, room, rand) {
        const glade = scene.glade, palette = scene.colours;
        for (let x = glade.left - 60, i = 0; x < glade.right + 60; x += 150 + Math.floor(rand(i, 3) * 170), i++) {
            const y = glade.bottom + 34 + rand(i, 4) * 40;
            if (!onPath(scene, room, x, y)) fern(ctx, { x, y, size: 26 + rand(i, 5) * 16, seed: i + 40 }, palette);
        }
        for (const [x, salt] of [[glade.left - 40, 6], [glade.right + 40, 7]]) {
            fern(ctx, { x: x - rand(0, salt) * 30 + 15, y: glade.top + (glade.bottom - glade.top) * (0.45 + rand(1, salt) * 0.4), size: 24 + rand(2, salt) * 12, seed: salt }, palette);
        }
    }
    /** A few glowing caps in the dark: two at each side of the clearing and two in front of it. */
    function paintGlowcaps(ctx, glade, palette, rand) {
        const tall = glade.bottom - glade.top;
        for (let i = 0; i < 6; i++) {
            const where = i % 3, share = rand(i, 8), drop = rand(i, 9);
            if (where === 0) glowcap(ctx, glade.left - 20 - share * 60, glade.top + 14 + drop * (tall - 20), palette);
            else if (where === 1) glowcap(ctx, glade.right + 20 + share * 60, glade.top + 14 + drop * (tall - 20), palette);
            else glowcap(ctx, glade.left + share * (glade.right - glade.left), glade.bottom + 18 + drop * 30, palette);
        }
    }
    /** A little sap pooled at the back of the floor, under the trunks: amber with a pale heart and a glint. */
    function paintSap(ctx, room, palette) {
        const left = room.x0 * WIDE, width = (room.x1 - room.x0 + 1) * WIDE, top = room.y0 * DEEP, count = 1 + Math.floor(width / 1100);
        for (let i = 0; i < count; i++) {
            const x = left + 40 + noise(i, room.index, 91) * (width - 80), y = top + 8 + noise(i, room.index, 92) * 22, rx = 6 + noise(i, room.index, 93) * 8, ry = Math.max(2, rx * 0.34);
            ctx.fillStyle = 'rgba(244,213,114,0.09)'; blob(ctx, x, y, rx + 7, ry + 4);
            ctx.fillStyle = tone(palette.sapDark, 1); blob(ctx, x, y, rx + 1, ry + 1);
            ctx.fillStyle = tone(palette.sap, 1); blob(ctx, x, y, rx, ry);
            ctx.fillStyle = tone(palette.sapLight, 1); blob(ctx, x - rx * 0.25, y - ry * 0.3, rx * 0.5, Math.max(1, ry * 0.4));
            ctx.fillStyle = '#fff6cf'; ctx.fillRect(Math.round(x - rx * 0.4), Math.round(y - ry * 0.5), 2, 1);
        }
    }
    function glowcap(ctx, x, y, palette) {
        const cx = Math.round(x), cy = Math.round(y);
        ctx.fillStyle = 'rgba(143,227,200,0.10)'; blob(ctx, cx, cy - 2, 7, 4);
        ctx.fillStyle = tone(palette.cap, 0.55); ctx.fillRect(cx, cy - 2, 1, 3);
        ctx.fillStyle = tone(palette.cap, 0.8); ctx.fillRect(cx - 2, cy - 3, 5, 1);
        ctx.fillStyle = tone(palette.cap, 1.05); ctx.fillRect(cx - 1, cy - 4, 3, 1);
    }

    /** The back strip: a fence of roots along the back of the clearing, posts of uneven height with two strands between them. It
     * stands on the line where the floor meets the backdrop, so the two do not meet in one bare straight line; it opens for a back door. */
    function paintFence(ctx, scene, room, box) {
        const area = K.dotsOf(box), foot = scene.glade.top + 3, palette = scene.colours;
        const doors = scene.map.doors.filter(row => row.room === room.index && row.side === 'north').map(door => (door.cell.gx + 0.5) * WIDE);
        let last = null;
        for (let x = area.x + 12, i = 0; x < area.x + area.w - 6; i++) {
            const tall = 24 + noise(i, room.index, 380) * 22, post = doors.some(cx => Math.abs(x - cx) < 50) ? null : { x, tall };
            if (post && last) {
                for (const share of [0.4, 0.76]) strokeRoot(ctx, vine(i * 5 + share * 10, { x: last.x, y: foot - last.tall * share }, { x, y: foot - tall * share }, 2.1), palette, 0.8);
            }
            if (post) strokeRoot(ctx, vine(i * 3 + 1, { x, y: foot }, { x: x + (noise(i, 1, 381) - 0.5) * 6, y: foot - tall }, 3.3), palette, 0.9);
            last = post;
            x += 34 + noise(i, room.index, 382) * 26;
        }
    }

    // ---------------------------------------------------------------- the room
    /** @param {object} look the biome's backdrop row (data/stage-view.js STAGE_BACKDROPS): look.palette holds this theme's colours */
    function paint(map, room, box, look) {
        const canvas = document.createElement('canvas'), paths = K.pathCells(map, room, box), palette = Object.fromEntries(Object.entries(look.palette).map(([name, hex]) => [name, K.rgbOf(hex)]));
        const scene = { map, box, glade: clearingOf(room), floor: (x, y) => K.isFloor(map, x, y) || paths.has(x + ',' + y), colours: { ...palette, rim: K.rgbOf(look.rim), hollow: K.rgbOf(look.hollow) } };
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d'), ground = stageBackdrop.layer(map, 'ground'), back = stageBackdrop.layer(map, 'back');
        ctx.imageSmoothingEnabled = false;
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        // 층마다 그림이 있으면 그 그림을, 없으면 코드로 그린 임시 그림을 쓴다.
        if (ground) tileStrip(ctx, box, ground, { foot: null, top: scene.glade.top });
        else paintGround(ctx, scene, room, box);
        if (back) tileStrip(ctx, box, back, { foot: scene.glade.top + (back.spec.sink || 0), top: null });
        for (const door of map.doors.filter(row => row.room === room.index && row.side === 'north')) K.paintHollow(ctx, door, room, scene.colours);
        if (!back) paintFence(ctx, scene, room, box);
        if (ground) shadeBeyond(ctx, scene, box);
        else paintGrown(ctx, scene, room, box);
        K.paintOpenShade(ctx, scene, room, paths);
        return canvas;
    }
    /** What the coded ground carries besides its dirt: growth beyond the clearing, pebbles, the rare roots, the edge, sap. */
    function paintGrown(ctx, scene, room, box) {
        paintWild(ctx, scene, room, box);
        paintLitter(ctx, scene, room);
        paintRoots(ctx, room, scene.colours);
        paintEdge(ctx, scene, room);
        paintSap(ctx, room, scene.colours);
    }
    /** A layer picture repeated left to right across the room's picture, at places counted from the map's left edge (so it does
     * not shift between rooms). It is drawn layer.spec.tall dots high: hung from `top` (the ground) or stood on `foot` (the back strip). */
    function tileStrip(ctx, box, layer, place) {
        const area = K.dotsOf(box), tall = layer.spec.tall, wide = Math.max(1, Math.round(layer.image.naturalWidth * tall / layer.image.naturalHeight));
        const y = place.top === null ? place.foot - tall : place.top;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        for (let x = Math.floor(area.x / wide) * wide; x < area.x + area.w; x += wide) ctx.drawImage(layer.image, x, y, wide, tall);
        ctx.restore();
    }
    /** With a ground picture the clearing has no edge of its own: the ground beyond the room's floor falls into shade instead. */
    function shadeBeyond(ctx, scene, box) {
        const area = K.dotsOf(box), glade = scene.glade, end = area.y + area.h;
        ctx.fillStyle = 'rgba(8,6,5,0.42)';
        ctx.fillRect(area.x, glade.top, glade.left - area.x, end - glade.top);
        ctx.fillRect(glade.right, glade.top, area.x + area.w - glade.right, end - glade.top);
        for (let i = 0; i < end - glade.bottom; i++) {
            ctx.fillStyle = `rgba(8,6,5,${Math.min(0.62, 0.2 + i * 0.012).toFixed(3)})`;
            ctx.fillRect(glade.left, glade.bottom + i, glade.right - glade.left, 1);
        }
    }

    // ---------------------------------------------------------------- doors
    const DOOR = Object.freeze({ w: 128, h: 144, ax: 64, ay: 104 });   // 문 그림 한 장의 크기와 문 칸 가운데가 놓이는 자리(도트)
    /** The ways of a door's roots by side: frame (always there) and weave (only while it is locked). */
    const GATES = Object.freeze({
        north(seed) {
            const foot = DOOR.ay + 16, bars = [-2, -1, 0, 1, 2].map(i => vine(seed + i, { x: DOOR.ax + i * 14, y: foot - 96 + Math.abs(i) * Math.abs(i) * 7 }, { x: DOOR.ax + i * 15, y: foot }, 3.2));
            return { frame: [], weave: [...bars, vine(seed + 7, { x: DOOR.ax - 34, y: foot - 44 }, { x: DOOR.ax + 34, y: foot - 62 }, 2.4), vine(seed + 8, { x: DOOR.ax - 32, y: foot - 74 }, { x: DOOR.ax + 33, y: foot - 28 }, 2.2)] };
        },
        side(seed) {
            const back = { x: DOOR.ax + 10, y: DOOR.ay - 13 }, front = { x: DOOR.ax - 10, y: DOOR.ay + 13 }, tall = 66;
            const frame = [vine(seed, back, { x: back.x + 2, y: back.y - tall }, 4), vine(seed + 3, { x: back.x + 3, y: back.y - tall + 2 }, { x: front.x - 2, y: front.y - tall - 4 }, 4.2),
                vine(seed + 1, front, { x: front.x - 2, y: front.y - tall }, 4.8)];
            const weave = [[0.16, 0.86], [0.42, 0.52], [0.7, 0.2], [0.9, 0.62]].map(([a, b], i) => vine(seed + 10 + i, { x: back.x + 1, y: back.y - tall * a }, { x: front.x - 1, y: front.y - tall * b }, 2.6));
            return { frame, weave };
        },
        south(seed) {
            const line = DOOR.ay - 16, frame = [vine(seed, { x: DOOR.ax - 36, y: line + 2 }, { x: DOOR.ax - 38, y: line - 24 }, 4.6), vine(seed + 1, { x: DOOR.ax + 36, y: line + 2 }, { x: DOOR.ax + 38, y: line - 22 }, 4.6)];
            const weave = [vine(seed + 4, { x: DOOR.ax - 36, y: line - 6 }, { x: DOOR.ax + 36, y: line - 14 }, 2.8), vine(seed + 5, { x: DOOR.ax - 36, y: line - 17 }, { x: DOOR.ax + 36, y: line - 5 }, 2.6),
                ...[-18, 0, 18].map((dx, i) => vine(seed + 6 + i, { x: DOOR.ax + dx, y: line + 2 }, { x: DOOR.ax + dx + 2, y: line - 20 }, 2.4))];
            return { frame, weave };
        }
    });
    /** One picture of a door: its frame, and its weave of thorned roots while locked. Left-side doors are the mirror of right-side ones. */
    function gatePicture(door, palette, locked) {
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), kind = door.side === 'east' || door.side === 'west' ? 'side' : door.side;
        canvas.width = DOOR.w;
        canvas.height = DOOR.h;
        if (door.side === 'west') { ctx.translate(DOOR.w, 0); ctx.scale(-1, 1); }
        const ways = GATES[kind](door.id * 17 + 3);
        for (const way of ways.frame) strokeRoot(ctx, way, palette);
        if (!locked) return canvas;
        for (const way of ways.weave) { strokeRoot(ctx, way, palette); thorns(ctx, way, palette); }
        return canvas;
    }
    /** @returns {Map<number,{locked:HTMLCanvasElement,open:HTMLCanvasElement}>} door id → its two pictures (js/canvas-stage-rooms.js draws them) */
    function doorPictures(map, room, look) {
        const pictures = new Map(), plain = Object.fromEntries(Object.entries(look.palette).map(([name, hex]) => [name, K.rgbOf(hex)]));
        const rotten = { ...plain, root: K.rgbOf(look.palette.rot), rootLight: K.rgbOf(look.palette.rotLight), rootDark: K.rgbOf(look.palette.rotDark) };
        for (const door of map.doors.filter(row => row.room === room.index)) {
            const palette = door.gate ? rotten : plain;
            pictures.set(door.id, { locked: gatePicture(door, palette, true), open: gatePicture(door, palette, false) });
        }
        return pictures;
    }
    return Object.freeze({ paint, doorPictures, DOOR });
})();
safeExposeGlobals({ stageSanctum });
