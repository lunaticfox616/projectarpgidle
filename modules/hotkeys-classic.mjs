// Remove this boundary/build entry when all classic consumers import the module.
import { createHotkeyBindings } from './hotkeys.mjs';
const hotkeyBindings = createHotkeyBindings(HOTKEY_ACTIONS, HOTKEY_ASSIGNABLE_CODE);
safeExposeGlobals({ hotkeyBindings });
