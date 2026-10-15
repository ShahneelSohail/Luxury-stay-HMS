import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(firstName = '', lastName = '') {
  return [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?';
}

const STATUS_LABELS = { unread: 'Unread', read: 'Read', replied: 'Replied' };
const STATUS_COLORS = {
  unread:  { background: '#FEF3C7', color: '#92400E' },
  read:    { background: 'var(--linen)', color: 'var(--ink-3)' },
  replied: { background: '#D1FAE5', color: '#065F46' },
};

function StatusChip({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.read;
  return (
    <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, padding: '3px 8px', borderRadius: 2, ...s }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({ item, onSelect, isActive }) {
  const initials = getInitials(item.firstName, item.lastName);
  const isUnread = item.status === 'unread';

  return (
    <div
      className="card"
      onClick={() => onSelect(isActive ? null : item)}
      style={{
        padding: 24, cursor: 'pointer',
        background: isActive ? 'var(--linen)' : 'var(--paper)',
        borderLeft: isUnread ? '3px solid var(--brass)' : undefined,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ fontWeight: isUnread ? 700 : 500 }}>{initials}</div>
          <div>
            <div style={{ fontWeight: isUnread ? 600 : 500 }}>
              {item.firstName} {item.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{item.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusChip status={item.status} />
          <span style={{ fontSize: 10, color: 'var(--mute)' }}>{fmtDate(item.createdAt)}</span>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, letterSpacing: '0.02em' }}>
        {item.subject}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        {item.message.length > 120 ? item.message.slice(0, 120) + '…' : item.message}
      </div>
    </div>
  );
}

// ─── Detail Sidebar ───────────────────────────────────────────────────────────

function ContactDetail({ item, onClose, onUpdated, canDelete }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();

  const [status,    setStatus]    = useState(item.status);
  const [staffNote, setStaffNote] = useState(item.staffNote || '');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/api/contact/${item.id || item._id}`, { status, staffNote: staffNote || undefined });
      toast.success('Contact updated.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this message permanently?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/contact/${item.id || item._id}`);
      toast.success('Message deleted.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally { setDeleting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.4)' }} />

      {/* Sidebar panel */}
      <div style={{
        position: 'relative', width: isMobile ? '100vw' : 460, maxWidth: '100%',
        background: 'var(--paper)', borderLeft: '1px solid var(--hairline)',
        height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Contact message · {fmtDate(item.createdAt)}</div>
              <h2 className="display" style={{ fontSize: 24, margin: 0 }}>
                {item.firstName} {item.lastName}
              </h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
          </div>

          {/* Contact details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="mail" size={12} />
              <a href={`mailto:${item.email}`} style={{ color: 'var(--brass)', textDecoration: 'none' }}>{item.email}</a>
            </div>
            {item.phone && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="phone" size={12} />
                {item.phone}
              </div>
            )}
            {item.language && item.language !== 'en' && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="globe" size={12} />
                Language: {item.language.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <StatusChip status={item.status} />
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {/* Subject + Message */}
          <div className="eyebrow" style={{ marginBottom: 6 }}>Subject</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>{item.subject}</div>

          <div className="eyebrow" style={{ marginBottom: 10 }}>Message</div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.65,
            color: 'var(--ink)', padding: '16px 18px', background: 'var(--linen)',
            borderLeft: '3px solid var(--brass)', marginBottom: 24,
          }}>
            {item.message}
          </div>

          {/* Read by info */}
          {item.readBy && (
            <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 20 }}>
              Read by <strong>{item.readBy.name || '—'}</strong> ({item.readBy.role || '—'}) · {fmtDateTime(item.readAt)}
            </div>
          )}

          {/* Status update */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
          </div>

          {/* Staff note */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Staff note</label>
            <textarea
              value={staffNote}
              onChange={e => setStaffNote(e.target.value)}
              style={{ minHeight: 88, resize: 'vertical' }}
              placeholder="Internal notes visible only to staff…"
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
              : 'Save changes'}
          </button>

          {canDelete && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', color: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : <><Icon name="trash" size={12} />Delete message</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactInboxPage() {
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  const canDelete = ['admin', 'manager'].includes(user?.role);

  const [statusFilter,    setStatusFilter]    = useState('all');
  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected,        setSelected]        = useState(null);
  const [refreshKey,      setRefreshKey]       = useState(0);
  const [page,            setPage]            = useState(1);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const params = new URLSearchParams({ page, limit: 12 });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (debouncedSearch) params.set('search', debouncedSearch);

  const { data, loading } = useApi(`/api/contact?${params}`, {
    deps: [statusFilter, debouncedSearch, page, refreshKey],
  });

  const contacts    = data?.contacts   || [];
  const unreadCount = data?.unreadCount ?? 0;
  const total       = data?.total  || 0;
  const totalPages  = data?.pages  || 1;

  function onUpdated() {
    setSelected(null);
    setRefreshKey(k => k + 1);
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Contact inbox</div>
          <h1 className="display">Messages &amp; <em>enquiries.</em></h1>
          <p className="sub">
            {total} message{total !== 1 ? 's' : ''} total.
            {unreadCount > 0 ? ` ${unreadCount} unread.` : ' All caught up.'}
          </p>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 36 }}>
        {[
          { label: 'Total',   value: total },
          { label: 'Unread',  value: unreadCount },
          { label: 'Replied', value: contacts.filter(c => c.status === 'replied').length },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--paper)', padding: '20px 24px' }}>
            <div className="label" style={{ marginBottom: 8 }}>{m.label}</div>
            <div className="display numeral" style={{ fontSize: 36, lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 240px', maxWidth: 320 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, subject…"
            style={{ width: '100%' }}
          />
        </div>
        <div className="switch">
          {[
            { id: 'all',     label: 'All' },
            { id: 'unread',  label: 'Unread' },
            { id: 'read',    label: 'Read' },
            { id: 'replied', label: 'Replied' },
          ].map(b => (
            <button
              key={b.id}
              className={statusFilter === b.id ? 'active' : ''}
              onClick={() => { setStatusFilter(b.id); setPage(1); }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ padding: 60 }}><Spinner page /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
          {!contacts.length ? (
            <div style={{ gridColumn: '1/-1', padding: '40px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No messages found.
            </div>
          ) : (
            contacts.map(c => (
              <ContactCard
                key={c.id || c._id}
                item={c}
                onSelect={setSelected}
                isActive={(selected?.id || selected?._id) === (c.id || c._id)}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontSize: 12, color: 'var(--mute)' }}>
          <span>Page {page} of {totalPages} · {total} messages</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Detail sidebar */}
      {selected && (
        <ContactDetail
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
