// GENERATED from modules/canvas-stage-region*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-region.mjs
  var StageRegion = class {
    constructor(deps) {
      this.deps = deps;
      this.WIDE = 64;
      this.DEEP = 32;
      this.KEEP = 3;
      this.pictures = /* @__PURE__ */ new Map();
      this.settled = /* @__PURE__ */ new Set();
      this.recent = [];
      this.fits = /* @__PURE__ */ new Map();
      this.tints = /* @__PURE__ */ new Map();
      this.shades = /* @__PURE__ */ new Map();
      this.layouts = /* @__PURE__ */ new WeakMap();
      this.fitDot = 0;
      this.fitFamily = "";
      this.sceneries = /* @__PURE__ */ new Map();
      this.SCENERY_KEEP = 2;
      this.DOOR = Object.freeze({ north: [0, 12], south: [0, 19], west: [8, 0], east: [-8, 0] });
      this.SHADE = Object.freeze({ alpha: 0.3, reach: 96 });
      this.BLEND_DOTS = 56;
      this.OBJECTS = Object.freeze({ chest: "prop-4", chestOpen: "prop-5", pot: "prop-6", potBroken: "prop-7", crate: "prop-6", crateBroken: "prop-7" });
      this.GRADE = Object.freeze({ gold: "rgba(255,204,72,0.22)" });
      this.regionOfMap = (map) => map && this.deps.stageRegionFit.of(map.region) || null;
      this.regionFamily = (region2) => this.deps.STAGE_REGIONS.families[region2.family];
      this.regionPieceFile = (region2, name) => region2.family + "/" + name + ".png";
      this.pictureLoaded = (row) => row.image.complete && row.image.naturalWidth > 0;
      this.roomPictureName = (id, region2, room) => region2.rooms && region2.rooms[room.role === "boss" || room.role === "elite" ? room.role : "general"] || id;
      this.pictureNames = (id, region2) => [id, ...Object.values(region2.rooms || {})];
      this.shadeInk = (step) => `rgba(12,10,12,${(this.SHADE.alpha * Math.min(1, step / this.SHADE.reach)).toFixed(3)})`;
      this.roomDoorOn = (map, room, side) => map.doors.find((door) => door.room === room.index && door.side === side) || null;
      this.frontPropSpot = (room, side) => ({ x: side === "west" ? room.x0 * this.WIDE - 40 : (room.x1 + 1) * this.WIDE + 40, y: (room.y1 + 1) * this.DEEP - 14 });
    }
    regionPicture(file) {
      if (!this.pictures.has(file)) {
        const row = {};
        row.image = this.deps.stageAssetRetry.image(this.deps.STAGE_REGIONS.path + file + "?v=" + this.deps.STAGE_REGIONS.version, () => this.pictures.get(file) === row);
        this.pictures.set(file, row);
      }
      return this.pictures.get(file);
    }
    regionFiles(id, region2) {
      const family = this.regionFamily(region2);
      return [...this.pictureNames(id, region2).map((name) => name + ".png"), ...Object.keys(family.pieces).map((name) => this.regionPieceFile(region2, name))];
    }
    /** 지금 쓰는 지역을 맨 앞에 두고, KEEP장을 넘긴 오래된 방 그림은 놓아 준다. */
    touchRegion(id) {
      if (this.recent[0] === id) return;
      this.recent.splice(0, this.recent.length, id, ...this.recent.filter((other) => other !== id));
      for (const old of this.recent.splice(this.KEEP)) {
        for (const name of this.pictureNames(old, this.deps.STAGE_REGIONS.regions[old] || {})) this.pictures.delete(name + ".png");
        this.settled.delete(old);
      }
    }
    /** @returns {?string} 'ready' 그림이 모두 왔다, 'pending' 불러오는 중(받지 못한 그림은 다시 받는다). 지역 그림이 없는 지도면 null. */
    regionStatus(map) {
      const region2 = this.regionOfMap(map), id = region2 ? map.region : null;
      if (!region2) return null;
      this.touchRegion(id);
      if (this.settled.has(id)) return "ready";
      if (!this.regionFiles(id, region2).map(this.regionPicture.bind(this)).every(this.pictureLoaded)) return "pending";
      this.settled.add(id);
      return "ready";
    }
    fittedRegionPiece(file, dot) {
      const family = file.slice(0, file.indexOf("/"));
      if (this.fitDot !== dot || this.fitFamily !== family) {
        this.fits.clear();
        this.fitDot = dot;
        this.fitFamily = family;
      }
      if (!this.fits.has(file)) this.fits.set(file, this.deps.stageDots.fitted(this.regionPicture(file).image, dot));
      return this.fits.get(file);
    }
    /** 그 방의 그림 파일과 배율(그림 1px의 화면 크기). 배율은 그 지도의 기준 방(map.frame)에 맞춘 하나다: 좁거나 얕은 방에서도 풍경과
     * 구조물의 크기가 같다. 판(고정 전장)은 제 크기다. */
    roomPictureFit(map, room, dot) {
      const region2 = this.regionOfMap(map), frame = map.frame || { columns: room.x1 - room.x0 + 1, rows: room.y1 - room.y0 + 1 };
      return { region: region2, file: this.roomPictureName(map.region, region2, room) + ".png", scale: this.deps.stageRegionFit.scale(region2, frame.columns, frame.rows) * dot };
    }
    /** 화면 배율로 옮겨 둔 방 그림. 2026-10-30 사용자 "맵들이 이상하게 찌그러져보이고": 2px 격자로 그린 방 그림을 1.7배 같은 배율에 보간 없이
     * 찍으면 도트가 2px, 3px로 들쭉날쭉했다. 캐릭터처럼 정수배로 키웠다가 줄여 도트마다 같은 넓이를 준다(js/canvas-stage-dots.js).
     * 아직 옮기지 못했으면(고정 전장, 창 크기를 바꾼 직후) 그림 그대로다. */
    roomPictureSource(fit) {
      const kept = this.sceneries.get(fit.file);
      return kept && kept.scale === fit.scale ? kept.canvas : this.regionPicture(fit.file).image;
    }
    keepScenery(file, row) {
      this.sceneries.delete(file);
      this.sceneries.set(file, row);
      for (const [old, entry] of [...this.sceneries].slice(0, Math.max(0, this.sceneries.size - this.SCENERY_KEEP))) {
        this.sceneries.delete(old);
        if (entry.canvas instanceof this.deps.HTMLCanvasElement) entry.canvas.width = entry.canvas.height = 1;
      }
    }
    /** 방 그림을 화면 배율로 옮기는 일들(뒤에서부터 하나씩 한다): 옮기기를 시작하고, 한 조각씩 옮기고, 마지막은 남은 것을 마저 옮긴다. */
    sceneryJobs(map, room, dot) {
      const fit = this.roomPictureFit(map, room, dot), kept = this.sceneries.get(fit.file), image = this.regionPicture(fit.file).image;
      if (kept && kept.scale === fit.scale) return [];
      let job = null;
      const step = () => job && job.step();
      const finish = () => {
        while (!job.step()) {
          /*! 남은 조각 */
        }
        this.keepScenery(fit.file, { scale: fit.scale, canvas: job.canvas });
      };
      const tiles = Math.ceil(image.naturalWidth / 512) * Math.ceil(image.naturalHeight / 512);
      return [finish, ...Array(Math.max(0, tiles - 1)).fill(step), () => {
        job = this.deps.stageDots.fitter(image, fit.scale);
      }];
    }
    drawRoomPicture(ctx, view, p, area) {
      const room = view.room, dot = p.tileW / this.WIDE, fit = this.roomPictureFit(view.map, room, dot), region2 = fit.region, scale = fit.scale;
      const w = this.deps.stageDots.span(region2.width * scale), h = this.deps.stageDots.span(region2.height * scale);
      const x = Math.round(p.mapX + (room.x0 + room.x1 + 1) / 2 * p.tileW - w / 2), y = Math.round(p.mapY + room.y0 * p.tileH - region2.ground * scale);
      ctx.fillStyle = region2.earth;
      ctx.fillRect(0, 0, area.width, area.height);
      ctx.fillStyle = region2.sky;
      ctx.fillRect(0, 0, area.width, Math.max(0, y + 2));
      ctx.imageSmoothingEnabled = false;
      if (room.mirror) {
        ctx.save();
        ctx.translate(x * 2 + w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(this.roomPictureSource(fit), x, y, w, h);
      if (typeof this.deps.stageOcean === "object") this.deps.stageOcean.light(ctx, view.map.region, { x, y, w, h });
      if (room.mirror) ctx.restore();
      this.deps.woodsmanView.body(ctx, view, p, { x, y, w, h });
      this.blendPictureEdges(ctx, region2, { x, y, w, h, reach: Math.round(this.BLEND_DOTS * dot) }, area);
    }
    /** 방 그림이 방 바닥의 뒤쪽 끝(바닥선) 위로 올라가는 높이(칸 너비 단위, js/canvas-stage-scene.js coverTile). 지역 그림이 없는 지도는 0. */
    pictureRise(map) {
      const region2 = this.regionOfMap(map);
      return region2 && map.frame ? region2.ground * this.deps.stageRegionFit.scale(region2, map.frame.columns, map.frame.rows) / this.WIDE : 0;
    }
    /** 방 그림이 화면의 위나 아래에 닿지 않으면(세로로 긴 화면) 그림의 끝이 메운 색과 맞닿아 줄로 보였다: 끝에서 reach만큼을 메운 색으로
     * 풀어 준다. 그림이 화면을 덮는 넓은 화면에서는 아무것도 그리지 않는다. */
    blendPictureEdges(ctx, region2, picture, area) {
      const fade = (from, to, colour, horizontal = false) => {
        const ink = horizontal ? ctx.createLinearGradient(from, 0, to, 0) : ctx.createLinearGradient(0, from, 0, to);
        ink.addColorStop(0, colour);
        ink.addColorStop(1, colour + "00");
        ctx.fillStyle = ink;
        if (horizontal) ctx.fillRect(Math.min(from, to), picture.y, Math.abs(to - from), picture.h);
        else ctx.fillRect(0, Math.min(from, to), area.width, Math.abs(to - from));
      };
      if (picture.x > 0) fade(picture.x, picture.x + picture.reach, region2.earth, true);
      if (picture.x + picture.w < area.width) fade(picture.x + picture.w, picture.x + picture.w - picture.reach, region2.earth, true);
      if (picture.y > 0) fade(picture.y, picture.y + picture.reach, region2.sky);
      if (picture.y + picture.h < area.height) fade(picture.y + picture.h, picture.y + picture.h - picture.reach, region2.earth);
    }
    /** 바닥의 양옆(뒤쪽 끝에서 앞쪽 끝까지): 옆으로 멀어질수록 어둡다. */
    shadeRoomSides(ctx, edge) {
      for (let step = 0; step < edge.reachX; step += 4) {
        ctx.fillStyle = this.shadeInk(step);
        ctx.fillRect(edge.right + step, edge.top, 4, edge.front - edge.top);
        ctx.fillRect(edge.left - step - 4, edge.top, 4, edge.front - edge.top);
      }
    }
    /** 바닥의 앞쪽 바깥과 두 구석: 앞쪽 끝과 옆 끝 가운데 더 먼 쪽의 거리만큼 어둡다. 구석을 따로 두면 좁은 바닥(고정 전장) 아래에서
     * 그늘이 네모나게 끊겨 보였다. 가로 띠는 앞으로 먼 곳을, 세로 띠는 옆으로 더 먼 곳을 맡아 겹치지 않는다. */
    shadeRoomFront(ctx, edge) {
      for (let step = 0; step < edge.far - edge.front; step += 4) {
        ctx.fillStyle = this.shadeInk(step);
        ctx.fillRect(edge.left - step - 4, edge.front + step, edge.right - edge.left + step * 2 + 8, 4);
      }
      for (let step = 4; step < edge.reachX; step += 4) {
        ctx.fillStyle = this.shadeInk(step);
        ctx.fillRect(edge.right + step, edge.front, 4, Math.min(edge.far - edge.front, step));
        ctx.fillRect(edge.left - step - 4, edge.front, 4, Math.min(edge.far - edge.front, step));
      }
    }
    /** 방마다 한 번 그려 두는 그림: 걸을 수 있는 바닥의 양옆과 앞쪽 바깥이 멀어질수록 어두워진다(방 그림의 바닥이 화면 끝까지
     * 이어지므로 어디까지 걸을 수 있는지 알린다). */
    paintRoomShade(map, room, box) {
      const canvas = this.deps.document.createElement("canvas"), left = room.x0 * this.WIDE, right = (room.x1 + 1) * this.WIDE;
      canvas.width = box.columns * this.WIDE;
      canvas.height = box.rows * this.DEEP;
      const ctx = canvas.getContext("2d"), edge = {
        left,
        right,
        top: room.y0 * this.DEEP,
        front: (room.y1 + 1) * this.DEEP,
        far: (box.y + box.rows) * this.DEEP,
        reachX: Math.max(left - box.x * this.WIDE, (box.x + box.columns) * this.WIDE - right)
      };
      ctx.translate(-box.x * this.WIDE, -box.y * this.DEEP);
      this.shadeRoomSides(ctx, edge);
      this.shadeRoomFront(ctx, edge);
      return canvas;
    }
    /** 바닥의 뒤쪽 끝에 서는 자리: 방 끝에서 inset만큼 안쪽. 뒤쪽 문과 겹치면 방 끝 쪽으로 물린다. */
    backPropSpot(map, room, side, inset) {
      const left = room.x0 * this.WIDE, right = (room.x1 + 1) * this.WIDE, door = this.roomDoorOn(map, room, "north");
      const x = side === "west" ? left + inset : right - inset, doorX = door ? (door.cell.gx + 0.5) * this.WIDE : null;
      const clear = doorX === null || Math.abs(doorX - x) > 170;
      return { x: clear ? x : side === "west" ? Math.min(x, doorX - 170) : Math.max(x, doorX + 170), y: room.y0 * this.DEEP + 8 };
    }
    /** 바닥의 옆 끝 바깥에 서는 자리들(걸을 수 있는 칸의 바로 옆, 깊이의 위쪽과 아래쪽): 그쪽 벽의 문에서 세 줄 안이면 놓지 않는다.
     * 방이 화면보다 좁으면 바닥 그림이 방 밖으로 이어지므로, 여기에 선 소품이 어디까지 걸을 수 있는지 알려 준다. */
    sidePropSpots(map, room) {
      const rows = room.y1 - room.y0 + 1, spots = [];
      for (const side of ["west", "east"]) {
        const door = this.roomDoorOn(map, room, side), x = side === "west" ? room.x0 * this.WIDE - 44 : (room.x1 + 1) * this.WIDE + 44;
        for (const share of [0.3, 0.75]) {
          const row = room.y0 + share * rows;
          if (!door || Math.abs(door.cell.gy + 0.5 - row) > 3) spots.push({ x, y: Math.round(row * this.DEEP) });
        }
      }
      return spots;
    }
    /** 보통 방: 낮은 소품 둘에서 넷을 고른 자리에 놓는다. 자리는 뒤쪽 끝의 양 구석과 그 안쪽, 앞쪽 구석, 옆 끝 바깥이다(2026-10-13 밤:
     * 전에는 네 구석뿐이었다. 검토: "소품은 주로 구석에 놓아"). 모두 걸을 수 있는 칸의 바깥이다. */
    normalRoomProps(map, room, region2, rng) {
      const names = region2.normal.filter((index) => index < 2).map((index) => "prop-" + index), low = names.length ? names : ["prop-0"];
      const inner = Math.round((room.x1 - room.x0 + 1) * this.WIDE * 0.32);
      const spots = [
        this.backPropSpot(map, room, "west", 90),
        this.backPropSpot(map, room, "east", 90),
        this.frontPropSpot(room, "west"),
        this.frontPropSpot(room, "east"),
        this.backPropSpot(map, room, "west", inner),
        this.backPropSpot(map, room, "east", inner),
        ...this.sidePropSpots(map, room)
      ];
      for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
      }
      const count = 2 + Math.floor(rng() * 3);
      return spots.slice(0, count).map((spot, index) => ({ name: low[index % low.length], flip: rng() < 0.5, ...spot }));
    }
    /** 정예 방: 높은 표식 둘이 뒤쪽 끝의 양쪽에 서고, 낮은 소품 하나가 앞쪽 구석에 놓인다. */
    eliteRoomProps(map, room, region2, rng) {
      const low = region2.elite.find((index) => index < 2), side = rng() < 0.5 ? "west" : "east";
      const marks = [{ name: "prop-2", ...this.backPropSpot(map, room, "west", 120) }, { name: "prop-2", flip: true, ...this.backPropSpot(map, room, "east", 120) }];
      return low === void 0 ? marks : [...marks, { name: "prop-" + low, ...this.frontPropSpot(room, side) }];
    }
    /** 보스 방: 큰 구조물 하나가 들어온 문의 맞은편 뒤쪽 구석에 선다. 보스 방 그림의 가운데에 구조물이 그려진 지역(boss가 빈 목록)은 세우지 않는다. */
    bossRoomProps(map, room, region2) {
      if (!region2.boss.length) return [];
      const sideHasDoor = (side2) => !!this.roomDoorOn(map, room, side2), side = sideHasDoor(region2.bossSide) && !sideHasDoor(region2.bossSide === "east" ? "west" : "east") ? region2.bossSide === "east" ? "west" : "east" : region2.bossSide;
      const spot = this.backPropSpot(map, room, side, 170);
      return [{ name: "prop-3", flip: side !== region2.bossSide, x: spot.x, y: spot.y + 2 }];
    }
    regionRoomLayout(map, room, region2) {
      const rng = this.deps.createSeededRng(`stage-props:${map.id}:${room.id}:${map.plan.boxes.length}:${room.x1 - room.x0}:${room.y1 - room.y0}:${room.at.join(".")}`), family = this.regionFamily(region2);
      const list = map.colonyDefense || map.grandBreach ? this.normalRoomProps(map, room, region2, rng) : room.role === "boss" ? this.bossRoomProps(map, room, region2) : room.role === "elite" ? this.eliteRoomProps(map, room, region2, rng) : this.normalRoomProps(map, room, region2, rng);
      return list.filter((piece) => family.pieces[piece.name]);
    }
    regionRoomPieces(map, room, region2) {
      if (!this.layouts.has(map)) this.layouts.set(map, /* @__PURE__ */ new Map());
      const rooms = this.layouts.get(map);
      if (!rooms.has(room.index)) rooms.set(room.index, this.regionRoomLayout(map, room, region2));
      return rooms.get(room.index);
    }
    /** 공용 뿌리 봉인의 발 자리(도트, 지도 좌표). 잠금 규칙은 기존 문 행을 그대로 읽는다. */
    regionDoorPiece(row, room) {
      const door = row.door, [dx, dy] = this.DOOR[door.side];
      const y = door.side === "north" ? room.y0 * this.DEEP : door.side === "south" ? (room.y1 + 1) * this.DEEP : (door.cell.gy + 0.5) * this.DEEP;
      return { doorRow: row, x: (door.cell.gx + 0.5) * this.WIDE + dx, y: y + dy };
    }
    /** Existing region props stand at the gameplay anchors, so the core and each rift keep their depth among actors. */
    specialRoomPieces(map) {
      const propAt = (name, cell, scale = 1) => ({ name, x: (cell.gx + 0.5) * this.WIDE, y: (cell.gy + 1) * this.DEEP, scale });
      if (map.colonyDefense) return [propAt("prop-3", map.colonyDefense.core, 0.5)];
      return map.grandBreach ? map.grandBreach.riftCells.map((cell) => propAt("prop-2", cell)) : [];
    }
    /** 전장 그리기의 배우 목록에 이 방의 소품과 문을 끼운다(깊이 순서는 발 자리의 화면 y). */
    appendRegionPieces(actors, state, here) {
      const region2 = this.regionOfMap(here.map), p = state.gridProj, dot = p.tileW / this.WIDE, reach = 400 * dot;
      const doors = this.deps.actExplorationDoors.doorsHere(here.run).map((row) => this.regionDoorPiece(row, here.room));
      this.regionRoomPieces(here.map, here.room, region2).concat(this.specialRoomPieces(here.map), doors).forEach((piece, index) => {
        const x = p.mapX + piece.x * dot, y = p.mapY + piece.y * dot;
        if (x > -reach && x < state.width + reach) actors.push({ kind: "scenery", id: -2e3 - index, y, piece: { ...piece, region: region2 }, point: { x, y } });
      });
    }
    /** 주인공이 이 조각 바로 뒤에 서 있는가(조각이 주인공을 가린다). */
    pieceHidesHero(actor, state, size, dot) {
      const hero = state.playerPos, left = actor.point.x - (size[2] - size[4]) * dot, top = actor.y - (size[3] - size[5]) * dot;
      return hero.y < actor.y && hero.y > top && hero.x > left - 4 && hero.x < left + size[6] * dot + 4;
    }
    /** 조각 하나: 발 자리를 actor.point에 맞춘다. 뒤집은 조각은 발 자리를 축으로 좌우를 바꾼다. */
    drawRegionPiece(ctx, actor, state) {
      const piece = actor.piece, size = this.regionFamily(piece.region).pieces[piece.name], dot = this.deps.stageActors.scaleFor(state.gridProj.tileW), drawnDot = dot * (piece.scale || 1);
      const at = { x: Math.round(actor.point.x - size[2] * drawnDot), y: Math.round(actor.y - size[3] * drawnDot) };
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (this.pieceHidesHero(actor, state, size, drawnDot)) ctx.globalAlpha *= 0.5;
      if (piece.flip) {
        ctx.translate(Math.round(actor.point.x) * 2, 0);
        ctx.scale(-1, 1);
      }
      const file = this.regionPieceFile(piece.region, piece.name), shade = typeof this.deps.stageOcean === "object" ? this.deps.stageOcean.shade() : null;
      ctx.drawImage(shade ? this.shadedRegionPiece(file, dot, shade) : this.fittedRegionPiece(file, dot), at.x, at.y, this.deps.stageDots.span(size[0] * drawnDot), this.deps.stageDots.span(size[1] * drawnDot));
      ctx.restore();
    }
    /** 어두운 심해 띠의 소품(js/canvas-stage-ocean.js shade): 화면 배율로 옮겨 둔 조각에 그 띠의 어둠을 얹은 그림. 공용 심해 소품은
     * 황혼층 빛으로 칠해져 무광층과 해구에서 혼자 밝게 튀었다. 배율이 바뀌어 조각을 새로 옮기면 다시 만든다. */
    shadedRegionPiece(file, dot, shade) {
      const source = this.fittedRegionPiece(file, dot), key = file + "|" + shade;
      let row = this.shades.get(key);
      if (!row || row.source !== source) {
        const canvas = this.deps.document.createElement("canvas"), c = canvas.getContext("2d");
        canvas.width = source.width;
        canvas.height = source.height;
        c.drawImage(source, 0, 0);
        c.globalCompositeOperation = "source-atop";
        c.fillStyle = shade;
        c.fillRect(0, 0, canvas.width, canvas.height);
        row = { source, canvas };
        this.shades.set(key, row);
      }
      return row.canvas;
    }
    /** 열린 좌우 문의 화살표: 접힌 봉인 위에 세운다. 전장의 조명을 입힌 뒤에 그린다(js/canvas-battlefield.js가 부른다). */
    drawRegionSideMarks(ctx, p, here) {
      const dot = this.deps.stageActors.scaleFor(p.tileW);
      for (const row of this.deps.actExplorationDoors.doorsHere(here.run)) {
        if (row.locked || row.door.side !== "west" && row.door.side !== "east" || this.deps.stageDoorMarks.underFrame(p, row)) continue;
        const piece = this.regionDoorPiece(row, here.room);
        this.deps.stageDoorMarks.arrows(ctx, {
          cx: p.mapX + piece.x * dot,
          cy: p.mapY + (piece.y - 20) * dot,
          w: this.WIDE * dot
        }, row.door, { dot, thick: 3, upright: true });
      }
    }
    /** 그림 한 장에 한 색을 얹은 것(alpha가 1이면 실루엣). 한 번 만들어 둔다. */
    tintedRegionPiece(file, colour, solid) {
      const key = file + "|" + colour;
      if (this.tints.has(key)) return this.tints.get(key);
      const image = this.regionPicture(file).image, canvas = this.deps.document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const c = canvas.getContext("2d");
      c.drawImage(image, 0, 0);
      c.globalCompositeOperation = solid ? "source-in" : "source-atop";
      c.fillStyle = colour;
      c.fillRect(0, 0, canvas.width, canvas.height);
      this.tints.set(key, canvas);
      return canvas;
    }
    /** 그 물체를 이 지역의 재질 그림으로 그릴 수 있으면 그 조각. 보급 상자의 은, 금 등급은 같은 상자에 빛깔을 얹는다. */
    regionObjectPiece(owner, look) {
      const run = this.deps.actExplorationState.current(owner), map = this.deps.actExplorationDoors.stageMap(run), name = this.OBJECTS[look.name];
      if (!name || !map || this.regionStatus(map) !== "ready") return null;
      const region2 = this.regionOfMap(map), size = this.regionFamily(region2).pieces[name];
      return size ? { file: this.regionPieceFile(region2, name), size, flip: look.name.startsWith("crate"), grade: look.name === "chest" ? this.GRADE[look.tint] || null : null } : null;
    }
    stampRegionObject(ctx, source, piece, at) {
      const size = piece.size, x = Math.round(at.x - size[2] * at.dot), y = Math.round(at.y - size[3] * at.dot);
      ctx.save();
      if (piece.flip) {
        ctx.translate(Math.round(at.x) * 2, 0);
        ctx.scale(-1, 1);
      }
      this.deps.stageDots.blit(ctx, source, { x: 0, y: 0, w: size[0], h: size[1] }, { x, y, scale: at.dot }, true);
      ctx.restore();
    }
    /** @param {{name:string,tint?:string}} look @param {{x:number,y:number,dot:number}} at 발 자리와 도트 하나의 크기 @returns {boolean} 그렸는지 */
    drawRegionObject(owner, ctx, look, at) {
      const piece = this.regionObjectPiece(owner, look);
      if (!piece) return false;
      const shade = typeof this.deps.stageOcean === "object" ? this.deps.stageOcean.shade() : null, tint = piece.grade || shade;
      this.stampRegionObject(ctx, tint ? this.tintedRegionPiece(piece.file, tint, false) : this.regionPicture(piece.file).image, piece, at);
      return true;
    }
    /** 그 물체를 이 지역의 재질 그림으로 그릴 때 그림이 차지하는 맨 위(화면 px). 이 지역의 그림이 아니면 null. */
    regionObjectTop(owner, look, at) {
      const piece = this.regionObjectPiece(owner, look);
      return piece ? at.y - (piece.size[3] - piece.size[5]) * at.dot : null;
    }
    /** 누를 수 있는 물체의 밝은 테. @returns {boolean} 이 지역의 그림으로 둘렀는지 */
    outlineRegionObject(owner, ctx, look, at, colour) {
      const piece = this.regionObjectPiece(owner, look);
      if (!piece) return false;
      const rim = this.tintedRegionPiece(piece.file, colour, true);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.stampRegionObject(ctx, rim, piece, { x: at.x + dx * at.dot, y: at.y + dy * at.dot, dot: at.dot });
      return true;
    }
    /** 그 방을 그릴 때 쓰는 조각 그림(소품)을 화면 배율로 옮겨 두는 일들, 하나에 그림 한 장. 방 그림을 준비할
     * 때 미리 해 둔다(js/canvas-stage-room-pictures.js): 예전에는 방을 처음 그리는 프레임에서 조각마다 옮겼다. */
    regionFitJobs(map, room, dot) {
      const region2 = this.regionOfMap(map), family = this.regionFamily(region2), names = this.regionRoomPieces(map, room, region2).concat(this.specialRoomPieces(map)).map((piece) => piece.name);
      return [...new Set(names)].filter((name) => family.pieces[name]).map((name) => () => this.fittedRegionPiece(this.regionPieceFile(region2, name), dot)).concat(this.sceneryJobs(map, room, dot));
    }
    /** 곧 쓸 지역의 방 그림을 미리 불러 둔다(그림이 없는 지역이면 아무 일도 없다). */
    warmRegion(id) {
      const region2 = this.deps.stageRegionFit.of(id);
      if (region2) this.pictureNames(id, region2).forEach((name) => this.regionPicture(name + ".png"));
    }
  };
  function createStageRegion(deps) {
    const instance = new StageRegion(deps);
    return Object.freeze({
      warm: instance.warmRegion.bind(instance),
      status: instance.regionStatus.bind(instance),
      rise: instance.pictureRise.bind(instance),
      drawFar: instance.drawRoomPicture.bind(instance),
      paintRoom: instance.paintRoomShade.bind(instance),
      append: instance.appendRegionPieces.bind(instance),
      draw: instance.drawRegionPiece.bind(instance),
      drawMarks: instance.drawRegionSideMarks.bind(instance),
      drawObject: instance.drawRegionObject.bind(instance),
      outlineObject: instance.outlineRegionObject.bind(instance),
      objectTop: instance.regionObjectTop.bind(instance),
      fitJobs: instance.regionFitJobs.bind(instance)
    });
  }

  // modules/canvas-stage-region-classic.mjs
  var region = createStageRegion({
    get stageRegionFit() {
      return stageRegionFit;
    },
    get STAGE_REGIONS() {
      return typeof STAGE_REGIONS === "undefined" ? void 0 : STAGE_REGIONS;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get stageDots() {
      return stageDots;
    },
    get HTMLCanvasElement() {
      return HTMLCanvasElement;
    },
    get stageOcean() {
      return typeof stageOcean === "undefined" ? void 0 : stageOcean.lighting;
    },
    get woodsmanView() {
      return woodsmanView;
    },
    get document() {
      return document;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get stageActors() {
      return stageActors;
    },
    get stageDoorMarks() {
      return stageDoorMarks;
    },
    get actExplorationState() {
      return actExplorationState;
    }
  });
  var stageRegion = Object.freeze({
    ...region,
    drawObject: (ctx, look, at) => region.drawObject(game, ctx, look, at),
    outlineObject: (ctx, look, at, colour) => region.outlineObject(game, ctx, look, at, colour),
    objectTop: (look, at) => region.objectTop(game, look, at),
    objects: Object.freeze({ drawObject: region.drawObject, outlineObject: region.outlineObject, objectTop: region.objectTop })
  });
  safeExposeGlobals({ stageRegion });
})();
