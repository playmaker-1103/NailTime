const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be a positive number"]
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be a positive number"]
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);

