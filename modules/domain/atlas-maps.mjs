/** 지도석 (docs/atlas-endgame-20260930.md 3절): 만들기 · 옵션 굴림 · 제작 · 타락 · 효과. 게임 상태를 읽거나 쓰지 않는다 — 보관함 ·
 * 드롭 · 지도 장치는 js/atlas.js가 맡고, 전투는 구역 팩토리와 적 생성이 여기서 푼 효과를 읽는다. 난수는 인자로 받는다.
 * 옵션은 {id, roll}만 저장한다(roll 0~1): 수치 표를 고쳐도 저장을 옮길 필요가 없다.
 */
import { atlasMapReroll, atlasMapHasRoom, atlasMapAddMod, atlasMapCorrupt, atlasMapCreate, atlasMapCraft, atlasMapCraftReason, atlasMapEffects, atlasMapApplyEnemyMods, atlasMapDescribe, atlasMapNormalize, atlasMapChaseMul } from './atlas-maps-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createAtlasZoneEffects() {
    return {
        monsterLife: { zone: (fx, v) => { fx.hp *= 1 + v / 100; } },
        monsterDamage: { zone: (fx, v) => { fx.damage *= 1 + v / 100; } },
        bossEmpowered: { zone: (fx, v) => { fx.bossHp *= 1 + v / 100; fx.bossDamage *= 1 + v / 100; } },
        extraElites: { zone: (fx, v) => { fx.extraElite = v / 100; } },
        packSize: { zone: (fx, v) => { fx.packExtra = v; } },
        burningGround: { zone: fx => { fx.hazard = true; fx.groundElements.push('fire'); } },
        frozenGround: { zone: fx => { fx.hazard = true; fx.groundElements.push('cold'); } },
        corrosiveGround: { zone: fx => { fx.hazard = true; fx.groundElements.push('chaos'); } },
        shockedGround: { zone: fx => { fx.hazard = true; fx.groundElements.push('light'); } }
    };
}

function createAtlasEnemyEffects() {
    return {
        monsterSpeed: { enemy: (enemy, v) => { enemy.attackSpeedVar *= 1 + v / 100; } },
        monsterResist: { enemy: (enemy, v) => { for (const key of ['resF', 'resC', 'resL']) enemy[key] = Math.min(95, enemy[key] + v); } },
        monsterArmour: { enemy: (enemy, v) => { enemy.dr = Math.min(90, enemy.dr + v); } },
        monsterCrit: { enemy: (enemy, v) => { enemy.critChance += v; } },
        monsterEvasion: { enemy: (enemy, v) => { enemy.evasionChance = Math.min(95, (Number(enemy.evasionChance) || 0) + v); } },
        lessLeech: { enemy: (enemy, v) => { enemy.leechEffMul = (Number.isFinite(enemy.leechEffMul) ? enemy.leechEffMul : 1) * (1 - v / 100); } },
        penetration: { enemy: (enemy, v) => { enemy.penetration = (Number(enemy.penetration) || 0) + v; } },
        doubleStrike: { enemy: (enemy, v) => { enemy.doubleStrikeChance = Math.min(100, (Number(enemy.doubleStrikeChance) || 0) + v); } },
        energyShield: { enemy: (enemy, v) => {
        enemy.maxEnergyShield = (Number(enemy.maxEnergyShield) || 0) + Math.floor(enemy.maxHp * v / 100);
        enemy.energyShield = enemy.maxEnergyShield;
    } },
        curseImmune: { enemy: enemy => { enemy.curseImmune = true; } }
    };
}

function createAtlasMapCrafts(env) {
    return Object.freeze({
        magicBud: { label: '변환과 변경', can: map => map.rarity !== 'rare', apply: (map, random) => atlasMapReroll(env, map, 'magic', random) },
        sapBud: { label: '옵션 추가', can: map => map.rarity === 'magic' || (map.rarity === 'rare' && atlasMapHasRoom(env, map)),
        apply: (map, random) => { map.rarity = 'rare'; atlasMapAddMod(env, map, random); } },
        formlessDew: { label: '희귀 재굴림', can: map => map.rarity !== 'magic', apply: (map, random) => atlasMapReroll(env, map, 'rare', random) },
        blightSpore: { label: '정화', can: map => map.rarity !== 'normal', apply: map => { map.rarity = 'normal'; map.mods = []; } },
        pruningShears: { label: '옵션 삭제', can: map => map.mods.length > 0,
        apply: (map, random) => { map.mods.splice(Math.floor(random() * map.mods.length), 1); } },
        goldenRule: { label: '수치 재굴림', can: map => map.mods.length > 0, apply: (map, random) => map.mods.forEach(entry => { entry.roll = random(); }) },
        deepWhetstone: { label: `품질 +${env.deps.ATLAS.quality.step}%`, can: map => map.quality < env.deps.ATLAS.quality.max,
        apply: map => { map.quality = Math.min(env.deps.ATLAS.quality.max, map.quality + env.deps.ATLAS.quality.step); } },
        emberBranch: { label: '타락', can: () => true, apply: (map, random) => atlasMapCorrupt(env, map, random) }
    });
}

export function createAtlasMaps(deps) {
    const env = { deps };
    env.MODS = new Map(env.deps.ATLAS.mods.map(mod => [mod.id, mod]));
    env.EFFECTS = Object.freeze({ ...createAtlasZoneEffects(), ...createAtlasEnemyEffects() });
    env.CRAFTS = createAtlasMapCrafts(env);
    return Object.freeze({ create: (...args) => atlasMapCreate(env, ...args), craft: (...args) => atlasMapCraft(env, ...args), craftReason: (...args) => atlasMapCraftReason(env, ...args), crafts: env.CRAFTS, corrupt: (...args) => atlasMapCorrupt(env, ...args), effects: (...args) => atlasMapEffects(env, ...args), applyEnemyMods: (...args) => atlasMapApplyEnemyMods(env, ...args), describe: (...args) => atlasMapDescribe(env, ...args), normalize: (...args) => atlasMapNormalize(env, ...args), reroll: (...args) => atlasMapReroll(env, ...args),
    chaseMul: (...args) => atlasMapChaseMul(env, ...args), mod: id => env.MODS.get(id) || null });
}
