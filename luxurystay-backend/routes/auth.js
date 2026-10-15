const express = require('express');
const router  = express.Router();

const authController = require('../controllers/authController');
const { protect }    = require('../middleware/auth');
const validate       = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  updateMeValidator,
  changePasswordValidator,
} = require('../validators/authValidators');

// ─── Public ───────────────────────────────────────────────────────────────────
router.post('/register', registerValidator, validate, authController.register);
router.post('/login',    loginValidator,    validate, authController.login);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(protect);

router.post('/logout', authController.logout);

router
  .route('/me')
  .get(authController.getMe)
  .patch(updateMeValidator, validate, authController.updateMe);

router.patch(
  '/change-password',
  changePasswordValidator,
  validate,
  authController.changePassword
);

module.exports = router;
