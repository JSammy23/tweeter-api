const EventEmitter = require('events');
const interactionEmitter = new EventEmitter();
const Notification = require('../models/notification');

// Listener for like event
interactionEmitter.on('likeNotification', async (tweet, user) => {
    try {
        const notificationEvent = {
            type: 'LIKE',
            recipient: tweet.author,
            sender: user._id,
            tweet: tweet._id,
            message: `${user.username} liked your tweet.`
        };
    
        // If a notificationEvent was created, save it to the database
        if (notificationEvent) {
            const newNotification = new Notification(notificationEvent);
            await newNotification.save();
        }
    } catch (error) {
        console.error('Error saving like notification:', error)
    }
});

// Listener for retweet event
interactionEmitter.on('retweetNotification', async (tweet, user) => {
    try {
        const notificationEvent = {
            type: 'RETWEEY',
            recipient: tweet.author,
            sender: user._id,
            tweet: tweet._id,
            message: `${user.username} retweeted your tweet.`
        };
    
        // If a notificationEvent was created, save it to the database
        if (notificationEvent) {
            const newNotification = new Notification(notificationEvent);
            await newNotification.save();
        }
    } catch (error) {
        console.error('Error saving retweet notification:', error)
    }
});