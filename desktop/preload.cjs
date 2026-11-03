'use strict';
// The only bridge between the game page and the PC shell (js/app-platform.js reads window.rigninDesktop).
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Set(), waiting = [];
// A login link can arrive before the game subscribes (cold start from the browser): keep it until someone listens.
ipcRenderer.on('rignin:open-url', (_event, url) => {
    if (listeners.size) listeners.forEach(listener => listener(url));
    else waiting.push(url);
});

contextBridge.exposeInMainWorld('rigninDesktop', Object.freeze({
    /** Opens an https address in the player's browser (social login). */
    openExternal: url => ipcRenderer.invoke('rignin:open-external', String(url)),
    /** Calls back with each rignin:// link Windows hands to the game. */
    onOpenUrl(listener) {
        listeners.add(listener);
        waiting.splice(0).forEach(url => listener(url));
    },
    /** Full screen (true) or a window: the shell switches and answers with the mode it is in. */
    setFullScreen: on => ipcRenderer.invoke('rignin:full-screen', !!on),
    isFullScreen: () => ipcRenderer.invoke('rignin:full-screen', null),
    /** Calls back with the mode after every switch (the setting, F11 or Alt+Enter). */
    onFullScreen(listener) {
        ipcRenderer.on('rignin:full-screen-changed', (_event, on) => listener(on));
    }
}));
