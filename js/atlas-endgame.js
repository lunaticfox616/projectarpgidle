/** 아틀라스 후반부 (docs/atlas-pinnacles-20261002.md 2-1, 3절, data/atlas-endgame.js): 깨어남, 최종 보스 다섯과 리그 우두머리를 여는 조건과
 * 재료, 지도 속 마름의 사도 · 제단 · 리그 조각, 나이테의 목격, 보스 처치 보상과 단계별 특수기.
 * 상태는 game.atlas.endgame {kills, items, blight, witness, witnessed}: 루프를 넘어 남고 시대 재생 때 비운다.
 * 지도 장치 런(js/atlas.js · js/atlas-run.js)과 넓은 맵 무리(js/combat.js createActExplorationPack)가 이 모듈의 규칙을 부른다.
 * 런마다의 몫은 run.endgame {apostle, items, echoes}: 방에서 얻은 재료는 지도석처럼 보스를 잡을 때까지 런이 들고 있다.
 */
const atlasEndgame = (() => {
    const E = ATLAS_ENDGAME;
    const DEFS = new Map([...E.apexes.map(row => [row.id, { ...row, kind: 'apex' }]), ...E.leagues.map(row => [row.id, { ...row, kind: 'league' }])]);
    const LEAGUE_BY_ROOM = new Map(E.leagues.map(row => [row.room, row]));
    const APOSTLES = new Map(E.apostles.map(row => [row.id, row]));
    const ITEM_IDS = Object.freeze(Object.keys(E.items));
    const LATE_BOSSES = new Set(['guardian', 'pinnacle', 'apex', 'league']);

    const ledger = state => state.atlas.endgame;
    const defaults = () => ({ kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] });
    const kills = (state, id) => ledger(state).kills[id] || 0;
    /** 세계수의 그림자를 한 번이라도 쓰러뜨리면 아틀라스가 깨어난다(후반부가 열린다). */
    const awakened = state => kills(state, 'pinnacle') > 0;
    const count = (state, item) => ledger(state).items[item] || 0;
    function give(state, item, amount) {
        if (!(amount > 0) || !Object.hasOwn(E.items, item)) return 0;
        const before = count(state, item);
        ledger(state).items[item] = Math.min(E.itemCap, before + Math.floor(amount));
        return ledger(state).items[item] - before;
    }
    const def = id => DEFS.get(id) || null;
    const entryOf = row => (row.kind === 'league' ? [[row.item, row.need]] : row.entry);

    // ---------------------------------------------------------------- what is open
    function unlocked(state, row) {
        if (!awakened(state)) return false;
        return !(row.unlock && row.unlock.kill) || kills(state, row.unlock.kill) > 0;
    }
    function lockText(row) {
        if (row.unlock && row.unlock.kill) return `${def(row.unlock.kill).stages[0].name} 처치 뒤에 열립니다.`;
        return '세계수의 그림자(정점)를 쓰러뜨리면 아틀라스가 깨어나 열립니다.';
    }
    const missingOf = (state, row) => entryOf(row).filter(([item, need]) => count(state, item) < need);
    /** @returns {string} '' when the fight can open now, otherwise why not. */
    function entryReason(state, id) {
        const row = def(id);
        if (!row) return '없는 보스입니다.';
        const lock = atlas.lockReason(state);
        if (lock) return lock;
        if (state.atlas.run) return '이미 열린 지도가 있습니다. 먼저 마치거나 닫으세요.';
        if (!unlocked(state, row)) return lockText(row);
        const missing = missingOf(state, row);
        return missing.length ? `재료가 부족합니다: ${missing.map(([item, need]) => `${E.items[item].name} ${count(state, item)}/${need}`).join(', ')}` : '';
    }
    function spend(state, id) {
        for (const [item, need] of entryOf(def(id))) ledger(state).items[item] = count(state, item) - need;
    }
    /** Travel failed right after opening: the offering comes back. */
    function refund(state, id) {
        for (const [item, need] of entryOf(def(id))) give(state, item, need);
    }

    // ---------------------------------------------------------------- the run's share
    /** A blighted region's map is sometimes held by one of the elder's apostles instead of its own boss (after the gardener falls). */
    function rollApostle(state, node, random) {
        if (!node || node.kind !== 'map' || kills(state, 'apex_gardener') < 1) return null;
        const level = ledger(state).blight[node.region] || 0;
        if (random() * 100 >= level * E.blight.chancePerLevel) return null;
        const pool = E.apostles.filter(row => row.regions.includes(node.region));
        return pool.length ? pool[Math.floor(random() * pool.length)].id : null;
    }
    /** The weaver's echoes: the bosses she witnessed most recently (newest first). */
    const echoesFor = (state, node) => (node && node.id === 'apex_maven' ? ledger(state).witnessed.slice(-2).reverse() : []);
    function runExtra(state, node, random) {
        return { apostle: rollApostle(state, node, random), items: {}, echoes: echoesFor(state, node) };
    }
    /** Whole counts 1..cap under known keys only (unknown and broken entries are dropped). */
    function capped(raw, keys, cap) {
        const out = {};
        for (const key of keys) {
            const value = Math.floor(Number(raw && raw[key]) || 0);
            if (value > 0) out[key] = Math.min(cap, value);
        }
        return out;
    }
    const validEcho = row => Array.isArray(row) && typeof row[0] === 'string' && row[0].length <= 40 && Number.isInteger(row[1]) && row[1] >= 0 && row[1] <= 9;
    function normalizeRun(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return { apostle: APOSTLES.has(source.apostle) ? source.apostle : null, items: capped(source.items, ITEM_IDS, E.itemCap * 10),
            echoes: (Array.isArray(source.echoes) ? source.echoes : []).filter(validEcho).slice(0, 2) };
    }

    // ---------------------------------------------------------------- the zone and its bosses
    /** Boss multipliers on top of the node's own rules: an apostle hits harder than the map boss it replaces. */
    function bossBoost(run) {
        const apostle = run && run.endgame && run.endgame.apostle;
        return apostle ? { hp: E.blight.hpMul, damage: E.blight.damageMul } : { hp: 1, damage: 1 };
    }
    function stageName(row, stage, echoes) {
        if (!Number.isInteger(stage.echo)) return stage.name;
        const echo = echoes[stage.echo];
        return echo ? `엮인 메아리: ${echo[0]}` : `엮인 메아리: ${row.stages[0].name}`;
    }
    /** Zone fields an apostle map or a late fight adds (names, art, stage table, floor hazard). */
    function zoneExtras(run, node) {
        const extra = (run && run.endgame) || {}, apostle = APOSTLES.get(extra.apostle);
        if (node.kind === 'map' && apostle) return { bossName: apostle.name, bossAct: apostle.bossAct, atlasApostle: apostle.id };
        const row = def(node.id);
        if (!row) return {};
        const echoes = extra.echoes || [], names = row.stages.map(stage => stageName(row, stage, echoes));
        const out = { bossName: names[0], bossStageNames: names, atlasStages: row.id, atlasEchoes: echoes };
        // 바닥 위험은 시련 함정 양식이지만 그 보스의 원소로 터지고 기록에도 제 이름으로 남는다(js/combat.js dealTrialTrapDamage).
        if (row.hazard) Object.assign(out, { trialHazard: { ...row.hazard }, trapElements: [row.ele], trapName: E.hazardName });
        return out;
    }
    /** A late fight's stage body (js/combat.js createActExplorationPack): its own name, art and special attack; echoes are weaker copies. */
    function tuneStage(enemy, zone, stage) {
        const row = def(zone.atlasStages), body = row && row.stages[stage];
        if (!body) return enemy;
        // An echo stage stays an echo (weaker, tinted) even when fewer bosses were witnessed than it has echoes (it copies the weaver then).
        const isEcho = Number.isInteger(body.echo), echo = isEcho ? (zone.atlasEchoes || [])[body.echo] : null;
        const art = echo ? echo[1] : (Number.isInteger(body.bossAct) ? body.bossAct : row.bossAct);
        enemy.name = `👿 ${zone.bossStageNames[stage]}`;
        enemy.bossAssetKey = ACT_BOSS_ASSET_KEYS[art] || enemy.bossAssetKey;
        enemy.bossVisualTint = isEcho ? 200 : null;
        enemy.patternMode = 'apex';
        enemy.apexMechanic = body.mechanic;
        if (isEcho) { enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * E.witness.echoHpMul)); enemy.hp = enemy.maxHp; }
        return enemy;
    }
    /** Pattern state of a late boss's special (js/combat-patterns.js 'apex' mode): every n-th attack, the rest are its warning. */
    function patternState(mechanicId, attackNumber) {
        const rule = E.mechanics[mechanicId];
        if (!rule) return null;
        const n = Math.max(1, Math.floor(Number(attackNumber) || 1)), special = n % rule.every === 0;
        return { mode: mechanicId, patternMode: 'apex', label: special ? rule.name : `${rule.name} 전조`, damageMul: special ? rule.damageMul : 1,
            isSpecial: special, telegraphKind: rule.telegraph, attackNumber: n };
    }

    // ---------------------------------------------------------------- rooms in a map
    function roomItem(room) {
        if (E.altars[room]) return { item: E.altars[room].item, rate: E.altars[room].amount };
        const league = LEAGUE_BY_ROOM.get(room);
        return league ? { item: league.item, rate: league.shards } : null;
    }
    /** Expected base + perTier × tier; the fraction rolls one more. */
    const rolledAmount = (rate, tier, random) => { const expected = rate[0] + rate[1] * tier; return Math.floor(expected) + Number(random() < expected % 1); };
    const lateRun = state => (awakened(state) && state.atlas.run && state.atlas.run.endgame) || null;
    /** An emptied altar or league room (once awake): its late material waits in the run until the boss falls. @returns {Array} [[item, n]]. */
    function roomItems(state, zone, room, random = Math.random) {
        const held = lateRun(state), found = roomItem(room);
        if (!held || !found) return [];
        const amount = rolledAmount(found.rate, zone.atlasTier || 1, random);
        held.items[found.item] = (held.items[found.item] || 0) + amount;
        return amount > 0 ? [[found.item, amount]] : [];
    }

    // ---------------------------------------------------------------- a boss falls
    function witness(state, name, bossAct) {
        const book = ledger(state);
        book.witness += 1;
        book.witnessed = [...book.witnessed, [name, Number.isInteger(bossAct) ? bossAct : 9]].slice(-E.witness.keep);
        return book.witness % E.witness.per === 0 ? give(state, 'ringInvite', 1) : 0;
    }
    function keepHeld(state, run, out) {
        const extra = run.endgame || {};
        for (const [item, amount] of Object.entries(extra.items || {})) {
            const got = give(state, item, amount); // at the cap only part of it fits: tell what really came in
            if (got) out.items.push([item, got]);
        }
    }
    /** The material a late boss gives on top of its fight's spoils: guardians their shear, apostles their rot shard. */
    function bossMaterial(state, node, run, out) {
        if (node.kind === 'guardian' && E.guardianShears[node.region] && give(state, E.guardianShears[node.region], 1)) out.items.push([E.guardianShears[node.region], 1]);
        const apostle = APOSTLES.get(run.endgame && run.endgame.apostle);
        if (apostle && give(state, apostle.item, 1)) out.items.push([apostle.item, 1]);
    }
    function fightSpoils(state, node, out, first) {
        const row = def(node.id);
        if (!row) return;
        out.rewards = row.rewards.filter(([key]) => contentProgression.canDropCurrency(key));
        const chance = E.uniqueChance[row.kind] || 0;
        if (row.unique && (first || Math.random() < chance)) out.unique = row.unique;
    }
    /** Counts the kill (late bosses and apostles) and says whether this kill woke the atlas. */
    function countKill(state, node, apostle) {
        const wasAwake = awakened(state);
        if (LATE_BOSSES.has(node.kind)) ledger(state).kills[node.id] = kills(state, node.id) + 1;
        if (apostle) ledger(state).kills[apostle.id] = kills(state, apostle.id) + 1;
        return !wasAwake && awakened(state);
    }
    /** The weaver witnesses late bosses (not herself, nor the kill that woke the atlas). */
    function witnessKill(state, node, apostle) {
        if (apostle) return witness(state, apostle.name, apostle.bossAct);
        return LATE_BOSSES.has(node.kind) && node.id !== 'apex_maven' ? witness(state, node.boss, node.bossAct) : 0;
    }
    /** Boss down in a late-atlas run or a map (js/atlas.js complete): kills, awakening, materials, blight, witness and the fight's spoils.
     * @returns {object} what the result screen and the log tell. */
    function onComplete(state, node, run) {
        const out = { items: [], rewards: [], unique: null, awakened: false, invite: 0, blight: null };
        const apostle = APOSTLES.get(run.endgame && run.endgame.apostle) || null, first = kills(state, node.id) < 1;
        out.awakened = countKill(state, node, apostle);
        if (!awakened(state)) return out;
        keepHeld(state, run, out);
        bossMaterial(state, node, run, out);
        fightSpoils(state, node, out, first);
        if (node.kind === 'map' && kills(state, 'apex_gardener') > 0) out.blight = spreadBlight(state, node.region);
        if (!out.awakened) out.invite = witnessKill(state, node, apostle);
        return out;
    }
    function spreadBlight(state, region) {
        const book = ledger(state).blight;
        book[region] = Math.min(E.blight.max, (book[region] || 0) + E.blight.perMap);
        return { region, level: book[region] };
    }

    // ---------------------------------------------------------------- save boundary, epoch, view
    const KILL_IDS = Object.freeze([...DEFS.keys(), ...APOSTLES.keys(), 'pinnacle', ...ATLAS.regions.map(region => `${region.id}_g`)]);
    /** @param {boolean} pinnacleDone the shadow is a completed node: a save from before the late atlas (or one that lost it) wakes. */
    function normalize(raw, pinnacleDone = false) {
        const source = raw && typeof raw === 'object' ? raw : {}, kills = capped(source.kills, KILL_IDS, 1e6);
        if (pinnacleDone && !kills.pinnacle) kills.pinnacle = 1;
        return { kills, items: capped(source.items, ITEM_IDS, E.itemCap),
            blight: capped(source.blight, ATLAS.regions.map(region => region.id), E.blight.max),
            witness: Math.max(0, Math.min(1e6, Math.floor(Number(source.witness) || 0))),
            witnessed: (Array.isArray(source.witnessed) ? source.witnessed : []).filter(validEcho).slice(-E.witness.keep) };
    }
    /** 시대 재생: 후반부 진행(깨어남, 처치, 재료, 마름, 목격)도 되돌린다. */
    function reset(state) { state.atlas.endgame = defaults(); }
    /** Everything the late-atlas view shows. */
    function overview(state) {
        const fight = row => ({ row, unlocked: unlocked(state, row), reason: entryReason(state, row.id), kills: kills(state, row.id),
            entry: entryOf(row).map(([item, need]) => ({ item, name: E.items[item].name, have: count(state, item), need })) });
        const book = ledger(state);
        return { awakened: awakened(state), apexes: E.apexes.map(row => fight({ ...row, kind: 'apex' })), leagues: E.leagues.map(row => fight({ ...row, kind: 'league' })),
            blight: ATLAS.regions.map(region => ({ region, level: book.blight[region.id] || 0 })), witness: book.witness, witnessPer: E.witness.per,
            gardenerDown: kills(state, 'apex_gardener') > 0 };
    }
    return Object.freeze({ defaults, normalize, normalizeRun, reset, awakened, kills, count, def, entryReason, spend, refund, runExtra,
        bossBoost, zoneExtras, tuneStage, patternState, roomItems, onComplete, overview, isFight: id => DEFS.has(id),
        itemName: id => (E.items[id] ? E.items[id].name : id) });
})();
safeExposeGlobals({ atlasEndgame });
