export class GhostArenaView {
    constructor(deps, owner) { this.deps = deps; this.owner = owner; this.createdStyle = null; }

    ghostArenaEscape(value) {
        return typeof this.deps.escapeHTML === 'function' ? (0, this.deps.escapeHTML)(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    renderProfileGhostResult(result) {
        if (!result) return '';
        let labels = { win: '승리', loss: '패배', draw: '무승부' };
        let tone = result.result === 'win' ? 'win' : (result.result === 'loss' ? 'loss' : 'draw');
        return `<div class="ghost-result ${tone}" data-ghost-duel-result><strong>${(0, this.deps._t)('친선전 {labels}', { labels: labels[result.result] || result.result })}</strong><span>${(0, this.deps._t)('{opponent}, 레이팅 변동 없음', { opponent: this.ghostArenaEscape(result.opponent) })}</span></div>`;
    }

    renderGhostResult(result) {
        if (!result) return '';
        let labels = { win: '승리', loss: '패배', draw: '무승부' };
        let tone = result.result === 'win' ? 'win' : (result.result === 'loss' ? 'loss' : 'draw');
        let delta = Number(result.ratingDelta) || 0;
        return `<div class="ghost-result ${tone}" data-ghost-duel-result><strong>${labels[result.result] || result.result}</strong>, ${this.ghostArenaEscape(result.opponent)} (${this.ghostArenaEscape(result.opponentSkill)})<span>${(0, this.deps._t)('레이팅 {ratingBefore} → {ratingAfter} ({value}{delta})', { ratingBefore: this.ghostArenaEscape(result.ratingBefore), ratingAfter: this.ghostArenaEscape(result.ratingAfter), value: delta >= 0 ? '+' : '', delta })}</span></div>`;
    }

    renderGhostReviewNotice(data) {
        return data && data.underReview === true ? '<p class="ghost-error">검토 중인 고스트: 순위전 점수가 멈춰 있습니다.</p>' : '';
    }

    renderGhostLeaderboard(rows) {
        if (!rows.length) return '<p class="ghost-empty">등록된 고스트가 없습니다.</p>';
        return `<div class="ghost-board">${rows.slice(0, 10).map(row => `<div class="ghost-rank"><b>${row.rank}</b><span>${this.ghostArenaEscape(row.nickname)}<small>${this.ghostArenaEscape((0, this.deps.socialClassLabel)(row.ascend_class))}, ${this.ghostArenaEscape(row.active_skill)}</small></span><strong>${row.rating}${row.provisional ? '*' : ''}</strong><em>${(0, this.deps._t)('{wins}승 {losses}패 {draws}무', { wins: row.wins, losses: row.losses, draws: row.draws })}</em></div>`).join('')}</div>`;
    }

    renderFriendlyGhostChallenge() {
        let selected = this.owner.current.selectedProfile;
        if (!selected) return '';
        let disabled = this.owner.current.friendlyBusy || this.owner.current.loading || !this.owner.serverReady();
        return `<section class="ghost-friendly"><div><small>${(0, this.deps._t)('친선전 상대')}</small><strong>${this.ghostArenaEscape(selected.nickname)}</strong><span>${(0, this.deps._t)('레이팅과 전적은 변하지 않습니다.')}</span></div><button type="button" onclick="fightSelectedProfileGhost()" ${disabled ? 'disabled' : ''}>${this.owner.current.friendlyBusy ? (0, this.deps._t)('대결 중…') : (0, this.deps._t)('친선 대결 시작')}</button></section>`;
    }

    renderActiveGhostDuel() {
        return this.owner.current.duel ? '<button type="button" class="ghost-replay" onclick="playGhostDuel()">무대에서 다시 보기</button>' : '';
    }

    renderGhostArenaRetry() {
        return this.owner.current.failedAt && !this.owner.current.data && !this.owner.current.loading
            ? '<button type="button" class="ghost-retry" onclick="loadGhostArena()">다시 불러오기</button>' : '';
    }

    renderActiveGhostResult() {
        if (this.owner.current.duelMode === 'friendly') return this.renderProfileGhostResult(this.owner.current.friendlyResult);
        if (this.owner.current.duelMode === 'ranked') return this.renderGhostResult(this.owner.current.result);
        return '';
    }

    updateGhostArenaMarkup(host, html) {
        if (host.__ghostArenaHtml === html) return false;
        host.innerHTML = html;
        host.__ghostArenaHtml = html;
        return true;
    }

    renderGhostArena() {
        let host = this.deps.document.getElementById('map-ghost-arena');
        if (!host) return false;
        if (!(0, this.deps.socialCloudReady)()) {
            this.updateGhostArenaMarkup(host, `<section class="ghost-arena"><header><div><strong>${(0, this.deps._t)('고스트 대결')}</strong><small>${(0, this.deps._t)('보상 없음, 점수는 서버가 판정')}</small></div></header><p class="ghost-help">${(0, this.deps._t)('대전은 클라우드 로그인이 필요합니다. 로그인한 뒤 다시 열어주세요.')}</p><button type="button" onclick="openStartupGate({ accountOnly: true })">${(0, this.deps._t)('로그인 화면 열기')}</button></section>`);
            return true;
        }
        const data = this.owner.current.data || {};
        this.updateGhostArenaMarkup(host, this.arenaMarkup(data));
        return true;
    }

    toolbar(me) {
        const serverReady = this.owner.serverReady();
        const blocked = this.owner.current.loading || this.owner.current.friendlyBusy || !serverReady;
        let status = me
            ? `<span>${(0, this.deps._t)('내 레이팅')} <strong>${me.rating}</strong>${(0, this.deps._t)(', {wins}승 {losses}패 {draws}무{value}', { wins: me.wins, losses: me.losses, draws: me.draws, value: me.matches < 10 ? (0, this.deps._t)(', 배치 중') : '' })}</span>`
            : '<span>등록된 고스트 없음</span>';
        return `<div class="ghost-toolbar">${status}<button onclick="registerMyGhost()" ${blocked ? 'disabled' : ''}>${me ? (0, this.deps._t)('고스트 갱신') : (0, this.deps._t)('고스트 등록')}</button><button onclick="fightRandomGhost()" ${!me || blocked ? 'disabled' : ''}>${(0, this.deps._t)('상대 찾기')}</button></div>`;
    }

    arenaMarkup(data) {
        const me = data.me, serverReady = this.owner.serverReady();
        let visibleMessage = this.owner.current.message || (!serverReady && me
            ? '고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요.' : '');
        let html = `<section class="ghost-arena"><header><div><strong>${(0, this.deps._t)('고스트 실전투')}</strong><small>${(0, this.deps._t)('보상 없음, 점수는 서버 모의 전투로 판정')}</small></div></header>${this.toolbar(data.me)}<p class="ghost-help">${(0, this.deps._t)('등록 시 현재 세팅을 즉시 반영합니다. 대전 간 20초, 랭크 20회/24시간, 친선 30회/24시간 제한이 서버에서 적용됩니다.')}</p>${visibleMessage ? `<p class="ghost-error">${this.ghostArenaEscape(visibleMessage)}</p>` : ''}${this.renderGhostReviewNotice(data)}${this.renderGhostArenaRetry()}${this.renderFriendlyGhostChallenge()}${this.renderActiveGhostResult()}${this.renderActiveGhostDuel()}${this.renderGhostLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])}</section>`;
        return html;
    }

    injectGhostArenaStyles() {
        if (this.deps.document.getElementById('ghost-arena-styles')) return;
        let style = this.deps.document.createElement('style');
        style.id = 'ghost-arena-styles';
        // 레이어 안에 둔다(레이어 밖 CSS는 스킨 규칙을 모두 이긴다).
        style.textContent = `@layer components{.map-pvp-heading{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:12px}.map-pvp-heading span{color:#a999d0;font-size:12px;font-weight:800;letter-spacing:.14em}.map-pvp-heading h2{margin:2px 0 0}.map-pvp-heading p{max-width:520px;margin:0;color:#9eabc0;font-size:12px}.ghost-arena{margin:8px 0;border:1px solid #4b3d72;border-radius:9px;background:linear-gradient(145deg,#17162a,#101827);overflow:hidden}.ghost-arena>header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #342d50;background:rgba(39,31,65,.62);color:#e3d8ff}.ghost-arena>header div{display:flex;align-items:baseline;gap:8px}.ghost-arena>header small{color:#9e96b8;font-weight:500}.ghost-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:12px 10px 8px}.ghost-toolbar>span{margin-right:auto;color:#d9e7f8}.ghost-help{margin:0 10px 10px;color:#9eabc0;font-size:12px}.ghost-arena>button{margin:0 10px 10px}.ghost-error{margin:0 10px 8px;color:#ff9b9b}.ghost-retry,.ghost-replay{margin:0 10px 10px}.ghost-friendly{display:flex;align-items:center;gap:12px;margin:0 10px 10px;padding:10px;border:1px solid #4a5477;border-radius:8px;background:#18243a}.ghost-friendly>div{display:flex;flex-direction:column;gap:2px;margin-right:auto}.ghost-friendly small,.ghost-friendly span{color:#9eabc0;font-size:12px}.ghost-friendly strong{color:#f0e8ff}.ghost-result{display:flex;gap:7px;flex-wrap:wrap;margin:0 10px 8px;padding:8px;border-radius:7px;background:#172238}.ghost-result:empty{display:none}.ghost-result span{margin-left:auto}.ghost-result.win strong{color:#7ee4a1}.ghost-result.loss strong{color:#ff8f8f}.ghost-result.draw strong{color:#e5d080}.ghost-board{display:grid;gap:4px;padding:0 10px 10px}.ghost-rank{display:grid;grid-template-columns:28px minmax(120px,1fr) 58px 92px;gap:7px;align-items:center;padding:6px 8px;border:1px solid #283b56;border-radius:6px;background:#111d2d}.ghost-rank>b{color:#c9a8ff}.ghost-rank span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ghost-rank small{display:block;color:#94a7bf;overflow:hidden;text-overflow:ellipsis}.ghost-rank strong{text-align:right}.ghost-rank em{font-style:normal;color:#aebbd0;font-size:12px;text-align:right}.ghost-empty{padding:0 10px 10px;color:#9eabc0}@media(max-width:640px){.map-pvp-heading{display:block}.map-pvp-heading p{margin-top:6px}.ghost-arena>header div{align-items:flex-start;flex-direction:column;gap:2px}.ghost-friendly{align-items:stretch;flex-direction:column}.ghost-rank{grid-template-columns:24px minmax(100px,1fr) 52px}.ghost-rank em{display:none}}}`;
        this.deps.document.head.appendChild(style);
        this.createdStyle = style;
    }

    dispose() {
        this.createdStyle?.remove();
        this.createdStyle = null;
    }
}
