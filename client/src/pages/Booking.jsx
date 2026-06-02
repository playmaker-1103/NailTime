import { CalendarCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingState from "../components/LoadingState.jsx";
import { api } from "../services/api.js";

const initialForm = {
  service: "",
  appointmentDate: "",
  appointmentTime: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: ""
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function validateBooking(form) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.service) errors.service = "Please choose a service.";
  if (!form.appointmentDate) errors.appointmentDate = "Please choose a date.";
  if (!form.appointmentTime) errors.appointmentTime = "Please choose a time.";
  if (!form.customerName.trim()) errors.customerName = "Name is required.";
  if (!emailPattern.test(form.customerEmail)) errors.customerEmail = "Enter a valid email.";
  if (!form.customerPhone.trim()) errors.customerPhone = "Phone number is required.";
  if (form.appointmentDate && form.appointmentDate < todayString()) {
    errors.appointmentDate = "Booking date cannot be in the past.";
  }

  return errors;
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices();
        const selectedService = searchParams.get("service") || "";
        setServices(data.services);
        setForm((current) => ({ ...current, service: selectedService }));
      } catch (err) {
        setApiError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, [searchParams]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === form.service),
    [form.service, services]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateBooking(form);
    setErrors(nextErrors);
    setApiError("");

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await api.createBooking(form);
      navigate("/booking-success", {
        state: {
          booking: data.booking,
          serviceName: selectedService?.name
        }
      });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content-shell section booking-layout">
      <div>
        <p className="eyebrow">Appointments</p>
        <h1>Book an appointment</h1>
        <p className="page-copy">
          Pick a service and send your appointment request. An admin can confirm, cancel, or
          complete the booking from the dashboard.
        </p>

        {selectedService && (
          <div className="selected-service-panel">
            <h2>{selectedService.name}</h2>
            <p>{selectedService.description}</p>
            <strong>
              {selectedService.durationMinutes} min · ${Number(selectedService.price).toFixed(2)}
            </strong>
          </div>
        )}
      </div>

      <form className="form-panel" onSubmit={handleSubmit} noValidate>
        {loading && <LoadingState message="Loading booking form..." />}
        {apiError && <p className="error-message">{apiError}</p>}

        {!loading && (
          <>
            <label>
              Service
              <select name="service" value={form.service} onChange={handleChange}>
                <option value="">Choose a service</option>
                {services.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {errors.service && <span className="field-error">{errors.service}</span>}
            </label>

            <div className="form-row">
              <label>
                Date
                <input
                  type="date"
                  name="appointmentDate"
                  min={todayString()}
                  value={form.appointmentDate}
                  onChange={handleChange}
                />
                {errors.appointmentDate && (
                  <span className="field-error">{errors.appointmentDate}</span>
                )}
              </label>

              <label>
                Time
                <input
                  type="time"
                  name="appointmentTime"
                  value={form.appointmentTime}
                  onChange={handleChange}
                />
                {errors.appointmentTime && (
                  <span className="field-error">{errors.appointmentTime}</span>
                )}
              </label>
            </div>

            <label>
              Name
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Maya Johnson"
              />
              {errors.customerName && <span className="field-error">{errors.customerName}</span>}
            </label>

            <div className="form-row">
              <label>
                Email
                <input
                  type="email"
                  name="customerEmail"
                  value={form.customerEmail}
                  onChange={handleChange}
                  placeholder="maya@example.com"
                />
                {errors.customerEmail && (
                  <span className="field-error">{errors.customerEmail}</span>
                )}
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={handleChange}
                  placeholder="555-0147"
                />
                {errors.customerPhone && (
                  <span className="field-error">{errors.customerPhone}</span>
                )}
              </label>
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                rows="4"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any nail art ideas, removal needs, or timing notes?"
              />
            </label>

            <button type="submit" className="button button-primary full-width" disabled={submitting}>
              <CalendarCheck size={18} aria-hidden="true" />
              {submitting ? "Submitting..." : "Submit booking request"}
            </button>
          </>
        )}
      </form>
    </section>
  );
}

