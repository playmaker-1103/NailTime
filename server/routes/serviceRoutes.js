const express = require("express");
const {
  createService,
  deleteService,
  getServiceById,
  getServices,
  updateService
} = require("../controllers/serviceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function protectInactiveList(req, res, next) {
  if (req.query.includeInactive === "true") {
    return protect(req, res, next);
  }

  return next();
}

router.get("/", protectInactiveList, getServices);
router.get("/:id", getServiceById);
router.post("/", protect, createService);
router.put("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);

module.exports = router;
