// GENERATED from modules/canvas-boss-revive*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/boss-revive.mjs
  var BossRevive = class {
    constructor(deps) {
      this.deps = deps;
      this.GOLD = "#f0cd73";
      this.FADE_MS = 450;
      this.MOTES = 16;
    }
    /** info: { gx, gy, name } where the boss fell; age and showMs: the line's time on screen (ms). */
    draw(ctx, scene, info, age, showMs) {
      const fade = Math.max(0, Math.min(1, age / this.FADE_MS, (showMs - age) / this.FADE_MS));
      if (!fade || !scene.projection) return;
      const ground = scene.projection.cellToScreen(info.gx, info.gy);
      ctx.save();
      ctx.globalAlpha = fade;
      this.pillar(ctx, { x: ground.x, y: ground.y + (scene.projection.actorGroundOffsetY || 0) }, scene.tileW || 64, age);
      this.lifeBar(ctx, scene.width, info.name, Math.min(1, age / this.deps.STAGE_BOSS_REVIVAL.fillMs));
      ctx.restore();
    }
    /** The sap pours from the top of the view to the floor: a soft wide glow, a bright core and motes rising along it. */
    pillar(ctx, ground, tile, age) {
      const half = tile * 1.15, pulse = 0.82 + 0.18 * Math.sin(age / 140);
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createLinearGradient(ground.x - half, 0, ground.x + half, 0);
      glow.addColorStop(0, "rgba(240,205,115,0)");
      glow.addColorStop(0.5, `rgba(240,205,115,${0.62 * pulse})`);
      glow.addColorStop(1, "rgba(240,205,115,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(ground.x - half, 0, half * 2, ground.y);
      ctx.fillStyle = `rgba(255,240,196,${0.7 * pulse})`;
      ctx.fillRect(Math.round(ground.x - tile * 0.12), 0, Math.max(3, Math.round(tile * 0.24)), ground.y);
      const pool = ctx.createRadialGradient(ground.x, ground.y, 0, ground.x, ground.y, half * 1.6);
      pool.addColorStop(0, `rgba(240,205,115,${0.55 * pulse})`);
      pool.addColorStop(1, "rgba(240,205,115,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(ground.x - half * 1.6, ground.y - half * 0.6, half * 3.2, half * 1.2);
      this.motes(ctx, ground, tile, age);
      ctx.globalCompositeOperation = "source-over";
    }
    motes(ctx, ground, tile, age) {
      const size = Math.max(2, Math.round(tile / 22)), base = ctx.globalAlpha;
      for (let i = 0; i < this.MOTES; i++) {
        const rise = (age / 1600 + i / this.MOTES) % 1, x = ground.x + Math.sin(i * 2.4) * tile * 0.45;
        ctx.fillStyle = i % 3 ? this.GOLD : "#fff4d6";
        ctx.globalAlpha = base * (1 - rise);
        ctx.fillRect(Math.round(x), Math.round(ground.y - rise * ground.y * 0.8), size, size);
      }
      ctx.globalAlpha = base;
    }
    /** The boss's name over a life bar filling back up, where the boss bar stands during the fight. */
    lifeBar(ctx, width, name, share) {
      const barW = Math.round(Math.min(440, width * 0.46)), x = Math.round((width - barW) / 2), y = 70;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(8,6,5,0.82)";
      ctx.fillRect(x - 2, y - 2, barW + 4, 14);
      ctx.fillStyle = "#b8892f";
      ctx.fillRect(x, y, Math.round(barW * share), 10);
      ctx.fillStyle = "rgba(255,240,196,0.55)";
      ctx.fillRect(x, y, Math.round(barW * share), 3);
      ctx.font = `15px ${this.deps.i18n.fontFamily("'Galmuri14', 'Galmuri11'")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(8,6,4,0.9)";
      ctx.fillStyle = this.GOLD;
      this.deps.drawCrispCanvasText(ctx, name, width / 2, y - 6, "strokeText");
      this.deps.drawCrispCanvasText(ctx, name, width / 2, y - 6);
    }
  };
  function createBossRevive(deps) {
    const instance = new BossRevive(deps);
    return Object.freeze({ draw: instance.draw.bind(instance) });
  }

  // modules/canvas-boss-revive-classic.mjs
  var native = createBossRevive({
    get STAGE_BOSS_REVIVAL() {
      return STAGE_BOSS_REVIVAL;
    },
    get i18n() {
      return i18n;
    },
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    }
  });
  var bossRevive = Object.freeze({
    draw: native.draw
  });
  safeExposeGlobals({ bossRevive });
})();
