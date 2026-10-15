const express = require('express');
const router  = express.Router();

const invoiceController = require('../controllers/invoiceController');
const { protect }       = require('../middleware/auth');
const { authorize }     = require('../middleware/rbac');
const validate          = require('../middleware/validate');
const {
  generateInvoiceValidator,
  updatePaymentValidator,
  addLineItemValidator,
} = require('../validators/invoiceValidators');

const DESK_ROLES  = ['admin', 'manager', 'receptionist'];
const ADMIN_MGR   = ['admin', 'manager'];

// All routes require authentication
router.use(protect);

// ─── Named routes (before /:id) ───────────────────────────────────────────────
router.get(
  '/reservation/:reservationId',
  authorize(...DESK_ROLES),
  invoiceController.getInvoiceByReservation
);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...DESK_ROLES), invoiceController.getAllInvoices)
  .post(
    authorize(...DESK_ROLES),
    generateInvoiceValidator,
    validate,
    invoiceController.generateInvoice
  );

// ─── Line-item actions ────────────────────────────────────────────────────────
router.post(
  '/:id/line-items',
  authorize(...DESK_ROLES),
  addLineItemValidator,
  validate,
  invoiceController.addLineItem
);

router.delete(
  '/:id/line-items/:index',
  authorize(...ADMIN_MGR),
  invoiceController.removeLineItem
);

// ─── Payment update ───────────────────────────────────────────────────────────
router.patch(
  '/:id/payment',
  authorize(...DESK_ROLES),
  updatePaymentValidator,
  validate,
  invoiceController.updatePaymentStatus
);

// ─── Email flag ───────────────────────────────────────────────────────────────
router.patch(
  '/:id/email',
  authorize(...DESK_ROLES),
  invoiceController.markEmailSent
);

// ─── Single resource ──────────────────────────────────────────────────────────
router.get('/:id', authorize(...DESK_ROLES), invoiceController.getInvoiceById);

module.exports = router;
