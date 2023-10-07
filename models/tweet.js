const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TweetSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxLength: 500, required: true }, 
    date: { type: Date, default: Date.now, required: true },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Tweet', default: null },
    likesCount: { type: Number, default: 0 },
    retweetsCount: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    retweetedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
    editedDate: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedDate: { type: Date, default: null },
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
    // Extract hashtags and their positions from the tweet text using regex
    const hashtagPattern = /#\w+/g;
    const matches = [];
    let match;

    // Use exec method to iterate over all matches and capture their positions
    while ((match = hashtagPattern.exec(this.text)) !== null) {
        matches.push({
            text: match[0], 
            indices: [match.index, match.index + match[0].length]
        });
    }

    // Assign the matches to the entities.hashtags field
    if (matches.length) {
        this.entities = this.entities || {};
        this.entities.hashtags = matches;
    } else {
        this.entities = this.entities || {};
        this.entities.hashtags = [];
    }

    next();
});

module.exports = mongoose.model('Tweet', TweetSchema);