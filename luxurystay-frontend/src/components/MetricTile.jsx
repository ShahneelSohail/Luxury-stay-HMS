import Spinner from "./Spinner";

function  MetricTile({ label, value, delta, up, loading }) {
  return (
    <div className="metric" style={{ borderRight: 'none', borderBottom: 'none', borderTop: 'none', borderLeft: 'none' }}>
      <div className="label">{label}</div>
      {loading
        ? <div style={{ marginTop: 16 }}><Spinner /></div>
        : <div className="val numeral">{value}</div>}
      {delta && !loading && (
        <div className={`delta${up ? ' up' : ''}`}>
          {up && <Icon name="arrow_up" size={12} />}
          {delta}
        </div>
      )}
    </div>
  );
}

export default MetricTile;