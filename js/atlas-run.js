/** 지도 장치 런의 전투 쪽 연결 (docs/atlas-endgame-20260930.md 3절). 상태 전이는 js/atlas.js가, 맵 · 무리 · 전리품 보관은
 * 넓은 맵 탐험 엔진(js/act-exploration-*.js)이 맡는다. 여기서는 이동 · 정산 · 포털 · 자동 지도를 전투 흐름에 잇는다.
 * 알림은 'project-idle:atlas-map' 이벤트로만 내보낸다(기록 · 화면은 js/atlas-ui.js).
 */
const atlasRun = (() => {
    const inMap = () => game.currentZoneId === ATLAS.zoneId;
    /** In the open map itself, not still on the cleared one during the settlement pause before the next map. */
    const insideMap = () => inMap() && !actExplorationState.current(game)?.departure;
    const notify = detail => dispatchRuntimeEvent('atlas-map', detail);
    function returnZone(id) {
        return Number.isInteger(id) && getZone(id) ? id : getDefeatRecoveryZoneId();
    }
    function departureBlock() {
        if (game.pendingLoopReady || game.pendingLoopDecision) return '루프 정산 화면에서 먼저 결정하세요(루프 진행 또는 나중에 루프).';
        return isBeehiveRunLockedForMapTravel() || game.beyondBoundary.activeRun ? '진행 중인 도전을 마친 뒤 지도를 여세요.' : '';
    }
    /** 지도 장치: 지도석을 소모해 지도를 열고 그 맵으로 떠난다(떠나지 못하면 지도석은 보관함으로 돌아간다).
     * @returns {string} '' when the map opened, otherwise why not. */
    function open(uid) {
        atlas.sync(game);
        const reason = atlas.beginReason(game, uid) || departureBlock();
        if (reason) return reason;
        atlas.begin(game, uid, game.currentZoneId);
        return depart();
    }
    /** 정점: 뿌리 입장권 4종을 바치고 세계수의 그림자로 떠난다(떠나지 못하면 입장권은 돌아온다). */
    function openPinnacle() {
        const reason = atlas.pinnacleReason(game) || departureBlock();
        if (reason) return reason;
        atlas.beginPinnacle(game, game.currentZoneId);
        return depart();
    }
    /** 후반부 싸움(최종 보스 · 리그 우두머리, js/atlas-endgame.js): 재료를 바치고 그 투기장으로 떠난다(떠나지 못하면 재료는 돌아온다). */
    function openEndgame(id) {
        const reason = atlasEndgame.entryReason(game, id) || departureBlock();
        if (reason) return reason;
        atlasEndgame.spend(game, id);
        atlas.beginSpecial(game, id, game.currentZoneId);
        return depart();
    }
    function depart() {
        combatLootReceipts.reset(game);
        changeZone(ATLAS.zoneId);
        if (inMap()) return '';
        atlas.cancel(game);
        return '지도로 이동할 수 없습니다.';
    }
    /** 열린 지도에 다시 들어간다(떠날 때 포털 하나를 이미 썼다). @returns {string} '' when the hero is headed in, otherwise why not. */
    function reenter() {
        const reason = game.atlas.run ? departureBlock() : '열린 지도가 없습니다.';
        if (reason) return reason;
        if (!inMap()) changeZone(ATLAS.zoneId);
        return inMap() ? '' : '지도로 이동할 수 없습니다.';
    }
    /** A content's return or a finished departure left the hero in a map that has closed since: back to the frontier. */
    function recoverClosedMap() {
        if (inMap() && !game.atlas.run) travelBack(null);
    }
    /** The open map has one entry left: spending it would close the map. */
    const lastPortal = () => insideMap() && !!game.atlas.run && game.atlas.run.portals <= 1;
    /** 열린 지도를 닫는다: 지도석과 맵 안의 지도석 드롭을 잃는다. @returns {boolean} whether a map was open. */
    function abandon() {
        if (!game.atlas.run) return false;
        const { returnZoneId } = atlas.close(game, 'failed');
        if (inMap()) travelBack(returnZoneId);
        return true;
    }
    function travelBack(returnZoneId) {
        game.currentZoneId = returnZone(returnZoneId);
        game.killsInZone = 0;
        game.enemies = []; game.encounterPlan = []; game.encounterIndex = 0; game.runProgress = 0;
        startMoving(false);
    }

    /** 보스 처치 → 완료 정산. 자동 지도가 켜져 있으면 규칙대로 다음 지도석을 연다(방치 · 오프라인 재생도 같다). */
    function finish(zone) {
        const result = atlas.complete(game);
        if (!result) return;
        atlas.keepLoot(game, game.explorationLoot);
        grantSpoils(result);
        game.killsInZone = 0;
        const stop = game.settings.mapCompleteAction === 'stop';
        const next = stop ? null : atlas.nextAuto(game, result.tier);
        const opened = !!next && !atlas.begin(game, next.uid, result.returnZoneId);
        if (opened) combatLootReceipts.reset(game);
        notify({ kind: 'complete', name: zone.name, ...result, next: opened ? game.atlas.run.map.node : null });
        game.currentZoneId = opened ? ATLAS.zoneId : returnZone(result.returnZoneId);
        pendingHeavyUiRefresh = true;
        queueImportantSave(220);
        if (stop) return halt();
        // The cleared map stays on screen through the settlement pause only when the next map is ready to take its place.
        if (opened && actExplorationProgress.deferDeparture(game)) return;
        actExplorationProgress.reconcileDeparture(game);
        startMoving(false);
    }
    /** 수호자의 뿌리 입장권, 정점의 보상은 지도가 끝난 뒤라 바로 지갑으로 간다. */
    function grantSpoils(result) {
        if (result.ticket) awardCurrency(result.ticket, 1);
        for (const [key, amount] of result.rewards || []) awardCurrency(key, amount);
        if (result.endgame) grantEndgameSpoils(result.endgame, result.tier);
    }
    /** 후반부 보스의 보상: 재화는 지갑으로, 고유 장비는 가방으로(가득 차도 남긴다). */
    function grantEndgameSpoils(spoils, tier) {
        for (const [key, amount] of spoils.rewards) awardCurrency(key, amount);
        if (!spoils.unique) return;
        const item = generateUniqueItem(tier, null, spoils.unique);
        if (item) addItemToInventory(item, { guaranteedKeep: true });
    }
    function halt() {
        actExplorationProgress.depart(game);
        actExplorationProgress.stopAfterCompletion(game);
    }

    /** 쓰러짐(handlePlayerDefeat 끝): 포털 하나. 남아 있으면 같은 지도에 다시 들어가고, 마지막 포털이면 지도가 닫힌다. */
    function defeat(zone) {
        if (zone && zone.type === 'atlasMap') spendPortal('defeat');
    }
    /** 마을 귀환 · 다른 곳으로 이동: 포털 하나(정산 대기 중에는 아직 다음 지도에 들어가지 않았다). */
    function leave(reason) {
        if (insideMap()) spendPortal(reason);
    }
    /** changeZone의 마지막 단계: 맵을 떠나면 포털 하나, 그리고 도착지를 현재 지역으로. */
    function travel(zone) {
        if (zone.id !== ATLAS.zoneId) leave('travel');
        game.currentZoneId = zone.id;
    }
    function spendPortal(reason) {
        const portal = atlas.usePortal(game);
        if (!portal) return;
        notify({ kind: portal.closed ? 'failed' : 'portal', reason, portals: portal.portals || 0 });
        if (!portal.closed) return;
        if (inMap()) game.currentZoneId = returnZone(portal.returnZoneId);
        game.killsInZone = 0;
        queueImportantSave(160);
    }

    /** 처치 전리품(grantEnemyLoot의 보관 안): 지도석 · 각인 드롭, 그리고 콘텐츠 방을 비운 처치면 그 방의 보상.
     * 맵 안의 지도석 · 각인은 보스를 잡을 때까지 런이, 방 보상 재화는 넓은 맵 전리품 보관이 들고 있다. */
    function onKill(enemy) {
        const zone = getZone(game.currentZoneId);
        const maps = atlas.dropFromKill(game, zone, enemy), fragments = atlas.fragmentFromKill(game, zone, enemy);
        const room = zone && zone.type === 'atlasMap' && game.atlas.run ? emptyRoom(enemy) : null;
        const rewards = room ? clearRoom(zone, room, maps) : [];
        // 깨어난 뒤에는 제단의 잉걸 · 허기의 즙과 리그 조각도(보스를 잡을 때까지 런이 들고 있다, js/atlas-endgame.js).
        const late = room ? atlasEndgame.roomItems(game, zone, room) : [];
        if (!maps.length && !fragments.length && !room) return;
        notify({ kind: 'drops', maps: maps.map(map => ({ node: map.node, tier: map.tier, rarity: map.rarity })), fragments, room, rewards, late });
    }
    /** A kill that empties an ordinary room: the room stays empty for the rest of the map; a content room names its reward. */
    function emptyRoom(enemy) {
        const pack = atlasEncounters.emptiedPack(game, enemy);
        if (!pack || pack.stage !== null) return null;
        atlas.markCleared(game, pack.roomId);
        return Object.hasOwn(ATLAS.encounters, pack.encounter || '') ? pack.encounter : null;
    }
    function clearRoom(zone, room, maps) {
        const rewards = atlasEncounters.rewards(zone, room, game.atlas.run.bonus, Math.random);
        for (const [key, amount] of rewards) awardEnemyLootCurrency(key, amount);
        if (Math.random() < ATLAS.encounters[room].mapChance) maps.push(...atlas.extraMap(game));
        return rewards;
    }
    /** 혼돈 20 · 심화 클리어(onChaos20Cleared): 아틀라스가 처음 열리거나 이번 루프의 첫 지도석이 들어온다. */
    function onChaos20() {
        const opened = !game.atlas.unlocked;
        const maps = atlas.sync(game);
        if (opened || maps.length) notify({ kind: 'starter', opened, count: maps.length });
    }
    return Object.freeze({ open, openPinnacle, openEndgame, reenter, abandon, finish, defeat, leave, travel, onKill, onChaos20, recoverClosedMap, lastPortal,
        blockReason: departureBlock });
})();
safeExposeGlobals({ atlasRun });
