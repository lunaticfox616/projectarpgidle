

/** 뿌리 절단자의 공격 차례: 공격마다 예고하고 톱날을 갈아 낸다(js/combat-patterns.js getOwnPatternState). */
    export function invaderPatternState(env, attackNumber) {
        const grind = env.deps.RULE.grind;
        return { mode: 'rootGrinder', patternMode: 'rootGrinder', label: grind.label, damageMul: grind.damageMul, isSpecial: true, attackNumber,
            telegraphKind: 'grind', warningMs: grind.warningMs, recoveryMs: grind.recoveryMs };
    }

/** 뿌리 절단자 한 몸: 그 구역 보스의 수치에 배율을 곱한다. 숨은 기록과 보스 변종은 받지 않는다(createEnemy의 plainBoss). */
    export function invaderBuildGrinder(env, zone) {
        const enemy = env.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 0);
        const maxHp = Math.floor(enemy.maxHp * env.deps.RULE.hpMul);
        Object.assign(enemy, { name: `👿 ${env.deps.RULE.name}`, roomInvader: true, redEntrance: true, monsterVisualId: env.deps.RULE.actor, spriteVariantId: null, monsterVisualSetId: null,
            bossAssetKey: null, bossVisualTint: null, baseMonsterName: env.deps.RULE.name, maxHp, hp: maxHp, damageMul: enemy.damageMul * env.deps.RULE.damageMul,
            expMul: enemy.expMul * env.deps.RULE.expMul, stepSec: env.deps.RULE.stepSec, encounterOutline: env.deps.RULE.outline,
            patternMode: 'rootGrinder', nextPatternState: null, patternAttackCount: 0 });
        env.deps.assignEnemyGridCombatProfile(enemy);
        env.deps.refreshBossPatternPreview(enemy);
        return enemy;
    }

/** 그 보스 방의 보스가 하나 더(twin): 수치는 같고, 그림은 구역이 고른다(혼돈 심화처럼 보스 그림이 여럿인 곳은 다른 모습으로 선다). */
    export function invaderBuildTwin(env, zone, pack) {
        const enemy = env.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: pack.stage, plainBoss: true }, 1);
        if (zone.atlasStages) env.deps.atlasEndgame.tuneStage(enemy, zone, pack.stage);
        if (zone.memoryTier) env.deps.memoryDungeon.tuneBoss(enemy, zone.memoryTier);
        const maxHp = Math.floor(enemy.maxHp * env.deps.SURPRISE.twinHpMul);
        return Object.assign(enemy, { maxHp, hp: maxHp, redEntrance: true });
    }

/** 뿌리 절단자가 아닌 난입 보스: 수치는 그 구역 보스, 그림은 후보 가운데 싸우고 있는 보스(current, 없으면 null)가 아닌 하나. uninvited: 숨은 기록을 받지 않는다(wakeBosses). */
    export function invaderBuildVisitor(env, zone, current) {
        const actors = env.deps.MONSTER_STAGE_ROSTER.actors, own = current ? env.deps.getBossStageActor(current)?.id : null;
        const id = env.deps.rndChoice(env.deps.RULE.otherBosses.filter(look => actors[look] && look !== own));
        const enemy = env.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 2);
        Object.assign(enemy, { name: `👿 ${actors[id].name}`, uninvited: true, redEntrance: true, monsterVisualId: id, spriteVariantId: null, monsterVisualSetId: null, bossAssetKey: null, bossVisualTint: null,
            baseMonsterName: actors[id].name, nextPatternState: null });
        env.deps.assignEnemyGridCombatProfile(enemy);
        env.deps.refreshBossPatternPreview(enemy);
        return enemy;
    }

/** 들이닥치는 보스: who는 'grinder'(뿌리 절단자) 또는 'other'. current: 싸우고 있는 보스, 없으면 null. */
    export function invaderBuildInvader(env, who, current) { return who === 'grinder' ? invaderBuildGrinder(env, env.deps.getZone(env.owner.currentZoneId)) : invaderBuildVisitor(env, env.deps.getZone(env.owner.currentZoneId), current); }

/** 몸이 다 들어가는 빈 칸들 가운데 want에 가장 가까운 칸. 그 방의 문 칸과 문 안쪽, 주인공 둘레 한 칸은 피한다. */
    export function invaderFreeSpot(env, map, room, enemy, want) {
        const blocked = env.deps.getGridBlockedCells(), hero = env.owner.gridPlayer, size = env.deps.getGridUnitFootprint(enemy);
        map.doors.filter(door => door.room === room.index).forEach(door => door.cells.concat(door.landings).forEach(at => blocked.add(invaderInvaderCellKey(env, at))));
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(env.deps.gridCellKey(hero.gx + dx, hero.gy + dy));
        const roomForBody = at => Array.from({ length: size.columns * size.rows }, (_, i) => ({ gx: at.gx + i % size.columns, gy: at.gy + Math.floor(i / size.columns) }))
            .every(cell => env.deps.actExplorationRooms.roomAt(map, cell) === room && !blocked.has(invaderInvaderCellKey(env, cell)));
        const spots = [];
        for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) if (roomForBody({ gx, gy })) spots.push({ gx, gy });
        const far = at => Math.abs(at.gx - want.gx) + Math.abs(at.gy - want.gy);
        return spots.sort((a, b) => far(a) - far(b))[0] || null;
    }

/** 주인공 맞은편에 세운다. 설 칸이 없으면 false. */
    export function invaderStand(env, map, room, enemy) {
        env.deps.fitBossFootprint(enemy);
        const side = env.owner.gridPlayer.gx <= room.gx ? 1 : -1;
        const want = { gx: Math.round(room.gx + side * room.radiusX * 0.45), gy: Math.round(room.gy) };
        let spot = invaderFreeSpot(env, map, room, enemy, want);
        if (!spot && enemy.footprint) { delete enemy.footprint; spot = invaderFreeSpot(env, map, room, enemy, want); }
        if (!spot) return false;
        Object.assign(enemy, spot, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
        return true;
    }

export function invaderInvaderCellKey(env, at) { return env.deps.gridCellKey(at.gx, at.gy); }
