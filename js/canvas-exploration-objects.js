// GENERATED from modules/canvas-exploration-objects*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/exploration-objects.mjs
  var ExplorationObjectView = class {
    constructor(deps, interaction) {
      this.interaction = interaction;
      this.deps = deps;
      this.RIM = { chest: "#ffd36b", sealed: "#e0b4ff", nest: "#ff9a6a", pot: "#f3d6a4", crate: "#f3d6a4" };
      this.RIM_HOT = "#fff8e6";
      this.RIM_GRADE = { silver: "#e4eefa", gold: "#ffbf2e" };
      this.rimColour = (row) => row.kind === "chest" && this.RIM_GRADE[row.grade] || this.RIM[row.kind];
      this.SILVER_HALO = 0.3;
      this.DRAW_REACH = 3;
      this.NAME_FONT = `12px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
    }
    /** 누른 물건(상자의 pendingId): 주인공이 다가가 열거나 부술 때까지 테가 밝은 채로 멈추고 머리 위에 금빛 화살표가 선다
     * (2026-10-17 사용자 "상자, 항아리(파괴하거나 열러가기 전까지) 클릭 시 타겟이 지정되었다는 표시", js/canvas-target-marks.js). */
    targeted(owner, row) {
      const run = this.deps.actExplorationState.current(owner);
      return !!run?.objects && run.objects.pendingId === row.id && row.phase === "ready";
    }
    /** 테를 밝게 그리는가: 마우스를 올렸거나 초점이 갔거나, 누른 물건이다. */
    lit(owner, row) {
      return this.interaction.hovered === row.id || this.targeted(owner, row);
    }
    /** Which picture a row shows, and whether it stands (actor) or lies on the floor (decal). */
    look(row) {
      const spent = row.phase === "spent";
      if (row.kind === "chest") return { name: spent ? "chestOpen" : "chest", standing: true, tint: row.grade };
      if (row.kind === "sealed") return { name: spent ? "sealedOpen" : "sealed", standing: true };
      if (row.kind === "nest") return { name: spent ? "nestSpent" : "nest", standing: !spent };
      if (row.kind === "ambush") return { name: "tracks", standing: false };
      return { name: spent ? row.kind === "pot" ? "potBroken" : "crateBroken" : row.kind, standing: !spent };
    }
    /** Actor pass: standing objects join the sort, and the clickable ones are noted for flushButtons. */
    append(owner, actors, view) {
      const run = this.deps.actExplorationState.current(owner), p = view.gridProj;
      const pending = { run, p, rows: [] };
      if (!run?.objects) return pending;
      for (const row of run.objects.entries) {
        if (!this.deps.actExplorationState.objects.visible(run, row)) continue;
        const point = p.cellToScreen(row.gx, row.gy), y = point.y + p.actorGroundOffsetY;
        if (!this.nearScreen(point, view, p)) continue;
        const ready = this.canClick(run, row);
        if (this.look(row).standing) actors.push({ kind: "object", id: row.id, y, point, object: row, ready });
        if (ready && this.onScreen(point, view)) pending.rows.push({ row, point });
      }
      return pending;
    }
    canClick(run, row) {
      return row.phase === "ready" && row.kind !== "ambush" && !run.arrival && !run.completionApplied && run.status === "active";
    }
    onScreen(point, view) {
      return point.x >= 0 && point.y >= 0 && point.x <= view.width && point.y <= view.height;
    }
    nearScreen(point, view, p) {
      const reach = p.tileW * this.DRAW_REACH;
      return point.x >= -reach && point.y >= -reach && point.x <= view.width + reach && point.y <= view.height + reach;
    }
    /** Fog mode dims an object past the sight radius; a room seen whole (room mode) dims nothing. */
    fade(owner, row) {
      const run = this.deps.actExplorationState.current(owner);
      if (this.deps.actExplorationSight.wholeRoom(run)) return 1;
      const distance = Math.hypot(row.gx - owner.gridPlayer.gx, row.gy - owner.gridPlayer.gy);
      return Math.max(0.35, 1 - Math.max(0, distance - this.deps.actExplorationState.sight(run)) * 0.08);
    }
    /** A standing object (actor pass): ground shadow, the sprite, a shake and a fuse bar while an event is about to burst. */
    draw(owner, ctx, actor, view) {
      if (!this.deps.stageObjects.ready(owner)) return;
      this.drawStaged(owner, ctx, actor, view);
      if (this.targeted(owner, actor.object)) this.targetArrow(owner, ctx, actor, view);
    }
    /** 누른 물건 위의 금빛 화살표: 그림의 맨 위, 이름이 달린 물건(몬스터가 나오는 것)은 이름 위에 선다. */
    targetArrow(owner, ctx, actor, view) {
      const row = actor.object, tile = view.gridProj.tileW, dot = this.deps.stageActors.scaleFor(tile);
      const top = this.deps.stageObjects.top(owner, this.look(row), { x: actor.point.x, y: actor.y, dot });
      const label = this.deps.actExplorationState.objects.isEvent(row) ? actor.y - tile * 0.98 - 8 : Infinity;
      this.deps.targetMarks.arrow(ctx, actor.point.x, Math.min(top, label) - dot * 2, dot);
    }
    /** 무대의 숨 쉬는 테. 은빛 상자는 테로 읽힌다: 덜 꺼지는 숨(.75~1)과 그 바깥 한 도트의 옅은 테(SILVER_HALO). */
    drawStagedRim(owner, ctx, row, at) {
      const hot = this.lit(owner, row), silver = row.kind === "chest" && row.grade === "silver" && !hot, dot = at.dot;
      const wave = Math.sin(this.deps.performance.now() / 300 + row.gx + row.gy), breath = hot ? 1 : silver ? 0.875 + 0.125 * wave : 0.6 + 0.4 * wave;
      if (silver) {
        ctx.globalAlpha = this.fade(owner, row) * breath * this.SILVER_HALO;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.deps.stageObjects.outline(owner, ctx, this.look(row), { x: at.x + dx * dot, y: at.y + dy * dot, dot }, this.rimColour(row));
      }
      ctx.globalAlpha = this.fade(owner, row) * breath;
      this.deps.stageObjects.outline(owner, ctx, this.look(row), at, hot ? this.RIM_HOT : this.rimColour(row));
      ctx.globalAlpha = this.fade(owner, row);
    }
    /** 옆에서 보는 무대(js/canvas-stage-objects.js): 캐릭터와 같은 도트 크기의 그림으로, 같은 그림자와 숨 쉬는 테, 흔들림, 도화선 막대. */
    drawStaged(owner, ctx, actor, view) {
      const row = actor.object, dot = this.deps.stageActors.scaleFor(view.gridProj.tileW), now = this.deps.getCombatTime(), tile = view.gridProj.tileW;
      const shake = row.phase === "warning" ? Math.round(Math.sin(now / 45)) * dot * 2 : 0, at = { x: actor.point.x + shake, y: actor.y, dot };
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = this.fade(owner, row);
      ctx.fillStyle = "rgba(10,6,4,.4)";
      ctx.beginPath();
      ctx.ellipse(at.x + dot * 2, at.y - dot, tile * 0.36, tile * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      if (actor.ready && this.RIM[row.kind]) this.drawStagedRim(owner, ctx, row, at);
      this.deps.stageObjects.draw(owner, ctx, this.look(row), at);
      this.nameLabel(ctx, row, at.x, at.y - tile * 0.98);
      if (row.phase === "warning") {
        const width = tile * 0.7, left = at.x - width / 2, top = at.y - tile * 0.78;
        ctx.fillStyle = "#1a120d";
        ctx.fillRect(left - dot, top - dot, width + dot * 2, dot * 4);
        ctx.fillStyle = row.kind === "sealed" ? "#b47ae0" : "#dfae75";
        ctx.fillRect(left, top, width * (1 - row.remainingMs / this.deps.actExplorationState.objects.warningMs[row.kind]), dot * 2);
      }
      ctx.restore();
    }
    nameLabel(ctx, row, x, y) {
      if (!this.deps.actExplorationState.objects.isEvent(row) || row.phase === "spent") return;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.font = this.NAME_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(8,6,4,0.9)";
      ctx.fillStyle = this.RIM[row.kind] || "#f3d6a4";
      const name = this.deps.actExplorationState.objects.name(row);
      this.deps.drawCrispCanvasText(ctx, name, x, y, "strokeText");
      this.deps.drawCrispCanvasText(ctx, name, x, y);
      ctx.restore();
    }
    /** Where a floor decal is drawn, or null: the object lies on the floor, the player knows its cell and it is near the screen. */
    decalPoint(run, row, p, area) {
      if (this.look(row).standing || !this.deps.actExplorationState.objects.visible(run, row)) return null;
      const point = p.cellToScreen(row.gx, row.gy);
      return this.nearScreen(point, area, p) ? point : null;
    }
    /** Floor decals (terrain pass): broken pots and crates, a spent nest, ambush tracks. The fog drawn after covers unseen ones.
     * area = { width, height } of the view: decals off the screen are skipped. */
    drawGround(owner, ctx, run, p, area) {
      if (!run?.objects || !this.deps.stageObjects.ready(owner)) return;
      for (const row of run.objects.entries) {
        const point = this.decalPoint(run, row, p, area);
        if (!point) continue;
        ctx.globalAlpha = row.kind === "ambush" && row.phase === "ready" ? 0.75 : 1;
        this.nameLabel(ctx, row, point.x, point.y + p.actorGroundOffsetY - p.tileW * 0.5);
        this.deps.stageObjects.draw(owner, ctx, this.look(row), { x: point.x, y: point.y + p.actorGroundOffsetY, dot: this.deps.stageActors.scaleFor(p.tileW) });
      }
      ctx.globalAlpha = 1;
    }
  };
  function createExplorationObjectView(deps, interaction) {
    const instance = new ExplorationObjectView(deps, interaction);
    return { append: instance.append.bind(instance), draw: instance.draw.bind(instance), drawGround: instance.drawGround.bind(instance) };
  }

  // modules/ui/exploration-objects.mjs
  var ExplorationObjectActions = class {
    constructor(deps) {
      this.deps = deps;
      this.interaction = { hovered: null };
      this.renderer = createExplorationObjectView(deps, this.interaction);
      this.layer = void 0;
      this.lastRun = void 0;
      this.buttons = /* @__PURE__ */ new Map();
      this.pending = null;
      this.installed = false;
      this.onObject = this.logObject.bind(this);
    }
    append(owner, actors, view) {
      this.pending = this.renderer.append(owner, actors, view);
    }
    /** Apply DOM changes after drawing, to avoid forced style updates between Canvas calls. */
    flushButtons(owner) {
      if (!this.pending) return;
      const { run, p, rows } = this.pending;
      this.pending = null;
      this.syncLayer(owner, run);
      if (!run?.objects) return;
      const shown = /* @__PURE__ */ new Set();
      for (const { row, point } of rows) {
        this.button(owner, row, point, p);
        shown.add(row.id);
      }
      for (const [id, node] of this.buttons) if (!shown.has(id)) {
        node.remove();
        this.buttons.delete(id);
      }
    }
    syncLayer(owner, run) {
      if (!this.layer) {
        const wrap = this.deps.document.getElementById("battlefield-wrap");
        if (!wrap) return;
        this.layer = this.deps.document.createElement("div");
        this.layer.id = "exploration-object-actions";
        this.layer.setAttribute("aria-label", this.deps._t("발견한 상자와 오브젝트"));
        wrap.appendChild(this.layer);
      }
      if (this.lastRun !== run) {
        this.buttons.forEach((n) => n.remove());
        this.buttons.clear();
        this.lastRun = run;
      }
      this.layer.hidden = !run?.objects || !!owner.isBackgroundCalculation;
    }
    button(owner, row, point, p) {
      if (!this.layer) return;
      let node = this.buttons.get(row.id);
      if (!node) {
        node = this.deps.document.createElement("button");
        node.type = "button";
        node.className = "exploration-object-action";
        node.dataset.objectId = row.id;
        const action = ["pot", "crate"].includes(row.kind) ? "부수기" : row.kind === "nest" ? "건드리기" : "열기";
        const name = this.deps.actExplorationState.objects.name(row);
        node.setAttribute("aria-label", `${name} ${action}`);
        const text = this.deps.document.createElement("span");
        text.textContent = `${name} ${action}`;
        node.appendChild(text);
        node.addEventListener("click", (event) => {
          event.stopPropagation();
          this.deps.request(row.id);
        });
        const hot = (on) => () => {
          if (on) this.interaction.hovered = row.id;
          else if (this.interaction.hovered === row.id) this.interaction.hovered = null;
        };
        node.addEventListener("pointerenter", hot(true));
        node.addEventListener("focus", hot(true));
        node.addEventListener("pointerleave", hot(false));
        node.addEventListener("blur", hot(false));
        this.layer.appendChild(node);
        this.buttons.set(row.id, node);
      }
      const size = Math.max(28, p.tileW * 0.9), x = Math.round(point.x - size / 2), y = Math.round(point.y + p.actorGroundOffsetY - size);
      const style = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
      if (node.dataset.bounds !== style) {
        node.style.cssText = style;
        node.dataset.bounds = style;
      }
      node.disabled = owner.combatHalted || owner.playerHp <= 0 || owner.moveTimer > 0;
    }
    logObject(event) {
      const { kind, name, objectKind } = event.detail;
      if (objectKind === "pot" || objectKind === "crate") return;
      this.deps.addLog(kind === "spawn" ? this.deps._t("{name}에서 몬스터가 나타났습니다.", { name }) : this.deps._t("{name}의 전리품을 획득했습니다.", { name }), kind === "spawn" ? "attack-monster" : "loot-magic", { noToast: true });
    }
    install() {
      if (this.installed) return;
      this.deps.events.addEventListener("project-idle:exploration-object", this.onObject);
      this.installed = true;
    }
    dispose() {
      if (this.installed) this.deps.events.removeEventListener("project-idle:exploration-object", this.onObject);
      this.installed = false;
      this.layer?.remove();
      this.layer = void 0;
      this.lastRun = void 0;
      this.buttons.clear();
      this.pending = null;
      this.interaction.hovered = null;
    }
  };
  function createExplorationObjectActions(deps) {
    const actions = new ExplorationObjectActions(deps);
    return {
      append: actions.append.bind(actions),
      flushButtons: actions.flushButtons.bind(actions),
      draw: actions.renderer.draw,
      drawGround: actions.renderer.drawGround,
      install: actions.install.bind(actions),
      dispose: actions.dispose.bind(actions)
    };
  }

  // modules/canvas-exploration-objects-classic.mjs
  var native = createExplorationObjectActions({
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationSight() {
      return actExplorationSight;
    },
    get stageObjects() {
      return stageObjects.renderer;
    },
    get stageActors() {
      return stageActors;
    },
    get targetMarks() {
      return targetMarks;
    },
    get performance() {
      return performance;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get i18n() {
      return i18n;
    },
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    },
    get document() {
      return document;
    },
    get events() {
      return window;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    // Resolve the current game at the action boundary, not when the DOM button was created.
    request: (id) => actExplorationProgress.objects.request(id)
  });
  native.install();
  actExplorationView.objects = {
    append: (actors, view) => native.append(game, actors, view),
    flushButtons: () => native.flushButtons(game),
    draw: (ctx, actor, view) => native.draw(game, ctx, actor, view),
    drawGround: (ctx, run, p, area) => native.drawGround(game, ctx, run, p, area),
    renderer: Object.freeze({ append: native.append, draw: native.draw, drawGround: native.drawGround }),
    lifecycle: Object.freeze({ install: native.install, dispose: native.dispose })
  };
})();
