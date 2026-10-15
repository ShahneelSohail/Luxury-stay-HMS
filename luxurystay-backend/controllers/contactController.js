const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

/**
 * POST /api/contact  (public — no auth required)
 */
exports.submitContact = catchAsync(async (req, res) => {
  const { firstName, lastName, email, phone, language, subject, message } = req.body;

  const contact = await Contact.create({
    firstName,
    lastName,
    email,
    phone:    phone    || null,
    language: language || 'en',
    subject,
    message,
  });

  sendSuccess(res, 201, 'Your message has been received. We will be in touch shortly.', {
    contact: { id: contact._id, firstName, lastName, email, subject },
  });
});

/**
 * GET /api/contact  — paginated list
 * Access: admin, manager, receptionist
 */
exports.getAllContacts = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search } = req.query;

  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { subject: re }];
  }

  const [contacts, totalCount, unreadCount] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
    Contact.countDocuments({ status: 'unread' }),
  ]);

  sendSuccess(res, 200, 'Contacts retrieved.', {
    contacts,
    unreadCount,
    total: totalCount,
    pages: Math.ceil(totalCount / limit),
    page,
  });
});

/**
 * GET /api/contact/:id
 * Access: admin, manager, receptionist
 */
exports.getContactById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Contact ID');
  const contact = await Contact.findById(req.params.id).populate('readBy', 'name role');
  if (!contact) return next(new AppError('Contact not found.', 404));
  sendSuccess(res, 200, 'Contact retrieved.', { contact });
});

/**
 * PATCH /api/contact/:id  — update status / staff note
 * Access: admin, manager, receptionist
 */
exports.updateContact = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Contact ID');
  const { status, staffNote } = req.body;

  const update = {};
  if (status)              update.status    = status;
  if (staffNote !== undefined) update.staffNote = staffNote || null;
  if (status && status !== 'unread') {
    update.readBy = req.user.id;
    update.readAt = new Date();
  }

  const contact = await Contact.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    .populate('readBy', 'name role');
  if (!contact) return next(new AppError('Contact not found.', 404));

  sendSuccess(res, 200, 'Contact updated.', { contact });
});

/**
 * DELETE /api/contact/:id
 * Access: admin, manager
 */
exports.deleteContact = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Contact ID');
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (!contact) return next(new AppError('Contact not found.', 404));
  sendSuccess(res, 200, 'Contact deleted.');
});
