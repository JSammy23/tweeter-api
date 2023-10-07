const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },  
    tweet: { type: Schema.Types.ObjectId, ref: 'Tweet' }, 
    type: {
        type: String,
        enum: ['MENTION', 'FOLLOW', 'LIKE', 'RETWEET'],
        required: true
    },
    read: { type: Boolean, default: false }, 
    date: { type: Date, default: Date.now },
    message: String   
});

module.exports = mongoose.model('Notification', NotificationSchema);