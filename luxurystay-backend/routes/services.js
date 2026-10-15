const express = require('express');
const router  = express.Router();

const serviceController = require('../controllers/serviceController');
const { protect }  = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate     = require('../middleware/validate');
const {
  createServiceValidator,
  updateServiceValidator,
  assignServiceValidator,
  fulfillServiceValidator,
} = require('../validators/serviceValidators');

const DESK_ROLES = ['admin', 'manager', 'receptionist', 'service'];

router.use(protect);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...DESK_ROLES),  serviceController.getAllServiceRequests)
  .post(authorize(...DESK_ROLES), createServiceValidator, validate, serviceController.createServiceRequest);

// ─── Action routes (before /:id) ──────────────────────────────────────────────
router.patch(
  '/:id/assign',
  authorize(...DESK_ROLES),
  assignServiceValidator,
  validate,
  serviceController.assignServiceRequest
);

router.patch(
  '/:id/fulfill',
  authorize(...DESK_ROLES),
  fulfillServiceValidator,
  validate,
  serviceController.fulfillServiceRequest
);

router.patch(
  '/:id/cancel',
  authorize(...DESK_ROLES),
  serviceController.cancelServiceRequest
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...DESK_ROLES),   serviceController.getServiceRequestById)
  .patch(authorize(...DESK_ROLES), updateServiceValidator, validate, serviceController.updateServiceRequest);

module.exports = router;
