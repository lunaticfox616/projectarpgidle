'use strict';
/* 이야기 대사 편집기(scripts/story-line-editor-server.js)가 보여 주고 바꾸는 대사: 주인공, NPC(머리 위 말과 창의 키워드), 보스.
 * 게임 파일은 실행하지 않고 구문만 푼다(espree). 대사 문자열마다 표 안의 길(path)과 자리(range)를 모으고, 저장은 그 자리의 글이
 * 편집기가 읽은 글과 같을 때만 같은 따옴표의 새 문자열로 바꾼다. 언제 나오는지는 js/canvas-act-title-card.js(띠와 말풍선),
 * js/act-exploration-doors.js storyGuide(1막 안내자는 루프 1에만 선다), js/content-progression-ui.js(NPC 창)를 따른다. */
const fs = require('fs');
const path = require('path');
const espree = require('espree');

const PARSE = Object.freeze({ ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true });
const STORY = 'data/story-journal.js', BOARD = 'data/atlas-board.js';
const LINE_FILES = Object.freeze([STORY, BOARD]);
// 지역과 지도의 이름(id와 name이 함께 적힌 객체), 액트 제목과 보스 이름(STORY_ACTS).
const NAME_FILES = Object.freeze(['data/maps.js', 'data/atlas-endgame.js', 'js/state.js']);
// scripts/import-story-pack.cjs와 같은 규칙: 화면 대사(띠와 말풍선)는 50자까지(넘으면 경고), 가운뎃점과 줄표는 오류.
const SCREEN_MAX = 50;
const BANNED = /[·・—―]/u;
const AREAS = Object.freeze({
    anywhere: { key: 'anywhere', label: '여러 액트', order: 0 },
    trial: { key: 'trial', label: '시련', order: 11 },
    endgame: { key: 'endgame', label: '엔드게임', order: 12 },
    window: { key: 'window', label: 'NPC 창', order: 13 }
});
const BOSS_WHEN = Object.freeze({ intro: '보스가 나타나고 3초쯤 뒤', half: '보스 생명력 55% 이하', defeat: '보스가 쓰러질 때' });
// When a line comes in a run of its map, for the editor's order within a group.
const MOMENT = Object.freeze({ keyword: 0, wakeLine: 1, spotLine: 2, bark: 3, loopBark: 4, classBarks: 5, classReplies: 6, muse: 7, stele: 8,
    eliteLine: 9, intro: 10, half: 11, defeat: 12, bossLines: 13, afterClear: 14 });

// ---- 구문 나무 읽기 ---------------------------------------------------------------------------------------------------------
const isFreeze = node => node && node.type === 'CallExpression' && node.callee.type === 'MemberExpression'
    && node.callee.object.name === 'Object' && node.callee.property.name === 'freeze' && node.arguments.length === 1;
const unwrap = node => (isFreeze(node) ? node.arguments[0] : node);
const keyOf = prop => (prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value));
const plainProps = node => node.properties.filter(prop => prop.type === 'Property' && !prop.computed);
/** [key, value node] of an object or an array (Object.freeze around it is looked through). */
function entries(node) {
    const value = unwrap(node);
    if (value && value.type === 'ObjectExpression') return plainProps(value).map(prop => [keyOf(prop), prop.value]);
    if (value && value.type === 'ArrayExpression') return value.elements.map((element, index) => [String(index), element]);
    return [];
}
function child(node, key) {
    const found = entries(node).find(([name]) => name === String(key));
    return found ? found[1] : null;
}
function stringOf(node) {
    if (node && node.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node && node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
    return null;
}
/** The file's top-level const tables by name. */
function tablesOf(ast) {
    const tables = {};
    for (const stmt of ast.body) {
        if (stmt.type !== 'VariableDeclaration') continue;
        for (const decl of stmt.declarations) if (decl.id.type === 'Identifier' && decl.init) tables[decl.id.name] = decl.init;
    }
    return tables;
}
function walk(node, visit) {
    if (!node || typeof node.type !== 'string') return;
    visit(node);
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(item => walk(item, visit));
        else if (value && typeof value.type === 'string') walk(value, visit);
    }
}

// ---- 이름 ----------------------------------------------------------------------------------------------------------------
/** Act titles and boss names by act order, and the name of every zone or atlas map by id (an id written as a const of its file
 * counts, as js/state.js names the outside-chaos fight). */
function readNames(root) {
    const acts = {}, byId = {};
    for (const file of NAME_FILES) {
        const ast = espree.parse(fs.readFileSync(path.join(root, file), 'utf8'), PARSE), tables = tablesOf(ast);
        const consts = Object.fromEntries(Object.entries(tables).map(([name, node]) => [name, stringOf(node)]).filter(([, value]) => value));
        walk(ast, node => {
            if (node.type !== 'ObjectExpression') return;
            const idNode = child(node, 'id'), name = stringOf(child(node, 'name'));
            const id = stringOf(idNode) || (idNode && idNode.type === 'Identifier' ? consts[idNode.name] : null);
            if (id && name && !byId[id]) byId[id] = name;
        });
        for (const [, row] of entries(tables.STORY_ACTS)) {
            const order = child(row, 'order');
            if (order && order.type === 'Literal') acts[order.value] = { title: stringOf(child(row, 'title')) || '', bossName: stringOf(child(row, 'bossName')) || '' };
        }
    }
    return { acts, byId };
}

// ---- 대사 모으기 ------------------------------------------------------------------------------------------------------------
function makeCollector(file, rows) {
    /** One line: the string at keys (table name first), with where and when it shows. Missing or non-string slots are skipped. */
    return (keys, node, info) => {
        const text = stringOf(node);
        if (text === null) return;
        rows.push({ id: `${file}#${keys.join('/')}`, file, path: keys, line: node.loc.start.line, range: node.range,
            quote: node.type === 'TemplateLiteral' ? '`' : null, text, cls: null, kind: 'line', screen: true, moment: 0, ...info });
    };
}
function places(names) {
    const act = order => ({ key: `act-${order}`, label: `${order}막`, order: Number(order) });
    const actPlace = order => `${order}막 ${(names.acts[order] || {}).title || ''}`.trim();
    return { act, actPlace, zoneName: id => names.byId[id] || id };
}
/** The hero's own lines (STORY_CLASS_ORIGINS), its answers to a guide's first words (classReplies), and act 1's entry lines
 * from loop 2, said by the hero since act 1's guide stands there only in loop 1. */
function heroLines(tables, where, push) {
    const classes = entries(tables.STORY_CLASS_ORIGINS).map(([id, origin]) => ({ id, label: stringOf(child(origin, 'label')) || id, origin }));
    const labelOf = id => (classes.find(row => row.id === id) || {}).label || id;
    for (const { id, label, origin } of classes) {
        const base = ['STORY_CLASS_ORIGINS', id], hero = { tab: 'hero', group: label, cls: id, speaker: label };
        push([...base, 'wakeLine'], child(origin, 'wakeLine'), { ...hero, area: where.act(1), place: where.actPlace(1), moment: MOMENT.wakeLine, when: '루프 1, 1막 입구 방에서 일어날 때' });
        push([...base, 'spotLine'], child(origin, 'spotLine'), { ...hero, area: where.act(1), place: where.actPlace(1), moment: MOMENT.spotLine, when: '루프 1, 하켄이 맞는 모습을 볼 때' });
        push([...base, 'eliteLine'], child(origin, 'eliteLine'), { ...hero, area: AREAS.anywhere, place: '모든 액트', moment: MOMENT.eliteLine, when: '루프마다 처음 보스 문이 열릴 때' });
        for (const [order, node] of entries(child(origin, 'bossLines'))) {
            push([...base, 'bossLines', order], node, { ...hero, area: where.act(order), place: where.actPlace(order), moment: MOMENT.bossLines, when: `${order}막 보스를 쓰러뜨린 뒤` });
        }
    }
    for (const [table, area, placeOf] of encounterTables(where)) {
        for (const [key, entry] of entries(tables[table])) {
            // The guide by its own name, as js/content-progression-ui.js personal reads it ('뿌리끝의 드루이드, 하켄': 하켄).
            const npc = child(entry, 'npc'), npcName = (stringOf(child(npc, 'name')) || '안내자').split(/[,\s]+/).pop(), keys = [table, key, 'npc'];
            for (const [cls, node] of entries(child(npc, 'classReplies'))) {
                push([...keys, 'classReplies', cls], node, { tab: 'hero', group: labelOf(cls), cls, speaker: labelOf(cls), area: area(key), place: placeOf(key),
                    moment: MOMENT.classReplies, when: `루프 1, ${npcName}의 첫 인사에 답할 때` });
            }
            if (table !== 'STORY_ACT_ENCOUNTERS' || key !== '1') continue;
            const muse = { tab: 'hero', area: area(key), place: placeOf(key), moment: MOMENT.muse };
            push([...keys, 'loopBark'], child(npc, 'loopBark'), { ...muse, group: '모든 직업', speaker: '주인공', when: '3 이상 홀수 루프, 1막 입구 방에서 일어날 때' });
            for (const [cls, node] of entries(child(npc, 'classBarks'))) {
                push([...keys, 'classBarks', cls], node, { ...muse, group: labelOf(cls), cls, speaker: labelOf(cls), when: '짝수 루프, 1막 입구 방에서 일어날 때' });
            }
        }
    }
    return classes.map(({ id, label }) => ({ id, label }));
}
function encounterTables(where) {
    return [['STORY_ACT_ENCOUNTERS', where.act, where.actPlace], ['STORY_TRIAL_ENCOUNTERS', () => AREAS.trial, where.zoneName]];
}
/** The guides' words over their heads on their maps (acts and trials; act 1's loop 2 lines are the hero's, above), and the steles. */
function guideLines(tables, where, push, labelOf) {
    for (const [table, area, placeOf] of encounterTables(where)) {
        for (const [key, entry] of entries(tables[table])) {
            const here = { tab: 'npc', group: placeOf(key), area: area(key), place: placeOf(key) }, act = table === 'STORY_ACT_ENCOUNTERS';
            guideWords(child(entry, 'npc'), [table, key, 'npc'], { here, greets: act, heroSays: act && key === '1' }, push, labelOf);
            steleWords(child(entry, 'stele'), [table, key, 'stele'], here, push);
        }
    }
}
/** how: here (the row's place), greets (an act's first line also greets in the NPC window), heroSays (act 1: from loop 2 the hero's). */
function guideWords(npc, keys, how, push, labelOf) {
    const here = { ...how.here, speaker: stringOf(child(npc, 'name')) || '안내자' };
    push([...keys, 'bark'], child(npc, 'bark'), { ...here, moment: MOMENT.bark, when: how.greets ? '루프 1에 만날 때, NPC 창 인사말' : '루프 1에 만날 때' });
    if (how.heroSays) return;
    push([...keys, 'loopBark'], child(npc, 'loopBark'), { ...here, moment: MOMENT.loopBark, when: '3 이상 홀수 루프에 만날 때' });
    for (const [cls, node] of entries(child(npc, 'classBarks'))) {
        push([...keys, 'classBarks', cls], node, { ...here, cls, moment: MOMENT.classBarks, when: `짝수 루프에 만날 때, 주인공이 ${labelOf(cls)}` });
    }
}
/** A stele's words: in a side room, or after the boss falls (afterClear). */
function steleWords(stele, keys, here, push) {
    const after = child(stele, 'afterClear'), ending = !!after && after.value === true;
    push([...keys, 'bark'], child(stele, 'bark'), { ...here, speaker: stringOf(child(stele, 'title')) || '비석',
        moment: ending ? MOMENT.afterClear : MOMENT.stele, when: ending ? '보스를 쓰러뜨린 뒤, 비석 글' : '곁방에 들어갈 때, 비석 글' });
}
/** The keywords of the NPC windows (STORY_NPCS dialogues): the keyword, then what the NPC says to it. */
function keywordLines(tables, push) {
    for (const [id, npc] of entries(tables.STORY_NPCS)) {
        const speaker = stringOf(child(npc, 'name')) || id, group = `${speaker} 창 키워드`;
        for (const [index, row] of entries(child(npc, 'dialogues'))) {
            const keys = ['STORY_NPCS', id, 'dialogues', index];
            const here = { tab: 'npc', group, area: AREAS.window, place: '창 키워드', speaker, screen: false, moment: MOMENT.keyword };
            push([...keys, 'topic'], child(row, 'topic'), { ...here, kind: 'keyword', when: '키워드 이름' });
            push([...keys, 'line'], child(row, 'line'), { ...here, when: `키워드를 누르면 (${opensAt(row)})` });
        }
    }
}
/** From when a keyword shows (reqAct, reqLoop; js/content-progression-ui.js npcTopics). */
function opensAt(row) {
    const reqAct = child(row, 'reqAct'), reqLoop = child(row, 'reqLoop');
    const opens = [reqAct && `${reqAct.value}막`, reqLoop && `루프 ${reqLoop.value}`].filter(Boolean).join(', ');
    return opens ? `${opens}부터` : '처음부터';
}
/** Boss lines: acts and trials (boss intro, half, defeat), the endgame fights (STORY_ENDGAME_ENCOUNTERS by zone id). A line in
 * 「…」 is narration of the fight, one in “…” the boss speaking. */
function bossLines(tables, where, push, names) {
    const speakerOf = (node, boss) => (stringOf(node) || '').startsWith('「') ? '해설' : boss;
    for (const [table, area, placeOf] of encounterTables(where)) {
        for (const [key, entry] of entries(tables[table])) {
            const boss = child(entry, 'boss'), name = table === 'STORY_ACT_ENCOUNTERS' ? (names.acts[key] || {}).bossName || '보스' : '보스';
            for (const field of Object.keys(BOSS_WHEN)) {
                const node = child(boss, field);
                push([table, key, 'boss', field], node, { tab: 'boss', group: placeOf(key), area: area(key), place: placeOf(key), speaker: speakerOf(node, name),
                    moment: MOMENT[field], when: BOSS_WHEN[field] });
            }
        }
    }
    for (const [key, entry] of entries(tables.STORY_ENDGAME_ENCOUNTERS)) {
        for (const field of Object.keys(BOSS_WHEN)) {
            const node = child(entry, field), place = where.zoneName(key);
            push(['STORY_ENDGAME_ENCOUNTERS', key, field], node, { tab: 'boss', group: place, area: AREAS.endgame, place, speaker: speakerOf(node, '보스'),
                moment: MOMENT[field], when: BOSS_WHEN[field] });
        }
    }
}
/** The atlas board's gate keeper (data/atlas-board.js ATLAS_BOARD.text.boss), spoken like an endgame boss. */
function boardLines(tables, push) {
    const text = child(tables.ATLAS_BOARD, 'text'), boss = child(text, 'boss');
    const place = stringOf(child(text, 'title')) || '아틀라스 나이테', name = stringOf(child(boss, 'name')) || '보스';
    for (const field of Object.keys(BOSS_WHEN)) {
        const node = child(boss, field);
        push(['ATLAS_BOARD', 'text', 'boss', field], node, { tab: 'boss', group: place, area: AREAS.endgame, place,
            speaker: (stringOf(node) || '').startsWith('「') ? '해설' : name, moment: MOMENT[field], when: BOSS_WHEN[field] });
    }
}
function readTexts(root) {
    return Object.fromEntries(LINE_FILES.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
}
const TAB_ORDER = Object.freeze(['hero', 'npc', 'boss']);
/** The editor's order, for the page and the exported sheet: by tab, then groups in the order of their first act (ties in file
 * order), then lines by act and by when they come in a run of the map. */
function pageOrder(rows) {
    const fileOrder = new Map(rows.map((row, index) => [row, index]));
    const byRun = (a, b) => a.area.order - b.area.order || a.moment - b.moment || fileOrder.get(a) - fileOrder.get(b);
    const lead = new Map();
    [...rows].sort(byRun).forEach(row => {
        if (!lead.has(`${row.tab}/${row.group}`)) lead.set(`${row.tab}/${row.group}`, row);
    });
    const leadOf = row => lead.get(`${row.tab}/${row.group}`);
    const byGroup = (a, b) => leadOf(a).area.order - leadOf(b).area.order || fileOrder.get(leadOf(a)) - fileOrder.get(leadOf(b));
    return [...rows].sort((a, b) => TAB_ORDER.indexOf(a.tab) - TAB_ORDER.indexOf(b.tab) || byGroup(a, b) || byRun(a, b));
}
/** Every line the editor shows, read from the given file texts, in the editor's order: { lines, classes }. */
function collectLines(texts, names) {
    const rows = [], where = places(names);
    const story = tablesOf(espree.parse(texts[STORY], PARSE)), pushStory = makeCollector(STORY, rows);
    const classes = heroLines(story, where, pushStory);
    const labelOf = id => (classes.find(row => row.id === id) || {}).label || id;
    guideLines(story, where, pushStory, labelOf);
    keywordLines(story, pushStory);
    bossLines(story, where, pushStory, names);
    boardLines(tablesOf(espree.parse(texts[BOARD], PARSE)), makeCollector(BOARD, rows));
    return { lines: pageOrder(rows).map(row => ({ ...row, quote: row.quote || texts[row.file][row.range[0]] })), classes };
}

// ---- 저장 ----------------------------------------------------------------------------------------------------------------
/** Why a new line cannot be saved, or ''. */
function refusal(text) {
    if (typeof text !== 'string') return '글이 아닙니다.';
    if (/[\u0000-\u001f\u2028\u2029]/u.test(text)) return '줄바꿈이나 제어 문자는 넣을 수 없습니다.';
    if (BANNED.test(text)) return '가운뎃점이나 줄표(·・—―)는 넣을 수 없습니다.';
    if ([...text].length > 400) return '400자를 넘습니다.';
    return '';
}
/** A string literal for text in the quote mark of the one it replaces. */
function literalFor(text, quote) {
    const escaped = text.replace(/\\/g, '\\\\');
    if (quote === '`') return `\`${escaped.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
    return `${quote}${escaped.split(quote).join(`\\${quote}`)}${quote}`;
}
/** The line a change names, once it is known, not named twice, still as the editor read it, and its new text can be saved. */
function changedRow(byId, wanted, change) {
    const row = byId.get(change && change.id);
    if (!row) throw new Error(`편집기가 모르는 줄입니다: ${change && change.id}`);
    if (wanted.has(row.id)) throw new Error(`같은 줄이 두 번 왔습니다: ${row.id}`);
    if (row.text !== change.before) throw new Error(`${row.place}, ${row.speaker}: 파일의 글이 편집기가 읽은 글과 다릅니다. 새로 읽기를 누른 뒤 다시 고쳐 주세요.`);
    const why = refusal(change.after);
    if (why) throw new Error(`${row.place}, ${row.speaker}: ${why}`);
    return row;
}
/** The texts after one save. changes: [{ id, before, after }], each a line the editor shows whose text is still before.
 * Throws with the reason when a change cannot be made; checks that the new texts read back with only those lines changed. */
function planSave(texts, names, changes) {
    if (!Array.isArray(changes) || !changes.length) throw new Error('바뀐 줄이 없습니다.');
    const now = collectLines(texts, names), byId = new Map(now.lines.map(row => [row.id, row])), wanted = new Map();
    for (const change of changes) wanted.set(change.id, { row: changedRow(byId, wanted, change), after: change.after });
    const next = { ...texts };
    const edits = [...wanted.values()].sort((a, b) => b.row.range[0] - a.row.range[0]);
    for (const { row, after } of edits) {
        const text = next[row.file];
        next[row.file] = text.slice(0, row.range[0]) + literalFor(after, row.quote) + text.slice(row.range[1]);
    }
    const read = collectLines(next, names), back = new Map(read.lines.map(row => [row.id, row.text]));
    const wrong = now.lines.filter(row => back.get(row.id) !== (wanted.has(row.id) ? wanted.get(row.id).after : row.text));
    if (wrong.length || back.size !== byId.size) throw new Error(`바꾼 파일을 다시 읽으니 다른 줄까지 달라졌습니다: ${wrong.map(row => row.id).join(', ')}`);
    return { texts: next, files: LINE_FILES.filter(file => next[file] !== texts[file]), changed: [...wanted.values()], lines: now.lines };
}

// ---- 스토리 바이블 ---------------------------------------------------------------------------------------------------------
// A line in the bible's tables keeps a | escaped.
const bibleForm = text => text.replace(/\|/g, '\\|');
const countIn = (text, part) => (part ? text.split(part).length - 1 : 0);
/** The bible after the same changes: each old line found there is replaced, every place it stands, when the game has that text in
 * this one line only (or all its lines with that text change alike). rows: what happened to each change. */
function bibleAfter(bible, plan) {
    let text = bible;
    const done = new Map();
    const rows = plan.changed.map(({ row, after }) => {
        const before = bibleForm(row.text), count = done.has(before) ? done.get(before) : countIn(text, before);
        const twins = plan.lines.filter(other => other.text === row.text), alike = twins.every(twin => {
            const change = plan.changed.find(item => item.row.id === twin.id);
            return change && change.after === after;
        });
        const status = !count ? 'missing' : (twins.length === 1 || alike ? 'changed' : 'shared');
        if (status === 'changed' && !done.has(before)) text = text.split(before).join(bibleForm(after));
        if (status === 'changed') done.set(before, count);
        return { id: row.id, place: row.place, speaker: row.speaker, status, count };
    });
    return { text, rows };
}

module.exports = { STORY, BOARD, LINE_FILES, SCREEN_MAX, BANNED, readNames, readTexts, collectLines, planSave, bibleAfter, literalFor, refusal };
