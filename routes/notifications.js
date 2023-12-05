const express = require('express');
const router = express.Router();
const passport = require('passport');

const notificationController = require('../controllers/notificationController');

// GET User notifications
router.get('/', passport.authenticate('jwt', { session: false }), notificationController.fetchUserNotifications);

// POST Mark Notification as read
router.patch('/read/:id', passport.authenticate('jwt', { session: false }), notificationController.updateNotificationReadStatus);

module.exports = router;