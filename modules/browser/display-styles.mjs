import { scaledMediaText } from './display-scale.mjs';

/** Rewrites legacy viewport units once. No frame-time traversal or attribute observer.
 * Dispose restores authored values only when this instance's last value still owns them. */
export class DisplayStyles {
    constructor({ window, document }) {
        this.window = window; this.document = document;
        this.mediaRules = new Map(); this.visitedSheets = new WeakSet(); this.styles = new Map();
    }
    adaptStyle(style) {
        for (const property of Array.from(style)) {
            const value = style.getPropertyValue(property);
            if (value.includes('--scale-display-factor')) continue;
            const next = value.replace(/(-?(?:\d*\.)?\d+)(d?vw|d?vh|vmin|vmax)\b/g,
                (_, number, unit) => `calc(${number}${unit} / var(--scale-display-factor, 1))`);
            if (next === value) continue;
            const priority = style.getPropertyPriority(property);
            if (!this.styles.has(style)) this.styles.set(style, new Map());
            this.styles.get(style).set(property, { value, priority, next });
            style.setProperty(property, next, priority);
        }
    }
    adaptRules(rules) {
        const pending = Array.from(rules);
        while (pending.length) {
            const rule = pending.pop();
            if (rule.type === this.window.CSSRule.MEDIA_RULE) this.mediaRules.set(rule, { original: rule.media.mediaText });
            if (rule.cssRules) pending.push(...rule.cssRules);
            const imported = rule.styleSheet;
            if (imported && !this.visitedSheets.has(imported) && new this.window.URL(imported.href).origin === this.window.origin) {
                this.visitedSheets.add(imported);
                pending.push(...imported.cssRules);
            }
            if (rule.style) this.adaptStyle(rule.style);
        }
    }
    register(factor) {
        for (const sheet of Array.from(this.document.styleSheets)) {
            if (this.visitedSheets.has(sheet)) continue;
            if (sheet.href && new this.window.URL(sheet.href).origin !== this.window.origin) continue;
            this.adaptRules(sheet.cssRules);
            this.visitedSheets.add(sheet);
        }
        for (const [rule, row] of this.mediaRules) {
            rule.media.mediaText = scaledMediaText(row.original, factor);
            row.next = rule.media.mediaText;
        }
    }
    dispose() {
        for (const [rule, row] of this.mediaRules) {
            if (rule.media.mediaText === row.next) rule.media.mediaText = row.original;
        }
        for (const [style, properties] of this.styles) {
            for (const [property, row] of properties) {
                if (style.getPropertyValue(property) === row.next && style.getPropertyPriority(property) === row.priority) {
                    style.setProperty(property, row.value, row.priority);
                }
            }
        }
        this.mediaRules.clear(); this.styles.clear(); this.visitedSheets = new WeakSet();
    }
}
