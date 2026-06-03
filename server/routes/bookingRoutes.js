const express = require("express");
const {
  createBooking,
  deleteBooking,
  getAvailability,
  getBookingById,
  getBookings,
  updateBookingStatus
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const bookingRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many booking requests. Please wait a few minutes and try again."
});

router.get("/", protect, getBookings);
router.get("/availability", getAvailability);
router.get("/:id", protect, getBookingById);
router.post("/", bookingRequestLimiter, createBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.delete("/:id", protect, deleteBooking);

module.exports = router;
