const express   = require('express');
const rateLimit = require('express-rate-limit');
const router    = express.Router();

const assistantController = require('../controllers/assistantController');
const validate            = require('../middleware/validate');
const { chatValidator }   = require('../validators/assistantValidators');

const CHAT_WINDOW_MS = 15 * 60 * 1000;
const CHAT_MAX_REQUESTS = 30;

const chatLimiter = rateLimit({
  windowMs: CHAT_WINDOW_MS,
  limit:    CHAT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many assistant requests. Please try again later.' },
});

router.post('/chat', chatLimiter, chatValidator, validate, assistantController.chat);

module.exports = router;
