export default function Stepper({ label, value, onChange, min, max }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--hairline)', padding: 4 }}>
        <button
          className="btn btn-ghost btn-sm"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          style={{ minWidth: 32, padding: '8px 0' }}
        >−</button>
        <div style={{
          flex: 1, textAlign: 'center',
          fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic',
        }}>
          {value}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          style={{ minWidth: 32, padding: '8px 0' }}
        >+</button>
      </div>
    </div>
  );
}
