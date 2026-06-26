function mapService(service) {
  if (!service) return null;

  return {
    _id: service.id,
    id: service.id,
    name: service.name,
    description: service.description || "",
    durationMinutes: service.duration_minutes,
    price: Number(service.price),
    isActive: service.is_active,
    createdAt: service.created_at,
    updatedAt: service.updated_at
  };
}

function normalizeTime(time) {
  if (!time) return time;

  return String(time).slice(0, 5);
}

function mapBooking(booking) {
  if (!booking) return null;

  return {
    _id: booking.id,
    id: booking.id,
    service: mapService(booking.service),
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    appointmentDate: booking.appointment_date,
    appointmentTime: normalizeTime(booking.appointment_time),
    source: booking.source || "online",
    durationMinutes: booking.duration_minutes || booking.service?.duration_minutes || null,
    capacitySlots: booking.capacity_slots || 1,
    isBlock: booking.source === "admin_block",
    notes: booking.notes || "",
    status: booking.status,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  };
}

function mapServicePayload(body) {
  return {
    name: body.name.trim(),
    description: body.description || "",
    duration_minutes: Number(body.durationMinutes),
    price: Number(body.price),
    is_active: body.isActive ?? true
  };
}

function mapBookingPayload(body) {
  return {
    service_id: body.service,
    customer_name: body.customerName.trim(),
    customer_email: body.customerEmail.trim().toLowerCase(),
    customer_phone: body.customerPhone.trim(),
    appointment_date: body.appointmentDate,
    appointment_time: body.appointmentTime,
    notes: body.notes || "",
    source: body.source || "online",
    duration_minutes: body.durationMinutes ? Number(body.durationMinutes) : undefined,
    capacity_slots: body.capacitySlots ? Number(body.capacitySlots) : 1
  };
}

module.exports = {
  mapBooking,
  mapBookingPayload,
  mapService,
  mapServicePayload,
  normalizeTime
};
