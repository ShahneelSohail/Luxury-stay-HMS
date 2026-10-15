import { useState } from 'react';
import PublicShell from '../../layouts/PublicShell';
import Icon from '../../components/Icon';
import Ornament from '../../components/Ornament';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const SUBJECTS = [
  { value: 'reservation', label: 'Reservation enquiry'               },
  { value: 'event',       label: 'Private event · wedding · celebration' },
  { value: 'press',       label: 'Press'                             },
  { value: 'career',      label: 'Careers'                           },
  { value: 'other',       label: 'Other'                             },
];

const EMPTY = {
  firstName: '', lastName: '', email: '',
  phone: '', language: 'en',
  subject: 'reservation', message: '',
};

// ─── Feedback section (authenticated guests only — unchanged) ─────────────────

function FeedbackSection({ reservations }) {
  const toast    = useToast();
  const eligible = reservations.filter(r => r.status === 'checked-out');

  const [resId,        setResId]        = useState(eligible[0]?._id || '');
  const [rating,       setRating]       = useState(0);
  const [hover,        setHover]        = useState(0);
  const [comment,      setComment]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function submit(e) {
    e.preventDefault();
    if (!resId)          { toast.error('Please select a reservation.'); return; }
    if (!rating)         { toast.error('Please select a star rating.'); return; }
    if (!comment.trim()) { toast.error('Please write a comment.'); return; }
    setLoading(true);
    try {
      await api.post('/api/guest/feedback', { reservationId: resId, rating, comment });
      toast.success('Thank you for your feedback!');
      setFeedbackDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit feedback.');
    } finally {
      setLoading(false);
    }
  }

  if (feedbackDone) {
    return (
      <div style={{ border: '1px solid var(--hairline)', padding: '36px 32px', textAlign: 'center', background: 'var(--paper)', maxWidth: 520 }}>
        <div style={{ fontSize: 36, marginBottom: 12, color: '#C9A84C' }}>★</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Thank you!</div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Your feedback has been received and means a great deal to us.</p>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setFeedbackDone(false); setRating(0); setComment(''); }}>
          Leave more feedback
        </button>
      </div>
    );
  }

  if (eligible.length === 0) {
    return (
      <div style={{ border: '1px solid var(--hairline)', padding: '48px 32px', textAlign: 'center', background: 'var(--paper)', maxWidth: 520 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No completed stays yet</div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          Feedback can be submitted after your check-out. We look forward to hearing from you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 560 }}>
      {eligible.length > 1 && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Which stay?</label>
          <select value={resId} onChange={e => setResId(e.target.value)}>
            {eligible.map(r => (
              <option key={r._id} value={r._id}>
                {r.room?.number ? `Room ${r.room.number}` : 'Room TBA'} · {fmtDate(r.checkIn)} – {fmtDate(r.checkOut)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n} type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            style={{
              fontSize: 32, lineHeight: 1, padding: 0, border: 'none', background: 'none',
              cursor: 'pointer', color: n <= (hover || rating) ? '#C9A84C' : 'var(--hairline)',
              transition: 'color 0.1s',
            }}
          >★</button>
        ))}
        {rating > 0 && (
          <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 8 }}>
            {['','Poor','Fair','Good','Very good','Excellent'][rating]}
          </span>
        )}
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Your comment</label>
        <textarea rows={5} value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Tell us about your stay…" style={{ resize: 'vertical' }} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
        {loading
          ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Submitting…</>
          : <>Submit feedback <Icon name="arrow_right" size={12} /></>}
      </button>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const isGuest = isAuthenticated && user?.role === 'guest';
  const { data: resData } = useApi(isGuest ? '/api/guest/reservations' : null);
  const reservations = resData?.reservations ?? [];

  const [form,        setForm]        = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading,     setLoading]     = useState(false);
  const [sent,        setSent]        = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => ({ ...e, [field]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim())  errors.lastName  = 'Last name is required.';
    if (!form.email.trim())     errors.email     = 'Email is required.';
    if (!form.message.trim())   errors.message   = 'Message is required.';
    else if (form.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';

    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setLoading(true);
    try {
      await api.post('/api/contact', {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        subject:   SUBJECTS.find(s => s.value === form.subject)?.label || form.subject,
        message:   form.message.trim(),
      });
      setSent(true);
      toast.success("Message sent — we'll be in touch shortly.");
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors?.length) {
        const map = {};
        serverErrors.forEach(e => { map[e.field] = e.message; });
        setFieldErrors(map);
      } else {
        toast.error(err.response?.data?.message || 'Could not send message. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicShell>

      {/* ── Section 1: Intro header ──────────────────────────────────── */}
      <section style={{ padding: isMobile ? '40px 24px 32px' : isTablet ? '48px 40px 32px' : '60px 64px 40px', maxWidth: 1440, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Folio VI · Correspondence</div>
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.2fr 1fr', gap: isTablet ? 24 : 64, alignItems: 'end' }}>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 88px)', margin: 0, lineHeight: 1.02 }}>
            A note, <em>before</em><br />you arrive.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', lineHeight: 1.75, fontFamily: 'var(--serif)', maxWidth: 460, margin: 0 }}>
            Our concierge replies within four hours, in any language, day or night.
            For urgent matters during travel, the direct line below is answered by a human, always.
          </p>
        </div>
      </section>

      {/* ── Section 2: Map + channels ────────────────────────────────── */}
      <section style={{ padding: isMobile ? '32px 24px 40px' : isTablet ? '40px 40px 48px' : '60px 64px 60px', maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: isTablet ? 40 : 40 }}>

        {/* SVG faux map */}
        <div style={{
          position: 'relative', aspectRatio: '16/10',
          border: '1px solid var(--hairline)', overflow: 'hidden',
          background: 'linear-gradient(160deg, #EFE8DB, #D9D2C3)',
        }}>
          <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <defs>
              <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(74,68,59,0.08)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="500" fill="url(#mapgrid)" />
            {/* coastline */}
            <path d="M 0 380 Q 200 360 400 370 T 800 350 L 800 500 L 0 500 Z" fill="#7A8A8E" opacity="0.35" />
            <path d="M 0 380 Q 200 360 400 370 T 800 350" fill="none" stroke="#4A5A60" strokeWidth="1.2" />
            {/* roads */}
            <path d="M 0 200 Q 250 230 500 220 T 800 240" fill="none" stroke="rgba(74,68,59,0.3)" strokeWidth="1" />
            <path d="M 200 0 L 250 500"  fill="none" stroke="rgba(74,68,59,0.2)" strokeWidth="1" />
            <path d="M 600 0 L 550 500"  fill="none" stroke="rgba(74,68,59,0.2)" strokeWidth="1" />
            {/* building parcels */}
            {Array.from({ length: 14 }).map((_, i) => {
              const x = (i % 7) * 110 + 30;
              const y = Math.floor(i / 7) * 120 + 50;
              return (
                <rect key={i} x={x} y={y} width="80" height="90"
                  fill="rgba(160,128,84,0.1)" stroke="rgba(74,68,59,0.15)" strokeWidth="0.5" />
              );
            })}
            {/* location pin */}
            <circle cx="420" cy="290" r="36" fill="rgba(160,128,84,0.2)" />
            <circle cx="420" cy="290" r="14" fill="#A08054" />
            <text x="420" y="294" textAnchor="middle" fill="#FBF8F2"
              fontFamily="serif" fontSize="14" fontStyle="italic">★</text>
          </svg>

          {/* Address card */}
          <div style={{
            position: 'absolute', top: 24, left: 24,
            background: 'var(--paper)', padding: '14px 18px',
            border: '1px solid var(--ink)',
          }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Maison Étoile</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontStyle: 'italic' }}>
              14 Promenade des Anglais
            </div>
            <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2, fontWeight: 500 }}>06000 Nice · France</div>
          </div>

          {/* Coordinates */}
          <div style={{
            position: 'absolute', bottom: 24, right: 24,
            fontSize: 12, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
          }}>
            43.6961° N · 7.2719° E
          </div>
        </div>

        {/* Contact channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { i: 'phone', l: 'Concierge · 24h',   main: '+33 4 93 88 14 24',          sub: 'All languages · always a human'        },
            { i: 'mail',  l: 'Reservations',        main: 'reservations@luxurystay.co', sub: 'Reply within 4 hours'                  },
            { i: 'leaf',  l: 'Press & enquiries',   main: 'press@luxurystay.co',        sub: 'Veuillez écrire à Madame Aubert'       },
            { i: 'key',   l: 'The house',           main: '14 Promenade des Anglais',   sub: '06000 Nice · France'                   },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 18, padding: '20px 0',
              borderBottom: '1px solid var(--hairline)',
            }}>
              <div style={{
                width: 40, height: 40, flexShrink: 0,
                border: '1px solid var(--hairline)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--brass-deep)',
              }}>
                <Icon name={c.i} size={16} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{c.l}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic', lineHeight: 1.1 }}>{c.main}</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 6, letterSpacing: '0.04em', fontWeight: 500 }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Hours + form ──────────────────────────────────── */}
      <section style={{ padding: isMobile ? '32px 24px 80px' : isTablet ? '40px 40px 80px' : '40px 64px 100px', maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1.4fr', gap: 48, alignItems: 'start' }}>

        {/* Hours table */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Hours · venues of the house</div>
          {[
            { v: 'Reception',          h: '24 hours'              },
            { v: 'Le Jardin · dining', h: '19:00 – 23:00 · Wed–Sun' },
            { v: 'Le Petit Bar',       h: '17:00 – 02:00 · daily' },
            { v: 'La Mer · spa',       h: '08:00 – 21:00 · daily' },
            { v: 'Pool & cabanas',     h: '07:00 – sunset'        },
            { v: 'Concierge desk',     h: '06:00 – 22:00'         },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--hairline)',
            }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic' }}>{r.v}</span>
              <span style={{ fontSize: 13, color: 'var(--mute)', letterSpacing: '0.03em', fontWeight: 500 }}>{r.h}</span>
            </div>
          ))}
          <div style={{
            marginTop: 24, padding: 18,
            background: 'var(--linen)',
            fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6,
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 500,
          }}>
            Closed annually for renewal, the first two weeks of February.
          </div>
        </div>

        {/* Contact form */}
        {sent ? (
          <div style={{
            border: '1px solid var(--hairline)',
            padding: '64px 48px', textAlign: 'center',
            background: 'var(--paper)',
          }}>
            <Ornament>·  ★  ·</Ornament>
            <div className="eyebrow" style={{ margin: '24px 0 14px', color: 'var(--brass-deep)' }}>Message received</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 4vw, 52px)', margin: '0 0 16px', lineHeight: 1 }}>
              Thank <em>you.</em>
            </h2>
            <p style={{
              fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7,
              maxWidth: 400, margin: '0 auto 32px',
              fontFamily: 'var(--serif)', fontStyle: 'italic',
            }}>
              We will respond within four hours. In the meantime, you are welcome to explore our suites or make a reservation.
            </p>
            <button className="btn btn-ghost" onClick={() => { setSent(false); setForm(EMPTY); }}>
              Send another message
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: isMobile ? 20 : 40, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <div className="eyebrow">Send a message</div>
              <div style={{ fontSize: 12, color: 'var(--brass-deep)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
                ★ Reply within 4h
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>

                {/* First name */}
                <div className="field">
                  <label>First name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <input
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    placeholder="Your name"
                    style={fieldErrors.firstName ? { borderColor: 'var(--terracotta)' } : {}}
                  />
                  {fieldErrors.firstName && (
                    <p style={{ color: 'var(--terracotta)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="alert" size={11} />{fieldErrors.firstName}
                    </p>
                  )}
                </div>

                {/* Last name */}
                <div className="field">
                  <label>Last name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <input
                    value={form.lastName}
                    onChange={e => set('lastName', e.target.value)}
                    placeholder="Your name"
                    style={fieldErrors.lastName ? { borderColor: 'var(--terracotta)' } : {}}
                  />
                  {fieldErrors.lastName && (
                    <p style={{ color: 'var(--terracotta)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="alert" size={11} />{fieldErrors.lastName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Email <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@example.com"
                    style={fieldErrors.email ? { borderColor: 'var(--terracotta)' } : {}}
                  />
                  {fieldErrors.email && (
                    <p style={{ color: 'var(--terracotta)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="alert" size={11} />{fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="field">
                  <label>Phone <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>optional</span></label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+33…"
                  />
                </div>

                {/* Preferred language */}
                <div className="field">
                  <label>Preferred language</label>
                  <select value={form.language} onChange={e => set('language', e.target.value)}>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="it">Italiano</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>

                {/* Subject */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Subject</label>
                  <select value={form.subject} onChange={e => set('subject', e.target.value)}>
                    {SUBJECTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Message <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="How may we be of service?"
                    style={{ resize: 'vertical', ...(fieldErrors.message ? { borderColor: 'var(--terracotta)' } : {}) }}
                  />
                  {fieldErrors.message && (
                    <p style={{ color: 'var(--terracotta)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="alert" size={11} />{fieldErrors.message}
                    </p>
                  )}
                </div>

              </div>

              {/* Form footer */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: 16, marginTop: 24,
              }}>
                <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>
                  By writing, you accept our discretion policy.
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ padding: isMobile ? '14px' : '14px 30px', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                >
                  {loading
                    ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Sending…</>
                    : <>Send message <Icon name="arrow_right" size={12} /></>
                  }
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ── Feedback (authenticated guests only) ─────────────────────── */}
      {isGuest && (
        <section style={{ borderTop: '1px solid var(--hairline)', padding: isMobile ? '48px 24px' : isTablet ? '60px 40px' : '80px 64px', maxWidth: 1440, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>Share your experience</div>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 4vw, 56px)', margin: '0 0 16px', lineHeight: 1 }}>
            Share your <em>experience.</em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', maxWidth: 520, marginBottom: 40, lineHeight: 1.7 }}>
            We read every review. Your words shape the way we welcome guests.
          </p>
          <FeedbackSection reservations={reservations} />
        </section>
      )}

    </PublicShell>
  );
}
