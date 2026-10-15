import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS = ['none', 'argent', 'or', 'etoile'];
const TIER_CONFIG = {
  etoile: { chip: 'chip-vip',         label: 'Étoile', icon: true },
  or:     { chip: 'chip-cleaning',    label: 'Or',     icon: false },
  argent: { chip: 'chip-reserved',    label: 'Argent', icon: false },
  none:   { chip: '',                 label: '—',      icon: false },
};

const COUNTRIES = ['France', 'United Kingdom', 'United States', 'Germany', 'Italy', 'Spain', 'Japan', 'Australia', 'Switzerland', 'UAE'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(first = '', last = '') {
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

function fmtCurrency(val) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierChip({ tier }) {
  if (!tier || tier === 'none') return <span style={{ color: 'var(--mute)', fontSize: 12 }}>—</span>;
  const { chip, label, icon } = TIER_CONFIG[tier] || TIER_CONFIG.none;
  return (
    <span className={`chip ${chip}`}>
      {icon && <Icon name="crown" size={10} />}
      {label}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="display numeral" style={{ fontSize: 22 }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--hairline-2)' }}>
      <span style={{ color: 'var(--mute)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

// ─── Guest Detail Panel ───────────────────────────────────────────────────────

function GuestDetail({ guest, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm]       = useState({
    firstName:   guest.firstName || '',
    lastName:    guest.lastName  || '',
    email:       guest.email     || '',
    phone:       guest.phone     || '',
    nationality: guest.nationality || '',
    tier:        guest.tier || 'none',
    notes:       guest.notes || '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/api/guests/${guest._id}`, form);
      toast.success('Guest profile updated.');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  const initials  = getInitials(guest.firstName, guest.lastName);
  const fullName  = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || '—';
  const tier      = guest.tier || 'none';
  const isVIP     = tier === 'etoile';

  return (
    <div className="card" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div className="avatar avatar-lg">{initials}</div>
          <div>
            <h2 className="display" style={{ fontSize: 26, margin: 0 }}>{fullName}</h2>
            <div style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
              {guest.nationality || 'Unknown'} {isVIP ? '· Étoile member' : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <TierChip tier={tier} />
              {guest.currentRoom && (
                <span className="chip chip-occupied">In-house · {guest.currentRoom.roomNumber ?? guest.currentRoom}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit && !editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Icon name="edit" size={12} />Edit
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      <div className="rule"><div className="dot" /></div>

      {editing ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field"><label>First name</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
            <div className="field"><label>Last name</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="field">
              <label>Nationality</label>
              <select value={form.nationality} onChange={e => set('nationality', e.target.value)}>
                <option value="">— Select —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Loyalty tier</label>
              <select value={form.tier} onChange={e => set('tier', e.target.value)}>
                {TIERS.map(t => <option key={t} value={t}>{TIER_CONFIG[t]?.label || t}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Concierge notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Standing preferences, dietary requirements…" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}>
              {saving
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
                : 'Save changes'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Stat label="Total visits"    value={guest.totalStays ?? '—'} />
            <Stat label="Lifetime spend"  value={fmtCurrency(guest.lifetimeSpend)} />
            <Stat label="Last visit"      value={fmtDate(guest.lastStay)} />
            <Stat label="Member since"    value={fmtDate(guest.createdAt)} />
          </div>

          <div className="rule"><div className="dot" /></div>

          {/* Contact */}
          <div className="eyebrow" style={{ marginBottom: 10 }}>Contact</div>
          <DetailRow label="Email" value={guest.email} />
          <DetailRow label="Phone" value={guest.phone} />
          <DetailRow label="Nationality" value={guest.nationality} />

          {/* Notes */}
          {guest.notes && (
            <>
              <div className="eyebrow" style={{ margin: '16px 0 10px' }}>Concierge notes</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: 'var(--ink-3)' }}>
                {guest.notes.split('\n').filter(Boolean).map((line, i, arr) => (
                  <li key={i} style={{ padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--hairline-2)' : 'none' }}>
                    · {line}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── New Guest Modal ──────────────────────────────────────────────────────────

function NewGuestModal({ onClose, onSaved }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    nationality: '', tier: 'none', notes: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/guests', form);
      toast.success(`${form.firstName} ${form.lastName} added to the registry.`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Guest registry</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>New guest</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ margin: 0 }}><label>First name *</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} autoFocus /></div>
            <div className="field" style={{ margin: 0 }}><label>Last name *</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
            <div className="field" style={{ margin: 0 }}><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="field" style={{ margin: 0 }}><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 6 …" /></div>
            <div className="field" style={{ margin: 0 }}>
              <label>Nationality</label>
              <select value={form.nationality} onChange={e => set('nationality', e.target.value)}>
                <option value="">— Select —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Loyalty tier</label>
              <select value={form.tier} onChange={e => set('tier', e.target.value)}>
                {TIERS.map(t => <option key={t} value={t}>{TIER_CONFIG[t]?.label || t}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Concierge notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ minHeight: 72, resize: 'vertical' }}
              placeholder="Standing preferences, dietary requirements (one per line)…" />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Creating…</>
              : <><Icon name="plus" size={12} />Add guest</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const { user }  = useAuth();
  const canEdit   = ['admin', 'manager', 'receptionist'].includes(user?.role);
  const [searchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';

  const [search,     setSearch]     = useState(initialSearch);
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState('');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(null);
  const [showNew,    setShowNew]     = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing,    setSyncing]    = useState(false);
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const params = new URLSearchParams({ page, limit: 15 });
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (tierFilter !== 'all') params.set('tier', tierFilter);
  if (sortBy) params.set('sort', sortBy);

  const { data, loading } = useApi(`/api/guests?${params}`, { deps: [debouncedSearch, tierFilter, sortBy, page, refreshKey] });
  const guests     = data?.guests || [];
  const total      = data?.total  || 0;
  const totalPages = data?.pages  || 1;

  function onSaved() {
    setShowNew(false);
    setSelected(null);
    setRefreshKey(k => k + 1);
  }

  async function handleSyncStats() {
    setSyncing(true);
    try {
      const res = await api.post('/api/guests/recalc-all');
      const { updated, tierDistribution } = res.data?.data || res.data || {};
      toast.success(`Stats synced for ${updated ?? 'all'} guests.`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  // Reload selected guest after edit
  async function refreshSelected() {
    if (!selected) return;
    try {
      const res = await api.get(`/api/guests/${selected._id}`);
      setSelected(res.data.guest || res.data);
    } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
  }

  const tierButtons = [
    { id: 'all',    label: 'All' },
    { id: 'etoile', label: 'Étoile' },
    { id: 'or',     label: 'Or' },
    { id: 'argent', label: 'Argent' },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Guest registry</div>
          <h1 className="display">A <em>familiar</em> face.</h1>
          <p className="sub">{total.toLocaleString()} known guests. Étoile-tier members receive priority concierge service.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleSyncStats} disabled={syncing}
            title="Recalculate visits, lifetime spend, and tier for all guests">
            <Icon name={syncing ? 'loader' : 'refresh'} size={12} />
            {syncing ? 'Syncing…' : 'Sync stats'}
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={12} />New guest
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 240px', maxWidth: 320 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: '100%' }}
          />
        </div>
        <div className="switch">
          {tierButtons.map(b => (
            <button key={b.id} className={tierFilter === b.id ? 'active' : ''} onClick={() => { setTierFilter(b.id); setPage(1); }}>
              {b.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
          style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--hairline)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 2 }}>
          <option value="">Sort: Default</option>
          <option value="highestSpend">Highest spend</option>
        </select>
      </div>

      {/* ── Two-col layout: table + detail ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? (isTablet ? '1fr' : '1.4fr 1fr') : '1fr', gap: isMobile ? 20 : 32 }}>
        {/* Left: table */}
        <div>
          {loading ? (
            <div style={{ padding: 60 }}><Spinner page /></div>
          ) : !guests.length ? (
            <div className="t-wrap" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              {debouncedSearch ? `No guests matching "${debouncedSearch}".` : 'No guests found.'}
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Nationality</th>
                    <th>Tier</th>
                    <th>Visits</th>
                    <th>Lifetime spend</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g, i) => {
                    const initials = getInitials(g.firstName, g.lastName);
                    const fullName = [g.firstName, g.lastName].filter(Boolean).join(' ') || '—';
                    const isActive = selected?._id === g._id;
                    return (
                      <tr key={g._id}
                        onClick={() => setSelected(isActive ? null : g)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{fullName}</div>
                              {g.notes && (
                                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>
                                  {g.notes.split('\n')[0].slice(0, 48)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{g.nationality || '—'}</td>
                        <td><TierChip tier={g.tier} /></td>
                        <td className="numeral" style={{ fontSize: 16 }}>{g.totalStays ?? '—'}</td>
                        <td className="numeral">{fmtCurrency(g.lifetimeSpend)}</td>
                        <td className="numeral" style={{ fontSize: 16 }}>{g.currentRoom?.roomNumber || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12, color: 'var(--mute)' }}>
              <span>Page {page} of {totalPages} · {total} guests</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <GuestDetail
            guest={selected}
            canEdit={canEdit}
            onClose={() => setSelected(null)}
            onSaved={refreshSelected}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {showNew && (
        <NewGuestModal onClose={() => setShowNew(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
