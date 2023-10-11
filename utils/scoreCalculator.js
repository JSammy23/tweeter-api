const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

const calculateTweetScore = (tweet) => {
    // Consider date
    const now = Date.now();
    const tweetAge = now - tweet.date; // In milliseconds
    const daysOld = tweetAge / MILLISECONDS_IN_A_DAY;
    
    const ageFactor = Math.pow(0.95, daysOld);

    const likesWeight = 1;   
    const retweetsWeight = 1.5; 
    const repliesWeight = 1.7;
    const interactions = (tweet.likesCount * likesWeight) + (tweet.retweetsCount * retweetsWeight) + (tweet.repliesCount * repliesWeight);
    const interactionFactor = 1 + (interactions / (interactions + 100));

    const score = ageFactor * interactionFactor;
    return score;
};

module.exports = {
    calculateTweetScore
};