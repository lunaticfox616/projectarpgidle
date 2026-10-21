/** 심해 무대의 물속 신호(data/stage-view.js STAGE_OCEAN, 2026-10-20 GPT 심해 그림 2차). 방 그림은 수심 띠마다 다르고, 지도를 지을 때
 * 고른다(js/act-exploration-room-plans.js oceanRegion: 얕은 암초, 황혼층, 무광층, 가디언의 투기장은 해구). 여기서는 그 위에 얹는 것을 그린다.
 * - 빛줄기: 얕은 암초와 황혼층의 방 그림 위에, 방 그림과 같은 자리, 같은 뒤집기로 겹친다. 7초마다 조금 옅어졌다 돌아온다.
 * - 떠다니는 입자 두 층: 먼 층은 배우 뒤에, 가까운 층은 배우 앞에 이어 붙여 천천히 흘린다.
 * - 리프트: 방 뒤쪽 벽의 문 자리에 선다. 심해 가디언의 투기장에서는 보스 방에 닫힌 채로 서서 가디언이 쓰러지면 열리고, 리프트에서 시작한
 *   지도(잠수를 리프트에서 시작했거나 방금 가디언을 넘었다: 지도가 시작할 때의 수심이 100m마다인 리프트 자리다)에서는 입구 방에 열린 채로
 *   선다. 사슬은 화면 위 끝까지 이어 그린다(그림의 맨 위 18줄이 사슬 한 마디다).
 * - 영웅 머리 위 거품(몇 초에 한 번), 걷는 발밑의 먼지(띠마다 모래나 진흙, 떠서 다니는 몬스터는 없다), 공기 방울을 남기고 쓰러진 몬스터
 *   자리의 공기 기둥(js/combat.js noteOceanKill의 oceanAir).
 * - 어두운 띠의 소품과 문 봉인에 얹는 어둠(shade), 밝은 바닥에서 문 표시의 빛무리를 어둡게 까는지(bright): 그리는 쪽이 묻는다.
 * 그림은 미끄러뜨리거나 흐리게만 하고 모양을 비틀지 않는다. 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 */
const stageOcean = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    const CHAIN_LINK = 18;                      // 리프트 그림 맨 위에서 사슬 한 마디의 줄 수
    const PUFFS = 24;                           // 한꺼번에 남는 발밑 먼지의 수
    const pictures = new Map();                 // 그림 이름 → { image, failed }
    const fits = new Map();                     // 그림 이름 → { dot, job } 화면 배율로 옮겨 두는 그림(큰 그림은 프레임마다 조금씩)
    const steps = new Map();                    // 걷는 배우 → 마지막 칸(걸음을 알아챈다). 지도가 바뀌면 비운다
    let stepsMap = null;
    const puffs = [];                           // 발밑 먼지 { at, x, y, file }
    const liftStarts = new WeakMap();           // 지도(탐험) → 리프트 자리에서 시작했는가(처음 본 프레임의 수심으로 정한다)

    function picture(name) {
        if (!pictures.has(name)) {
            const row = { image: new Image(), failed: false };
            row.image.decoding = 'async';
            row.image.onerror = () => { row.failed = true; };
            row.image.src = STAGE_OCEAN.path + name + '.png?v=20261020-1';
            pictures.set(name, row);
        }
        return pictures.get(name);
    }
    const loaded = name => { const row = picture(name); return !row.failed && row.image.complete && row.image.naturalWidth > 0; };
    /** 그 그림을 도트 배율로 옮겨 둔 그림, 아직이면 null. 옮기기는 프레임마다 조각 몇 개씩(떠다니는 입자 한 장이 1280x720이다). */
    function fitted(name, dot) {
        if (!loaded(name)) return null;
        let row = fits.get(name);
        if (!row || row.dot !== dot) { row = { dot, job: stageDots.fitter(picture(name).image, dot), done: false }; fits.set(name, row); }
        for (let n = 0; n < 6 && !row.done; n++) row.done = row.job.step();
        return row.done ? row.job.canvas : null;
    }
    const mod = (value, size) => ((value % size) + size) % size;

    // ---------------------------------------------------------------- where
    /** 지금 무대가 심해 띠의 방 지도면 { run, map, band }, 아니면 null. */
    function here() {
        if (typeof STAGE_OCEAN !== 'object' || !stageView.enabled()) return null;
        const run = actExplorationState.current(game), map = run ? actExplorationDoors.stageMap(run) : null, band = map ? STAGE_OCEAN.bands[map.region] : null;
        return band ? { run, map, band } : null;
    }
    /** 지금 띠가 소품과 문 봉인에 얹는 어둠(rgba), 없으면 null. */
    function shade() {
        const at = here();
        return at ? at.band.shade : null;
    }
    /** 지금 띠의 바닥이 밝은가(문 표시의 빛무리를 어둡게 깐다). */
    function brightFloor() {
        const at = here();
        return !!(at && at.band.bright);
    }

    // ---------------------------------------------------------------- behind the actors
    /** 방 그림 위의 빛줄기. js/canvas-stage-region.js drawRoomPicture가 방 그림을 그린 바로 뒤에, 같은 뒤집기 안에서 부른다. */
    function light(ctx, region, rect) {
        const band = typeof STAGE_OCEAN === 'object' ? STAGE_OCEAN.bands[region] : null;
        if (!band || !band.light || !loaded(band.light)) { if (band && band.light) picture(band.light); return; }
        ctx.save();
        ctx.globalAlpha *= 0.86 + 0.14 * Math.sin(performance.now() / 7000 * Math.PI * 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(picture(band.light).image, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
    }
    /** 떠다니는 입자 한 층: 그림을 이어 붙여 화면을 덮고 flow만큼 흘린다(도트 단위로 끊어 옮겨 점이 떨리지 않는다). */
    function drift(ctx, layer, area, dot) {
        const tile = fitted(layer.file, dot);
        if (!tile) return;
        const w = layer.size[0] * dot, h = layer.size[1] * dot, t = performance.now() / 1000;
        const ox = mod(Math.round(t * layer.flow[0]) * dot, w), oy = mod(Math.round(t * layer.flow[1]) * dot, h);
        ctx.save();
        ctx.globalAlpha *= layer.alpha;
        ctx.imageSmoothingEnabled = false;
        for (let y = Math.round(oy - h); y < area.height; y += h) for (let x = Math.round(ox - w); x < area.width; x += w) ctx.drawImage(tile, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        ctx.restore();
    }
    /** 이 방의 리프트: 투기장의 보스 방(가디언이 서 있는 동안 닫힘), 리프트에서 시작한 지도의 입구 방(열림). 없으면 null. */
    function liftState(run, room) {
        if (game.currentZoneId !== OCEAN_ZONE_ID) return null;
        if (run.source && run.source.arena) return room.role === 'boss' ? { open: !game.oceanBossRunPending } : null;
        return room.role === 'entry' && startedAtLift(run) ? { open: true } : null;
    }
    /** 이 지도가 리프트 자리(100m마다)에서 시작했는가: 처음 본 프레임의 수심으로 한 번 정한다. */
    function startedAtLift(run) {
        if (!liftStarts.has(run)) {
            const depth = Math.floor(Math.max(0, Number(game.ocean && game.ocean.depthM) || 0));
            liftStarts.set(run, depth > 0 && depth % 100 === 0);
        }
        return liftStarts.get(run);
    }
    /** 리프트가 서는 발 자리(지도 도트)와 열렸는지. 뒤쪽 벽에 문이 난 방이면 서지 않는다. */
    function liftSpot(at, room) {
        const run = at.run, map = at.map, state = liftState(run, room);
        if (!state || map.doors.some(door => door.room === room.index && door.side === 'north')) return null;
        const columns = room.x1 - room.x0 + 1, frame = map.frame || { columns, rows: room.y1 - room.y0 + 1 };
        const gx = room.x0 + stageRegionFit.northColumn(map.region, columns, room.mirror, frame);
        return { x: (gx + 0.5) * WIDE, y: room.y0 * DEEP + STAGE_OCEAN.lift.below, open: state.open };
    }
    function drawLift(ctx, spot, p) {
        const rule = STAGE_OCEAN.lift, name = spot.open ? rule.open : rule.closed, dot = stageActors.scaleFor(p.tileW), sheet = fitted(name, dot);
        if (!sheet) return;
        const x = Math.round(p.mapX + spot.x * p.tileW / WIDE - rule.feet[0] * dot), y = Math.round(p.mapY + spot.y * p.tileH / DEEP - rule.feet[1] * dot);
        const w = Math.round(rule.size[0] * dot), h = Math.round(rule.size[1] * dot), link = Math.round(CHAIN_LINK * dot);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, x, y, w, h);
        // 사슬을 화면 위 끝까지: 맨 위 한 마디를 위로 되풀이한다
        for (let top = y - link; top > -link; top -= link) ctx.drawImage(sheet, 0, 0, sheet.width, CHAIN_LINK * sheet.height / rule.size[1], x, top, w, link);
        ctx.restore();
    }
    /** 방을 다 그린 뒤(js/canvas-stage-rooms.js background): 먼 입자와 가디언 방의 리프트. 다음 띠의 방 그림도 미리 불러 둔다. */
    function back(ctx, view, p, area) {
        const at = here();
        if (!at) return;
        const dot = stageActors.scaleFor(p.tileW), spot = liftSpot(at, view.room);
        STAGE_OCEAN.drift.filter(layer => !layer.front).forEach(layer => drift(ctx, layer, area, dot));
        if (spot) drawLift(ctx, spot, p);
        warmNextBand(at.map);
    }
    /** 다음 띠의 문턱까지 60m 안이면 그 띠의 방 그림을 미리 불러 둔다(띠가 바뀌는 지도에서 그림을 기다리는 어둠이 짧아진다). */
    function warmNextBand(map) {
        const rule = STAGE_ROOM_PLANS.regions.ocean, depth = Math.max(0, Number(game.ocean && game.ocean.depthM) || 0);
        const next = rule.bands.find(([below]) => depth < below && below - depth < 60);
        if (next) stageRegion.warm(rule.bands[rule.bands.indexOf(next) + 1] ? rule.bands[rule.bands.indexOf(next) + 1][1] : rule.deep);
        else if (map.region !== rule.arena && depth % 500 > 440) stageRegion.warm(rule.arena);
    }

    // ---------------------------------------------------------------- the ground layer
    /** 발로 걷는 살아 있는 몬스터인가(떠서 다니는 걸음새는 먼지를 일으키지 않는다). */
    function walks(enemy) {
        if (!enemy || !(enemy.hp > 0)) return false;
        const actor = typeof getBossStageActor === 'function' ? getBossStageActor(enemy) : null;
        return !(actor && ['fly', 'float', 'swim'].includes(actor.gait));
    }
    /** 칸을 옮긴 배우의 발밑에 먼지를 남긴다(영웅과 걷는 몬스터). */
    function noteSteps(view, at) {
        if (stepsMap !== at.map || steps.size > 200) { steps.clear(); stepsMap = at.map; }
        const walkers = [[game, game.gridPlayer, view.playerPos]];
        for (const entry of Object.values(view.enemyPosMap || {})) if (walks(entry.enemy)) walkers.push([entry.enemy, entry.enemy, entry]);
        for (const [who, cell, point] of walkers) noteStep(who, cell, point, view.now, at.band.dust);
        if (puffs.length > PUFFS) puffs.splice(0, puffs.length - PUFFS);
    }
    function noteStep(who, cell, point, now, file) {
        if (!cell || !point) return;
        const key = cell.gx + ',' + cell.gy, last = steps.get(who);
        steps.set(who, key);
        if (last !== undefined && last !== key) puffs.push({ at: now, x: point.x, y: point.y, file });
    }
    function drawPuffs(ctx, view, dot) {
        const rule = STAGE_OCEAN.dust, life = rule.frames * rule.frameMs;
        for (let i = puffs.length - 1; i >= 0; i--) {
            const puff = puffs[i], frame = Math.floor((view.now - puff.at) / rule.frameMs), sheet = fitted(puff.file, dot);
            if (view.now - puff.at >= life) { puffs.splice(i, 1); continue; }
            if (!sheet || frame < 0) continue;
            const feet = rule.feet[puff.file], w = rule.cell[0] * dot, h = rule.cell[1] * dot;
            ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(puff.x - feet[0] * dot), Math.round(puff.y - feet[1] * dot), Math.round(w), Math.round(h));
        }
    }
    /** 공기 방울을 남기고 쓰러진 몬스터 자리의 공기 기둥: 여덟 장을 돌리고 끝 4분의 1에서 옅어진다. */
    function drawAir(ctx, view, dot) {
        const rule = STAGE_OCEAN.air, sheet = fitted(rule.file, dot), ghosts = battleVisualState.enemyGhostPos || {};
        if (!sheet) return;
        for (const fx of battleFx) {
            if (fx.type !== 'oceanAir' || view.now < fx.start || view.now - fx.start >= fx.duration) continue;
            const point = airPoint(fx, view, ghosts);
            if (!point) continue;
            const age = view.now - fx.start, frame = Math.floor(age / rule.frameMs) % rule.frames, w = rule.cell[0] * dot, h = rule.cell[1] * dot;
            ctx.save();
            ctx.globalAlpha *= Math.min(1, (fx.duration - age) / (fx.duration * 0.25));
            ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(point.x - rule.feet[0] * dot), Math.round(point.y - rule.feet[1] * dot), Math.round(w), Math.round(h));
            ctx.restore();
        }
    }
    /** 공기 기둥이 서는 자리: 쓰러진 몬스터가 그려지는 자리(남은 모습), 없으면 그 칸. */
    function airPoint(fx, view, ghosts) {
        const known = view.enemyPosMap && view.enemyPosMap[fx.enemyId];
        if (known || ghosts[fx.enemyId]) return known || ghosts[fx.enemyId];
        return fx.cell ? view.gridProj.cellToScreen(fx.cell.gx, fx.cell.gy) : null;
    }
    /** 바닥 효과 층(js/canvas-battlefield.js drawBattleGroundLayer): 발밑 먼지와 공기 기둥. view: { now, gridProj, playerPos, enemyPosMap } */
    function ground(ctx, view) {
        const at = here();
        if (!at) { if (puffs.length || steps.size) { puffs.length = 0; steps.clear(); } return; }
        const dot = stageActors.scaleFor(view.gridProj.tileW);
        noteSteps(view, at);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawPuffs(ctx, view, dot);
        drawAir(ctx, view, dot);
        ctx.restore();
    }

    // ---------------------------------------------------------------- in front of the actors
    /** 영웅 머리 위 거품: everyMs마다 여덟 장을 한 번 돌린다. */
    function drawBubbles(ctx, view, dot) {
        const rule = STAGE_OCEAN.bubbles, age = view.now % rule.everyMs, frame = Math.floor(age / rule.frameMs), sheet = fitted(rule.file, dot);
        if (!sheet || frame >= rule.frames || !(game.playerHp > 0) || !view.playerPos) return;
        const w = rule.cell[0] * dot, h = rule.cell[1] * dot;
        ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(view.playerPos.x - w / 2), Math.round(view.playerPos.y - rule.headDots * dot - h), Math.round(w), Math.round(h));
    }
    /** 배우 앞, 전장의 조명과 체력바 아래(js/canvas-battlefield.js drawBattleLightingAndBars): 영웅 머리 위 거품과 가까운 입자.
     * scene: 그 조명의 장면 { now, projection, light(영웅의 발), width, height } */
    function front(ctx, scene) {
        const at = here();
        if (!at) return;
        const dot = stageActors.scaleFor(scene.projection.tileW);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawBubbles(ctx, { now: scene.now, playerPos: scene.light }, dot);
        ctx.restore();
        STAGE_OCEAN.drift.filter(layer => layer.front).forEach(layer => drift(ctx, layer, scene, dot));
    }
    return Object.freeze({ light, back, ground, front, shade, brightFloor });
})();
safeExposeGlobals({ stageOcean });
