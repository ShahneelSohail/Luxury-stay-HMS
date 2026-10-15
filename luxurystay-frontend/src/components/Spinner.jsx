export default function Spinner({ page = false }) {
  if (page) {
    return (
      <div className="spinner-page">
        <div className="spinner" />
      </div>
    );
  }
  return <div className="spinner" />;
}
