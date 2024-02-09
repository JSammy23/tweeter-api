const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
    participantIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    deletedByUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastMessageDate: { type: Date, default: null }
});

module.exports = mongoose.model('Conversation', ConversationSchema);