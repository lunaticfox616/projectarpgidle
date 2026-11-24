import { atlasFindGrantTreasureUnique, atlasFindGrantGoldenJackpot, atlasFindGrantOmenDrop } from './atlas-finds-drops.mjs';
import { createSeededRng } from '../common/numbers.mjs';

/** The treasure carrier fell: rolls draws from one drops omen, rare gear and sometimes a unique, all on its cell. Golden treasure
 * rolls more, always holds a unique and adds a jackpot. */
export function* atlasFindBurstTreasure(env, owner, enemy, zone) {
    const rules = env.deps.LOOT_OMENS.treasure, golden = !!enemy.goldenTreasure, { omen, drops } = env.deps.lootOmens.treasureDrops(zone, owner, Math.random, golden);
    let granted = 0;
    for (const drop of drops) if ((yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop))) granted++;
    const items = [];
    for (let i = 0; i < rules.rareGear; i++) items.push(...(yield { kind: 'atlasFindEffectGrantEquipmentPick', args: [enemy, zone, 'rare'] }));
    if (golden || Math.random() < rules.uniqueChance) items.push(...(yield* atlasFindGrantTreasureUnique(env, enemy, zone)));
    if (golden) items.push(...(yield* atlasFindGrantGoldenJackpot(env, owner, enemy, zone)));
    owner.atlas.tally.treasure += 1;
    owner.atlas.tally.golden += Number(golden);
    (yield { kind: 'atlasFindEffectDispatchRuntimeEvent', args: ['atlas-find', { kind: 'treasure', golden, omen: omen ? omen.id : null, name: enemy.name,
        count: granted + items.length + Number(golden), unique: items.some(item => item.rarity === 'unique'), cell: { gx: enemy.gx, gy: enemy.gy } }] });
}

/** The map boss's own reward (data/loot-omens.js mapBoss): its pieces roll an ordinary monster's rarity bands, the first ones at least
 * the listed rarities, so the boss pile always holds gear without drawing on the unique budget. random: the extra piece's roll (a 장비
 * 상자 passes the run's seeded draw). */
export function* atlasFindGrantBossReward(env, enemy, zone, random = Math.random) {
    const rules = env.deps.LOOT_OMENS.mapBoss, count = rules.items + Number(random() < rules.extraChance);
    // 수호자와 사도의 보상 장비는 그 영향을 띤다(js/item-influences.js onDrop).
    const roller = { ...enemy, isBoss: false, isElite: false, uniqueChanceMul: 1, atlasInfluence: env.deps.itemInfluences.bossInfluence(zone) };
    for (let i = 0; i < count; i++) (yield { kind: 'atlasFindEffectGrantEquipmentPick', args: [roller, zone, rules.minimum[i] || null] });
}

/** 장비 상자(개편 A2): 상자 하나가 그 지도 보스 보상을 한 번 더 굴린다(같은 표, 지도의 전리품 등급, 지도 보스와 같은 아이템 레벨). 장비는 지도
 * 보스의 보상처럼 떨어진다(영웅의 발밑). 상자마다의 추가 장비 굴림은 seed(런의 지도석 uid)에서 나와 다시 불러와도 같다. */
export function* atlasFindOpenGearBoxes(env, owner, zone, count, seed) {
    const at = owner.gridPlayer || { gx: 0, gy: 0 }, level = env.deps.levelProgression.monsterLevel(zone, { isBoss: true });
    for (let box = 0; box < count; box++) (yield* atlasFindGrantBossReward(env, { id: 0, gx: at.gx, gy: at.gy, level }, zone, createSeededRng(`${seed}:${box}`)));
}

/** An ordinary atlas pack that carries treasure (lootOmens.isTreasurePack): one of its ordinary monsters shines gold (an elite keeps
 * its trait colour, modules/rendering/enemy-outline.mjs, so it carries the treasure only in a pack of elites). */
export function atlasFindDressTreasurePack(env, zone, pack) {
    if (pack.alert || !env.deps.lootOmens.isTreasurePack(zone, pack)) return;
    const golden = env.deps.lootOmens.isGoldenTreasure(pack), rules = golden ? env.deps.LOOT_OMENS.treasure.golden : env.deps.LOOT_OMENS.treasure;
    const leader = pack.waiting.find(enemy => !enemy.isElite) || pack.waiting[0];
    pack.treasure = true;
    Object.assign(leader, { treasureCarrier: true, goldenTreasure: golden, name: `${rules.prefix} ${leader.name}`, encounterOutline: rules.outline,
        encounterSparks: rules.sparks });
}
