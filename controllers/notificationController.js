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