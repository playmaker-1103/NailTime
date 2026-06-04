import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
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
  salonCapacity: 4,
  serviceDurationMinutes: null,
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
      if (!form.appointmentDate || !form.service) {
        setAvailability(emptyAvailability);
        return;
      }

      setLoadingTimes(true);
      setApiError("");

      try {
        const data = await api.getAvailability(form.appointmentDate, form.service);

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
  }, [form.appointmentDate, form.service]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === form.service),
    [form.service, services]
  );
  const timeHelper = useMemo(() => {
    if (!form.appointmentDate) return "Choose a date to see open appointment times.";
    if (!form.service) return "Choose a service to check the team diary.";
    if (loadingTimes) return "Checking the salon diary for open 5-minute slots.";
    if (availability.availableTimes.length === 0) return "No open times are available for this date.";

    return `${availability.availableTimes.length} start times fit this service with ${availability.salonCapacity} nail techs working.`;
  }, [
    availability.availableTimes.length,
    availability.salonCapacity,
    form.appointmentDate,
    form.service,
    loadingTimes
  ]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "appointmentDate" || name === "service" ? { appointmentTime: "" } : {})
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
    <section className="booking-page">
      <div className="content-shell booking-stage">
        <div>
          <div className="booking-kicker">
            <span aria-hidden="true">
              <Sparkles size={16} />
            </span>
            Honey Nails
          </div>
          <h1>Request your nail appointment</h1>
          <p className="page-copy">
            Choose a service, pick an open slot, and send your details. We will confirm your
            request by message so your visit is calm from the first tap.
          </p>
        </div>
        <div className="booking-facts" aria-label="Booking notes">
          <span>Open daily 09:00-18:00</span>
          <span>4 nail techs available</span>
          <span>WhatsApp follow-up</span>
        </div>
      </div>

      <div className="content-shell booking-workspace">
        <div className="booking-intro">
          <div className="booking-photo" aria-hidden="true">
            <img src="/images/salon-hero.png" alt="" />
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

          <div className="notice-panel">
            <Info size={20} aria-hidden="true" />
            <div>
              <strong>Customer notice</strong>
              <p>
                Appointment requests are held as pending until the salon confirms. Times are checked
                against each service length and the 4-person team capacity.
              </p>
            </div>
          </div>

          <div className="booking-assurance">
            <span>
              <ShieldCheck size={18} aria-hidden="true" />
              Clean tools and careful prep
            </span>
            <span>
              <MapPin size={18} aria-hidden="true" />
              Dublin city studio
            </span>
            <span>
              <MessageCircle size={18} aria-hidden="true" />
              Replies by WhatsApp
            </span>
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
              <span className="field-helper">Only active services are shown.</span>
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
                <span className="field-helper">Bookings can only be requested for today or later.</span>
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
                <span className="field-helper">{timeHelper}</span>
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
              <span className="field-helper">Use the name the salon should ask for.</span>
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
                <span className="field-helper">Irish local numbers are fine.</span>
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
              <span className="field-helper">Optional. Add removal, nail art, or timing notes.</span>
            </label>

            <button type="submit" className="button button-primary full-width" disabled={submitting}>
              <CalendarCheck size={18} aria-hidden="true" />
              {submitting ? "Submitting..." : "Submit booking request"}
            </button>
          </>
        )}
        </form>
      </div>

      <div className="content-shell market-sections">
        <section className="trust-strip" aria-label="Why customers book with Honey Nails">
          <article>
            <Star size={20} aria-hidden="true" />
            <strong>Detailed finishes</strong>
            <span>Shape, cuticle prep, color, and nail art are handled with enough time to feel considered.</span>
          </article>
          <article>
            <Clock size={20} aria-hidden="true" />
            <strong>Clear timing</strong>
            <span>Availability updates from the live salon diary, so customers avoid unavailable times.</span>
          </article>
          <article>
            <CheckCircle2 size={20} aria-hidden="true" />
            <strong>Simple confirmation</strong>
            <span>Every request lands in the admin dashboard ready for fast follow-up by WhatsApp.</span>
          </article>
        </section>

        <section className="info-grid">
          <div className="info-panel">
            <span className="panel-label">Before you arrive</span>
            <h2>A smoother studio visit</h2>
            <ul className="clean-list">
              <li>Arrive with a little time for color choice and nail-art discussion.</li>
              <li>Add removal or repair notes in the booking form so the salon can prepare.</li>
              <li>If you need to move your time, reply to the confirmation message.</li>
            </ul>
          </div>

          <div className="info-panel">
            <span className="panel-label">Customer care</span>
            <h2>Policies made plain</h2>
            <ul className="clean-list">
              <li>Requests are pending until the studio confirms them.</li>
              <li>Cancelled appointments release the time for another customer.</li>
              <li>Prices and durations are shown before you send your request.</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  );
}
