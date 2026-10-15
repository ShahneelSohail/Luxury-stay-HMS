import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Icon from './Icon';

const STORAGE_KEY  = 'ls_assistant_chat';
const MAX_HISTORY  = 12;
const CHAT_TIMEOUT_MS = 60000;
const GREETING     = 'Welcome to LuxuryStay. I can check availability, describe our suites and prepare a reservation for you. How can I help?';

const fmtEuro = (n) => `€${Number(n).toLocaleString()}`;

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || { open: false, messages: [] };
  } catch {
    return { open: false, messages: [] };
  }
}

function toApiHistory(messages) {
  const recent = messages.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }));
  const firstUser = recent.findIndex(m => m.role === 'user');
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

function BookingCard({ draft, onConfirm, confirming }) {
  const rows = [
    ['Suite',    draft.roomType],
    ['Dates',    `${draft.checkIn} → ${draft.checkOut} (${draft.nights} night${draft.nights !== 1 ? 's' : ''})`],
    ['Guests',   `${draft.adults} adult${draft.adults !== 1 ? 's' : ''}${draft.children ? `, ${draft.children} child${draft.children !== 1 ? 'ren' : ''}` : ''}`],
    ['Guest',    `${draft.firstName} ${draft.lastName}`],
    ['Total',    fmtEuro(draft.totalAmount)],
    ['Deposit',  fmtEuro(draft.depositAmount)],
  ];

  return (
    <div style={{ border: '1px solid var(--hairline)', background: 'var(--paper)', padding: 14, marginTop: 8 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Reservation summary</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '3px 0' }}>
          <span style={{ color: 'var(--mute)' }}>{label}</span>
          <span style={{ color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
        </div>
      ))}
      <button
        className="btn btn-brass"
        style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
        onClick={onConfirm}
        disabled={confirming}
      >
        {confirming ? 'Booking…' : 'Confirm reservation'}
      </button>
    </div>
  );
}

export default function BookingAssistant() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const queryClient = useQueryClient();
  const toast       = useToast();
  const { isMobile } = useBreakpoint();
  const { isAuthenticated, user } = useAuth();

  const [session, setSession] = useState(loadSession);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef(null);

  const { open, messages } = session;

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const setOpen = (value) => setSession(s => ({ ...s, open: value }));

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', text }];
    setSession(s => ({ ...s, messages: next }));
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/assistant/chat', { messages: toApiHistory(next) }, { timeout: CHAT_TIMEOUT_MS });
      const { reply, bookingDraft } = data.data;
      setSession(s => ({ ...s, messages: [...next, { role: 'assistant', text: reply, draft: bookingDraft }] }));
    } catch (err) {
      const message = err.response?.data?.message || 'The assistant is unavailable right now. You can still book from the Reserve page.';
      setSession(s => ({ ...s, messages: [...next, { role: 'assistant', text: message }] }));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(draft) {
    if (!isAuthenticated || user?.role !== 'guest') {
      toast.error('Please sign in to your guest account to complete the booking.');
      navigate('/login', { state: { from: { pathname: location.pathname } } });
      return;
    }
    setConfirming(true);
    try {
      const { data } = await api.post('/api/guest/book', {
        checkIn:         draft.checkIn,
        checkOut:        draft.checkOut,
        adults:          draft.adults,
        children:        draft.children,
        roomType:        draft.roomType,
        firstName:       draft.firstName,
        lastName:        draft.lastName,
        phone:           draft.phone,
        specialRequests: draft.specialRequests,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guest/reservations'] });
      setSession(s => ({ ...s, open: false, messages: [] }));
      navigate('/confirm', { state: { booking: data.data.booking }, replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  const lastDraftIndex = messages.reduce((acc, m, i) => (m.draft ? i : acc), -1);

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', zIndex: 300,
          right: isMobile ? 0 : 24, bottom: isMobile ? 0 : 96,
          width: isMobile ? '100%' : 380, height: isMobile ? '100%' : 540,
          maxHeight: isMobile ? '100%' : 'calc(100vh - 120px)',
          background: 'var(--ivory)', border: '1px solid var(--hairline)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            background: 'var(--ink)', color: 'var(--ivory)',
            padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic' }}>Concierge</div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brass-soft)' }}>
                AI booking assistant
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              style={{ background: 'none', border: 'none', color: 'var(--ivory)', cursor: 'pointer', display: 'flex' }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ role: 'assistant', text: GREETING }, ...messages].map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                  <div style={{
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    background: isUser ? 'var(--ink)' : 'var(--linen)',
                    color:      isUser ? 'var(--ivory)' : 'var(--ink)',
                  }}>
                    {m.text}
                  </div>
                  {m.draft && i - 1 === lastDraftIndex && (
                    <BookingCard draft={m.draft} onConfirm={() => handleConfirm(m.draft)} confirming={confirming} />
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', fontSize: 13, background: 'var(--linen)', color: 'var(--mute)' }}>
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--hairline)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about suites or dates…"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()} aria-label="Send">
              <Icon name="arrow_right" size={14} />
            </button>
          </form>
        </div>
      )}

      {!(open && isMobile) && (
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close assistant' : 'Open booking assistant'}
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 301,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--brass)', color: 'var(--paper)', border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={open ? 'x' : 'sparkle'} size={22} />
        </button>
      )}
    </>
  );
}
