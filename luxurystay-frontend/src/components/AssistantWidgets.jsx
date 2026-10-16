import { useState } from 'react';
import Stepper from './Stepper';
import DateRangePicker, { countNights, fmtShortDate } from './DateRangePicker';

export const fmtEuro = (n) => `€${Number(n).toLocaleString()}`;

const plural = (n, word, suffix = 's') => `${n} ${word}${n !== 1 ? suffix : ''}`;

const PANEL_STYLE = { border: '1px solid var(--hairline)', background: 'var(--paper)', padding: 14, marginTop: 8 };

function Panel({ title, children }) {
  return (
    <div style={PANEL_STYLE}>
      {title && <div className="eyebrow" style={{ marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

function Chip({ label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 14px', fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer',
        fontFamily: 'var(--sans)',
        border: '1px solid var(--brass)',
        background: hover ? 'var(--brass)' : 'transparent',
        color: hover ? 'var(--paper)' : 'var(--brass-deep)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export function ChoiceChips({ options, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {options.map(option => <Chip key={option} label={option} onClick={() => onPick(option)} />)}
    </div>
  );
}

export function DatesPanel({ onSubmit }) {
  const [range, setRange] = useState({ checkIn: '', checkOut: '' });
  const nights = countNights(range.checkIn, range.checkOut);

  return (
    <Panel title="Choose your dates">
      <DateRangePicker checkIn={range.checkIn} checkOut={range.checkOut} onChange={setRange} compact />
      <div style={{ borderTop: '1px solid var(--hairline)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 16, fontStyle: 'italic', marginBottom: 12 }}>
          {fmtShortDate(range.checkIn)} → {fmtShortDate(range.checkOut)}
          {nights > 0 && <span style={{ color: 'var(--mute)' }}> · {plural(nights, 'night')}</span>}
        </div>
        <button
          className="btn btn-brass"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={!nights}
          onClick={() => onSubmit(`Dates: ${range.checkIn} to ${range.checkOut} (${plural(nights, 'night')})`)}
        >
          Use these dates
        </button>
      </div>
    </Panel>
  );
}

export function GuestsPanel({ onSubmit }) {
  const [adults, setAdults]     = useState(2);
  const [children, setChildren] = useState(0);

  const summary = [plural(adults, 'adult'), children ? plural(children, 'child', 'ren') : null].filter(Boolean).join(', ');

  return (
    <Panel title="Who is travelling?">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Stepper label="Adults"   value={adults}   onChange={setAdults}   min={1} max={6} />
        <Stepper label="Children" value={children} onChange={setChildren} min={0} max={4} />
      </div>
      <button
        className="btn btn-brass"
        style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
        onClick={() => onSubmit(summary)}
      >
        Continue
      </button>
    </Panel>
  );
}

export function SuiteCards({ suites, nights, onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {suites.map(s => (
        <div key={s.roomType} style={{ ...PANEL_STYLE, marginTop: 0, display: 'flex', padding: 0 }}>
          <div style={{ width: 6, background: s.gradient, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 17, fontStyle: 'italic' }}>{s.roomType}</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', margin: '2px 0 8px' }}>
              {[s.sqm && `${s.sqm} m²`, `up to ${plural(s.maxGuests, 'guest')}`].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{fmtEuro(s.totalForStay)}</span>
                <span style={{ color: 'var(--mute)' }}> · {fmtEuro(s.ratePerNight)} / night · {plural(nights, 'night')}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onPick(`I'll take the ${s.roomType}`)}>
                Select
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContactForm({ initial, onSubmit }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const complete = form.firstName.trim() && form.lastName.trim() && form.phone.trim();

  const fields = [
    ['firstName', 'First name', 'text'],
    ['lastName',  'Last name',  'text'],
    ['phone',     'Phone',      'tel'],
  ];

  return (
    <Panel title="Who is the reservation for?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(([key, label, type]) => (
          <div key={key}>
            <div className="label" style={{ marginBottom: 4 }}>{label}</div>
            <input type={type} value={form[key]} onChange={set(key)} maxLength={50} style={{ width: '100%' }} />
          </div>
        ))}
      </div>
      <button
        className="btn btn-brass"
        style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
        disabled={!complete}
        onClick={() => onSubmit(`My name is ${form.firstName.trim()} ${form.lastName.trim()} and my phone is ${form.phone.trim()}`)}
      >
        Continue
      </button>
    </Panel>
  );
}
