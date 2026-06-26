const supabase = require("../config/supabase");
const { mapBooking, mapBookingPayload, normalizeTime } = require("../utils/dbMappers");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"];
const bookingSources = ["online", "phone", "walk_in", "admin_block"];
const activeBookingStatuses = ["pending", "confirmed", "completed"];
const SLOT_INTERVAL_MINUTES = Number(process.env.APPOINTMENT_SLOT_INTERVAL_MINUTES || 15);
const OPENING_TIME = "09:00";
const CLOSING_TIME = "18:00";
const SALON_STAFF_CAPACITY = Number(process.env.SALON_STAFF_CAPACITY || 4);
const BLOCK_EMAIL = "admin@honeynails.local";
const BLOCK_PHONE = "admin-block";

function isValidUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function isValidDateString(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const parts = dateString.split("-").map(Number);
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isPastDate(dateString) {
  if (!isValidDateString(dateString)) {
    return true;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const appointmentDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return appointmentDate < today;
}

function timeToMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function isBookableTimeSlot(time, durationMinutes = SLOT_INTERVAL_MINUTES) {
  const minutes = timeToMinutes(time);
  const openingMinutes = timeToMinutes(OPENING_TIME);
  const closingMinutes = timeToMinutes(CLOSING_TIME);

  return (
    minutes !== null &&
    minutes >= openingMinutes &&
    minutes + durationMinutes <= closingMinutes &&
    minutes % SLOT_INTERVAL_MINUTES === 0
  );
}

function minutesToTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");

  return `${hours}:${mins}`;
}

function generateTimeSlots(durationMinutes = SLOT_INTERVAL_MINUTES) {
  const slots = [];
  const openingMinutes = timeToMinutes(OPENING_TIME);
  const closingMinutes = timeToMinutes(CLOSING_TIME);
  const lastStartMinutes = closingMinutes - durationMinutes;

  for (let minutes = openingMinutes; minutes <= lastStartMinutes; minutes += SLOT_INTERVAL_MINUTES) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    slots.push(`${hours}:${mins}`);
  }

  return slots;
}

function validateBookingInput(body, serviceDurationMinutes = SLOT_INTERVAL_MINUTES, options = {}) {
  const errors = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isBlock = options.source === "admin_block";

  if (!isBlock && !body.service) errors.push("Service is required");
  if (!body.customerName || !body.customerName.trim()) errors.push("Customer name is required");
  if (
    !isBlock &&
    !options.allowMissingEmail &&
    (!body.customerEmail || !emailPattern.test(body.customerEmail))
  ) {
    errors.push("A valid customer email is required");
  }
  if (!isBlock && (!body.customerPhone || !body.customerPhone.trim())) {
    errors.push("Customer phone is required");
  }
  if (!body.appointmentDate) errors.push("Appointment date is required");
  if (!body.appointmentTime) errors.push("Appointment time is required");
  if (options.source && !bookingSources.includes(options.source)) {
    errors.push("Invalid booking source");
  }
  if (options.capacitySlots && Number(options.capacitySlots) > SALON_STAFF_CAPACITY) {
    errors.push(`Capacity slots cannot exceed ${SALON_STAFF_CAPACITY}`);
  }
  if (body.appointmentDate && !isValidDateString(body.appointmentDate)) {
    errors.push("Appointment date must use YYYY-MM-DD format");
  } else if (body.appointmentDate && isPastDate(body.appointmentDate)) {
    errors.push("Booking date cannot be in the past");
  }
  if (body.appointmentTime && !isBookableTimeSlot(body.appointmentTime, serviceDurationMinutes)) {
    errors.push(
      `Appointment time must fit between ${OPENING_TIME} and ${CLOSING_TIME} in ${SLOT_INTERVAL_MINUTES}-minute increments`
    );
  }

  return errors;
}

function getBookingDurationMinutes(booking) {
  return Number(booking.duration_minutes || booking.service?.duration_minutes || SLOT_INTERVAL_MINUTES);
}

function getBookingCapacitySlots(booking) {
  return Number(booking.capacity_slots || 1);
}

function getBookingRange(booking) {
  const startMinutes = timeToMinutes(normalizeTime(booking.appointment_time));

  return {
    endMinutes: startMinutes + getBookingDurationMinutes(booking),
    startMinutes
  };
}

function hasSegmentCapacity(segmentStartMinutes, segmentEndMinutes, activeBookings) {
  const usedCapacity = activeBookings.reduce((total, booking) => {
    const bookingRange = getBookingRange(booking);
    const overlaps =
      bookingRange.startMinutes < segmentEndMinutes && bookingRange.endMinutes > segmentStartMinutes;

    return overlaps ? total + getBookingCapacitySlots(booking) : total;
  }, 0);

  return usedCapacity < SALON_STAFF_CAPACITY;
}

function hasCapacityForService(startTime, serviceDurationMinutes, activeBookings, capacitySlots = 1) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + serviceDurationMinutes;

  for (
    let segmentStart = startMinutes;
    segmentStart < endMinutes;
    segmentStart += SLOT_INTERVAL_MINUTES
  ) {
    const segmentEnd = Math.min(segmentStart + SLOT_INTERVAL_MINUTES, endMinutes);
    const usedCapacity = activeBookings.reduce((total, booking) => {
      const bookingRange = getBookingRange(booking);
      const overlaps = bookingRange.startMinutes < segmentEnd && bookingRange.endMinutes > segmentStart;

      return overlaps ? total + getBookingCapacitySlots(booking) : total;
    }, 0);

    if (usedCapacity + capacitySlots > SALON_STAFF_CAPACITY) {
      return false;
    }
  }

  return true;
}

function getUnavailableTimesForService(allTimes, serviceDurationMinutes, activeBookings) {
  return allTimes.filter((time) => !hasCapacityForService(time, serviceDurationMinutes, activeBookings));
}

async function getActiveBookingsForDate(date) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, appointment_time, status, source, duration_minutes, capacity_slots, service:services(duration_minutes)")
    .eq("appointment_date", date)
    .in("status", activeBookingStatuses);

  if (error) {
    throw error;
  }

  return data;
}

async function fetchBookingWithService(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, service:services(*)")
    .eq("id", bookingId)
    .maybeSingle();

  return { booking: data, error };
}

async function getActiveService(serviceId) {
  if (!isValidUuid(serviceId)) {
    return { service: null, error: null };
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, duration_minutes")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();

  return { service: data, error };
}

async function getAvailability(req, res) {
  try {
    const { date, service: serviceId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    if (!serviceId) {
      return res.status(400).json({ message: "Service is required" });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ message: "Date must use YYYY-MM-DD format" });
    }

    if (isPastDate(date)) {
      return res.status(400).json({ message: "Booking date cannot be in the past" });
    }

    const { service, error: serviceError } = await getActiveService(serviceId);

    if (serviceError) {
      return res.status(500).json({ message: "Could not fetch availability" });
    }

    if (!service) {
      return res.status(404).json({ message: "Active service not found" });
    }

    const serviceDurationMinutes = Number(service.duration_minutes);
    const allTimes = generateTimeSlots(serviceDurationMinutes);
    const activeBookings = await getActiveBookingsForDate(date);
    const unavailableTimes = getUnavailableTimesForService(
      allTimes,
      serviceDurationMinutes,
      activeBookings
    );
    const unavailableSet = new Set(unavailableTimes);
    const availableTimes = allTimes.filter((time) => !unavailableSet.has(time));

    return res.json({
      date,
      bookedTimes: activeBookings.map((booking) => normalizeTime(booking.appointment_time)).sort(),
      availableTimes,
      closingTime: CLOSING_TIME,
      slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
      salonCapacity: SALON_STAFF_CAPACITY,
      serviceDurationMinutes,
      openingTime: OPENING_TIME,
      unavailableTimes,
      notice:
        "Available times account for the selected service duration and the 4-person salon capacity."
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch availability" });
  }
}

function buildRpcPayload(body, options) {
  return {
    p_service_id: body.service || null,
    p_customer_name: body.customerName,
    p_customer_email: body.customerEmail,
    p_customer_phone: body.customerPhone,
    p_appointment_date: body.appointmentDate,
    p_appointment_time: body.appointmentTime,
    p_notes: body.notes || "",
    p_status: options.status || "confirmed",
    p_source: options.source || "online",
    p_duration_minutes: options.durationMinutes || null,
    p_capacity_slots: options.capacitySlots || 1,
    p_salon_capacity: SALON_STAFF_CAPACITY
  };
}

async function createBookingWithCapacity(body, options = {}) {
  const { data: createdBooking, error: rpcError } = await supabase.rpc(
    "create_booking_with_capacity",
    buildRpcPayload(body, options)
  );

  if (rpcError) {
    throw rpcError;
  }

  return fetchBookingWithService(createdBooking.id);
}

async function getBookings(req, res) {
  try {
    const { date, source, status } = req.query;
    if (status) {
      if (!bookingStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }
    }
    if (source && !bookingSources.includes(source)) {
      return res.status(400).json({ message: "Invalid booking source" });
    }
    if (date && !isValidDateString(date)) {
      return res.status(400).json({ message: "Date must use YYYY-MM-DD format" });
    }

    let query = supabase
      .from("bookings")
      .select("*, service:services(*)")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (source) {
      query = query.eq("source", source);
    }
    if (date) {
      query = query.eq("appointment_date", date);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: "Could not fetch bookings" });
    }

    return res.json({ bookings: data.map(mapBooking) });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch bookings" });
  }
}

async function getBookingById(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not fetch booking" });
    }

    if (!data) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking: mapBooking(data) });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch booking" });
  }
}

async function createBooking(req, res) {
  try {
    if (!isValidUuid(req.body.service)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { service, error: serviceError } = await getActiveService(req.body.service);

    if (serviceError) {
      return res.status(500).json({ message: "Could not create booking" });
    }

    if (!service) {
      return res.status(404).json({ message: "Active service not found" });
    }

    const serviceDurationMinutes = Number(service.duration_minutes);
    const errors = validateBookingInput(req.body, serviceDurationMinutes);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    const { booking, error: bookingError } = await createBookingWithCapacity(req.body, {
      durationMinutes: serviceDurationMinutes,
      source: "online"
    });

    if (bookingError) {
      if (bookingError.code === "23505") {
        return res.status(409).json({
          message:
            "The salon is fully booked for this service at that time. Please choose another time."
        });
      }

      return res.status(500).json({ message: "Could not create booking" });
    }

    return res.status(201).json({ booking: mapBooking(booking) });
  } catch (error) {
    if (error.code === "23505" || error.message === "booking_capacity_exceeded") {
      return res.status(409).json({
        message:
          "The salon is fully booked for this service at that time. Please choose another time."
      });
    }

    return res.status(500).json({ message: "Could not create booking" });
  }
}

async function createAdminBooking(req, res) {
  try {
    const source = req.body.source || "phone";
    const isBlock = source === "admin_block";

    if (!bookingSources.includes(source) || source === "online") {
      return res.status(400).json({ message: "Admin booking source must be phone, walk_in, or admin_block" });
    }

    let service = null;
    let serviceDurationMinutes = Number(req.body.durationMinutes || SLOT_INTERVAL_MINUTES);

    if (!isBlock) {
      if (!isValidUuid(req.body.service)) {
        return res.status(400).json({ message: "Invalid service id" });
      }

      const result = await getActiveService(req.body.service);
      service = result.service;

      if (result.error) {
        return res.status(500).json({ message: "Could not create booking" });
      }

      if (!service) {
        return res.status(404).json({ message: "Active service not found" });
      }

      serviceDurationMinutes = Number(service.duration_minutes);
    }

    const capacitySlots = isBlock
      ? Number(req.body.capacitySlots || SALON_STAFF_CAPACITY)
      : Number(req.body.capacitySlots || 1);
    const body = {
      ...req.body,
      customerName: isBlock ? req.body.customerName || "Blocked time" : req.body.customerName,
      customerEmail: isBlock ? BLOCK_EMAIL : req.body.customerEmail || "no-email@honeynails.local",
      customerPhone: isBlock ? BLOCK_PHONE : req.body.customerPhone,
      service: isBlock ? null : req.body.service
    };
    const errors = validateBookingInput(body, serviceDurationMinutes, {
      allowMissingEmail: true,
      capacitySlots,
      source
    });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    const { booking, error: bookingError } = await createBookingWithCapacity(body, {
      capacitySlots,
      durationMinutes: serviceDurationMinutes,
      source
    });

    if (bookingError) {
      if (bookingError.code === "23505") {
        return res.status(409).json({
          message: "The salon is fully booked for this time. Choose another slot or reduce blocked capacity."
        });
      }

      return res.status(500).json({ message: "Could not create booking" });
    }

    return res.status(201).json({ booking: mapBooking(booking) });
  } catch (error) {
    if (error.code === "23505" || error.message === "booking_capacity_exceeded") {
      return res.status(409).json({
        message: "The salon is fully booked for this time. Choose another slot or reduce blocked capacity."
      });
    }

    return res.status(500).json({ message: "Could not create booking" });
  }
}

async function getDaySchedule(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ message: "Date must use YYYY-MM-DD format" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .eq("appointment_date", date)
      .in("status", activeBookingStatuses)
      .order("appointment_time", { ascending: true });

    if (error) {
      return res.status(500).json({ message: "Could not fetch schedule" });
    }

    const openingMinutes = timeToMinutes(OPENING_TIME);
    const closingMinutes = timeToMinutes(CLOSING_TIME);
    const rows = [];

    for (let minutes = openingMinutes; minutes < closingMinutes; minutes += SLOT_INTERVAL_MINUTES) {
      const segmentEnd = minutes + SLOT_INTERVAL_MINUTES;
      const overlapping = data.filter((booking) => {
        const bookingRange = getBookingRange(booking);

        return bookingRange.startMinutes < segmentEnd && bookingRange.endMinutes > minutes;
      });
      const usedCapacity = overlapping.reduce(
        (total, booking) => total + getBookingCapacitySlots(booking),
        0
      );

      rows.push({
        time: minutesToTime(minutes),
        usedCapacity,
        remainingCapacity: Math.max(SALON_STAFF_CAPACITY - usedCapacity, 0),
        bookings: overlapping.map(mapBooking)
      });
    }

    return res.json({
      date,
      openingTime: OPENING_TIME,
      closingTime: CLOSING_TIME,
      salonCapacity: SALON_STAFF_CAPACITY,
      slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
      rows
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch schedule" });
  }
}

async function updateBookingStatus(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!bookingStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const { data: existingBooking, error: existingError } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ message: "Could not update booking status" });
    }

    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      activeBookingStatuses.includes(req.body.status) &&
      !activeBookingStatuses.includes(existingBooking.status)
    ) {
      const activeBookings = (await getActiveBookingsForDate(existingBooking.appointment_date)).filter(
        (booking) => booking.id !== existingBooking.id
      );
      const hasCapacity = hasCapacityForService(
        normalizeTime(existingBooking.appointment_time),
        getBookingDurationMinutes(existingBooking),
        activeBookings,
        getBookingCapacitySlots(existingBooking)
      );

      if (!hasCapacity) {
        return res.status(409).json({
          message: "The salon is fully booked for this appointment time."
        });
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: req.body.status })
      .eq("id", req.params.id)
      .select("*, service:services(*)")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not update booking status" });
    }

    if (!data) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking: mapBooking(data) });
  } catch (error) {
    return res.status(500).json({ message: "Could not update booking status" });
  }
}

async function deleteBooking(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not delete booking" });
    }

    if (!data) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ message: "Booking deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete booking" });
  }
}

module.exports = {
  bookingSources,
  bookingStatuses,
  createAdminBooking,
  createBooking,
  deleteBooking,
  getAvailability,
  getBookingById,
  getBookings,
  getDaySchedule,
  generateTimeSlots,
  hasCapacityForService,
  isBookableTimeSlot,
  updateBookingStatus
};
