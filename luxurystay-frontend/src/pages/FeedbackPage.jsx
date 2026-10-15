import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function guestName(f) {
  if (!f.guest) return '—';
  return [f.guest.firstName, f.guest.lastName].filter(Boolean).join(' ') || '—';
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function Stars({ rating, size = 14, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  const display = hover || rating || 0;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}
          onClick={() => interactive && onChange?.(i + 1)}
          onMouseEnter={() => interactive && setHover(i + 1)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ cursor: interactive ? 'pointer' : 'default', color: i < display ? 'var(--brass)' : 'var(--hairline-2)', fontSize: size, lineHeight: 1 }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Sub-rating row ───────────────────────────────────────────────────────────

function SubRatingRow({ label, value }) {
  if (!value) return null;
  const pct = (value / 5) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--mute)', width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--hairline-2)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brass)', borderRadius: 2 }} />
      </div>
      <span className="numeral" style={{ fontSize: 13, width: 20, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── Feedback Card ────────────────────────────────────────────────────────────

function FeedbackCard({ item, onSelect, isActive }) {
  const name     = guestName(item);
  const initials = getInitials(name);
  const rating   = item.ratings?.overall || 0;
  const room     = item.reservation?.room?.roomNumber || '—';

  return (
    <div className="card"
      onClick={() => onSelect(isActive ? null : item)}
      style={{ padding: 28, position: 'relative', cursor: 'pointer', background: isActive ? 'var(--linen)' : '', borderLeft: item.actionRequired ? '3px solid var(--terracotta)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              Room {room} · {fmtDate(item.createdAt)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Stars rating={rating} size={13} />
          {item.actionRequired && (
            <span className="chip chip-maintenance" style={{ fontSize: 9 }}>Action needed</span>
          )}
        </div>
      </div>
      {item.comment && (
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.35, fontStyle: 'italic', color: 'var(--ink)' }}>
          "{item.comment.length > 160 ? item.comment.slice(0, 160) + '…' : item.comment}"
        </div>
      )}
      {item.staffResponse && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline-2)', fontSize: 12, color: 'var(--ink-3)' }}>
          <span className="eyebrow" style={{ fontSize: 9, marginRight: 8 }}>Staff response</span>
          {item.staffResponse.slice(0, 100)}{item.staffResponse.length > 100 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

// ─── Detail Sidebar ───────────────────────────────────────────────────────────

function FeedbackDetail({ item, onClose, onUpdated }) {
  const toast    = useToast();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [response,   setResponse]   = useState(item.staffResponse || '');
  const [actionNote, setActionNote] = useState(item.actionNote    || '');
  const [actionFlag, setActionFlag] = useState(item.actionRequired);
  const [tab,        setTab]        = useState('response');
  const [saving,     setSaving]     = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const name   = guestName(item);
  const rating = item.ratings?.overall || 0;
  const room   = item.reservation?.room?.roomNumber || '—';

  async function handleRespond() {
    if (!response.trim()) { toast.error('Response cannot be empty.'); return; }
    setSaving(true);
    try {
      await api.patch(`/api/feedback/${item.id || item._id}/respond`, { staffResponse: response });
      toast.success('Response saved.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleAction() {
    setSaving(true);
    try {
      await api.patch(`/api/feedback/${item.id || item._id}/action`, {
        actionRequired: actionFlag,
        actionNote: actionNote || undefined,
      });
      toast.success('Action flag updated.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  }

  function handleViewGuest() {
    navigate(`/guests?search=${encodeURIComponent(name)}`);
  }

  const hasSubRatings = item.ratings?.cleanliness || item.ratings?.service || item.ratings?.comfort || item.ratings?.value;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.4)' }} />

      {/* Sidebar panel */}
      <div style={{
        position: 'relative', width: isMobile ? '100vw' : 440, maxWidth: '100%', background: 'var(--paper)',
        borderLeft: '1px solid var(--hairline)', height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Room {room} · {fmtDate(item.createdAt)}</div>
              <h2 className="display" style={{ fontSize: 26, margin: 0 }}>{name}</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
          </div>

          {/* Overall stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Stars rating={rating} size={20} />
            <span className="numeral" style={{ fontSize: 22, fontStyle: 'italic' }}>{rating.toFixed(1)}</span>
            {item.npsScore != null && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>
                NPS <span className="numeral" style={{ fontSize: 15, color: 'var(--ink)' }}>{item.npsScore}</span>/10
              </span>
            )}
          </div>

          {/* Sub-ratings */}
          {hasSubRatings && (
            <div style={{ marginBottom: 4 }}>
              <SubRatingRow label="Cleanliness" value={item.ratings.cleanliness} />
              <SubRatingRow label="Service"     value={item.ratings.service}     />
              <SubRatingRow label="Comfort"     value={item.ratings.comfort}     />
              <SubRatingRow label="Value"       value={item.ratings.value}       />
            </div>
          )}

          {/* View guest button */}
          <button
            onClick={handleViewGuest}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
          >
            <Icon name="user" size={12} />
            View guest profile
            <Icon name="arrow_right" size={11} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {/* Comment */}
          {item.comment && (
            <>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Guest comment</div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.55,
                fontStyle: 'italic', color: 'var(--ink)',
                padding: '16px 18px', background: 'var(--linen)',
                borderLeft: '3px solid var(--brass)', marginBottom: 24,
              }}>
                "{item.comment}"
              </div>
            </>
          )}

          {item.actionRequired && (
            <div style={{ padding: '10px 14px', background: '#FBE8E8', borderLeft: '3px solid var(--terracotta)', marginBottom: 20, fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>
              Action required{item.actionNote ? `: ${item.actionNote}` : ''}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: 18 }}>
            {[{ id: 'response', label: 'Staff response' }, { id: 'action', label: 'Action flag' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '8px 16px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.id ? 'var(--ink)' : 'var(--mute)', borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'response' && (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Staff response</label>
                <textarea
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  style={{ minHeight: 96, resize: 'vertical' }}
                  placeholder="Write a personal response to this guest…"
                />
              </div>
              {item.respondedAt && (
                <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>
                  Last responded {fmtDate(item.respondedAt)} by {item.respondedBy?.name || '—'}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleRespond} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
                  : 'Save response'}
              </button>
            </>
          )}

          {tab === 'action' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
                <span style={{
                  width: 18, height: 18, border: '1px solid var(--ink-3)', borderRadius: 2, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: actionFlag ? 'var(--ink)' : 'transparent',
                }} onClick={() => setActionFlag(v => !v)}>
                  {actionFlag && <Icon name="check" size={10} style={{ color: 'var(--paper)' }} />}
                </span>
                Flag as requiring action
              </label>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Action note</label>
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  style={{ minHeight: 72, resize: 'vertical' }}
                  placeholder="Describe the follow-up required…"
                />
              </div>
              {item.actionedAt && (
                <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>
                  Last actioned {fmtDate(item.actionedAt)} by {item.actionedBy?.name || '—'}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleAction} disabled={saving}>
                {saving ? 'Saving…' : 'Update action flag'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Feedback Modal ───────────────────────────────────────────────────────

function NewFeedbackModal({ onClose, onSaved }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [resSearch,  setResSearch]  = useState('');
  const [resId,      setResId]      = useState('');
  const [guestId,    setGuestId]    = useState('');
  const [ratings,    setRatings]    = useState({ overall: 0, cleanliness: 0, service: 0, comfort: 0, value: 0 });
  const [comment,    setComment]    = useState('');
  const [npsScore,   setNpsScore]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const { data: resData } = useApi(
    resSearch.length > 2 ? `/api/reservations?search=${encodeURIComponent(resSearch)}&limit=8` : null,
    { deps: [resSearch] }
  );
  const reservations = resData?.reservations || [];

  function setRating(k, v) { setRatings(r => ({ ...r, [k]: v })); }

  async function handleCreate() {
    if (!resId)              { toast.error('Select a reservation.'); return; }
    if (!ratings.overall)    { toast.error('Overall rating is required.'); return; }
    setSaving(true);
    try {
      await api.post('/api/feedback', {
        reservation: resId,
        guest:       guestId,
        ratings:     { overall: ratings.overall, ...(ratings.cleanliness && { cleanliness: ratings.cleanliness }), ...(ratings.service && { service: ratings.service }), ...(ratings.comfort && { comfort: ratings.comfort }), ...(ratings.value && { value: ratings.value }) },
        comment:     comment || undefined,
        npsScore:    npsScore !== '' ? Number(npsScore) : undefined,
      });
      toast.success('Feedback recorded.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Guest feedback</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>Record feedback</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Reservation search */}
        <div className="field" style={{ margin: 0 }}>
          <label>Reservation (guest name or confirmation #)</label>
          <input value={resSearch} onChange={e => { setResSearch(e.target.value); setResId(''); setGuestId(''); }} placeholder="Type to search…" autoFocus />
        </div>
        {reservations.length > 0 && !resId && (
          <div style={{ border: '1px solid var(--hairline)', borderRadius: 2, marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}>
            {reservations.map(r => {
              const name = [r.guest?.firstName, r.guest?.lastName].filter(Boolean).join(' ') || '—';
              return (
                <div key={r._id}
                  onClick={() => { setResId(r._id); setGuestId(r.guest?._id || ''); setResSearch(`${name} · ${r.confirmationNumber || ''}`); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--hairline-2)', fontSize: 13 }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--linen)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}>
                  <div style={{ fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{r.confirmationNumber} · Room {r.room?.roomNumber || '—'}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ratings */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Ratings</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            {[['overall','Overall *'],['cleanliness','Cleanliness'],['service','Service'],['comfort','Comfort'],['value','Value']].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--mute)', width: 80 }}>{label}</span>
                <Stars rating={ratings[k]} size={16} interactive onChange={v => setRating(k, v)} />
              </div>
            ))}
          </div>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>Comment</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} style={{ minHeight: 80, resize: 'vertical' }} placeholder="Guest's own words…" />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>NPS score (0–10, optional)</label>
          <input type="number" min="0" max="10" value={npsScore} onChange={e => setNpsScore(e.target.value)} placeholder="e.g. 9" />
        </div>
        </div>{/* end modal-body */}

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
              : <><Icon name="plus" size={12} />Record feedback</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { isMobile } = useBreakpoint();
  const [ratingFilter, setRatingFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [page,         setPage]         = useState(1);

  const params = new URLSearchParams({ page, limit: 12 });
  if (ratingFilter !== 'all') params.set('minRating', ratingFilter);
  if (actionFilter) params.set('actionRequired', 'true');

  const { data, loading } = useApi(`/api/feedback?${params}`, { deps: [ratingFilter, actionFilter, page, refreshKey] });
  const feedbacks   = data?.feedback || data?.feedbacks || [];
  const total       = data?.total    || 0;
  const totalPages  = data?.pages    || 1;

  // Compute stats from full dataset (first page) as approximation
  const avgRating    = feedbacks.length ? (feedbacks.reduce((s, f) => s + (f.ratings?.overall || 0), 0) / feedbacks.length).toFixed(1) : '—';
  const actionItems  = feedbacks.filter(f => f.actionRequired).length;
  const promoters    = feedbacks.filter(f => f.npsScore >= 9).length;
  const detractors   = feedbacks.filter(f => f.npsScore != null && f.npsScore <= 6).length;
  const npsBase      = feedbacks.filter(f => f.npsScore != null).length;
  const nps          = npsBase ? Math.round(((promoters - detractors) / npsBase) * 100) : '—';

  function onUpdated() {
    setSelected(null);
    setRefreshKey(k => k + 1);
  }

  function onSaved() {
    setShowNew(false);
    setRefreshKey(k => k + 1);
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Guest feedback</div>
          <h1 className="display">In their <em>own words.</em></h1>
          <p className="sub">
            {total} reviews recorded. {actionItems > 0 ? `${actionItems} action item${actionItems !== 1 ? 's' : ''} pending.` : 'No pending action items.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={12} />Record feedback
        </button>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 36 }}>
        {[
          { label: 'Avg. rating',   value: avgRating },
          { label: 'Total reviews', value: total },
          { label: 'NPS',           value: nps !== '—' ? `+${nps}` : '—' },
          { label: 'Action items',  value: actionItems },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--paper)', padding: '20px 24px' }}>
            <div className="label" style={{ marginBottom: 8 }}>{m.label}</div>
            <div className="display numeral" style={{ fontSize: 36, lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="switch">
          {[{ id: 'all', label: 'All' }, { id: '5', label: '★★★★★' }, { id: '4', label: '★★★★' }, { id: '1', label: 'Low rated' }].map(b => (
            <button key={b.id} className={ratingFilter === b.id ? 'active' : ''} onClick={() => { setRatingFilter(b.id); setPage(1); }}>
              {b.label}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
          <span style={{
            width: 16, height: 16, border: '1px solid var(--ink-3)', borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: actionFilter ? 'var(--ink)' : 'transparent', flexShrink: 0,
          }} onClick={() => { setActionFilter(v => !v); setPage(1); }}>
            {actionFilter && <Icon name="check" size={10} style={{ color: 'var(--paper)' }} />}
          </span>
          Action items only
        </label>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ padding: 60 }}><Spinner page /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
          {!feedbacks.length ? (
            <div style={{ gridColumn: '1/-1', padding: '40px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No feedback found.
            </div>
          ) : (
            feedbacks.map(f => (
              <FeedbackCard
                key={f.id || f._id}
                item={f}
                onSelect={setSelected}
                isActive={(selected?.id || selected?._id) === (f.id || f._id)}
              />
            ))
          )}
        </div>
      )}

      {/* Detail sidebar — fixed overlay */}
      {selected && (
        <FeedbackDetail
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontSize: 12, color: 'var(--mute)' }}>
          <span>Page {page} of {totalPages} · {total} reviews</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {showNew && (
        <NewFeedbackModal onClose={() => setShowNew(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
