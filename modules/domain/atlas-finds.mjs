/** 아틀라스 처치에 덧붙는 발견(docs/endgame-loot-20261009.md 3절): 지도 기운의 처치 드랍과 보물 무리의 보물. js/atlas-run.js onKill이
 * 처치마다 부르고, js/combat-encounters.js createActExplorationPack이 무리를 만들 때 보물 무리를 꾸민다. 규칙은 js/loot-omens.js가 정하고, 받는
 * 길은 보통 처치와 같다: 재화는 keepCurrencyDrop(지도 바닥 더미), 장비는 keepEquipmentDrop, 주얼은 바닥이나 주얼함.
 * 보물이 터지면 'atlas-find' 이벤트로 알린다(기록과 화면은 UI가).
 */
import { atlasFindOnAtlasKill } from './atlas-finds-kills.mjs';
import { atlasFindDressTreasurePack } from './atlas-finds-treasure.mjs';
import { atlasFindReceiveMemoryLeaf } from './atlas-finds-memory.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasFinds(deps) {
    const env = { deps };
    env.MAP_BOSS_KINDS = new Set(['map', 'guardian']);
    return Object.freeze({ onAtlasKill: (...args) => atlasFindOnAtlasKill(env, ...args), dressTreasurePack: (...args) => atlasFindDressTreasurePack(env, ...args), receiveMemoryLeaf: (...args) => atlasFindReceiveMemoryLeaf(env, ...args) });
}
