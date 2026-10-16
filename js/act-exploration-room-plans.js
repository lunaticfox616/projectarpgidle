/** 방 단위 무대의 방 놓임새 (data/stage-room-plans.js, 2026-10-13 사용자: "맵구조 액트는 프리셋 4개중 소프트랜덤, 혼돈 이후부터는
 * 준 랜덤으로"). 지도에 적힌 방들(data/act-exploration-maps.js)은 그대로 두고, 방을 놓는 자리와 문으로 잇는 짝만 정한다: 방의 수와
 * 구실(전투, 정예, 들르는 방)이 그대로라 무리, 정예, 보급의 양이 지도마다 같다. 방 이름도 그대로라 방 이름을 적어 두는 기록
 * (아틀라스의 비운 방, 콘텐츠 방, 황금 방)이 그대로 맞는다.
 * - 놓임새는 격자다: 방은 칸 하나, 문은 맞닿은 두 칸 사이. 오른쪽이 무대의 오른쪽, 아래가 무대의 앞쪽이다(던파의 약도와 같다).
 * - 액트: 글자 그림 네 장 가운데 하나. 바로 앞에 걸은 놓임새는 다시 나오지 않고 그 앞의 것은 덜 나온다(소프트 랜덤).
 * - 그 밖의 구역: 씨앗으로 짠다(준 랜덤). 입구에서 오른쪽으로 뻗는 큰길에 전투 방과 정예 방이 놓이고, 남은 방은 큰길에서
 *   갈라진 곁가지가 된다. 들르는 방은 언제나 막다른 끝이다. 보스 방의 문은 하나다.
 * - 보스만 서는 투기장: 보스 방 앞의 방과 보스 방, 두 칸이다.
 * 순수 함수: 게임 상태와 DOM을 쓰지 않는다. choose와 region만 구역(zone)과 방금 걸은 놓임새의 기억을 읽는다.
 */
const actExplorationRoomPlans = (() => {
    const ROLE = Object.freeze({ S: 'entry', X: 'boss', b: 'battle', e: 'elite', o: 'optional' });
    const LETTER = Object.freeze({ entry: 'S', boss: 'X', battle: 'b', elite: 'e', optional: 'o' });
    const STEP = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] });
    const OPPOSITE = Object.freeze({ east: 'west', west: 'east', north: 'south', south: 'north' });
    const planCellAt = (cells, col, row) => cells.findIndex(cell => cell.col === col && cell.row === row);

    // ---------------------------------------------------------------- letter pictures
    /** 글자 그림 → { cells: [{ role, col, row }], links: [{ from, to, side }] }. side는 from 방에서 to 방을 보는 벽(east 또는 south). */
    function parsePlanLines(lines) {
        const cells = [], links = [];
        lines.forEach((line, y) => [...line].forEach((letter, x) => {
            if (y % 2 === 0 && x % 2 === 0 && ROLE[letter]) cells.push({ role: ROLE[letter], col: x / 2, row: y / 2 });
        }));
        lines.forEach((line, y) => [...line].forEach((letter, x) => {
            if (letter === '-' && y % 2 === 0) links.push({ from: planCellAt(cells, (x - 1) / 2, y / 2), to: planCellAt(cells, (x + 1) / 2, y / 2), side: 'east' });
            if (letter === '|' && x % 2 === 0) links.push({ from: planCellAt(cells, x / 2, (y - 1) / 2), to: planCellAt(cells, x / 2, (y + 1) / 2), side: 'south' });
        }));
        if (links.some(link => link.from < 0 || link.to < 0)) throw Error('방 놓임새의 문이 방에 닿지 않습니다: ' + lines.join('/'));
        return { cells, links };
    }
    /** 놓임새 → 글자 그림(검수와 기록에 쓴다). */
    function planLines(plan) {
        const width = Math.max(...plan.cells.map(cell => cell.col)) * 2 + 1, height = Math.max(...plan.cells.map(cell => cell.row)) * 2 + 1;
        const grid = Array.from({ length: height }, () => Array(width).fill(' '));
        for (const cell of plan.cells) grid[cell.row * 2][cell.col * 2] = LETTER[cell.role];
        for (const link of plan.links) {
            const from = plan.cells[link.from];
            if (link.side === 'east') grid[from.row * 2][from.col * 2 + 1] = '-';
            else grid[from.row * 2 + 1][from.col * 2] = '|';
        }
        return grid.map(row => row.join('').replace(/\s+$/, ''));
    }

    // ---------------------------------------------------------------- names
    /** 지도에 적힌 방 이름을 붙인다: 구실마다, 놓임새를 읽는 순서(위에서 아래, 왼쪽에서 오른쪽)대로 지도에 적힌 순서의 방이 된다. */
    function nameRooms(plan, base) {
        const left = new Map();
        for (const [id, , , , , role] of base.rooms) left.set(role, [...(left.get(role) || []), id]);
        const reading = plan.cells.map((cell, index) => index).sort((a, b) => plan.cells[a].row - plan.cells[b].row || plan.cells[a].col - plan.cells[b].col);
        const cells = plan.cells.map(cell => ({ ...cell }));
        for (const index of reading) cells[index].id = (left.get(cells[index].role) || []).shift();
        const spare = [...left.entries()].filter(([role, ids]) => role !== 'path' && ids.length).length;
        if (spare || cells.some(cell => !cell.id)) throw Error('방 놓임새의 방 수가 지도와 다릅니다: ' + base.id);
        return Object.freeze({ cells: Object.freeze(cells.map(Object.freeze)), links: Object.freeze(plan.links.map(Object.freeze)) });
    }
    /** 지도에 적힌 방의 구실별 수. */
    function roleCounts(base) {
        const counts = { battle: 0, elite: 0, optional: 0 };
        for (const row of base.rooms) if (row[5] in counts) counts[row[5]]++;
        return counts;
    }

    // ---------------------------------------------------------------- semi-semiRandomPlan
    const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
    function shuffledList(rng, list) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
        return out;
    }
    /** 무게를 단 뽑기: rows = [값, 무게]. */
    function weightedPick(rng, rows) {
        let roll = rng() * rows.reduce((sum, row) => sum + row[1], 0);
        for (const row of rows) { roll -= row[1]; if (roll < 0) return row[0]; }
        return rows[rows.length - 1][0];
    }
    /** 큰길에 서는 방과 곁가지가 되는 방을 가른다. 큰길의 첫 방은 전투 방이다(있다면). */
    function splitRoles(counts, rng, rule) {
        const share = rule.mainShare[0] + (rule.mainShare[1] - rule.mainShare[0]) * rng();
        const onMain = Math.max(Math.min(1, counts.battle), Math.min(counts.battle, Math.round(counts.battle * share)));
        const elites = Array.from({ length: counts.elite }, () => rng() < rule.eliteOnMain);
        const main = shuffledList(rng, [...Array(Math.max(0, onMain - 1)).fill('battle'), ...elites.filter(Boolean).map(() => 'elite')]);
        if (onMain) main.unshift('battle');
        const side = shuffledList(rng, [...Array(counts.battle - onMain).fill('battle'), ...elites.filter(on => !on).map(() => 'elite')]);
        return { main, side: [...side, ...Array(counts.optional).fill('optional')] };
    }
    /** 큰길의 다음 걸음: 오른쪽으로 자주, 위아래로 가끔. 방금 올라갔으면 내려가지 않고, 위아래로 turn번 넘게 잇지 않는다. */
    function nextMainStep(rng, rule, walk, last) {
        const upright = walk.side !== 'east', rows = [['east', last ? rule.east * rule.bossEast : rule.east]];
        if (walk.run < rule.turn) for (const side of ['north', 'south']) if (!upright || walk.side === side) rows.push([side, 1]);
        return weightedPick(rng, rows);
    }
    function walkMainPath(cells, links, roles, rng, rule) {
        const walk = { side: 'east', run: 0 };
        roles.forEach((role, index) => {
            const from = cells.length - 1, side = nextMainStep(rng, rule, walk, index === roles.length - 1), [dx, dy] = STEP[side];
            Object.assign(walk, { run: side === 'east' ? 0 : (walk.side === side ? walk.run + 1 : 1), side });
            cells.push({ role, col: cells[from].col + dx, row: cells[from].row + dy, main: true });
            links.push(side === 'north' ? { from: cells.length - 1, to: from, side: 'south' } : { from, to: cells.length - 1, side });
        });
    }
    /** 방 host의 빈 이웃 칸들: 보스 방과 맞닿는 칸은 비워 둔다(strict). */
    function freeCellsAround(cells, host, strict) {
        const boss = cells.find(cell => cell.role === 'boss');
        return Object.entries(STEP).map(([side, [dx, dy]]) => ({ side, col: host.col + dx, row: host.row + dy }))
            .filter(spot => planCellAt(cells, spot.col, spot.row) < 0 && !(strict && Math.abs(spot.col - boss.col) + Math.abs(spot.row - boss.row) <= 1));
    }
    /** 곁가지 방 하나를 붙인다: 들르는 방과 보스 방에는 붙지 않는다. 위아래에 더 자주 붙는다. */
    function attachSideRoom(cells, links, role, rng, rule) {
        for (const strict of [true, false]) {
            const hosts = cells.map((cell, index) => ({ cell, index, spots: freeCellsAround(cells, cell, strict) }))
                .filter(row => row.spots.length && row.cell.role !== 'boss' && row.cell.role !== 'optional');
            if (!hosts.length) continue;
            const host = weightedPick(rng, hosts.map(row => [row, row.cell.role === 'entry' ? rule.entryHost : row.cell.main ? 1 : rule.chain]));
            const spot = weightedPick(rng, host.spots.map(row => [row, row.side === 'north' || row.side === 'south' ? rule.upright : 1]));
            cells.push({ role, col: spot.col, row: spot.row });
            const index = cells.length - 1, forward = spot.side === 'east' || spot.side === 'south';
            links.push(forward ? { from: host.index, to: index, side: spot.side } : { from: index, to: host.index, side: OPPOSITE[spot.side] });
            return;
        }
        throw Error('방 놓임새에 방을 붙일 자리가 없습니다.');
    }
    /** 돌아가는 길: 맞닿았지만 문이 없는 두 방(보스 방, 들르는 방, 입구는 빼고)을 loop의 확률로 하나 잇는다. */
    function addLoopLink(cells, links, rng, rule) {
        const isOpenRoom = cell => cell.role === 'battle' || cell.role === 'elite', pairs = [];
        cells.forEach((cell, from) => {
            for (const side of ['east', 'south']) {
                const to = planCellAt(cells, cell.col + STEP[side][0], cell.row + STEP[side][1]);
                if (to >= 0 && isOpenRoom(cell) && isOpenRoom(cells[to]) && !links.some(link => link.from === from && link.to === to)) pairs.push({ from, to, side });
            }
        });
        if (pairs.length && rng() < rule.loop) links.push(pickOne(rng, pairs));
    }
    /** 준 랜덤 놓임새: 같은 씨앗이면 언제나 같다. */
    function semiRandomPlan(base, seed) {
        const rule = STAGE_ROOM_PLANS.random, rng = createSeededRng(`rooms:${base.id}:${seed}`), roles = splitRoles(roleCounts(base), rng, rule);
        const cells = [{ role: 'entry', col: 0, row: 0, main: true }], links = [];
        walkMainPath(cells, links, [...roles.main, 'boss'], rng, rule);
        for (const role of roles.side) attachSideRoom(cells, links, role, rng, rule);
        addLoopLink(cells, links, rng, rule);
        const left = Math.min(...cells.map(cell => cell.col)), top = Math.min(...cells.map(cell => cell.row));
        return nameRooms({ cells: cells.map(cell => ({ role: cell.role, col: cell.col - left, row: cell.row - top })), links }, base);
    }

    // ---------------------------------------------------------------- which plan
    /** 보스만 서는 투기장: 보스 방 앞의 방(입구)과 보스 방. */
    const arenaPlan = base => nameRooms(parsePlanLines(['S-X']), { ...base, rooms: base.rooms.filter(row => row[5] === 'entry' || row[5] === 'boss') });
    /** 한 줄로 이어진 놓임새(벌집 원정): 입구에서 보스 방까지 방을 CHAIN_WIDE칸씩 꺾어 가며 잇는다. 약도에서는 벌집처럼 접힌 한 줄이다.
     *   S-b-b-b
     *         |
     *   b-b-b-b
     *   |
     *   b-b-b-X */
    const CHAIN_WIDE = 4;
    /** 한 줄에 서는 방 수: 방이 열둘을 넘으면 줄을 넓힌다(약도가 세로로 길어지지 않게. 우주계와 깊은 심해는 방이 열셋을 넘는다). */
    const chainWide = total => (total <= 12 ? CHAIN_WIDE : total <= 18 ? 6 : 8);
    function chainPlan(base) {
        const total = base.rooms.length, wide = chainWide(total), rows = Math.ceil(total / wide), lines = [];
        const letter = index => (index >= total ? ' ' : index === 0 ? 'S' : index === total - 1 ? 'X' : 'b');
        for (let row = 0; row < rows; row++) {
            const cells = Array.from({ length: wide }, (unused, col) => letter(row * wide + (row % 2 ? wide - 1 - col : col)));
            lines.push(cells.map((cell, col) => cell + (col < wide - 1 ? (cell !== ' ' && cells[col + 1] !== ' ' ? '-' : ' ') : '')).join(''));
            if (row < rows - 1) lines.push(' '.repeat(row % 2 ? 0 : (wide - 1) * 2) + '|');
        }
        return nameRooms(parsePlanLines(lines), base);
    }
    /** 액트의 프리셋 하나(0부터). 그 액트에 프리셋이 없거나 번호가 없으면 null. */
    function presetPlan(base, index) {
        const lines = (STAGE_ROOM_PLANS.acts[base.act] || [])[index];
        return lines ? nameRooms(parsePlanLines(lines), base) : null;
    }
    /** @param {object} base 지도(data/act-exploration-maps.js의 한 줄, 투기장이면 구실이 바뀐 것)
     * @param {string} plan 놓임새 열쇠: 'p0'~'p3' 프리셋, 'g' 또는 'g숫자' 준 랜덤(숫자가 없으면 seed를 쓴다), 'c' 한 줄(벌집 원정)
     * @returns {?object} 방 이름이 붙은 놓임새. 없는 프리셋이면 null. */
    function buildRoomPlan(base, plan, seed) {
        if (base.rooms.some(row => row[5] === 'path')) return arenaPlan(base);
        if (plan === 'c') return chainPlan(base);
        if (plan[0] === 'p') return presetPlan(base, Number(plan.slice(1)));
        return semiRandomPlan(base, plan.length > 1 ? plan.slice(1) : seed);
    }
    const validPlanKey = plan => /^(p[0-3]|g\d{0,9}|c)$/.test(String(plan));

    const recent = new Map();                    // 액트 → 걸은 프리셋 번호(가장 최근이 맨 앞). 저장하지 않는다.
    /** 소프트 랜덤: 바로 앞의 프리셋은 soft.last, 그 앞의 것은 soft.before의 무게로 덜 나온다. */
    function softPickPreset(act) {
        const count = (STAGE_ROOM_PLANS.acts[act] || []).length, seen = recent.get(act) || [], soft = STAGE_ROOM_PLANS.soft;
        if (!count) return null;
        const rows = Array.from({ length: count }, (unused, index) => [index, index === seen[0] ? soft.last : index === seen[1] ? soft.before : 1]);
        const index = rows.some(row => row[1] > 0) ? weightedPick(Math.random, rows) : 0;
        recent.set(act, [index, seen[0]]);
        return index;
    }
    /** 새 탐험의 놓임새 열쇠. 액트는 프리셋 가운데 하나(테스트 패널에서 고른 번호가 있으면 그것, '준 랜덤'을 골랐으면 새 씨앗),
     * 그 밖의 구역은 그 탐험의 씨앗으로 짠다. */
    function chooseRoomPlan(where, wanted) {
        if (where.source && where.source.chain) return 'c';
        if (!where.act) return 'g';
        if (wanted === 'semiRandomPlan') return 'g' + Math.floor(Math.random() * 1e9);
        const fixed = Number(wanted), count = (STAGE_ROOM_PLANS.acts[where.act] || []).length;
        if (Number.isInteger(fixed) && fixed >= 1 && fixed <= count) return 'p' + (fixed - 1);
        const index = softPickPreset(where.act);
        return index === null ? 'g' + Math.floor(Math.random() * 1e9) : 'p' + index;
    }

    // ---------------------------------------------------------------- region art
    const actRegionName = act => 'act-' + String(act).padStart(2, '0');
    /** 보스 구역의 지역: 정점은 그 영역, 버려진 날은 무너진 중정, 우주의 끝은 우주계. */
    function bossRegionName(zone, rule) {
        if (zone.pinnacleTrack) return rule.tracks[zone.pinnacleTrack] || '';
        return zone.rivalBlade ? rule.rival : zone.cosmosCapstone ? rule.capstone : '';
    }
    /** 구역의 무대 그림(data/stage-regions.js의 지역 이름). 정해 둔 것이 없으면 그 구역이 빌려 걷는 액트 지도의 그림이다. */
    function regionForZone(zone, where) {
        const rule = STAGE_ROOM_PLANS.regions;
        if (where.act) return actRegionName(where.act);
        const own = rule.zones[zone.id] || (zone.type === 'abyss' && zone.isEndlessDepth ? rule.deep : rule.types[zone.type])
            || (zone.type === 'timeRift' ? rule.rift[zone.riftPhase] : bossRegionName(zone, rule));
        return own || (where.source.style === 'act' ? actRegionName(where.source.act) : '');
    }
    return Object.freeze({ parse: parsePlanLines, text: planLines, build: buildRoomPlan, valid: validPlanKey, choose: chooseRoomPlan, region: regionForZone,
        random: semiRandomPlan, countsOf: roleCounts });
})();
safeExposeGlobals({ actExplorationRoomPlans });
