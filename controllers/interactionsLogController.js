const InteractionsLog = require('../models/interactionsLog');

// Log interaction
exports.logInteraction = async (tweetId)=> {
    const now = new Date();
    try {
        await InteractionsLog.updateOne(
            { tweet: tweetId },
            { $set: { lastInteracted: now } },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error updating interaction log:', error);
    }
};