// GENERATED from modules/canvas-stage-rings*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-rings.mjs
  var StageRings = class {
    constructor(deps) {
      this.deps = deps;
      this.outlines = /* @__PURE__ */ new Map();
      this.sprites = /* @__PURE__ */ new Map();
      this.TONES = Object.freeze({
        player: Object.freeze({ near: "#bdf3e4", far: "#5fa596", glow: "rgba(120,214,196,0.16)" }),
        enemy: Object.freeze({ near: "#e8826a", far: "#7c3a30", glow: "rgba(196,70,52,0.14)" }),
        summon: Object.freeze({ near: "#a5e8b8", far: "#4f8a62", glow: "rgba(110,200,140,0.12)" }),
        // 락온한 몬스터(js/canvas-target-marks.js): 금빛, 주인공의 고리처럼 네 토막으로 돈다
        target: Object.freeze({ near: "#ffe08a", far: "#a8862e", glow: "rgba(255,214,107,0.16)" })
      });
      this.LIFT = 3;
    }
    /** 타원 둘레를 한 도트 굵기로 지나는 도트들(중복 없이). */
    outlineOf(rx, ry) {
      const key = rx + "|" + ry;
      if (this.outlines.has(key)) return this.outlines.get(key);
      const dots = [], seen = /* @__PURE__ */ new Set(), steps = Math.ceil((rx + ry) * 4);
      for (let i = 0; i < steps; i++) {
        const angle = i / steps * Math.PI * 2, x = Math.round(rx * Math.cos(angle)), y = Math.round(ry * Math.sin(angle));
        if (seen.has(x + "," + y)) continue;
        seen.add(x + "," + y);
        dots.push({ x, y, angle });
      }
      this.outlines.set(key, dots);
      return dots;
    }
    /** 한 줄씩 만든 도트 타원 윤곽을 한 번에 채운다. 사망 필터를 줄마다 반복 적용하지 않고,
     * 반 도트 배율에서 맞닿은 줄의 경계가 반투명 빗금처럼 겹치지 않게 한다. 호출자의 현재 경로는 보존한다. */
    fillEllipse(ctx, at, rx, ry) {
      const path = new this.deps.Path2D();
      for (let row = -ry; row <= ry; row++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry + 0.01))));
        path.rect(at.x - half * at.dot, at.y + row * at.dot, half * 2 * at.dot, at.dot);
      }
      ctx.fill(path);
    }
    /** 발밑 그림자. at = { x, y(발끝), dot } */
    shadow(ctx, at, rx, alpha) {
      const centre = { x: Math.round(at.x), y: Math.round(at.y - this.LIFT * at.dot), dot: at.dot };
      const ry = Math.max(2, Math.round(rx * 0.27));
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = "#080605";
      if (this.deps.stageDots.colorFilterOnly(ctx)) {
        const bounds = new this.deps.Path2D();
        bounds.rect(centre.x - rx * at.dot - 1, centre.y - ry * at.dot - 1, rx * at.dot * 2 + 2, (ry * 2 + 1) * at.dot + 2);
        ctx.clip(bounds);
      }
      this.fillEllipse(ctx, centre, rx, ry);
      ctx.restore();
    }
    /** 고리 하나를 칠한다: 안쪽의 옅은 빛과 한 도트 굵기의 둘레. o = { tone, rx, ry, turning, spin } */
    paintRing(ctx, centre, o) {
      ctx.fillStyle = o.tone.glow;
      this.fillEllipse(ctx, centre, o.rx - 1, o.ry - 1);
      for (const dot of this.outlineOf(o.rx, o.ry)) {
        if (o.turning && (dot.angle + o.spin) / (Math.PI / 2) % 1 > 0.74) continue;
        ctx.fillStyle = dot.y >= 0 ? o.tone.near : o.tone.far;
        ctx.fillRect(centre.x + dot.x * centre.dot, centre.y + dot.y * centre.dot, centre.dot, centre.dot * (o.turning && dot.y > 0 ? 2 : 1));
      }
    }
    /** 돌지 않는 고리의 그림: 붓의 배율(scale)만큼 실제 픽셀로 한 번 그려 둔다. 가운데는 (ox, oy) 픽셀. */
    ringSprite(o, dot, scale) {
      const key = o.name + "|" + o.rx + "|" + dot + "|" + scale;
      if (this.sprites.has(key)) return this.sprites.get(key);
      const ox = Math.ceil((o.rx + 2) * dot * scale), oy = Math.ceil((o.ry + 3) * dot * scale), canvas = this.deps.document.createElement("canvas");
      canvas.width = ox * 2;
      canvas.height = oy * 2;
      const g = canvas.getContext("2d");
      g.setTransform(scale, 0, 0, scale, ox, oy);
      this.paintRing(g, { x: 0, y: 0, dot }, o);
      if (this.sprites.size >= 64) this.sprites.clear();
      const sprite = { canvas, ox, oy };
      this.sprites.set(key, sprite);
      return sprite;
    }
    /** 미리 그린 고리를 그 자리의 실제 픽셀에 찍는다(배율만 있는 붓: 전장의 renderScale). 붓의 알파와 색 필터는 그대로 먹는다. */
    stampRing(ctx, centre, o) {
      const m = ctx.getTransform(), sprite = this.ringSprite(o, centre.dot, m.a);
      const x = Math.round(m.a * centre.x + m.e), y = Math.round(m.d * centre.y + m.f);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite.canvas, x - sprite.ox, y - sprite.oy);
    }
    /**
     * @param {{x:number,y:number,dot:number}} at the feet (x, lowest dot of the feet) and the size of one dot
     * @param {{tone:string, rx:number, turning?:boolean}} look whose ring, its half width in dots, whether it turns (the hero's)
     */
    ring(ctx, at, look) {
      const tone = this.TONES[look.tone] || this.TONES.enemy, rx = look.rx, ry = Math.max(3, Math.round(rx * 0.34));
      const centre = { x: Math.round(at.x), y: Math.round(at.y - this.LIFT * at.dot), dot: at.dot };
      const o = { name: look.tone, tone, rx, ry, turning: !!look.turning, spin: look.turning ? this.deps.performance.now() / 2600 : 0 };
      ctx.save();
      const m = ctx.getTransform(), plain = !o.turning && m.b === 0 && m.c === 0 && m.a > 0 && m.a === m.d;
      if (plain) this.stampRing(ctx, centre, o);
      else this.paintRing(ctx, centre, o);
      ctx.restore();
    }
  };
  function createStageRings(deps) {
    const instance = new StageRings(deps);
    return Object.freeze({ shadow: instance.shadow.bind(instance), ring: instance.ring.bind(instance), LIFT: instance.LIFT });
  }

  // modules/canvas-stage-rings-classic.mjs
  var native = createStageRings({
    get Path2D() {
      return Path2D;
    },
    get stageDots() {
      return stageDots;
    },
    get document() {
      return document;
    },
    get performance() {
      return performance;
    }
  });
  var stageRings = Object.freeze({
    shadow: native.shadow,
    ring: native.ring,
    LIFT: native.LIFT
  });
  safeExposeGlobals({ stageRings });
})();
