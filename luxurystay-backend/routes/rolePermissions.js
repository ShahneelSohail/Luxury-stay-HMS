const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/rolePermissionsController');

router.use(protect);

router.get('/', ctrl.getAllRolePermissions);
router.put('/:role', authorize('admin'), ctrl.updateRolePermissions);

module.exports = router;
