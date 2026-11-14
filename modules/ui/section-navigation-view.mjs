import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns mobile section choices; desktop disclosures and unlocks remain with their existing owners. */
export function createSectionNavigationView(deps) {
    const runtime = { deps, active: true, listeners: [], sections: [], initialized: false };
    const init = () => initializeSectionNavigation(runtime);
    if (deps.document.readyState === 'loading') listenView(runtime, deps.document, 'DOMContentLoaded', init, { once: true });
    else init();
    return Object.freeze({ dispose: () => disposeSectionNavigation(runtime) });
}

function initializeSectionNavigation(runtime) {
    if (!runtime.active || runtime.initialized) return;
    runtime.initialized = true;
    const groups = [
        { rootId: 'map-tab-fishing', selector: '#fishing-gather, #fishing-collection, #fishing-workshop', labels: ['채집 전략', '도감', '제작'], navigationLabel: '낚시 작업' },
        { rootId: 'tab-character', selector: '#tab-character .character-stat-section', labels: ['공격', '방어와 회복', '기타'], navigationLabel: '능력치 분류' },
        { rootId: 'tab-season', selector: '#trait-season-section, #ui-loop10-section', labels: ['원환 패시브', '심화 성장'], navigationLabel: '루프 성장 분류' }
    ];
    for (const group of groups) runtime.sections.push(new SectionNavigation(runtime, group));
}

function disposeSectionNavigation(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    for (const section of runtime.sections) section.dispose();
    runtime.sections.length = 0;
}

class SectionNavigation {
    constructor(runtime, { rootId, selector, labels, navigationLabel }) {
        this.runtime = runtime;
        this.sections = Array.from(this.runtime.deps.document.querySelectorAll(selector));
        this.originals = this.sections.map(section => ({
            id: section.getAttribute('id'), role: section.getAttribute('role'),
            label: section.getAttribute('aria-labelledby'), selected: section.getAttribute('data-mobile-selected'),
            panel: section.classList.contains('mobile-section-panel')
        }));
        this.desktopOpen = this.sections.map(section => section.open);
        this.mobile = null;
        this.selected = 0;
        this.navigation = this.runtime.deps.document.createElement('div');
        this.navigation.className = 'mobile-section-navigation';
        this.navigation.setAttribute('role', 'tablist');
        this.navigation.setAttribute('aria-label', navigationLabel);
        this.navigation.dataset.i18nAttr = 'aria-label';
        this.sections.forEach((section, index) => this.addButton(section, index, rootId, labels[index]));
        this.runtime.deps.i18n.applyStatic(this.navigation);
        this.sections[0].before(this.navigation);
        listenView(runtime, this.navigation, 'keydown', event => this.navigate(event));
        this.observer = new this.runtime.deps.MutationObserver(() => {
            if (runtime.active) this.syncAvailability();
        });
        this.sections.forEach(section => this.observer.observe(section, { attributes: true, attributeFilter: ['style', 'hidden', 'data-content-locked'] }));
        listenView(runtime, this.runtime.deps.window, 'resize', () => this.syncViewport());
        this.syncViewport();
    }

    addButton(section, index, rootId, label) {
        if (!section.id) section.id = rootId + '-section-' + index;
        section.classList.add('mobile-section-panel');
        const button = this.runtime.deps.document.createElement('button');
        button.type = 'button';
        button.id = section.id + '-tab';
        button.textContent = label;
        button.dataset.i18n = '';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', section.id);
        listenView(this.runtime, button, 'click', () => this.select(index));
        this.navigation.appendChild(button);
    }

    select(index) {
        this.selected = index;
        this.sections.forEach((section, position) => {
            section.dataset.mobileSelected = String(position === index);
            if (this.mobile && position === index && section.tagName === 'DETAILS') section.open = true;
            const button = this.navigation.children[position];
            button.setAttribute('aria-selected', String(position === index));
            button.tabIndex = position === index ? 0 : -1;
        });
    }

    syncAvailability() {
        const available = this.sections.map(section => section.style.display !== 'none' && !section.hidden && !section.hasAttribute('data-content-locked'));
        this.navigation.hidden = !available.some(Boolean);
        available.forEach((open, index) => { this.navigation.children[index].hidden = !open; });
        if (!available[this.selected]) this.select(available.indexOf(true));
    }

    syncViewport() {
        const next = this.runtime.deps.uiDisplay.matches('(max-width: 1080px)');
        if (this.mobile === next) return;
        if (next) this.desktopOpen = this.sections.map(section => section.open);
        this.sections.forEach((section, index) => {
            if (section.tagName === 'DETAILS') section.open = next || this.desktopOpen[index];
            if (next) {
                section.setAttribute('role', 'tabpanel');
                section.setAttribute('aria-labelledby', section.id + '-tab');
            } else {
                section.removeAttribute('role');
                section.removeAttribute('aria-labelledby');
            }
        });
        this.mobile = next;
        this.select(this.selected);
        this.syncAvailability();
    }

    navigate(event) {
        const visible = Array.from(this.navigation.children).filter(button => !button.hidden);
        if (!visible.length) return;
        const current = visible.indexOf(this.navigation.children[this.selected]);
        const movement = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: visible.length - 1 - current };
        if (!(event.key in movement)) return;
        event.preventDefault();
        const next = visible[(current + movement[event.key] + visible.length) % visible.length];
        next.click(); next.focus();
    }

    dispose() {
        this.observer.disconnect();
        this.navigation.remove();
        this.sections.forEach((section, index) => {
            const original = this.originals[index];
            if (this.mobile && section.tagName === 'DETAILS') section.open = this.desktopOpen[index];
            section.classList.toggle('mobile-section-panel', original.panel);
            const attrs = { id: original.id, role: original.role, 'aria-labelledby': original.label, 'data-mobile-selected': original.selected };
            for (const [name, value] of Object.entries(attrs)) {
                if (value === null) section.removeAttribute(name);
                else section.setAttribute(name, value);
            }
        });
    }
}
