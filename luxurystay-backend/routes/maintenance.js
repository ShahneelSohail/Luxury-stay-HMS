const express = require('express');
const router  = express.Router();

const maintenanceController = require('../controllers/maintenanceController');
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate      = require('../middleware/validate');
const {
  createRequestValidator,
  updateRequestValidator,
  assignRequestValidator,
  updateStatusValidator,
  resolveRequestValidator,
} = require('../validators/maintenanceValidators');

// All authenticated staff can report issues; role-based access per action
const ALL_STAFF  = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];
const MAINT_MGMT = ['admin', 'manager', 'service'];
const ADMIN_MGR  = ['admin', 'manager'];

// All routes require authentication
router.use(protect);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...MAINT_MGMT), maintenanceController.getAllRequests)
  .post(authorize(...ALL_STAFF), createRequestValidator, validate, maintenanceController.createRequest);

// ─── Action routes (before /:id) ──────────────────────────────────────────────
router.patch(
  '/:id/assign',
  authorize(...ADMIN_MGR),
  assignRequestValidator,
  validate,
  maintenanceController.assignRequest
);

router.patch(
  '/:id/status',
  authorize(...MAINT_MGMT),
  updateStatusValidator,
  validate,
  maintenanceController.updateStatus
);

router.patch(
  '/:id/resolve',
  authorize(...MAINT_MGMT),
  resolveRequestValidator,
  validate,
  maintenanceController.resolveRequest
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...MAINT_MGMT),   maintenanceController.getRequestById)
  .patch(authorize(...MAINT_MGMT), updateRequestValidator, validate, maintenanceController.updateRequest);

module.exports = router;
