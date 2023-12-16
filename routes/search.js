var express = require('express');
var router = express.Router();
const { query } = require('express-validator');

const searchController = require('../controllers/searchController');

router.get('/', [
    query('q').trim().escape().isString()
], searchController.performSearch);

module.exports = router;