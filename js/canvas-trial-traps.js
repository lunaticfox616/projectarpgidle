// GENERATED from modules/canvas-trial-traps*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/trial-traps.mjs
  var TrialTrapRenderer = class {
    constructor(deps) {
      this.deps = deps;
      for (const name of ["rng", "layer", "line", "cracks", "ellipse", "spike", "physWarn", "physImpact", "flameColor", "flame", "fireWarn", "fireImpact", "fireAfter", "crystal", "frostField", "coldWarn", "coldImpact", "rune", "boltPath", "bolt", "forks", "burst", "lightWarn", "lightImpact", "bubble", "chaosWarn", "puff", "chaosImpact", "paintFrame", "buildSheet", "sheetOf", "frameOf", "shownCells", "drawPart", "drawCell", "riseActors", "outline", "drawGround", "drawLastingGround", "drawTrapFloor", "drawRise"]) this[name] = this[name].bind(this);
      this.ART = 16;
      this.STAGES = 3;
      this.WARN_FRAMES = 4;
      this.WARN_FRAME_MS = 130;
      this.IMPACT_FRAMES = 8;
      this.CRACKS = Object.freeze([[[1, 11], [4, 9], [8, 10], [11, 8], [15, 9]], [[4, 9], [5, 13]], [[8, 10], [10, 14]], [[11, 8], [12, 5]], [[8, 10], [7, 6]]]);
      this.RAMPS = Object.freeze({
        // dark, mid, light, highlight: the re-dotted skill effects' element ramps
        phys: ["#353844", "#7f899d", "#c4d5df", "#fff3d3"],
        fire: ["#572c31", "#c14936", "#ff963e", "#fff1b8"],
        cold: ["#263b59", "#378cb9", "#81ddef", "#ecfffb"],
        light: ["#4b3e39", "#c18b3a", "#ffd35a", "#fffbc9"],
        chaos: ["#352c4d", "#8151a8", "#d093ee", "#fae4ff"]
      });
      this.EXTRA = Object.freeze({
        crack: "#17151c",
        scorch: "rgba(22,14,12,0.62)",
        flame: "#ffd35a",
        smoke: "rgba(66,58,62,0.6)",
        frost: "rgba(214,244,255,0.85)",
        bolt: "#ffffff",
        flash: "rgba(255,240,170,0.55)",
        puddle: "#2a1f3c",
        venom: "#9bc35a",
        venomHi: "#d4ec9a"
      });
      this.sheets = null;
      this.kept = (x, y, level) => level <= [0, 2, 3, 1][(Math.round(y) & 1) * 2 + (Math.round(x) & 1)];
      this.BLADES = Object.freeze([[3, 12, 9, 1.6, 1], [6, 10, 16, 2.6, 0], [10, 11, 13, 2.2, 0], [13, 13, 8, 1.6, 1]]);
      this.CRYSTALS = Object.freeze([[4, 12, 10, 2], [8, 10, 16, 3], [12, 12, 11, 2]]);
      this.FROST = Object.freeze([[8, 10], [6, 9], [10, 11], [5, 12], [11, 8], [3, 10], [13, 12], [8, 13], [7, 6], [2, 13], [14, 9], [9, 4], [4, 7], [12, 14]]);
      this.FOG = Object.freeze(["#2e2840", "#5a4a78", "#8a74ab", "#c3b2df"]);
      this.PUFFS = Object.freeze([[-3, 1, 2], [3, 0, 2], [0, -3, 2], [6, -3, 0], [-5, -2, 0]]);
      this.STYLES = Object.freeze({
        phys: { rows: 32, warn: this.physWarn, impact: this.physImpact },
        fire: { rows: 40, warn: this.fireWarn, impact: this.fireImpact },
        cold: { rows: 32, warn: this.coldWarn, impact: this.coldImpact },
        // 벼락: 칸마다 세 모양 중 하나, 칸 순서대로 빠르게 이어 떨어진다(한 줄에 똑같은 기둥이 나란히 서지 않게).
        light: { rows: 64, warn: this.lightWarn, impact: this.lightImpact, variants: 3, stagger: 0.05 },
        chaos: { rows: 32, warn: this.chaosWarn, impact: this.chaosImpact }
      });
      this.isTrap = (fx) => !!fx && (fx.type === "trialTrapWarning" || fx.type === "trialTrap") && Array.isArray(fx.targetCells) && !!this.STYLES[fx.element];
      this.cellHash = (cell) => (cell.gx * 73856093 ^ cell.gy * 19349663) >>> 0;
      this.flipped = (cell) => (this.cellHash(cell) >>> 1) % 2 === 1;
    }
    rng(seed) {
      let s = seed >>> 0;
      return () => {
        s = s + 1831565813 >>> 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    /** A canvas painted dot by dot in tile coordinates: y 0..15 is the tile, negative y rises above it (rows - 16 of them). */
    layer(rows) {
      const canvas = this.deps.createCanvas();
      canvas.width = this.ART;
      canvas.height = rows;
      const ctx = canvas.getContext("2d"), lift = rows - this.ART;
      const dot = (x, y, color) => {
        const px = Math.round(x), py = Math.round(y) + lift;
        if (!color || px < 0 || px >= this.ART || py < 0 || py >= rows) return;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, 1, 1);
      };
      return { canvas, dot };
    }
    line(dot, from, to, color) {
      const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1);
      for (let i = 0; i <= steps; i++) dot(from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps, color);
    }
    /** Cracks with a lit lip one dot below, so they read on dark floors too. */
    cracks(dot, count, color, lip) {
      this.CRACKS.slice(0, count).forEach((path) => path.slice(1).forEach((point, i) => {
        if (lip) this.line(dot, [path[i][0], path[i][1] + 1], [point[0], point[1] + 1], lip);
        this.line(dot, path[i], point, color);
      }));
    }
    /** shape: [cx, cy, rx, ry] in tile art pixels; rim colours the outer ring (optional). */
    ellipse(dot, [cx, cy, rx, ry], fill, rim) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d <= 1) dot(x, y, rim && d > 0.62 ? rim : fill);
        }
      }
    }
    /** A blade: lit left face, shaded right face, dark rim, bright tip and a glint down the lit edge. */
    spike(dot, [x, groundY], height, half, ramp) {
      for (let r = 0; r < height; r++) {
        const w = Math.round(half * (1 - r / height));
        for (let dx = -w; dx <= w; dx++) {
          const edge = Math.abs(dx) === w && w > 0;
          dot(x + dx, groundY - r, edge ? ramp[0] : dx < 0 ? ramp[2] : dx === 0 ? ramp[1] : ramp[0]);
        }
      }
      dot(x, groundY - height + 1, ramp[3]);
      if (height > 5) this.line(dot, [x - 1, groundY - Math.floor(height * 0.3)], [x - 1, groundY - Math.floor(height * 0.6)], ramp[3]);
    }
    physWarn(ground, rise, stage, frame) {
      const ramp = this.RAMPS.phys;
      this.cracks(ground.dot, 2 + stage, this.EXTRA.crack, ramp[1]);
      if (stage === 0) return;
      this.BLADES.forEach(([x, y], i) => {
        const tip = stage === 1 ? i === 1 || i === 2 ? 1 : 0 : 2 + (i === 1 ? 1 : 0);
        if (tip) this.spike(rise.dot, [x, y], tip, 1, ramp);
        if (stage === 2 && (frame + i) % 2 === 0) rise.dot(x, y - tip, ramp[3]);
      });
    }
    physImpact(ground, rise, frame) {
      const ramp = this.RAMPS.phys, rises = [0.45, 0.9, 1, 1, 0.95, 0.7, 0.35, 0.1];
      this.cracks(ground.dot, this.CRACKS.length, this.EXTRA.crack, ramp[1]);
      this.BLADES.forEach(([x, y, tall, half, delay]) => {
        this.ellipse(ground.dot, [x, y + 0.5, half + 1, 1], this.EXTRA.crack);
        const k = rises[Math.max(0, frame - delay)];
        if (k * tall >= 1) this.spike(rise.dot, [x, y], Math.round(k * tall), half, ramp);
      });
      if (frame < 3) for (let d = 0; d < 6; d++) ground.dot(8 + Math.cos(d) * (4 + frame * 2), 11 + Math.sin(d) * (1.5 + frame), ramp[2]);
    }
    flameColor(d, t, ramp) {
      if (d > 0.82) return ramp[1];
      if (d > 0.56) return ramp[2];
      if (d > 0.28 || t > 0.6) return this.EXTRA.flame;
      return ramp[3];
    }
    /** shape: [cx, ground y, height, half width at the base]; frame drives the flicker. */
    flame(dot, [cx, groundY, height, half0], frame) {
      const ramp = this.RAMPS.fire;
      for (let r = 0; r < height; r++) {
        const t = r / height, wobble = Math.sin(frame * 2.1 + r * 0.7) * 1.1 * t;
        const half = half0 * (1 - Math.pow(t, 1.3)) + (r < 2 ? 0.6 : 0);
        for (let x = Math.round(cx + wobble - half); x <= Math.round(cx + wobble + half); x++) {
          dot(x, groundY - r, this.flameColor(half > 0 ? Math.abs(x - cx - wobble) / (half + 0.01) : 0, t, ramp));
        }
      }
    }
    fireWarn(ground, rise, stage, frame) {
      const ramp = this.RAMPS.fire, hot = [ramp[0], ramp[1], ramp[2]][stage];
      this.cracks(ground.dot, 2 + stage, hot);
      const random = this.rng(31 + frame * 7);
      for (let i = 0; i < 2 + stage * 2; i++) {
        const path = this.CRACKS[Math.floor(random() * (2 + stage))], point = path[Math.floor(random() * path.length)];
        ground.dot(point[0], point[1], stage === 2 ? this.EXTRA.flame : ramp[2]);
      }
      for (let i = 0; i < stage; i++) rise.dot(3 + (i * 5 + frame * 3) % 10, 8 - (frame + i * 2) % 4 * 2 - stage, ramp[2]);
    }
    fireImpact(ground, rise, frame) {
      const ramp = this.RAMPS.fire, heights = [9, 18, 24, 22, 24, 19, 12, 5];
      this.ellipse(ground.dot, [8, 11, 6.5, 3.2], this.EXTRA.scorch);
      this.cracks(ground.dot, this.CRACKS.length, frame < 5 ? ramp[2] : ramp[0]);
      const peak = frame >= 1 && frame <= 4;
      this.flame(rise.dot, [8, 12, heights[frame], peak ? 5 : 4], frame);
      if (peak) this.flame(rise.dot, [frame % 2 ? 4 : 12, 11 - heights[frame] * 0.45, 4, 1.2], frame + 3);
      this.fireAfter(ground, rise, frame, heights[frame]);
    }
    /** After the peak: embers on the floor, then smoke drifting up from the flame's top. */
    fireAfter(ground, rise, frame, height) {
      const random = this.rng(53 + frame);
      for (let i = 0; i < (frame >= 4 ? 4 : 0); i++) ground.dot(2 + random() * 12, 7 + random() * 7, this.RAMPS.fire[2]);
      if (frame >= 5) for (let i = 0; i < 6; i++) rise.dot(5 + i * 3 % 7, 6 - height - (frame - 5) * 3 - i % 3, this.EXTRA.smoke);
    }
    /** A crystal: a lit left face, a bright ridge, a cool right face, a dark rim and a pointed top. */
    crystal(dot, [x, groundY], height, half, ramp) {
      const tipRows = Math.min(height, half + 2);
      for (let r = 0; r < height; r++) {
        const w = r < height - tipRows ? half : Math.round(half * (height - r) / tipRows);
        for (let dx = -w; dx <= w; dx++) {
          const edge = Math.abs(dx) === w && w > 0;
          dot(x + dx, groundY - r, edge ? ramp[0] : dx < 0 ? ramp[2] : dx === 0 ? ramp[3] : ramp[1]);
        }
      }
      dot(x, groundY - height + 1, ramp[3]);
    }
    frostField(dot, radius, frame, ramp) {
      this.FROST.forEach(([x, y], i) => {
        if (Math.hypot(x - 8, y - 10) > radius) return;
        dot(x, y, this.EXTRA.frost);
        if (i % 3 === 0) {
          dot(x - 1, y, ramp[2]);
          dot(x + 1, y, ramp[2]);
        }
        if (i % 4 === frame % 4) dot(x, y - 1, ramp[3]);
      });
    }
    coldWarn(ground, rise, stage, frame) {
      const ramp = this.RAMPS.cold;
      this.frostField(ground.dot, [3.5, 6, 9][stage], frame, ramp);
      if (stage === 2) this.CRYSTALS.forEach(([x, y], i) => {
        if ((frame + i) % 2 === 0) this.crystal(rise.dot, [x, y], 2, 1, ramp);
      });
    }
    coldImpact(ground, rise, frame) {
      const ramp = this.RAMPS.cold;
      this.frostField(ground.dot, frame < 6 ? 9 : 6, frame, ramp);
      if (frame <= 4) {
        this.CRYSTALS.forEach(([x, y, tall, half]) => this.crystal(rise.dot, [x, y], Math.round(tall * (frame === 0 ? 0.55 : 1)), half, ramp));
        return;
      }
      const random = this.rng(77 + frame), spread = frame - 4;
      for (let i = 0; i < 21; i++) {
        const [x, y, tall] = this.CRYSTALS[i % 3], up = random() * tall;
        const sx = x + (random() - 0.5) * 5 * spread, sy = y - up + spread * spread * 0.9;
        rise.dot(sx, sy, [ramp[1], ramp[2], ramp[3]][i % 3]);
        if (i % 4 === 0) rise.dot(sx + 1, sy, ramp[2]);
      }
    }
    rune(dot, lit, frame, ramp) {
      for (let i = 0; i < 12; i++) {
        if ((i + frame) % lit !== 0) continue;
        const angle = i / 12 * Math.PI * 2;
        dot(8 + Math.cos(angle) * 5.5, 10 + Math.sin(angle) * 3.2, i % 2 ? ramp[2] : ramp[3]);
      }
    }
    /** A jagged path from three tiles up to the floor: short sharp kinks, wandering a little either way. */
    boltPath(seed, groundY) {
      const random = this.rng(seed), points = [[6 + Math.round(random() * 4), -48]];
      while (points[points.length - 1][1] < groundY) {
        const [x, y] = points[points.length - 1], kink = Math.round(random() * 4 + 1) * (random() < 0.5 ? -1 : 1);
        points.push([Math.max(2, Math.min(13, x + kink)), Math.min(groundY, y + 3 + Math.round(random() * 4))]);
      }
      return points;
    }
    /** A one-dot white core with a pale glow on both sides; fading, only the pale core is left. */
    bolt(dot, points, bright, ramp) {
      points.slice(1).forEach((point, i) => {
        const from = points[i];
        if (bright) for (const dx of [-1, 1]) this.line(dot, [from[0] + dx, from[1]], [point[0] + dx, point[1]], ramp[2]);
        this.line(dot, from, point, bright ? this.EXTRA.bolt : ramp[3]);
      });
    }
    /** Two short forks off the bolt, flickering per frame. */
    forks(dot, points, seed, ramp) {
      const random = this.rng(seed);
      for (let f = 0; f < 2; f++) {
        const start = points[2 + Math.floor(random() * (points.length - 4))], side = random() < 0.5 ? -1 : 1;
        const mid = [start[0] + side * 2, start[1] + 3], end = [mid[0] + side * (1 + Math.round(random() * 2)), mid[1] + 3];
        this.line(dot, start, mid, ramp[3]);
        this.line(dot, mid, end, ramp[2]);
      }
    }
    /** Where the bolt lands: a bright core and eight rays, flattened like the floor. */
    burst(dot, size, ramp) {
      this.ellipse(dot, [8, 10, size, size * 0.5], ramp[3]);
      for (let a = 0; a < 8; a++) {
        const cos = Math.cos(a * Math.PI / 4), sin = Math.sin(a * Math.PI / 4) * 0.5;
        this.line(dot, [8 + cos * size, 10 + sin * size], [8 + cos * (size + 3), 10 + sin * (size + 3)], ramp[2]);
      }
    }
    lightWarn(ground, rise, stage, frame) {
      const ramp = this.RAMPS.light;
      this.rune(ground.dot, [3, 2, 1][stage], frame, ramp);
      const random = this.rng(91 + frame * 13 + stage);
      for (let i = 0; i <= stage; i++) rise.dot(3 + random() * 10, 2 + random() * 9 - stage * 2, ramp[3]);
    }
    /** variant: one of three bolt shapes, picked per cell, so a line of strikes never repeats one silhouette. */
    lightImpact(ground, rise, frame, variant) {
      const ramp = this.RAMPS.light, path = this.boltPath([17, 29, 43][variant], 10);
      if (frame <= 2) this.burst(ground.dot, 4 - frame, ramp);
      else {
        for (let a = 0; a < 8; a++) this.line(ground.dot, [8, 10], [8 + Math.cos(a * Math.PI / 4) * 5, 10 + Math.sin(a * Math.PI / 4) * 2.5], this.EXTRA.crack);
        this.rune(ground.dot, frame < 6 ? 1 : 2, frame, ramp);
      }
      if (frame <= 1) this.bolt(rise.dot, path, frame === 0, ramp);
      if (frame === 0) this.forks(rise.dot, path, 5 + variant, ramp);
      const random = this.rng(37 + frame);
      for (let i = 0; i < (frame >= 1 ? 6 : 0); i++) rise.dot(8 + (random() - 0.5) * (frame + 4) * 1.6, 10 - random() * (8 - frame), i % 2 ? ramp[3] : ramp[2]);
    }
    bubble(dot, x, y, phase, ramp) {
      if (phase === 0) return dot(x, y, this.EXTRA.venomHi);
      if (phase === 3) {
        dot(x - 1, y - 1, ramp[3]);
        dot(x + 1, y - 1, ramp[3]);
        return;
      }
      const r = phase === 1 ? 1 : 1.6;
      for (let a = 0; a < 8; a++) dot(x + Math.cos(a * Math.PI / 4) * r, y + Math.sin(a * Math.PI / 4) * r, a === 5 || a === 6 ? ramp[3] : ramp[1]);
    }
    chaosWarn(ground, rise, stage, frame) {
      const ramp = this.RAMPS.chaos, random = this.rng(5 + stage);
      this.ellipse(ground.dot, [8, 11, 3.5 + stage * 1.6, 2 + stage * 0.6], this.EXTRA.puddle, ramp[0]);
      for (let i = 0; i <= stage; i++) this.bubble(ground.dot, 5 + random() * 6, 10 + random() * 2, (frame + i) % 4, ramp);
      if (stage === 2) rise.dot(6 + frame * 3 % 5, 6 - frame, this.EXTRA.venom);
    }
    /** shape: [cx, cy, radius]. */
    puff(dot, [cx, cy, r], fade, ramp) {
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          const d = Math.hypot(x - cx, (y - cy) * 1.15);
          if (d > r || !this.kept(x, y, d > r - 1.3 ? Math.min(3, fade + 1) : fade)) continue;
          const tilt = (x - cx) * 0.6 + (y - cy);
          dot(x, y, tilt < -r * 0.45 ? ramp[3] : tilt < -r * 0.05 ? ramp[2] : tilt < r * 0.55 ? ramp[1] : ramp[0]);
        }
      }
    }
    chaosImpact(ground, rise, frame) {
      const ramp = this.RAMPS.chaos, fade = Math.max(0, frame - 4);
      if (fade < 3) this.ellipse(ground.dot, [8, 11, 6.7, 3.2], this.EXTRA.puddle, ramp[0]);
      this.PUFFS.forEach(([dx, dy, size], i) => {
        const r = Math.min(5.5, 2 + frame * 0.6 + size * 0.5);
        this.puff(rise.dot, [8 + dx + Math.sin(frame * 0.8 + i) * 0.8, 9 + dy - frame * 1.3, r], fade, this.FOG);
      });
      for (let i = 0; i < 4 && fade < 2; i++) rise.dot(4 + i * 3, 6 - frame * 1.3 - i % 2 * 3, i % 2 ? this.EXTRA.venomHi : this.EXTRA.venom);
    }
    paintFrame(style, paint) {
      const ground = this.layer(this.ART), rise = this.layer(style.rows);
      paint(ground, rise);
      return { ground: ground.canvas, rise: rise.canvas };
    }
    buildSheet(style) {
      const warn = Array.from({ length: this.STAGES }, (_, stage) => Array.from(
        { length: this.WARN_FRAMES },
        (_2, frame) => this.paintFrame(style, (ground, rise) => style.warn(ground, rise, stage, frame))
      ));
      const impact = Array.from({ length: style.variants || 1 }, (_, variant) => Array.from(
        { length: this.IMPACT_FRAMES },
        (_2, frame) => this.paintFrame(style, (ground, rise) => style.impact(ground, rise, frame, variant))
      ));
      return { warn, impact };
    }
    sheetOf(element) {
      if (!this.sheets) this.sheets = {};
      if (!this.sheets[element]) this.sheets[element] = this.buildSheet(this.STYLES[element]);
      return this.sheets[element];
    }
    /** The frame a cell shows: warnings loop and grow in three stages; an impact runs once (in the cell's own shape), rippling along the trap. */
    frameOf(fx, progress, index, cell) {
      const sheet = this.sheetOf(fx.element), stagger = this.STYLES[fx.element].stagger || 0.02;
      if (fx.type === "trialTrapWarning") {
        const stage = Math.min(this.STAGES - 1, Math.floor(progress * this.STAGES));
        return sheet.warn[stage][Math.floor(progress * fx.duration / this.WARN_FRAME_MS + index) % this.WARN_FRAMES];
      }
      const delayed = Math.max(0, progress - Math.min(stagger * 7, index * stagger));
      return sheet.impact[this.cellHash(cell) % sheet.impact.length][Math.min(this.IMPACT_FRAMES - 1, Math.floor(delayed * this.IMPACT_FRAMES))];
    }
    /** The trap's cells without the standing obstacles' (js/canvas-skill-footprint.js getGroundTakenCellKeys): nothing rises out of a chest. */
    shownCells(cells) {
      const taken = this.deps.takenCells();
      return taken.size ? cells.filter((cell) => !taken.has(this.deps.gridCellKey(cell.gx, cell.gy))) : cells;
    }
    drawPart(ctx, fx, progress, gridProj, part) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= fx.type === "trialTrapWarning" ? Math.min(1, progress * 5) : 1;
      const look = { fx, progress, gridProj, part };
      this.shownCells(fx.targetCells).forEach((cell, index) => this.drawCell(ctx, look, cell, index));
      ctx.restore();
    }
    /** One cell of a part, standing on the cell's floor line; every other cell is mirrored so a row never repeats one picture. */
    drawCell(ctx, look, cell, index) {
      const { fx, progress, gridProj, part } = look, tile = gridProj.tileW;
      const image = this.frameOf(fx, progress, index, cell)[part], pos = gridProj.cellToScreen(cell.gx, cell.gy);
      const floorH = gridProj.tileH || tile, height = (part === "ground" ? floorH : tile) * image.height / this.ART;
      const left = pos.x - tile / 2, top = pos.y + floorH / 2 - height;
      if (!this.flipped(cell)) return ctx.drawImage(image, left, top, tile, height);
      ctx.save();
      ctx.translate(left + tile, top);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, tile, height);
      ctx.restore();
    }
    /** What rises out of the floor when a trap goes off, one actor per cell on that cell's floor line: the actors' depth order
         * (js/canvas-battlefield.js drawBattleActorLayer) puts a monster in front of the blades behind it and behind the ones in front of it
         * (2026-10-19: drawn over every actor, a blade behind a monster cut across its body). */
    riseActors(effects, now, gridProj) {
      const actors = [];
      if (!gridProj || !Array.isArray(effects)) return actors;
      const floorH = gridProj.tileH || gridProj.tileW;
      for (const fx of effects) {
        if (!this.isTrap(fx) || fx.type === "trialTrapWarning" || now < fx.start || now >= fx.start + fx.duration) continue;
        const look = { fx, progress: (now - fx.start) / fx.duration, gridProj, part: "rise" };
        this.shownCells(fx.targetCells).forEach((cell, index) => actors.push({
          kind: "trapRise",
          id: -3e3 - actors.length,
          y: gridProj.cellToScreen(cell.gx, cell.gy).y + floorH / 2,
          draw: (ctx) => {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            this.drawCell(ctx, look, cell, index);
            ctx.restore();
          }
        }));
      }
      return actors;
    }
    /** The warned cells keep a thin dotted edge in the element's colour, so the exact area reads at a glance. */
    outline(ctx, fx, progress, gridProj) {
      const tile = gridProj.tileW, floorH = gridProj.tileH || tile, dot = tile / this.ART, pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
      ctx.save();
      ctx.globalAlpha *= 0.3 + pulse * 0.35;
      ctx.strokeStyle = fx.color || this.RAMPS[fx.element][2];
      ctx.lineWidth = Math.max(1, dot);
      ctx.setLineDash([dot * 2, dot * 2]);
      ctx.beginPath();
      this.shownCells(fx.targetCells).forEach((cell) => {
        const pos = gridProj.cellToScreen(cell.gx, cell.gy);
        ctx.rect(pos.x - tile / 2 + dot / 2, pos.y - floorH / 2 + dot / 2, tile - dot, floorH - dot);
      });
      ctx.stroke();
      ctx.restore();
    }
    /** Under the actors: cracks, glow, frost, rune, puddle and scorch of every live trap effect, and all of a warning (its dotted edge and
         * the first tips that rise, so the actors cover it like the boss warnings, 2026-10-19 user: "캐릭터에 가려지도록"). */
    drawGround(ctx, effects, now, gridProj) {
      if (!gridProj || !Array.isArray(effects)) return;
      for (const area of this.deps.lastingGround() || []) this.drawLastingGround(ctx, area, now, gridProj);
      for (const fx of effects) if (this.isTrap(fx) && now >= fx.start) this.drawTrapFloor(ctx, fx, now, gridProj);
    }
    /** Lasting ground (lava, frost, corrosion, shock) while it lasts: its floor and a dotted edge, fading over its last 0.7 s. */
    drawLastingGround(ctx, area, now, gridProj) {
      if (now < area.start || now >= area.endsAt) return;
      const fx = {
        type: "trialTrap",
        element: area.element,
        color: this.deps.COMBAT_GRID_CONFIG.ground[area.element].color,
        targetCells: area.cells,
        duration: area.endsAt - area.start
      };
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, (area.endsAt - now) / 700);
      this.drawPart(ctx, fx, 0.35 + Math.sin((now - area.start) / 450) * 0.06, gridProj, "ground");
      this.outline(ctx, fx, 0.15, gridProj);
      ctx.restore();
    }
    /** One trap effect's floor; a warning also gets its dotted edge and the first tips that rise. */
    drawTrapFloor(ctx, fx, now, gridProj) {
      const progress = Math.max(0, Math.min(1, (now - fx.start) / fx.duration)), warning = fx.type === "trialTrapWarning";
      if (warning && progress < 1) this.outline(ctx, fx, progress, gridProj);
      this.drawPart(ctx, fx, progress, gridProj, "ground");
      if (warning) this.drawPart(ctx, fx, progress, gridProj, "rise");
    }
    /** The over-actor pass draws nothing for a trap with art: its warning lies on the floor (drawGround) and its impact rises in the
         * actors' depth order (riseActors). @returns {boolean} false when this effect has no art (old element, boss areas): the plain flash. */
    drawRise(ctx, fx, progress, gridProj) {
      return !!gridProj && this.isTrap(fx);
    }
    api() {
      return Object.freeze({ drawGround: this.drawGround, drawRise: this.drawRise, riseActors: this.riseActors, dispose: () => {
        this.sheets = null;
      } });
    }
  };
  function createTrialTrapRenderer(deps) {
    return new TrialTrapRenderer(deps).api();
  }

  // modules/canvas-trial-traps-classic.mjs
  var native = createTrialTrapRenderer({
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    createCanvas: () => document.createElement("canvas"),
    takenCells: () => getGroundTakenCellKeys(actExplorationState.current(window.GameModules.state.game)),
    get gridCellKey() {
      return gridCellKey;
    },
    lastingGround: () => window.GameModules.state.combat.trialHazardRuntime.ground
  });
  safeExposeGlobals({ trialTrapArt: native });
})();
