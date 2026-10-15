import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import Photo from '../../components/Photo';
import PublicShell from '../../layouts/PublicShell';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// ─── History panel ────────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  booking_created:        { icon: 'calendar', color: '#2D7A4F', label: 'Reservation created' },
  checked_in:             { icon: 'key',      color: '#A07830', label: 'Checked in' },
  checked_out:            { icon: 'check',    color: '#6B6459', label: 'Checked out' },
  booking_cancelled:      { icon: 'x',        color: '#B94040', label: 'Reservation cancelled' },
  staff_forced_available: { icon: 'wrench',   color: '#B94040', label: 'Room released by staff' },
};

function HistoryPanel({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    api.get('/api/guest/history')
      .then(r => setHistory(r.data?.data?.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.35)' }} />
      <div style={{
        position: 'relative', width: 400, background: 'var(--paper)',
        borderLeft: '1px solid var(--hairline)', height: '100%',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>My account</div>
            <h2 className="display" style={{ fontSize: 26, margin: 0 }}>Stay history</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div style={{ padding: '24px 28px', flex: 1 }}>
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--mute)', fontSize: 13 }}>
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              Loading history…
            </div>
          )}
          {!loading && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--mute)' }}>
              No activity recorded yet.
            </div>
          )}
          {!loading && history.length > 0 && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 1, background: 'var(--hairline)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {history.map((entry, i) => {
                  const cfg = EVENT_CONFIG[entry.eventType] || { icon: 'star', color: 'var(--brass)', label: entry.eventType };
                  const date = new Date(entry.createdAt);
                  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={entry._id || i} style={{ display: 'flex', gap: 16, paddingBottom: 24, position: 'relative' }}>
                      <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: 'var(--paper)', border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, zIndex: 1 }}>
                        <Icon name={cfg.icon} size={13} />
                      </div>
                      <div style={{ paddingTop: 4, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{cfg.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 6 }}>{entry.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>
                          {dateStr} · {timeStr}
                          {entry.performedBy && entry.performedBy !== 'Guest Portal' && (
                            <span style={{ marginLeft: 6, color: 'var(--ink-3)' }}>— {entry.performedBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--hairline)' }}>
          <Link to="/settings" style={{ fontSize: 13, color: 'var(--brass-deep)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="arrow_right" size={12} /> Profile &amp; settings
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function nightsRemaining(checkOutIso) {
  if (!checkOutIso) return 0;
  const diff = new Date(checkOutIso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function toRoman(n) {
  if (!n || n <= 0) return '—';
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

// ─── Static maps ─────────────────────────────────────────────────────────────

const GRAD_MAP = {
  deluxe_twin:   'linear-gradient(140deg, #EFE8DB, #C9AE82)',
  deluxe_king:   'linear-gradient(140deg, #C9AE82, #A08054)',
  junior_suite:  'linear-gradient(140deg, #A08054, #806339)',
  premier_suite: 'linear-gradient(140deg, #806339, #4A443B)',
  penthouse:     'linear-gradient(140deg, #4A443B, #1A1814)',
};

const SLUG_TONES = {
  deluxe_twin:   'ivory',
  deluxe_king:   'warm',
  junior_suite:  'sand',
  premier_suite: 'deep',
  penthouse:     'night',
};

const TYPE_LABEL = {
  deluxe_twin:   'Deluxe Twin',
  deluxe_king:   'Deluxe King',
  junior_suite:  'Junior Suite',
  premier_suite: 'Premier Suite',
  penthouse:     'Penthouse',
};

const STATUS_STYLE = {
  confirmed:     { bg: '#EBF4EE', color: '#2D7A4F', label: 'Confirmed'   },
  'checked-in':  { bg: '#FBF3E8', color: '#A07830', label: 'Checked In'  },
  'checked-out': { bg: '#F3F0EC', color: '#6B6459', label: 'Checked Out' },
  cancelled:     { bg: '#FBE8E8', color: '#B94040', label: 'Cancelled'   },
  pending:       { bg: '#F3F0EC', color: '#6B6459', label: 'Pending'     },
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--mute)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: 'var(--linen)', color: 'var(--ink-3)', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

// ─── Service request modal ────────────────────────────────────────────────────

function ServiceModal({ service, onClose, onSubmit }) {
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(service.type, notes);
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--paper)', padding: 36, maxWidth: 440, width: '100%', border: '1px solid var(--hairline)' }} onClick={e => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Request</div>
        <h3 className="display" style={{ fontSize: 28, margin: '0 0 8px' }}>{service.label}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6 }}>
          Add any details or instructions below. Our team will attend promptly.
        </p>
        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. please bring extra towels, preferred time…" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Sending…</> : <>Send request <Icon name="arrow_right" size={12} /></>}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Maintenance modal ────────────────────────────────────────────────────────

const MAINT_CATS = [
  { value: 'plumbing',   label: 'Plumbing'          },
  { value: 'electrical', label: 'Electrical'         },
  { value: 'ac',         label: 'Air conditioning'   },
  { value: 'hvac',       label: 'Heating / ventilation' },
  { value: 'furniture',  label: 'Furniture'          },
  { value: 'technology', label: 'Technology / AV'    },
  { value: 'structural', label: 'Structural'         },
  { value: 'other',      label: 'Other'              },
];

function MaintenanceModal({ onClose, onSubmit }) {
  const [form,    setForm]    = useState({ category: 'other', description: '' });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setLoading(true);
    await onSubmit(form.category, form.description);
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--paper)', padding: 36, maxWidth: 460, width: '100%', border: '1px solid var(--hairline)' }} onClick={e => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Report a concern</div>
        <h3 className="display" style={{ fontSize: 28, margin: '0 0 8px' }}>Maintenance</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6 }}>
          Describe what needs attention. Tomás and the team will attend within the hour.
        </p>
        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {MAINT_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Description <span style={{ color: 'var(--terracotta)' }}>*</span></label>
            <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Please describe the issue…" style={{ resize: 'vertical' }} required />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.description.trim()} style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Sending…</> : <>Submit report <Icon name="arrow_right" size={12} /></>}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SERVICES = [
  { label: 'In-room dining',        sub: 'Menu · 24h',                 icon: 'coffee',      type: 'room_service'  },
  { label: 'Housekeeping refresh',  sub: 'Turn-down · linens',         icon: 'sparkle',     type: 'amenities'     },
  { label: 'Wake-up call',          sub: 'Verbal · or piano',          icon: 'clock',       type: 'wake_up_call'  },
  { label: 'Laundry & pressing',    sub: 'Returned · 4h',              icon: 'leaf',        type: 'laundry'       },
  { label: 'Airport transfer',      sub: 'Sedan or limousine',         icon: 'arrow_right', type: 'transport'     },
  { label: 'Reserve dinner',        sub: 'Le Jardin · 2★',            icon: 'star',        type: 'dining'        },
  { label: 'Spa appointment',       sub: 'Six rituals · two hammams',  icon: 'spa',         type: 'spa'           },
  { label: 'Maintenance · discreet',sub: 'Tomás · within the hour',   icon: 'wrench',      type: 'maintenance'   },
  { label: 'Late check-out',        sub: '€60 / hour · availability',  icon: 'key',         type: 'late_checkout' },
];

const TODAY_SCHEDULE = [
  { time: '07:00', t: 'Morning pool opens',        s: 'Heated · towels & water provided',         i: 'sparkle', status: 'Daily'          },
  { time: '07:30', t: 'Breakfast · Le Jardin',     s: 'À la carte & buffet · until 11:00',        i: 'coffee',  status: 'Until 11:00'    },
  { time: '10:00', t: 'Spa & hammam open',         s: 'Six rituals · two hammams · book at desk', i: 'spa',     status: 'Until 21:00'    },
  { time: '12:30', t: 'Lunch · Le Jardin',         s: 'Light menu & sharing plates',              i: 'star',    status: 'Until 15:00'    },
  { time: '16:00', t: 'Afternoon tea · terrace',   s: 'Pâtisserie, tisanes & pressed juices',     i: 'coffee',  status: 'Until 18:00'    },
  { time: '18:30', t: 'Sunset aperitif · garden',  s: 'Champagne & canapés · complimentary',      i: 'leaf',    status: 'Until 20:00'    },
  { time: '19:30', t: 'Dinner · Le Jardin',        s: 'Tasting & à la carte menus',               i: 'star',    status: 'Until 22:30'    },
  { time: '22:00', t: 'Bar Étoile',                s: 'Cocktails, wines & nightcaps',             i: 'key',     status: 'Until midnight' },
];

// ─── Reservation detail slide-over ───────────────────────────────────────────

function ReservationDetailPanel({ reservation: r, onClose, onCancel, cancelling }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!r) return null;
  const grad  = GRAD_MAP[r.room?.type]   || 'linear-gradient(140deg, #C9AE82, #A08054)';
  const label = TYPE_LABEL[r.room?.type] || r.room?.type || 'Suite';
  const cancellable  = ['pending', 'confirmed'].includes(r.status);
  const statusStyle  = STATUS_STYLE[r.status] || { bg: 'var(--linen)', color: 'var(--ink-3)', label: r.status };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.35)' }} />
      <div style={{ position: 'relative', width: 420, background: 'var(--paper)', borderLeft: '1px solid var(--hairline)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Reservation details</div>
              <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{label}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-3)' }}>
              <Icon name="x" size={18} />
            </button>
          </div>
          <span style={{ display: 'inline-block', background: statusStyle.bg, color: statusStyle.color, padding: '3px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {statusStyle.label}
          </span>
        </div>
        <div style={{ aspectRatio: '16/9', background: grad, position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', bottom: 16, left: 20, fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic', color: 'rgba(247,243,236,0.7)' }}>
            {r.room?.number || label?.charAt(0)}
          </div>
        </div>
        <div style={{ padding: '24px 28px', flex: 1 }}>
          {[
            { label: 'Room',       value: r.room?.number ? `Room ${r.room.number}` : 'TBA' },
            { label: 'Suite type', value: label },
            { label: 'Check-in',   value: fmtDate(r.checkIn)  },
            { label: 'Check-out',  value: fmtDate(r.checkOut) },
            { label: 'Nights',     value: r.nights ?? '—' },
            { label: 'Guests',     value: `${r.adults ?? 1} adult${(r.adults ?? 1) !== 1 ? 's' : ''}${r.children > 0 ? ` · ${r.children} child${r.children !== 1 ? 'ren' : ''}` : ''}` },
            { label: 'Total',      value: `€${Number(r.totalAmount || 0).toLocaleString()}` },
            { label: 'Deposit',    value: r.depositAmount ? `€${Number(r.depositAmount).toLocaleString()}${r.depositPaid ? ' · Paid' : ' · Pending'}` : '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--hairline-2)', fontSize: 13 }}>
              <span style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
          {r.specialRequests && (
            <div style={{ marginTop: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Special requests</div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>{r.specialRequests}</p>
            </div>
          )}
        </div>
        {cancellable && (
          <div style={{ padding: '20px 28px', borderTop: '1px solid var(--hairline)' }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, lineHeight: 1.5, fontWeight: 500 }}>
              Free cancellation is available up to 72 hours before arrival.
            </p>
            <button onClick={() => onCancel(r._id)} disabled={cancelling} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--terracotta)', borderColor: 'var(--terracotta)', opacity: cancelling ? 0.6 : 1 }}>
              {cancelling
                ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--terracotta)' }} />Cancelling…</>
                : <><Icon name="x" size={12} />Cancel this reservation</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cancel confirmation modal ────────────────────────────────────────────────

function CancelConfirmModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.55)' }} onClick={onCancel} />
      <div style={{ position: 'relative', background: 'var(--paper)', border: '1px solid var(--hairline)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ background: 'var(--terracotta-soft, #FBE8E8)', borderBottom: '1px solid var(--terracotta)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: 'var(--terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ivory)' }}>
            <Icon name="alert" size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--terracotta)' }}>Cancel reservation</div>
            <div style={{ fontSize: 12, color: 'var(--terracotta)', opacity: 0.9, marginTop: 1, fontWeight: 500 }}>This action cannot be undone</div>
          </div>
        </div>
        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 12px' }}>Are you sure you want to <strong>cancel this reservation?</strong></p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-3)', margin: 0 }}>Once cancelled, you will need to make a new reservation. Please contact our concierge if you need to modify your booking instead.</p>
        </div>
        <div style={{ padding: '14px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Keep reservation</button>
          <button className="btn btn-primary" style={{ background: 'var(--terracotta)', borderColor: 'var(--terracotta)' }} onClick={onConfirm}>
            <Icon name="x" size={13} /> Yes, cancel it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feedback modal ───────────────────────────────────────────────────────────

const RATE_CATEGORIES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'service',     label: 'Service'     },
  { key: 'comfort',     label: 'Comfort'     },
  { key: 'value',       label: 'Value'       },
];

function StarRow({ label, value, onChange, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--hairline-2)' }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: 'var(--terracotta)', marginLeft: 2 }}>*</span>}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 3px', fontSize: 22, lineHeight: 1,
              color: n <= (value || 0) ? 'var(--brass-deep)' : 'var(--hairline)',
              transition: 'color 0.1s',
            }}
          >★</button>
        ))}
      </div>
    </div>
  );
}

function FeedbackModal({ reservation: r, onClose, onSubmitted }) {
  const toast    = useToast();
  const [ratings, setRatings]   = useState({ overall: 0, cleanliness: 0, service: 0, comfort: 0, value: 0 });
  const [nps,     setNps]       = useState(null);
  const [comment, setComment]   = useState('');
  const [saving,  setSaving]    = useState(false);

  const label = TYPE_LABEL[r.room?.type] || r.room?.type || 'Suite';

  function setRating(key, val) {
    setRatings(prev => ({ ...prev, [key]: prev[key] === val ? 0 : val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ratings.overall) { toast.error('Please give an overall rating.'); return; }
    setSaving(true);
    try {
      const payload = {
        reservationId: r._id,
        ratings: {
          overall:     ratings.overall,
          ...(ratings.cleanliness && { cleanliness: ratings.cleanliness }),
          ...(ratings.service     && { service:     ratings.service     }),
          ...(ratings.comfort     && { comfort:     ratings.comfort     }),
          ...(ratings.value       && { value:       ratings.value       }),
        },
        comment:  comment.trim() || undefined,
        npsScore: nps,
      };
      await api.post('/api/guest/feedback', payload);
      toast.success('Thank you for your feedback!');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit feedback.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--paper)', maxWidth: 500, width: '100%', border: '1px solid var(--hairline)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Share your experience</div>
            <h3 className="display" style={{ fontSize: 26, margin: 0 }}>Rate your <em>stay.</em></h3>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, fontWeight: 500 }}>{label} · {fmtDate(r.checkIn)} – {fmtDate(r.checkOut)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 28px' }}>
            {/* Star ratings */}
            <div style={{ marginBottom: 20 }}>
              <StarRow label="Overall rating" value={ratings.overall} onChange={v => setRating('overall', v)} required />
              {RATE_CATEGORIES.map(c => (
                <StarRow key={c.key} label={c.label} value={ratings[c.key]} onChange={v => setRating(c.key, v)} />
              ))}
            </div>

            {/* NPS */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                How likely are you to recommend us? <span style={{ color: 'var(--mute)', fontWeight: 500 }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNps(nps === n ? null : n)}
                    style={{
                      width: 36, height: 36, border: nps === n ? '2px solid var(--brass-deep)' : '1px solid var(--hairline)',
                      background: nps === n ? 'var(--brass-deep)' : 'var(--paper)',
                      color: nps === n ? 'var(--ivory)' : 'var(--ink)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mute)', marginTop: 6, fontWeight: 500 }}>
                <span>Not at all likely</span><span>Extremely likely</span>
              </div>
            </div>

            {/* Comment */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Your comments <span style={{ color: 'var(--mute)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What did you enjoy most? Any suggestions for us…"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }} disabled={saving || !ratings.overall}>
              {saving
                ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Submitting…</>
                : <>Submit feedback <Icon name="arrow_right" size={12} /></>}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuestPortalPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const toast       = useToast();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useBreakpoint();

  const [serviceModal,      setServiceModal]      = useState(null);
  const [maintModal,        setMaintModal]        = useState(false);
  const [displayIndex,      setDisplayIndex]      = useState(0);
  const [cancellingId,      setCancellingId]      = useState(null);
  const [cancelTarget,      setCancelTarget]      = useState(null);
  const [detailReservation, setDetailReservation] = useState(null);
  const [showHistory,       setShowHistory]       = useState(false);
  const [feedbackTarget,    setFeedbackTarget]    = useState(null);

  const { data: resData,  loading: resLoading  } = useApi('/api/guest/reservations', { staleTime: 0 });
  const { data: svcData,  loading: svcLoading  } = useApi('/api/guest/service');
  const reservations  = resData?.reservations ?? [];
  const myRequests    = svcData?.requests     ?? [];

  const activeStays   = reservations.filter(r => r.status === 'checked-in').sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const upcomingStays = reservations.filter(r => ['confirmed', 'pending'].includes(r.status)).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const pastStays     = reservations.filter(r => r.status === 'checked-out').sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  const displayStays  = [...activeStays, ...upcomingStays];
  const activeStay   = activeStays[0] || null;
  const safeIndex    = Math.min(displayIndex, Math.max(displayStays.length - 1, 0));
  const displayStay  = displayStays[safeIndex] || null;

  const initials = (user?.name || user?.email || 'G').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleServiceSubmit = useCallback(async (serviceType, details) => {
    try {
      await api.post('/api/guest/service', { serviceType, details });
      toast.success('Request sent — our team will attend shortly.');
      setServiceModal(null);
      queryClient.invalidateQueries({ queryKey: ['/api/guest/service'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send request.');
    }
  }, [toast, queryClient]);

  const handleCancelReservation = useCallback((reservationId) => {
    setCancelTarget(reservationId);
  }, []);

  const doCancel = useCallback(async () => {
    const reservationId = cancelTarget;
    setCancelTarget(null);
    setCancellingId(reservationId);
    try {
      await api.patch(`/api/guest/reservations/${reservationId}/cancel`);
      toast.success('Reservation cancelled.');
      setDetailReservation(null);
      queryClient.invalidateQueries({ queryKey: ['/api/guest/reservations'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel reservation.');
    } finally {
      setCancellingId(null);
    }
  }, [cancelTarget, toast, queryClient]);

  const handleMaintSubmit = useCallback(async (category, description) => {
    try {
      await api.post('/api/guest/maintenance', { category, description });
      toast.success('Report received — we will attend within the hour.');
      setMaintModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit report.');
    }
  }, [toast]);

  const handleFeedbackSubmitted = useCallback(() => {
    setFeedbackTarget(null);
    queryClient.invalidateQueries({ queryKey: ['/api/guest/reservations'] });
  }, [queryClient]);

  // ── Derived display values ─────────────────────────────────────────────────

  const suiteTone  = SLUG_TONES[displayStay?.room?.type] || 'warm';
  const suiteLabel = displayStay ? (TYPE_LABEL[displayStay.room?.type] || displayStay.room?.type || 'Suite') : null;

  const dayNum = displayStay?.status === 'checked-in'
    ? Math.max(1, Math.ceil((new Date() - new Date(displayStay.checkIn + 'T00:00:00')) / 86400000))
    : null;

  const heroEyebrow = displayStay ? [
    'My Stay',
    dayNum ? `Day ${toRoman(dayNum)} of ${toRoman(displayStay.nights)}` : null,
    displayStay.room?.number ? `Suite ${displayStay.room.number}` : null,
  ].filter(Boolean).join(' · ') : 'My Stay';

  const heroSub = displayStay?.status === 'checked-in'
    ? 'The terrace was readied this morning. The sea is calm; we expect a clear sunset at 21:12.'
    : displayStay
    ? `We look forward to welcoming you on ${fmtShort(displayStay.checkIn)}. Our concierge will be in touch shortly.`
    : 'Welcome to your LuxuryStay guest portal.';

  const nightsLeft = displayStay?.status === 'checked-in'
    ? nightsRemaining(displayStay.checkOut)
    : displayStay?.nights || 0;

  const todayIso        = new Date().toISOString().slice(0, 10);
  const checkoutDayStr  = displayStay?.checkOut?.slice(0, 10);
  const isCheckoutDay   = displayStay?.status === 'checked-in' && checkoutDayStr === todayIso;
  const isOverdue       = displayStay?.status === 'checked-in' && !!checkoutDayStr && checkoutDayStr < todayIso;
  const lateCheckoutSvc = SERVICES.find(s => s.type === 'late_checkout');

  const firstName = user?.name?.split(' ')[0] || 'dear guest';
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  const totalAmt   = Number(displayStay?.totalAmount   || 0);
  const depositAmt = Number(displayStay?.depositAmount || Math.round(totalAmt * 0.3));
  const balanceAmt = totalAmt - depositAmt;

  const guestCount = displayStay
    ? `${displayStay.adults} adult${displayStay.adults !== 1 ? 's' : ''}${displayStay.children > 0 ? ` · ${displayStay.children} child${displayStay.children !== 1 ? 'ren' : ''}` : ''}`
    : '—';

  return (
    <PublicShell>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {serviceModal && <ServiceModal service={serviceModal} onClose={() => setServiceModal(null)} onSubmit={handleServiceSubmit} />}
      {maintModal   && <MaintenanceModal onClose={() => setMaintModal(false)} onSubmit={handleMaintSubmit} />}
      {feedbackTarget && <FeedbackModal reservation={feedbackTarget} onClose={() => setFeedbackTarget(null)} onSubmitted={handleFeedbackSubmitted} />}
      {detailReservation && (
        <ReservationDetailPanel
          reservation={detailReservation}
          onClose={() => setDetailReservation(null)}
          onCancel={handleCancelReservation}
          cancelling={cancellingId === detailReservation._id}
        />
      )}
      {showHistory  && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {cancelTarget && <CancelConfirmModal onConfirm={doCancel} onCancel={() => setCancelTarget(null)} />}

      {/* ── Dark hero strip ─────────────────────────────────────────────── */}
      {displayStay && (
        <section style={{
          background: 'linear-gradient(160deg, #2A2620 0%, #1A1814 100%)',
          color: 'var(--ivory)',
          padding: isMobile ? '40px 20px 60px' : isTablet ? '48px 40px 64px' : '64px 64px 80px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Radial glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(160,128,84,0.22), transparent 55%)', pointerEvents: 'none' }} />
          {/* Watermark ★ */}
          <div style={{ position: 'absolute', top: 40, right: 64, fontFamily: 'var(--serif)', fontSize: 220, fontStyle: 'italic', color: 'rgba(160,128,84,0.08)', lineHeight: 0.85, userSelect: 'none', pointerEvents: 'none' }}>★</div>

          <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            {/* Eyebrow with brass rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 1, background: 'var(--brass)', flexShrink: 0 }} />
              <div className="eyebrow" style={{ color: 'var(--brass-soft)' }}>{heroEyebrow}</div>
            </div>

            {/* Greeting */}
            <h1 className="display" style={{ fontSize: 'clamp(64px, 7vw, 96px)', margin: '0 0 18px', lineHeight: 0.95, color: 'var(--ivory)' }}>
              {greeting()}, <em>{firstName}.</em>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--mute-2)', maxWidth: 620, lineHeight: 1.65, fontFamily: 'var(--serif)', fontStyle: 'italic', marginBottom: 36 }}>
              {heroSub}
            </p>

            {/* Live tiles — 5 col */}
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
              gap: 1, background: 'rgba(247,243,236,0.08)',
              border: '1px solid rgba(247,243,236,0.12)',
            }}>
              {[
                { l: 'Today · Nice',       v: '23°',                                     s: 'Clear · breeze'                        },
                { l: 'Sunset',             v: '21:12',                                   s: 'Cabana ready'                          },
                { l: displayStay.status === 'checked-in' ? 'Nights remaining' : 'Duration', v: toRoman(nightsLeft), s: `Check-out ${fmtShort(displayStay.checkOut).split(' ').slice(0,2).join(' ')}` },
                { l: 'Folio · total',      v: `€${totalAmt.toLocaleString()}`,           s: 'Settled on dep.'                       },
                { l: 'My requests',        v: myRequests.filter(r => ['pending','in-progress'].includes(r.status)).length || '—', s: myRequests.length ? `${myRequests.length} total` : 'None yet' },
              ].map((t, i) => (
                <div key={i} style={{ background: 'rgba(26,24,20,0.85)', padding: '20px 22px' }}>
                  <div className="eyebrow" style={{ color: 'var(--brass-soft)', marginBottom: 8 }}>{t.l}</div>
                  <div className="display numeral" style={{ fontSize: 30, fontStyle: 'italic', lineHeight: 1, color: 'var(--ivory)' }}>{t.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--mute-2)', marginTop: 8, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{t.s}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '40px 20px 60px' : isTablet ? '48px 40px 60px' : '80px 64px 80px', maxWidth: 1440, margin: '0 auto' }}>

        {/* Reservation switcher — only when multiple stays */}
        {displayStays.length > 1 && (
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              {displayStays.length} reservations · select to view
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${displayStays.length}, 1fr)`, gap: 10 }}>
              {displayStays.map((stay, i) => {
                const isSelected  = i === safeIndex;
                const stayLabel   = TYPE_LABEL[stay.room?.type] || stay.room?.type || 'Suite';
                const stayGrad    = GRAD_MAP[stay.room?.type]   || 'linear-gradient(140deg, #C9AE82, #A08054)';
                const stayStatus  = STATUS_STYLE[stay.status]   || { label: stay.status, color: 'var(--ink-3)' };
                return (
                  <button
                    key={stay._id || i}
                    onClick={() => setDisplayIndex(i)}
                    style={{
                      display: 'grid', gridTemplateColumns: '56px 1fr', gap: 0,
                      border: isSelected ? '2px solid var(--brass)' : '1px solid var(--hairline)',
                      background: isSelected ? 'var(--paper)' : 'var(--ivory)',
                      cursor: 'pointer', textAlign: 'left', padding: 0, overflow: 'hidden',
                      transition: 'border-color 0.15s', boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <div style={{ background: stayGrad, position: 'relative', minHeight: 72 }}>
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="check" size={14} style={{ color: 'rgba(247,243,236,0.9)' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 16px', borderLeft: isSelected ? '1px solid var(--brass-soft, #D4B896)' : '1px solid var(--hairline)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stayLabel}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 500 }}>{fmtShort(stay.checkIn)} → {fmtShort(stay.checkOut)}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: stayStatus.color || 'var(--ink-3)' }}>{stayStatus.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {displayStay ? (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.5fr 1fr', gap: isMobile ? 24 : 48 }}>

            {/* ── Left column ── */}
            <div>

              {/* Today's schedule (checked-in only) */}
              {activeStay && safeIndex === 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 className="display" style={{ fontSize: 44, margin: 0 }}>Today at <em>the house.</em></h2>
                    <span className="eyebrow">{todayLabel}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--hairline)', marginBottom: 48 }}>
                    {TODAY_SCHEDULE.map((c, i) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: isMobile ? '60px 1fr' : '80px 1fr auto',
                        gap: isMobile ? 12 : 20, padding: '20px 0',
                        borderBottom: '1px solid var(--hairline)', alignItems: 'center',
                      }}>
                        <div className="display numeral" style={{ fontSize: 24, fontStyle: 'italic', color: 'var(--brass-deep)' }}>{c.time}</div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <div style={{ width: 48, height: 48, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brass-deep)', flexShrink: 0 }}>
                            <Icon name={c.i} size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 500 }}>{c.t}</div>
                            <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 3, fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 500 }}>{c.s}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', textAlign: 'right', fontWeight: 600 }}>{c.status}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Service request grid */}
              <div id="services-grid" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 className="display" style={{ fontSize: 36, margin: 0 }}>Request <em>a service.</em></h2>
                <span style={{ fontSize: 12, color: 'var(--mute)', letterSpacing: '0.05em', fontWeight: 500 }}>typical reply · 4 min</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, maxWidth: 540, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                A note, a tray, a car at the entrance. Tap and our team will respond.
              </p>

              {activeStay && safeIndex === 0 ? (
                isOverdue ? (
                  <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 48, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                    Your stay has concluded. Please visit reception to finalise your departure.
                  </p>
                ) : (
                  <>
                    {isCheckoutDay && lateCheckoutSvc && (
                      <button
                        onClick={() => setServiceModal({ type: lateCheckoutSvc.type, label: lateCheckoutSvc.label })}
                        style={{ width: '100%', background: 'var(--linen)', border: '1px solid var(--hairline)', borderBottom: 'none', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ede8df'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--linen)'}
                      >
                        <Icon name="key" size={18} style={{ color: 'var(--brass-deep)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{lateCheckoutSvc.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--mute)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}>{lateCheckoutSvc.sub}</div>
                        </div>
                        <Icon name="arrow_right" size={11} style={{ color: 'var(--mute)', flexShrink: 0 }} />
                      </button>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 48 }}>
                      {SERVICES.filter(s => !(isCheckoutDay && s.type === 'late_checkout')).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => s.type === 'maintenance' ? setMaintModal(true) : setServiceModal({ type: s.type, label: s.label })}
                          style={{ background: 'var(--paper)', border: 'none', padding: '22px 22px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--linen)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--paper)'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Icon name={s.icon} size={16} style={{ color: 'var(--brass-deep)' }} />
                            <Icon name="arrow_right" size={11} style={{ color: 'var(--mute)' }} />
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--mute)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 500 }}>{s.sub}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 48, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                  Service requests are available once your stay begins.
                </p>
              )}

              {/* Upcoming reservations list */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 className="display" style={{ fontSize: 32, margin: 0 }}>My <em>reservations.</em></h2>
                  {reservations.length > 3 && (
                    <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--brass-deep)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>
                      View all {reservations.length}
                    </button>
                  )}
                </div>
                {resLoading && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--mute)', fontSize: 13 }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> Loading…
                  </div>
                )}
                {!resLoading && displayStays.length === 0 && (
                  <div style={{ border: '1px solid var(--hairline)', padding: '36px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No upcoming reservations</div>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>Make a reservation and it will appear here.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/book')}>Reserve a suite <Icon name="arrow_right" size={12} /></button>
                  </div>
                )}
                {!resLoading && displayStays.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {displayStays.map(r => {
                      const cancellable  = ['pending', 'confirmed'].includes(r.status);
                      const isCancelling = cancellingId === r._id;
                      return (
                        <div key={r._id} style={{ border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
                          <div onClick={() => setDetailReservation(r)} style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', cursor: 'pointer' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Icon name="bed" size={13} style={{ color: 'var(--brass)' }} />
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{r.room?.number ? `Room ${r.room.number}` : 'Room TBA'}</span>
                                {r.room?.type && <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>· {TYPE_LABEL[r.room.type] || r.room.type}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--ink-3)', flexWrap: 'wrap', fontWeight: 500 }}>
                                <span><strong style={{ color: 'var(--ink)' }}>Check-in</strong>&nbsp;{fmtDate(r.checkIn)}</span>
                                <span><strong style={{ color: 'var(--ink)' }}>Check-out</strong>&nbsp;{fmtDate(r.checkOut)}</span>
                                {r.totalAmount != null && <span>Total:&nbsp;<strong style={{ color: 'var(--ink)' }}>€{Number(r.totalAmount).toLocaleString()}</strong></span>}
                              </div>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          {cancellable && (
                            <div style={{ borderTop: '1px solid var(--hairline-2)', padding: '8px 20px' }}>
                              <button onClick={() => handleCancelReservation(r._id)} disabled={isCancelling} style={{ background: 'none', border: 'none', cursor: isCancelling ? 'not-allowed' : 'pointer', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--terracotta)', display: 'flex', alignItems: 'center', gap: 6, opacity: isCancelling ? 0.6 : 1, padding: '4px 0', fontWeight: 600 }}>
                                {isCancelling ? <><div className="spinner" style={{ width: 11, height: 11, borderWidth: 1.5, borderTopColor: 'var(--terracotta)' }} />Cancelling…</> : <><Icon name="x" size={11} />Cancel reservation</>}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Suite card with Photo */}
              <div style={{ border: '1px solid var(--hairline)', overflow: 'hidden', background: 'var(--paper)' }}>
                <Photo
                  tone={suiteTone}
                  ratio="16/10"
                  num={displayStay.room?.number ? String(displayStay.room.number) : undefined}
                  label={suiteLabel}
                  sub="Your suite this stay"
                />
                <div style={{ padding: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 14 }}>
                    Stay · {displayStay.nights} night{displayStay.nights !== 1 ? 's' : ''}
                  </div>
                  {[
                    { l: 'Check-in',  v: fmtShort(displayStay.checkIn)  },
                    { l: 'Check-out', v: fmtShort(displayStay.checkOut) },
                    { l: 'Guests',    v: guestCount                      },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                      <span style={{ color: 'var(--mute)' }}>{r.l}</span>
                      <span style={{ fontWeight: 500 }}>{r.v}</span>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => setDetailReservation(displayStay)}>
                    View full details
                  </button>
                </div>
              </div>

              {/* Live folio */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <div className="eyebrow">Live folio</div>
                  <div style={{ fontSize: 12, color: 'var(--brass-deep)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>● Live</div>
                </div>
                <div className="display numeral" style={{ fontSize: 48, lineHeight: 1, fontStyle: 'italic', marginBottom: 4 }}>
                  €{totalAmt.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 18, fontWeight: 500 }}>incl. VAT · settled on departure</div>
                {[
                  { l: `Suite · ${displayStay.nights} nights`, v: `€${totalAmt.toLocaleString()}` },
                  { l: 'Deposit paid',                          v: depositAmt > 0 ? `€${depositAmt.toLocaleString()}` : '—' },
                  { l: 'Balance remaining',                     v: `€${balanceAmt.toLocaleString()}` },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--mute)', fontWeight: 500 }}>{r.l}</span>
                    <span style={{ fontFamily: 'var(--mono)' }}>{r.v}</span>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => setDetailReservation(displayStay)}>
                  View full folio
                </button>
              </div>

              {/* Active requests card */}
              {(() => {
                const SVC_LABEL = { room_service: 'In-room dining', wake_up_call: 'Wake-up call', laundry: 'Laundry', spa: 'Spa', transport: 'Transport', amenities: 'Housekeeping', dining: 'Dining', concierge: 'Concierge', other: 'Other' };
                const SVC_ICON  = { room_service: 'coffee', wake_up_call: 'clock', laundry: 'sparkle', spa: 'leaf', transport: 'key', amenities: 'sparkle', dining: 'star', concierge: 'crown', other: 'wrench' };
                const STATUS_COLOR = { pending: '#A07830', 'in-progress': '#2D7A4F', fulfilled: '#6B6459', cancelled: '#B94040' };
                const STATUS_LABEL = { pending: 'Pending', 'in-progress': 'In progress', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };
                const recent = myRequests.slice(0, 4);
                return (
                  <div style={{ background: 'var(--ink)', color: 'var(--ivory)', padding: 28, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -10, fontFamily: 'var(--serif)', fontSize: 120, fontStyle: 'italic', color: 'rgba(160,128,84,0.10)', lineHeight: 0.8, userSelect: 'none', pointerEvents: 'none' }}>R</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, position: 'relative' }}>
                      <div className="eyebrow" style={{ color: 'var(--brass-soft)' }}>Your requests</div>
                      {myRequests.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brass-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {myRequests.filter(r => ['pending','in-progress'].includes(r.status)).length} active
                        </span>
                      )}
                    </div>
                    {svcLoading && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--mute-2)', fontSize: 13, marginBottom: 16 }}>
                        <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderColor: 'rgba(247,243,236,0.3)', borderTopColor: 'var(--brass-soft)' }} />
                        Loading…
                      </div>
                    )}
                    {!svcLoading && recent.length === 0 && (
                      <p style={{ fontSize: 13, color: 'rgba(247,243,236,0.45)', fontFamily: 'var(--serif)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 18 }}>
                        No requests yet. Use the services grid below to call for assistance.
                      </p>
                    )}
                    {!svcLoading && recent.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                        {recent.map(req => (
                          <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: 'rgba(160,120,48,0.18)', border: '1px solid rgba(160,120,48,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brass-soft)' }}>
                              <Icon name={SVC_ICON[req.serviceType] || 'star'} size={13} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ivory)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {SVC_LABEL[req.serviceType] || req.serviceType}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(247,243,236,0.45)', marginTop: 1 }}>
                                {new Date(req.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: STATUS_COLOR[req.status] || 'var(--mute-2)', flexShrink: 0 }}>
                              {STATUS_LABEL[req.status] || req.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'center', color: 'var(--ivory)', borderColor: 'rgba(247,243,236,0.2)' }}
                      onClick={() => {
                        const el = document.getElementById('services-grid');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <Icon name="plus" size={12} /> New request
                    </button>
                  </div>
                );
              })()}

              {/* Étoile member strip */}
              <div style={{ padding: 20, background: 'var(--linen)', border: '1px solid var(--hairline)', display: 'flex', gap: 14, alignItems: 'center' }}>
                <Icon name="crown" size={20} style={{ color: 'var(--brass-deep)', flexShrink: 0 }} />
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600 }}>Étoile member</div>
                  <div style={{ color: 'var(--mute)', fontWeight: 500 }}>Earn one complimentary night for every five stays with us.</div>
                </div>
              </div>

            </div>
          </div>

        ) : (
          /* ── No stay: prompt to book ─────────────────────────────────── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 14 }}>My Stay</div>
                <h1 className="display" style={{ fontSize: 'clamp(42px, 5vw, 64px)', margin: 0, lineHeight: 1 }}>
                  {greeting()}, <em>{firstName}.</em>
                </h1>
              </div>
              <button onClick={() => setShowHistory(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--linen)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div className="avatar avatar-lg">{initials}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>{user?.name || user?.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Étoile member · History</div>
                </div>
              </button>
            </div>
            <div style={{ border: '1px solid var(--hairline)', padding: '48px 40px', background: 'var(--paper)', maxWidth: 560, marginTop: 40 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>No active stay</div>
              <h2 className="display" style={{ fontSize: 36, margin: '0 0 12px' }}>Ready for your <em>next visit?</em></h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 24 }}>Browse our suites and make a reservation in minutes.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => navigate('/book')}>Reserve a suite <Icon name="arrow_right" size={12} /></button>
                <button className="btn btn-ghost"   onClick={() => navigate('/suites')}>View suites</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Past stays & feedback — always visible when checked-out stays exist ── */}
        {!resLoading && pastStays.length > 0 && (
          <div style={{ marginTop: 64, borderTop: '1px solid var(--hairline)', paddingTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Stay history</div>
                <h2 className="display" style={{ fontSize: 36, margin: 0 }}>Past <em>visits.</em></h2>
              </div>
              <span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>{pastStays.length} completed stay{pastStays.length !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastStays.map(r => {
                const canFeedback = !r.hasFeedback;
                const label = TYPE_LABEL[r.room?.type] || r.room?.type || 'Suite';
                return (
                  <div key={r._id} style={{ border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
                    <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                          <Icon name="bed" size={13} style={{ color: 'var(--brass)' }} />
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{r.room?.number ? `Room ${r.room.number}` : 'Room TBA'}</span>
                          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>· {label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--ink-3)', flexWrap: 'wrap', fontWeight: 500 }}>
                          <span>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</span>
                          {r.nights && <span>{r.nights} night{r.nights !== 1 ? 's' : ''}</span>}
                          {r.totalAmount != null && <span>€{Number(r.totalAmount).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <StatusBadge status={r.status} />
                        {canFeedback ? (
                          <button
                            onClick={() => setFeedbackTarget(r)}
                            style={{ background: 'var(--linen)', border: '1px solid var(--brass-soft, #D4B896)', cursor: 'pointer', fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--brass-deep)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontWeight: 600 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--linen)'}
                          >
                            <Icon name="star" size={11} />Rate your stay
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Icon name="check" size={11} />Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
