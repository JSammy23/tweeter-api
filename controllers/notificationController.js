const Notification = require('../models/notification');
const Tweet = require('../models/tweet');
const User = require('../models/user');
const asyncHandler = require("express-async-handler");

exports.fetchUserNotifications = asyncHandler(async (req, res, next) => {
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('sender', 'username firstName lastName profile')
    .exec()

    res.json(notifications);
});

exports.updateNotificationReadStatus = asyncHandler(async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        await Notification.findByIdAndUpdate(notificationId, { read: true });
        res.json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error("Error updating notification:", error);
        res.status(500).json({ message: 'Internal server error' })
    }
});

exports.clearNotifications = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const onlyRead = req.query.onlyRead === 'true';

        if (onlyRead) {
            // Clear only read notifications
            await Notification.deleteMany({ recipient: userId, read: true });
        } else {
            // Clear all notifications
            await Notification.deleteMany({ recipient: userId });
        }

        res.json({ message: 'Notifications cleared successfully' });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});