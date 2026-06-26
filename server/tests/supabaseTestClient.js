const crypto = require("crypto");

const db = {
  services: [],
  bookings: []
};

function now() {
  return new Date().toISOString();
}

function resetDb() {
  db.services = [];
  db.bookings = [];
}

function normalizeTime(time) {
  return String(time).slice(0, 5);
}

function applyFilters(rows, filters) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.operator === "eq") return row[filter.column] === filter.value;
      if (filter.operator === "neq") return row[filter.column] !== filter.value;
      if (filter.operator === "in") return filter.value.includes(row[filter.column]);
      return true;
    })
  );
}

function attachRelations(table, row) {
  if (table !== "bookings" || !row) return row;

  return {
    ...row,
    service: db.services.find((service) => service.id === row.service_id) || null
  };
}

function sortRows(rows, orders) {
  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const leftValue = left[order.column];
      const rightValue = right[order.column];

      if (leftValue < rightValue) return order.ascending ? -1 : 1;
      if (leftValue > rightValue) return order.ascending ? 1 : -1;
    }

    return 0;
  });
}

function normalizeServicePayload(payload) {
  return {
    id: payload.id || crypto.randomUUID(),
    name: payload.name,
    description: payload.description || "",
    duration_minutes: payload.duration_minutes,
    price: Number(payload.price),
    is_active: payload.is_active ?? true,
    created_at: payload.created_at || now(),
    updated_at: payload.updated_at || now()
  };
}

function normalizeBookingPayload(payload) {
  return {
    id: payload.id || crypto.randomUUID(),
    service_id: payload.service_id || null,
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone,
    appointment_date: payload.appointment_date,
    appointment_time: normalizeTime(payload.appointment_time),
    notes: payload.notes || "",
    status: payload.status || "confirmed",
    source: payload.source || "online",
    duration_minutes:
      payload.duration_minutes ||
      db.services.find((service) => service.id === payload.service_id)?.duration_minutes ||
      15,
    capacity_slots: payload.capacity_slots || 1,
    created_at: payload.created_at || now(),
    updated_at: payload.updated_at || now()
  };
}

function timeToMinutes(time) {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);

  return hours * 60 + minutes;
}

function bookingRange(booking) {
  const startMinutes = timeToMinutes(booking.appointment_time);

  return {
    startMinutes,
    endMinutes: startMinutes + Number(booking.duration_minutes || 15)
  };
}

function activeBookingsForDate(date) {
  return db.bookings.filter(
    (booking) =>
      booking.appointment_date === date &&
      ["pending", "confirmed", "completed"].includes(booking.status)
  );
}

function hasCapacityForBooking(payload) {
  if (!["pending", "confirmed", "completed"].includes(payload.status || "confirmed")) {
    return true;
  }

  const intervalMinutes = Number(process.env.APPOINTMENT_SLOT_INTERVAL_MINUTES || 15);
  const salonCapacity = Number(payload.p_salon_capacity || process.env.SALON_STAFF_CAPACITY || 4);
  const capacitySlots = Number(payload.p_capacity_slots || 1);
  const startMinutes = timeToMinutes(payload.p_appointment_time);
  const durationMinutes = Number(payload.p_duration_minutes || 15);
  const endMinutes = startMinutes + durationMinutes;
  const bookings = activeBookingsForDate(payload.p_appointment_date);

  for (let segmentStart = startMinutes; segmentStart < endMinutes; segmentStart += intervalMinutes) {
    const segmentEnd = Math.min(segmentStart + intervalMinutes, endMinutes);
    const usedCapacity = bookings.reduce((total, booking) => {
      const range = bookingRange(booking);
      const overlaps = range.startMinutes < segmentEnd && range.endMinutes > segmentStart;

      return overlaps ? total + Number(booking.capacity_slots || 1) : total;
    }, 0);

    if (usedCapacity + capacitySlots > salonCapacity) {
      return false;
    }
  }

  return true;
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.operation = "select";
    this.payload = null;
    this.countOptions = null;
  }

  select(_columns = "*", options = {}) {
    this.countOptions = options;
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ column, operator: "neq", value });
    return this;
  }

  in(column, value) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    return this.execute({ single: true });
  }

  maybeSingle() {
    return this.execute({ maybeSingle: true });
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute(options = {}) {
    if (this.operation === "insert") {
      return this.executeInsert(options);
    }

    if (this.operation === "update") {
      return this.executeUpdate(options);
    }

    if (this.operation === "delete") {
      return this.executeDelete(options);
    }

    return this.executeSelect(options);
  }

  executeSelect(options = {}) {
    let rows = applyFilters(db[this.table], this.filters);
    rows = sortRows(rows, this.orders);

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    rows = rows.map((row) => attachRelations(this.table, { ...row }));

    if (this.countOptions?.head) {
      return Promise.resolve({ data: null, count: rows.length, error: null });
    }

    if (options.single || options.maybeSingle) {
      return Promise.resolve({ data: rows[0] || null, error: null });
    }

    return Promise.resolve({ data: rows, error: null });
  }

  executeInsert(options = {}) {
    const rows = this.payload.map((payload) =>
      this.table === "services" ? normalizeServicePayload(payload) : normalizeBookingPayload(payload)
    );

    db[this.table].push(...rows);
    const data = rows.map((row) => attachRelations(this.table, { ...row }));

    if (options.single) {
      return Promise.resolve({ data: data[0], error: null });
    }

    return Promise.resolve({ data, error: null });
  }

  executeUpdate(options = {}) {
    const rows = applyFilters(db[this.table], this.filters);
    const updatedRows = rows.map((row) => {
      const updated = { ...row, ...this.payload, updated_at: now() };

      Object.assign(row, updated);
      return attachRelations(this.table, { ...row });
    });

    if (options.single || options.maybeSingle) {
      return Promise.resolve({ data: updatedRows[0] || null, error: null });
    }

    return Promise.resolve({ data: updatedRows, error: null });
  }

  executeDelete(options = {}) {
    const rows = applyFilters(db[this.table], this.filters);
    db[this.table] = db[this.table].filter((row) => !rows.includes(row));

    if (options.single || options.maybeSingle) {
      return Promise.resolve({ data: rows[0] || null, error: null });
    }

    return Promise.resolve({ data: rows, error: null });
  }
}

const supabaseTestClient = {
  __db: db,
  __reset: resetDb,
  __insertService(payload = {}) {
    const service = normalizeServicePayload({
      name: "Gel Manicure",
      description: "Long-lasting gel polish.",
      duration_minutes: 50,
      price: 42,
      ...payload
    });
    db.services.push(service);
    return service;
  },
  __insertBooking(payload = {}) {
    const booking = normalizeBookingPayload(payload);
    db.bookings.push(booking);
    return booking;
  },
  rpc(functionName, payload) {
    if (functionName !== "create_booking_with_capacity") {
      return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
    }

    const service = payload.p_service_id
      ? db.services.find((item) => item.id === payload.p_service_id && item.is_active)
      : null;
    const durationMinutes = payload.p_duration_minutes || service?.duration_minutes;

    if (payload.p_service_id && !service) {
      return Promise.resolve({ data: null, error: { code: "22023", message: "active_service_not_found" } });
    }

    if (!durationMinutes || durationMinutes < 1) {
      return Promise.resolve({ data: null, error: { code: "22023", message: "invalid_duration_minutes" } });
    }

    if (!hasCapacityForBooking({ ...payload, p_duration_minutes: durationMinutes })) {
      return Promise.resolve({ data: null, error: { code: "23505", message: "booking_capacity_exceeded" } });
    }

    const booking = normalizeBookingPayload({
      service_id: payload.p_service_id,
      customer_name: payload.p_customer_name,
      customer_email: payload.p_customer_email,
      customer_phone: payload.p_customer_phone,
      appointment_date: payload.p_appointment_date,
      appointment_time: payload.p_appointment_time,
      notes: payload.p_notes,
      status: payload.p_status,
      source: payload.p_source,
      duration_minutes: durationMinutes,
      capacity_slots: payload.p_capacity_slots
    });

    db.bookings.push(booking);

    return Promise.resolve({ data: booking, error: null });
  },
  from(table) {
    return new QueryBuilder(table);
  }
};

module.exports = supabaseTestClient;
