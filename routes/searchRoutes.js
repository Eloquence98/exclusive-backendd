const express = require('express');
const searchController = require('../controllers/searchController');

const router = express.Router();

router.get('/suggest', searchController.getProductSuggestions);

router.get('/', searchController.searchProducts);

module.exports = router;
