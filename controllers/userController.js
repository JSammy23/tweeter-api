const User = require('../models/user');
const Notification = require('../models/notification');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User Route functions:
// PUT Update user | Need to add profile updates

// GET user following
// GET user followers

// PUT Follow/un-follow user

/****** TO DO:  *******/
// Add soft delete for user

// Create User
exports.create_user = [
    body('firstName', 'First name is required.')
        .trim()
        .notEmpty()
        .isLength({max: 30})
        .escape(),
    body('lastName', 'Last name is required.')
        .trim()
        .notEmpty()
        .isLength({max: 30})
        .escape(),
    body('username', 'Username is required.')
        .trim()
        .isAlphanumeric()
        .isLength({min: 2, max: 30})
        .escape(),
        body('password', 'Password is required.')
        .trim()
        .isLength({min: 8, max: 100})
        .custom((value, {req}) => {
            if (value != req.body.confirm_password) {
                throw new Error('Passwords must match.');
            }
            return true;
        }),
    body('confirm_password', 'Confirm password')
        .trim()
        .isLength({min: 8, max: 100}),
    body('email', 'Email is required.')
        .trim()
        .notEmpty().withMessage('Email cannot be empty')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email
        });

        const savedUser = await user.save();
        res.status(201).json({ message: 'User created successfully!', user: savedUser });
    })
];

// Update user
exports.update_user = [
    // Validate and sanitize fields only if they exist in the request
    body('firstName')
        .if(req => req.body.firstName !== undefined)
        .trim()
        .notEmpty().withMessage('First name cannot be empty.')
        .isLength({max: 30}).withMessage('First name cannot exceed 30 characters.')
        .escape(),
    
    body('lastName')
        .if(req => req.body.lastName !== undefined)
        .trim()
        .notEmpty().withMessage('Last name cannot be empty.')
        .isLength({max: 30}).withMessage('Last name cannot exceed 30 characters.')
        .escape(),

    body('username')
        .if(req => req.body.username !== undefined)
        .trim()
        .isAlphanumeric().withMessage('Username can only contain alphanumeric characters.')
        .isLength({min: 2, max: 30}).withMessage('Username must be between 2 and 30 characters.')
        .escape(),

    body('password')
        .if(req => req.body.password !== undefined)
        .trim()
        .isLength({min: 8, max: 100}).withMessage('Password must be between 8 and 100 characters.')
        .custom((value, {req}) => {
            if (value != req.body.confirm_password) {
                throw new Error('Passwords must match.');
            }
            return true;
        }),

    body('confirm_password')
        .if(req => req.body.confirm_password !== undefined)
        .trim()
        .isLength({min: 8, max: 100}).withMessage('Confirmation password must be between 8 and 100 characters.'),

    body('email')
        .if(req => req.body.email !== undefined)
        .trim()
        .notEmpty().withMessage('Email cannot be empty')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        // If updating password, hash the new one
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
        }

        // Update user with new values
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
    })
];

// User Login
exports.login = async (req, res, next) => {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json({ username: 'User not found' });
    }

    // Check password (using bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        // User matched, create JWT Payload
        const payload = {
            id: user.id,
            username: user.username
            // any other data you want in the token
        };

        // Sign the token
        jwt.sign(
            payload,
            process.env.JWT_KEY, // using the secret key from .env
            { expiresIn: 3600 },  // token will expire in 1 hour
            (err, token) => {
                res.json({
                    success: true,
                    token: 'Bearer ' + token,
                    message: 'Login successful!'
                });
            }
        );
    } else {
        return res.status(400).json({ password: 'Password incorrect' });
    }
};

// Delete user
exports.delete_user = asyncHandler(async (req, res, next) => {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
    }
    await User.findByIdAndRemove(req.params.id);
    res.status(200).json({ message: 'User deleted successfully!' });
});

/* Profile Interactions */

// Follow user
exports.followUser = asyncHandler(async (req, res, next) => {
    const userIdToFollow = req.params.id; 

    if (!userIdToFollow) {
        return res.status(400).json({ message: "User ID to follow is not provided." });
    };

    if (req.user._id.equals(userIdToFollow)) {
        return res.status(400).json({ message: "You cannot follow yourself." });
    };

    const userToFollow = await User.findById(userIdToFollow);

    if (!userToFollow) {
        return res.status(404).json({ message: "User not found." });
    };

    const isAlreadyFollowing = req.user.following.includes(userIdToFollow);

    if (isAlreadyFollowing) {
        // Unfollow the user
        req.user.following.pull(userIdToFollow);
        userToFollow.followers.pull(req.user._id);
        await req.user.save();
        await userToFollow.save();
        return res.status(200).json({ message: `You have unfollowed ${userToFollow.username}.` });
    } else {
        // Follow the user
        req.user.following.push(userIdToFollow);
        userToFollow.followers.push(req.user._id);
        
        const newNotification = new Notification({
            type: 'FOLLOW',
            recipient: userIdToFollow,
            sender: req.user._id, 
            message: `${req.user.username} started following you.`
        });

        await newNotification.save();
        await req.user.save();
        await userToFollow.save();
        return res.status(200).json({ message: `You are now following ${userToFollow.username}.` });
    };
});