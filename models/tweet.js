const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TweetSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxLength: 500, required: true }, 
    date: { type: Date, default: Date.now, required: true },
    isReply: { type: Boolean, default: false },
    likesCount: { type: Number, default: 0 },
    retweetsCount: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    retweetedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    entities: {
        mentions: [{
            username: String,
            indices: [Number]
        }],
        hashtags: [{
            text: String,
            indices: [Number]
        }]
    }
});

TweetSchema.virtual('url').get(function () {
    return `/tweets/${this._id}`;
});


// Middleware to extract hashtags from tweet body
TweetSchema.pre('save', function(next) {
    // Extract hashtags from the tweet body using regex
    const hashtagPattern = /#\w+/g;
    const matches = this.body.match(hashtagPattern);
    
    // If hashtags are found, assign them to the hashtags field
    if (matches) {
        this.hashtags = matches;
    } else {
        this.hashtags = [];
    }

    next();
});

module.exports = mongoose.model('Tweet', TweetSchema);