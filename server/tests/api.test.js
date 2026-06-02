process.env.ADMIN_EMAIL = "admin@example.com";
process.env.ADMIN_PASSWORD = "password123";
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:5173";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../app");
const Booking = require("../models/Booking");
const Service = require("../models/Service");

let mongoServer;

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

async function getAdminToken() {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "password123" });

  return response.body.token;
}

async function createSampleService() {
  return Service.create({
    name: "Gel Manicure",
    description: "Long-lasting gel polish.",
    durationMinutes: 50,
    price: 42
  });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Booking.deleteMany({});
  await Service.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("admin can log in and read their profile", async () => {
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "password123" });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.token).toBeTruthy();

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginResponse.body.token}`);

  expect(meResponse.status).toBe(200);
  expect(meResponse.body.admin.email).toBe("admin@example.com");
});

test("service creation is protected and validates positive numbers", async () => {
  const unauthorizedResponse = await request(app)
    .post("/api/services")
    .send({ name: "Bad Service", durationMinutes: 0, price: -4 });

  expect(unauthorizedResponse.status).toBe(401);

  const token = await getAdminToken();
  const invalidResponse = await request(app)
    .post("/api/services")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Bad Service", durationMinutes: 0, price: -4 });

  expect(invalidResponse.status).toBe(400);

  const createdResponse = await request(app)
    .post("/api/services")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Classic Manicure",
      description: "Shape, cuticle care, and polish.",
      durationMinutes: 35,
      price: 28
    });

  expect(createdResponse.status).toBe(201);
  expect(createdResponse.body.service.name).toBe("Classic Manicure");
});

test("customer can create a booking for an active service", async () => {
  const service = await createSampleService();

  const response = await request(app)
    .post("/api/bookings")
    .send({
      service: service._id,
      customerName: "Maya Johnson",
      customerEmail: "maya@example.com",
      customerPhone: "555-0147",
      appointmentDate: futureDate(),
      appointmentTime: "14:30",
      notes: "Soft pink polish"
    });

  expect(response.status).toBe(201);
  expect(response.body.booking.status).toBe("pending");
  expect(response.body.booking.service.name).toBe("Gel Manicure");
});

test("booking validation rejects missing customer data and past dates", async () => {
  const service = await createSampleService();

  const response = await request(app)
    .post("/api/bookings")
    .send({
      service: service._id,
      customerName: "",
      customerEmail: "not-an-email",
      customerPhone: "",
      appointmentDate: "2000-01-01",
      appointmentTime: ""
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain("Customer name is required");
  expect(response.body.message).toContain("Booking date cannot be in the past");
});

test("admin can filter bookings and update booking status", async () => {
  const token = await getAdminToken();
  const service = await createSampleService();
  const booking = await Booking.create({
    service: service._id,
    customerName: "Maya Johnson",
    customerEmail: "maya@example.com",
    customerPhone: "555-0147",
    appointmentDate: futureDate(),
    appointmentTime: "14:30"
  });

  const updateResponse = await request(app)
    .put(`/api/bookings/${booking._id}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "confirmed" });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.booking.status).toBe("confirmed");

  const filteredResponse = await request(app)
    .get("/api/bookings?status=confirmed")
    .set("Authorization", `Bearer ${token}`);

  expect(filteredResponse.status).toBe(200);
  expect(filteredResponse.body.bookings).toHaveLength(1);
});

