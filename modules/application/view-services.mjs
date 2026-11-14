import { createGameShell } from '../browser/game-shell.mjs';
import { createScrollTop } from '../browser/scroll-top.mjs';
import { createPlainTip } from '../browser/plain-tip.mjs';

/** Page-only services share the application's lifetime, never the lifetime of a loaded save. */
export function createViewServices(deps) {
    const environment = { window: deps.window, document: deps.document };
    const services = [
        createGameShell(environment),
        createScrollTop({ ...environment, translate: deps.translate }),
        createPlainTip(environment, {
            translate: deps.translate, console: deps.console,
            show: deps.showInfoTooltipHtml, hide: deps.hideInfoTooltip
        })
    ];
    return Object.freeze({
        start() { for (const service of services) service.start(); },
        dispose() { for (let index = services.length - 1; index >= 0; index--) services[index].dispose(); }
    });
}
