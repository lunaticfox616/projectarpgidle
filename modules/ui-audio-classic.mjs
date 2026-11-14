import { createFeedbackAudio } from './browser/feedback-audio.mjs';
import { installFeedbackAudioControls } from './browser/feedback-audio-controls.mjs';

// Dynamic state stays at the classic boundary: loading/replacing game must never leave a stale settings object.
const permitted = () => typeof game !== 'undefined' && game.settings?.uiSounds !== false &&
    game.settings?.soundVolume !== 0 && !document.hidden && !game.isBackgroundCalculation;
const audio = createFeedbackAudio({
    audioConstructor: () => window.AudioContext || window.webkitAudioContext,
    fetch: function requestFeedbackAudioFile(url) { return fetch(url); },
    performance: { now: () => performance.now() }, console
}, {
    permitted, hidden: () => document.hidden,
    masterLevel: () => .55 * (game.settings.soundVolume ?? 100) / 100,
    bgmWanted: () => typeof game !== 'undefined' && game.settings?.bgm !== false && game.settings?.bgmVolume !== 0 && !document.hidden,
    gestureSeen: () => !navigator.userActivation || navigator.userActivation.hasBeenActive,
    muffleCutoff: () => typeof OCEAN_ZONE_ID !== 'undefined' && game.currentZoneId === OCEAN_ZONE_ID
        ? Math.max(650, 1700 - Math.max(0, Number(game.ocean && game.ocean.depthM) || 0) * 1.1) : 20000
});

function syncVolumeControl() {
    const volume = game.settings.soundVolume ?? 100;
    document.querySelectorAll('[data-sound-volume]').forEach(slider => {
        slider.value = volume;
        slider.setAttribute('aria-valuetext', `${volume}%`);
        const output = slider.parentElement.querySelector('output');
        if (output) output.value = `${volume}%`;
    });
    const preview = document.getElementById('btn-sound-preview');
    if (preview) preview.disabled = !permitted();
}

function itemSoundKind(item) {
    if (['반지', '목걸이', '주얼', '코어'].includes(item.slot)) return 'inventoryGem';
    if (item.slot === '액막이') return 'inventoryWood';
    if (item.slot === '허리띠') return 'inventoryLeather';
    if (item.slot === '무기') {
        const category = getWeaponCategoryId(item);
        if (category === 'shortbow') return 'inventoryWood';
        if (category === 'orb' || category === 'flask') return 'inventoryGem';
        return 'inventoryMetal';
    }
    const types = getItemBaseDefenseTypes(item);
    if (types.has('armor')) return 'inventoryMetal';
    if (types.has('evasion')) return 'inventoryLeather';
    return 'inventoryCloth';
}
const playUiFeedbackSound = kind => audio.play(kind);
playUiFeedbackSound.inventory = (item, phase) => {
    if (!item || !audio.ready()) return;
    if (phase === 'equip' && bagItems.isJewel(item)) return;
    audio.playInventory(itemSoundKind(item), phase);
};
playUiFeedbackSound.syncSettings = () => { audio.syncSettings(); syncVolumeControl(); };
playUiFeedbackSound.context = audio.context;
playUiFeedbackSound.unlock = audio.unlock;
// The shared device is also used by BGM. This detaches controls only; bootstrap owns device shutdown.
playUiFeedbackSound.disposeControls = installFeedbackAudioControls({ document, window }, audio, {
    syncVolumeControl,
    setVolume: value => { game.settings.soundVolume = value; },
    saveVolume: () => { if (!startupOverlayActive) saveGame({ skipCloudSync: true }); }
});
// Stop BGM first: both players share this device. Closing it is a bootstrap lifecycle operation.
playUiFeedbackSound.dispose = () => { playUiFeedbackSound.disposeControls(); return audio.dispose(); };
const playLootDropSound = major => { if (major) playUiFeedbackSound('lootMajor'); };
safeExposeGlobals({ playUiFeedbackSound, playLootDropSound });
