import { OPS_ZONE_TYPE_LABELS, OPS_ZONE_ID_LABELS } from '../data/cloud-tools.mjs';
export class CloudToolsFormat {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    cloudToolsEscape(value) {
        return typeof this.deps.escapeHTML === 'function' ? (0, this.deps.escapeHTML)(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    cloudToolsNumber(value) {
        return Math.floor(Number(value) || 0).toLocaleString(this.deps.i18n.locale);
    }

    cloudToolsTime(value) {
        return value ? new Date(value).toLocaleString(this.deps.i18n.locale) : '';
    }

    /** A titled table. A column shows row[key], or render(row) as text, or html(row) as markup the column escapes itself (buttons). */
    renderOpsTable(title, columns, rows) {
        let safeTitle = this.cloudToolsEscape(title);   // 제목에 닉네임이 들어오는 호출자가 있다(검토 지적 2026-10-27)
        if (!rows.length) return `<section><h3>${safeTitle}</h3><p class="cloud-tools-empty">표본 없음</p></section>`;
        let head = columns.map(column => `<th>${this.cloudToolsEscape(column.label)}</th>`).join('');
        let cell = (column, row) => column.html ? column.html(row) : this.cloudToolsEscape(column.render ? column.render(row) : row[column.key]);
        let body = rows.map(row => `<tr>${columns.map(column => `<td>${cell(column, row)}</td>`).join('')}</tr>`).join('');
        return `<section><h3>${safeTitle}</h3><div class="cloud-tools-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
    }

    /** 새 RPC가 아직 서버에 없을 때(묶음 SQL 미실행)와 그 밖의 오류를 가른다. sqlFile은 그 절을 만드는 묶음 파일. */
    renderSectionError(title, error, sqlFile = 'db/feedback-and-admin-players-20261027.sql') {
        let text = String((error && error.message) || error);
        return /schema cache|could not find|does not exist/i.test(text)
            ? `<section><h3>${title}</h3><p class="cloud-tools-note">Supabase에서 ${sqlFile}을 실행하면 보입니다.</p></section>`
            : `<section><h3>${title}</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.cloudToolsEscape(text)}</p></section>`;
    }

    /** A hold or release button for one account; the dialog's click handler sends it (setCheatHold). */
    renderCheatHoldButton(userId, held, note) {
        return `<button type="button" data-cheat-hold="${this.cloudToolsEscape(userId)}" data-cheat-held="${held ? '1' : '0'}" data-cheat-note="${this.cloudToolsEscape(note)}">${held ? '보류 풀기' : '보류'}</button>`;
    }

    /** 금지 풀기(금지 중일 때), 1일, 7일 금지 단추(setChatMute). 신고 표, 금지 표, 플레이어 자세히 보기가 같이 쓴다. */
    renderMuteButtons(userId, nickname, muted) {
        let id = this.cloudToolsEscape(userId), name = this.cloudToolsEscape(nickname || '');
        return (muted ? `<button type="button" data-chat-mute="${id}" data-chat-minutes="0" data-chat-name="${name}">금지 풀기</button>` : '')
            + `<button type="button" data-chat-mute="${id}" data-chat-minutes="1440" data-chat-name="${name}">1일 금지</button>`
            + `<button type="button" data-chat-mute="${id}" data-chat-minutes="10080" data-chat-name="${name}">7일 금지</button>`;
    }

    /** The 최근 채팅 button of one player (peekPlayerChat). */
    peekButton(userId, name) {
        return `<button type="button" data-chat-peek="${this.cloudToolsEscape(userId)}" data-chat-name="${this.cloudToolsEscape(name || '')}">최근 채팅</button>`;
    }

    playerDetailButton(userId, name) {
        return `<button type="button" data-player-detail="${this.cloudToolsEscape(userId)}" data-player-name="${this.cloudToolsEscape(name || '')}">자세히</button>`;
    }

    /** 원격 측정의 zone_type, zone_id, 단계를 한 줄 한글로: "심연 22층", "유성 낙하지 14단계", "막 9". */
    opsZoneLabel(type, id, stage) {
        let typeLabel = OPS_ZONE_TYPE_LABELS[type] || String(type || '');
        let idText = String(id == null ? '' : id);
        let place = OPS_ZONE_ID_LABELS[idText] || (/^\d+$/.test(idText) ? `${typeLabel} ${idText}${type === 'abyss' ? '층' : ''}` : `${typeLabel} ${idText}`.trim());
        return stage ? `${place} ${/^\d+$/.test(String(stage)) ? `${stage}단계` : stage}` : place;
    }

    opsClassLabel(ascendClass) {
        if (!ascendClass || ascendClass === 'unascended') return '미전직';
        return typeof this.deps.CLASS_TEMPLATES !== 'undefined' && this.deps.CLASS_TEMPLATES[ascendClass] ? this.deps.CLASS_TEMPLATES[ascendClass].name : String(ascendClass);
    }

    /** 빌드 경고의 zone_id는 서버가 "직업id · 스킬"로 붙인 글: 직업을 한글로, 가운뎃점 없이. */
    opsBuildLabel(text) {
        let [ascendClass, ...skill] = String(text || '').split(' · ');
        return skill.length ? `${this.opsClassLabel(ascendClass)}, ${skill.join(' ')}` : this.opsClassLabel(ascendClass);
    }

    renderCloudHistoryRows(rows) {
        if (!rows.length) return '<p class="cloud-tools-empty">저장 이력이 없습니다.</p>';
        return `<div class="cloud-history-list">${rows.map(row => {
            let time = row.saved_at ? new Date(row.saved_at).toLocaleString(this.deps.i18n.locale) : '-';
            let action = row.is_current
                ? '<span class="cloud-current-badge">현재</span>'
                : `<button type="button" onclick="restoreCloudSaveVersion(${Number(row.revision) || 0})">복구</button>`;
            return `<div class="cloud-history-row"><div><strong>리비전 ${this.cloudToolsNumber(row.revision)}</strong><small>루프 ${this.cloudToolsNumber(row.loop_number)}, ${this.cloudToolsEscape(time)}</small></div>${action}</div>`;
        }).join('')}</div><p class="cloud-tools-note">정상적으로 완료된 클라우드 저장의 이전 버전을 약 30분 간격으로 최대 2개 보관합니다.</p>`;
    }
}
