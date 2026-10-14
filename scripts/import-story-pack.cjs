#!/usr/bin/env node
/* Gemini가 보낸 이야기 묶음(data/story-journal.js, data/maps.js, docs/story-bible.md)을 검사하고 게임에 넣는다.
 *
 *   node scripts/import-story-pack.cjs <묶음 폴더>           검사만
 *   node scripts/import-story-pack.cjs <묶음 폴더> --write   오류가 없으면 게임 파일로 옮긴다
 *   node scripts/import-story-pack.cjs --check              게임에 들어 있는 이야기 글을 검사
 *
 * 묶음은 실행하지 않고 구문만 푼다(espree). 표는 값으로만 읽고(Object.freeze와 앞 표의 칸 참조만 받는다), 표가 아닌 코드는
 * 게임 파일과 같아야 한다. 검사: 표의 열쇠(직업, 액트 순서, 시련 지역, 엔드게임 지역, 해금 항목), 장면 id, 가운뎃점과 줄표,
 * 화면 대사 길이, data/maps.js는 한글 글만 바뀌었는지. 옮길 때는 게임이 읽지 않는 표와 칸(DROP)을 빼고(묶음과 바이블에는
 * 남는다) 해설을 줄 배열로 바꾸고 표마다 설명 주석을 붙인다. data/maps.js는 바뀐 글만 게임 파일에 옮겨 적는다.
 * 처음 보는 표나 칸은 오류다: 화면에 연결하고 FIELDS에 넣거나 DROP에 넣은 뒤 다시 돌린다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');

const root = path.resolve(__dirname, '..');
const STORY = 'data/story-journal.js', MAPS = 'data/maps.js', BIBLE = 'docs/story-bible.md';
const PARSE = Object.freeze({ ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true, comment: true });
// 화면 대사 한 줄: PC 띠 한 줄, 말풍선은 19자마다 접는다(js/canvas-act-title-card.js). 넘으면 경고만 한다.
const SCREEN_MAX = 50;
const SCREEN_FIELDS = new Set(['wakeLine', 'eliteLine', 'bossLines', 'bark', 'loopBark', 'classBarks', 'classReplies', 'intro', 'half', 'defeat', 'quote']);
// 직업 id로 나뉜 대사: 열쇠가 직업 id가 아니면 그 줄은 게임에 나오지 않는다.
const CLASS_KEYED = new Set(['classBarks', 'classReplies']);
const BANNED = /[·・—―]/u;
const HANGUL = /[가-힣]/u;
const SCENE_TABLES = ['SUPPLIED_STORY_SCENES', 'STORY_BRIDGE_SCENES'];
const OTHER_TABLES = ['STORY_JOURNAL_SCENES', 'STORY_QUOTE_PLACEMENT', 'STORY_SCENE_QUOTES'];
// 게임이 읽는 칸(js/canvas-act-title-card.js, js/content-progression-ui.js, js/loop-ui.js). 장면 표는 id와 순서만 본다.
const FIELDS = Object.freeze({
    STORY_CLASS_ORIGINS: ['label', 'wakeLine', 'eliteLine', 'bossLines'],
    STORY_ACT_ENCOUNTERS: ['npc', 'stele', 'boss'], STORY_TRIAL_ENCOUNTERS: ['npc', 'stele', 'boss'],
    STORY_ENDGAME_ENCOUNTERS: ['intro', 'half', 'defeat'], STORY_LOOP_MILESTONES: ['narration', 'speaker', 'quote'],
    STORY_NPCS: ['id', 'name', 'title'],
    npc: ['name', 'bark', 'loopBark', 'classBarks', 'classReplies', 'tone'], stele: ['title', 'bark'], boss: ['intro', 'half', 'defeat']
});
// 게임이 읽지 않아 옮길 때 빼는 표와 칸.
const DROP = Object.freeze({
    tables: [],
    STORY_NPCS: ['dialogues'], // 상황별 대사 초안(바이블 4장): 화면에 나오는 대사는 STORY_ACT_ENCOUNTERS가 맡는다
    STORY_CLASS_ORIGINS: ['crime'], // 추방 죄목: 직업 선택 창은 초상과 이름만 둔다(2026-10-15)
    STORY_ENDGAME_ENCOUNTERS: ['name'], // 띠의 화자는 그 싸움의 보스 이름
    npc: ['bubble'], stele: ['bubble'],
    boss: ['immortalRevive', 'rootBridge', 'handGap'] // 연출 스위치: 그리는 코드가 없다
});
// 지역 id가 아닌 열쇠는 옮길 때 지역 id로 바꾼다.
const RENAME = Object.freeze({ STORY_ENDGAME_ENCOUNTERS: Object.freeze({ woodsman: 'outside_chaos_woodsman' }) });
const KNOWN_TABLES = new Set([...SCENE_TABLES, ...OTHER_TABLES, ...Object.keys(FIELDS).filter(name => name.startsWith('STORY_'))]);
// 옮긴 파일의 설명 주석(묶음의 주석은 모두 빼고 이것을 붙인다).
const COMMENTS = Object.freeze({
    head: ['Story text (docs/story-bible.md), brought in by scripts/import-story-pack.cjs. Scenes play at act start and end and',
        'fill the journal (js/story-journal-ui.js); the room-stage lines are spoken over the battlefield',
        '(js/canvas-act-title-card.js); the unlock lines sit in the unlock window and the loop result',
        '(js/content-progression-ui.js, js/loop-ui.js).'],
    STORY_BRIDGE_SCENES: ['Text-only scenes for beats the illustrated set skips (act 1 only: the act 3, 7 and 8 ends were dropped on',
        '2026-10-15, docs/stage-view-20261011.md). A scene added here after release needs the seen marker in js/story-journal-ui.js',
        'markPassedBridges raised, or saves already past its act get it out of order.'],
    STORY_JOURNAL_SCENES: ['Story order: the journal, the popups and the idle-return fold read it in this order.'],
    STORY_QUOTE_PLACEMENT: ['The spoken lines of each journal entry (data/maps.js JOURNAL_DB) stay with the scene where they are said, before it',
        '(verdicts, last words) or after it (reflections).'],
    STORY_CLASS_ORIGINS: ["Spoken by the hero: wakeLine in act 1's entry room, eliteLine when the boss gate opens, bossLines[act] after the act",
        'boss falls.'],
    STORY_NPCS: ["The story's five NPCs (docs/story-bible.md section 4): id (also the stage art's id, data/stage-view.js STAGE_NPC_ART), name as",
        'the encounters write it, and title. Each keeps the unlocks whose loop lines it speaks (STORY_LOOP_MILESTONES speaker): the NPC',
        'window lists them (js/content-progression-ui.js openNpc).'],
    STORY_ACT_ENCOUNTERS: ['Room-stage lines per act (key: STORY_ACTS order; STORY_TRIAL_ENCOUNTERS below has the same shape per trial zone id): npc on',
        'entering the entry room (loopBark from loop 2 on), stele on entering a side room, boss intro once the final boss is up,',
        'half at 55% life, defeat when the map is cleared. Each line 50 characters at most (one line of the band on PC).'],
    STORY_ENDGAME_ENCOUNTERS: ["The boss lines of the endgame fights, spoken like an act boss's (key: zone id; an atlas map's apex boss by its",
        'atlasStages id).'],
    STORY_LOOP_MILESTONES: ['One per unlock (data/content-progression.js CONTENT_UNLOCK_CATALOG id); default closes the loop result.']
});

function read(file) {
    return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
}
function writeLike(file, raw) {
    const text = raw.endsWith('\n') ? raw : `${raw}\n`; // a pack file may end without a line break
    const crlf = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('\r\n');
    fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
}
function fail(node, why) {
    throw new Error(`${node.loc ? node.loc.start.line + '번째 줄: ' : ''}${why}`);
}

// ---- 표를 값으로 읽기 -------------------------------------------------------------------------------------------------------
const unwrap = node => (node && node.type === 'CallExpression' && isFreeze(node) ? node.arguments[0] : node);
function isFreeze(node) {
    const callee = node.callee;
    return callee.type === 'MemberExpression' && !callee.computed && callee.object.name === 'Object' && callee.property.name === 'freeze'
        && node.arguments.length === 1;
}
function keyName(prop) {
    const plain = prop.type === 'Property' && prop.kind === 'init' && !prop.computed && !prop.method && !prop.shorthand;
    if (!plain) fail(prop, '값이 아닌 칸');
    return prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
}
function tableRow(node, scope) {
    const named = node.computed && node.object.type === 'Identifier' && Object.hasOwn(scope, node.object.name);
    return named && node.property.type === 'Literal' ? scope[node.object.name][node.property.value] : fail(node, '앞 표의 칸이 아닌 참조');
}
const VALUES = Object.freeze({
    Literal: node => node.value,
    TemplateLiteral: node => (node.expressions.length ? fail(node, '식이 든 템플릿 문자열') : node.quasis[0].value.cooked),
    ArrayExpression: (node, scope) => node.elements.map(child => evaluate(child, scope)),
    ObjectExpression: (node, scope) => Object.fromEntries(node.properties.map(prop => [keyName(prop), evaluate(prop.value, scope)])),
    CallExpression: (node, scope) => (isFreeze(node) ? evaluate(node.arguments[0], scope) : fail(node, '함수 호출')),
    MemberExpression: tableRow,
    UnaryExpression: (node, scope) => (node.operator === '-' ? -evaluate(node.argument, scope) : fail(node, `연산자 ${node.operator}`))
});
function evaluate(node, scope) {
    const value = node && VALUES[node.type];
    return value ? value(node, scope) : fail(node || {}, `값이 아닌 식 ${node ? node.type : '(빈 칸)'}`);
}
function tableDeclaration(stmt) {
    if (stmt.type !== 'VariableDeclaration' || stmt.kind !== 'const' || stmt.declarations.length !== 1) return null;
    const decl = stmt.declarations[0];
    return decl.id.type === 'Identifier' && /^[A-Z][A-Z0-9_]*$/.test(decl.id.name) && decl.init ? decl : null;
}
function isExpose(stmt) {
    const call = stmt.type === 'ExpressionStatement' ? stmt.expression : null;
    return !!call && call.type === 'CallExpression' && call.callee.name === 'safeExposeData';
}
/** The story file as tables (values), their declarations, the code between them and the safeExposeData call. */
function loadStory(text) {
    const ast = espree.parse(text, PARSE), story = { text, ast, tables: {}, decls: {}, code: [], expose: null };
    for (const stmt of ast.body) {
        const decl = tableDeclaration(stmt);
        if (decl) {
            story.tables[decl.id.name] = evaluate(decl.init, story.tables);
            story.decls[decl.id.name] = stmt;
        } else if (isExpose(stmt)) story.expose = stmt;
        else story.code.push(stmt);
    }
    return story;
}

// ---- 게임의 id ------------------------------------------------------------------------------------------------------------
function block(text, name) {
    const start = text.indexOf(`const ${name} =`);
    if (start < 0) throw new Error(`${name}을 찾지 못함`);
    const end = text.slice(start).search(/\n(\]|\}\));?\n/);
    return text.slice(start, end < 0 ? undefined : start + end);
}
const matches = (text, pattern) => [...text.matchAll(pattern)].map(match => match[1]);
function gameIds() {
    const file = name => read(path.join(root, name));
    const maps = file(MAPS), zoneId = /\bid: '([a-z0-9_]+)'/g;
    return {
        STORY_CLASS_ORIGINS: matches(block(file('data/passives.js'), 'PLAYER_CLASS_DEFS'), /\n {4}([a-z]+): \{/g),
        STORY_ACT_ENCOUNTERS: matches(block(maps, 'STORY_ACTS'), /\border: (\d+)/g),
        STORY_TRIAL_ENCOUNTERS: matches(block(maps, 'TRIAL_ZONES'), zoneId),
        STORY_ENDGAME_ENCOUNTERS: [...matches(maps, zoneId), ...matches(file('data/atlas-endgame.js'), zoneId),
            ...matches(file('js/state.js'), /_ZONE_ID = '([a-z0-9_]+)'/g)],
        STORY_LOOP_MILESTONES: [...matches(file('data/content-progression.js'), /\{"id":"([^"]+)"/g), 'default']
    };
}

// ---- 검사 -----------------------------------------------------------------------------------------------------------------
function makeReport() {
    const report = { errors: [], warnings: [], notes: [], dropped: new Map(), lines: [] };
    report.error = text => report.errors.push(text);
    report.warn = text => report.warnings.push(text);
    report.note = text => report.notes.push(text);
    report.drop = what => report.dropped.set(what, (report.dropped.get(what) || 0) + 1);
    return report;
}
const keyOf = (table, key) => (RENAME[table] && RENAME[table][key]) || key;
/** Lines split by class (an NPC's classBarks, the hero's classReplies) under class ids only. */
function checkClassLines(story, classes, report) {
    for (const table of ['STORY_ACT_ENCOUNTERS', 'STORY_TRIAL_ENCOUNTERS']) {
        for (const [key, entry] of Object.entries(story.tables[table] || {})) {
            for (const field of CLASS_KEYED) {
                const strange = Object.keys((entry.npc || {})[field] || {}).filter(id => !classes.includes(id));
                if (strange.length) report.error(`${table}.${key}.npc.${field}: 직업 id가 아닌 열쇠 ${strange.join(', ')}`);
            }
        }
    }
}
function checkKeys(story, ids, report) {
    for (const [table, known] of Object.entries(ids)) {
        const keys = Object.keys(story.tables[table] || {}).map(key => keyOf(table, key));
        const strange = keys.filter(key => !known.includes(key));
        if (!story.tables[table]) report.warn(`${table} 표가 없다`);
        if (strange.length) report.error(`${table}: 게임에 없는 열쇠 ${strange.join(', ')}`);
        const missing = table === 'STORY_ENDGAME_ENCOUNTERS' ? [] : [...new Set(known)].filter(key => !keys.includes(key));
        if (missing.length && story.tables[table]) report.warn(`${table}: 대사가 없는 열쇠 ${missing.join(', ')}`);
    }
}
function checkLine(where, value, report) {
    for (const text of typeof value === 'string' ? [value] : Object.values(value || {})) {
        report.lines.push(text);
        if ([...String(text)].length > SCREEN_MAX) report.warn(`${where}: ${[...text].length}자 ${text}`);
    }
}
function checkNarration(where, value, report) {
    const lines = typeof value === 'string' ? value.split('<br>') : value;
    if (!Array.isArray(lines) || lines.some(line => typeof line !== 'string' || /[<>]/.test(line))) report.error(`${where}: 해설은 글 줄만(<br> 외 마크업 없이)`);
}
function checkEntry(table, where, entry, report) {
    for (const [field, value] of Object.entries(entry || {})) {
        if ((DROP[table] || []).includes(field)) report.drop(`${table}.${field}`);
        else if (!FIELDS[table].includes(field)) report.error(`새 칸 ${where}.${field}: 화면에 연결해 FIELDS에 넣거나 DROP에 넣는다`);
        else if (FIELDS[field]) checkEntry(field, `${where}.${field}`, value, report);
        else if (field === 'narration') checkNarration(`${where}.${field}`, value, report);
        else if (SCREEN_FIELDS.has(field)) checkLine(`${where}.${field}`, value, report);
    }
}
function checkTables(story, report) {
    for (const name of Object.keys(story.tables)) {
        if (DROP.tables.includes(name)) report.drop(name);
        else if (!KNOWN_TABLES.has(name)) report.error(`새 표 ${name}: 화면에 연결해 FIELDS에 넣거나 DROP.tables에 넣는다`);
    }
    for (const table of Object.keys(FIELDS).filter(name => name.startsWith('STORY_'))) {
        for (const [key, entry] of Object.entries(story.tables[table] || {})) checkEntry(table, `${table}.${key}`, entry, report);
    }
    const exposed = story.expose ? story.expose.expression.arguments[0].properties.map(prop => prop.key.name) : [];
    const hidden = exposed.filter(name => !story.tables[name]);
    if (!story.expose || hidden.length) report.error(`safeExposeData가 없거나 없는 표를 내보낸다: ${hidden.join(', ')}`);
}
function checkStrings(name, text, report) {
    const hits = espree.tokenize(text, { ecmaVersion: 'latest' })
        .filter(token => (token.type === 'String' || token.type === 'Template') && BANNED.test(token.value));
    hits.forEach(token => report.error(`${name}: 가운뎃점이나 줄표 ${token.value.slice(0, 80)}`));
}
const sceneIds = story => SCENE_TABLES.flatMap(name => (story.tables[name] || []).map(scene => scene.id));
const sceneOrder = story => (story.tables.STORY_JOURNAL_SCENES || []).map(scene => scene && scene.id).join(' ');
/** A table the game has and the pack lacks would vanish on the way in: the pack was made on an older base. */
function checkMissingTables(pack, game, report) {
    const missing = Object.keys(game.tables).filter(name => !pack.tables[name]);
    if (missing.length) report.error(`게임에 있는 표가 묶음에 없다 ${missing.join(', ')}: 지금 게임 파일을 바탕으로 다시 만들게 한다`);
}
function checkScenes(pack, game, report) {
    const theirs = sceneIds(pack), ours = sceneIds(game);
    const added = theirs.filter(id => !ours.includes(id)), removed = ours.filter(id => !theirs.includes(id));
    if (removed.length) report.error(`없어진 장면 ${removed.join(', ')}: 본 장면 저장과 일지가 이 id를 쓴다`);
    if (added.length) report.warn(`새 장면 ${added.join(', ')}: 이미 지난 저장에 순서가 꼬이지 않게 js/story-journal-ui.js markPassedBridges 표시를 올린다`);
    if (sceneOrder(pack) !== sceneOrder(game)) report.warn(`장면 순서가 바뀜: ${sceneOrder(pack)}`);
    const lines = story => new Map(SCENE_TABLES.flatMap(name => story.tables[name] || []).map(scene => [scene.id, (scene.lines || []).join('|')]));
    const ourLines = lines(game), changed = [...lines(pack)].filter(([id, text]) => ourLines.has(id) && ourLines.get(id) !== text).map(([id]) => id);
    // 장면 해설은 게임에서도 고친다(2026-10-15 Gemini 검토): 바뀐 장면을 보여 주어 예전 글로 되돌아가는지 보게 한다.
    if (changed.length && pack !== game) report.note(`장면 해설이 바뀜: ${changed.join(', ')}`);
}
const codeTokens = (story, stmt) => espree.tokenize(story.text.slice(...stmt.range), { ecmaVersion: 'latest' })
    .map(token => `${token.type}:${token.value}`).join(' ');
function checkCode(pack, game, report) {
    const theirs = pack.code.map(stmt => codeTokens(pack, stmt)), ours = game.code.map(stmt => codeTokens(game, stmt));
    const at = theirs.findIndex((tokens, index) => tokens !== ours[index]);
    if (at >= 0 || theirs.length !== ours.length) {
        const stmt = pack.code[at] || pack.code[pack.code.length - 1];
        report.error(`표가 아닌 코드가 게임 파일과 다르다${stmt ? ` (묶음 ${stmt.loc.start.line}번째 줄)` : ''}: 묶음은 글만 바꾼다`);
    }
}

// ---- data/maps.js: 바뀐 한글 글만 ---------------------------------------------------------------------------------------------
const tokensOf = text => espree.tokenize(text, { ecmaVersion: 'latest', range: true });
/** Edits that carry the pack's changed Korean strings into our maps.js, or null when anything else differs. */
function mapsEdits(packText, gameText, report) {
    const theirs = tokensOf(packText), ours = tokensOf(gameText), edits = [];
    if (theirs.length !== ours.length) return report.error(`${MAPS}: 구조가 게임 파일과 다르다(손으로 맞춘다)`), null;
    for (let i = 0; i < ours.length; i++) {
        const mine = ours[i], new_ = theirs[i];
        if (mine.type === new_.type && mine.value === new_.value) continue;
        const text = mine.type === 'String' && new_.type === 'String' && HANGUL.test(mine.value) && HANGUL.test(new_.value);
        if (!text) return report.error(`${MAPS}: 글이 아닌 곳이 바뀜 ${mine.value.slice(0, 40)} -> ${new_.value.slice(0, 40)}`), null;
        edits.push({ start: mine.range[0], end: mine.range[1], text: new_.value });
    }
    report.note(`${MAPS}: 글 ${edits.length}곳 바뀜`);
    return edits;
}

// ---- 옮기기 ---------------------------------------------------------------------------------------------------------------
function applyEdits(text, edits) {
    let out = text, floor = Infinity;
    for (const edit of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) {
        if (edit.end > floor) throw new Error(`겹치는 편집 ${edit.start}`);
        out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
        floor = edit.start;
    }
    return out;
}
function commentEdit(text, [start, end]) {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1, lineEnd = text.indexOf('\n', end);
    if (/\S/.test(text.slice(lineStart, start))) return { start: start - (/[ \t]*$/.exec(text.slice(lineStart, start))[0].length), end, text: '' };
    return { start: lineStart, end: lineEnd < 0 ? end : lineEnd + 1, text: '' };
}
/** Removals of the props shouldDrop picks, commas included. */
function propRemovals(props, shouldDrop) {
    const kept = props.reduce((last, prop, index) => (shouldDrop(prop) ? last : index), -1), out = [];
    props.forEach((prop, index) => { if (index < kept && shouldDrop(prop)) out.push({ start: prop.range[0], end: props[index + 1].range[0], text: '' }); });
    if (kept < props.length - 1 && props.length) {
        out.push({ start: kept < 0 ? props[0].range[0] : props[kept].range[1], end: props[props.length - 1].range[1], text: '' });
    }
    return out;
}
const quote = text => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
function narrationEdit(literal) {
    const lines = String(literal.value).split('<br>').map(line => quote(line.trim()));
    return { start: literal.range[0], end: literal.range[1], text: `Object.freeze([${lines.join(', ')}])` };
}
function entryEdits(table, object, edits) {
    if (!object || object.type !== 'ObjectExpression') return;
    const drop = new Set(DROP[table] || []);
    edits.push(...propRemovals(object.properties, prop => drop.has(keyName(prop))));
    for (const prop of object.properties.filter(row => !drop.has(keyName(row)))) {
        const field = keyName(prop);
        if (FIELDS[field]) entryEdits(field, unwrap(prop.value), edits);
        if (field === 'narration' && prop.value.type === 'Literal') edits.push(narrationEdit(prop.value));
    }
}
function tableEdits(story, table, edits) {
    for (const row of unwrap(story.decls[table].declarations[0].init).properties) {
        const key = keyName(row), renamed = keyOf(table, key);
        if (renamed !== key) edits.push({ start: row.key.range[0], end: row.key.range[1], text: /^[A-Za-z_$][\w$]*$/.test(renamed) ? renamed : quote(renamed) });
        entryEdits(table, unwrap(row.value), edits);
    }
}
const comment = lines => lines.map(line => `// ${line}`).join('\n') + '\n';
/** The pack's story file for the game: its comments out, the DROP tables and fields out, keys renamed, narration as line
 * arrays, our comments on. */
function tidyStory(packText) {
    const bare = loadStory(packText);
    const story = loadStory(applyEdits(packText, bare.ast.comments.map(note => commentEdit(packText, note.range))));
    const body = story.ast.body, edits = [{ start: 0, end: 0, text: comment(COMMENTS.head) }];
    body.forEach((stmt, index) => {
        const name = tableDeclaration(stmt) ? stmt.declarations[0].id.name : null;
        if (DROP.tables.includes(name)) edits.push({ start: stmt.range[0], end: index + 1 < body.length ? body[index + 1].range[0] : stmt.range[1], text: '' });
        else if (COMMENTS[name]) edits.push({ start: stmt.range[0], end: stmt.range[0], text: comment(COMMENTS[name]) });
    });
    Object.keys(FIELDS).filter(name => story.decls[name]).forEach(table => tableEdits(story, table, edits));
    edits.push(...propRemovals(story.expose.expression.arguments[0].properties, prop => DROP.tables.includes(prop.key.name)));
    return applyEdits(story.text, edits);
}

// ---- 실행 ---------------------------------------------------------------------------------------------------------------
function inspect(pack, game, report) {
    checkTables(pack, report);
    const ids = gameIds();
    checkKeys(pack, ids, report);
    checkClassLines(pack, ids.STORY_CLASS_ORIGINS, report);
    checkScenes(pack, game, report);
    checkMissingTables(pack, game, report);
    checkCode(pack, game, report);
    checkStrings(STORY, pack.text, report);
    const longest = Math.max(0, ...report.lines.map(text => [...text].length));
    report.note(`화면 대사 ${report.lines.length}줄, 가장 긴 줄 ${longest}자`);
    report.note(`표: ${Object.keys(pack.tables).filter(name => FIELDS[name]).map(name => `${name} ${Object.keys(pack.tables[name]).length}`).join(', ')}`);
}
function printReport(report) {
    report.notes.forEach(text => console.log(`  ${text}`));
    if (report.dropped.size) console.log(`  빼는 표와 칸: ${[...report.dropped].map(([what, count]) => `${what} ${count}`).join(', ')}`);
    report.warnings.forEach(text => console.log(`  경고: ${text}`));
    report.errors.forEach(text => console.log(`  오류: ${text}`));
    console.log(`오류 ${report.errors.length}건, 경고 ${report.warnings.length}건`);
}
function importPack(dir, report) {
    const packStory = read(path.join(dir, STORY)), gameStory = read(path.join(root, STORY));
    const mapsFile = path.join(dir, MAPS), packMaps = fs.existsSync(mapsFile) ? read(mapsFile) : null, gameMaps = read(path.join(root, MAPS));
    inspect(loadStory(packStory), loadStory(gameStory), report);
    const edits = packMaps === null || packMaps === gameMaps ? [] : mapsEdits(packMaps, gameMaps, report);
    if (packMaps) checkStrings(MAPS, packMaps, report);
    if (report.errors.length) return null;
    const story = tidyStory(packStory), after = makeReport();
    inspect(loadStory(story), loadStory(gameStory), after);
    if (after.errors.length || after.dropped.size) throw new Error(`정리한 결과가 검사를 통과하지 못함: ${after.errors.join(' / ')}`);
    return { story, maps: edits && edits.length ? applyEdits(gameMaps, edits) : null, bible: path.join(dir, BIBLE) };
}
function main(args) {
    const dir = args.find(arg => !arg.startsWith('--')), report = makeReport();
    if (!dir && !args.includes('--check')) {
        console.log('node scripts/import-story-pack.cjs <묶음 폴더> [--write] | --check');
        return 2;
    }
    if (!dir) {
        const game = loadStory(read(path.join(root, STORY)));
        inspect(game, game, report);
        checkStrings(MAPS, read(path.join(root, MAPS)), report);
        report.dropped.forEach((count, what) => report.error(`빼지 않은 ${what} ${count}`));
        printReport(report);
        return report.errors.length ? 1 : 0;
    }
    const result = importPack(path.resolve(dir), report);
    printReport(report);
    if (!result || !args.includes('--write')) return result ? 0 : 1;
    writeLike(path.join(root, STORY), result.story);
    if (result.maps) writeLike(path.join(root, MAPS), result.maps);
    if (fs.existsSync(result.bible)) writeLike(path.join(root, BIBLE), read(result.bible));
    console.log(`옮김: ${STORY}${result.maps ? `, ${MAPS}` : ''}${fs.existsSync(result.bible) ? `, ${BIBLE}` : ''}`);
    return 0;
}
try {
    process.exitCode = main(process.argv.slice(2));
} catch (error) {
    console.error(`멈춤: ${error.message}`);
    process.exitCode = 1;
}
