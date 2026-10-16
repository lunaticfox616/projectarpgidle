/** 방 단위 무대의 문 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식", 지도는 js/act-exploration-rooms.js).
 * 주인공이 열린 문 칸에 서면 이어진 방의 문 안쪽으로 옮겨진다. 걷기가 아니라 자리 옮김이라 이동 기록(run.motion)을 남기지 않는다.
 * 문은 방 안에서 싸우는 몬스터가 살아 있는 동안 잠기고, 보스 방으로 가는 문은 정예가 남아 있으면 칸 자체에 설 수 없다(map.gate).
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
        return game.enemies.some(enemy => enemy.hp > 0 && here(enemy)) || (run.objects?.entries || []).some(bursting);
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
     * (EXPLORATION_ARRIVAL_GRACE_MS)에도 잠긴다: 2026-10-16 사용자 "그동안에 방 이동못하게막아". */
    function locked(run, door) {
        if (fightingIn(run, door.room)) return true;
        if (actExplorationState.inArrivalGrace(run, getCombatTime())) return true;
        return door.gate && actExplorationState.gateSealed(run);
    }
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
    /** 걸음이 끝난 주인공이 열린 문 칸에 서 있으면 이어진 방으로 옮긴다. @returns {boolean} 옮겼는지 */
    function cross(run) {
        const map = stageMap(run), hero = game.gridPlayer, door = map ? actExplorationRooms.doorAt(map, hero) : null;
        if (!door || locked(run, door)) return false;
        // 문 칸으로 가라는 명령은 여기서 끝난다: 남겨 두면 도착한 방에서 그 문으로 되돌아 걷는다.
        if (run.destination && run.destination.gx === hero.gx && run.destination.gy === hero.gy) run.destination = null;
        Object.assign(hero, { gx: door.exit.gx, gy: door.exit.gy, gridMoveTimer: 0 });
        bringSummons(door.exit);
        actExplorationState.arrive(run, getCombatTime());
        return true;
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
    /** 주인공이 선 방의 문들과 지금 잠겼는지: 그림(js/canvas-stage-rooms.js)과 미니맵이 읽는다. */
    function doorsHere(run) {
        const map = stageMap(run), here = room(run);
        if (!map || !here) return [];
        return map.doors.filter(door => door.room === here.index).map(door => ({ door, locked: locked(run, door) }));
    }
    /** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(STAGE_ROOMS.pace). 이어진 지도의 탐험은 1. */
    const pace = run => (run && run.rooms ? STAGE_ROOMS.pace : 1);
    return Object.freeze({ session, planKey, stageMap, cross, toward, room, doorsHere, pace, fightingHere, sendStraysBack });
})();
safeExposeGlobals({ actExplorationDoors });
