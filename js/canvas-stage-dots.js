// GENERATED from modules/canvas-stage-dots*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-cache.mjs
  var HOT_MS = 1500;
  function createStageCache(limit, release) {
    const rows = /* @__PURE__ */ new Map();
    let held = 0;
    function cachedValue(key, now) {
      const row = rows.get(key);
      if (!row) return null;
      row.at = now;
      rows.delete(key);
      rows.set(key, row);
      return row.value;
    }
    function cacheRoomFor(pixels, now) {
      if (pixels > limit.pixels) return false;
      while (rows.size >= limit.entries || held + pixels > limit.pixels) {
        const [key, row] = rows.entries().next().value;
        if (now - row.at < limit.hotMs) return false;
        rows.delete(key);
        held -= row.pixels;
        release(row.value);
      }
      return true;
    }
    function cacheKeep(key, value, pixels, now) {
      rows.set(key, { value, pixels, at: now });
      held += pixels;
    }
    return Object.freeze({ cachedValue, cacheRoomFor, cacheKeep });
  }
  var stageCache = Object.freeze({ HOT_MS, stageCacheOf: createStageCache });

  // modules/rendering/stage-dots.mjs
  var StageDots = class {
    constructor(deps) {
      this.deps = deps;
      this.scratch = null;
      this.TILE = 512;
      this.GUARD = 2;
      this.STAMP_PIXELS = 4 * 1024 * 1024;
      this.STAMP_HOT_MS = 12;
      this.SPARES = 6;
      this.SPARE_SLACK = 1.3;
      this.shrink = (canvas) => {
        canvas.width = canvas.height = 1;
      };
      this.spares = [];
      this.stamps = stageCache.stageCacheOf({ pixels: this.STAMP_PIXELS, entries: 96, hotMs: this.STAMP_HOT_MS }, (canvas) => {
        this.spares.push(canvas);
        if (this.spares.length > this.SPARES) this.shrink(this.spares.shift());
      });
      this.sourceIds = /* @__PURE__ */ new WeakMap();
      this.lastSourceId = 0;
      this.canvasPx = () => typeof this.deps.uiDisplay === "object" ? this.deps.uiDisplay.battleRenderScale : 1;
      this.pxPerDot = (scale) => scale * this.canvasPx();
      this.whole = (scale) => Math.abs(this.pxPerDot(scale) - Math.round(this.pxPerDot(scale))) < 0.01;
      this.colorFilterOnly = (ctx) => /^(?:(?:grayscale|saturate|brightness)\([^)]*\)\s*)+$/.test(ctx.filter) && ctx.globalCompositeOperation === "source-over" && !ctx.shadowBlur && !ctx.shadowOffsetX && !ctx.shadowOffsetY;
      this.wholeDot = (scale) => Math.max(1, Math.ceil(this.pxPerDot(scale) - 0.01)) / this.canvasPx();
      this.spanPx = (length) => Math.max(1, Math.floor(length * this.canvasPx() + 0.01));
      this.span = (length) => this.spanPx(length) / this.canvasPx();
    }
    /** 반 걸음(1.5, 2.5)이면 두 배 한 정수로 키웠다가 절반으로 줄인다. 그 밖의 배율은 올림한 정수로 키웠다가 줄인다. */
    upscale(scale) {
      const twice = this.pxPerDot(scale) * 2;
      return Math.abs(twice - Math.round(twice)) < 0.01 ? Math.round(twice) : Math.ceil(this.pxPerDot(scale));
    }
    surface(width, height) {
      if (!this.scratch) this.scratch = this.deps.document.createElement("canvas");
      if (this.scratch.width < width) this.scratch.width = width;
      if (this.scratch.height < height) this.scratch.height = height;
      const ctx = this.scratch.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width + this.GUARD, height + this.GUARD);
      return ctx;
    }
    /** 그림마다 하나씩 주는 번호(확대 그림의 열쇠에 쓴다). */
    sourceIdOf(source) {
      if (!this.sourceIds.has(source)) this.sourceIds.set(source, ++this.lastSourceId);
      return this.sourceIds.get(source);
    }
    /** 작업면에 정수배로 키운 그림(들고 있지 않는다). */
    enlargedOnce(source, from, up) {
      const ctx = this.surface(from.w * up, from.h * up);
      ctx.drawImage(source, from.x, from.y, from.w, from.h, 0, 0, from.w * up, from.h * up);
      return ctx.canvas;
    }
    /** 고정된 그림만 정수배 확대를 재사용한다. 최종 축소는 매번 목적지에서 하므로 반 도트 위치와 반전도 그대로다. */
    enlarged(source, from, up, fixed) {
      if (!fixed) return this.enlargedOnce(source, from, up);
      const width = from.w * up, height = from.h * up, pixels = (width + this.GUARD) * (height + this.GUARD), now = this.deps.performance.now();
      const key = `${this.sourceIdOf(source)}|${from.x}|${from.y}|${from.w}|${from.h}|${up}`, kept = this.stamps.cachedValue(key, now);
      if (kept) return kept;
      if (!this.stamps.cacheRoomFor(pixels, now)) return this.enlargedOnce(source, from, up);
      const canvas = this.blankStamp(width + this.GUARD, height + this.GUARD), ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, from.x, from.y, from.w, from.h, 0, 0, width, height);
      this.stamps.cacheKeep(key, canvas, canvas.width * canvas.height, now);
      return canvas;
    }
    /** 빈 캔버스: 방금 놓인 캔버스 가운데 이 크기를 담고 넓이가 SPARE_SLACK배를 넘지 않는 것이 있으면 비워서 다시 쓴다(만들고 버리기를
         * 되풀이하지 않는다). 확대 그림은 왼쪽 위부터 제 크기만큼만 읽히므로 조금 큰 캔버스에 담아도 그림은 같다. */
    blankStamp(width, height) {
      const index = this.spares.findIndex((spare) => spare.width >= width && spare.height >= height && spare.width * spare.height <= width * height * this.SPARE_SLACK);
      if (index >= 0) {
        const spare = this.spares.splice(index, 1)[0];
        spare.getContext("2d").clearRect(0, 0, spare.width, spare.height);
        return spare;
      }
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    /**
         * @param {CanvasImageSource} source
         * @param {{x:number,y:number,w:number,h:number}} from the dots to draw (source px)
         * @param {{x:number,y:number,scale:number}} at where its top-left lands and the size of one dot (the caller's units)
         * @param {boolean} fixed source pixels never change; static images/tints or immutable pose snapshots, never mutable work canvases.
         *   A loaded picture (an Image, or a picture decoded ahead: an ImageBitmap) never changes, so it counts as fixed without being told.
         */
    blit(ctx, source, from, at, fixed = false) {
      if (!this.colorFilterOnly(ctx)) return this.paint(ctx, source, from, at, fixed);
      const bounds = new this.deps.Path2D();
      bounds.rect(at.x - 1, at.y - 1, from.w * at.scale + 2, from.h * at.scale + 2);
      ctx.save();
      ctx.clip(bounds);
      this.paint(ctx, source, from, at, fixed);
      const quality = ctx.imageSmoothingQuality;
      ctx.restore();
      ctx.imageSmoothingQuality = quality;
    }
    paint(ctx, source, from, at, fixed) {
      const width = from.w * at.scale, height = from.h * at.scale, smooth = ctx.imageSmoothingEnabled;
      if (this.whole(at.scale)) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, from.x, from.y, from.w, from.h, at.x, at.y, width, height);
        ctx.imageSmoothingEnabled = smooth;
        return;
      }
      const up = this.upscale(at.scale), big = this.enlarged(source, from, up, fixed || source instanceof this.deps.HTMLImageElement || source instanceof this.deps.ImageBitmap);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "low";
      ctx.drawImage(big, 0, 0, from.w * up, from.h * up, at.x, at.y, width, height);
      ctx.imageSmoothingEnabled = smooth;
    }
    /** fitted를 나누어 한다(방 그림을 그리기 밖에서 준비할 때: js/canvas-stage-room-pictures.js). step()을 부를 때마다 한 조각(TILE)을
         * 옮기고, 다 옮겼으면 true를 돌려준다. canvas는 옮겨 담는 그림이다(정수배면 source 그대로이고 옮길 것이 없다). */
    fitter(source, scale) {
      if (this.whole(scale)) return { canvas: source, step: () => true };
      const k = this.pxPerDot(scale), out = this.deps.document.createElement("canvas");
      out.width = this.spanPx(source.width * scale);
      out.height = this.spanPx(source.height * scale);
      const ctx = out.getContext("2d");
      let x = 0, y = 0;
      const step = () => {
        if (y >= source.height) return true;
        const w = Math.min(this.TILE, source.width - x), h = Math.min(this.TILE, source.height - y);
        this.blitRaw(ctx, source, { x, y, w, h }, k);
        x += this.TILE;
        if (x >= source.width) {
          x = 0;
          y += this.TILE;
        }
        if (y < source.height) return false;
        this.shrink(this.scratch);
        this.scratch = null;
        return true;
      };
      return { canvas: out, step };
    }
    /** 도트 그림 한 장을 지금 배율의 캔버스 픽셀 크기로 옮겨 둔 그림(방 그림처럼 한 번 그려 두고 쓰는 큰 그림). 정수배면 그대로 돌려준다. */
    fitted(source, scale) {
      const job = this.fitter(source, scale);
      while (!job.step()) {
        /*! Process one image tile per step. */
      }
      return job.canvas;
    }
    /** 조각 하나를 k배(캔버스 px)로 옮긴다, for fitted. 2026-10-30 사용자 "에셋 틈사이사이의 선": 조각의 끝이 캔버스 픽셀 사이에 걸리면 GPU 캔버스에서
         * 양쪽 조각이 그 픽셀을 일부만 덮어 조각 경계마다(그림 512px 간격) 반투명한 선이 남았다. 둘레의 한 도트까지 함께 줄이고 픽셀에 맞춘 상자로
         * 잘라, 나눠 옮겨도 한 번에 옮긴 것과 같게 한다. */
    blitRaw(ctx, source, from, k) {
      const up = Math.abs(k * 2 - Math.round(k * 2)) < 0.01 ? Math.round(k * 2) : Math.ceil(k);
      const left = Math.max(0, from.x - 1), top = Math.max(0, from.y - 1), w = Math.min(source.width, from.x + from.w + 1) - left, h = Math.min(source.height, from.y + from.h + 1) - top;
      const big = this.surface(w * up, h * up), x0 = Math.round(from.x * k), y0 = Math.round(from.y * k);
      big.drawImage(source, left, top, w, h, 0, 0, w * up, h * up);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, Math.round((from.x + from.w) * k) - x0, Math.round((from.y + from.h) * k) - y0);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "low";
      ctx.drawImage(this.scratch, 0, 0, w * up, h * up, left * k, top * k, w * k, h * k);
      ctx.restore();
    }
  };
  function createStageDots(deps) {
    const instance = new StageDots(deps);
    return Object.freeze({ blit: instance.blit.bind(instance), fitted: instance.fitted.bind(instance), fitter: instance.fitter.bind(instance), whole: instance.whole, wholeDot: instance.wholeDot, span: instance.span, colorFilterOnly: instance.colorFilterOnly });
  }

  // modules/canvas-stage-dots-classic.mjs
  var stageDots = createStageDots({
    get document() {
      return document;
    },
    get performance() {
      return performance;
    },
    get Path2D() {
      return Path2D;
    },
    get HTMLImageElement() {
      return HTMLImageElement;
    },
    get ImageBitmap() {
      return ImageBitmap;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    }
  });
  safeExposeGlobals({ stageDots });
})();
