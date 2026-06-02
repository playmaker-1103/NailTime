import { useEffect, useState } from "react";
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
    <section className="content-shell section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Menu</p>
          <h1>Nail services</h1>
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

