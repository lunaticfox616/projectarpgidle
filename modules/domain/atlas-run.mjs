/** 지도 장치 런의 전투 쪽 연결 (docs/atlas-endgame-20260930.md 3절). 상태 전이는 js/atlas.js가, 맵 · 무리 · 전리품 보관은
 * 넓은 맵 탐험 엔진(js/act-exploration-*.js)이 맡는다. 여기서는 이동 · 정산 · 포털 · 자동 지도를 전투 흐름에 잇는다.
 * 알림은 'project-idle:atlas-map' 이벤트로만 내보낸다(기록 · 화면은 js/atlas-ui.js).
 */
import { atlasSessionOpen, atlasSessionOpenPinnacle, atlasSessionOpenEndgame, atlasSessionOpenMemory, atlasSessionOpenBoard, atlasSessionReenter } from './atlas-run-entry.mjs';
import { atlasSessionAbandon, atlasSessionDefeat, atlasSessionLeave, atlasSessionTravel, atlasSessionRecoverClosedMap } from './atlas-run-travel.mjs';
import { atlasSessionFinish } from './atlas-run-completion.mjs';
import { atlasSessionOnKill, atlasSessionOnChaos20 } from './atlas-run-drops.mjs';
import { atlasSessionLastPortal, atlasSessionDepartureBlock } from './atlas-run-access.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasRun(deps) {
    const env = { deps };

    return Object.freeze({ open: (...args) => atlasSessionOpen(env, ...args), openPinnacle: (...args) => atlasSessionOpenPinnacle(env, ...args), openEndgame: (...args) => atlasSessionOpenEndgame(env, ...args), openMemory: (...args) => atlasSessionOpenMemory(env, ...args), openBoard: (...args) => atlasSessionOpenBoard(env, ...args), reenter: (...args) => atlasSessionReenter(env, ...args), abandon: (...args) => atlasSessionAbandon(env, ...args), finish: (...args) => atlasSessionFinish(env, ...args), defeat: (...args) => atlasSessionDefeat(env, ...args), leave: (...args) => atlasSessionLeave(env, ...args), travel: (...args) => atlasSessionTravel(env, ...args), onKill: (...args) => atlasSessionOnKill(env, ...args), onChaos20: (...args) => atlasSessionOnChaos20(env, ...args), recoverClosedMap: (...args) => atlasSessionRecoverClosedMap(env, ...args), lastPortal: (...args) => atlasSessionLastPortal(env, ...args),
    blockReason: (...args) => atlasSessionDepartureBlock(env, ...args) });
}
