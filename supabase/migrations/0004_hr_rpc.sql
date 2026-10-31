-- 0004_hr_rpc: HR decisions, change requests and onboarding.
-- Transition rules mirror the overview table (and src/lib/pipeline.ts).
-- Candidates that a decision doesn't apply to are skipped and get no message.

create function public.hr_decide(
  p_candidate_ids uuid[],
  p_decision text,
  p_note text default null,
  p_candidate_message text default null
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

  -- ids that matched no row count as skipped too
  v_skipped := v_skipped + (coalesce(cardinality(p_candidate_ids), 0) - v_moved - v_skipped);
  return json_build_object('moved', v_moved, 'skipped', v_skipped);
end;
$$;
revoke all on function public.hr_decide(uuid[], text, text, text) from public, anon;
grant execute on function public.hr_decide(uuid[], text, text, text) to authenticated;

create function public.hr_request_changes(p_candidate_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not is_hr() then
    raise exception 'not_hr';
  end if;
  select status into v_status from candidates where id = p_candidate_id for update;
  if v_status is distinct from 'details_submitted' then
    raise exception 'not_ready';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;

  update joining_details set changes_requested_reason = v_reason where candidate_id = p_candidate_id;
  update candidates set status = 'selected' where id = p_candidate_id;
  perform _write_message(p_candidate_id, 'changes_requested', jsonb_build_object('reason', v_reason));
end;
$$;
revoke all on function public.hr_request_changes(uuid, text) from public, anon;
grant execute on function public.hr_request_changes(uuid, text) to authenticated;

create function public.hr_mark_onboarded(p_candidate_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_date date;
begin
  if not is_hr() then
    raise exception 'not_hr';
  end if;
  select status into v_status from candidates where id = p_candidate_id for update;
  if v_status is distinct from 'details_submitted' then
    raise exception 'not_ready';
  end if;

  select preferred_joining_date into v_date from joining_details where candidate_id = p_candidate_id;
  update candidates set status = 'onboarded' where id = p_candidate_id;
  perform _write_message(p_candidate_id, 'onboarded', jsonb_build_object('joining_date', v_date));
end;
$$;
revoke all on function public.hr_mark_onboarded(uuid) from public, anon;
grant execute on function public.hr_mark_onboarded(uuid) to authenticated;
