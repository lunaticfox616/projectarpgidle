import { atlasCoreChartTierOf } from './atlas-graph.mjs';

/** 천문도 이전(개편 2026-11-24, saveVersion 21까지)의 저장을 새 천문도로 옮긴다. 판 번호가 아니라 내용(예전 노드 id)을 보고 옮긴다:
 * 옮긴 것에는 예전 id가 남지 않으므로 몇 번을 불러와도, 반쯤 옮겨진 저장도 같은 결과가 되고 보상이 다시 생기지 않는다.
 *  - 예전 지도 45곳의 지도석(보관함, 열린 지도, 그 지도가 쥔 것): 싸움 등급을 천문도 등급으로(atlasCoreChartTierOf), 노드는 같은 권역의
 *    그 등급 지도로. uid, 희귀도, 옵션, 품질, 타락, 기운은 그대로다. 예전 수호자의 지도석은 건드리지 않는다.
 *  - 예전 지도에 쌓인 기억(기억 던전의 입장 기억과 최고 단계)은 그 지도의 내용을 맡은 새 지도(ATLAS.hosts)로 간다.
 *  - 예전 지도, 예전 수호자, 정점에 열려 있던 지도는 닫는다(atlasChartStaleRun, 닫기는 atlas-restore가 취소 경로로 한다).
 * 완료와 보너스의 예전 id, 패시브는 atlas-restore의 정규화가 버린다. */
export function atlasChartOldMap(env, id) { return typeof id === 'string' && Object.hasOwn(env.deps.ATLAS.hosts, id); }

/** 그 권역의 그 천문도 등급 지도, 없으면(다섯 곳뿐인 권역의 1~5등급) 그 등급의 첫 지도. 지도석은 같은 등급의 어느 지도나 연다. */
export function atlasChartStoneNode(env, oldId, tier) {
    const region = oldId.slice(0, oldId.lastIndexOf('_'));
    return (env.MAP_NODES.find(node => node.region === region && node.tier === tier) || env.MAP_NODES.find(node => node.tier === tier)).id;
}

export function atlasChartMoveStone(env, stone) {
    if (!stone || typeof stone !== 'object' || !atlasChartOldMap(env, stone.node)) return;
    // 기억 싸움의 지도(열린 지도에만 있다)는 그 보스의 자리와 싸움 등급을 지닌다: 내용을 맡은 지도로 자리만 옮긴다(기억이 그리로 돌아간다).
    if (stone.memory) return void (stone.node = env.deps.ATLAS.hosts[stone.node][0]);
    // 등급이 망가진 것은 옮기지 않는다: 예전 id가 남아 정규화가 예전처럼 버린다(없던 지도석을 만들어 주지 않는다).
    if (!Number.isInteger(stone.tier) || stone.tier < 1 || stone.tier > env.deps.ATLAS.tierCap) return;
    const tier = atlasCoreChartTierOf(env, stone.tier);
    Object.assign(stone, { node: atlasChartStoneNode(env, stone.node, tier), tier });
}

function moveStones(env, list) { if (Array.isArray(list)) list.forEach(stone => atlasChartMoveStone(env, stone)); }

/** 기억 한 줄을 합친다: 단계별 수는 더하고(상한은 기억 던전의 정규화가 건다), 최고 단계는 큰 쪽. */
function mergeMemory(kept, moved) {
    if (Array.isArray(kept) && Array.isArray(moved)) return kept.map((value, index) => (Number(value) || 0) + (Number(moved[index]) || 0));
    return Number(moved) > Number(kept) ? moved : kept;
}

export function atlasChartMoveMemoryBook(env, book) {
    if (!book || typeof book !== 'object') return;
    for (const id of Object.keys(book).filter(key => atlasChartOldMap(env, key))) {
        const host = env.deps.ATLAS.hosts[id][0];
        book[host] = Object.hasOwn(book, host) ? mergeMemory(book[host], book[id]) : book[id];
        delete book[id];
    }
}

/** 열려 있던 지도가 새 천문도에서 이어질 수 없는지: 예전 지도, 닫힌 예전 수호자와 정점(그 보스의 기억 싸움과 나이테 원정의 싸움은 그대로 이어진다). */
export function atlasChartStaleRun(env, run) {
    const map = run && typeof run === 'object' ? run.map : null;
    if (!map || typeof map !== 'object') return false;
    return atlasChartOldMap(env, map.node) || (env.LEGACY.some(node => node.id === map.node) && !map.memory && !run.board);
}

/** raw: 저장에서 읽은 atlas 객체(정규화 전). 제자리에서 고친다. */
export function atlasChartMove(env, raw) {
    moveStones(env, raw.stash);
    if (raw.run && typeof raw.run === 'object') {
        atlasChartMoveStone(env, raw.run.map);
        moveStones(env, raw.run.drops);
    }
    if (raw.memory && typeof raw.memory === 'object') {
        atlasChartMoveMemoryBook(env, raw.memory.tickets);
        atlasChartMoveMemoryBook(env, raw.memory.best);
    }
}
