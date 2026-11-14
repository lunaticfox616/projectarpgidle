import { wardUnlocked } from './colony-ward-slots.mjs';
import { wardCreateDrop, wardCreate } from './colony-ward-items.mjs';

// ---------------------------------------------------------------- where wards come from
/** A kill anywhere but the colony (once the colony is open): now and then a ward, through the normal floor and pickup. */
export function* wardRollFieldDrop(env, state, enemy, zone, random = Math.random) {
    if (!enemy || !zone || zone.id === env.R.colonyZoneId || !wardUnlocked(env, state)) return [];
    const chance = enemy.isBoss ? env.R.field.boss : enemy.isElite ? env.R.field.elite : env.R.field.normal;
    if (random() >= chance) return [];
    const item = wardCreateDrop(env, random, zone.tier);
    const kept = yield { kind: 'keepWardDrop', args: [enemy, item] };
    return kept === 'kept' ? [item] : [];
}

/** A cleared colony wave's ward falls where its last monster fell (2026-11-03 사용자: 바닥에 떨어져야 한다) and joins the overlord's
 * payout pile like the wave's other drops; it reaches the bag as other gear does (a full bag salvages it). The item when it was
 * picked up at once (no floor: away settlement, the old board), else null. */
export function* wardRollColonyWave(env, state, wave, zone, options = {}) {
    const { random = Math.random, where = state.gridPlayer } = options;
    const bossWave = wave % env.R.colonyWave.every === 0;
    if (!bossWave && random() >= env.R.colonyWave.chance) return null;
    const floor = bossWave ? Math.min(env.R.colonyWave.maxRollFloor,
        env.R.colonyWave.bossRollFloor + (wave / env.R.colonyWave.every - 1) * env.R.colonyWave.bossRollStep) : 0;
    const item = wardCreateDrop(env, random, zone && zone.tier, floor);
    const kept = yield { kind: 'keepWardDrop', args: [where || state.gridPlayer, item, { ignoreFilter: true, ignoreAutoSalvage: true }] };
    return kept === 'kept' ? item : null;
}

/** 군락지 편린으로 만들기: craftCost개를 내고 새 액막이 하나를 가방에. '' when done, otherwise why not. */
export function* wardCraft(env, state, random = Math.random) {
    if (!wardUnlocked(env, state)) return '군락지가 열리면 만들 수 있습니다.';
    if (state.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 만들 수 없습니다.';
    if ((Number(state.currencies.colonyShard) || 0) < env.R.craftCost) return env.deps._t('군락지 편린이 부족합니다({craftCost}개 필요).', { craftCost: env.R.craftCost });
    // 가방이 차 있으면 빈 액막이 칸에 바로 끼우고, 칸도 없으면 만들지 않는다: 넘친 액막이는 임시 보관함에 두지 않고(2026-11-03 사용자),
    // 줍기의 넘침 해체가 편린만 돌려주는 일도 없다(2026-10-20: 누를 때마다 편린이 늘었다).
    const item = wardCreate(env, random, 1), roomy = env.deps.canStoreEquipmentItems([item], state);
    const stored = yield (roomy
        ? { kind: 'storeWard', args: [item, { ignoreFilter: true, ignoreAutoSalvage: true }] }
        : { kind: 'equipWard', args: [item] });
    if (!stored) return '가방에 자리가 없습니다.';
    state.currencies.colonyShard -= env.R.craftCost;
    return '';
}
