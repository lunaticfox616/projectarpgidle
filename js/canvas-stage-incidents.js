// GENERATED from modules/canvas-stage-incidents*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-incidents.mjs
  var StageIncidents = class {
    constructor(deps) {
      this.deps = deps;
      this.STAR = Object.freeze({ from: Object.freeze([130, -270]), tail: 120, head: "#fff6c8", glow: "#ffe27a", ray: "#ffe9a0" });
      this.lerp = (a, b, t) => a + (b - a) * t;
    }
    /** 떨어지는 별: 꼬리(머리 쪽이 진한 여덟 마디)와 빛무리를 두른 머리. k: 크기 배율. */
    drawFall(ctx, end, progress, k) {
      const x = this.lerp(end.x + this.STAR.from[0] * k, end.x, progress), y = this.lerp(end.y + this.STAR.from[1] * k, end.y, progress);
      const len = Math.hypot(this.STAR.from[0], this.STAR.from[1]), ux = this.STAR.from[0] / len, uy = this.STAR.from[1] / len, tail = this.STAR.tail * k;
      ctx.lineWidth = Math.max(2, Math.round(3 * k));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * tail, b = (i + 1) / 8 * tail;
        ctx.globalAlpha = 0.9 * (1 - i / 8);
        ctx.strokeStyle = i < 3 ? this.STAR.head : this.STAR.glow;
        ctx.beginPath();
        ctx.moveTo(Math.round(x + ux * a), Math.round(y + uy * a));
        ctx.lineTo(Math.round(x + ux * b), Math.round(y + uy * b));
        ctx.stroke();
      }
      const glow = Math.round(9 * k), head = Math.round(4 * k);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.STAR.glow;
      ctx.fillRect(Math.round(x) - glow, Math.round(y) - glow, glow * 2, glow * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.STAR.head;
      ctx.fillRect(Math.round(x) - head, Math.round(y) - head, head * 2, head * 2);
    }
    /** 닿은 자리: 네 갈래 빛이 10에서 46점까지 뻗으며 옅어지고, 그 사이 대각선으로 반짝임. k: 크기 배율. */
    drawBurst(ctx, end, progress, k) {
      const fade = 1 - progress, reach = Math.round(this.lerp(10, 46, Math.sqrt(progress)) * k), cx = Math.round(end.x), cy = Math.round(end.y);
      const thick = Math.max(2, Math.round(3 * k)), dot = Math.max(2, Math.round(3 * k));
      ctx.globalAlpha = fade;
      ctx.fillStyle = this.STAR.ray;
      ctx.fillRect(cx - reach, cy - Math.floor(thick / 2), reach * 2, thick);
      ctx.fillRect(cx - Math.floor(thick / 2), cy - reach, thick, reach * 2);
      const twinkle = Math.round(reach * 0.5);
      ctx.globalAlpha = fade * 0.75;
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ctx.fillRect(cx + dx * twinkle - 1, cy + dy * twinkle - 1, dot, dot);
      ctx.globalAlpha = fade;
      ctx.fillStyle = this.STAR.head;
      ctx.fillRect(cx - dot, cy - dot, dot * 2, dot * 2);
    }
    /** 바닥 효과 층: battleFx의 'fallingStar'(js/combat-incidents.js dropStar)마다. view: { now, gridProj } */
    ground(ctx, view) {
      const { fallMs, burstMs } = this.deps.ACT_EXPLORATION_INCIDENTS.star, k = Math.min(1.6, Math.max(1, (Number(view.gridProj.tileW) || 40) / 40));
      for (const fx of this.deps.battleFx) {
        if (fx.type !== "fallingStar" || !fx.cell || view.now < fx.start || view.now - fx.start >= fallMs + burstMs) continue;
        const end = view.gridProj.cellToScreen(fx.cell.gx, fx.cell.gy), age = view.now - fx.start;
        if (!end) continue;
        ctx.save();
        if (age < fallMs) this.drawFall(ctx, end, age / fallMs, k);
        else this.drawBurst(ctx, end, (age - fallMs) / burstMs, k);
        ctx.restore();
      }
    }
  };
  function createStageIncidents(deps) {
    const instance = new StageIncidents(deps);
    return Object.freeze({ ground: instance.ground.bind(instance) });
  }

  // modules/canvas-stage-incidents-classic.mjs
  var native = createStageIncidents({
    get ACT_EXPLORATION_INCIDENTS() {
      return ACT_EXPLORATION_INCIDENTS;
    },
    get battleFx() {
      return battleFx;
    }
  });
  var stageIncidents = Object.freeze({
    ground: native.ground
  });
  safeExposeGlobals({ stageIncidents });
})();
