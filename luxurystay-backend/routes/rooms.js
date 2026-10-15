const express = require('express');
const router  = express.Router();

const roomController = require('../controllers/roomController');
const { protect }    = require('../middleware/auth');
const { authorize }  = require('../middleware/rbac');
const validate       = require('../middleware/validate');
const {
  createRoomValidator,
  updateRoomValidator,
  updateStatusValidator,
  checkAvailabilityValidator,
} = require('../validators/roomValidators');

const ALL_STAFF    = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];
const ADMIN_MGR    = ['admin', 'manager'];
const STATUS_ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];

// All routes require authentication
router.use(protect);

// ─── Availability check (before /:id) ─────────────────────────────────────────
router.get(
  '/available',
  authorize(...ALL_STAFF),
  checkAvailabilityValidator,
  validate,
  roomController.checkAvailability
);

// ─── By-status shortcut ───────────────────────────────────────────────────────
router.get(
  '/status/:status',
  authorize(...ALL_STAFF),
  roomController.getRoomsByStatus
);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...ALL_STAFF), roomController.getAllRooms)
  .post(authorize(...ADMIN_MGR), createRoomValidator, validate, roomController.createRoom);

// ─── Status update (dedicated endpoint) ──────────────────────────────────────
router.patch(
  '/:id/status',
  authorize(...STATUS_ROLES),
  updateStatusValidator,
  validate,
  roomController.updateRoomStatus
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...ALL_STAFF), roomController.getRoomById)
  .patch(authorize(...ADMIN_MGR), updateRoomValidator, validate, roomController.updateRoom)
  .delete(authorize('admin'), roomController.deleteRoom);

module.exports = router;
