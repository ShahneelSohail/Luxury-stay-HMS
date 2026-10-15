import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicShell from '../../layouts/PublicShell';
import Photo from '../../components/Photo';
import Icon from '../../components/Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const SC = { fontFamily: 'var(--sc)', fontSize: 12, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 600 };

const SUITES = [
  {
    name: 'Deluxe Twin',
    from: 460, sqm: 28, tone: 'ivory', beds: '2 twin', view: 'Garden',
    desc: 'Twin beds for travel companions or family. Garden-side aspect, full marble bath, walk-in shower.',
    amenities: ['Walk-in shower', 'Espresso', 'Linens · Florence', 'Fibre Wi-Fi'],
    cat: 'deluxe', mood: 'side',
  },
  {
    name: 'Deluxe King',
    from: 480, sqm: 32, tone: 'warm', beds: '1 king', view: 'Garden or Promenade',
    desc: 'Our signature category. King bed, sitting nook, French balcony with views over the gardens or Promenade des Anglais.',
    amenities: ['French balcony', 'Soaking tub', 'Espresso', 'Bath ritual'],
    cat: 'deluxe', mood: 'topright',
  },
  {
    name: 'Junior Suite',
    from: 720, sqm: 48, tone: 'sand', beds: '1 king + sitting', view: 'Sea',
    desc: 'Generous proportions, separate sitting area, soaking tub overlooking the sea. Espresso service standard.',
    amenities: ['Sea view', 'Soaking tub', 'Sitting room', 'In-room dining'],
    cat: 'suite', mood: 'topleft',
  },
  {
    name: 'Premier Suite',
    from: 1240, sqm: 76, tone: 'deep', beds: '1 king + sitting', view: 'Sea · private terrace',
    desc: 'Two-bedroom configuration available. Private terrace, dressing room, dedicated butler service.',
    amenities: ['Private terrace', 'Dressing room', 'Butler service', 'Dining for six'],
    cat: 'suite', mood: 'side',
  },
  {
    name: 'Penthouse',
    from: 2400, sqm: 180, tone: 'night', beds: '2 king', view: 'Panoramic Mediterranean',
    desc: 'The crown of the house. Wraparound terrace with plunge pool, dining for ten, panoramic Mediterranean views.',
    amenities: ['Plunge pool', 'Dining for ten', 'Butler · 24h', 'Private chef'],
    cat: 'signature', mood: 'bottom',
  },
];

const FILTERS = [
  { id: 'all',       label: 'All · 5'   },
  { id: 'deluxe',    label: 'Deluxe'    },
  { id: 'suite',     label: 'Suites'    },
  { id: 'signature', label: 'Signature' },
];

export default function SuitesPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const [filter, setFilter] = useState('all');

  const shown = filter === 'all' ? SUITES : SUITES.filter(s => s.cat === filter);

  const hPad = isMobile ? '24px' : isTablet ? '40px' : '64px';

  return (
    <PublicShell>

      {/* ── Intro ────────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '40px' : '60px'} ${hPad} 32px`, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ ...SC, color: 'var(--mute)', marginBottom: 18 }}>The accommodations · Folio II</div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr',
          gap: isTablet ? 32 : 64,
          alignItems: 'end',
        }}>
          <h1 className="display" style={{ fontSize: 'clamp(44px, 7vw, 96px)', margin: 0, lineHeight: 0.92 }}>
            Forty-two rooms,<br /><em>each composed</em><br />by hand.
          </h1>

          <div>
            <p style={{ fontSize: 16, color: 'var(--ink-3)', lineHeight: 1.75, fontFamily: 'var(--serif)', fontWeight: 500, marginBottom: 32 }}>
              Five categories. Walnut joinery from the Jura, linens from Florence, marble
              bathrooms drawn from the Carrara quarries. No two suites are identical — each
              carries the trace of the artisans who shaped it.
            </p>

            {/* filter buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${filter === f.id ? 'var(--ink)' : 'var(--hairline)'}`,
                    background: filter === f.id ? 'var(--ink)' : 'transparent',
                    color: filter === f.id ? 'var(--paper)' : 'var(--ink)',
                    fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Suite list ───────────────────────────────────────────────────── */}
      <section style={{ padding: `60px ${hPad} 100px`, maxWidth: 1440, margin: '0 auto' }}>
        {shown.map((s, i) => {
          const imageLeft = i % 2 === 0;
          return (
            <div
              key={s.name}
              style={{
                display: 'grid',
                gridTemplateColumns: isTablet ? '1fr' : (imageLeft ? '1.1fr 1fr' : '1fr 1.1fr'),
                gap: isTablet ? 32 : 72,
                alignItems: 'center',
                padding: isMobile ? '40px 0' : '60px 0',
                borderTop: '1px solid var(--hairline)',
              }}
            >
              {/* Photo side */}
              <div style={{
                order: isTablet ? 0 : (imageLeft ? 0 : 1),
                position: 'relative',
              }}>
                <Photo tone={s.tone} ratio={isTablet ? '16/9' : '4/5'} num={`0${i + 1}`} mood={s.mood} />
                {/* floating sqm badge — repositioned on mobile so it doesn't overflow */}
                <div style={{
                  position: 'absolute',
                  top: isMobile ? 'auto' : 24,
                  bottom: isMobile ? 12 : 'auto',
                  right: isMobile ? 12 : -24,
                  padding: '8px 14px',
                  background: 'var(--ivory)', border: '1px solid var(--hairline)',
                  fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 500,
                }}>
                  {s.sqm} m² · {s.beds}
                </div>
              </div>

              {/* Copy side */}
              <div style={{ order: isTablet ? 1 : (imageLeft ? 1 : 0) }}>
                <div style={{ ...SC, color: 'var(--brass-deep)', marginBottom: 14 }}>
                  Category 0{i + 1} · {s.view}
                </div>

                <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 64px)', margin: '0 0 20px', lineHeight: 1 }}>
                  {s.name}
                </h2>

                <p style={{ fontSize: 16, color: 'var(--ink-3)', lineHeight: 1.75, marginBottom: 28, maxWidth: 480, fontFamily: 'var(--serif)', fontWeight: 500 }}>
                  {s.desc}
                </p>

                {/* amenities — inline dot list */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 32, maxWidth: 440 }}>
                  {s.amenities.map((a, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
                      <span style={{ color: 'var(--brass)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16 }}>·</span>
                      {a}
                    </div>
                  ))}
                </div>

                {/* price + CTA */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  paddingTop: 24, borderTop: '1px solid var(--hairline)', maxWidth: 480,
                  flexWrap: 'wrap', gap: 16,
                }}>
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>From</div>
                    <div className="display numeral" style={{ fontSize: 48, lineHeight: 1, fontStyle: 'italic' }}>
                      €{s.from.toLocaleString()}
                      <span style={{ fontSize: 14, color: 'var(--ink-3)', marginLeft: 8, fontStyle: 'normal', fontWeight: 500 }}>/ night</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/book', { state: { suite: s.name } })}
                  >
                    Reserve <Icon name="arrow_right" size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>

    </PublicShell>
  );
}
