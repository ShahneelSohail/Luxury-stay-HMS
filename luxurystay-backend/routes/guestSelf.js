const express = require('express');
const router  = express.Router();

const guestSelfController = require('../controllers/guestSelfController');
const { protect }         = require('../middleware/auth');
const { authorize }       = require('../middleware/rbac');

// Public — no auth required
router.get('/rooms', guestSelfController.getAvailableRooms);

// Protected — guest role only
router.use(protect);
router.use(authorize('guest'));

router.get('/reservations',                         guestSelfController.getMyReservations);
router.patch('/reservations/:id/cancel',            guestSelfController.cancelMyReservation);
router.get('/history',                              guestSelfController.getMyHistory);
router.post('/feedback',     guestSelfController.submitFeedback);
router.post('/book',         guestSelfController.createBooking);
router.get('/service',       guestSelfController.getMyServiceRequests);
router.post('/service',      guestSelfController.submitServiceRequest);
router.post('/maintenance',  guestSelfController.submitMaintenanceReport);

module.exports = router;
