const Suite           = require('../models/Suite');
const Room            = require('../models/Room');
const catchAsync      = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { chat } = require('../utils/llm');
const {
  TYPE_LABEL_MAP,
  DEPOSIT_RATE,
  countNights,
  findAvailableRoomTypes,
} = require('../utils/booking');

const MAX_TOOL_STEPS = 5;
const UI_COMPONENTS  = ['dates', 'guests', 'suites', 'contact', 'choices'];
const MAX_CHOICES    = 6;
const MAX_CHOICE_LEN = 40;
const FALLBACK_REPLY = 'I could not put that together. Could you rephrase, or use the Reserve page to book directly?';

const buildSystemPrompt = () => `You are the concierge assistant for LuxuryStay, a five-star hotel (Maison Étoile, Nice, France). Today is ${new Date().toISOString().slice(0, 10)}. All prices are in euros per night.

Rules:
- Only discuss the hotel: suites, availability, prices, bookings and stay requests. Politely decline anything else.
- Never invent prices, availability or suite details. Use the tools for every fact.
- Dates must be YYYY-MM-DD in your tool calls. Resolve relative dates ("next Friday") using today's date and confirm them with the guest.
- To book you need: check-in, check-out, number of adults, suite type, first name, last name and phone number. Ask for whatever is missing, one short question at a time.
- Call prepare_booking only once the guest has clearly said they want to book and you have every detail. It does not create the reservation: the guest finishes by pressing the Confirm button shown under your message, and must be signed in to do so. Never say the booking is already made.
- After prepare_booking succeeds, reply in one or two sentences. Do not repeat the summary or write a button: the app shows the summary card and the Confirm button itself.
- Prefer show_ui over asking in text. Use component "dates" to ask for dates, "guests" for the party size, "suites" to let the guest pick a suite (pass checkIn, checkOut and adults), "contact" for name and phone, and "choices" for short option lists such as yes/no. After calling show_ui write one short lead-in sentence and do not repeat the options in text.
- The guest answers a widget with a chat message like "Dates: 2026-12-10 to 2026-12-13", "2 adults, 1 child", "I'll take the Deluxe King" or "My name is Ada Lovelace and my phone is +33612345678". Treat those as the guest's answers.
- Never invent, guess or fill in placeholder details, especially names and phone numbers. If the guest has not given them, call show_ui with component "contact" and wait. Call prepare_booking only after the guest has answered.
- Write plain text only. No markdown, asterisks or bullet symbols.
- Keep replies short, warm and professional.`;

const TOOLS = [
  {
    name: 'check_availability',
    description: 'List the suite types available for a stay, with nightly rate, total price and capacity.',
    parameters: {
      type: 'object',
      properties: {
        checkIn:  { type: 'string', description: 'Check-in date, YYYY-MM-DD.' },
        checkOut: { type: 'string', description: 'Check-out date, YYYY-MM-DD.' },
        adults:   { type: 'integer', description: 'Number of adults.' },
      },
      required: ['checkIn', 'checkOut'],
    },
  },
  {
    name: 'get_suite_details',
    description: 'Describe the hotel suites: size, capacity, starting nightly rate and amenities. Works without dates.',
    parameters: {
      type: 'object',
      properties: {
        roomType: { type: 'string', description: 'Optional suite name, e.g. "Penthouse". Omit to list all suites.' },
      },
    },
  },
  {
    name: 'show_ui',
    description: 'Show an interactive input to the guest in the chat instead of asking in text.',
    parameters: {
      type: 'object',
      properties: {
        component: { type: 'string', enum: UI_COMPONENTS, description: 'Which input to show.' },
        options:   { type: 'array', items: { type: 'string' }, description: 'For "choices": 2 to 6 short labels.' },
        checkIn:   { type: 'string',  description: 'For "suites": check-in date, YYYY-MM-DD.' },
        checkOut:  { type: 'string',  description: 'For "suites": check-out date, YYYY-MM-DD.' },
        adults:    { type: 'integer', description: 'For "suites": number of adults.' },
      },
      required: ['component'],
    },
  },
  {
    name: 'prepare_booking',
    description: 'Validate a booking and prepare a summary for the guest to confirm. Does not create a reservation.',
    parameters: {
      type: 'object',
      properties: {
        checkIn:         { type: 'string',  description: 'Check-in date, YYYY-MM-DD.' },
        checkOut:        { type: 'string',  description: 'Check-out date, YYYY-MM-DD.' },
        adults:          { type: 'integer', description: 'Number of adults.' },
        children:        { type: 'integer', description: 'Number of children. Defaults to 0.' },
        roomType:        { type: 'string',  description: 'Suite name: Deluxe Twin, Deluxe King, Junior Suite, Premier Suite or Penthouse.' },
        firstName:       { type: 'string' },
        lastName:        { type: 'string' },
        phone:           { type: 'string' },
        specialRequests: { type: 'string',  description: 'Optional requests from the guest.' },
      },
      required: ['checkIn', 'checkOut', 'adults', 'roomType', 'firstName', 'lastName', 'phone'],
    },
  },
];

const MIN_PHONE_DIGITS = 7;
const digitsOnly = (value) => String(value).replace(/\D/g, '');

function wasProvidedByGuest({ firstName, lastName, phone }, guestText) {
  const text   = guestText.toLowerCase();
  const digits = digitsOnly(phone);
  return (
    text.includes(firstName.trim().toLowerCase()) &&
    text.includes(lastName.trim().toLowerCase()) &&
    digits.length >= MIN_PHONE_DIGITS &&
    digitsOnly(guestText).includes(digits)
  );
}

function parseStay(checkIn, checkOut) {
  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate) || isNaN(checkOutDate)) return { error: 'Dates must be in YYYY-MM-DD format.' };
  if (checkInDate < new Date().setHours(0, 0, 0, 0)) return { error: 'Check-in cannot be in the past.' };
  if (checkInDate >= checkOutDate) return { error: 'Check-out must be after check-in.' };

  return { checkInDate, checkOutDate };
}

const toolHandlers = {
  async check_availability({ checkIn, checkOut, adults }) {
    const stay = parseStay(checkIn, checkOut);
    if (stay.error) return { error: stay.error };

    const { nights, types } = await findAvailableRoomTypes({ ...stay, adults });

    return {
      nights,
      suites: types.map(t => ({
        roomType:      t.typeLabel,
        ratePerNight:  t.rate,
        totalForStay:  t.total,
        maxGuests:     t.maxGuests,
        roomsLeft:     t.count,
        sqm:           t.sqm,
        description:   t.description,
        amenities:     t.amenities.map(a => a.label),
      })),
    };
  },

  async get_suite_details({ roomType }) {
    const [suites, rates] = await Promise.all([
      Suite.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      Room.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', fromRate: { $min: '$rates.standard' }, maxGuests: { $max: '$maxGuests' } } },
      ]),
    ]);
    const roomStatsByType = Object.fromEntries(rates.map(r => [r._id, r]));
    const wanted = roomType?.trim().toLowerCase();

    return {
      suites: suites
        .filter(s => !wanted || s.name.toLowerCase() === wanted)
        .map(s => ({
          roomType:         s.name,
          description:      s.description,
          sqm:              s.sqm,
          maxGuests:        roomStatsByType[s.slug]?.maxGuests ?? s.maxGuests,
          fromRatePerNight: roomStatsByType[s.slug]?.fromRate ?? null,
          amenities:        s.amenities.map(a => a.label),
        })),
    };
  },

  async show_ui({ component, options, checkIn, checkOut, adults }, context) {
    if (component === 'choices') {
      const labels = (Array.isArray(options) ? options : [])
        .map(o => String(o).trim())
        .filter(o => o && o.length <= MAX_CHOICE_LEN)
        .slice(0, MAX_CHOICES);
      if (labels.length < 2) return { error: 'choices needs at least two short options.' };
      context.ui = { type: 'choices', options: labels };
    } else if (component === 'suites') {
      const stay = parseStay(checkIn, checkOut);
      if (stay.error) return { error: stay.error };
      const { nights, types } = await findAvailableRoomTypes({ ...stay, adults });
      if (!types.length) return { error: 'No suites are available for those dates.' };
      context.ui = {
        type: 'suites',
        nights,
        suites: types.map(t => ({
          roomType:     t.typeLabel,
          ratePerNight: t.rate,
          totalForStay: t.total,
          maxGuests:    t.maxGuests,
          sqm:          t.sqm,
          gradient:     t.gradient,
        })),
      };
    } else if (UI_COMPONENTS.includes(component)) {
      context.ui = { type: component };
    } else {
      return { error: `Unknown component "${component}".` };
    }

    return { ok: true, note: 'The widget is now shown to the guest. Write one short lead-in and wait for their answer.' };
  },

  async prepare_booking(args, context) {
    const { checkIn, checkOut, roomType, firstName, lastName, phone, specialRequests } = args;
    const adults   = Number(args.adults);
    const children = Number(args.children || 0);

    const stay = parseStay(checkIn, checkOut);
    if (stay.error) return { error: stay.error };
    if (!TYPE_LABEL_MAP[roomType]) return { error: `Unknown suite "${roomType}".` };
    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      return { error: 'First name, last name and phone number are required.' };
    }
    if (!wasProvidedByGuest({ firstName, lastName, phone }, context.guestText)) {
      return { error: 'The guest has not provided these contact details. Call show_ui with component "contact" and wait for their answer.' };
    }

    const { types } = await findAvailableRoomTypes({ ...stay, adults });
    const match = types.find(t => t.typeLabel === roomType);
    if (!match) return { error: `${roomType} is not available for those dates and party size.` };

    const nights        = countNights(stay.checkInDate, stay.checkOutDate);
    const totalAmount   = match.rate * nights;
    const depositAmount = +(totalAmount * DEPOSIT_RATE).toFixed(2);

    context.bookingDraft = {
      checkIn,
      checkOut,
      adults,
      children,
      roomType,
      firstName:       firstName.trim(),
      lastName:        lastName.trim(),
      phone:           phone.trim(),
      specialRequests: specialRequests?.trim() || '',
      nights,
      ratePerNight:    match.rate,
      totalAmount,
      depositAmount,
    };

    return { ok: true, summary: { roomType, nights, totalAmount, depositAmount } };
  },
};

async function runTool({ name, args }, context) {
  const handler = toolHandlers[name];
  if (!handler) return { error: `Unknown tool ${name}.` };
  return handler(args || {}, context);
}

/**
 * POST /api/assistant/chat
 * Public. Body: { messages: [{ role: 'user' | 'assistant', text }] }
 * Runs the model tool loop (see utils/llm) and returns { reply, bookingDraft, ui }. Never creates a reservation —
 * the frontend books through POST /api/guest/book once the guest confirms.
 */
exports.chat = catchAsync(async (req, res) => {
  const messages = req.body.messages.map(({ role, text }) => ({ role, text }));
  const context = {
    bookingDraft: null,
    ui: null,
    guestText: req.body.messages.filter(m => m.role === 'user').map(m => m.text).join(' '),
  };

  const session = { preferred: null };

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const turn = await chat({ system: buildSystemPrompt(), messages, tools: TOOLS, session });

    if (!turn.toolCalls.length) {
      return sendSuccess(res, 200, 'Reply generated.', {
        reply: turn.text || FALLBACK_REPLY,
        bookingDraft: context.bookingDraft,
        ui: context.ui,
      });
    }

    messages.push({ role: 'assistant', text: turn.text, toolCalls: turn.toolCalls, raw: turn.raw });
    const results = await Promise.all(turn.toolCalls.map(async call => ({
      id: call.id,
      name: call.name,
      result: await runTool(call, context),
    })));
    messages.push({ role: 'tool', results });
  }

  sendSuccess(res, 200, 'Reply generated.', { reply: FALLBACK_REPLY, bookingDraft: context.bookingDraft, ui: context.ui });
});
