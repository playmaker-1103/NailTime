import { Bell, Edit3, LogOut, MessageCircle, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingState from "../components/LoadingState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const statusOptions = ["pending", "confirmed", "cancelled", "completed"];
const DEFAULT_COUNTRY_CODE = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || "353";

const emptyServiceForm = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
  isActive: true
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
    return `Hi ${booking.customerName}, your ${appointmentDetails} appointment at Luna Nails Studio is confirmed. Please reply here if you need to change anything.`;
  }

  if (booking.status === "cancelled") {
    return `Hi ${booking.customerName}, your ${appointmentDetails} appointment at Luna Nails Studio has been cancelled. Please reply here if you would like another time.`;
  }

  if (booking.status === "completed") {
    return `Hi ${booking.customerName}, thank you for visiting Luna Nails Studio for ${serviceName}. We hope to see you again soon.`;
  }

  return `Hi ${booking.customerName}, Luna Nails Studio received your appointment request for ${appointmentDetails}. Please reply here to confirm this time works for you.`;
}

function buildWhatsAppUrl(booking) {
  const phone = normalizePhoneForWhatsApp(booking.customerPhone);

  if (!phone) return "";

  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`;
}

function getStatusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminDashboard() {
  const { admin, logout } = useAuth();
  const [bookingFilter, setBookingFilter] = useState("");
  const [bookings, setBookings] = useState([]);
  const [pendingNotices, setPendingNotices] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings(bookingFilter);
  }, [bookingFilter]);

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

  async function loadBookings(status = "") {
    setLoadingBookings(true);
    setError("");

    try {
      const data = await api.getBookings(status);
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
      const data = await api.getBookings("pending");
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

  async function handleStatusChange(bookingId, status) {
    try {
      const data = await api.updateBookingStatus(bookingId, status);
      setBookings((current) =>
        current.map((booking) => (booking._id === bookingId ? data.booking : booking))
      );
      loadPendingNotices({ silent: true });
      setMessage("Booking status updated.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("Delete this booking?")) return;

    try {
      await api.deleteBooking(bookingId);
      setBookings((current) => current.filter((booking) => booking._id !== bookingId));
      setPendingNotices((current) => current.filter((booking) => booking._id !== bookingId));
      setMessage("Booking deleted.");
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
          <button type="button" className="button button-secondary" onClick={() => loadBookings(bookingFilter)}>
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

      <section className="admin-notice-panel" aria-live="polite">
        <div className="admin-notice-header">
          <div>
            <h2>WhatsApp follow-up</h2>
            <p className="quiet-message">Pending requests that need a customer message.</p>
          </div>
          <span className="notice-count">
            <Bell size={17} aria-hidden="true" />
            {pendingNotices.length} pending
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
          <p className="quiet-message">No new appointment notices right now.</p>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Bookings</h2>
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
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong>{booking.customerName}</strong>
                      {booking.notes && <span className="table-note">{booking.notes}</span>}
                    </td>
                    <td>{booking.service?.name || "Deleted service"}</td>
                    <td>
                      {formatDate(booking.appointmentDate)}
                      <span className="table-note">{booking.appointmentTime}</span>
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
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      No bookings found.
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
