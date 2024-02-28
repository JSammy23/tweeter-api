const User = require('../models/user');
const Notification = require('../models/notification');
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const minioClient = require('../utils/minioClient');

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

        const usernameWithAt = req.body.username.startsWith('@') ? req.body.username : `@${req.body.username}`;

        const existingUser = await User.findOne({
            $or: [{ username: usernameWithAt }, { email: req.body.email }]
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with the given username or email.' });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: usernameWithAt,
            password: hashedPassword,
            email: req.body.email,
            profile: {
                bio: '',
                profile_picture: `http://${process.env.MINIO_SERVER_URL}/profilepictures/default/user.png`
            }
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

        // Prepend '@' to username if not present
        if (req.body.username && !req.body.username.startsWith('@')) {
            req.body.username = `@${req.body.username}`;
        }

        // Check if username already exists (excluding the current user)
        if (req.body.username) {
            const existingUser = await User.findOne({
                username: req.body.username,
                _id: { $ne: req.params.id }
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken.' });
            }
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

// GET Check username availibility
exports.check_username = asyncHandler(async (req, res, next) => {
    const { username } = req.params;
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        console.log(`Checking availability for username: ${username}`);
        const userExists = await User.findOne({ username: username });
        console.log(`User exists: ${!!userExists}`);

        if (userExists) {
            return res.status(200).json({ available: false });
        } else {
            return res.status(200).json({ available: true });
        }
    } catch (error) {
        console.error('Error in check_username:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET Current User
exports.get_currentUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    res.json(user);
});

// GET User by ID with selective population
exports.getUserById = asyncHandler(async (req, res, next) => {
    const queryFields = req.query.fields;
    const populateFields = req.query.populate; 
    const selectString = queryFields ? queryFields.split(',').join(' ') : '-password -email';
    
    let query = User.findById(req.params.id).select(selectString);

    // If there are fields to populate, process them
    if (populateFields) {
        populateFields.split(',').forEach((populateField) => {
            // Split the field and its subfields
            const [path, subFields] = populateField.split(':');
            if (subFields) {
                // Populate with specific subfields
                query = query.populate({ path, select: subFields.split(' ').join(' ') });
            } else {
                // Populate the entire document
                query = query.populate(path);
            }
        });
    }

    const user = await query;

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
});

// User Login
exports.login = async (req, res, next) => {
    let { username, password } = req.body;

    // Prepend '@' if it's not part of the username
    if (!username.startsWith('@')) {
        username = `@${username}`;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check password (using bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        // Update lastLoggedIn before generating token
        user.lastLoggedIn = new Date();
        await user.save();
        
        // User matched, create JWT Payload
        const payload = {
            id: user.id,
            username: user.username,
            firstName: user.firstName
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
        return res.status(400).json({ message: 'Password incorrect' });
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

// Upload profile picture
exports.updateProfilePicture = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }

    const file = req.file;
    const userId = req.user._id;
    const fileName = `${userId}/${file.originalname}`;

    try {
        await minioClient.fPutObject('profilepictures', fileName, file.path, {
            'Content-Type': file.mimetype
        });

        const fileUrl = `http://${process.env.MINIO_SERVER_URL}/profilepictures/${fileName}`;

        await User.findByIdAndUpdate(
            userId,
            { $set: { 'profile.profile_picture': fileUrl } },
            { new: true }
        );

        res.json({ message: 'Profile picture updated successfully.', fileUrl });
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).send({ message: 'Error updating profile picture' });
    }
});

/******** Add Pagination for users with large commuity */
// Grab user's community
exports.fetchUsersCommunity = asyncHandler(async (req, res, next) => {
    // console.log('Request path:', req.path);
    // console.log('Request params:', req.params); 
    // console.log('User from request:', req.user);

    const userId = req.user._id;
    const userObj = await User.findById(userId);

    if (!userObj) {
        res.status(404).json({ message: 'User not found' });
    }

    const combinedArray = [...userObj.following, ...userObj.followers];
    const uniqueArray = [...new Set(combinedArray)];

    console.log('uniqueArray:', uniqueArray);

    const populatedUsers = await User.find({
        '_id': { $in: uniqueArray }
    }).select('firstName lastName username profile.profile_picture');
    res.status(200).json(populatedUsers);   
});