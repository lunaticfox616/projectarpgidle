/** Native SDK boundary. Capture the bridge once per application bootstrap. No game/save dependencies. */
export function createAppPlatform({ capacitor, desktop = null, parseUrl }) {
    const android = capacitor?.isNativePlatform() === true;
    const active = android || !!desktop;
    const app = android ? capacitor.registerPlugin('App') : null;
    const browser = android ? capacitor.registerPlugin('Browser') : null;
    async function openOAuth(url) {
        const target = parseUrl(url);
        if (target.protocol !== 'https:') throw new Error('안전하지 않은 인증 주소입니다.');
        if (desktop) await desktop.openExternal(target.href);
        else await browser.open({ url: target.href });
    }
    return Object.freeze({ active, android, desktop, app, browser, openOAuth, redirectUrl: 'rignin://auth/callback' });
}
