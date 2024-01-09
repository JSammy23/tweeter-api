const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    text: { type: String, maxLength: 1000 },
    images: [{ type: String }], // Assuming image URLs are stored as strings
    gifs: [{ type: String }], // Assuming GIF URLs are stored as strings
    date: { type: Date, default: Date.now, required: true },
});

// Custom validator to ensure at least one form of content is present
MessageSchema.pre('validate', function(next) {
    if (!this.text && (!this.images || this.images.length === 0) && (!this.gifs || this.gifs.length === 0)) {
        next(new Error('A message must contain at least text, an image, or a GIF.'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Message', MessageSchema);