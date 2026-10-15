const express = require('express');
const router  = express.Router();

const propertyController = require('../controllers/propertyController');
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate      = require('../middleware/validate');
const { updatePropertyValidator } = require('../validators/propertyValidators');

router.use(protect);

// All authenticated roles can read property settings (needed for invoice headers, folios, etc.)
router.get('/', propertyController.getProperty);

// Only admin can update property settings
router.patch(
  '/',
  authorize('admin'),
  updatePropertyValidator,
  validate,
  propertyController.updateProperty
);

module.exports = router;
