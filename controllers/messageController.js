const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const socketConfig = require('../config/socket');

// Get User's conversations
exports.fetchUsersConversations = asyncHandler(async (req, res, next) => {
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    const userId = req.user._id;

    const conversations = await Conversation.find({
        participantIds: userId,
        deletedByUsers: { $ne: userId }
    })
    .sort({ lastMessageDate: -1 })
    .limit(numLimit)
    .skip(numSkip)
    .populate('participantIds', 'firstName lastName username profile')
    .populate({
        path: 'lastSeen.message', 
        model: 'Message' 
    })
    .exec();

    // Flag conversations with unseen messages
    const conversationsWithUnseenMessages = await Promise.all(conversations.map(async conversation => {
        let conversationObject = conversation.toObject();
        const lastSeenEntry = conversation.lastSeen.find(entry => entry.user.toString() === userId.toString());
        if (!lastSeenEntry || !conversation.lastMessageDate || (lastSeenEntry.message && lastSeenEntry.message.date.toString() !== conversation.lastMessageDate.toString())) {
            conversationObject.unseenMessages = true;
        } else {
            conversationObject.unseenMessages = false;
        }
        return conversationObject;
    }));

    res.json(conversationsWithUnseenMessages);
});

// Get conversation's messages
exports.fetchConversation = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    // Adjusted default page to 0 to align with frontend expectations
    const { limit, page } = req.query; 
    const numLimit = parseInt(limit, 10);
    // Adjust calculation for numSkip to work with page starting at 0
    const numSkip = parseInt(page, 10) * numLimit; 
    const userId = req.user._id;

    console.log(`Received request for page ${page} with offset ${numSkip}`);

    // Check if the conversation exists
    const conversation = await Conversation.findById(conversationId)
    .populate('participantIds', 'username profile')
    .exec();

    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
    }

    const totalCount = await Message.countDocuments({ conversationId: conversationId });

    const messages = await Message.find({ conversationId: conversationId })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
    .exec();

    const mostRecentMessage = messages.length > 0 ? messages[0]._id : null;

    // Update the last seen for the user in the conversation
    const userLastSeen = conversation.lastSeen.find(entry => entry.user.toString() === userId.toString());
    if (userLastSeen) {
        userLastSeen.message = mostRecentMessage;
    } else {
        conversation.lastSeen.push({ user: userId, message: mostRecentMessage });
    }
    await conversation.save();

    res.header('x-total-count', totalCount);

    res.json({
        messages: messages, // The fetched messages
        participants: conversation.participantIds // The participants in the conversation
    });
});


// Create new conversation
exports.createConversation = asyncHandler(async (req, res, next) => {
    const { participantIds } = req.body; 

    if (!participantIds || participantIds.length === 0) {
        return res.status(400).json({ message: "A conversation must have at least one participant." });
    }

    // Push user that started conversation into array
    if (!participantIds.includes(req.user._id)) {
        participantIds.push(req.user._id);
    }

    for (const id of participantIds) {
        const userExists = await User.exists({ _id: id });
        if (!userExists) {
            return res.status(400).json({ message: `User with ID ${id} not found.` });
        }
    }

    // Check for exisiting conversation with same participants
    const sortedParticipantIds = participantIds.slice().sort();

    const existingConversation = await Conversation.findOne({ 
        participantIds: { $all: sortedParticipantIds, $size: sortedParticipantIds.length } 
    });

    if (existingConversation) {
        return res.status(200).json(existingConversation);
    }

    // Create new conversation
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

    // Clear the deletedByUsers array if it's not already empty
    // This makes the conversation visible again to all participants who previously deleted it
    if (conversation.deletedByUsers.length > 0) {
        conversation.deletedByUsers = [];
        await conversation.save(); 
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

    // Emit the message to all clients in conversation
    const io = socketConfig.getIO();
    console.log('Emitting newMessage to conversation:', conversationId);
    io.to(conversationId).emit('newMessage', savedMessage);

    // Update conversations lastMessageDate
    conversation.lastMessageDate = newMessage.date;
    await conversation.save();

    res.status(201).json(savedMessage);
});

// Soft delete conversation
exports.softDeleteConversation = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.body;
    const userId = req.user._id;

    // Retrieve the conversation document
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
    }

    if (!conversation.deletedByUsers.includes(userId)) {
        conversation.deletedByUsers.push(userId);
        await conversation.save();
        res.status(200).json({ message: "Conversation soft deleted successfully." })
    } else {
        res.status(204).json({ message: "User has already deleted this conversation." })
    }
});