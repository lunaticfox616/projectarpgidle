/** 잔잔한 사건 (data/act-exploration-maps.js ACT_EXPLORATION_INCIDENTS, 2026-10-20 사용자: "계속 같은 게임이라고 느껴지지 않도록
 * 낮은 확률로 나올만한 잔잔한 이벤트"). 사냥 중 낮은 확률로 일어나는 작은 일들이다.
 * - 금빛 수액 슬라임: 방 단위 무대의 보통 무리를 지을 때 드물게 무리 곁에 하나가 더 선다(dressPack). 덤비지 않고(noAttack) 영웅에게서
 *   먼 방 구석으로 달아나며(tick), 영웅과 같은 방에 든 뒤 fleeMs가 지나면 사라진다. 쓰러뜨리면 재화 몇 개와 희귀 장비 하나(onKill).
 *   아주 드물게 무지갯빛(체이싱 티어): 빛깔이 돌고, 황금률 하나와 고유 장비 하나(반은 체이싱 고유)를 더 준다.
 * - 세계수의 하품: 처음 들어선 전투 방에서 아주 드물게 그 방의 몬스터가 잠든다(skillHeldUntil: 움직이지도 공격하지도 않는다).
 * - 행운의 숫자: 한 번에 준 피해가 7로만 된 수면 그 자릿수의 재화(noteDamage, js/combat.js applyDamageToEnemyResource).
 * 굴림은 무리 열쇠와 방 번호로 정해 다른 난수를 밀지 않는다. 알림은 'incident' 이벤트로 보내고 알림 창이 띄운다(js/battle-ground-loot-ui.js).
 * 방치 정산과 1루프의 액트 1에서는 일어나지 않는다.
 */
const combatIncidents = (() => {
    const rule = () => ACT_EXPLORATION_INCIDENTS;
    const draw = (tag, key) => (Math.abs(hashSeed(`${tag}:${key}`)) % 100000) / 100000;
    const quiet = zone => !!game.isBackgroundCalculation || !zone || (zone.type === 'act' && zone.id === 0 && (game.season || 1) === 1);
    const tell = (text, tone, chase = false) => dispatchRuntimeEvent('incident', { text, tone, chase });
    const sleptRooms = new WeakMap();   // 탐험 → 하품을 굴려 본 방(처음 들어설 때 한 번)

    // ---------------------------------------------------------------- 금빛 수액 슬라임
    /** 금빛 슬라임이 서도 되는 무리: 방 단위 무대의 보통 무리. */
    function hostsCritter(pack) {
        return pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.alert && !pack.ambush && !pack.treasure
            && pack.eliteIds.length === 0 && pack.waiting.length > 0;
    }
    /** 무리의 빈 이웃 칸(첫 몬스터의 곁부터). 없으면 null. */
    function besidePack(pack) {
        const taken = new Set(pack.waiting.map(enemy => gridCellKey(enemy.gx, enemy.gy)));
        for (const enemy of pack.waiting) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            const cell = { gx: enemy.gx + dx, gy: enemy.gy + dy };
            if (!taken.has(gridCellKey(cell.gx, cell.gy)) && canPlaceGridFootprint(taken, cell.gx, cell.gy, { columns: 1, rows: 1 })) return cell;
        }
        return null;
    }
    /** 무리를 지을 때(js/combat.js createActExplorationPack): 드물게 금빛 수액 슬라임 하나를 무리 곁에 더한다. */
    function dressPack(zone, pack) {
        const C = rule().critter;
        if (quiet(zone) || !hostsCritter(pack) || draw('critter', `${pack.key}:${pack.aliveIds[0]}`) >= C.chance) return pack;
        const cell = besidePack(pack);
        if (!cell) return pack;
        const critter = makeCritter(zone, pack, cell, draw('rainbow', `${pack.key}:${pack.aliveIds[0]}`) < C.rainbow.chance);
        pack.waiting.push(critter);
        pack.aliveIds.push(critter.id);
        return pack;
    }
    /** 그 무리의 금빛(rainbow면 무지갯빛) 수액 슬라임 하나: 그 구역의 보통 몬스터를 바탕으로 그림, 생명력, 보상을 바꾼다. */
    function makeCritter(zone, pack, cell, rainbow) {
        const C = rule().critter;
        const critter = createEnemy(zone, { at: 0, count: 1, boss: false, elite: false, storyStage: null }, pack.waiting.length);
        Object.assign(critter, cell, {
            name: rainbow ? C.rainbow.name : C.name, spriteVariantId: C.look, monsterVisualId: C.look, monsterArchetype: null, realmVisual: null,
            hp: Math.ceil(critter.maxHp * C.hpMul), maxHp: Math.ceil(critter.maxHp * C.hpMul), noAttack: true, critter: rainbow ? 'rainbow' : 'gold',
            encounterOutline: C.outline,
            expMul: (Number(critter.expMul) || 1) * C.expMul, gridMoveTimer: 0, regenBank: 0, spawnStamp: 0, explorationPack: pack.key });
        return critter;
    }
    /** 시험 패널(js/dev-test-panel-ui.js): 지금 방에서 싸우는 무리의 영웅 곁에 슬라임 하나를 바로 세운다. 세웠는지. */
    function testSpawn(rainbow = false) {
        const zone = getZone(game.currentZoneId), run = actExplorationState.current(game), hero = game.gridPlayer;
        const live = (game.enemies || []).find(enemy => enemy && enemy.hp > 0 && enemy.explorationPack);
        const pack = live && run ? run.packs.find(row => row.key === live.explorationPack) : null;
        const taken = new Set((game.enemies || []).map(enemy => gridCellKey(enemy.gx, enemy.gy)).concat(gridCellKey(hero.gx, hero.gy)));
        const cell = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1]].map(([dx, dy]) => ({ gx: hero.gx + dx, gy: hero.gy + dy }))
            .find(c => !taken.has(gridCellKey(c.gx, c.gy)) && canPlaceGridFootprint(taken, c.gx, c.gy, { columns: 1, rows: 1 }));
        if (!pack || !cell) return false;
        const critter = makeCritter(zone, pack, cell, rainbow);
        pack.aliveIds.push(critter.id);
        game.enemies.push(critter);
        return true;
    }
    /** 지금 그 슬라임에 얹는 빛깔 { color, alpha }(js/canvas-stage-roster.js): 무지갯빛은 everyMs마다 다음 빛깔. */
    function glazeOf(enemy) {
        if (!enemy || !enemy.critter) return null;
        const C = rule().critter;
        if (enemy.critter !== 'rainbow') return C.glaze;
        const list = C.rainbow.glazes, step = Math.floor(performance.now() / C.rainbow.everyMs) % list.length;
        return { color: list[step], alpha: C.rainbow.alpha };
    }
    /** 영웅에게서 가장 먼 방 구석(한 칸 안쪽). */
    function farCorner(room) {
        const hero = game.gridPlayer, corners = [[room.x0 + 1, room.y0 + 1], [room.x1 - 1, room.y0 + 1], [room.x0 + 1, room.y1 - 1], [room.x1 - 1, room.y1 - 1]];
        return corners.map(([gx, gy]) => ({ gx, gy })).sort((a, b) => gridChebyshevDist(b.gx, b.gy, hero.gx, hero.gy) - gridChebyshevDist(a.gx, a.gy, hero.gx, hero.gy))[0];
    }
    /** 싸움에 든 슬라임: 처음 본 때를 적고(나타났다는 알림, 자동 사냥이면 영웅이 잠가 쫓는다), 먼 구석으로 달아나며, fleeMs가 지나면
     * 사라진다. 슬라임이 영웅보다 빨라 구석에 몰린 뒤에 잡힌다. */
    function tickCritter(run, enemy, room, now) {
        const C = rule().critter, rainbow = enemy.critter === 'rainbow';
        if (!(enemy.critterSeenAt > 0)) {
            enemy.critterSeenAt = now;
            if (run.mode !== 'manual' && !actExplorationState.lockedEnemy(run)) actExplorationState.lockOn(run, enemy);
            tell(rainbow ? '무지갯빛 수액 슬라임이 나타났습니다.' : '금빛 수액 슬라임이 나타났습니다.', rainbow ? 'chase' : 'reward', rainbow);
        }
        if (now - enemy.critterSeenAt >= C.fleeMs) return escape(enemy, rainbow);
        if (room && hasGridCell(enemy)) advanceGridUnitMovement(enemy, farCorner(room), 0.1, C.stepSec);
        return false;
    }
    /** 달아난 슬라임은 전리품 없이 사라진다. */
    function escape(enemy, rainbow) {
        enemy.hp = 0;
        game.enemies = game.enemies.filter(entry => entry.id !== enemy.id);
        actExplorationState.recordDeath(game, enemy); // 무리의 산 몬스터 목록에서 뺀다(방이 끝나게, 전리품은 없다)
        addBattleFx('enemyDeath', { enemyId: enemy.id, name: enemy.name, color: '#fff0a8', duration: 420 });
        tell(rainbow ? '무지갯빛 수액 슬라임이 달아났습니다.' : '금빛 수액 슬라임이 달아났습니다.', 'warning');
        return true;
    }

    // ---------------------------------------------------------------- 세계수의 하품
    /** 처음 들어선 전투 방: 아주 드물게 그 방의 몬스터가 잠든다. */
    function tickYawn(run, room, now) {
        if (!room || (room.role !== 'battle' && room.role !== 'optional')) return;
        const here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
        if (!here.length || !firstLook(run, room)) return;
        if (draw('yawn', `${run.layoutId || ''}:${run.seed || ''}:${room.id}`) < rule().yawn.chance) yawn(here, now);
    }
    function yawn(enemies, now) {
        enemies.forEach(enemy => { enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + rule().yawn.sleepMs); });
        tell('세계수가 하품을 했습니다. 이 방의 몬스터가 잠시 잠들었습니다.', 'reward');
    }
    /** 시험 패널: 지금 싸우는 몬스터에게 하품. */
    function testYawn() {
        const here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
        if (here.length) yawn(here, getCombatTime());
        return here.length > 0;
    }

    /** 이 방을 처음 보는가(몬스터가 선 방에 처음 들어선 때 한 번). */
    function firstLook(run, room) {
        let seen = sleptRooms.get(run);
        if (!seen) sleptRooms.set(run, seen = new Set());
        if (seen.has(room.id)) return false;
        seen.add(room.id);
        return true;
    }
    /** 전투 한 틱마다(js/combat.js prepareCombatTick): 슬라임이 달아나고, 처음 들어선 방에서 하품을 굴린다. */
    function tick() {
        const zone = getZone(game.currentZoneId), run = actExplorationState.current(game);
        if (quiet(zone) || !run || !game.enemies) return;
        const map = actExplorationDoors.stageMap(run), room = map ? actExplorationDoors.room(run) : null, now = getCombatTime();
        for (const enemy of game.enemies.slice()) if (enemy && enemy.critter && enemy.hp > 0) tickCritter(run, enemy, room, now);
        if (map) tickYawn(run, room, now);
    }
    /** 처치(js/combat.js countKillForContent): 잡은 슬라임의 보상과 알림. */
    function onKill(enemy, zone) {
        if (!enemy || !enemy.critter) return;
        const rainbow = enemy.critter === 'rainbow';
        grantCritterRewards(enemy, zone);
        if (rainbow) grantRainbowRewards(enemy, zone);
        tell(rainbow ? '무지갯빛 수액 슬라임을 잡았습니다.' : '금빛 수액 슬라임을 잡았습니다.', rainbow ? 'chase' : 'reward', rainbow);
    }
    /** 금빛: 재화를 picks번 무게로 뽑고(열리지 않은 재화는 떨어지지 않는다), gear 등급 이상의 장비 하나. */
    function grantCritterRewards(enemy, zone) {
        const R = rule().critter.rewards, total = R.currencies.reduce((sum, row) => sum + row[2], 0);
        for (let i = 0; i < R.picks; i++) {
            let edge = Math.random() * total;
            const row = R.currencies.find(([, , weight]) => (edge -= weight) < 0) || R.currencies[0];
            keepCurrencyDrop(enemy, row[0], row[1]);
        }
        grantEquipmentPick(enemy, zone, R.gear, null);
    }
    /** 무지갯빛: 재화 하나와 고유 장비 하나(chaseShare의 확률로 체이싱 고유, js/atlas-finds.js의 보물과 같은 길). */
    function grantRainbowRewards(enemy, zone) {
        const R = rule().critter.rainbow, chase = Math.random() < R.chaseShare;
        const names = chase ? UNIQUE_DB.filter(row => row.ultraRare && !row.dropOnly).map(row => row.name) : [];
        keepCurrencyDrop(enemy, R.currency, 1);
        const itemLevel = levelProgression.itemLevel(zone, enemy), cap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
        const item = levelProgression.stampItem(generateUniqueItem(cap, null, names.length ? rndChoice(names) : null, zone), itemLevel);
        if (item) keepEquipmentDrop(enemy, item, { guaranteedKeep: true });
    }

    // ---------------------------------------------------------------- 행운의 숫자
    /** 한 번에 준 피해(js/combat.js applyDamageToEnemyResource)가 7로만 된 수면 그 자릿수의 재화. */
    function noteDamage(enemy, dealt) {
        if (!(dealt >= rule().lucky.min) || dealt % 10 !== 7 || game.isBackgroundCalculation || !/^7+$/.test(String(dealt))) return;
        const rows = rule().lucky.rewards, [key, count] = rows[Math.min(rows.length - 1, String(dealt).length - 3)];
        keepCurrencyDrop(enemy, key, count);
        tell(`행운의 숫자 ${dealt.toLocaleString('ko-KR')}이 나왔습니다.`, 'reward');
    }
    return Object.freeze({ dressPack, glazeOf, tick, onKill, noteDamage, testSpawn, testYawn });
})();
safeExposeGlobals({ combatIncidents });
