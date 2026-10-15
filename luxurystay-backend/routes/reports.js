const express = require('express');
const router  = express.Router();

const reportController = require('../controllers/reportController');
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate      = require('../middleware/validate');
const {
  dashboardValidator,
  occupancyReportValidator,
  revenueReportValidator,
  guestReportValidator,
  roomPerformanceValidator,
  housekeepingReportValidator,
  maintenanceReportValidator,
} = require('../validators/reportValidators');

const MGMT = ['admin', 'manager'];

router.use(protect, authorize(...MGMT));

router.get('/dashboard',          dashboardValidator,           validate, reportController.getDashboardMetrics);
router.get('/occupancy',          occupancyReportValidator,     validate, reportController.getOccupancyReport);
router.get('/revenue',            revenueReportValidator,       validate, reportController.getRevenueReport);
router.get('/guests',             guestReportValidator,         validate, reportController.getGuestReport);
router.get('/room-performance',   roomPerformanceValidator,     validate, reportController.getRoomPerformanceReport);
router.get('/housekeeping',       housekeepingReportValidator,  validate, reportController.getHousekeepingReport);
router.get('/maintenance',        maintenanceReportValidator,   validate, reportController.getMaintenanceReport);

module.exports = router;
