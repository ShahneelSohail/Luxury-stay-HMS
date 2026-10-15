const express = require('express');
const router  = express.Router();

const housekeepingController = require('../controllers/housekeepingController');
const { protect }  = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate     = require('../middleware/validate');
const {
  createTaskValidator,
  updateTaskValidator,
  assignTaskValidator,
  markCompleteValidator,
  reportIssueValidator,
} = require('../validators/housekeepingValidators');

const HK_ROLES   = ['admin', 'manager', 'housekeeping'];
const ADMIN_MGR  = ['admin', 'manager'];
// Receptionist can view room tasks (needed for front desk room status visibility)
const VIEW_ROLES = ['admin', 'manager', 'housekeeping', 'receptionist'];

// All routes require authentication
router.use(protect);

// ─── Named collection routes (before /:id) ────────────────────────────────────
router.get(
  '/room/:roomId',
  authorize(...VIEW_ROLES),
  housekeepingController.getTasksByRoom
);

router.get(
  '/staff/:staffId',
  authorize(...HK_ROLES),
  housekeepingController.getTasksByStaff
);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...HK_ROLES),  housekeepingController.getAllTasks)
  .post(authorize(...HK_ROLES), createTaskValidator, validate, housekeepingController.createTask);

// ─── Action routes on single resource ────────────────────────────────────────
router.patch(
  '/:id/assign',
  authorize(...ADMIN_MGR),
  assignTaskValidator,
  validate,
  housekeepingController.assignTask
);

router.patch(
  '/:id/complete',
  authorize(...HK_ROLES),
  markCompleteValidator,
  validate,
  housekeepingController.markComplete
);

router.patch(
  '/:id/issue',
  authorize(...HK_ROLES),
  reportIssueValidator,
  validate,
  housekeepingController.reportIssue
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...HK_ROLES),   housekeepingController.getTaskById)
  .patch(authorize(...HK_ROLES), updateTaskValidator, validate, housekeepingController.updateTask);

module.exports = router;
