import { HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoadingState from "../components/LoadingState.jsx";
import ServiceCard from "../components/ServiceCard.jsx";
import { api } from "../services/api.js";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices();
        setServices(data.services);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  return (
    <section className="content-shell section services-page">
      <div className="services-hero">
        <div>
          <span className="panel-label">Services</span>
          <h1>Nail care menu</h1>
          <p className="page-copy">
            Browse the active treatments, then start a booking with your preferred service already selected.
          </p>
        </div>
        <Link to="/book" className="button button-primary">
          Book
        </Link>
      </div>

      <div className="services-feature">
        <img src="/images/salon-hero.png" alt="A nail technician applying glossy polish in the studio." />
        <div>
          <span className="panel-label">Studio rhythm</span>
          <h2>Soft color, careful prep, clean timing</h2>
          <p>
            Each appointment request checks availability before it reaches the salon, so customers
            only see open times and the owner can confirm quickly.
          </p>
          <div className="feature-points">
            <span>
              <Sparkles size={17} aria-hidden="true" />
              Gel, BIAB, classic care, and nail art
            </span>
            <span>
              <ShieldCheck size={17} aria-hidden="true" />
              Active services are managed from the admin dashboard
            </span>
          </div>
        </div>
      </div>

      {loading && <LoadingState message="Loading services..." />}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <>
          <div className="services-toolbar">
            <strong>{services.length} services available</strong>
            <span>Choose one to prefill the booking form.</span>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>

          <div className="service-note-grid">
            <article className="info-panel">
              <span className="panel-label">Choosing a service</span>
              <h2>Not sure what to book?</h2>
              <p>
                Pick the closest service and add notes for removal, repairs, extensions, or nail
                art. The salon can confirm timing before your appointment is accepted.
              </p>
            </article>
            <article className="info-panel">
              <span className="panel-label">Common questions</span>
              <h2>
                <HelpCircle size={24} aria-hidden="true" />
                Good to know
              </h2>
              <ul className="clean-list">
                <li>Appointment requests are pending until confirmed by the studio.</li>
                <li>Booked times are hidden from the public booking form.</li>
                <li>Irish phone numbers can be entered in local format.</li>
              </ul>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
