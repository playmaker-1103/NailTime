const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const ADMIN_TOKEN_KEY = "adminToken";

export function getAdminToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const token = getAdminToken();
  const headers = {
    "Content-Type": "application/json",
    ...fetchOptions.headers
  };

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  login(credentials) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      auth: false
    });
  },
  me() {
    return request("/auth/me");
  },
  getServices(includeInactive = false) {
    const query = includeInactive ? "?includeInactive=true" : "";
    return request(`/services${query}`);
  },
  getService(id) {
    return request(`/services/${id}`);
  },
  createService(service) {
    return request("/services", {
      method: "POST",
      body: JSON.stringify(service)
    });
  },
  updateService(id, service) {
    return request(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(service)
    });
  },
  deleteService(id) {
    return request(`/services/${id}`, { method: "DELETE" });
  },
  createBooking(booking) {
    return request("/bookings", {
      method: "POST",
      body: JSON.stringify(booking)
    });
  },
  getAvailability(date, serviceId) {
    const query = new URLSearchParams({ date, service: serviceId });
    return request(`/bookings/availability?${query.toString()}`);
  },
  getBookings(filters = "") {
    if (typeof filters === "string") {
      const query = filters ? `?status=${filters}` : "";
      return request(`/bookings${query}`);
    }

    const query = new URLSearchParams();

    if (filters.status) query.set("status", filters.status);
    if (filters.source) query.set("source", filters.source);
    if (filters.date) query.set("date", filters.date);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/bookings${suffix}`);
  },
  getBooking(id) {
    return request(`/bookings/${id}`);
  },
  getDaySchedule(date) {
    const query = new URLSearchParams({ date });
    return request(`/bookings/schedule?${query.toString()}`);
  },
  createAdminBooking(booking) {
    return request("/bookings/admin", {
      method: "POST",
      body: JSON.stringify(booking)
    });
  },
  updateBookingStatus(id, status) {
    return request(`/bookings/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
  },
  deleteBooking(id) {
    return request(`/bookings/${id}`, { method: "DELETE" });
  }
};
