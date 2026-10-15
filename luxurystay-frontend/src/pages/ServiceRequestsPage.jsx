import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const SVC_TYPE_LABELS = {
  room_service:  'Room Service',
  wake_up_call:  'Wake-up Call',
  laundry:       'Laundry',
  spa:           'Spa & Wellness',
  transport:     'Transport',
  amenities:     'Amenities',
  dining:        'Dining',
  concierge:     'Concierge',
  late_checkout: 'Late Check-out',
  other:         'Other',
};

const SVC_TYPE_ICONS = {
  room_service:  'coffee',
  wake_up_call:  'clock',
  laundry:       'leaf',
  spa:           'spa',
  transport:     'arrow_right',
  amenities:     'sparkle',
  dining:        'star',
  concierge:     'key',
  late_checkout: 'key',
  other:         'wrench',
};

const SVC_STATUS_CONFIG = {
  pending:       { chip: 'chip-reserved',  label: 'Pending'     },
  'in-progress': { chip: 'chip-occupied',  label: 'In progress' },
  fulfilled:     { chip: 'chip-available', label: 'Fulfilled'   },
  cancelled:     { chip: 'chip-cleaning',  label: 'Cancelled'   },
};

const MAINT_STATUS_CONFIG = {
  open:          { chip: 'chip-reserved',  label: 'Open'        },
  assigned:      { chip: 'chip-cleaning',  label: 'Assigned'    },
  'in-progress': { chip: 'chip-occupied',  label: 'In progress' },
  resolved:      { chip: 'chip-available', label: 'Resolved'    },
};

const PRIORITY_CONFIG = {
  low:    { color: 'var(--mute)',       label: 'Low'    },
  medium: { color: 'var(--brass)',      label: 'Medium' },
  high:   { color: 'var(--terracotta)', label: 'High'   },
  urgent: { color: 'var(--plum)',       label: 'Urgent' },
};

const MAINT_CATEGORY_LABELS = {
  plumbing: 'Plumbing', electrical: 'Electrical', ac: 'A/C',
  hvac: 'HVAC', furniture: 'Furniture', technology: 'Technology',
  structural: 'Structural', other: 'Other',
};

const MAINT_CATEGORIES = ['plumbing', 'electrical', 'ac', 'hvac', 'furniture', 'technology', 'structural', 'other'];
const MAINT_PRIORITIES  = ['low', 'medium', 'high', 'urgent'];
const MAINT_STATUSES    = ['open', 'assigned', 'in-progress', 'resolved'];

const ADMIN_MGR = ['admin', 'manager'];
const SVC_MGMT  = ['admin', 'manager', 'service'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function guestFullName(g) {
  if (!g) return '—';
  return [g.firstName, g.lastName].filter(Boolean).join(' ') || g.email || '—';
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function StatusChip({ status, config }) {
  const { chip, label } = config[status] || { chip: 'chip-reserved', label: status };
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

// ─── Service Request Detail ───────────────────────────────────────────────────

function ServiceRequestDetail({ request: r, canUpdate, currentUserId, onClose, onUpdated }) {
  const toast = useToast();
  const [fulfillNote, setFulfillNote] = useState('');
  const [showFulfill, setShowFulfill] = useState(false);
  const [saving, setSaving] = useState(false);

  const rid = r.id || r._id;
  const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
  const isTerminal = r.status === 'fulfilled' || r.status === 'cancelled';

  async function handleStart() {
    setSaving(true);
    try {
      await api.patch(`/api/services/${rid}/assign`, { assignedTo: currentUserId });
      toast.success('Started — assigned to you.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  }

  async function handleFulfill() {
    setSaving(true);
    try {
      await api.patch(`/api/services/${rid}/fulfill`, fulfillNote ? { notes: fulfillNote } : {});
      toast.success('Request fulfilled.');
      setShowFulfill(false);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      await api.patch(`/api/services/${rid}/cancel`);
      toast.success('Request cancelled.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {SVC_TYPE_LABELS[r.serviceType] || r.serviceType} · Room {r.room?.roomNumber || '—'}
          </div>
          <h2 className="display" style={{ fontSize: 24, margin: 0 }}>{guestFullName(r.guest)}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatusChip status={r.status} config={SVC_STATUS_CONFIG} />
        <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: priority.color, fontWeight: 600 }}>
          {priority.label} priority
        </span>
        {r.guest?.isVIP && (
          <span className="chip chip-occupied"><span className="chip-dot" />VIP</span>
        )}
      </div>

      {r.details && (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20, fontStyle: 'italic', borderLeft: '2px solid var(--brass)', paddingLeft: 12 }}>
          "{r.details}"
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20, fontSize: 12 }}>
        {[
          ['Room',         `${r.room?.roomNumber || '—'}${r.room?.type ? ' · ' + r.room.type.replace(/_/g, ' ') : ''}`],
          ['Floor',        r.room?.floor ? `Floor ${r.room.floor}` : '—'],
          ['Guest',        guestFullName(r.guest)],
          ['Service',      SVC_TYPE_LABELS[r.serviceType] || r.serviceType],
          ['Requested',    fmtDateTime(r.requestedAt || r.createdAt)],
          ['Assigned to',  r.assignedTo?.name || 'Unassigned'],
          ...(r.scheduledFor ? [['Scheduled for', fmtDateTime(r.scheduledFor)]] : []),
          ...(r.fulfilledAt  ? [['Fulfilled',     fmtDateTime(r.fulfilledAt)]]  : []),
          ...(r.responseMinutes != null ? [['Response time', `${r.responseMinutes} min`]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '6px 0', borderBottom: '1px solid var(--hairline-2)' }}>
            <div style={{ color: 'var(--mute)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {r.notes && (
        <div style={{ background: 'var(--linen)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--ink-3)' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Staff note</div>
          {r.notes}
        </div>
      )}

      {!isTerminal && canUpdate && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {r.status === 'pending' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleStart} disabled={saving}>
                Start work
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--terracotta)' }} onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
            </>
          )}
          {r.status === 'in-progress' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowFulfill(v => !v)} disabled={saving}>
              <Icon name="check" size={10} />Mark fulfilled
            </button>
          )}
        </div>
      )}

      {showFulfill && (
        <div style={{ marginTop: 16 }}>
          <div className="field">
            <label>Staff note (optional)</label>
            <textarea
              value={fulfillNote}
              onChange={e => setFulfillNote(e.target.value)}
              style={{ minHeight: 72, resize: 'vertical' }}
              placeholder="e.g. Delivered, guest confirmed receipt…"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFulfill(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleFulfill} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm fulfilled'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Guest Service Requests section ──────────────────────────────────────────

function GuestRequestsSection({ canUpdate, currentUser }) {
  const { isMobile, isTablet } = useBreakpoint();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [selected,     setSelected]     = useState(null);
  const [refreshKey,   setRefreshKey]   = useState(0);

  const { data, loading } = useApi('/api/services?limit=200', { deps: [refreshKey] });
  const requests = data?.serviceRequests || [];

  function onUpdated() { setSelected(null); setRefreshKey(k => k + 1); }

  const counts = {
    pending:    requests.filter(r => r.status === 'pending').length,
    inProgress: requests.filter(r => r.status === 'in-progress').length,
    fulfilled:  requests.filter(r => r.status === 'fulfilled').length,
    total:      requests.length,
  };

  const presentTypes = [...new Set(requests.map(r => r.serviceType))];

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status      !== statusFilter) return false;
    if (typeFilter   !== 'all' && r.serviceType !== typeFilter)   return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 32 }}>
        <Mini label="Pending"     value={counts.pending} />
        <Mini label="In progress" value={counts.inProgress} />
        <Mini label="Fulfilled"   value={counts.fulfilled} />
        <Mini label="Total"       value={counts.total} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="switch">
          {['all', 'pending', 'in-progress', 'fulfilled', 'cancelled'].map(s => (
            <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : SVC_STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        {presentTypes.length > 1 && (
          <div className="switch">
            <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>
              All types
            </button>
            {presentTypes.map(t => (
              <button key={t} className={typeFilter === t ? 'active' : ''} onClick={() => setTypeFilter(t)}>
                {SVC_TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? (isTablet ? '1fr' : '1.4fr 1fr') : '1fr', gap: isMobile ? 20 : 32 }}>
        <div>
          {loading ? (
            <div style={{ padding: 60 }}><Spinner page /></div>
          ) : !filtered.length ? (
            <div className="t-wrap" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              {requests.length === 0 ? 'No service requests yet.' : 'No requests match the selected filters.'}
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Guest</th>
                    <th>Service</th>
                    <th>Details</th>
                    <th>Requested</th>
                    <th>Priority</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
                    const rid = r.id || r._id;
                    const isActive = (selected?.id || selected?._id) === rid;
                    return (
                      <tr
                        key={rid}
                        onClick={() => setSelected(isActive ? null : r)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}
                      >
                        <td>
                          <div className="numeral" style={{ fontSize: 18 }}>{r.room?.roomNumber || '—'}</div>
                          {r.room?.floor && <div style={{ fontSize: 11, color: 'var(--mute)' }}>Floor {r.room.floor}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{guestFullName(r.guest)}</div>
                          {r.guest?.isVIP && <span className="chip chip-occupied" style={{ fontSize: 10 }}>VIP</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name={SVC_TYPE_ICONS[r.serviceType] || 'star'} size={13} style={{ color: 'var(--brass-deep)', flexShrink: 0 }} />
                            <span>{SVC_TYPE_LABELS[r.serviceType] || r.serviceType}</span>
                          </div>
                        </td>
                        <td style={{ maxWidth: 180, color: 'var(--ink-3)', fontSize: 13 }}>
                          {r.details
                            ? (r.details.length > 48 ? r.details.slice(0, 48) + '…' : r.details)
                            : <span style={{ color: 'var(--mute)' }}>—</span>}
                        </td>
                        <td>
                          <span className="mono" style={{ color: 'var(--mute)', fontSize: 12 }}>{fmtDateTime(r.requestedAt || r.createdAt)}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: priority.color, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {priority.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {r.assignedTo?.name || <span style={{ color: 'var(--mute)' }}>Unassigned</span>}
                        </td>
                        <td><StatusChip status={r.status} config={SVC_STATUS_CONFIG} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); setSelected(isActive ? null : r); }}
                          >
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
          <ServiceRequestDetail
            request={selected}
            canUpdate={canUpdate}
            currentUserId={currentUser?.id}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
          />
        )}
      </div>
    </div>
  );
}

// ─── Maintenance Detail Panel ─────────────────────────────────────────────────

function MaintenanceDetail({ request: r, canManage, canUpdate, onClose, onUpdated }) {
  const toast = useToast();
  const [resolveNote, setResolveNote] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [saving, setSaving] = useState(false);

  const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
  const isResolved = r.status === 'resolved';

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

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {MAINT_CATEGORY_LABELS[r.category] || r.category} · Room {r.room?.roomNumber || '—'}
          </div>
          <h2 className="display" style={{ fontSize: 24, margin: 0 }}>{r.title || r.description?.slice(0, 60)}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatusChip status={r.status} config={MAINT_STATUS_CONFIG} />
        <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: priority.color, fontWeight: 600 }}>
          {priority.label} priority
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>{r.description}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20, fontSize: 12 }}>
        {[
          ['Reported',    fmtDateTime(r.createdAt)],
          ['Reported by', r.reportedBy?.name || '—'],
          ['Assigned to', r.assignedTo?.name || 'Unassigned'],
          ['Category',    MAINT_CATEGORY_LABELS[r.category] || r.category],
          ...(r.resolvedAt ? [['Resolved', fmtDateTime(r.resolvedAt)]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '6px 0', borderBottom: '1px solid var(--hairline-2)' }}>
            <div style={{ color: 'var(--mute)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {r.resolutionNote && (
        <div style={{ background: 'var(--linen)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--ink-3)' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Resolution note</div>
          {r.resolutionNote}
        </div>
      )}

      {r.statusLog?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Activity</div>
          {r.statusLog.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--hairline-2)' }}>
              <span style={{ color: 'var(--mute)', flexShrink: 0 }}>{fmtDateTime(log.at)}</span>
              <StatusChip status={log.status} config={MAINT_STATUS_CONFIG} />
              {log.note && <span style={{ color: 'var(--ink-3)' }}>{log.note}</span>}
            </div>
          ))}
        </div>
      )}

      {!isResolved && canUpdate && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(r.status === 'open' || r.status === 'assigned') && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleStatus('in-progress')} disabled={saving}>
              Start work
            </button>
          )}
          {r.status === 'in-progress' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowResolve(v => !v)} disabled={saving}>
              <Icon name="check" size={10} />Mark resolved
            </button>
          )}
        </div>
      )}

      {showResolve && (
        <div style={{ marginTop: 16 }}>
          <div className="field">
            <label>Resolution note</label>
            <textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              style={{ minHeight: 72, resize: 'vertical' }}
              placeholder="Describe what was done…"
            />
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

// ─── New Maintenance Request Modal ────────────────────────────────────────────

function NewMaintenanceModal({ onClose, onSaved, rooms }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [form, setForm] = useState({ room: '', category: 'other', priority: 'medium', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.description) { toast.error('Description is required.'); return; }
    setSaving(true);
    try {
      await api.post('/api/maintenance', {
        ...(form.room
          ? { room: form.room }
          : { location: 'Common area / N/A' }),
        category:    form.category,
        priority:    form.priority,
        title:       form.title       || undefined,
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
                  <option key={r._id} value={r._id}>{r.roomNumber} · {r.type?.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {MAINT_CATEGORIES.map(c => <option key={c} value={c}>{MAINT_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {MAINT_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Short title (optional)</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AC not cooling" />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Description *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ minHeight: 88, resize: 'vertical' }}
              placeholder="Describe the issue in detail…"
              required
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Submitting…</>
              : <><Icon name="plus" size={12} />Submit request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Maintenance section ──────────────────────────────────────────────────────

function MaintenanceSection({ canManage, canUpdate }) {
  const { isMobile, isTablet } = useBreakpoint();
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected,       setSelected]       = useState(null);
  const [showNew,        setShowNew]        = useState(false);
  const [refreshKey,     setRefreshKey]     = useState(0);

  const { data: reqData, loading } = useApi('/api/maintenance?limit=200', { deps: [refreshKey] });
  const { data: roomsData }        = useApi('/api/rooms?limit=200');

  const requests = reqData?.requests || [];
  const rooms    = roomsData?.rooms  || [];

  function onUpdated() { setSelected(null); setRefreshKey(k => k + 1); }
  function onSaved()   { setShowNew(false); setRefreshKey(k => k + 1); }

  const counts = {
    open:       requests.filter(r => r.status === 'open').length,
    inProgress: requests.filter(r => r.status === 'in-progress').length,
    resolved:   requests.filter(r => r.status === 'resolved').length,
    assigned:   requests.filter(r => r.status === 'assigned').length,
  };

  const filtered = requests.filter(r => {
    if (statusFilter   !== 'all' && r.status   !== statusFilter)   return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={12} />New request
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 32 }}>
        <Mini label="Open"           value={counts.open} />
        <Mini label="Assigned"       value={counts.assigned} />
        <Mini label="In progress"    value={counts.inProgress} />
        <Mini label="Resolved today" value={counts.resolved} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="switch">
          {['all', ...MAINT_STATUSES].map(s => (
            <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : MAINT_STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="switch">
          {['all', ...MAINT_PRIORITIES].map(p => (
            <button key={p} className={priorityFilter === p ? 'active' : ''} onClick={() => setPriorityFilter(p)}>
              {p === 'all' ? 'All priority' : PRIORITY_CONFIG[p]?.label || p}
            </button>
          ))}
        </div>
      </div>

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
                    <th>Room</th>
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
                      <tr
                        key={r._id}
                        onClick={() => setSelected(isActive ? null : r)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}
                      >
                        <td>
                          <div className="numeral" style={{ fontSize: 18 }}>{r.room?.roomNumber || '—'}</div>
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 220 }}>
                          {r.title || r.description?.slice(0, 50)}
                          {!r.title && r.description?.length > 50 ? '…' : ''}
                        </td>
                        <td>{MAINT_CATEGORY_LABELS[r.category] || r.category}</td>
                        <td><span className="mono" style={{ color: 'var(--mute)', fontSize: 12 }}>{fmtDate(r.createdAt)}</span></td>
                        <td>
                          <span style={{ fontSize: 11, color: priority.color, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {priority.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{r.assignedTo?.name || <span style={{ color: 'var(--mute)' }}>Unassigned</span>}</td>
                        <td><StatusChip status={r.status} config={MAINT_STATUS_CONFIG} /></td>
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
          <MaintenanceDetail
            request={selected}
            canManage={canManage}
            canUpdate={canUpdate}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
          />
        )}
      </div>

      {showNew && (
        <NewMaintenanceModal onClose={() => setShowNew(false)} onSaved={onSaved} rooms={rooms} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceRequestsPage() {
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  const role = user?.role;
  const canManage = ADMIN_MGR.includes(role);
  const canUpdate = SVC_MGMT.includes(role);

  const [activeTab, setActiveTab] = useState('guest');

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Service requests · live</div>
          <h1 className="display">At your <em>service.</em></h1>
          <p className="sub">Guest requests and maintenance reports from active stays.</p>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="switch" style={{ flexWrap: 'wrap' }}>
          <button className={activeTab === 'guest' ? 'active' : ''} onClick={() => setActiveTab('guest')}>
            Guest Requests
          </button>
          <button className={activeTab === 'maintenance' ? 'active' : ''} onClick={() => setActiveTab('maintenance')}>
            Maintenance
          </button>
        </div>
      </div>

      {activeTab === 'guest'       && <GuestRequestsSection canUpdate={canUpdate} currentUser={user} />}
      {activeTab === 'maintenance' && <MaintenanceSection   canManage={canManage} canUpdate={canUpdate} />}
    </div>
  );
}
