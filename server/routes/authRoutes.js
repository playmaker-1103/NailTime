const express = require("express");
const { login, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many sign-in attempts. Please try again in a few minutes."
});

router.post("/login", loginLimiter, login);
router.get("/me", protect, me);

module.exports = router;
