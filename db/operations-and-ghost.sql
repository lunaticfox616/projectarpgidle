-- Project ARPG Idle: 운영 도구, 저장 이력, 고스트 대결
-- db/cloud-and-playtest.sql 및 db/social.sql 실행 후 Supabase SQL Editor에서 실행한다.
-- Supabase의 "destructive operations" 경고는 아래 제약조건 교체, 권한 REVOKE 및
-- 함수 본문 안의 오래된 저장 이력 정리 DELETE 때문에 표시된다. 이 스크립트를 실행하는
-- 즉시 플레이어 저장·프로필·채팅·전투 기록 테이블이나 그 데이터를 삭제하지 않는다.
-- 운영 화면을 쓸 계정은 Dashboard > Authentication > Users의 app_metadata에
-- { "project_admin": true }를 설정한다. service_role 키는 클라이언트에 넣지 않는다.

begin;

alter table public.playtest_runs
    add column if not exists content_context jsonb not null default '{}'::jsonb,
    add column if not exists skill_element text;

alter table public.playtest_runs drop constraint if exists playtest_runs_result_check;
alter table public.playtest_runs add constraint playtest_runs_result_check
    check (result in ('clear', 'death', 'abandon'));

create table if not exists public.cloud_save_versions (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    revision bigint not null,
    save_data jsonb not null,
    created_at timestamptz not null default now(),
    unique (user_id, revision)
);

create index if not exists cloud_save_versions_user_revision_idx
    on public.cloud_save_versions(user_id, revision desc);
alter table public.cloud_save_versions enable row level security;
revoke all on public.cloud_save_versions from anon, authenticated;

create or replace function public.commit_cloud_save(expected_revision bigint, next_save_data jsonb)
returns table(committed boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    stored_revision bigint;
    stored_data jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if next_save_data is null or jsonb_typeof(next_save_data) <> 'object' then
        raise exception 'INVALID_SAVE_DATA';
    end if;

    select revision, save_data into stored_revision, stored_data
      from public.cloud_saves where user_id = account_id for update;

    if not found then
        if greatest(expected_revision, 0) <> 0 then
            return query select false, 0::bigint, null::timestamptz;
            return;
        end if;
        insert into public.cloud_saves(user_id, save_data, revision, updated_at)
        values (account_id, next_save_data, 1, now());
        return query select true, 1::bigint, now();
        return;
    end if;

    if stored_revision <> greatest(expected_revision, 0) then
        return query select false, stored_revision,
            (select updated_at from public.cloud_saves where user_id = account_id);
        return;
    end if;

    insert into public.cloud_save_versions(user_id, revision, save_data, created_at)
    select account_id, stored_revision, stored_data, updated_at
      from public.cloud_saves where user_id = account_id
    on conflict (user_id, revision) do nothing;

    update public.cloud_saves
       set save_data = next_save_data, revision = stored_revision + 1, updated_at = now()
     where user_id = account_id;

    delete from public.cloud_save_versions history
     where history.user_id = account_id
       and history.id not in (
           select keep.id from public.cloud_save_versions keep
            where keep.user_id = account_id order by keep.revision desc limit 5
       );

    return query select true, stored_revision + 1, now();
end;
$$;

create or replace function public.list_cloud_save_versions()
returns table(revision bigint, saved_at timestamptz, is_current boolean, loop_number integer)
language sql
security definer
set search_path = public
as $$
    select row_data.revision, row_data.saved_at, row_data.is_current,
           case when jsonb_typeof(row_data.save_data -> 'season') = 'number'
                then greatest(1, (row_data.save_data ->> 'season')::integer) else 1 end
      from (
          select current_save.revision, current_save.updated_at as saved_at, true as is_current,
                 current_save.save_data
            from public.cloud_saves current_save where current_save.user_id = auth.uid()
          union all
          select history.revision, history.created_at, false, history.save_data
            from public.cloud_save_versions history where history.user_id = auth.uid()
      ) row_data
     order by row_data.revision desc
     limit 6;
$$;

create or replace function public.restore_cloud_save_version(target_revision bigint, expected_revision bigint)
returns table(restored boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    stored_revision bigint;
    stored_data jsonb;
    target_data jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select revision, save_data into stored_revision, stored_data
      from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if stored_revision <> greatest(expected_revision, 0) then
        return query select false, stored_revision,
            (select updated_at from public.cloud_saves where user_id = account_id);
        return;
    end if;
    select save_data into target_data from public.cloud_save_versions
     where user_id = account_id and revision = target_revision;
    if target_data is null then raise exception 'SAVE_VERSION_NOT_FOUND'; end if;

    insert into public.cloud_save_versions(user_id, revision, save_data, created_at)
    select account_id, stored_revision, stored_data, updated_at
      from public.cloud_saves where user_id = account_id
    on conflict (user_id, revision) do nothing;
    update public.cloud_saves
       set save_data = target_data, revision = stored_revision + 1, updated_at = now()
     where user_id = account_id;
    delete from public.cloud_save_versions history
     where history.user_id = account_id
       and history.id not in (
           select keep.id from public.cloud_save_versions keep
            where keep.user_id = account_id order by keep.revision desc limit 5
       );
    return query select true, stored_revision + 1, now();
end;
$$;

revoke all on function public.commit_cloud_save(bigint, jsonb) from public, anon;
revoke all on function public.list_cloud_save_versions() from public, anon;
revoke all on function public.restore_cloud_save_version(bigint, bigint) from public, anon;
grant execute on function public.commit_cloud_save(bigint, jsonb) to authenticated;
grant execute on function public.list_cloud_save_versions() to authenticated;
grant execute on function public.restore_cloud_save_version(bigint, bigint) to authenticated;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select auth.uid() is not null and (
        auth.jwt() -> 'app_metadata' ->> 'project_admin' = 'true'
        or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    );
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
        select zone_type, zone_id, runs,
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
        select 'build', ascend_class || ' · ' || active_skill, runs,
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
        'alerts', coalesce((select jsonb_agg(to_jsonb(a)) from alerts a where severity is not null), '[]'::jsonb),
        'errors', coalesce((select jsonb_agg(to_jsonb(e)) from (
            select created_at, message, stack, context, app_version
              from public.client_error_reports order by created_at desc limit 50
        ) e), '[]'::jsonb)
    ) into payload;
    return payload;
end;
$$;

revoke all on function public.is_project_admin() from public, anon;
revoke all on function public.admin_get_ops_dashboard() from public, anon;
grant execute on function public.is_project_admin() to authenticated;
grant execute on function public.admin_get_ops_dashboard() to authenticated;

create table if not exists public.ghost_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    nickname text not null,
    ascend_class text,
    active_skill text not null,
    skill_element text not null check (skill_element in ('phys', 'fire', 'cold', 'light', 'chaos')),
    dps bigint not null check (dps > 0),
    ehp_by_element jsonb not null,
    rating integer not null default 1000 check (rating between 100 and 4000),
    wins integer not null default 0,
    losses integer not null default 0,
    draws integer not null default 0,
    matches integer not null default 0,
    combat_version text not null,
    active boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.ghost_matches (
    id bigint generated always as identity primary key,
    challenger_id uuid not null references auth.users(id) on delete cascade,
    defender_id uuid not null references auth.users(id) on delete cascade,
    result text not null check (result in ('win', 'loss', 'draw')),
    challenger_rating_before integer not null,
    challenger_rating_after integer not null,
    defender_rating_before integer not null,
    defender_rating_after integer not null,
    seed text not null,
    combat_version text not null,
    ranked boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.ghost_matches add column if not exists ranked boolean not null default true;

create index if not exists ghost_matches_challenger_created_idx
    on public.ghost_matches(challenger_id, created_at desc);
create index if not exists ghost_matches_defender_created_idx
    on public.ghost_matches(defender_id, created_at desc);
create index if not exists ghost_profiles_rating_idx
    on public.ghost_profiles(combat_version, rating desc);
alter table public.ghost_profiles enable row level security;
alter table public.ghost_matches enable row level security;
revoke all on public.ghost_profiles, public.ghost_matches from anon, authenticated;

create or replace function public.ghost_ehp_for_element(values_json jsonb, element_key text)
returns numeric
language sql
immutable
as $$
    select greatest(1, least(9000000000000000::numeric,
        coalesce(case when jsonb_typeof(values_json -> element_key) = 'number'
                      then (values_json ->> element_key)::numeric end,
                 case when jsonb_typeof(values_json -> 'phys') = 'number'
                      then (values_json ->> 'phys')::numeric end, 1)));
$$;

create or replace function public.register_my_ghost(p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    profile_name text;
    latest_run public.playtest_runs%rowtype;
    sample_count integer;
    median_dps numeric;
    element_ehp jsonb;
    registered public.ghost_profiles%rowtype;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_combat_version is null or char_length(p_combat_version) not between 1 and 80 then
        raise exception 'INVALID_COMBAT_VERSION';
    end if;
    select nickname into profile_name from public.player_profiles where user_id = account_id;
    if profile_name is null then raise exception 'NICKNAME_REQUIRED'; end if;
    select * into latest_run from public.playtest_runs
     where user_id = account_id and app_version = p_combat_version
       and dps > 0 and ehp_min > 0 and active_skill is not null
       and skill_element in ('phys', 'fire', 'cold', 'light', 'chaos')
       and created_at >= now() - interval '24 hours'
     order by created_at desc limit 1;
    if not found then raise exception 'GHOST_NEEDS_BATTLE_DATA'; end if;

    select count(*), percentile_cont(0.5) within group (order by dps),
           jsonb_build_object(
               'phys', percentile_cont(0.5) within group (order by (ehp_by_element ->> 'phys')::numeric),
               'fire', percentile_cont(0.5) within group (order by (ehp_by_element ->> 'fire')::numeric),
               'cold', percentile_cont(0.5) within group (order by (ehp_by_element ->> 'cold')::numeric),
               'light', percentile_cont(0.5) within group (order by (ehp_by_element ->> 'light')::numeric),
               'chaos', percentile_cont(0.5) within group (order by (ehp_by_element ->> 'chaos')::numeric)
           )
      into sample_count, median_dps, element_ehp
      from (select * from public.playtest_runs
             where user_id = account_id and app_version = p_combat_version
               and ascend_class is not distinct from latest_run.ascend_class
               and active_skill = latest_run.active_skill and dps > 0 and ehp_min > 0
               and created_at >= now() - interval '24 hours'
             order by created_at desc limit 10) samples;
    if sample_count < 3 then raise exception 'GHOST_NEEDS_3_RUNS'; end if;

    insert into public.ghost_profiles(
        user_id, nickname, ascend_class, active_skill, skill_element,
        dps, ehp_by_element, combat_version, updated_at
    ) values (
        account_id, profile_name, latest_run.ascend_class, latest_run.active_skill, latest_run.skill_element,
        least(9000000000000000::numeric, greatest(1, median_dps))::bigint,
        element_ehp, p_combat_version, now()
    )
    on conflict (user_id) do update set
        nickname = excluded.nickname, ascend_class = excluded.ascend_class,
        active_skill = excluded.active_skill, skill_element = excluded.skill_element,
        dps = excluded.dps, ehp_by_element = excluded.ehp_by_element,
        combat_version = excluded.combat_version, active = true, updated_at = now()
    returning * into registered;
    return to_jsonb(registered) - 'user_id';
end;
$$;

create or replace function public.get_ghost_arena(p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    payload jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select jsonb_build_object(
        'me', (select to_jsonb(me) - 'user_id' from public.ghost_profiles me where me.user_id = account_id),
        'leaderboard', coalesce((select jsonb_agg(to_jsonb(board)) from (
            select row_number() over (order by rating desc, wins desc, updated_at asc) as rank,
                   nickname, ascend_class, active_skill, rating, wins, losses, draws, matches,
                   case when matches < 10 then true else false end as provisional
              from public.ghost_profiles
             where active and combat_version = p_combat_version
             order by rating desc, wins desc, updated_at asc limit 50
        ) board), '[]'::jsonb),
        'recent', coalesce((select jsonb_agg(to_jsonb(recent_match)) from (
            select match_row.created_at, match_row.ranked,
                   case when match_row.challenger_id = account_id then match_row.result
                        when match_row.result = 'win' then 'loss'
                        when match_row.result = 'loss' then 'win' else 'draw' end as result,
                   case when match_row.challenger_id = account_id then defender.nickname else challenger.nickname end as opponent,
                   case when match_row.challenger_id = account_id then match_row.challenger_rating_after - match_row.challenger_rating_before
                        else match_row.defender_rating_after - match_row.defender_rating_before end as rating_delta
              from public.ghost_matches match_row
              join public.ghost_profiles challenger on challenger.user_id = match_row.challenger_id
              join public.ghost_profiles defender on defender.user_id = match_row.defender_id
             where match_row.challenger_id = account_id or match_row.defender_id = account_id
             order by match_row.created_at desc limit 10
        ) recent_match), '[]'::jsonb)
    ) into payload;
    return payload;
end;
$$;

create or replace function public.fight_ghost(p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    challenger public.ghost_profiles%rowtype;
    defender public.ghost_profiles%rowtype;
    defender_id uuid;
    seed_value text;
    challenger_ttk numeric;
    defender_ttk numeric;
    result_value text;
    challenger_score numeric;
    expected_score numeric;
    rating_delta integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    -- ponytail: 테스터 규모에서는 전역 매치 잠금이 가장 안전하다. 동시 매치가 병목이 될 때 계정 순서 잠금으로 교체한다.
    perform pg_advisory_xact_lock(937041);
    if (select count(*) from public.ghost_matches
         where challenger_id = account_id and ranked and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'GHOST_DAILY_LIMIT';
    end if;
    select * into challenger from public.ghost_profiles
     where user_id = account_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_REGISTRATION_REQUIRED'; end if;

    select candidate.user_id into defender_id
      from public.ghost_profiles candidate
     where candidate.user_id <> account_id and candidate.active
       and candidate.combat_version = p_combat_version
       and (select count(*) from public.ghost_matches previous
             where ((previous.challenger_id = account_id and previous.defender_id = candidate.user_id)
                 or (previous.challenger_id = candidate.user_id and previous.defender_id = account_id))
               and previous.ranked
               and previous.created_at >= now() - interval '1 day') < 5
     order by abs(candidate.rating - challenger.rating), random() limit 1;
    if defender_id is null then raise exception 'GHOST_OPPONENT_NOT_FOUND'; end if;
    select * into defender from public.ghost_profiles where user_id = defender_id for update;

    seed_value := md5(account_id::text || defender_id::text || clock_timestamp()::text || random()::text);
    challenger_ttk := public.ghost_ehp_for_element(defender.ehp_by_element, challenger.skill_element)
        / greatest(1, challenger.dps)
        * (0.94 + abs(mod(hashtextextended(seed_value || 'a', 0), 1201)) / 10000.0);
    defender_ttk := public.ghost_ehp_for_element(challenger.ehp_by_element, defender.skill_element)
        / greatest(1, defender.dps)
        * (0.94 + abs(mod(hashtextextended(seed_value || 'b', 0), 1201)) / 10000.0);

    if abs(challenger_ttk - defender_ttk) / greatest(challenger_ttk, defender_ttk) <= 0.04 then
        result_value := 'draw'; challenger_score := 0.5;
    elsif challenger_ttk < defender_ttk then
        result_value := 'win'; challenger_score := 1;
    else
        result_value := 'loss'; challenger_score := 0;
    end if;
    expected_score := 1 / (1 + power(10::numeric, (defender.rating - challenger.rating) / 400.0));
    rating_delta := round(24 * (challenger_score - expected_score));
    if rating_delta = 0 and result_value <> 'draw' then rating_delta := case when result_value = 'win' then 1 else -1 end; end if;

    update public.ghost_profiles set
        rating = greatest(100, least(4000, rating + rating_delta)),
        wins = wins + case when result_value = 'win' then 1 else 0 end,
        losses = losses + case when result_value = 'loss' then 1 else 0 end,
        draws = draws + case when result_value = 'draw' then 1 else 0 end,
        matches = matches + 1
     where user_id = account_id;
    update public.ghost_profiles set
        rating = greatest(100, least(4000, rating - rating_delta)),
        wins = wins + case when result_value = 'loss' then 1 else 0 end,
        losses = losses + case when result_value = 'win' then 1 else 0 end,
        draws = draws + case when result_value = 'draw' then 1 else 0 end,
        matches = matches + 1
     where user_id = defender_id;

    insert into public.ghost_matches(
        challenger_id, defender_id, result,
        challenger_rating_before, challenger_rating_after,
        defender_rating_before, defender_rating_after, seed, combat_version
    ) values (
        account_id, defender_id, result_value,
        challenger.rating, greatest(100, least(4000, challenger.rating + rating_delta)),
        defender.rating, greatest(100, least(4000, defender.rating - rating_delta)),
        seed_value, p_combat_version
    );
    return jsonb_build_object(
        'opponent', defender.nickname, 'opponentClass', defender.ascend_class,
        'opponentSkill', defender.active_skill, 'result', result_value,
        'ratingBefore', challenger.rating,
        'ratingAfter', greatest(100, least(4000, challenger.rating + rating_delta)),
        'ratingDelta', greatest(100, least(4000, challenger.rating + rating_delta)) - challenger.rating,
        'seed', seed_value
    );
end;
$$;

create or replace function public.fight_ghost_target(p_target_user_id uuid, p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    challenger public.ghost_profiles%rowtype;
    defender public.ghost_profiles%rowtype;
    seed_value text;
    challenger_ttk numeric;
    defender_ttk numeric;
    result_value text;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_target_user_id is null or p_target_user_id = account_id then raise exception 'GHOST_INVALID_TARGET'; end if;
    perform pg_advisory_xact_lock(937041);
    if (select count(*) from public.ghost_matches
         where challenger_id = account_id and not ranked
           and created_at >= now() - interval '1 day') >= 30 then
        raise exception 'GHOST_FRIENDLY_LIMIT';
    end if;
    if (select count(*) from public.ghost_matches previous
         where not previous.ranked
           and ((previous.challenger_id = account_id and previous.defender_id = p_target_user_id)
             or (previous.challenger_id = p_target_user_id and previous.defender_id = account_id))
           and previous.created_at >= now() - interval '1 day') >= 10 then
        raise exception 'GHOST_FRIENDLY_LIMIT';
    end if;

    select * into challenger from public.ghost_profiles
     where user_id = account_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_REGISTRATION_REQUIRED'; end if;
    select * into defender from public.ghost_profiles
     where user_id = p_target_user_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_TARGET_NOT_REGISTERED'; end if;

    seed_value := md5(account_id::text || p_target_user_id::text || clock_timestamp()::text || random()::text);
    challenger_ttk := public.ghost_ehp_for_element(defender.ehp_by_element, challenger.skill_element)
        / greatest(1, challenger.dps)
        * (0.94 + abs(mod(hashtextextended(seed_value || 'a', 0), 1201)) / 10000.0);
    defender_ttk := public.ghost_ehp_for_element(challenger.ehp_by_element, defender.skill_element)
        / greatest(1, defender.dps)
        * (0.94 + abs(mod(hashtextextended(seed_value || 'b', 0), 1201)) / 10000.0);
    if abs(challenger_ttk - defender_ttk) / greatest(challenger_ttk, defender_ttk) <= 0.04 then
        result_value := 'draw';
    elsif challenger_ttk < defender_ttk then result_value := 'win';
    else result_value := 'loss';
    end if;

    insert into public.ghost_matches(
        challenger_id, defender_id, result,
        challenger_rating_before, challenger_rating_after,
        defender_rating_before, defender_rating_after, seed, combat_version, ranked
    ) values (
        account_id, p_target_user_id, result_value,
        challenger.rating, challenger.rating, defender.rating, defender.rating,
        seed_value, p_combat_version, false
    );
    return jsonb_build_object(
        'opponent', defender.nickname, 'opponentClass', defender.ascend_class,
        'opponentSkill', defender.active_skill, 'result', result_value,
        'ratingBefore', challenger.rating, 'ratingAfter', challenger.rating,
        'ratingDelta', 0, 'ranked', false, 'seed', seed_value
    );
end;
$$;

revoke all on function public.register_my_ghost(text) from public, anon;
revoke all on function public.get_ghost_arena(text) from public, anon;
revoke all on function public.fight_ghost(text) from public, anon;
revoke all on function public.fight_ghost_target(uuid, text) from public, anon;
grant execute on function public.register_my_ghost(text) to authenticated;
grant execute on function public.get_ghost_arena(text) to authenticated;
grant execute on function public.fight_ghost(text) to authenticated;
grant execute on function public.fight_ghost_target(uuid, text) to authenticated;

commit;
