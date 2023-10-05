var express = require('express');
var router = express.Router();
const passport = require('passport');
const mware = require('../config/middleware');

const userController = require('../controllers/userController');

// POST Create new user
router.post('/', userController.create_user);

// PUT Update user
router.put('/:id', passport.authenticate('jwt', {session: false}), mware.ensureAdminOrSelf, userController.update_user);

// POST User login
router.post('/login', userController.login);

// DELETE user
router.delete('/:id', passport.authenticate('jwt', {session: false}), mware.ensureAdminOrSelf, userController.delete_user);

module.exports = router;
