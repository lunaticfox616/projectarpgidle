// 대사 편집기 화면(scripts/story-line-editor-server.js가 띄운다): 서버가 읽어 준 대사를 탭과 거르기로 보여 주고, 고친 줄만 모아
// 한꺼번에 저장한다. 서버는 저장할 때 같은 규칙을 다시 보고, 이야기 검사가 실패하면 저장 전으로 되돌린다. 밖에서 고친 표 파일을
// 넣으면 그 표의 바뀐 줄이 여기서 고친 줄처럼 들어오고, 확인한 뒤 저장한다.
const BANNED = /[·・—―]/u;
const HANGUL = /[가-힣]/u;
const $ = selector => document.querySelector(selector);
const state = { lines: [], classes: [], screenMax: 50, tab: 'hero', lastSave: null, busy: false };

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function api(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({ error: `응답을 읽지 못했습니다 (${response.status})` }));
    if (!response.ok) throw Object.assign(new Error(payload.error || `요청 실패 (${response.status})`), { output: payload.output || '' });
    return payload;
}

const changed = line => line.draft !== line.text;
const npcOf = line => line.id.split('/dialogues/')[0];

/** What stops a line as typed from being saved (the server refuses it, or the story check fails). */
function refusals(line) {
    const bad = [];
    if (BANNED.test(line.draft)) bad.push('가운뎃점이나 줄표는 저장할 수 없습니다');
    if (line.kind === 'keyword') bad.push(...keywordRefusals(line));
    if (line.area.key === 'window' && line.kind === 'line' && !HANGUL.test(line.draft)) bad.push('키워드 대사가 비었습니다');
    return bad;
}
function keywordRefusals(line) {
    const text = line.draft.trim();
    if (!text) return ['빈 키워드는 저장할 수 없습니다'];
    const twin = state.lines.some(other => other !== line && other.kind === 'keyword' && npcOf(other) === npcOf(line) && other.draft.trim() === text);
    return twin ? ['같은 NPC에 같은 키워드가 있습니다'] : [];
}
/** What only needs a look: too long for one line of the band, empty, spaces at the ends, straight quotes (typed in a sheet or a
 * text editor: the game's lines use “ ” and 「 」, and a boss line speaks only in “ ”, js/canvas-act-title-card.js queueBossLine). */
function cautions(line) {
    const text = line.draft, warns = [];
    if (line.screen && [...text].length > state.screenMax) warns.push(`화면 대사는 ${state.screenMax}자까지 한 줄에 들어갑니다`);
    if (line.screen && !text.trim()) warns.push('빈 줄은 게임에 나오지 않습니다');
    if (text.trim() && text !== text.trim()) warns.push('앞뒤에 빈칸이 있습니다');
    if (line.screen && text.includes('"')) warns.push('곧은 따옴표(")가 있습니다. 게임 대사는 “ ”나 「 」를 씁니다');
    return warns;
}
const problems = line => ({ bad: refusals(line), warns: cautions(line) });
const hasProblem = line => refusals(line).length + cautions(line).length > 0;

function adopt(payload) {
    state.lines = payload.lines.map(line => ({ ...line, draft: line.text }));
    state.classes = payload.classes || [];
    state.screenMax = payload.screenMax || state.screenMax;
}

function visibleLines() {
    const query = $('#search-input').value.trim().toLowerCase(), area = $('#area-select').value, cls = $('#class-select').value;
    const changedOnly = $('#changed-only').checked, warnOnly = $('#warn-only').checked;
    const tests = [
        line => line.tab === state.tab,
        line => area === 'all' || line.area.key === area,
        line => cls === 'all' || !line.cls || line.cls === cls,
        line => !changedOnly || changed(line),
        line => !warnOnly || hasProblem(line),
        line => !query || [line.draft, line.text, line.speaker, line.place, line.when, line.group].some(text => text.toLowerCase().includes(query))
    ];
    return state.lines.filter(line => tests.every(test => test(line)));
}

/** The lines come in the editor's order (scripts/lib/story-line-editor-model.js pageOrder): each group's lines under its title. */
function grouped(lines) {
    const groups = [];
    for (const line of lines) {
        const last = groups[groups.length - 1];
        if (last && last.name === line.group) last.rows.push(line);
        else groups.push({ name: line.group, rows: [line] });
    }
    return groups;
}

function fit(box) {
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight + 2}px`;
}

function refreshRow(row, line) {
    const { bad, warns } = problems(line), length = [...line.draft].length, isChanged = changed(line);
    row.classList.toggle('changed', isChanged);
    row.classList.toggle('bad', bad.length > 0);
    const count = row.querySelector('.count');
    count.textContent = line.screen ? `${length}/${state.screenMax}자` : `${length}자`;
    count.classList.toggle('over', line.screen && length > state.screenMax);
    const notes = row.querySelector('.warns');
    notes.textContent = [...bad, ...warns].join(', ');
    notes.classList.toggle('bad', bad.length > 0);
    row.querySelector('.revert-button').hidden = !isChanged;
    const was = row.querySelector('.was');
    was.hidden = !isChanged;
    if (isChanged) was.replaceChildren(el('b', '', '원래'), document.createTextNode(line.text || '(빈 줄)'));
}

function refreshShown() {
    document.querySelectorAll('.line-row').forEach(row => {
        const line = state.lines.find(item => item.id === row.dataset.id);
        if (line) refreshRow(row, line);
    });
}

function lineRow(line) {
    const row = $('#line-template').content.firstElementChild.cloneNode(true);
    row.dataset.id = line.id;
    row.classList.toggle('keyword', line.kind === 'keyword');
    row.querySelector('.speaker').textContent = line.speaker;
    row.querySelector('.place').textContent = line.place;
    // The group title already names the place (acts, trials, endgame fights, the windows' keywords).
    row.querySelector('.place').hidden = line.group.includes(line.place);
    row.querySelector('.when').textContent = line.when;
    row.querySelector('.source').textContent = `${line.file.split('/').pop()} ${line.line}줄`;
    const box = row.querySelector('.line-text');
    box.value = line.draft;
    box.readOnly = state.busy;
    box.addEventListener('input', () => {
        const flat = box.value.replace(/[\r\n]+/g, ' ');
        if (flat !== box.value) box.value = flat;
        line.draft = flat;
        fit(box);
        if (line.kind === 'keyword') refreshShown(); else refreshRow(row, line);
        updateCounts();
    });
    box.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
    row.querySelector('.revert-button').addEventListener('click', () => {
        line.draft = line.text;
        box.value = line.text;
        fit(box);
        refreshShown();
        updateCounts();
    });
    refreshRow(row, line);
    return row;
}

function render() {
    const list = $('#line-list'), groups = grouped(visibleLines());
    list.replaceChildren();
    if (!groups.length) list.append(el('p', 'empty', '맞는 대사가 없습니다.'));
    for (const group of groups) {
        const title = el('h2', 'group-title', group.name);
        title.append(el('small', '', `${group.rows.length}줄`));
        list.append(title, ...group.rows.map(lineRow));
    }
    list.querySelectorAll('.line-text').forEach(fit);
    updateCounts();
}

function fillAreas() {
    const select = $('#area-select'), current = select.value, seen = new Map();
    state.lines.filter(line => line.tab === state.tab).forEach(line => seen.set(line.area.key, line.area));
    const areas = [...seen.values()].sort((a, b) => a.order - b.order);
    select.replaceChildren(new Option('전체', 'all'), ...areas.map(area => new Option(area.label, area.key)));
    select.value = seen.has(current) ? current : 'all';
    $('#class-filter').hidden = !state.lines.some(line => line.tab === state.tab && line.cls);
}

function fillClasses() {
    const select = $('#class-select'), current = select.value || 'all';
    select.replaceChildren(new Option('전체', 'all'), ...state.classes.map(row => new Option(row.label, row.id)));
    select.value = state.classes.some(row => row.id === current) ? current : 'all';
}

function updateCounts() {
    const edits = state.lines.filter(changed), blocked = edits.filter(line => problems(line).bad.length);
    $('#line-count').textContent = `대사 ${state.lines.length}줄${edits.length ? `, 고친 줄 ${edits.length}` : ''}${blocked.length ? `, 저장 못 하는 줄 ${blocked.length}` : ''}`;
    const save = $('#save-button');
    save.textContent = edits.length ? `저장 (${edits.length}줄)` : '저장';
    save.disabled = state.busy || !edits.length || blocked.length > 0;
    $('#revert-all-button').disabled = state.busy || !edits.length;
    $('#reload-button').disabled = state.busy;
    $('#import-button').disabled = state.busy;
    $('#undo-save-button').hidden = !state.lastSave;
    $('#undo-save-button').disabled = state.busy || edits.some(line => state.lastSave && state.lastSave.some(change => change.id === line.id));
    document.querySelectorAll('.tabs button').forEach(button => {
        const tab = button.dataset.tab, rows = state.lines.filter(line => line.tab === tab), dirty = rows.filter(changed).length;
        button.setAttribute('aria-selected', String(tab === state.tab));
        button.replaceChildren(document.createTextNode(button.dataset.label), el('small', '', String(rows.length)));
        if (dirty) button.append(el('small', 'dirty', `고침 ${dirty}`));
    });
}

function setStatus(text) {
    $('#status-text').textContent = text;
}

function showResult(text, items = [], output = '', failed = false) {
    $('#result').hidden = false;
    $('#result').classList.toggle('failed', failed);
    $('#result-text').textContent = text;
    $('#result-list').replaceChildren(...items.map(item => el('li', '', item)));
    $('#result-output').hidden = !output;
    $('#result-output').textContent = output;
}

function bibleItems(bible) {
    const rows = bible ? bible.rows : [], who = row => `${row.place}, ${row.speaker}`;
    const fixed = rows.filter(row => row.status === 'changed'), missing = rows.filter(row => row.status === 'missing'), shared = rows.filter(row => row.status === 'shared');
    const items = [];
    if (fixed.length) items.push(`스토리 바이블에서 ${fixed.length}줄을 함께 고쳤습니다.`);
    missing.forEach(row => items.push(`스토리 바이블에 없는 줄: ${who(row)}`));
    shared.forEach(row => items.push(`같은 글이 다른 줄에도 있어 스토리 바이블은 그대로 두었습니다: ${who(row)}`));
    return items;
}

async function save(changes, done) {
    const others = state.lines.filter(line => changed(line) && !changes.some(change => change.id === line.id));
    state.busy = true;
    render();
    setStatus('저장하는 중입니다. 이야기 검사까지 몇 초 걸립니다.');
    try {
        const result = await api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }) });
        adopt(result);
        // Lines typed but not in this save stay typed while the file still has the text they were typed over.
        others.forEach(old => {
            const line = state.lines.find(item => item.id === old.id);
            if (line && line.text === old.text) line.draft = old.draft;
        });
        const backups = [...result.backups, ...(result.bible && result.bible.backup ? [result.bible.backup] : [])];
        showResult(`${done(result.saved)} 이야기 검사: ${result.check}`, [...bibleItems(result.bible), `저장 전 사본: ${backups.join(', ')}`]);
        setStatus(`${result.saved}줄을 저장했습니다.`);
        return true;
    } catch (error) {
        showResult(`저장하지 못했습니다. ${error.message}`, [], error.output, true);
        setStatus('저장하지 못했습니다. 게임 파일은 그대로입니다.');
        return false;
    } finally {
        state.busy = false;
        fillAreas();
        render();
    }
}

async function saveEdits() {
    const changes = state.lines.filter(changed).map(line => ({ id: line.id, before: line.text, after: line.draft }));
    if (!changes.length || $('#save-button').disabled) return;
    if (await save(changes, count => `${count}줄을 저장했습니다.`)) state.lastSave = changes;
    updateCounts();
}

async function undoSave() {
    if (!state.lastSave) return;
    const changes = state.lastSave.map(change => ({ id: change.id, before: change.after, after: change.before }));
    if (await save(changes, count => `방금 저장한 ${count}줄을 저장 전 글로 되돌렸습니다.`)) state.lastSave = null;
    updateCounts();
}

/** Puts a sheet's changes in as typed lines: each line still as the page read it (else the game file changed since: 새로 읽기 first)
 * and not typed otherwise here meanwhile (that typing is kept). */
function takeChanges(changes) {
    const taken = [], stale = [], typed = [];
    for (const change of changes) {
        const line = state.lines.find(item => item.id === change.id);
        if (!line || line.text !== change.before) stale.push(change);
        else if (changed(line) && line.draft !== change.after) typed.push(line);
        else {
            line.draft = change.after;
            taken.push(line);
        }
    }
    return { taken, stale, typed };
}

function importItems(result, took) {
    const items = result.problems.map(row => `${row.row}번째 줄${row.place ? ` (${row.place}, ${row.speaker})` : ''}: ${row.reason}`);
    took.typed.forEach(line => items.push(`편집기에서 고치던 줄이라 넣지 않았습니다: ${line.place}, ${line.speaker}`));
    if (took.stale.length) items.push(`편집기가 읽은 뒤 게임 파일이 바뀐 줄 ${took.stale.length}개는 넣지 않았습니다. 새로 읽기를 누른 뒤 다시 넣어 주세요.`);
    if (result.flattened) items.push(`칸 안의 줄바꿈이나 탭 ${result.flattened}곳을 빈칸으로 바꿨습니다.`);
    if (!result.oldColumn) items.push('원래 대사 칸이 없어 지금 게임 글과 비교했습니다.');
    items.push(`그대로인 줄 ${result.same}개 (파일 글자: ${result.encoding})`);
    return items;
}

/** A sheet file edited outside (scripts/lib/story-line-sheet.js): its changed lines come in as typed ones, shown alone. */
async function importSheet(file) {
    setStatus('파일을 읽는 중입니다.');
    try {
        const result = await api('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: await file.arrayBuffer() });
        const took = takeChanges(result.changes), first = took.taken[0];
        const head = first ? `${file.name}에서 ${took.taken.length}줄을 가져왔습니다. 확인한 뒤 저장을 누르세요.` : `${file.name}에서 가져올 줄이 없습니다.`;
        showResult(head, importItems(result, took), '', !first && result.problems.length > 0);
        setStatus(head);
        if (!first) return updateCounts();
        $('#search-input').value = '';
        $('#class-select').value = 'all';
        $('#changed-only').checked = true;
        return switchTab(first.tab);
    } catch (error) {
        showResult(`파일을 넣지 못했습니다. ${error.message}`, [], '', true);
        return setStatus('파일을 넣지 못했습니다.');
    }
}

async function load() {
    setStatus('대사를 불러오는 중입니다.');
    try {
        adopt(await api('/api/lines'));
        fillClasses();
        fillAreas();
        render();
        setStatus(`대사 ${state.lines.length}줄을 읽었습니다.`);
    } catch (error) {
        setStatus(`대사를 읽지 못했습니다: ${error.message}`);
    }
}

function switchTab(tab) {
    state.tab = tab;
    $('#area-select').replaceChildren();
    fillAreas();
    render();
}

document.querySelectorAll('.tabs button').forEach(button => {
    button.dataset.label = button.textContent;
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});
['#search-input', '#area-select', '#class-select', '#changed-only', '#warn-only'].forEach(selector => {
    $(selector).addEventListener(selector === '#search-input' ? 'input' : 'change', render);
});
$('#save-button').addEventListener('click', saveEdits);
$('#undo-save-button').addEventListener('click', undoSave);
$('#revert-all-button').addEventListener('click', () => {
    state.lines.forEach(line => { line.draft = line.text; });
    render();
    setStatus('고친 줄을 모두 되돌렸습니다.');
});
$('#reload-button').addEventListener('click', () => {
    if (state.lines.some(changed) && !window.confirm('저장하지 않은 줄이 있습니다. 새로 읽으면 사라집니다. 새로 읽을까요?')) return;
    state.lastSave = null;
    load();
});
$('#export-link').addEventListener('click', event => {
    const typed = state.lines.filter(changed).length;
    if (typed && !window.confirm(`저장하지 않은 줄 ${typed}개는 파일에 들어가지 않습니다. 내보낼까요?`)) event.preventDefault();
});
$('#import-button').addEventListener('click', () => $('#import-input').click());
$('#import-input').addEventListener('change', () => {
    const file = $('#import-input').files[0];
    $('#import-input').value = ''; // the same file can be put in again
    if (file) importSheet(file);
});
// A sheet file dropped anywhere on the page goes in like one picked with 파일 넣기.
document.addEventListener('dragover', event => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
});
document.addEventListener('drop', event => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    event.preventDefault();
    if (!state.busy) importSheet(file);
});
document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveEdits();
    }
});
window.addEventListener('beforeunload', event => {
    if (state.lines.some(changed)) event.preventDefault();
});

load();
