import { OPS_TODO_ITEMS, OPS_SECTIONS } from '../data/cloud-tools.mjs';
export class CloudOpsDashboard {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    /** 운영 창. 뼈대(할 일 띠, 지표, 경고 자리와 접힌 절들)를 먼저 그리고 RPC 여섯을 한꺼번에 불러 채운다(전: 하나씩 차례로).
     * 할 일이 있는 절만 펼쳐진 채 열린다. */
    async openOpsDashboard() {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.showGameToast)((0, this.deps._t)('관리자 로그인이 필요합니다.'), 'warning');
        const ticket = this.links.dialog.openCloudToolsDialog('운영 창', this.links.opsView.renderOpsShell());
        let [overview, dashboard] = await Promise.all([
            this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_ops_overview', { method: 'POST', body: {} }).catch(error => ({ error })),
            this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_ops_dashboard', { method: 'POST', body: {} }).catch(error => ({ error })),
            this.links.moderation.loadCheatWatch(), this.links.moderation.loadChatReports(), this.links.feedback.loadAdminFeedback(), this.links.players.searchPlayers()
        ]);
        if (this.links.session.current(accountContext) && this.links.dialog.current(ticket)) this.renderOpsTop(overview || {}, dashboard || {});
    }

    /** 절 이동 칩과 할 일 띠의 단추: 접힌 절을 펼치고 거기로 내린다. */
    jumpToOpsSection(button) {
        if (!this.state.active) return;
        let section = this.deps.document.getElementById(button.dataset.opsJump);
        if (!section) return;
        section.open = true;
        section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    /** 맨 위: 할 일 띠, 지표 카드, 경고 표, 묶은 오류. 통계 절의 몸통도 여기서 채운다. 할 일이 있는 절은 펼쳐 둔다. */
    renderOpsTop(overview, dashboard) {
        let top = this.deps.document.getElementById('ops-top');
        if (!top) return;
        top.innerHTML = this.links.opsView.renderOpsHead(overview) + this.links.opsView.renderOpsAlertBlock(overview, dashboard);
        let stats = this.deps.document.getElementById('ops-stats-body');
        if (stats) stats.innerHTML = dashboard.error ? this.links.format.renderSectionError('전투 통계', dashboard.error) : this.links.opsView.renderOpsStats(dashboard);
        this.openSectionsWithTodo(overview.todo || {});
    }

    openSectionsWithTodo(todo) {
        let open = new Set(OPS_TODO_ITEMS.filter(([key]) => Number(todo[key]) > 0).map(([, , section]) => section));
        for (const [id] of OPS_SECTIONS) {
            let section = this.deps.document.getElementById(id);
            if (section) section.open = open.has(id);
        }
    }
}
