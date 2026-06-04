drop index if exists bookings_active_slot_unique;

create index if not exists bookings_active_slot_lookup
on bookings (appointment_date, appointment_time)
where status in ('pending', 'confirmed', 'completed');
