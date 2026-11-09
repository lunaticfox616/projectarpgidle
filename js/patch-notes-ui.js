// 패치 노트 창(2026-11-10에 js/ui.js에서 그대로 옮겼다): changelog.md를 읽어 시작 화면의 창에 그린다.

let __patchNotesCache = null;

// changelog.md 파싱: "## 버전 — 날짜" 헤더와 "- 항목" 불릿을 엔트리로 변환합니다.
function parseChangelogMarkdown(text) {
    let entries = [];
    let current = null;
    String(text || '').split(/\r?\n/).forEach(line => {
        let header = line.match(/^##\s+(.+?)\s*$/);
        if (header) {
            let title = header[1].trim();
            let version = title;
            let date = '';
            let parts = title.split(/\s+[—–-]\s+/);
            if (parts.length >= 2) {
                version = parts[0].trim();
                date = parts.slice(1).join(' - ').trim();
            }
            current = { version: version, date: date, items: [] };
            entries.push(current);
            return;
        }
        let bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
        if (bullet && current) current.items.push(bullet[1].trim());
    });
    return entries;
}

function buildPatchNotesHTML(notes) {
    if (!Array.isArray(notes) || !notes.length) return '<div class="patch-note-empty">등록된 패치 노트가 없습니다.</div>';
    return notes.map(entry => {
        let items = (entry.items || []).map(it => `<li>${escapeHTML(it)}</li>`).join('');
        return `<div class="patch-note-entry">`
            + `<div class="patch-note-head">`
            + `<span class="patch-note-version">${escapeHTML(entry.version || '')}</span>`
            + `<span class="patch-note-date">${escapeHTML(entry.date || '')}</span>`
            + `</div>`
            + `<ul class="patch-note-list">${items}</ul>`
            + `</div>`;
    }).join('');
}

function applyPatchNotesHTML(html) {
    let el = document.getElementById('patch-notes-overlay-body');
    if (el) el.innerHTML = html;
}

/** The title's patch-notes link names the newest entry's date. index.html keeps a copy for the first paint, which nobody kept
 * up to date (it said 2026.10.11 while the notes reached 2026-10-18). */
function showLatestPatchDate(entry) {
    let match = entry && /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.date || '');
    let link = document.querySelector('.startup-patch-note-link');
    if (!match || !link) return;
    let [, year, month, day] = match;
    let shown = link.querySelector('.startup-latest-patch-date');
    if (shown) shown.textContent = `(${year}.${month}.${day})`;
    link.setAttribute('aria-label', _t('패치노트, 최신 패치 {year}년 {month}월 {day}일', { year, month: Number(month), day: Number(day) }));
}

function openPatchNotes() {
    renderPatchNotes();
    let overlay = document.getElementById('patch-notes-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    // Shown again, the notes came back at the last scroll spot, an older version, instead of the newest at the top.
    document.getElementById('patch-notes-overlay-body').scrollTo(0, 0);
}

function closePatchNotes() {
    let overlay = document.getElementById('patch-notes-overlay');
    if (overlay) overlay.classList.remove('active');
}

// Esc로 패치 노트를 닫는다(창 관리자의 Esc는 이 판이 떠 있으면 아래 창을 닫지 않고 비켜 준다).
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.getElementById('patch-notes-overlay')?.classList.contains('active')) return;
    event.preventDefault();
    closePatchNotes();
});

function renderPatchNotes() {
    if (__patchNotesCache) {
        applyPatchNotesHTML(buildPatchNotesHTML(__patchNotesCache));
        return;
    }
    applyPatchNotesHTML('<div class="patch-note-empty">패치 노트를 불러오는 중입니다.</div>');
    fetch('changelog.md', { cache: 'no-cache' })
        .then(res => res.ok ? res.text() : Promise.reject(new Error('changelog load failed')))
        .then(text => {
            __patchNotesCache = parseChangelogMarkdown(text);
            showLatestPatchDate(__patchNotesCache[0]);
            applyPatchNotesHTML(buildPatchNotesHTML(__patchNotesCache));
        })
        .catch(() => {
            applyPatchNotesHTML('<div class="patch-note-empty">패치 노트를 불러오지 못했습니다.</div>');
        });
}
