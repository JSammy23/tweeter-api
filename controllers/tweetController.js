const Tweet = require('../models/tweet');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

/* Tweet Routes Needed */
// CRUD operations


exports.validateAndSanitizeTweet = [
    // Check if the text field is not empty and doesn't exceed 500 characters.
    body('text')
        .trim() // Removes any extra whitespace
        .isLength({ min: 1, max: 500 }).withMessage('Tweet content must be between 1 and 500 characters.')
        .escape(), // Escapes any HTML special characters
    body('replyTo')
        .optional()
        .isMongoId().withMessage('Invalid ID format for reply tweet.'),
];

// Create Tweet
exports.create_tweet = asyncHandler(async (req, res, next) => {
    // Perform validation checks
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    console.log('Logged in user:', req.user);

    try {
        // Create the tweet
        const tweet = new Tweet({
            author: req.user._id, 
            text: req.body.text,
            replyTo: req.body.replyTo ? req.body.replyTo : null,
            // Other fields like date, likesCount, etc., will be filled with default values
        });

        // Save the tweet
        const savedTweet = await tweet.save();

        // Respond with the saved tweet
        res.status(201).json(savedTweet);

    } catch (error) {
        res.status(500).json({ message: "An error occurred while creating the tweet." });
    }
});