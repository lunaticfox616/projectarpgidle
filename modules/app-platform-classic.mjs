import { createAppPlatform } from './browser/app-platform.mjs';
// Remove when the bootstrap and platform consumers import the shared application instance.
const appPlatform = createAppPlatform({ capacitor: window.Capacitor, desktop: window.rigninDesktop || null, parseUrl: url => new URL(url) });
safeExposeGlobals({ appPlatform });
