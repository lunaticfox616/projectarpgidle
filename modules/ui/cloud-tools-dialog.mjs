export class CloudToolsDialog {
    constructor(deps, links, state) {
        this.deps = deps; this.links = links; this.state = state;
        this.version = 0;
        this.created = null;
    }

    invalidate() { this.version++; }

    capture() { return { dialog: this.deps.document.getElementById('cloud-tools-dialog'), version: this.version }; }

    current(ticket) {
        return this.state.active && ticket.version === this.version && ticket.dialog?.open
            && ticket.dialog === this.deps.document.getElementById('cloud-tools-dialog');
    }

    dispose() {
        this.invalidate();
        const dialog = this.deps.document.getElementById('cloud-tools-dialog');
        if (dialog?.open) dialog.close();
        this.created?.remove();
        this.created = null;
    }

    ensureCloudToolsDialog() {
        let dialog = this.deps.document.getElementById('cloud-tools-dialog');
        if (dialog) return dialog;
        dialog = this.deps.document.createElement('dialog');
        dialog.id = 'cloud-tools-dialog';
        dialog.className = 'cloud-tools-dialog';
        dialog.innerHTML = `<div class="cloud-tools-head"><strong id="cloud-tools-title"></strong><button type="button" onclick="closeCloudToolsDialog()" aria-label="닫기">✕</button></div><div id="cloud-tools-body" class="cloud-tools-body"></div>`;
        this.deps.document.body.appendChild(dialog);
        this.created = dialog;
        return dialog;
    }

    openCloudToolsDialog(title, html) {
        if (!this.state.active) return null;
        this.invalidate();
        let dialog = this.ensureCloudToolsDialog();
        this.deps.document.getElementById('cloud-tools-title').textContent = title;
        this.deps.document.getElementById('cloud-tools-body').innerHTML = html;
        if (!dialog.open) dialog.showModal();
        return { dialog, version: this.version };
    }

    closeCloudToolsDialog() {
        if (!this.state.active) return;
        this.invalidate();
        let dialog = this.deps.document.getElementById('cloud-tools-dialog');
        if (dialog && dialog.open) dialog.close();
    }

    injectCloudToolsStyles() {
        if (this.deps.document.getElementById('cloud-tools-styles')) return;
        let style = this.deps.document.createElement('style');
        style.id = 'cloud-tools-styles';
        // 레이어 안에 둔다(레이어 밖 CSS는 스킨 규칙을 모두 이긴다).
        style.textContent = `@layer components{.cloud-tools-dialog{width:min(980px,calc(94vw / var(--scale-display-factor, 1)));max-height:calc(88vh / var(--scale-display-factor, 1));padding:0;border:1px solid #445b78;border-radius:12px;background:#0d1623;color:#eef6ff}.cloud-tools-dialog::backdrop{background:rgba(0,0,0,.72)}.cloud-tools-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#142238;border-bottom:1px solid #304765}.cloud-tools-head button{margin:0}.cloud-tools-body{padding:14px;overflow:auto}.cloud-history-list{display:grid;gap:7px}.cloud-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.cloud-history-row small{display:block;color:#9eb0c8;margin-top:3px}.cloud-current-badge{color:#8be5aa;font-weight:700}.cloud-tools-note,.cloud-tools-empty{color:#a9b8cc}.cloud-tools-error{color:#ff9b9b}.ops-summary{display:flex;gap:8px;flex-wrap:wrap}.ops-summary span{padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.cloud-tools-body section{margin-top:18px}.cloud-tools-table-wrap{overflow:auto}.cloud-tools-table-wrap table{width:100%;border-collapse:collapse;font-size:12px}.cloud-tools-table-wrap th,.cloud-tools-table-wrap td{padding:7px;border-bottom:1px solid #263a54;text-align:left;white-space:nowrap}.feedback-form{display:grid;gap:8px}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea,#player-query{box-sizing:border-box;background:#111e30;color:#eef6ff;border:1px solid #2b405d;border-radius:6px;padding:6px;font:inherit}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea{width:100%}#player-query{flex:1;min-width:200px}.feedback-list{display:grid;gap:8px}.feedback-item{padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.feedback-meta{display:flex;flex-wrap:wrap;gap:10px;color:#9eb0c8;font-size:12px}.feedback-body{white-space:pre-wrap;margin-top:4px}.feedback-reply{margin-top:6px;padding:6px 8px;border-left:3px solid #8be5aa;white-space:pre-wrap}.feedback-cell{white-space:normal;min-width:220px;max-width:380px}.feedback-actions{display:grid;gap:4px;min-width:220px}.player-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 16px;margin:8px 0}.player-facts dt{color:#9eb0c8;font-size:12px}.player-facts dd{margin:0;overflow-wrap:anywhere}.player-json{max-height:320px;overflow:auto;font-size:11px;white-space:pre-wrap}.ops-nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px;position:sticky;top:46px;z-index:1;padding:6px 0;background:#0d1623}.ops-nav button{margin:0}.ops-section{margin-top:10px;border:1px solid #2b405d;border-radius:8px;background:#0f1a2b}.ops-section>summary{display:flex;align-items:baseline;gap:10px;padding:10px 14px;cursor:pointer;list-style:none}.ops-section>summary::-webkit-details-marker{display:none}.ops-section>summary::before{content:"▸";color:#9eb0c8}.ops-section[open]>summary::before{content:"▾"}.ops-section>summary small{color:#9eb0c8}.ops-section-body{padding:0 14px 12px}.ops-section-body section:first-child{margin-top:4px}.ops-todo-strip h3,.ops-kpi-row+h3{margin-top:0}.ops-todo-row{display:flex;flex-wrap:wrap;gap:8px}.ops-todo{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:112px;padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238;color:#eef6ff;text-align:left}.ops-todo strong{font-size:20px;color:#ffd27a}.ops-todo.is-zero{opacity:.55}.ops-todo.is-zero strong{color:#9eb0c8}.ops-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ops-kpi{padding:10px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.ops-kpi h4{margin:0 0 6px;color:#ffd27a;font-size:13px}.ops-kpi dl{margin:0;display:grid;gap:3px}.ops-kpi dl div{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ops-kpi dt{color:#9eb0c8}.ops-kpi dd{margin:0;text-align:right}.ops-kpi dd small{color:#9eb0c8}}`;
        this.deps.document.head.appendChild(style);
    }
}
