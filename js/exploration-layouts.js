/** 생성 탐험 맵 (세계수 아틀라스 · 콘텐츠 맵, docs/atlas-endgame-20260930.md 2절).
 * 스타일과 시드로 작성 맵(data/act-exploration-maps.js)과 같은 형식의 설계도를 만든다: 방 [id, x, y, rx, ry, 역할] ·
 * 통로 [from, to, 꺾는 점] · 관문 · 접근 방. 타일은 actExplorationMap이 같은 컴파일러로 굽는다.
 * 순수 함수: 게임 상태 · 전역 난수 · DOM을 쓰지 않는다 — 같은 명세는 언제나 같은 맵이 된다(저장은 명세만 가진다).
 * 약속: 보스 방은 맨 위에 두고 한 칸 관문 바로 아래에 접근 방을 둔다. 다른 방과 통로는 접근 방 윗줄(y ≥ 9) 아래에만
 * 놓이므로 관문 말고는 보스 방에 닿지 않는다. 역할 'path'는 몬스터 없는 길목(미로 갈림길 · 섬 사이 발판)이다.
 */
const explorationLayouts = (() => {
    const TOP = 9; // first row below the boss block (boss room rows 2..6 + gate row 7 + corridor row 8)

    /** Deterministic PRNG (FNV-1a hash → mulberry32). */
    function rng(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
        let a = h >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const pick = (random, list) => list[Math.floor(random() * list.length)];
    const between = (random, min, max) => min + Math.floor(random() * (max - min + 1));

    function specKey(spec) { return [spec.style, spec.biome, spec.size, spec.seed].join(':'); }

    /** Boss room on top (radii bx×by), its gate, and the approach room right below the gate. */
    function frame(width, approachRy, boss = { rx: 4, ry: 2 }) {
        const bx = Math.floor(width / 2), bossY = 1 + boss.ry;
        return {
            bx, gate: [bx, bossY + boss.ry + 1],
            boss: ['boss', bx, bossY, boss.rx, boss.ry, 'boss'],
            approach: ['approach', bx, bossY + boss.ry + 3 + approachRy, 4, approachRy, 'battle']
        };
    }

    // ---------------------------------------------------------------- shared graph helpers
    function neighbours(links, id) {
        return links.filter(link => link[0] === id || link[1] === id).map(link => (link[0] === id ? link[1] : link[0]));
    }
    /** Graph distance from `from` over links (rooms not reached stay undefined). */
    function distances(links, from) {
        const dist = new Map([[from, 0]]), queue = [from];
        for (let i = 0; i < queue.length; i++) {
            for (const next of neighbours(links, queue[i])) {
                if (!dist.has(next)) { dist.set(next, dist.get(queue[i]) + 1); queue.push(next); }
            }
        }
        return dist;
    }
    /** Prim's tree from rooms[0] over rooms whose centres are `near` each other, then `extra` more short links for loops.
     * Rooms the tree could not reach are dropped from `rooms` (in place), so every kept room joins the entry. */
    function connect(random, rooms, near, extra) {
        const links = [], inTree = new Set([rooms[0][0]]);
        const candidates = () => rooms.flatMap(a => (inTree.has(a[0]) ? rooms.filter(b => !inTree.has(b[0]) && near(a, b)).map(b => [a, b]) : []));
        for (let edges = candidates(); edges.length; edges = candidates()) {
            edges.sort((p, q) => span(p) - span(q) || random() - .5);
            const [a, b] = edges[Math.floor(random() * Math.min(2, edges.length))];
            links.push([a[0], b[0]]); inTree.add(b[0]);
        }
        for (let i = rooms.length - 1; i >= 0; i--) if (!inTree.has(rooms[i][0])) rooms.splice(i, 1);
        const spare = rooms.flatMap((a, i) => rooms.slice(i + 1).filter(b => near(a, b) && !linked(links, a[0], b[0])).map(b => [a[0], b[0]]));
        for (let n = 0; n < extra && spare.length; n++) links.push(spare.splice(Math.floor(random() * spare.length), 1)[0]);
        return links;
    }
    const span = ([a, b]) => Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    const linked = (links, a, b) => links.some(link => (link[0] === a && link[1] === b) || (link[0] === b && link[1] === a));

    /** Roles by distance from the entry: the entry, `elites` elite rooms deep in the map, leaves → optional, rest → battle
     * (rooms already marked 'path' stay paths). Mutates the room rows. */
    function assignRoles(random, rooms, links, entryId, elites) {
        const dist = distances(links, entryId);
        const open = rooms.filter(room => room[0] !== entryId && room[0] !== 'approach' && room[5] !== 'path');
        open.sort((a, b) => (dist.get(b[0]) || 0) - (dist.get(a[0]) || 0) || random() - .5);
        const eliteIds = new Set(open.slice(0, elites).map(room => room[0]));
        for (const room of rooms) {
            if (room[0] === entryId) room[5] = 'entry';
            else if (eliteIds.has(room[0])) room[5] = 'elite';
            else if (room[5] !== 'path' && room[0] !== 'approach') room[5] = neighbours(links, room[0]).length === 1 ? 'optional' : 'battle';
        }
    }
    function finish(spec, parts) {
        return Object.freeze({
            id: 'gen:' + specKey(spec), biome: spec.biome, width: parts.width, height: parts.height,
            rotation: spec.rotation ?? parts.rotation, gate: parts.frame.gate, approach: 'approach',
            rooms: [parts.frame.boss, ...parts.rooms], links: parts.links, ...(parts.passage ? { passage: 1 } : {})
        });
    }

    // ---------------------------------------------------------------- styles
    /** 방과 통로(아틀라스 기본): 칸 격자에 방을 흩어 놓고 가까운 방끼리 잇는다. */
    function rooms(random, spec) {
        const cols = [3, 3, 4][spec.size - 1], rowsN = [2, 3, 3][spec.size - 1], cw = 12, ch = 9;
        const width = cols * cw + 3, f = frame(width, 2), height = TOP + 4 + rowsN * ch + 2;
        const list = [f.approach.slice()];
        for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
            if (random() < .22 && list.length > 3) continue; // gaps make every map a different shape
            const rx = between(random, 2, 4), ry = between(random, 1, 3);
            const cx = 2 + c * cw + rx + between(random, 1, cw - 2 * rx - 3), cy = TOP + 5 + r * ch + ry + between(random, 0, ch - 2 * ry - 2);
            list.push([`r${r}c${c}`, cx, cy, rx, ry, 'battle']);
        }
        const near = (a, b) => Math.abs(a[1] - b[1]) <= cw + 4 && Math.abs(a[2] - b[2]) <= ch + 5;
        const links = connect(random, list, near, spec.size);
        const entry = list.slice(1).reduce((best, room) => (room[2] > best[2] ? room : best), list[1]);
        assignRoles(random, list, links, entry[0], 1 + spec.size);
        return finish(spec, { width, height, frame: f, rooms: list, links, rotation: between(random, 0, 3) });
    }

    /** 미로(고대 미궁): 4칸 간격 갈림길의 완전 미로. 막다른 길은 곁방 · 정예 방, 나머지는 몬스터 없는 길목. */
    function maze(random, spec) {
        const cols = [5, 7, 9][spec.size - 1], rowsN = [4, 5, 6][spec.size - 1], step = 4;
        const width = (cols - 1) * step + 7, f = frame(width, 1), x0 = f.bx - Math.floor(cols / 2) * step;
        const height = TOP + 3 + (rowsN - 1) * step + 4;
        const cell = (c, r) => (r === 0 && c === Math.floor(cols / 2) ? 'approach' : `m${c}_${r}`);
        const list = [];
        for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
            if (cell(c, r) === 'approach') list.push(f.approach.slice());
            else list.push([cell(c, r), x0 + c * step, TOP + 1 + r * step, 0, 0, 'path']);
        }
        const links = carveMaze(random, cols, rowsN, cell);
        widenLeaves(random, list, links);
        const entryId = cell(Math.floor(cols / 2), rowsN - 1);
        const entryRoom = list.find(room => room[0] === entryId);
        entryRoom[3] = 1; entryRoom[4] = 1;
        assignRoles(random, list, links, entryId, 1 + spec.size);
        return finish(spec, { width, height, frame: f, rooms: list, links, passage: true, rotation: between(random, 0, 3) });
    }
    /** Randomised depth-first spanning tree over the junction grid. */
    function carveMaze(random, cols, rowsN, cell) {
        const seen = new Set(['0,0']), stack = [[0, 0]], links = [];
        while (stack.length) {
            const [c, r] = stack[stack.length - 1];
            const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => [c + dc, r + dr])
                .filter(([nc, nr]) => nc >= 0 && nr >= 0 && nc < cols && nr < rowsN && !seen.has(nc + ',' + nr));
            if (!next.length) { stack.pop(); continue; }
            const [nc, nr] = pick(random, next);
            seen.add(nc + ',' + nr); stack.push([nc, nr]); links.push([cell(c, r), cell(nc, nr)]);
        }
        return links;
    }
    /** Dead ends and a few crossings become small chambers (they get monsters); the rest stay paths. */
    function widenLeaves(random, list, links) {
        for (const room of list) {
            if (room[0] === 'approach') continue;
            const degree = neighbours(links, room[0]).length;
            if (degree === 1 || (degree >= 3 && random() < .25)) { room[3] = 1; room[4] = 1; room[5] = 'battle'; }
        }
    }

    /** 하강 갱도(혼돈 · 지하계): 좌우로 번갈아 내려가는 넓은 단 · 단마다 곁 굴. 맨 아래가 입구. */
    function descent(random, spec) {
        const terraces = [4, 5, 7][spec.size - 1], width = 39, f = frame(width, 1), gap = 6;
        const height = TOP + 3 + terraces * gap + 2;
        const list = [f.approach.slice()], links = [];
        let prev = 'approach';
        for (let t = 0; t < terraces; t++) {
            const left = t % 2 === 0, rx = between(random, 4, 6), x = left ? 3 + rx + between(random, 0, 3) : width - 4 - rx - between(random, 0, 3);
            const id = 't' + t, y = TOP + 5 + t * gap;
            list.push([id, x, y, rx, 1, 'battle']);
            links.push([prev, id]);
            if (random() < .45) {
                const side = left ? Math.min(width - 6, x + rx + 7) : Math.max(5, x - rx - 7);
                list.push([id + 's', side, y, 2, 1, 'battle']); links.push([id, id + 's']);
            }
            prev = id;
        }
        assignRoles(random, list, links, prev, 1 + spec.size);
        return finish(spec, { width, height, frame: f, rooms: list, links, rotation: pick(random, [0, 2]) });
    }

    /** 떠 있는 섬(창공 · 혼돈계): 흩어진 발판을 한 칸 다리로 잇는다(공중 재질은 다리 · 허공을 그린다). */
    function islands(random, spec) {
        const cols = [3, 4, 4][spec.size - 1], rowsN = [2, 3, 4][spec.size - 1], cw = 11, ch = 8;
        const width = cols * cw + 3, f = frame(width, 1), height = TOP + 4 + rowsN * ch + 2;
        const list = [f.approach.slice()];
        for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
            const rx = between(random, 2, 3), ry = between(random, 1, 2);
            const cx = 2 + c * cw + rx + between(random, 1, cw - 2 * rx - 3), cy = TOP + 5 + r * ch + ry + between(random, 0, ch - 2 * ry - 2);
            list.push([`i${r}_${c}`, cx, cy, rx, ry, 'battle']);
        }
        const near = (a, b) => Math.abs(a[1] - b[1]) <= cw + 3 && Math.abs(a[2] - b[2]) <= ch + 4;
        const links = connect(random, list, near, 1);
        const entry = list.slice(1).reduce((best, room) => (room[2] > best[2] ? room : best), list[1]);
        assignRoles(random, list, links, entry[0], 1 + spec.size);
        return finish(spec, { width, height, frame: f, rooms: list, links, passage: true, rotation: between(random, 0, 3) });
    }

    /** 연속 방(경계 너머 · 시련): 입구에서 보스까지 한 줄로 이어진 방들, 곳곳에 짧은 곁방. */
    function gauntlet(random, spec) {
        const chambers = spec.chambers || [3, 4, 5][spec.size - 1], width = 31, f = frame(width, 2), gap = 8;
        const height = TOP + 4 + chambers * gap + 2;
        const list = [f.approach.slice()], links = [];
        let prev = 'approach';
        for (let k = 0; k < chambers; k++) {
            const id = 'g' + k, x = f.bx + (k % 2 ? 1 : -1) * between(random, 3, 7), y = TOP + 7 + k * gap;
            list.push([id, x, y, between(random, 3, 5), 2, 'battle']);
            links.push([prev, id]);
            prev = id;
        }
        assignRoles(random, list, links, prev, Math.max(1, Math.floor(chambers / 2)));
        return finish(spec, { width, height, frame: f, rooms: list, links, rotation: 0 });
    }

    /** 투기장(보스전): 입구 → 짧은 대기실 → 관문 → 넓은 보스 방. 보스 말고는 몬스터가 없다. */
    function arena(random, spec) {
        const width = 25, f = frame(width, 1, { rx: 6, ry: 3 }), height = f.approach[2] + 12;
        f.approach[5] = 'path';
        const entry = ['entry', f.bx + pick(random, [-3, 0, 3]), height - 4, 2, 1, 'entry'];
        return finish(spec, { width, height, frame: f, rooms: [f.approach, entry], links: [['approach', 'entry']], rotation: 0 });
    }

    const BUILDERS = Object.freeze({ rooms, maze, descent, islands, gauntlet, arena });

    /** Normalised copy of a spec; throws for an unknown style / size (the save boundary rejects such runs). */
    function normalize(spec) {
        const size = Math.floor(Number(spec && spec.size) || 0), style = spec && spec.style;
        if (!BUILDERS[style] || size < 1 || size > 3 || typeof spec.biome !== 'string' || spec.seed === undefined) {
            throw Error('생성 탐험 맵 명세가 잘못되었습니다: ' + JSON.stringify(spec));
        }
        return withOptions({ style, biome: spec.biome, size, seed: String(spec.seed) }, spec);
    }
    function withOptions(out, spec) {
        if (Number.isInteger(spec.rotation)) out.rotation = ((spec.rotation % 4) + 4) % 4;
        if (Number.isInteger(spec.chambers)) out.chambers = Math.max(2, Math.min(8, spec.chambers));
        return out;
    }
    /** @returns {object} a map source in the authored format (actExplorationMap compiles it). */
    function build(spec) {
        const clean = normalize(spec);
        return BUILDERS[clean.style](rng(specKey(clean)), clean);
    }
    return Object.freeze({ styles: Object.keys(BUILDERS), key: spec => specKey(normalize(spec)), normalize, build });
})();
safeExposeGlobals({ explorationLayouts });
