const { query } = require('express-validator');

const dateRangeValidator = [
  query('from')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('from must be a valid ISO 8601 date.'),

  query('to')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('to must be a valid ISO 8601 date.')
    .custom((to, { req }) => {
      if (to && req.query.from && new Date(to) < new Date(req.query.from)) {
        throw new Error('to must be after from.');
      }
      return true;
    }),
];

exports.dashboardValidator = [];

exports.occupancyReportValidator  = dateRangeValidator;
exports.revenueReportValidator    = dateRangeValidator;
exports.guestReportValidator      = dateRangeValidator;
exports.roomPerformanceValidator  = dateRangeValidator;
exports.housekeepingReportValidator = dateRangeValidator;
exports.maintenanceReportValidator  = dateRangeValidator;
