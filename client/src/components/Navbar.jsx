import { CalendarDays, LayoutDashboard, LogOut } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="site-header">
      <nav className="navbar content-shell" aria-label="Main navigation">
        <Link to="/" className="brand">
          Luna Nails Studio
        </Link>

        <div className="nav-links">
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/book" className="button button-small button-primary">
            <CalendarDays size={17} aria-hidden="true" />
            Book
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/admin" className="icon-link" title="Admin dashboard">
                <LayoutDashboard size={18} aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
              <button type="button" className="icon-button" onClick={logout} title="Log out">
                <LogOut size={18} aria-hidden="true" />
              </button>
            </>
          ) : (
            <NavLink to="/admin/login">Admin</NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}

