import { CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { formatDate } from "../utils/formatters.js";

export default function BookingSuccess() {
  const location = useLocation();
  const booking = location.state?.booking;
  const serviceName = location.state?.serviceName || booking?.service?.name;

  return (
    <section className="content-shell section narrow-section">
      <div className="success-panel">
        <span className="success-icon" aria-hidden="true">
          <CalendarDays size={30} />
        </span>
        <span className="panel-label">Appointment received</span>
        <h1>Your booking is in</h1>
        <p>
          Thanks for booking with Luna Nails Studio. We received your appointment
          {serviceName ? ` for ${serviceName}` : ""}. If anything needs to change, the salon will
          contact you using the details you provided.
        </p>
        {booking && (
          <div className="confirmation-details">
            <span>{formatDate(booking.appointmentDate)}</span>
            <span>{booking.appointmentTime}</span>
            <span className={`pill status-pill ${booking.status}`}>{booking.status}</span>
          </div>
        )}
        <div className="hero-actions centered-actions">
          <Link to="/services" className="button button-secondary">
            Browse services
          </Link>
          <Link to="/book" className="button button-primary">
            Book another
          </Link>
        </div>
      </div>
    </section>
  );
}
