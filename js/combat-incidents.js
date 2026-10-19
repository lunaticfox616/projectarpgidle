/** 잔잔한 사건 (data/act-exploration-maps.js ACT_EXPLORATION_INCIDENTS, 2026-10-20 사용자: "계속 같은 게임이라고 느껴지지 않도록
 * 낮은 확률로 나올만한 잔잔한 이벤트"). 사냥 중 낮은 확률로 일어나는 작은 일들이다.
 * - 금빛 수액 슬라임: 방 단위 무대의 보통 무리를 지을 때 드물게 무리 곁에 하나가 더 선다(dressPack). 덤비지 않고(noAttack) 영웅에게서
 *   먼 방 구석으로 달아나며(tick), 영웅과 같은 방에 든 뒤 fleeMs가 지나면 사라진다. 쓰러뜨리면 재화 몇 개와 희귀 장비 하나(onKill).
 *   아주 드물게 무지갯빛(체이싱 티어): 빛깔이 돌고, 황금률 하나와 고유 장비 하나(반은 체이싱 고유)를 더 준다.
 * - 길 잃은 몬스터: 슬라임이 서지 않은 보통 무리에 드물게 영웅이 가 본 다른 액트의 몬스터가 섞인다(addStray, 이름 앞에 '길 잃은').
 *   경험치를 더 주고 쓰러뜨리면 장비 하나.
 * - 잠든 무리: 슬라임이 서지 않은 보통 무리가 드물게 잠들어 있다(lullPack, 이름 앞에 '잠든', 머리 위에 z). 무리의 누가 다치거나 영웅이
 *   가까이 오면 무리째 깨어 잠시 멍하다(tickSleep).
 * - 황금 수액 잔치: 처음 들어선 전투 방에서 아주 드물게 그 방의 보통 몬스터가 모두 금빛 수액 슬라임이 된다(feast).
 * - 별똥별: 처음 들어선 전투 방에 드물게 별 하나가 떨어져 그 칸에 재화 하나를 남긴다(dropStar, 그림은 js/canvas-stage-incidents.js).
 * - 세계수의 하품: 처음 들어선 전투 방에서 아주 드물게 그 방의 몬스터가 잠든다(skillHeldUntil: 움직이지도 공격하지도 않는다).
 * - 행운의 숫자: 한 번에 준 피해가 7로만 된 수면 그 자릿수의 재화(noteDamage, js/combat.js applyDamageToEnemyResource).
 * 체이싱 고유 넷이 사건을 바꾼다(worn): 수액 냄새 밴 장화(슬라임 확률과 재화), 황금을 빚는 손(쓰러뜨린 몬스터가 슬라임으로 일어난다),
 * 일곱 번째 행운의 병(같은 숫자로만 된 피해도 행운의 숫자), 꿈결의 향로(하품 확률과 잠드는 시간). 굴림은 무리 열쇠와 방 번호로 정해 다른 난수를 밀지 않는다. 알림은 'incident' 이벤트로 보내고 알림 창이 띄운다(js/battle-ground-loot-ui.js).
 * 방치 정산과 1루프의 액트 1에서는 일어나지 않는다.
 */
const combatIncidents = (() => {
    const rule = () => ACT_EXPLORATION_INCIDENTS;
    const draw = (tag, key) => (Math.abs(hashSeed(`${tag}:${key}`)) % 100000) / 100000;
    const quiet = zone => !!game.isBackgroundCalculation || !zone || (zone.type === 'act' && zone.id === 0 && (game.season || 1) === 1);
    const tell = (text, tone, chase = false) => dispatchRuntimeEvent('incident', { text, tone, chase });
    const sleptRooms = new WeakMap();   // 탐험 → 하품을 굴려 본 방(처음 들어설 때 한 번)
    let luckyAt = -Infinity;            // 마지막 행운의 숫자(전투 시각)
    const stars = [];                   // 떨어지는 중인 별똥별 { run, cell, key, at(닿는 전투 시각) }
    /** 착용한(요구 능력치를 채워 켜진) 고유 장비의 그 효과의 값(uniqueEffectParams), 없으면 null. */
    function worn(key) {
        for (const item of Object.values(combatEquipmentStats.activeEquipment(game) || {})) {
            if (item && item.rarity === 'unique' && item.uniqueEffectKey === key) return item.uniqueEffectParams || {};
        }
        return null;
    }

    // ---------------------------------------------------------------- 금빛 수액 슬라임
    /** 금빛 슬라임이 서고 잠들어도 되는 무리: 방 단위 무대의 보통 무리. */
    function plainPack(pack) {
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
    /** 무리를 지을 때(js/combat.js createActExplorationPack): 드물게 금빛 수액 슬라임 하나를 무리 곁에 더하고, 그러지 않은 무리는
     * 드물게 길 잃은 몬스터를 데리고 있거나(addStray) 잠들어 있다(lullPack, 길 잃은 몬스터도 함께 잔다). */
    function dressPack(zone, pack) {
        if (quiet(zone) || !plainPack(pack) || addCritter(zone, pack)) return pack;
        addStray(zone, pack);
        lullPack(pack);
        return pack;
    }
    /** 금빛 수액 슬라임 하나를 무리 곁에(수액 냄새 밴 장화를 끼면 chanceMul배 자주). 세웠는지. */
    function addCritter(zone, pack) {
        const C = rule().critter, lure = worn('critterLure'), chance = C.chance * (lure ? lure.chanceMul : 1), key = `${pack.key}:${pack.aliveIds[0]}`;
        const cell = draw('critter', key) < chance ? besidePack(pack) : null;
        if (!cell) return false;
        const critter = makeCritter(zone, pack, cell, draw('rainbow', key) < C.rainbow.chance);
        pack.waiting.push(critter);
        pack.aliveIds.push(critter.id);
        return true;
    }
    /** 그 무리의 금빛(rainbow면 무지갯빛) 수액 슬라임 하나: 그 구역의 보통 몬스터를 바탕으로 한다. */
    function makeCritter(zone, pack, cell, rainbow) {
        const critter = createEnemy(zone, { at: 0, count: 1, boss: false, elite: false, storyStage: null }, pack.waiting.length);
        return Object.assign(dressCritter(critter, rainbow), cell, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0, explorationPack: pack.key });
    }
    /** 몬스터를 금빛(rainbow면 무지갯빛) 수액 슬라임으로: 그림, 이름, 생명력(hpMul배), 덤비지 않음, 경험치(expMul배), 테. */
    function dressCritter(enemy, rainbow) {
        const C = rule().critter, maxHp = Math.ceil(enemy.maxHp * C.hpMul);
        return Object.assign(enemy, {
            name: rainbow ? C.rainbow.name : C.name, spriteVariantId: C.look, monsterVisualId: C.look, monsterArchetype: null, realmVisual: null,
            hp: maxHp, maxHp, noAttack: true, critter: rainbow ? 'rainbow' : 'gold', encounterOutline: C.outline,
            expMul: (Number(enemy.expMul) || 1) * C.expMul });
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
        if (rainbow || !enemy.feast) tell(rainbow ? '무지갯빛 수액 슬라임이 달아났습니다.' : '금빛 수액 슬라임이 달아났습니다.', 'warning');
        return true;
    }

    // ---------------------------------------------------------------- 길 잃은 몬스터
    /** 무리의 첫 보통 몬스터(액트 그림을 쓰고 무기를 든 뿌리촉수가 아닌)를 다른 액트의 몬스터로: 그 그림과 이름, 테, 그 그림의 싸우는
     * 방식(js/combat-grid.js assignEnemyGridCombatProfile), 경험치 expMul배. */
    function addStray(zone, pack) {
        const key = `${pack.key}:${pack.aliveIds[0]}`;
        const enemy = draw('stray', key) < rule().stray.chance ? pack.waiting.find(member => !member.isElite && plainLook(member)) : null;
        const look = enemy ? strayLook(zone, key) : null;
        if (look) dressStray(enemy, look);
    }
    const plainLook = enemy => { const def = ACT_MONSTER_VISUAL_BY_ID[enemy.spriteVariantId]; return !!def && !def.weapon && !enemy.monsterVisualId; };
    /** 영웅이 가 본 액트(game.maxZoneId까지)의 몬스터 그림 가운데 이 지역 목록에 없는 것 하나. 없으면(1액트만 가 봤으면) null. */
    function strayLook(zone, key) {
        const here = new Set(getActMonsterPool(zone)), reached = Math.min(Math.floor(Number(game.maxZoneId) || 0), MAP_ZONES.length - 1);
        const acts = MAP_ZONES.slice(0, reached + 1).filter(row => row && row.type === 'act');
        const ids = [...new Set(acts.flatMap(row => getActMonsterPool(row)))].filter(id => !here.has(id));
        return ids.length ? ACT_MONSTER_VISUAL_BY_ID[ids[Math.floor(draw('strayLook', key) * ids.length)]] || null : null;
    }
    /** 그 몬스터를 길 잃은 몬스터로: 그 그림(look)과 이름 앞에 prefix, 테, 경험치 expMul배, 그 그림의 싸우는 방식. true. */
    function dressStray(enemy, look) {
        const S = rule().stray;
        Object.assign(enemy, { stray: true, name: `${S.prefix} ${look.name}`, baseMonsterName: look.name, spriteVariantId: look.id, encounterOutline: S.outline,
            expMul: (Number(enemy.expMul) || 1) * S.expMul });
        assignEnemyGridCombatProfile(enemy);
        return true;
    }
    /** 시험 패널: 지금 방의 첫 보통 몬스터를 길 잃은 몬스터로. 바꿨는지. */
    function testStray() {
        const enemy = (game.enemies || []).find(row => row && row.hp > 0 && !row.isBoss && !row.isElite && !row.critter && !row.stray && plainLook(row));
        const look = enemy ? strayLook(getZone(game.currentZoneId), `test:${enemy.id}`) : null;
        return look ? dressStray(enemy, look) : false;
    }

    // ---------------------------------------------------------------- 잠든 무리
    const lull = enemy => Object.assign(enemy, { asleep: true, awakeName: enemy.name, name: `${rule().sleep.prefix} ${enemy.name}`, encounterOutline: rule().sleep.outline });
    /** 드물게 무리가 잠들어 있다(pack.sleep, 습격방에 모이지 않는다): 이름 앞에 prefix와 테. 깨기 전에는 움직이지도 공격하지도 않는다. */
    function lullPack(pack) {
        if (draw('sleep', `${pack.key}:${pack.aliveIds[0]}`) >= rule().sleep.chance) return;
        pack.sleep = true;
        pack.waiting.forEach(lull);
    }
    /** 잠든 몬스터들: 무리의 누가 다쳤거나 영웅이 wakeCells 안에 든 무리는 모두 깨고, 나머지는 붙잡아 둔 채 z를 띄운다. */
    function tickSleep(sleepers, now) {
        const S = rule().sleep, hero = game.gridPlayer;
        const near = enemy => !!hero && hasGridCell(enemy) && gridChebyshevDist(enemy.gx, enemy.gy, hero.gx, hero.gy) <= S.wakeCells;
        const woken = new Set(sleepers.filter(enemy => enemy.hp < enemy.maxHp || near(enemy)).map(enemy => enemy.explorationPack));
        for (const enemy of sleepers) {
            if (woken.has(enemy.explorationPack)) wake(enemy, now);
            else doze(enemy, now);
        }
    }
    /** 깬 몬스터: 이름과 테가 돌아오고 groggyMs 동안 멍하다(머리 위에 !). */
    function wake(enemy, now) {
        const S = rule().sleep;
        Object.assign(enemy, { asleep: false, name: enemy.awakeName || enemy.name, encounterOutline: null });
        enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + S.groggyMs);
        addBattleFx('statusText', { enemyId: enemy.id, text: '!', color: S.outline, duration: 420 });
    }
    /** 자는 몬스터: 다음 틱까지 붙잡아 두고 zEveryMs마다(몬스터마다 조금씩 어긋나게) 머리 위에 z. */
    function doze(enemy, now) {
        const S = rule().sleep;
        enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + 400);
        if (Number(enemy.sleepZAt) > now) return;
        enemy.sleepZAt = now + S.zEveryMs + (Math.abs(enemy.id || 0) % 5) * 120;
        addBattleFx('statusText', { enemyId: enemy.id, text: 'z', color: S.zColor, duration: 900 });
    }
    /** 시험 패널: 지금 방의 보통 몬스터를 잠재운다(생명력을 채워서). 잠재웠는지. */
    function testSleep() {
        const here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss && !enemy.critter && !enemy.asleep);
        here.forEach(enemy => { lull(enemy).hp = enemy.maxHp; });
        return here.length > 0;
    }

    // ---------------------------------------------------------------- 황금 수액 잔치
    /** 황금 수액 잔치: 그 방의 보통 몬스터가 모두 금빛 수액 슬라임이 된다(무지갯빛은 critter.rainbow.chance대로). 잔치의 금빛 슬라임은
     * 저마다 알리지 않고 처음 본 때가 지금이다(무지갯빛은 따로 알리고 영웅이 잠근다). 열렸는지. */
    function feast(run, enemies, key) {
        const C = rule().critter, guests = enemies.filter(enemy => feastable(run, enemy));
        if (!guests.length) return false;
        guests.forEach((enemy, index) => {
            const rainbow = draw('rainbow', `feast:${key}:${index}`) < C.rainbow.chance;
            Object.assign(dressCritter(enemy, rainbow), { asleep: false, feast: true, critterSeenAt: rainbow ? 0 : getCombatTime() });
        });
        tell('황금 수액 잔치가 열렸습니다. 이 방의 몬스터가 모두 금빛 수액 슬라임이 되었습니다.', 'chase', true);
        return true;
    }
    /** 잔치에 드는 몬스터: 정예도 슬라임도 아니고, 방 단위 무대의 무리이되 조우, 구출, 보물, 붙박이 무리가 아니다. */
    function feastable(run, enemy) {
        const pack = !enemy.isElite && !enemy.critter && enemy.explorationPack ? run.packs.find(row => row.key === enemy.explorationPack) : null;
        return !!pack && pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.treasure;
    }
    /** 시험 패널: 지금 방에 황금 수액 잔치. 열렸는지. */
    function testFeast() {
        const run = actExplorationState.current(game), here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
        return !!run && feast(run, here, `test:${getCombatTime()}`);
    }

    // ---------------------------------------------------------------- 세계수의 하품
    const roomKey = (run, room) => `${run.layoutId || ''}:${run.seed || ''}:${room.id}`;
    /** 처음 들어선 전투 방: 아주 드물게 황금 수액 잔치가 열리거나, 세계수가 하품을 해 그 방의 몬스터가 잠든다. */
    function tickRoom(run, room, now) {
        if (!room || (room.role !== 'battle' && room.role !== 'optional')) return;
        const here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
        if (!here.length || !firstLook(run, room)) return;
        const key = roomKey(run, room);
        if (draw('feast', key) < rule().feast.chance && feast(run, here, key)) return;
        dropStar(run, room, key, now);
        if (draw('yawn', key) < yawnChance()) yawn(here, now);
    }
    /** 하품의 확률: 꿈결의 향로를 끼면 그 확률(chance). */
    function yawnChance() {
        const incense = worn('drowsyIncense');
        return Math.max(rule().yawn.chance, incense ? Number(incense.chance) || 0 : 0);
    }
    function yawn(enemies, now) {
        const incense = worn('drowsyIncense'), sleepMs = incense ? incense.sleepMs : rule().yawn.sleepMs;
        enemies.forEach(enemy => { enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + sleepMs); });
        tell('세계수가 하품을 했습니다. 이 방의 몬스터가 잠시 잠들었습니다.', 'reward');
    }
    /** 시험 패널: 지금 싸우는 몬스터에게 하품. */
    function testYawn() {
        const here = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
        if (here.length) yawn(here, getCombatTime());
        return here.length > 0;
    }

    // ---------------------------------------------------------------- 별똥별
    /** 처음 들어선 방에 chance의 확률로(forced면 반드시) 별 하나: 그림(battleFx 'fallingStar')을 띄우고 fallMs 뒤에 닿는다(landStars).
     * 떨어뜨렸는지. */
    function dropStar(run, room, key, now, forced = false) {
        const S = rule().star, roll = forced || draw('star', key) < S.chance;
        const map = roll && starRewards().length ? actExplorationDoors.stageMap(run) : null, cell = map ? starCell(map, room, key) : null;
        if (!cell) return false;
        addBattleFx('fallingStar', { cell, duration: S.fallMs + S.burstMs });
        stars.push({ run, cell, key, at: now + S.fallMs });
        return true;
    }
    /** 방 안쪽의 걸을 수 있는 칸 가운데 영웅에게서 두 칸 넘게 떨어진 곳(열두 번 굴려 처음 맞는 칸). 없으면 null. */
    function starCell(map, room, key) {
        const hero = game.gridPlayer, w = Math.max(1, room.x1 - room.x0 - 1), h = Math.max(1, room.y1 - room.y0 - 1);
        for (let i = 0; i < 12; i++) {
            const cell = { gx: room.x0 + 1 + Math.floor(draw('starX', key + i) * w), gy: room.y0 + 1 + Math.floor(draw('starY', key + i) * h) };
            if (actExplorationMap.walkable(map, cell) && (!hero || gridChebyshevDist(cell.gx, cell.gy, hero.gx, hero.gy) > 2)) return cell;
        }
        return null;
    }
    /** 지금 떨어질 수 있는 별똥별 보상(아직 열리지 않은 재화는 빠진다). */
    const starRewards = () => rule().star.rewards.filter(([currency]) => contentProgression.canDropCurrency(currency));
    /** 닿은 별똥별: 그 칸에 떨어질 수 있는 보상에서 하나와 알림. 그 사이 지도를 떠났으면 사라진다. */
    function landStars(run, now) {
        for (let i = stars.length - 1; i >= 0; i--) {
            if (stars[i].at > now) continue;
            const [star] = stars.splice(i, 1), rows = starRewards();
            if (star.run !== run || !rows.length) continue;
            const [currency, count] = rows[Math.floor(draw('starLoot', star.key) * rows.length)];
            if (keepCurrencyDrop(star.cell, currency, count).gain > 0) tell('별똥별이 떨어졌습니다.', 'reward');
        }
    }
    /** 시험 패널: 지금 방에 별똥별 하나. 떨어뜨렸는지. */
    function testStar() {
        const run = actExplorationState.current(game), room = run && actExplorationDoors.stageMap(run) ? actExplorationDoors.room(run) : null;
        return !!room && dropStar(run, room, `test:${getCombatTime()}`, getCombatTime(), true);
    }

    /** 이 방을 처음 보는가(몬스터가 선 방에 처음 들어선 때 한 번). */
    function firstLook(run, room) {
        let seen = sleptRooms.get(run);
        if (!seen) sleptRooms.set(run, seen = new Set());
        if (seen.has(room.id)) return false;
        seen.add(room.id);
        return true;
    }
    /** 전투 한 틱마다(js/combat.js prepareCombatTick): 슬라임이 달아나고, 잠든 무리가 자거나 깨고, 처음 들어선 방에서 잔치와 하품을 굴린다. */
    function tick() {
        const zone = getZone(game.currentZoneId), run = actExplorationState.current(game);
        if (quiet(zone) || !run || !game.enemies) return;
        const map = actExplorationDoors.stageMap(run), room = map ? actExplorationDoors.room(run) : null, now = getCombatTime();
        const live = game.enemies.filter(enemy => enemy && enemy.hp > 0);
        for (const enemy of live) if (enemy.critter) tickCritter(run, enemy, room, now);
        const sleepers = live.filter(enemy => enemy.asleep);
        if (sleepers.length) tickSleep(sleepers, now);
        if (stars.length) landStars(run, now);
        if (map) tickRoom(run, room, now);
    }
    /** 처치(js/combat.js countKillForContent): 길 잃은 몬스터의 장비, 잡은 슬라임의 보상과 알림. 슬라임이 아니면 황금을 빚는 손(rise). */
    function onKill(enemy, zone) {
        if (!enemy) return;
        if (enemy.stray && !quiet(zone)) grantEquipmentPick(enemy, zone, rule().stray.gear, null);
        if (!enemy.critter) return rise(enemy, zone);
        const rainbow = enemy.critter === 'rainbow';
        grantCritterRewards(enemy, zone);
        if (rainbow) grantRainbowRewards(enemy, zone);
        if (rainbow || !enemy.feast) tell(rainbow ? '무지갯빛 수액 슬라임을 잡았습니다.' : '금빛 수액 슬라임을 잡았습니다.', rainbow ? 'chase' : 'reward', rainbow);
    }
    /** 쓰러뜨린 몬스터(방 단위 무대의 무리, 보스 말고)가 그 자리에서 수액 슬라임으로 일어난다: 이번 루프의 lucky.kill번째 처치는
     * 무지갯빛으로, 황금을 빚는 손(goldenTouch)을 끼면 chance의 확률로 금빛(무지갯빛은 critter.rainbow.chance대로). 슬라임은 그 무리에 들어
     * 방이 끝나기 전에 선다(js/combat.js handleEnemyDeath가 죽은 몬스터를 무리에서 빼는 것은 이 뒤다). */
    function rise(enemy, zone) {
        if (quiet(zone) || enemy.isBoss || !enemy.explorationPack || !hasGridCell(enemy)) return;
        const kind = riseKind(), run = kind ? actExplorationState.current(game) : null;
        const pack = run ? run.packs.find(row => row.key === enemy.explorationPack) : null;
        if (!pack) return;
        const critter = makeCritter(zone, pack, { gx: enemy.gx, gy: enemy.gy }, kind !== 'gold');
        if (kind === 'lucky') tell(`이번 루프의 ${rule().lucky.kill.toLocaleString('ko-KR')}번째 처치입니다.`, 'chase', true);
        pack.aliveIds.push(critter.id);
        game.enemies.push(critter);
    }
    /** 이 처치가 일어나는 슬라임: 'lucky'(이번 루프의 lucky.kill번째, 무지갯빛), 'rainbow', 'gold', 아니면 ''. countKillForContent가 이
     * 처치를 game.loopKills에 더하는 것은 이 뒤라 지금 수에 1을 더해 센다. */
    function riseKind() {
        if (Math.floor(Number(game.loopKills) || 0) + 1 === rule().lucky.kill) return 'lucky';
        const touch = worn('goldenTouch');
        if (!touch || Math.random() >= touch.chance) return '';
        return Math.random() < rule().critter.rainbow.chance ? 'rainbow' : 'gold';
    }
    /** 금빛: 재화를 picks번 무게로 뽑고(열리지 않은 재화는 떨어지지 않는다), gear 등급 이상의 장비 하나. */
    function grantCritterRewards(enemy, zone) {
        const R = rule().critter.rewards, total = R.currencies.reduce((sum, row) => sum + row[2], 0), lure = worn('critterLure'), mul = lure ? lure.rewardMul : 1;
        for (let i = 0; i < R.picks; i++) {
            let edge = Math.random() * total;
            const row = R.currencies.find(([, , weight]) => (edge -= weight) < 0) || R.currencies[0];
            keepCurrencyDrop(enemy, row[0], row[1] * mul);
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
    /** 이 피해가 행운의 숫자인가: 같은 숫자로만 된 수의 { digit, length, mul }. 일곱 번째 행운의 병이 없으면 7로만 된 수(777 이상)만,
     * 병이 있으면 그 재화를 rewardMul배. 첫자리와 끝자리가 다르면 바로 그만 본다(거의 모든 피해). 아니면 null. */
    function luckyHit(dealt) {
        const text = String(dealt), digit = text[0];
        if (text[text.length - 1] !== digit || ![...text].every(ch => ch === digit)) return null;
        const luck = worn('repdigitLuck');
        return luck || (digit === '7' && dealt >= rule().lucky.min) ? { digit, length: text.length, mul: luck ? luck.rewardMul : 1 } : null;
    }
    /** 한 번에 준 피해(js/combat.js applyDamageToEnemyResource)가 행운의 숫자(111 이상)면 그 자릿수의 재화. 한 번 나오면 gapMs 동안 쉰다. */
    function noteDamage(enemy, dealt) {
        if (!(dealt >= 111) || game.isBackgroundCalculation) return;
        const hit = luckyHit(dealt), now = getCombatTime();
        if (!hit || now - luckyAt < rule().lucky.gapMs) return;
        luckyAt = now;
        const rows = rule().lucky.rewards, [key, count] = rows[Math.min(rows.length - 1, hit.length - 3)];
        keepCurrencyDrop(enemy, key, count * hit.mul);
        tell(`행운의 숫자 ${dealt.toLocaleString('ko-KR')}${'2459'.includes(hit.digit) ? '가' : '이'} 나왔습니다.`, 'reward');
    }
    return Object.freeze({ dressPack, glazeOf, tick, onKill, noteDamage, testSpawn, testYawn, testSleep, testFeast, testStray, testStar });
})();
safeExposeGlobals({ combatIncidents });
