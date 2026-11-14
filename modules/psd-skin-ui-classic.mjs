import { createPsdAttentionView } from './ui/psd-attention-view.mjs';

window.GameModules.psdAttentionView = createPsdAttentionView({
    get document() { return typeof document === 'undefined' ? null : document; },
    get MutationObserver() { return typeof MutationObserver === 'undefined' ? null : MutationObserver; },
    get Element() { return Element; },
    get console() { return console; },
    get storage() { return localStorage; },
    get game() { return window.GameModules.state.game; }
});
