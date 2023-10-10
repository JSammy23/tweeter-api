const Tweet = require('../models/tweet');
const User = require('../models/user');
const Notification = require('../models/notification');

exports.likeTweet = async (tweetId, user) => {
    let update = {};
    let tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new Error('Tweet not found');
    }

    let notificationEvent;

    if (tweet.likedBy.includes(user._id.toString())) {
        // If the user has already liked, unlike the tweet
        update = {
            $pull: { likedBy: user._id },
            $inc: { likesCount: -1 }
        };
        await User.findByIdAndUpdate(user._id, {
            $pull: { likes: tweetId }
        });
    } else {
        update = {
            $addToSet: { likedBy: user._id },
            $inc: { likesCount: 1 }
        };
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { likes: tweetId }
        });
        // Set up the notification event
        notificationEvent = {
            type: 'LIKE',
            recipient: tweet.author,
            sender: user._id,
            tweet: tweet._id,
            message: `User ${user.username} liked your tweet.` 
        };
    }

    await Tweet.updateOne({ _id: tweetId }, update);

    // If a notificationEvent was created, save it to the database
    if (notificationEvent) {
        const newNotification = new Notification(notificationEvent);
        await newNotification.save();
    }

    return { message: 'Like action successful' };
};

exports.retweet = async (tweetId, user) => {
    let update = {};
    let tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new Error('Tweet not found');
    }

    let notificationEvent;

    if (tweet.retweetedBy.includes(user._id.toString())) {
        // If the user has already retweeted, un-retweet
        update = {
            $pull: { retweetedBy: user._id },
            $inc: { retweetsCount: -1 }
        };
        await User.findByIdAndUpdate(user._id, {
            $pull: { retweets: tweetId }
        });
    } else {
        update = {
            $addToSet: { retweetedBy: user._id },
            $inc: { retweetsCount: 1 }
        };
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { retweets: tweetId }
        });
        // Set up the notification event
        notificationEvent = {
            type: 'RETWEET',
            recipient: tweet.author,
            sender: user._id,
            tweet: tweet._id,
            message: `User ${user.username} retweeted your tweet.`
        };
    }

    await Tweet.updateOne({ _id: tweetId }, update);

    // If a notificationEvent was created, save it to the database
    if (notificationEvent) {
        const newNotification = new Notification(notificationEvent);
        await newNotification.save();
    }

    return { message: 'Retweet action successful' };
};