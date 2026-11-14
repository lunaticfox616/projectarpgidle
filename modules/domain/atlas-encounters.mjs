/** 지도 속 콘텐츠 방 (docs/atlas-endgame-20260930.md 3절 · data/atlas.js encounters): 공허 균열 · 벌집 · 보물 방 · 운석 분화구,
 * 아틀라스가 깨어난 뒤의 붉은 제단 · 푸른 제단(docs/atlas-pinnacles-20261002.md).
 * 지도를 열 때 어떤 방이 생길지 정하고(각인은 확정, 나머지는 확률), 맵이 만들어질 때 보통 방 하나에 그 콘텐츠의 무리를 둔다.
 * 무리는 정예가 이끌어 보스 관문을 함께 봉인하고, 방을 비우는 처치가 그 콘텐츠의 재화를 맵 전리품으로 준다(쓰러지면 잃는다).
 * 황금 방(2026-10-09, data/atlas.js goldenRoom): 방이 지도마다 정해진 확률로 황금이 되어 더 세고 보상이 크다.
 */
import { atlasEncounterRoll, atlasEncounterRoomLimit, atlasEncounterChance, atlasEncounterIsOpen, atlasEncounterRooms, atlasEncounterHostRooms, atlasEncounterTuneEnemy, atlasEncounterHasOwnLook, atlasEncounterEmptiedPack, atlasEncounterRewards, atlasEncounterGolden, atlasEncounterIsGolden, atlasEncounterChestReward, atlasEncounterNurseryGifts } from './atlas-encounters-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasEncounters(deps) {
    const env = { deps };
    env.TYPES = Object.freeze(Object.keys(env.deps.ATLAS.encounters));
    return Object.freeze({ types: env.TYPES, roll: (...args) => atlasEncounterRoll(env, ...args), roomLimit: (...args) => atlasEncounterRoomLimit(env, ...args), chance: (...args) => atlasEncounterChance(env, ...args), isOpen: (...args) => atlasEncounterIsOpen(env, ...args), rooms: (...args) => atlasEncounterRooms(env, ...args), hostRooms: atlasEncounterHostRooms, tuneEnemy: (...args) => atlasEncounterTuneEnemy(env, ...args), hasOwnLook: (...args) => atlasEncounterHasOwnLook(env, ...args), emptiedPack: (...args) => atlasEncounterEmptiedPack(env, ...args), rewards: (...args) => atlasEncounterRewards(env, ...args),
    golden: (...args) => atlasEncounterGolden(env, ...args), isGolden: atlasEncounterIsGolden, chestReward: (...args) => atlasEncounterChestReward(env, ...args), nurseryGifts: atlasEncounterNurseryGifts });
}
