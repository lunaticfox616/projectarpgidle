import { GuestSaveCheck } from './persistence/guest-save-check.mjs';

const instance=new GuestSaveCheck({
    get MAX_PLAYER_LEVEL() { return MAX_PLAYER_LEVEL; },
    get JOURNAL_DB() { return JOURNAL_DB; },
    get ACT_REWARD_DB() { return ACT_REWARD_DB; },
    get passiveRouting() { return passiveRouting; },
    get GUEST_SAVE_CHECK() { return GUEST_SAVE_CHECK; },
    get console() { return console; }
});
safeExposeGlobals({guestSaveCheck:Object.freeze({inspect:instance.inspect})});
