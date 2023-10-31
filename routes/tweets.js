var express = require('express');
var router = express.Router();
const passport = require('passport');
const mware = require('../config/middleware');

const tweetController = require('../controllers/tweetController');

// POST Create new tweet
router.post('/', passport.authenticate('jwt', { session: false }), tweetController.validateAndSanitizeTweet, tweetController.create_tweet);

// PUT Interact with Tweet (Like or Retweet)
router.put('/:id/interact', passport.authenticate('jwt', { session: false }), tweetController.likeOrRetweet);

// PUT Update tweet
router.put('/:id/update', passport.authenticate('jwt', { session: false }), tweetController.update_tweet);

// PUT Soft delete
router.put('/:id/delete', passport.authenticate('jwt', { session: false }), tweetController.delete_tweet);

// GET Subcribed Tweets
router.get('/home', passport.authenticate('jwt', { session: false }), tweetController.fetchSubscribedTweets);

// GET SIngle tweet and replies
router.get('/thread/:id', passport.authenticate('jwt', { session: false }), tweetController.fetchTweetAndReplies);

module.exports = router;