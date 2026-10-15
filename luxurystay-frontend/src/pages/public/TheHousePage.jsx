import { useNavigate } from 'react-router-dom';
import PublicShell from '../../layouts/PublicShell';
import Photo from '../../components/Photo';
import Ornament from '../../components/Ornament';
import Icon from '../../components/Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// ─── Shared style helpers ─────────────────────────────────────────────────────

const SC = { fontFamily: 'var(--sc)', fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--mute)' };

const SUITE_PREVIEW = [
  { name: 'Deluxe King',    from: '480',   tone: 'warm', n: '01', desc: 'King bed · garden view · marble bath',           mood: 'topright' },
  { name: 'Junior Suite',   from: '720',   tone: 'sand', n: '02', desc: 'Sitting area · soaking tub · sea view',           mood: 'topleft'  },
  { name: 'Premier Suite',  from: '1,240', tone: 'deep', n: '03', desc: 'Terrace · dressing room · butler service',        mood: 'side'     },
];

const AWARDS_TICKER = [
  'Forbes Travel Guide · five-star',
  'Michelin · two stars · Le Jardin',
  '★',
  'Condé Nast Traveler · gold list',
  'Leading Hotels of the World',
  '★',
  'Relais & Châteaux',
  "World's 50 Best · Hotels",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();

  const sectionPad = isMobile ? '80px 24px' : isTablet ? '100px 40px' : '140px 64px';

  return (
    <PublicShell>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflowX: 'clip', background: 'var(--ivory)' }}>

        {/* watermark numeral — desktop only */}
        {!isMobile && (
          <div aria-hidden style={{
            position: 'absolute', top: -60, right: -40,
            fontFamily: 'var(--display)', fontSize: 580,
            color: 'rgba(160,128,84,0.07)', lineHeight: 0.8, letterSpacing: '-0.06em',
            pointerEvents: 'none', userSelect: 'none',
          }}>I</div>
        )}

        {/* vertical folio marker — desktop only */}
        {!isTablet && (
          <div style={{
            position: 'absolute', top: 100, left: 24,
            fontFamily: 'var(--sc)', fontSize: 12, color: 'var(--mute)',
            letterSpacing: '0.3em', textTransform: 'uppercase',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>
            Vol. CII · Folio I · Spring–Summer MMXXVI
          </div>
        )}

        <div style={{
          position: 'relative', display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '1fr 1.25fr',
          minHeight: isTablet ? 'auto' : 720,
          alignItems: 'stretch',
        }}>

          {/* LEFT — typography */}
          <div style={{
            padding: isMobile ? '48px 24px 40px' : isTablet ? '64px 40px' : '84px 56px 80px 88px',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            position: 'relative', zIndex: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{ width: isMobile ? 32 : 56, height: 2, background: 'var(--brass-deep)' }} />
              <div style={{ fontFamily: 'var(--sc)', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--brass-deep)', fontWeight: 600 }}>Est. MCMXXIV · Côte d'Azur</div>
            </div>

            <h1 className="didone" style={{
              fontSize: 'clamp(56px, 9.2vw, 132px)',
              margin: 0, lineHeight: 0.92, color: 'var(--ink)',
            }}>
              The art of<br />
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300, color: 'var(--brass-deep)' }}>arriving,</span>
              <br />
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>&amp;</span>{' '}
              <span style={{ fontSize: '0.72em' }}>never quite</span>
              <br />
              <span style={{ letterSpacing: '0.02em' }}>leaving.</span>
            </h1>

            <p style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 450,
              fontSize: isMobile ? 17 : 21, color: 'var(--ink-2)', lineHeight: 1.55,
              maxWidth: 480, margin: isMobile ? '28px 0 28px' : '44px 0 40px',
            }}>
              A century of hospitality on the Mediterranean. Forty-two suites, three
              restaurants, one spa carved from sea-stone.{' '}
              <span style={{ color: 'var(--ink)' }}>Each stay is composed — not booked.</span>
            </p>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/book')}
                style={{ padding: isMobile ? '12px 20px' : '16px 26px', fontSize: 11, whiteSpace: 'nowrap' }}
              >
                Reserve your stay <Icon name="arrow_right" size={12} />
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/suites')}
                style={{ padding: isMobile ? '12px 16px' : '16px 22px', fontSize: 11, whiteSpace: 'nowrap' }}
              >
                The suites →
              </button>
            </div>

            {/* stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? 20 : 24,
              marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--hairline)',
            }}>
              {[
                { n: '★★', l: 'Michelin',  s: 'Le Jardin · 2024' },
                { n: '98',  l: 'Forbes',    s: 'Five-star · 2025' },
                { n: 'IX',  l: 'Decades',   s: 'Family-owned'     },
                { n: '42',  l: 'Suites',    s: 'No two alike'     },
              ].map((m, i) => (
                <div key={i}>
                  <div className="didone" style={{ fontSize: isMobile ? 36 : 48, lineHeight: 0.9, color: 'var(--ink)', marginBottom: 8 }}>{m.n}</div>
                  <div style={{ ...SC, fontSize: 11, color: 'var(--ink)', marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{m.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — photo stack (hidden on mobile) */}
          {!isTablet && (
            <div style={{ position: 'relative', padding: '84px 64px 84px 24px' }}>
              <div style={{ position: 'relative', height: '100%' }}>

                <Photo
                  tone="deep" ratio="4/5" mood="topright"
                  label="The Penthouse · 402" sub="from €2,400 / night"
                  style={{ height: '100%', width: '100%' }}
                />

                {/* Étoile seal */}
                <div style={{
                  position: 'absolute', top: 20, left: 20,
                  width: 104, height: 104,
                  border: '1px solid var(--brass-soft)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(247,243,236,0.96)', flexDirection: 'column',
                  backdropFilter: 'blur(6px)',
                }}>
                  <div className="didone" style={{ fontSize: 34, lineHeight: 0.9, color: 'var(--brass-deep)' }}>★</div>
                  <div style={{ fontFamily: 'var(--sc)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--mute)', marginTop: 4, fontWeight: 600 }}>
                    Étoile · 1924
                  </div>
                </div>

                {/* Live weather tile */}
                <div style={{
                  position: 'absolute', bottom: 20, right: 20,
                  width: 180, padding: 20,
                  background: 'var(--paper)', border: '1px solid var(--hairline)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)', boxShadow: '0 0 0 3px rgba(110,127,92,0.18)', display: 'inline-block' }} />
                    <div style={{ ...SC, fontSize: 11, color: 'var(--ink-3)' }}>Live · Nice</div>
                  </div>
                  <div className="didone" style={{ fontSize: 48, lineHeight: 0.9, letterSpacing: '-0.02em' }}>23°</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginTop: 6, fontWeight: 500 }}>
                    Clear · sea breeze<br />sunset 21:12
                  </div>
                </div>

                {/* Caption strip */}
                <div style={{
                  position: 'absolute', top: 28, right: 0,
                  padding: '10px 16px',
                  background: 'var(--ink)', color: 'var(--paper)',
                  transform: 'translateX(12px)',
                }}>
                  <div style={{ fontFamily: 'var(--sc)', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Cover · The Penthouse
                  </div>
                </div>

                {/* Polaroid secondary photo */}
                <div style={{
                  position: 'absolute', left: 20, bottom: 60,
                  width: 150, height: 200,
                  border: '6px solid var(--ivory)',
                  boxShadow: '0 20px 40px -16px rgba(26,24,20,0.5)',
                  transform: 'rotate(-3deg)',
                }}>
                  <Photo tone="sand" ratio="3/4" mood="bottom" style={{ width: '100%', height: '100%' }} />
                  <div style={{
                    position: 'absolute', bottom: -28, left: 0, right: 0,
                    textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic',
                    fontSize: 12, color: 'var(--paper)', textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}>
                    — la cour des oliviers —
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── AWARDS MARQUEE ────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)',
        padding: '24px 0', background: 'var(--paper)',
        overflow: 'hidden', marginTop: isMobile ? 32 : 60,
      }}>
        <div style={{
          display: 'flex', gap: 80,
          fontFamily: 'var(--display)', fontSize: isMobile ? 18 : 26,
          color: 'var(--ink-3)', whiteSpace: 'nowrap',
          animation: 'marquee 60s linear infinite',
        }}>
          {[0, 1, 2].flatMap(j =>
            AWARDS_TICKER.map((t, i) => <span key={`${j}-${i}`}>{t}</span>)
          )}
        </div>
      </section>

      {/* ── THE HOUSE ─────────────────────────────────────────────────────── */}
      <section style={{
        padding: sectionPad, display: 'grid',
        gridTemplateColumns: isTablet ? '1fr' : '1fr 1.3fr',
        gap: isTablet ? 48 : 96, alignItems: 'center',
        maxWidth: 1440, margin: '0 auto',
      }}>
        {/* photo mosaic */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, position: 'relative' }}>
          <Photo tone="sand" ratio="3/4" mood="topleft" />
          <div style={{ display: 'grid', gap: 14, marginTop: 48 }}>
            <Photo tone="ivory" ratio="1/1" mood="side" />
            <Photo tone="warm"  ratio="1/1" mood="bottom" />
          </div>
          {!isMobile && (
            <div aria-hidden style={{
              position: 'absolute', bottom: -24, left: -24,
              fontFamily: 'var(--display)', fontSize: 220,
              color: 'rgba(160,128,84,0.14)', lineHeight: 0.8, pointerEvents: 'none',
            }}>I</div>
          )}
        </div>

        {/* copy */}
        <div>
          <div style={{ ...SC, color: 'var(--brass-deep)', marginBottom: 22 }}>Chapter I · The House</div>
          <h2 className="didone" style={{ fontSize: isMobile ? 56 : isTablet ? 72 : 92, margin: '0 0 32px', lineHeight: 0.95 }}>
            A maison of{' '}
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>quiet</span>
            <br />consequence.
          </h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: 'var(--ink-3)', lineHeight: 1.75, maxWidth: 520, marginBottom: 24, fontFamily: 'var(--serif)', fontWeight: 500 }}>
            In 1924, the architect <em>Édouard Pellier</em> drew forty-two rooms into the cliff
            face above the Baie des Anges. He built around an old olive grove that still
            stands at the centre of the courtyard.
          </p>
          <p style={{ fontSize: isMobile ? 15 : 17, color: 'var(--ink-3)', lineHeight: 1.75, maxWidth: 520, marginBottom: 40, fontFamily: 'var(--serif)', fontWeight: 500 }}>
            Four generations on, the maison remains in family hands — and remains,
            deliberately, half a step out of time.
          </p>
          <span style={{
            fontFamily: 'var(--sc)', fontSize: 13, letterSpacing: '0.28em', textTransform: 'uppercase',
            borderBottom: '1px solid var(--ink)', paddingBottom: 6, cursor: 'pointer', fontWeight: 600,
          }}>
            Read the full history →
          </span>
        </div>
      </section>

      {/* ── SUITES PREVIEW ────────────────────────────────────────────────── */}
      <section style={{
        padding: isMobile ? '0 24px 80px' : isTablet ? '0 40px 100px' : '0 64px 140px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <Ornament>II · The Suites</Ornament>

        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', margin: isMobile ? '32px 0 40px' : '48px 0 56px', gap: 16 }}>
          <h2 className="didone" style={{ fontSize: isMobile ? 64 : isTablet ? 80 : 104, margin: 0, lineHeight: 0.92 }}>
            Five{' '}
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>categories,</span>
            <br />no two alike.
          </h2>
          <a
            onClick={() => navigate('/suites')}
            style={{ fontFamily: 'var(--sc)', fontSize: 13, letterSpacing: '0.28em', textTransform: 'uppercase', borderBottom: '1px solid var(--ink)', cursor: 'pointer', paddingBottom: 6, whiteSpace: 'nowrap', fontWeight: 600 }}
          >
            View all forty-two →
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1.2fr 1fr 1fr',
          gap: isMobile ? 32 : 28,
        }}>
          {SUITE_PREVIEW.map((s, i) => (
            <div key={s.name} onClick={() => navigate('/book')} style={{ cursor: 'pointer' }}>
              <Photo tone={s.tone} ratio={isMobile ? '3/2' : i === 0 ? '4/5' : '1/1'} num={s.n} mood={s.mood} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, paddingBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <h3 className="didone" style={{ fontSize: isMobile ? 28 : 32, margin: 0 }}>{s.name}</h3>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 22 : 28, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    €{s.from}
                  </div>
                  <div style={{ fontFamily: 'var(--sc)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--brass-deep)', marginTop: 3 }}>per night</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-3)', marginTop: 6, fontWeight: 500 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DINING + SPA ──────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--ink)', color: 'var(--ivory)',
        padding: sectionPad, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 30%, rgba(160,128,84,0.22), transparent 55%), radial-gradient(circle at 10% 90%, rgba(160,128,84,0.12), transparent 50%)' }} />
        {!isMobile && (
          <div aria-hidden style={{
            position: 'absolute', top: 60, right: 80,
            fontFamily: 'var(--display)', fontSize: 360,
            color: 'rgba(160,128,84,0.06)', lineHeight: 0.8, pointerEvents: 'none',
          }}>II</div>
        )}

        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: isTablet ? 56 : 96 }}>
          {[
            { tone: 'night', title: 'Le Jardin',  sub: 'Two-star · beneath the olive', n: '★★', body: 'Chef Adèle Marchand draws from a kitchen garden tended by hand. Twelve covers an evening.',             mood: 'topright' },
            { tone: 'sea',   title: 'La Mer',     sub: 'Spa · carved from sea-stone',  n: 'I',  body: 'Eight treatment rooms below the cliff. Salt-water hammam, sound bath, Provençal botanicals.', mood: 'side'     },
          ].map((s, i) => (
            <div key={i}>
              <Photo tone={s.tone} ratio="4/3" mood={s.mood} />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28 }}>
                <div style={{ fontFamily: 'var(--sc)', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--brass-soft)', fontWeight: 600 }}>{s.sub}</div>
                <span className="didone" style={{ fontSize: 34, color: 'var(--brass-soft)' }}>{s.n}</span>
              </div>
              <h3 className="didone" style={{ fontSize: isMobile ? 52 : 76, margin: '16px 0 20px', color: 'var(--ivory)' }}>{s.title}</h3>
              <p style={{ fontSize: 16, color: 'var(--mute)', lineHeight: 1.7, maxWidth: 440, fontFamily: 'var(--serif)', fontWeight: 500 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIAL ───────────────────────────────────────────────────── */}
      <section style={{ padding: sectionPad, textAlign: 'center', maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
        {!isMobile && (
          <div aria-hidden style={{
            position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--display)', fontSize: 420,
            color: 'rgba(160,128,84,0.07)', lineHeight: 0.8, pointerEvents: 'none',
          }}>"</div>
        )}

        <Ornament>·  ★  ·</Ornament>

        <div className="didone" style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, lineHeight: 1.12, margin: '48px 0 40px', letterSpacing: '-0.01em', position: 'relative' }}>
          "One leaves the maison the way one leaves an{' '}
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>old friend</span>
          {' '}— already counting the months until the next visit."
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: isMobile ? 32 : 56, height: 2, background: 'var(--brass-deep)' }} />
          <div style={{ fontFamily: 'var(--sc)', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--brass-deep)', fontWeight: 600 }}>
            Vanity Fair · April MMXXV
          </div>
          <div style={{ width: isMobile ? 32 : 56, height: 2, background: 'var(--brass-deep)' }} />
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '0 24px 80px' : isTablet ? '0 40px 100px' : '0 64px 140px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ background: 'var(--linen)', padding: isMobile ? '48px 28px' : isTablet ? '64px 48px' : '96px 72px', position: 'relative', overflow: 'hidden' }}>
          {!isMobile && (
            <div aria-hidden style={{
              position: 'absolute', top: -40, right: 60,
              fontFamily: 'var(--display)', fontSize: 280,
              color: 'rgba(160,128,84,0.14)', lineHeight: 0.8, pointerEvents: 'none',
            }}>★</div>
          )}

          <div style={{ ...SC, color: 'var(--brass-deep)', marginBottom: 22 }}>Chapter III · Compose your stay</div>
          <h2 className="didone" style={{ fontSize: isMobile ? 48 : isTablet ? 60 : 76, margin: '0 0 24px', maxWidth: 800, lineHeight: 0.95 }}>
            Speak with a{' '}
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>concierge</span>
            <br />before you arrive.
          </h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: 'var(--ink-3)', maxWidth: 580, marginBottom: 36, lineHeight: 1.7, fontFamily: 'var(--serif)', fontWeight: 500 }}>
            A note, a preference, a celebration — the more we know, the more quietly we
            can attend to it. Our concierge replies within four hours, in any language.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/book')} style={{ padding: isMobile ? '14px 22px' : '16px 30px' }}>
              Begin reservation <Icon name="arrow_right" size={12} />
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/contact')} style={{ padding: isMobile ? '14px 18px' : '16px 28px' }}>
              Write to the concierge
            </button>
          </div>
        </div>
      </section>

      {/* ── Experience strip ─────────────────────────────────────────── */}
      <section style={{
        background: 'var(--ink)', color: 'var(--ivory)',
        padding: isMobile ? '64px 24px' : isTablet ? '80px 40px' : '80px 64px',
        display: 'grid',
        gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
        gap: isTablet ? 48 : 80,
        alignItems: 'center',
      }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--brass-soft)', marginBottom: 20 }}>The house · since 1924</div>
          <h2 className="display display-italic" style={{ fontSize: 'clamp(32px, 4vw, 64px)', margin: '0 0 24px', lineHeight: 1.05 }}>
            "Service is the architecture of memory."
          </h2>
          <p style={{ fontSize: 15, color: 'var(--mute-2)', lineHeight: 1.7, maxWidth: 440 }}>
            Three Michelin-starred dining. A spa drawn from the sea floor.
            Forty-two suites composed for guests who know the difference between a room and a residence.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(247,243,236,0.08)', border: '1px solid rgba(247,243,236,0.08)' }}>
          {[
            { icon: 'spa',    label: 'La Mer Spa',        sub: 'Sea-stone rituals' },
            { icon: 'coffee', label: 'Three restaurants', sub: 'Michelin ★★' },
            { icon: 'pool',   label: 'Infinity pool',     sub: 'Rooftop, heated' },
            { icon: 'leaf',   label: 'Concierge',         sub: '24 h · all languages' },
          ].map((item, i) => (
            <div key={i} style={{ padding: isMobile ? '20px 16px' : '28px 24px', background: 'rgba(26,24,20,0.6)' }}>
              <Icon name={item.icon} size={22} style={{ color: 'var(--brass)', marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--mute-2)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
