'use strict';
// PC build of Rignin (docs/desktop-app-20261103.md): the built web game (dist) in one Electron window.
// The game is served from rignin-app://game/, so its origin, and with it the local save in localStorage, stays the same across versions.
// Social login opens the player's browser and comes back on rignin://auth/callback, the link the Android app already uses.
const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, shell } = require('electron');
const fs = require('node:fs'), path = require('node:path'), { pathToFileURL } = require('node:url');

const SCHEME = 'rignin-app', HOST = 'game', ORIGIN = `${SCHEME}://${HOST}`, LINK = 'rignin';
const webRoot = app.isPackaged ? path.join(process.resourcesPath, 'dist') : path.resolve(__dirname, process.env.RIGNIN_WEB || '../dist');

// The local save lives in this folder (%APPDATA%\Rignin): named here so renaming the exe or the package never loses it. The dev shell
// keeps its own folder so test saves stay out of the player's game.
app.setPath('userData', path.join(app.getPath('appData'), app.isPackaged ? 'Rignin' : 'Rignin-dev'));
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

let win = null;
const waitingLinks = [];
const linkIn = argv => argv.find(arg => typeof arg === 'string' && arg.startsWith(`${LINK}://`));

function showWindow() {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
}
/** Hands a rignin:// link to the game, or keeps it until the page has loaded. */
function deliver(url) {
    if (!url) return;
    if (win && !win.webContents.isLoading()) win.webContents.send('rignin:open-url', url);
    else waitingLinks.push(url);
}
const openOutside = url => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); };

/** The file a game address points at inside the web build, or null when it is outside it or missing. */
function fileFor(address) {
    const url = new URL(address);
    if (url.host !== HOST) return null;
    let rel;
    try { rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); } catch { return null; }
    const file = path.join(webRoot, rel);
    if (!file.startsWith(webRoot + path.sep)) return null;
    return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
}

// Full screen by default (2026-11-03 사용자). F11 or Alt+Enter switches, and the choice is kept in the profile folder for the next start.
const windowStateFile = () => path.join(app.getPath('userData'), 'window.json');
function startFullScreen() {
    if (!fs.existsSync(windowStateFile())) return true;
    try {
        return JSON.parse(fs.readFileSync(windowStateFile(), 'utf8')).fullScreen !== false;
    } catch (error) {
        console.error('[desktop] window.json unreadable, starting full screen', error);
        return true;
    }
}
function keepFullScreen(on) {
    try {
        fs.writeFileSync(windowStateFile(), JSON.stringify({ fullScreen: on }));
    } catch (error) {
        console.error('[desktop] window.json not written', error);
    }
}

function onKey(event, input) {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
        win.setFullScreen(!win.isFullScreen());
        event.preventDefault();
    } else if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
}

function createWindow() {
    win = new BrowserWindow({
        width: 1280, height: 720, minWidth: 960, minHeight: 540, show: false, backgroundColor: '#0d0b09', title: 'Rignin', autoHideMenuBar: true, fullscreen: startFullScreen(),
        webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
            autoplayPolicy: 'no-user-gesture-required' }
    });
    win.once('ready-to-show', () => {
        if (!win.isFullScreen()) win.maximize();
        win.show();
    });
    win.on('enter-full-screen', () => {
        keepFullScreen(true);
        win.webContents.send('rignin:full-screen-changed', true);
    });
    win.on('leave-full-screen', () => {
        keepFullScreen(false);
        win.maximize(); // a window that started full screen would otherwise drop to its small 1280x720 size
        win.webContents.send('rignin:full-screen-changed', false);
    });
    win.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith(`${ORIGIN}/`)) return;
        event.preventDefault();
        openOutside(url);
    });
    win.webContents.on('did-finish-load', () => waitingLinks.splice(0).forEach(url => win.webContents.send('rignin:open-url', url)));
    win.webContents.on('before-input-event', onKey);
    win.on('closed', () => { win = null; });
    win.loadURL(`${ORIGIN}/index.html`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
    // Windows starts a second copy with the login link; the lock sends it here instead.
    app.on('second-instance', (_event, argv) => { deliver(linkIn(argv)); showWindow(); });
    if (process.defaultApp) app.setAsDefaultProtocolClient(LINK, process.execPath, [path.resolve(process.argv[1])]);
    else app.setAsDefaultProtocolClient(LINK);

    const fromGame = event => {
        if (!event.senderFrame?.url.startsWith(`${ORIGIN}/`)) throw new Error('Not the game page');
    };
    ipcMain.handle('rignin:open-external', (event, url) => {
        fromGame(event);
        const target = new URL(url);
        if (target.protocol !== 'https:') throw new Error('Only https addresses open outside');
        return shell.openExternal(target.href);
    });
    // The settings' 화면 모드: true or false switches, null only asks. Answers with the mode asked for or the one it is in.
    ipcMain.handle('rignin:full-screen', (event, on) => {
        fromGame(event);
        if (typeof on === 'boolean') win?.setFullScreen(on);
        return typeof on === 'boolean' ? on : !!win?.isFullScreen();
    });
    app.on('window-all-closed', () => app.quit());
    app.whenReady().then(() => {
        if (!fs.existsSync(path.join(webRoot, 'index.html'))) {
            dialog.showErrorBox('Rignin', `게임 파일이 없습니다: ${webRoot}`);
            app.quit();
            return;
        }
        Menu.setApplicationMenu(null);
        protocol.handle(SCHEME, request => {
            const file = fileFor(request.url);
            return file ? net.fetch(pathToFileURL(file).href) : new Response('Not found', { status: 404 });
        });
        createWindow();
        deliver(linkIn(process.argv));
    });
}
