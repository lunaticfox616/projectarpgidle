/** Durable notice records. UI alone decides when queued data is displayed or acknowledged. */
import { noticeRecordNormalize, noticeRecordSync, noticeRecordEnqueue, noticeRecordTransition, noticeRecordArchivePending } from './tutorial-history-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createTutorialHistory(deps) {
    const env = { deps };
    env.LIMIT = 320;
    env.STATES = new Set(['pending', 'displayed', 'unread', 'read']);
    env.owner = null;
    env.revision = 0;
    return {
        normalize: (...args) => noticeRecordNormalize(env, ...args),
        sync: (...args) => noticeRecordSync(env, ...args),
        enqueue: (...args) => noticeRecordEnqueue(env, ...args),
        transition: (...args) => noticeRecordTransition(env, ...args),
        archivePending: (...args) => noticeRecordArchivePending(env, ...args),
        get revision() { return env.revision; },
        reset() { env.owner = null; }
    };
}
