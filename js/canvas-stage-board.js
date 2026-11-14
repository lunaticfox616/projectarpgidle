// GENERATED from modules/canvas-stage-board*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-board.mjs
  var StageBoard = class {
    constructor(deps) {
      this.deps = deps;
      this.WIDE = 64;
      this.FRAME = Object.freeze({ side: 9, top: 2, bottom: 8 });
      this.maps = /* @__PURE__ */ new Map();
      this.shades = /* @__PURE__ */ new Map();
      this.SHADES_KEPT = 2;
      this.boardLayout = () => this.deps.ACT_BATTLE_MAP_LAYOUT;
    }
    /** 구역 → 지역 이름. 무대가 꺼져 있거나 표에 없는 구역이면 ''. */
    boardRegion(owner, zone) {
      if (!zone || typeof this.deps.STAGE_ROOM_PLANS !== "object") return "";
      if (zone.type === "oceanDepth") return this.deps.actExplorationRoomPlans.oceanRegion(zone, !!owner.oceanBossRunPending);
      return this.deps.STAGE_ROOM_PLANS.regions.boards[zone.type] || "";
    }
    /** 지역 그림을 그리는 쪽(js/canvas-stage-region.js)에 넘길 지도: 문 없는 방 하나(고정 전장은 판 전체, 고스트 대전은 그 방). */
    roomMapOf(region, columns, rows) {
      const key = `${region}|${columns}|${rows}`, layout = this.boardLayout();
      if (!this.maps.has(key)) {
        const room = Object.freeze({ index: 0, id: "board", role: "battle", x0: 0, y0: 0, x1: columns - 1, y1: rows - 1, mirror: false });
        const id = columns === layout.columns && rows === layout.rows ? "board:" + region : "board:" + key;
        this.maps.set(key, Object.freeze({ id, region, stage: true, rooms: Object.freeze([room]), doors: Object.freeze([]), plan: Object.freeze({ boxes: Object.freeze([]) }) }));
      }
      return this.maps.get(key);
    }
    /** 그 지역의 방 하나를 무대 그림으로 그리는가: 그 지도와 그림의 상태('ready', 'pending'). 그림이 없는 지역이면 null. */
    roomStage(region, columns, rows) {
      const map = region ? this.roomMapOf(region, columns, rows) : null, status = map ? this.deps.stageRegion.status(map) : null;
      return status === "ready" || status === "pending" ? { map, status } : null;
    }
    /** 이 구역의 판을 무대 그림으로 그리는가(roomStage). */
    boardStage(owner, zone) {
      const layout = this.boardLayout();
      return this.roomStage(this.boardRegion(owner, zone), layout.columns, layout.rows);
    }
    /** columns × rows 칸의 방을 화면에 놓는 자리. 칸은 방 무대와 같은 규칙으로: 너비와, 방의 깊이가 화면 높이에 들어오는 크기
     * (stageView.tile)이되 방이 화면에 다 들어오게 줄인다(좁은 화면). */
    roomPlace(width, height, columns, rows) {
      const tile = Math.min(this.deps.stageView.tile(width, height, rows), Math.floor(width / (columns + 0.5))), deep = tile * this.deps.stageView.depth();
      const left = Math.round((width - columns * tile) / 2), top = Math.round(height * this.deps.stageView.floorShare(width, height) - rows * deep);
      const cells = { tileW: tile, tileH: deep, actorGroundOffsetY: deep / 6, unitScaleCap: tile / 46, cellToScreen: (gx, gy) => ({ x: left + (gx + 0.5) * tile, y: top + (gy + 0.5) * deep }) };
      return { cells, left, top };
    }
    /** 고정 전장의 화면 자리. 칸은 방 무대의 크기이되 판이 화면에 다 들어오게 줄인다(좁은 화면).
     * @returns {?object} js/ui.js getFixedBattleGridProjection과 같은 모양, 무대 그림으로 그리지 않는 구역이면 null */
    boardProjection(owner, width, height, zone) {
      const stage = this.boardStage(owner, zone), layout = this.boardLayout();
      const { cells, left, top } = this.roomPlace(width, height, layout.columns, layout.rows), tile = cells.tileW, deep = cells.tileH;
      if (stage) return { ...cells, mapX: left, mapY: top, mapWidth: layout.columns * tile, mapHeight: layout.rows * deep, stageBoard: stage };
      const scale = tile / layout.cellWidth, tall = deep / layout.cellHeight;
      return { ...cells, mapX: left - layout.gridOriginX * scale, mapY: top - layout.gridOriginY * tall, mapWidth: layout.width * scale, mapHeight: layout.height * tall };
    }
    /** 판 밖의 바닥이 멀어질수록 어두워지는 그늘(판마다 한 번 그려 둔다). */
    boardShade(map) {
      if (!this.shades.has(map)) {
        const room = map.rooms[0], box = { x: -this.FRAME.side, y: -this.FRAME.top, columns: room.x1 + 1 + this.FRAME.side * 2, rows: room.y1 + 1 + this.FRAME.top + this.FRAME.bottom };
        this.shades.set(map, { box, canvas: this.deps.stageRegion.paintRoom(map, room, box) });
        if (this.shades.size > this.SHADES_KEPT) this.shades.delete(this.shades.keys().next().value);
      }
      return this.shades.get(map);
    }
    /** 고정 전장의 배경: 지역 그림과 그늘. p는 boardProjection이 준 자리다.
     * @returns {boolean} 그렸는가(그렸으면 부르는 쪽은 앞서의 판 그림을 그리지 않는다) */
    boardBackground(ctx, p, area) {
      const stage = p && p.stageBoard;
      if (!stage) return false;
      ctx.save();
      if (stage.status !== "ready" || this.deps.stageRegion.status(stage.map) !== "ready") {
        ctx.fillStyle = "#0b090c";
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
        return true;
      }
      this.deps.stageRegion.drawFar(ctx, { map: stage.map, room: stage.map.rooms[0] }, p, area);
      const under = this.boardShade(stage.map), box = under.box, dot = p.tileW / this.WIDE;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(under.canvas, Math.round(p.mapX + box.x * p.tileW), Math.round(p.mapY + box.y * p.tileH), Math.round(under.canvas.width * dot), Math.round(under.canvas.height * dot));
      ctx.restore();
      return true;
    }
  };
  function createStageBoard(deps) {
    const instance = new StageBoard(deps);
    return Object.freeze({ projection: instance.boardProjection.bind(instance), background: instance.boardBackground.bind(instance), room: instance.roomStage.bind(instance), place: instance.roomPlace.bind(instance) });
  }

  // modules/canvas-stage-board-classic.mjs
  var native = createStageBoard({
    get ACT_BATTLE_MAP_LAYOUT() {
      return ACT_BATTLE_MAP_LAYOUT;
    },
    get STAGE_ROOM_PLANS() {
      return typeof STAGE_ROOM_PLANS === "undefined" ? void 0 : STAGE_ROOM_PLANS;
    },
    get actExplorationRoomPlans() {
      return actExplorationRoomPlans;
    },
    get stageRegion() {
      return stageRegion;
    },
    get stageView() {
      return stageView;
    }
  });
  var stageBoard = Object.freeze({
    projection: (width, height, zone) => native.projection(game, width, height, zone),
    background: native.background,
    room: native.room,
    place: native.place
  });
  safeExposeGlobals({ stageBoard });
})();
