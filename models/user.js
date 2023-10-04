const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName: { type: String, maxLength: 30, required: true },
    lastName: { type: String, maxLength: 30, required: true },
    username: { type: String, maxLength: 30, minLength: 2, required: true, unique: true },
    password: { type: String, maxLength: 100, minLength: 8, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/\S+@\S+\.\S+/, 'is invalid'], maxLength: 100, minLength: 5 },
    date_joined: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);