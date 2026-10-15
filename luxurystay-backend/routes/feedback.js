const express = require('express');
const router  = express.Router();

const feedbackController = require('../controllers/feedbackController');
const { protect }  = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate     = require('../middleware/validate');
const {
  createFeedbackValidator,
  updateFeedbackValidator,
  respondValidator,
  actionValidator,
} = require('../validators/feedbackValidators');

const MGMT_ROLES = ['admin', 'manager'];
const DESK_ROLES = ['admin', 'manager', 'receptionist'];

router.use(protect);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...MGMT_ROLES),  feedbackController.getAllFeedback)
  .post(authorize(...DESK_ROLES), createFeedbackValidator, validate, feedbackController.createFeedback);

// ─── Action routes (before /:id) ──────────────────────────────────────────────
router.patch(
  '/:id/respond',
  authorize(...MGMT_ROLES),
  respondValidator,
  validate,
  feedbackController.respondToFeedback
);

router.patch(
  '/:id/action',
  authorize(...MGMT_ROLES),
  actionValidator,
  validate,
  feedbackController.updateAction
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...MGMT_ROLES),    feedbackController.getFeedbackById)
  .patch(authorize(...MGMT_ROLES),  updateFeedbackValidator, validate, feedbackController.updateFeedback)
  .delete(authorize('admin'),       feedbackController.deleteFeedback);

module.exports = router;
