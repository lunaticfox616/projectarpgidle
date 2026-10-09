// 드랍 시뮬레이터의 게임 안쪽 절반(scripts/lib/drop-simulation.js가 game-runtime의 vm에 이 파일을 올린다). 프로덕션에서는 불러오지 않는다.
// 아틀라스 지도 한 판을 오프라인 정산(js/combat-replay-projection.js)과 같은 실제 처치 경로로 끝까지 정리한다: 무리 전원 처치
// (handleEnemyDeath), 상자 · 항아리 · 사건 열기(actExplorationProgress.objects.settleProjected), 보스 처치와 지도 완료
// (finishEncounterRun). 드랍 규칙은 게임 코드 그대로이고, 여기서는 받은 것을 기록만 한다. 기록하려고 감싸는 곳은 받는 끝(가방에
// 넣기, 주얼 받기, 야생 부적 알림, 젬 보상)뿐이고, 감싼 함수도 원래 계산을 그대로 부른다(가방에 넣기만 넣지 않는다: 가방 한도와
// 습득 조건이 드랍을 가리지 않게).
var dropSimulation = (() => {
    'use strict';
    let sink = null;
    const record = row => { if (sink) sink.push(row); };

    function wrapCapturePoints() {
        const required = ['addItemToInventory', 'receiveJewelDrop', 'announceWildTalisman', 'rollEnemyGemReward', 'handleEnemyDeath',
            'finishEncounterRun', 'startEncounterRun', 'getEquipmentGridVisualAsset'];
        const missing = required.filter(name => typeof globalThis[name] !== 'function');
        if (missing.length) throw new Error(`드랍 시뮬레이터가 쓰는 게임 함수가 없습니다: ${missing.join(', ')}`);
        globalThis.addItemToInventory = item => { normalizeItem(item); record({ kind: 'equipment', item }); return true; };
        const receiveJewel = globalThis.receiveJewelDrop;
        globalThis.receiveJewelDrop = jewel => {
            record({ kind: 'jewel', item: jewel });
            return { jewel, inventoryFull: false, protectOverflow: false, stored: true, shardGain: 0, real: receiveJewel };
        };
        globalThis.announceWildTalisman = drop => record({ kind: 'talisman', item: drop.item || null, currency: drop.currency || null });
        const rollGem = globalThis.rollEnemyGemReward;
        globalThis.rollEnemyGemReward = (enemy, awakening) => {
            const reward = rollGem(enemy, awakening);
            record({ kind: 'gem', reward });
            return reward;
        };
    }

    /** A loop-`loop` endgame hero (scripts/lib/offline-endgame-fixture.js already ran) with every content open and nothing filtered. */
    function prepare(loop) {
        game.season = loop;
        game.loopCount = loop - 1;
        game.atlas.unlocked = true;
        game.loopProgressCurrent = { ...(game.loopProgressCurrent || {}), chaos20Cleared: true };
        game.atlas.autoMap = false;
        Object.assign(game.settings, { itemFilterEnabled: false, autoSalvageEnabled: false, showLootLog: false, mapCompleteAction: 'stop',
            pauseGameOnOverlay: false, showDeathNotice: false });
        game.pendingLoopReady = false;
        game.pendingLoopDecision = false;
        game.combatHalted = false;
        // 오프라인 정산과 같이: 드랍은 바닥에 깔리지 않고 바로 들어오며(그래서 줍기를 기다리지 않고 지도가 끝난다), 화면 효과는 없다.
        game.isBackgroundCalculation = true;
        gameplayStarted = true;
        startupOverlayActive = false;
        playerStatCache.invalidate();
    }

    const MAP_NODE_IDS = () => ATLAS.regions.flatMap(region => ATLAS.nodes[region.id].map((row, slot) => ({ id: `${region.id}_${slot}`, tier: row[1] })));
    function pickNode(tier) {
        const nodes = MAP_NODE_IDS(), near = nodes.filter(node => Math.abs(node.tier - Math.min(16, tier)) <= 2);
        const pool = near.length ? near : nodes;
        return pool[Math.floor(Math.random() * pool.length)].id;
    }
    function rollRarity(choice) {
        if (choice === 'normal' || choice === 'magic' || choice === 'rare') return choice;
        const roll = Math.random();
        return roll < 0.35 ? 'rare' : roll < 0.75 ? 'magic' : 'normal';
    }
    function openMap(options) {
        const map = atlasMaps.create(pickNode(options.tier), options.tier, rollRarity(options.rarity), Math.random);
        map.uid = game.atlas.nextUid++;
        map.omen = options.omen && options.omen !== 'random' ? options.omen : lootOmens.roll(game, Math.random);
        if (options.quality) map.quality = options.quality;
        game.atlas.stash = [map];
        game.atlas.run = null;
        const reason = atlas.begin(game, map.uid, 30);
        if (reason) throw new Error(`지도를 열 수 없습니다: ${reason}`);
        game.currentZoneId = ATLAS.zoneId;
        game.moveTimer = 0;
        game.playerHp = getPlayerHpCap(getPlayerStats());
        startEncounterRun();
        return map;
    }
    function killEnemy(pack, enemy, pStats) {
        if (pack) pack.waiting = pack.waiting.filter(row => row !== enemy);
        const board = game.enemies.filter(row => row !== enemy);
        enemy.hp = 0;
        game.enemies = [enemy];
        handleEnemyDeath(enemy, pStats);
        game.enemies = board.concat(game.enemies);
        game.playerHp = getPlayerHpCap(pStats);
    }
    function clearMap(counts) {
        const run = actExplorationState.current(game), pStats = getPlayerStats();
        const stage = pack => (pack.stage === null || pack.stage === undefined ? -1 : pack.stage);
        for (const pack of run.packs.filter(row => !row.objectId).sort((a, b) => stage(a) - stage(b))) {
            for (const enemy of [...pack.waiting]) {
                counts[enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular']++;
                if (enemy.treasureCarrier) counts.treasure++;
                killEnemy(pack, enemy, pStats);
            }
        }
        for (const row of (run.objects && run.objects.entries) || []) {
            if (row.phase !== 'ready') continue;
            counts.objects++;
            actExplorationProgress.objects.settleProjected(run, row, enemy => { counts.regular++; killEnemy(null, enemy, pStats); });
        }
        if (!actExplorationProgress.canFinish()) throw new Error('보스를 잡았는데 지도를 끝낼 수 없습니다.');
        playerStatCache.during(finishEncounterRun);
    }

    const currencySnapshot = () => ({ ...game.currencies, condensedSkyPower: ensureSkyTowerState().condensedPower || 0 });
    function currencyGains(before, after) {
        const out = {};
        for (const key of Object.keys(after)) {
            const gain = Math.round((Number(after[key]) || 0) - (Number(before[key]) || 0));
            if (gain > 0) out[key] = gain;
        }
        return out;
    }
    /** Discovery tiers of the currencies a map gave (js/loot.js lootMoments), counted per unit. */
    function currencyMoments(gains) {
        const out = { good: 0, great: 0, jackpot: 0 };
        for (const [key, gain] of Object.entries(gains)) {
            const tier = lootMoments.ofCurrency(key);
            if (tier) out[tier] += gain;
        }
        return out;
    }
    const leafSnapshot = () => ({ counts: { ...game.atlas.leaves.counts }, seen: [...game.atlas.leaves.seen] });
    /** Leaves a map gave, the first sightings among them and the sets they filled. */
    function leafGains(before) {
        const now = game.atlas.leaves, gained = {};
        for (const [id, count] of Object.entries(now.counts)) if (count > (before.counts[id] || 0)) gained[id] = count - (before.counts[id] || 0);
        const filled = Object.keys(gained).filter(id => (before.counts[id] || 0) < memoryLeaves.leaf(id).set && now.counts[id] >= memoryLeaves.leaf(id).set);
        return { gained, first: now.seen.filter(id => !before.seen.includes(id)), filled };
    }
    const fragmentGains = (before, after) => Object.fromEntries(Object.entries(after).map(([id, count]) => [id, count - (before[id] || 0)])
        .filter(([, gain]) => gain > 0));

    /** One map from opening to completion: what it gave, by kind. */
    function runMap(options) {
        sink = [];
        const currencies = currencySnapshot(), fragments = { ...game.atlas.fragments }, leaves = leafSnapshot();
        const counts = { regular: 0, elite: 0, boss: 0, objects: 0, treasure: 0 };
        const map = openMap(options);
        const run = game.atlas.run, encounters = [...run.encounters], golden = [...run.golden];
        clearMap(counts);
        const result = game.atlas.lastResult || {};
        const maps = game.atlas.stash.filter(entry => entry.uid !== map.uid);
        const rows = sink, gains = currencyGains(currencies, currencySnapshot());
        sink = null;
        return { map: { node: map.node, tier: map.tier, rarity: map.rarity, mods: map.mods.map(atlasMaps.describe), encounters, golden,
            omen: lootOmens.describe(map.omen), omenStrength: map.omen ? lootOmens.strengthOf(map) : 0,
            outcome: result.outcome || 'unknown' }, counts, drops: rows.map(summarize), currencies: gains, currencyMoments: currencyMoments(gains),
            maps: maps.map(entry => ({ tier: entry.tier, rarity: entry.rarity, node: entry.node })),
            fragments: fragmentGains(fragments, game.atlas.fragments), leaves: leafGains(leaves) };
    }

    function summarize(row) {
        if (row.kind === 'equipment') return summarizeEquipment(row.item);
        if (row.kind === 'jewel') return { kind: 'jewel', name: row.item.name, rarity: row.item.rarity, moment: lootMoments.ofItem(row.item, 'jewel') };
        if (row.kind === 'talisman') return { kind: 'talisman', name: row.item ? row.item.name : null, currency: row.currency,
            moment: row.item ? lootMoments.ofItem(row.item, 'talisman') : null };
        const gem = row.reward.gem;
        return { kind: 'gem', gemKind: row.reward.kind, name: gem ? (gem.name || row.reward.name) : null, awakened: !!(gem && gem.awakened),
            shards: row.reward.shards };
    }
    function summarizeEquipment(item) {
        const unique = item.rarity === 'unique' ? UNIQUE_DB.find(entry => entry.name === item.name) : null;
        return { kind: 'equipment', name: item.name, baseName: item.baseName, slot: item.slot, rarity: item.rarity, tier: item.itemTier,
            chase: !!(unique && unique.ultraRare), corrupted: !!item.corrupted, exceptional: !!item.exceptionalBase,
            socket: !!(item.voidSocket || (item.sockets && item.sockets.length)), region: item.dropRegion || null, family: item.family || null,
            art: getEquipmentGridVisualAsset(item), moment: lootMoments.ofItem(item) };
    }

    return Object.freeze({ wrapCapturePoints, prepare, runMap });
})();
