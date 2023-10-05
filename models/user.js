const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName: { type: String, maxLength: 30, required: true },
    lastName: { type: String, maxLength: 30, required: true },
    username: { type: String, maxLength: 30, minLength: 2, required: true, unique: true, index: true },
    password: { type: String, maxLength: 100, minLength: 8, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/\S+@\S+\.\S+/, 'is invalid'], maxLength: 100, minLength: 5 },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    date_joined: { type: Date, default: Date.now },
    profile: {
        bio: { type: String, maxLength: 180 },
        profile_picture: { type: String }
    },
    tweets: [{ type: Schema.Types.ObjectId, ref: 'Tweet' }],
    retweets: [{ type: Schema.Types.ObjectId, ref: 'Tweet' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'Tweet' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

UserSchema.virtual('url').get(function () {
    return `/users/${this._id}`;
});

module.exports = mongoose.model('User', UserSchema);