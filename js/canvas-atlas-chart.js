// GENERATED from modules/canvas-atlas-chart*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/atlas-chart-paint.mjs
  function canvasBuffer(runtime, canvas, size) {
    const context = canvas && canvas.getContext && canvas.getContext("2d");
    if (!context || typeof runtime.deps.ImageData !== "function") return null;
    canvas.width = size;
    canvas.height = size;
    const image = new runtime.deps.ImageData(size, size);
    const set = (x, y, rgb) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      image.data.set([rgb[0], rgb[1], rgb[2], 255], (y * size + x) * 4);
    };
    return { size, image, set, context, dot: 100 / size };
  }
  function fillGround(runtime, buf, colorAt) {
    for (let y = 0; y < buf.size; y++) {
      for (let x = 0; x < buf.size; x++) {
        const color = colorAt(x, y);
        if (color) buf.set(x, y, color);
      }
    }
  }
  function woodAt(runtime, { r, angle }, buf) {
    const wobble = 0.35 * Math.sin(angle * 3 + r * 0.45) + 0.2 * Math.sin(angle * 7 - r * 0.2);
    const band = Math.floor((r + wobble) / 1.55);
    if (Math.abs((r + wobble) % 7.75 - 0.2) < buf.dot * 0.55) return runtime.state.WOOD_LINE;
    if (runtime.deps.ATLAS.chart.radii.some((radius) => Math.abs(r - radius) < buf.dot * 0.5)) return runtime.state.TRACK;
    return band % 2 ? runtime.state.WOOD : runtime.state.WOOD_DARK;
  }
  function regionTint(runtime, color, { r, degrees, x, y }, regions) {
    const index = Math.floor(((degrees + 90 + 36) % 360 + 360) % 360 / 72) % regions.length;
    const density = (0.06 + 0.16 * r / runtime.state.RIM) * 1.8;
    return runtime.state.BAYER[y % 4 * 4 + x % 4] / 16 < density ? mix(runtime, color, hex(runtime, regions[index].tint), 0.26) : color;
  }
  function crackAt(runtime, color, { r, degrees, x, y }, buf) {
    const rel = ((degrees + 90 - 36) % 72 + 72) % 72, toBoundary = Math.min(rel, 72 - rel) * Math.PI / 180 * r;
    if (r > runtime.state.WELL_R && toBoundary < buf.dot * 0.6) return runtime.state.INK;
    const ray = (rel % 12 + 12) % 12, toRay = Math.min(ray, 12 - ray) * Math.PI / 180 * r;
    return r > 13 && r < runtime.state.BARK_IN - 1 && toRay < buf.dot * 0.5 && (x + y) % 2 === 0 ? mix(runtime, color, runtime.state.WOOD_LINE, 0.6) : color;
  }
  function createBarkPainter(runtime) {
    return function barkAt(r, x, y, buf, lit) {
      if (r > runtime.state.RIM - buf.dot) return lit ? runtime.state.BRONZE_HI : runtime.state.BRONZE;
      if (r < runtime.state.BARK_IN + buf.dot) return runtime.state.WOOD_LINE;
      return noise(runtime, x, y) % 7 === 0 ? mix(runtime, runtime.state.BARK, runtime.state.WOOD_LINE, 0.55) : runtime.state.BARK;
    };
  }
  function wellAt(runtime, r, x, y, buf) {
    if (r > runtime.state.WELL_R - buf.dot) return runtime.state.BRONZE;
    return runtime.state.BAYER[y % 4 * 4 + x % 4] / 16 < r / runtime.state.WELL_R * 0.9 ? mix(runtime, runtime.state.WELL, runtime.state.WOOD_DARK, 0.7) : runtime.state.WELL;
  }
  function discColor(runtime, x, y, buf, regions) {
    const c = buf.size / 2, dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy) * buf.dot;
    if (r > runtime.state.RIM) return null;
    if (r > runtime.state.BARK_IN) return runtime.handlers.barkAt(r, x, y, buf, dx + dy < 0);
    if (r < runtime.state.WELL_R) return wellAt(runtime, r, x, y, buf);
    const angle = Math.atan2(dy, dx), dot = { x, y, r, angle, degrees: angle * 180 / Math.PI };
    return crackAt(runtime, regionTint(runtime, woodAt(runtime, dot, buf), dot, regions), dot, buf);
  }
  function linePoints(runtime, from, to) {
    const points = [], dx = Math.abs(to.x - from.x), dy = -Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1, sy = from.y < to.y ? 1 : -1;
    let x = from.x, y = from.y, err = dx + dy;
    for (let guard = 0; guard < 4096; guard++) {
      points.push({ x, y });
      if (x === to.x && y === to.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return points;
  }
  function arcPoints(runtime, arc, buf) {
    const radius = arc.radius / buf.dot, c = buf.size / 2 - 0.5;
    let span = arc.to - arc.from;
    span = (span + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const steps = Math.max(2, Math.ceil(Math.abs(span) * radius)), points = [];
    for (let i = 0; i <= steps; i++) {
      const angle = arc.from + span * i / steps;
      points.push({ x: Math.round(c + radius * Math.cos(angle)), y: Math.round(c + radius * Math.sin(angle)) });
    }
    return points;
  }
  function paintLink(runtime, buf, link) {
    const look = runtime.state.LINK_LOOK[link.state] || runtime.state.LINK_LOOK.dim;
    const points = link.arc ? arcPoints(runtime, link.arc, buf) : linePoints(runtime, toDots(runtime, link.from, buf), toDots(runtime, link.to, buf));
    if (look.shadow) points.forEach((point) => buf.set(point.x + 1, point.y + 1, runtime.state.INK));
    points.forEach((point, i) => {
      if (!look.dotted || i % 2 === 0) buf.set(point.x, point.y, look.color);
    });
  }
  function paintLinks(runtime, buf, links) {
    const order = { dim: 0, lit: 1, done: 2 };
    [...links].sort((a, b) => order[a.state] - order[b.state]).forEach((link) => paintLink(runtime, buf, link));
  }
  function fillCircle(runtime, buf, at, r, color) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) buf.set(at.x + x, at.y + y, color);
    }
  }
  function ringCircle(runtime, buf, at, r, color) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d <= r * r + r * 0.8 && d > (r - 1) * (r - 1) + (r - 1) * 0.8) buf.set(at.x + x, at.y + y, color);
      }
    }
  }
  function shine(runtime, buf, at, r, color) {
    for (let i = -1; i <= 1; i++) buf.set(at.x - Math.round(r * 0.45) + i, at.y - Math.round(r * 0.45) - i, color);
  }
  function paintMedallion(runtime, buf, node, regions) {
    const at = toDots(runtime, node, buf), r = radiusFor(runtime, node.kind, buf);
    const look = (runtime.state.LOOKS[node.status] || runtime.state.LOOKS.locked)(hex(runtime, regions[node.region] ? regions[node.region].tint : "#8a6a45"));
    const outer = node.kind === "guardian" ? r + 2 : r;
    fillCircle(runtime, buf, { x: at.x + 1, y: at.y + 1 }, outer, runtime.state.INK);
    if (node.kind === "guardian") {
      fillCircle(runtime, buf, at, outer, runtime.state.INK);
      ringCircle(runtime, buf, at, outer, look.rim);
    }
    fillCircle(runtime, buf, at, r, look.rim);
    fillCircle(runtime, buf, at, r - 1, look.face);
    if (node.status === "bonus") ringCircle(runtime, buf, at, r - 2, runtime.state.GOLD);
    shine(runtime, buf, at, r - 1, look.shine);
    paintMarks(runtime, buf, at, outer, node);
  }
  function paintMarks(runtime, buf, at, outer, node) {
    if (node.running) ringCircle(runtime, buf, at, outer + 2, runtime.state.RUN);
    if (node.selected) ringCircle(runtime, buf, at, outer + (node.running ? 4 : 2), runtime.state.GOLD_HI);
  }
  function paintPinnacle(runtime, buf, node, tickets) {
    const at = toDots(runtime, node, buf), r = radiusFor(runtime, "pinnacle", buf);
    fillCircle(runtime, buf, { x: at.x + 1, y: at.y + 1 }, r, runtime.state.INK);
    fillCircle(runtime, buf, at, r, node.status === "locked" ? runtime.state.BRONZE : runtime.state.GOLD);
    fillCircle(runtime, buf, at, r - 1, runtime.state.INK);
    fillCircle(runtime, buf, at, r - 2, mix(runtime, runtime.state.WELL, [120, 84, 150], node.status === "locked" ? 0.12 : 0.3));
    shine(runtime, buf, at, r - 2, mix(runtime, runtime.state.WELL, runtime.state.GOLD_HI, 0.35));
    const pip = Math.max(1, Math.round(r * 0.18));
    tickets.forEach((held, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 2, x = at.x + Math.round(Math.cos(angle) * (r - 1)), y = at.y + Math.round(Math.sin(angle) * (r - 1));
      fillCircle(runtime, buf, { x, y }, pip, held ? runtime.state.TICKET_COLORS[i] : mix(runtime, runtime.state.DIM, runtime.state.TICKET_COLORS[i], 0.25));
    });
    paintMarks(runtime, buf, at, r, node);
  }
  function paint(runtime, canvas, size, model) {
    const buf = canvasBuffer(runtime, canvas, size);
    if (!buf) return false;
    if (model.flat) fillGround(runtime, buf, () => [18, 19, 24]);
    else paintDisc(runtime, buf, model.regions);
    paintLinks(runtime, buf, model.links);
    model.nodes.forEach((node) => node.kind === "pinnacle" ? paintPinnacle(runtime, buf, node, model.tickets) : paintMedallion(runtime, buf, node, model.regions));
    buf.context.putImageData(buf.image, 0, 0);
    return true;
  }
  function wheelGround(runtime, x, y, buf, model) {
    const c = buf.size / 2, r = Math.hypot(x + 0.5 - c, y + 0.5 - c) * buf.dot;
    if (r > 49) return null;
    if (r > 49 - buf.dot) return runtime.state.BRONZE;
    if (model.rings.some((radius) => radius && Math.abs(r - radius) < buf.dot * 0.5)) return runtime.state.TRACK;
    const base = Math.floor(r / 2.2) % 2 ? runtime.state.WOOD : runtime.state.WOOD_DARK;
    return runtime.state.BAYER[y % 4 * 4 + x % 4] / 16 < 0.14 + 0.16 * r / 49 ? mix(runtime, base, model.tint, 0.28) : base;
  }
  function paintWheelNode(runtime, buf, node, tint) {
    const at = toDots(runtime, node, buf), r = Math.max(2, Math.round(runtime.state.WHEEL_UNITS[node.rank] / buf.dot));
    const look = (runtime.state.WHEEL_LOOKS[node.state] || runtime.state.WHEEL_LOOKS.locked)(tint), outer = node.rank === "keystone" ? r + 2 : r;
    fillCircle(runtime, buf, { x: at.x + 1, y: at.y + 1 }, outer, runtime.state.INK);
    if (outer > r) ringCircle(runtime, buf, at, outer, look.rim);
    fillCircle(runtime, buf, at, r, look.rim);
    fillCircle(runtime, buf, at, r - 1, look.face);
    if (node.rank === "notable" || node.rank === "keystone") ringCircle(runtime, buf, at, r - 2, mix(runtime, look.rim, look.face, 0.55));
    shine(runtime, buf, at, r - 1, look.shine);
  }
  function paintWheel(runtime, canvas, size, model) {
    const buf = canvasBuffer(runtime, canvas, size), tint = hex(runtime, model.tint);
    if (!buf) return false;
    fillGround(runtime, buf, (x, y) => wheelGround(runtime, x, y, buf, { rings: model.rings, tint }));
    paintLinks(runtime, buf, model.links);
    model.nodes.forEach((node) => paintWheelNode(runtime, buf, node, tint));
    buf.context.putImageData(buf.image, 0, 0);
    return true;
  }
  function hex(runtime, value) {
    return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  }
  function mix(runtime, a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
  }
  function noise(runtime, x, y) {
    return (x * 73856093 ^ y * 19349663) >>> 0;
  }
  function paintDisc(runtime, buf, regions) {
    return fillGround(runtime, buf, (x, y) => discColor(runtime, x, y, buf, regions));
  }
  function toDots(runtime, point, buf) {
    return { x: Math.round(point.x / buf.dot - 0.5), y: Math.round(point.y / buf.dot - 0.5) };
  }
  function radiusFor(runtime, kind, buf) {
    return Math.max(3, Math.round((runtime.state.NODE_UNITS[kind] || runtime.state.NODE_UNITS.map) / buf.dot));
  }

  // modules/rendering/atlas-chart-view.mjs
  function createAtlasChartArt(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { paint, paintWheel };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.barkAt = createBarkPainter(runtime);
    runtime.api = Object.freeze({ paint: runtime.handlers.paint, paintWheel: runtime.handlers.paintWheel });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.INK = [5, 4, 4];
    runtime.state.WOOD_DARK = [20, 17, 13];
    runtime.state.WOOD = [29, 24, 18];
    runtime.state.WOOD_LINE = [41, 34, 25];
    runtime.state.TRACK = [52, 43, 31];
    runtime.state.BARK = [14, 11, 8];
    runtime.state.BRONZE = [93, 74, 46];
    runtime.state.BRONZE_HI = [141, 114, 73];
    runtime.state.GOLD = [217, 176, 102];
    runtime.state.GOLD_HI = [243, 210, 140];
    runtime.state.SAP = [158, 128, 78];
    runtime.state.DIM = [52, 44, 32];
    runtime.state.RUN = [134, 178, 226];
    runtime.state.WELL = [16, 10, 20];
    runtime.state.TICKET_COLORS = [[214, 128, 82], [126, 178, 214], [214, 198, 96], [158, 126, 206]];
    runtime.state.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    runtime.state.RIM = 47;
    runtime.state.BARK_IN = 44.8;
    runtime.state.WELL_R = 11;
    runtime.state.NODE_UNITS = Object.freeze({ map: 2.1, guardian: 2.6, pinnacle: 3.6 });
    runtime.state.LINK_LOOK = Object.freeze({ done: { color: runtime.state.GOLD, shadow: true }, lit: { color: runtime.state.SAP, shadow: true }, dim: { color: [88, 74, 52], dotted: true } });
    runtime.state.LOOKS = Object.freeze({
      locked: (tint) => ({ rim: mix(runtime, runtime.state.DIM, tint, 0.25), face: mix(runtime, runtime.state.WOOD_DARK, tint, 0.12), shine: mix(runtime, runtime.state.DIM, tint, 0.2) }),
      open: (tint) => ({ rim: runtime.state.GOLD, face: mix(runtime, runtime.state.WOOD, tint, 0.3), shine: mix(runtime, runtime.state.GOLD, tint, 0.4) }),
      complete: (tint) => ({ rim: mix(runtime, tint, runtime.state.GOLD_HI, 0.35), face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.35), shine: mix(runtime, tint, runtime.state.GOLD_HI, 0.55) }),
      bonus: (tint) => ({ rim: runtime.state.GOLD_HI, face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.25), shine: runtime.state.GOLD_HI })
    });
    runtime.state.WHEEL_UNITS = Object.freeze({ root: 3.6, small: 2.8, notable: 4, keystone: 4.6 });
    runtime.state.WHEEL_LOOKS = Object.freeze({
      taken: (tint) => ({ rim: runtime.state.GOLD, face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.15), shine: runtime.state.GOLD_HI }),
      open: (tint) => ({ rim: runtime.state.SAP, face: mix(runtime, runtime.state.WOOD, tint, 0.3), shine: mix(runtime, runtime.state.SAP, runtime.state.GOLD_HI, 0.3) }),
      locked: (tint) => ({ rim: mix(runtime, runtime.state.DIM, tint, 0.25), face: runtime.state.WOOD_DARK, shine: mix(runtime, runtime.state.DIM, tint, 0.2) })
    });
  }

  // modules/canvas-atlas-chart-classic.mjs
  var atlasChartArt = createAtlasChartArt({
    get ImageData() {
      return typeof ImageData === "undefined" ? void 0 : ImageData;
    },
    get ATLAS() {
      return ATLAS;
    }
  });
  safeExposeGlobals({ atlasChartArt });
})();
