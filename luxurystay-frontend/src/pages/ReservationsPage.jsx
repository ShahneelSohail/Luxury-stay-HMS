import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Icon from '../components/Icon';
import Dropdown from '../components/Dropdown';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = [
  { value: 'direct',       label: 'Direct' },
  { value: 'travel_agent', label: 'Travel Agent' },
  { value: 'concierge',    label: 'Concierge' },
  { value: 'online_agent', label: 'Online Agent' },
];

const STATUSES = [
  { value: '',           label: 'All statuses' },
  { value: 'pending',    label: 'Pending' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'checked-in', label: 'In-house' },
  { value: 'checked-out',label: 'Checked out' },
  { value: 'cancelled',  label: 'Cancelled' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(val) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function getInitials(first = '', last = '') {
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

function newestCreatedFirst(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function weekMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

const STATUS_CONFIG = {
  pending:     { cls: 'chip-reserved',    label: 'Pending' },
  confirmed:   { cls: 'chip-confirmed',   label: 'Confirmed' },
  'checked-in':  { cls: 'chip-occupied',  label: 'In-house' },
  'checked-out': { cls: 'chip-cleaning',  label: 'Checked out' },
  cancelled:   { cls: 'chip-maintenance', label: 'Cancelled' },
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || { cls: 'chip-reserved', label: status };
  return <span className={`chip ${cfg.cls}`}><span className="chip-dot" />{cfg.label}</span>;
}

// ─── Guest Search (async combobox) ────────────────────────────────────────────

function GuestSearch({ value, onChange }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/api/guests?search=${encodeURIComponent(query)}&limit=6`);
        setResults(data.data?.guests || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [query]);

  function select(guest) {
    onChange(guest);
    setQuery(`${guest.firstName} ${guest.lastName}`);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setResults([]);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--hairline)', paddingBottom: 8 }}>
        <input
          value={value ? `${value.firstName} ${value.lastName}` : query}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or email…"
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
        />
        {searching && <Spinner />}
        {value && <button type="button" onClick={clear} style={{ color: 'var(--mute)' }}><Icon name="x" size={12} /></button>}
      </div>
      {open && results.length > 0 && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 11,
            background: 'var(--paper)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}>
            {results.map(g => (
              <div key={g.id}
                onClick={() => select(g)}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--linen)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {getInitials(g.firstName, g.lastName)}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{g.firstName} {g.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{g.email}</div>
                </div>
                {g.isVIP && <span className="chip chip-vip" style={{ marginLeft: 'auto' }}><Icon name="crown" size={10} />Étoile</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── New Reservation Modal ────────────────────────────────────────────────────

function NewReservationModal({ onClose, onCreated }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [step, setStep]           = useState(1); // 1 = dates+guests, 2 = room+details
  const [guest, setGuest]         = useState(null);
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [adults, setAdults]       = useState(1);
  const [children, setChildren]   = useState(0);
  const [source, setSource]       = useState('direct');
  const [eta, setEta]             = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [notes, setNotes]         = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  const [availRooms, setAvailRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function checkAvailability() {
    if (!checkIn || !checkOut) { setError('Select check-in and check-out dates.'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { setError('Check-out must be after check-in.'); return; }
    if (!guest) { setError('Select a guest.'); return; }
    setError('');
    setLoadingRooms(true);
    try {
      const { data } = await api.get(`/api/rooms/available?checkIn=${checkIn}&checkOut=${checkOut}`);
      setAvailRooms(data.data?.rooms || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not check availability.');
    } finally { setLoadingRooms(false); }
  }

  async function submit() {
    if (!selectedRoom) { setError('Select a room.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/api/reservations', {
        guest:           guest.id,
        room:            selectedRoom._id || selectedRoom.id,
        checkInDate:     checkIn,
        checkOutDate:    checkOut,
        adults:          Number(adults),
        children:        Number(children),
        source,
        eta:             eta || undefined,
        specialRequests: specialRequests || undefined,
        notes:           notes || undefined,
        depositAmount:   depositAmount ? Number(depositAmount) : 0,
      });
      toast.success('Reservation created successfully.');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reservation.');
    } finally { setSaving(false); }
  }

  const nights = checkIn && checkOut
    ? Math.max(0, daysDiff(checkIn, checkOut))
    : 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              {step === 1 ? 'Step 1 of 2 · Guest & Dates' : 'Step 2 of 2 · Room & Details'}
            </div>
            <h2 className="display" style={{ fontSize: 28, margin: 0 }}>New <em>reservation</em></h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={12} />{error}
            </div>
          )}

          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="field">
                <label>Guest</label>
                <GuestSearch value={guest} onChange={setGuest} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Check-in date</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={isoDate(new Date())} />
                </div>
                <div className="field">
                  <label>Check-out date</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || isoDate(new Date())} />
                </div>
              </div>
              {nights > 0 && (
                <div style={{ fontSize: 12, color: 'var(--mute)', letterSpacing: '0.08em' }}>
                  {nights} night{nights !== 1 ? 's' : ''}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Adults</label>
                  <input type="number" min="1" max="20" value={adults} onChange={e => setAdults(e.target.value)} />
                </div>
                <div className="field">
                  <label>Children</label>
                  <input type="number" min="0" max="20" value={children} onChange={e => setChildren(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Available rooms */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>
                  {availRooms.length} room{availRooms.length !== 1 ? 's' : ''} available · {fmtDate(checkIn)} → {fmtDate(checkOut)}
                </div>
                {availRooms.length === 0 ? (
                  <div style={{ color: 'var(--mute)', fontSize: 13 }}>No rooms available for these dates.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {availRooms.map(r => (
                      <div key={r._id || r.id}
                        onClick={() => setSelectedRoom(r)}
                        style={{
                          padding: '12px 16px', border: `1px solid ${selectedRoom?._id === r._id || selectedRoom?.id === r.id ? 'var(--brass)' : 'var(--hairline)'}`,
                          borderRadius: 'var(--radius)', cursor: 'pointer',
                          background: selectedRoom?._id === r._id || selectedRoom?.id === r.id ? 'var(--linen)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span className="numeral" style={{ fontSize: 18, marginRight: 12 }}>{r.roomNumber}</span>
                          <span style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.typeLabel || r.type}</span>
                          {r.view && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--mute-2)' }}>{r.view.replace('_', ' ')}</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>
                          €{(r.rates?.standard || 0).toLocaleString()}<span style={{ fontSize: 11, color: 'var(--mute)' }}>/night</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRoom && (
                <div style={{ background: 'var(--linen)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--ink-3)' }}>
                  Room {selectedRoom.roomNumber} · {nights} nights · <strong>{fmtCurrency((selectedRoom.rates?.standard || 0) * nights)}</strong> room total
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Source</label>
                  <Dropdown
                    value={source}
                    onChange={value => setSource(value)}
                    options={SOURCES}
                    placeholder="Select source"
                  />
                </div>
                <div className="field">
                  <label>ETA (HH:MM)</label>
                  <input type="time" value={eta} onChange={e => setEta(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Special requests</label>
                <input value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Dietary needs, accessibility, preferences…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Deposit amount (€)</label>
                  <input type="number" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="field">
                  <label>Internal notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Staff notes…" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {step === 2 && (
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              <Icon name="arrow_left" size={12} />Back
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn btn-primary" onClick={checkAvailability} disabled={loadingRooms}>
              {loadingRooms ? <><Spinner />Checking…</> : <>Check availability <Icon name="arrow_right" size={12} /></>}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={saving || !selectedRoom}>
              {saving ? <><Spinner />Creating…</> : <>Create reservation <Icon name="check" size={12} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reservation Detail Panel ─────────────────────────────────────────────────

function ReservationDetail({ reservation: r, onClose, onCancelled }) {
  const toast   = useToast();
  const { isMobile } = useBreakpoint();
  const [cancelling,   setCancelling]   = useState(false);

  async function cancel() {
    if (!window.confirm(`Cancel reservation ${r.bookingId}?`)) return;
    setCancelling(true);
    try {
      await api.patch(`/api/reservations/${r.id}/cancel`);
      toast.success(`Reservation ${r.bookingId} cancelled.`);
      onCancelled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel reservation.');
    } finally { setCancelling(false); }
  }

  const guestName = r.guest
    ? `${r.guest.firstName || ''} ${r.guest.lastName || ''}`.trim()
    : '—';
  const isVIP = r.guest?.isVIP;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.3)' }} />
      <div style={{
        position: 'relative', width: isMobile ? '100vw' : 480, maxWidth: '100%', background: 'var(--paper)',
        borderLeft: '1px solid var(--hairline)', height: '100%', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Reservation</div>
              <h2 className="display" style={{ fontSize: 32, margin: 0 }}>{guestName}</h2>
            </div>
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isVIP && <span className="chip chip-vip"><Icon name="crown" size={10} />Étoile</span>}
            <span className="chip chip-reserved"><span className="mono">{r.bookingId}</span></span>
            <StatusChip status={r.status} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px', flex: 1 }}>
          <DetailRow label="Room" value={r.room ? `${r.room.roomNumber} · ${r.room.typeLabel || r.room.type}` : '—'} />
          <DetailRow label="Check-in"  value={fmtDate(r.checkInDate)} />
          <DetailRow label="Check-out" value={fmtDate(r.checkOutDate)} />
          <DetailRow label="Nights"    value={r.nights ?? '—'} />
          <DetailRow label="Guests"    value={`${r.adults} adult${r.adults !== 1 ? 's' : ''}${r.children ? ` · ${r.children} child${r.children !== 1 ? 'ren' : ''}` : ''}`} />
          <DetailRow label="Source"    value={SOURCES.find(s => s.value === r.source)?.label || r.source} />
          {r.eta && <DetailRow label="ETA" value={r.eta} mono />}
          <DetailRow label="Total"     value={fmtCurrency(r.totalAmount)} />
          <DetailRow label="Deposit"   value={`${fmtCurrency(r.depositAmount)}${r.depositPaid ? ' · Paid' : ' · Pending'}`} />
          {r.specialRequests && <DetailRow label="Special requests" value={r.specialRequests} />}
          {r.notes && <DetailRow label="Notes" value={r.notes} />}
          {r.guest?.email && <DetailRow label="Guest email" value={r.guest.email} />}
          {r.guest?.phone && <DetailRow label="Guest phone" value={r.guest.phone} />}
          {r.cancellationDeadline && <DetailRow label="Free cancellation until" value={fmtDate(r.cancellationDeadline)} />}

          {r.addOns?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Add-ons</div>
              {r.addOns.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--hairline-2)', fontSize: 13 }}>
                  <span>{a.name}</span>
                  <span className="numeral">{fmtCurrency(a.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {['pending', 'confirmed'].includes(r.status) && (
          <div style={{ padding: '20px 32px', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel} disabled={cancelling} style={{ justifyContent: 'center' }}>
              {cancelling ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />Cancelling…</> : <><Icon name="x" size={12} />Cancel reservation</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--hairline-2)', fontSize: 13 }}>
      <span style={{ color: 'var(--mute)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontWeight: 500, maxWidth: 280, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ReservationList({ onSelect, refreshKey }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [guestSearch, setGuestSearch]   = useState('');
  const [page, setPage]   = useState(1);
  const limit = 15;

  const params = new URLSearchParams({ page, limit, sort: 'newest' });
  if (statusFilter) params.set('status', statusFilter);
  if (guestSearch.trim()) params.set('search', guestSearch.trim());

  const { data, loading } = useApi(`/api/reservations?${params}`, {
    defaultData: { reservations: [], pagination: {} },
    deps: [refreshKey],
  });
  const reservations = data?.reservations || [];
  const pagination   = data?.pagination   || {};

  useEffect(() => { setPage(1); }, [statusFilter, guestSearch]);

  const normalizedSearch = guestSearch.trim().toLowerCase();
  const visibleReservations = (normalizedSearch
    ? reservations.filter(r => {
        const name = `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim().toLowerCase();
        return name.includes(normalizedSearch);
      })
    : [...reservations]).sort(newestCreatedFirst);

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ border: '1px solid var(--hairline)', background: 'var(--paper)', padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius)', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          type="search"
          value={guestSearch}
          onChange={e => setGuestSearch(e.target.value)}
          placeholder="Search guest name…"
          style={{ border: '1px solid var(--hairline)', background: 'var(--paper)', padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius)', color: 'var(--ink)', fontFamily: 'var(--sans)', minWidth: 220, flex: 1 }}
        />
        {(statusFilter || guestSearch) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter(''); setGuestSearch(''); }}>
            <Icon name="x" size={10} />Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mute)' }}>
          {visibleReservations.length} reservation{visibleReservations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? <Spinner page /> : (
        <>
          <div className="t-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Reservation</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                  <th>Nights</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleReservations.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--mute)', padding: '32px 0' }}>No reservations found.</td></tr>
                ) : visibleReservations.map(r => {
                  const gName = r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '—';
                  const isVIP = r.guest?.isVIP;
                  return (
                    <tr key={r.id} onClick={() => onSelect(r)} style={{ cursor: 'pointer' }}>
                      <td><span className="mono">{r.bookingId}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {getInitials(r.guest?.firstName, r.guest?.lastName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{gName}</div>
                            {isVIP && <span className="chip chip-vip" style={{ marginTop: 2 }}><Icon name="crown" size={9} />Étoile</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="numeral" style={{ fontSize: 16 }}>{r.room?.roomNumber || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.room?.typeLabel || r.room?.type || ''}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.checkInDate)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.checkOutDate)}</td>
                      <td>{r.nights ?? '—'}</td>
                      <td><StatusChip status={r.status} /></td>
                      <td className="numeral">{fmtCurrency(r.totalAmount)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onSelect(r); }}>
                          View <Icon name="arrow_right" size={10} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                <Icon name="arrow_left" size={12} />Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>Page {page} of {pagination.totalPages}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                Next <Icon name="arrow_right" size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

const STATUS_BAR_COLORS = {
  'pending':     { bg: 'var(--linen)',          text: 'var(--ink)',         border: 'var(--ink-3)' },
  'confirmed':   { bg: 'var(--sage-soft)',       text: 'var(--sage)',        border: 'var(--sage)' },
  'checked-in':  { bg: 'var(--terracotta-soft)', text: 'var(--terracotta)', border: 'var(--terracotta)' },
  'checked-out': { bg: 'var(--linen)',           text: 'var(--mute)',       border: 'var(--mute)' },
  'cancelled':   { bg: 'var(--hairline-2)',      text: 'var(--mute)',       border: 'var(--mute-2)' },
};

function ReservationCalendar({ onSelect, refreshKey }) {
  const [weekStart, setWeekStart] = useState(() => weekMondayOf(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const params = new URLSearchParams({
    checkInFrom: isoDate(addDays(weekStart, -30)), // wide window to catch multi-week stays
    checkInTo:   isoDate(addDays(weekEnd, 7)),
    limit: 100,
    sort: 'checkIn',
  });

  const { data, loading } = useApi(`/api/reservations?${params}`, {
    defaultData: { reservations: [] },
    deps: [refreshKey],
  });
  const reservations = data?.reservations || [];

  // Collect unique rooms that appear in the fetched reservations
  const roomMap = {};
  reservations.forEach(r => {
    if (!r.room) return;
    const key = r.room.roomNumber;
    if (!roomMap[key]) roomMap[key] = r.room;
  });
  const rooms = Object.values(roomMap).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

  // Filter to reservations overlapping this week
  const weekReservations = reservations.filter(r =>
    new Date(r.checkInDate) < addDays(weekEnd, 1) &&
    new Date(r.checkOutDate) > weekStart
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' }).toUpperCase(),
      date: d,
      isToday: isoDate(d) === isoDate(new Date()),
    };
  });

  return (
    <>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, -7))}>
          <Icon name="arrow_left" size={12} />Prev
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })} — {weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, 7))}>
          Next <Icon name="arrow_right" size={12} />
        </button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setWeekStart(weekMondayOf(new Date()))}>
          Today
        </button>
      </div>

      {loading ? <Spinner page /> : (
        <div style={{ overflowX: 'auto' }}>
        <div className="card" style={{ overflow: 'hidden', minWidth: 640 }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', borderBottom: '1px solid var(--hairline)' }}>
            <div style={{ padding: '14px 20px', borderRight: '1px solid var(--hairline)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mute)' }}>Room</div>
            {days.map((d, i) => (
              <div key={i} style={{
                padding: '14px 12px', textAlign: 'center',
                borderRight: i < 6 ? '1px solid var(--hairline-2)' : 'none',
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: d.isToday ? 'var(--brass)' : 'var(--mute)',
                fontWeight: d.isToday ? 600 : 500,
                background: d.isToday ? 'rgba(160,128,84,0.05)' : 'transparent',
              }}>{d.label}</div>
            ))}
          </div>

          {rooms.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No reservations for this week.
            </div>
          ) : rooms.map((room, ri) => {
            const roomRes = weekReservations.filter(r => r.room?.roomNumber === room.roomNumber);
            return (
              <div key={room.roomNumber} style={{
                display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
                borderBottom: ri < rooms.length - 1 ? '1px solid var(--hairline-2)' : 'none',
                position: 'relative', minHeight: 56,
              }}>
                {/* Room label */}
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="numeral" style={{ fontSize: 18 }}>{room.roomNumber}</span>
                  <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {room.typeLabel || room.type}
                  </span>
                </div>
                {/* Day cells */}
                {days.map((d, di) => (
                  <div key={di} style={{
                    borderRight: di < 6 ? '1px solid var(--hairline-2)' : 'none',
                    background: d.isToday ? 'rgba(160,128,84,0.03)' : 'transparent',
                  }} />
                ))}
                {/* Reservation bars */}
                {roomRes.map((r, bi) => {
                  const startOffset = Math.max(0, daysDiff(weekStart, r.checkInDate));
                  const endOffset   = Math.min(7, daysDiff(weekStart, r.checkOutDate));
                  const barLen      = endOffset - startOffset;
                  if (barLen <= 0) return null;
                  const colors = STATUS_BAR_COLORS[r.status] || STATUS_BAR_COLORS.pending;
                  const gName  = r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Guest';
                  const isVIP  = r.guest?.isVIP || r.guest?.tier === 'etoile';
                  return (
                    <div key={bi}
                      onClick={() => onSelect(r)}
                      title={`${gName} · ${r.bookingId}`}
                      style={{
                        position: 'absolute',
                        left:  `calc(180px + ${startOffset} * (100% - 180px) / 7 + 4px)`,
                        width: `calc(${barLen} * (100% - 180px) / 7 - 8px)`,
                        top: 10, bottom: 10,
                        background: colors.bg, color: colors.text,
                        padding: '0 10px',
                        borderRadius: 2,
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 11, fontWeight: 500,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${colors.border}`,
                        overflow: 'hidden', whiteSpace: 'nowrap',
                      }}
                    >
                      {isVIP && <Icon name="crown" size={10} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{gName}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { isMobile } = useBreakpoint();
  const [view,        setView]        = useState('list');
  const [showNew,     setShowNew]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  function handleCreated() {
    setShowNew(false);
    setRefreshKey(k => k + 1);
  }

  function handleCancelled() {
    setSelected(null);
    setRefreshKey(k => k + 1);
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Reservations</div>
          <h1 className="display">The <em>book of</em> guests.</h1>
          <p className="sub">Manage arrivals, room assignments, and reservations. Click any row to view details.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isMobile && (
            <div className="switch">
              <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar</button>
              <button className={view === 'list'     ? 'active' : ''} onClick={() => setView('list')}>List</button>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={12} />New reservation
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {view === 'list'
        ? <ReservationList onSelect={setSelected} refreshKey={refreshKey} />
        : <ReservationCalendar onSelect={setSelected} refreshKey={refreshKey} />
      }

      {/* ── Modals ── */}
      {showNew && (
        <NewReservationModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
      {selected && (
        <ReservationDetail
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
