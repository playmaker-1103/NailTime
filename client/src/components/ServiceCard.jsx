import { ArrowRight, Clock, Euro, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/formatters.js";

export default function ServiceCard({ service, showBookButton = true }) {
  return (
    <article className="service-card">
      <div className="service-card-top">
        <span className="service-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        {!service.isActive && <span className="pill muted">Inactive</span>}
      </div>

      <h3>{service.name}</h3>
      <p>{service.description}</p>

      <div className="service-meta">
        <span>
          <Clock size={16} aria-hidden="true" />
          {service.durationMinutes} min
        </span>
        <span>
          <Euro size={16} aria-hidden="true" />
          {formatCurrency(service.price)}
        </span>
      </div>

      {showBookButton && (
        <Link to={`/book?service=${service._id}`} className="button button-secondary full-width">
          Book
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
