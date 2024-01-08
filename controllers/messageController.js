const Conversation = require('../models/Conversation');
const Message = require('../models/message');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

// Get User's conversations
exports.fetchUsersConversations = asyncHandler(async (req, res, next) => {
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    const userId = req.user._id;

    const conversations = await Conversation.find({
        participantIds: userId
    })
    .limit(numLimit)
    .skip(numSkip)
    .populate('participantIds', 'firstName username profile')
    .exec();

    res.json(conversations);
});

// Get conversation's messages
exports.fetchConversation = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const { limit = 25, page = 1 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = (parseInt(page, 10) - 1) * numLimit;

    // Check if the conversation exists
    const conversationExists = await Conversation.exists({ _id: conversationId });
    if (!conversationExists) {
        return res.status(404).json({ message: "Conversation not found." });
    }

    const messages = await Message.find({ conversationId: conversationId })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .exec();

    res.json(messages);
});