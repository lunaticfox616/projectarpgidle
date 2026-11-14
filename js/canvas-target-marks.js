// GENERATED from modules/canvas-target-marks*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/target-marks.mjs
  var TargetMarks = class {
    constructor(deps) {
      this.deps = deps;
      this.INK = Object.freeze({ fill: "#ffd66b", light: "#fff3c4", edge: "#1b171c" });
      this.ROWS = Object.freeze([7, 5, 3, 1]);
      this.ROUND = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    }
    /** 화살표 모양 한 벌: left = 맨 윗줄 가운데 도트의 왼쪽, top = 맨 윗줄의 위(화면 px). */
    shape(ctx, at, size, colour) {
      ctx.fillStyle = colour;
      this.ROWS.forEach((width, row) => ctx.fillRect(at.left - Math.floor(width / 2) * size, at.top + row * size, width * size, size));
    }
    /** 화살표 하나. x = 가운데, y = 아래 꼭짓점이 닿는 자리(화면 px), dot = 캐릭터 도트 한 칸의 px(화살표의 도트는 그 두 배, 적어도
     * 3px: 몰려 선 몬스터 사이에서도 읽힌다). 0.9초에 한 번 두 도트만큼 오르내린다. */
    arrow(ctx, x, y, dot) {
      const size = Math.max(3, Math.round(dot * 2)), bob = Math.round((1 + Math.sin(this.deps.performance.now() / 140)) * size);
      const at = { left: Math.round(x - size / 2), top: Math.round(y) - bob - this.ROWS.length * size };
      ctx.save();
      ctx.globalAlpha = 1;
      for (const [dx, dy] of this.ROUND) this.shape(ctx, { left: at.left + dx * size, top: at.top + dy * size }, size, this.INK.edge);
      this.shape(ctx, at, size, this.INK.fill);
      ctx.fillStyle = this.INK.light;
      ctx.fillRect(at.left - 2 * size, at.top, 3 * size, size);
      ctx.restore();
    }
  };
  function createTargetMarks(deps) {
    const instance = new TargetMarks(deps);
    return Object.freeze({ arrow: instance.arrow.bind(instance) });
  }

  // modules/canvas-target-marks-classic.mjs
  var native = createTargetMarks({
    get performance() {
      return performance;
    }
  });
  var targetMarks = Object.freeze({
    arrow: native.arrow
  });
  safeExposeGlobals({ targetMarks });
})();
