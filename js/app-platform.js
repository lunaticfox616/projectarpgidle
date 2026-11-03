/** Native SDK boundary; no UI, game state, storage or domain dependencies. */
const appPlatform = (() => {
    const android = window.Capacitor?.isNativePlatform() === true;
    // The PC build's preload bridge (desktop/preload.cjs): login opens the system browser and comes back on the same rignin:// link.
    const desktop = window.rigninDesktop || null;
    const active = android || !!desktop;
    const app = android ? window.Capacitor.registerPlugin('App') : null;
    const browser = android ? window.Capacitor.registerPlugin('Browser') : null;

    async function openOAuth(url) {
        const target = new URL(url);
        if (target.protocol !== 'https:') throw new Error('안전하지 않은 인증 주소입니다.');
        if (desktop) await desktop.openExternal(target.href);
        else await browser.open({ url: target.href });
    }

    return Object.freeze({ active, android, desktop, app, browser, openOAuth, redirectUrl: 'rignin://auth/callback' });
})();
safeExposeGlobals({ appPlatform });
