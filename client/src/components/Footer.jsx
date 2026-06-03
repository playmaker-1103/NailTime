import { CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="content-shell footer-grid">
        <div>
          <Link to="/" className="brand footer-brand">
            Honey Nails
          </Link>
          <p>
            Calm nail care, clean appointment timing, and a simple request flow for polished hands
            without the back-and-forth.
          </p>
        </div>

        <address className="footer-contact" aria-label="Studio contact details">
          <span>
            <MapPin size={17} aria-hidden="true" />
            Dublin city studio
          </span>
          <a href="tel:+353871234567">
            <Phone size={17} aria-hidden="true" />
            +353 87 123 4567
          </a>
          <a href="mailto:hello@honeynails.ie">
            <Mail size={17} aria-hidden="true" />
            hello@honeynails.ie
          </a>
        </address>

        <div className="footer-actions">
          <Link to="/" className="button button-primary">
            <CalendarDays size={17} aria-hidden="true" />
            Book appointment
          </Link>
          <Link to="/services" className="button button-secondary">
            View services
          </Link>
        </div>
      </div>
    </footer>
  );
}
