// Run inside game-runtime's isolated VM. Counts authored packs, not combat time or survival.
module.exports = function simulateLevelProgression(season = 1, expGain = 0) {
    const previousGame = game, previousRandom = Math.random;
    let seed = 911;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    try {
        game = JSON.parse(JSON.stringify(defaultGame)); game.season = season;
        const rows = [];
        for (let id = 0; id <= 10; id++) {
            const zone = getZone(id); game.currentZoneId = id;
            const entry = game.level;
            const enemies = generateEncounterPlan(zone).flatMap(marker => Array.from({ length: marker.count }, (_, n) =>
                ({ isBoss: !!marker.boss && n === 0, isElite: !!marker.elite })));
            for (const enemy of enemies) {
                enemy.level = levelProgression.monsterLevel(zone, enemy);
                game.exp += getEnemyExperienceReward(enemy, { expGain });
                while (game.level < MAX_PLAYER_LEVEL && game.exp >= getExpReq(game.level)) {
                    game.exp -= getExpReq(game.level); game.level++;
                }
            }
            rows.push({ zone: zone.name, areaLevel: levelProgression.areaLevel(zone), entry, exit: game.level,
                kills: enemies.length, lootPercent: Math.round(levelProgression.rewardMultiplier(zone, {}, game.level) * 100) });
        }
        return rows;
    } finally { game = previousGame; Math.random = previousRandom; }
};
