alter table bookings
add column if not exists source text not null default 'online',
add column if not exists duration_minutes integer,
add column if not exists capacity_slots integer not null default 1;

update bookings
set duration_minutes = coalesce(
  duration_minutes,
  (
    select services.duration_minutes
    from services
    where services.id = bookings.service_id
  ),
  15
);

alter table bookings
alter column duration_minutes set not null;

alter table bookings
drop constraint if exists bookings_source_check;

alter table bookings
add constraint bookings_source_check
check (source in ('online', 'phone', 'walk_in', 'admin_block'));

alter table bookings
drop constraint if exists bookings_duration_minutes_check;

alter table bookings
add constraint bookings_duration_minutes_check
check (duration_minutes > 0);

alter table bookings
drop constraint if exists bookings_capacity_slots_check;

alter table bookings
add constraint bookings_capacity_slots_check
check (capacity_slots > 0);

create index if not exists bookings_active_range_lookup
on bookings (appointment_date, appointment_time, duration_minutes)
where status in ('pending', 'confirmed', 'completed');

create or replace function create_booking_with_capacity(
  p_service_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_appointment_date date,
  p_appointment_time time,
  p_notes text,
  p_status text default 'confirmed',
  p_source text default 'online',
  p_duration_minutes integer default null,
  p_capacity_slots integer default 1,
  p_salon_capacity integer default 4
)
returns bookings
language plpgsql
as $$
declare
  v_duration_minutes integer;
  v_start_minutes integer;
  v_end_minutes integer;
  v_segment_start integer;
  v_segment_end integer;
  v_used_capacity integer;
  v_booking bookings;
begin
  perform pg_advisory_xact_lock(hashtext(p_appointment_date::text));

  if p_status not in ('pending', 'confirmed', 'cancelled', 'completed') then
    raise exception 'invalid_booking_status' using errcode = '22023';
  end if;

  if p_source not in ('online', 'phone', 'walk_in', 'admin_block') then
    raise exception 'invalid_booking_source' using errcode = '22023';
  end if;

  if p_capacity_slots < 1 then
    raise exception 'invalid_capacity_slots' using errcode = '22023';
  end if;

  if p_service_id is not null then
    select services.duration_minutes
    into v_duration_minutes
    from services
    where services.id = p_service_id
      and services.is_active = true;

    if v_duration_minutes is null then
      raise exception 'active_service_not_found' using errcode = '22023';
    end if;
  end if;

  v_duration_minutes := coalesce(p_duration_minutes, v_duration_minutes);

  if v_duration_minutes is null or v_duration_minutes < 1 then
    raise exception 'invalid_duration_minutes' using errcode = '22023';
  end if;

  v_start_minutes := extract(hour from p_appointment_time)::integer * 60
    + extract(minute from p_appointment_time)::integer;
  v_end_minutes := v_start_minutes + v_duration_minutes;

  if p_status in ('pending', 'confirmed', 'completed') then
    v_segment_start := v_start_minutes;

    while v_segment_start < v_end_minutes loop
      v_segment_end := least(v_segment_start + 15, v_end_minutes);

      select coalesce(sum(capacity_slots), 0)
      into v_used_capacity
      from bookings
      where appointment_date = p_appointment_date
        and status in ('pending', 'confirmed', 'completed')
        and (
          extract(hour from appointment_time)::integer * 60
          + extract(minute from appointment_time)::integer
        ) < v_segment_end
        and (
          extract(hour from appointment_time)::integer * 60
          + extract(minute from appointment_time)::integer
          + duration_minutes
        ) > v_segment_start;

      if v_used_capacity + p_capacity_slots > p_salon_capacity then
        raise exception 'booking_capacity_exceeded' using errcode = '23505';
      end if;

      v_segment_start := v_segment_start + 15;
    end loop;
  end if;

  insert into bookings (
    service_id,
    customer_name,
    customer_email,
    customer_phone,
    appointment_date,
    appointment_time,
    notes,
    status,
    source,
    duration_minutes,
    capacity_slots
  )
  values (
    p_service_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    trim(p_customer_phone),
    p_appointment_date,
    p_appointment_time,
    coalesce(p_notes, ''),
    p_status,
    p_source,
    v_duration_minutes,
    p_capacity_slots
  )
  returning * into v_booking;

  return v_booking;
end;
$$;
