/** DOM-only presentation shared by tab handover and remote-session standby. */
export class StandbyView {
    constructor(document) {
        this.document = document;
        this.disposed = false;
        this.resumeButton = null;
        this.resumeHandler = null;
    }

    uncover() {
        const fonts = this.document.fonts && this.document.fonts.ready ? this.document.fonts.ready : Promise.resolve();
        fonts.then(() => { if (!this.disposed) this.document.documentElement.classList.remove('app-preload'); });
    }

    showTab(resumeGame) {
        if (this.disposed) return;
        this.uncover();
        const overlay = this.document.getElementById('startup-overlay');
        const panel = this.document.getElementById('startup-standby');
        if (!overlay || !panel) return;
        overlay.classList.add('standby');
        panel.hidden = false;
        const resume = this.document.getElementById('btn-startup-standby');
        this.bindResume(resume, resumeGame);
        resume.focus();
    }

    showSession(labels, resumeGame) {
        if (this.disposed) return;
        const overlay = this.document.getElementById('startup-overlay');
        const panel = this.document.getElementById('startup-standby');
        if (!overlay || !panel) return;
        const fill = (selector, text) => { const el = panel.querySelector(selector); if (el) el.textContent = text; };
        fill('.startup-auth-title', labels.title);
        fill('.startup-standby-copy', labels.copy);
        fill('.startup-standby-note', labels.note);
        overlay.classList.add('standby');
        panel.hidden = false;
        this.uncover();
        const resume = this.document.getElementById('btn-startup-standby');
        if (!resume) return;
        resume.textContent = labels.button;
        this.bindResume(resume, resumeGame);
        resume.focus();
    }

    bindResume(button, handler) {
        if (this.resumeButton) this.resumeButton.removeEventListener('click', this.resumeHandler);
        this.resumeButton = button;
        this.resumeHandler = handler;
        button.addEventListener('click', handler);
    }

    dispose() {
        this.disposed = true;
        if (this.resumeButton) this.resumeButton.removeEventListener('click', this.resumeHandler);
        this.resumeButton = this.resumeHandler = null;
    }
}
