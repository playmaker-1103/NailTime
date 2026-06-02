const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Service = require("../models/Service");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"];

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isPastDate(dateString) {
  const parts = dateString.split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [year, month, day] = parts;
  const appointmentDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return appointmentDate < today;
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
  if (body.appointmentDate && isPastDate(body.appointmentDate)) {
    errors.push("Booking date cannot be in the past");
  }

  return errors;
}

async function getBookings(req, res) {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      if (!bookingStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }

      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("service")
      .sort({ appointmentDate: 1, appointmentTime: 1, createdAt: -1 });

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch bookings" });
  }
}

async function getBookingById(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(req.params.id).populate("service");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking });
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

    if (!isValidId(req.body.service)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const service = await Service.findOne({ _id: req.body.service, isActive: true });

    if (!service) {
      return res.status(404).json({ message: "Active service not found" });
    }

    const booking = await Booking.create({
      service: req.body.service,
      customerName: req.body.customerName.trim(),
      customerEmail: req.body.customerEmail.trim().toLowerCase(),
      customerPhone: req.body.customerPhone.trim(),
      appointmentDate: req.body.appointmentDate,
      appointmentTime: req.body.appointmentTime,
      notes: req.body.notes || ""
    });

    const populatedBooking = await booking.populate("service");

    return res.status(201).json({ booking: populatedBooking });
  } catch (error) {
    return res.status(500).json({ message: "Could not create booking" });
  }
}

async function updateBookingStatus(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!bookingStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: "after", runValidators: true }
    ).populate("service");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: "Could not update booking status" });
  }
}

async function deleteBooking(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
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
  getBookingById,
  getBookings,
  updateBookingStatus
};
