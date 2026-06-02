const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service is required"]
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
      trim: true,
      lowercase: true
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true
    },
    appointmentDate: {
      type: String,
      required: [true, "Appointment date is required"]
    },
    appointmentTime: {
      type: String,
      required: [true, "Appointment time is required"]
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);

