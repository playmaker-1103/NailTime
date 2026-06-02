process.env.CLIENT_URL = "http://localhost:5173";
process.env.ADMIN_EMAIL = "owner@lunanails.test";
process.env.ADMIN_PASSWORD = "secret-password";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

jest.mock("../config/supabase", () => require("./supabaseTestClient"));

const request = require("supertest");
const app = require("../app");
const supabase = require("./supabaseTestClient");

function futureDate(daysAhead = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function createSampleService(overrides = {}) {
  return supabase.__insertService(overrides);
}

function createSampleBooking(service, overrides = {}) {
  return supabase.__insertBooking({
    service_id: service.id,
    customer_name: "Maya Johnson",
    customer_email: "maya@example.com",
    customer_phone: "555-0147",
    appointment_date: futureDate(),
    appointment_time: "14:30",
    notes: "Soft pink polish",
    ...overrides
  });
}

async function adminAuthHeader() {
  const response = await request(app).post("/api/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });

  return { Authorization: `Bearer ${response.body.token}` };
}

function bookingPayload(service, overrides = {}) {
  return {
    service: service.id,
    customerName: "Maya Johnson",
    customerEmail: "maya@example.com",
    customerPhone: "555-0147",
    appointmentDate: futureDate(),
    appointmentTime: "14:30",
    notes: "Soft pink polish",
    ...overrides
  };
}

beforeEach(() => {
  supabase.__reset();
});

test("admin login issues a JWT and protected routes reject missing tokens", async () => {
  const missingTokenResponse = await request(app).get("/api/bookings");

  expect(missingTokenResponse.status).toBe(401);

  const loginResponse = await request(app).post("/api/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.token).toEqual(expect.any(String));
  expect(loginResponse.body.admin.email).toBe(process.env.ADMIN_EMAIL);

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginResponse.body.token}`);

  expect(meResponse.status).toBe(200);
  expect(meResponse.body.admin.role).toBe("admin");
});

test("admin service creation validates positive numbers", async () => {
  const authHeader = await adminAuthHeader();
  const includeInactiveResponse = await request(app).get("/api/services?includeInactive=true");
  const noTokenResponse = await request(app)
    .post("/api/services")
    .send({ name: "Classic Manicure", durationMinutes: 35, price: 28 });

  expect(includeInactiveResponse.status).toBe(401);
  expect(noTokenResponse.status).toBe(401);

  const invalidResponse = await request(app)
    .post("/api/services")
    .set(authHeader)
    .send({ name: "Bad Service", durationMinutes: 0, price: -4 });

  expect(invalidResponse.status).toBe(400);

  const createdResponse = await request(app)
    .post("/api/services")
    .set(authHeader)
    .send({
      name: "Classic Manicure",
      description: "Shape, cuticle care, and polish.",
      durationMinutes: 35,
      price: 28
    });

  expect(createdResponse.status).toBe(201);
  expect(createdResponse.body.service.name).toBe("Classic Manicure");
  expect(createdResponse.body.service.durationMinutes).toBe(35);
});

test("customer can create a booking for an active service", async () => {
  const service = createSampleService();

  const response = await request(app).post("/api/bookings").send(bookingPayload(service));

  expect(response.status).toBe(201);
  expect(response.body.booking.status).toBe("pending");
  expect(response.body.booking.service.name).toBe("Gel Manicure");
});

test("booking validation rejects missing data, past dates, and non-5-minute times", async () => {
  const service = createSampleService();

  const missingResponse = await request(app)
    .post("/api/bookings")
    .send(
      bookingPayload(service, {
        customerName: "",
        customerEmail: "not-an-email",
        customerPhone: "",
        appointmentDate: "2000-01-01",
        appointmentTime: ""
      })
    );

  expect(missingResponse.status).toBe(400);
  expect(missingResponse.body.message).toContain("Customer name is required");
  expect(missingResponse.body.message).toContain("Booking date cannot be in the past");

  const badTimeResponse = await request(app)
    .post("/api/bookings")
    .send(bookingPayload(service, { appointmentTime: "14:32" }));

  expect(badTimeResponse.status).toBe(400);
  expect(badTimeResponse.body.message).toContain("5-minute increments");
});

test("availability lists 5-minute slots and hides booked times", async () => {
  const service = createSampleService();
  const date = futureDate(4);

  createSampleBooking(service, {
    appointment_date: date,
    appointment_time: "14:30"
  });

  const response = await request(app).get(`/api/bookings/availability?date=${date}`);

  expect(response.status).toBe(200);
  expect(response.body.slotIntervalMinutes).toBe(5);
  expect(response.body.availableTimes).toContain("14:25");
  expect(response.body.availableTimes).toContain("14:35");
  expect(response.body.availableTimes).not.toContain("14:30");
  expect(response.body.bookedTimes).toContain("14:30");
});

test("two active bookings cannot use the same date and time", async () => {
  const service = createSampleService();
  const date = futureDate(5);

  const firstResponse = await request(app)
    .post("/api/bookings")
    .send(bookingPayload(service, { appointmentDate: date, appointmentTime: "10:00" }));

  expect(firstResponse.status).toBe(201);

  const secondResponse = await request(app)
    .post("/api/bookings")
    .send(
      bookingPayload(service, {
        customerEmail: "second@example.com",
        appointmentDate: date,
        appointmentTime: "10:00"
      })
    );

  expect(secondResponse.status).toBe(409);
  expect(secondResponse.body.message).toContain("already booked");
});

test("admin can filter bookings and update booking status with a JWT", async () => {
  const authHeader = await adminAuthHeader();
  const service = createSampleService();
  const booking = createSampleBooking(service);

  const updateResponse = await request(app)
    .put(`/api/bookings/${booking.id}/status`)
    .set(authHeader)
    .send({ status: "confirmed" });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.booking.status).toBe("confirmed");

  const filteredResponse = await request(app)
    .get("/api/bookings?status=confirmed")
    .set(authHeader);

  expect(filteredResponse.status).toBe(200);
  expect(filteredResponse.body.bookings).toHaveLength(1);
});
