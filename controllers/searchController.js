const User = require('../models/user');
const Tweet = require('../models/tweet');

exports.performSearch = async (req, res, next) => {
    try {
        const searchTerm = req.query.q;
        let results = {};

        if (searchTerm.startsWith('@')) {
            // Search for users including '@'
            const userSearchRegex = new RegExp(searchTerm, 'i');
            results.users = await User.find({ username: userSearchRegex }).select('username profile firstName lastName');

            // Search for tweets mentioning the username
            results.mentions = await Tweet.find({ 
                'entities.mentions.username': userSearchRegex
            }).populate('author', 'username profile firstName lastName');
        } else if (searchTerm.startsWith('#')) {
            // Search for tweets with hashtags including '#'
            const hashtagSearchRegex = new RegExp(searchTerm, 'i');
            results.tweets = await Tweet.find({ 
                'entities.hashtags.text': hashtagSearchRegex 
            }).populate('author', 'username profile firstName lastName');
        } else {
            // General search logic or handle as an invalid search
            results.error = 'Invalid search query';
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error occurred while searching', error: error.message });
    }
};
