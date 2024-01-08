const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recieverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxLength: 1000 },
    date: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('Message', MessageSchema);