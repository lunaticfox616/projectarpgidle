// Mobile section choices are presentation state. Desktop disclosures and content gates retain ownership.
(function () {
    'use strict';
    class SectionNavigation {
        constructor(rootId, selector, labels, navigationLabel) {
            this.sections = Array.from(document.querySelectorAll(selector));
            this.desktopOpen = this.sections.map(section => section.open);
            this.mobile = null;
            this.selected = 0;
            this.navigation = document.createElement('div');
            this.navigation.className = 'mobile-section-navigation';
            this.navigation.setAttribute('role', 'tablist');
            this.navigation.setAttribute('aria-label', navigationLabel);
            this.sections.forEach((section, index) => this.addButton(section, index, rootId, labels[index]));
            this.sections[0].before(this.navigation);
            this.navigation.addEventListener('keydown', event => this.navigate(event));
            const observer = new MutationObserver(() => this.syncAvailability());
            this.sections.forEach(section => observer.observe(section, { attributes: true, attributeFilter: ['style', 'hidden', 'data-content-locked'] }));
            window.addEventListener('resize', () => this.syncViewport());
            this.syncViewport();
        }

        addButton(section, index, rootId, label) {
            if (!section.id) section.id = rootId + '-section-' + index;
            section.classList.add('mobile-section-panel');
            const button = document.createElement('button');
            button.type = 'button';
            button.id = section.id + '-tab';
            button.textContent = label;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-controls', section.id);
            button.addEventListener('click', () => this.select(index));
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
            const next = uiDisplay.matches('(max-width: 1080px)');
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
            const current = visible.indexOf(this.navigation.children[this.selected]);
            const movement = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: visible.length - 1 - current };
            if (!(event.key in movement)) return;
            event.preventDefault();
            const next = visible[(current + movement[event.key] + visible.length) % visible.length];
            next.click(); next.focus();
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        new SectionNavigation('tab-character', '#tab-character .character-stat-section', ['공격', '방어 · 회복', '기본 · 특수'], '능력치 분류');
        new SectionNavigation('tab-season', '#trait-season-section, #ui-loop10-section', ['원환 패시브', '심화 성장'], '루프 성장 분류');
        new SectionNavigation('tab-jewel', '#ui-jewel-library, #ui-jewel-craft-disclosure, #ui-jewel-salvage-disclosure', ['장착 · 보관', '제작 · 증폭', '해체 관리'], '주얼 작업');
    }, { once: true });
}());
