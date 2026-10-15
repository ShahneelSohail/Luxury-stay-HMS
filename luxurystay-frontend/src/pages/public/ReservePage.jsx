import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PublicShell from '../../layouts/PublicShell';
import Icon from '../../components/Icon';
import Photo from '../../components/Photo';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Suite name / slug → Photo tone
const NAME_TONES = {
  'Deluxe Twin':   'ivory',
  'Deluxe King':   'warm',
  'Junior Suite':  'sand',
  'Premier Suite': 'deep',
  'Penthouse':     'night',
};
const SLUG_TONES = {
  deluxe_twin:   'ivory',
  deluxe_king:   'warm',
  junior_suite:  'sand',
  premier_suite: 'deep',
  penthouse:     'night',
};

const WEEKDAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function asText(value) {
  return value == null ? '' : String(value);
}

const STEP_TITLES = [
  {
    eyebrow: 'Step I · When',
    h: <>Choose <em>your dates.</em></>,
    sub: 'Three nights or more receive a complimentary spa ritual on arrival, and a chilled bottle of Ruinart in your suite.',
  },
  {
    eyebrow: 'Step II · Where',
    h: <>Choose <em>your suite.</em></>,
    sub: 'Forty-two suites, each composed by hand. Floating tags indicate size and view.',
  },
  {
    eyebrow: 'Step III · Who',
    h: <>Tell us <em>about yourself.</em></>,
    sub: 'A few small marks of the occasion — anything you tell us is held in confidence and pinned to your folio.',
  },
  {
    eyebrow: 'Step IV · Confirm',
    h: <>Review <em>&amp; reserve.</em></>,
    sub: 'A 30% deposit secures the booking. The balance is settled on departure, with no surprises.',
  },
];

const STAY_PREFERENCES = [
  'Down pillow',
  'Espresso amenities',
  'Daily Le Monde',
  'Private dining',
  'Sea-view side',
  'No turn-down',
];

const CTA_LABELS  = ['Choose suite', 'Continue to guest', 'Continue to review', 'Reserve & pay deposit'];
const BACK_LABELS = ['Dates', 'Suite', 'Guest'];

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  const { isMobile } = useBreakpoint();
  const steps = [
    { n: 'I',   l: 'Dates'   },
    { n: 'II',  l: 'Suite'   },
    { n: 'III', l: 'Guest'   },
    { n: 'IV',  l: 'Confirm' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 14, marginBottom: 32 }}>
      {steps.map((s, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
              <div style={{
                width: isMobile ? 28 : 32, height: isMobile ? 28 : 32,
                borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--ink)' : current ? 'var(--brass)' : 'transparent',
                border: done || current ? 'none' : '1px solid var(--hairline)',
                color: done || current ? 'var(--paper)' : 'var(--mute)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: isMobile ? 12 : 14, fontStyle: 'italic',
              }}>
                {done ? <Icon name="check" size={isMobile ? 10 : 12} /> : s.n}
              </div>
              {/* hide labels on mobile — circles + connectors communicate progress clearly */}
              {!isMobile && (
                <span style={{
                  fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: current ? 'var(--ink)' : done ? 'var(--ink-3)' : 'var(--mute)',
                  fontWeight: current ? 700 : 500,
                }}>
                  {s.l}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1,
                maxWidth: isMobile ? 'none' : 80,
                background: done ? 'var(--ink)' : 'var(--hairline)',
              }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Folio Rail ──────────────────────────────────────────────────────────────

function FolioRail({ suite, nights, subtotal, tax, total, cancelBy, onContinue, ctaLabel, canContinue, submitting = false }) {
  const { isTablet } = useBreakpoint();
  const spaFree = nights >= 3;
  return (
    <div style={ isTablet ? {} : { position: 'sticky', top: 110, alignSelf: 'start' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {suite && (
          <Photo
            tone={suite.tone || 'warm'}
            ratio="16/10"
            label={suite.name}
            sub="Your selection"
          />
        )}
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <div className="eyebrow">Folio summary</div>
            <div className="eyebrow" style={{ color: 'var(--brass-deep)' }}>Réservation</div>
          </div>

          {suite && subtotal > 0 ? (
            <>
              {[
                { l: `${nights} night${nights !== 1 ? 's' : ''} · ${suite.name}`, v: `€${subtotal.toLocaleString()}` },
                { l: 'Spa ritual (gift)',  v: spaFree ? '—' : `€${Math.round((suite.rate || 0) * 0.15)}` },
                { l: 'Tourist tax',        v: '€20' },
                { l: 'VAT (10%)',          v: `€${tax.toLocaleString()}` },
              ].map((r, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', fontSize: 13,
                  borderBottom: i < arr.length - 1 ? '1px dotted var(--hairline)' : 'none',
                }}>
                  <span style={{ color: 'var(--mute)' }}>{r.l}</span>
                  <span style={{ fontWeight: 500 }}>{r.v}</span>
                </div>
              ))}
              <div style={{
                borderTop: '1px solid var(--ink)', marginTop: 14, paddingTop: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <span className="eyebrow">Total</span>
                <span className="display numeral" style={{ fontSize: 36, fontStyle: 'italic' }}>
                  €{total.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p style={{
              fontSize: 15, color: 'var(--mute)',
              fontStyle: 'italic', fontFamily: 'var(--serif)',
              margin: 0, padding: '20px 0', fontWeight: 550,
            }}>
              Choose your dates and suite to see a folio summary.
            </p>
          )}

          <button
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%', justifyContent: 'center',
              padding: 16, marginTop: 20,
              opacity: canContinue && !submitting ? 1 : 0.5,
            }}
            onClick={onContinue}
          >
            {ctaLabel} <Icon name="arrow_right" size={12} />
          </button>

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.6, fontWeight: 500 }}>
            <span style={{ color: 'var(--brass-deep)' }}>★</span>
            {cancelBy
              ? ` Free cancellation through ${cancelBy} · Pay 30% deposit now`
              : ' Free cancellation · Pay 30% deposit now'
            }
          </div>
        </div>
      </div>

      {/* Concierge card */}
      <div style={{
        marginTop: 16, padding: '16px 20px',
        background: 'var(--linen)', border: '1px solid var(--hairline)',
        display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'var(--brass)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--paper)',
        }}>
          <Icon name="phone" size={14} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>Speak with a concierge</div>
          <div style={{ color: 'var(--mute)', fontWeight: 500 }}>+33 4 93 88 14 24 · 24h</div>
        </div>
      </div>
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ label, value, onChange, min, max }) {
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

// ─── Step 1 — Dates ──────────────────────────────────────────────────────────

function StepDates({ dates, onDateChange }) {
  const { isMobile } = useBreakpoint();
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);

  function handleDayClick(day) {
    const iso = toISO(calYear, calMonth, day);
    if (!dates.checkIn || (dates.checkIn && dates.checkOut)) {
      onDateChange('checkIn',  iso);
      onDateChange('checkOut', '');
    } else {
      if (iso > dates.checkIn) {
        onDateChange('checkOut', iso);
      } else {
        onDateChange('checkIn',  iso);
        onDateChange('checkOut', '');
      }
    }
  }

  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const daysInMonth   = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWk  = (new Date(calYear, calMonth - 1, 1).getDay() + 6) % 7;
  const cells = [
    ...Array(firstDayOfWk).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const dayISO   = (d) => toISO(calYear, calMonth, d);

  const nights = dates.checkIn && dates.checkOut
    ? Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000) : 0;

  function fmtDisplay(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const monthLabel = `${MONTHS[calMonth - 1]} ${calYear}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Date summary + calendar */}
      <div className="card" style={{ padding: isMobile ? 16 : 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Arrival → Departure</div>
            <div className="display" style={{ fontSize: 26, fontStyle: 'italic', lineHeight: 1 }}>
              {fmtDisplay(dates.checkIn)} → {fmtDisplay(dates.checkOut)}
            </div>
          </div>
          {nights > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Length of stay</div>
              <div className="display numeral" style={{ fontSize: 26, fontStyle: 'italic', lineHeight: 1 }}>
                {nights} night{nights !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 24 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
              <Icon name="arrow_left" size={10} />
            </button>
            <div className="display" style={{ fontSize: 20, fontStyle: 'italic' }}>{monthLabel}</div>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
              <Icon name="arrow_right" size={10} />
            </button>
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, color: 'var(--mute)',
                letterSpacing: '0.14em', textTransform: 'uppercase', paddingBottom: 6, fontWeight: 600,
              }}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso     = dayISO(day);
              const isCI    = dates.checkIn  === iso;
              const isCO    = dates.checkOut === iso;
              const isEdge  = isCI || isCO;
              const inRange = dates.checkIn && dates.checkOut && iso > dates.checkIn && iso < dates.checkOut;
              const isPast  = iso < todayISO;
              return (
                <div
                  key={i}
                  onClick={() => !isPast && handleDayClick(day)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontSize: 14,
                    background: isEdge ? 'var(--ink)' : inRange ? 'var(--linen)' : 'transparent',
                    color: isEdge ? 'var(--paper)' : inRange ? 'var(--ink)' : isPast ? 'var(--mute)' : 'var(--ink-3)',
                    border: `1px solid ${isEdge ? 'var(--ink)' : inRange ? 'var(--hairline)' : 'transparent'}`,
                    cursor: isPast ? 'default' : 'pointer',
                    fontStyle: isEdge ? 'italic' : 'normal',
                    opacity: isPast ? 0.38 : 1,
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 18, fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>
            <span>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--ink)', marginRight: 6, verticalAlign: 'middle' }} />
              Arrival / Departure
            </span>
            <span>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--linen)', border: '1px solid var(--hairline)', marginRight: 6, verticalAlign: 'middle' }} />
              Stay
            </span>
          </div>
        </div>
      </div>

      {/* Guests stepper */}
      <div className="card" style={{ padding: isMobile ? 16 : 32 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Guests</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Stepper label="Adults"   value={dates.adults}   onChange={v => onDateChange('adults', v)}   min={1} max={6} />
          <Stepper label="Children" value={dates.children} onChange={v => onDateChange('children', v)} min={0} max={4} />
        </div>
      </div>

      {/* Contextual note */}
      {nights >= 3 && (
        <div className="card" style={{ padding: 24, background: 'var(--linen)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Icon name="star" size={16} style={{ color: 'var(--brass-deep)', marginTop: 3, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.7, fontFamily: 'var(--serif)' }}>
              <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>
                Stays of three nights or more receive a complimentary spa ritual on arrival.
              </strong>{' '}
              Your folio includes a spa gift — no charge.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — Suite ──────────────────────────────────────────────────────────

function StepSuite({ dates, selectedSuite, onSelect, isMobile }) {
  const [allSuites, setAllSuites] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const nights = Math.ceil(
    (new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/api/suites'),
      api.get('/api/guest/rooms', {
        params: { checkIn: dates.checkIn, checkOut: dates.checkOut, adults: dates.adults },
      }),
    ])
      .then(([suitesRes, availRes]) => {
        setAllSuites(suitesRes.data?.data?.suites ?? []);
        setAvailable(availRes.data?.data?.types   ?? []);
      })
      .catch(() => setError('Could not check availability. Please try again.'))
      .finally(() => setLoading(false));
  }, [dates.checkIn, dates.checkOut, dates.adults]);

  const suites = allSuites.map((suite, i) => {
    const avail = available.find(a => a.type === suite.slug);
    return {
      ...suite,
      num:       String(i + 1).padStart(2, '0'),
      tone:      SLUG_TONES[suite.slug] || 'warm',
      available: !!avail,
      rate:      avail?.rate  || null,
      total:     avail?.total || null,
      count:     avail?.count || 0,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="eyebrow">
        Choose your suite{available.length > 0 ? ` · ${available.length} available` : ''}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--mute)', padding: '24px 0' }}>
          <div className="spinner" style={{ width: 16, height: 16 }} />
          Checking availability…
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
          padding: '12px 16px', fontSize: 13, color: 'var(--terracotta)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <Icon name="alert" size={13} /> {error}
        </div>
      )}

      {!loading && suites.map((s, i) => {
        const isSelected = selectedSuite?.name === s.name;
        return (
          <div
            key={s.id || i}
            onClick={() => s.available && onSelect({ name: s.name, tone: s.tone, rate: s.rate, total: s.total })}
            style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr auto',
              gap: 0, overflow: 'hidden',
              border: isSelected ? '2px solid var(--brass)' : '1px solid var(--hairline)',
              background: 'var(--paper)',
              cursor: s.available ? 'pointer' : 'not-allowed',
              opacity: s.available ? 1 : 0.45,
              transition: 'border-color 0.15s',
            }}
          >
            {/* Photo thumbnail */}
            <Photo tone={s.tone} ratio="4/3" num={s.num} />

            {/* Details */}
            <div style={{ padding: isMobile ? 16 : '28px 28px 28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <h3 className="display" style={{ fontSize: 28, margin: 0, lineHeight: 1 }}>{s.name}</h3>
                {s.sqm && <span style={{ fontSize: 12, color: 'var(--mute)' }}>{s.sqm} m²</span>}
              </div>
              {s.description && (
                <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 14px', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                  {s.description}
                </p>
              )}
              {s.amenities?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.amenities.map((a, j) => (
                    <span key={j} style={{
                      fontSize: 11, padding: '4px 10px',
                      border: '1px solid var(--hairline)',
                      letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
                    }}>
                      {typeof a === 'object' ? a.label : a}
                    </span>
                  ))}
                </div>
              )}
              {!s.available && (
                <span style={{ fontSize: 12, color: 'var(--terracotta)', marginTop: 6, display: 'block', fontWeight: 500 }}>
                  Not available for selected dates
                </span>
              )}
            </div>

            {/* Price + select */}
            <div style={{
              padding: isMobile ? '16px 20px 20px' : '28px 28px',
              borderLeft: isMobile ? 'none' : '1px solid var(--hairline-2)',
              borderTop: isMobile ? '1px solid var(--hairline-2)' : 'none',
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-end',
              textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? 0 : 180,
              background: isSelected ? 'var(--linen)' : 'transparent',
            }}>
              {s.rate ? (
                <>
                  <div>
                    <div className="display numeral" style={{ fontSize: 32, lineHeight: 1, fontStyle: 'italic' }}>
                      €{s.rate.toLocaleString()}
                    </div>
                    <div className="label" style={{ marginTop: 4 }}>per night</div>
                    {s.total && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontWeight: 500 }}>
                        €{s.total.toLocaleString()} total
                      </div>
                    )}
                  </div>
                  <div
                    className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {isSelected ? <><Icon name="check" size={12} /> Selected</> : 'Select'}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--mute)', alignSelf: 'center' }}>Unavailable</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3 — Guest details ───────────────────────────────────────────────────

function StepDetails({ details, onChange, missingFields = [] }) {
  const { isMobile } = useBreakpoint();
  const missing = new Set(missingFields);
  const selectedPreferences = details.stayPreferences || [];

  function togglePreference(preference) {
    onChange(
      'stayPreferences',
      selectedPreferences.includes(preference)
        ? selectedPreferences.filter(p => p !== preference)
        : [...selectedPreferences, preference]
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Primary guest */}
      <div className="card" style={{ padding: isMobile ? 20 : 32 }}>
        <div className="eyebrow" style={{ marginBottom: 20 }}>Primary guest</div>
        {missingFields.length > 0 && (
          <div style={{
            background: 'var(--terracotta-soft)',
            border: '1px solid var(--terracotta)',
            color: 'var(--terracotta)',
            padding: '10px 14px',
            fontSize: 12,
            marginBottom: 18,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <Icon name="alert" size={12} />
            Complete {missingFields.join(', ')} to continue.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
          <div className="field">
            <label>First name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.firstName}
              onChange={e => onChange('firstName', e.target.value)}
              placeholder="Your given name"
              style={missing.has('first name') ? { borderColor: 'var(--terracotta)' } : undefined}
            />
          </div>
          <div className="field">
            <label>Last name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.lastName}
              onChange={e => onChange('lastName', e.target.value)}
              placeholder="Family name"
              style={missing.has('last name') ? { borderColor: 'var(--terracotta)' } : undefined}
            />
          </div>
          <div className="field">
            <label>Mobile <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              type="tel"
              value={details.phone}
              onChange={e => onChange('phone', e.target.value)}
              placeholder="+33 6 12 34 56 78"
              style={missing.has('mobile') ? { borderColor: 'var(--terracotta)' } : undefined}
            />
          </div>
          <div className="field">
            <label>
              Nationality{' '}
              <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>optional</span>
            </label>
            <input
              value={details.nationality}
              onChange={e => onChange('nationality', e.target.value)}
              placeholder="e.g. French"
            />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card" style={{ padding: isMobile ? 20 : 32 }}>
        <div className="eyebrow" style={{ marginBottom: 20 }}>Preferences</div>

        <div className="label" style={{ marginBottom: 10 }}>Stay preferences</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
          {STAY_PREFERENCES.map(p => {
            const checked = selectedPreferences.includes(p);
            return (
              <label
                key={p}
                onClick={() => togglePreference(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', border: '1px solid var(--hairline)',
                  borderRadius: 2, fontSize: 13, cursor: 'pointer',
                  background: checked ? 'var(--linen)' : 'transparent',
                }}
              >
                <span style={{
                  width: 16, height: 16, border: '1px solid var(--ink-3)',
                  borderRadius: 2, flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: checked ? 'var(--ink)' : 'transparent',
                }}>
                  {checked && <Icon name="check" size={10} style={{ color: 'var(--paper)' }} />}
                </span>
                {p}
              </label>
            );
          })}
        </div>

        <div className="field">
          <label>
            Special requests{' '}
            <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>optional</span>
          </label>
          <textarea
            value={details.specialRequests}
            onChange={e => onChange('specialRequests', e.target.value)}
            rows={3}
            placeholder="Allergies, transfers, surprises, particular bottles…"
            style={{ resize: 'vertical', fontFamily: 'var(--serif)', fontStyle: 'italic' }}
          />
        </div>
      </div>

      {/* Étoile member promo */}
      <div className="card" style={{ padding: 24, background: 'var(--linen)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Icon name="crown" size={16} style={{ color: 'var(--brass-deep)', marginTop: 3, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.7, fontFamily: 'var(--serif)' }}>
            <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>Become an Étoile member.</strong>{' '}
            Complimentary on first stay. Earn one night for every five, plus a private welcome on every arrival.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card validation helpers ─────────────────────────────────────────────────

function isValidCardNumber(v) {
  return /^\d{13,19}$/.test(v.replace(/\s/g, ''));
}

function isValidExpiry(v) {
  const m = v.replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = +m[1], year = +m[2] + 2000;
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > new Date();
}

function isValidCvv(v) { return /^\d{3,4}$/.test(v.trim()); }

function computeCardErrors(d) {
  return {
    card:     isValidCardNumber(d.card)    ? '' : 'Enter a valid card number',
    expiry:   isValidExpiry(d.expiry)      ? '' : 'Enter a valid expiry date (MM / YY)',
    cvv:      isValidCvv(d.cvv)           ? '' : 'Enter a valid CVV (3–4 digits)',
    cardName: d.cardName.trim().length > 1 ? '' : 'Enter the name as printed on your card',
    accepted: d.accepted                   ? '' : 'Please accept the terms to continue',
  };
}

// ─── Step 4 — Review & pay ────────────────────────────────────────────────────

function ReviewRow({ l, v }) {
  return (
    <div style={{ paddingBottom: 14, borderBottom: '1px dotted var(--hairline)' }}>
      <div className="label" style={{ marginBottom: 4 }}>{l}</div>
      <div style={{ fontSize: 14, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>{v || '—'}</div>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: 'var(--terracotta)', fontWeight: 500 }}>
      <Icon name="alert" size={10} />{msg}
    </div>
  );
}

function StepReview({ dates, selectedSuite, details, total, onChange, showErrors }) {
  const { isMobile, isTablet } = useBreakpoint();
  const nights = dates.checkIn && dates.checkOut
    ? Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000) : 0;

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  const deposit = Math.round(total * 0.3);
  const errs = showErrors ? computeCardErrors(details) : {};
  const hasErrors = showErrors && Object.values(errs).some(Boolean);

  const inputStyle = (key) => ({
    fontFamily: key === 'card' ? 'var(--mono)' : undefined,
    letterSpacing: key === 'card' ? '0.1em' : undefined,
    borderColor: errs[key] ? 'var(--terracotta)' : undefined,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Reservation summary */}
      <div className="card" style={{ padding: isMobile ? 20 : 32 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Your reservation</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          <ReviewRow l="Guest"     v={`${details.firstName} ${details.lastName}`.trim()} />
          <ReviewRow l="Suite"     v={selectedSuite?.name} />
          <ReviewRow l="Arrival"   v={fmtDate(dates.checkIn)} />
          <ReviewRow l="Departure" v={fmtDate(dates.checkOut)} />
          <ReviewRow l="Nights"    v={String(nights)} />
          <ReviewRow
            l="Guests"
            v={`${dates.adults} adult${dates.adults > 1 ? 's' : ''}${dates.children ? `, ${dates.children} child${dates.children > 1 ? 'ren' : ''}` : ''}`}
          />
          <ReviewRow l="Preferences" v={(details.stayPreferences || []).join(', ')} />
          <ReviewRow l="Notes"     v={details.specialRequests} />
        </div>
      </div>

      {/* Payment */}
      <div className="card" style={{ padding: isMobile ? 20 : 32 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Payment · 30% deposit</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['Visa', 'Mastercard', 'Amex', 'Apple Pay'].map(p => (
            <div key={p} style={{
              padding: isMobile ? '8px 12px' : '10px 16px', border: '1px solid var(--hairline)',
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)',
            }}>{p}</div>
          ))}
        </div>
        {hasErrors && (
          <div style={{
            background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
            padding: '10px 14px', marginBottom: 18,
            fontSize: 12, color: 'var(--terracotta)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <Icon name="alert" size={12} />
            Please correct the highlighted fields before reserving.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: 18, marginBottom: 18,
        }}>
          <div className="field" style={{ gridColumn: isMobile ? undefined : isTablet ? 'span 2' : 'span 3' }}>
            <label>Card number <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.card}
              onChange={e => onChange('card', e.target.value)}
              placeholder="•••• •••• •••• ••••"
              maxLength={19}
              inputMode="numeric"
              style={inputStyle('card')}
            />
            <FieldError msg={errs.card} />
          </div>
          <div className="field">
            <label>Expiry <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.expiry}
              onChange={e => onChange('expiry', e.target.value)}
              placeholder="MM / YY"
              maxLength={7}
              inputMode="numeric"
              style={inputStyle('expiry')}
            />
            <FieldError msg={errs.expiry} />
          </div>
          <div className="field">
            <label>CVV <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.cvv}
              onChange={e => onChange('cvv', e.target.value)}
              placeholder="•••"
              maxLength={4}
              inputMode="numeric"
              style={inputStyle('cvv')}
            />
            <FieldError msg={errs.cvv} />
          </div>
          <div className="field">
            <label>Name on card <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <input
              value={details.cardName}
              onChange={e => onChange('cardName', e.target.value)}
              placeholder="As printed"
              style={inputStyle('cardName')}
            />
            <FieldError msg={errs.cardName} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="key" size={12} />
          Secured with 3-D Secure · charges appear as "LuxuryStay Nice"
        </div>
      </div>

      {/* T&C checkbox */}
      <div className="card" style={{ padding: 24, border: errs.accepted ? '1px solid var(--terracotta)' : undefined }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <span
            style={{
              width: 18, height: 18, marginTop: 2, flexShrink: 0,
              border: `1px solid ${errs.accepted ? 'var(--terracotta)' : details.accepted ? 'var(--ink)' : 'var(--hairline)'}`,
              background: details.accepted ? 'var(--ink)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => onChange('accepted', !details.accepted)}
          >
            {details.accepted && <Icon name="check" size={11} style={{ color: 'var(--paper)' }} />}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, fontFamily: 'var(--serif)' }}>
            I agree to the{' '}
            <a style={{ color: 'var(--brass-deep)', borderBottom: '1px solid var(--brass-deep)', cursor: 'pointer' }}>house terms</a>
            {' '}and{' '}
            <a style={{ color: 'var(--brass-deep)', borderBottom: '1px solid var(--brass-deep)', cursor: 'pointer' }}>cancellation policy</a>
            , and authorise a deposit of{' '}
            <strong style={{ color: 'var(--ink)' }}>€{deposit.toLocaleString()}</strong>
            {' '}to be charged today. The balance is settled on departure.
          </span>
        </label>
        <FieldError msg={errs.accepted} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuestBookPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const toast       = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const [step, setStep] = useState(0);

  const preselectedSuite = location.state?.suite || '';

  const [dates, setDates] = useState({ checkIn: '', checkOut: '', adults: 2, children: 0 });

  const [selectedSuite, setSelectedSuite] = useState(
    preselectedSuite
      ? { name: preselectedSuite, tone: NAME_TONES[preselectedSuite] || 'warm', rate: null, total: null }
      : null
  );

  const [details, setDetails] = useState({
    firstName:       asText(user?.name).split(' ')[0]             || '',
    lastName:        asText(user?.name).split(' ').slice(1).join(' ') || '',
    phone:           asText(user?.phone),
    nationality:     '',
    specialRequests: '',
    stayPreferences: [],
    card:            '',
    expiry:          '',
    cvv:             '',
    cardName:        '',
    accepted:        false,
  });

  const [submitting,         setSubmitting]         = useState(false);
  const [showPaymentErrors,  setShowPaymentErrors]  = useState(false);

  function updateDate(field, value) {
    setDates(d => ({ ...d, [field]: value }));
  }

  function updateDetail(field, value) {
    if (field === 'card') {
      const digits = value.replace(/\D/g, '').slice(0, 16);
      value = digits.replace(/(.{4})/g, '$1 ').trim();
    }
    if (field === 'expiry') {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      value = digits.length > 2 ? digits.slice(0, 2) + ' / ' + digits.slice(2) : digits;
    }
    if (field === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setDetails(d => ({ ...d, [field]: value }));
  }

  // Derived values
  const nights = dates.checkIn && dates.checkOut
    ? Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000) : 0;

  const subtotal = selectedSuite?.total
    || (selectedSuite?.rate && nights > 0 ? selectedSuite.rate * nights : 0);
  const tax   = Math.round(subtotal * 0.1);
  const total = subtotal > 0 ? subtotal + tax + 20 : 0;

  const cancelBy = (() => {
    if (!dates.checkIn) return null;
    const d = new Date(dates.checkIn + 'T00:00:00');
    d.setDate(d.getDate() - 3);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  })();

  const missingGuestFields = [
    !asText(details.firstName).trim() && 'first name',
    !asText(details.lastName).trim() && 'last name',
    !asText(details.phone).trim() && 'mobile',
  ].filter(Boolean);

  const cardErrors = computeCardErrors(details);
  const missingPaymentFields = Object.values(cardErrors).filter(Boolean);

  const canContinue = [
    !!(dates.checkIn && dates.checkOut && nights > 0),
    selectedSuite !== null,
    missingGuestFields.length === 0,
    missingPaymentFields.length === 0,
  ][step];

  const ctaLabel = CTA_LABELS[step];
  const t        = STEP_TITLES[step];

  async function handleSubmit() {
    if (!isAuthenticated || user?.role !== 'guest') {
      toast.error('Please sign in to your guest account to complete the booking.');
      navigate('/login', { state: { from: { pathname: '/book' } } });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/guest/book', {
        checkIn:         dates.checkIn,
        checkOut:        dates.checkOut,
        adults:          dates.adults,
        children:        dates.children,
        roomType:        selectedSuite.name,
        firstName:       asText(details.firstName).trim(),
        lastName:        asText(details.lastName).trim(),
        phone:           asText(details.phone).trim(),
        nationality:     asText(details.nationality).trim(),
        specialRequests: asText(details.specialRequests).trim(),
        stayPreferences: details.stayPreferences || [],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guest/reservations'] });
      navigate('/confirm', { state: { booking: data.data.booking }, replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    if (!canContinue) {
      if (step === 3) setShowPaymentErrors(true);
      const messages = [
        'Choose arrival and departure dates.',
        'Select an available suite.',
        `Complete ${missingGuestFields.join(', ')}.`,
        'Please fill in all payment details correctly.',
      ];
      toast.error(messages[step] || 'Complete this step to continue.');
      return;
    }
    if (step === 3) handleSubmit();
    else setStep(s => s + 1);
  }

  const submittingCta = step === 3 && submitting;

  return (
    <PublicShell>
      <section style={{ padding: isMobile ? '32px 20px 60px' : isTablet ? '40px 40px 80px' : '48px 64px 80px', maxWidth: 1440, margin: '0 auto' }}>

        <StepIndicator step={step} />

        <div className="eyebrow" style={{ marginBottom: 14, color: 'var(--brass-deep)' }}>{t.eyebrow}</div>
        <h1 className="display" style={{ fontSize: 'clamp(36px, 6.4vw, 80px)', margin: '0 0 12px', lineHeight: 1.02 }}>
          {t.h}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 40, maxWidth: 600, fontFamily: 'var(--serif)' }}>
          {t.sub}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.6fr 1fr', gap: isMobile ? 24 : 40 }}>

          {/* ── Left: step content ── */}
          <div>
            {step === 0 && (
              <StepDates dates={dates} onDateChange={updateDate} />
            )}
            {step === 1 && (
              <StepSuite dates={dates} selectedSuite={selectedSuite} onSelect={setSelectedSuite} isMobile={isMobile} />
            )}
            {step === 2 && (
              <StepDetails details={details} onChange={updateDetail} missingFields={missingGuestFields} />
            )}
            {step === 3 && (
              <StepReview
                dates={dates}
                selectedSuite={selectedSuite}
                details={details}
                total={total}
                onChange={updateDetail}
                showErrors={showPaymentErrors}
              />
            )}

            {/* Bottom navigation */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--hairline)',
            }}>
              {step > 0 ? (
                <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
                  <Icon name="arrow_left" size={12} /> Back · {BACK_LABELS[step - 1]}
                </button>
              ) : <span />}
              <button
                className="btn btn-primary"
                disabled={submitting}
                style={{ opacity: canContinue && !submitting ? 1 : 0.5 }}
                onClick={handleContinue}
              >
                {submittingCta
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} /> Confirming…</>
                  : <>{ctaLabel} <Icon name="arrow_right" size={12} /></>
                }
              </button>
            </div>
          </div>

          {/* ── Right: Folio Rail ── */}
          <FolioRail
            suite={selectedSuite}
            nights={nights}
            subtotal={subtotal}
            tax={tax}
            total={total}
            cancelBy={cancelBy}
            onContinue={handleContinue}
            ctaLabel={submittingCta ? 'Confirming…' : ctaLabel}
            canContinue={canContinue}
            submitting={submitting}
          />

        </div>
      </section>
    </PublicShell>
  );
}
