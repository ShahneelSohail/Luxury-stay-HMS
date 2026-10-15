import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];

const ROLE_LABELS = {
  admin:        'Admin',
  manager:      'Manager',
  receptionist: 'Receptionist',
  housekeeping: 'Housekeeping',
  service:      'Service Attendant',
};

const SIDEBAR_PAGE_ACCESS = [
  {
    section: 'Operations',
    pages: [
      { label: 'Dashboard',           roles: ['admin', 'manager', 'receptionist'] },
      { label: 'Reservations',        roles: ['admin', 'manager', 'receptionist'] },
      { label: 'Check-in / out',      roles: ['admin', 'manager', 'receptionist'] },
      { label: 'Rooms',               roles: ['admin', 'manager', 'receptionist', 'housekeeping'] },
      { label: 'Housekeeping',        roles: ['admin', 'manager', 'housekeeping'] },
      { label: 'Service Requests',    roles: ['admin', 'manager', 'housekeeping', 'service'] },
    ],
  },
  {
    section: 'Commerce',
    pages: [
      { label: 'Billing',             roles: ['admin', 'manager', 'receptionist'] },
      { label: 'Guests',              roles: ['admin', 'manager', 'receptionist'] },
      { label: 'Feedback',            roles: ['admin', 'manager'] },
      { label: 'Inbox',               roles: ['admin', 'manager', 'receptionist'] },
    ],
  },
  {
    section: 'Administration',
    pages: [
      { label: 'Analytics',           roles: ['admin', 'manager'] },
      { label: 'Suites',              roles: ['admin'] },
      { label: 'Staff & Roles',       roles: ['admin'] },
      { label: 'Settings',            roles: ['admin'] },
    ],
  },
];

const DEPT_LABELS = {
  admin:        'Administration',
  manager:      'Management',
  receptionist: 'Front Desk',
  housekeeping: 'Housekeeping',
  service:      'Service',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 32, height: 18, borderRadius: 10, background: on ? 'var(--ink)' : 'var(--hairline)', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.15s' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--paper)', transition: 'left 0.15s' }} />
    </div>
  );
}

function buildInitialPerms() {
  const perms = {};
  for (const role of ROLES) {
    perms[role] = {};
    for (const section of SIDEBAR_PAGE_ACCESS) {
      for (const page of section.pages) {
        perms[role][page.label] = page.roles.includes(role);
      }
    }
  }
  return perms;
}

// ─── Staff Modal (Add / Edit) ─────────────────────────────────────────────────

function StaffModal({ staff, onClose, onSaved }) {
  const toast  = useToast();
  const { isMobile } = useBreakpoint();
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name:     staff?.name     || '',
    email:    staff?.email    || '',
    role:     staff?.role     || 'receptionist',
    phone:    staff?.phone    || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name || !form.email)          { toast.error('Name and email are required.'); return; }
    if (!isEdit && !form.password)          { toast.error('Password is required for new staff.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone || undefined };
      if (!isEdit) payload.password = form.password;
      if (isEdit && form.password) payload.password = form.password;

      if (isEdit) {
        await api.patch(`/api/users/${staff._id}`, payload);
        toast.success(`${form.name} updated.`);
      } else {
        await api.post('/api/users', payload);
        toast.success(`${form.name} added to the team.`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Staff &amp; roles</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>{isEdit ? 'Edit staff' : 'Add staff'}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label>Full name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 6 …" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>{isEdit ? 'New password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />{isEdit ? 'Saving…' : 'Adding…'}</>
              : <>{isEdit ? 'Save changes' : <><Icon name="plus" size={12} />Add staff</>}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const toast = useToast();
  const [selected,      setSelected]      = useState(null);
  const [editing,       setEditing]       = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [roleFilter,    setRoleFilter]    = useState('all');
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [activePerms,   setActivePerms]   = useState('receptionist');
  const [rolePerms,     setRolePerms]     = useState(buildInitialPerms);
  const [permsLoading,  setPermsLoading]  = useState(true);
  const [saving,        setSaving]        = useState(false);
  const saveTimer = useRef(null);

  // Load persisted permissions from API
  useEffect(() => {
    api.get('/api/role-permissions')
      .then(res => {
        const loaded = res.data?.data?.permissions;
        if (loaded) setRolePerms(loaded);
      })
      .catch(() => {/* keep defaults on error */})
      .finally(() => setPermsLoading(false));
  }, []);

  // Debounced save — fires 600ms after last toggle
  function persistPerms(role, pages) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/api/role-permissions/${role}`, { pages });
      } catch {
        toast.error('Failed to save permissions.');
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function togglePerm(pageLabel) {
    setRolePerms(p => {
      const updated = {
        ...p,
        [activePerms]: { ...p[activePerms], [pageLabel]: !p[activePerms][pageLabel] },
      };
      persistPerms(activePerms, updated[activePerms]);
      return updated;
    });
  }

  const { data, loading } = useApi('/api/users?limit=100', { deps: [refreshKey] });
  const staff = (data?.users || []).filter(u => u.role !== 'guest');

  const filtered = roleFilter === 'all' ? staff : staff.filter(s => s.role === roleFilter);

  function onSaved() {
    setEditing(null);
    setShowAdd(false);
    setRefreshKey(k => k + 1);
  }

  async function handleDeactivate(s) {
    if (!window.confirm(`Deactivate ${s.name}? They will lose system access immediately.`)) return;
    try {
      await api.delete(`/api/users/${s._id}`);
      toast.success(`${s.name} deactivated.`);
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deactivate failed.');
    }
  }

  const pageAccess = SIDEBAR_PAGE_ACCESS.map(section => ({
    ...section,
    pages: section.pages.map(page => ({
      ...page,
      allowed: !!(rolePerms[activePerms] || {})[page.label],
    })),
  }));

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Staff & roles</div>
          <h1 className="display">The <em>house</em>.</h1>
          <p className="sub">
            {staff.length} active staff across {new Set(staff.map(s => s.role)).size} roles. Role permissions cascade through the system.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={12} />Add staff
          </button>
        </div>
      </div>

      {/* ── Role filter ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="switch" style={{ flexWrap: 'wrap' }}>
          {[{ id: 'all', label: 'All' }, ...ROLES.map(r => ({ id: r, label: ROLE_LABELS[r] }))].map(b => (
            <button key={b.id} className={roleFilter === b.id ? 'active' : ''} onClick={() => setRoleFilter(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: isMobile ? 20 : 32 }}>
        {/* Staff table */}
        <div>
          {loading ? (
            <div style={{ padding: 60 }}><Spinner page /></div>
          ) : !filtered.length ? (
            <div className="t-wrap" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No staff found.
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th>Since</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const isActive = selected?._id === s._id;
                    return (
                      <tr key={s._id}
                        onClick={() => setSelected(isActive ? null : s)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{getInitials(s.name)}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{s.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{ROLE_LABELS[s.role] || s.role}</td>
                        <td><span className="chip chip-reserved">{DEPT_LABELS[s.role] || s.role}</span></td>
                        <td>
                          {s.isActive !== false
                            ? <span className="chip chip-available"><span className="chip-dot" />Active</span>
                            : <span className="chip chip-cleaning"><span className="chip-dot" />Inactive</span>}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>{fmtDate(s.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); setEditing(s); }}>
                            Edit
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

        {/* Right panel — selected detail OR role permissions */}
        <div>
          {selected ? (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className="avatar avatar-lg">{getInitials(selected.name)}</div>
                  <div>
                    <h3 className="display" style={{ fontSize: 22, margin: 0 }}>{selected.name}</h3>
                    <div style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
                      {ROLE_LABELS[selected.role]} · {DEPT_LABELS[selected.role]}
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button>
              </div>

              <div className="rule"><div className="dot" /></div>

              {[
                ['Email',    selected.email],
                ['Phone',    selected.phone],
                ['Role',     ROLE_LABELS[selected.role]],
                ['Status',   selected.isActive !== false ? 'Active' : 'Inactive'],
                ['Member since', fmtDate(selected.createdAt)],
                ['Last login',   fmtDate(selected.lastLogin)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--hairline-2)' }}>
                  <span style={{ color: 'var(--mute)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value || '—'}</span>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(selected)}>
                  <Icon name="edit" size={12} />Edit
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--terracotta)' }}
                  onClick={() => handleDeactivate(selected)}>
                  Deactivate
                </button>
              </div>
            </div>
          ) : (
            /* Role permissions panel */
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 className="display" style={{ fontSize: 28, margin: 0 }}>Role permissions</h2>
                  {saving && <span style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.05em' }}>Saving…</span>}
                </div>
                <select value={activePerms} onChange={e => setActivePerms(e.target.value)}
                  style={{ fontSize: 11, padding: '6px 10px', border: '1px solid var(--hairline)', background: 'var(--paper)', borderRadius: 2 }}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="card" style={{ padding: 24, opacity: permsLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  {activePerms === 'admin'        && 'Full system access. Can manage all aspects of the property including staff and settings.'}
                  {activePerms === 'manager'      && 'Broad operational access including analytics and housekeeping management. Cannot manage staff or settings.'}
                  {activePerms === 'receptionist' && 'Front-desk access to reservations, check-in/out, billing, and guest records. Cannot view analytics or staff records.'}
                  {activePerms === 'housekeeping' && 'Access to the housekeeping board and task management only.'}
                  {activePerms === 'service'      && 'Access to all guest service requests and maintenance reports. Can start, fulfill, and resolve requests.'}
                </p>
                {pageAccess.map(section => (
                  <div key={section.section} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 10 }}>
                      {section.section}
                    </div>
                    {section.pages.map((page, index) => (
                      <div key={page.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: index < section.pages.length - 1 ? '1px solid var(--hairline-2)' : 'none' }}>
                        <span style={{ fontSize: 12 }}>{page.label}</span>
                        <Toggle on={page.allowed} onClick={() => togglePerm(page.label)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {(showAdd || editing) && (
        <StaffModal
          staff={editing || null}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
