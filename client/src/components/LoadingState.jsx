export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span>{message}</span>
      <div className="loading-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
