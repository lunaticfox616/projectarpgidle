/** 아틀라스 처치에 덧붙는 발견(docs/endgame-loot-20261009.md 3절): 지도 기운의 처치 드랍과 보물 무리의 보물. js/atlas-run.js onKill이
 * 처치마다 부르고, js/combat.js createActExplorationPack이 무리를 만들 때 보물 무리를 꾸민다. 규칙은 js/loot-omens.js가 정하고, 받는
 * 길은 보통 처치와 같다: 재화는 keepCurrencyDrop(지도 바닥 더미), 장비는 keepEquipmentDrop, 주얼은 바닥이나 주얼함.
 * 보물이 터지면 'atlas-find' 이벤트로 알린다(기록과 화면은 UI가).
 */
const atlasFinds = (() => {
    /** One omen draw: a currency (count) or '@jewel'. Returns whether something was granted. */
    function grantOmenDrop(enemy, zone, [key, count]) {
        if (key === '@jewel') return grantOmenJewel(enemy, zone);
        return keepCurrencyDrop(enemy, key, count).gain > 0;
    }
    function grantOmenJewel(enemy, zone) {
        const jewel = generateJewelDrop(zone);
        if (placeFloorItem(enemy, 'jewel', jewel)) return true;
        const receipt = receiveJewelDrop(jewel);
        if (receipt.stored) queueEnemyGroundLoot(enemy, { item: jewel, itemKind: 'jewel', color: getJewelLootColor(jewel) });
        dispatchRuntimeEvent('jewel-drop-received', receipt);
        return true;
    }
    /** A unique of the zone's pools at the kill's item level (as an equipment drop rolling unique would make it), or the named one. */
    function grantTreasureUnique(enemy, zone, name = null) {
        const itemLevel = levelProgression.itemLevel(zone, enemy);
        const cap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
        const item = levelProgression.stampItem(generateUniqueItem(cap, null, name, zone), itemLevel);
        return keepEquipmentDrop(enemy, item, { guaranteedKeep: true }) ? [item] : [];
    }
    const chaseName = () => rndChoice(UNIQUE_DB.filter(row => row.ultraRare && !row.dropOnly).map(row => row.name));
    /** A golden treasure's jackpot: one rare currency or a chase unique. @returns {object[]} the chase unique, if that was it */
    function grantGoldenJackpot(enemy, zone) {
        const key = lootOmens.goldenJackpot(game, Math.random);
        if (key === '@chase') return grantTreasureUnique(enemy, zone, chaseName());
        keepCurrencyDrop(enemy, key, 1);
        return [];
    }
    /** The treasure carrier fell: rolls draws from one drops omen, rare gear and sometimes a unique, all on its cell. Golden treasure
     * rolls more, always holds a unique and adds a jackpot. */
    function burstTreasure(enemy, zone) {
        const rules = LOOT_OMENS.treasure, golden = !!enemy.goldenTreasure, { omen, drops } = lootOmens.treasureDrops(zone, game, Math.random, golden);
        const granted = drops.filter(drop => grantOmenDrop(enemy, zone, drop)).length;
        const items = [];
        for (let i = 0; i < rules.rareGear; i++) items.push(...grantEquipmentPick(enemy, zone, 'rare'));
        if (golden || Math.random() < rules.uniqueChance) items.push(...grantTreasureUnique(enemy, zone));
        if (golden) items.push(...grantGoldenJackpot(enemy, zone));
        game.atlas.tally.treasure += 1;
        game.atlas.tally.golden += Number(golden);
        dispatchRuntimeEvent('atlas-find', { kind: 'treasure', golden, omen: omen ? omen.id : null, name: enemy.name,
            count: granted + items.length + Number(golden), unique: items.some(item => item.rarity === 'unique'), cell: { gx: enemy.gx, gy: enemy.gy } });
    }
    const MAP_BOSS_KINDS = new Set(['map', 'guardian']);
    /** The map boss's own reward (data/loot-omens.js mapBoss): its pieces roll an ordinary monster's rarity bands, the first ones at least
     * the listed rarities, so the boss pile always holds gear without drawing on the unique budget. */
    function grantBossReward(enemy, zone) {
        const rules = LOOT_OMENS.mapBoss, count = rules.items + Number(Math.random() < rules.extraChance);
        const roller = { ...enemy, isBoss: false, isElite: false, uniqueChanceMul: 1 };
        for (let i = 0; i < count; i++) grantEquipmentPick(roller, zone, rules.minimum[i] || null);
    }
    /** A picked-up memory leaf (js/memory-leaves.js): counted, then announced ('memory-leaf', js/memory-leaves-ui.js). */
    function receiveMemoryLeaf(id) {
        const result = memoryLeaves.receive(game, id);
        if (!result) return result;
        combatLootReceipts.leaf(game, id);
        dispatchRuntimeEvent('memory-leaf', result);
        return result;
    }
    /** A leaf waits on the map floor like other drops (offline or off a map it is received at once). */
    function grantMemoryLeaf(enemy, id) {
        const run = explorationFloorFor(enemy);
        if (run) actExplorationState.groundLoot.placeLeaf(run, enemy, id);
        else receiveMemoryLeaf(id);
    }
    /** Every kill in an atlas map: the map omen's drops, a memory leaf now and then, and the treasure when the carrier falls. */
    function onAtlasKill(zone, enemy) {
        if (!zone || zone.type !== 'atlasMap') return;
        lootOmens.killDrops(zone, enemy, game, Math.random).forEach(drop => grantOmenDrop(enemy, zone, drop));
        lootOmens.strayDrops(zone, enemy, game, Math.random).forEach(drop => grantOmenDrop(enemy, zone, drop));
        const leaf = memoryLeaves.rollKill(zone, enemy, Math.random);
        if (leaf) grantMemoryLeaf(enemy, leaf);
        if (enemy.treasureCarrier) burstTreasure(enemy, zone);
        if (enemy.isBoss && MAP_BOSS_KINDS.has(zone.atlasKind) && !zone.memoryTier) grantBossReward(enemy, zone);
    }
    /** An ordinary atlas pack that carries treasure (lootOmens.isTreasurePack): one of its ordinary monsters shines gold (an elite keeps
     * its trait colour, js/ui.js getEnemyOutlineStyle, so it carries the treasure only in a pack of elites). */
    function dressTreasurePack(zone, pack) {
        if (pack.alert || !lootOmens.isTreasurePack(zone, pack)) return;
        const golden = lootOmens.isGoldenTreasure(pack), rules = golden ? LOOT_OMENS.treasure.golden : LOOT_OMENS.treasure;
        const leader = pack.waiting.find(enemy => !enemy.isElite) || pack.waiting[0];
        pack.treasure = true;
        Object.assign(leader, { treasureCarrier: true, goldenTreasure: golden, name: `${rules.prefix} ${leader.name}`, encounterOutline: rules.outline,
            encounterSparks: rules.sparks });
    }
    return Object.freeze({ onAtlasKill, dressTreasurePack, receiveMemoryLeaf });
})();
safeExposeGlobals({ atlasFinds });
