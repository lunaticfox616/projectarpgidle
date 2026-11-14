import { OPS_SECTIONS, OPS_TODO_ITEMS } from '../data/cloud-tools.mjs';
export class CloudOpsView {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    /** 전투 통계 절의 몸통(admin_get_ops_dashboard의 zones, builds): 지역과 직업을 한글로. 머리 숫자와 오류는 admin_get_ops_overview가 맡는다(2026-10-27). */
    renderOpsStats(data) {
        let html = this.links.format.renderOpsTable('지역 통계, 최근 30일', [
            { label: '지역', render: row => this.links.format.opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) }, { key: 'players', label: '사람' }, { key: 'runs', label: '전투' },
            { label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
            { label: 'DPS', render: row => this.links.format.cloudToolsNumber(row.median_dps) }, { label: 'EHP', render: row => this.links.format.cloudToolsNumber(row.median_ehp) },
            { label: 'p95', render: row => `${row.p95_frame_ms || 0}ms` }, { key: 'peak_fx', label: '최대 FX' }
        ], Array.isArray(data.zones) ? data.zones : []);
        html += this.links.format.renderOpsTable('직업/스킬 통계, 최근 30일', [
            { label: '직업', render: row => this.links.format.opsClassLabel(row.ascend_class) }, { key: 'active_skill', label: '스킬' }, { key: 'players', label: '사람' }, { key: 'runs', label: '전투' },
            { label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
            { label: 'DPS', render: row => this.links.format.cloudToolsNumber(row.median_dps) }, { label: 'EHP', render: row => this.links.format.cloudToolsNumber(row.median_ehp) }
        ], Array.isArray(data.builds) ? data.builds : []);
        return html;
    }

    /** A ghost flag (DPS or EHP outlier) from the last 7 days: the server freezes that ghost's ranked rating meanwhile (ghost_under_review). */
    isGhostFlagUnderReview(row) {
        return /^ghost_/.test(String(row.kind || '')) && Date.now() - new Date(row.last_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    }

    /** The anti-cheat watch (db/anti-cheat.sql admin_get_cheat_watch): flags, growth per hour, held accounts. */
    renderCheatWatch(data) {
        const kinds = { clock: '기기 시계', currency: '화폐', level: '레벨', ghost_dps: '고스트 DPS', ghost_ehp: '고스트 EHP',
            golden_rule: '황금률 잔액', hall_buy: '전당 구매', hall_list: '전당 등록' };
        const account = { label: '계정', render: row => row.nickname || String(row.user_id || '').slice(0, 8) };
        const hold = note => ({ label: '보류', html: row => this.links.format.renderCheatHoldButton(row.user_id, row.held === true, note(row)) });
        let html = '<section><h3>치트 감시</h3><p class="cloud-tools-note">감시는 기록만 하고 막지 않습니다. 보류한 계정은 전당과 고스트 대결에서 빠지고, 저장과 혼자 하는 플레이는 그대로입니다. 고스트 기록(DPS, EHP)은 7일 동안 순위전 점수를 멈추고, 지우면 바로 풀립니다.</p></section>';
        html += this.links.format.renderOpsTable('감시 기록, 최근 90일', [
            account, { label: '종류', render: row => kinds[row.kind] || row.kind }, { key: 'seen_on', label: '날짜' }, { key: 'hits', label: '횟수' },
            { label: '내용', render: row => JSON.stringify(row.detail || {}) },
            { label: '순위전', render: row => this.isGhostFlagUnderReview(row) ? '점수 멈춤' : '' },
            hold(row => `${kinds[row.kind] || row.kind} ${row.seen_on}`),
            { label: '기록', html: row => `<button type="button" data-cheat-clear="${this.links.format.cloudToolsEscape(row.user_id)}" data-cheat-kind="${this.links.format.cloudToolsEscape(row.kind)}">지우기</button>` }
        ], Array.isArray(data.flags) ? data.flags : []);
        html += this.links.format.renderOpsTable('성장 속도, 최근 7일', [
            account, { key: 'seen_on', label: '날짜' }, { key: 'samples', label: '저장' }, { key: 'hours', label: '시간' },
            { label: '화폐/시간', render: row => this.links.format.cloudToolsNumber(row.currency_per_hour) },
            { label: '최고 속도', render: row => `${this.links.format.cloudToolsNumber(row.max_currency_per_hour)} ${row.max_currency_key || ''}` },
            { key: 'level_per_hour', label: '레벨/시간' }, { key: 'season_per_hour', label: '루프/시간' }, hold(row => `성장 ${row.seen_on}`)
        ], Array.isArray(data.rates) ? data.rates : []);
        html += this.links.format.renderOpsTable('보류한 계정', [
            account, { key: 'note', label: '메모' }, { label: '시각', render: row => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
            { label: '보류', html: row => this.links.format.renderCheatHoldButton(row.user_id, true, '') }
        ], Array.isArray(data.holds) ? data.holds : []);
        return html;
    }

    /** Chat reports and mutes (db/social.sql admin_get_chat_reports); the dialog's click handler sends the mute and delete buttons. */
    renderChatReports(data) {
        const muteButtons = row => this.links.format.renderMuteButtons(row.target_user_id || row.user_id, row.nickname, row.muted_until || row.until_at);
        let html = '<section><h3>채팅 신고</h3><p class="cloud-tools-note">신고는 플레이어가 프로필 창에서 보냅니다. 금지한 계정은 풀릴 때까지 채팅을 보낼 수 없고, 지운 줄은 모든 플레이어의 채팅창에서 사라집니다.</p></section>';
        html += this.links.format.renderOpsTable('신고, 최근 200건', [
            { label: '시각', render: row => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
            { label: '신고자', render: row => row.reporter_nickname || '' },
            { label: '대상', render: row => row.nickname || String(row.target_user_id || '').slice(0, 8) },
            { label: '24시간 신고', render: row => this.links.format.cloudToolsNumber(row.reports_24h) },
            { key: 'reason', label: '사유' },
            { label: '채팅', render: row => row.body ? (row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body) : '' },
            { label: '상태', render: row => row.muted_until ? `금지 중, ${new Date(row.muted_until).toLocaleString(this.deps.i18n.locale)}까지` : (row.message_id && !row.message_exists ? '줄 지워짐' : '') },
            { label: '조치', html: row => muteButtons(row) + (row.message_id && row.message_exists ? `<button type="button" data-chat-delete="${this.links.format.cloudToolsEscape(row.message_id)}">줄 지우기</button>` : '')
                + this.links.format.peekButton(row.target_user_id, row.nickname) }
        ], Array.isArray(data.reports) ? data.reports : []);
        html += '<div id="chat-peek"></div>';
        html += '<div class="ops-summary"><input id="chat-mute-nickname" type="text" maxlength="16" placeholder="닉네임으로 금지">'
            + '<button type="button" data-mute-nick="1440">1일 금지</button><button type="button" data-mute-nick="10080">7일 금지</button>'
            + '<button type="button" data-mute-nick="0">금지 풀기</button><button type="button" data-chat-clear="1">채팅 전체 비우기</button></div>';
        html += this.links.format.renderOpsTable('금지 중인 계정', [
            { label: '계정', render: row => row.nickname || String(row.user_id || '').slice(0, 8) },
            { label: '풀리는 시각', render: row => new Date(row.until_at).toLocaleString(this.deps.i18n.locale) }, { key: 'note', label: '메모' },
            { label: '조치', html: row => muteButtons(row) + this.links.format.peekButton(row.user_id, row.nickname) }
        ], Array.isArray(data.mutes) ? data.mutes : []);
        return html + this.renderBannedTerms(Array.isArray(data.terms) ? data.terms : null);
    }

    /** The admin's extra banned terms (chat_banned_terms): a list with 빼기 buttons and a row to add one; the server trims the term the
     * way the check normalises text. terms is null when the server has no such function yet. */
    renderBannedTerms(terms) {
        if (!terms) return '<section><h3>금칙어(관리자 추가)</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>';
        let html = this.links.format.renderOpsTable('금칙어(관리자 추가)', [
            { key: 'term', label: '낱말' },
            { label: '찾는 글', render: row => row.spaced === false ? '띄어쓰기 지운 글' : '띄어쓰기 남긴 글' },
            { label: '시각', render: row => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
            { label: '조치', html: row => `<button type="button" data-term-remove="${this.links.format.cloudToolsEscape(row.term)}">빼기</button>` }
        ], terms);
        return html + '<p class="cloud-tools-note">기본 목록은 서버 함수(chat_text_is_offensive)에 있고, 여기 더한 낱말은 바로 적용됩니다. '
            + '짧은 낱말은 띄어쓰기를 남긴 글에서 찾아야 "혹시 발사체" 같은 말이 걸리지 않습니다.</p>'
            + '<div class="ops-summary"><input id="banned-term-input" type="text" maxlength="40" placeholder="낱말(2~40자)">'
            + '<label><input id="banned-term-spaced" type="checkbox" checked> 띄어쓰기 남긴 글에서 찾기</label>'
            + '<button type="button" data-term-add="1">더하기</button></div>';
    }

    renderChatPeek(name, rows) {
        return this.links.format.renderOpsTable(`${name || '이 플레이어'}의 최근 채팅`, [
            { label: '시각', render: row => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
            { key: 'body', label: '채팅' },
            { label: '조치', html: row => `<button type="button" data-chat-delete="${this.links.format.cloudToolsEscape(row.id)}">줄 지우기</button>` }
        ], rows);
    }

    renderOpsShell() {
        let nav = OPS_SECTIONS.map(([id, title]) => `<button type="button" data-ops-jump="${id}">${title}</button>`).join('');
        let section = (id, body) => {
            let [, title, hint] = OPS_SECTIONS.find(entry => entry[0] === id);
            return `<details class="ops-section" id="${id}"><summary><strong>${title}</strong><small>${hint}</small></summary><div class="ops-section-body">${body}</div></details>`;
        };
        let loading = title => `<section><h3>${title}</h3><p class="cloud-tools-empty">불러오는 중…</p></section>`;
        return '<div id="ops-top"><p class="cloud-tools-empty">집계 중…</p></div>'
            + `<nav class="ops-nav">${nav}</nav>`
            + section('ops-stats', '<div id="ops-stats-body"><p class="cloud-tools-empty">집계 중…</p></div>')
            + section('ops-cheat', `<div id="cheat-watch">${loading('치트 감시')}</div>`)
            + section('ops-chat', `<div id="chat-reports">${loading('채팅 신고')}</div>`)
            + section('ops-feedback', `<div id="admin-feedback">${loading('문의와 제보')}</div>`)
            + section('ops-players', this.links.playerView.renderPlayerLookupShell());
    }

    renderOpsHead(overview) {
        if (overview.error) return this.links.format.renderSectionError('운영 지표', overview.error, 'db/ops-overview-20261027.sql');
        return this.renderTodoStrip(overview.todo || {}) + this.renderKpiCards(overview);
    }

    renderOpsAlertBlock(overview, dashboard) {
        let alerts = dashboard.error ? this.links.format.renderSectionError('경고', dashboard.error) : this.renderOpsAlerts(Array.isArray(dashboard.alerts) ? dashboard.alerts : []);
        return alerts + (overview.error ? '' : this.renderErrorGroups(Array.isArray(overview.errors) ? overview.errors : []));
    }

    renderTodoStrip(todo) {
        let chips = OPS_TODO_ITEMS.map(([key, label, section]) => {
            let count = Number(todo[key]) || 0;
            return `<button type="button" class="ops-todo${count ? '' : ' is-zero'}" data-ops-jump="${section}"><strong>${this.links.format.cloudToolsNumber(count)}</strong>${label}</button>`;
        }).join('');
        return `<section class="ops-todo-strip"><h3>할 일</h3><div class="ops-todo-row">${chips}</div></section>`;
    }

    /** 이번 7일과 그 전 7일: "162 (전주 230)". */
    opsWeekPair(current, previous) {
        return `${this.links.format.cloudToolsNumber(current)} <small>(전주 ${this.links.format.cloudToolsNumber(previous)})</small>`;
    }

    renderKpiCards(overview) {
        let accounts = overview.accounts || {}, play = overview.play || {}, social = overview.social || {}, server = overview.server || {};
        let dbMb = Math.round((Number(server.dbBytes) || 0) / 1048576), dbLimitMb = Math.round((Number(server.dbLimitBytes) || 524288000) / 1048576);
        let cards = [
            ['계정', [['가입', this.links.format.cloudToolsNumber(accounts.total)], ['7일 새 가입', this.opsWeekPair(accounts.new7d, accounts.newPrev7d)], ['7일 로그인', this.links.format.cloudToolsNumber(accounts.signedIn7d)],
                ['24시간 접속', this.links.format.cloudToolsNumber(accounts.seen24h)], ['공개 프로필', this.links.format.cloudToolsNumber(accounts.profiles)]]],
            ['전투', [['30일 전투', this.links.format.cloudToolsNumber(play.runs30d)], ['7일 전투', this.opsWeekPair(play.runs7d, play.runsPrev7d)], ['7일 전투한 사람', this.opsWeekPair(play.players7d, play.playersPrev7d)],
                ['30일 클리어율', `${play.clearRate30d == null ? '-' : play.clearRate30d}%`], ['30일 중단', this.links.format.cloudToolsNumber(play.abandons30d)]]],
            ['멀티', [['7일 채팅', this.opsWeekPair(social.chat7d, social.chatPrev7d)], ['고스트 등록', this.links.format.cloudToolsNumber(social.ghostsActive)], ['30일 대전', this.links.format.cloudToolsNumber(social.ghostMatches30d)],
                ['전시 중', this.links.format.cloudToolsNumber(social.hallOpen)], ['30일 구매', this.links.format.cloudToolsNumber(social.hallPurchases30d)]]],
            ['서버', [['DB 크기', `${dbMb}MB / ${dbLimitMb}MB`], ['저장', `${this.links.format.cloudToolsNumber(server.saves)}개, ${Math.round((Number(server.saveBytes) || 0) / 1048576)}MB`],
                ['저장 이력', this.links.format.cloudToolsNumber(server.saveVersions)], ['30일 오류', this.links.format.cloudToolsNumber(server.errors30d)], ['마지막 전투 기록', this.links.format.cloudToolsTime(play.lastRunAt)]]]
        ];
        let html = cards.map(([title, rows]) => `<div class="ops-kpi"><h4>${title}</h4><dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></div>`).join('');
        return `<section><h3>지표</h3><div class="ops-kpi-row">${html}</div></section>`;
    }

    renderOpsAlerts(alerts) {
        let order = { critical: 0, warning: 1 };
        let rows = alerts.slice().sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2) || (Number(b.runs) || 0) - (Number(a.runs) || 0));
        return this.links.format.renderOpsTable('경고, 최근 30일', [
            { label: '등급', render: row => row.severity === 'critical' ? '심각' : '주의' },
            { label: '지역', render: row => row.zone_type === 'build' ? this.links.format.opsBuildLabel(row.zone_id) : this.links.format.opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) },
            { key: 'message', label: '판정' }, { key: 'runs', label: '전투' }, { label: '사람', render: row => row.players == null ? '' : this.links.format.cloudToolsNumber(row.players) }
        ], rows);
    }

    renderErrorGroups(errors) {
        return this.links.format.renderOpsTable('오류, 최근 30일(같은 오류는 묶음)', [
            { label: '오류', html: row => `<div class="feedback-cell">${this.links.format.cloudToolsEscape(row.message || row.fingerprint)}</div>` },
            { key: 'hits', label: '횟수' }, { key: 'users', label: '사람' }, { label: '마지막', render: row => this.links.format.cloudToolsTime(row.last_at) }, { key: 'app_version', label: '버전' }
        ], errors);
    }
}
