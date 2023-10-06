var express = require('express');
var router = express.Router();
const passport = require('passport');
const mware = require('../config/middleware');

const tweetController = require('../controllers/tweetController');

// POST Create new tweet
router.post('/', passport.authenticate('jwt', { session: false }), tweetController.validateAndSanitizeTweet, tweetController.create_tweet);

module.exports = router;