// Ephemeral account-scoped state; no save schema or authentication token ownership.
const INITIAL_SOCIAL_STATE = {
            nickname: '',
            nicknameUserId: null,
            sessionEpoch: null,
            identityCheckedUserId: null,
            identityCheckPromise: null,
            chatPollTimer: null,
            onlinePollTimer: null,
            heartbeatTimer: null,
            bgNotificationTimer: null,
            chatLoading: false,
            chatSending: false,
            chatSendRequest: null,
            chatInitialized: false,
            chatMessages: [],
            lastChatFullSyncAt: 0,
            lastChatPollAt: 0,
            lastChatNoticeAt: 0,
            chatChannel: null,
            chatChannelUserId: null,
            chatChannelSession: null,
            chatRealtime: null,
            chatLive: false,
            chatLiveMisses: 0,
            chatLiveSince: 0,
            chatLiveHiddenTimer: null,
            onlineLoading: false,
            lastOnlineLoadAt: 0,
            lastOnlineLoadWasList: false,
            onlineChatTimer: null,
            lastChatRenderKey: '',
            lastOnlineRenderKey: '',
            profileUploadPromise: null,
            profileUploadUserId: null,
            profileSyncTimer: null,
            profileBootSyncUserId: null,
            /** The last profile write this session: account, nickname and snapshot without its clock (an identical one is not sent again),
             * and the account and nickname whose row it wrote (a chat line needs that row, not a fresh 27 KB profile before every line). */
            profileSentKey: '',
            profileRowFor: '',
            onlineSupported: true,
            pendingChatItems: [],
            sendTimestamps: [],
            lastSentBody: '',
            scrollChatToLatestOnNextRender: true,
            lastNotifiedChatId: null,
            lastChatToastAt: 0,
            // 채팅 칸을 그린 계정(restoreChatDraft): 칸을 다시 그릴 때 쓰던 글은 같은 계정일 때만 되살린다.
            chatDraftUserId: null,
            chatTips: {},
            profileTips: {},
            pickTips: {},
            currentProfile: null,
            currentProfileUserId: null,
            profileRequest: null,
            profileTab: 'equipment',
            bgNotiLoading: false
};

export class SocialSessionState {
    constructor() {
        this.disposed = false;
        this.current = JSON.parse(JSON.stringify(INITIAL_SOCIAL_STATE));
    }
}
