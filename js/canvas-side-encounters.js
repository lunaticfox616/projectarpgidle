// GENERATED from modules/canvas-side-encounters*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/rendering/meteor-spell.mjs
  function drawMeteorDescent(ctx, bounds, progress, image) {
    let eased = progress * progress * progress;
    let x = bounds.x - (1 - eased) * 54;
    let y = bounds.y - (1 - eased) * 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(120, 54));
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.72 + progress * 0.24;
    ctx.imageSmoothingEnabled = false;
    if (image) {
      ctx.drawImage(image, -104, -28, 128, 34);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#8f1d0b";
    ctx.beginPath();
    ctx.moveTo(-92, -5);
    ctx.lineTo(-18, -15);
    ctx.lineTo(5, 0);
    ctx.lineTo(-22, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff8a24";
    ctx.beginPath();
    ctx.moveTo(-68, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(8, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2d201d";
    ctx.beginPath();
    ctx.moveTo(-12, -13);
    ctx.lineTo(8, -16);
    ctx.lineTo(19, -4);
    ctx.lineTo(15, 12);
    ctx.lineTo(-3, 17);
    ctx.lineTo(-18, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffc15a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(2, 0);
    ctx.lineTo(-5, 11);
    ctx.stroke();
    ctx.restore();
  }

  // modules/rendering/side-encounters.mjs
  var SideEncounterRenderer = class {
    constructor(deps) {
      this.deps = deps;
      for (const name of ["portals", "pendingWarnings"]) this[name] = this[name].bind(this);
    }
    portals(ctx, projection, now) {
      const run = this.deps.currentGrandRun();
      if (!run?.inRun || run.phase !== "survival") return;
      const sinceBurst = now - ((run.nextRefillAt || 0) - this.deps.GRAND_BREACH_ENCOUNTER.intervalMs);
      const pulse = clampNumber(1 - sinceBurst / 550, 0, 1);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.fillStyle = "#130e21";
      ctx.strokeStyle = "#a487cf";
      for (const portal of this.deps.GRAND_BREACH_ENCOUNTER.portals) {
        const point = projection.cellToScreen(portal.gx, portal.gy);
        ctx.globalAlpha = 0.6 + pulse * 0.3;
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, projection.tileW * (0.3 + pulse * 0.08), projection.tileH * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    pendingWarnings(ctx, projection, attacks) {
      const meteor = this.deps.isMeteorZone();
      const now = this.deps.getCombatTime();
      for (const attack of attacks) {
        if (attack.delivery !== "patternArea" || attack.bossPattern.area.observerMove) continue;
        const footprint = this.deps.projectSkillFootprint(attack.bossPattern.area, projection);
        if (!footprint) continue;
        this.deps.drawSkillFootprintGround(ctx, footprint, meteor ? "#ff9b52" : "#ff684f", this.deps.bossAttackView.pendingAlpha());
        if (!meteor) continue;
        const cast = this.deps.enemyAttackRules.castBar(attack.source, now, attack);
        if (!cast || cast.cancelled) continue;
        const progress = clampNumber((now - attack.castStartAt) / (attack.at - attack.castStartAt), 0, 1);
        const scale = projection.tileW / 48;
        ctx.save();
        ctx.translate(footprint.centerPoint.x, footprint.centerPoint.y);
        ctx.scale(scale, scale);
        drawMeteorDescent(ctx, { x: 0, y: 0 }, progress, this.deps.image("skillFxMeteorProjectile"));
        ctx.restore();
      }
    }
    api() {
      return { portals: this.portals, pendingWarnings: this.pendingWarnings };
    }
  };
  function createSideEncounterRenderer(deps) {
    return new SideEncounterRenderer(deps).api();
  }

  // modules/canvas-side-encounters-classic.mjs
  var native = createSideEncounterRenderer({
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get bossAttackView() {
      return bossAttackView;
    },
    get image() {
      return getSkillGemVfxImage;
    },
    get drawSkillFootprintGround() {
      return drawSkillFootprintGround;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    currentGrandRun: () => {
      const owner = window.GameModules.state.game;
      return owner.currentZoneId === "grand_breach_run" ? owner.voidRift && owner.voidRift.grandRun : null;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    isMeteorZone: () => getZone(window.GameModules.state.game.currentZoneId).type === "meteor",
    get projectSkillFootprint() {
      return projectSkillFootprint;
    }
  });
  safeExposeGlobals({ sideEncounterCanvas: native });
})();
