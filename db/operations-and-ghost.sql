-- Project ARPG Idle: 운영 도구, 저장 이력, 고스트 대결
-- db/cloud-and-playtest.sql 및 db/social.sql 실행 후 Supabase SQL Editor에서 실행한다.
-- Supabase의 "destructive operations" 경고는 아래 제약조건·함수 시그니처 교체, 권한 REVOKE 및
-- 함수 본문 안의 오래된 저장 이력 정리 DELETE 때문에 표시된다. 이 스크립트를 실행하는
-- 즉시 플레이어 저장·프로필·채팅·전투 기록 테이블이나 그 데이터를 삭제하지 않는다.
-- 운영 화면을 쓸 계정은 Dashboard > Authentication > Users의 app_metadata에
-- { "project_admin": true }를 설정한다. service_role 키는 클라이언트에 넣지 않는다.

begin;

alter table public.playtest_runs
    add column if not exists content_context jsonb not null default '{}'::jsonb,
    add column if not exists skill_element text,
    add column if not exists ghost_snapshot jsonb not null default '{}'::jsonb;

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
    combat_snapshot jsonb not null default '{}'::jsonb,
    rating integer not null default 1000 check (rating between 100 and 4000),
    wins integer not null default 0,
    losses integer not null default 0,
    draws integer not null default 0,
    matches integer not null default 0,
    combat_version text not null,
    active boolean not null default true,
    updated_at timestamptz not null default now()
);

alter table public.ghost_profiles add column if not exists combat_snapshot jsonb not null default '{}'::jsonb;

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

create or replace function public.ghost_snapshot_number(
    payload jsonb, field_name text, fallback numeric, minimum numeric, maximum numeric
)
returns numeric
language sql
immutable
as $$
    select greatest(minimum, least(maximum, coalesce(
        case when jsonb_typeof(payload -> field_name) = 'number'
             then (payload ->> field_name)::numeric end, fallback)));
$$;

create or replace function public.normalize_ghost_combat_snapshot(payload jsonb, measured_dps numeric, measured_ehp jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
    source jsonb := coalesce(payload, '{}'::jsonb);
    element text := case when source ->> 'skillElement' in ('phys','fire','cold','light','chaos') then source ->> 'skillElement' else 'phys' end;
    style text := case when source ->> 'style' in ('melee','projectile','spell','dot','channel','summon') then source ->> 'style' else 'melee' end;
    hero text := case when source ->> 'heroId' ~ '^hero([1-9]|10)$' then source ->> 'heroId' else 'hero1' end;
    direct_ehp jsonb := coalesce(source -> 'directEhpByElement', '{}'::jsonb);
begin
    return jsonb_build_object(
        'schemaVersion', 1, 'heroId', hero, 'activeSkill', left(coalesce(source ->> 'activeSkill', '기본 공격'), 80),
        'skillElement', element, 'style', style,
        'dps', greatest(1, least(9000000000000000::numeric, measured_dps)),
        'directDps', public.ghost_snapshot_number(source, 'directDps', measured_dps, 0, measured_dps),
        'dotDps', public.ghost_snapshot_number(source, 'dotDps', 0, 0, measured_dps),
        'summonDps', public.ghost_snapshot_number(source, 'summonDps', 0, 0, measured_dps),
        'maxHp', public.ghost_snapshot_number(source, 'maxHp', 1, 1, 9000000000000000),
        'energyShield', public.ghost_snapshot_number(source, 'energyShield', 0, 0, 9000000000000000),
        'directEhpByElement', jsonb_build_object(
            'phys', public.ghost_snapshot_number(direct_ehp, 'phys', public.ghost_ehp_for_element(measured_ehp, 'phys'), 1, 9000000000000000),
            'fire', public.ghost_snapshot_number(direct_ehp, 'fire', public.ghost_ehp_for_element(measured_ehp, 'fire'), 1, 9000000000000000),
            'cold', public.ghost_snapshot_number(direct_ehp, 'cold', public.ghost_ehp_for_element(measured_ehp, 'cold'), 1, 9000000000000000),
            'light', public.ghost_snapshot_number(direct_ehp, 'light', public.ghost_ehp_for_element(measured_ehp, 'light'), 1, 9000000000000000),
            'chaos', public.ghost_snapshot_number(direct_ehp, 'chaos', public.ghost_ehp_for_element(measured_ehp, 'chaos'), 1, 9000000000000000)),
        'attackSpeed', public.ghost_snapshot_number(source, 'attackSpeed', 1, 0.2, 8),
        'critChance', public.ghost_snapshot_number(source, 'critChance', 0, 0, 100),
        'critMultiplier', public.ghost_snapshot_number(source, 'critMultiplier', 1.25, 1, 20),
        'damageRollMinPct', public.ghost_snapshot_number(source, 'damageRollMinPct', 100, 5, 1000),
        'damageRollMaxPct', public.ghost_snapshot_number(source, 'damageRollMaxPct', 100, 5, 1000),
        'doubleStrikeChance', public.ghost_snapshot_number(source, 'doubleStrikeChance', 0, 0, 500),
        'accuracy', public.ghost_snapshot_number(source, 'accuracy', 1, 1, 9000000000000000),
        'evasion', public.ghost_snapshot_number(source, 'evasion', 0, 0, 9000000000000000),
        'blockChance', public.ghost_snapshot_number(source, 'blockChance', 0, 0, 75),
        'deflectChance', public.ghost_snapshot_number(source, 'deflectChance', 0, 0, 75),
        'deflectDamageReduce', public.ghost_snapshot_number(source, 'deflectDamageReduce', 40, 40, 85),
        'leechPct', public.ghost_snapshot_number(source, 'leechPct', 0, 0, 20),
        'recoveryPct', public.ghost_snapshot_number(source, 'recoveryPct', 0, 0, 10));
end;
$$;

create or replace function public.ghost_duel_roll(seed_value text, roll_key text)
returns numeric
language sql
immutable
as $$
    select abs(mod(hashtextextended(seed_value || ':' || roll_key, 0), 1000001)) / 1000000.0;
$$;

create or replace function public.prepare_ghost_duel_fighter(snapshot jsonb, enemy_element text, fallback_ehp jsonb)
returns jsonb
language sql
immutable
as $$
    select snapshot || jsonb_build_object(
        'maxVitality', public.ghost_snapshot_number(coalesce(snapshot -> 'directEhpByElement', fallback_ehp), enemy_element,
            public.ghost_ehp_for_element(fallback_ehp, enemy_element), 1, 9000000000000000),
        'attackIntervalMs', round(1000 / public.ghost_snapshot_number(snapshot, 'attackSpeed', 1, 0.2, 8)));
$$;

create or replace function public.resolve_ghost_duel_attack(attacker jsonb, defender jsonb, attack_context jsonb, entropy numeric)
returns jsonb
language plpgsql
immutable
as $$
declare
    seed_value text := attack_context ->> 'seed'; key_value text := attack_context ->> 'key';
    accuracy numeric := public.ghost_snapshot_number(attacker, 'accuracy', 1, 1, 9000000000000000);
    evasion numeric := public.ghost_snapshot_number(defender, 'evasion', 0, 0, 9000000000000000);
    evade_chance numeric := least(70, evasion / greatest(1, evasion + accuracy * 3.5) * 100);
    next_entropy numeric := entropy + (100 - evade_chance);
    crit_chance numeric := public.ghost_snapshot_number(attacker, 'critChance', 0, 0, 100);
    crit_multiplier numeric := public.ghost_snapshot_number(attacker, 'critMultiplier', 1.25, 1, 20);
    roll_min numeric := public.ghost_snapshot_number(attacker, 'damageRollMinPct', 100, 5, 1000);
    roll_max numeric := public.ghost_snapshot_number(attacker, 'damageRollMaxPct', 100, roll_min, 1000);
    double_chance numeric := public.ghost_snapshot_number(attacker, 'doubleStrikeChance', 0, 0, 500);
    attacks_per_second numeric := public.ghost_snapshot_number(attacker, 'attackSpeed', 1, 0.2, 8);
    expected_multiplier numeric; actual_multiplier numeric; damage_value numeric; strike_count integer; is_crit boolean;
begin
    if next_entropy < 100 then return jsonb_build_object('outcome','evade','damage',0,'entropy',next_entropy); end if;
    next_entropy := next_entropy - 100;
    if public.ghost_duel_roll(seed_value, key_value || ':block') * 100 < public.ghost_snapshot_number(defender, 'blockChance', 0, 0, 75) then
        return jsonb_build_object('outcome','block','damage',0,'entropy',next_entropy);
    end if;
    is_crit := public.ghost_duel_roll(seed_value, key_value || ':crit') * 100 < crit_chance;
    strike_count := 1 + floor(double_chance / 100)::integer;
    if public.ghost_duel_roll(seed_value, key_value || ':double') * 100 < mod(double_chance, 100) then strike_count := strike_count + 1; end if;
    expected_multiplier := (1 + crit_chance / 100 * (crit_multiplier - 1)) * ((roll_min + roll_max) / 200) * (1 + double_chance / 100);
    actual_multiplier := (case when is_crit then crit_multiplier else 1 end)
        * (roll_min + (roll_max - roll_min) * public.ghost_duel_roll(seed_value, key_value || ':damage')) / 100 * strike_count;
    damage_value := public.ghost_snapshot_number(attacker, 'dps', 1, 1, 9000000000000000)
        / attacks_per_second / greatest(0.01, expected_multiplier) * actual_multiplier
        * public.ghost_snapshot_number(attack_context, 'scale', 1, 0.000001, 1000);
    if public.ghost_duel_roll(seed_value, key_value || ':deflect') * 100 < public.ghost_snapshot_number(defender, 'deflectChance', 0, 0, 75) then
        damage_value := damage_value * (1 - public.ghost_snapshot_number(defender, 'deflectDamageReduce', 40, 40, 85) / 100);
        return jsonb_build_object('outcome','deflect','damage',round(damage_value),'entropy',next_entropy,'crit',is_crit,'strikes',strike_count);
    end if;
    return jsonb_build_object('outcome','hit','damage',round(damage_value),'entropy',next_entropy,'crit',is_crit,'strikes',strike_count);
end;
$$;

create or replace function public.simulate_ghost_duel(left_snapshot jsonb, right_snapshot jsonb, seed_value text)
returns jsonb
language plpgsql
immutable
as $$
declare
    left_fighter jsonb; right_fighter jsonb; left_action jsonb; right_action jsonb; replay_events jsonb := '[]'::jsonb;
    left_max numeric; right_max numeric; left_hp numeric; right_hp numeric; left_next numeric := 700; right_next numeric := 700;
    left_entropy numeric; right_entropy numeric; shared_scale numeric; recovery_scale numeric; damage_scale numeric;
    elapsed integer := 0; step_number integer; winner text := 'draw';
begin
    left_fighter := public.prepare_ghost_duel_fighter(left_snapshot, right_snapshot ->> 'skillElement', left_snapshot -> 'directEhpByElement');
    right_fighter := public.prepare_ghost_duel_fighter(right_snapshot, left_snapshot ->> 'skillElement', right_snapshot -> 'directEhpByElement');
    left_max := (left_fighter ->> 'maxVitality')::numeric; right_max := (right_fighter ->> 'maxVitality')::numeric;
    left_hp := left_max; right_hp := right_max;
    shared_scale := sqrt((right_max / greatest(1, (left_fighter ->> 'dps')::numeric))
        * (left_max / greatest(1, (right_fighter ->> 'dps')::numeric))) / 10;
    shared_scale := greatest(0.000001, least(1000, shared_scale));
    left_entropy := floor(public.ghost_duel_roll(seed_value, 'left:entropy') * 100);
    right_entropy := floor(public.ghost_duel_roll(seed_value, 'right:entropy') * 100);
    for step_number in 1..300 loop
        elapsed := step_number * 100; recovery_scale := case when elapsed < 20000 then 1 when elapsed < 25000 then 0.5 else 0 end;
        damage_scale := case when elapsed < 25000 then 1 else 1.5 end;
        left_hp := least(left_max, left_hp + left_max * (left_fighter ->> 'recoveryPct')::numeric / 1000 * recovery_scale);
        right_hp := least(right_max, right_hp + right_max * (right_fighter ->> 'recoveryPct')::numeric / 1000 * recovery_scale);
        left_action := null; right_action := null;
        if elapsed >= left_next and left_hp > 0 then
            left_action := public.resolve_ghost_duel_attack(left_fighter, right_fighter,
                jsonb_build_object('seed',seed_value,'key','left:' || step_number,'scale',shared_scale * damage_scale), left_entropy);
            left_entropy := (left_action ->> 'entropy')::numeric; left_next := left_next + (left_fighter ->> 'attackIntervalMs')::numeric;
        end if;
        if elapsed >= right_next and right_hp > 0 then
            right_action := public.resolve_ghost_duel_attack(right_fighter, left_fighter,
                jsonb_build_object('seed',seed_value,'key','right:' || step_number,'scale',shared_scale * damage_scale), right_entropy);
            right_entropy := (right_action ->> 'entropy')::numeric; right_next := right_next + (right_fighter ->> 'attackIntervalMs')::numeric;
        end if;
        if left_action is not null then left_hp := least(left_max, left_hp + least(left_max * 0.04, (left_action ->> 'damage')::numeric * (left_fighter ->> 'leechPct')::numeric / 100)); end if;
        if right_action is not null then right_hp := least(right_max, right_hp + least(right_max * 0.04, (right_action ->> 'damage')::numeric * (right_fighter ->> 'leechPct')::numeric / 100)); end if;
        right_hp := greatest(0, right_hp - coalesce((left_action ->> 'damage')::numeric, 0));
        left_hp := greatest(0, left_hp - coalesce((right_action ->> 'damage')::numeric, 0));
        if left_action is not null or right_action is not null then
            replay_events := replay_events || jsonb_build_array(jsonb_build_object('t',elapsed,'left',left_action,'right',right_action,
                'leftPct',round(left_hp / left_max * 1000) / 10,'rightPct',round(right_hp / right_max * 1000) / 10));
        end if;
        if left_hp <= 0 or right_hp <= 0 then exit; end if;
    end loop;
    if left_hp > 0 and right_hp <= 0 then winner := 'left'; elsif right_hp > 0 and left_hp <= 0 then winner := 'right'; end if;
    return jsonb_build_object('schemaVersion',1,'winner',winner,'durationMs',elapsed,'events',replay_events,
        'leftMax',round(left_max),'rightMax',round(right_max),'leftFinalPct',round(left_hp / left_max * 1000) / 10,
        'rightFinalPct',round(right_hp / right_max * 1000) / 10,'suddenDeathMs',25000);
end;
$$;

do $ghost_combat_contract$
declare
    measured_ehp jsonb := '{"phys":10000,"fire":10000,"cold":10000,"light":10000,"chaos":10000}'::jsonb;
    raw_snapshot jsonb := '{"schemaVersion":1,"heroId":"hero1","activeSkill":"기본 공격","skillElement":"phys","style":"melee","dps":1000,"directEhpByElement":{"phys":10000,"fire":10000,"cold":10000,"light":10000,"chaos":10000},"attackSpeed":1,"critChance":10,"critMultiplier":1.5,"damageRollMinPct":80,"damageRollMaxPct":120,"accuracy":500,"evasion":500}'::jsonb;
    snapshot jsonb; first_result jsonb; repeated_result jsonb;
begin
    snapshot := public.normalize_ghost_combat_snapshot(raw_snapshot, 1000, measured_ehp);
    first_result := public.simulate_ghost_duel(snapshot, snapshot, 'ghost-combat-contract');
    repeated_result := public.simulate_ghost_duel(snapshot, snapshot, 'ghost-combat-contract');
    if first_result <> repeated_result then raise exception 'GHOST_SIMULATION_NOT_DETERMINISTIC'; end if;
    if (first_result ->> 'durationMs')::integer > 30000 then raise exception 'GHOST_SIMULATION_TIME_LIMIT_BROKEN'; end if;
    if jsonb_array_length(first_result -> 'events') = 0 then raise exception 'GHOST_SIMULATION_EMPTY_REPLAY'; end if;
end;
$ghost_combat_contract$;

drop function if exists public.register_my_ghost(text);

create or replace function public.register_my_ghost(p_combat_version text, p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    profile_name text;
    normalized_snapshot jsonb;
    snapshot_dps numeric;
    direct_ehp jsonb;
    element_ehp jsonb;
    registered public.ghost_profiles%rowtype;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_combat_version is null or char_length(p_combat_version) not between 1 and 80 then
        raise exception 'INVALID_COMBAT_VERSION';
    end if;
    if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
        raise exception 'INVALID_GHOST_SNAPSHOT';
    end if;
    if pg_column_size(p_snapshot) > 8192 or p_snapshot ->> 'schemaVersion' <> '1' then
        raise exception 'INVALID_GHOST_SNAPSHOT';
    end if;
    direct_ehp := p_snapshot -> 'directEhpByElement';
    if jsonb_typeof(p_snapshot -> 'dps') <> 'number' or jsonb_typeof(direct_ehp) <> 'object' then
        raise exception 'INVALID_GHOST_SNAPSHOT';
    end if;
    if exists (select 1 from public.ghost_profiles
                where user_id = account_id and updated_at >= now() - interval '5 minutes') then
        raise exception 'GHOST_REGISTRATION_COOLDOWN';
    end if;
    select nickname into profile_name from public.player_profiles where user_id = account_id;
    if profile_name is null then raise exception 'NICKNAME_REQUIRED'; end if;
    snapshot_dps := public.ghost_snapshot_number(p_snapshot, 'dps', 1, 1, 9000000000000000);
    element_ehp := jsonb_build_object(
        'phys', public.ghost_snapshot_number(direct_ehp, 'phys', 1, 1, 9000000000000000),
        'fire', public.ghost_snapshot_number(direct_ehp, 'fire', 1, 1, 9000000000000000),
        'cold', public.ghost_snapshot_number(direct_ehp, 'cold', 1, 1, 9000000000000000),
        'light', public.ghost_snapshot_number(direct_ehp, 'light', 1, 1, 9000000000000000),
        'chaos', public.ghost_snapshot_number(direct_ehp, 'chaos', 1, 1, 9000000000000000));
    normalized_snapshot := public.normalize_ghost_combat_snapshot(p_snapshot, snapshot_dps, element_ehp);

    insert into public.ghost_profiles(
        user_id, nickname, ascend_class, active_skill, skill_element,
        dps, ehp_by_element, combat_snapshot, combat_version, updated_at
    ) values (
        account_id, profile_name, nullif(left(coalesce(p_snapshot ->> 'ascendClass', ''), 80), ''),
        normalized_snapshot ->> 'activeSkill', normalized_snapshot ->> 'skillElement',
        snapshot_dps::bigint, element_ehp, normalized_snapshot, p_combat_version, now()
    )
    on conflict (user_id) do update set
        nickname = excluded.nickname, ascend_class = excluded.ascend_class,
        active_skill = excluded.active_skill, skill_element = excluded.skill_element,
        dps = excluded.dps, ehp_by_element = excluded.ehp_by_element, combat_snapshot = excluded.combat_snapshot,
        combat_version = excluded.combat_version, active = true, updated_at = now()
    returning * into registered;
    return to_jsonb(registered) - 'user_id' - 'combat_snapshot';
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
        'combatProtocolVersion', 4,
        'me', (select to_jsonb(me) - 'user_id' - 'combat_snapshot' from public.ghost_profiles me where me.user_id = account_id),
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
    duel jsonb;
    result_value text;
    challenger_score numeric;
    expected_score numeric;
    rating_delta integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    -- ponytail: 테스터 규모에서는 전역 매치 잠금이 가장 안전하다. 동시 매치가 병목이 될 때 계정 순서 잠금으로 교체한다.
    perform pg_advisory_xact_lock(937041);
    if exists (select 1 from public.ghost_matches
                where challenger_id = account_id and created_at >= now() - interval '20 seconds') then
        raise exception 'GHOST_DUEL_COOLDOWN';
    end if;
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
    duel := public.simulate_ghost_duel(challenger.combat_snapshot, defender.combat_snapshot, seed_value);
    result_value := case duel ->> 'winner' when 'left' then 'win' when 'right' then 'loss' else 'draw' end;
    challenger_score := case result_value when 'win' then 1 when 'loss' then 0 else 0.5 end;
    duel := duel || jsonb_build_object('seed',seed_value,
        'left', jsonb_build_object('nickname',challenger.nickname,'ascendClass',challenger.ascend_class,'snapshot',challenger.combat_snapshot),
        'right', jsonb_build_object('nickname',defender.nickname,'ascendClass',defender.ascend_class,'snapshot',defender.combat_snapshot));
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
        'seed', seed_value, 'duel', duel
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
    duel jsonb;
    result_value text;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_target_user_id is null or p_target_user_id = account_id then raise exception 'GHOST_INVALID_TARGET'; end if;
    perform pg_advisory_xact_lock(937041);
    if exists (select 1 from public.ghost_matches
                where challenger_id = account_id and created_at >= now() - interval '20 seconds') then
        raise exception 'GHOST_DUEL_COOLDOWN';
    end if;
    if (select count(*) from public.ghost_matches
         where challenger_id = account_id and not ranked
           and created_at >= now() - interval '1 day') >= 30 then
        raise exception 'GHOST_FRIENDLY_DAILY_LIMIT';
    end if;
    if (select count(*) from public.ghost_matches previous
         where not previous.ranked
           and ((previous.challenger_id = account_id and previous.defender_id = p_target_user_id)
             or (previous.challenger_id = p_target_user_id and previous.defender_id = account_id))
           and previous.created_at >= now() - interval '1 day') >= 10 then
        raise exception 'GHOST_FRIENDLY_TARGET_LIMIT';
    end if;

    select * into challenger from public.ghost_profiles
     where user_id = account_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_REGISTRATION_REQUIRED'; end if;
    select * into defender from public.ghost_profiles
     where user_id = p_target_user_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_TARGET_NOT_REGISTERED'; end if;

    seed_value := md5(account_id::text || p_target_user_id::text || clock_timestamp()::text || random()::text);
    duel := public.simulate_ghost_duel(challenger.combat_snapshot, defender.combat_snapshot, seed_value);
    result_value := case duel ->> 'winner' when 'left' then 'win' when 'right' then 'loss' else 'draw' end;
    duel := duel || jsonb_build_object('seed',seed_value,
        'left', jsonb_build_object('nickname',challenger.nickname,'ascendClass',challenger.ascend_class,'snapshot',challenger.combat_snapshot),
        'right', jsonb_build_object('nickname',defender.nickname,'ascendClass',defender.ascend_class,'snapshot',defender.combat_snapshot));

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
        'ratingDelta', 0, 'ranked', false, 'seed', seed_value, 'duel', duel
    );
end;
$$;

revoke all on function public.register_my_ghost(text, jsonb) from public, anon;
revoke all on function public.get_ghost_arena(text) from public, anon;
revoke all on function public.fight_ghost(text) from public, anon;
revoke all on function public.fight_ghost_target(uuid, text) from public, anon;
revoke all on function public.ghost_snapshot_number(jsonb, text, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.normalize_ghost_combat_snapshot(jsonb, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.ghost_duel_roll(text, text) from public, anon, authenticated;
revoke all on function public.prepare_ghost_duel_fighter(jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.resolve_ghost_duel_attack(jsonb, jsonb, jsonb, numeric) from public, anon, authenticated;
revoke all on function public.simulate_ghost_duel(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.register_my_ghost(text, jsonb) to authenticated;
grant execute on function public.get_ghost_arena(text) to authenticated;
grant execute on function public.fight_ghost(text) to authenticated;
grant execute on function public.fight_ghost_target(uuid, text) to authenticated;

commit;
