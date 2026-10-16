/** 콘텐츠 · 아틀라스 넓은 맵 (2026-10-02 간소화, docs/atlas-pinnacles-20261002.md 1절).
 * 예전에는 시드로 미로 · 섬 · 갱도 설계도를 새로 짜고 임시 그림(지형 재료 묶음)으로 칠했다. 이제는 그림까지 완성된 액트 지도 10장
 * (data/act-exploration-maps.js, 배경은 scripts/build-act-maps.cjs가 그린 그림)을 다시 쓴다: 명세 { style:'act', act:1~10, seed, arena }.
 * arena(보스만 서는 콘텐츠)면 보스 방 앞 접근 방에서 시작하고, 나머지 방은 몬스터 없는 길목이 된다.
 * 순수 함수: 게임 상태 · 난수 · DOM을 쓰지 않는다 — 같은 명세는 언제나 같은 맵이다(저장은 명세만 가진다).
 * 맵 id는 그 액트 지도의 id 그대로라 배경 · 관문 그림 · 어둠 색(ACT_EXPLORATION_BACKDROPS)이 그대로 붙는다.
 */
// 2026-10-06: 콘텐츠 전용 지도(data CONTENT_EXPLORATION_MAPS, 전직 시련 다섯 곳)는 { style:'map', id, seed, arena }로 부른다.
const explorationLayouts = (() => {
    const STYLE = 'act', NAMED = 'map';
    const ACTS = 10;

    function authored(act) {
        const row = ACT_EXPLORATION_MAPS.find(map => map.act === act);
        if (!row) throw Error('넓은 맵 명세가 잘못되었습니다: 액트 지도 ' + act);
        return row;
    }
    function content(id) {
        const row = CONTENT_EXPLORATION_MAPS.find(map => map.id === id);
        if (!row) throw Error('넓은 맵 명세가 잘못되었습니다: 콘텐츠 지도 ' + id);
        return row;
    }
    const seedOf = spec => String(spec.seed === undefined ? '' : spec.seed);
    /** chain: true면 그 지도의 방을 모두 한 줄로(벌집 원정), 숫자면 입구와 끝 방 사이에 방을 그 수만큼 둔 한 줄 지도다(2026-10-13 밤:
     * 판에서 싸우던 콘텐츠. 방 수는 그 콘텐츠의 무리 수가 정한다). */
    const CHAIN_MAX = 30;
    function withArena(out, spec) {
        if (spec.arena === true) out.arena = true;
        if (spec.chain === true) out.chain = true;
        else if (Number.isInteger(spec.chain) && spec.chain >= 1 && spec.chain <= CHAIN_MAX) out.chain = spec.chain;
        return out;
    }
    /** Normalised copy of a spec; throws for anything but an act map or a content map (the save boundary drops such runs,
     * js/act-exploration-state.js). */
    function normalize(spec) {
        if (spec && spec.style === NAMED) return withArena({ style: NAMED, id: content(String(spec.id)).id, seed: seedOf(spec) }, spec);
        const act = Number(spec && spec.act);
        if (!spec || spec.style !== STYLE || !Number.isInteger(act) || act < 1 || act > ACTS) {
            throw Error('넓은 맵 명세가 잘못되었습니다: ' + JSON.stringify(spec));
        }
        return withArena({ style: STYLE, act, seed: seedOf(spec) }, spec);
    }
    const specKey = spec => [spec.style, spec.style === NAMED ? spec.id : spec.act, spec.arena ? 'arena' : spec.chain ? (spec.chain === true ? 'chain' : 'chain' + spec.chain) : 'map'].join(':');
    /** Boss-only contents: the hero starts in the room before the boss gate; every other room is an empty path. */
    function arenaSource(base) {
        const rooms = base.rooms.map(room => {
            const role = room[5] === 'boss' ? 'boss' : (room[0] === base.approach ? 'entry' : 'path');
            return Object.freeze([room[0], room[1], room[2], room[3], room[4], role]);
        });
        return { ...base, rooms: Object.freeze(rooms) };
    }
    /** 한 줄로 이어 걷는 지도(벌집 원정, js/content-maps.js hive): 입구와 보스 방 말고는 모두 같은 구실의 방이다. 방 단위 무대가 그 방들을
     * 입구에서 보스 방까지 한 줄로 잇는다(js/act-exploration-room-plans.js의 놓임새 'c'). */
    function chainSource(base, count) {
        if (count !== true) return countedChain(base, count);
        const rooms = base.rooms.map(room => Object.freeze([room[0], room[1], room[2], room[3], room[4], ['entry', 'boss'].includes(room[5]) ? room[5] : 'battle']));
        return { ...base, rooms: Object.freeze(rooms) };
    }
    /** 방 수를 정한 한 줄 지도: 입구, 방 c1..cN, 끝 방. 방 단위 무대만 걷는다(이어진 지도로는 짓지 않는다): 바탕 지도는 지도 id(어둠 색)와
     * 입구, 끝 방의 이름만 빌려 주고, 사이 방의 자리 값은 쓰이지 않아 바탕의 방에서 돌려 채운다. */
    function countedChain(base, count) {
        const entry = base.rooms.find(room => room[5] === 'entry'), boss = base.rooms.find(room => room[5] === 'boss');
        const between = base.rooms.filter(room => room !== entry && room !== boss);
        const rooms = Array.from({ length: count }, (unused, index) => {
            const like = between[index % between.length];
            return Object.freeze(['c' + (index + 1), like[1], like[2], like[3], like[4], 'battle']);
        });
        return { ...base, rooms: Object.freeze([entry, ...rooms, boss]) };
    }
    /** @returns {object} a map source in the authored format (actExplorationMap compiles it). */
    function build(spec) {
        const clean = normalize(spec), base = clean.style === NAMED ? content(clean.id) : authored(clean.act);
        if (clean.chain) return chainSource(base, clean.chain);
        return clean.arena ? arenaSource(base) : base;
    }
    /** Whether a saved spec still describes a map this build can draw (older saves held generated mazes, isles and shafts). */
    function supports(spec) {
        try { normalize(spec); return true; } catch { return false; }
    }
    return Object.freeze({ styles: Object.freeze([STYLE, NAMED]), key: spec => specKey(normalize(spec)), normalize, build, supports });
})();
safeExposeGlobals({ explorationLayouts });
