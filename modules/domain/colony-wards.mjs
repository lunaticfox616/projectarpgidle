/**
 * 액막이 규칙(data/colony-wards.js): 가방의 한 칸짜리 장비, 액막이 칸 수, 끼운 액막이의 줄, 드랍(군락지 웨이브, 모든 지도의 처치),
 * 편린으로 만들기, 해체 보상, 예전 저장(군락지 보관함과 칸)의 이관. 능력치는 js/combat.js colonyWardBonus가 equippedLines를 더한다
 * (일반 장비 합산에서는 빠진다, js/equipment-stat-resolution.js). 화면은 js/colony-wards-ui.js.
 */
import { wardIsWard, wardKeptOnPickup, wardUnlocked, wardBeltSlots, wardStampBelt, wardRerollBelt, wardBeltRoll, wardSlotCount, wardSlotChange, wardOpenSlots, wardPickSlot, wardEquippedLines, wardIncidentMul } from './colony-ward-slots.mjs';
import { wardCreate, wardCreateUnique, wardSalvageShards, wardSalvageProfile } from './colony-ward-items.mjs';
import { wardRollFieldDrop, wardRollColonyWave, wardCraft } from './colony-ward-rewards.mjs';
import { wardMigrate } from './colony-ward-migration.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createColonyWards(deps) {
    const env = { deps };
    env.R = env.deps.COLONY_WARD_RULES;
    env.POOL = new Map(env.deps.COLONY_WARD_POOL.map(row => [row.id, row]));
    env.U = env.deps.COLONY_WARD_UNIQUES;
    return Object.freeze({
        isWard: (...args) => wardIsWard(env, ...args),
        keptOnPickup: (...args) => wardKeptOnPickup(env, ...args),
        unlocked: (...args) => wardUnlocked(env, ...args),
        beltSlots: (...args) => wardBeltSlots(env, ...args),
        stampBelt: (...args) => wardStampBelt(env, ...args),
        rerollBelt: (...args) => wardRerollBelt(env, ...args),
        beltRoll: (...args) => wardBeltRoll(env, ...args),
        slotCount: (...args) => wardSlotCount(env, ...args),
        slotChange: (...args) => wardSlotChange(env, ...args),
        openSlots: (...args) => wardOpenSlots(env, ...args),
        pickSlot: (...args) => wardPickSlot(env, ...args),
        equippedLines: (...args) => wardEquippedLines(env, ...args),
        incidentMul: (...args) => wardIncidentMul(env, ...args),
        create: (...args) => wardCreate(env, ...args),
        createUnique: (...args) => wardCreateUnique(env, ...args),
        rollFieldDrop: (...args) => wardRollFieldDrop(env, ...args),
        rollColonyWave: (...args) => wardRollColonyWave(env, ...args),
        craft: (...args) => wardCraft(env, ...args),
        salvageShards: (...args) => wardSalvageShards(env, ...args),
        salvageProfile: (...args) => wardSalvageProfile(env, ...args),
        migrate: (...args) => wardMigrate(env, ...args)
    });
}
