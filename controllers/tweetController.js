const Tweet = require('../models/tweet');
const User = require('../models/user');
const tweetService = require('../services/tweetService');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const interactionEmitter = require('../events/tweetEvents');
const minioClient = require('../utils/minioClient');


/* Tweet Routes Needed */
// CRUD operations


exports.validateAndSanitizeTweet = [
    body('text')
        .trim() 
        .isLength({ min: 1, max: 500 }).withMessage('Tweet content must be between 1 and 500 characters.')
        .escape()
        .customSanitizer(value => {
            // Replace the escaped apostrophe and quotation mark back to their original forms
            return value.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
        }), 
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
        attachments: req.body.attachments || [],
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
        const repliedToTweet = await Tweet.findByIdAndUpdate(req.body.replyTo, {
            $push: { replies: savedTweet._id },
            $inc: { repliesCount: 1 }
        });
        interactionEmitter.emit('interaction', repliedToTweet._id);
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

exports.uploadTweetAttachment = asyncHandler(async (req, res, next) => {
    // Logic to handle file in req.file or req.files
    // Save to MinIO bucket
    // return URL of file
    let filesToProcess = [];

    if (req.file) {
        // Single file
        filesToProcess.push(req.file);
    } else if (req.files) {
        // Multiple files
        filesToProcess = req.files;
    } else {
        return res.status(400).send({ message: 'No file uploaded.' });
    }

    // Check if the number of files exceeds the limit
    if (filesToProcess.length > 4) {
        return res.status(400).send({ message: 'Cannot upload more than 4 files.' });
    }

    const fileUrls = await Promise.all(filesToProcess.map(async (file) => {
        const userId = req.user._id;
        const fileName = `${userId}/${Date.now()}-${file.originalname}`;

        // Example for cloud storage (e.g., MinIO, AWS S3)
        try {
            await minioClient.fPutObject('tweet-attachments', fileName, file.path, {
                'Content-Type': file.mimetype
            });
            const fileUrl = `https://${process.env.MINIO_SERVER_URL}/tweet-attachments/${fileName}`;
            return fileUrl;
        } catch (error) {
            console.error('Error saving file:', error);
            throw new Error('Error in uploading file');
        }
    }));

    res.status(200).json({
        message: 'Attachments uploaded successfully',
        fileUrls: fileUrls,
    });
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
    const tweets = await Tweet.find({
         _id: { $in: tweetIds },
         replyTo: null, // Skip reply tweets
         isDeleted: false
        })
        .sort({ score: -1, date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('author', 'username firstName lastName profile')
        .exec()

    res.json(tweets);
});

// Fetch Tweets for the Explore feed
exports.fetchExploreTweets = asyncHandler(async (req, res, next) => {
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    const tweets = await Tweet.find({
        replyTo: null,
        isDeleted: false
    })
    .sort({ score: -1, date: -1 })
    .limit(numLimit)
    .skip(numSkip)
    .populate('author', 'username firstName lastName profile')
    .exec()

    res.json(tweets);
});

exports.fetchTweetAndContext = asyncHandler(async (req, res, next) => {
    const baseTweetId = req.params.id;

    const baseTweet = await Tweet.findById(baseTweetId)
        .populate('author', 'username firstName lastName profile')
        .populate({
            path: 'replyTo',
            populate: {
                path: 'author',
                select: 'username firstName lastName profile',
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

    if (!baseTweet) {
        return res.status(404).json({ message: 'Tweet not found' });
    }

    let replies;
    let paginationRequired = false;
    if (baseTweet.replies.length <= 50) {
        replies = await Tweet.find({ _id: { $in: baseTweet.replies } })
            .populate('author', 'username firstName lastName profile')
        .exec();
    } else {
        // Return inidicator to use pagination function
        paginationRequired = true;
        replies = {};
    }

    res.json({ baseTweet, replies, paginationRequired });
});

exports.fetchRepliesToTweet = asyncHandler(async (req, res, next) => {
    const tweetId = req.params.id;
    const { limit = 75, skip = 0, sort = 'score' } = req.query;

    // Determine the sorting order
    let sortOptions = {};
    if (sort === 'score') {
        // Sort by score (descending) first, then by date (descending)
        sortOptions = { score: -1, date: -1 };
    } else if (sort === 'date') {
        // Sort by date (descending)
        sortOptions = { date: -1 };
    } else if (sort === 'oldest') {
        // Sort by date (ascending)
        sortOptions = { date: 1 };
    }

    // Fetch replies with pagination and sorting
    const replies = await Tweet.find({ replyTo: tweetId, isDeleted: false })
        .sort(sortOptions)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate('author', 'username firstName lastName profile')
        .exec();

    // Optionally, fetch the total number of replies for pagination metadata
    const totalReplies = await Tweet.countDocuments({ replyTo: tweetId, isDeleted: false });

    res.json({ replies, totalReplies });
});

exports.fetchUserTweetsAndLikes = asyncHandler(async (req, res, next) => {
    const userId = req.params.id;
    const { limit = 50, skip = 0 } = req.query;
    const numLimit = parseInt(limit, 10);
    const numSkip = parseInt(skip, 10);

    // Fetch the user's tweets and likes
    const user = await User.findById(userId, 'tweets likes retweets').exec();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Fetch the actual tweets and likes with pagination
    const userTweets = await Tweet.find({ 
        _id: { $in: user.tweets },
        isDeleted: false
        })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('author', 'username firstName lastName profile')
    .exec();

    const userLikes = await Tweet.find({ 
        _id: { $in: user.likes },
        isDeleted: false
     })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('author', 'username firstName lastName profile')
    .exec();

    const userRetweets = await Tweet.find({ 
        _id: { $in: user.retweets },
        isDeleted: false
     })
        .sort({ date: -1 })
        .limit(numLimit)
        .skip(numSkip)
        .populate('author', 'username firstName lastName profile')
    .exec();

    const tweetData = {
        userTweets,
        userLikes,
        userRetweets
    };

    res.json(tweetData);
});