const Suite           = require('../models/Suite');
const Room            = require('../models/Room');
const catchAsync      = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { generateContent } = require('../utils/gemini');
const {
  TYPE_LABEL_MAP,
  DEPOSIT_RATE,
  countNights,
  findAvailableRoomTypes,
} = require('../utils/booking');

const MAX_TOOL_STEPS = 5;
const FALLBACK_REPLY = 'I could not put that together. Could you rephrase, or use the Reserve page to book directly?';

const buildSystemPrompt = () => `You are the concierge assistant for LuxuryStay, a five-star hotel (Maison Étoile, Nice, France). Today is ${new Date().toISOString().slice(0, 10)}. All prices are in euros per night.

Rules:
- Only discuss the hotel: suites, availability, prices, bookings and stay requests. Politely decline anything else.
- Never invent prices, availability or suite details. Use the tools for every fact.
- Dates must be YYYY-MM-DD in your tool calls. Resolve relative dates ("next Friday") using today's date and confirm them with the guest.
- To book you need: check-in, check-out, number of adults, suite type, first name, last name and phone number. Ask for whatever is missing, one short question at a time.
- Call prepare_booking only once the guest has clearly said they want to book and you have every detail. It does not create the reservation: the guest finishes by pressing the Confirm button shown under your message, and must be signed in to do so. Never say the booking is already made.
- After prepare_booking succeeds, reply in one or two sentences. Do not repeat the summary or write a button: the app shows the summary card and the Confirm button itself.
- Keep replies short, warm and professional.`;

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'check_availability',
      description: 'List the suite types available for a stay, with nightly rate, total price and capacity.',
      parameters: {
        type: 'OBJECT',
        properties: {
          checkIn:  { type: 'STRING', description: 'Check-in date, YYYY-MM-DD.' },
          checkOut: { type: 'STRING', description: 'Check-out date, YYYY-MM-DD.' },
          adults:   { type: 'INTEGER', description: 'Number of adults.' },
        },
        required: ['checkIn', 'checkOut'],
      },
    },
    {
      name: 'get_suite_details',
      description: 'Describe the hotel suites: size, capacity, base rate and amenities. Works without dates.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roomType: { type: 'STRING', description: 'Optional suite name, e.g. "Penthouse". Omit to list all suites.' },
        },
      },
    },
    {
      name: 'prepare_booking',
      description: 'Validate a booking and prepare a summary for the guest to confirm. Does not create a reservation.',
      parameters: {
        type: 'OBJECT',
        properties: {
          checkIn:         { type: 'STRING',  description: 'Check-in date, YYYY-MM-DD.' },
          checkOut:        { type: 'STRING',  description: 'Check-out date, YYYY-MM-DD.' },
          adults:          { type: 'INTEGER', description: 'Number of adults.' },
          children:        { type: 'INTEGER', description: 'Number of children. Defaults to 0.' },
          roomType:        { type: 'STRING',  description: 'Suite name: Deluxe Twin, Deluxe King, Junior Suite, Premier Suite or Penthouse.' },
          firstName:       { type: 'STRING' },
          lastName:        { type: 'STRING' },
          phone:           { type: 'STRING' },
          specialRequests: { type: 'STRING',  description: 'Optional requests from the guest.' },
        },
        required: ['checkIn', 'checkOut', 'adults', 'roomType', 'firstName', 'lastName', 'phone'],
      },
    },
  ],
}];

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
        { $group: { _id: '$type', fromRate: { $min: '$rates.standard' } } },
      ]),
    ]);
    const fromRateByType = Object.fromEntries(rates.map(r => [r._id, r.fromRate]));
    const wanted = roomType?.trim().toLowerCase();

    return {
      suites: suites
        .filter(s => !wanted || s.name.toLowerCase() === wanted)
        .map(s => ({
          roomType:         s.name,
          description:      s.description,
          sqm:              s.sqm,
          maxGuests:        s.maxGuests,
          fromRatePerNight: fromRateByType[s.slug] ?? null,
          amenities:        s.amenities.map(a => a.label),
        })),
    };
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
 * Runs the Gemini tool loop and returns { reply, bookingDraft }. Never creates a reservation —
 * the frontend books through POST /api/guest/book once the guest confirms.
 */
exports.chat = catchAsync(async (req, res) => {
  const contents = req.body.messages.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
  const context = { bookingDraft: null };

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const data    = await generateContent({ systemInstruction: buildSystemPrompt(), contents, tools: TOOLS });
    const content = data.candidates?.[0]?.content;
    const parts   = content?.parts || [];
    const calls   = parts.filter(p => p.functionCall).map(p => p.functionCall);

    if (!calls.length) {
      const reply = parts.map(p => p.text || '').join('').trim();
      return sendSuccess(res, 200, 'Reply generated.', {
        reply: reply || FALLBACK_REPLY,
        bookingDraft: context.bookingDraft,
      });
    }

    contents.push(content);
    const responses = await Promise.all(calls.map(async call => ({
      functionResponse: { name: call.name, response: await runTool(call, context) },
    })));
    contents.push({ role: 'user', parts: responses });
  }

  sendSuccess(res, 200, 'Reply generated.', { reply: FALLBACK_REPLY, bookingDraft: context.bookingDraft });
});
