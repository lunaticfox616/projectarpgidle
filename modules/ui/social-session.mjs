// session: explicit account state and dependency ports; no ambient game/global state.
export class SocialSession {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["socialLoggedInUserId","socialCloudReady","socialSessionContext","isSocialSessionCurrent","releaseSocialRequest"].forEach(name => { this[name] = this[name].bind(this); });
    }

    socialLoggedInUserId() {
        return (typeof this.deps.cloudState !== 'undefined' && this.deps.cloudState && this.deps.cloudState.user && this.deps.cloudState.user.id) ? this.deps.cloudState.user.id : null;
    }

    socialCloudReady() {
        return !this.state.disposed && !!this.socialLoggedInUserId() && typeof this.deps.cloudJsonRequest === 'function';
    }

    socialSessionContext() {
        return { userId: this.socialLoggedInUserId(), epoch: typeof this.deps.cloudState !== 'undefined' ? this.deps.cloudState.sessionEpoch || 0 : 0 };
    }

    isSocialSessionCurrent(context) {
        let current = this.socialSessionContext();
        return !this.state.disposed && !!context.userId && context.userId === current.userId && context.epoch === current.epoch;
    }

    releaseSocialRequest(key, context) {
        if (this.state.current[key] === context) this.state.current[key] = false;
    }
}
