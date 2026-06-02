import { CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
        <p className="eyebrow">Request submitted</p>
        <h1>Your appointment request is in</h1>
        <p>
          Thanks for booking with Luna Nails Studio. We received your request
          {serviceName ? ` for ${serviceName}` : ""} and will update the status soon.
        </p>
        {booking && (
          <div className="confirmation-details">
            <span>{booking.appointmentDate}</span>
            <span>{booking.appointmentTime}</span>
            <span className="pill">{booking.status}</span>
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

