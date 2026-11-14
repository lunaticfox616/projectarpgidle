import { runPlaceColonyRoomWave } from './colony-wave-rooms.mjs';

/** The five rooms repeat a readable threat order from data/bosses.js. */
export function runTuneColonyWaveEnemy(env, enemy, visual, originalHp) {
    enemy.monsterVisualId = visual.id;
    enemy.monsterVisualSetId = 'colony';
    enemy.baseMonsterName = visual.name;
    enemy.name = enemy.isBoss ? `👿 ${visual.name}` : enemy.isElite && enemy.traitName ? `${enemy.traitName} ${visual.name}` : visual.name;
    env.deps.assignEnemyGridCombatProfile(enemy);
    if (visual.id === 'hive-scout' || visual.id === 'hive-nurse') {
        enemy.ele = 'chaos';
        enemy.attackRange = env.deps.COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
        enemy.attackDelivery = 'projectileCell';
        enemy.projectileToEdge = true;
        enemy.attackCastMs = 800;
        enemy.attackCastSpecial = true;
        enemy.attackLabel = '독침 관통';
    }
    if (visual.id === 'colony-carapace-beetle') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.dr = Math.min(90, enemy.dr + 10);
        enemy.armor = Math.floor(enemy.armor * 1.25);
        enemy.attackSpeedVar *= 0.82;
    }
    if (enemy.maxEnergyShield > 0) {
        enemy.maxEnergyShield = Math.floor(enemy.maxEnergyShield * enemy.maxHp / originalHp);
        enemy.energyShield = enemy.maxEnergyShield;
    }
    enemy.hp = enemy.maxHp;
}

export function runColonyWaveEliteCount(count, waveNumber, pattern) {
    if (waveNumber === 1) return 0;
    const boss = pattern === 'overlord';
    const escorts = boss || pattern === 'carapace' ? 2 : 1;
    return Math.min(Math.max(0, count - Number(boss)), escorts + Math.min(2, Math.floor((waveNumber - 1) / 10)));
}

/** Combat owns wave spawns; persisted in-progress waves keep their original required kill count. */
export function runSpawnColonyWave(env){
    const c = env.owner.colony || {}, zone = env.deps.getZone('colony_run') || env.deps.getZone(0);
    const waveNumber = Math.max(1, Math.floor(c.wave || 1));
    const required = Math.max(1, Math.floor(c.requiredKills || env.deps.getColonyWaveEnemyCount(waveNumber)));
    const count = Math.max(0, required - Math.max(0, Math.floor(c.kills || 0)));
    const pattern = zone.wavePattern, formation = env.deps.REALM_MONSTER_VISUAL_SETS.colony.formations[pattern];
    const boss = pattern === 'overlord';
    const eliteCount = runColonyWaveEliteCount(count, waveNumber, pattern);
    const members = env.deps.REALM_MONSTER_VISUAL_SETS.colony.members, wave = [];
    const selection = { count, boss, eliteCount, formation, members };
    env.owner.enemies = [];
    for (let i = 0; i < count; i++) {
        wave.push(runCreateColonyWaveMember(env, zone, selection, i));
    }
    // A saved chain run finishes with its original room rules; a new arena sends each wave down three lanes.
    if (zone.exploration) runPlaceColonyRoomWave(env, wave);
    else env.owner.enemies = wave;
}

function runCreateColonyWaveMember(env, zone, selection, index) {
    const { count, boss, eliteCount, formation, members } = selection;
    const marker = { elite: index < eliteCount, boss: boss && index === count - 1 };
    const ids = marker.boss ? ['colony-boss'] : marker.elite ? formation.elite : formation.normal;
    const visual = members.find(member => member.id === ids[index % ids.length]);
    const enemy = env.deps.createEnemy(zone, marker, index);
    const originalHp = enemy.maxHp;
    enemy.maxHp = Math.floor(enemy.maxHp * (marker.elite ? 4.8 : 3.4));
    enemy.atkMul *= marker.boss ? 1.45 : (marker.elite ? 1.2 : 1.05);
    runTuneColonyWaveEnemy(env, enemy, visual, originalHp);
    return enemy;
}
