import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';

// --- Constants ---

const PAYMENT_STATUSES = ['draft', 'open', 'partial', 'paid'];
const PAYMENT_METHODS  = ['card', 'cash', 'bank_transfer', 'online'];
const LINE_CATEGORIES  = ['room', 'dining', 'spa', 'bar', 'laundry', 'transport', 'other'];

const STATUS_CONFIG = {
  draft:   { chip: 'chip-reserved',    label: 'Draft' },
  open:    { chip: 'chip-occupied',    label: 'Outstanding' },
  partial: { chip: 'chip-cleaning',    label: 'Partial' },
  paid:    { chip: 'chip-available',   label: 'Paid' },
};

const METHOD_LABELS = {
  card: 'Card', cash: 'Cash', bank_transfer: 'Bank transfer', online: 'Online',
};

// --- Helpers ---

function fmtCurrency(val) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function guestName(inv) {
  if (!inv.guest) return '—';
  return [inv.guest.firstName, inv.guest.lastName].filter(Boolean).join(' ') || '—';
}

// --- Sub-components ---

function reservationGuestName(reservation) {
  const contact = reservation.bookingContact || {};
  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const guest = reservation.guest || {};
  return contactName || [guest.firstName, guest.lastName].filter(Boolean).join(' ') || '-';
}

function invoiceBookingId(inv) {
  return inv.reservation?.bookingId || inv.reservation?.id || inv.reservation?._id || '-';
}

function invoiceId(inv) {
  return inv.id || inv._id;
}

function invoiceTotal(inv) {
  return inv.totalAmount ?? inv.totalDue ?? 0;
}

function StatusChip({ status }) {
  const { chip, label } = STATUS_CONFIG[status] || { chip: 'chip-reserved', label: status };
  return <span className={`chip ${chip}`}><span className="chip-dot" />{label}</span>;
}

function SectionHead({ title, caption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      {caption && <span className="eyebrow">{caption}</span>}
    </div>
  );
}

function FolioRow({ desc, amount, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, color: muted ? 'var(--mute)' : 'var(--ink)' }}>
      <span>{desc}</span>
      <span className="mono">{fmtCurrency(amount)}</span>
    </div>
  );
}

// --- Folio / Invoice Detail Panel ---

function InvoiceDetail({ invoice: inv, onClose, onUpdated }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [showAddLine,  setShowAddLine]  = useState(false);
  const [showPayment,  setShowPayment]  = useState(false);
  const [lineForm, setLineForm] = useState({ description: '', category: 'other', quantity: 1, unitPrice: '' });
  const [payForm,  setPayForm]  = useState({ paymentMethod: inv.paymentMethod || 'card', amountPaid: '', notes: '' });
  const [saving,   setSaving]   = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  function setLine(k, v) { setLineForm(f => ({ ...f, [k]: v })); }
  function setPay(k, v)  { setPayForm(f => ({ ...f, [k]: v })); }

  async function handleAddLine() {
    if (!lineForm.description || !lineForm.unitPrice) {
      toast.error('Description and unit price are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/invoices/${invoiceId(inv)}/line-items`, {
        description: lineForm.description,
        category:    lineForm.category,
        quantity:    Number(lineForm.quantity),
        unitPrice:   Number(lineForm.unitPrice),
        total:       Number(lineForm.quantity) * Number(lineForm.unitPrice),
      });
      toast.success('Line item added.');
      setShowAddLine(false);
      setLineForm({ description: '', category: 'other', quantity: 1, unitPrice: '' });
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add line item.');
    } finally { setSaving(false); }
  }

  async function handleRemoveLine(index) {
    try {
      await api.delete(`/api/invoices/${invoiceId(inv)}/line-items/${index}`);
      toast.success('Line item removed.');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Remove failed.');
    }
  }

  async function handleUpdatePayment() {
    const amount = Number(payForm.amountPaid);
    if (!payForm.amountPaid || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount paid.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/invoices/${invoiceId(inv)}/payment`, {
        paymentMethod: payForm.paymentMethod,
        amountPaid:    amount,
        ...(payForm.notes && { notes: payForm.notes }),
      });
      toast.success('Payment updated.');
      setShowPayment(false);
      setPayForm({ paymentMethod: inv.paymentMethod || 'card', amountPaid: '', notes: '' });
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment update failed.');
    } finally { setSaving(false); }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      await api.patch(`/api/invoices/${invoiceId(inv)}/payment`, {
        amountPaid:    inv.totalAmount,
        paymentMethod: inv.paymentMethod || 'card',
      });
      toast.success(`Invoice ${inv.invoiceNumber} marked as paid.`);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as paid.');
    } finally { setMarkingPaid(false); }
  }

  const name    = guestName(inv);
  const balance = inv.paymentStatus === 'paid'
    ? inv.totalAmount
    : (inv.balance ?? (inv.totalAmount - inv.amountPaid));

  return (
    <div className="card" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Folio &middot; {inv.invoiceNumber}</div>
          <h2 className="display" style={{ fontSize: 26, margin: 0 }}>{name}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <StatusChip status={inv.paymentStatus} />
        <span className="chip chip-reserved">{invoiceBookingId(inv)}</span>
      </div>

      {/* Decorative hotel header */}
      <div style={{ textAlign: 'center', margin: '12px 0 16px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic' }}>LuxuryStay</div>
        <div className="eyebrow" style={{ marginTop: 4, fontSize: 9 }}>Maison &Eacute;toile &middot; C&ocirc;te d&apos;Azur</div>
      </div>
      <div className="rule"><div className="dot" /></div>

      {/* Line items */}
      <div style={{ marginBottom: 8 }}>
        {(inv.lineItems || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--hairline-2)' }}>
            <span style={{ flex: 1 }}>{item.description}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
            <span className="mono" style={{ marginRight: 8 }}>{fmtCurrency(item.total)}</span>
            {inv.paymentStatus !== 'paid' && (
              <button onClick={() => handleRemoveLine(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', padding: '0 4px', fontSize: 14, lineHeight: 1 }}>&times;</button>
            )}
          </div>
        ))}
        {!inv.lineItems?.length && (
          <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>No line items yet.</div>
        )}
      </div>

      {/* Add line item */}
      {inv.paymentStatus !== 'paid' && (
        showAddLine ? (
          <div style={{ background: 'var(--linen)', padding: 16, borderRadius: 2, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Description</label>
                <input value={lineForm.description} onChange={e => setLine('description', e.target.value)} placeholder="e.g. In-room dining · dinner" autoFocus />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={lineForm.category} onChange={e => setLine('category', e.target.value)}>
                  {LINE_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Unit price (&euro;)</label>
                <input type="number" value={lineForm.unitPrice} onChange={e => setLine('unitPrice', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" value={lineForm.quantity} onChange={e => setLine('quantity', e.target.value)} min="1" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddLine(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddLine} disabled={saving}>
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowAddLine(true)}>
            <Icon name="plus" size={10} />Add line item
          </button>
        )
      )}

      <div className="rule"><div className="dot" /></div>

      {/* Totals */}
      <FolioRow desc="Subtotal"                                                    amount={inv.subtotal}          muted />
      {inv.touristTaxTotal > 0 && (
        <FolioRow desc={`Tourist tax (€${inv.touristTaxPerNight ?? 0}/night)`}     amount={inv.touristTaxTotal}   muted />
      )}
      <FolioRow desc={`VAT (${inv.taxRate ?? 10}%)`}                               amount={inv.taxAmount}         muted />
      {inv.discount?.amount > 0 && (
        <FolioRow desc={`Discount${inv.discount.reason ? ` · ${inv.discount.reason}` : ''}`} amount={-inv.discount.amount} muted />
      )}
      {inv.amountPaid > 0 && inv.paymentStatus !== 'paid' && (
        <FolioRow desc={`Paid · ${METHOD_LABELS[inv.paymentMethod] || inv.paymentMethod || 'card'}`} amount={-inv.amountPaid} muted />
      )}

      <div style={{ borderTop: '1px solid var(--ink)', marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {inv.paymentStatus === 'paid' ? 'Settled' : 'Balance due'}
        </span>
        <span className="display numeral" style={{ fontSize: 32 }}>{fmtCurrency(balance)}</span>
      </div>

      {/* Payment actions — hidden once fully paid */}
      {inv.paymentStatus !== 'paid' && (
        showPayment ? (
          <div style={{ background: 'var(--linen)', padding: 16, borderRadius: 2, marginTop: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Record payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="field">
                <label>Amount received (&euro;)</label>
                <input
                  type="number"
                  value={payForm.amountPaid}
                  onChange={e => setPay('amountPaid', e.target.value)}
                  placeholder={`Max €${(balance).toFixed(2)}`}
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Method</label>
                <select value={payForm.paymentMethod} onChange={e => setPay('paymentMethod', e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Notes (optional)</label>
                <input value={payForm.notes} onChange={e => setPay('notes', e.target.value)} placeholder="e.g. Paid at front desk" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPayment(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdatePayment} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
                  : 'Record payment'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowPayment(true); setShowAddLine(false); }}>
              <Icon name="edit" size={12} />Update payment
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, opacity: markingPaid ? 0.7 : 1 }}
              onClick={handleMarkPaid}
              disabled={markingPaid}
            >
              {markingPaid
                ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Processing…</>
                : <><Icon name="check" size={12} />Mark as paid</>}
            </button>
          </div>
        )
      )}
    </div>
  );
}

// --- New Invoice Modal ---

function NewInvoiceModal({ onClose, onSaved }) {
  const toast = useToast();
  const [reservationId, setReservationId] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [saving, setSaving] = useState(false);

  const [resSearch, setResSearch] = useState('');
  const { data: resData } = useApi(
    resSearch.length > 1
      ? `/api/reservations?status=checked-in,checked-out&search=${encodeURIComponent(resSearch)}&limit=10&sort=checkOut`
      : null,
    { deps: [resSearch] }
  );
  const reservations = resData?.reservations || [];

  async function handleCreate() {
    if (!reservationId) { toast.error('Select a reservation.'); return; }
    setSaving(true);
    try {
      await api.post('/api/invoices', { reservationId });
      toast.success('Invoice generated.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice.');
    } finally { setSaving(false); }
  }

  function handleSearchChange(value) {
    setResSearch(value);
    setReservationId('');
    setSelectedReservation(null);
  }

  const selectedBookingId = selectedReservation?.bookingId || reservationId;
  const selectedName = selectedReservation ? reservationGuestName(selectedReservation) : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Billing</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>New invoice</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Search checked-in / checked-out reservation</label>
            <input
              value={resSearch}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Guest name or LS reservation ID"
              autoFocus
            />
          </div>

          {reservations.length > 0 && !reservationId && (
            <div style={{ border: '1px solid var(--hairline)', borderRadius: 2, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
              {reservations.map(r => {
                const id = r.id || r._id;
                const bookingId = r.bookingId || id;
                const name = reservationGuestName(r);
                return (
                  <div key={id}
                    onClick={() => { setReservationId(id); setSelectedReservation(r); setResSearch(`${bookingId} - ${name}`); }}
                    style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--hairline-2)', fontSize: 13 }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--linen)'}
                    onMouseOut={e => e.currentTarget.style.background = ''}>
                    <div className="mono" style={{ fontWeight: 600, marginBottom: 3 }}>{bookingId}</div>
                    <div style={{ fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'capitalize' }}>
                      {r.status} &middot; {String(r.checkInDate || '').slice(0, 10)} to {String(r.checkOutDate || '').slice(0, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resSearch.length > 1 && reservations.length === 0 && !reservationId && (
            <div style={{ border: '1px solid var(--hairline)', padding: '18px 14px', fontSize: 12, color: 'var(--mute)' }}>
              No checked-in or checked-out reservations found.
            </div>
          )}

          {reservationId && (
            <div style={{ background: 'var(--linen)', padding: '10px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={12} />
              <span><span className="mono">{selectedBookingId}</span>{selectedName ? ` - ${selectedName}` : ''}</span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !reservationId}
            style={{ opacity: saving || !reservationId ? 0.6 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Generating...</>
              : <><Icon name="plus" size={12} />Generate invoice</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Page ---

export default function BillingPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected,     setSelected]     = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [page,         setPage]         = useState(1);

  const params = new URLSearchParams({ page, limit: 20 });
  if (statusFilter !== 'all') params.set('paymentStatus', statusFilter);

  const { data, loading } = useApi(`/api/invoices?${params}`, { deps: [statusFilter, page, refreshKey] });
  const invoices   = data?.invoices || [];
  const total      = data?.total    || 0;
  const totalPages = data?.pages    || 1;

  const draftTotal = invoices.filter(i => i.paymentStatus === 'draft').reduce((s, i) => s + invoiceTotal(i), 0);
  const openTotal  = invoices.filter(i => i.paymentStatus === 'open').reduce((s, i) => s + (i.balance ?? invoiceTotal(i)), 0);

  async function refreshSelected(id) {
    try {
      const res = await api.get(`/api/invoices/${id}`);
      setSelected(res.data.data?.invoice || res.data.invoice || res.data);
    } catch { /**/ }
    setRefreshKey(k => k + 1);
  }

  function onUpdated() {
    if (selected) refreshSelected(invoiceId(selected));
    else setRefreshKey(k => k + 1);
  }

  function onSaved() { setShowNew(false); setRefreshKey(k => k + 1); }

  return (
    <div>
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Billing &middot; folios &amp; invoices</div>
          <h1 className="display">The <em>ledger.</em></h1>
          <p className="sub">
            {fmtCurrency(draftTotal)} in draft folios &middot; {fmtCurrency(openTotal)} outstanding.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={12} />New invoice
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="switch" style={{ flexWrap: 'wrap' }}>
          {['all', ...PAYMENT_STATUSES].map(s => (
            <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Two-col: table + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? (isTablet ? '1fr' : '1.6fr 1fr') : '1fr', gap: isMobile ? 20 : 32 }}>
        <div>
          <SectionHead title="Invoices" caption={`${total} total`} />

          {loading ? (
            <div style={{ padding: 60 }}><Spinner page /></div>
          ) : !invoices.length ? (
            <div className="t-wrap" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No invoices found.
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Guest</th>
                    <th>Reservation</th>
                    <th>Issued</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const isActive = invoiceId(selected || {}) === invoiceId(inv);
                    return (
                      <tr key={invoiceId(inv)}
                        onClick={() => setSelected(isActive ? null : inv)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--linen)' : '' }}>
                        <td><span className="mono">{inv.invoiceNumber || '—'}</span></td>
                        <td style={{ fontWeight: 500 }}>{guestName(inv)}</td>
                        <td><span className="mono">{invoiceBookingId(inv)}</span></td>
                        <td>{fmtDate(inv.createdAt)}</td>
                        <td className="numeral" style={{ fontSize: 16 }}>{fmtCurrency(invoiceTotal(inv))}</td>
                        <td><StatusChip status={inv.paymentStatus} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); setSelected(isActive ? null : inv); }}>
                            View
                          </button>
                        </td>
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
              <span>Page {page} of {totalPages} &middot; {total} invoices</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
              </div>
            </div>
          )}
        </div>

        {/* Folio detail */}
        {selected && (
          <div>
            <SectionHead
              title={`Folio · ${selected.invoiceNumber || '—'}`}
              caption={guestName(selected)}
            />
            <InvoiceDetail
              invoice={selected}
              onClose={() => setSelected(null)}
              onUpdated={onUpdated}
            />
          </div>
        )}
      </div>

      {showNew && (
        <NewInvoiceModal onClose={() => setShowNew(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
