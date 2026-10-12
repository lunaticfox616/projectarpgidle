/** 무대 조각 묶음으로 방을 조립한다 (2026-10-11 사용자가 이미지 생성으로 만들어 온 "뿌리 성소 무대 조각": 먼 배경, 뒤쪽 띠, 바닥 세 가지,
 * 작은 소품 열, 앞쪽 소품 넷, 네 방향 문의 닫힌 모습과 열린 모습). 던파의 무대처럼 층과 조각을 겹친다. 규격과 놓는 규칙은
 * data/stage-view.js STAGE_SCENES에 있고, 그 묶음을 만든 쪽의 조립 화면(묶음의 index.html)을 따른다.
 * - 먼 배경: 좌우로 이어 붙는 띠. 카메라보다 느리게 움직인다.
 * - 바닥과 뒤쪽 띠: 지도 왼쪽 끝에서 센 자리에 이어 붙는 띠(방마다 한 번 그려 둔다). 뒤쪽 띠가 바닥과 배경이 만나는 줄을 덮는다.
 * - 소품과 문: 캐릭터와 같은 깊이 순서로 그리는 배우. 뒤쪽 줄은 캐릭터 뒤에, 앞쪽 조각은 캐릭터 앞에 선다. 문은 잠겼으면 닫힌 그림,
 *   열렸으면 열린 그림이다. 주인공이 조각 뒤에 서면 그 조각이 비쳐 보인다.
 * 그림은 한 장이 캐릭터 도트 하나에 1px이라 캐릭터와 같은 배율로 찍는다(js/canvas-stage-dots.js). 그림 폴더가 없는 판에서는 ready가
 * 거짓이라 코드로 그린 임시 무대(js/canvas-stage-sanctum.js)가 그대로 나온다. 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 * 지도에 지역 무대 그림(js/canvas-stage-region.js: 방 그림 한 장과 문, 소품)이 정해져 있고 그 그림이 준비됐으면 그쪽이 방을 그린다:
 * 방을 그리는 쪽(js/canvas-stage-rooms.js)은 여기 하나만 부르고, 여기서 어느 묶음이 그릴지 가른다.
 */
const stageScene = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    const images = new Map();                   // 파일 경로 → Image
    const fits = new Map();                     // 파일 → 지금 배율(fitDot)로 옮겨 둔 그림(먼 배경과 조각: 매 프레임 다시 옮기지 않는다)
    let fitDot = 0;
    const complete = new Set();                 // 그림을 모두 불러온 묶음
    const layouts = new WeakMap();              // 지도 → Map(방 번호 → 조각 자리)

    /** 지도의 지형에 조각 묶음이 있는가(테스트 패널에서 벽돌 벽을 고르면 쓰지 않는다). */
    function kitOf(map) {
        return (map && stageView.backdrops() && STAGE_SCENES.biomes[map.biome]) || null;
    }
    function picture(kit, file) {
        const path = STAGE_SCENES.path + kit.dir + file;
        if (!images.has(path)) {
            const image = new Image();
            image.decoding = 'async';
            image.src = path;
            images.set(path, image);
        }
        const image = images.get(path);
        return image.complete && image.naturalWidth > 0 ? image : null;
    }
    const filesOf = kit => [kit.far.file, kit.back.file, ...kit.floor.files, ...Object.keys(kit.pieces).map(name => name + '.png')];
    /** 지역 무대 그림의 형편: 'ready', 'pending'(불러오는 중), 'failed'(그림이 없다), 지역이 없는 지도면 null. */
    const regionState = map => (typeof stageRegion === 'object' ? stageRegion.status(map) : null);
    /** 이 지형의 조각 묶음 그림이 모두 불러와졌는가. 처음 물을 때 불러오기를 시작한다. */
    function sceneReady(map) {
        const kit = kitOf(map);
        if (!kit) return false;
        if (complete.has(kit)) return true;
        const loaded = filesOf(kit).map(file => picture(kit, file)).every(Boolean);
        if (loaded) complete.add(kit);
        return loaded;
    }
    /** @returns {(string|boolean)} 이 지도의 방을 그릴 묶음: 'region' 지역 무대 그림, 'scene' 지형의 조각 묶음, 없으면 false.
     * 지역 그림을 불러오는 동안은 false다(그동안 다른 지형의 그림이 잠깐 보이지 않게 pending이 화면을 가린다). */
    function ready(map) {
        const region = regionState(map);
        if (region === 'ready') return 'region';
        return region !== 'pending' && sceneReady(map) ? 'scene' : false;
    }
    const pending = map => regionState(map) === 'pending';

    // ---------------------------------------------------------------- far backdrop
    function fitted(kit, file, dot) {
        // 창 크기가 바뀌어 배율이 달라지면 앞 배율로 옮겨 둔 그림은 버린다(배율마다 쌓이지 않게).
        if (fitDot !== dot) { fits.clear(); fitDot = dot; }
        const key = kit.dir + file;
        if (!fits.has(key)) fits.set(key, stageDots.fitted(picture(kit, file), dot));
        return fits.get(key);
    }
    /** 먼 배경: 방 중심에 맞춰 양 끝 여백을 나눠 쓴다. 카메라 이동의 parallax배만 움직이고 필요할 때만 좌우로 잇는다. */
    function drawFar(ctx, view, p, area) {
        if (regionState(view.map) === 'ready') { stageRegion.drawFar(ctx, view, p, area); return; }
        const kit = kitOf(view.map), far = kit.far, dot = p.tileW / WIDE, w = far.width * dot, h = far.height * dot;
        const y = Math.round(p.mapY + view.room.y0 * p.tileH + far.bottom * dot - h);
        const centre = p.mapX + (view.room.x0 + view.room.x1 + 1) * p.tileW / 2;
        const origin = (area.width - w) / 2 + (centre - area.width / 2) * far.parallax + far.shift * dot;
        const offset = ((origin % w) + w) % w, image = fitted(kit, far.file, dot);
        ctx.fillStyle = kit.fill;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.fillStyle = kit.sky;
        ctx.fillRect(0, 0, area.width, Math.max(0, y + 2));
        ctx.imageSmoothingEnabled = false;
        for (let x = offset - w; x < area.width; x += w) ctx.drawImage(image, Math.round(x), y, w, h);
    }

    // ---------------------------------------------------------------- floor and back strip (painted once a room)
    /** 띠 그림을 도트 그대로 이어 붙인다. 위/아래 이음은 원본의 2도트 줄을 투명하게 겹쳐 직선을 누른다(방 진입 시 한 번). */
    function strip(ctx, box, image, at) {
        const left = box.x * WIDE, right = (box.x + box.columns) * WIDE;
        const top = at.fadeTop || 0, bottom = at.fadeBottom || 0, height = image.naturalHeight;
        ctx.save();
        for (let x = Math.floor((left - at.shift) / at.width) * at.width + at.shift; x < right; x += at.width) {
            ctx.globalAlpha = 1;
            ctx.drawImage(image, 0, top, at.width, height - top - bottom, x, at.y + top, at.width, height - top - bottom);
            for (let y = 0; y < top; y += 2) {
                ctx.globalAlpha = (y + 1) / top;
                ctx.drawImage(image, 0, y, at.width, 2, x, at.y + y, at.width, 2);
            }
            for (let y = 0; y < bottom; y += 2) {
                ctx.globalAlpha = 1 - (y + 1) / bottom;
                ctx.drawImage(image, 0, height - bottom + y, at.width, 2, x, at.y + height - bottom + y, at.width, 2);
            }
        }
        ctx.restore();
    }
    /** 방 하나의 바닥과 뒤쪽 띠. 바닥 그림은 방마다 정해진 한 가지다. 방의 옆쪽 바깥은 조금 어둡게 눌러 걸을 수 있는 자리를 알린다. */
    function paintRoom(map, room, box) {
        if (regionState(map) === 'ready') return stageRegion.paintRoom(map, room, box);
        const kit = kitOf(map), canvas = document.createElement('canvas'), top = room.y0 * DEEP;
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d'), floor = kit.floor.files[(room.index + (Number(map.act) || 0)) % kit.floor.files.length];
        ctx.imageSmoothingEnabled = false;
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        // 한 장 안에 방 전체가 들어오도록 방 중심에 맞춘다. 기본 15~21칸에서는 바닥의 좌우 이음이 전투 칸 밖에 놓인다.
        const floorShift = Math.round((room.x0 + room.x1 + 1) * WIDE / 2 - kit.floor.width / 2);
        strip(ctx, box, picture(kit, floor), { width: kit.floor.width, shift: floorShift, y: top + kit.floor.top, fadeTop: 28 });
        strip(ctx, box, picture(kit, kit.back.file), { width: kit.back.width, shift: kit.back.shift, y: top + kit.back.bottom - kit.back.height, fadeBottom: 14 });
        shadeBeyond(ctx, kit, room, box);
        return canvas;
    }

    /** 방의 옆쪽 바깥은 멀어질수록 어두워진다(한 칸에 걸쳐 차오른다): 걸을 수 있는 자리가 어디까지인지 알린다. */
    function shadeBeyond(ctx, kit, room, box) {
        const top = room.y0 * DEEP + kit.floor.top, left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE;
        for (let step = 0; step < (box.x + box.columns) * WIDE - right; step += 4) {
            ctx.fillStyle = `rgba(20,14,8,${(kit.beyond * Math.min(1, step / WIDE)).toFixed(3)})`;
            ctx.fillRect(right + step, top, 4, kit.floor.height);
            ctx.fillRect(left - step - 4, top, 4, kit.floor.height);
        }
    }

    // ---------------------------------------------------------------- pieces and doors (actors)
    /** 그 방의 문이 벽을 따라 놓인 자리(도트): 그 둘레에는 소품을 놓지 않는다. */
    function doorSpots(map, room, side) {
        return map.doors.filter(door => door.room === room.index && door.side === side).map(door => (door.cell.gx + 0.5) * WIDE);
    }
    const clear = (spots, x, reach) => spots.every(spot => Math.abs(spot - x) > reach);
    /** 한 줄로 놓이는 소품: 이름을 차례로 돌리고 간격과 깊이도 차례로 바꾼다(묶음의 조립 화면과 같은 규칙). */
    function rowOf(list, rule, span, spots) {
        for (let i = 0, x = span.left + rule.from; x < span.right - rule.until; i++, x += rule.gaps[i % rule.gaps.length]) {
            if (clear(spots, x, rule.clear)) list.push({ name: rule.names[i % rule.names.length], x: Math.round(x), y: span.top + rule.drops[i % rule.drops.length] });
        }
    }
    /** 방 하나에 놓이는 조각의 자리(도트, 지도 좌표). y는 그림의 맨 아래 줄이 놓이는 줄이다. 문은 따로 센다(doorsOf). */
    function layoutOf(map, room, kit) {
        const span = { left: room.x0 * WIDE, right: (room.x1 + 1) * WIDE, top: room.y0 * DEEP }, list = [], rows = kit.rows;
        rowOf(list, rows.back, span, doorSpots(map, room, 'north'));
        rowOf(list, rows.inner, span, doorSpots(map, room, 'south'));
        rowOf(list, rows.front, span, doorSpots(map, room, 'south'));
        list.push({ name: rows.corners.left[0], x: span.left + rows.corners.left[1], y: span.top + rows.corners.left[2] });
        list.push({ name: rows.corners.right[0], x: span.right + rows.corners.right[1], y: span.top + rows.corners.right[2] });
        return list;
    }
    function piecesOf(map, room, kit) {
        if (!layouts.has(map)) layouts.set(map, new Map());
        const rooms = layouts.get(map);
        if (!rooms.has(room.index)) rooms.set(room.index, layoutOf(map, room, kit));
        return rooms.get(room.index);
    }
    /** 문 하나의 그림과 자리: 뒤쪽과 앞쪽 문은 문 칸의 가로 가운데에, 좌우 문은 방의 그쪽 끝에 그 줄의 아래에 맞춰 선다. */
    function doorPiece(room, row, kit) {
        const door = row.door, rule = kit.doors[door.side], name = rule[row.locked ? 0 : 1], top = room.y0 * DEEP;
        if (door.side === 'north' || door.side === 'south') return { name, x: (door.cell.gx + 0.5) * WIDE, y: top + rule[2] };
        return { name, x: (door.side === 'west' ? room.x0 * WIDE : (room.x1 + 1) * WIDE) + rule[2], y: (door.cell.gy + 1) * DEEP };
    }
    /** 전장 그리기의 배우 목록에 이 방의 소품과 문을 끼운다(깊이 순서는 그림 맨 아래 줄의 화면 y). */
    /** 주인공이 선 방과 그 방을 그릴 묶음(mode: 'region', 'scene', false). 방 단위 무대가 아니면 mode가 false다. */
    function standingRoom() {
        const run = actExplorationState.current(game), map = actExplorationDoors.stageMap(run), room = map ? actExplorationDoors.room(run) : null;
        return { run, map, room, mode: room ? ready(map) : false };
    }
    function append(actors, state) {
        const here = standingRoom(), { run, map, room } = here;
        if (here.mode === 'region') stageRegion.append(actors, state, here);
        if (here.mode !== 'scene') return;
        const kit = kitOf(map), p = state.gridProj, dot = p.tileW / WIDE, reach = 400 * dot;
        const doors = actExplorationDoors.doorsHere(run).map(row => doorPiece(room, row, kit));
        piecesOf(map, room, kit).concat(doors).forEach((piece, index) => {
            const x = p.mapX + piece.x * dot, y = p.mapY + piece.y * dot;
            if (x > -reach && x < state.width + reach) actors.push({ kind: 'scenery', id: -2000 - index, y, piece: { name: piece.name, kit }, point: { x, y } });
        });
    }
    /** 주인공이 이 조각 바로 뒤에 서 있는가(조각이 주인공을 가린다). box = 그림에서 조각이 차지하는 상자. */
    function hidesHero(actor, state, size, dot) {
        const hero = state.playerPos, left = actor.point.x - (size[0] / 2 - size[2]) * dot, top = actor.y - size[5] * dot;
        return hero.y < actor.y && hero.y > top && hero.x > left - 4 && hero.x < left + size[4] * dot + 4;
    }
    /** 조각 하나: 가로 가운데를 point.x에, 그림의 맨 아래 줄을 actor.y에 맞춘다. */
    function draw(ctx, actor, state) {
        if (actor.piece.region) { stageRegion.draw(ctx, actor, state); return; }
        const { name, kit } = actor.piece, size = kit.pieces[name];
        if (!size || !picture(kit, name + '.png')) return;
        const dot = stageActors.scaleFor(state.gridProj.tileW);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (hidesHero(actor, state, size, dot)) ctx.globalAlpha *= 0.5;
        ctx.drawImage(fitted(kit, name + '.png', dot), Math.round(actor.point.x - size[0] / 2 * dot), Math.round(actor.y - (size[3] + size[5]) * dot), size[0] * dot, size[1] * dot);
        ctx.restore();
    }
    /** 열린 좌우 문의 화살표: 문틀의 뚫린 자리에 세운다(문틀 그림이 문 칸을 덮어 바닥의 화살표가 보이지 않는다). 좌우 문은 화면
     * 가장자리에 서서 전장의 조명(주인공에서 멀수록 어둡다)에 묻히므로, 조명을 입힌 뒤에 그린다(js/canvas-battlefield.js가 부른다). */
    function drawMarks(ctx, p) {
        const here = standingRoom();
        if (here.mode === 'region') stageRegion.drawMarks(ctx, p, here);
        const kit = here.mode === 'scene' ? kitOf(here.map) : null;
        if (kit && kit.sideMark) sceneSideMarks(ctx, p, here, kit);
    }
    function sceneSideMarks(ctx, p, here, kit) {
        const dot = stageActors.scaleFor(p.tileW), rule = kit.sideMark;
        for (const row of actExplorationDoors.doorsHere(here.run)) {
            if (row.locked || (row.door.side !== 'west' && row.door.side !== 'east')) continue;
            const piece = doorPiece(here.room, row, kit);
            stageDoorMarks.arrows(ctx, { cx: p.mapX + piece.x * dot, cy: p.mapY + (piece.y - rule.rise) * dot, w: rule.spread * dot }, row.door, { dot, thick: rule.thick, upright: true });
        }
    }
    return Object.freeze({ ready, pending, drawFar, paintRoom, append, draw, drawMarks });
})();
safeExposeGlobals({ stageScene });
