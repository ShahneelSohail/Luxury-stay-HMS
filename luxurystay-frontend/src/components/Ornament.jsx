export default function Ornament({ children = '·  ·  ·' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ width: 56, height: 2, background: 'var(--brass-deep)' }} />
      <span style={{
        fontFamily: 'var(--sc)', fontSize: 12, letterSpacing: '0.28em',
        textTransform: 'uppercase', color: 'var(--brass-deep)', fontWeight: 600,
      }}>
        {children}
      </span>
      <div style={{ width: 56, height: 2, background: 'var(--brass-deep)' }} />
    </div>
  );
}
