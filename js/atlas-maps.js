/** 지도석 (docs/atlas-endgame-20260930.md 3절): 만들기 · 옵션 굴림 · 제작 · 타락 · 효과. 게임 상태를 읽거나 쓰지 않는다 — 보관함 ·
 * 드롭 · 지도 장치는 js/atlas.js가 맡고, 전투는 구역 팩토리와 적 생성이 여기서 푼 효과를 읽는다. 난수는 인자로 받는다.
 * 옵션은 {id, roll}만 저장한다(roll 0~1): 수치 표를 고쳐도 저장을 옮길 필요가 없다.
 */
const atlasMaps = (() => {
    const MODS = new Map(ATLAS.mods.map(mod => [mod.id, mod]));
    const lerp = (range, roll) => range[0] + (range[1] - range[0]) * roll;
    const modValue = (mod, roll) => Math.round(lerp([mod.min, mod.max], roll));
    const limits = map => ATLAS.rarities[map.rarity];
    const countKind = (map, kind) => map.mods.filter(entry => MODS.get(entry.id)?.kind === kind).length;

    /** Where a mod goes: the zone (monster life, packs, hazards …) or each enemy as it is created. */
    const EFFECTS = Object.freeze({
        monsterLife: { zone: (fx, v) => { fx.hp *= 1 + v / 100; } },
        monsterDamage: { zone: (fx, v) => { fx.damage *= 1 + v / 100; } },
        bossEmpowered: { zone: (fx, v) => { fx.bossHp *= 1 + v / 100; fx.bossDamage *= 1 + v / 100; } },
        extraElites: { zone: (fx, v) => { fx.extraElite = v / 100; } },
        packSize: { zone: (fx, v) => { fx.packExtra = v; } },
        burningGround: { zone: fx => { fx.hazard = true; } },
        monsterSpeed: { enemy: (enemy, v) => { enemy.attackSpeedVar *= 1 + v / 100; } },
        monsterResist: { enemy: (enemy, v) => { for (const key of ['resF', 'resC', 'resL']) enemy[key] = Math.min(95, enemy[key] + v); } },
        monsterArmour: { enemy: (enemy, v) => { enemy.dr = Math.min(90, enemy.dr + v); } },
        monsterCrit: { enemy: (enemy, v) => { enemy.critChance += v; } },
        monsterEvasion: { enemy: (enemy, v) => { enemy.evasionChance = Math.max(Number(enemy.evasionChance) || 0, v); } },
        lessLeech: { enemy: (enemy, v) => { enemy.leechEffMul = (Number.isFinite(enemy.leechEffMul) ? enemy.leechEffMul : 1) * (1 - v / 100); } },
        penetration: { enemy: (enemy, v) => { enemy.penetration = (Number(enemy.penetration) || 0) + v; } },
        doubleStrike: { enemy: (enemy, v) => { enemy.doubleStrikeChance = Math.max(Number(enemy.doubleStrikeChance) || 0, v); } },
        energyShield: { enemy: (enemy, v) => {
            enemy.maxEnergyShield = (Number(enemy.maxEnergyShield) || 0) + Math.floor(enemy.maxHp * v / 100);
            enemy.energyShield = enemy.maxEnergyShield;
        } },
        curseImmune: { enemy: enemy => { enemy.curseImmune = true; } }
    });

    function create(node, tier, rarity = 'normal', random = Math.random) {
        const map = { uid: 0, node, tier, rarity: 'normal', mods: [], quality: 0, corrupted: false };
        if (rarity !== 'normal') reroll(map, rarity, random);
        return map;
    }
    /** Kinds with room left under the rarity's prefix/suffix limits (or any kind when forced past them). */
    function openKinds(map, forced) {
        return ['prefix', 'suffix'].filter(kind => forced || countKind(map, kind) < limits(map)[kind]);
    }
    function addMod(map, random, forced = false) {
        const taken = new Set(map.mods.map(entry => entry.id));
        const kinds = new Set(openKinds(map, forced));
        const pool = ATLAS.mods.filter(mod => kinds.has(mod.kind) && !taken.has(mod.id));
        if (!pool.length) return false;
        map.mods.push({ id: pool[Math.floor(random() * pool.length)].id, roll: random() });
        return true;
    }
    function reroll(map, rarity, random, count = null) {
        map.rarity = rarity;
        map.mods = [];
        const rule = limits(map);
        const target = count ?? rule.min + Math.floor(random() * (rule.max - rule.min + 1));
        while (map.mods.length < target && addMod(map, random));
    }
    const hasRoom = map => map.mods.length < limits(map).max && openKinds(map, false).length > 0;

    /** Existing currencies keep their item roles (data/items.js ORB_DB): transmute/alter, regal/exalt, alch/chaos, scour,
     * annul, divine, quality and corrupt. */
    const CRAFTS = Object.freeze({
        magicBud: { label: '변환 · 변경', can: map => map.rarity !== 'rare', apply: (map, random) => reroll(map, 'magic', random) },
        sapBud: { label: '옵션 추가', can: map => map.rarity === 'magic' || (map.rarity === 'rare' && hasRoom(map)),
            apply: (map, random) => { map.rarity = 'rare'; addMod(map, random); } },
        formlessDew: { label: '희귀 재굴림', can: map => map.rarity !== 'magic', apply: (map, random) => reroll(map, 'rare', random) },
        blightSpore: { label: '정화', can: map => map.rarity !== 'normal', apply: map => { map.rarity = 'normal'; map.mods = []; } },
        pruningShears: { label: '옵션 삭제', can: map => map.mods.length > 0,
            apply: (map, random) => { map.mods.splice(Math.floor(random() * map.mods.length), 1); } },
        goldenRule: { label: '수치 재굴림', can: map => map.mods.length > 0, apply: (map, random) => map.mods.forEach(entry => { entry.roll = random(); }) },
        deepWhetstone: { label: `품질 +${ATLAS.quality.step}%`, can: map => map.quality < ATLAS.quality.max,
            apply: map => { map.quality = Math.min(ATLAS.quality.max, map.quality + ATLAS.quality.step); } },
        emberBranch: { label: '타락', can: () => true, apply: (map, random) => corrupt(map, random) }
    });
    function craftReason(map, key) {
        if (!CRAFTS[key]) return '지도석에 쓸 수 없는 재화입니다.';
        if (map.corrupted) return '타락한 지도석은 더 바꿀 수 없습니다.';
        return CRAFTS[key].can(map) ? '' : '지금 지도석 상태에는 쓸 수 없습니다.';
    }
    /** @returns {string} '' when applied, otherwise why not (the map is untouched). */
    function craft(map, key, random = Math.random) {
        const reason = craftReason(map, key);
        if (!reason) CRAFTS[key].apply(map, random);
        return reason;
    }
    /** 잿불가지: 무변화 · 등급 +1 · 한도를 넘는 옵션 추가 · 5~6옵션 희귀로 재구성. 어느 쪽이든 수량 보너스가 붙고 더는 바꿀 수 없다. */
    function corrupt(map, random) {
        const weights = ATLAS.corruption, outcomes = ['none', 'tier', 'extra', 'reforge'];
        let roll = random() * outcomes.reduce((sum, key) => sum + weights[key], 0);
        const outcome = outcomes.find(key => (roll -= weights[key]) < 0) || 'none';
        map.corrupted = true;
        if (outcome === 'tier') map.tier = Math.min(ATLAS.tierCap, map.tier + 1);
        if (outcome === 'extra') addMod(map, random, true);
        if (outcome === 'reforge') reroll(map, 'rare', random, 5 + Math.floor(random() * 2));
        return outcome;
    }

    /** Resolved numbers for a map: zone multipliers, per-enemy mods and the reward bonuses (quantity/rarity %). */
    /** Tiers past the one where loot reaches T20 (data ATLAS.overTier): each adds quantity, rarity and chase odds. */
    const overTiers = tier => Math.max(0, (Number(tier) || 0) - ATLAS.overTier.from);
    /** Chase-unique odds multiplier of a zone (js/passives.js generateUniqueItem): only atlas maps past ATLAS.overTier.from. */
    const chaseMul = zone => 1 + (zone && zone.type === 'atlasMap' ? overTiers(zone.atlasTier) * ATLAS.overTier.chase / 100 : 0);
    function effects(map) {
        const over = overTiers(map.tier);
        const fx = { hp: 1, damage: 1, bossHp: 1, bossDamage: 1, packExtra: 0, extraElite: 0, hazard: false, enemy: [],
            quantity: map.quality + (map.corrupted ? ATLAS.corruption.bonusQuantity : 0) + over * ATLAS.overTier.quantity,
            rarity: over * ATLAS.overTier.rarity, overTiers: over };
        for (const entry of map.mods) {
            const mod = MODS.get(entry.id), effect = EFFECTS[entry.id];
            if (!mod || !effect) continue;
            const v = modValue(mod, entry.roll);
            fx.quantity += Math.round(lerp(mod.quantity, entry.roll));
            fx.rarity += Math.round(lerp(mod.rarity, entry.roll));
            if (effect.zone) effect.zone(fx, v);
            if (effect.enemy) fx.enemy.push([entry.id, v]);
        }
        return fx;
    }
    /** Called for every enemy created in an atlas map (combat applyZoneEnemyMods). */
    function applyEnemyMods(enemy, zone) {
        if (!zone || zone.type !== 'atlasMap') return enemy;
        for (const [id, v] of zone.atlasEnemyMods) EFFECTS[id].enemy(enemy, v);
        enemy.dropMul = (Number(enemy.dropMul) || 1) * (1 + zone.atlasLootQuantity / 100);
        enemy.lootRarityMul = 1 + (zone.atlasLootRarity + (enemy.isBoss ? zone.atlasBossRarity : 0)) / 100;
        return enemy;
    }
    function describe(entry) {
        const mod = MODS.get(entry.id);
        return mod ? mod.text.replace('{v}', String(modValue(mod, entry.roll))) : '';
    }
    function validHead(raw, validNode) {
        if (!raw || typeof raw !== 'object' || !validNode(raw.node) || !Object.hasOwn(ATLAS.rarities, raw.rarity)) return false;
        return Number.isSafeInteger(raw.uid) && raw.uid >= 1 && Number.isInteger(raw.tier) && raw.tier >= 1 && raw.tier <= ATLAS.tierCap;
    }
    function validEntry(entry, seen) {
        const ok = !!entry && MODS.has(entry.id) && Number.isFinite(entry.roll) && entry.roll >= 0 && entry.roll <= 1 && !seen.has(entry.id);
        if (ok) seen.add(entry.id);
        return ok;
    }
    /** 기억 던전의 지도석(js/memory-dungeon.js)은 그 단계를 지닌다: { memory } 또는 {}. */
    function memoryField(raw) {
        return typeof memoryDungeon === 'object' && memoryDungeon.validTier(raw.memory) ? { memory: raw.memory } : {};
    }
    /** Save boundary: keeps only known mods with valid rolls; returns null for anything that is not a map. */
    function normalize(raw, validNode) {
        if (!validHead(raw, validNode)) return null;
        const seen = new Set(), mods = (Array.isArray(raw.mods) ? raw.mods : []).filter(entry => validEntry(entry, seen));
        const quality = Math.max(0, Math.min(ATLAS.quality.max, Math.floor(Number(raw.quality) || 0)));
        return { uid: raw.uid, node: raw.node, tier: raw.tier, rarity: raw.rarity, mods: mods.slice(0, 8).map(({ id, roll }) => ({ id, roll })),
            quality, corrupted: raw.corrupted === true, ...memoryField(raw) };
    }
    return Object.freeze({ create, craft, craftReason, crafts: CRAFTS, corrupt, effects, applyEnemyMods, describe, normalize, reroll,
        chaseMul, mod: id => MODS.get(id) || null });
})();
safeExposeGlobals({ atlasMaps });
