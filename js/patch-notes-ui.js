// GENERATED from modules/patch-notes-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/changelog.mjs
  function parseChangelogMarkdown(text) {
    const entries = [];
    let current = null;
    for (const line of String(text || "").split(/\r?\n/)) {
      const header = line.match(/^##\s+(.+?)\s*$/);
      if (header) {
        const title = header[1].trim(), parts = title.split(/\s+[—–-]\s+/);
        const version = parts.length >= 2 ? parts[0].trim() : title;
        const date = parts.length >= 2 ? parts.slice(1).join(" - ").trim() : "";
        current = { version, date, items: [] };
        entries.push(current);
        continue;
      }
      const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
      if (bullet && current) current.items.push(bullet[1].trim());
    }
    return entries;
  }

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/patch-notes-view.mjs
  var PatchNotesView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.cache = null;
      this.request = null;
      listenView(this, deps.document, "keydown", (event) => {
        if (event.key !== "Escape" || !deps.document.getElementById("patch-notes-overlay")?.classList.contains("active")) return;
        event.preventDefault();
        this.close();
      });
    }
    html(notes) {
      if (!Array.isArray(notes) || !notes.length) return this.empty("등록된 패치 노트가 없습니다.");
      const esc = this.deps.escapeHTML;
      return notes.map((entry) => {
        const items = (entry.items || []).map((item) => `<li>${esc(item)}</li>`).join("");
        return `<div class="patch-note-entry"><div class="patch-note-head"><span class="patch-note-version">${esc(entry.version || "")}</span><span class="patch-note-date">${esc(entry.date || "")}</span></div><ul class="patch-note-list">${items}</ul></div>`;
      }).join("");
    }
    empty(message) {
      return `<div class="patch-note-empty">${this.deps.escapeHTML(this.deps._t(message))}</div>`;
    }
    apply(html) {
      if (!this.active) return;
      const element = this.deps.document.getElementById("patch-notes-overlay-body");
      if (element) element.innerHTML = html;
    }
    showLatestDate(entry) {
      const match = entry && /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.date || "");
      const link = this.deps.document.querySelector(".startup-patch-note-link");
      if (!match || !link) return;
      const [, year, month, day] = match;
      const shown = link.querySelector(".startup-latest-patch-date");
      if (shown) shown.textContent = `(${year}.${month}.${day})`;
      link.setAttribute("aria-label", this.deps._t("패치노트, 최신 패치 {year}년 {month}월 {day}일", { year, month: Number(month), day: Number(day) }));
    }
    open() {
      if (!this.active) return;
      this.render();
      const overlay = this.deps.document.getElementById("patch-notes-overlay");
      if (!overlay) return;
      overlay.classList.add("active");
      this.deps.document.getElementById("patch-notes-overlay-body")?.scrollTo(0, 0);
    }
    close() {
      this.deps.document.getElementById("patch-notes-overlay")?.classList.remove("active");
    }
    async render() {
      if (!this.active) return;
      if (this.cache) {
        this.apply(this.html(this.cache));
        return;
      }
      if (this.request) return;
      this.apply(this.empty("패치 노트를 불러오는 중입니다."));
      const request = new this.deps.AbortController();
      this.request = request;
      try {
        const response = await this.deps.fetch("changelog.md", { cache: "no-cache", signal: request.signal });
        if (!response.ok) throw new Error("changelog load failed");
        const text = await response.text();
        if (!this.active) return;
        this.cache = parseChangelogMarkdown(text);
        this.showLatestDate(this.cache[0]);
        this.apply(this.html(this.cache));
      } catch (error) {
        if (request.signal.aborted) return;
        this.deps.console.warn("[patch-notes] 패치 노트를 불러오지 못했습니다.", error);
        this.apply(this.empty("패치 노트를 불러오지 못했습니다."));
      } finally {
        if (this.request === request) this.request = null;
      }
    }
    dispose() {
      this.close();
      releaseViewEvents(this);
      this.request?.abort();
      this.request = null;
      this.cache = null;
    }
  };
  function createPatchNotesView(deps) {
    const view = new PatchNotesView(deps);
    return Object.freeze({ open: () => view.open(), close: () => view.close(), render: () => view.render(), dispose: () => view.dispose() });
  }

  // modules/patch-notes-ui-classic.mjs
  var patchNotesView = createPatchNotesView({
    get document() {
      return document;
    },
    get console() {
      return console;
    },
    get AbortController() {
      return AbortController;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    _t: function patchNotesTranslate(...args) {
      return _t(...args);
    },
    fetch: function patchNotesFetch(...args) {
      return fetch(...args);
    }
  });
  window.GameModules.patchNotesView = patchNotesView;
  safeExposeGlobals({ openPatchNotes: patchNotesView.open, closePatchNotes: patchNotesView.close, renderPatchNotes: patchNotesView.render });
})();
