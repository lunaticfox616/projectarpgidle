/** Operations keep the account that opened their confirmation; refreshes of that account's token are allowed. */
export class CloudAccountRequest {
    constructor(owner, state, request) { this.owner = owner; this.state = state; this.send = request; }

    capture() { return { userId: this.owner.userId(), epoch: this.owner.current.sessionEpoch }; }

    current(context) {
        return this.state.active && this.owner.isCurrentAccount(context.userId, context.epoch);
    }

    assertCurrent(context) {
        if (!this.current(context)) throw new Error('로그인 계정이 변경되어 작업을 중단했습니다.');
    }

    async request(context, path, options) {
        this.assertCurrent(context);
        const result = await this.send(path, { ...options, expectedUserId: context.userId, expectedSessionEpoch: context.epoch });
        this.assertCurrent(context);
        return result;
    }
}
