const { calculateTweetScore } = require('./scoreCalculator');
const Tweet = require('../models/tweet');

const updateTweetScore = async (tweetId) => {
    try {
        const tweet = await Tweet.findById(tweetId);
        if (!tweet) {
            throw new Error("Tweet not found");
        }
        const newScore = calculateTweetScore(tweet);
        tweet.score = newScore;
        await tweet.save();
    } catch (error) {
        console.error(`Failed to update score for tweet ${tweetId}:`, error);
    }
};

module.exports = {
    updateTweetScore
};