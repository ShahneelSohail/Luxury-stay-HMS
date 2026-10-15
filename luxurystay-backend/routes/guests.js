const express = require('express');
const router  = express.Router();

const guestController = require('../controllers/guestController');

const { protect }     = require('../middleware/auth');
const { authorize }   = require('../middleware/rbac');
const validate        = require('../middleware/validate');
const {
  createGuestValidator,
  updateGuestValidator,
  searchGuestValidator,
} = require('../validators/guestValidators');

const VIEWER_ROLES = ['admin', 'manager', 'receptionist'];
const ADMIN_MGR    = ['admin', 'manager'];

// All routes require authentication
router.use(protect);

// ─── Search & bulk ops (before /:id to avoid param collision) ────────────────
router.get(
  '/search',
  authorize(...VIEWER_ROLES),
  searchGuestValidator,
  validate,
  guestController.searchGuests
);

router.post(
  '/recalc-all',
  authorize(...ADMIN_MGR),
  guestController.recalcAllGuests
);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...VIEWER_ROLES), guestController.getAllGuests)
  .post(authorize(...VIEWER_ROLES), createGuestValidator, validate, guestController.createGuest);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...VIEWER_ROLES), guestController.getGuestById)
  .patch(authorize(...VIEWER_ROLES), updateGuestValidator, validate, guestController.updateGuest)
  .delete(authorize(...ADMIN_MGR), guestController.deleteGuest);

router.post('/:id/recalc', authorize(...VIEWER_ROLES), guestController.recalcGuestStats);

module.exports = router;
