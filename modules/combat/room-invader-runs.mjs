import { invaderBuildInvader, invaderStand, invaderBuildTwin } from './room-invader-bodies.mjs';
import { FORCED_ROOM } from './room-invader-values.mjs';

export function invaderOpenZone(env, zone) { return !!zone && env.deps.RULE.zoneTypes.includes(zone.type); }

/** 들이닥치는 연출과 그 동안의 기다림: run.motionTimeMs가 입장 시계다(js/act-exploration-state.js bossAwake). */
    export function* invaderCueEntrance(env, run, pack, enemy) {
        env.deps.actExplorationState.openEntrance(run, pack, { at: run.motionTimeMs, holdMs: env.deps.RULE.entranceMs, roomId: pack.roomId });
        (yield { kind: 'addBattleFx', args: ['bossEntrance', { enemies: [enemy], enemyIds: [enemy.id], holdMs: env.deps.RULE.entranceMs, duration: env.deps.RULE.entranceMs + 600, red: true }] });
        (yield { kind: 'dispatchRuntimeEvent', args: ['room-invader', { kind: 'arrived', name: enemy.baseMonsterName }] });
    }

export function invaderInvaded(run) { return run.packs.some(pack => pack.invader); }

export function invaderRollWho(env) { return Math.random() < env.deps.RULE.grinderShare ? 'grinder' : 'other'; }

/** 그 방에 난입 보스를 세운다. @returns {boolean} 세웠는지 */
    export function* invaderInvade(env, run, map, room, who) {
        const enemy = invaderBuildInvader(env, who, null);
        if (!invaderStand(env, map, room, enemy)) return false;
        const pack = { key: `${room.id}:invader`, roomId: room.id, stage: null, waiting: [enemy], aliveIds: [enemy.id], eliteIds: [], invader: true };
        enemy.explorationPack = pack.key;
        run.packs.push(pack);
        yield* invaderCueEntrance(env, run, pack, enemy);
        return true;
    }

export function invaderHasLiveMonsters(run, room) { return run.packs.some(pack => pack.roomId === room.id && pack.aliveIds.length > 0); }

export function invaderNewRoom(run, room) { return ['battle', 'elite', 'optional'].includes(room.role) && !run.visitedRooms.includes(room.id) && invaderHasLiveMonsters(run, room); }

/** 처음 들어서는 방에서 한 번 굴린다(js/act-exploration-doors.js cross). */
    export function* invaderRollRoom(env, run, map, room) {
        if (env.owner.isBackgroundCalculation || !room || invaderInvaded(run) || (env.owner.season || 1) < env.deps.RULE.fromLoop || !invaderOpenZone(env, env.deps.getZone(env.owner.currentZoneId))) return false;
        return invaderNewRoom(run, room) && Math.random() < env.deps.RULE.roomChance && (yield* invaderInvade(env, run, map, room, invaderRollWho(env)));
    }

/** 이 루프에 보스 방에서 일이 벌어질 확률(0~1). */
    export function invaderSurpriseChance(env, loop) { return Math.min(env.deps.SURPRISE.cap, Math.max(0, loop - env.deps.SURPRISE.fromLoop + 1) * env.deps.SURPRISE.perLoop); }

export function invaderRollSurpriseKind(env) { return Math.random() < env.deps.SURPRISE.twinShare ? 'twin' : invaderRollWho(env) === 'grinder' ? 'grinder' : 'extra'; }

/** run.bossSurprise: 보스가 둘이면 끝난 일이고, 들이닥치는 쪽은 who(grinder 또는 other)가 보스가 맞아 내려갈 때를 기다린다. */
    export function invaderSurpriseRecord(kind, packKey) { return kind === 'twin' ? { kind, key: packKey, done: true } : { kind: 'extra', who: kind === 'grinder' ? 'grinder' : 'other', key: packKey, done: false }; }

export function invaderChooseSurprise(env, run) {
        const forced = run.bossSurpriseForce;
        if (forced) return forced;
        if (env.owner.isBackgroundCalculation || !invaderOpenZone(env, env.deps.getZone(env.owner.currentZoneId))) return null;
        return Math.random() < invaderSurpriseChance(env, env.owner.season || 1) ? invaderRollSurpriseKind(env) : null;
    }

/** 보스가 하나 더: 입장 연출에 함께 선다. */
    export function* invaderAddTwin(env, run, map, pack) {
        const room = map.rooms.find(row => row.id === pack.roomId), enemy = invaderBuildTwin(env, env.deps.getZone(env.owner.currentZoneId), pack);
        if (!invaderStand(env, map, room, enemy)) return;
        enemy.explorationPack = pack.key;
        pack.waiting.push(enemy);
        pack.aliveIds.push(enemy.id);
        pack.waiting.forEach(boss => { boss.redEntrance = true; });
        (yield { kind: 'dispatchRuntimeEvent', args: ['room-invader', { kind: 'twin' }] });
    }

/** 보스 방의 입장이 열리는 순간(js/act-exploration-progress.js watchEntrance): 탐험에 한 번 굴린다. */
    export function* invaderOnBossEntrance(env, run, pack) {
        if (run.bossSurprise !== undefined || pack.stage === null || pack.invader) return;
        const kind = pack.waiting.length === 1 && pack.waiting[0].isBoss ? invaderChooseSurprise(env, run) : null;
        delete run.bossSurpriseForce;
        run.bossSurprise = kind ? invaderSurpriseRecord(kind, pack.key) : null;
        if (kind === 'twin') yield* invaderAddTwin(env, run, env.deps.actExplorationDoors.stageMap(run), pack);
    }

/** 보스가 맞아 정해진 몫 아래로 내려가면 다른 보스가 그 방에 들이닥친다. 입장 연출이 끝나면 함께 덤빈다. */
    export function* invaderDropInExtra(env, run, map, { surprise, hurtBoss }) {
        const pack = run.packs.find(row => row.key === surprise.key), room = pack && map.rooms.find(row => row.id === pack.roomId);
        surprise.done = true;
        if (!room) return;
        const enemy = invaderBuildInvader(env, surprise.who, hurtBoss);
        if (!invaderStand(env, map, room, enemy)) return;
        enemy.explorationPack = pack.key;
        pack.waiting.push(enemy);
        pack.aliveIds.push(enemy.id);
        yield* invaderCueEntrance(env, run, pack, enemy);
    }

/** 전투 틱마다(js/combat-summon-stats.js prepareCombatTick). */
    export function* invaderTick(env) {
        const run = env.deps.actExplorationState.current(env.owner), surprise = run && run.status === 'active' ? run.bossSurprise : null;
        if (!surprise || surprise.kind !== 'extra' || surprise.done || env.owner.isBackgroundCalculation) return;
        const hurt = enemy => enemy.isBoss && enemy.hp > 0 && enemy.explorationPack === surprise.key && enemy.hp / enemy.maxHp <= env.deps.SURPRISE.extraAtHpShare;
        const boss = (env.owner.enemies || []).find(hurt), map = boss ? env.deps.actExplorationDoors.stageMap(run) : null;
        if (map) yield* invaderDropInExtra(env, run, map, { surprise, hurtBoss: boss });
    }

/** 뿌리 절단자를 쓰러뜨린 보람(js/combat-kill-rewards.js grantEnemyLoot): 여느 처치의 한 번에 더해 보스 드랍을 lootRolls번까지 굴린다. 빈 굴림을 버리는 곳은 js/combat-kill-rewards.js rollCurrencyAndGear. */
    export function* invaderGrantExtraLoot(env, enemy) {
        if (!enemy.roomInvader) return;
        for (let roll = 1; roll < env.deps.RULE.lootRolls; roll++) env.deps.rollLootForEnemy(enemy);
        (yield { kind: 'dispatchRuntimeEvent', args: ['room-invader', { kind: 'slain', name: env.deps.RULE.name }] });
    }

/** 시험판(js/dev-test-panel-ui.js): 'room', 'roomGrinder'는 지금 방에, 'twin', 'extra', 'grinder'는 다음 보스 입장에. */
    export function* invaderForce(env, kind) {
        const run = env.deps.actExplorationState.current(env.owner), map = run ? env.deps.actExplorationDoors.stageMap(run) : null;
        if (!map) return false;
        if (!FORCED_ROOM[kind]) { run.bossSurpriseForce = kind; delete run.bossSurprise; return true; }
        const room = env.deps.actExplorationRooms.roomAt(map, env.owner.gridPlayer);
        return !!room && room.role !== 'boss' && room.role !== 'entry' && !invaderInvaded(run) && (yield* invaderInvade(env, run, map, room, FORCED_ROOM[kind]));
    }
