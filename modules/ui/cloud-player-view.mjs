import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS } from '../data/cloud-tools.mjs';
export class CloudPlayerView {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    // ---------------------------------------------------------------------------
    renderPlayerLookupShell() {
        return '<section><h3>플레이어</h3><p class="cloud-tools-note">닉네임, 이메일, 계정 id 앞부분으로 찾습니다. 비워 두면 최근 활동순 50명입니다.</p>'
            + '<div class="ops-summary"><input id="player-query" type="text" maxlength="80" placeholder="닉네임, 이메일, id"><button type="button" data-player-search="1">찾기</button></div></section>'
            + '<div id="player-results"></div><div id="player-detail"></div>';
    }

    renderPlayerRows(rows) {
        return this.links.format.renderOpsTable(`플레이어 ${rows.length}명`, [
            { label: '닉네임', html: row => `${this.links.format.cloudToolsEscape(row.nickname || '(프로필 없음)')}<br><small>${this.links.format.cloudToolsEscape(row.email || '')}</small>` },
            { label: '레벨', render: row => `${row.level || '-'}, 루프 ${row.loop || '-'}` },
            { label: '전투력', render: row => this.links.format.cloudToolsNumber(row.power) },
            { label: '마지막 활동', render: row => this.links.format.cloudToolsTime(row.last_active) },
            { label: '저장', render: row => row.save_revision == null ? '없음' : `r${row.save_revision}, 압축 ${Math.round((row.save_bytes || 0) / 1024)}KB` },
            { label: '고스트', render: row => row.ghost_rating == null ? '' : `${row.ghost_rating}${row.ghost_active ? '' : ' (꺼짐)'}` },
            { label: '전당', render: row => row.hall_honor == null ? '' : `명예 ${this.links.format.cloudToolsNumber(row.hall_honor)}, 전시 ${row.hall_open || 0}` },
            { label: '상태', render: row => this.playerStatusText(row) },
            { label: '조치', html: row => this.links.format.playerDetailButton(row.user_id, row.nickname) + this.links.format.renderCheatHoldButton(row.user_id, row.held, '') + this.links.format.peekButton(row.user_id, row.nickname) }
        ], rows);
    }

    playerStatusText(row) {
        let parts = [];
        if (row.held) parts.push('보류');
        if (row.muted_until) parts.push(`채팅 금지 ${this.links.format.cloudToolsTime(row.muted_until)}까지`);
        if (Number(row.flag_count)) parts.push(`기록 ${row.flag_count}`);
        if (Number(row.report_count)) parts.push(`신고 ${row.report_count}`);
        if (Number(row.feedback_count)) parts.push(`문의 ${row.feedback_count}`);
        return parts.join(', ');
    }

    renderPlayerDetail(data) {
        let account = data.account || {};
        let name = account.nickname || String(account.user_id || '').slice(0, 8);
        let muted = !!(data.mute && new Date(data.mute.until_at).getTime() > Date.now());
        let actions = this.links.format.renderCheatHoldButton(account.user_id, !!data.hold, data.hold ? data.hold.note : '')
            + this.links.format.renderMuteButtons(account.user_id, name, muted) + this.links.format.peekButton(account.user_id, name)
            + `<button type="button" data-player-save="${this.links.format.cloudToolsEscape(account.user_id)}" data-player-name="${this.links.format.cloudToolsEscape(name)}">저장 JSON 내려받기</button>`;
        let facts = [...this.accountFacts(data), ...this.saveFacts(data), ...this.standingFacts(data)].map(([label, value]) => `<div><dt>${label}</dt><dd>${this.links.format.cloudToolsEscape(value)}</dd></div>`).join('');
        return `<section><h3>자세히: ${this.links.format.cloudToolsEscape(name)}</h3><div class="ops-summary">${actions}</div><dl class="player-facts">${facts}</dl></section>`
            + this.renderPlayerTables(data)
            + `<section><h3>공개 프로필 JSON</h3><details><summary>펼치기</summary><pre class="player-json">${this.links.format.cloudToolsEscape(JSON.stringify(data.profile || {}, null, 2))}</pre></details></section>`;
    }

    accountFacts(data) {
        let account = data.account || {}, profile = data.profile || {};
        return [
            ['계정', `${account.email || ''} ${account.user_id || ''}`],
            ['가입', this.links.format.cloudToolsTime(account.joined_at)],
            ['마지막 로그인', this.links.format.cloudToolsTime(account.last_sign_in_at)],
            ['마지막 접속', this.links.format.cloudToolsTime(account.last_seen)],
            ['로그인 방식', Array.isArray(account.providers) ? account.providers.join(', ') : ''],
            ['닉네임 바꾼 때', this.links.format.cloudToolsTime(account.nickname_updated_at)],
            ['캐릭터', `${profile.className || profile.heroClassName || ''} 레벨 ${profile.level || '-'}, 루프 ${profile.loop || '-'}, 전투력 ${this.links.format.cloudToolsNumber(profile.power)}`]
        ];
    }

    saveFacts(data) {
        let save = data.save;
        return [
            ['저장', save ? `r${save.revision}, ${Math.round((save.bytes || 0) / 1024)}KB, ${this.links.format.cloudToolsTime(save.updated_at)}, 이력 ${data.saveVersions || 0}개` : '없음'],
            ['저장 요약', save && save.digest ? this.saveDigestText(save.digest) : '']
        ];
    }

    standingFacts(data) {
        let ghost = data.ghost;
        return [
            ['고스트', ghost ? `점수 ${ghost.rating}, DPS ${this.links.format.cloudToolsNumber(ghost.dps)}, ${ghost.wins}승 ${ghost.losses}패 ${ghost.draws}무${ghost.active ? '' : ', 꺼짐'}` : '없음'],
            ['전당', data.hall ? `명예 ${this.links.format.cloudToolsNumber(data.hall.honor)}, 나눠 준 복제품 ${data.hall.copies_shared}` : '없음'],
            ['보류', data.hold ? `${this.links.format.cloudToolsTime(data.hold.created_at)} ${data.hold.note || ''}` : '없음'],
            ['채팅 금지', data.mute ? `${this.links.format.cloudToolsTime(data.mute.until_at)}까지 ${data.mute.note || ''}` : '없음']
        ];
    }

    /** cheat_save_digest의 네 칸(level, season, currencies, saveMeta)을 한 줄로. */
    saveDigestText(digest) {
        let currencies = digest.currencies && typeof digest.currencies === 'object' ? Object.keys(digest.currencies).length : 0;
        let modified = digest.saveMeta && digest.saveMeta.lastModifiedAt ? this.links.format.cloudToolsTime(digest.saveMeta.lastModifiedAt) : '';
        return `레벨 ${digest.level == null ? '-' : digest.level}, 루프 ${digest.season == null ? '-' : digest.season}, 재화 ${currencies}종${modified ? `, 기기 저장 ${modified}` : ''}`;
    }

    renderPlayerTables(data) {
        return this.links.format.renderOpsTable('감시 기록', [
                { label: '종류', key: 'kind' }, { label: '날짜', key: 'seen_on' }, { label: '횟수', key: 'hits' },
                { label: '마지막', render: row => this.links.format.cloudToolsTime(row.last_at) }, { label: '내용', render: row => JSON.stringify(row.detail || {}).slice(0, 120) }
            ], Array.isArray(data.flags) ? data.flags : [])
            + this.links.format.renderOpsTable('받은 신고', [
                { label: '시각', render: row => this.links.format.cloudToolsTime(row.created_at) }, { label: '사유', key: 'reason' }, { label: '채팅', render: row => row.body || '' }
            ], Array.isArray(data.reports) ? data.reports : [])
            + this.links.format.renderOpsTable('최근 채팅', [
                { label: '시각', render: row => this.links.format.cloudToolsTime(row.created_at) }, { label: '내용', key: 'body' }
            ], Array.isArray(data.chat) ? data.chat : [])
            + this.links.format.renderOpsTable('전당 전시', [
                { label: '시각', render: row => this.links.format.cloudToolsTime(row.created_at) }, { label: '이름', render: row => row.name || '' },
                { label: '점수', render: row => this.links.format.cloudToolsNumber(row.item_score) }, { label: '상태', key: 'status' }
            ], Array.isArray(data.listings) ? data.listings : [])
            + this.links.format.renderOpsTable('보낸 문의', [
                { label: '시각', render: row => this.links.format.cloudToolsTime(row.created_at) }, { label: '종류', render: row => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
                { label: '내용', key: 'body' }, { label: '상태', render: row => FEEDBACK_STATUS_LABELS[row.status] || row.status }
            ], Array.isArray(data.feedback) ? data.feedback : []);
    }
}
