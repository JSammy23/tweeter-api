var express = require('express');
var router = express.Router();
const passport = require('passport');
const mware = require('../config/middleware');

const userController = require('../controllers/userController');

// POST Create new user
router.post('/', userController.create_user);

// PUT Update user
router.put('/:id', passport.authenticate('jwt', {session: false}), mware.ensureAdminOrSelf, userController.update_user);

// GET Current User
router.get('/', passport.authenticate('jwt', {session: false}), userController.get_currentUser);

// GET user by ID
router.get('/:id', passport.authenticate('jwt', {session: false}), userController.getUserById);

// POST User login
router.post('/login', userController.login);

// DELETE user
router.delete('/:id', passport.authenticate('jwt', {session: false}), mware.ensureAdminOrSelf, userController.delete_user);

// Follow User
router.put('/:id/follow', passport.authenticate('jwt', {session: false}), userController.followUser);

// GET Username availability
router.get('/check-username/:username', userController.check_username);

module.exports = router;
