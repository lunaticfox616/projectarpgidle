// One localization instance owns its active pack, pending requests and source text cache.
// Browser effects are explicit inputs; game/save state is never captured.
class Localization {
    constructor(source, catalog, environment) {
        this.environment = environment;
        this.LANGUAGE_PACKS = [source, ...catalog];
        this.SOURCE = source;
        this.packs = new Map(this.LANGUAGE_PACKS.map(pack => [pack.code, pack]));
        this.pendingPacks = new Map();
        this.languageRequest = 0;
        this.missing = new Set();
        this.current = this.SOURCE;
        this.pluralRules = null;
        this.textSources = new WeakMap();
        this.NAME_FORMS = Object.freeze([
        [/^나이테 길잡이: (.+)$/, '나이테 길잡이: {name}'],
        [/^뿌리를 품은 (.+)$/, '뿌리를 품은 {name}'],
        [/^(.+)의 기억$/, '{name}의 기억']
    ]);
        this.cjkFamily = null;
    }

    normalizeLanguage(value) {
        return this.packs.has(value) ? value : this.SOURCE.code;
    }

    sourceText(key) {
        const at = key.lastIndexOf('|');
        return at > 0 ? key.slice(0, at) : key;
    }

    interpolate(text, params) {
        if (!params) return text;
        return text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
    }

    pluralText(key, entry, params) {
        const count = params && Number.isFinite(Number(params.count)) ? Number(params.count) : null;
        const category = count === null || !this.pluralRules ? 'other' : this.pluralRules.select(count);
        const text = entry[category] ?? entry.other;
        if (typeof text === 'string') return text;
        this.noteMissing(key);
        return this.sourceText(key);
    }

    noteMissing(key) {
        if (this.current === this.SOURCE || this.missing.has(key) || !/[가-힣]/.test(this.sourceText(key))) return;   // 한국어가 없는 글(플레이어 이름, 숫자)은 원문이 아니다
        this.missing.add(key);
        this.environment.console.warn(`[i18n] ${this.current.code} 번역 없음: ${key}`);
    }

    translate(key, params) {
        const text = String(key);
        const entry = this.current.strings[text] ?? this.current.strings[this.sourceText(text)];   // '원문|문맥'에 번역이 없으면 원문의 번역
        if (entry === undefined) {
            const numbered = this.translateNumbered(this.sourceText(text), params);
            if (numbered !== null) return numbered;
            this.noteMissing(text);
            return this.interpolate(this.sourceText(text), params);
        }
        return this.interpolate(typeof entry === 'string' ? entry : this.pluralText(text, entry, params), params);
    }

    translateNumbered(text, params) {
        if (!/\d/.test(text) || !/[가-힣]/.test(text)) return null;
        const numbers = [];
        const pattern = text.replace(/\d[\d,.]*/g, match => { numbers.push(match); return `{n${numbers.length === 1 ? '' : numbers.length}}`; });
        const entry = this.current.strings[pattern];
        if (typeof entry !== 'string') return null;
        const values = Object.fromEntries(numbers.map((value, index) => [`n${index === 0 ? '' : index + 1}`, value]));
        return this.interpolate(entry, params ? { ...values, ...params } : values);
    }

    translateTextNode(node) {
        if (!this.textSources.has(node)) this.textSources.set(node, node.nodeValue);
        const source = this.textSources.get(node);
        const key = source.trim();
        if (/[가-힣]/.test(key)) node.nodeValue = source.replace(key, this.translate(key));   // 숫자·괄호만 있는 마디는 원문이 아니다
    }

    translateElement(element) {
        element.childNodes.forEach(node => { if (node.nodeType === 3) this.translateTextNode(node); });
    }

    translateAttributes(element) {
        for (const name of element.dataset.i18nAttr.split(/\s+/).filter(Boolean)) {
            const store = `data-i18n-source-${name}`;
            if (!element.hasAttribute(store)) element.setAttribute(store, element.getAttribute(name) || '');
            element.setAttribute(name, this.translate(element.getAttribute(store)));
        }
    }

    applyStatic(root) {
        const scope = root || this.environment.document;
        if (scope.matches && scope.matches('[data-i18n]')) this.translateElement(scope);
        if (scope.matches && scope.matches('[data-i18n-attr]')) this.translateAttributes(scope);
        scope.querySelectorAll('[data-i18n]').forEach(element => this.translateElement(element));
        scope.querySelectorAll('[data-i18n-attr]').forEach(element => this.translateAttributes(element));
    }

    sourceOf(node) {
        return this.textSources.has(node) ? this.textSources.get(node) : node.nodeValue;
    }

    loadPack(code) {
        const entry = this.packs.get(code);
        if (code === this.SOURCE.code) return Promise.resolve(this.SOURCE);
        if (this.environment.window[entry.global]) return Promise.resolve(this.environment.window[entry.global]);
        if (this.pendingPacks.has(code)) return this.pendingPacks.get(code);
        const promise = new Promise((resolve, reject) => {
            const link = this.environment.document.querySelector(`link[rel="rignin-language"][data-language="${code}"]`);
            if (!link) { reject(new Error(`Missing language pack URL: ${code}`)); return; }
            const script = this.environment.document.createElement('script');
            script.src = link.href;
            script.onload = () => {
                const pack = this.environment.window[entry.global];
                if (pack?.code === code && pack.strings) resolve(pack);
                else reject(new Error(`Invalid language pack: ${code}`));
                script.remove();
            };
            script.onerror = () => { script.remove(); reject(new Error(`Language pack unavailable: ${code}`)); };
            this.environment.document.head.appendChild(script);
        });
        this.pendingPacks.set(code, promise);
        promise.catch(() => this.pendingPacks.delete(code));
        return promise;
    }

    applyLanguage(next) {
        const changed = next !== this.current;
        this.current = next;
        this.pluralRules = new Intl.PluralRules(this.current.locale);
        this.environment.document.documentElement.lang = this.current.code;
        this.cjkFamily = null;
        this.applyStatic(this.environment.document);
        if (changed && typeof this.environment.CustomEvent === 'function') this.environment.window.dispatchEvent(new this.environment.CustomEvent('game:languagechange', { detail: { language: this.current.code } }));
    }

    setLanguage(code, canApply = () => true) {
        code = this.normalizeLanguage(code);
        const request = ++this.languageRequest;
        const loaded = code === this.SOURCE.code ? this.SOURCE : this.environment.window[this.packs.get(code).global];
        if (loaded) {
            if (!canApply()) return Promise.resolve(false);
            this.applyLanguage(loaded);
            return Promise.resolve(true);
        }
        let timer;
        const deadline = new Promise((_, reject) => { timer = this.environment.setTimeout(() => reject(new Error(`Language pack timeout: ${code}`)), 15000); });
        // Keep an in-flight script on timeout: retrying must not execute the same classic const declaration twice.
        return Promise.race([this.loadPack(code), deadline]).then(pack => {
            if (request !== this.languageRequest || !canApply()) return false;
            this.applyLanguage(pack);
            return true;
        }).finally(() => this.environment.clearTimeout(timer));
    }

    peelName(name) {
        const lead = /^(\p{Extended_Pictographic}\uFE0F?\s+)(.+)$/u.exec(name);
        if (lead) return { inner: lead[2], wrap: text => lead[1] + text };
        const variant = /^(.+) \(([^()]+)\)$/.exec(name);
        if (variant) return { inner: variant[1], wrap: text => `${text} (${this.translate(variant[2])})` };
        const form = this.NAME_FORMS.find(([pattern]) => pattern.test(name));
        return form ? { inner: form[0].exec(name)[1], wrap: text => this.translate(form[1], { name: text }) } : null;
    }

    enemyName(name) {
        if (typeof name !== 'string') return this.translate(name);
        const wraps = [];   // 바깥 말부터: 안쪽 이름을 옮긴 뒤 안에서 밖으로 다시 붙인다
        let inner = name;
        for (let depth = 0; depth < 5 && !Object.hasOwn(this.current.strings, inner); depth++) {
            const peeled = this.peelName(inner);
            if (!peeled) break;
            wraps.push(peeled.wrap);
            inner = peeled.inner;
        }
        return wraps.reduceRight((shown, wrap) => wrap(shown), this.translate(inner));
    }

    fontFamily(primary) {
        if (this.cjkFamily === null) this.cjkFamily = this.readCjkFamily();
        return `${primary}, ${this.cjkFamily}`;
    }

    readCjkFamily() {
        const value = typeof this.environment.getComputedStyle === 'function' ? this.environment.getComputedStyle(this.environment.document.documentElement).getPropertyValue('--font-cjk').trim() : '';
        return value || "'Malgun Gothic', sans-serif";
    }

    urlLanguage() {
        const match = /[?&]lang=([A-Za-z-]+)/.exec(this.environment.location.search || '');
        return match && this.packs.has(match[1]) ? match[1] : null;
    }

    applySaved(settings) {
        settings.language = this.normalizeLanguage(settings.language);
        return this.setLanguage(this.urlLanguage() || settings.language);
    }
}

export function createLocalization(source, catalog, environment) {
    const core = new Localization(source, catalog, environment);
    return Object.freeze({
        get language() { return core.current.code; },
        get locale() { return core.current.locale; },
        get languages() { return core.LANGUAGE_PACKS.map(pack => ({ code: pack.code, name: pack.name })); },
        normalizeLanguage: core.normalizeLanguage.bind(core), t: core.translate.bind(core),
        setLanguage: core.setLanguage.bind(core), applySaved: core.applySaved.bind(core),
        applyStatic: core.applyStatic.bind(core), sourceOf: core.sourceOf.bind(core),
        fontFamily: core.fontFamily.bind(core), enemyName: core.enemyName.bind(core),
        missingKeys: () => [...core.missing]
    });
}
