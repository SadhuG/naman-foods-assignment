-- 0003_candidate_rpc: what candidates (and logged-out visitors) can do.
-- Every function is security definer with a pinned search_path and checks
-- ownership itself, because candidates have no direct write access.

-- Shared: write one mock message, snapshotting the params the template needs.
-- Never exposed to clients.
create function public._write_message(p_candidate_id uuid, p_template text, p_extra jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_params jsonb;
begin
  select jsonb_build_object(
           'candidate_name', c.full_name,
           'drive_title', d.title,
           'company', 'Naman Foods'
         ) || coalesce(p_extra, '{}'::jsonb)
    into v_params
    from candidates c
    join drives d on d.id = c.drive_id
   where c.id = p_candidate_id;

  insert into messages (candidate_id, template, params)
  values (p_candidate_id, p_template, jsonb_strip_nulls(v_params));
end;
$$;
revoke all on function public._write_message(uuid, text, jsonb) from public, anon, authenticated;

-- Indian mobile numbers typed loosely: "+91 98110-22345", "098110 22345".
create function public._normalize_phone(p_phone text) returns text
language sql immutable set search_path = public as $$
  select case
    when length(d) = 12 and left(d, 2) = '91' then right(d, 10)
    when length(d) = 11 and left(d, 1) = '0' then right(d, 10)
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) s;
$$;

create function public.get_public_drive(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
           'title', d.title,
           'role', d.role,
           'location', d.location,
           'description', d.description,
           'status', d.status,
           'openings', d.openings,
           'rounds', coalesce(
             (select json_agg(json_build_object('position', r.position, 'name', r.name) order by r.position)
                from drive_rounds r where r.drive_id = d.id),
             '[]'::json)
         )
    from drives d
   where d.slug = p_slug;
$$;
revoke all on function public.get_public_drive(text) from public;
grant execute on function public.get_public_drive(text) to anon, authenticated;

create function public.apply_to_drive(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_city text,
  p_qualification text,
  p_experience_years numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_drive drives%rowtype;
  v_email text := lower(auth.jwt() ->> 'email');
  v_id uuid;
begin
  if auth.uid() is null or v_email is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_drive from drives where slug = p_slug;
  if not found then
    raise exception 'drive_not_found';
  end if;
  if v_drive.status <> 'open' then
    raise exception 'drive_closed';
  end if;

  begin
    insert into candidates (drive_id, user_id, full_name, email, phone, city, qualification, experience_years)
    values (
      v_drive.id, auth.uid(), btrim(p_full_name), v_email, _normalize_phone(p_phone),
      btrim(p_city), btrim(p_qualification), coalesce(p_experience_years, 0)
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_applied';
  end;

  perform _write_message(v_id, 'application_received',
    jsonb_build_object('round_name', (select name from drive_rounds where drive_id = v_drive.id and position = 1)));
  return v_id;
end;
$$;
revoke all on function public.apply_to_drive(text, text, text, text, text, numeric) from public, anon;
grant execute on function public.apply_to_drive(text, text, text, text, text, numeric) to authenticated;

create function public.list_my_applications() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(a) order by a.applied_at desc), '[]'::json)
    from (
      select c.id as candidate_id,
             d.title as drive_title,
             d.role,
             c.status,
             c.current_round,
             (select r.name from drive_rounds r where r.drive_id = d.id and r.position = c.current_round) as current_round_name,
             (select count(*)::int from drive_rounds r where r.drive_id = d.id) as total_rounds,
             c.created_at as applied_at
        from candidates c
        join drives d on d.id = c.drive_id
       where c.user_id = auth.uid()
    ) a;
$$;
revoke all on function public.list_my_applications() from public, anon;
grant execute on function public.list_my_applications() to authenticated;

create function public.get_my_application(p_candidate_id uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_result json;
begin
  select json_build_object(
           'candidate_id', c.id,
           'full_name', c.full_name,
           'status', c.status,
           'current_round', c.current_round,
           'applied_at', c.created_at,
           'drive', json_build_object('title', d.title, 'role', d.role, 'location', d.location),
           'rounds', coalesce(
             (select json_agg(json_build_object('position', r.position, 'name', r.name) order by r.position)
                from drive_rounds r where r.drive_id = d.id), '[]'::json),
           -- HR notes (round_decisions.note) are deliberately left out.
           'timeline', coalesce(
             (select json_agg(json_build_object(
                       'round_position', rd.round_position,
                       'round_name', rd.round_name,
                       'decision', rd.decision,
                       'candidate_message', rd.candidate_message,
                       'decided_at', rd.decided_at) order by rd.decided_at)
                from round_decisions rd where rd.candidate_id = c.id), '[]'::json),
           'joining_details', (select row_to_json(j) from joining_details j where j.candidate_id = c.id)
         )
    into v_result
    from candidates c
    join drives d on d.id = c.drive_id
   where c.id = p_candidate_id
     and c.user_id = auth.uid();

  if v_result is null then
    raise exception 'application_not_found';
  end if;
  return v_result;
end;
$$;
revoke all on function public.get_my_application(uuid) from public, anon;
grant execute on function public.get_my_application(uuid) to authenticated;

create function public.submit_joining_details(p_candidate_id uuid, p_details json) returns void
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
revoke all on function public.submit_joining_details(uuid, json) from public, anon;
grant execute on function public.submit_joining_details(uuid, json) to authenticated;
