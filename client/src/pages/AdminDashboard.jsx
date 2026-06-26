import {
  Ban,
  Bell,
  CalendarClock,
  Clock3,
  Edit3,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LoadingState from "../components/LoadingState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const statusOptions = ["pending", "confirmed", "cancelled", "completed"];
const sourceOptions = ["online", "phone", "walk_in", "admin_block"];
const DEFAULT_COUNTRY_CODE = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || "353";

const emptyServiceForm = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
  isActive: true
};

const emptyAdminBookingForm = {
  source: "phone",
  service: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  appointmentDate: todayString(),
  appointmentTime: "09:00",
  durationMinutes: 60,
  capacitySlots: 4,
  notes: ""
};

function normalizePhoneForWhatsApp(phone) {
  const trimmedPhone = phone.trim();
  const digits = trimmedPhone.replace(/\D/g, "");

  if (!digits) return "";
  if (trimmedPhone.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;

  return digits;
}

function buildWhatsAppMessage(booking) {
  const serviceName = booking.service?.name || "your nail service";
  const appointmentDetails = `${serviceName} on ${booking.appointmentDate} at ${booking.appointmentTime}`;

  if (booking.status === "confirmed") {
    return `Hi ${booking.customerName}, your ${appointmentDetails} appointment at Honey Nails is confirmed. Please reply here if you need to change anything.`;
  }

  if (booking.status === "cancelled") {
    return `Hi ${booking.customerName}, your ${appointmentDetails} appointment at Honey Nails has been cancelled. Please reply here if you would like another time.`;
  }

  if (booking.status === "completed") {
    return `Hi ${booking.customerName}, thank you for visiting Honey Nails for ${serviceName}. We hope to see you again soon.`;
  }

  return `Hi ${booking.customerName}, Honey Nails received your appointment request for ${appointmentDetails}. Please reply here to confirm this time works for you.`;
}

function buildWhatsAppUrl(booking) {
  const phone = normalizePhoneForWhatsApp(booking.customerPhone);

  if (!phone) return "";

  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`;
}

function getStatusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getSourceLabel(source) {
  const labels = {
    online: "Online",
    phone: "Phone",
    walk_in: "Walk-in",
    admin_block: "Blocked"
  };

  return labels[source] || source;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function generateAdminTimeOptions() {
  const options = [];

  for (let minutes = 9 * 60; minutes < 18 * 60; minutes += 15) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    options.push(`${hours}:${mins}`);
  }

  return options;
}

const adminTimeOptions = generateAdminTimeOptions();

export default function AdminDashboard() {
  const { admin, logout } = useAuth();
  const [bookingFilter, setBookingFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookings, setBookings] = useState([]);
  const [pendingNotices, setPendingNotices] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [adminBookingForm, setAdminBookingForm] = useState(emptyAdminBookingForm);
  const [scheduleDate, setScheduleDate] = useState(todayString());
  const [daySchedule, setDaySchedule] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dashboardStats = useMemo(() => {
    const today = todayString();
    const todayBookings = bookings.filter(
      (booking) => booking.appointmentDate === today && booking.source !== "admin_block"
    );
    const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
    const blockedBookings = bookings.filter((booking) => booking.source === "admin_block");
    const activeServices = services.filter((service) => service.isActive);
    const nextBooking =
      bookings.find(
        (booking) =>
          ["pending", "confirmed"].includes(booking.status) && booking.source !== "admin_block"
      ) || null;

    return {
      todayBookings,
      confirmedBookings,
      blockedBookings,
      activeServices,
      nextBooking
    };
  }, [bookings, services]);

  const visibleBookings = useMemo(() => {
    const query = bookingSearch.trim().toLowerCase();

    if (!query) return bookings;

    return bookings.filter((booking) => {
      const fields = [
        booking.customerName,
        booking.customerEmail,
        booking.customerPhone,
        booking.service?.name,
        booking.appointmentDate,
        booking.appointmentTime,
        booking.source,
        booking.status,
        booking.notes
      ];

      return fields.some((field) => String(field || "").toLowerCase().includes(query));
    });
  }, [bookingSearch, bookings]);

  useEffect(() => {
    loadBookings();
  }, [bookingFilter, sourceFilter]);

  useEffect(() => {
    loadDaySchedule(scheduleDate);
  }, [scheduleDate]);

  useEffect(() => {
    loadServices();

    loadPendingNotices();
    const noticeTimer = window.setInterval(() => {
      loadPendingNotices({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(noticeTimer);
    };
  }, []);

  async function loadBookings() {
    setLoadingBookings(true);
    setError("");

    try {
      const data = await api.getBookings({ source: sourceFilter, status: bookingFilter });
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  }

  async function loadPendingNotices(options = {}) {
    if (!options.silent) {
      setLoadingNotices(true);
    }

    try {
      const data = await api.getBookings("confirmed");
      setPendingNotices(data.bookings);
    } catch (err) {
      if (!options.silent) {
        setError(err.message);
      }
    } finally {
      if (!options.silent) {
        setLoadingNotices(false);
      }
    }
  }

  async function loadServices() {
    setLoadingServices(true);
    setError("");

    try {
      const data = await api.getServices(true);
      setServices(data.services);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadDaySchedule(date = scheduleDate) {
    setLoadingSchedule(true);

    try {
      const data = await api.getDaySchedule(date);
      setDaySchedule(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function handleStatusChange(bookingId, status) {
    try {
      const data = await api.updateBookingStatus(bookingId, status);
      setBookings((current) =>
        current.map((booking) => (booking._id === bookingId ? data.booking : booking))
      );
      loadPendingNotices({ silent: true });
      loadDaySchedule(data.booking.appointmentDate);
      setMessage("Booking status updated.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("Delete this booking?")) return;

    try {
      await api.deleteBooking(bookingId);
      const deletedBooking = bookings.find((booking) => booking._id === bookingId);
      setBookings((current) => current.filter((booking) => booking._id !== bookingId));
      setPendingNotices((current) => current.filter((booking) => booking._id !== bookingId));
      if (deletedBooking) {
        loadDaySchedule(deletedBooking.appointmentDate);
      }
      setMessage("Booking deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAdminBookingFormChange(event) {
    const { name, value } = event.target;

    setAdminBookingForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "source" && value === "admin_block"
        ? {
            capacitySlots: current.capacitySlots || 4,
            customerEmail: "",
            customerPhone: "",
            service: ""
          }
        : {})
    }));
  }

  async function handleAdminBookingSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const isBlock = adminBookingForm.source === "admin_block";
    const payload = {
      ...adminBookingForm,
      capacitySlots: Number(adminBookingForm.capacitySlots || (isBlock ? 4 : 1)),
      durationMinutes: Number(adminBookingForm.durationMinutes || 60)
    };

    if (!isBlock) {
      delete payload.durationMinutes;
      payload.capacitySlots = Number(adminBookingForm.capacitySlots || 1);
    }

    try {
      const data = await api.createAdminBooking(payload);
      setBookings((current) => [data.booking, ...current]);
      setAdminBookingForm({
        ...emptyAdminBookingForm,
        appointmentDate: adminBookingForm.appointmentDate,
        appointmentTime: adminBookingForm.appointmentTime
      });
      setScheduleDate(payload.appointmentDate);
      loadBookings();
      loadPendingNotices({ silent: true });
      loadDaySchedule(payload.appointmentDate);
      setMessage(isBlock ? "Time blocked on the salon schedule." : "Booking added to the salon schedule.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleServiceFormChange(event) {
    const { name, value, type, checked } = event.target;
    setServiceForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function startEditingService(service) {
    setEditingServiceId(service._id);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive
    });
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceForm(emptyServiceForm);
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...serviceForm,
      durationMinutes: Number(serviceForm.durationMinutes),
      price: Number(serviceForm.price)
    };

    try {
      if (editingServiceId) {
        const data = await api.updateService(editingServiceId, payload);
        setServices((current) =>
          current.map((service) => (service._id === editingServiceId ? data.service : service))
        );
        setMessage("Service updated.");
      } else {
        const data = await api.createService(payload);
        setServices((current) => [data.service, ...current]);
        setMessage("Service added.");
      }
      resetServiceForm();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteService(serviceId) {
    if (!window.confirm("Delete this service? Existing bookings will keep their service reference.")) {
      return;
    }

    try {
      await api.deleteService(serviceId);
      setServices((current) => current.filter((service) => service._id !== serviceId));
      setMessage("Service deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="content-shell section dashboard">
      <div className="section-heading">
        <div>
          <span className="panel-label">Admin dashboard</span>
          <h1>Bookings and services</h1>
          {admin?.email && <p className="admin-session">Signed in as {admin.email}</p>}
        </div>
        <div className="button-row dashboard-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              loadBookings();
              loadDaySchedule(scheduleDate);
            }}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className="button button-secondary" onClick={logout}>
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="dashboard-summary" aria-label="Dashboard summary">
        <span>
          <strong>{pendingNotices.length}</strong>
          Follow-up
        </span>
        <span>
          <strong>{dashboardStats.todayBookings.length}</strong>
          Today
        </span>
        <span>
          <strong>{dashboardStats.confirmedBookings.length}</strong>
          Confirmed
        </span>
        <span>
          <strong>{dashboardStats.blockedBookings.length}</strong>
          Blocks
        </span>
        <span>
          <strong>{dashboardStats.activeServices.length}</strong>
          Active services
        </span>
      </div>

      {dashboardStats.nextBooking && (
        <section className="next-booking-panel" aria-label="Next appointment">
          <CalendarClock size={22} aria-hidden="true" />
          <div>
            <span className="panel-label">Next appointment</span>
            <h2>{dashboardStats.nextBooking.customerName}</h2>
            <p>
              {dashboardStats.nextBooking.service?.name || "Deleted service"} on{" "}
              {formatDate(dashboardStats.nextBooking.appointmentDate)} at{" "}
              {dashboardStats.nextBooking.appointmentTime}
            </p>
          </div>
          <span className={`pill status-pill ${dashboardStats.nextBooking.status}`}>
            {getStatusLabel(dashboardStats.nextBooking.status)}
          </span>
        </section>
      )}

      <section className="operations-grid">
        <form className="form-panel quick-booking-panel" onSubmit={handleAdminBookingSubmit}>
          <div className="form-panel-header">
            <div>
              <span className="panel-label">Phone and floor</span>
              <h2>Add to schedule</h2>
            </div>
            {adminBookingForm.source === "admin_block" ? (
              <Ban size={22} aria-hidden="true" />
            ) : (
              <CalendarClock size={22} aria-hidden="true" />
            )}
          </div>

          <div className="form-row">
            <label>
              Source
              <select
                name="source"
                value={adminBookingForm.source}
                onChange={handleAdminBookingFormChange}
              >
                <option value="phone">Phone</option>
                <option value="walk_in">Walk-in</option>
                <option value="admin_block">Block time</option>
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                name="appointmentDate"
                value={adminBookingForm.appointmentDate}
                onChange={handleAdminBookingFormChange}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Time
              <select
                name="appointmentTime"
                value={adminBookingForm.appointmentTime}
                onChange={handleAdminBookingFormChange}
              >
                {adminTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {adminBookingForm.source === "admin_block" ? "Duration" : "Staff used"}
              {adminBookingForm.source === "admin_block" ? (
                <input
                  type="number"
                  name="durationMinutes"
                  min="15"
                  step="15"
                  value={adminBookingForm.durationMinutes}
                  onChange={handleAdminBookingFormChange}
                  required
                />
              ) : (
                <select
                  name="capacitySlots"
                  value={adminBookingForm.capacitySlots}
                  onChange={handleAdminBookingFormChange}
                >
                  <option value="1">1 tech</option>
                  <option value="2">2 techs</option>
                  <option value="3">3 techs</option>
                  <option value="4">4 techs</option>
                </select>
              )}
            </label>
          </div>

          {adminBookingForm.source === "admin_block" ? (
            <div className="form-row">
              <label>
                Label
                <input
                  type="text"
                  name="customerName"
                  value={adminBookingForm.customerName}
                  onChange={handleAdminBookingFormChange}
                  placeholder="Lunch break"
                  required
                />
              </label>
              <label>
                Capacity
                <select
                  name="capacitySlots"
                  value={adminBookingForm.capacitySlots}
                  onChange={handleAdminBookingFormChange}
                >
                  <option value="1">1 tech</option>
                  <option value="2">2 techs</option>
                  <option value="3">3 techs</option>
                  <option value="4">Whole salon</option>
                </select>
              </label>
            </div>
          ) : (
            <>
              <label>
                Service
                <select
                  name="service"
                  value={adminBookingForm.service}
                  onChange={handleAdminBookingFormChange}
                  required
                >
                  <option value="">Choose a service</option>
                  {services
                    .filter((service) => service.isActive)
                    .map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} · {service.durationMinutes} min
                      </option>
                    ))}
                </select>
              </label>

              <div className="form-row">
                <label>
                  Customer
                  <input
                    type="text"
                    name="customerName"
                    value={adminBookingForm.customerName}
                    onChange={handleAdminBookingFormChange}
                    placeholder="Customer name"
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    name="customerPhone"
                    value={adminBookingForm.customerPhone}
                    onChange={handleAdminBookingFormChange}
                    placeholder="08..."
                    required
                  />
                </label>
              </div>

              <label>
                Email optional
                <input
                  type="email"
                  name="customerEmail"
                  value={adminBookingForm.customerEmail}
                  onChange={handleAdminBookingFormChange}
                  placeholder="customer@example.com"
                />
              </label>
            </>
          )}

          <label>
            Notes
            <textarea
              name="notes"
              rows="3"
              value={adminBookingForm.notes}
              onChange={handleAdminBookingFormChange}
              placeholder="Preference, staff note, or reason for block"
            />
          </label>

          <button type="submit" className="button button-primary">
            <Plus size={17} aria-hidden="true" />
            {adminBookingForm.source === "admin_block" ? "Block time" : "Add booking"}
          </button>
        </form>

        <section className="admin-section day-schedule-panel">
          <div className="admin-section-header">
            <div>
              <span className="panel-label">Capacity view</span>
              <h2>Day schedule</h2>
            </div>
            <label className="compact-label">
              Date
              <input
                type="date"
                value={scheduleDate}
                onChange={(event) => setScheduleDate(event.target.value)}
              />
            </label>
          </div>

          {loadingSchedule ? (
            <LoadingState message="Loading day capacity..." />
          ) : daySchedule ? (
            <div className="schedule-list" aria-label="Day capacity by time">
              {daySchedule.rows
                .filter((row) => row.usedCapacity > 0)
                .map((row) => (
                  <article className="schedule-row" key={row.time}>
                    <div className="schedule-time">
                      <Clock3 size={16} aria-hidden="true" />
                      <strong>{row.time}</strong>
                    </div>
                    <div className="capacity-meter" aria-label={`${row.usedCapacity} of ${daySchedule.salonCapacity} occupied`}>
                      <span
                        style={{
                          width: `${Math.min(
                            (row.usedCapacity / daySchedule.salonCapacity) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                    <span className={row.remainingCapacity === 0 ? "pill status-pill cancelled" : "pill"}>
                      <Users size={14} aria-hidden="true" />
                      {row.remainingCapacity} free
                    </span>
                    <div className="schedule-bookings">
                      {row.bookings.map((booking) => (
                        <span key={`${row.time}-${booking._id}`}>
                          {booking.customerName} · {getSourceLabel(booking.source)}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              {daySchedule.rows.every((row) => row.usedCapacity === 0) && (
                <p className="quiet-message">No bookings or blocks on this date yet.</p>
              )}
            </div>
          ) : (
            <p className="quiet-message">Choose a date to see capacity.</p>
          )}
        </section>
      </section>

      <section className="admin-notice-panel" aria-live="polite">
        <div className="admin-notice-header">
          <div>
            <h2>WhatsApp follow-up</h2>
            <p className="quiet-message">Confirmed appointments ready for a customer message.</p>
          </div>
          <span className="notice-count">
            <Bell size={17} aria-hidden="true" />
            {pendingNotices.length} confirmed
          </span>
        </div>

        {loadingNotices ? (
          <LoadingState message="Checking new appointments..." />
        ) : pendingNotices.length > 0 ? (
          <div className="notice-list">
            {pendingNotices.map((booking) => {
              const whatsappUrl = buildWhatsAppUrl(booking);

              return (
                <article className="notice-item" key={booking._id}>
                  <div>
                    <h3>{booking.customerName}</h3>
                    <p className="notice-meta">
                      <span>{booking.service?.name || "Deleted service"}</span>
                      <span>{formatDate(booking.appointmentDate)}</span>
                      <span>{booking.appointmentTime}</span>
                    </p>
                    <span>{booking.customerPhone}</span>
                  </div>
                  {whatsappUrl && (
                    <a
                      className="button button-small button-whatsapp"
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={17} aria-hidden="true" />
                      WhatsApp
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="quiet-message">No confirmed appointments need follow-up right now.</p>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Bookings</h2>
          <div className="booking-tools">
            <label className="compact-label search-label">
              <span className="visually-hidden">Search bookings</span>
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={bookingSearch}
                onChange={(event) => setBookingSearch(event.target.value)}
                placeholder="Search customer, phone, service"
              />
            </label>
            <label className="compact-label">
              Status
              <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)}>
                <option value="">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-label">
              Source
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                <option value="">All</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {getSourceLabel(source)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loadingBookings ? (
          <LoadingState message="Loading bookings..." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong>{booking.customerName}</strong>
                      {booking.notes && <span className="table-note">{booking.notes}</span>}
                    </td>
                    <td>
                      {booking.isBlock ? "Blocked time" : booking.service?.name || "Deleted service"}
                      {booking.durationMinutes && (
                        <span className="table-note">{booking.durationMinutes} min</span>
                      )}
                    </td>
                    <td>
                      {formatDate(booking.appointmentDate)}
                      <span className="table-note">{booking.appointmentTime}</span>
                    </td>
                    <td>
                      <span className={`pill source-pill ${booking.source}`}>
                        {getSourceLabel(booking.source)}
                      </span>
                      <span className="table-note">{booking.capacitySlots || 1} tech</span>
                    </td>
                    <td>
                      <span className={`pill status-pill ${booking.status}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                      <select
                        aria-label={`Change status for ${booking.customerName}`}
                        value={booking.status}
                        onChange={(event) => handleStatusChange(booking._id, event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {booking.customerEmail}
                      <span className="table-note">{booking.customerPhone}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {buildWhatsAppUrl(booking) && (
                          <a
                            className="icon-button whatsapp"
                            href={buildWhatsAppUrl(booking)}
                            target="_blank"
                            rel="noreferrer"
                            title="Message customer on WhatsApp"
                          >
                            <MessageCircle size={17} aria-hidden="true" />
                          </a>
                        )}
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => handleDeleteBooking(booking._id)}
                          title="Delete booking"
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleBookings.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-cell">
                      No bookings match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-grid">
        <form className="form-panel" onSubmit={handleServiceSubmit}>
          <h2>{editingServiceId ? "Edit service" : "Add service"}</h2>

          <label>
            Name
            <input
              type="text"
              name="name"
              value={serviceForm.name}
              onChange={handleServiceFormChange}
              placeholder="Gel Manicure"
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              rows="3"
              value={serviceForm.description}
              onChange={handleServiceFormChange}
              placeholder="Long-lasting polish with cuticle care and shaping."
            />
          </label>

          <div className="form-row">
            <label>
              Duration
              <input
                type="number"
                name="durationMinutes"
                min="1"
                value={serviceForm.durationMinutes}
                onChange={handleServiceFormChange}
                required
              />
            </label>
            <label>
              Price
              <input
                type="number"
                name="price"
                min="1"
                step="0.01"
                value={serviceForm.price}
                onChange={handleServiceFormChange}
                required
              />
            </label>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isActive"
              checked={serviceForm.isActive}
              onChange={handleServiceFormChange}
            />
            Active
          </label>

          <div className="button-row">
            <button type="submit" className="button button-primary">
              {editingServiceId ? <Save size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
              {editingServiceId ? "Save service" : "Add service"}
            </button>
            {editingServiceId && (
              <button type="button" className="button button-ghost" onClick={resetServiceForm}>
                <X size={17} aria-hidden="true" />
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="admin-section service-manager">
          <h2>Manage services</h2>
          {loadingServices ? (
            <LoadingState message="Loading services..." />
          ) : (
            <div className="service-list">
              {services.map((service) => (
                <article className="service-admin-item" key={service._id}>
                  <div>
                    <h3>{service.name}</h3>
                    <p>
                      <span>{service.durationMinutes} min</span>
                      <span>{formatCurrency(service.price)}</span>
                    </p>
                    {!service.isActive && <span className="pill muted">Inactive</span>}
                  </div>
                  <div className="button-row compact-buttons">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startEditingService(service)}
                      title="Edit service"
                    >
                      <Edit3 size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleDeleteService(service._id)}
                      title="Delete service"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </section>
  );
}
