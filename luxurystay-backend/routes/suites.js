const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/suiteController');
const { protect }    = require('../middleware/auth');
const { authorize }  = require('../middleware/rbac');

// Public
router.get('/',    ctrl.getSuites);
router.get('/:id', ctrl.getSuite);

// Admin only
router.use(protect);
router.use(authorize('admin'));
router.post('/',    ctrl.createSuite);
router.patch('/:id', ctrl.updateSuite);
router.delete('/:id', ctrl.deleteSuite);

module.exports = router;
