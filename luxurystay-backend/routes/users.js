const express = require('express');
const router  = express.Router();

const userController = require('../controllers/userController');
const { protect }    = require('../middleware/auth');
const { authorize }  = require('../middleware/rbac');
const validate       = require('../middleware/validate');
const {
  createUserValidator,
  updateUserValidator,
} = require('../validators/userValidators');

// All /api/users routes require authentication and admin role
router.use(protect, authorize('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(createUserValidator, validate, userController.createUser);

router
  .route('/:id')
  .get(userController.getUserById)
  .patch(updateUserValidator, validate, userController.updateUser)
  .delete(userController.deactivateUser);

module.exports = router;
