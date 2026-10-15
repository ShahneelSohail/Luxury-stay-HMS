const express = require('express');
const router  = express.Router();

const reservationController = require('../controllers/reservationController');
const checkinController     = require('../controllers/checkinController');
const { protect }           = require('../middleware/auth');
const { authorize }         = require('../middleware/rbac');
const validate              = require('../middleware/validate');
const {
  createReservationValidator,
  updateReservationValidator,
} = require('../validators/reservationValidators');
const {
  checkInValidator,
  checkOutValidator,
} = require('../validators/checkinValidators');

const DESK_ROLES = ['admin', 'manager', 'receptionist'];

// All routes require authentication
router.use(protect);

// ─── Named / action routes (must come before /:id) ────────────────────────────
router.get(
  '/today-arrivals',
  authorize(...DESK_ROLES),
  reservationController.getTodayArrivals
);

router.get(
  '/today-departures',
  authorize(...DESK_ROLES),
  reservationController.getTodayDepartures
);

router.get(
  '/guest/:guestId',
  authorize(...DESK_ROLES),
  reservationController.getReservationsByGuest
);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(authorize(...DESK_ROLES), reservationController.getAllReservations)
  .post(
    authorize(...DESK_ROLES),
    createReservationValidator,
    validate,
    reservationController.createReservation
  );

// ─── Cancel / Check-in / Check-out (before /:id to avoid conflict) ───────────
router.patch(
  '/:id/cancel',
  authorize(...DESK_ROLES),
  reservationController.cancelReservation
);

router.patch(
  '/:id/checkin',
  authorize(...DESK_ROLES),
  checkInValidator,
  validate,
  checkinController.checkIn
);

router.patch(
  '/:id/checkout',
  authorize(...DESK_ROLES),
  checkOutValidator,
  validate,
  checkinController.checkOut
);

// ─── Single resource ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(...DESK_ROLES), reservationController.getReservationById)
  .patch(
    authorize(...DESK_ROLES),
    updateReservationValidator,
    validate,
    reservationController.updateReservation
  );

module.exports = router;
