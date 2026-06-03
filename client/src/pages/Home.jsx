import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoadingState from "../components/LoadingState.jsx";
import ServiceCard from "../components/ServiceCard.jsx";
import { api } from "../services/api.js";

export default function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices();
        setServices(data.services.slice(0, 3));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-overlay">
          <div className="content-shell hero-content">
            <p className="eyebrow">Modern nail care in the heart of town</p>
            <h1>Honey Nails</h1>
            <p className="hero-copy">
              Thoughtful manicures, pedicures, gel sets, and nail art in a calm studio built for
              easy appointment requests.
            </p>
            <div className="hero-actions">
              <Link to="/book" className="button button-primary">
                Book
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/services" className="button button-ghost">
                Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="content-shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured services</p>
            <h2>Fresh color, clean shape, easy booking</h2>
          </div>
          <Link to="/services" className="text-link">
            See all services
          </Link>
        </div>

        {loading && <LoadingState message="Loading featured services..." />}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && (
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section className="content-shell section compact-section">
        <div className="benefit-strip">
          <span>
            <CheckCircle2 size={18} aria-hidden="true" />
            Simple request form
          </span>
          <span>
            <CheckCircle2 size={18} aria-hidden="true" />
            5-minute time slots
          </span>
          <span>
            <CheckCircle2 size={18} aria-hidden="true" />
            No double bookings
          </span>
        </div>
      </section>
    </>
  );
}
