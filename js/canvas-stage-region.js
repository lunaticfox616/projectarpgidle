/** 지역 무대 묶음으로 방을 그린다 (data/stage-regions.js, 2026-10-12 사용자가 이미지 생성으로 만들어 온 "지역 무대 조립본":
 * 지역 28곳의 방 그림 한 장씩, 재질 14가지의 문 네 방향과 소품 여덟 가지). 묶음을 만든 쪽의 조립 규칙을 따른다.
 * - 방 그림: 뒤쪽 풍경과 바닥이 한 장에 있다. 늘이거나 이어 붙이지 않고, 그림의 바닥이 시작하는 줄을 방 바닥의 뒤쪽 끝에 맞춰
 *   방의 가운데에 놓는다(js/stage-region-fit.js). 방이 화면보다 넓으면 카메라와 함께 움직인다. 그림이 닿지 않는 위아래는 그림의
 *   맨 윗줄, 맨 아랫줄 색으로 메운다.
 * - 문: 문틀은 캐릭터와 같은 깊이 순서로 서고, 잠겼으면 문틀의 뚫린 자리 안에만 닫힌 문의 덧그림을 얹는다.
 * - 소품: 방 가운데는 비운다. 보통 방은 낮은 소품 두셋, 정예 방은 높은 표식 둘과 낮은 소품 하나, 보스 방은 들어온 문의 맞은편에
 *   큰 구조물 하나. 모두 걸을 수 있는 칸의 바깥(바닥의 뒤쪽 끝과 앞쪽 구석)에 선다.
 * - 보급 상자(나무 등급)와 항아리, 목재 상자는 그 재질의 그림을 쓴다(js/canvas-stage-objects.js가 먼저 여기에 묻는다).
 * 조각 그림은 캐릭터 도트 하나에 1px이라 캐릭터와 같은 배율로 찍는다. 그림 폴더가 없는 판(저장소에는 넣지 않는다)에서는 status가
 * 'failed'라 예전 무대(조각 묶음이나 벽돌 벽)가 그대로 나온다. 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 */
const stageRegion = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    const KEEP = 3;                             // 기억해 두는 방 그림의 수(한 장이 풀리면 6MB쯤이다)
    const pictures = new Map();                 // 파일 → { image, failed }
    const settled = new Map();                  // 지역 → 'ready' | 'failed'
    const recent = [];                          // 최근에 쓴 지역(맨 앞이 지금)
    const fits = new Map();                     // 파일 → 지금 배율(fitDot)로 옮겨 둔 그림
    const tints = new Map();                    // "파일|색" → 한 색을 얹은 그림(보급 상자의 등급, 누를 수 있는 물체의 테)
    const layouts = new WeakMap();              // 지도 → Map(방 번호 → 소품 자리)
    let fitDot = 0;
    /** 문틀의 발 자리(도트): 뒤쪽 문은 바닥선 아래로, 앞쪽 문은 바닥의 앞쪽 끝 아래로 내려 서고, 좌우 문은 문 칸의 가운데에서
     * 방 쪽으로 조금 들어와 선다(묶음의 조립 화면의 자리를 도트로 옮긴 값). */
    const DOOR = Object.freeze({ north: [0, 12], south: [0, 19], west: [8, 0], east: [-8, 0] });
    /** 걸을 수 있는 바닥의 바깥을 누르는 어둠의 세기와, 그 어둠이 차오르는 거리(도트). */
    const SHADE = Object.freeze({ alpha: 0.3, reach: 96 });
    /** 탐험 물체의 그림 이름 → 재질의 조각. 목재 상자는 항아리와 같은 그림을 뒤집어 쓴다. */
    const OBJECTS = Object.freeze({ chest: 'prop-4', chestOpen: 'prop-5', pot: 'prop-6', potBroken: 'prop-7', crate: 'prop-6', crateBroken: 'prop-7' });
    /** 보급 상자 등급의 빛깔(그 재질의 상자 그림에 얹는다). */
    const GRADE = Object.freeze({ silver: 'rgba(214,226,240,0.42)', gold: 'rgba(255,204,72,0.46)' });

    const regionOfMap = map => (map && stageView.backdrops() && stageRegionFit.of(map.region)) || null;
    const regionFamily = region => STAGE_REGIONS.families[region.family];
    const regionPieceFile = (region, name) => region.family + '/' + name + '.png';
    function regionPicture(file) {
        if (!pictures.has(file)) {
            const row = { image: new Image(), failed: false };
            row.image.decoding = 'async';
            row.image.onerror = () => { row.failed = true; };
            row.image.src = STAGE_REGIONS.path + file + '?v=' + STAGE_REGIONS.version;
            pictures.set(file, row);
        }
        return pictures.get(file);
    }
    const pictureLoaded = row => row.image.complete && row.image.naturalWidth > 0;
    function regionFiles(id, region) {
        const family = regionFamily(region);
        return [id + '.png', ...Object.keys(family.pieces).concat(Object.keys(family.locks)).map(name => regionPieceFile(region, name))];
    }
    /** 지금 쓰는 지역을 맨 앞에 두고, KEEP장을 넘긴 오래된 방 그림은 놓아 준다. */
    function touchRegion(id) {
        if (recent[0] === id) return;
        recent.splice(0, recent.length, id, ...recent.filter(other => other !== id));
        for (const old of recent.splice(KEEP)) { pictures.delete(old + '.png'); settled.delete(old); }
    }
    /** @returns {?string} 'ready' 그림이 모두 왔다, 'pending' 불러오는 중, 'failed' 그림이 없다. 지역 그림이 없는 지도면 null. */
    function regionStatus(map) {
        const region = regionOfMap(map), id = region ? map.region : null;
        if (!region) return null;
        touchRegion(id);
        if (settled.has(id)) return settled.get(id);
        const rows = regionFiles(id, region).map(regionPicture), state = rows.some(row => row.failed) ? 'failed' : rows.every(pictureLoaded) ? 'ready' : 'pending';
        if (state !== 'pending') settled.set(id, state);
        return state;
    }
    function fittedRegionPiece(file, dot) {
        // 창 크기가 바뀌어 배율이 달라지면 앞 배율로 옮겨 둔 그림은 버린다(배율마다 쌓이지 않게).
        if (fitDot !== dot) { fits.clear(); fitDot = dot; }
        if (!fits.has(file)) fits.set(file, stageDots.fitted(regionPicture(file).image, dot));
        return fits.get(file);
    }

    // ---------------------------------------------------------------- room regionPicture
    /** 방 그림: 가운데를 방의 가운데에, 바닥이 시작하는 줄을 방 바닥의 뒤쪽 끝에 맞춘다. */
    function drawRoomPicture(ctx, view, p, area) {
        const region = regionOfMap(view.map), room = view.room, dot = p.tileW / WIDE;
        const scale = stageRegionFit.scale(region, room.x1 - room.x0 + 1, room.y1 - room.y0 + 1) * dot, w = region.width * scale, h = region.height * scale;
        const x = Math.round(p.mapX + (room.x0 + room.x1 + 1) / 2 * p.tileW - w / 2), y = Math.round(p.mapY + room.y0 * p.tileH - region.ground * scale);
        ctx.fillStyle = region.earth;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.fillStyle = region.sky;
        ctx.fillRect(0, 0, area.width, Math.max(0, y + 2));
        ctx.imageSmoothingEnabled = false;
        // 이웃한 방이 똑같아 보이지 않게, 정해진 방은 좌우로 뒤집어 그린다(js/act-exploration-rooms.js roomMirrored)
        if (room.mirror) { ctx.save(); ctx.translate(x * 2 + Math.round(w), 0); ctx.scale(-1, 1); }
        ctx.drawImage(regionPicture(view.map.region + '.png').image, x, y, Math.round(w), Math.round(h));
        if (room.mirror) ctx.restore();
    }
    const shadeInk = step => `rgba(12,10,12,${(SHADE.alpha * Math.min(1, step / SHADE.reach)).toFixed(3)})`;
    /** 바닥의 양옆(뒤쪽 끝에서 앞쪽 끝까지): 옆으로 멀어질수록 어둡다. */
    function shadeRoomSides(ctx, edge) {
        for (let step = 0; step < edge.reachX; step += 4) {
            ctx.fillStyle = shadeInk(step);
            ctx.fillRect(edge.right + step, edge.top, 4, edge.front - edge.top);
            ctx.fillRect(edge.left - step - 4, edge.top, 4, edge.front - edge.top);
        }
    }
    /** 바닥의 앞쪽 바깥과 두 구석: 앞쪽 끝과 옆 끝 가운데 더 먼 쪽의 거리만큼 어둡다. 구석을 따로 두면 좁은 바닥(고정 전장) 아래에서
     * 그늘이 네모나게 끊겨 보였다. 가로 띠는 앞으로 먼 곳을, 세로 띠는 옆으로 더 먼 곳을 맡아 겹치지 않는다. */
    function shadeRoomFront(ctx, edge) {
        for (let step = 0; step < edge.far - edge.front; step += 4) {
            ctx.fillStyle = shadeInk(step);
            ctx.fillRect(edge.left - step - 4, edge.front + step, edge.right - edge.left + step * 2 + 8, 4);
        }
        for (let step = 4; step < edge.reachX; step += 4) {
            ctx.fillStyle = shadeInk(step);
            ctx.fillRect(edge.right + step, edge.front, 4, Math.min(edge.far - edge.front, step));
            ctx.fillRect(edge.left - step - 4, edge.front, 4, Math.min(edge.far - edge.front, step));
        }
    }
    /** 방마다 한 번 그려 두는 그림: 걸을 수 있는 바닥의 양옆과 앞쪽 바깥이 멀어질수록 어두워진다(방 그림의 바닥이 화면 끝까지
     * 이어지므로 어디까지 걸을 수 있는지 알린다). */
    function paintRoomShade(map, room, box) {
        const canvas = document.createElement('canvas'), left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE;
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d'), edge = { left, right, top: room.y0 * DEEP, front: (room.y1 + 1) * DEEP, far: (box.y + box.rows) * DEEP,
            reachX: Math.max(left - box.x * WIDE, (box.x + box.columns) * WIDE - right) };
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        shadeRoomSides(ctx, edge);
        shadeRoomFront(ctx, edge);
        return canvas;
    }

    // ---------------------------------------------------------------- props
    /** 그 방의 문이 그쪽 벽에 났는가, 났다면 벽을 따라 놓인 자리(도트). */
    const roomDoorOn = (map, room, side) => map.doors.find(door => door.room === room.index && door.side === side) || null;
    /** 바닥의 뒤쪽 끝에 서는 자리: 방 끝에서 inset만큼 안쪽. 뒤쪽 문과 겹치면 방 끝 쪽으로 물린다. */
    function backPropSpot(map, room, side, inset) {
        const left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE, door = roomDoorOn(map, room, 'north');
        const x = side === 'west' ? left + inset : right - inset, doorX = door ? (door.cell.gx + 0.5) * WIDE : null;
        const clear = doorX === null || Math.abs(doorX - x) > 170;
        return { x: clear ? x : (side === 'west' ? Math.min(x, doorX - 170) : Math.max(x, doorX + 170)), y: room.y0 * DEEP + 8 };
    }
    /** 바닥의 앞쪽 구석 바깥에 서는 자리. */
    const frontPropSpot = (room, side) => ({ x: side === 'west' ? room.x0 * WIDE - 40 : (room.x1 + 1) * WIDE + 40, y: (room.y1 + 1) * DEEP - 14 });
    /** 보통 방: 낮은 소품 두셋을 뒤쪽 끝의 양 구석과 앞쪽 구석에서 골라 놓는다. */
    function normalRoomProps(map, room, region, rng) {
        const names = region.normal.filter(index => index < 2).map(index => 'prop-' + index), low = names.length ? names : ['prop-0'];
        const spots = [backPropSpot(map, room, 'west', 90), backPropSpot(map, room, 'east', 90), frontPropSpot(room, 'west'), frontPropSpot(room, 'east')];
        const start = Math.floor(rng() * spots.length), count = 2 + Math.floor(rng() * 2);
        return Array.from({ length: count }, (unused, index) => ({ name: low[index % low.length], flip: rng() < 0.5, ...spots[(start + index) % spots.length] }));
    }
    /** 정예 방: 높은 표식 둘이 뒤쪽 끝의 양쪽에 서고, 낮은 소품 하나가 앞쪽 구석에 놓인다. */
    function eliteRoomProps(map, room, region, rng) {
        const low = region.elite.find(index => index < 2), side = rng() < 0.5 ? 'west' : 'east';
        const marks = [{ name: 'prop-2', ...backPropSpot(map, room, 'west', 120) }, { name: 'prop-2', flip: true, ...backPropSpot(map, room, 'east', 120) }];
        return low === undefined ? marks : [...marks, { name: 'prop-' + low, ...frontPropSpot(room, side) }];
    }
    /** 보스 방: 큰 구조물 하나가 들어온 문의 맞은편 뒤쪽 구석에 선다. */
    function bossRoomProps(map, room, region) {
        const sideHasDoor = side => !!roomDoorOn(map, room, side), side = sideHasDoor(region.bossSide) && !sideHasDoor(region.bossSide === 'east' ? 'west' : 'east')
            ? (region.bossSide === 'east' ? 'west' : 'east') : region.bossSide;
        const spot = backPropSpot(map, room, side, 170);
        return [{ name: 'prop-3', flip: side !== region.bossSide, x: spot.x, y: spot.y + 2 }];
    }
    function regionRoomLayout(map, room, region) {
        const rng = createSeededRng(`stage-props:${map.id}:${room.id}:${map.plan.boxes.length}`), family = regionFamily(region);
        const list = room.role === 'boss' ? bossRoomProps(map, room, region) : room.role === 'elite' ? eliteRoomProps(map, room, region, rng) : normalRoomProps(map, room, region, rng);
        return list.filter(piece => family.pieces[piece.name]);
    }
    function regionRoomPieces(map, room, region) {
        if (!layouts.has(map)) layouts.set(map, new Map());
        const rooms = layouts.get(map);
        if (!rooms.has(room.index)) rooms.set(room.index, regionRoomLayout(map, room, region));
        return rooms.get(room.index);
    }

    // ---------------------------------------------------------------- doors
    /** 닫힌 문의 덧그림 이름: 무너진 지역은 돌무더기(있으면), 아니면 그 재질의 닫힌 문. */
    function doorLockName(region, side) {
        const locks = regionFamily(region).locks, ruin = 'door-' + side + '-ruin-lock';
        return region.ruin && locks[ruin] ? ruin : 'door-' + side + '-lock';
    }
    /** 문 하나의 문틀과 자리(도트, 지도 좌표). 잠겼으면 닫힌 문의 덧그림 이름이 붙는다. */
    function regionDoorPiece(row, room, region) {
        const door = row.door, [dx, dy] = DOOR[door.side];
        const y = door.side === 'north' ? room.y0 * DEEP : door.side === 'south' ? (room.y1 + 1) * DEEP : (door.cell.gy + 0.5) * DEEP;
        return { name: 'door-' + door.side + '-frame', lock: row.locked ? doorLockName(region, door.side) : null, x: (door.cell.gx + 0.5) * WIDE + dx, y: y + dy };
    }
    /** 문틀의 뚫린 자리(문틀 그림의 px): 꼭짓점들과 그 둘레 상자. 꼭짓점이 없는 문틀(앞쪽 문)은 그림 상자의 가운데 띠다. */
    function frameCavity(frame) {
        const points = [];
        for (let i = 8; i + 1 < frame.length; i += 2) points.push([frame[i], frame[i + 1]]);
        if (!points.length) {
            const x = frame[4] + frame[6] * 0.18, y = frame[5] + frame[7] * 0.32, w = frame[6] * 0.64, h = frame[7] * 0.45;
            points.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
        }
        const xs = points.map(point => point[0]), ys = points.map(point => point[1]), x = Math.min(...xs), y = Math.min(...ys);
        return { points, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    /** 닫힌 문의 덧그림: 뚫린 자리를 덮는 가장 작은 크기로, 가로 가운데와 아래 끝을 맞춰, 뚫린 자리 안에만 그린다. */
    function drawDoorLock(ctx, piece, at) {
        const family = regionFamily(piece.region), frame = family.pieces[piece.name], lock = family.locks[piece.lock];
        if (!lock) return;
        const hole = frameCavity(frame), image = fittedRegionPiece(regionPieceFile(piece.region, piece.lock), at.dot), k = image.width / lock[0];
        const grow = Math.max(hole.w / lock[4], hole.h / lock[5]), w = lock[4] * grow * at.dot, h = lock[5] * grow * at.dot;
        ctx.save();
        ctx.beginPath();
        hole.points.forEach(([px, py], index) => (index ? ctx.lineTo(at.x + px * at.dot, at.y + py * at.dot) : ctx.moveTo(at.x + px * at.dot, at.y + py * at.dot)));
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, lock[2] * k, lock[3] * k, lock[4] * k, lock[5] * k,
            Math.round(at.x + (hole.x + hole.w / 2) * at.dot - w / 2), Math.round(at.y + (hole.y + hole.h) * at.dot - h), Math.round(w), Math.round(h));
        ctx.restore();
    }

    // ---------------------------------------------------------------- actors
    /** 전장 그리기의 배우 목록에 이 방의 소품과 문을 끼운다(깊이 순서는 발 자리의 화면 y). */
    function appendRegionPieces(actors, state, here) {
        const region = regionOfMap(here.map), p = state.gridProj, dot = p.tileW / WIDE, reach = 400 * dot;
        const doors = actExplorationDoors.doorsHere(here.run).map(row => regionDoorPiece(row, here.room, region));
        regionRoomPieces(here.map, here.room, region).concat(doors).forEach((piece, index) => {
            const x = p.mapX + piece.x * dot, y = p.mapY + piece.y * dot;
            if (x > -reach && x < state.width + reach) actors.push({ kind: 'scenery', id: -2000 - index, y, piece: { ...piece, region }, point: { x, y } });
        });
    }
    /** 주인공이 이 조각 바로 뒤에 서 있는가(조각이 주인공을 가린다). */
    function pieceHidesHero(actor, state, size, dot) {
        const hero = state.playerPos, left = actor.point.x - (size[2] - size[4]) * dot, top = actor.y - (size[3] - size[5]) * dot;
        return hero.y < actor.y && hero.y > top && hero.x > left - 4 && hero.x < left + size[6] * dot + 4;
    }
    /** 조각 하나: 발 자리를 actor.point에 맞춘다. 뒤집은 조각은 발 자리를 축으로 좌우를 바꾼다. */
    function drawRegionPiece(ctx, actor, state) {
        const piece = actor.piece, size = regionFamily(piece.region).pieces[piece.name], dot = stageActors.scaleFor(state.gridProj.tileW);
        const at = { x: Math.round(actor.point.x - size[2] * dot), y: Math.round(actor.y - size[3] * dot), dot };
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (pieceHidesHero(actor, state, size, dot)) ctx.globalAlpha *= 0.5;
        if (piece.flip) { ctx.translate(Math.round(actor.point.x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(fittedRegionPiece(regionPieceFile(piece.region, piece.name), dot), at.x, at.y, size[0] * dot, size[1] * dot);
        if (piece.lock) drawDoorLock(ctx, piece, at);
        ctx.restore();
    }
    /** 열린 좌우 문의 화살표: 문틀의 뚫린 자리에 세운다. 전장의 조명을 입힌 뒤에 그린다(js/canvas-battlefield.js가 부른다). */
    function drawRegionSideMarks(ctx, p, here) {
        const region = regionOfMap(here.map), dot = stageActors.scaleFor(p.tileW);
        for (const row of actExplorationDoors.doorsHere(here.run)) {
            if (row.locked || (row.door.side !== 'west' && row.door.side !== 'east')) continue;
            const piece = regionDoorPiece(row, here.room, region), frame = regionFamily(region).pieces[piece.name], hole = frameCavity(frame);
            stageDoorMarks.arrows(ctx, { cx: p.mapX + (piece.x - frame[2] + hole.x + hole.w / 2) * dot, cy: p.mapY + (piece.y - frame[3] + hole.y + hole.h / 2) * dot,
                w: WIDE * dot }, row.door, { dot, thick: 4, upright: true });
        }
    }

    // ---------------------------------------------------------------- exploration objects
    /** 그림 한 장에 한 색을 얹은 것(alpha가 1이면 실루엣). 한 번 만들어 둔다. */
    function tintedRegionPiece(file, colour, solid) {
        const key = file + '|' + colour;
        if (tints.has(key)) return tints.get(key);
        const image = regionPicture(file).image, canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const c = canvas.getContext('2d');
        c.drawImage(image, 0, 0);
        c.globalCompositeOperation = solid ? 'source-in' : 'source-atop';
        c.fillStyle = colour;
        c.fillRect(0, 0, canvas.width, canvas.height);
        tints.set(key, canvas);
        return canvas;
    }
    /** 그 물체를 이 지역의 재질 그림으로 그릴 수 있으면 그 조각. 보급 상자의 은, 금 등급은 같은 상자에 빛깔을 얹는다. */
    function regionObjectPiece(look) {
        const run = actExplorationState.current(game), map = actExplorationDoors.stageMap(run), name = OBJECTS[look.name];
        if (!name || !map || regionStatus(map) !== 'ready') return null;
        const region = regionOfMap(map), size = regionFamily(region).pieces[name];
        return size ? { file: regionPieceFile(region, name), size, flip: look.name.startsWith('crate'), grade: GRADE[look.tint] || null } : null;
    }
    function stampRegionObject(ctx, source, piece, at) {
        const size = piece.size, x = Math.round(at.x - size[2] * at.dot), y = Math.round(at.y - size[3] * at.dot);
        ctx.save();
        if (piece.flip) { ctx.translate(Math.round(at.x) * 2, 0); ctx.scale(-1, 1); }
        stageDots.blit(ctx, source, { x: 0, y: 0, w: size[0], h: size[1] }, { x, y, scale: at.dot });
        ctx.restore();
    }
    /** @param {{name:string,tint?:string}} look @param {{x:number,y:number,dot:number}} at 발 자리와 도트 하나의 크기 @returns {boolean} 그렸는지 */
    function drawRegionObject(ctx, look, at) {
        const piece = regionObjectPiece(look);
        if (!piece) return false;
        stampRegionObject(ctx, piece.grade ? tintedRegionPiece(piece.file, piece.grade, false) : regionPicture(piece.file).image, piece, at);
        return true;
    }
    /** 누를 수 있는 물체의 밝은 테. @returns {boolean} 이 지역의 그림으로 둘렀는지 */
    function outlineRegionObject(ctx, look, at, colour) {
        const piece = regionObjectPiece(look);
        if (!piece) return false;
        const rim = tintedRegionPiece(piece.file, colour, true);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stampRegionObject(ctx, rim, piece, { x: at.x + dx * at.dot, y: at.y + dy * at.dot, dot: at.dot });
        return true;
    }
    /** 곧 쓸 지역의 방 그림을 미리 불러 둔다(그림이 없는 지역이면 아무 일도 없다). */
    function warmRegion(id) {
        if (stageView.backdrops() && stageRegionFit.of(id)) regionPicture(id + '.png');
    }
    return Object.freeze({ warm: warmRegion, status: regionStatus, drawFar: drawRoomPicture, paintRoom: paintRoomShade, append: appendRegionPieces, draw: drawRegionPiece,
        drawMarks: drawRegionSideMarks, drawObject: drawRegionObject, outlineObject: outlineRegionObject });
})();
safeExposeGlobals({ stageRegion });
