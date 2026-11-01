-- 0007: review fixes.
-- 1. One application per account per drive, even if the account's email changes.
-- 2. submit_joining_details enforces the age and joining-date rules server-side.
-- 3. hr_decide counts each id once when reporting skipped candidates.

create unique index candidates_drive_user_key on public.candidates (drive_id, user_id)
  where user_id is not null;

create or replace function public.submit_joining_details(p_candidate_id uuid, p_details json) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  d jsonb := p_details::jsonb;
begin
  select status into v_status
    from candidates
   where id = p_candidate_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_status not in ('selected', 'details_submitted') then
    raise exception 'not_selected';
  end if;

  -- Same rules as the form (src/lib/schemas.ts), enforced here too.
  if (d ->> 'date_of_birth')::date > (current_date - interval '18 years')
     or (d ->> 'date_of_birth')::date <= (current_date - interval '66 years') then
    raise exception 'invalid_date_of_birth';
  end if;
  if (d ->> 'preferred_joining_date')::date < current_date
     or (d ->> 'preferred_joining_date')::date > current_date + 90 then
    raise exception 'invalid_joining_date';
  end if;

  insert into joining_details as j (
    candidate_id, date_of_birth, aadhaar_number, pan_number, uan_number,
    bank_account_holder, bank_account_number, bank_ifsc, address,
    emergency_contact_name, emergency_contact_phone, preferred_joining_date,
    submitted_at, changes_requested_reason
  ) values (
    p_candidate_id,
    (d ->> 'date_of_birth')::date,
    d ->> 'aadhaar_number',
    d ->> 'pan_number',
    nullif(d ->> 'uan_number', ''),
    btrim(d ->> 'bank_account_holder'),
    d ->> 'bank_account_number',
    d ->> 'bank_ifsc',
    btrim(d ->> 'address'),
    btrim(d ->> 'emergency_contact_name'),
    _normalize_phone(d ->> 'emergency_contact_phone'),
    (d ->> 'preferred_joining_date')::date,
    now(),
    null
  )
  on conflict (candidate_id) do update set
    date_of_birth = excluded.date_of_birth,
    aadhaar_number = excluded.aadhaar_number,
    pan_number = excluded.pan_number,
    uan_number = excluded.uan_number,
    bank_account_holder = excluded.bank_account_holder,
    bank_account_number = excluded.bank_account_number,
    bank_ifsc = excluded.bank_ifsc,
    address = excluded.address,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    preferred_joining_date = excluded.preferred_joining_date,
    submitted_at = now(),
    changes_requested_reason = null;

  update candidates set status = 'details_submitted' where id = p_candidate_id;

  perform _write_message(p_candidate_id, 'details_received',
    jsonb_build_object('joining_date', d ->> 'preferred_joining_date'));
end;
$$;

create or replace function public.hr_decide(
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

  -- ids that matched no row count as skipped too (each id once)
  v_skipped := v_skipped + ((select count(distinct x)::int from unnest(coalesce(p_candidate_ids, '{}')) x) - v_moved - v_skipped);
  return json_build_object('moved', v_moved, 'skipped', v_skipped);
end;
$$;
