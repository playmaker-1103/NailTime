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

const router = express.Router();

router.get("/", protect, getBookings);
router.get("/availability", getAvailability);
router.get("/:id", protect, getBookingById);
router.post("/", createBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.delete("/:id", protect, deleteBooking);

module.exports = router;
