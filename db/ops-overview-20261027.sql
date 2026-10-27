-- 운영 창 머리(할 일과 지표)와 표 권한 정리(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/feedback-and-admin-players-20261027.sql까지 실행한 프로젝트에 쓴다. 같은 내용이 db/operations-and-ghost.sql 끝 절과 db/social.sql(권한)에도 들어 있어,
-- 나중에 처음부터 다시 설치해도 같은 상태가 된다(npm run check:db가 함수의 일치를 본다).
-- 여러 번 실행해도 안전하다. 기존 데이터는 지우거나 고치지 않는다. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
-- 먼저 오류만 보고 싶으면 맨 끝의 commit;을 rollback;으로 바꿔 한 번 돌려 본다.
--
--   1. admin_get_ops_overview(): 운영 창 맨 위의 할 일 띠와 지표 카드, 지문별로 묶은 오류(확장 프로그램 잡음 제외). 관리자만.
--   2. chat_messages, player_profiles에 남아 있던 Supabase 기본 권한을 걷는다(anon ALL, authenticated의 TRUNCATE·REFERENCES·TRIGGER).
--      RLS 정책이 authenticated에게만 있어 지금도 anon은 줄을 못 보지만, TRUNCATE는 RLS를 거치지 않으므로 걷어 둔다.
--   3. 보안 검토(2026-10-27) 반영: admin_search_players는 닉네임과 이메일을 글자 그대로 찾고(LIKE 와일드카드와 끝 역슬래시 오류 없음),
--      submit_player_feedback은 처리한 글을 180일 뒤 지우고, admin_get_ops_dashboard는 경고에 사람 수를 넣고 오류 50건의 본문(최대 700KB)을 더 보내지 않는다.

begin;

do $$
begin
    if to_regprocedure('public.is_project_admin()') is null then
        raise exception 'db/operations-and-ghost.sql을 먼저 실행해야 합니다(is_project_admin이 없다)';
    end if;
    if to_regclass('public.player_feedback') is null then
        raise exception 'db/feedback-and-admin-players-20261027.sql을 먼저 실행해야 합니다(player_feedback이 없다)';
    end if;
end;
$$;

-- ============================================================================
-- 운영 창 머리: 할 일과 지표 (2026-10-27)
-- ============================================================================
-- 브라우저 확장 프로그램이 남기는 오류 보고(게임 오류가 아님). 묶음과 수에서 뺀다.
create or replace function public.ops_error_is_noise(p_message text)
returns boolean language sql immutable set search_path = public as $$
    select coalesce(p_message, '') ilike any (array['%chrome: call method%', '%chrome-extension://%', '%moz-extension://%', '%ResizeObserver loop%', '%Script error.%']);
$$;

-- 운영 창(js/cloud-tools-ui.js openOpsDashboard)이 맨 위에 보이는 숫자들: 할 일(새 문의, 24시간 신고, 검토 중 고스트, 보류, 금지, 24시간 오류),
-- 계정과 접속, 전투, 멀티, 서버. 원격 측정의 추정치가 아니라 각 표의 실제 줄 수를 세고, 7일 전 7일과 비교할 값도 준다.
-- 오류는 같은 지문끼리 묶어 30일 상위 20개.
create or replace function public.admin_get_ops_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    day_ago timestamptz := now() - interval '1 day';
    week_ago timestamptz := now() - interval '7 days';
    two_weeks_ago timestamptz := now() - interval '14 days';
    month_ago timestamptz := now() - interval '30 days';
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    return jsonb_build_object(
        'generatedAt', now(),
        'todo', jsonb_build_object(
            'feedbackNew', (select count(*) from public.player_feedback where status = 'new'),
            'reports24h', (select count(*) from public.chat_reports where created_at >= day_ago),
            'ghostsUnderReview', (select count(distinct user_id) from public.cheat_flags where kind like 'ghost_%' and last_at >= week_ago),
            'holds', (select count(*) from public.cheat_holds),
            'mutesActive', (select count(*) from public.chat_mutes where until_at > now()),
            'errors24h', (select count(*) from public.client_error_reports where created_at >= day_ago and not public.ops_error_is_noise(message))),
        'accounts', jsonb_build_object(
            'total', (select count(*) from auth.users),
            'new7d', (select count(*) from auth.users where created_at >= week_ago),
            'newPrev7d', (select count(*) from auth.users where created_at >= two_weeks_ago and created_at < week_ago),
            'signedIn7d', (select count(*) from auth.users where last_sign_in_at >= week_ago),
            'signedIn24h', (select count(*) from auth.users where last_sign_in_at >= day_ago),
            'profiles', (select count(*) from public.player_profiles),
            'seen24h', (select count(*) from public.player_profiles where last_seen >= day_ago),
            'seen7d', (select count(*) from public.player_profiles where last_seen >= week_ago)),
        'play', jsonb_build_object(
            'runs30d', (select count(*) from public.playtest_runs where created_at >= month_ago),
            'runs7d', (select count(*) from public.playtest_runs where created_at >= week_ago),
            'runsPrev7d', (select count(*) from public.playtest_runs where created_at >= two_weeks_ago and created_at < week_ago),
            'players7d', (select count(distinct user_id) from public.playtest_runs where created_at >= week_ago),
            'playersPrev7d', (select count(distinct user_id) from public.playtest_runs where created_at >= two_weeks_ago and created_at < week_ago),
            'clearRate30d', (select round(100.0 * count(*) filter (where result = 'clear') / nullif(count(*), 0), 1) from public.playtest_runs where created_at >= month_ago),
            'abandons30d', (select count(*) from public.playtest_runs where created_at >= month_ago and result = 'abandon'),
            'lastRunAt', (select max(created_at) from public.playtest_runs)),
        'social', jsonb_build_object(
            'chat7d', (select count(*) from public.chat_messages where created_at >= week_ago),
            'chatPrev7d', (select count(*) from public.chat_messages where created_at >= two_weeks_ago and created_at < week_ago),
            'ghostsActive', (select count(*) from public.ghost_profiles where active),
            'ghostMatches30d', (select count(*) from public.ghost_matches where created_at >= month_ago),
            'hallOpen', (select count(*) from public.hall_listings where status = 'open'),
            'hallPurchases30d', (select count(*) from public.hall_purchases where purchased_at >= month_ago),
            'feedback30d', (select count(*) from public.player_feedback where created_at >= month_ago)),
        'server', jsonb_build_object(
            'dbBytes', pg_database_size(current_database()),
            'dbLimitBytes', 524288000,
            'saves', (select count(*) from public.cloud_saves),
            'saveBytes', (select coalesce(sum(pg_column_size(save_data)), 0) from public.cloud_saves),
            'saveVersions', (select count(*) from public.cloud_save_versions),
            'errors30d', (select count(*) from public.client_error_reports where created_at >= month_ago and not public.ops_error_is_noise(message)),
            'lastErrorAt', (select max(created_at) from public.client_error_reports)),
        'errors', coalesce((select jsonb_agg(to_jsonb(e) order by e.hits desc) from (
            select left(fingerprint, 160) as fingerprint, left(max(message), 200) as message, count(*) as hits, count(distinct user_id) as users,
                   max(created_at) as last_at, max(app_version) as app_version
              from public.client_error_reports
             where created_at >= month_ago and not public.ops_error_is_noise(message)
             group by left(fingerprint, 160) order by hits desc limit 20) e), '[]'::jsonb)
    );
end;
$$;

revoke all on function public.ops_error_is_noise(text) from public, anon, authenticated;
revoke all on function public.admin_get_ops_overview() from public, anon;
grant execute on function public.admin_get_ops_overview() to authenticated;

-- ============================================================================
-- 보안 검토 반영 (db/operations-and-ghost.sql의 같은 함수를 새 본문으로)
-- ============================================================================
create or replace function public.admin_search_players(p_query text default '', p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    q text := nullif(btrim(coalesce(p_query, '')), '');
    lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    return coalesce((select jsonb_agg(to_jsonb(r) order by r.last_active desc nulls last) from (
        select u.id as user_id, u.email, u.created_at as joined_at, u.last_sign_in_at,
               p.nickname, p.last_seen,
               p.profile_data ->> 'level' as level, p.profile_data ->> 'loop' as loop, p.profile_data ->> 'power' as power,
               s.revision as save_revision, s.updated_at as save_updated_at, pg_column_size(s.save_data) as save_bytes,
               g.rating as ghost_rating, g.active as ghost_active,
               h.honor as hall_honor,
               (select count(*) from public.hall_listings l where l.curator_id = u.id and l.status = 'open') as hall_open,
               exists (select 1 from public.cheat_holds c where c.user_id = u.id) as held,
               (select m.until_at from public.chat_mutes m where m.user_id = u.id and m.until_at > now()) as muted_until,
               (select count(*) from public.cheat_flags f where f.user_id = u.id) as flag_count,
               (select count(*) from public.chat_reports cr where cr.target_user_id = u.id) as report_count,
               (select count(*) from public.player_feedback fb where fb.user_id = u.id) as feedback_count,
               greatest(p.last_seen, s.updated_at, u.last_sign_in_at) as last_active
          from auth.users u
          left join public.player_profiles p on p.user_id = u.id
          left join public.cloud_saves s on s.user_id = u.id
          left join public.ghost_profiles g on g.user_id = u.id
          left join public.hall_curator_profiles h on h.user_id = u.id
         where q is null or position(lower(q) in lower(coalesce(p.nickname, ''))) > 0 or position(lower(q) in lower(coalesce(u.email, ''))) > 0
            or starts_with(u.id::text, lower(q))
         order by greatest(p.last_seen, s.updated_at, u.last_sign_in_at) desc nulls last
         limit lim) r), '[]'::jsonb);
end;
$$;

create or replace function public.submit_player_feedback(p_kind text, p_body text, p_contact text default '', p_context jsonb default '{}'::jsonb, p_app_version text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
    body text := left(btrim(coalesce(p_body, '')), 2000);
    today_count integer;
    new_id bigint;
begin
    if uid is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_kind is null or p_kind not in ('bug', 'question', 'suggestion') then raise exception 'FEEDBACK_KIND_INVALID'; end if;
    if char_length(body) < 5 then raise exception 'FEEDBACK_TOO_SHORT'; end if;
    if pg_column_size(coalesce(p_context, '{}'::jsonb)) > 8192 then raise exception 'FEEDBACK_CONTEXT_TOO_LARGE'; end if;
    perform pg_advisory_xact_lock(hashtext('player_feedback:' || uid::text));   -- 같은 계정의 동시 요청이 하루 한도를 넘지 못하게
    select count(*) into today_count from public.player_feedback where user_id = uid and created_at >= now() - interval '1 day';
    if today_count >= 5 then raise exception 'FEEDBACK_DAILY_LIMIT'; end if;
    delete from public.player_feedback where status = 'done' and updated_at < now() - interval '180 days';   -- 처리한 글은 180일 뒤 지운다
    insert into public.player_feedback (user_id, kind, body, contact, context, app_version)
    values (uid, p_kind, body, left(btrim(coalesce(p_contact, '')), 120), coalesce(p_context, '{}'::jsonb), left(coalesce(p_app_version, ''), 40))
    returning id into new_id;
    return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.admin_get_ops_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    payload jsonb;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    with recent as (
        select * from public.playtest_runs where created_at >= now() - interval '30 days'
    ), zone_rows as (
        select zone_type, zone_id,
               coalesce(content_context ->> 'mode', content_context ->> 'wave', content_context ->> 'pressure',
                        content_context ->> 'branch', content_context ->> 'depth',
                        content_context ->> 'meteorTier', content_context ->> 'trialId',
                        content_context ->> 'phase', '') as content_stage,
               count(distinct user_id) as players, count(*) as runs,
               round(100.0 * count(*) filter (where result = 'clear') / nullif(count(*), 0), 1) as clear_rate_pct,
               round((percentile_cont(0.5) within group (order by duration_ms)
                   filter (where result = 'clear'))::numeric, 0) as median_clear_ms,
               round((percentile_cont(0.5) within group (order by dps))::numeric, 0) as median_dps,
               round((percentile_cont(0.5) within group (order by ehp_min))::numeric, 0) as median_ehp,
               round((percentile_cont(0.95) within group (order by frame_p95_ms)
                   filter (where frame_p95_ms is not null))::numeric, 1) as p95_frame_ms,
               sum(long_frames) as long_frames, max(peak_fx) as peak_fx
          from recent group by 1, 2, 3 order by runs desc limit 100
    ), build_rows as (
        select coalesce(ascend_class, 'unascended') as ascend_class,
               coalesce(active_skill, 'unknown') as active_skill,
               count(distinct user_id) as players, count(*) as runs,
               round(100.0 * count(*) filter (where result = 'clear') / nullif(count(*), 0), 1) as clear_rate_pct,
               round((percentile_cont(0.5) within group (order by dps))::numeric, 0) as median_dps,
               round((percentile_cont(0.5) within group (order by ehp_min))::numeric, 0) as median_ehp
          from recent group by coalesce(ascend_class, 'unascended'), coalesce(active_skill, 'unknown')
         order by runs desc limit 100
    ), alerts as (
        select zone_type, zone_id, runs, players,
               case
                   when runs >= 5 and p95_frame_ms >= 50 then 'critical'
                   when runs >= 5 and clear_rate_pct < 30 then 'critical'
                   when runs >= 5 and clear_rate_pct > 95 then 'warning'
                   when runs >= 5 and median_clear_ms > 300000 then 'warning'
                   else null
               end as severity,
               case
                   when runs >= 5 and p95_frame_ms >= 50 then '프레임 지연'
                   when runs >= 5 and clear_rate_pct < 30 then '과도한 난이도'
                   when runs >= 5 and clear_rate_pct > 95 then '낮은 난이도'
                   when runs >= 5 and median_clear_ms > 300000 then '긴 클리어 시간'
                   else null
               end as message
          from zone_rows
        union all
        select 'build', ascend_class || ' · ' || active_skill, runs, players,
               case
                   when runs >= 5 and clear_rate_pct < 30 then 'critical'
                   when runs >= 5 and clear_rate_pct > 95 then 'warning'
                   else null
               end,
               case
                   when runs >= 5 and clear_rate_pct < 30 then '빌드 성공률 낮음'
                   when runs >= 5 and clear_rate_pct > 95 then '빌드 성공률 높음'
                   else null
               end
          from build_rows
    )
    select jsonb_build_object(
        'generatedAt', now(),
        'overview', jsonb_build_object(
            'players', (select count(distinct user_id) from recent),
            'runs', (select count(*) from recent),
            'errors', (select count(*) from public.client_error_reports where created_at >= now() - interval '30 days')
        ),
        'zones', coalesce((select jsonb_agg(to_jsonb(z)) from zone_rows z), '[]'::jsonb),
        'builds', coalesce((select jsonb_agg(to_jsonb(b)) from build_rows b), '[]'::jsonb),
        'alerts', coalesce((select jsonb_agg(to_jsonb(a)) from alerts a where severity is not null), '[]'::jsonb)
    ) into payload;   -- 오류 50건의 stack과 context(최대 700KB)는 더 보내지 않는다: 운영 창은 admin_get_ops_overview의 묶음을 그린다(2026-10-27)
    return payload;
end;
$$;

-- ============================================================================
-- 표 권한 정리 (db/social.sql)
-- ============================================================================
-- 가장 오래된 두 표(chat_messages, player_profiles)는 Supabase 기본 권한(anon과 authenticated에 ALL)이 그대로였다(2026-10-27 점검).
-- RLS 정책이 authenticated에게만 있어 anon은 어차피 줄을 못 보지만, 쓰지 않는 권한은 걷는다. TRUNCATE는 RLS를 거치지 않는다.
revoke all on public.chat_messages, public.player_profiles from anon;
revoke truncate, references, trigger on public.chat_messages, public.player_profiles from authenticated;

commit;
