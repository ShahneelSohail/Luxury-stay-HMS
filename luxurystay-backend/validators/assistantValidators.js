const { body } = require('express-validator');

const MAX_MESSAGES    = 12;
const MAX_MESSAGE_LEN = 500;

exports.chatValidator = [
  body('messages')
    .isArray({ min: 1, max: MAX_MESSAGES }).withMessage(`messages must contain 1 to ${MAX_MESSAGES} items.`)
    .bail()
    .custom(messages => messages[messages.length - 1]?.role === 'user')
    .withMessage('The last message must come from the user.'),

  body('messages.*.role')
    .isIn(['user', 'assistant']).withMessage('Each message role must be "user" or "assistant".'),

  body('messages.*.text')
    .isString().withMessage('Each message needs text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: MAX_MESSAGE_LEN }).withMessage(`Each message must be 1 to ${MAX_MESSAGE_LEN} characters.`),
];
