const Invoice     = require('../models/Invoice');
const Reservation = require('../models/Reservation');
const Guest       = require('../models/Guest');
const Room        = require('../models/Room');

const { AppError }   = require('../middleware/errorHandler');
const catchAsync     = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateInvoice = (query) =>
  query
    .populate('guest',       'firstName lastName email phone isVIP')
    .populate('room',        'roomNumber floor type typeLabel')
    .populate('reservation', 'bookingId checkInDate checkOutDate nights adults children status addOns');

const buildPayload = (inv) => ({
  id:                 inv._id,
  invoiceNumber:      inv.invoiceNumber,
  reservation:        inv.reservation,
  guest:              inv.guest,
  room:               inv.room,
  lineItems:          inv.lineItems,
  subtotal:           inv.subtotal,
  taxRate:            inv.taxRate,
  taxAmount:          inv.taxAmount,
  touristTaxPerNight: inv.touristTaxPerNight,
  touristTaxTotal:    inv.touristTaxTotal,
  discount:           inv.discount,
  totalAmount:        inv.totalAmount,
  balance:            inv.balance,
  paymentStatus:      inv.paymentStatus,
  paymentMethod:      inv.paymentMethod  || null,
  amountPaid:         inv.amountPaid,
  paymentDate:        inv.paymentDate    || null,
  notes:              inv.notes          || null,
  emailSent:          inv.emailSent,
  emailSentAt:        inv.emailSentAt    || null,
  createdAt:          inv.createdAt,
  updatedAt:          inv.updatedAt,
});

// Build line items from a reservation (room charge + addOns)
const buildLineItemsFromReservation = (reservation, room) => {
  const nights = reservation.nights || Math.ceil(
    (new Date(reservation.checkOutDate) - new Date(reservation.checkInDate)) / (1000 * 60 * 60 * 24)
  );
  const rate = room.rates?.standard || 0;

  const items = [
    {
      description: `${room.typeLabel} ${room.roomNumber} · ${nights} night${nights !== 1 ? 's' : ''}`,
      category:    'room',
      quantity:    nights,
      unitPrice:   rate,
      total:       +(rate * nights).toFixed(2),
    },
  ];

  (reservation.addOns || []).forEach((a) => {
    items.push({
      description: a.name,
      category:    'other',
      quantity:    1,
      unitPrice:   a.price,
      total:       +a.price.toFixed(2),
    });
  });

  return items;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/invoices
 * Generates an invoice for a reservation. Reservation must be checked-in or checked-out.
 * Auto-populates room and addOn line items from the reservation.
 * Access: admin, manager, receptionist
 */
exports.generateInvoice = catchAsync(async (req, res, next) => {
  const { reservationId, taxRate, touristTaxPerNight, discount, notes } = req.body;

  validateObjectId(reservationId, 'Reservation ID');

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (!['checked-in', 'checked-out'].includes(reservation.status)) {
    return next(
      new AppError(
        `Cannot generate an invoice for a reservation with status "${reservation.status}". Guest must be checked-in or checked-out.`,
        400
      )
    );
  }

  // Prevent duplicate invoices — one per reservation (can be regenerated if draft)
  const existing = await Invoice.findOne({ reservation: reservationId });
  if (existing) {
    if (existing.paymentStatus !== 'draft') {
      return next(
        new AppError(
          `An invoice (${existing.invoiceNumber}) already exists for this reservation with status "${existing.paymentStatus}".`,
          400
        )
      );
    }
    // Allow regeneration of draft invoices by deleting and recreating
    await Invoice.findByIdAndDelete(existing._id);
  }

  const room = await Room.findById(reservation.room);
  if (!room) return next(new AppError('Associated room not found.', 404));

  const nights    = reservation.nights || 1;
  const lineItems = buildLineItemsFromReservation(reservation, room);

  const invoice = new Invoice({
    reservation:        reservationId,
    guest:              reservation.guest,
    room:               reservation.room,
    lineItems,
    taxRate:            taxRate           !== undefined ? taxRate           : 10,
    touristTaxPerNight: touristTaxPerNight !== undefined ? touristTaxPerNight : 0,
    discount:           discount          || { amount: 0, reason: '' },
    notes,
    paymentStatus: reservation.status === 'checked-out' ? 'open' : 'draft',
  });

  invoice.recalculate(nights);
  await invoice.save();

  const populated = await populateInvoice(Invoice.findById(invoice._id));

  sendSuccess(res, 201, `Invoice ${invoice.invoiceNumber} generated successfully.`, {
    invoice: buildPayload(populated),
  });
});

/**
 * GET /api/invoices
 * Access: admin, manager, receptionist
 * Supports ?paymentStatus=&guestId=&page=&limit=&sort=
 */
exports.getAllInvoices = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { paymentStatus, guestId, sort } = req.query;

  const filter = {};
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (guestId) {
    validateObjectId(guestId, 'Guest ID');
    filter.guest = guestId;
  }

  const sortMap = {
    newest:  { createdAt:   -1 },
    oldest:  { createdAt:    1 },
    amount:  { totalAmount: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [invoices, totalCount] = await Promise.all([
    populateInvoice(Invoice.find(filter).sort(sortOrder).skip(skip).limit(limit)),
    Invoice.countDocuments(filter),
  ]);

  // Summary stats for FE ledger header
  const [drafts, open, paid] = await Promise.all([
    Invoice.aggregate([{ $match: { paymentStatus: 'draft' } },  { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Invoice.aggregate([{ $match: { paymentStatus: { $in: ['open', 'partial'] } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
    Invoice.aggregate([{ $match: { paymentStatus: 'paid' } },   { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);

  sendSuccess(
    res,
    200,
    'Invoices retrieved.',
    {
      invoices: invoices.map(buildPayload),
      total:    totalCount,
      pages:    Math.ceil(totalCount / limit),
      summary: {
        draftTotal:       drafts[0]?.total || 0,
        outstandingTotal: open[0]?.total   || 0,
        paidTotal:        paid[0]?.total   || 0,
      },
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/invoices/reservation/:reservationId
 * Access: admin, manager, receptionist
 */
exports.getInvoiceByReservation = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.reservationId, 'Reservation ID');

  const invoice = await populateInvoice(
    Invoice.findOne({ reservation: req.params.reservationId })
  );
  if (!invoice) return next(new AppError('No invoice found for this reservation.', 404));

  sendSuccess(res, 200, 'Invoice retrieved.', { invoice: buildPayload(invoice) });
});

/**
 * GET /api/invoices/:id
 * Access: admin, manager, receptionist
 */
exports.getInvoiceById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Invoice ID');

  const invoice = await populateInvoice(Invoice.findById(req.params.id));
  if (!invoice) return next(new AppError('Invoice not found.', 404));

  sendSuccess(res, 200, 'Invoice retrieved.', { invoice: buildPayload(invoice) });
});

/**
 * PATCH /api/invoices/:id/payment
 * Updates payment status, method, amount paid, and payment date.
 * Automatically transitions to 'paid' when amountPaid >= totalAmount.
 * Access: admin, manager, receptionist
 */
exports.updatePaymentStatus = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Invoice ID');

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found.', 404));

  if (invoice.paymentStatus === 'paid') {
    return next(new AppError('This invoice has already been fully paid.', 400));
  }

  const { paymentMethod, amountPaid, paymentDate, notes } = req.body;

  if (paymentMethod !== undefined) invoice.paymentMethod = paymentMethod;
  if (notes         !== undefined) invoice.notes         = notes;

  if (amountPaid !== undefined) {
    if (amountPaid < 0) return next(new AppError('Amount paid cannot be negative.', 400));
    if (amountPaid > invoice.totalAmount) {
      return next(new AppError(`Amount paid (${amountPaid}) exceeds invoice total (${invoice.totalAmount}).`, 400));
    }

    invoice.amountPaid = +amountPaid.toFixed(2);

    if (invoice.amountPaid >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.paymentDate   = paymentDate ? new Date(paymentDate) : new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.paymentStatus = 'partial';
    } else {
      invoice.paymentStatus = 'open';
    }
  }

  await invoice.save({ validateBeforeSave: true });

  // Recalc guest stats whenever a payment is recorded (spend + tier may change)
  if (invoice.guest) await Guest.recalcStats(invoice.guest).catch(() => {});

  const populated = await populateInvoice(Invoice.findById(invoice._id));

  sendSuccess(res, 200, `Invoice ${invoice.invoiceNumber} payment status updated to "${invoice.paymentStatus}".`, {
    invoice: buildPayload(populated),
  });
});

/**
 * POST /api/invoices/:id/line-items
 * Adds an extra charge to an existing invoice and recalculates totals.
 * Only allowed on draft or open invoices.
 * Access: admin, manager, receptionist
 */
exports.addLineItem = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Invoice ID');

  const invoice = await Invoice.findById(req.params.id).populate('reservation', 'nights');
  if (!invoice) return next(new AppError('Invoice not found.', 404));

  if (invoice.paymentStatus === 'paid') {
    return next(new AppError('Cannot add line items to a paid invoice.', 400));
  }

  const { description, category, quantity, unitPrice } = req.body;

  const total = +(quantity * unitPrice).toFixed(2);
  invoice.lineItems.push({ description, category: category || 'other', quantity, unitPrice, total });

  const nights = invoice.reservation?.nights || 0;
  invoice.recalculate(nights);
  await invoice.save();

  const populated = await populateInvoice(Invoice.findById(invoice._id));

  sendSuccess(res, 200, `Line item "${description}" added to invoice ${invoice.invoiceNumber}.`, {
    invoice: buildPayload(populated),
  });
});

/**
 * DELETE /api/invoices/:id/line-items/:index
 * Removes a line item by its array index. Room charge (index 0) cannot be removed.
 * Access: admin, manager
 */
exports.removeLineItem = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Invoice ID');

  const invoice = await Invoice.findById(req.params.id).populate('reservation', 'nights');
  if (!invoice) return next(new AppError('Invoice not found.', 404));

  if (invoice.paymentStatus === 'paid') {
    return next(new AppError('Cannot modify a paid invoice.', 400));
  }

  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= invoice.lineItems.length) {
    return next(new AppError('Invalid line item index.', 400));
  }
  if (idx === 0 && invoice.lineItems[0].category === 'room') {
    return next(new AppError('The room charge cannot be removed.', 400));
  }

  invoice.lineItems.splice(idx, 1);
  const nights = invoice.reservation?.nights || 0;
  invoice.recalculate(nights);
  await invoice.save();

  const populated = await populateInvoice(Invoice.findById(invoice._id));

  sendSuccess(res, 200, 'Line item removed.', { invoice: buildPayload(populated) });
});

/**
 * PATCH /api/invoices/:id/email
 * Marks the invoice as emailed. In production this would trigger an email service.
 * Access: admin, manager, receptionist
 */
exports.markEmailSent = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Invoice ID');

  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { emailSent: true, emailSentAt: new Date() },
    { new: true }
  );
  if (!invoice) return next(new AppError('Invoice not found.', 404));

  const populated = await populateInvoice(Invoice.findById(invoice._id));

  sendSuccess(res, 200, `Invoice ${invoice.invoiceNumber} marked as emailed.`, {
    invoice: buildPayload(populated),
  });
});
