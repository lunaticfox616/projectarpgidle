/* 대사 편집기의 표 파일(CSV): 화면의 대사를 표로 내보내고, 밖(엑셀, 구글 시트, 메모장, 다른 컴퓨터용 묶음, 다른 사람이나 AI)에서
 * 새 대사 칸을 고친 표를 다시 읽어 바뀐 줄을 찾는다. 원래 대사 칸은 저장된(묶음이면 묶은 때의) 글이라, 그 뒤 게임에서 바뀐 줄을
 * 표가 덮지 않게 가려낸다. 찾은 줄은 화면에 고친 줄로 들어가고 저장은 화면에서 한다(검사, 사본, 바이블은 저장이 맡는다).
 * 엑셀이 한글 윈도 기본(CP949)으로 저장한 표, 유니코드 텍스트(UTF-16), 탭이나 세미콜론으로 나눈 표도 읽는다.
 * 페이지(editor.js)에서는 storyLineSheet로, Node(시험)에서는 require로 쓴다. */
(function exposeSheet(scope) {
    'use strict';
    const COLUMNS = Object.freeze({ tab: '탭', place: '장소', speaker: '말하는 이', when: '나오는 때', limit: '글자 제한', before: '원래 대사', after: '새 대사', id: 'id' });
    const TAB_NAMES = Object.freeze({ hero: '주인공', npc: 'NPC', boss: '보스' });

    // ---- 내보내기 ---------------------------------------------------------------------------------------------------------
    const csvCell = value => (/[",\r\n]|^\s|\s$/u.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    /** The lines as a CSV sheet in the editor's order: UTF-8 with a BOM (Excel then reads the Korean), CRLF rows. The old line is the
     * saved one, the new line what is typed now (the saved one when nothing is). */
    function sheetOf(lines, screenMax) {
        const rows = lines.map(line => [TAB_NAMES[line.tab] || line.tab, line.place, line.speaker, line.when, line.screen ? `${screenMax}자` : '',
            line.text, typeof line.draft === 'string' ? line.draft : line.text, line.id]);
        return `\uFEFF${[Object.values(COLUMNS), ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
    }

    // ---- 읽기 ------------------------------------------------------------------------------------------------------------
    /** The text of a sheet file and how it was written: UTF-8 (a BOM or none), UTF-16 with a BOM (Excel's Unicode text), else CP949
     * (Excel's plain CSV on Korean Windows; bytes that are not UTF-8 are read so). */
    function decodeSheet(bytes) {
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) return { text: new TextDecoder('utf-16le').decode(bytes), encoding: 'UTF-16' };
        try {
            return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
        } catch (error) {
            if (!(error instanceof TypeError)) throw error;
            return { text: new TextDecoder('euc-kr').decode(bytes), encoding: 'CP949' };
        }
    }
    /** The separator the head row uses most: comma, tab or semicolon. */
    function separatorOf(text) {
        const head = text.split(/\r?\n/u, 1)[0];
        return [',', '\t', ';'].map(mark => [mark, head.split(mark).length]).sort((a, b) => b[1] - a[1])[0][0];
    }
    /** Rows of cells. A cell in quotes may hold the separator, line breaks and doubled quotes; a cell that only starts with a quote is
     * read as written. */
    function tableOf(text, sep) {
        const mark = sep === '\t' ? '\\t' : sep;
        const cell = new RegExp(`(?:"((?:[^"]|"")*)"|([^${mark}\\r\\n]*))(${mark}|\\r\\n|\\n|\\r|$)`, 'uy');
        const rows = [];
        let row = [];
        for (let at = 0; at < text.length;) {
            cell.lastIndex = at;
            const match = cell.exec(text);
            if (!match || cell.lastIndex <= at) throw new Error(`표의 ${rows.length + 1}번째 줄을 읽지 못했습니다.`);
            row.push(match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]);
            at = cell.lastIndex;
            if (match[3] !== sep) {
                rows.push(row);
                row = [];
            }
        }
        if (row.length) rows.push(row);
        return rows;
    }

    /** The line a sheet row names and the row's new line, or null once problem(line, reason) has noted why the row is left out. */
    function namedLine(cells, ctx, problem) {
        const id = (cells[ctx.col.id] || '').trim(), raw = cells[ctx.col.after] || '';
        if (!id) return raw.trim() ? problem(null, 'id가 없어 넣지 않았습니다. 대사 없는 자리는 표로 만들 수 없습니다') : null;
        const line = ctx.byId.get(id);
        if (!line) return problem(null, `편집기에 없는 줄입니다 (${id})`);
        if (ctx.seen.has(id)) return problem(line, '같은 줄이 표에 두 번 있어 뒤의 줄은 넣지 않았습니다');
        ctx.seen.add(id);
        return raw.trim() ? { line, raw } : problem(line, '새 대사가 비어 있어 넣지 않았습니다. 줄을 비우려면 편집기에서 지워 주세요');
    }
    /** What one sheet row asks for. ctx: col (column index by COLUMNS key, -1 when missing), byId, seen, and the result being filled.
     * Line breaks and tabs in a cell become one space each (a line is one line on screen). */
    function readRow(cells, number, ctx) {
        const problem = (line, reason) => {
            ctx.result.problems.push({ row: number, place: line ? line.place : '', speaker: line ? line.speaker : '', reason });
            return null;
        };
        const named = namedLine(cells, ctx, problem);
        if (!named) return;
        const { line, raw } = named, after = raw.replace(/[\r\n\t]+/gu, ' '), before = ctx.col.before < 0 ? line.text : cells[ctx.col.before];
        if (after !== raw) ctx.result.flattened += 1;
        if (after === before || after === line.text) ctx.result.same += 1;
        else if (before !== line.text) problem(line, '원래 대사가 지금 게임 글과 다릅니다. 내보낸 뒤 게임에서 바뀌었거나 원래 대사 칸을 고쳤습니다');
        else ctx.result.changes.push({ id: line.id, before: line.text, after });
    }
    // A workbook (.xlsx, .ods) is a zip archive, not text: its bytes would read as a sheet without the needed columns.
    const isZip = bytes => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
    /** The changes a sheet file (bytes) asks for, against the lines' saved text: { changes: [{ id, before, after }], same,
     * problems: [{ row, place, speaker, reason }], encoding, flattened, oldColumn }. Throws for a workbook file, or when the head row
     * lacks the id or new line column. */
    function sheetChanges(lines, bytes) {
        if (isZip(bytes)) throw new Error('엑셀 통합 문서(.xlsx) 같은 문서 파일은 넣을 수 없습니다. 엑셀은 CSV UTF-8로 저장하고, 구글 시트는 CSV로 다운로드해서 넣어 주세요.');
        const { text, encoding } = decodeSheet(bytes);
        const table = tableOf(text, separatorOf(text)), head = (table[0] || []).map(name => name.replace(/^\uFEFF/u, '').trim());
        const col = Object.fromEntries(Object.entries(COLUMNS).map(([key, name]) => [key, head.indexOf(name)]));
        if (col.id < 0 || col.after < 0) throw new Error(`첫 줄에 '${COLUMNS.id}' 칸과 '${COLUMNS.after}' 칸이 있어야 합니다. 편집기에서 내보낸 표를 고쳐서 넣어 주세요.`);
        const result = { changes: [], same: 0, problems: [], encoding, flattened: 0, oldColumn: col.before >= 0 };
        const ctx = { col, byId: new Map(lines.map(line => [line.id, line])), seen: new Set(), result };
        table.slice(1).forEach((cells, index) => {
            if (cells.some(value => value.trim())) readRow(cells, index + 2, ctx);
        });
        return result;
    }

    const api = Object.freeze({ COLUMNS, sheetOf, sheetChanges, decodeSheet, tableOf, separatorOf });
    if (typeof module === 'object' && module.exports) module.exports = api;
    else scope.storyLineSheet = api;
})(typeof window === 'object' ? window : globalThis);
