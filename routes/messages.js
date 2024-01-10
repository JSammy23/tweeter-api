var express = require('express');
var router = express.Router();
const passport = require('passport');

const messageController = require('../controllers/messageController');

// POST create new conversation
router.post('/conversation', passport.authenticate('jwt', { session: false }), messageController.createConversation);

// POST create new message
router.post('/', passport.authenticate('jwt', { session: false }), messageController.createMessage);

// GET user's conversations
router.get('/', passport.authenticate('jwt', { session: false }), messageController.fetchUsersConversations);

// GET conversations messages
router.get('/:conversationId', passport.authenticate('jwt', { session: false }), messageController.fetchConversation);

module.exports = router;