import { PC_SCALE_STEPS, nearestPcScaleStep, isCrispStep, recommendedScale, scaledMediaText } from './display-scale.mjs';
import { DisplayStyles } from './display-styles.mjs';
import { DisplayCadence } from './display-cadence.mjs';
import { normalizeUiSkin } from '../common/numbers.mjs';

class Display {
    constructor(environment, inputs) {
        this.env = environment; this.inputs = inputs;
        this.styles = new DisplayStyles(environment);
        this.cadence = new DisplayCadence(environment, inputs.getState);
        this.factor = 1; this.percent = 100; this.started = false; this.initialized = false; this.disposed = false;
        this.motionQuery = environment.window.matchMedia('(prefers-reduced-motion: reduce)');
        this.refresh = () => this.apply(this.percent);
        this.syncEffects = this.syncEffects.bind(this);
        this.init = this.init.bind(this);
        this.languageChange = () => this.syncScaleSelect(Math.max(1, this.env.window.devicePixelRatio || 1));
        this.selectionChange = event => this.select(event.target.value);
    }
    start({ waitForDomReady = false } = {}) {
        if (this.started || this.disposed) return;
        this.started = true;
        this.motionQuery.addEventListener('change', this.syncEffects);
        this.cadence.start();
        // Defer scripts run while readyState is interactive, before the final game bootstrap.
        // Preserve that ordering; late native installations may initialize immediately.
        if (!waitForDomReady && this.env.document.readyState === 'complete') this.init();
        else this.env.document.addEventListener('DOMContentLoaded', this.init, { once: true });
    }
    reducedEffects() {
        const choice = this.inputs.getState().settings.effectIntensity;
        if (choice === 'reduced') return true;
        if (choice === 'full') return false;
        return this.motionQuery.matches;
    }
    syncEffects() {
        if (this.disposed) return;
        const classes = this.env.document.body.classList;
        if (this.originalReduced === undefined) this.originalReduced = classes.contains('reduced-effects');
        this.lastReduced = this.reducedEffects();
        classes.toggle('reduced-effects', this.lastReduced);
    }
    mediaText(query) { return scaledMediaText(query, this.factor); }
    applyUiSkin(skin) {
        if (!this.disposed) this.env.document.body.dataset.uiSkin = normalizeUiSkin(skin);
    }
    applyHighContrast(enabled) {
        if (!this.disposed) this.env.document.body.classList.toggle('high-contrast', enabled === true);
    }
    applyLoadedSaveLook() {
        const settings = this.inputs.getState().settings;
        this.applyUiSkin(settings.uiSkin);
        this.applyHighContrast(settings.highContrast);
    }
    applyChatMessageSize(size) {
        const normalized = ['small', 'medium', 'large'].includes(size) ? size : 'medium';
        const body = this.env.document.body;
        if (!this.disposed && body?.dataset) body.dataset.chatMessageSize = normalized;
        return normalized;
    }
    matches(query) { return this.env.window.matchMedia(this.mediaText(query)).matches; }
    registerStyles() { if (!this.disposed) this.styles.register(this.factor); }
    watchResolution() {
        this.resolutionQuery?.removeEventListener('change', this.refresh);
        this.resolutionQuery = this.env.window.matchMedia(`(resolution: ${this.env.window.devicePixelRatio}dppx)`);
        this.resolutionQuery.addEventListener('change', this.refresh, { once: true });
    }
    apply(value) {
        if (this.disposed) return;
        const { window, document } = this.env;
        this.captureRoot();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const normalized = this.inputs.normalizeScale(value);
        this.percent = this.cadence.mobile ? normalized : nearestPcScaleStep(normalized, dpr);
        const deviceScale = this.cadence.mobile ? 1 : dpr / Math.floor(dpr + 1e-6);
        const next = this.percent / 100 / deviceScale;
        const changed = Math.abs(next - this.factor) > 0.00001;
        this.factor = next;
        if (changed || !this.sideBattleHudQuery) {
            this.sideBattleHudQuery = window.matchMedia(this.mediaText('(max-width: 1080px) and (orientation: landscape) and (max-height: 600px)'));
        }
        document.documentElement.style.setProperty('--scale-display-factor', String(this.factor));
        document.documentElement.style.setProperty('--device-ratio', String(dpr * this.factor));
        document.documentElement.style.zoom = String(this.factor);
        // Preserve the existing PC non-integer step behavior during structural migration.
        document.documentElement.classList.toggle('ui-smooth-text', !this.cadence.mobile && !isCrispStep(this.percent, dpr));
        this.lastSmooth = document.documentElement.classList.contains('ui-smooth-text');
        for (const [property, row] of this.rootStyles) row.next = document.documentElement.style.getPropertyValue(property);
        this.registerStyles();
        this.syncScaleSelect(dpr);
        this.watchResolution();
        if (changed) window.dispatchEvent(new window.Event('resize'));
    }
    select(value) {
        const settings = this.inputs.getState().settings;
        settings.uiScale = this.inputs.normalizeScale(value);
        settings.uiScaleChosen = true;
        this.apply(settings.uiScale);
        this.inputs.save({ skipCloudSync: false });
    }
    syncScaleSelect(dpr) {
        const { document } = this.env;
        const select = document.getElementById('sel-ui-scale');
        if (!select) return;
        if (!this.cadence.mobile) {
            const labels = PC_SCALE_STEPS.map(step => this.inputs.translate(isCrispStep(step, dpr) ? '{step}% (추천)' : '{step}% (글꼴 바꿈)', { step })).join('|');
            if (select.dataset.labels !== labels) {
                select.dataset.labels = labels;
                select.innerHTML = labels.split('|').map((label, index) => `<option value="${PC_SCALE_STEPS[index]}">${label}</option>`).join('');
                const hint = document.querySelector('label[for="sel-ui-scale"] + small');
                if (hint) hint.textContent = this.inputs.translate('메뉴와 글자의 크기. (추천)은 도트가 또렷한 배율이고, 글꼴 바꿈 배율은 글자를 일반 글꼴로 보입니다.');
            }
        }
        select.value = String(this.percent);
    }
    applySaved(settings) {
        if (this.disposed) return;
        this.syncEffects();
        const { window } = this.env;
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const chosen = settings.uiScaleChosen === true || this.inputs.normalizeScale(settings.uiScale) !== 100;
        if (!this.cadence.mobile && !chosen) settings.uiScale = recommendedScale((window.screen ? window.screen.width : 1920) * dpr, dpr);
        this.apply(settings.uiScale);
        settings.uiScale = this.percent;
    }
    init() {
        if (this.initialized || this.disposed) return;
        this.initialized = true;
        this.apply(100);
        this.syncEffects();
        const { window, document } = this.env;
        this.selectElement = document.getElementById('sel-ui-scale');
        this.selectElement.addEventListener('change', this.selectionChange);
        window.addEventListener('game:languagechange', this.languageChange);
        document.querySelectorAll('[style]').forEach(el => this.styles.adaptStyle(el.style));
        this.observer = new window.MutationObserver(() => this.registerStyles());
        this.observer.observe(document.head, { childList: true });
    }
    get battleRenderScale() {
        const ratio = (this.env.window.devicePixelRatio || 1) * this.factor, cap = this.cadence.mobile ? 1.5 : 2;
        return Math.max(1, ratio / Math.max(1, Math.ceil(ratio / cap - 1e-6)));
    }
    captureRoot() {
        if (this.rootStyles) return;
        const root = this.env.document.documentElement;
        this.originalSmooth = root.classList.contains('ui-smooth-text');
        this.rootStyles = new Map(['--scale-display-factor', '--device-ratio', 'zoom'].map(property =>
            [property, { value: root.style.getPropertyValue(property), priority: root.style.getPropertyPriority(property) }]));
    }
    restoreRoot() {
        const { document } = this.env, root = document.documentElement;
        if (this.rootStyles) {
            for (const [property, row] of this.rootStyles) {
                if (root.style.getPropertyValue(property) !== row.next) continue;
                if (row.value) root.style.setProperty(property, row.value, row.priority);
                else root.style.removeProperty(property);
            }
            this.rootStyles.clear();
        }
        if (root.classList.contains('ui-smooth-text') === this.lastSmooth) root.classList.toggle('ui-smooth-text', this.originalSmooth);
        if (document.body.classList.contains('reduced-effects') === this.lastReduced) document.body.classList.toggle('reduced-effects', this.originalReduced);
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.env.document.removeEventListener('DOMContentLoaded', this.init);
        this.motionQuery.removeEventListener('change', this.syncEffects);
        this.resolutionQuery?.removeEventListener('change', this.refresh);
        this.env.window.removeEventListener('game:languagechange', this.languageChange);
        this.selectElement?.removeEventListener('change', this.selectionChange);
        this.observer?.disconnect();
        this.cadence.dispose();
        this.styles.dispose();
        this.restoreRoot();
        this.sideBattleHudQuery = null;
    }
}

/** getState reads the current game after save replacement. The constructor installs nothing. */
export function createDisplay(environment, inputs) {
    const service = new Display(environment, inputs);
    return Object.freeze({
        start: options => service.start(options), init: () => service.init(), dispose: () => service.dispose(),
        apply: value => service.apply(value), applySaved: settings => service.applySaved(settings),
        applyUiSkin: skin => service.applyUiSkin(skin), applyHighContrast: enabled => service.applyHighContrast(enabled),
        applyLoadedSaveLook: () => service.applyLoadedSaveLook(), applyChatMessageSize: size => service.applyChatMessageSize(size),
        matches: query => service.matches(query), registerStyles: () => service.registerStyles(),
        recommendedScale, isCrispStep, pcScaleStep: (value, dpr) => nearestPcScaleStep(inputs.normalizeScale(value), dpr),
        reducedEffects: () => service.reducedEffects(), syncEffects: () => service.syncEffects(),
        get factor() { return service.factor; },
        get battleHudAtSide() { return !!service.sideBattleHudQuery && service.sideBattleHudQuery.matches; },
        get inputIdleMs() { return service.cadence.inputIdleMs; },
        get battleFrameMs() { return service.cadence.battleFrameMs; },
        get explorationFrameMs() { return service.cadence.explorationFrameMs; },
        get battleRenderScale() { return service.battleRenderScale; }
    });
}
