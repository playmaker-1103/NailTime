import { Edit3, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingState from "../components/LoadingState.jsx";
import { api } from "../services/api.js";

const statusOptions = ["pending", "confirmed", "cancelled", "completed"];

const emptyServiceForm = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
  isActive: true
};

export default function AdminDashboard() {
  const [bookingFilter, setBookingFilter] = useState("");
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings(bookingFilter);
  }, [bookingFilter]);

  useEffect(() => {
    loadServices();
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
          <p className="eyebrow">Admin dashboard</p>
          <h1>Bookings and services</h1>
        </div>
        <button type="button" className="button button-secondary" onClick={() => loadBookings(bookingFilter)}>
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Bookings</h2>
          <label className="compact-label">
            Status
            <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)}>
              <option value="">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
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
                      {booking.appointmentDate}
                      <span className="table-note">{booking.appointmentTime}</span>
                    </td>
                    <td>
                      <select
                        value={booking.status}
                        onChange={(event) => handleStatusChange(booking._id, event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {booking.customerEmail}
                      <span className="table-note">{booking.customerPhone}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => handleDeleteBooking(booking._id)}
                        title="Delete booking"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
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
                    <p>{service.durationMinutes} min · ${Number(service.price).toFixed(2)}</p>
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

