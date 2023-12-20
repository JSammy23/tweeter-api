const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InteractionsLogSchema = new Schema({
    tweet: { type: Schema.Types.ObjectId, ref: 'Tweet', required: true,  },
    lastInteracted: { type: Date, required: true }
});

module.exports = mongoose.model('InteractionsLog', InteractionsLogSchema);