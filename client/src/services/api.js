const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("adminToken");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data;
}

export const api = {
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
  getBookings(status = "") {
    const query = status ? `?status=${status}` : "";
    return request(`/bookings${query}`);
  },
  getBooking(id) {
    return request(`/bookings/${id}`);
  },
  updateBookingStatus(id, status) {
    return request(`/bookings/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
  },
  deleteBooking(id) {
    return request(`/bookings/${id}`, { method: "DELETE" });
  },
  login(credentials) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
  },
  me() {
    return request("/auth/me");
  }
};

