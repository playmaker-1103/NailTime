require("dotenv").config();

const connectDB = require("./config/db");
const Service = require("./models/Service");

const sampleServices = [
  {
    name: "Classic Manicure",
    description: "Nail shaping, cuticle care, hand massage, and regular polish.",
    durationMinutes: 35,
    price: 28
  },
  {
    name: "Gel Manicure",
    description: "Glossy gel polish with nail prep, shaping, and a long-lasting finish.",
    durationMinutes: 50,
    price: 42
  },
  {
    name: "Acrylic Full Set",
    description: "Full acrylic extensions shaped and polished to your preferred style.",
    durationMinutes: 90,
    price: 68
  },
  {
    name: "Nail Art",
    description: "Custom accent designs, chrome details, gems, or hand-painted art.",
    durationMinutes: 30,
    price: 22
  },
  {
    name: "Pedicure",
    description: "Foot soak, nail shaping, cuticle care, exfoliation, massage, and polish.",
    durationMinutes: 55,
    price: 48
  },
  {
    name: "Gel Removal",
    description: "Gentle gel polish removal with buffing and nail strengthening oil.",
    durationMinutes: 25,
    price: 18
  }
];

async function seed() {
  try {
    await connectDB();
    const existingCount = await Service.countDocuments();

    if (existingCount > 0) {
      console.log("Services already exist. Seed skipped.");
      process.exit(0);
    }

    await Service.insertMany(sampleServices);
    console.log("Sample services created.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

seed();

