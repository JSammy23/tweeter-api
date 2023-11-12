const Tweet = require('../models/tweet');
const User = require('../models/user');
const tweetService = require('../services/tweetService');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

/* Tweet Routes Needed */
// CRUD operations


exports.validateAndSanitizeTweet = [
    body('text')
        .trim() 
        .isLength({ min: 1, max: 500 }).withMessage('Tweet content must be between 1 and 500 characters.')
        .escape(), 
    body('replyTo')
        .optional()
        .isMongoId().withMessage('Invalid ID format for reply tweet.'),
];

// Create Tweet
exports.create_tweet = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const tweet = new Tweet({
        author: req.user._id, 
        text: req.body.text,
        replyTo: req.body.replyTo ? req.body.replyTo : null,
        thread: req.body.thread ? req.body.thread : null
    });

    const savedTweet = await tweet.save();
    const populatedTweet = await Tweet.findById(savedTweet._id).populate('author', 'firstName lastName username profile').exec();
    await User.findByIdAndUpdate(req.user._id, {
        $push: { tweets: savedTweet._id }
    });

    // If this tweet is a reply, update the original tweet's replies array
    if (req.body.replyTo) {
        await Tweet.findByIdAndUpdate(req.body.replyTo, {
            $push: { replies: savedTweet._id },
            $inc: { repliesCount: 1 }
        });
    };

    res.status(201).json(populatedTweet);
});

// Update Tweet
exports.update_tweet = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    };

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
        return res.status(404).json({ message: "Tweet not found." });
    };

    if (tweet.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You don't have permission to edit this tweet." });
    };

    if (tweet.text !== req.body.text) {
        tweet.text = req.body.text;
        tweet.isEdited = true;
        tweet.editedDate = new Date();
    };

    tweet.text = req.body.text;
    if (req.body.replyTo) {
        tweet.replyTo = req.body.replyTo;
    };

    const updatedTweet = await tweet.save();

    res.status(200).json(updatedTweet);
});

// Soft delete tweet
exports.delete_tweet = asyncHandler(async (req, res, next) => {
    const tweet = await Tweet.findById(req.params.id);
    
    if (!tweet) {
        return res.status(404).json({ message: "Tweet not found." });
    }
    
    if (!tweet.author.equals(req.user._id)) {
        return res.status(403).json({ message: "You can only delete your own tweets." });
    }
    
    if (tweet.isDeleted) {
        return res.status(400).json({ message: "Tweet is already deleted." });
    }

    tweet.isDeleted = true;
    tweet.deletedDate = new Date();
  
    await tweet.save();

    res.status(200).json({ message: "Tweet deleted successfully." });
});

// Interact with Tweet (Like or Retweet)
exports.likeOrRetweet = asyncHandler(async (req, res) => {
    switch (req.body.action) {
        case 'like':
            const likeResult = await tweetService.likeTweet(req.params.id, req.user);
            res.status(200).json(likeResult);
            break;

        case 'retweet':
            const retweetResult = await tweetService.retweet(req.params.id, req.user);
            res.status(200).json(retweetResult);
            break;

        default:
            res.status(400).json({ message: 'Invalid action specified' });
            return;
    }
});

/****  Fetching Tweets  *****/
// Will need to be able to flag retweets for client
exports.fetchSubscribedTweets = asyncHandler(async (req, res, next) => {
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    const followedUsers = req.user.following;
    const followedUsersTweets = await User.find(
        {_id: {$in: followedUsers}},
        'tweets retweets'
    );

    console.log(followedUsers);
    console.log('Tweets: ', followedUsersTweets);

    // Extracting tweet IDs from the results
    let tweetIds = [];
    followedUsersTweets.forEach(user => {
        tweetIds = tweetIds.concat(user.tweets).concat(user.retweets);
    });

    // Fetching the actual tweets using the IDs
    const tweets = await Tweet.find({ _id: { $in: tweetIds } })
        .sort({ score: -1, date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('author', 'username firstName lastName profile')
        .exec()

    res.json(tweets);
});

exports.fetchTweetAndReplies = asyncHandler(async (req, res, next) => {
    const tweet = await Tweet.findById(req.params.id)
        .populate('author', 'username firstName lastName profile')
        .populate('replyTo thread replies')
        .populate({
            path: 'replies',
            populate: {
                path: 'author',
                select: 'username firstName lastName profile'
            }
        })
        .populate({
            path: 'thread',
            populate: {
                path: 'author',
                select: 'username firstName lastName profile'
            }
        })
        .exec();

        res.json(tweet);
});