/** 방 단위 무대의 문 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식", 지도는 js/act-exploration-rooms.js).
 * 주인공이 열린 문 칸에 서면 이어진 방의 문 안쪽에서 한 칸 더 들어간 칸으로 옮겨진다. 걷기가 아니라 자리 옮김이라 이동 기록(run.motion)을
 * 남기지 않는다. 문은 방 안에서 싸우는 몬스터가 살아 있는 동안 잠기고, 보스 방으로 가는 문은 정예가 남아 있으면 칸 자체에 설 수 없다(map.gates).
 * 문은 두 칸이고(js/act-exploration-rooms.js doorway), 습격방에 처음 들어서면 그 방의 무리가 들어온 문 쪽으로 다가온다(springAmbush).
 * 시험판: 무대 시험판으로 연 창(주소에 stage=1, js/canvas-stage-actors.js)에서만 방 단위 지도를 새로 만든다.
 */
const actExplorationDoors = (() => {
    /** 이 창에서 새 탐험을 방 단위 지도로 여는가. 그림이 없는 환경(검증 스크립트)에서는 언제나 아니다. */
    function session() { return typeof stageView === 'object' && stageView.rooms(); }
    /** 새 탐험의 열쇠: 방 크기(테스트 패널에서 고른 가로, 깊이 덧칸. 고르지 않았거나 없는 값이면 바탕값), 방 놓임새(액트는 프리셋
     * 넷 가운데 하나, 그 밖의 구역은 준 랜덤. js/act-exploration-room-plans.js), 그 구역의 무대 그림.
     * @param {object} zone 구역 @param {object} where 탐험 계획({act} 또는 {source}) */
    function planKey(zone, where) {
        const rule = STAGE_ROOMS, pick = (value, steps, base) => (steps.includes(value) ? value : base), settings = game.settings;
        return actExplorationRooms.key({ wide: pick(settings.stageRoomWide, rule.wideSteps, rule.grow.wide), deep: pick(settings.stageRoomDeep, rule.deepSteps, rule.grow.deep),
            plan: actExplorationRoomPlans.choose(where, settings.stageRoomPlan), region: actExplorationRoomPlans.region(zone, where) });
    }
    /** The run's room-by-room map, or null on a continuous map. */
    function stageMap(run) {
        const map = run ? actExplorationMap.forRun(run) : null;
        return map && map.stage ? map : null;
    }
    /** 그 방(roomIndex)에서 싸움이 벌어지고 있는가: 살아 있는 몬스터나 터지는 중인 물체. 방 단위 무대에서는 그 방의 것만 센다: 다른 방에
     * 남은 것(화면에 없다)이 모든 문을 잠그고 자동 걸음을 세웠다(2026-10-17 사용자 "방치정산 하고 난 다음 ... 몹이 없는데도 맵이 닫혀있어").
     * 이어진 지도(또는 방을 모를 때)는 예전처럼 지도 전체를 센다. */
    function fightingIn(run, roomIndex) {
        const map = stageMap(run), room = map && Number.isInteger(roomIndex) ? map.rooms[roomIndex] : null;
        const here = cell => !room || actExplorationRooms.roomAt(map, cell) === room;
        const bursting = row => (row.phase === 'warning' || row.phase === 'active') && here(row);
        return game.enemies.some(enemy => enemy.hp > 0 && here(enemy)) || (run.objects?.entries || []).some(bursting) || (!!room && waveDue(run, room));
    }
    /** 그 방에 이어지는 무리(data ACT_EXPLORATION_WAVES)가 남았고 지금 무리를 모두 쓰러뜨렸는가: 그동안도 싸우는 중이라 문이 닫혀 있고,
     * js/combat.js releaseExplorationWave가 잠시 뒤 새 무리를 세운다. */
    function waveDue(run, room) {
        const wave = run.waves && run.waves[room.id];
        return !!wave && wave.left > 0 && run.packs.every(pack => pack.roomId !== room.id || !pack.aliveIds.length);
    }
    /** 방 단위 무대: 주인공이 선 방이 아닌 다른 방에서 싸움에 든 몬스터(화면에 없다)를 그 무리의 대기 줄로 돌려보낸다. 주인공이 그 방에
     * 들어서면 다시 알아챈다(actExplorationState.engage). 무리가 없는 것은 걷는다. 벽 칸에 선 것(방이 없다)은 그대로 둔다. 정산 뒤 다른
     * 방에 남은 몬스터가 전투 대상으로 잡혀 주인공이 서 버렸다(2026-10-17 사용자 "몹이 없는데도 맵이 닫혀있어"). */
    function sendStraysBack(run) {
        const map = stageMap(run), here = room(run);
        if (!here) return;
        const away = enemy => { const at = enemy.hp > 0 ? actExplorationRooms.roomAt(map, enemy) : null; return !!at && at !== here; };
        if (!game.enemies.some(away)) return;
        for (const enemy of game.enemies.filter(away)) {
            const pack = run.packs.find(row => row.key === enemy.explorationPack);
            if (pack && !pack.waiting.includes(enemy)) pack.waiting.push(enemy);
        }
        game.enemies = game.enemies.filter(enemy => !away(enemy));
    }
    /** 주인공이 선 방에서 싸움이 벌어지고 있는가(js/act-exploration-progress.js: 자동 걸음이 멈춘다). */
    function fightingHere(run) {
        const here = room(run);
        return fightingIn(run, here ? here.index : null);
    }
    /** 싸우는 몬스터나 터지는 중인 물체가 있으면 방의 문이 모두 잠긴다. 보스 방 문은 정예가 남아 있어도 잠긴다. 지도나 방에 막 들어선 뒤
     * (EXPLORATION_ARRIVAL_GRACE_MS)에도 잠긴다: 2026-10-16 사용자 "그동안에 방 이동못하게막아".
     * @returns {?string} 잠긴 까닭: 'fight', 'gate', 'arrival'(들어선 뒤의 유예), 열렸으면 null */
    function lockOf(run, door) {
        if (fightingIn(run, door.room)) return 'fight';
        if (door.gate && actExplorationState.gateSealed(run)) return 'gate';
        return actExplorationState.inArrivalGrace(run, getCombatTime()) ? 'arrival' : null;
    }
    const locked = (run, door) => lockOf(run, door) !== null;
    /** 살아 있는 소환수를 주인공이 도착한 칸 둘레로 데려온다: 방이 떨어져 있어 걸어서는 따라올 수 없다. */
    function bringSummons(cell) {
        const blocked = getGridBlockedCells();
        for (const summon of game.summons || []) {
            if (!summon || summon.isGhost || !summon.alive || !hasGridCell(summon)) continue;
            const spot = findFreeGridCell(blocked, cell);
            if (!spot) continue;
            Object.assign(summon, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepAt: 0 });
            blocked.add(gridCellKey(spot.gx, spot.gy));
        }
    }
    /** 방을 옮긴 주인공이 설 수 있는 칸인가: 걸을 수 있고, 다른 유닛, 물건, 이야기 NPC의 둘레(getGridBlockedCells)가 아니다. */
    const standable = (map, cell) => actExplorationMap.walkable(map, cell) && !getGridBlockedCells(game.gridPlayer).has(gridCellKey(cell.gx, cell.gy));
    /** 걸음이 끝난 주인공이 열린 문 칸에 서 있으면 이어진 방으로 옮긴다. @returns {boolean} 옮겼는지 */
    function cross(run) {
        const map = stageMap(run), hero = game.gridPlayer, door = map ? actExplorationRooms.doorAt(map, hero) : null;
        if (!door || locked(run, door)) return false;
        // 문 칸으로 가라는 명령은 여기서 끝난다: 남겨 두면 도착한 방에서 그 문으로 되돌아 걷는다.
        if (run.destination && run.destination.gx === hero.gx && run.destination.gy === hero.gy) run.destination = null;
        // 두 칸 문: 밟은 칸과 같은 차례의 짝 문 쪽으로 나온다(js/act-exploration-rooms.js doorway). 문 안쪽에서 한 칸 더 들어간 칸
        // (arrivals)에 서고, 그 칸이 막혔으면(물건, 기다리는 무리, 이야기 NPC의 둘레) 문 안쪽(exits)에 선다(2026-10-17 사용자 "방 이동하면
        // 정확히 출입구칸 말고 한칸 더 방 안쪽에서 나오게").
        const index = door.cells.findIndex(cell => cell.gx === hero.gx && cell.gy === hero.gy);
        const spot = standable(map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
        Object.assign(hero, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
        actExplorationState.lockOn(run, null); // 락온은 그 방에서만: 방을 옮기면 풀린다
        actExplorationState.arrive(run, getCombatTime());
        if(run.status==='active')springAmbush(run, map, spot);
        bringSummons(spot);
        return true;
    }
    /** 주인공을 보스 방 문을 막 지난 자리에 세운다: 보스만 서는 싸움을 빈 입구 방을 걷지 않고 시작할 때(심해 가디언 판, js/combat.js
     * beginOceanRunRules). 문을 지날 때(cross)처럼 문 안쪽에서 한 칸 더 들어간 칸(막혔으면 문 안쪽)에 서고, 소환수가 따라오고, 방에
     * 들어선 시각이 적힌다. 두 칸 문 가운데 보스 방 한가운데 줄에 가까운 칸으로 들어선다. @returns {boolean} 옮겼는지 */
    function startAtGate(run) {
        const map = stageMap(run), door = map ? map.doors.find(row => row.gate) : null;
        if (!door) return false;
        const room = map.rooms[door.to], off = cell => Math.abs(cell.gy - room.gy) + Math.abs(cell.gx - room.gx) / 100;
        const index = off(door.arrivals[0]) <= off(door.arrivals[1]) ? 0 : 1;
        const spot = standable(map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
        Object.assign(game.gridPlayer, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
        run.destination = null; // 입구 방에서 받은 걷기 명령은 여기서 끝난다: 남기면 보스 방에서 입구 쪽으로 되돌아 걷는다
        actExplorationState.lockOn(run, null);
        actExplorationState.arrive(run, getCombatTime());
        bringSummons(spot);
        return true;
    }
    /** 습격방(data ACT_EXPLORATION_AMBUSH, js/combat.js markExplorationAmbushRooms)에 처음 들어선 순간: 그 방에서 기다리던 습격 무리가
     * 저마다 들어온 문(주인공이 선 칸) 쪽으로 다가와 서서(문까지의 거리를 pull의 몫으로 줄인 자리, 막혔으면 search칸 안의 가까운 빈 칸)
     * 공격 게이지를 windUp까지 채운다. 무리의 모양은 줄어든 채 남고, 주인공의 keep칸 안에는 서지 않는다. 들어선 뒤의 유예
     * (EXPLORATION_ARRIVAL_GRACE_MS)가 끝나면 한꺼번에 덤빈다. 설 칸이 없으면 제자리에서 덤빈다. 한 방에 한 번만 일어난다. */
    function springAmbush(run, map, cell) {
        const room = actExplorationRooms.roomAt(map, cell), packs = room ? run.packs.filter(pack => pack.ambush && pack.roomId === room.id) : [];
        if (!packs.length) return;
        const rule = ACT_EXPLORATION_AMBUSH, lying = packs.flatMap(pack => pack.waiting);
        packs.forEach(pack => { delete pack.ambush; });
        const blocked = ambushBlockedCells(map, room, lying), far = at => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy));
        for (const enemy of lying) {
            const size = getGridUnitFootprint(enemy), toward = axis => Math.round(cell[axis] + (enemy[axis] - cell[axis]) * rule.pull);
            const spot = ambushSpots({ gx: toward('gx'), gy: toward('gy') }, rule.search)
                .find(at => far(at) >= rule.keep && canPlaceGridFootprint(blocked, at.gx, at.gy, size));
            if (spot) Object.assign(enemy, spot, { gridMoveTimer: 0 });
            getGridUnitCells(enemy).forEach(at => blocked.add(gridCellKey(at.gx, at.gy)));
            enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, rule.windUp);
        }
    }
    /** 습격 무리가 서지 않는 칸: 다른 유닛, 상자, 이야기 NPC의 칸(getGridBlockedCells)과 그 방의 문 칸과 문 안쪽 칸. 습격 무리의 지금 자리는 빈다. */
    function ambushBlockedCells(map, room, lying) {
        const blocked = getGridBlockedCells(), key = at => gridCellKey(at.gx, at.gy);
        lying.forEach(enemy => getGridUnitCells(enemy).forEach(at => blocked.delete(key(at))));
        map.doors.filter(door => door.room === room.index).forEach(door => door.cells.concat(door.landings).forEach(at => blocked.add(key(at))));
        return blocked;
    }
    /** 칸 cell과 그 둘레 reach칸 안의 칸들, 가까운 쪽부터: 체비쇼프 거리, 같으면 곧은 거리. */
    function ambushSpots(cell, reach) {
        const spots = [], ring = at => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy)), line = at => Math.hypot(at.gx - cell.gx, at.gy - cell.gy);
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) spots.push({ gx: cell.gx + dx, gy: cell.gy + dy });
        return spots.sort((a, b) => ring(a) - ring(b) || line(a) - line(b));
    }
    /** 지금 걸어갈 칸: 같은 방이면 목표 그대로, 다른 방이면 그 방으로 가는 문 칸. 이어진 지도에서는 언제나 목표 그대로다. */
    function toward(run, target) {
        const map = stageMap(run);
        return map ? actExplorationRooms.waypoint(map, game.gridPlayer, target) : target;
    }
    /** 주인공이 선 방(문 칸은 그 문이 붙은 방). 이어진 지도에서는 null. */
    function room(run) {
        const map = stageMap(run);
        return map ? actExplorationRooms.roomAt(map, game.gridPlayer) : null;
    }
    /** 주인공이 선 방의 문들과 지금 잠겼는지: 그림(js/canvas-stage-rooms.js)과 미니맵이 읽는다. arrival은 들어선 뒤의 유예로만 잠긴 문이다
     * (봉인 그림은 한 번 열린 채로 본 문이면 그동안에도 접힌 모습이다, js/canvas-stage-door-marks.js). */
    function doorsHere(run) {
        const map = stageMap(run), here = room(run);
        if (!map || !here) return [];
        return map.doors.filter(door => door.room === here.index).map(door => {
            const lock = lockOf(run, door);
            return { door, locked: lock !== null, arrival: lock === 'arrival' };
        });
    }
    /** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(STAGE_ROOMS.pace). 이어진 지도의 탐험은 1. */
    const pace = run => (run && run.rooms ? STAGE_ROOMS.pace : 1);
    /** 그 구역의 지도에 서는 이야기 NPC: 액트나 전직 시련 대사(data/story-journal.js)의 npc. 액트 1의 안내자는 루프 1에만 선다(2026-10-15
     * 사용자: 루프 뒤에는 첫 방에 하켄이 없다). 무대의 그림과 대사(js/canvas-act-title-card.js)와 서는 칸(guideCells)이 함께 읽는다.
     * @returns {?object} 그 npc 대사 줄(이름, 대사), 없으면 null */
    function storyGuide(zoneId) {
        const act = Number.isInteger(zoneId) ? getStoryActByZoneId(zoneId) : null;
        const lines = act ? STORY_ACT_ENCOUNTERS[act.order] : (typeof zoneId === 'string' ? STORY_TRIAL_ENCOUNTERS[zoneId] : null);
        return lines && lines.npc && !(act && act.order === 1 && (game.season || 1) > 1) ? lines.npc : null;
    }
    /** The room where the map's guide stands and its first lines are said: the entry room, or in loop 1's first start the room behind
     * it where the guide is struck (js/combat.js starterRescueRoom; saves from before kept it in the entry room). */
    function guideRoom(run, map) {
        const pack = run.packs.find(row => row.rescue);
        return (pack && map.rooms.find(row => row.id === pack.roomId)) || map.entry;
    }
    /** 이야기 NPC가 선 칸(actExplorationRooms.npcPost)과 같은 세로줄의 앞뒤 GUIDE_KEEP_ROWS칸: 주인공도 몬스터도 서지 않고 돌아간다
     * (js/combat-grid.js addExplorationGridReservations, 2026-10-17 사용자 "NPC와 겹치지 않도록"). 사람 그림의 키가 세 줄 가까이라 한 줄만
     * 비우면 두 줄 뒤에 선 주인공이 NPC의 머리와 이름 뒤로 반쯤 가렸다. 옆 칸은 그림이 맞닿기만 해서 비우지 않는다. 문 칸과 문 안쪽 칸은
     * 막지 않는다: 막으면 그 문으로 드나들 수 없다. 방은 다섯 줄 넘게 깊어 맨 앞줄로는 언제나 지나간다. NPC가 서지 않는 지도는 빈 목록이다.
     * 탐험마다 한 번 센다. @returns {string[]} 칸 열쇠(gridCellKey) */
    const GUIDE_KEEP_ROWS = 2;
    const guideKeys = new WeakMap();
    function guideCells(run) {
        if (!run) return [];
        if (!guideKeys.has(run)) guideKeys.set(run, findGuideCells(run));
        return guideKeys.get(run);
    }
    function findGuideCells(run) {
        const map = stageMap(run);
        if (!map || !storyGuide(run.zoneId)) return [];
        const room = guideRoom(run, map), post = actExplorationRooms.npcPost(room);
        const doorways = new Set(map.doors.flatMap(door => door.cells.concat(door.landings)).map(cell => gridCellKey(cell.gx, cell.gy)));
        const rows = Array.from({ length: GUIDE_KEEP_ROWS * 2 + 1 }, (_, index) => post.gy - GUIDE_KEEP_ROWS + index);
        return rows.filter(gy => gy >= room.y0 && gy <= room.y1).map(gy => gridCellKey(post.gx, gy)).filter(key => !doorways.has(key));
    }
    return Object.freeze({ session, planKey, stageMap, cross, startAtGate, toward, room, doorsHere, pace, fightingHere, waveDue, sendStraysBack, storyGuide, guideRoom,
        guideCells });
})();
safeExposeGlobals({ actExplorationDoors });
