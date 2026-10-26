-- 고스트 대결: 움직이며 싸우는 판정(2026-10-22). Supabase SQL Editor에서 한 번 실행한다. db/operations-and-ghost.sql의 같은 함수를
-- 그대로 옮긴 것이다(그 파일이 원본이다). 한 트랜잭션이라 끝의 검사가 실패하면 아무것도 바뀌지 않는다.
-- - normalize_ghost_combat_snapshot: 이동 속도, 주 스킬과 이동 스킬룬의 사거리, 이동 스킬룬의 재사용 대기, 위치 전술, 최후방 사격,
--   추적자, 직업과 무기 자세를 받는다.
-- - prepare_ghost_duel_fighter: 100ms의 걸음, 공격 후딜, 전술 걸음 뒤의 공격 지연, 사거리.
-- - simulate_ghost_duel: 7칸 떨어져 서서 게임의 주인공처럼 움직인다(다가가기, 이동 스킬룬, 거리 유지와 최후방 사격의 물러서기,
--   압박). 사거리 안에서만 치고, 회복은 피해처럼 늘인 싸움의 시간으로 센다. 다시 보기를 위해 사건마다 자리(lx, rx)를 남긴다.
-- - 검사 블록: 같은 결과가 되풀이되는지 보고, 움직임의 갈래를 양쪽 자리에서 한 번씩 돌린다.
-- - get_ghost_arena: combatProtocolVersion 5.
-- 예전에 등록한 고스트는 기본값으로 싸운다(근접 1칸, 그 밖 5칸, 이동 스킬룬 없음, 자동 전술). 다시 등록하면 제 값이 담긴다.

begin;

create or replace function public.normalize_ghost_combat_snapshot(payload jsonb, measured_dps numeric, measured_ehp jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
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
        'recoveryPct', public.ghost_snapshot_number(source, 'recoveryPct', 0, 0, 10))
        -- 움직이며 싸우는 대결(2026-10-22): 이동 속도(100이 기본), 주 스킬과 이동 스킬룬의 사거리(칸), 이동 스킬룬의 재사용 대기, 위치 전술
        -- (자동은 적지 않는다), 최후방 사격, 추적자의 다가가는 속도(%), 그림의 직업과 무기 자세. 예전 고스트에는 없으니 판정은 기본값을 쓴다
        -- (근접 1칸, 그 밖 5칸, 이동 스킬룬 없음, 자동).
        || jsonb_strip_nulls(jsonb_build_object(
        'moveSpeed', public.ghost_snapshot_number(source, 'moveSpeed', 100, 20, 400),
        'attackRange', public.ghost_snapshot_number(source, 'attackRange', case when style = 'melee' then 1 else 5 end, 1, 8),
        'mobilityRange', public.ghost_snapshot_number(source, 'mobilityRange', 0, 0, 8),
        'mobilityCooldownMs', public.ghost_snapshot_number(source, 'mobilityCooldownMs', 4000, 500, 60000),
        'mobilitySkill', nullif(left(coalesce(source ->> 'mobilitySkill', ''), 80), ''),
        'positionMode', case when source ->> 'positionMode' in ('pressure','keepRange') then source ->> 'positionMode' end,
        'farshot', case when source -> 'farshot' = 'true'::jsonb then true end,
        'pursuitMovePct', public.ghost_snapshot_number(source, 'pursuitMovePct', 0, 0, 100),
        'classId', case when source ->> 'classId' in ('wanderer','warrior','archer','occultist','alchemist','cleric') then source ->> 'classId' end,
        'stance', case when source ->> 'stance' in ('unarmed','greatsword','sword','bow','orb','flask','censer') then source ->> 'stance' end));
end;
$$;

create or replace function public.prepare_ghost_duel_fighter(snapshot jsonb, enemy_element text, fallback_ehp jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
    select snapshot || jsonb_build_object(
        'maxVitality', public.ghost_snapshot_number(coalesce(snapshot -> 'directEhpByElement', fallback_ehp), enemy_element,
            public.ghost_ehp_for_element(fallback_ehp, enemy_element), 1, 9000000000000000),
        'attackIntervalMs', round(1000 / public.ghost_snapshot_number(snapshot, 'attackSpeed', 1, 0.2, 8)),
        -- 100ms에 걷는 칸(이동 속도 100이면 칸마다 0.6초, 게임의 COMBAT_GRID_CONFIG.playerMoveIntervalSec): 다가갈 때는 추적자의 속도까지
        -- (js/combat.js getPlayerGridStepSec), 전술로 옮길 때는 이동 속도만(tryPlayerTacticalMove)
        'approachStep', public.ghost_snapshot_number(snapshot, 'moveSpeed', 100, 20, 400)
            * (1 + public.ghost_snapshot_number(snapshot, 'pursuitMovePct', 0, 0, 100) / 100) / 600,
        'tacticStep', public.ghost_snapshot_number(snapshot, 'moveSpeed', 100, 20, 400) / 600,
        -- 공격 후딜(getPlayerAttackRecoveryMs: 간격의 35%를 20ms 장으로, 많아야 20장)과 전술 걸음 뒤 공격을 미루는 때
        -- (getTacticalMoveAttackDelayMs의 0.45배)
        'recoveryMs', least(20, round(round(1000 / public.ghost_snapshot_number(snapshot, 'attackSpeed', 1, 0.2, 8)) * 0.35 / 20)) * 20,
        'stepDelayMs', round(round(greatest(300, least(650, 500 * sqrt(100 / public.ghost_snapshot_number(snapshot, 'moveSpeed', 100, 20, 400))))) * 0.45),
        -- 주 스킬과 이동 스킬룬의 사거리(칸), 위치 전술, 최후방 사격
        'reach', public.ghost_snapshot_number(snapshot, 'attackRange', case when snapshot ->> 'style' = 'melee' then 1 else 5 end, 1, 8),
        'dashReach', public.ghost_snapshot_number(snapshot, 'mobilityRange', 0, 0, 8),
        'dashCooldownMs', public.ghost_snapshot_number(snapshot, 'mobilityCooldownMs', 4000, 500, 60000),
        'positionMode', case when snapshot ->> 'positionMode' in ('pressure','keepRange') then snapshot ->> 'positionMode' else 'auto' end,
        'farshot', coalesce(snapshot -> 'farshot' = 'true'::jsonb, false));
$$;

create or replace function public.simulate_ghost_duel(left_snapshot jsonb, right_snapshot jsonb, seed_value text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
-- 움직이며 싸우는 대결(2026-10-22 사용자: "실제 전투처럼 (몬스터와 전투하는것처럼) 범위,이동속도 등이 영향이 있도록 서로 움직이면서").
-- 두 고스트는 게임의 주인공처럼 움직인다(js/combat.js updatePlayerGridEngagement). 12칸 줄에서 7칸 떨어져 선다.
-- - 사거리 밖이면 이동 속도대로 다가간다(추적자 포함). 공격 후딜 동안은 새로 걷지 않고, 다가가도 둘이 한 칸보다 붙지 않는다.
-- - 주 스킬은 닿지 않고 이동 스킬룬은 닿으면 단번에 제 사거리까지 간다(js/mobility-skill.js). 재사용 대기를 기다리고, 후딜을 끊는다.
-- - 사거리 안에서는 위치 전술을 쓴다(getPlayerTacticalMovePlan, tryPlayerTacticalMove). 최후방 사격은 2칸 안, 거리 유지는 사거리보다
--   한 칸 넘게 들어오면 한 칸 물러서고(공격 사이 두 번까지, 벽에서 멈춘다, 2초 동안 치지 못했으면 물러서지 않는다), 압박은 한 칸씩
--   다가붙는다. 전술 걸음은 한 칸을 다 걷고, 그동안 치지 못하며 공격 게이지는 절반만 찬다(PLAYER_WALKING_CHARGE). 쫓는 쪽은 물러선
--   자리를 따라간다.
-- - 사거리 안에서만 친다. 처음 든 뒤 0.3초에 첫 공격이고, 쳐 둔 게이지는 한 번까지만 모인다.
-- 회복은 피해처럼 늘인 싸움의 시간(shared_scale)으로 센다: 그대로 두면 후반 대결은 재생이 높은 쪽이 거의 다 이겼다.
-- 다시 보기(js/ghost-duel-stage-ui.js)를 위해 사건마다 두 자리(lx, rx)를 남기고, 걸음이 바뀐 때는 그 앞 걸음이 끝난 자리를 더한다.
declare
    left_fighter jsonb; right_fighter jsonb; left_action jsonb; right_action jsonb; replay_events jsonb := '[]'::jsonb;
    left_max numeric; right_max numeric; left_hp numeric; right_hp numeric; left_next numeric; right_next numeric;
    left_entropy numeric; right_entropy numeric; shared_scale numeric; recovery_scale numeric; damage_scale numeric;
    elapsed integer := 0; step_number integer; winner text := 'draw';
    -- 자리와 사거리(칸), 걸음(100ms에 칸), 때(ms)
    left_x numeric := 2.5; right_x numeric := 9.5; gap numeric; before_left numeric; before_right numeric;
    left_reach numeric; right_reach numeric; left_approach numeric; right_approach numeric; left_tactic numeric; right_tactic numeric;
    left_mode text; right_mode text; left_farshot boolean; right_farshot boolean;
    left_interval numeric; right_interval numeric; left_recovery numeric; right_recovery numeric; left_delay numeric; right_delay numeric;
    left_dash_reach numeric; right_dash_reach numeric; left_dash_cooldown numeric; right_dash_cooldown numeric;
    left_dash_ready numeric := 0; right_dash_ready numeric := 0; dash_side text;
    left_plan text; right_plan text; left_step_left numeric := 0; right_step_left numeric := 0; left_step_dir integer := 0; right_step_dir integer := 0;
    left_retreats integer := 0; right_retreats integer := 0; left_move_at numeric := 0; right_move_at numeric := 0;
    left_attack_at numeric := 0; right_attack_at numeric := 0; left_recover_until numeric := 0; right_recover_until numeric := 0;
    left_last_attack numeric := 0; right_last_attack numeric := 0;
    left_away numeric; right_away numeric; left_toward numeric; right_toward numeric; walk_room numeric; walk_total numeric;
    motion text := ''; motion_now text; last_event_t integer := -1;
begin
    left_fighter := public.prepare_ghost_duel_fighter(left_snapshot, right_snapshot ->> 'skillElement', left_snapshot -> 'directEhpByElement');
    right_fighter := public.prepare_ghost_duel_fighter(right_snapshot, left_snapshot ->> 'skillElement', right_snapshot -> 'directEhpByElement');
    left_max := (left_fighter ->> 'maxVitality')::numeric; right_max := (right_fighter ->> 'maxVitality')::numeric;
    left_hp := left_max; right_hp := right_max;
    shared_scale := sqrt((right_max / greatest(1, (left_fighter ->> 'dps')::numeric))
        * (left_max / greatest(1, (right_fighter ->> 'dps')::numeric))) / 10;
    shared_scale := greatest(0.000001, least(1000, shared_scale));
    left_reach := (left_fighter ->> 'reach')::numeric; right_reach := (right_fighter ->> 'reach')::numeric;
    left_approach := (left_fighter ->> 'approachStep')::numeric; right_approach := (right_fighter ->> 'approachStep')::numeric;
    left_tactic := (left_fighter ->> 'tacticStep')::numeric; right_tactic := (right_fighter ->> 'tacticStep')::numeric;
    left_mode := left_fighter ->> 'positionMode'; right_mode := right_fighter ->> 'positionMode';
    left_farshot := (left_fighter ->> 'farshot')::boolean; right_farshot := (right_fighter ->> 'farshot')::boolean;
    left_interval := (left_fighter ->> 'attackIntervalMs')::numeric; right_interval := (right_fighter ->> 'attackIntervalMs')::numeric;
    left_recovery := (left_fighter ->> 'recoveryMs')::numeric; right_recovery := (right_fighter ->> 'recoveryMs')::numeric;
    left_delay := (left_fighter ->> 'stepDelayMs')::numeric; right_delay := (right_fighter ->> 'stepDelayMs')::numeric;
    left_dash_reach := (left_fighter ->> 'dashReach')::numeric; right_dash_reach := (right_fighter ->> 'dashReach')::numeric;
    left_dash_cooldown := (left_fighter ->> 'dashCooldownMs')::numeric; right_dash_cooldown := (right_fighter ->> 'dashCooldownMs')::numeric;
    left_entropy := floor(public.ghost_duel_roll(seed_value, 'left:entropy') * 100);
    right_entropy := floor(public.ghost_duel_roll(seed_value, 'right:entropy') * 100);
    for step_number in 1..300 loop
        elapsed := step_number * 100; recovery_scale := case when elapsed < 20000 then 1 when elapsed < 25000 then 0.5 else 0 end;
        damage_scale := case when elapsed < 25000 then 1 else 1.5 end;
        left_hp := least(left_max, left_hp + left_max * (left_fighter ->> 'recoveryPct')::numeric / 1000 * recovery_scale * shared_scale);
        right_hp := least(right_max, right_hp + right_max * (right_fighter ->> 'recoveryPct')::numeric / 1000 * recovery_scale * shared_scale);
        before_left := left_x; before_right := right_x; gap := right_x - left_x;
        -- 이번 걸음: 하던 전술 걸음, 사거리 밖이면 다가가기, 사거리 안이면 위치 전술
        left_plan := null;
        if left_step_left > 0.0001 then left_plan := 'step';
        elsif gap > left_reach + 0.0001 then
            if elapsed >= left_recover_until then left_plan := 'approach'; end if;
        elsif left_next is not null and elapsed >= left_move_at and elapsed >= left_recover_until and elapsed - left_last_attack < 2000 then
            if left_retreats < 2 and left_x - 0.5 > 0.0001
                and ((left_farshot and gap <= 2.0001) or (left_mode = 'keepRange' and left_reach > 1 and gap <= left_reach - 0.9999)) then
                left_plan := 'step'; left_step_left := 1; left_step_dir := 1; left_retreats := left_retreats + 1;
                left_move_at := elapsed + left_delay; left_attack_at := left_move_at;
            elsif left_mode = 'pressure' and gap > 1.0001 then
                left_plan := 'step'; left_step_left := least(1, gap - 1); left_step_dir := -1;
                left_move_at := elapsed + left_delay; left_attack_at := left_move_at;
            end if;
        end if;
        right_plan := null;
        if right_step_left > 0.0001 then right_plan := 'step';
        elsif gap > right_reach + 0.0001 then
            if elapsed >= right_recover_until then right_plan := 'approach'; end if;
        elsif right_next is not null and elapsed >= right_move_at and elapsed >= right_recover_until and elapsed - right_last_attack < 2000 then
            if right_retreats < 2 and 11.5 - right_x > 0.0001
                and ((right_farshot and gap <= 2.0001) or (right_mode = 'keepRange' and right_reach > 1 and gap <= right_reach - 0.9999)) then
                right_plan := 'step'; right_step_left := 1; right_step_dir := 1; right_retreats := right_retreats + 1;
                right_move_at := elapsed + right_delay; right_attack_at := right_move_at;
            elsif right_mode = 'pressure' and gap > 1.0001 then
                right_plan := 'step'; right_step_left := least(1, gap - 1); right_step_dir := -1;
                right_move_at := elapsed + right_delay; right_attack_at := right_move_at;
            end if;
        end if;
        -- 걷기: 물러서는 쪽이 먼저 걷고(벽에서 멈춘다), 다가가는 쪽은 그 자리를 따라간다
        left_away := case when left_plan = 'step' and left_step_dir > 0 then least(left_tactic, left_step_left, left_x - 0.5) else 0 end;
        right_away := case when right_plan = 'step' and right_step_dir > 0 then least(right_tactic, right_step_left, 11.5 - right_x) else 0 end;
        left_toward := case when left_plan = 'approach' then least(left_approach, greatest(0, gap + right_away - left_reach))
            when left_plan = 'step' and left_step_dir < 0 then least(left_tactic, left_step_left) else 0 end;
        right_toward := case when right_plan = 'approach' then least(right_approach, greatest(0, gap + left_away - right_reach))
            when right_plan = 'step' and right_step_dir < 0 then least(right_tactic, right_step_left) else 0 end;
        walk_room := greatest(0, gap + left_away + right_away - 1); walk_total := left_toward + right_toward;
        if walk_total > walk_room then
            left_toward := round(walk_room * left_toward / walk_total, 20); right_toward := walk_room - left_toward;
        end if;
        left_x := left_x - left_away + left_toward; right_x := right_x + right_away - right_toward;
        if left_plan = 'step' then
            left_step_left := case when left_away + left_toward < 0.0001 then 0 else greatest(0, left_step_left - left_away - left_toward) end;
            if left_next > elapsed + 0.0001 then left_next := left_next + 50 * least(1, (left_away + left_toward) / left_tactic); end if;
        end if;
        if right_plan = 'step' then
            right_step_left := case when right_away + right_toward < 0.0001 then 0 else greatest(0, right_step_left - right_away - right_toward) end;
            if right_next > elapsed + 0.0001 then right_next := right_next + 50 * least(1, (right_away + right_toward) / right_tactic); end if;
        end if;
        -- 이동 스킬룬
        dash_side := null;
        gap := right_x - left_x;
        if left_step_left <= 0.0001 and gap > left_reach + 0.0001 and gap <= left_dash_reach + 0.0001 and elapsed >= left_dash_ready then
            left_x := right_x - greatest(1, left_reach); left_recover_until := 0;
            left_dash_ready := elapsed + left_dash_cooldown; dash_side := 'left';
        end if;
        gap := right_x - left_x;
        if right_step_left <= 0.0001 and gap > right_reach + 0.0001 and gap <= right_dash_reach + 0.0001 and elapsed >= right_dash_ready then
            right_x := left_x + greatest(1, right_reach); right_recover_until := 0;
            right_dash_ready := elapsed + right_dash_cooldown; dash_side := case when dash_side is null then 'right' else 'both' end;
        end if;
        -- 걸음이 바뀐 때(서기, 걷기, 방향, 이동 스킬룬)는 그 앞 걸음이 끝난 자리를 남긴다
        motion_now := (case when left_x - before_left > 0.0001 then '+' when left_x - before_left < -0.0001 then '-' else '0' end)
            || (case when right_x - before_right > 0.0001 then '+' when right_x - before_right < -0.0001 then '-' else '0' end)
            || coalesce(dash_side, '');
        if motion_now <> motion and last_event_t <> elapsed - 100 then
            replay_events := replay_events || jsonb_build_array(jsonb_build_object('t',elapsed - 100,
                'leftPct',round(left_hp / left_max * 1000) / 10,'rightPct',round(right_hp / right_max * 1000) / 10,
                'lx',round(before_left, 2),'rx',round(before_right, 2)));
            last_event_t := elapsed - 100;
        end if;
        motion := motion_now;
        -- 공격: 사거리 안에서만. 전술 걸음 중과 그 뒤 잠시(stepDelayMs)는 치지 않는다.
        gap := right_x - left_x;
        if left_next is null and gap <= left_reach + 0.0001 then left_next := elapsed + 300; left_last_attack := elapsed; end if;
        if right_next is null and gap <= right_reach + 0.0001 then right_next := elapsed + 300; right_last_attack := elapsed; end if;
        left_action := null; right_action := null;
        if left_next is not null and elapsed + 0.0001 >= left_next and elapsed >= left_attack_at and left_plan is distinct from 'step'
            and left_step_left <= 0.0001 and gap <= left_reach + 0.0001 and left_hp > 0 then
            left_action := public.resolve_ghost_duel_attack(left_fighter, right_fighter,
                jsonb_build_object('seed',seed_value,'key','left:' || step_number,'scale',shared_scale * damage_scale), left_entropy);
            left_entropy := (left_action ->> 'entropy')::numeric; left_next := greatest(left_next, elapsed - 100) + left_interval;
            left_recover_until := elapsed + left_recovery; left_move_at := greatest(left_move_at, left_recover_until);
            left_retreats := 0; left_last_attack := elapsed;
        end if;
        if right_next is not null and elapsed + 0.0001 >= right_next and elapsed >= right_attack_at and right_plan is distinct from 'step'
            and right_step_left <= 0.0001 and gap <= right_reach + 0.0001 and right_hp > 0 then
            right_action := public.resolve_ghost_duel_attack(right_fighter, left_fighter,
                jsonb_build_object('seed',seed_value,'key','right:' || step_number,'scale',shared_scale * damage_scale), right_entropy);
            right_entropy := (right_action ->> 'entropy')::numeric; right_next := greatest(right_next, elapsed - 100) + right_interval;
            right_recover_until := elapsed + right_recovery; right_move_at := greatest(right_move_at, right_recover_until);
            right_retreats := 0; right_last_attack := elapsed;
        end if;
        if left_action is not null then left_hp := least(left_max, left_hp + least(left_max * 0.04, (left_action ->> 'damage')::numeric * (left_fighter ->> 'leechPct')::numeric / 100)); end if;
        if right_action is not null then right_hp := least(right_max, right_hp + least(right_max * 0.04, (right_action ->> 'damage')::numeric * (right_fighter ->> 'leechPct')::numeric / 100)); end if;
        right_hp := greatest(0, right_hp - coalesce((left_action ->> 'damage')::numeric, 0));
        left_hp := greatest(0, left_hp - coalesce((right_action ->> 'damage')::numeric, 0));
        if left_action is not null or right_action is not null or dash_side is not null then
            replay_events := replay_events || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('t',elapsed,'left',left_action,'right',right_action,
                'leftPct',round(left_hp / left_max * 1000) / 10,'rightPct',round(right_hp / right_max * 1000) / 10,
                'lx',round(left_x, 2),'rx',round(right_x, 2),'dash',dash_side)));
            last_event_t := elapsed;
        end if;
        if left_hp <= 0 or right_hp <= 0 then exit; end if;
    end loop;
    if last_event_t <> elapsed then
        replay_events := replay_events || jsonb_build_array(jsonb_build_object('t',elapsed,
            'leftPct',round(left_hp / left_max * 1000) / 10,'rightPct',round(right_hp / right_max * 1000) / 10,
            'lx',round(left_x, 2),'rx',round(right_x, 2)));
    end if;
    if left_hp > 0 and right_hp <= 0 then winner := 'left'; elsif right_hp > 0 and left_hp <= 0 then winner := 'right'; end if;
    return jsonb_build_object('schemaVersion',2,'winner',winner,'durationMs',elapsed,'events',replay_events,
        'leftMax',round(left_max),'rightMax',round(right_max),'leftFinalPct',round(left_hp / left_max * 1000) / 10,
        'rightFinalPct',round(right_hp / right_max * 1000) / 10,'suddenDeathMs',25000,
        'arena',jsonb_build_object('columns',12,'leftStart',2.5,'rightStart',9.5));
end;
$$;

do $ghost_combat_contract$
declare
    measured_ehp jsonb := '{"phys":10000,"fire":10000,"cold":10000,"light":10000,"chaos":10000}'::jsonb;
    raw_snapshot jsonb := '{"schemaVersion":1,"heroId":"hero1","activeSkill":"기본 공격","skillElement":"phys","style":"melee","dps":1000,"directEhpByElement":{"phys":10000,"fire":10000,"cold":10000,"light":10000,"chaos":10000},"attackSpeed":1,"critChance":10,"critMultiplier":1.5,"damageRollMinPct":80,"damageRollMaxPct":120,"accuracy":500,"evasion":500}'::jsonb;
    snapshot jsonb; first_result jsonb; repeated_result jsonb;
    -- 움직임의 갈래(다가가기, 이동 스킬룬, 거리 유지와 최후방 사격, 압박, 벽)를 양쪽 자리에서 한 번씩 돌린다. 처음 지나는 줄에서야
    -- 드러나는 오류도 이 블록에서 멈춘다.
    chaser jsonb; kiter jsonb; presser jsonb; tank jsonb; moving_result jsonb;
begin
    snapshot := public.normalize_ghost_combat_snapshot(raw_snapshot, 1000, measured_ehp);
    first_result := public.simulate_ghost_duel(snapshot, snapshot, 'ghost-combat-contract');
    repeated_result := public.simulate_ghost_duel(snapshot, snapshot, 'ghost-combat-contract');
    if first_result <> repeated_result then raise exception 'GHOST_SIMULATION_NOT_DETERMINISTIC'; end if;
    if (first_result ->> 'durationMs')::integer > 30000 then raise exception 'GHOST_SIMULATION_TIME_LIMIT_BROKEN'; end if;
    if not exists (select 1 from jsonb_array_elements(first_result -> 'events') as e(item)
        where e.item -> 'left' is not null or e.item -> 'right' is not null) then
        raise exception 'GHOST_SIMULATION_EMPTY_REPLAY';
    end if;
    chaser := public.normalize_ghost_combat_snapshot(raw_snapshot || '{"mobilityRange":4,"mobilityCooldownMs":2000,"pursuitMovePct":40}'::jsonb, 1000, measured_ehp);
    kiter := public.normalize_ghost_combat_snapshot(raw_snapshot || '{"style":"projectile","attackRange":5,"positionMode":"keepRange","farshot":true}'::jsonb, 1000, measured_ehp);
    presser := public.normalize_ghost_combat_snapshot(raw_snapshot || '{"style":"spell","attackRange":4,"positionMode":"pressure","moveSpeed":130}'::jsonb, 1000, measured_ehp);
    moving_result := public.simulate_ghost_duel(chaser, kiter, 'ghost-combat-contract-moving');
    if moving_result <> public.simulate_ghost_duel(chaser, kiter, 'ghost-combat-contract-moving') then raise exception 'GHOST_SIMULATION_NOT_DETERMINISTIC'; end if;
    if not exists (select 1 from jsonb_array_elements(moving_result -> 'events') as e(item) where e.item ->> 'dash' = 'left') then
        raise exception 'GHOST_SIMULATION_NO_DASH';
    end if;
    if not exists (select 1 from jsonb_array_elements(moving_result -> 'events') as e(item) where (e.item ->> 'rx')::numeric > 9.5) then
        raise exception 'GHOST_SIMULATION_NO_RETREAT';
    end if;
    perform public.simulate_ghost_duel(kiter, chaser, 'ghost-combat-contract-moving');
    perform public.simulate_ghost_duel(presser, kiter, 'ghost-combat-contract-moving');
    perform public.simulate_ghost_duel(kiter, presser, 'ghost-combat-contract-moving');
    -- 둘 다 쓰러지지 않고 30초를 다 쓰는 대결: 끝 자리를 남기는 줄까지 지난다
    tank := public.normalize_ghost_combat_snapshot(raw_snapshot || '{"directEhpByElement":{"phys":9000000000000000,"fire":9000000000000000,"cold":9000000000000000,"light":9000000000000000,"chaos":9000000000000000}}'::jsonb, 1, measured_ehp);
    perform public.simulate_ghost_duel(tank, tank, 'ghost-combat-contract');
end;
$ghost_combat_contract$;

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
        -- 5: 움직이며 싸우는 대결(simulate_ghost_duel의 arena, 사건의 lx, rx)
        'combatProtocolVersion', 5,
        'underReview', public.ghost_under_review(account_id),   -- 7일 안의 수치 기록: 순위전 점수가 멈춰 있다(2026-10-27)
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

commit;
