// 전적 화면 조립 — js/records.js가 만든 읽기 모델을 DOM으로 옮기기만 한다.
//
// 이 파일은 게임 상태를 직접 훑지 않고 getRecordsView()의 결과만 읽는다. 기록 규칙이
// 바뀌면 records.js만, 표시가 바뀌면 이 파일만 고치면 된다.
//
// 화면별 렌더러를 자기 파일에 두는 형태다. js/ui.js의 거대 렌더 함수를 쪼갤 때
// 목표로 삼는 구조와 같다.
(function () {
    'use strict';

    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // 값마다 뜻의 색(2026-10-09 사용자 "기록 색감이 하나도 없이 빠져 있음"): 루프 금빛, 시간 하늘색, 레벨 초록, 혼돈 보라,
    // 그리고 콘텐츠마다 그 세계의 색. 카드는 값과 왼쪽 테가 그 색이다(statCard).
    const TONE = Object.freeze({ loop: '#e8c27a', time: '#8fd8ff', level: '#8fe07a', chaos: '#b78bff', labyrinth: '#d9b066', sky: '#9fd0ff',
        underworld: '#54b8a4', ocean: '#5ab8f0', colony: '#9fd46a', zone: '#eee7dc', damage: '#ff8a5c' });
    // 잔잔한 사건마다 그 사건의 빛깔(data/act-exploration-maps.js의 테와 같은 결), 숨은 사건은 겪기 전에는 잿빛.
    const INCIDENT_TONE = Object.freeze({ critter: '#ffcf4a', stray: '#9be0a4', sleep: '#a9b8ff', star: '#ffe9a0', challenge: '#ff9f6b', breath: '#b8f0c8', shower: '#ffd36e', rainbow: '#c79bff',
        feast: '#ffcf4a', yawn: '#9fd46a', lucky: '#8fd8ff', luckyKill: '#c79bff', unknown: '#8b8478' });

    // 최고 도달 지점 표. 값이 0이면 아직 가보지 않은 콘텐츠라 행 자체를 숨긴다
    // (해보지 않은 콘텐츠를 "0층"으로 보여주면 스포일러이자 소음이다).
    const BEST_ROWS = [
        { key: 'loop', label: '최고 루프', unit: '', tone: TONE.loop },
        { key: 'level', label: '최고 레벨', unit: '', tone: TONE.level },
        { key: 'actZone', label: '최고 개방 사냥터', unit: '', format: getZoneLabel, tone: TONE.zone },
        { key: 'abyssDepth', label: '혼돈 심화', unit: '층', tone: TONE.chaos },
        { key: 'chaosRealmFloor', label: '혼돈계', unit: '층', tone: TONE.chaos },
        { key: 'labyrinthFloor', label: '고대 미궁', unit: '층', tone: TONE.labyrinth },
        { key: 'skyFloor', label: '창공의 탑', unit: '층', tone: TONE.sky },
        { key: 'underworldFloor', label: '지하계', unit: '층', tone: TONE.underworld },
        { key: 'oceanBoundary', label: '심해', unit: 'm', tone: TONE.ocean },
        { key: 'colonyWave', label: '군락지 방어', unit: '파도', tone: TONE.colony }
    ];


    function formatCount(value) {
        return Math.floor(Number(value) || 0).toLocaleString();
    }

    // 방치형은 루프 하나가 수 시간~수 일이라 "초"까지 보여주면 오히려 읽기 어렵다.
    // 자릿수가 큰 쪽 두 단위까지만 보여준다.
    function formatDuration(ms) {
        let total = Math.max(0, Math.floor(Number(ms) || 0));
        if (total < MINUTE) return `${Math.floor(total / 1000)}초`;
        if (total < HOUR) return `${Math.floor(total / MINUTE)}분 ${Math.floor((total % MINUTE) / 1000)}초`;
        if (total < DAY) return `${Math.floor(total / HOUR)}시간 ${Math.floor((total % HOUR) / MINUTE)}분`;
        return `${Math.floor(total / DAY)}일 ${Math.floor((total % DAY) / HOUR)}시간`;
    }

    function formatDate(timestamp) {
        let ts = Math.floor(Number(timestamp) || 0);
        if (!ts) return '기록 없음';
        let d = new Date(ts);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function getZoneLabel(zoneId) {
        let id = Math.floor(Number(zoneId) || 0);
        if (typeof getZone === 'function') {
            let zone = getZone(id);
            if (zone && zone.name) return zone.name;
        }
        return `구역 ${id}`;
    }

    function statCard(iconKind, label, value, sub, tone) {
        let icon = ['attack', 'phys', 'fire', 'cold', 'light', 'chaos'].includes(iconKind)
            ? `<span class="records-stat-icon combat-log-icon combat-log-icon--${iconKind}" aria-hidden="true"></span>` : '';
        return `<div class="records-stat"${tone ? ` style="--record-tone:${tone}"` : ''}>${icon}`
            + `<span class="records-stat-label">${escapeHTML(label)}</span>`
            + `<strong class="records-stat-value">${escapeHTML(value)}</strong>`
            + (sub ? `<small class="records-stat-sub">${escapeHTML(sub)}</small>` : '')
            + '</div>';
    }

    function renderHeader(view) {
        // 기존 세이브에는 과거 시간 데이터가 없다. 없는 것을 있는 척하지 않고 밝힌다.
        return `<section class="records-section records-header">
            <div class="records-section-title">진행 중인 루프</div>
            <div class="records-stat-row">
                ${statCard('', '현재 루프', `루프 ${formatCount(view.currentLoop.loop)}`, '', TONE.loop)}
                ${statCard('', '이번 루프 진행', formatDuration(view.currentLoop.activeMs), `실제 경과 ${formatDuration(view.currentLoop.elapsedMs)}`, TONE.time)}
            </div>
            <details class="records-time-note"><summary>시간 기록 안내</summary>
            <p class="records-note">기록 시작 ${escapeHTML(formatDate(view.startedAt))}, ${escapeHTML(formatDuration(view.trackedForMs))} 동안 기록<br>
            시간 기록은 이 기능이 추가된 시점부터 쌓입니다. 진행 시간은 실제 게임 계산 시간이며, 실제 경과는 자리를 비운 시간도 포함합니다.</p></details>
        </section>`;
    }

    function renderLoopSection(view) {
        let summary = view.loopSummary;
        let summaryRow = `<div class="records-stat-row">
            ${statCard('', '완료한 루프', `${formatCount(summary.count)}회`, '기록 시작 이후', TONE.loop)}
            ${statCard('', '최단 루프', summary.fastestMs ? formatDuration(summary.fastestMs) : '-', summary.fastestLoop ? `루프 ${formatCount(summary.fastestLoop)}, 진행 시간` : '아직 없음', TONE.level)}
            ${statCard('', '평균 루프', summary.averageMs ? formatDuration(summary.averageMs) : '-', '진행 시간', TONE.time)}
        </div>`;

        if (!view.loops.length) {
            return `<section class="records-section records-loop-history">
                <div class="records-section-title">최근 루프</div>
                <p class="records-empty">아직 완료한 루프가 없습니다. 루프를 한 번 넘기면 여기에 소요 시간이 남습니다.</p>
            </section>`;
        }

        let rows = view.loops.map(row => `<tr>
            <td class="records-loop">${formatCount(row.loop)}</td>
            <td class="records-num${summary.fastestMs && row.activeMs === summary.fastestMs ? ' is-best' : ''}">${escapeHTML(formatDuration(row.activeMs))}</td>
            <td class="records-num">${escapeHTML(formatDuration(row.durationMs))}</td>
            <td>${escapeHTML(getZoneLabel(row.maxZoneId))}</td>
            <td class="records-num records-chaos">${row.bestAbyssDepth ? `${formatCount(row.bestAbyssDepth)}층` : '-'}</td>
            <td class="records-num records-level">Lv.${formatCount(row.level)}</td>
            <td class="records-num${row.deaths > 0 ? ' is-deaths' : ''}">${formatCount(row.deaths)}</td>
        </tr>`).join('');

        return `<section class="records-section records-loop-history">
            <div class="records-section-title">최근 루프<span>${formatCount(view.loops.length)}개 보관</span></div>
            ${summaryRow}
            <div class="records-table-scroll">
                <table class="records-table">
                    <thead><tr><th>루프</th><th>진행 시간</th><th>실제 경과</th><th>도달 사냥터</th><th>혼돈 최고</th><th>레벨</th><th>죽음</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
    }

    function renderActSection(view) {
        // 액트는 스토리 구간(0~9)만 다룬다. 여기 없는 구역은 반복 콘텐츠라 "돌파 시간"의 의미가 다르다.
        let ids = [];
        for (let id = 0; id <= 9; id++) {
            if (view.actBest[id] !== undefined || view.currentLoop.actClears[id] !== undefined) ids.push(id);
        }
        if (!ids.length) {
            return `<section class="records-section">
                <div class="records-section-title">액트 돌파 기록</div>
                <p class="records-empty">액트를 돌파하면 루프 진행 시간 기준 기록이 여기에 남습니다.</p>
            </section>`;
        }
        let rows = ids.map(id => {
            let current = view.currentLoop.actClears[id];
            let best = view.actBest[id];
            let isBestThisLoop = current !== undefined && best !== undefined && current <= best;
            return `<tr>
                <td>${escapeHTML(getZoneLabel(id))}</td>
                <td class="records-num">${current === undefined ? '-' : escapeHTML(formatDuration(current))}</td>
                <td class="records-num${isBestThisLoop ? ' is-best' : ''}">${best === undefined ? '-' : escapeHTML(formatDuration(best))}</td>
            </tr>`;
        }).join('');
        return `<section class="records-section">
            <div class="records-section-title">액트 돌파 기록<span>루프 진행 시간 기준</span></div>
            <div class="records-table-scroll">
                <table class="records-table">
                    <thead><tr><th>사냥터</th><th>이번 루프</th><th>최고 기록</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
    }

    function renderBestSection(view) {
        let cards = BEST_ROWS
            .filter(row => Math.floor(Number(view.best[row.key]) || 0) > 0)
            .map(row => {
                let value = Math.floor(Number(view.best[row.key]) || 0);
                let text = row.format ? row.format(value) : `${value.toLocaleString()}${row.unit}`;
                return statCard('', row.label, text, '', row.tone);
            }).join('');
        if (!cards) {
            return `<section class="records-section">
                <div class="records-section-title">최고 도달</div>
                <p class="records-empty">아직 기록된 도달 지점이 없습니다.</p>
            </section>`;
        }
        return `<section class="records-section">
            <div class="records-section-title">최고 진행<span>루프를 넘겨도 유지됩니다, 층수는 개방 기준</span></div>
            <div class="records-stat-row">${cards}</div>
        </section>`;
    }

    // 잔잔한 사건(js/combat-incidents.js): 겪은 횟수. 숨은 사건은 한 번 겪기 전까지 이름 대신 ???로 둔다(있다는 것만 보인다).
    function renderIncidentSection(view) {
        let cards = view.incidents.map(row => (row.hidden && !row.count
            ? statCard('', '???', '-', '숨은 사건', INCIDENT_TONE.unknown)
            : statCard('', row.name, `${formatCount(row.count)}회`, row.hidden ? '숨은 사건' : '', INCIDENT_TONE[row.key]))).join('');
        const hidden = view.incidents.filter(row => row.hidden), found = hidden.filter(row => row.count > 0).length; // 찾은 숨은 사건 수
        return `<section class="records-section">
            <div class="records-section-title">잔잔한 사건<span>사냥 중에 드물게 일어나는 일, 루프를 넘겨도 유지됩니다. 숨은 사건 ${found}/${hidden.length}</span></div>
            <div class="records-stat-row">${cards}</div>
        </section>`;
    }

    function renderEchoSection(view) {
        let echo = view.echo;
        if (!echo.runs) return '';
        const recent = echo.last ? statCard('attack', '최근 DPS', formatCount(echo.last.dps),
            echo.changePct === null ? `${echo.last.seconds.toFixed(1)}초 측정` : `이전 대비 ${echo.changePct >= 0 ? '+' : ''}${echo.changePct.toFixed(1)}%`, TONE.damage) : '';
        return `<section class="records-section">
            <div class="records-section-title">나무꾼의 잔상<span>30초 허수아비 측정</span></div>
            <div class="records-stat-row">
                ${recent}
                ${statCard('attack', '최고 DPS', formatCount(echo.bestDps), '', TONE.damage)}
                ${statCard('attack', '최고 총 피해', formatCount(echo.bestDamage), '', TONE.damage)}
                ${statCard('', '측정 횟수', `${formatCount(echo.runs)}회`, `마지막 ${formatDate(echo.lastAt)}`, TONE.time)}
            </div>
        </section>`;
    }

    function buildRecordsHtml(view) {
        return renderHeader(view)
            + (typeof chronicleUi === 'object' ? chronicleUi.sectionHtml() : '')
            + (typeof weaponMasteryUi === 'object' ? weaponMasteryUi.sectionHtml() : '')
            + renderActSection(view)
            + renderBestSection(view)
            + renderIncidentSection(view)
            + renderLoopSection(view)
            + renderEchoSection(view);
    }

    // js/ui.js의 화면 갱신이 부른다. 내용이 같으면 innerHTML 재작성을 생략한다
    // (전적 화면은 경과 시간 때문에 매 갱신마다 조금씩 바뀌지만, 표는 대부분 그대로다).
    function renderRecordsTab() {
        let root = document.getElementById('ui-records-body');
        if (!root) return;
        let view = typeof getRecordsView === 'function' ? getRecordsView() : null;
        if (!view) return;
        let html = buildRecordsHtml(view);
        updateGamePanelMarkup(root, html);
    }

    safeExposeGlobals({ renderRecordsTab, buildRecordsHtml, formatRecordDuration: formatDuration });
}());
