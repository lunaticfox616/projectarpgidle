export class CloudPlayerLookup {
    constructor(deps, links, state) {
        this.deps = deps; this.links = links; this.state = state;
        this.downloads = new Map();
        this.searchVersion = 0;
        this.detailVersion = 0;
    }

    async searchPlayers() {
        if (!this.state.active) return;
        const version = ++this.searchVersion;
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('player-results');
        if (!box) return;
        let input = this.deps.document.getElementById('player-query');
        box.innerHTML = '<p class="cloud-tools-empty">찾는 중…</p>';
        try {
            let rows = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_search_players', { method: 'POST', body: { p_query: input ? input.value.trim() : '', p_limit: 50 } });
            if (!this.canShowResult(box, version, this.searchVersion)) return;
            box.innerHTML = this.links.playerView.renderPlayerRows(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            if (!this.canShowResult(box, version, this.searchVersion)) return;
            box.innerHTML = this.links.format.renderSectionError('플레이어', error);
        }
    }

    async openPlayerDetail(button) {
        if (!this.state.active) return;
        const version = ++this.detailVersion;
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('player-detail');
        if (!box) return;
        this.state.playerDetailUserId = button.dataset.playerDetail;
        box.innerHTML = '<section><h3>자세히</h3><p class="cloud-tools-empty">불러오는 중…</p></section>';
        try {
            let data = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_player', { method: 'POST', body: { p_user_id: button.dataset.playerDetail } });
            if (!this.canShowResult(box, version, this.detailVersion)) return;
            box.innerHTML = this.links.playerView.renderPlayerDetail(data || {});
            box.scrollIntoView({ block: 'start' });
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            if (!this.canShowResult(box, version, this.detailVersion)) return;
            box.innerHTML = `<section><h3>자세히</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p></section>`;
        }
    }

    /** 보류, 금지, 기록 지우기 뒤: 플레이어 표가 있으면 다시 찾고, 자세히 보기가 열려 있으면 다시 불러온다. */
    async refreshPlayerViews() {
        if (this.deps.document.getElementById('player-results')) await this.searchPlayers();
        if (this.state.playerDetailUserId && this.deps.document.getElementById('player-detail')) await this.openPlayerDetail({ dataset: { playerDetail: this.state.playerDetailUserId } });
    }

    /** 저장 JSON 전체를 파일로 내려받는다(버그 재현용). */
    async downloadPlayerSave(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        try {
            let data = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_player_save', { method: 'POST', body: { p_user_id: button.dataset.playerSave } });
            let link = this.deps.document.createElement('a');
            link.href = this.deps.URL.createObjectURL(new this.deps.Blob([JSON.stringify(data)], { type: 'application/json' }));
            const url = link.href;
            this.downloads.set(url, this.deps.setTimeout(() => this.releaseDownload(url), 1000));
            link.download = `rignin-save-${String(button.dataset.playerName || button.dataset.playerSave).replace(/[^\w가-힣-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
            this.deps.document.body.appendChild(link);
            link.click();
            link.remove();
            (0, this.deps.showGameToast)((0, this.deps._t)('저장 파일을 내려받았습니다.'), 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('저장을 받지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
    }

    canShowResult(box, version, currentVersion) {
        return version === currentVersion && box.isConnected;
    }

    releaseDownload(url) {
        this.deps.clearTimeout(this.downloads.get(url));
        this.downloads.delete(url);
        this.deps.URL.revokeObjectURL(url);
    }

    dispose() {
        this.searchVersion++;
        this.detailVersion++;
        for (const url of this.downloads.keys()) this.releaseDownload(url);
    }
}
