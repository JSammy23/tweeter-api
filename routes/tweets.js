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

module.exports = router;