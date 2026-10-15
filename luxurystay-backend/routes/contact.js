const express = require('express');
const router  = express.Router();

const contactController = require('../controllers/contactController');
const validate          = require('../middleware/validate');
const { submitContactValidator } = require('../validators/contactValidators');
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const DESK_ROLES = ['admin', 'manager', 'receptionist'];
const MGMT_ROLES = ['admin', 'manager'];

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/', submitContactValidator, validate, contactController.submitContact);

// ── Staff-only ────────────────────────────────────────────────────────────────
router.use(protect);

router.get('/',    authorize(...DESK_ROLES), contactController.getAllContacts);
router.get('/:id', authorize(...DESK_ROLES), contactController.getContactById);
router.patch('/:id', authorize(...DESK_ROLES), contactController.updateContact);
router.delete('/:id', authorize(...MGMT_ROLES), contactController.deleteContact);

module.exports = router;
