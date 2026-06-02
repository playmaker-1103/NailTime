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
        <img src="/images/salon-hero.png" alt="A nail technician applying soft pink polish in the studio." />
        <div>
          <span className="panel-label">Studio rhythm</span>
          <h2>Soft color, careful prep, clean timing</h2>
          <p>
            Each appointment request checks availability before it reaches the salon, so customers only see open times.
          </p>
        </div>
      </div>

      {loading && <LoadingState message="Loading services..." />}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <div className="service-grid">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </section>
  );
}
