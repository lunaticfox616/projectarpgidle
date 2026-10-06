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
    function withArena(out, spec) {
        if (spec.arena === true) out.arena = true;
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
    const specKey = spec => [spec.style, spec.style === NAMED ? spec.id : spec.act, spec.arena ? 'arena' : 'map'].join(':');
    /** Boss-only contents: the hero starts in the room before the boss gate; every other room is an empty path. */
    function arenaSource(base) {
        const rooms = base.rooms.map(room => {
            const role = room[5] === 'boss' ? 'boss' : (room[0] === base.approach ? 'entry' : 'path');
            return Object.freeze([room[0], room[1], room[2], room[3], room[4], role]);
        });
        return { ...base, rooms: Object.freeze(rooms) };
    }
    /** @returns {object} a map source in the authored format (actExplorationMap compiles it). */
    function build(spec) {
        const clean = normalize(spec), base = clean.style === NAMED ? content(clean.id) : authored(clean.act);
        return clean.arena ? arenaSource(base) : base;
    }
    /** Whether a saved spec still describes a map this build can draw (older saves held generated mazes, isles and shafts). */
    function supports(spec) {
        try { normalize(spec); return true; } catch { return false; }
    }
    return Object.freeze({ styles: Object.freeze([STYLE, NAMED]), key: spec => specKey(normalize(spec)), normalize, build, supports });
})();
safeExposeGlobals({ explorationLayouts });
