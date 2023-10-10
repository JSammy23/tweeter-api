const Tweet = require('../models/tweet');
const User = require('../models/user');
const interactionEmitter = require('../events/tweetEvents');

exports.likeTweet = async (tweetId, user) => {
    let update = {};
    let tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new Error('Tweet not found');
    }

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
        // interactionEmitter.emit('likeNotification', tweet, user);
    }

    await Tweet.updateOne({ _id: tweetId }, update);
    return { message: 'Like action successful' };
};

exports.retweet = async (tweetId, user) => {
    let update = {};
    let tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new Error('Tweet not found');
    }

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
        interactionEmitter.emit('retweetNotification', tweet, user);
    }

    await Tweet.updateOne({ _id: tweetId }, update);
    return { message: 'Retweet action successful' };
};