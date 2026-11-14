/** Compatibility boundary for remaining classic consumers. Retire with their global aliases.
 * A real export drains at most 20 startup calls; failed queued calls are reported separately. */
export class LegacyGlobalBridge {
    constructor(target, logger) {
        this.target = target;
        this.logger = logger;
        target.__runtimeFallbackQueues = target.__runtimeFallbackQueues || {};
        this.safeExposeGlobals = this.safeExposeGlobals.bind(this);
        this.exposeFileGlobals = this.exposeFileGlobals.bind(this);
    }

    installPublicApi(realm) {
        this.target.safeExposeGlobals = this.target.safeExposeGlobals || this.safeExposeGlobals;
        this.target.exposeFileGlobals = this.exposeFileGlobals;
        if (realm !== this.target) Object.assign(realm, {
            safeExposeGlobals: this.safeExposeGlobals, exposeFileGlobals: this.exposeFileGlobals
        });
    }

    flush(key) {
        const queue = (this.target.__runtimeFallbackQueues && this.target.__runtimeFallbackQueues[key]) || [];
        const handler = this.target[key];
        if (!queue.length || typeof handler !== 'function' || handler.__placeholderGlobal === true) return;
        this.target.__runtimeFallbackQueues[key] = [];
        queue.splice(0, 20).forEach(args => {
            try { this.target[key].apply(null, args || []); }
            catch (error) { this.logger.error(key + ' queued call failed:', error); }
        });
    }

    safeExposeGlobals(map) {
        Object.keys(map || {}).forEach(key => {
            const current = this.target[key], incoming = map[key];
            const canReplace = typeof current === 'undefined' || (current && current.__placeholderGlobal === true);
            if (!canReplace && current !== incoming) throw new Error('Duplicate global exposure: ' + key);
            this.target[key] = incoming;
            if (!(incoming && incoming.__placeholderGlobal === true)) this.flush(key);
        });
    }

    // Matches former hoisted function declarations: file exports can replace earlier placeholders.
    exposeFileGlobals(map) {
        Object.keys(map).forEach(key => { this.target[key] = map[key]; });
    }

    queue(name, args) {
        const queues = this.target.__runtimeFallbackQueues = this.target.__runtimeFallbackQueues || {};
        const queue = queues[name] = queues[name] || [];
        if (queue.length < 20) queue.push(Array.prototype.slice.call(args || []));
    }

    install(name, fallback, options = {}) {
        if (typeof this.target[name] !== 'undefined') return;
        const bridge = this;
        const handler = function (...args) {
            if (options.queue) bridge.queue(name, args);
            return fallback.apply(this, args);
        };
        handler.__placeholderGlobal = true;
        this.target[name] = handler;
    }
}
