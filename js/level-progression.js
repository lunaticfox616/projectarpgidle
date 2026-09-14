const levelProgression = (() => {
    const ordinaryCurrencies = new Set(LEVEL_PROGRESSION.ordinaryCurrencies);
    function interpolate(value, reverse = false) {
        const points = LEVEL_PROGRESSION.tierAnchors;
        const x = Number(reverse), y = 1 - x;
        let right = points.findIndex(point => point[x] >= value);
        if (right === 0) return points[0][y];
        if (right < 0) right = points.length - 1;
        const a = points[right - 1], b = points[right];
        return a[y] + (value - a[x]) * (b[y] - a[y]) / (b[x] - a[x]);
    }
    function tierLevel(tier) { return Math.max(1, Math.round(interpolate(Math.max(1, Number(tier) || 1)))); }
    function areaLevel(zone) { return Math.max(1, Math.floor(Number(zone?.areaLevel) || tierLevel(zone?.tier))); }
    function monsterLevel(zone, enemy = {}) {
        if (Number.isFinite(enemy.level) && enemy.level > 0) return Math.floor(enemy.level);
        const bonus = enemy.isBoss || enemy.boss ? 2 : Number(!!(enemy.isElite || enemy.elite));
        return areaLevel(zone) + bonus;
    }
    // Monster levels can exceed the player cap in deep realms; extend the reward table linearly.
    function monsterExperience(level) {
        const rewards = LEVEL_PROGRESSION.monsterExperience;
        const index = Math.max(0, Math.floor(level) - 1);
        if (index < rewards.length) return rewards[index];
        return rewards[rewards.length - 1] + (index - rewards.length + 1) * LEVEL_PROGRESSION.monsterExperienceOverflowStep;
    }
    function penalty(playerLevel, enemyLevel, kind) {
        const free = kind === 'experience' ? LEVEL_PROGRESSION.experienceGap : LEVEL_PROGRESSION.lootGap;
        const decay = kind === 'experience' ? LEVEL_PROGRESSION.experienceDecay : LEVEL_PROGRESSION.lootDecay;
        return Math.exp(-Math.max(0, playerLevel - enemyLevel - free) * decay);
    }
    function rewardMultiplier(zone, enemy, playerLevel, kind = 'loot') {
        return penalty(playerLevel, monsterLevel(zone, enemy), kind);
    }
    // Loop acceleration helps catch up, then tapers before the normal loot-gap threshold.
    // Item XP bonuses and the level-only reward penalty remain independent of this bonus.
    function loopExperienceMultiplier(season, playerLevel, enemyLevel) {
        const config = LEVEL_PROGRESSION;
        const bonus = Math.min(config.loopExperienceBonusCap, Math.max(0, season - 1) * config.loopExperiencePerLoop);
        const gap = playerLevel - enemyLevel;
        const acceleration = Math.max(0, Math.min(1, (config.lootGap - gap) / (config.lootGap - config.experienceGap)));
        return config.loopExperienceBase + bonus * acceleration;
    }
    function filterCurrencyDrops(drops, multiplier) {
        if (multiplier >= 1) return drops;
        return drops.filter(([key]) => !ordinaryCurrencies.has(key) || Math.random() < multiplier);
    }
    function baseFor(item) {
        return BASE_ITEM_DB.find(base => base.id === item.baseId)
            || BASE_ITEM_DB.find(base => base.slot === item.slot && base.name === item.baseName);
    }
    function attributeWeights(base) {
        if (base.slot === '무기') return base.requirementWeights;
        if (['반지','목걸이','허리띠'].includes(base.slot)) return {};
        const defenses = { armor: 'strength', evasion: 'dexterity', energyShield: 'intelligence' };
        const types = base.baseStats.filter(stat => defenses[stat.id]).map(stat => defenses[stat.id]);
        return Object.fromEntries(types.map(type => [type, 1 / Math.sqrt(types.length)]));
    }
    function requirements(item) {
        const unique = item.rarity === 'unique' && UNIQUE_EQUIPMENT_RULES[item.name];
        const base = baseFor(item);
        if (unique && (!base || base.id === unique.baseId)) return { level: unique.level, attributes: { ...unique.attributes } };
        const req = base ? baseRequirements(base) : { level: 1, attributes: {} };
        if (!unique) return req;
        // A crafted base upgrade keeps the unique gate and also requires the stronger base's attributes.
        const keys = new Set([...Object.keys(req.attributes), ...Object.keys(unique.attributes)]);
        return { level: Math.max(req.level, unique.level), attributes: Object.fromEntries([...keys]
            .map(key => [key, Math.max(req.attributes[key] || 0, unique.attributes[key] || 0)])) };
    }
    function baseRequirements(base) {
        const config = LEVEL_PROGRESSION;
        const tier = Math.max(1, Math.min(config.attributeRequirements.length, base.reqTier));
        const value = config.attributeRequirements[tier - 1];
        return { level: Math.max(1, tierLevel(base.reqTier) - config.equipmentLevelDiscount),
            attributes: Object.fromEntries(Object.entries(attributeWeights(base)).map(([key, weight]) => [key, Math.round(value * weight)])) };
    }
    function stampItem(item, monsterLv) {
        if (!item) return item;
        const sourceTier = item.hiddenTier || item.itemTier || 1;
        const level = [monsterLv, item.itemLevel, tierLevel(sourceTier), 1].map(Number)
            .find(value => Number.isFinite(value) && value > 0);
        item.itemLevel = Math.max(1, Math.floor(level));
        item.requirementsVersion = 1;
        return item;
    }
    function affixCap(level) { return Math.max(1, Math.min(20, Math.floor(interpolate(level, true)))); }
    function combatZone(zone) {
        return Number.isFinite(zone.areaLevel) ? { ...zone, tier: interpolate(zone.areaLevel, true) } : zone;
    }
    return Object.freeze({ tierLevel, areaLevel, monsterLevel, monsterExperience, penalty, rewardMultiplier, loopExperienceMultiplier, filterCurrencyDrops,
        requirements, stampItem, affixCap, combatZone,
        maxDropTier: level => Math.max(1, Math.floor(interpolate(level, true))) });
})();
