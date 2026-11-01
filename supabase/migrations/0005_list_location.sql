-- 0005: My applications cards show the drive's location.
create or replace function public.list_my_applications() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(a) order by a.applied_at desc), '[]'::json)
    from (
      select c.id as candidate_id,
             d.title as drive_title,
             d.role,
             d.location,
             c.status,
             c.current_round,
             (select r.name from drive_rounds r where r.drive_id = d.id and r.position = c.current_round) as current_round_name,
             (select r.name from drive_rounds r where r.drive_id = d.id and r.position = c.current_round + 1) as next_round_name,
             (select count(*)::int from drive_rounds r where r.drive_id = d.id) as total_rounds,
             c.created_at as applied_at
        from candidates c
        join drives d on d.id = c.drive_id
       where c.user_id = auth.uid()
    ) a;
$$;
