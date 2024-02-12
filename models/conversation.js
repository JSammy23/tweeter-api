const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
    participantIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    validate: {
        validator: function (val) {
            return val.length <= 10;
        },
        message: props => `${props.value.length} recipients exceeds maximum limit of 10.`
    },
    deletedByUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastMessageDate: { type: Date, default: null },
    lastSeen: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        message: { type: Schema.Types.ObjectId, ref: 'Message' }
    }]
});

module.exports = mongoose.model('Conversation', ConversationSchema);