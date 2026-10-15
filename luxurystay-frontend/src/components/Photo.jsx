// Editorial photo placeholder — multi-stop painterly gradient with film grain + vignette.
// Used across all public pages wherever a real image would appear.

const PALETTES = {
  warm:   { base: '#C9AE82', deep: '#5A4528', light: '#F0E2C8', shadow: '#3E2E18' },
  deep:   { base: '#5A4530', deep: '#1A1814', light: '#A0855C', shadow: '#0A0806' },
  sea:    { base: '#5A6E72', deep: '#1F2A2E', light: '#9FB0B4', shadow: '#0E1416' },
  sand:   { base: '#C8B088', deep: '#6E5634', light: '#E8D5B0', shadow: '#3E2E1A' },
  night:  { base: '#2A2620', deep: '#0A0806', light: '#5A4530', shadow: '#000000' },
  ivory:  { base: '#EFE8DB', deep: '#C8BFA8', light: '#FBF8F2', shadow: '#9A9180' },
  olive:  { base: '#6E7F5C', deep: '#2F3A28', light: '#B5C29C', shadow: '#1A2014' },
  bronze: { base: '#8B6A3F', deep: '#3E2A14', light: '#D4A876', shadow: '#1E1408' },
  rose:   { base: '#B5573B', deep: '#5A2818', light: '#E8A88A', shadow: '#2A0E06' },
};

const LIGHTS = {
  topright: { x: '78%', y: '18%' },
  topleft:  { x: '22%', y: '20%' },
  bottom:   { x: '50%', y: '92%' },
  side:     { x: '8%',  y: '55%' },
  center:   { x: '50%', y: '45%' },
};

export default function Photo({
  tone = 'warm',
  ratio = '4/5',
  label,
  sub,
  num,
  mood = 'topright',
  style = {},
  children,
}) {
  const p = PALETTES[tone] || PALETTES.warm;
  const L = LIGHTS[mood] || LIGHTS.topright;

  const bg = `
    radial-gradient(ellipse 80% 60% at ${L.x} ${L.y}, ${p.light} 0%, transparent 55%),
    radial-gradient(ellipse 120% 90% at 90% 100%, ${p.shadow} 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 0% 0%, ${p.deep} 0%, transparent 50%),
    linear-gradient(165deg, ${p.base} 0%, ${p.deep} 100%)
  `;

  return (
    <div style={{ aspectRatio: ratio, position: 'relative', overflow: 'hidden', background: bg, ...style }}>

      {/* vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.32) 100%)',
        pointerEvents: 'none',
      }} />

      {/* film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.35, mixBlendMode: 'overlay', pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 1.6 -0.5'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>")`,
      }} />

      {/* directional light shaft */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(115deg, transparent 30%, rgba(255,240,210,0.08) 45%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* hairline inset frame */}
      <div style={{
        position: 'absolute', inset: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* large watermark numeral */}
      {num && (
        <div style={{
          position: 'absolute', top: 20, left: 28,
          fontFamily: 'var(--display)', fontSize: 132,
          color: 'rgba(247,243,236,0.16)', lineHeight: 0.82,
          letterSpacing: '-0.04em', userSelect: 'none', pointerEvents: 'none',
        }}>
          {num}
        </div>
      )}

      {/* bottom caption */}
      {label && (
        <div style={{
          position: 'absolute', bottom: 28, left: 28, right: 28,
          color: 'var(--paper)',
        }}>
          {sub && (
            <div style={{
              fontFamily: 'var(--sc)', fontSize: 11,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'var(--brass-soft)', marginBottom: 10,
            }}>
              {sub}
            </div>
          )}
          <div style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em' }}>
            {label}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
