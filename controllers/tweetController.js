const Tweet = require('../models/tweet');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

/* Tweet Routes Needed */
// CRUD operations
// 


exports.validateAndSanitizeTweet = [
    body('text')
        .trim() 
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

// Interact with Tweet (Like or Retweet)
exports.likeOrRetweet = asyncHandler(async (req, res) => {
    let update = {};
    let tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
        res.status(404).json({ message: 'Tweet not found' });
        return;
    }

    switch (req.body.action) {
        case 'like':
            if (tweet.likedBy.includes(req.user._id.toString())) {
                // If the user has already liked, unlike the tweet
                update = {
                    $pull: { likedBy: req.user._id },
                    $inc: { likesCount: -1 }
                };
            } else {
                update = {
                    $addToSet: { likedBy: req.user._id },
                    $inc: { likesCount: 1 }
                };
            }
            break;

        case 'retweet':
            if (tweet.retweetedBy.includes(req.user._id.toString())) {
                // If the user has already retweeted, un-retweet
                update = {
                    $pull: { retweetedBy: req.user._id },
                    $inc: { retweetsCount: -1 }
                };
            } else {
                update = {
                    $addToSet: { retweetedBy: req.user._id },
                    $inc: { retweetsCount: 1 }
                };
            }
            break;

        default:
            res.status(400).json({ message: 'Invalid action specified' });
            return;
    }

    await Tweet.updateOne({ _id: req.params.id }, update);

    res.status(200).json({ message: 'Action successful' });
});