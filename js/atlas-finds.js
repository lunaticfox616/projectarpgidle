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
    /** A unique of the zone's pools at the kill's item level (as an equipment drop rolling unique would make it). */
    function grantTreasureUnique(enemy, zone) {
        const itemLevel = levelProgression.itemLevel(zone, enemy);
        const cap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
        const item = levelProgression.stampItem(generateUniqueItem(cap, null, null, zone), itemLevel);
        return keepEquipmentDrop(enemy, item, { guaranteedKeep: true }) ? [item] : [];
    }
    /** The treasure carrier fell: rolls draws from one drops omen, rare gear and sometimes a unique, all on its cell. */
    function burstTreasure(enemy, zone) {
        const rules = LOOT_OMENS.treasure, { omen, drops } = lootOmens.treasureDrops(zone, game, Math.random);
        const granted = drops.filter(drop => grantOmenDrop(enemy, zone, drop)).length;
        const items = [];
        for (let i = 0; i < rules.rareGear; i++) items.push(...grantEquipmentPick(enemy, zone, 'rare'));
        if (Math.random() < rules.uniqueChance) items.push(...grantTreasureUnique(enemy, zone));
        dispatchRuntimeEvent('atlas-find', { kind: 'treasure', omen: omen ? omen.id : null, name: enemy.name, count: granted + items.length,
            unique: items.some(item => item.rarity === 'unique'), cell: { gx: enemy.gx, gy: enemy.gy } });
    }
    /** A picked-up memory leaf (js/memory-leaves.js): counted, then announced ('memory-leaf', js/memory-leaves-ui.js). */
    function receiveMemoryLeaf(id) {
        const result = memoryLeaves.receive(game, id);
        if (result) dispatchRuntimeEvent('memory-leaf', result);
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
        const leaf = memoryLeaves.rollKill(zone, enemy, Math.random);
        if (leaf) grantMemoryLeaf(enemy, leaf);
        if (enemy.treasureCarrier) burstTreasure(enemy, zone);
    }
    /** An ordinary atlas pack that carries treasure (lootOmens.isTreasurePack): one of its ordinary monsters shines gold (an elite keeps
     * its trait colour, js/ui.js getEnemyOutlineStyle, so it carries the treasure only in a pack of elites). */
    function dressTreasurePack(zone, pack) {
        if (pack.alert || !lootOmens.isTreasurePack(zone, pack)) return;
        const rules = LOOT_OMENS.treasure, leader = pack.waiting.find(enemy => !enemy.isElite) || pack.waiting[0];
        pack.treasure = true;
        Object.assign(leader, { treasureCarrier: true, name: `${rules.prefix} ${leader.name}`, encounterOutline: rules.outline,
            encounterSparks: rules.sparks });
    }
    return Object.freeze({ onAtlasKill, dressTreasurePack, receiveMemoryLeaf });
})();
safeExposeGlobals({ atlasFinds });
