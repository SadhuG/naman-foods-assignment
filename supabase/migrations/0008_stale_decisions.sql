-- hr_decide takes what HR saw for each candidate (p_expected: {"<id>": {"round": n, "status": "…"}}).
-- A candidate whose round or status has changed since (another HR person decided first, or
-- the page was stale) is skipped instead of being moved a second time. Callers that pass
-- nothing (seed script) keep the old behaviour.

drop function if exists public.hr_decide(uuid[], text, text, text);

create or replace function public.hr_decide(
  p_candidate_ids uuid[],
  p_decision text,
  p_note text default null,
  p_candidate_message text default null,
  p_expected jsonb default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_message text := nullif(btrim(coalesce(p_candidate_message, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_moved int := 0;
  v_skipped int := 0;
  c record;
  v_total int;
  v_round_name text;
  v_next_name text;
  v_new_status text;
  v_new_round int;
  v_template text;
  v_seen jsonb;
begin
  if not is_hr() then
    raise exception 'not_hr';
  end if;
  if p_decision not in ('approved', 'on_hold', 'rejected', 'reopened') then
    raise exception 'invalid_decision';
  end if;

  for c in
    select * from candidates
     where id = any (coalesce(p_candidate_ids, '{}'))
     order by id
     for update
  loop
    -- Stale view: HR saw a different round or status than the row has now.
    v_seen := p_expected -> (c.id::text);
    if v_seen is not null and (
         (v_seen ? 'round' and (v_seen ->> 'round')::int is distinct from c.current_round)
      or (v_seen ? 'status' and (v_seen ->> 'status') is distinct from c.status)
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select count(*)::int into v_total from drive_rounds where drive_id = c.drive_id;
    select name into v_round_name from drive_rounds where drive_id = c.drive_id and position = c.current_round;
    v_new_status := null;
    v_new_round := c.current_round;
    v_next_name := null;

    if p_decision = 'approved' and c.status in ('active', 'on_hold') then
      if c.current_round < v_total then
        v_new_status := 'active';
        v_new_round := c.current_round + 1;
        v_template := 'moved_to_round';
        select name into v_next_name from drive_rounds where drive_id = c.drive_id and position = v_new_round;
      else
        v_new_status := 'selected';
        v_template := 'selected';
      end if;
    elsif p_decision = 'on_hold' and c.status = 'active' then
      v_new_status := 'on_hold';
      v_template := 'on_hold';
    elsif p_decision = 'rejected' and c.status in ('active', 'on_hold') then
      v_new_status := 'rejected';
      v_template := 'rejected';
    elsif p_decision = 'reopened' and c.status = 'rejected' then
      v_new_status := 'active';
      v_template := 'reopened';
    end if;

    if v_new_status is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into round_decisions (candidate_id, round_position, round_name, decision, note, candidate_message, decided_by)
    values (c.id, c.current_round, coalesce(v_round_name, 'Round ' || c.current_round), p_decision, v_note, v_message, auth.uid());

    update candidates set status = v_new_status, current_round = v_new_round where id = c.id;

    -- Only the candidate-facing message goes into params; the note never does.
    perform _write_message(c.id, v_template, jsonb_build_object(
      'round_name', v_round_name,
      'next_round_name', v_next_name,
      'hr_message', v_message
    ));
    v_moved := v_moved + 1;
  end loop;

  -- ids that matched no row count as skipped too (each id once)
  v_skipped := v_skipped + ((select count(distinct x)::int from unnest(coalesce(p_candidate_ids, '{}')) x) - v_moved - v_skipped);
  return json_build_object('moved', v_moved, 'skipped', v_skipped);
end;
$$;

revoke all on function public.hr_decide(uuid[], text, text, text, jsonb) from public, anon;
grant execute on function public.hr_decide(uuid[], text, text, text, jsonb) to authenticated;
