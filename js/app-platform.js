/** Native SDK boundary; no UI, game state, storage or domain dependencies. */
const appPlatform = (() => {
    const active = window.Capacitor?.isNativePlatform() === true;
    const app = active ? window.Capacitor.registerPlugin('App') : null;
    const browser = active ? window.Capacitor.registerPlugin('Browser') : null;

    async function openOAuth(url) {
        const target = new URL(url);
        if (target.protocol !== 'https:') throw new Error('안전하지 않은 인증 주소입니다.');
        await browser.open({ url: target.href });
    }

    return Object.freeze({ active, app, browser, openOAuth, redirectUrl: 'rignin://auth/callback' });
})();
safeExposeGlobals({ appPlatform });
