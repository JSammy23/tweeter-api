const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');
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
    .populate('participantIds', 'firstName lastName username profile')
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

// Create new conversation
exports.createConversation = asyncHandler(async (req, res, next) => {
    const { participantIds } = req.body; // Array of user IDs

    for (const id of participantIds) {
        const userExists = await User.exists({ _id: id });
        if (!userExists) {
            return res.status(400).json({ message: `User with ID ${id} not found.` });
        }
    }

    const newConversation = new Conversation({
        participantIds
    });

    const savedConversation = await newConversation.save();

    res.status(201).json(savedConversation);
});

// Create new message
exports.createMessage = asyncHandler(async (req, res, next) => {
    const { conversationId, senderId, text, images, gifs } = req.body;

    // Retrieve the conversation document
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
    }

    // Check if at least one form of content (text, image, or GIF) is present
    if (!text && (!images || images.length === 0) && (!gifs || gifs.length === 0)) {
        return res.status(400).json({ message: "A message must contain at least text, an image, or a GIF." });
    }

    // Filter out senderId from participantIds to set as receiverIds
    const receiverIds = conversation.participantIds.filter(id => id.toString() !== senderId);

    const newMessage = new Message({
        conversationId,
        senderId,
        receiverIds,
        text,
        images,
        gifs,
        date: new Date() 
    });

    const savedMessage = await newMessage.save();

    res.status(201).json(savedMessage);
});