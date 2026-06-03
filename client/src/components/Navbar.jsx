import { CalendarDays, ClipboardList, Phone } from "lucide-react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="site-header">
      <nav className="navbar content-shell" aria-label="Main navigation">
        <Link to="/" className="brand">
          Luna Nails Studio
        </Link>

        <div className="nav-links">
          <NavLink to="/services">Services</NavLink>
          <a href="tel:+353871234567" className="nav-phone">
            <Phone size={17} aria-hidden="true" />
            <span>Call</span>
          </a>
          <NavLink to="/" className="button button-small button-primary">
            <CalendarDays size={17} aria-hidden="true" />
            Book
          </NavLink>
          <NavLink to="/admin" className="icon-link" title="Appointment list">
            <ClipboardList size={18} aria-hidden="true" />
            <span>Appointments</span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
