const supabase = require("../config/supabase");
const { mapBooking, mapBookingPayload, normalizeTime } = require("../utils/dbMappers");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"];
const SLOT_INTERVAL_MINUTES = 5;
const OPENING_TIME = "09:00";
const CLOSING_TIME = "18:00";

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

function isBookableTimeSlot(time) {
  const minutes = timeToMinutes(time);
  const openingMinutes = timeToMinutes(OPENING_TIME);
  const closingMinutes = timeToMinutes(CLOSING_TIME);

  return (
    minutes !== null &&
    minutes >= openingMinutes &&
    minutes <= closingMinutes &&
    minutes % SLOT_INTERVAL_MINUTES === 0
  );
}

function generateTimeSlots() {
  const slots = [];
  const openingMinutes = timeToMinutes(OPENING_TIME);
  const closingMinutes = timeToMinutes(CLOSING_TIME);

  for (let minutes = openingMinutes; minutes <= closingMinutes; minutes += SLOT_INTERVAL_MINUTES) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    slots.push(`${hours}:${mins}`);
  }

  return slots;
}

function validateBookingInput(body) {
  const errors = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!body.service) errors.push("Service is required");
  if (!body.customerName || !body.customerName.trim()) errors.push("Customer name is required");
  if (!body.customerEmail || !emailPattern.test(body.customerEmail)) {
    errors.push("A valid customer email is required");
  }
  if (!body.customerPhone || !body.customerPhone.trim()) errors.push("Customer phone is required");
  if (!body.appointmentDate) errors.push("Appointment date is required");
  if (!body.appointmentTime) errors.push("Appointment time is required");
  if (body.appointmentDate && !isValidDateString(body.appointmentDate)) {
    errors.push("Appointment date must use YYYY-MM-DD format");
  } else if (body.appointmentDate && isPastDate(body.appointmentDate)) {
    errors.push("Booking date cannot be in the past");
  }
  if (body.appointmentTime && !isBookableTimeSlot(body.appointmentTime)) {
    errors.push(
      `Appointment time must be between ${OPENING_TIME} and ${CLOSING_TIME} in ${SLOT_INTERVAL_MINUTES}-minute increments`
    );
  }

  return errors;
}

async function getBookedTimesForDate(date) {
  const { data, error } = await supabase
    .from("bookings")
    .select("appointment_time")
    .eq("appointment_date", date)
    .neq("status", "cancelled");

  if (error) {
    throw error;
  }

  return data.map((booking) => normalizeTime(booking.appointment_time)).sort();
}

async function getAvailability(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ message: "Date must use YYYY-MM-DD format" });
    }

    if (isPastDate(date)) {
      return res.status(400).json({ message: "Booking date cannot be in the past" });
    }

    const allTimes = generateTimeSlots();
    const bookedTimes = await getBookedTimesForDate(date);
    const bookedSet = new Set(bookedTimes);
    const availableTimes = allTimes.filter((time) => !bookedSet.has(time));

    return res.json({
      date,
      slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
      openingTime: OPENING_TIME,
      closingTime: CLOSING_TIME,
      bookedTimes,
      availableTimes,
      notice:
        "Available appointments are listed every 5 minutes. Times already booked are hidden."
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch availability" });
  }
}

async function getBookings(req, res) {
  try {
    const { status } = req.query;
    if (status) {
      if (!bookingStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }
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
    const errors = validateBookingInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    if (!isValidUuid(req.body.service)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", req.body.service)
      .eq("is_active", true)
      .maybeSingle();

    if (serviceError) {
      return res.status(500).json({ message: "Could not create booking" });
    }

    if (!service) {
      return res.status(404).json({ message: "Active service not found" });
    }

    const { data: existingBooking, error: existingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("appointment_date", req.body.appointmentDate)
      .eq("appointment_time", req.body.appointmentTime)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ message: "Could not create booking" });
    }

    if (existingBooking) {
      return res.status(409).json({
        message: "This appointment time is already booked. Please choose another time."
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(mapBookingPayload(req.body))
      .select("*, service:services(*)")
      .single();

    if (bookingError) {
      if (bookingError.code === "23505") {
        return res.status(409).json({
          message: "This appointment time is already booked. Please choose another time."
        });
      }

      return res.status(500).json({ message: "Could not create booking" });
    }

    return res.status(201).json({ booking: mapBooking(booking) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "This appointment time is already booked. Please choose another time."
      });
    }

    return res.status(500).json({ message: "Could not create booking" });
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
  bookingStatuses,
  createBooking,
  deleteBooking,
  getAvailability,
  getBookingById,
  getBookings,
  generateTimeSlots,
  isBookableTimeSlot,
  updateBookingStatus
};
