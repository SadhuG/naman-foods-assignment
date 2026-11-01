-- 0006: create or edit a drive and its rounds in one transaction.
-- Once a drive has candidates its rounds can be renamed but not added,
-- removed or reordered (round positions are stored on candidates).

create function public.hr_save_drive(
  p_drive_id uuid,
  p_slug text,
  p_title text,
  p_role text,
  p_location text,
  p_openings int,
  p_description text,
  p_status text,
  p_rounds text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_drive_id;
  v_locked boolean;
  v_existing int;
  v_n int := coalesce(cardinality(p_rounds), 0);
  i int;
begin
  if not is_hr() then
    raise exception 'not_hr';
  end if;
  if v_n < 1 or v_n > 8 then
    raise exception 'invalid_rounds';
  end if;
  if exists (select 1 from unnest(p_rounds) r where btrim(coalesce(r, '')) = '')
     or (select count(distinct lower(btrim(r))) from unnest(p_rounds) r) <> v_n then
    raise exception 'invalid_rounds';
  end if;

  if v_id is null then
    insert into drives (slug, title, role, location, openings, description, status)
    values (p_slug, btrim(p_title), btrim(p_role), btrim(p_location), p_openings,
            btrim(coalesce(p_description, '')), coalesce(p_status, 'open'))
    returning id into v_id;
    insert into drive_rounds (drive_id, position, name)
    select v_id, o, btrim(r) from unnest(p_rounds) with ordinality as t(r, o);
    return v_id;
  end if;

  update drives set
    title = btrim(p_title),
    role = btrim(p_role),
    location = btrim(p_location),
    openings = p_openings,
    description = btrim(coalesce(p_description, '')),
    status = coalesce(p_status, status)
  where id = v_id;
  if not found then
    raise exception 'drive_not_found';
  end if;

  v_locked := exists (select 1 from candidates where drive_id = v_id);
  select count(*)::int into v_existing from drive_rounds where drive_id = v_id;

  if v_locked then
    if v_existing <> v_n then
      raise exception 'rounds_locked';
    end if;
    -- rename in place; positions keep their meaning
    for i in 1..v_n loop
      update drive_rounds set name = btrim(p_rounds[i]) where drive_id = v_id and position = i;
    end loop;
  else
    delete from drive_rounds where drive_id = v_id;
    insert into drive_rounds (drive_id, position, name)
    select v_id, o, btrim(r) from unnest(p_rounds) with ordinality as t(r, o);
  end if;
  return v_id;
end;
$$;
revoke all on function public.hr_save_drive(uuid, text, text, text, text, int, text, text, text[]) from public, anon;
grant execute on function public.hr_save_drive(uuid, text, text, text, text, int, text, text, text[]) to authenticated;
