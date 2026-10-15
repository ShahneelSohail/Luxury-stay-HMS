import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['plumbing','electrical','ac','hvac','furniture','technology','structural','other'];
const PRIORITIES = ['low','medium','high','urgent'];
const STATUSES   = ['open','assigned','in-progress','resolved'];

const CATEGORY_LABELS = {
  plumbing: 'Plumbing', electrical: 'Electrical', ac: 'A/C',
  hvac: 'HVAC', furniture: 'Furniture', technology: 'Technology',
  structural: 'Structural', other: 'Other',
};

const PRIORITY_CONFIG = {
  low:    { color: 'var(--mute)',       label: 'Low' },
  medium: { color: 'var(--brass)',      label: 'Medium' },
  high:   { color: 'var(--terracotta)', label: 'High' },
  urgent: { color: 'var(--plum)',       label: 'Urgent' },
};

const STATUS_CONFIG = {
  open:        { chip: 'chip-reserved',    label: 'Open' },
  assigned:    { chip: 'chip-cleaning',    label: 'Assigned' },
  'in-progress':{ chip: 'chip-occupied',  label: 'In progress' },
  resolved:    { chip: 'chip-available',   label: 'Resolved' },
};

const ADMIN_MGR  = ['admin', 'manager'];
const MAINT_MGMT = ['admin', 'manager', 'service'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const { chip, label } = STATUS_CONFIG[status] || { chip: 'chip-reserved', label: status };
  return <span className={`chip ${chip}`}><span className="chip-dot" />{label}</span>;
}

function Mini({ label, value }) {
  return (
    <div style={{ background: 'var(--paper)', padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="display numeral" style={{ fontSize: 36, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

// ─── Request Detail Panel ─────────────────────────────────────────────────────

function RequestDetail({ request: r, canManage, canUpdate, onClose, onUpdated }) {
  const toast = useToast();
  const [resolveNote, setResolveNote] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleStatus(status) {
    setSaving(true);
    try {
      await api.patch(`/api/maintenance/${r._id}/status`, { status });
      toast.success('Status updated.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  }

  async function handleResolve() {
    setSaving(true);
    try {
      await api.patch(`/api/maintenance/${r._id}/resolve`, { resolutionNote: resolveNote });
      toast.success('Request resolved.');
      setShowResolve(false);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resolve failed.');
    } finally { setSaving(false); }
  }

  const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
  const isResolved = r.status === 'resolved';

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {CATEGORY_LABELS[r.category] || r.category} · Room {r.room?.roomNumber || '—'}
          </div>
          <h2 className="display" style={{ fontSize: 24, margin: 0 }}>{r.title || r.description?.slice(0, 60)}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>

      {/* Status + priority */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatusChip status={r.status} />
        <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: priority.color, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          {priority.label} priority
        </span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>
        {r.description}
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20, fontSize: 12 }}>
        {[
          ['Reported', fmtDateTime(r.createdAt)],
          ['Reported by', r.reportedBy?.name || '—'],
          ['Assigned to', r.assignedTo?.name || 'Unassigned'],
          ['Category', CATEGORY_LABELS[r.category] || r.category],
          ...(r.resolvedAt ? [['Resolved', fmtDateTime(r.resolvedAt)]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '6px 0', borderBottom: '1px solid var(--hairline-2)' }}>
            <div style={{ color: 'var(--mute)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Resolution note */}
      {r.resolutionNote && (
        <div style={{ background: 'var(--linen)', padding: '12px 16px', borderRadius: 2, marginBottom: 20, fontSize: 13, color: 'var(--ink-3)' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Resolution note</div>
          {r.resolutionNote}
        </div>
      )}

      {/* Status log */}
      {r.statusLog?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Activity</div>
          {r.statusLog.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--hairline-2)' }}>
              <span style={{ color: 'var(--mute)', flexShrink: 0 }}>{fmtDateTime(log.at)}</span>
              <span><StatusChip status={log.status} /></span>
              {log.note && <span style={{ color: 'var(--ink-3)' }}>{log.note}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isResolved && canUpdate && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {r.status === 'open' && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleStatus('in-progress')} disabled={saving}>
              Start work
            </button>
          )}
          {r.status === 'assigned' && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleStatus('in-progress')} disabled={saving}>
              Start work
            </button>
          )}
          {r.status === 'in-progress' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowResolve(v => !v)} disabled={saving}>
              <Icon name="check" size={10} />Mark resolved
            </button>
          )}
          {(r.status === 'open' || r.status === 'assigned') && canManage && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleStatus('in-progress')} disabled={saving}>
              Set in-progress
            </button>
          )}
        </div>
      )}

      {showResolve && (
        <div style={{ marginTop: 16 }}>
          <div className="field">
            <label>Resolution note</label>
            <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
              style={{ minHeight: 72, resize: 'vertical' }}
              placeholder="Describe what was done…" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowResolve(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleResolve} disabled={saving}>
              {saving ? 'Resolving…' : 'Confirm resolve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Request Modal ────────────────────────────────────────────────────────

function NewRequestModal({ onClose, onSaved, rooms }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [form, setForm] = useState({
    room: '', category: 'other', priority: 'medium',
    title: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.description) { toast.error('Description is required.'); return; }
    setSaving(true);
    try {
      await api.post('/api/maintenance', {
        room:        form.room      || undefined,
        category:    form.category,
        priority:    form.priority,
        title:       form.title     || undefined,
        description: form.description,
      });
      toast.success('Maintenance request submitted.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Maintenance</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>New request</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Room (optional)</label>
              <select value={form.room} onChange={e => set('room', e.target.value)}>
                <option value="">— Common area / N/A —</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>{r.roomNumber} · {r.type?.replace('_',' ')}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Short title (optional)</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AC not cooling" />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              style={{ minHeight: 88, resize: 'vertical' }}
              placeholder="Describe the issue in detail…" />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Submitting…</>
              : <><Icon name="plus" size={12} />Submit request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const { isMobile, isTablet } = useBreakpoint();
  const { user } = useAuth();
  const role     = user?.role;
  const canManage = ADMIN_MGR.includes(role);
  const canUpdate = MAINT_MGMT.includes(role);

  const [statusFilter,   setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected,       setSelected]       = useState(null);
  const [showNew,        setShowNew]        = useState(false);
  const [refreshKey,     setRefreshKey]     = useState(0);

  const { data: reqData,   loading } = useApi('/api/maintenance?limit=200', { deps: [refreshKey] });
  const { data: roomsData           } = useApi('/api/rooms?limit=200');

  const requests = reqData?.requests || [];
  const rooms    = roomsData?.rooms  || [];

  function onUpdated() { setSelected(null); setRefreshKey(k => k + 1); }
  function onSaved()   { setShowNew(false); setRefreshKey(k => k + 1); }

  // Summary counts
  const counts = {
    open:        requests.filter(r => r.status === 'open').length,
    inProgress:  requests.filter(r => r.status === 'in-progress').length,
    resolved:    requests.filter(r => r.status === 'resolved').length,
    assigned:    requests.filter(r => r.status === 'assigned').length,
  };

  const filtered = requests.filter(r => {
    if (statusFilter   !== 'all' && r.status   !== statusFilter)   return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Maintenance · open requests</div>
          <h1 className="display">Quietly <em>kept.</em></h1>
          <p className="sub">
            {counts.open} open · {counts.inProgress} in progress · {counts.resolved} resolved today.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={12} />New request
        </button>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 32 }}>
        <Mini label="Open"           value={counts.open} />
        <Mini label="Assigned"       value={counts.assigned} />
        <Mini label="In progress"    value={counts.inProgress} />
        <Mini label="Resolved today" value={counts.resolved} />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="switch">
          {['all', ...STATUSES].map(s => (
            <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="switch">
          {['all', ...PRIORITIES].map(p => (
            <button key={p} className={priorityFilter === p ? 'active' : ''} onClick={() => setPriorityFilter(p)}>
              {p === 'all' ? 'All priority' : PRIORITY_CONFIG[p]?.label || p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-col: table + detail ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? (isTablet ? '1fr' : '1.4fr 1fr') : '1fr', gap: isMobile ? 20 : 32 }}>
        <div>
          {loading ? (
            <div style={{ padding: 60 }}><Spinner page /></div>
          ) : !filtered.length ? (
            <div className="t-wrap" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No requests match the selected filters.
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Reported</th>
                    <th>Priority</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
                    const isActive = selected?._id === r._id;
                    return (
                      <tr key={r._id}
                        onClick={() => setSelected(isActive ? null : r)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}>
                        <td>
                          <div className="numeral" style={{ fontSize: 18 }}>{r.room?.roomNumber || '—'}</div>
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 220 }}>
                          {r.title || r.description?.slice(0, 50)}
                          {!r.title && r.description?.length > 50 ? '…' : ''}
                        </td>
                        <td>{CATEGORY_LABELS[r.category] || r.category}</td>
                        <td><span className="mono" style={{ color: 'var(--mute)' }}>{fmtDate(r.createdAt)}</span></td>
                        <td>
                          <span style={{ fontSize: 11, color: priority.color, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {priority.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{r.assignedTo?.name || <span style={{ color: 'var(--mute)' }}>Unassigned</span>}</td>
                        <td><StatusChip status={r.status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(isActive ? null : r); }}>
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <RequestDetail
            request={selected}
            canManage={canManage}
            canUpdate={canUpdate}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
          />
        )}
      </div>

      {showNew && (
        <NewRequestModal
          onClose={() => setShowNew(false)}
          onSaved={onSaved}
          rooms={rooms}
        />
      )}
    </div>
  );
}
