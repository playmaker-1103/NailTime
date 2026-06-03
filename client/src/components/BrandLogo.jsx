import { Link } from "react-router-dom";

export default function BrandLogo({ className = "" }) {
  return (
    <Link to="/" className={`brand ${className}`.trim()}>
      <img className="brand-mark" src="/images/honey-nails-logo.svg" alt="" aria-hidden="true" />
      <span className="brand-text">Honey Nails</span>
    </Link>
  );
}
