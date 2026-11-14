import { telemetryGetPlaytestUserId, telemetryGetPlaytestUtcDay } from './telemetry-platform.mjs';

export function telemetryConsumePlaytestDailyBudget(env, name, limit) {
    let userId = telemetryGetPlaytestUserId(env);
    if (!userId) return false;
    let day = telemetryGetPlaytestUtcDay(env);
    let key = `projectidle_${name}_budget`;
    try {
        let value = JSON.parse(env.deps.localStorage.getItem(key) || 'null');
        let count = value && value.day === day && value.userId === userId ? Math.max(0, Number(value.count) || 0) : 0;
        if (count >= limit) return false;
        env.deps.localStorage.setItem(key, JSON.stringify({ day, userId, count: count + 1 }));
        return true;
    } catch (error) {
        env.deps.console.warn('playtest budget storage unavailable:', error);
        return false;
    }
}

export function telemetryDisableMissingPlaytestTable(env, table, error) {
    let message = String((error && error.message) || error || '');
    if (/schema cache|does not exist|could not find/i.test(message)) env.playtestRuntime.disabledTables.add(table);
}

export function telemetryIsPlaytestTableUnavailable(env, table) {
    if (env.playtestRuntime.disabledTables.has(table)) return true;
    let limitedDay = env.playtestRuntime.dailyLimitedTables.get(table);
    if (!limitedDay) return false;
    if (limitedDay === telemetryGetPlaytestUtcDay(env)) return true;
    env.playtestRuntime.dailyLimitedTables.delete(table);
    return false;
}

export function telemetryRememberPlaytestDailyLimit(env, table, error) {
    let message = String((error && error.message) || error || '');
    if (!/PLAYTEST_DAILY_LIMIT/i.test(message)) return false;
    env.playtestRuntime.dailyLimitedTables.set(table, telemetryGetPlaytestUtcDay(env));
    return true;
}

export async function telemetryPostPlaytestRow(env, table, body) {
    if (!telemetryGetPlaytestUserId(env) || telemetryIsPlaytestTableUnavailable(env, table)) return false;
    if (typeof env.deps.cloudJsonRequest !== 'function') return false;
    try {
        await env.deps.cloudJsonRequest(`/rest/v1/${table}`, {
            method: 'POST',
            headers: { Prefer: 'return=minimal', 'Content-Type': 'application/json' },
            body
        });
        return true;
    } catch (error) {
        telemetryDisableMissingPlaytestTable(env, table, error);
        let dailyLimited = telemetryRememberPlaytestDailyLimit(env, table, error);
        if (!dailyLimited) env.deps.console.warn(`${table} write failed:`, error);
        return false;
    }
}
