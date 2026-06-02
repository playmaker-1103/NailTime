import { CalendarCheck, Clock, Info, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingState from "../components/LoadingState.jsx";
import { api } from "../services/api.js";
import { formatCurrency } from "../utils/formatters.js";

const initialForm = {
  service: "",
  appointmentDate: "",
  appointmentTime: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: ""
};

const emptyAvailability = {
  availableTimes: [],
  bookedTimes: [],
  notice: ""
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function isFiveMinuteTime(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) return false;

  return Number(match[2]) % 5 === 0;
}

function validateBooking(form) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.service) errors.service = "Please choose a service.";
  if (!form.appointmentDate) errors.appointmentDate = "Please choose a date.";
  if (!form.appointmentTime) errors.appointmentTime = "Please choose a time.";
  if (form.appointmentTime && !isFiveMinuteTime(form.appointmentTime)) {
    errors.appointmentTime = "Please choose a 5-minute time slot.";
  }
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
  const [availability, setAvailability] = useState(emptyAvailability);
  const [loading, setLoading] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices();
        const selectedService = searchParams.get("service") || data.services[0]?._id || "";
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

  useEffect(() => {
    let isMounted = true;

    async function loadAvailability() {
      if (!form.appointmentDate) {
        setAvailability(emptyAvailability);
        return;
      }

      setLoadingTimes(true);
      setApiError("");

      try {
        const data = await api.getAvailability(form.appointmentDate);

        if (!isMounted) return;

        setAvailability(data);
        setForm((current) => {
          if (!current.appointmentTime || data.availableTimes.includes(current.appointmentTime)) {
            return current;
          }

          return { ...current, appointmentTime: "" };
        });
      } catch (err) {
        if (isMounted) {
          setAvailability(emptyAvailability);
          setApiError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoadingTimes(false);
        }
      }
    }

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, [form.appointmentDate]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === form.service),
    [form.service, services]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "appointmentDate" ? { appointmentTime: "" } : {})
    }));
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
    <section className="content-shell section booking-layout booking-page">
      <div className="booking-intro">
        <div className="booking-kicker">
          <span aria-hidden="true">
            <Sparkles size={16} />
          </span>
          Luna Nails Studio
        </div>
        <h1>Request your nail appointment</h1>
        <p className="page-copy">
          Choose a service, pick an open slot, and send your details. No account needed.
        </p>

        <div className="notice-panel">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>Customer notice</strong>
            <p>
              Appointment times are listed every 5 minutes. Booked times are hidden automatically,
              and the system will not allow two appointments at the same time.
            </p>
          </div>
        </div>

        {selectedService && (
          <div className="selected-service-panel">
            <div>
              <span className="panel-label">Selected service</span>
              <h2>{selectedService.name}</h2>
              <p>{selectedService.description}</p>
            </div>
            <div className="selected-service-meta">
              <span>
                <Clock size={16} aria-hidden="true" />
                {selectedService.durationMinutes} min
              </span>
              <strong>{formatCurrency(selectedService.price)}</strong>
            </div>
          </div>
        )}

        <div className="booking-photo" aria-hidden="true">
          <img src="/images/salon-hero.png" alt="" />
        </div>
      </div>

      <form className="form-panel" onSubmit={handleSubmit} noValidate>
        <div className="form-panel-header">
          <span className="panel-label">Booking request</span>
          <h2>Your details</h2>
        </div>
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
                <select
                  name="appointmentTime"
                  value={form.appointmentTime}
                  onChange={handleChange}
                  disabled={
                    !form.appointmentDate ||
                    loadingTimes ||
                    availability.availableTimes.length === 0
                  }
                >
                  <option value="">
                    {!form.appointmentDate
                      ? "Choose a date first"
                      : loadingTimes
                        ? "Loading times..."
                        : availability.availableTimes.length === 0
                          ? "No available times"
                          : "Choose a time"}
                  </option>
                  {availability.availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
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
                  placeholder="087 123 4567"
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
