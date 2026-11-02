/** 난입 보스와 보스 방의 불청객(2026-11-02 사용자: "디아블로의 도살자 같은 느낌"). 수치와 확률은 data/bosses.js ROOM_INVADER, BOSS_ROOM_SURPRISE.
 * 난입: 처음 들어서는 방(입구와 보스 방 빼고, 아직 몬스터가 있는 방)에서 낮은 확률로 보스가 그 방에 들이닥친다. 대개 다른 보스이고 아주 드물게 뿌리 절단자다. 무리는 run.packs의
 * "방:invader"이고 탐험에 하나뿐이다. 쓰러뜨리기 전에는 문이 잠긴다(js/act-exploration-doors.js). 주인공이 쓰러지면 탐험과 함께 사라진다.
 * 보스 방: 루프가 높을수록 조금씩 오르는 확률로, 입장 때 보스가 둘 서거나(twin), 싸우는 도중 난입 보스가 들이닥친다(extra). 둘 다 보스의 무리에
 * 들어 함께 쓰러뜨려야 지도가 끝난다. 탐험에 한 번만 굴리고 결과는 run.bossSurprise에 남는다.
 * 방치 정산 중에는 굴리지 않는다: 지켜보지 않는 동안 고난이도 보스가 나오면 정산을 잃는다. */
const roomInvaders = (() => {
    const RULE = ROOM_INVADER, SURPRISE = BOSS_ROOM_SURPRISE;
    const openZone = zone => !!zone && RULE.zoneTypes.includes(zone.type);
    const invaderCellKey = at => gridCellKey(at.gx, at.gy);

    /** 뿌리 절단자의 공격 차례: 공격마다 예고하고 톱날을 갈아 낸다(js/combat-patterns.js getOwnPatternState). */
    function patternState(attackNumber) {
        const grind = RULE.grind;
        return { mode: 'rootGrinder', patternMode: 'rootGrinder', label: grind.label, damageMul: grind.damageMul, isSpecial: true, attackNumber,
            telegraphKind: 'grind', warningMs: grind.warningMs, recoveryMs: grind.recoveryMs };
    }

    /** 뿌리 절단자 한 몸: 그 구역 보스의 수치에 배율을 곱한다. 숨은 기록과 보스 변종은 받지 않는다(createEnemy의 plainBoss). */
    function buildGrinder(zone) {
        const enemy = createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 0);
        const maxHp = Math.floor(enemy.maxHp * RULE.hpMul);
        Object.assign(enemy, { name: `👿 ${RULE.name}`, roomInvader: true, redEntrance: true, monsterVisualId: RULE.actor, spriteVariantId: null, monsterVisualSetId: null,
            bossAssetKey: null, bossVisualTint: null, baseMonsterName: RULE.name, maxHp, hp: maxHp, damageMul: enemy.damageMul * RULE.damageMul,
            expMul: enemy.expMul * RULE.expMul, stepSec: RULE.stepSec, encounterOutline: RULE.outline,
            patternMode: 'rootGrinder', nextPatternState: null, patternAttackCount: 0 });
        assignEnemyGridCombatProfile(enemy);
        refreshBossPatternPreview(enemy);
        return enemy;
    }
    /** 그 보스 방의 보스가 하나 더(twin): 수치는 같고, 그림은 구역이 고른다(혼돈 심화처럼 보스 그림이 여럿인 곳은 다른 모습으로 선다). */
    function buildTwin(zone, pack) {
        const enemy = createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: pack.stage, plainBoss: true }, 1);
        if (zone.atlasStages) atlasEndgame.tuneStage(enemy, zone, pack.stage);
        if (zone.memoryTier) memoryDungeon.tuneBoss(enemy, zone.memoryTier);
        const maxHp = Math.floor(enemy.maxHp * SURPRISE.twinHpMul);
        return Object.assign(enemy, { maxHp, hp: maxHp, redEntrance: true });
    }

    /** 뿌리 절단자가 아닌 난입 보스: 수치는 그 구역 보스, 그림은 후보 가운데 싸우고 있는 보스(current, 없으면 null)가 아닌 하나. uninvited: 숨은 기록을 받지 않는다(wakeBosses). */
    function buildVisitor(zone, current) {
        const actors = MONSTER_STAGE_ROSTER.actors, own = current ? getBossStageActor(current)?.id : null;
        const id = rndChoice(RULE.otherBosses.filter(look => actors[look] && look !== own));
        const enemy = createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 2);
        Object.assign(enemy, { name: `👿 ${actors[id].name}`, uninvited: true, redEntrance: true, monsterVisualId: id, spriteVariantId: null, monsterVisualSetId: null, bossAssetKey: null, bossVisualTint: null,
            baseMonsterName: actors[id].name, nextPatternState: null });
        assignEnemyGridCombatProfile(enemy);
        refreshBossPatternPreview(enemy);
        return enemy;
    }
    /** 몸이 다 들어가는 빈 칸들 가운데 want에 가장 가까운 칸. 그 방의 문 칸과 문 안쪽, 주인공 둘레 한 칸은 피한다. */
    function freeSpot(map, room, enemy, want) {
        const blocked = getGridBlockedCells(), hero = game.gridPlayer, size = getGridUnitFootprint(enemy);
        map.doors.filter(door => door.room === room.index).forEach(door => door.cells.concat(door.landings).forEach(at => blocked.add(invaderCellKey(at))));
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(gridCellKey(hero.gx + dx, hero.gy + dy));
        const roomForBody = at => Array.from({ length: size.columns * size.rows }, (_, i) => ({ gx: at.gx + i % size.columns, gy: at.gy + Math.floor(i / size.columns) }))
            .every(cell => actExplorationRooms.roomAt(map, cell) === room && !blocked.has(invaderCellKey(cell)));
        const spots = [];
        for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) if (roomForBody({ gx, gy })) spots.push({ gx, gy });
        const far = at => Math.abs(at.gx - want.gx) + Math.abs(at.gy - want.gy);
        return spots.sort((a, b) => far(a) - far(b))[0] || null;
    }
    /** 주인공 맞은편에 세운다. 설 칸이 없으면 false. */
    function stand(map, room, enemy) {
        fitBossFootprint(enemy);
        const side = game.gridPlayer.gx <= room.gx ? 1 : -1;
        const want = { gx: Math.round(room.gx + side * room.radiusX * 0.45), gy: Math.round(room.gy) };
        let spot = freeSpot(map, room, enemy, want);
        if (!spot && enemy.footprint) { delete enemy.footprint; spot = freeSpot(map, room, enemy, want); }
        if (!spot) return false;
        Object.assign(enemy, spot, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
        return true;
    }
    /** 들이닥치는 연출과 그 동안의 기다림: run.motionTimeMs가 입장 시계다(js/act-exploration-state.js bossAwake). */
    function cueEntrance(run, pack, enemy) {
        actExplorationState.openEntrance(run, pack, { at: run.motionTimeMs, holdMs: RULE.entranceMs, roomId: pack.roomId });
        addBattleFx('bossEntrance', { enemies: [enemy], enemyIds: [enemy.id], holdMs: RULE.entranceMs, duration: RULE.entranceMs + 600, red: true });
        dispatchRuntimeEvent('room-invader', { kind: 'arrived', name: enemy.baseMonsterName });
    }
    const invaded = run => run.packs.some(pack => pack.invader);
    /** 들이닥치는 보스: who는 'grinder'(뿌리 절단자) 또는 'other'. current: 싸우고 있는 보스, 없으면 null. */
    const buildInvader = (who, current) => (who === 'grinder' ? buildGrinder(getZone(game.currentZoneId)) : buildVisitor(getZone(game.currentZoneId), current));
    const rollWho = () => (Math.random() < RULE.grinderShare ? 'grinder' : 'other');
    /** 그 방에 난입 보스를 세운다. @returns {boolean} 세웠는지 */
    function invade(run, map, room, who) {
        const enemy = buildInvader(who, null);
        if (!stand(map, room, enemy)) return false;
        const pack = { key: `${room.id}:invader`, roomId: room.id, stage: null, waiting: [enemy], aliveIds: [enemy.id], eliteIds: [], invader: true };
        enemy.explorationPack = pack.key;
        run.packs.push(pack);
        cueEntrance(run, pack, enemy);
        return true;
    }
    const hasLiveMonsters = (run, room) => run.packs.some(pack => pack.roomId === room.id && pack.aliveIds.length > 0);
    const newRoom = (run, room) => ['battle', 'elite', 'optional'].includes(room.role) && !run.visitedRooms.includes(room.id) && hasLiveMonsters(run, room);
    /** 처음 들어서는 방에서 한 번 굴린다(js/act-exploration-doors.js cross). */
    function rollRoom(run, map, room) {
        if (game.isBackgroundCalculation || !room || invaded(run) || (game.season || 1) < RULE.fromLoop || !openZone(getZone(game.currentZoneId))) return false;
        return newRoom(run, room) && Math.random() < RULE.roomChance && invade(run, map, room, rollWho());
    }

    /** 이 루프에 보스 방에서 일이 벌어질 확률(0~1). */
    const surpriseChance = loop => Math.min(SURPRISE.cap, Math.max(0, loop - SURPRISE.fromLoop + 1) * SURPRISE.perLoop);
    const rollSurpriseKind = () => (Math.random() < SURPRISE.twinShare ? 'twin' : rollWho() === 'grinder' ? 'grinder' : 'extra');
    /** run.bossSurprise: 보스가 둘이면 끝난 일이고, 들이닥치는 쪽은 who(grinder 또는 other)가 보스가 맞아 내려갈 때를 기다린다. */
    const surpriseRecord = (kind, packKey) => (kind === 'twin' ? { kind, key: packKey, done: true } : { kind: 'extra', who: kind === 'grinder' ? 'grinder' : 'other', key: packKey, done: false });
    function chooseSurprise(run) {
        const forced = run.bossSurpriseForce;
        if (forced) return forced;
        if (game.isBackgroundCalculation || !openZone(getZone(game.currentZoneId))) return null;
        return Math.random() < surpriseChance(game.season || 1) ? rollSurpriseKind() : null;
    }
    /** 보스가 하나 더: 입장 연출에 함께 선다. */
    function addTwin(run, map, pack) {
        const room = map.rooms.find(row => row.id === pack.roomId), enemy = buildTwin(getZone(game.currentZoneId), pack);
        if (!stand(map, room, enemy)) return;
        enemy.explorationPack = pack.key;
        pack.waiting.push(enemy);
        pack.aliveIds.push(enemy.id);
        pack.waiting.forEach(boss => { boss.redEntrance = true; });
        dispatchRuntimeEvent('room-invader', { kind: 'twin' });
    }
    /** 보스 방의 입장이 열리는 순간(js/act-exploration-progress.js watchEntrance): 탐험에 한 번 굴린다. */
    function onBossEntrance(run, pack) {
        if (run.bossSurprise !== undefined || pack.stage === null || pack.invader) return;
        const kind = pack.waiting.length === 1 && pack.waiting[0].isBoss ? chooseSurprise(run) : null;
        delete run.bossSurpriseForce;
        run.bossSurprise = kind ? surpriseRecord(kind, pack.key) : null;
        if (kind === 'twin') addTwin(run, actExplorationDoors.stageMap(run), pack);
    }
    /** 보스가 맞아 정해진 몫 아래로 내려가면 다른 보스가 그 방에 들이닥친다. 입장 연출이 끝나면 함께 덤빈다. */
    function dropInExtra(run, map, surprise, hurtBoss) {
        const pack = run.packs.find(row => row.key === surprise.key), room = pack && map.rooms.find(row => row.id === pack.roomId);
        surprise.done = true;
        if (!room) return;
        const enemy = buildInvader(surprise.who, hurtBoss);
        if (!stand(map, room, enemy)) return;
        enemy.explorationPack = pack.key;
        pack.waiting.push(enemy);
        pack.aliveIds.push(enemy.id);
        cueEntrance(run, pack, enemy);
    }
    /** 전투 틱마다(js/combat.js prepareCombatTick). */
    function tick() {
        const run = actExplorationState.current(game), surprise = run && run.status === 'active' ? run.bossSurprise : null;
        if (!surprise || surprise.kind !== 'extra' || surprise.done || game.isBackgroundCalculation) return;
        const hurt = enemy => enemy.isBoss && enemy.hp > 0 && enemy.explorationPack === surprise.key && enemy.hp / enemy.maxHp <= SURPRISE.extraAtHpShare;
        const boss = (game.enemies || []).find(hurt), map = boss ? actExplorationDoors.stageMap(run) : null;
        if (map) dropInExtra(run, map, surprise, boss);
    }
    /** 뿌리 절단자를 쓰러뜨린 보람(js/combat.js grantEnemyLoot): 여느 처치의 한 번에 더해 보스 드랍을 lootRolls번까지 굴린다. 빈 굴림을 버리는 곳은 js/combat.js rollCurrencyAndGear. */
    function grantExtraLoot(enemy) {
        if (!enemy.roomInvader) return;
        for (let roll = 1; roll < RULE.lootRolls; roll++) rollLootForEnemy(enemy);
        dispatchRuntimeEvent('room-invader', { kind: 'slain', name: RULE.name });
    }
    const FORCED_ROOM = Object.freeze({ room: 'other', roomGrinder: 'grinder' });
    /** 시험판(js/dev-test-panel-ui.js): 'room', 'roomGrinder'는 지금 방에, 'twin', 'extra', 'grinder'는 다음 보스 입장에. */
    function force(kind) {
        const run = actExplorationState.current(game), map = run ? actExplorationDoors.stageMap(run) : null;
        if (!map) return false;
        if (!FORCED_ROOM[kind]) { run.bossSurpriseForce = kind; delete run.bossSurprise; return true; }
        const room = actExplorationRooms.roomAt(map, game.gridPlayer);
        return !!room && room.role !== 'boss' && room.role !== 'entry' && !invaded(run) && invade(run, map, room, FORCED_ROOM[kind]);
    }
    return Object.freeze({ patternState, rollRoom, onBossEntrance, tick, grantExtraLoot, force, surpriseChance });
})();
safeExposeGlobals({ roomInvaders });
