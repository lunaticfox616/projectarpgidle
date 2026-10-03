/** 세계수 아틀라스 도트 그림: 지도(js/atlas-ui.js) — 세계수 단면(나이테) 위에 지역 색을 도트 무늬로 입히고 노드 사이 길과 노드
 * 메달을 찍는다 — 그리고 패시브 갈래(js/atlas-passives-ui.js) — 작은 단면 위에 뿌리에서 뻗는 줄기와 노드 돌. 한 도트 ≈ 2 CSS px
 * (css/themes/pixel.css의 결), 흐림 없는 그림자. 그림만 그린다 — 누르기 · 읽기는 그 위의 투명한 버튼이 맡는다. 좌표는 0~100 단위.
 */
const atlasChartArt = (() => {
    const INK = [5, 4, 4], WOOD_DARK = [20, 17, 13], WOOD = [29, 24, 18], WOOD_LINE = [41, 34, 25], TRACK = [52, 43, 31];
    const BARK = [14, 11, 8], BRONZE = [93, 74, 46], BRONZE_HI = [141, 114, 73], GOLD = [217, 176, 102], GOLD_HI = [243, 210, 140];
    const SAP = [158, 128, 78], DIM = [52, 44, 32], RUN = [134, 178, 226], WELL = [16, 10, 20];
    const TICKET_COLORS = [[214, 128, 82], [126, 178, 214], [214, 198, 96], [158, 126, 206]];
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    // Disc radii (chart units): the bark ring, the pinnacle's well; medallion radii per node kind.
    const RIM = 47, BARK_IN = 44.8, WELL_R = 11, NODE_UNITS = Object.freeze({ map: 2.1, guardian: 2.6, pinnacle: 3.6 });
    const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const noise = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** A size × size dot buffer for the canvas (transparent until painted), or null where drawing is unavailable (tests). */
    function canvasBuffer(canvas, size) {
        const context = canvas && canvas.getContext && canvas.getContext('2d');
        if (!context || typeof ImageData !== 'function') return null;
        canvas.width = size;
        canvas.height = size;
        const image = new ImageData(size, size);
        const set = (x, y, rgb) => {
            if (x < 0 || y < 0 || x >= size || y >= size) return;
            image.data.set([rgb[0], rgb[1], rgb[2], 255], (y * size + x) * 4);
        };
        return { size, image, set, context, dot: 100 / size };
    }
    /** Every dot takes colorAt(x, y) (null leaves it clear). */
    function fillGround(buf, colorAt) {
        for (let y = 0; y < buf.size; y++) {
            for (let x = 0; x < buf.size; x++) {
                const color = colorAt(x, y);
                if (color) buf.set(x, y, color);
            }
        }
    }

    // ---------------------------------------------------------------- the disc: rings, regions, cracks, bark and the well
    /** Wood grain: soft light/dark growth rings that wobble a little, a finer line every fifth ring, the node tracks. */
    function woodAt({ r, angle }, buf) {
        const wobble = 0.35 * Math.sin(angle * 3 + r * 0.45) + 0.2 * Math.sin(angle * 7 - r * 0.2);
        const band = Math.floor((r + wobble) / 1.55);
        if (Math.abs(((r + wobble) % 7.75) - 0.2) < buf.dot * 0.55) return WOOD_LINE;
        if (ATLAS.chart.radii.some(radius => Math.abs(r - radius) < buf.dot * 0.5)) return TRACK;
        return band % 2 ? WOOD : WOOD_DARK;
    }
    /** Region colour laid over the grain in a 4×4 ordered dither: a muted wash, a little denser toward the rim. */
    function regionTint(color, { r, degrees, x, y }, regions) {
        const index = Math.floor((((degrees + 90 + 36) % 360) + 360) % 360 / 72) % regions.length;
        const density = (0.06 + 0.16 * r / RIM) * 1.8;
        return BAYER[(y % 4) * 4 + (x % 4)] / 16 < density ? mix(color, hex(regions[index].tint), 0.26) : color;
    }
    /** Cracks between regions and faint rays every 12°, one dot wide at any radius. */
    function crackAt(color, { r, degrees, x, y }, buf) {
        const rel = ((((degrees + 90 - 36) % 72) + 72) % 72), toBoundary = Math.min(rel, 72 - rel) * Math.PI / 180 * r;
        if (r > WELL_R && toBoundary < buf.dot * 0.6) return INK;
        const ray = (((rel % 12) + 12) % 12), toRay = Math.min(ray, 12 - ray) * Math.PI / 180 * r;
        return r > 13 && r < BARK_IN - 1 && toRay < buf.dot * 0.5 && (x + y) % 2 === 0 ? mix(color, WOOD_LINE, 0.6) : color;
    }
    function barkAt(r, x, y, buf, lit) {
        if (r > RIM - buf.dot) return lit ? BRONZE_HI : BRONZE;
        if (r < BARK_IN + buf.dot) return WOOD_LINE;
        return noise(x, y) % 7 === 0 ? mix(BARK, WOOD_LINE, 0.55) : BARK;
    }
    /** The pinnacle's well: a dark violet hollow that lightens (dithered) toward its bronze lip. */
    function wellAt(r, x, y, buf) {
        if (r > WELL_R - buf.dot) return BRONZE;
        return BAYER[(y % 4) * 4 + (x % 4)] / 16 < r / WELL_R * 0.9 ? mix(WELL, WOOD_DARK, 0.7) : WELL;
    }
    function discColor(x, y, buf, regions) {
        const c = buf.size / 2, dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy) * buf.dot;
        if (r > RIM) return null;
        if (r > BARK_IN) return barkAt(r, x, y, buf, dx + dy < 0);
        if (r < WELL_R) return wellAt(r, x, y, buf);
        const angle = Math.atan2(dy, dx), dot = { x, y, r, angle, degrees: angle * 180 / Math.PI };
        return crackAt(regionTint(woodAt(dot, buf), dot, regions), dot, buf);
    }
    const paintDisc = (buf, regions) => fillGround(buf, (x, y) => discColor(x, y, buf, regions));

    // ---------------------------------------------------------------- paths between nodes
    const toDots = (point, buf) => ({ x: Math.round(point.x / buf.dot - 0.5), y: Math.round(point.y / buf.dot - 0.5) });
    /** Dots along a straight path (Bresenham). */
    function linePoints(from, to) {
        const points = [], dx = Math.abs(to.x - from.x), dy = -Math.abs(to.y - from.y);
        const sx = from.x < to.x ? 1 : -1, sy = from.y < to.y ? 1 : -1;
        let x = from.x, y = from.y, err = dx + dy;
        for (let guard = 0; guard < 4096; guard++) {
            points.push({ x, y });
            if (x === to.x && y === to.y) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
        }
        return points;
    }
    /** Dots along a ring between two angles (the shorter way round): paths on one ring follow the ring. */
    function arcPoints(arc, buf) {
        const radius = arc.radius / buf.dot, c = buf.size / 2 - 0.5;
        let span = arc.to - arc.from;
        span = ((span + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const steps = Math.max(2, Math.ceil(Math.abs(span) * radius)), points = [];
        for (let i = 0; i <= steps; i++) {
            const angle = arc.from + span * i / steps;
            points.push({ x: Math.round(c + radius * Math.cos(angle)), y: Math.round(c + radius * Math.sin(angle)) });
        }
        return points;
    }
    const LINK_LOOK = Object.freeze({ done: { color: GOLD, shadow: true }, lit: { color: SAP, shadow: true }, dim: { color: DIM, dotted: true } });
    function paintLink(buf, link) {
        const look = LINK_LOOK[link.state] || LINK_LOOK.dim;
        const points = link.arc ? arcPoints(link.arc, buf) : linePoints(toDots(link.from, buf), toDots(link.to, buf));
        if (look.shadow) points.forEach(point => buf.set(point.x + 1, point.y + 1, INK));
        points.forEach((point, i) => { if (!look.dotted || i % 2 === 0) buf.set(point.x, point.y, look.color); });
    }
    /** Dim paths first, walked paths last (on top). */
    function paintLinks(buf, links) {
        const order = { dim: 0, lit: 1, done: 2 };
        [...links].sort((a, b) => order[a.state] - order[b.state]).forEach(link => paintLink(buf, link));
    }

    // ---------------------------------------------------------------- node medallions
    function fillCircle(buf, at, r, color) {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) buf.set(at.x + x, at.y + y, color);
        }
    }
    function ringCircle(buf, at, r, color) {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                const d = x * x + y * y;
                if (d <= r * r + r * 0.8 && d > (r - 1) * (r - 1) + (r - 1) * 0.8) buf.set(at.x + x, at.y + y, color);
            }
        }
    }
    /** Status looks: rim and face colours from the region tint. */
    const LOOKS = Object.freeze({
        locked: tint => ({ rim: mix(DIM, tint, 0.25), face: mix(WOOD_DARK, tint, 0.12), shine: mix(DIM, tint, 0.2) }),
        open: tint => ({ rim: GOLD, face: mix(WOOD, tint, 0.3), shine: mix(GOLD, tint, 0.4) }),
        complete: tint => ({ rim: mix(tint, GOLD_HI, 0.35), face: mix(tint, WOOD_DARK, 0.35), shine: mix(tint, GOLD_HI, 0.55) }),
        bonus: tint => ({ rim: GOLD_HI, face: mix(tint, WOOD_DARK, 0.25), shine: GOLD_HI })
    });
    const radiusFor = (kind, buf) => Math.max(3, Math.round((NODE_UNITS[kind] || NODE_UNITS.map) / buf.dot));
    /** A light nick on the upper-left of the face: the pixel UI's light falls from the top left. */
    function shine(buf, at, r, color) {
        for (let i = -1; i <= 1; i++) buf.set(at.x - Math.round(r * 0.45) + i, at.y - Math.round(r * 0.45) - i, color);
    }
    function paintMedallion(buf, node, regions) {
        const at = toDots(node, buf), r = radiusFor(node.kind, buf);
        const look = (LOOKS[node.status] || LOOKS.locked)(hex(regions[node.region] ? regions[node.region].tint : '#8a6a45'));
        // a guardian's outer ring sits on a dark band: paint it before the rim.
        const outer = node.kind === 'guardian' ? r + 2 : r;
        fillCircle(buf, { x: at.x + 1, y: at.y + 1 }, outer, INK);
        if (node.kind === 'guardian') { fillCircle(buf, at, outer, INK); ringCircle(buf, at, outer, look.rim); }
        fillCircle(buf, at, r, look.rim);
        fillCircle(buf, at, r - 1, look.face);
        if (node.status === 'bonus') ringCircle(buf, at, r - 2, GOLD);
        shine(buf, at, r - 1, look.shine);
        paintMarks(buf, at, outer, node);
    }
    /** Selection (bright gold) and the open map (sky blue) ring the medallion one dot apart. */
    function paintMarks(buf, at, outer, node) {
        if (node.running) ringCircle(buf, at, outer + 2, RUN);
        if (node.selected) ringCircle(buf, at, outer + (node.running ? 4 : 2), GOLD_HI);
    }
    /** The pinnacle: a dark seed in the well, bronze and gold rims, the four root tickets as pips (lit when held). */
    function paintPinnacle(buf, node, tickets) {
        const at = toDots(node, buf), r = radiusFor('pinnacle', buf);
        fillCircle(buf, { x: at.x + 1, y: at.y + 1 }, r, INK);
        fillCircle(buf, at, r, node.status === 'locked' ? BRONZE : GOLD);
        fillCircle(buf, at, r - 1, INK);
        fillCircle(buf, at, r - 2, mix(WELL, [120, 84, 150], node.status === 'locked' ? 0.12 : 0.3));
        shine(buf, at, r - 2, mix(WELL, GOLD_HI, 0.35));
        const pip = Math.max(1, Math.round(r * 0.18));
        tickets.forEach((held, i) => {
            const angle = -Math.PI / 2 + i * Math.PI / 2, x = at.x + Math.round(Math.cos(angle) * (r - 1)), y = at.y + Math.round(Math.sin(angle) * (r - 1));
            fillCircle(buf, { x, y }, pip, held ? TICKET_COLORS[i] : mix(DIM, TICKET_COLORS[i], 0.25));
        });
        paintMarks(buf, at, r, node);
    }

    /** Paints the chart at `size` × `size` dots. model: {regions, nodes:[{x,y,kind,region,status,selected,running}],
     * links:[{from,to,arc?,state}], tickets:[held×4]}. */
    function paint(canvas, size, model) {
        const buf = canvasBuffer(canvas, size);
        if (!buf) return false;
        paintDisc(buf, model.regions);
        paintLinks(buf, model.links);
        model.nodes.forEach(node => (node.kind === 'pinnacle' ? paintPinnacle(buf, node, model.tickets) : paintMedallion(buf, node, model.regions)));
        buf.context.putImageData(buf.image, 0, 0);
        return true;
    }

    // ---------------------------------------------------------------- atlas passive wheels (js/atlas-passives-ui.js)
    const WHEEL_UNITS = Object.freeze({ root: 3.6, small: 2.8, notable: 4, keystone: 4.6 });
    /** A wheel's ground: a small cross-section — growth rings, the wheel's ring tracks, its colour dithered in, a bronze rim. */
    function wheelGround(x, y, buf, model) {
        const c = buf.size / 2, r = Math.hypot(x + 0.5 - c, y + 0.5 - c) * buf.dot;
        if (r > 49) return null;
        if (r > 49 - buf.dot) return BRONZE;
        if (model.rings.some(radius => radius && Math.abs(r - radius) < buf.dot * 0.5)) return TRACK;
        const base = Math.floor(r / 2.2) % 2 ? WOOD : WOOD_DARK;
        return BAYER[(y % 4) * 4 + (x % 4)] / 16 < 0.14 + 0.16 * r / 49 ? mix(base, model.tint, 0.28) : base;
    }
    const WHEEL_LOOKS = Object.freeze({
        taken: tint => ({ rim: GOLD, face: mix(tint, WOOD_DARK, 0.15), shine: GOLD_HI }),
        open: tint => ({ rim: SAP, face: mix(WOOD, tint, 0.3), shine: mix(SAP, GOLD_HI, 0.3) }),
        locked: tint => ({ rim: mix(DIM, tint, 0.25), face: WOOD_DARK, shine: mix(DIM, tint, 0.2) })
    });
    /** Passives are round stones: notables and keystones carry an inner ring, a keystone an outer one as well. */
    function paintWheelNode(buf, node, tint) {
        const at = toDots(node, buf), r = Math.max(2, Math.round(WHEEL_UNITS[node.rank] / buf.dot));
        const look = (WHEEL_LOOKS[node.state] || WHEEL_LOOKS.locked)(tint), outer = node.rank === 'keystone' ? r + 2 : r;
        fillCircle(buf, { x: at.x + 1, y: at.y + 1 }, outer, INK);
        if (outer > r) ringCircle(buf, at, outer, look.rim);
        fillCircle(buf, at, r, look.rim);
        fillCircle(buf, at, r - 1, look.face);
        if (node.rank === 'notable' || node.rank === 'keystone') ringCircle(buf, at, r - 2, mix(look.rim, look.face, 0.55));
        shine(buf, at, r - 1, look.shine);
    }
    /** Paints one wheel at size × size dots. model: {tint:'#hex', rings:[radius…], nodes:[{x,y,rank,state}], links:[{from,to,arc?,state}]}. */
    function paintWheel(canvas, size, model) {
        const buf = canvasBuffer(canvas, size), tint = hex(model.tint);
        if (!buf) return false;
        fillGround(buf, (x, y) => wheelGround(x, y, buf, { rings: model.rings, tint }));
        paintLinks(buf, model.links);
        model.nodes.forEach(node => paintWheelNode(buf, node, tint));
        buf.context.putImageData(buf.image, 0, 0);
        return true;
    }
    return Object.freeze({ paint, paintWheel });
})();
safeExposeGlobals({ atlasChartArt });
