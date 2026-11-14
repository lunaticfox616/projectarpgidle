// GENERATED from modules/battle-assets*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/battle-sprite-content.mjs
  function isAtlasBackgroundPixel(r, g, b, a) {
    if (a < 20) return true;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    if (avg >= 240) return true;
    if (avg >= 222 && spread <= 18) return true;
    return avg >= 206 && spread <= 12;
  }
  function contentBounds(frame, rect) {
    const { data } = frame;
    const { width, height } = rect;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (isAtlasBackgroundPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return { minX, minY, maxX, maxY };
  }
  var BattleSpriteContent = class {
    constructor(deps) {
      this.deps = deps;
      this.cache = /* @__PURE__ */ new WeakMap();
      this.warnedImages = /* @__PURE__ */ new WeakSet();
    }
    context(image) {
      if (!image) return null;
      if (this.cache.has(image)) return this.cache.get(image);
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      this.cache.set(image, ctx);
      return ctx;
    }
    trimRectToContent(image, rect, padding) {
      padding = padding || 2;
      try {
        const ctx = this.context(image);
        if (!ctx) return rect;
        const frame = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
        const { minX, minY, maxX, maxY } = contentBounds(frame, rect);
        if (maxX < minX || maxY < minY) return rect;
        const x = Math.max(0, rect.x + minX - padding), y = Math.max(0, rect.y + minY - padding);
        const right = Math.min(image.width, rect.x + maxX + 1 + padding);
        const bottom = Math.min(image.height, rect.y + maxY + 1 + padding);
        return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
      } catch (error) {
        this.warnReadback(image, rect, error);
        return rect;
      }
    }
    warnReadback(image, rect, error) {
      const reference = image !== null && (typeof image === "object" || typeof image === "function");
      if (reference && this.warnedImages.has(image)) return;
      if (reference) this.warnedImages.add(image);
      this.deps.console.warn("Battle sprite crop failed; using original cell.", { image: image?.src, rect, error });
    }
  };

  // modules/browser/battle-image-environment.mjs
  var CUSTOM_HERO_SHEET_STORAGE_KEY = "projectidle_custom_hero_sheet";
  function getCustomHeroSheetDataUrl(inputs2) {
    try {
      let saved = inputs2.localStorage.getItem(CUSTOM_HERO_SHEET_STORAGE_KEY);
      if (!saved || typeof saved !== "string") return null;
      return saved.startsWith("data:image/") ? saved : null;
    } catch {
      return null;
    }
  }
  function isLocalFileProtocol(inputs2) {
    return typeof inputs2.window !== "undefined" && inputs2.window.location && inputs2.window.location.protocol === "file:";
  }
  function isLocalRuntimeHost(inputs2) {
    if (typeof inputs2.window === "undefined" || !inputs2.window.location) return false;
    if (inputs2.window.location.protocol === "file:") return true;
    let host = String(inputs2.window.location.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  // modules/browser/battle-sheet-matte.mjs
  function sanitizeBattleSheet(inputs2, image) {
    const canvas = inputs2.document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
      frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return image;
    }
    const px = frame.data;
    let { bgDistance, isBgLike } = createBattleMatteClassifier(canvas, px);
    clearBattleMatteBorder(canvas, isBgLike, px);
    thinBattleMattePixels(px, bgDistance);
    const alphaSnapshot = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < canvas.height - 1; y++) {
      clearBrightMatteRow(canvas, y, alphaSnapshot, px);
    }
    for (let y = 1; y < canvas.height - 1; y++) {
      clearResidualMatteRow(canvas, y, px);
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
  }
  function createBattleMatteClassifier(canvas, px) {
    const samples = [];
    [
      [0, 0],
      [1, 1],
      [canvas.width - 1, 0],
      [canvas.width - 2, 1],
      [0, canvas.height - 1],
      [1, canvas.height - 2],
      [canvas.width - 1, canvas.height - 1],
      [canvas.width - 2, canvas.height - 2]
    ].forEach(([sx, sy]) => {
      let idx = (sy * canvas.width + sx) * 4;
      samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    });
    function bgDistance(r, g, b) {
      let best = Infinity;
      samples.forEach((sample) => {
        let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
        if (dist < best) best = dist;
      });
      return best;
    }
    function isBgLike(r, g, b, a, loose) {
      if (a < 18) return true;
      let dist = bgDistance(r, g, b);
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      if (avg >= 232 && max - min <= 26) return true;
      return loose ? dist <= 62 : dist <= 42;
    }
    return { bgDistance, isBgLike };
  }
  function clearBattleMatteBorder(canvas, isBgLike, px) {
    let visited = new Uint8Array(canvas.width * canvas.height);
    let queue = [];
    function pushSeed(x, y) {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      let pos = y * canvas.width + x;
      if (visited[pos]) return;
      let idx = pos * 4;
      if (!isBgLike(px[idx], px[idx + 1], px[idx + 2], px[idx + 3], true)) return;
      visited[pos] = 1;
      queue.push(pos);
    }
    for (let x = 0; x < canvas.width; x++) {
      pushSeed(x, 0);
      pushSeed(x, canvas.height - 1);
    }
    for (let y = 0; y < canvas.height; y++) {
      pushSeed(0, y);
      pushSeed(canvas.width - 1, y);
    }
    while (queue.length > 0) {
      let pos = queue.pop();
      let idx = pos * 4;
      px[idx + 3] = 0;
      let x = pos % canvas.width;
      let y = Math.floor(pos / canvas.width);
      pushSeed(x - 1, y);
      pushSeed(x + 1, y);
      pushSeed(x, y - 1);
      pushSeed(x, y + 1);
    }
  }
  function thinBattleMattePixels(px, bgDistance) {
    for (let i = 0; i < px.length; i += 4) {
      let r = px[i];
      let g = px[i + 1];
      let b = px[i + 2];
      let a = px[i + 3];
      if (a === 0) continue;
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let dist = bgDistance(r, g, b);
      if (dist <= 32 && max - min <= 40 || a < 28) {
        px[i + 3] = 0;
      } else if (dist <= 48 && max - min <= 48) {
        px[i + 3] = Math.min(px[i + 3], 120);
      }
    }
  }
  function touchesTransparentMattePixel(alphaSnapshot, y, canvas, x) {
    let touchesTransparent = false;
    for (let oy = -1; oy <= 1 && !touchesTransparent; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        if (alphaSnapshot[(y + oy) * canvas.width + (x + ox)] === 0) {
          touchesTransparent = true;
          break;
        }
      }
    }
    return { touchesTransparent };
  }
  function countResidualMatteNeighbors(px, y, canvas, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        if (px[((y + oy) * canvas.width + (x + ox)) * 4 + 3] === 0) transparentNeighbors++;
      }
    }
    return { transparentNeighbors };
  }
  function clearBrightMatteRow(canvas, y, alphaSnapshot, px) {
    for (let x = 1; x < canvas.width - 1; x++) {
      let pos = y * canvas.width + x;
      let idx = pos * 4;
      if (alphaSnapshot[pos] === 0) continue;
      let r = px[idx];
      let g = px[idx + 1];
      let b = px[idx + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      if (avg < 170 || max - min > 72) continue;
      let { touchesTransparent } = touchesTransparentMattePixel(alphaSnapshot, y, canvas, x);
      if (!touchesTransparent) continue;
      if (avg >= 196 && max - min <= 62) px[idx + 3] = 0;
      else px[idx + 3] = Math.min(px[idx + 3], 54);
    }
  }
  function clearResidualMatteRow(canvas, y, px) {
    for (let x = 1; x < canvas.width - 1; x++) {
      let pos = y * canvas.width + x;
      let idx = pos * 4;
      let alpha = px[idx + 3];
      if (alpha === 0) continue;
      let r = px[idx];
      let g = px[idx + 1];
      let b = px[idx + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      if (max - min > 52 || avg < 154) continue;
      let { transparentNeighbors } = countResidualMatteNeighbors(px, y, canvas, x);
      if (transparentNeighbors >= 2 && avg >= 182) px[idx + 3] = 0;
      else if (transparentNeighbors >= 1 && avg >= 164 && alpha < 220) px[idx + 3] = Math.min(alpha, 32);
    }
  }

  // modules/browser/battle-white-matte.mjs
  function sanitizeWhiteBackdropSheet(inputs2, image) {
    if (!image) return image;
    const canvas = inputs2.document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
      frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return image;
    }
    const px = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const visited = new Uint8Array(width * height);
    const queue = [];
    let { isBackdropPixel } = createWhiteMatteClassifier(width, px, height, inputs2);
    clearWhiteMatteBorder({ width, height, visited, isBackdropPixel, queue, px });
    clearWhiteMattePixels(px);
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
      clearWhiteMatteRow(width, y, alphaSnapshot, px);
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
  }
  function createWhiteMatteClassifier(width, px, height, inputs2) {
    const edgeSamples = [];
    function sampleEdgePixel(x, y) {
      let idx = (y * width + x) * 4;
      let a = px[idx + 3];
      if (a < 20) return;
      let r = px[idx], g = px[idx + 1], b = px[idx + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      if ((r + g + b) / 3 >= 186 && max - min <= 58) edgeSamples.push([r, g, b]);
    }
    [[0, 0], [1, 1], [width - 1, 0], [width - 2, 1], [0, height - 1], [1, height - 2], [width - 1, height - 1], [width - 2, height - 2], [Math.floor(width * 0.5), 0], [0, Math.floor(height * 0.5)], [width - 1, Math.floor(height * 0.5)]].forEach(([x, y]) => {
      sampleEdgePixel(inputs2.clampNumber(x, 0, width - 1), inputs2.clampNumber(y, 0, height - 1));
    });
    function edgeDistance(r, g, b) {
      let best = Infinity;
      edgeSamples.forEach((sample) => {
        let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
        if (dist < best) best = dist;
      });
      return best;
    }
    function isBackdropPixel(pos, loose) {
      let idx = pos * 4;
      let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
      if (a < 20) return true;
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      let lowSaturation = max - min <= (loose ? 64 : 42);
      if (avg >= 246 && lowSaturation) return true;
      if (!lowSaturation) return false;
      let dist = edgeDistance(r, g, b);
      return matchesWhiteMatteDistance(avg, dist, loose);
    }
    return { isBackdropPixel };
  }
  function clearWhiteMatteBorder({ width, height, visited, isBackdropPixel, queue, px }) {
    function pushSeed(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      let pos = y * width + x;
      if (visited[pos] || !isBackdropPixel(pos, true)) return;
      visited[pos] = 1;
      queue.push(pos);
    }
    for (let x = 0; x < width; x++) {
      pushSeed(x, 0);
      pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      pushSeed(0, y);
      pushSeed(width - 1, y);
    }
    while (queue.length > 0) {
      let pos = queue.pop();
      px[pos * 4 + 3] = 0;
      let x = pos % width;
      let y = Math.floor(pos / width);
      [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => pushSeed(nx, ny));
    }
  }
  function clearWhiteMattePixels(px) {
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 20) {
        px[i + 3] = 0;
        continue;
      }
      let r = px[i], g = px[i + 1], b = px[i + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      if (avg >= 236 && max - min <= 38) px[i + 3] = 0;
    }
  }
  function countWhiteMatteNeighbors(alphaSnapshot, y, width, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
      }
    }
    return { transparentNeighbors };
  }
  function clearWhiteMatteRow(width, y, alphaSnapshot, px) {
    for (let x = 1; x < width - 1; x++) {
      let pos = y * width + x;
      let idx = pos * 4;
      if (alphaSnapshot[pos] === 0) continue;
      let r = px[idx], g = px[idx + 1], b = px[idx + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      if (avg < 176 || max - min > 62) continue;
      let { transparentNeighbors } = countWhiteMatteNeighbors(alphaSnapshot, y, width, x);
      if (transparentNeighbors >= 3 && avg >= 198) px[idx + 3] = 0;
      else if (transparentNeighbors >= 1 && avg >= 186) px[idx + 3] = Math.min(px[idx + 3], 48);
    }
  }
  function matchesWhiteMatteDistance(avg, dist, loose) {
    if (avg >= 222 && dist <= (loose ? 92 : 72)) return true;
    if (avg >= 196 && dist <= (loose ? 64 : 46)) return true;
    return false;
  }

  // modules/browser/battle-monster-matte.mjs
  function sanitizeLocalMonsterBackdropSheet(inputs2, image) {
    if (!image || !isLocalRuntimeHost(inputs2)) return image;
    const canvas = inputs2.document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
      frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return image;
    }
    const px = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const samples = [];
    sampleMonsterMatteBorder({ inputs: inputs2, width, height, px, samples });
    if (samples.length === 0) return image;
    let { bgDistance, isLocalBackdropPixel } = createMonsterMatteClassifier(samples, px);
    clearMonsterMatteBorder(width, height, isLocalBackdropPixel, px);
    thinMonsterMattePixels(px, bgDistance);
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
      clearMonsterMatteRow({ width, y, alphaSnapshot, isLocalBackdropPixel, px });
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
  }
  function sampleMonsterMatteBorder({ inputs: inputs2, width, height, px, samples }) {
    function addSample(x, y) {
      x = inputs2.clampNumber(Math.round(x), 0, width - 1);
      y = inputs2.clampNumber(Math.round(y), 0, height - 1);
      let idx = (y * width + x) * 4;
      if (px[idx + 3] < 24) return;
      samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    }
    let step = Math.max(4, Math.round(Math.min(width, height) / 36));
    for (let x = 0; x < width; x += step) {
      addSample(x, 0);
      addSample(x, height - 1);
    }
    for (let y = 0; y < height; y += step) {
      addSample(0, y);
      addSample(width - 1, y);
    }
  }
  function createMonsterMatteClassifier(samples, px) {
    function bgDistance(r, g, b) {
      let best = Infinity;
      samples.forEach((sample) => {
        let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
        if (dist < best) best = dist;
      });
      return best;
    }
    function isLocalBackdropPixel(pos, loose) {
      let idx = pos * 4;
      let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
      if (a < 24) return true;
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      let saturation = max - min;
      let dist = bgDistance(r, g, b);
      if (avg >= 232 && saturation <= 58) return true;
      if (saturation <= 46 && dist <= (loose ? 88 : 62)) return true;
      return dist <= (loose ? 54 : 38) && saturation <= 72;
    }
    return { bgDistance, isLocalBackdropPixel };
  }
  function clearMonsterMatteBorder(width, height, isLocalBackdropPixel, px) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    function pushSeed(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      let pos = y * width + x;
      if (visited[pos] || !isLocalBackdropPixel(pos, true)) return;
      visited[pos] = 1;
      queue.push(pos);
    }
    for (let x = 0; x < width; x++) {
      pushSeed(x, 0);
      pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      pushSeed(0, y);
      pushSeed(width - 1, y);
    }
    while (queue.length > 0) {
      let pos = queue.pop();
      px[pos * 4 + 3] = 0;
      let x = pos % width;
      let y = Math.floor(pos / width);
      pushSeed(x - 1, y);
      pushSeed(x + 1, y);
      pushSeed(x, y - 1);
      pushSeed(x, y + 1);
    }
  }
  function thinMonsterMattePixels(px, bgDistance) {
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      let r = px[i], g = px[i + 1], b = px[i + 2];
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let avg = (r + g + b) / 3;
      let saturation = max - min;
      let dist = bgDistance(r, g, b);
      if (avg >= 224 && saturation <= 76) px[i + 3] = 0;
      else if (avg >= 204 && saturation <= 54 && dist <= 86) px[i + 3] = Math.min(px[i + 3], 28);
    }
  }
  function countMonsterMatteNeighbors(alphaSnapshot, y, width, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
      }
    }
    return { transparentNeighbors };
  }
  function clearMonsterMatteRow({ width, y, alphaSnapshot, isLocalBackdropPixel, px }) {
    for (let x = 1; x < width - 1; x++) {
      let pos = y * width + x;
      if (alphaSnapshot[pos] === 0) continue;
      let { transparentNeighbors } = countMonsterMatteNeighbors(alphaSnapshot, y, width, x);
      if (transparentNeighbors <= 0) continue;
      let idx = pos * 4;
      if (isLocalBackdropPixel(pos, false)) px[idx + 3] = transparentNeighbors >= 3 ? 0 : Math.min(px[idx + 3], 40);
    }
  }

  // modules/browser/battle-sheet-policy.mjs
  function isPreCleanedBattleSheet(key) {
    return key === "enemies" || key === "summon1" || key.startsWith("bossAct");
  }
  function cleanLoadedBattleSheet(inputs2, key, image) {
    if (!inputs2.ENABLE_BATTLE_SHEET_SANITIZATION || isLocalFileProtocol(inputs2)) return image;
    try {
      const sanitized = sanitizeBattleSheet(inputs2, image);
      return key === "enemies" ? sanitizeLocalMonsterBackdropSheet(inputs2, sanitizeWhiteBackdropSheet(inputs2, sanitized)) : sanitized;
    } catch {
      return image;
    }
  }
  function shouldPreserveOriginalBattleSheet(key) {
    return isPreCleanedBattleSheet(key) || key === "tiles" || key.startsWith("hero") || key.startsWith("playerClass") || key.startsWith("bossTelegraph") || key.startsWith("skillFx") || key.startsWith("passiveTree");
  }

  // modules/rendering/battle-enemy-atlas.mjs
  function getWispAtlasFrame(cell, motion, directionIndex, frameIndex) {
    const animated = motion !== "idle";
    const tileWidth = animated ? 576 : 256;
    const tileHeight = animated ? 256 : 64;
    return {
      x: cell % 3 * tileWidth + (animated ? frameIndex : directionIndex) * 64,
      y: Math.floor(cell / 3) * tileHeight + (animated ? directionIndex * 64 : 0),
      width: 64,
      height: 64,
      anchorX: 32,
      anchorY: 62,
      basisHeight: 64
    };
  }
  function buildWispEnemyVariants(inputs2, images) {
    if (typeof inputs2.WISP_MONSTER_VISUALS === "undefined") return [];
    const attackImage = images.wispEnemyAttack;
    const glowImage = images.wispEnemyGlow;
    if (!attackImage || !glowImage) return [];
    const directions = ["south", "north", "west", "east"];
    return inputs2.WISP_MONSTER_VISUALS.map((wisp) => {
      const directional = Object.fromEntries(directions.map((direction, directionIndex) => {
        const frames = Array.from({ length: 9 }, (_, frameIndex) => ({
          image: glowImage,
          frame: getWispAtlasFrame(wisp.cell, "glow", directionIndex, frameIndex)
        }));
        const attackFrames = Array.from({ length: 9 }, (_, frameIndex) => ({
          image: attackImage,
          frame: getWispAtlasFrame(wisp.cell, "attack", directionIndex, frameIndex)
        }));
        return [direction, { image: glowImage, frame: frames[0].frame, frames, attackFrames }];
      }));
      return {
        id: wisp.id,
        skinId: wisp.id,
        label: wisp.name,
        image: glowImage,
        frame: directional.south.frame,
        frames: directional.south.frames,
        attackFrames: directional.south.attackFrames,
        directions: directional
      };
    });
  }
  function buildEnemyTransparentImage(inputs2, image) {
    if (!image || isPreCleanedBattleSheet("enemies")) return image;
    try {
      return sanitizeLocalMonsterBackdropSheet(inputs2, sanitizeWhiteBackdropSheet(inputs2, sanitizeBattleSheet(inputs2, image)));
    } catch {
      return sanitizeLocalMonsterBackdropSheet(inputs2, sanitizeWhiteBackdropSheet(inputs2, image));
    }
  }

  // modules/data/legacy-hero-frames.mjs
  var heroParts = [
    { x: 212, y: 402, width: 161, height: 206 },
    { x: 438, y: 402, width: 167, height: 205 },
    { x: 676, y: 402, width: 218, height: 205 },
    { x: 899, y: 402, width: 223, height: 204 },
    { x: 1204, y: 402, width: 195, height: 205 }
  ];
  var heroPartsV2 = [
    { x: 174, y: 331, width: 132, height: 169 },
    { x: 360, y: 331, width: 137, height: 169 },
    { x: 556, y: 331, width: 179, height: 169 },
    { x: 740, y: 331, width: 183, height: 168 },
    { x: 991, y: 331, width: 160, height: 169 }
  ];
  var enemyParts = {
    slime: { x: 471, y: 312, width: 193, height: 102 },
    wraith: { x: 762, y: 231, width: 177, height: 217 },
    knight: { x: 1017, y: 222, width: 294, height: 233 },
    bandit: { x: 214, y: 624, width: 152, height: 207 },
    shadow: { x: 451, y: 605, width: 156, height: 219 },
    boss: { x: 603, y: 497, width: 376, height: 342 },
    skeleton: { x: 1024, y: 561, width: 297, height: 271 }
  };
  var tileParts = [
    { x: 151, y: 180, width: 170, height: 186 },
    { x: 364, y: 181, width: 174, height: 185 },
    { x: 581, y: 181, width: 179, height: 184 },
    { x: 800, y: 180, width: 188, height: 185 },
    { x: 1023, y: 181, width: 176, height: 184 },
    { x: 1234, y: 185, width: 165, height: 180 },
    { x: 153, y: 399, width: 170, height: 192 },
    { x: 363, y: 404, width: 178, height: 187 },
    { x: 581, y: 404, width: 179, height: 187 },
    { x: 799, y: 405, width: 189, height: 186 },
    { x: 1024, y: 404, width: 175, height: 187 },
    { x: 1238, y: 417, width: 171, height: 127 },
    { x: 151, y: 628, width: 170, height: 189 },
    { x: 366, y: 628, width: 172, height: 189 },
    { x: 581, y: 629, width: 179, height: 190 },
    { x: 800, y: 628, width: 188, height: 189 },
    { x: 1024, y: 630, width: 175, height: 187 }
  ];
  var heroStripFrameCounts = {
    hero1Idle: 1,
    hero1Walk: 15,
    hero1Attack: 7,
    hero1Hurt: 1,
    hero1Death: 1,
    hero2Idle: 1,
    hero2Walk: 17,
    hero2Attack: 7,
    hero2Hurt: 1,
    hero2Death: 1,
    hero3Idle: 1,
    hero3Walk: 17,
    hero3Attack: 7,
    hero3Hurt: 1,
    hero3Death: 1,
    hero4Idle: 1,
    hero4Walk: 13,
    hero4Attack: 7,
    hero4Hurt: 1,
    hero4Death: 1,
    hero5Idle: 1,
    hero5Walk: 17,
    hero5Attack: 7,
    hero5Hurt: 1,
    hero5Death: 1,
    hero6Idle: 1,
    hero6Walk: 10,
    hero6Attack: 7,
    hero6Hurt: 1,
    hero6Death: 1,
    hero7Idle: 1,
    hero7Walk: 17,
    hero7Attack: 7,
    hero7Hurt: 1,
    hero7Death: 1,
    hero8Idle: 1,
    hero8Walk: 15,
    hero8Attack: 7,
    hero8Hurt: 1,
    hero8Death: 1,
    hero9Idle: 1,
    hero9Walk: 13,
    hero9Attack: 7,
    hero9Hurt: 1,
    hero9Death: 1,
    hero10Idle: 1,
    hero10Walk: 11,
    hero10Attack: 7,
    hero10Hurt: 1,
    hero10Death: 1,
    playerClassOccultistIdle: 1,
    playerClassOccultistWalk: 9,
    playerClassOccultistAttack: 9,
    playerClassOccultistAttack2: 9,
    playerClassWandererIdle: 1,
    playerClassWandererWalk: 9,
    playerClassWandererAttack: 7,
    playerClassWandererAttack2: 7,
    playerClassClericIdle: 1,
    playerClassClericWalk: 9,
    playerClassClericAttack: 9,
    playerClassArcherIdle: 1,
    playerClassArcherWalk: 9,
    playerClassArcherAttack: 9,
    playerClassArcherAttack2: 9,
    playerClassAlchemistIdle: 1,
    playerClassAlchemistWalk: 9,
    playerClassAlchemistAttack: 8,
    playerClassAlchemistAttack2: 9,
    playerClassAlchemistAttack3: 4,
    playerClassWarriorIdle: 1,
    playerClassWarriorWalk: 9,
    playerClassWarriorAttack: 8,
    playerClassWarriorAttack2: 9,
    playerClassWarriorAttack3: 9,
    playerClassOccultistWalkSouth: 7,
    playerClassArcherWalkSouth: 8
  };
  function createLegacyAtlasParts() {
    return {
      heroParts: heroParts.map((part) => ({ ...part })),
      heroPartsV2: heroPartsV2.map((part) => ({ ...part })),
      enemyParts: Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, { ...part }])),
      tileParts: tileParts.map((part) => ({ ...part }))
    };
  }
  function getBattleHero1SafeClipDefs() {
    return {
      bodyFrames: legacyHeroBodyFrames(),
      characterAnimations: {
        idle: ["B_IDLE_01", "B_IDLE_02", "B_IDLE_03", "B_IDLE_04"],
        walk_or_run: ["B_WALK_01", "B_WALK_02", "B_WALK_03", "B_WALK_04", "B_WALK_05", "B_WALK_06", "B_WALK_07", "B_WALK_08"],
        sword_attack_body: ["B_SWORD_01", "B_SWORD_02", "B_SWORD_03"],
        cast_body: ["B_CAST_01", "B_CAST_02", "B_CAST_03", "B_CAST_04", "B_CAST_05", "B_CAST_06"],
        hurt: ["B_HURT_01", "B_HURT_02", "B_HURT_03", "B_HURT_04", "B_HURT_05", "B_HURT_06"],
        down_or_knockdown: ["B_DOWN_01", "B_DOWN_02", "B_DOWN_03", "B_DOWN_04"],
        bow_attack_body: ["B_BOW_01", "B_BOW_02", "B_BOW_03", "B_BOW_04", "B_BOW_05", "B_BOW_06", "B_BOW_07", "B_BOW_08", "B_BOW_09"]
      },
      clipLoop: {
        idle: true,
        walk_or_run: true,
        sword_attack_body: false,
        cast_body: false,
        hurt: false,
        down_or_knockdown: false,
        bow_attack_body: false
      }
    };
  }
  function legacyHeroBodyFrames() {
    return {
      B_IDLE_01: { x: 30, y: 16, width: 74, height: 90 },
      B_IDLE_02: { x: 140, y: 16, width: 76, height: 90 },
      B_IDLE_03: { x: 348, y: 16, width: 78, height: 90 },
      B_IDLE_04: { x: 452, y: 16, width: 70, height: 90 },
      B_WALK_01: { x: 26, y: 118, width: 76, height: 94 },
      B_WALK_02: { x: 130, y: 118, width: 90, height: 94 },
      B_WALK_03: { x: 248, y: 118, width: 78, height: 94 },
      B_WALK_04: { x: 356, y: 118, width: 74, height: 94 },
      B_WALK_05: { x: 458, y: 118, width: 82, height: 94 },
      B_WALK_06: { x: 576, y: 118, width: 74, height: 94 },
      B_WALK_07: { x: 680, y: 118, width: 76, height: 94 },
      B_WALK_08: { x: 776, y: 118, width: 78, height: 94 },
      B_SWORD_01: { x: 368, y: 302, width: 88, height: 100 },
      B_SWORD_02: { x: 522, y: 302, width: 90, height: 100 },
      B_SWORD_03: { x: 706, y: 302, width: 94, height: 100 },
      B_CAST_01: { x: 32, y: 510, width: 72, height: 92 },
      B_CAST_02: { x: 122, y: 510, width: 78, height: 92 },
      B_CAST_03: { x: 216, y: 510, width: 74, height: 92 },
      B_CAST_04: { x: 310, y: 510, width: 86, height: 92 },
      B_CAST_05: { x: 412, y: 510, width: 88, height: 92 },
      B_CAST_06: { x: 526, y: 510, width: 96, height: 92 },
      B_HURT_01: { x: 28, y: 870, width: 76, height: 94 },
      B_HURT_02: { x: 152, y: 870, width: 80, height: 94 },
      B_HURT_03: { x: 276, y: 870, width: 78, height: 94 },
      B_HURT_04: { x: 378, y: 870, width: 88, height: 94 },
      B_HURT_05: { x: 494, y: 870, width: 70, height: 94 },
      B_HURT_06: { x: 618, y: 870, width: 82, height: 94 },
      B_DOWN_01: { x: 42, y: 968, width: 78, height: 96 },
      B_DOWN_02: { x: 184, y: 968, width: 88, height: 96 },
      B_DOWN_03: { x: 330, y: 968, width: 90, height: 96 },
      B_DOWN_04: { x: 458, y: 968, width: 94, height: 96 },
      B_BOW_01: { x: 38, y: 975, width: 74, height: 79 },
      B_BOW_02: { x: 158, y: 975, width: 84, height: 79 },
      B_BOW_03: { x: 274, y: 976, width: 81, height: 78 },
      B_BOW_04: { x: 387, y: 978, width: 90, height: 76 },
      B_BOW_05: { x: 508, y: 977, width: 84, height: 76 },
      B_BOW_06: { x: 616, y: 980, width: 89, height: 75 },
      B_BOW_07: { x: 728, y: 982, width: 95, height: 73 },
      B_BOW_08: { x: 843, y: 982, width: 95, height: 74 },
      B_BOW_09: { x: 962, y: 982, width: 81, height: 74 }
    };
  }

  // modules/rendering/hero-frame-layout.mjs
  function resolveHeroMotionStripAnchor(baseAnchor, motionAnchors, motion, variantIndex, direction) {
    if (!baseAnchor) return null;
    motionAnchors = { ...motionAnchors, ...motionAnchors && motionAnchors[direction] };
    let configured = motion === "attack" && motionAnchors && Array.isArray(motionAnchors.attacks) ? motionAnchors.attacks[variantIndex] : motionAnchors && motionAnchors[motion];
    if (!Number.isFinite(configured)) return baseAnchor;
    return { ...baseAnchor, anchorY: configured };
  }
  function hasUsableFrame(frame) {
    return !!(frame && Number.isFinite(frame.width) && Number.isFinite(frame.height) && frame.width >= 18 && frame.height >= 24);
  }
  function isNearSize(image, width, height, tolerance) {
    let tw = tolerance || 0.035;
    let th = tolerance || 0.035;
    return Math.abs((image.width || 0) - width) <= width * tw && Math.abs((image.height || 0) - height) <= height * th;
  }
  function buildScaledHeroParts(image) {
    let scaleX = image.width / 1536;
    let scaleY = image.height / 1024;
    return heroParts.map((part) => ({
      x: Math.max(0, Math.round(part.x * scaleX)),
      y: Math.max(0, Math.round(part.y * scaleY)),
      width: Math.max(10, Math.round(part.width * scaleX)),
      height: Math.max(10, Math.round(part.height * scaleY))
    }));
  }
  function withImageRef(image, frame) {
    if (!image || !frame) return null;
    return { ...frame, image };
  }
  function inferStripFallbackColumns(image) {
    let width = Math.max(1, Math.round(image && image.width || 1));
    let height = Math.max(1, Math.round(image && image.height || 1));
    let squareFrameCols = width / height;
    let roundedSquareFrameCols = Math.round(squareFrameCols);
    if (roundedSquareFrameCols >= 1 && Math.abs(squareFrameCols - roundedSquareFrameCols) <= 0.02) {
      return roundedSquareFrameCols;
    }
    return Math.max(1, Math.round(width / 80));
  }

  // modules/browser/sprite-components.mjs
  function padSpriteRect(rect, image, pad) {
    return {
      x: Math.max(0, rect.x - pad),
      y: Math.max(0, rect.y - pad),
      width: Math.min(image.width - Math.max(0, rect.x - pad), rect.width + pad * 2),
      height: Math.min(image.height - Math.max(0, rect.y - pad), rect.height + pad * 2)
    };
  }
  function detectSpriteComponents(inputs2, image, minArea) {
    const canvas = inputs2.document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    let data;
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
      return [];
    }
    const visited = new Uint8Array(canvas.width * canvas.height);
    const components = [];
    const backgroundSamples = [];
    [
      [0, 0],
      [1, 1],
      [canvas.width - 1, 0],
      [canvas.width - 2, 1],
      [0, canvas.height - 1],
      [1, canvas.height - 2],
      [canvas.width - 1, canvas.height - 1],
      [canvas.width - 2, canvas.height - 2],
      [Math.floor(canvas.width * 0.5), 0],
      [0, Math.floor(canvas.height * 0.5)],
      [canvas.width - 1, Math.floor(canvas.height * 0.5)]
    ].forEach(([sx, sy]) => {
      let idx = (sy * canvas.width + sx) * 4;
      backgroundSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    });
    function isBackgroundPixel(pixelIndex) {
      let r = data[pixelIndex * 4];
      let g = data[pixelIndex * 4 + 1];
      let b = data[pixelIndex * 4 + 2];
      let a = data[pixelIndex * 4 + 3];
      if (a < 20) return true;
      if (r > 247 && g > 247 && b > 247) return true;
      return backgroundSamples.some((sample) => Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]) <= 28);
    }
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        let idx = y * canvas.width + x;
        if (visited[idx]) continue;
        visited[idx] = 1;
        if (isBackgroundPixel(idx)) continue;
        let { minX, maxX, minY, maxY, area } = measureSpriteComponent({ x, y, canvas, visited, isBackgroundPixel });
        if (area >= minArea) {
          components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
        }
      }
    }
    return components;
  }
  function measureSpriteComponent({ x, y, canvas, visited, isBackgroundPixel }) {
    let qx = [x];
    let qy = [y];
    let head = 0;
    let minX = x, maxX = x, minY = y, maxY = y, area = 0;
    while (head < qx.length) {
      let px = qx[head];
      let py = qy[head];
      head++;
      area++;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      let neighbors = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1]
      ];
      neighbors.forEach(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) return;
        let nIdx = ny * canvas.width + nx;
        if (visited[nIdx]) return;
        visited[nIdx] = 1;
        if (isBackgroundPixel(nIdx)) return;
        qx.push(nx);
        qy.push(ny);
      });
    }
    return { minX, maxX, minY, maxY, area };
  }

  // modules/rendering/hero-strip-frames.mjs
  function getHeroStripAnchor(inputs2, image, frameCount) {
    if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return null;
    let frameWidth = Math.max(1, Math.round(image.width / frameCount));
    let raw = { x: 0, y: 0, width: frameWidth, height: image.height };
    let content = inputs2.trimRectToContent(image, raw, 1) || raw;
    return {
      xRatio: 0.5,
      anchorY: content.y + content.height - raw.y,
      basisHeight: Math.max(1, content.height)
    };
  }
  function buildAnchoredHeroStripFrames(image, frameCount, anchor) {
    if (!image || !anchor || !Number.isFinite(frameCount) || frameCount <= 0) return [];
    let frames = [];
    for (let i = 0; i < frameCount; i++) {
      let x = Math.round(i * image.width / frameCount);
      let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
      let raw = { x, y: 0, width: Math.max(1, nextX - x), height: image.height };
      frames.push(withImageRef(image, {
        ...raw,
        anchorX: raw.width * anchor.xRatio,
        anchorY: anchor.anchorY,
        basisHeight: anchor.basisHeight
      }));
    }
    return frames.filter(Boolean);
  }
  function buildDirectionalHeroAttackFrames(inputs2, directionKeys, anchor, motionAnchors) {
    let result = {};
    Object.entries(directionKeys || {}).forEach(([direction, keys]) => {
      let variants = (Array.isArray(keys) ? keys : []).map((key, index) => {
        let image = inputs2.battleAssets.images[key];
        let frameCount = heroStripFrameCounts[key] || inferStripFallbackColumns(image);
        let motionAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, "attack", index, direction);
        return buildAnchoredHeroStripFrames(image, frameCount, motionAnchor);
      }).filter((frames) => frames.length > 0);
      if (variants.length > 0) result[direction] = variants;
    });
    return result;
  }
  function buildHeroFrameSetFromStripKeys(inputs2, stripKeys, heroId) {
    if (!stripKeys) return null;
    let motionDefinition = typeof inputs2.PLAYER_CLASS_DEFS === "object" ? inputs2.PLAYER_CLASS_DEFS[heroId] : null;
    let motionAnchors = motionDefinition && motionDefinition.motionAnchors;
    let idleImage = inputs2.battleAssets.images[stripKeys.idle];
    let idleCount = heroStripFrameCounts[stripKeys.idle];
    let anchor = getHeroStripAnchor(inputs2, idleImage, idleCount);
    let idleAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, "idle", 0);
    let walkAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, "walk", 0);
    let { idleFrames, idleDirections, walkFrames, walkDirections } = buildHeroStripMotionFrames({ idleImage, idleCount, idleAnchor, stripKeys, inputs: inputs2, anchor, motionAnchors, walkAnchor });
    let { attackVariants, attackDirections, attackVariantWeights, attackFrames } = buildHeroStripAttackFrames({ stripKeys, inputs: inputs2, anchor, motionAnchors, motionDefinition });
    let hurtFrames = buildAnchoredHeroStripFrames(inputs2.battleAssets.images[stripKeys.hurt], heroStripFrameCounts[stripKeys.hurt], idleAnchor);
    let downFrames = buildAnchoredHeroStripFrames(inputs2.battleAssets.images[stripKeys.death], heroStripFrameCounts[stripKeys.death], idleAnchor);
    if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
    let hold = idleFrames[0] || walkFrames[0] || attackFrames[0];
    return describeHeroStripFrames({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames, attackVariants, attackVariantWeights });
  }
  function buildHeroStripMotionFrames({ idleImage, idleCount, idleAnchor, stripKeys, inputs: inputs2, anchor, motionAnchors, walkAnchor }) {
    let idleFrames = buildAnchoredHeroStripFrames(idleImage, idleCount, idleAnchor);
    let idleDirections = Object.fromEntries(Object.entries(stripKeys.idleDirections || {}).map(([direction, key]) => [
      direction,
      buildAnchoredHeroStripFrames(inputs2.battleAssets.images[key], heroStripFrameCounts[key] || idleCount, resolveHeroMotionStripAnchor(anchor, motionAnchors, "idle", 0, direction))
    ]).filter((entry) => entry[1].length > 0));
    let walkFrames = buildAnchoredHeroStripFrames(inputs2.battleAssets.images[stripKeys.walk], heroStripFrameCounts[stripKeys.walk], walkAnchor);
    let walkDirections = Object.fromEntries(Object.entries(stripKeys.walkDirections || {}).map(([direction, key]) => [
      direction,
      buildAnchoredHeroStripFrames(inputs2.battleAssets.images[key], heroStripFrameCounts[key] || heroStripFrameCounts[stripKeys.walk], resolveHeroMotionStripAnchor(anchor, motionAnchors, "walk", 0, direction))
    ]).filter((entry) => entry[1].length > 0));
    return { idleFrames, idleDirections, walkFrames, walkDirections };
  }
  function buildHeroStripAttackFrames({ stripKeys, inputs: inputs2, anchor, motionAnchors, motionDefinition }) {
    let attackKeys = Array.isArray(stripKeys.attacks) && stripKeys.attacks.length > 0 ? stripKeys.attacks : [stripKeys.attack];
    let attackVariants = attackKeys.map((key, index) => buildAnchoredHeroStripFrames(
      inputs2.battleAssets.images[key],
      heroStripFrameCounts[key],
      resolveHeroMotionStripAnchor(anchor, motionAnchors, "attack", index)
    )).filter((frames) => frames.length > 0);
    let attackDirections = buildDirectionalHeroAttackFrames(inputs2, stripKeys.attackDirections, anchor, motionAnchors);
    let attackVariantWeights = motionDefinition && Array.isArray(motionDefinition.attackVariantWeights) && motionDefinition.attackVariantWeights.length === attackVariants.length ? motionDefinition.attackVariantWeights.slice() : null;
    let attackFrames = attackVariants[0] || [];
    return { attackVariants, attackDirections, attackVariantWeights, attackFrames };
  }
  function describeHeroStripFrames({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames, attackVariants, attackVariantWeights }) {
    return {
      characterAnimations: describeHeroStripAnimations({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames }),
      clipLoop: {
        idle: true,
        walk_or_run: true,
        sword_attack_body: false,
        cast_body: false,
        hurt: false,
        down_or_knockdown: false,
        bow_attack_body: false
      },
      idle: idleFrames,
      idleDirections,
      walk: walkFrames,
      run: walkFrames,
      attackVariants,
      attackDirections,
      attackVariantWeights,
      swordCombo: attackFrames,
      castCombo: attackFrames,
      projectileCombo: attackFrames,
      bowCombo: attackFrames,
      hurt: hurtFrames,
      down: downFrames,
      attack: attackFrames[0] || hold || null,
      sideIdle: hold || null,
      sideWalk: walkFrames[0] || hold || null,
      frontIdle: hold || null,
      frontGuard: idleFrames[1] || hold || null
    };
  }
  function describeHeroStripAnimations({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames }) {
    return {
      idle: idleFrames,
      idleDirections,
      walk_or_run: walkFrames,
      walkDirections,
      attackDirections,
      sword_attack_body: attackFrames,
      cast_body: attackFrames,
      hurt: hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
      down_or_knockdown: downFrames.length > 0 ? downFrames : hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
      bow_attack_body: attackFrames
    };
  }

  // modules/rendering/hero-frame-sets.mjs
  function buildHeroFrameSetFromDetectedRows(inputs2, image) {
    let detected = detectSpriteComponents(inputs2, image, 650).filter((rect) => rect.width >= 36 && rect.height >= 48).sort((a, b) => a.y - b.y || a.x - b.x);
    if (detected.length < 4) return null;
    let rows = [];
    let rowThreshold = Math.max(14, Math.round((image.height || 900) * 0.07));
    detected.forEach((rect) => {
      let row = rows.find((entry) => Math.abs(entry.anchorY - rect.y) <= rowThreshold);
      if (!row) {
        row = { anchorY: rect.y, items: [] };
        rows.push(row);
      }
      row.items.push(rect);
      row.anchorY = Math.round((row.anchorY * (row.items.length - 1) + rect.y) / row.items.length);
    });
    rows.sort((a, b) => a.anchorY - b.anchorY);
    rows.forEach((row) => row.items.sort((a, b) => a.x - b.x));
    let walkRow = rows[0] ? rows[0].items : [];
    let combatRow = rows[1] ? rows[1].items : walkRow;
    if (walkRow.length === 0 || combatRow.length === 0) return null;
    function trim(rect) {
      return inputs2.trimRectToContent(image, padSpriteRect(rect, image, 4), 2);
    }
    let { walkA, walkB, frontIdle, frontGuard } = pickDetectedHeroFrontFrames(trim, walkRow, combatRow);
    let { sideIdle, attack } = pickDetectedHeroSideFrames(trim, combatRow, walkRow);
    let { extraA, extraB } = pickDetectedHeroExtraFrames(trim, combatRow);
    return buildHeroFrameSet([frontIdle, frontGuard, sideIdle, attack, walkA, extraA, extraB, attack, walkB]);
  }
  function buildHeroFrameSet(frames) {
    let base = (frames || []).filter(Boolean);
    let { frontIdle, frontGuard, attack, sideIdle, sideWalk } = pickLegacyHeroMeleePoses(base);
    let { rangedAttack, castAttack, heavyAttack } = pickLegacyHeroSpellPoses(base, attack);
    return {
      frontIdle,
      frontGuard,
      sideIdle,
      attack,
      sideWalk,
      rangedAttack,
      castAttack,
      heavyAttack,
      idle: [frontIdle, frontGuard, sideIdle],
      walk: [sideWalk, sideIdle, sideWalk, frontGuard],
      swordCombo: [attack, sideIdle, attack],
      whirlCombo: [attack, sideWalk, attack, sideIdle],
      chaosCombo: [attack, sideIdle, attack],
      lightningCombo: [rangedAttack, sideIdle, rangedAttack],
      castCombo: [castAttack, frontGuard, castAttack],
      frostCombo: [castAttack, sideIdle, frontGuard],
      quakeCombo: [heavyAttack, attack, frontGuard],
      projectileCombo: [rangedAttack, sideIdle, rangedAttack]
    };
  }
  function buildSafeHeroFrameSetFromClipDefs(inputs2, image, defs) {
    let bodyFrames = {};
    Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
      let prepared = padSpriteRect(rect, image, 4);
      let trimmed = inputs2.trimRectToContent(image, prepared, 2);
      if (hasUsableFrame(trimmed)) {
        if (Number.isFinite(rect.basisHeight)) trimmed.basisHeight = rect.basisHeight;
        if (Number.isFinite(rect.offsetX)) trimmed.offsetX = rect.offsetX;
        if (Number.isFinite(rect.offsetY)) trimmed.offsetY = rect.offsetY;
        bodyFrames[id] = trimmed;
      }
    });
    function resolveClip(name) {
      return (defs.characterAnimations && defs.characterAnimations[name] ? defs.characterAnimations[name] : []).map((id) => bodyFrames[id]).filter(Boolean);
    }
    let characterAnimations = {
      idle: resolveClip("idle"),
      walk_or_run: resolveClip("walk_or_run"),
      sword_attack_body: resolveClip("sword_attack_body"),
      cast_body: resolveClip("cast_body"),
      hurt: resolveClip("hurt"),
      down_or_knockdown: resolveClip("down_or_knockdown"),
      bow_attack_body: resolveClip("bow_attack_body")
    };
    return describeLegacyHeroClips(characterAnimations, defs);
  }
  function buildSafeHeroFrameSetBattleHero1(inputs2, image) {
    return buildSafeHeroFrameSetFromClipDefs(inputs2, image, getBattleHero1SafeClipDefs());
  }
  function buildHeroFrameSetBattleHero1(inputs2, image) {
    return buildSafeHeroFrameSetBattleHero1(inputs2, image);
  }
  function pickDetectedHeroFrontFrames(trim, walkRow, combatRow) {
    let walkA = trim(walkRow[0]);
    let walkB = trim(walkRow[1] || walkRow[0]);
    let frontIdle = trim(combatRow[0] || walkRow[0]);
    let frontGuard = trim(combatRow[1] || combatRow[0] || walkRow[0]);
    return { walkA, walkB, frontIdle, frontGuard };
  }
  function pickDetectedHeroSideFrames(trim, combatRow, walkRow) {
    let sideIdle = trim(combatRow[2] || combatRow[1] || combatRow[0] || walkRow[0]);
    let attack = trim(combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    return { sideIdle, attack };
  }
  function pickDetectedHeroExtraFrames(trim, combatRow) {
    let extraA = trim(combatRow[4] || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    let extraB = trim(combatRow[5] || extraA || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    return { extraA, extraB };
  }
  function pickLegacyHeroMeleePoses(base) {
    let frontIdle = base[0];
    let frontGuard = base[1] || frontIdle;
    let sideIdle = base[2] || frontIdle || frontGuard;
    let attack = base[3] || sideIdle || frontIdle;
    let sideWalk = base[4] || sideIdle || attack;
    return { frontIdle, frontGuard, attack, sideIdle, sideWalk };
  }
  function pickLegacyHeroSpellPoses(base, attack) {
    let rangedAttack = base[5] || attack;
    let castAttack = base[6] || rangedAttack || attack;
    let heavyAttack = base[7] || attack;
    return { rangedAttack, castAttack, heavyAttack };
  }
  function describeLegacyHeroClips(characterAnimations, defs) {
    return {
      characterAnimations,
      clipLoop: { ...defs.clipLoop || {} },
      idle: characterAnimations.idle,
      walk: characterAnimations.walk_or_run,
      run: characterAnimations.walk_or_run,
      swordCombo: characterAnimations.sword_attack_body,
      castCombo: characterAnimations.cast_body,
      projectileCombo: characterAnimations.cast_body,
      bowCombo: characterAnimations.bow_attack_body,
      hurt: characterAnimations.hurt,
      down: characterAnimations.down_or_knockdown,
      attack: characterAnimations.sword_attack_body[0] || characterAnimations.idle[0] || null,
      sideIdle: characterAnimations.idle[0] || null,
      sideWalk: characterAnimations.walk_or_run[0] || characterAnimations.idle[0] || null,
      frontIdle: characterAnimations.idle[0] || null,
      frontGuard: characterAnimations.idle[1] || characterAnimations.idle[0] || null
    };
  }

  // modules/rendering/battle-atlas.mjs
  function buildBattleAssetAtlas(inputs2) {
    const { heroParts: heroParts2, heroPartsV2: heroPartsV22, enemyParts: enemyParts2, tileParts: tileParts2 } = createLegacyAtlasParts();
    const legacyHeroImage = inputs2.battleAssets.images.heroLegacy;
    let heroFramesLegacy = legacyHeroImage ? heroParts2.map((part) => inputs2.trimRectToContent(legacyHeroImage, part, 3)) : [];
    let heroFramesV2 = legacyHeroImage ? heroPartsV22.map((part) => inputs2.trimRectToContent(legacyHeroImage, part, 3)) : [];
    let { selectedHeroDef, heroFrameSetSource, heroFrameSet } = selectBattleHeroFrames(inputs2, heroFramesLegacy, legacyHeroImage, heroFramesV2);
    const enemySpriteImage = buildEnemyTransparentImage(inputs2, inputs2.battleAssets.images.enemies);
    const enemyFrames = Object.fromEntries(Object.entries(enemyParts2).map(([key, part]) => [key, inputs2.trimRectToContent(enemySpriteImage, part, key === "boss" ? 5 : 3)]));
    inputs2.battleImageCanvasCache.delete(enemySpriteImage);
    const wispEnemyVariants = buildWispEnemyVariants(inputs2, inputs2.battleAssets.images);
    let { enemyVariantPools, bossImages } = createEnemyAtlasPools(wispEnemyVariants, enemySpriteImage, enemyFrames, inputs2);
    const tileImage = inputs2.battleAssets.images.tiles || null;
    const tileFrames = tileImage ? tileParts2.map((part) => inputs2.trimRectToContent(tileImage, part, 2)) : [];
    return describeBattleAtlas({ inputs: inputs2, heroFrameSetSource, legacyHeroImage, selectedHeroDef, heroFrameSet, enemySpriteImage, enemyVariantPools, bossImages, enemyFrames, tileImage, tileFrames });
  }
  function resolveHeroImageForFrameSet(inputs2, heroFrameSetSource, legacyHeroImage, selectedHeroDef) {
    if (heroFrameSetSource === "legacy") return legacyHeroImage;
    let sourceDef = inputs2.getHeroSelectionDef(heroFrameSetSource) || selectedHeroDef || inputs2.PLAYER_CLASS_DEFS.archer;
    let strips = sourceDef && sourceDef.strips || {};
    return selectLoadedHeroImage(inputs2, strips, legacyHeroImage);
  }
  function selectBattleHeroFrames(inputs2, heroFramesLegacy, legacyHeroImage, heroFramesV2) {
    let selectedHeroDef = inputs2.getHeroSelectionDef(typeof inputs2.getHeroAppearanceId === "function" ? inputs2.getHeroAppearanceId() : inputs2.game.selectedHeroId);
    let heroFrameSetSource = selectedHeroDef.id;
    let heroFrameSet = buildHeroFrameSetFromStripKeys(inputs2, selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== "archer") {
      heroFrameSet = buildHeroFrameSetFromStripKeys(inputs2, inputs2.PLAYER_CLASS_DEFS.archer.strips, "archer");
      if (heroFrameSet) heroFrameSetSource = "archer";
    }
    if (!heroFrameSet && heroFramesLegacy.length > 0) {
      heroFrameSet = buildHeroFrameSet(heroFramesLegacy);
      heroFrameSetSource = "legacy";
    }
    ({ heroFrameSet } = selectLegacyHeroFrames(heroFrameSet, legacyHeroImage, inputs2, heroFramesV2));
    if (!heroFrameSet) {
      heroFrameSetSource = "none";
      heroFrameSet = {
        characterAnimations: { idle: [], walk_or_run: [], sword_attack_body: [], cast_body: [], hurt: [], down_or_knockdown: [], bow_attack_body: [] },
        clipLoop: {},
        idle: [],
        walk: [],
        run: []
      };
    }
    return { selectedHeroDef, heroFrameSetSource, heroFrameSet };
  }
  function createEnemyAtlasPools(wispEnemyVariants, enemySpriteImage, enemyFrames, inputs2) {
    let enemyVariantPools = {
      // 일반과 정예는 자기 시트로 그린다(액트 몬스터 js/canvas-monster-actors.js, 위습 js/canvas-wisp-actors.js).
      // 이 아틀라스 목록은 그 시트를 못 불러왔을 때의 대체 그림이다.
      normal: wispEnemyVariants.length ? wispEnemyVariants : [
        { image: enemySpriteImage, frame: enemyFrames.slime },
        { image: enemySpriteImage, frame: enemyFrames.bandit },
        { image: enemySpriteImage, frame: enemyFrames.shadow },
        { image: enemySpriteImage, frame: enemyFrames.wraith }
      ].filter((entry) => hasUsableFrame(entry.frame)),
      elite: wispEnemyVariants.length ? wispEnemyVariants : [
        { image: enemySpriteImage, frame: enemyFrames.knight },
        { image: enemySpriteImage, frame: enemyFrames.skeleton }
      ].filter((entry) => hasUsableFrame(entry.frame)),
      boss: [
        { image: enemySpriteImage, frame: enemyFrames.boss }
      ].filter((entry) => hasUsableFrame(entry.frame))
    };
    const bossImages = {};
    if (typeof inputs2.BOSS_ASSET_MANIFEST !== "undefined") {
      Object.keys(inputs2.BOSS_ASSET_MANIFEST).forEach((key) => {
        if (inputs2.battleAssets.images[key]) bossImages[key] = inputs2.battleAssets.images[key];
      });
    }
    return { enemyVariantPools, bossImages };
  }
  function describeBattleAtlas({ inputs: inputs2, heroFrameSetSource, legacyHeroImage, selectedHeroDef, heroFrameSet, enemySpriteImage, enemyVariantPools, bossImages, enemyFrames, tileImage, tileFrames }) {
    return {
      hero: {
        image: resolveHeroImageForFrameSet(inputs2, heroFrameSetSource, legacyHeroImage, selectedHeroDef),
        frames: heroFrameSet
      },
      enemies: {
        image: enemySpriteImage,
        variants: enemyVariantPools,
        bossImages,
        frames: {
          slime: enemyFrames.slime,
          wraith: enemyFrames.wraith,
          knight: enemyFrames.knight,
          bandit: enemyFrames.bandit,
          shadow: enemyFrames.shadow,
          boss: enemyFrames.boss,
          skeleton: enemyFrames.skeleton
        }
      },
      tiles: {
        image: tileImage,
        frames: {
          grass: readAtlasTile(tileFrames, 0),
          grassDeep: readAtlasTile(tileFrames, 1),
          moss: readAtlasTile(tileFrames, 2),
          stone: readAtlasTile(tileFrames, 3),
          dirt: readAtlasTile(tileFrames, 4),
          dirtWarm: readAtlasTile(tileFrames, 5),
          grassBright: readAtlasTile(tileFrames, 6),
          swamp: readAtlasTile(tileFrames, 7),
          ruin: readAtlasTile(tileFrames, 8),
          frost: readAtlasTile(tileFrames, 9),
          lava: readAtlasTile(tileFrames, 10),
          chest: readAtlasTile(tileFrames, 11),
          roots: readAtlasTile(tileFrames, 12),
          abyss: readAtlasTile(tileFrames, 13),
          temple: readAtlasTile(tileFrames, 14),
          templeAlt: readAtlasTile(tileFrames, 15)
        }
      }
    };
  }
  function selectLoadedHeroImage(inputs2, strips, legacyHeroImage) {
    return selectClassHeroImage(inputs2, strips) || inputs2.battleAssets.images.hero1Idle || inputs2.battleAssets.images.hero1Walk || inputs2.battleAssets.images.hero1Attack || inputs2.battleAssets.images.hero1Hurt || inputs2.battleAssets.images.hero1Death || legacyHeroImage;
  }
  function selectClassHeroImage(inputs2, strips) {
    return inputs2.battleAssets.images[strips.idle] || inputs2.battleAssets.images[strips.walk] || inputs2.battleAssets.images[strips.attack] || inputs2.battleAssets.images[strips.hurt] || inputs2.battleAssets.images[strips.death];
  }
  function detectCustomHeroFrames(legacyHeroImage, inputs2, heroFrameSet) {
    let scaledParts = buildScaledHeroParts(legacyHeroImage);
    let scaledFrames = scaledParts.map((part) => inputs2.trimRectToContent(legacyHeroImage, part, 3));
    let scaledUsableCount = scaledFrames.filter(hasUsableFrame).length;
    if (scaledUsableCount >= 5) heroFrameSet = buildHeroFrameSet(scaledFrames);
    let detectedCustom = buildHeroFrameSetFromDetectedRows(inputs2, legacyHeroImage);
    if (detectedCustom) heroFrameSet = detectedCustom;
    return { heroFrameSet };
  }
  function selectLegacyHeroFrames(heroFrameSet, legacyHeroImage, inputs2, heroFramesV2) {
    if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1448, 1086, 0.05)) {
      heroFrameSet = buildHeroFrameSetBattleHero1(inputs2, legacyHeroImage);
    } else if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1264, 842, 0.05)) {
      heroFrameSet = buildHeroFrameSet(heroFramesV2);
      let detectedV2 = buildHeroFrameSetFromDetectedRows(inputs2, legacyHeroImage);
      if (detectedV2) heroFrameSet = detectedV2;
    } else if (!heroFrameSet && legacyHeroImage) {
      ({ heroFrameSet } = detectCustomHeroFrames(legacyHeroImage, inputs2, heroFrameSet));
    }
    return { heroFrameSet };
  }
  function readAtlasTile(tileFrames, index) {
    return tileFrames[index] || null;
  }

  // modules/rendering/battle-sprite-alpha.mjs
  function getBattleActorDrawAlpha(ctx, alpha) {
    return (alpha ?? 1) * (ctx.battleActorAlpha ?? 1);
  }

  // modules/rendering/battle-sprite-painter.mjs
  var OUTLINED_SPRITE_CACHE_LIMIT = 192;
  var BattleSpritePainter = class {
    constructor(inputs2) {
      this.inputs = inputs2;
      this.disposed = false;
      this.outlinedSpriteCache = /* @__PURE__ */ new Map();
      this.outlinedSpriteImageIds = /* @__PURE__ */ new WeakMap();
      this.outlinedSpriteNextImageId = 1;
    }
    getOutlinedSpriteSurface(sourceImage, src, size, outline) {
      let imageId = this.outlinedSpriteImageIds.get(sourceImage);
      if (!imageId) {
        imageId = this.outlinedSpriteNextImageId++;
        this.outlinedSpriteImageIds.set(sourceImage, imageId);
      }
      const key = [imageId, src.x, src.y, src.w, src.h, size.w, size.h, outline.color, outline.thickness, outline.smooth, outline.fill].join("|");
      const cached = this.outlinedSpriteCache.get(key);
      if (cached) {
        this.outlinedSpriteCache.delete(key);
        this.outlinedSpriteCache.set(key, cached);
        return cached;
      }
      const surface = this.createOutlinedSpriteSurface(sourceImage, src, size, outline);
      if (!surface) return null;
      this.outlinedSpriteCache.set(key, surface);
      if (this.outlinedSpriteCache.size > OUTLINED_SPRITE_CACHE_LIMIT) this.outlinedSpriteCache.delete(this.outlinedSpriteCache.keys().next().value);
      return surface;
    }
    createOutlinedSpriteSurface(sourceImage, src, size, outline) {
      if (typeof this.inputs.document === "undefined" || typeof this.inputs.document.createElement !== "function") return null;
      const t = outline.thickness, color = outline.color;
      const canvas = this.inputs.document.createElement("canvas");
      canvas.width = size.w + t * 2;
      canvas.height = size.h + t * 2;
      const c = canvas.getContext && canvas.getContext("2d");
      if (!c) return null;
      c.imageSmoothingEnabled = outline.smooth;
      if (!outline.fill) c.filter = `drop-shadow(0 ${t}px 0 ${color}) drop-shadow(0 ${-t}px 0 ${color}) drop-shadow(${t}px 0 0 ${color}) drop-shadow(${-t}px 0 0 ${color})`;
      c.drawImage(sourceImage, src.x, src.y, src.w, src.h, t, t, size.w, size.h);
      if (outline.fill) {
        c.globalCompositeOperation = "source-in";
        c.fillStyle = color;
        c.fillRect(0, 0, canvas.width, canvas.height);
      }
      return canvas;
    }
    drawBattleSpriteImage(ctx, image, source, box, flash) {
      if (this.disposed) return;
      ctx.drawImage(image, ...source, ...box);
      if (!(flash > 0)) return;
      const [x, y, w, h] = source;
      const surface = this.getOutlinedSpriteSurface(
        image,
        { x, y, w, h },
        { w, h },
        { color: "#fff4df", thickness: 0, smooth: false, fill: true }
      );
      if (!surface) return;
      ctx.save();
      ctx.filter = "none";
      ctx.globalAlpha *= Math.min(1, Number(flash));
      ctx.drawImage(surface, ...box);
      ctx.restore();
    }
    drawBattleSpriteOutline(ctx, sourceImage, src, box, options) {
      if (this.disposed) return;
      const thickness = Math.max(1, Math.round(options.outlineThickness || 1));
      const surface = this.getOutlinedSpriteSurface(
        sourceImage,
        src,
        { w: box.w, h: box.h },
        { color: options.outlineColor, thickness, smooth: ctx.imageSmoothingEnabled !== false }
      );
      if (!surface) return;
      ctx.globalAlpha = (options.alpha === void 0 ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
      ctx.drawImage(surface, box.x - thickness, box.y - thickness, box.w + thickness * 2, box.h + thickness * 2);
      ctx.globalAlpha = options.alpha === void 0 ? 1 : options.alpha;
    }
    drawBattleSprite([ctx, image, rect, x, y, desiredHeight, options]) {
      if (this.disposed) return;
      if (!rect) return;
      options = options || {};
      let sourceImage = rect.image || image;
      if (!sourceImage) return;
      let basisHeight = options.basisHeight || rect.basisHeight || rect.height;
      let scale = desiredHeight / basisHeight;
      let { cropLeft, cropRight, cropTop, cropBottom } = readBattleSpriteCrop(options, rect);
      let srcX = rect.x + cropLeft;
      let srcY = rect.y + cropTop;
      let srcW = Math.max(1, rect.width - cropLeft - cropRight);
      let srcH = Math.max(1, rect.height - cropTop - cropBottom);
      let drawWidth = Math.max(1, Math.round(srcW * scale));
      let drawHeight = Math.max(1, Math.round(srcH * scale));
      let { sourceAnchorX, sourceAnchorY } = readBattleSpriteAnchors.call(this, { options, rect, cropLeft, srcW, cropTop, srcH });
      let { dx, dy } = placeBattleSpriteOrigin({ options, rect, x, sourceAnchorX, scale, y, sourceAnchorY });
      ctx.save();
      ctx.globalAlpha = getBattleActorDrawAlpha(ctx, options.alpha);
      if (options.smoothing === "high") {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      } else if (options.smoothing === "pixel") {
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = "low";
      }
      paintBattleSpriteTransform.call(this, { options, ctx, x, y, drawHeight, sourceImage, srcX, srcY, srcW, srcH, drawWidth, dx, dy });
      ctx.restore();
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.outlinedSpriteCache.clear();
      this.outlinedSpriteImageIds = /* @__PURE__ */ new WeakMap();
      this.outlinedSpriteNextImageId = 1;
    }
  };
  function readBattleSpriteCrop(options, rect) {
    let cropLeft = Math.max(0, Math.round(options.cropLeft === void 0 ? rect.cropLeft || 0 : options.cropLeft));
    let cropRight = Math.max(0, Math.round(options.cropRight === void 0 ? rect.cropRight || 0 : options.cropRight));
    let cropTop = Math.max(0, Math.round(options.cropTop === void 0 ? rect.cropTop || 0 : options.cropTop));
    let cropBottom = Math.max(0, Math.round(options.cropBottom === void 0 ? rect.cropBottom || 0 : options.cropBottom));
    return { cropLeft, cropRight, cropTop, cropBottom };
  }
  function readBattleSpriteAnchors({ options, rect, cropLeft, srcW, cropTop, srcH }) {
    let rawAnchorX = Number.isFinite(options.anchorX) ? options.anchorX : Number.isFinite(rect.anchorX) ? rect.anchorX : rect.width / 2;
    let rawAnchorY = Number.isFinite(options.anchorY) ? options.anchorY : Number.isFinite(rect.anchorY) ? rect.anchorY : rect.height;
    let sourceAnchorX = this.inputs.clampNumber(rawAnchorX - cropLeft, 0, srcW);
    let sourceAnchorY = this.inputs.clampNumber(rawAnchorY - cropTop, 0, srcH);
    return { sourceAnchorX, sourceAnchorY };
  }
  function placeBattleSpriteOrigin({ options, rect, x, sourceAnchorX, scale, y, sourceAnchorY }) {
    let drawOffsetX = Number(options.offsetX !== void 0 ? options.offsetX : rect.offsetX) || 0;
    let drawOffsetY = Number(options.offsetY !== void 0 ? options.offsetY : rect.offsetY) || 0;
    let dx = Math.round(x - sourceAnchorX * scale + drawOffsetX);
    let dy = Math.round(y - sourceAnchorY * scale + drawOffsetY);
    return { dx, dy };
  }
  function paintBattleSpriteTransform({ options, ctx, x, y, drawHeight, sourceImage, srcX, srcY, srcW, srcH, drawWidth, dx, dy }) {
    if (options.rotation) {
      ctx.translate(Math.round(x + (options.offsetX || 0)), Math.round(y - drawHeight / 2 + (options.offsetY || 0)));
      ctx.rotate(options.rotation);
      if (options.outlineColor) this.drawBattleSpriteOutline(
        ctx,
        sourceImage,
        { x: srcX, y: srcY, w: srcW, h: srcH },
        { x: Math.round(-drawWidth / 2), y: Math.round(-drawHeight / 2), w: drawWidth, h: drawHeight },
        options
      );
      this.drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight], options.flash);
    } else {
      if (options.devicePixelSnap === true) {
        let snappedRect = this.inputs.snapCanvasRectToDevicePixels(ctx, dx, dy, drawWidth, drawHeight);
        dx = snappedRect.x;
        dy = snappedRect.y;
        drawWidth = snappedRect.width;
        drawHeight = snappedRect.height;
      }
      if (options.flipX) {
        let centerX = dx + drawWidth / 2;
        ctx.translate(centerX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-centerX, 0);
      }
      if (options.outlineColor) this.drawBattleSpriteOutline(
        ctx,
        sourceImage,
        { x: srcX, y: srcY, w: srcW, h: srcH },
        { x: dx, y: dy, w: drawWidth, h: drawHeight },
        options
      );
      this.drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [dx, dy, drawWidth, drawHeight], options.flash);
    }
  }

  // modules/browser/battle-asset-loading.mjs
  function deferredImage(group, environment) {
    let cached = null, active = null, retryAfter = 0, deadline = null, disposed = false;
    function request() {
      const image = environment.createImage();
      active = image;
      if (environment.protocol() !== "file:") image.crossOrigin = "anonymous";
      image.decoding = "async";
      const timeout = deadline = environment.schedule(() => fail("timeout"), 15e3);
      function fail(reason) {
        if (active !== image) return;
        environment.cancel(timeout);
        deadline = null;
        active = null;
        retryAfter = environment.now() + 5e3;
        environment.warn("battle image load failed:", group.src, reason);
      }
      image.onload = () => {
        if (active !== image) return;
        environment.cancel(timeout);
        deadline = null;
        cached = image;
        active = null;
      };
      image.onerror = () => fail("network");
      image.src = group.src;
    }
    return {
      get() {
        if (!disposed && !cached && !active && environment.now() >= retryAfter) request();
        return cached;
      },
      set(image) {
        if (!disposed) cached = image;
      },
      dispose() {
        disposed = true;
        if (deadline !== null) environment.cancel(deadline);
        if (active) {
          active.onload = null;
          active.onerror = null;
        }
        deadline = null;
        active = null;
        cached = null;
      }
    };
  }
  function registerDeferredBattleImage(images, group, environment) {
    const access = deferredImage(group, environment);
    for (const key of group.keys) Object.defineProperty(images, key, { configurable: true, enumerable: true, ...access });
    return access.dispose;
  }
  function prepareBattleAssetGroups(manifest, criticalKeys, images, activeSkill, options) {
    const { profiles, signatures, backdrops, environment } = options;
    const activeSignature = profiles[activeSkill]?.signature;
    const deferredKeys = new Set(Object.entries(signatures).filter(([signature]) => signature !== activeSignature).map(([, spec]) => spec.asset));
    const groups = /* @__PURE__ */ new Map();
    for (const [key, path] of Object.entries(manifest)) {
      const src = key.startsWith("skillFx") ? path.replace(/\.png$/, ".webp") : path;
      if (!groups.has(src)) groups.set(src, { src, keys: [], priority: 3 });
      const group = groups.get(src);
      group.keys.push(key);
      if (criticalKeys.has(key)) group.priority = Math.min(group.priority, 0);
      else if (key.startsWith("backdrop")) group.priority = Math.min(group.priority, 1);
      else if (key.startsWith("bossAct")) group.priority = Math.min(group.priority, 2);
    }
    return Array.from(groups.values()).filter((group) => {
      if (group.keys.every((key) => /^(bg|backdrop)/.test(key) && !criticalKeys.has(key))) {
        const dispose2 = registerDeferredBattleImage(backdrops, group, environment);
        options.onDeferred?.(dispose2);
        return false;
      }
      if (group.keys.some((key) => !deferredKeys.has(key))) return true;
      const dispose = registerDeferredBattleImage(images, group, environment);
      options.onDeferred?.(dispose);
      return false;
    }).sort((a, b) => a.priority - b.priority || a.src.localeCompare(b.src));
  }

  // modules/browser/battle-image-manifest.mjs
  var HERO_IMAGES = {
    hero1Idle: "assets/playable/hero1/idle.png",
    hero1Walk: "assets/playable/hero1/walk.png",
    hero1Attack: "assets/playable/hero1/attack.png",
    hero1Hurt: "assets/playable/hero1/idle.png",
    hero1Death: "assets/playable/hero1/idle.png",
    hero2Idle: "assets/playable/hero2/idle.png",
    hero2Walk: "assets/playable/hero2/walk.png",
    hero2Attack: "assets/playable/hero2/attack.png",
    hero2Hurt: "assets/playable/hero2/idle.png",
    hero2Death: "assets/playable/hero2/idle.png",
    hero3Idle: "assets/playable/hero3/idle.png",
    hero3Walk: "assets/playable/hero3/walk.png",
    hero3Attack: "assets/playable/hero3/attack.png",
    hero3Hurt: "assets/playable/hero3/idle.png",
    hero3Death: "assets/playable/hero3/idle.png",
    hero4Idle: "assets/playable/hero4/idle.png",
    hero4Walk: "assets/playable/hero4/walk.png",
    hero4Attack: "assets/playable/hero4/attack.png",
    hero4Hurt: "assets/playable/hero4/idle.png",
    hero4Death: "assets/playable/hero4/idle.png",
    hero5Idle: "assets/playable/hero5/idle.png",
    hero5Walk: "assets/playable/hero5/walk.png",
    hero5Attack: "assets/playable/hero5/attack.png",
    hero5Hurt: "assets/playable/hero5/idle.png",
    hero5Death: "assets/playable/hero5/idle.png",
    hero6Idle: "assets/playable/hero6/idle.png",
    hero6Walk: "assets/playable/hero6/walk.png",
    hero6Attack: "assets/playable/hero6/attack.png",
    hero6Hurt: "assets/playable/hero6/idle.png",
    hero6Death: "assets/playable/hero6/idle.png",
    hero7Idle: "assets/playable/hero7/idle.png",
    hero7Walk: "assets/playable/hero7/walk.png",
    hero7Attack: "assets/playable/hero7/attack.png",
    hero7Hurt: "assets/playable/hero7/idle.png",
    hero7Death: "assets/playable/hero7/idle.png",
    hero8Idle: "assets/playable/hero8/idle.png",
    hero8Walk: "assets/playable/hero8/walk.png",
    hero8Attack: "assets/playable/hero8/attack.png",
    hero8Hurt: "assets/playable/hero8/idle.png",
    hero8Death: "assets/playable/hero8/idle.png",
    hero9Idle: "assets/playable/hero9/idle.png",
    hero9Walk: "assets/playable/hero9/walk.png",
    hero9Attack: "assets/playable/hero9/attack.png",
    hero9Hurt: "assets/playable/hero9/idle.png",
    hero9Death: "assets/playable/hero9/idle.png",
    hero10Idle: "assets/playable/hero10/idle.png",
    hero10Walk: "assets/playable/hero10/walk.png",
    hero10Attack: "assets/playable/hero10/attack.png",
    hero10Hurt: "assets/playable/hero10/idle.png",
    hero10Death: "assets/playable/hero10/idle.png",
    playerClassOccultistIdle: "assets/playable/classes/occultist/idle.webp",
    playerClassOccultistIdleNorth: "assets/playable/classes/occultist/idle-north.webp",
    playerClassOccultistIdleSouth: "assets/playable/classes/occultist/idle-south.webp",
    playerClassOccultistWalk: "assets/playable/classes/occultist/walk.webp",
    playerClassOccultistWalkNorth: "assets/playable/classes/occultist/walk-north.webp",
    playerClassOccultistWalkSouth: "assets/playable/classes/occultist/walk-south.webp?v=20260902-walk-repair3",
    playerClassOccultistWalkWest: "assets/playable/classes/occultist/walk-west.webp",
    playerClassOccultistAttack: "assets/playable/classes/occultist/attack.webp",
    playerClassOccultistAttack2: "assets/playable/classes/occultist/attack-2.webp",
    playerClassOccultistAttackNorth: "assets/playable/classes/occultist/attack-north.webp",
    playerClassOccultistAttack2North: "assets/playable/classes/occultist/attack-2-north.webp",
    playerClassOccultistAttackSouth: "assets/playable/classes/occultist/attack-south.webp",
    playerClassOccultistAttack2South: "assets/playable/classes/occultist/attack-2-south.webp",
    playerClassWandererIdle: "assets/playable/classes/wanderer/idle.webp",
    playerClassWandererIdleNorth: "assets/playable/classes/wanderer/idle-north.webp",
    playerClassWandererIdleSouth: "assets/playable/classes/wanderer/idle-south.webp",
    playerClassWandererWalk: "assets/playable/classes/wanderer/walk.webp",
    playerClassWandererWalkNorth: "assets/playable/classes/wanderer/walk-north.webp",
    playerClassWandererWalkSouth: "assets/playable/classes/wanderer/walk-south.webp",
    playerClassWandererWalkWest: "assets/playable/classes/wanderer/walk-west.webp",
    playerClassWandererAttack: "assets/playable/classes/wanderer/attack.webp",
    playerClassWandererAttack2: "assets/playable/classes/wanderer/attack-2.webp",
    playerClassWandererAttackNorth: "assets/playable/classes/wanderer/attack-north.webp",
    playerClassWandererAttackSouth: "assets/playable/classes/wanderer/attack-south.webp",
    playerClassWandererAttack2South: "assets/playable/classes/wanderer/attack-2-south.webp",
    playerClassClericIdle: "assets/playable/classes/cleric/idle.webp",
    playerClassClericIdleNorth: "assets/playable/classes/cleric/idle-north.webp",
    playerClassClericIdleSouth: "assets/playable/classes/cleric/idle-south.webp",
    playerClassClericWalk: "assets/playable/classes/cleric/walk.webp",
    playerClassClericWalkNorth: "assets/playable/classes/cleric/walk-north.webp",
    playerClassClericWalkSouth: "assets/playable/classes/cleric/walk-south.webp?v=20260902-walk-repair2",
    playerClassClericWalkWest: "assets/playable/classes/cleric/walk-west.webp",
    playerClassClericAttack: "assets/playable/classes/cleric/attack.webp",
    playerClassClericAttackNorth: "assets/playable/classes/cleric/attack-north.webp",
    playerClassClericAttackSouth: "assets/playable/classes/cleric/attack-south.webp",
    playerClassArcherIdle: "assets/playable/classes/archer/idle.webp",
    playerClassArcherIdleNorth: "assets/playable/classes/archer/idle-north.webp",
    playerClassArcherIdleSouth: "assets/playable/classes/archer/idle-south.webp",
    playerClassArcherWalk: "assets/playable/classes/archer/walk.webp",
    playerClassArcherWalkNorth: "assets/playable/classes/archer/walk-north.webp",
    playerClassArcherWalkSouth: "assets/playable/classes/archer/walk-south.webp",
    playerClassArcherWalkWest: "assets/playable/classes/archer/walk-west.webp",
    playerClassArcherAttack: "assets/playable/classes/archer/attack.webp",
    playerClassArcherAttack2: "assets/playable/classes/archer/attack-2.webp",
    playerClassArcherAttackNorth: "assets/playable/classes/archer/attack-north.webp",
    playerClassArcherAttack2North: "assets/playable/classes/archer/attack-2-north.webp",
    playerClassArcherAttackSouth: "assets/playable/classes/archer/attack-south.webp",
    playerClassArcherAttack2South: "assets/playable/classes/archer/attack-2-south.webp",
    playerClassAlchemistIdle: "assets/playable/classes/alchemist/idle.webp",
    playerClassAlchemistIdleNorth: "assets/playable/classes/alchemist/idle-north.webp",
    playerClassAlchemistIdleSouth: "assets/playable/classes/alchemist/idle-south.webp",
    playerClassAlchemistWalk: "assets/playable/classes/alchemist/walk.webp?v=20260902-walk-repair2",
    playerClassAlchemistWalkNorth: "assets/playable/classes/alchemist/walk-north.webp?v=20260902-walk-repair2",
    playerClassAlchemistWalkSouth: "assets/playable/classes/alchemist/walk-south.webp?v=20260902-walk-repair2",
    playerClassAlchemistWalkWest: "assets/playable/classes/alchemist/walk-west.webp?v=20260902-walk-repair2",
    playerClassAlchemistAttack: "assets/playable/classes/alchemist/attack.webp",
    playerClassAlchemistAttack2: "assets/playable/classes/alchemist/attack-2.webp",
    playerClassAlchemistAttack3: "assets/playable/classes/alchemist/attack-3.webp",
    playerClassAlchemistAttackNorth: "assets/playable/classes/alchemist/attack-north.webp",
    playerClassAlchemistAttack2North: "assets/playable/classes/alchemist/attack-2-north.webp",
    playerClassAlchemistAttackSouth: "assets/playable/classes/alchemist/attack-south.webp",
    playerClassWarriorIdle: "assets/playable/classes/warrior/idle.webp",
    playerClassWarriorIdleNorth: "assets/playable/classes/warrior/idle-north.webp",
    playerClassWarriorIdleSouth: "assets/playable/classes/warrior/idle-south.webp",
    playerClassWarriorWalk: "assets/playable/classes/warrior/walk.webp?v=20260906-sheathed",
    playerClassWarriorWalkNorth: "assets/playable/classes/warrior/walk-north.webp",
    playerClassWarriorWalkSouth: "assets/playable/classes/warrior/walk-south.webp",
    playerClassWarriorWalkWest: "assets/playable/classes/warrior/walk-west.webp?v=20260906-sheathed",
    playerClassWarriorAttack: "assets/playable/classes/warrior/attack.webp",
    playerClassWarriorAttack2: "assets/playable/classes/warrior/attack-2.webp",
    playerClassWarriorAttack3: "assets/playable/classes/warrior/attack-3.webp",
    playerClassWarriorAttackNorth: "assets/playable/classes/warrior/attack-north.webp",
    playerClassWarriorAttack2North: "assets/playable/classes/warrior/attack-2-north.webp",
    playerClassWarriorAttack3North: "assets/playable/classes/warrior/attack-3-north.webp",
    playerClassWarriorAttackSouth: "assets/playable/classes/warrior/attack-south.webp",
    playerClassWarriorAttack2South: "assets/playable/classes/warrior/attack-2-south.webp",
    playerClassWarriorAttack3South: "assets/playable/classes/warrior/attack-3-south.webp"
  };
  var BATTLE_IMAGES = {
    enemies: "assets/battle-clean/battle-enemies-v1.png",
    bossTelegraphRing: "assets/effects/boss-telegraph-ring-v1.png",
    bossTelegraphFan: "assets/effects/boss-telegraph-fan-v1.png",
    bossTelegraphPulse: "assets/effects/boss-telegraph-pulse-v1.png",
    skillFxWhirlwind: "assets/effects/skill-whirlwind-v2.png",
    skillFxChainPrimary: "assets/effects/skill-chain-primary-v2.png",
    skillFxChainJump: "assets/effects/skill-chain-jump-v1.png",
    skillFxSlamPrimary: "assets/effects/skill-slam-primary-v2.png",
    skillFxSlamAftershock: "assets/effects/skill-slam-aftershock-v2.png",
    skillFxMeteorProjectile: "assets/effects/skill-meteor-projectile-v2.png",
    skillFxMeteorImpact: "assets/effects/skill-meteor-impact-v2.png",
    skillFxMeteorGround: "assets/effects/skill-meteor-ground-v2.png",
    skillFxContinuousSlash: "assets/effects/skill-continuous-slash-v1.png",
    skillFxProjectile: "assets/effects/skill-projectile-v2.png",
    skillFxEnemyProjectiles: "assets/effects/enemy-projectiles-v1.webp",
    skillFxVenomFang: "assets/effects/skill-venom-fang-v3.png",
    skillFxFrostField: "assets/effects/skill-frost-field-v2.png",
    skillFxBlizzardAmbient: "assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v2.png",
    skillFxBlizzardImpact: "assets/effects/skill-bludgeoning-blizzard-impact-sheet-v2.png",
    skillFxFrostWave: "assets/effects/skill-frost-wave-v2.png",
    skillFxChaosBoomerang: "assets/effects/skill-chaos-boomerang-v2.png",
    skillFxFrostBurst: "assets/effects/skill-frost-burst-v1.png",
    skillFxFrostWaveRing: "assets/effects/skill-frost-wave-ring-v1.png",
    skillFxBurst: "assets/effects/skill-burst-v2.png",
    skillFxImpactFlare: "assets/effects/skill-impact-flare-v1.png"
  };
  var UTILITY_IMAGES = {
    skillFxEarthSpike: "assets/effects/pixel-earth-spike-v1.png",
    skillFxDotField: "assets/effects/skill-dot-field-v2.png",
    skillFxSummonStrike: "assets/effects/skill-summon-strike-v1.png",
    passiveTreeIcons: "assets/ui/passive-tree-icons-v5.png",
    passiveTreeKeystoneIcons: "assets/ui/passive-tree-keystone-icons-v2.png",
    passiveTreeNotableIcons: "assets/ui/passive-tree-notable-icons-v5.png",
    passiveTreeFrames: "assets/ui/passive-tree-frames-v1.png",
    summon1: "assets/battle-clean/summon1.png"
  };
  function createBattleImageManifest({ customHeroSrc, areaVfx, bossAssets, passiveNodes }) {
    const manifest = {
      ...HERO_IMAGES,
      ...customHeroSrc ? { heroLegacy: customHeroSrc } : {},
      ...BATTLE_IMAGES,
      ...areaVfx,
      ...UTILITY_IMAGES,
      ...bossAssets
    };
    for (const node of Object.values(passiveNodes)) {
      const source = String(node && node.iconAsset || "");
      if (!/^assets\/ui\/passive-custom-icons\/[a-zA-Z0-9._-]+\.webp$/.test(source)) continue;
      manifest["passiveTreeCustom_" + node.id] = source;
    }
    appendHeroCacheVersion(manifest);
    return manifest;
  }
  function appendHeroCacheVersion(manifest) {
    for (const key of Object.keys(manifest)) {
      if ((key.startsWith("hero") || key.startsWith("playerClass")) && typeof manifest[key] === "string" && manifest[key].startsWith("assets/playable/")) {
        manifest[key] += "?v=20260902-directional-poses2";
      }
    }
  }
  function criticalHeroImageKeys(definition) {
    const keys = Object.values((definition || {}).strips || {}).flatMap((value) => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [value]).filter((value) => typeof value === "string" && value);
    return /* @__PURE__ */ new Set(["enemies", "effects", "summon1", ...keys]);
  }
  function isOptionalBattleImage(key) {
    return key.startsWith("hero") || key.startsWith("playerClass") || key.startsWith("bg") || key.startsWith("bossTelegraph") || key.startsWith("skillFx") || key.startsWith("passiveTree");
  }

  // modules/browser/battle-asset-startup.mjs
  var BattleAssetStartup = class {
    constructor(sources, services) {
      this.sources = sources;
      this.services = services;
      this.state = {
        loading: false,
        ready: false,
        failed: false,
        failedKeys: [],
        loadTicket: 0,
        loadPromise: null,
        images: {},
        backdrops: {},
        atlas: null
      };
      this.active = /* @__PURE__ */ new Set();
      this.deferred = [];
      this.disposed = false;
      this.groups = [];
      this.next = 0;
      this.pending = 0;
      this.resolve = null;
    }
    start() {
      const state = this.state;
      if (this.disposed) return Promise.resolve(false);
      if (state.ready) return Promise.resolve(true);
      if (state.loading && state.loadPromise) return state.loadPromise;
      if (state.failed) return Promise.resolve(false);
      state.loading = true;
      state.failedKeys = [];
      state.loadTicket = (state.loadTicket || 0) + 1;
      state.loadPromise = new Promise((resolve) => {
        this.resolve = resolve;
      });
      try {
        this.prepare();
        this.report();
        this.pump();
        this.finish();
      } catch (error) {
        this.failPreparation(error);
      }
      return state.loadPromise;
    }
    prepare() {
      const manifest = this.sources.manifest();
      this.optional = new Set(Object.keys(manifest).filter(isOptionalBattleImage));
      this.groups = prepareBattleAssetGroups(
        manifest,
        criticalHeroImageKeys(this.sources.hero()),
        this.state.images,
        this.sources.activeSkill(),
        {
          ...this.sources.skillSheets,
          backdrops: this.state.backdrops,
          environment: this.services.images,
          onDeferred: (dispose) => this.deferred.push(dispose)
        }
      );
      this.next = 0;
      this.pending = this.groups.length;
      this.maxParallel = this.services.maxParallel();
    }
    report() {
      this.services.progress({ loaded: Math.max(0, this.groups.length - this.pending), total: this.groups.length });
    }
    finish() {
      if (!this.resolve || this.pending > 0 || this.disposed) return;
      if (this.state.failedKeys.length) this.services.warn("battle asset load completed with missing files:", this.state.failedKeys.join(", "));
      try {
        this.state.atlas = this.services.buildAtlas();
        this.state.ready = true;
        this.state.loading = false;
        this.services.ready();
      } catch (error) {
        this.state.failed = true;
        this.state.loading = false;
        this.services.error("battle asset atlas error", error);
      }
      this.resolve(!!this.state.ready);
      this.resolve = null;
    }
    failPreparation(error) {
      this.state.failed = true;
      this.state.loading = false;
      this.services.error("battle asset preparation error", error);
      this.resolve?.(false);
      this.resolve = null;
      this.detachRequests();
    }
    store(key, image) {
      if (key.startsWith("backdrop") || key.startsWith("bg")) this.state.backdrops[key] = image;
      else {
        this.state.images[key] = image;
        try {
          this.state.images[key] = this.services.clean(key, image);
        } catch (error) {
          this.services.warn("battle asset cleaning failed:", key, error);
        }
      }
    }
    settle(image, group, ticket, failed) {
      if (this.disposed || ticket !== this.state.loadTicket || !this.active.delete(image)) return;
      image.onload = null;
      image.onerror = null;
      if (failed) {
        const required = group.keys.filter((key) => !this.optional.has(key));
        if (required.length) {
          this.state.failed = true;
          this.state.failedKeys.push(...required);
          this.services.warn("battle asset load failed:", required.join(","), group.src);
        }
      } else group.keys.forEach((key) => this.store(key, image));
      this.pending--;
      this.report();
      this.finish();
      this.pump();
    }
    pump() {
      if (this.disposed || !this.resolve) return;
      const concurrency = this.services.idleStartup() ? 2 : this.maxParallel;
      while (this.active.size < concurrency && this.next < this.groups.length) {
        const group = this.groups[this.next++], ticket = this.state.loadTicket;
        const image = this.services.images.createImage();
        this.active.add(image);
        if (this.services.images.protocol() !== "file:") image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.loading = "eager";
        if ("fetchPriority" in image) image.fetchPriority = concurrency === 2 ? "low" : "auto";
        image.onload = () => this.settle(image, group, ticket, false);
        image.onerror = () => this.settle(image, group, ticket, true);
        image.src = group.src;
      }
    }
    detachRequests() {
      for (const image of this.active) {
        image.onload = null;
        image.onerror = null;
      }
      this.active.clear();
      this.deferred.splice(0).forEach((dispose) => dispose());
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.state.loadTicket++;
      this.detachRequests();
      this.resolve?.(false);
      this.resolve = null;
      this.state.loading = false;
      this.state.ready = false;
      this.state.atlas = null;
      for (const bank of [this.state.images, this.state.backdrops]) for (const key of Object.keys(bank)) delete bank[key];
      this.groups = [];
      this.pending = 0;
    }
  };
  function createBattleAssetStartup(sources, services) {
    const runtime = new BattleAssetStartup(sources, services);
    return Object.freeze({ state: runtime.state, start: () => runtime.start(), dispose: () => runtime.dispose() });
  }

  // modules/battle-assets-classic.mjs
  var spriteContent = new BattleSpriteContent({ document, console });
  var inputs = {
    get BOSS_ASSET_MANIFEST() {
      return typeof BOSS_ASSET_MANIFEST !== "undefined" ? BOSS_ASSET_MANIFEST : void 0;
    },
    get ENABLE_BATTLE_SHEET_SANITIZATION() {
      return true;
    },
    get PLAYER_CLASS_DEFS() {
      return typeof PLAYER_CLASS_DEFS !== "undefined" ? PLAYER_CLASS_DEFS : void 0;
    },
    get WISP_MONSTER_VISUALS() {
      return typeof WISP_MONSTER_VISUALS !== "undefined" ? WISP_MONSTER_VISUALS : void 0;
    },
    get battleAssets() {
      return assets;
    },
    get battleImageCanvasCache() {
      return spriteContent.cache;
    },
    get clampNumber() {
      return clampNumber;
    },
    get document() {
      return typeof document !== "undefined" ? document : void 0;
    },
    get game() {
      return game;
    },
    get getHeroAppearanceId() {
      return typeof getHeroAppearanceId !== "undefined" ? getHeroAppearanceId : void 0;
    },
    get getHeroSelectionDef() {
      return getHeroSelectionDef;
    },
    get localStorage() {
      return localStorage;
    },
    get snapCanvasRectToDevicePixels() {
      return snapCanvasRectToDevicePixels;
    },
    trimRectToContent: (...args) => spriteContent.trimRectToContent(...args),
    get window() {
      return typeof window !== "undefined" ? window : void 0;
    }
  };
  var isLocalFileProtocol2 = isLocalFileProtocol.bind(void 0, inputs);
  var sanitizeBattleSheet2 = sanitizeBattleSheet.bind(void 0, inputs);
  var sanitizeWhiteBackdropSheet2 = sanitizeWhiteBackdropSheet.bind(void 0, inputs);
  var sanitizeLocalMonsterBackdropSheet2 = sanitizeLocalMonsterBackdropSheet.bind(void 0, inputs);
  var buildWispEnemyVariants2 = buildWispEnemyVariants.bind(void 0, inputs);
  var buildBattleAssetAtlas2 = buildBattleAssetAtlas.bind(void 0, inputs);
  var getCustomHeroSheetDataUrl2 = getCustomHeroSheetDataUrl.bind(void 0, inputs);
  var cleanLoadedBattleSheet2 = cleanLoadedBattleSheet.bind(void 0, inputs);
  var painter = new BattleSpritePainter(inputs);
  var drawBattleSpriteImage = painter.drawBattleSpriteImage.bind(painter);
  var drawBattleSpriteOutline = painter.drawBattleSpriteOutline.bind(painter);
  var drawBattleSprite = (...args) => painter.drawBattleSprite(args);
  function selectedHeroDefinition() {
    const selected = typeof getHeroAppearanceId === "function" ? getHeroAppearanceId() : game && PLAYER_CLASS_DEFS[game.selectedClassId] ? game.selectedClassId : "archer";
    return typeof getHeroSelectionDef === "function" ? getHeroSelectionDef(selected) : PLAYER_CLASS_DEFS[selected] || PLAYER_CLASS_DEFS.archer;
  }
  function reportImageProgress({ loaded, total }) {
    if (typeof document === "undefined") return;
    const overlay = document.getElementById("loading-overlay");
    if (!overlay || !overlay.classList.contains("active") || typeof advanceLoadingOverlay !== "function") return;
    advanceLoadingOverlay({
      progress: Math.floor(58 + (total > 0 ? loaded / total : 1) * 34),
      detail: _t("그림 불러오는 중 ({loaded}/{totalAssets})", { loaded, totalAssets: total }),
      caption: _t("전투 그림 준비")
    });
  }
  var loader = createBattleAssetStartup({
    manifest: () => createBattleImageManifest({
      customHeroSrc: getCustomHeroSheetDataUrl2(),
      areaVfx: SKILL_AREA_VFX_ASSETS,
      bossAssets: typeof BOSS_ASSET_MANIFEST !== "undefined" && BOSS_ASSET_MANIFEST || {},
      passiveNodes: typeof PASSIVE_TREE_V22 !== "undefined" && PASSIVE_TREE_V22.nodes || {}
    }),
    hero: selectedHeroDefinition,
    activeSkill: () => game.activeSkill,
    skillSheets: { profiles: SKILL_GEM_VFX_PROFILES, signatures: SKILL_SIGNATURE_SPRITES }
  }, {
    images: {
      createImage: () => new Image(),
      protocol: () => isLocalFileProtocol2() ? "file:" : "http:",
      now: () => Date.now(),
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (id) => clearTimeout(id),
      warn: (...args) => console.warn(...args)
    },
    maxParallel: () => Math.max(4, Math.min(8, Number(typeof navigator !== "undefined" && navigator.hardwareConcurrency || 6) || 6)),
    idleStartup: () => startupOverlayActive && !document.body.classList.contains("loading-active"),
    clean: (key, image) => shouldPreserveOriginalBattleSheet(key) ? image : cleanLoadedBattleSheet2(key, image),
    buildAtlas: () => buildBattleAssetAtlas2(),
    ready: () => renderBattlefield(),
    progress: reportImageProgress,
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
  });
  var assets = loader.state;
  var initBattleAssets = loader.start;
  initBattleAssets.dispose = () => {
    loader.dispose();
    painter.dispose();
  };
  Object.assign(globalThis, { battleAssets: assets });
  safeExposeGlobals({ battleAssets: assets });
  exposeFileGlobals({ isLocalFileProtocol: isLocalFileProtocol2, initBattleAssets, sanitizeBattleSheet: sanitizeBattleSheet2, sanitizeWhiteBackdropSheet: sanitizeWhiteBackdropSheet2, sanitizeLocalMonsterBackdropSheet: sanitizeLocalMonsterBackdropSheet2, buildWispEnemyVariants: buildWispEnemyVariants2, buildBattleAssetAtlas: buildBattleAssetAtlas2, getBattleActorDrawAlpha, drawBattleSpriteImage, drawBattleSpriteOutline, drawBattleSprite });
})();
