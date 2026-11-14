import { createBackgroundMusic } from './browser/background-music.mjs';
import { installBackgroundMusicControls } from './browser/background-music-controls.mjs';

// Read the current game on each call; loading another save replaces the state object.
const volume = () => game.settings.bgmVolume ?? 70;
const music = createBackgroundMusic({ tracks: BGM_TRACKS, visual: BGM_BOSS_VISUAL_TRACKS, boss: BGM_BOSS_TRACKS, zone: BGM_ZONE_TRACKS }, {
    volume, audible: () => game.settings.bgm !== false && volume() > 0 && !document.hidden,
    enabled: () => game.settings.bgm !== false,
    startupOpen: () => isStartupOverlayOpen(), zone: () => getZone(game.currentZoneId),
    enemies: () => game.enemies || [], background: () => game.isBackgroundCalculation,
    context: () => playUiFeedbackSound.context()
}, {
    now: () => performance.now(), warn: (label, error) => console.warn(label, error),
    fetch: function requestBackgroundMusicFile(url) { return fetch(url); },
    schedule: (callback, ms) => setTimeout(callback, ms), cancel: id => clearTimeout(id)
});
function syncVolumeControl() {
    document.querySelectorAll('[data-bgm-volume]').forEach(slider => {
        slider.value = volume();
        slider.setAttribute('aria-valuetext', `${volume()}%`);
        const output = slider.parentElement.querySelector('output');
        if (output) output.value = `${volume()}%`;
    });
}
const dispose = installBackgroundMusicControls({
    document, window, repeat: (callback, ms) => setInterval(callback, ms), cancelRepeat: id => clearInterval(id)
}, music, {
    setVolume: value => { game.settings.bgmVolume = value; }, syncVolume: syncVolumeControl,
    saveVolume: () => { if (!startupOverlayActive) saveGame({ skipCloudSync: true }); }
});
const gameBgm = Object.freeze({
    sync: () => { syncVolumeControl(); playUiFeedbackSound.unlock(); music.tick(); }, syncControls: syncVolumeControl, dispose
});
safeExposeGlobals({ gameBgm });
